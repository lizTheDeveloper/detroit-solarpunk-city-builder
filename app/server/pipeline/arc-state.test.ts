import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  accumulateHit,
  checkWeeklyReset,
  checkStageTransition,
  loadArcState,
  saveArcState,
  updateArcStates,
} from './arc-state.ts';
import type { ArcState, ProcessedHeadline, ArcConfig } from './types.ts';

const TEST_DATA_DIR = join(import.meta.dirname, 'data-test');

const defaultConfig: ArcConfig = {
  escalationThreshold: 3,
  minStageDuration: 48,
  keywords: ['energy', 'grid', 'DTE'],
};

function makeArcState(overrides: Partial<ArcState> = {}): ArcState {
  return {
    arcId: 'energy-grid',
    stage: 'dormant',
    weeklyHits: { severity1: 0, severity2: 0, severity3: 0 },
    cumulativeHits: 0,
    lastHeadlineTimestamp: null,
    stageEnteredAt: new Date().toISOString(),
    config: defaultConfig,
    ...overrides,
  };
}

function makeHeadline(overrides: Partial<ProcessedHeadline> = {}): ProcessedHeadline {
  return {
    id: 'test-id-' + Math.random().toString(36).slice(2),
    source: 'theblue_report',
    date: new Date().toISOString(),
    headline: 'Test headline',
    url: 'https://example.com/test',
    metadata: {},
    fetchedAt: new Date().toISOString(),
    classified: true,
    arcs: ['energy-grid'],
    severity: 1,
    locality: 'detroit',
    confidence: 0.85,
    ...overrides,
  };
}

describe('accumulateHit', () => {
  it('increments severity1 counter for severity-1 headlines', () => {
    const state = makeArcState();
    const headline = makeHeadline({ severity: 1 });
    const result = accumulateHit(state, headline);

    expect(result.weeklyHits.severity1).toBe(1);
    expect(result.weeklyHits.severity2).toBe(0);
    expect(result.weeklyHits.severity3).toBe(0);
    expect(result.cumulativeHits).toBe(1);
  });

  it('increments severity2 counter for severity-2 headlines', () => {
    const state = makeArcState();
    const headline = makeHeadline({ severity: 2 });
    const result = accumulateHit(state, headline);

    expect(result.weeklyHits.severity2).toBe(1);
    expect(result.cumulativeHits).toBe(1);
  });

  it('increments severity3 counter for severity-3 headlines', () => {
    const state = makeArcState();
    const headline = makeHeadline({ severity: 3 });
    const result = accumulateHit(state, headline);

    expect(result.weeklyHits.severity3).toBe(1);
    expect(result.cumulativeHits).toBe(1);
  });

  it('accumulates multiple hits', () => {
    let state = makeArcState();
    state = accumulateHit(state, makeHeadline({ severity: 1 }));
    state = accumulateHit(state, makeHeadline({ severity: 2 }));
    state = accumulateHit(state, makeHeadline({ severity: 1 }));

    expect(state.weeklyHits.severity1).toBe(2);
    expect(state.weeklyHits.severity2).toBe(1);
    expect(state.cumulativeHits).toBe(3);
  });

  it('updates lastHeadlineTimestamp', () => {
    const state = makeArcState();
    const date = '2026-05-05T12:00:00.000Z';
    const headline = makeHeadline({ severity: 1, date });
    const result = accumulateHit(state, headline);

    expect(result.lastHeadlineTimestamp).toBe(date);
  });
});

