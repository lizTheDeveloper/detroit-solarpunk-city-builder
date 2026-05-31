import type { CalendarState, Stage } from '../state/types';

export interface DelegationTier {
  tier: number;
  name: string;
  fixedReduction: number;
  managementCost: number;
  budgetCostPerYear: number;
}

export const DELEGATION_TIERS: Record<number, DelegationTier> = {
  0: { tier: 0, name: 'Solo', fixedReduction: 0, managementCost: 0, budgetCostPerYear: 0 },
  1: { tier: 1, name: 'Chief of Staff', fixedReduction: 6, managementCost: 2, budgetCostPerYear: 0.08 },
  2: { tier: 2, name: 'Deputy Mayor', fixedReduction: 12, managementCost: 3, budgetCostPerYear: 0.15 },
  3: { tier: 3, name: 'Community Self-Governance', fixedReduction: 20, managementCost: 0, budgetCostPerYear: 0.10 },
  4: { tier: 4, name: 'Movement Infrastructure', fixedReduction: 23, managementCost: 0, budgetCostPerYear: 0 },
};

export interface DelegationContext {
  turn: number;
  budget: number;
  politicalWill: number;
  communityTrust: number;
  communityOwnedTiles: number;
  hasChampionNpc: boolean;
  stage: Stage | string;
}

/** Check whether a delegation tier can be unlocked given current state. */
export function canUnlockTier(tier: number, ctx: DelegationContext): boolean {
  switch (tier) {
    case 0: return true;
    case 1: return ctx.turn >= 8 && ctx.budget >= 50000 && ctx.politicalWill > 40
      ? true
      : ctx.turn >= 8 && ctx.budget >= 0.05 && ctx.politicalWill > 40;
    case 2: return ctx.turn >= 12 && ctx.politicalWill >= 50 && ctx.hasChampionNpc;
    case 3: return ctx.communityOwnedTiles >= 3 && ctx.communityTrust > 70;
    case 4: return ctx.stage === 'beyond' && ctx.communityTrust > 70;
    default: return false;
  }
}

/** Net discretionary slot gain from running this delegation tier. */
export function getNetSlotGain(tier: number): number {
  const def = DELEGATION_TIERS[tier];
  if (!def) return 0;
  return def.fixedReduction - def.managementCost;
}

/** Apply delegation tier to a CalendarState: reduce fixed obligations, account for management overhead. */
export function applyDelegationToCalendar(state: CalendarState, tier: number): CalendarState {
  const def = DELEGATION_TIERS[tier];
  if (!def) return state;

  const newFixed = Math.max(15, 38 - def.fixedReduction);
  const newDiscretionary = Math.max(0, state.totalSlots - newFixed - state.crisisSlotTax - def.managementCost);

  return {
    ...state,
    fixedSlots: newFixed,
    discretionarySlots: newDiscretionary,
    delegationTier: tier,
  };
}

export interface DeputyDecision {
  decision: string;
  conflictsWithPlayer: boolean;
  description: string;
}

const DEPUTY_DECISIONS: DeputyDecision[] = [
  { decision: 'approved_minor_grant', conflictsWithPlayer: false, description: 'Deputy approved a $5K community grant.' },
  { decision: 'declined_developer_meeting', conflictsWithPlayer: false, description: 'Deputy declined a developer meeting.' },
  { decision: 'accepted_state_compromise', conflictsWithPlayer: true, description: 'Deputy accepted a state-level compromise without your input.' },
  { decision: 'public_endorsement', conflictsWithPlayer: true, description: 'Deputy publicly endorsed a candidate you have not vetted.' },
];

/**
 * Roll for a deputy-made decision this month.
 * Tier 0/1 never produces autonomous decisions. Tier 2+ have a chance.
 * Conflict probability decreases after 6 months in role.
 */
export function checkDeputyDecision(
  tier: number,
  monthsInRole: number,
  rng: () => number = Math.random,
): DeputyDecision | null {
  if (tier < 2) return null;

  const decisionChance = 0.5;
  const roll = rng();
  if (roll >= decisionChance) return null;

  const conflictThreshold = monthsInRole >= 6 ? 0.1 : 0.2;
  const conflictsWithPlayer = roll < conflictThreshold;

  const pool = DEPUTY_DECISIONS.filter(d => d.conflictsWithPlayer === conflictsWithPlayer);
  if (pool.length === 0) return null;
  const idx = Math.floor(rng() * pool.length);
  return pool[Math.min(idx, pool.length - 1)];
}
