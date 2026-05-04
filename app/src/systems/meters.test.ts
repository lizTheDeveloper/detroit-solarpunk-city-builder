import { describe, it, expect } from 'vitest';
import type { Meters } from '../state/types';
import {
  applyMeterFeedback,
  clampMeters,
  calculateMaxProjects,
  climateDamageMultiplier,
  climateEventProbability,
} from './meters';

function makeMeters(overrides: Partial<Meters> = {}): Meters {
  return {
    communityTrust: 50,
    ecologicalHealth: 15,
    foodSovereignty: 10,
    politicalWill: 60,
    budget: 4.2,
    climatePressure: 30,
    ...overrides,
  };
}

describe('applyMeterFeedback', () => {
  describe('Political Will regeneration', () => {
    it('gives baseline +1.0 when trust <= 40', () => {
      const meters = makeMeters({ communityTrust: 30, politicalWill: 50 });
      const result = applyMeterFeedback(meters);
      const willDelta = result.deltas.find(
        (d) => d.meter === 'politicalWill' && d.source === 'will_regen'
      );
      expect(willDelta).toBeDefined();
      expect(willDelta!.amount).toBeCloseTo(1.0, 5);
    });

    it('gives baseline +1.0 when trust is exactly 40', () => {
      const meters = makeMeters({ communityTrust: 40, politicalWill: 50 });
      const result = applyMeterFeedback(meters);
      const willDelta = result.deltas.find(
        (d) => d.meter === 'politicalWill' && d.source === 'will_regen'
      );
      expect(willDelta!.amount).toBeCloseTo(1.0, 5);
    });

    it('gives +2.5 at trust 55', () => {
      const meters = makeMeters({ communityTrust: 55, politicalWill: 50 });
      const result = applyMeterFeedback(meters);
      const willDelta = result.deltas.find(
        (d) => d.meter === 'politicalWill' && d.source === 'will_regen'
      );
      expect(willDelta!.amount).toBeCloseTo(2.5, 5);
    });

    it('gives +2.0 at trust 50', () => {
      const meters = makeMeters({ communityTrust: 50, politicalWill: 50 });
      const result = applyMeterFeedback(meters);
      const willDelta = result.deltas.find(
        (d) => d.meter === 'politicalWill' && d.source === 'will_regen'
      );
      expect(willDelta!.amount).toBeCloseTo(2.0, 5);
    });

    it('gives +4.0 at trust 70', () => {
      const meters = makeMeters({ communityTrust: 70, politicalWill: 50 });
      const result = applyMeterFeedback(meters);
      const willDelta = result.deltas.find(
        (d) => d.meter === 'politicalWill' && d.source === 'will_regen'
      );
      expect(willDelta!.amount).toBeCloseTo(4.0, 5);
    });

    it('gives +7.0 at trust 100', () => {
      const meters = makeMeters({ communityTrust: 100, politicalWill: 50 });
      const result = applyMeterFeedback(meters);
      const willDelta = result.deltas.find(
        (d) => d.meter === 'politicalWill' && d.source === 'will_regen'
      );
      expect(willDelta!.amount).toBeCloseTo(7.0, 5);
    });

    it('applies will regen to the returned meters', () => {
      const meters = makeMeters({ communityTrust: 55, politicalWill: 50 });
      const result = applyMeterFeedback(meters);
      expect(result.meters.politicalWill).toBeCloseTo(52.5, 5);
    });
  });

  describe('Food Sovereignty → Trust bonus', () => {
    it('gives +0 when foodSov <= 20', () => {
      const meters = makeMeters({ foodSovereignty: 15 });
      const result = applyMeterFeedback(meters);
      const foodTrustDelta = result.deltas.find(
        (d) => d.meter === 'communityTrust' && d.source === 'food_trust_bonus'
      );
      expect(foodTrustDelta).toBeUndefined();
    });

    it('gives +0 when foodSov is exactly 20', () => {
      const meters = makeMeters({ foodSovereignty: 20 });
      const result = applyMeterFeedback(meters);
      const foodTrustDelta = result.deltas.find(
        (d) => d.meter === 'communityTrust' && d.source === 'food_trust_bonus'
      );
      expect(foodTrustDelta).toBeUndefined();
    });

    it('gives +0.75 at foodSov 35', () => {
      const meters = makeMeters({ foodSovereignty: 35 });
      const result = applyMeterFeedback(meters);
      const foodTrustDelta = result.deltas.find(
        (d) => d.meter === 'communityTrust' && d.source === 'food_trust_bonus'
      );
      expect(foodTrustDelta).toBeDefined();
      expect(foodTrustDelta!.amount).toBeCloseTo(0.75, 5);
    });

    it('gives +0.5 at foodSov 30', () => {
      const meters = makeMeters({ foodSovereignty: 30 });
      const result = applyMeterFeedback(meters);
      const foodTrustDelta = result.deltas.find(
        (d) => d.meter === 'communityTrust' && d.source === 'food_trust_bonus'
      );
      expect(foodTrustDelta).toBeDefined();
      expect(foodTrustDelta!.amount).toBeCloseTo(0.5, 5);
    });

    it('gives +1.5 at foodSov 50', () => {
      const meters = makeMeters({ foodSovereignty: 50 });
      const result = applyMeterFeedback(meters);
      const foodTrustDelta = result.deltas.find(
        (d) => d.meter === 'communityTrust' && d.source === 'food_trust_bonus'
      );
      expect(foodTrustDelta).toBeDefined();
      expect(foodTrustDelta!.amount).toBeCloseTo(1.5, 5);
    });
  });

  describe('Trust passive decay', () => {
    it('always applies -0.3 trust decay', () => {
      const meters = makeMeters({ communityTrust: 50 });
      const result = applyMeterFeedback(meters);
      const decayDelta = result.deltas.find(
        (d) => d.meter === 'communityTrust' && d.source === 'trust_decay'
      );
      expect(decayDelta).toBeDefined();
      expect(decayDelta!.amount).toBeCloseTo(-0.3, 5);
    });

    it('applies trust decay even at low trust', () => {
      const meters = makeMeters({ communityTrust: 1 });
      const result = applyMeterFeedback(meters);
      const decayDelta = result.deltas.find(
        (d) => d.meter === 'communityTrust' && d.source === 'trust_decay'
      );
      expect(decayDelta).toBeDefined();
      expect(decayDelta!.amount).toBeCloseTo(-0.3, 5);
    });
  });

  describe('deltas source attribution', () => {
    it('includes source for each delta', () => {
      const meters = makeMeters({ communityTrust: 55, foodSovereignty: 35 });
      const result = applyMeterFeedback(meters);
      for (const delta of result.deltas) {
        expect(delta.source).toBeTruthy();
        expect(typeof delta.source).toBe('string');
      }
    });

    it('includes will_regen, trust_decay, and food_trust_bonus when applicable', () => {
      const meters = makeMeters({ communityTrust: 55, foodSovereignty: 35 });
      const result = applyMeterFeedback(meters);
      const sources = result.deltas.map((d) => d.source);
      expect(sources).toContain('will_regen');
      expect(sources).toContain('trust_decay');
      expect(sources).toContain('food_trust_bonus');
    });
  });

  describe('combined feedback from starting values', () => {
    it('produces correct deltas from starting values (trust 50, eco 15, food 10, will 60, budget 4.2, climate 30)', () => {
      const meters = makeMeters();
      // trust=50, eco=15, food=10, will=60, budget=4.2, climate=30
      const result = applyMeterFeedback(meters);

      // Will regen: 1.0 + max(0, (50-40)*0.1) = 1.0 + 1.0 = 2.0
      const willDelta = result.deltas.find(
        (d) => d.meter === 'politicalWill' && d.source === 'will_regen'
      );
      expect(willDelta!.amount).toBeCloseTo(2.0, 5);

      // Food->trust: max(0, (10-20)*0.05) = max(0, -0.5) = 0, so no delta
      const foodTrustDelta = result.deltas.find(
        (d) => d.meter === 'communityTrust' && d.source === 'food_trust_bonus'
      );
      expect(foodTrustDelta).toBeUndefined();

      // Trust decay: -0.3
      const trustDecay = result.deltas.find(
        (d) => d.meter === 'communityTrust' && d.source === 'trust_decay'
      );
      expect(trustDecay!.amount).toBeCloseTo(-0.3, 5);

      // Final meters
      expect(result.meters.politicalWill).toBeCloseTo(62.0, 5);
      expect(result.meters.communityTrust).toBeCloseTo(49.7, 5);
      // Other meters unchanged
      expect(result.meters.ecologicalHealth).toBe(15);
      expect(result.meters.foodSovereignty).toBe(10);
      expect(result.meters.budget).toBe(4.2);
      expect(result.meters.climatePressure).toBe(30);
    });

    it('combines food bonus and trust decay correctly', () => {
      const meters = makeMeters({ communityTrust: 60, foodSovereignty: 50 });
      const result = applyMeterFeedback(meters);

      // Food->trust: max(0, (50-20)*0.05) = 1.5
      // Trust decay: -0.3
      // Net trust change: +1.2
      expect(result.meters.communityTrust).toBeCloseTo(61.2, 5);
    });
  });

  describe('does not mutate input', () => {
    it('returns new meters object without mutating input', () => {
      const meters = makeMeters();
      const original = { ...meters };
      applyMeterFeedback(meters);
      expect(meters).toEqual(original);
    });
  });
});

