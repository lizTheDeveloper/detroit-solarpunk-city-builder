import type { CalendarState } from '../state/types';

export type RelationshipTier = 'innerCircle' | 'keyAlly' | 'activeNetwork' | 'knownContact';

interface DecayConfig {
  frequency: number;  // months between required interactions
  decayPerMonth: number;  // trust lost per month past threshold
}

const DECAY_CONFIG: Record<RelationshipTier, DecayConfig> = {
  innerCircle: { frequency: 1, decayPerMonth: 8 },
  keyAlly: { frequency: 2, decayPerMonth: 5 },
  activeNetwork: { frequency: 3, decayPerMonth: 3 },
  knownContact: { frequency: 6, decayPerMonth: 2 },
};

export interface DecayResult {
  npcId: string;
  trustLoss: number;
  monthsNeglected: number;
  tier: RelationshipTier;
}

export interface DecayWarning {
  npcId: string;
  tier: RelationshipTier;
  monthsUntilDecay: number;
  type: 'approaching' | 'active';
}

/**
 * Determine an NPC's maintenance tier based on their trust level.
 */
export function getRelationshipTier(trust: number): RelationshipTier {
  if (trust >= 80) return 'innerCircle';
  if (trust >= 55) return 'keyAlly';
  if (trust >= 30) return 'activeNetwork';
  return 'knownContact';
}

/**
 * Calculate months since last interaction with an NPC.
 */
export function monthsSinceLastInteraction(
  calendarState: CalendarState,
  npcId: string,
): number {
  const lastMonth = calendarState.lastInteractionMonth[npcId];
  if (lastMonth === undefined) return calendarState.monthNumber; // never met = full duration
  return calendarState.monthNumber - lastMonth;
}

/**
 * Calculate decay for a single NPC.
 * Returns trust loss amount (0 if within maintenance window).
 */
export function calculateDecayForNpc(
  calendarState: CalendarState,
  npcId: string,
  currentTrust: number,
): DecayResult | null {
  const tier = getRelationshipTier(currentTrust);
  const config = DECAY_CONFIG[tier];
  const monthsAway = monthsSinceLastInteraction(calendarState, npcId);
  const monthsPastThreshold = monthsAway - config.frequency;

  if (monthsPastThreshold <= 0) return null;

  return {
    npcId,
    trustLoss: config.decayPerMonth * monthsPastThreshold,
    monthsNeglected: monthsPastThreshold,
    tier,
  };
}

/**
 * Calculate decay warnings for NPCs approaching their threshold.
 */
export function getDecayWarnings(
  calendarState: CalendarState,
  npcs: Array<{ id: string; trust: number }>,
): DecayWarning[] {
  const warnings: DecayWarning[] = [];

  for (const npc of npcs) {
    const tier = getRelationshipTier(npc.trust);
    const config = DECAY_CONFIG[tier];
    const monthsAway = monthsSinceLastInteraction(calendarState, npc.id);
    const monthsUntilDecay = config.frequency - monthsAway;

    if (monthsUntilDecay <= 1 && monthsUntilDecay > 0) {
      warnings.push({ npcId: npc.id, tier, monthsUntilDecay, type: 'approaching' });
    } else if (monthsUntilDecay <= 0) {
      warnings.push({ npcId: npc.id, tier, monthsUntilDecay: 0, type: 'active' });
    }
  }

  return warnings;
}

/**
 * Apply all relationship decay at month end.
 * Returns array of decay results and updated trust values.
 */
export function applyMonthlyDecay(
  calendarState: CalendarState,
  npcs: Array<{ id: string; trust: number }>,
): { results: DecayResult[]; updatedTrust: Record<string, number> } {
  const results: DecayResult[] = [];
  const updatedTrust: Record<string, number> = {};

  for (const npc of npcs) {
    const decay = calculateDecayForNpc(calendarState, npc.id, npc.trust);
    if (decay) {
      results.push(decay);
      updatedTrust[npc.id] = Math.max(0, npc.trust - decay.trustLoss);
    }
  }

  return { results, updatedTrust };
}

/**
 * Get the maintenance cost in slots per month for all NPCs at their current tiers.
 * Useful for showing player how much time relationship maintenance requires.
 */
export function getMaintenanceBudget(
  npcs: Array<{ id: string; trust: number }>,
): { totalSlotsPerMonth: number; breakdown: Record<RelationshipTier, number> } {
  const breakdown: Record<RelationshipTier, number> = {
    innerCircle: 0,
    keyAlly: 0,
    activeNetwork: 0,
    knownContact: 0,
  };

  for (const npc of npcs) {
    const tier = getRelationshipTier(npc.trust);
    breakdown[tier]++;
  }

  // Each interaction costs ~1-2 slots. Inner circle needs monthly, key ally every 2 months, etc.
  const slotsPerMonth =
    breakdown.innerCircle * 1 +       // 1 slot/month each (monthly maintenance)
    breakdown.keyAlly * 0.5 +          // 1 slot every 2 months = 0.5/month
    breakdown.activeNetwork * 0.33 +   // 1 slot every 3 months
    breakdown.knownContact * 0.17;     // 1 slot every 6 months

  return { totalSlotsPerMonth: Math.ceil(slotsPerMonth), breakdown };
}
