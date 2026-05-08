/// <reference types="vitest/globals" />
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildClassificationPrompt,
  buildBatchUserMessage,
  parseClassificationResponse,
  classifyBatch,
  getQuotaRemaining,
  resetQuota,
  type ClassifierConfig,
  type ClassifierChatFn,
  type LLMClassification,
} from './llm-classifier';
import type { ProcessedHeadline, ArcConfig } from './types';
import { join } from 'path';

const TEST_ARC_DEFS: Record<string, ArcConfig> = {
  'energy-grid': {
    escalationThreshold: 3,
    minStageDuration: 48,
    keywords: ['grid', 'DTE', 'outage', 'power', 'solar', 'microgrid'],
    locality: ['detroit', 'michigan'],
  },
  'water-pfas': {
    escalationThreshold: 3,
    minStageDuration: 48,
    keywords: ['PFAS', 'water', 'contamination', 'forever chemicals'],
    locality: ['detroit', 'michigan', 'great lakes'],
  },
  'housing-speculation': {
    escalationThreshold: 3,
    minStageDuration: 48,
    keywords: ['housing', 'eviction', 'rent', 'speculation', 'gentrification'],
    locality: ['detroit', 'michigan'],
  },
};

function makeHeadline(id: string, text: string, classified = false): ProcessedHeadline {
  return {
    id,
    source: 'test',
    date: new Date().toISOString(),
    headline: text,
    url: `https://example.com/${id}`,
    metadata: {},
    fetchedAt: new Date().toISOString(),
    classified,
    arcs: [],
    severity: 0,
    locality: null,
    confidence: 0,
  };
}

const ENABLED_CONFIG: ClassifierConfig = {
  enabled: true,
  model: 'claude-haiku-4-5-20251001',
  apiKey: 'test-key',
  apiUrl: 'https://api.anthropic.com',
};

const DISABLED_CONFIG: ClassifierConfig = {
  ...ENABLED_CONFIG,
  enabled: false,
};

const CONFIG_DIR = join(import.meta.dirname, 'config');

describe('buildClassificationPrompt', () => {
  it('includes arc definitions in the prompt', () => {
    const prompt = buildClassificationPrompt(TEST_ARC_DEFS);
    expect(prompt).toContain('energy-grid');
    expect(prompt).toContain('water-pfas');
    expect(prompt).toContain('housing-speculation');
    expect(prompt).toContain('DTE');
    expect(prompt).toContain('PFAS');
  });

  it('includes severity scale', () => {
    const prompt = buildClassificationPrompt(TEST_ARC_DEFS);
    expect(prompt).toContain('severity');
    expect(prompt).toContain('0: No relevance');
    expect(prompt).toContain('3: Crisis');
  });

  it('includes few-shot examples', () => {
    const prompt = buildClassificationPrompt(TEST_ARC_DEFS);
    expect(prompt).toContain('DTE grid failure');
    expect(prompt).toContain('Lions win playoff');
  });

  it('includes locality definitions', () => {
    const prompt = buildClassificationPrompt(TEST_ARC_DEFS);
    expect(prompt).toContain('"detroit"');
    expect(prompt).toContain('"michigan"');
    expect(prompt).toContain('"national"');
    expect(prompt).toContain('"global"');
  });
});

describe('buildBatchUserMessage', () => {
  it('numbers headlines starting from 0', () => {
    const msg = buildBatchUserMessage([
      { id: 'a', headline: 'First headline' },
      { id: 'b', headline: 'Second headline' },
    ]);
    expect(msg).toContain('[0]');
    expect(msg).toContain('[1]');
    expect(msg).toContain('First headline');
    expect(msg).toContain('Second headline');
  });

  it('includes headline count', () => {
    const msg = buildBatchUserMessage([
      { id: 'a', headline: 'Test' },
      { id: 'b', headline: 'Test 2' },
      { id: 'c', headline: 'Test 3' },
    ]);
    expect(msg).toContain('3 headlines');
  });

  it('includes headline IDs', () => {
    const msg = buildBatchUserMessage([{ id: 'abc123', headline: 'Test' }]);
    expect(msg).toContain('abc123');
  });
});