describe('checkWeeklyReset', () => {
  it('does not reset when lastHeadlineTimestamp is null', () => {
    const state = makeArcState({
      weeklyHits: { severity1: 5, severity2: 2, severity3: 1 },
    });
    const result = checkWeeklyReset(state);

    expect(result.weeklyHits.severity1).toBe(5);
    expect(result.weeklyHits.severity2).toBe(2);
    expect(result.weeklyHits.severity3).toBe(1);
  });

  it('does not reset when still in same week', () => {
    const now = new Date();
    const state = makeArcState({
      weeklyHits: { severity1: 5, severity2: 2, severity3: 1 },
      lastHeadlineTimestamp: now.toISOString(),
    });
    const result = checkWeeklyReset(state);

    expect(result.weeklyHits.severity1).toBe(5);
  });

  it('resets weekly hits when a new week has started', () => {
    // Set lastHeadlineTimestamp to 2 weeks ago
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const state = makeArcState({
      weeklyHits: { severity1: 5, severity2: 2, severity3: 1 },
      lastHeadlineTimestamp: twoWeeksAgo.toISOString(),
      cumulativeHits: 8,
    });
    const result = checkWeeklyReset(state);

    expect(result.weeklyHits.severity1).toBe(0);
    expect(result.weeklyHits.severity2).toBe(0);
    expect(result.weeklyHits.severity3).toBe(0);
    // Cumulative hits should persist
    expect(result.cumulativeHits).toBe(8);
  });
});

describe('checkStageTransition', () => {
  it('dormant -> foreshadow on any hit', () => {
    const state = makeArcState({
      stage: 'dormant',
      weeklyHits: { severity1: 1, severity2: 0, severity3: 0 },
    });
    const result = checkStageTransition(state);

    expect(result.stage).toBe('foreshadow');
  });

  it('stays dormant with zero hits', () => {
    const state = makeArcState({
      stage: 'dormant',
      weeklyHits: { severity1: 0, severity2: 0, severity3: 0 },
    });
    const result = checkStageTransition(state);

    expect(result.stage).toBe('dormant');
  });

  it('foreshadow -> escalation when threshold met and minDuration passed', () => {
    const longAgo = new Date();
    longAgo.setHours(longAgo.getHours() - 72); // 72 hours ago (> 48h minStageDuration)

    const state = makeArcState({
      stage: 'foreshadow',
      weeklyHits: { severity1: 1, severity2: 1, severity3: 0 },
      // weighted: 1 + 2 = 3 >= threshold of 3
      stageEnteredAt: longAgo.toISOString(),
    });
    const result = checkStageTransition(state);

    expect(result.stage).toBe('escalation');
  });

  it('foreshadow stays if threshold met but minDuration not passed', () => {
    const justNow = new Date();
    justNow.setMinutes(justNow.getMinutes() - 5); // 5 minutes ago

    const state = makeArcState({
      stage: 'foreshadow',
      weeklyHits: { severity1: 1, severity2: 1, severity3: 0 },
      stageEnteredAt: justNow.toISOString(),
    });
    const result = checkStageTransition(state);

    expect(result.stage).toBe('foreshadow');
  });

  it('foreshadow stays if minDuration passed but threshold not met', () => {
    const longAgo = new Date();
    longAgo.setHours(longAgo.getHours() - 72);

    const state = makeArcState({
      stage: 'foreshadow',
      weeklyHits: { severity1: 1, severity2: 0, severity3: 0 },
      // weighted: 1 < threshold of 3
      stageEnteredAt: longAgo.toISOString(),
    });
    const result = checkStageTransition(state);

    expect(result.stage).toBe('foreshadow');
  });

  it('escalation -> crisis on severity-3 hit with minDuration passed', () => {
    const longAgo = new Date();
    longAgo.setHours(longAgo.getHours() - 72);

    const state = makeArcState({
      stage: 'escalation',
      weeklyHits: { severity1: 2, severity2: 1, severity3: 1 },
      stageEnteredAt: longAgo.toISOString(),
    });
    const result = checkStageTransition(state);

    expect(result.stage).toBe('crisis');
  });

  it('escalation -> crisis on sustained high volume (2x threshold)', () => {
    const longAgo = new Date();
    longAgo.setHours(longAgo.getHours() - 72);

    const state = makeArcState({
      stage: 'escalation',
      weeklyHits: { severity1: 2, severity2: 2, severity3: 0 },
      // weighted: 2 + 4 = 6 >= threshold*2 = 6
      stageEnteredAt: longAgo.toISOString(),
    });
    const result = checkStageTransition(state);

    expect(result.stage).toBe('crisis');
  });

  it('escalation stays if severity-3 but minDuration not passed', () => {
    const justNow = new Date();
    justNow.setMinutes(justNow.getMinutes() - 5);

    const state = makeArcState({
      stage: 'escalation',
      weeklyHits: { severity1: 0, severity2: 0, severity3: 1 },
      stageEnteredAt: justNow.toISOString(),
    });
    const result = checkStageTransition(state);

    expect(result.stage).toBe('escalation');
  });

  it('crisis does not auto-transition (requires manual trigger)', () => {
    const longAgo = new Date();
    longAgo.setHours(longAgo.getHours() - 200);

    const state = makeArcState({
      stage: 'crisis',
      weeklyHits: { severity1: 10, severity2: 5, severity3: 3 },
      stageEnteredAt: longAgo.toISOString(),
    });
    const result = checkStageTransition(state);

    expect(result.stage).toBe('crisis');
  });

  it('resolved stays resolved', () => {
    const state = makeArcState({ stage: 'resolved' });
    const result = checkStageTransition(state);
    expect(result.stage).toBe('resolved');
  });
});

