/**
 * Benchmark harness tests: determinism (same seed → same game) and metrics
 * correctness (Gini, summarize shape). The determinism test is the whole point
 * of the seeded runner — it lets the LLM benchmark do paired comparison.
 */

import { describe, it, expect } from 'vitest';
import { playGame } from '../../scripts/bench/runner.ts';
import { summarize, gini } from '../../scripts/bench/metrics.ts';
import { wilson95, ci95 } from '../../scripts/bench/report.ts';
import { ARCHETYPES } from '../../scripts/bench/archetypes.ts';

const agent = ARCHETYPES.find((a) => a.id === 'equity-organizer')!;

function trajectory(result: Awaited<ReturnType<typeof playGame>>): string {
  return JSON.stringify(result.turns.map((t) => t.metersAfter));
}

describe('runner determinism', () => {
  it('same agent + same seed → identical meter trajectory', async () => {
    const a = await playGame(agent, 4242, { maxTurns: 16 });
    const b = await playGame(agent, 4242, { maxTurns: 16 });
    expect(trajectory(a)).toBe(trajectory(b));
  });

  it('different seeds → generally different trajectories', async () => {
    const a = await playGame(agent, 1, { maxTurns: 16 });
    const b = await playGame(agent, 2, { maxTurns: 16 });
    expect(trajectory(a)).not.toBe(trajectory(b));
  });

  it('restores global Math.random after a run', async () => {
    const before = Math.random;
    await playGame(agent, 7, { maxTurns: 4 });
    expect(Math.random).toBe(before);
  });
});

describe('metrics', () => {
  it('summarize produces all meters + an outcome + a score', async () => {
    const result = await playGame(agent, 99, { maxTurns: 16 });
    const m = summarize(result);
    expect(['win', 'loss', 'survived']).toContain(m.outcome);
    expect(typeof m.electionScore).toBe('number');
    // Reads meters generically — all six core meters present.
    for (const k of ['communityTrust', 'ecologicalHealth', 'foodSovereignty', 'politicalWill', 'budget', 'climatePressure']) {
      expect(m.meters[k]).toBeDefined();
    }
    expect(m.fingerprint.neighborhoodGini).toBeGreaterThanOrEqual(0);
    expect(m.fingerprint.neighborhoodGini).toBeLessThanOrEqual(1);
  });

  it('gini: equal distribution ≈ 0, fully concentrated ≈ 1', () => {
    expect(gini([5, 5, 5, 5])).toBeCloseTo(0, 5);
    expect(gini([0, 0, 0, 10])).toBeCloseTo(0.75, 2); // (n-1)/n for n=4
    expect(gini([])).toBe(0);
  });
});

describe('confidence intervals', () => {
  it('wilson95: 3/3 wins is NOT a certain 100% (small-n honesty)', () => {
    const [lo, hi] = wilson95(3, 3);
    expect(lo).toBeLessThan(0.5); // ~0.44 — wide for n=3
    expect(hi).toBe(1);
    expect(wilson95(0, 0)).toEqual([0, 0]);
  });

  it('wilson95: large n tightens the interval', () => {
    const [lo, hi] = wilson95(30, 30);
    expect(lo).toBeGreaterThan(0.85); // ~0.89
    expect(hi).toBe(1);
  });

  it('ci95: zero variance → zero half-width; needs n>=2', () => {
    expect(ci95([62, 62, 62])).toBe(0);
    expect(ci95([1])).toBe(0);
    expect(ci95([0, 10])).toBeGreaterThan(0);
  });
});