describe('parseClassificationResponse', () => {
  const headlines = [{ id: 'h1' }, { id: 'h2' }, { id: 'h3' }];

  it('parses valid JSON array response', () => {
    const raw = JSON.stringify([
      { index: 0, arcs: ['energy-grid'], severity: 3, locality: 'detroit', neighborhoodTag: null, confidence: 0.95 },
      { index: 1, arcs: ['water-pfas', 'phosphorus-food'], severity: 2, locality: 'detroit', neighborhoodTag: null, confidence: 0.9 },
      { index: 2, arcs: [], severity: 0, locality: null, neighborhoodTag: null, confidence: 0.95 },
    ]);

    const results = parseClassificationResponse(raw, headlines);
    expect(results).toHaveLength(3);
    expect(results[0].headlineId).toBe('h1');
    expect(results[0].arcs).toEqual(['energy-grid']);
    expect(results[0].severity).toBe(3);
    expect(results[0].locality).toBe('detroit');
    expect(results[1].arcs).toContain('water-pfas');
    expect(results[2].arcs).toEqual([]);
    expect(results[2].severity).toBe(0);
  });

  it('handles markdown-wrapped JSON', () => {
    const raw = '```json\n[{"index": 0, "arcs": ["energy-grid"], "severity": 2, "locality": "detroit", "confidence": 0.8}]\n```';
    const results = parseClassificationResponse(raw, headlines);
    expect(results).toHaveLength(1);
    expect(results[0].arcs).toEqual(['energy-grid']);
  });

  it('filters out invalid arc names', () => {
    const raw = JSON.stringify([
      { index: 0, arcs: ['energy-grid', 'fake-arc', 'water-pfas'], severity: 1, locality: null, confidence: 0.7 },
    ]);
    const results = parseClassificationResponse(raw, headlines);
    expect(results[0].arcs).toEqual(['energy-grid', 'water-pfas']);
  });

  it('clamps severity to 0-3 range', () => {
    const raw = JSON.stringify([
      { index: 0, arcs: [], severity: 5, locality: null, confidence: 0.5 },
      { index: 1, arcs: [], severity: -1, locality: null, confidence: 0.5 },
    ]);
    const results = parseClassificationResponse(raw, headlines);
    expect(results[0].severity).toBe(3);
    expect(results[1].severity).toBe(0);
  });

  it('rejects invalid locality values', () => {
    const raw = JSON.stringify([
      { index: 0, arcs: [], severity: 0, locality: 'mars', confidence: 0.5 },
    ]);
    const results = parseClassificationResponse(raw, headlines);
    expect(results[0].locality).toBeNull();
  });

  it('normalizes neighborhood tags', () => {
    const raw = JSON.stringify([
      { index: 0, arcs: ['housing-speculation'], severity: 2, locality: 'detroit', neighborhoodTag: 'Southwest Detroit', confidence: 0.9 },
    ]);
    const results = parseClassificationResponse(raw, headlines);
    expect(results[0].neighborhoodTag).toBe('southwest-detroit');
  });

  it('returns empty array on invalid JSON', () => {
    const results = parseClassificationResponse('not json at all', headlines);
    expect(results).toEqual([]);
  });

  it('returns empty array on non-array JSON', () => {
    const results = parseClassificationResponse('{"foo": "bar"}', headlines);
    expect(results).toEqual([]);
  });

  it('skips entries with out-of-range indices', () => {
    const raw = JSON.stringify([
      { index: 0, arcs: ['energy-grid'], severity: 1, locality: null, confidence: 0.8 },
      { index: 99, arcs: ['water-pfas'], severity: 2, locality: null, confidence: 0.7 },
    ]);
    const results = parseClassificationResponse(raw, headlines);
    expect(results).toHaveLength(1);
    expect(results[0].headlineId).toBe('h1');
  });

  it('clamps confidence to 0-1 range', () => {
    const raw = JSON.stringify([
      { index: 0, arcs: [], severity: 0, locality: null, confidence: 1.5 },
      { index: 1, arcs: [], severity: 0, locality: null, confidence: -0.5 },
    ]);
    const results = parseClassificationResponse(raw, headlines);
    expect(results[0].confidence).toBe(1);
    expect(results[1].confidence).toBe(0);
  });
});

