import { readFileSync } from 'fs';
import { join } from 'path';
import { createLogger } from './utils.ts';
import type { ProcessedHeadline, ArcConfig } from './types.ts';

const log = createLogger('llm-classifier');

const BATCH_SIZE = 50;
const HOURLY_CAP = 200;
const TIMEOUT_MS = 30_000;

export interface LLMClassification {
  headlineId: string;
  arcs: string[];
  severity: 0 | 1 | 2 | 3;
  locality: 'detroit' | 'michigan' | 'national' | 'global' | null;
  neighborhoodTag: string | null;
  confidence: number;
}

export interface ClassifierConfig {
  enabled: boolean;
  model: string;
  apiKey: string;
  apiUrl: string;
}

export type ClassifierChatFn = (params: {
  model: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens: number;
  temperature: number;
}) => Promise<string>;

interface QuotaState {
  classifiedThisHour: number;
  hourStart: number;
}

const quota: QuotaState = {
  classifiedThisHour: 0,
  hourStart: Date.now(),
};

function resetQuotaIfNeeded(): void {
  const now = Date.now();
  if (now - quota.hourStart >= 60 * 60 * 1000) {
    quota.classifiedThisHour = 0;
    quota.hourStart = now;
  }
}

export function getQuotaRemaining(): number {
  resetQuotaIfNeeded();
  return Math.max(0, HOURLY_CAP - quota.classifiedThisHour);
}

export function resetQuota(): void {
  quota.classifiedThisHour = 0;
  quota.hourStart = Date.now();
}

function loadArcDefinitions(configDir: string): Record<string, ArcConfig> {
  try {
    const raw = readFileSync(join(configDir, 'arcs.json'), 'utf-8');
    return JSON.parse(raw).arcs;
  } catch {
    log.warn('Failed to load arc config, using empty definitions');
    return {};
  }
}

export function buildClassificationPrompt(arcDefs: Record<string, ArcConfig>): string {
  const arcDescriptions = Object.entries(arcDefs)
    .map(([id, config]) => `- **${id}**: keywords [${config.keywords.join(', ')}], locality focus [${(config.locality ?? []).join(', ')}]`)
    .join('\n');

  return `You are a news headline classifier for a city simulation game set in Detroit. Your job is to classify headlines by their relevance to ongoing crisis arcs, assign severity, and detect locality.

## Arc Definitions
${arcDescriptions}

## Classification Rules

**Arcs**: Assign zero or more arc tags. A headline can match multiple arcs. Only assign arcs where there is genuine topical relevance, not just keyword overlap.

**Severity** (integer 0-3):
- 0: No relevance to any arc
- 1: Background/foreshadow — routine reports, studies, minor policy discussions
- 2: Rising/escalation — violations, protests, shutdowns, lawsuits, emerging problems
- 3: Crisis — emergencies, widespread outages, mass displacement, deaths, collapses

**Locality** (one of: detroit, michigan, national, global, null):
- "detroit": Mentions Detroit, a Detroit neighborhood, or Detroit institution (DTE, DWSD, GLWA, Wayne County, any specific Detroit neighborhood)
- "michigan": Michigan-specific but not Detroit-specific (Lansing, governor, MPSC, MDEQ)
- "national": Federal/national scope (EPA, Congress, FEMA, CDC)
- "global": International scope (UN, WHO, climate summit, global)
- null: Cannot determine locality

**Neighborhood**: If the headline mentions a specific Detroit neighborhood, include it. Known neighborhoods: Brightmoor, Corktown, Eastern Market, Southwest Detroit, Indian Village, Hamtramck, North End, Midtown, Downtown, Riverfront, Mexicantown, Banglatown, Warrendale, Fitzgerald, Grandmont-Rosedale, Palmer Park, Osborn, Morningside, Jefferson Chalmers.

**Confidence** (0.0-1.0): How confident you are in the classification. Higher for clear matches, lower for ambiguous ones.

## Output Format

Return a JSON array. Each element corresponds to one headline in the input batch, in order:

\`\`\`json
[
  {
    "index": 0,
    "arcs": ["energy-grid"],
    "severity": 3,
    "locality": "detroit",
    "neighborhoodTag": "brightmoor",
    "confidence": 0.95
  }
]
\`\`\`

## Few-Shot Examples

**Input**: "DTE grid failure leaves 50,000 without power in metro Detroit"
**Output**: \`{"arcs": ["energy-grid"], "severity": 3, "locality": "detroit", "neighborhoodTag": null, "confidence": 0.95}\`

**Input**: "PFAS contamination found in Detroit community garden soil"
**Output**: \`{"arcs": ["water-pfas", "phosphorus-food"], "severity": 2, "locality": "detroit", "neighborhoodTag": null, "confidence": 0.9}\`

**Input**: "Lions win playoff game in exciting overtime finish"
**Output**: \`{"arcs": [], "severity": 0, "locality": "detroit", "neighborhoodTag": null, "confidence": 0.95}\`

**Input**: "Brightmoor residents protest planned demolition of historic homes"
**Output**: \`{"arcs": ["housing-speculation"], "severity": 2, "locality": "detroit", "neighborhoodTag": "brightmoor", "confidence": 0.9}\`

**Input**: "EPA announces new nationwide PFAS regulations"
**Output**: \`{"arcs": ["water-pfas"], "severity": 1, "locality": "national", "neighborhoodTag": null, "confidence": 0.85}\`

**Input**: "Michigan governor signs infrastructure funding bill in Lansing"
**Output**: \`{"arcs": ["infrastructure-debt"], "severity": 1, "locality": "michigan", "neighborhoodTag": null, "confidence": 0.85}\`

Return ONLY the JSON array. No commentary, no markdown fences.`;
}