describe('climateDamageMultiplier', () => {
  it('returns 1.0 at eco 0', () => {
    expect(climateDamageMultiplier(0)).toBeCloseTo(1.0, 5);
  });

  it('returns 0.6 at eco 50', () => {
    expect(climateDamageMultiplier(50)).toBeCloseTo(0.6, 5);
  });

  it('returns 0.2 at eco 100', () => {
    expect(climateDamageMultiplier(100)).toBeCloseTo(0.2, 5);
  });

  it('never goes below 0.1', () => {
    expect(climateDamageMultiplier(150)).toBeCloseTo(0.1, 5);
  });
});

describe('climateEventProbability', () => {
  it('returns 0.2 at pressure 30', () => {
    expect(climateEventProbability(30)).toBeCloseTo(0.2, 5);
  });

  it('returns 0.45 at pressure 80', () => {
    expect(climateEventProbability(80)).toBeCloseTo(0.45, 5);
  });

  it('returns 0.05 at pressure 0', () => {
    expect(climateEventProbability(0)).toBeCloseTo(0.05, 5);
  });
});

describe('calculateMaxProjects', () => {
  it('returns 2 at trust 0', () => {
    expect(calculateMaxProjects(0)).toBe(2);
  });

  it('returns 2 at trust 24', () => {
    expect(calculateMaxProjects(24)).toBe(2);
  });

  it('returns 3 at trust 25', () => {
    expect(calculateMaxProjects(25)).toBe(3);
  });

  it('returns 3 at trust 49', () => {
    expect(calculateMaxProjects(49)).toBe(3);
  });

  it('returns 4 at trust 50', () => {
    expect(calculateMaxProjects(50)).toBe(4);
  });

  it('returns 4 at trust 74', () => {
    expect(calculateMaxProjects(74)).toBe(4);
  });

  it('returns 5 at trust 75', () => {
    expect(calculateMaxProjects(75)).toBe(5);
  });

  it('returns 6 at trust 100', () => {
    expect(calculateMaxProjects(100)).toBe(6);
  });
});