describe('arc state persistence', () => {
  beforeEach(() => {
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
    mkdirSync(join(TEST_DATA_DIR, 'arc-state'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  it('saves and loads arc state', () => {
    const state = makeArcState({
      weeklyHits: { severity1: 3, severity2: 1, severity3: 0 },
      cumulativeHits: 4,
    });

    saveArcState(TEST_DATA_DIR, state);
    const loaded = loadArcState(TEST_DATA_DIR, 'energy-grid', defaultConfig);

    expect(loaded.arcId).toBe('energy-grid');
    expect(loaded.weeklyHits.severity1).toBe(3);
    expect(loaded.cumulativeHits).toBe(4);
  });

  it('returns default state when no file exists', () => {
    const loaded = loadArcState(TEST_DATA_DIR, 'nonexistent-arc', defaultConfig);

    expect(loaded.arcId).toBe('nonexistent-arc');
    expect(loaded.stage).toBe('dormant');
    expect(loaded.cumulativeHits).toBe(0);
  });
});

describe('updateArcStates integration', () => {
  beforeEach(() => {
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
    mkdirSync(join(TEST_DATA_DIR, 'arc-state'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  it('updates arc state from classified headlines', () => {
    const headlines: ProcessedHeadline[] = [
      makeHeadline({ arcs: ['energy-grid'], severity: 1, classified: true }),
      makeHeadline({ arcs: ['energy-grid'], severity: 2, classified: true }),
      makeHeadline({ arcs: ['water-pfas'], severity: 1, classified: true }),
    ];

    const states = updateArcStates(TEST_DATA_DIR, headlines);

    const energyState = states.find(s => s.arcId === 'energy-grid');
    expect(energyState).toBeDefined();
    expect(energyState!.weeklyHits.severity1).toBe(1);
    expect(energyState!.weeklyHits.severity2).toBe(1);
    expect(energyState!.cumulativeHits).toBe(2);
  });

  it('ignores unclassified headlines', () => {
    const headlines: ProcessedHeadline[] = [
      makeHeadline({ arcs: ['energy-grid'], severity: 1, classified: false }),
    ];

    const states = updateArcStates(TEST_DATA_DIR, headlines);

    const energyState = states.find(s => s.arcId === 'energy-grid');
    expect(energyState!.cumulativeHits).toBe(0);
  });

  it('ignores severity-0 headlines', () => {
    const headlines: ProcessedHeadline[] = [
      makeHeadline({ arcs: ['energy-grid'], severity: 0, classified: true }),
    ];

    const states = updateArcStates(TEST_DATA_DIR, headlines);

    const energyState = states.find(s => s.arcId === 'energy-grid');
    expect(energyState!.cumulativeHits).toBe(0);
  });
});
