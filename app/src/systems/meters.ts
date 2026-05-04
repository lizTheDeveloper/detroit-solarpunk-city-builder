import type { Meters, MeterDelta } from '../state/types';

/**
 * Computes all passive per-turn meter changes and returns updated meters
 * plus an array of deltas with source attribution.
 * Runs once per turn during the resolve phase.
 */
export function applyMeterFeedback(meters: Meters): {
  meters: Meters;
  deltas: MeterDelta[];
} {
  const deltas: MeterDelta[] = [];
  const updated: Meters = { ...meters };

  // 1. Political Will regeneration
  const willRegen = 1.0 + Math.max(0, (meters.communityTrust - 40) * 0.1);
  deltas.push({ meter: 'politicalWill', amount: willRegen, source: 'will_regen' });
  updated.politicalWill += willRegen;

  // 2. Food Sovereignty → Trust bonus
  const trustFoodBonus = Math.max(0, (meters.foodSovereignty - 20) * 0.05);
  if (trustFoodBonus > 0) {
    deltas.push({ meter: 'communityTrust', amount: trustFoodBonus, source: 'food_trust_bonus' });
    updated.communityTrust += trustFoodBonus;
  }

  // 3. Trust passive decay
  const trustDecay = -0.3;
  deltas.push({ meter: 'communityTrust', amount: trustDecay, source: 'trust_decay' });
  updated.communityTrust += trustDecay;

  return { meters: updated, deltas };
}

/**
 * Climate damage multiplier based on ecological health.
 * Higher eco health reduces damage from climate events.
 */
export function climateDamageMultiplier(eco: number): number {
  return Math.max(0.1, 1.0 - eco * 0.008);
}

/**
 * Climate event probability based on climate pressure.
 * Higher pressure increases chance of climate events each turn.
 */
export function climateEventProbability(climatePressure: number): number {
  return 0.05 + climatePressure * 0.005;
}

/**
 * Calculate maximum concurrent projects allowed based on community trust.
 */
export function calculateMaxProjects(trust: number): number {
  return Math.floor(2 + trust / 25);
}

/**
 * Clamp all percentage meters to 0-100 range.
 * Budget has min 0, no max.
 */
export function clampMeters(meters: Meters): Meters {
  return {
    communityTrust: Math.max(0, Math.min(100, meters.communityTrust)),
    ecologicalHealth: Math.max(0, Math.min(100, meters.ecologicalHealth)),
    foodSovereignty: Math.max(0, Math.min(100, meters.foodSovereignty)),
    politicalWill: Math.max(0, Math.min(100, meters.politicalWill)),
    budget: Math.max(0, meters.budget),
    climatePressure: Math.max(0, Math.min(100, meters.climatePressure)),
  };
}
