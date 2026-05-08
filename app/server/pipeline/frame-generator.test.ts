/// <reference types="vitest/globals" />
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  buildFramePrompt,
  buildFrameBatchMessage,
  parseFrameResponse,
  generateFramesBatch,
  type FrameGeneratorConfig,
  type GeneratedFrames,
} from './frame-generator';
import { getProfilesForArc, VOICE_PROFILES } from './voice-profiles';
import type { ProcessedHeadline } from './types';
import type { ClassifierChatFn } from './llm-classifier';

function makeClassifiedHeadline(
  id: string,
  text: string,
  arcs: string[],
  severity: 0 | 1 | 2 | 3,
  hasFrames = false
): ProcessedHeadline {
  return {
    id,
    source: 'test',
    date: new Date().toISOString(),
    headline: text,
    url: `https://example.com/${id}`,
    metadata: {},
    fetchedAt: new Date().toISOString(),
    classified: true,
    arcs,
    severity,
    locality: 'detroit',
    confidence: 0.9,
    frames: hasFrames ? { establishment: 'test', community: 'test', market: 'test' } : undefined,
  };
}

const ENABLED_CONFIG: FrameGeneratorConfig = { enabled: true, model: 'claude-haiku-4-5-20251001' };
const DISABLED_CONFIG: FrameGeneratorConfig = { enabled: false, model: 'claude-haiku-4-5-20251001' };

describe('voice profiles', () => {
  it('has 6 profiles defined', () => {
    expect(Object.keys(VOICE_PROFILES)).toHaveLength(6);
  });

  it('returns profiles for energy-grid arc', () => {
    const profiles = getProfilesForArc('energy-grid');
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.some(p => p.id === 'dte_energy')).toBe(true);
  });

  it('returns profiles for water-pfas arc', () => {
    const profiles = getProfilesForArc('water-pfas');
    expect(profiles.some(p => p.id === 'dwsd_glwa')).toBe(true);
    expect(profiles.some(p => p.id === 'three_m_corp')).toBe(true);
  });

  it('returns profiles for housing-speculation arc', () => {
    const profiles = getProfilesForArc('housing-speculation');
    expect(profiles.some(p => p.id === 'real_estate_developers')).toBe(true);
  });

  it('returns profiles for phosphorus-food arc', () => {
    const profiles = getProfilesForArc('phosphorus-food');
    expect(profiles.some(p => p.id === 'michigan_farm_bureau')).toBe(true);
  });

  it('returns profiles for infrastructure-debt arc', () => {
    const profiles = getProfilesForArc('infrastructure-debt');
    expect(profiles.some(p => p.id === 'state_legislature')).toBe(true);
  });

  it('each profile has required fields', () => {
    for (const profile of Object.values(VOICE_PROFILES)) {
      expect(profile.id).toBeTruthy();
      expect(profile.name).toBeTruthy();
      expect(profile.tone).toBeTruthy();
      expect(profile.keyPhrases.length).toBeGreaterThan(0);
      expect(profile.genuineArgument).toBeTruthy();
      expect(profile.dependents.length).toBeGreaterThan(0);
      expect(profile.exampleLanguage.length).toBeGreaterThan(0);
      expect(profile.arcs.length).toBeGreaterThan(0);
    }
  });
});

describe('buildFramePrompt', () => {
  it('includes voice profile details', () => {
    const profiles = getProfilesForArc('energy-grid');
    const prompt = buildFramePrompt(profiles);
    expect(prompt).toContain('DTE Energy');
    expect(prompt).toContain('grid reliability');
    expect(prompt).toContain('Establishment');
    expect(prompt).toContain('Community');
    expect(prompt).toContain('Market');
  });

  it('includes all three frame types', () => {
    const prompt = buildFramePrompt([]);
    expect(prompt).toContain('establishment');
    expect(prompt).toContain('community');
    expect(prompt).toContain('market');
  });
});

describe('buildFrameBatchMessage', () => {
  it('formats headlines with arcs and severity', () => {
    const msg = buildFrameBatchMessage([
      { id: 'h1', headline: 'DTE outage', arcs: ['energy-grid'], severity: 3 },
    ]);
    expect(msg).toContain('[0]');
    expect(msg).toContain('DTE outage');
    expect(msg).toContain('energy-grid');
    expect(msg).toContain('severity: 3');
  });
});