describe('clampMeters', () => {
  it('clamps trust to 0 when negative', () => {
    const meters = makeMeters({ communityTrust: -5 });
    const clamped = clampMeters(meters);
    expect(clamped.communityTrust).toBe(0);
  });

  it('clamps trust to 100 when over', () => {
    const meters = makeMeters({ communityTrust: 110 });
    const clamped = clampMeters(meters);
    expect(clamped.communityTrust).toBe(100);
  });

  it('leaves trust alone when in range', () => {
    const meters = makeMeters({ communityTrust: 55 });
    const clamped = clampMeters(meters);
    expect(clamped.communityTrust).toBe(55);
  });

  it('clamps ecologicalHealth to 0-100', () => {
    expect(clampMeters(makeMeters({ ecologicalHealth: -10 })).ecologicalHealth).toBe(0);
    expect(clampMeters(makeMeters({ ecologicalHealth: 120 })).ecologicalHealth).toBe(100);
    expect(clampMeters(makeMeters({ ecologicalHealth: 50 })).ecologicalHealth).toBe(50);
  });

  it('clamps foodSovereignty to 0-100', () => {
    expect(clampMeters(makeMeters({ foodSovereignty: -1 })).foodSovereignty).toBe(0);
    expect(clampMeters(makeMeters({ foodSovereignty: 101 })).foodSovereignty).toBe(100);
  });

  it('clamps politicalWill to 0-100', () => {
    expect(clampMeters(makeMeters({ politicalWill: -20 })).politicalWill).toBe(0);
    expect(clampMeters(makeMeters({ politicalWill: 200 })).politicalWill).toBe(100);
  });

  it('clamps climatePressure to 0-100', () => {
    expect(clampMeters(makeMeters({ climatePressure: -5 })).climatePressure).toBe(0);
    expect(clampMeters(makeMeters({ climatePressure: 150 })).climatePressure).toBe(100);
  });

  it('clamps budget to min 0 with no max', () => {
    expect(clampMeters(makeMeters({ budget: -3 })).budget).toBe(0);
    expect(clampMeters(makeMeters({ budget: 999 })).budget).toBe(999);
  });

  it('does not mutate input', () => {
    const meters = makeMeters({ communityTrust: 110 });
    const original = { ...meters };
    clampMeters(meters);
    expect(meters).toEqual(original);
  });
});
