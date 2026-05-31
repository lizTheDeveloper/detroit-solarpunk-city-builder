import type { CalendarState } from '../state/types';

export type RelationshipTier = 'innerCircle' | 'keyAlly' | 'activeNetwork' | 'knownContact';

interface TierConfig {
  frequencyMonths: number;
  decayPerMonth: number;
  slotsPerMonth: number;
}

const TIER_CONFIGS: Record<RelationshipTier, TierConfig> = {
  innerCircle: { frequencyMonths: 1, decayPerMonth: 8, slotsPerMonth: 1 },
  keyAlly: { frequencyMonths: 2, decayPerMonth: 5, slotsPerMonth: 0.5 },
  activeNetwork: { frequencyMonths: 4, decayPerMonth: 3, slotsPerMonth: 1 / 3 },
  knownContact: { frequencyMonths: 6, decayPerMonth: 2, slotsPerMonth: 1 / 6 },
};

export function getRelationshipTier(trust: number): RelationshipTier {
  if (trust >= 80) return 'innerCircle';
  if (trust >= 55) return 'keyAlly';
  if (trust >= 30) return 'activeNetwork';
  return 'knownContact';
}

export function monthsSinceLastInteraction(state: CalendarState, npcId: string): number {
  const last = state.lastInteractionMonth[npcId];
  if (last == null) return state.monthNumber;
  return Math.max(0, state.monthNumber - last);
}

export interface DecayResult {
  npcId: string;
  tier: RelationshipTier;
  trustLoss: number;
  monthsPastDue: number;
}

export function calculateDecayForNpc(
  state: CalendarState,
  npcId: string,
  trust: number,
): DecayResult | null {
  const tier = getRelationshipTier(trust);
  const cfg = TIER_CONFIGS[tier];
  const months = monthsSinceLastInteraction(state, npcId);
  const past = months - cfg.frequencyMonths;
  if (past <= 0) return null;
  return {
    npcId,
    tier,
    trustLoss: cfg.decayPerMonth * past,
    monthsPastDue: past,
  };
}

export type DecayWarningType = 'approaching' | 'active';

export interface DecayWarning {
  npcId: string;
  tier: RelationshipTier;
  type: DecayWarningType;
  monthsUntilDecay: number;
  monthsPastDue: number;
}

export function getDecayWarnings(
  state: CalendarState,
  npcs: Array<{ id: string; trust: number }>,
): DecayWarning[] {
  const warnings: DecayWarning[] = [];
  for (const npc of npcs) {
    const tier = getRelationshipTier(npc.trust);
    const cfg = TIER_CONFIGS[tier];
    const months = monthsSinceLastInteraction(state, npc.id);
    const past = months - cfg.frequencyMonths;
    if (past > 0) {
      warnings.push({ npcId: npc.id, tier, type: 'active', monthsUntilDecay: 0, monthsPastDue: past });
    } else if (past >= -1) {
      warnings.push({ npcId: npc.id, tier, type: 'approaching', monthsUntilDecay: -past, monthsPastDue: 0 });
    }
  }
  return warnings;
}

export function applyMonthlyDecay(
  state: CalendarState,
  npcs: Array<{ id: string; trust: number }>,
): { results: DecayResult[]; updatedTrust: Record<string, number> } {
  const results: DecayResult[] = [];
  const updatedTrust: Record<string, number> = {};
  for (const npc of npcs) {
    const decay = calculateDecayForNpc(state, npc.id, npc.trust);
    if (decay) {
      results.push(decay);
      updatedTrust[npc.id] = npc.trust - decay.trustLoss;
    }
  }
  return { results, updatedTrust };
}

export interface MaintenanceBudget {
  totalSlotsPerMonth: number;
  breakdown: Record<RelationshipTier, number>;
}

export function getMaintenanceBudget(npcs: Array<{ id: string; trust: number }>): MaintenanceBudget {
  const breakdown: Record<RelationshipTier, number> = {
    innerCircle: 0, keyAlly: 0, activeNetwork: 0, knownContact: 0,
  };
  let total = 0;
  for (const npc of npcs) {
    const tier = getRelationshipTier(npc.trust);
    breakdown[tier] += 1;
    total += TIER_CONFIGS[tier].slotsPerMonth;
  }
  return { totalSlotsPerMonth: Math.ceil(total), breakdown };
}