describe('classifyBatch', () => {
  beforeEach(() => {
    resetQuota();
  });

  it('skips classification when disabled', async () => {
    const chatFn: ClassifierChatFn = async () => '[]';
    const headlines = [makeHeadline('h1', 'DTE power outage')];
    const results = await classifyBatch(headlines, chatFn, DISABLED_CONFIG, CONFIG_DIR);
    expect(results).toEqual([]);
  });

  it('skips already-classified headlines', async () => {
    let called = false;
    const chatFn: ClassifierChatFn = async () => {
      called = true;
      return '[]';
    };
    const headlines = [makeHeadline('h1', 'DTE power outage', true)];
    const results = await classifyBatch(headlines, chatFn, ENABLED_CONFIG, CONFIG_DIR);
    expect(results).toEqual([]);
    expect(called).toBe(false);
  });

  it('calls chatFn with correct structure', async () => {
    let capturedParams: Parameters<ClassifierChatFn>[0] | null = null;

    const chatFn: ClassifierChatFn = async (params) => {
      capturedParams = params;
      return JSON.stringify([
        { index: 0, arcs: ['energy-grid'], severity: 3, locality: 'detroit', confidence: 0.95 },
      ]);
    };

    const headlines = [makeHeadline('h1', 'DTE grid failure in Brightmoor')];
    await classifyBatch(headlines, chatFn, ENABLED_CONFIG, CONFIG_DIR);

    expect(capturedParams).not.toBeNull();
    expect(capturedParams!.model).toBe('claude-haiku-4-5-20251001');
    expect(capturedParams!.temperature).toBe(0.1);
    expect(capturedParams!.system).toContain('energy-grid');
    expect(capturedParams!.messages[0].content).toContain('DTE grid failure');
  });

  it('returns parsed classifications', async () => {
    const chatFn: ClassifierChatFn = async () => {
      return JSON.stringify([
        { index: 0, arcs: ['energy-grid'], severity: 3, locality: 'detroit', neighborhoodTag: 'brightmoor', confidence: 0.95 },
        { index: 1, arcs: [], severity: 0, locality: null, confidence: 0.9 },
      ]);
    };

    const headlines = [
      makeHeadline('h1', 'DTE grid failure in Brightmoor'),
      makeHeadline('h2', 'Lions win playoff game'),
    ];

    const results = await classifyBatch(headlines, chatFn, ENABLED_CONFIG, CONFIG_DIR);
    expect(results).toHaveLength(2);
    expect(results[0].arcs).toEqual(['energy-grid']);
    expect(results[0].neighborhoodTag).toBe('brightmoor');
    expect(results[1].arcs).toEqual([]);
  });

  it('handles chatFn failure gracefully', async () => {
    const chatFn: ClassifierChatFn = async () => {
      throw new Error('API rate limited');
    };

    const headlines = [makeHeadline('h1', 'DTE outage')];
    const results = await classifyBatch(headlines, chatFn, ENABLED_CONFIG, CONFIG_DIR);
    expect(results).toEqual([]);
  });

  it('respects hourly quota', async () => {
    let callCount = 0;
    const chatFn: ClassifierChatFn = async () => {
      callCount++;
      const results = Array.from({ length: 50 }, (_, i) => ({
        index: i,
        arcs: ['energy-grid'],
        severity: 1,
        locality: null,
        confidence: 0.8,
      }));
      return JSON.stringify(results);
    };

    const headlines = Array.from({ length: 250 }, (_, i) =>
      makeHeadline(`h${i}`, `Test headline ${i}`)
    );

    const results = await classifyBatch(headlines, chatFn, ENABLED_CONFIG, CONFIG_DIR);

    // Should process at most 200 headlines (4 batches of 50)
    expect(callCount).toBeLessThanOrEqual(4);
    expect(results.length).toBeLessThanOrEqual(200);
  });

  it('returns empty when quota exhausted', async () => {
    // Exhaust quota by classifying 200 headlines first
    const chatFn: ClassifierChatFn = async () => {
      return JSON.stringify(Array.from({ length: 50 }, (_, i) => ({
        index: i, arcs: [], severity: 0, locality: null, confidence: 0.5,
      })));
    };

    const batch1 = Array.from({ length: 200 }, (_, i) => makeHeadline(`b1-${i}`, `Headline ${i}`));
    await classifyBatch(batch1, chatFn, ENABLED_CONFIG, CONFIG_DIR);

    expect(getQuotaRemaining()).toBe(0);

    // Second batch should be skipped
    let secondCalled = false;
    const chatFn2: ClassifierChatFn = async () => {
      secondCalled = true;
      return '[]';
    };
    const batch2 = [makeHeadline('late', 'Late headline')];
    const results = await classifyBatch(batch2, chatFn2, ENABLED_CONFIG, CONFIG_DIR);

    expect(results).toEqual([]);
    expect(secondCalled).toBe(false);
  });
});

describe('quota management', () => {
  beforeEach(() => {
    resetQuota();
  });

  it('starts at 200 remaining', () => {
    expect(getQuotaRemaining()).toBe(200);
  });

  it('resets with resetQuota()', () => {
    // Simulate some usage by calling classifyBatch (tested above)
    resetQuota();
    expect(getQuotaRemaining()).toBe(200);
  });
});
