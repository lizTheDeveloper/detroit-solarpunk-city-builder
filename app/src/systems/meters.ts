import type { Meters, MeterDelta } from '../state/types';

/**
 * Computes all passive per-turn meter changes and returns updated meters
 * plus an array of deltas with source attribution.
 * Runs once per turn during the resolve phase.
 *
 * All rates scaled for monthly turns (÷3 from original quarterly values).
 * Same total annual impact: 12 monthly ticks = 4 quarterly ticks at 3x rate.
 *
 * Will regen calibrated so policies are reachable by turn 18-24 with active play.
 * Detroit organizing reality: sustained monthly meetings + coalition of 5+ orgs
 * = enough political will to pass targeted ordinances within 3-4 years (18-30 turns).
 * Source: Detroit People's Platform model, Right to Counsel timeline.
 */
export function applyMeterFeedback(meters: Meters): {
  meters: Meters;
  deltas: MeterDelta[];
} {
  const deltas: MeterDelta[] = [];
  const updated: Meters = { ...meters };

  // 1. Political Will regeneration — base 1.0 + trust bonus + crisis recovery boost
  // At 50% trust: 1.0 + 0.33 = 1.33/turn. Recovery boost adds up to 1.5 when will < 15.
  const baseWillRegen = 1.0 + Math.max(0, (meters.communityTrust - 40) * 0.033);
  const recoveryBoost = meters.politicalWill < 15 ? (15 - meters.politicalWill) * 0.1 : 0;
  const willRegen = baseWillRegen + recoveryBoost;
  deltas.push({ meter: 'politicalWill', amount: willRegen, source: 'will_regen' });
  updated.politicalWill += willRegen;

  // 2. Food Sovereignty → Trust bonus (food access is #1 neighborhood concern)
  // Capped: diminishing returns above 20, hard cap at 0.2/turn (was 0.6 quarterly)
  const foodAboveThreshold = Math.max(0, meters.foodSovereignty - 20);
  const diminishingFood = foodAboveThreshold > 25 ? 25 + (foodAboveThreshold - 25) * 0.2 : foodAboveThreshold;
  const trustFoodBonus = Math.min(0.2, diminishingFood * 0.01);
  if (trustFoodBonus > 0) {
    deltas.push({ meter: 'communityTrust', amount: trustFoodBonus, source: 'food_trust_bonus' });
    updated.communityTrust += trustFoodBonus;
  }

  // 3. Trust passive decay — accelerates sharply above 70 (coalition fatigue)
  // At 50% trust: -0.3/turn. At 70%: -0.5/turn. At 90%: -0.9/turn. (was 3x quarterly)
  // Real organizing: sustained high trust requires constant maintenance work.
  const baseDecay = 0.1 + meters.communityTrust * 0.004;
  const highTrustPenalty = meters.communityTrust > 70 ? (meters.communityTrust - 70) * 0.013 : 0;
  const trustDecay = -(baseDecay + highTrustPenalty);
  deltas.push({ meter: 'communityTrust', amount: trustDecay, source: 'trust_decay' });
  updated.communityTrust += trustDecay;

  // 4. Ecological health passive decay — Detroit loses 2,000 trees/year, vacancy blight
  // -0.05/turn monthly (was -0.15 quarterly). Same annual: -0.6/year.
  const ecoDecay = -0.05;
  deltas.push({ meter: 'ecologicalHealth', amount: ecoDecay, source: 'eco_decay' });
  updated.ecologicalHealth += ecoDecay;

  return { meters: updated, deltas };
}

/**
 * Climate damage multiplier based on ecological health.
 * Higher eco health reduces damage from climate events.
 * At 50% eco: damage reduced by 40%. At 100%: reduced by 80%.
 */
export function climateDamageMultiplier(eco: number): number {
  return Math.max(0.2, 1.0 - eco * 0.008);
}

/**
 * Climate event probability based on climate pressure.
 * Detroit now floods every 1-2 years (was once per century). 2-inch+ extreme storms
 * increased 128% from 1964-2014. At 30% pressure (starting): ~20% chance/turn.
 * At 50%: ~35%. At 70%+: nearly every turn something happens.
 * Source: Bridge Michigan, Grist "How Many 500-Year Floods", GLISA data.
 */
export function climateEventProbability(climatePressure: number): number {
  return 0.10 + climatePressure * 0.008;
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