describe('parseFrameResponse', () => {
  const headlines = [{ id: 'h1' }, { id: 'h2' }];

  it('parses valid frame response', () => {
    const raw = JSON.stringify([
      {
        index: 0,
        establishment: { text: 'DTE says grid is stable', source: 'DTE Energy', confidence: 0.9 },
        community: { text: 'Residents demand accountability', source: 'community', confidence: 0.85 },
        market: { text: 'Utility stocks dip', source: 'market', confidence: 0.8 },
      },
      {
        index: 1,
        establishment: null,
        community: { text: 'Organizers rally', source: 'community', confidence: 0.7 },
        market: null,
      },
    ]);

    const results = parseFrameResponse(raw, headlines);
    expect(results).toHaveLength(2);
    expect(results[0].establishment?.text).toBe('DTE says grid is stable');
    expect(results[0].community?.text).toBe('Residents demand accountability');
    expect(results[1].establishment).toBeNull();
    expect(results[1].community?.text).toBe('Organizers rally');
  });

  it('filters low-confidence frames', () => {
    const raw = JSON.stringify([
      {
        index: 0,
        establishment: { text: 'Weak frame', source: 'test', confidence: 0.2 },
        community: { text: 'Strong frame', source: 'community', confidence: 0.9 },
        market: null,
      },
    ]);
    const results = parseFrameResponse(raw, headlines);
    expect(results[0].establishment).toBeNull();
    expect(results[0].community?.text).toBe('Strong frame');
  });

  it('handles markdown-wrapped JSON', () => {
    const raw = '```json\n[{"index": 0, "establishment": null, "community": {"text": "test", "source": "c", "confidence": 0.8}, "market": null}]\n```';
    const results = parseFrameResponse(raw, headlines);
    expect(results).toHaveLength(1);
  });

  it('returns empty on invalid JSON', () => {
    expect(parseFrameResponse('not json', headlines)).toEqual([]);
  });

  it('returns empty on non-array', () => {
    expect(parseFrameResponse('{"foo": 1}', headlines)).toEqual([]);
  });

  it('skips invalid indices', () => {
    const raw = JSON.stringify([
      { index: 99, establishment: null, community: { text: 'test', source: 'c', confidence: 0.8 }, market: null },
    ]);
    const results = parseFrameResponse(raw, headlines);
    expect(results).toEqual([]);
  });

  it('filters frames with empty text', () => {
    const raw = JSON.stringify([
      { index: 0, establishment: { text: '', source: 'test', confidence: 0.9 }, community: null, market: null },
    ]);
    const results = parseFrameResponse(raw, headlines);
    expect(results[0].establishment).toBeNull();
  });
});

describe('generateFramesBatch', () => {
  it('skips when disabled', async () => {
    const chatFn: ClassifierChatFn = async () => '[]';
    const headlines = [makeClassifiedHeadline('h1', 'DTE outage', ['energy-grid'], 3)];
    const results = await generateFramesBatch(headlines, chatFn, DISABLED_CONFIG);
    expect(results).toEqual([]);
  });

  it('skips severity 1 headlines', async () => {
    let called = false;
    const chatFn: ClassifierChatFn = async () => { called = true; return '[]'; };
    const headlines = [makeClassifiedHeadline('h1', 'DTE report', ['energy-grid'], 1)];
    await generateFramesBatch(headlines, chatFn, ENABLED_CONFIG);
    expect(called).toBe(false);
  });

  it('skips headlines that already have frames', async () => {
    let called = false;
    const chatFn: ClassifierChatFn = async () => { called = true; return '[]'; };
    const headlines = [makeClassifiedHeadline('h1', 'DTE outage', ['energy-grid'], 3, true)];
    await generateFramesBatch(headlines, chatFn, ENABLED_CONFIG);
    expect(called).toBe(false);
  });

  it('generates frames for eligible headlines', async () => {
    const chatFn: ClassifierChatFn = async () => {
      return JSON.stringify([{
        index: 0,
        establishment: { text: 'DTE assures reliable service', source: 'DTE Energy', confidence: 0.9 },
        community: { text: 'Brightmoor residents left in the dark again', source: 'community', confidence: 0.85 },
        market: { text: 'DTE shares fall 2% on outage reports', source: 'market', confidence: 0.8 },
      }]);
    };

    const headlines = [makeClassifiedHeadline('h1', 'DTE grid failure', ['energy-grid'], 3)];
    const results = await generateFramesBatch(headlines, chatFn, ENABLED_CONFIG);

    expect(results).toHaveLength(1);
    expect(results[0].establishment?.text).toContain('DTE');
    expect(results[0].community?.text).toContain('Brightmoor');
    expect(results[0].market?.text).toContain('shares');
  });

  it('handles chatFn failure gracefully', async () => {
    const chatFn: ClassifierChatFn = async () => { throw new Error('API down'); };
    const headlines = [makeClassifiedHeadline('h1', 'DTE outage', ['energy-grid'], 3)];
    const results = await generateFramesBatch(headlines, chatFn, ENABLED_CONFIG);
    expect(results).toEqual([]);
  });

  it('calls chatFn with voice profiles from headline arcs', async () => {
    let capturedSystem = '';
    const chatFn: ClassifierChatFn = async (params) => {
      capturedSystem = params.system;
      return JSON.stringify([{
        index: 0,
        establishment: { text: 'test', source: 'test', confidence: 0.9 },
        community: null,
        market: null,
      }]);
    };

    const headlines = [makeClassifiedHeadline('h1', 'PFAS in water', ['water-pfas'], 2)];
    await generateFramesBatch(headlines, chatFn, ENABLED_CONFIG);

    expect(capturedSystem).toContain('DWSD');
    expect(capturedSystem).toContain('3M Corporation');
  });
});
