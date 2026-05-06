/**
 * Keyword-based headline classifier.
 * Assigns arcs, severity, locality, and neighborhood tags to headlines
 * based on keyword matching. This is the first-pass classifier;
 * an LLM-based classifier can refine results later.
 */

export interface ClassificationResult {
  arcs: string[];
  severity: number;
  locality: string | null;
  neighborhoodTag: string | null;
  confidence: number;
}

const ARC_KEYWORDS: Record<string, string[]> = {
  'energy-grid': ['grid', 'DTE', 'outage', 'power', 'solar', 'microgrid', 'blackout', 'electricity', 'utility', 'renewable'],
  'water-pfas': ['PFAS', 'water', 'contamination', 'forever chemicals', 'DWSD', 'GLWA', 'lead pipe', 'water shut', 'boil water'],
  'phosphorus-food': ['phosphorus', 'fertilizer', 'nutrient', 'food desert', 'food sovereignty', 'urban farm', 'hunger', 'food access'],
  'housing-speculation': ['housing', 'eviction', 'rent', 'speculation', 'gentrification', 'land contract', 'foreclosure', 'blight', 'demolition', 'affordable'],
  'infrastructure-debt': ['infrastructure', 'bridge', 'sewer', 'road', 'maintenance', 'crumbling', 'pothole', 'transit', 'bus route'],
};

const NEIGHBORHOODS = [
  'brightmoor', 'corktown', 'eastern market', 'southwest detroit',
  'indian village', 'hamtramck', 'north end', 'midtown', 'downtown',
  'riverfront', 'mexicantown', 'banglatown', 'warrendale',
];

const SEVERITY_WORDS: Record<number, string[]> = {
  3: ['crisis', 'emergency', 'catastroph', 'death', 'killed', 'collapse'],
  2: ['violation', 'contamination', 'shutdown', 'protest', 'lawsuit', 'surge'],
  1: ['concern', 'report', 'study', 'proposal', 'plan', 'announce'],
};

const LOCALITY_PATTERNS: [string, RegExp][] = [
  ['detroit', /\b(detroit|DTE|DWSD|GLWA|wayne county)\b/i],
  ['michigan', /\b(michigan|lansing|governor whitmer|MPSC|MDEQ)\b/i],
  ['national', /\b(EPA|federal|congress|national|FEMA|CDC)\b/i],
  ['global', /\b(global|international|UN|WHO|climate summit)\b/i],
];

export function classifyByKeywords(headline: string): ClassificationResult {
  const lower = headline.toLowerCase();
  const arcs: string[] = [];

  for (const [arcId, keywords] of Object.entries(ARC_KEYWORDS)) {
    const hits = keywords.filter(kw => lower.includes(kw.toLowerCase()));
    if (hits.length > 0) arcs.push(arcId);
  }

  let severity = 0;
  for (const [sev, words] of Object.entries(SEVERITY_WORDS)) {
    if (words.some(w => lower.includes(w))) {
      severity = Math.max(severity, parseInt(sev));
    }
  }

  let locality: string | null = null;
  for (const [loc, pattern] of LOCALITY_PATTERNS) {
    if (pattern.test(headline)) {
      locality = loc;
      break;
    }
  }

  let neighborhoodTag: string | null = null;
  for (const hood of NEIGHBORHOODS) {
    if (lower.includes(hood)) {
      neighborhoodTag = hood.replace(/\s+/g, '-');
      break;
    }
  }

  return {
    arcs,
    severity,
    locality,
    neighborhoodTag,
    confidence: arcs.length > 0 ? 0.6 + (arcs.length * 0.1) : 0,
  };
}