export function buildBatchUserMessage(headlines: Array<{ id: string; headline: string }>): string {
  const numbered = headlines
    .map((h, i) => `[${i}] (id: ${h.id}) ${h.headline}`)
    .join('\n');
  return `Classify these ${headlines.length} headlines:\n\n${numbered}`;
}

export function parseClassificationResponse(
  raw: string,
  headlines: Array<{ id: string }>
): LLMClassification[] {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let parsed: Array<{
    index: number;
    arcs?: string[];
    severity?: number;
    locality?: string | null;
    neighborhoodTag?: string | null;
    confidence?: number;
  }>;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    log.error('Failed to parse LLM classification response');
    return [];
  }

  if (!Array.isArray(parsed)) {
    log.error('LLM response is not an array');
    return [];
  }

  const validArcs = new Set([
    'energy-grid', 'water-pfas', 'phosphorus-food',
    'housing-speculation', 'infrastructure-debt',
  ]);
  const validLocalities = new Set(['detroit', 'michigan', 'national', 'global']);

  const results: LLMClassification[] = [];

  for (const item of parsed) {
    const idx = item.index;
    if (idx == null || idx < 0 || idx >= headlines.length) continue;

    const arcs = (item.arcs ?? []).filter(a => validArcs.has(a));
    const rawSeverity = Math.round(item.severity ?? 0);
    const severity = Math.max(0, Math.min(3, rawSeverity)) as 0 | 1 | 2 | 3;
    const locality = (item.locality && validLocalities.has(item.locality))
      ? item.locality as 'detroit' | 'michigan' | 'national' | 'global'
      : null;
    const neighborhoodTag = typeof item.neighborhoodTag === 'string'
      ? item.neighborhoodTag.toLowerCase().replace(/\s+/g, '-') || null
      : null;
    const confidence = Math.max(0, Math.min(1, item.confidence ?? 0.5));

    results.push({
      headlineId: headlines[idx].id,
      arcs,
      severity,
      locality,
      neighborhoodTag,
      confidence,
    });
  }

  return results;
}

export async function classifyBatch(
  headlines: ProcessedHeadline[],
  chatFn: ClassifierChatFn,
  config: ClassifierConfig,
  configDir: string,
): Promise<LLMClassification[]> {
  if (!config.enabled) {
    log.info('LLM classification disabled, skipping');
    return [];
  }

  resetQuotaIfNeeded();
  const remaining = getQuotaRemaining();
  if (remaining <= 0) {
    log.info('Hourly classification quota exhausted, deferring to next cycle');
    return [];
  }

  const unclassified = headlines.filter(h => !h.classified);
  if (unclassified.length === 0) {
    log.info('No unclassified headlines to process');
    return [];
  }

  const toProcess = unclassified.slice(0, remaining);
  log.info(`Processing ${toProcess.length} of ${unclassified.length} unclassified headlines (quota: ${remaining})`);

  const arcDefs = loadArcDefinitions(configDir);
  const systemPrompt = buildClassificationPrompt(arcDefs);

  const allResults: LLMClassification[] = [];

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchInput = batch.map(h => ({ id: h.id, headline: h.headline }));
    const userMessage = buildBatchUserMessage(batchInput);

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM classification timed out')), TIMEOUT_MS);
      });

      const responsePromise = chatFn({
        model: config.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        maxTokens: 4096,
        temperature: 0.1,
      });

      const raw = await Promise.race([responsePromise, timeoutPromise]);
      const classifications = parseClassificationResponse(raw, batchInput);
      allResults.push(...classifications);
      quota.classifiedThisHour += batch.length;

      log.info(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: classified ${classifications.length}/${batch.length} headlines`);
    } catch (err) {
      log.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed, storing as unclassified for retry`, err);
      break;
    }
  }

  return allResults;
}
