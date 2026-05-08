import { getProfilesForArc, type VoiceProfile } from './voice-profiles.ts';
import { createLogger } from './utils.ts';
import type { ProcessedHeadline } from './types.ts';
import type { ClassifierChatFn } from './llm-classifier.ts';

const log = createLogger('frame-gen');

const BATCH_SIZE = 20;
const TIMEOUT_MS = 45_000;
const MIN_CONFIDENCE = 0.4;

export interface GeneratedFrames {
  headlineId: string;
  establishment: { text: string; source: string; confidence: number } | null;
  community: { text: string; source: string; confidence: number } | null;
  market: { text: string; source: string; confidence: number } | null;
}

export interface FrameGeneratorConfig {
  enabled: boolean;
  model: string;
}

export function buildFramePrompt(profiles: VoiceProfile[]): string {
  const profileSection = profiles
    .map(p => {
      return `### ${p.name} (${p.entity})
- Tone: ${p.tone}
- Key phrases: ${p.keyPhrases.join(', ')}
- Genuine argument: ${p.genuineArgument}
- Example language: ${p.exampleLanguage.map(e => `"${e}"`).join('; ')}`;
    })
    .join('\n\n');

  return `You generate propaganda frames for a city simulation game set in Detroit. Each headline gets three frames representing how different factions would spin it.

## Frame Types

**Establishment**: How incumbent power (utilities, developers, state government) frames this story. Emphasizes stability, jobs, investment. Minimizes harm. Uses voice profiles below.
**Community**: How grassroots organizations (Soulardarity, D-Town Farm, Trumbullplex, block clubs) frame this story. Emphasizes justice, accountability, lived experience. Names specific harms.
**Market**: How financial analysts and investors frame this story. Emphasizes ROI, market signals, property values, risk assessment. Uses numbers and projections.

## Voice Profiles (for establishment frames)
${profileSection}

## Rules

1. Each frame is 1-2 sentences. Opinionated, not neutral.
2. Establishment frames should use the voice and key phrases of the relevant profile(s).
3. Community frames should sound like real Detroit organizers — direct, specific, angry when warranted.
4. Market frames should sound like Bloomberg or Crain's Detroit Business — data-oriented, detached.
5. If a frame type doesn't apply to this headline, return null for that frame.
6. Include a confidence score (0.0-1.0) for each frame.

## Output Format

Return a JSON array, one object per headline in order:

\`\`\`json
[
  {
    "index": 0,
    "establishment": { "text": "...", "source": "DTE Energy", "confidence": 0.9 },
    "community": { "text": "...", "source": "community", "confidence": 0.85 },
    "market": { "text": "...", "source": "market", "confidence": 0.8 }
  }
]
\`\`\`

Use null for any frame that doesn't apply. Return ONLY the JSON array.`;
}

export function buildFrameBatchMessage(
  headlines: Array<{ id: string; headline: string; arcs: string[]; severity: number }>
): string {
  const numbered = headlines
    .map((h, i) => `[${i}] (id: ${h.id}, arcs: [${h.arcs.join(', ')}], severity: ${h.severity}) ${h.headline}`)
    .join('\n');
  return `Generate frames for these ${headlines.length} headlines:\n\n${numbered}`;
}

export function parseFrameResponse(
  raw: string,
  headlines: Array<{ id: string }>
): GeneratedFrames[] {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let parsed: Array<{
    index: number;
    establishment?: { text: string; source: string; confidence: number } | null;
    community?: { text: string; source: string; confidence: number } | null;
    market?: { text: string; source: string; confidence: number } | null;
  }>;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    log.error('Failed to parse frame generation response');
    return [];
  }

  if (!Array.isArray(parsed)) {
    log.error('Frame response is not an array');
    return [];
  }

  const results: GeneratedFrames[] = [];

  for (const item of parsed) {
    const idx = item.index;
    if (idx == null || idx < 0 || idx >= headlines.length) continue;

    const filterFrame = (
      frame: { text: string; source: string; confidence: number } | null | undefined
    ) => {
      if (!frame || typeof frame.text !== 'string' || !frame.text.trim()) return null;
      if ((frame.confidence ?? 0) < MIN_CONFIDENCE) return null;
      return {
        text: frame.text.trim(),
        source: frame.source ?? 'unknown',
        confidence: Math.max(0, Math.min(1, frame.confidence ?? 0.5)),
      };
    };

    results.push({
      headlineId: headlines[idx].id,
      establishment: filterFrame(item.establishment),
      community: filterFrame(item.community),
      market: filterFrame(item.market),
    });
  }

  return results;
}

export async function generateFramesBatch(
  headlines: ProcessedHeadline[],
  chatFn: ClassifierChatFn,
  config: FrameGeneratorConfig,
): Promise<GeneratedFrames[]> {
  if (!config.enabled) {
    log.info('Frame generation disabled, skipping');
    return [];
  }

  const eligible = headlines.filter(h => h.classified && h.severity >= 2 && !h.frames);
  if (eligible.length === 0) {
    log.info('No eligible headlines for frame generation (need classified, severity >= 2, no existing frames)');
    return [];
  }

  log.info(`Generating frames for ${eligible.length} headlines`);

  const allArcs = new Set(eligible.flatMap(h => h.arcs));
  const profiles: VoiceProfile[] = [];
  for (const arcId of allArcs) {
    profiles.push(...getProfilesForArc(arcId));
  }
  const uniqueProfiles = [...new Map(profiles.map(p => [p.id, p])).values()];
  const systemPrompt = buildFramePrompt(uniqueProfiles);

  const allResults: GeneratedFrames[] = [];

  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);
    const batchInput = batch.map(h => ({
      id: h.id,
      headline: h.headline,
      arcs: h.arcs,
      severity: h.severity,
    }));
    const userMessage = buildFrameBatchMessage(batchInput);

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Frame generation timed out')), TIMEOUT_MS);
      });

      const responsePromise = chatFn({
        model: config.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        maxTokens: 4096,
        temperature: 0.3,
      });

      const raw = await Promise.race([responsePromise, timeoutPromise]);
      const frames = parseFrameResponse(raw, batchInput);
      allResults.push(...frames);

      log.info(`Frame batch ${Math.floor(i / BATCH_SIZE) + 1}: generated ${frames.length}/${batch.length} frame sets`);
    } catch (err) {
      log.error(`Frame batch ${Math.floor(i / BATCH_SIZE) + 1} failed, headlines stored without frames for retry`, err);
      break;
    }
  }

  return allResults;
}
