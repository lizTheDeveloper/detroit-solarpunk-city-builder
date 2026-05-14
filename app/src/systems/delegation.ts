import type { CalendarState } from '../state/types';

export interface DelegationTierDef {
  tier: number;
  name: string;
  fixedReduction: number;
  managementCost: number;
  budgetCostPerYear: number;
  unlockConditions: DelegationUnlockConditions;
  description: string;
}

interface DelegationUnlockConditions {
  minTurn?: number;
  minBudget?: number;
  minPoliticalWill?: number;
  minCommunityTrust?: number;
  communityOwnedTiles?: number;
  requiresChampionNpc?: boolean;
  requiresStage?: string;
}

export const DELEGATION_TIERS: DelegationTierDef[] = [
  {
    tier: 0,
    name: 'Solo Mayor',
    fixedReduction: 0,
    managementCost: 0,
    budgetCostPerYear: 0,
    unlockConditions: {},
    description: 'You handle everything yourself.',
  },
  {
    tier: 1,
    name: 'First Hire',
    fixedReduction: 6,
    managementCost: 2,
    budgetCostPerYear: 50000,
    unlockConditions: { minTurn: 8, minBudget: 50000, minPoliticalWill: 40 },
    description: 'A chief of staff handles routine admin. Net gain: +4 discretionary slots/month.',
  },
  {
    tier: 2,
    name: 'Deputy Mayor',
    fixedReduction: 12,
    managementCost: 3,
    budgetCostPerYear: 80000,
    unlockConditions: { minTurn: 16, minPoliticalWill: 55, requiresChampionNpc: true },
    description: 'Your deputy takes on significant responsibility. Makes autonomous decisions. Net gain: +9 slots/month.',
  },
  {
    tier: 3,
    name: 'Community Self-Governance',
    fixedReduction: 20,
    managementCost: 0,
    budgetCostPerYear: 0,
    unlockConditions: { communityOwnedTiles: 3, minCommunityTrust: 70 },
    description: 'Neighborhoods govern themselves. You facilitate, not manage. Net gain: +20 slots/month.',
  },
  {
    tier: 4,
    name: 'Movement',
    fixedReduction: 23,
    managementCost: 0,
    budgetCostPerYear: 0,
    unlockConditions: { requiresStage: 'beyond' },
    description: 'The movement runs itself. You are a symbol and connector. Discretionary: 45 slots/month.',
  },
];

/**
 * Check if a delegation tier is unlockable given current game state.
 */
export function canUnlockTier(
  tier: number,
  currentState: {
    turn: number;
    budget: number;
    politicalWill: number;
    communityTrust: number;
    communityOwnedTiles: number;
    hasChampionNpc: boolean;
    stage: string;
  },
): boolean {
  const tierDef = DELEGATION_TIERS[tier];
  if (!tierDef) return false;

  const conds = tierDef.unlockConditions;

  if (conds.minTurn && currentState.turn < conds.minTurn) return false;
  if (conds.minBudget && currentState.budget < conds.minBudget) return false;
  if (conds.minPoliticalWill && currentState.politicalWill < conds.minPoliticalWill) return false;
  if (conds.minCommunityTrust && currentState.communityTrust < conds.minCommunityTrust) return false;
  if (conds.communityOwnedTiles && currentState.communityOwnedTiles < conds.communityOwnedTiles) return false;
  if (conds.requiresChampionNpc && !currentState.hasChampionNpc) return false;
  if (conds.requiresStage && currentState.stage !== conds.requiresStage) return false;

  return true;
}

/**
 * Get the next available delegation tier upgrade.
 */
export function getNextAvailableTier(
  currentTier: number,
  gameContext: {
    turn: number;
    budget: number;
    politicalWill: number;
    communityTrust: number;
    communityOwnedTiles: number;
    hasChampionNpc: boolean;
    stage: string;
  },
): DelegationTierDef | null {
  const nextTier = currentTier + 1;
  if (nextTier >= DELEGATION_TIERS.length) return null;
  if (!canUnlockTier(nextTier, gameContext)) return null;
  return DELEGATION_TIERS[nextTier];
}

/**
 * Calculate net discretionary gain from a delegation tier.
 */
export function getNetSlotGain(tier: number): number {
  const tierDef = DELEGATION_TIERS[tier];
  if (!tierDef) return 0;
  return tierDef.fixedReduction - tierDef.managementCost;
}

/**
 * Apply delegation tier to calendar state (adjusts fixed slots and management costs).
 */
export function applyDelegationToCalendar(calendarState: CalendarState, tier: number): CalendarState {
  const tierDef = DELEGATION_TIERS[tier];
  if (!tierDef) return calendarState;

  const newFixed = Math.max(15, 38 - tierDef.fixedReduction);
  const effectiveDiscretionary = calendarState.totalSlots - newFixed - calendarState.crisisSlotTax - tierDef.managementCost;

  return {
    ...calendarState,
    fixedSlots: newFixed,
    discretionarySlots: Math.max(0, effectiveDiscretionary),
    delegationTier: tier,
  };
}

/**
 * Check if deputy makes an autonomous decision this month (Tier 2+).
 * Returns description of what the deputy decided, or null.
 */
export function checkDeputyDecision(
  tier: number,
  monthsAtTier: number,
  rng: () => number = Math.random,
): { decision: string; conflictsWithPlayer: boolean } | null {
  if (tier < 2) return null;

  // Deputy makes a decision ~40% of months
  if (rng() > 0.4) return null;

  // Conflict chance: 20% base, drops to 10% after 6 months
  const conflictChance = monthsAtTier >= 6 ? 0.10 : 0.20;
  const conflicts = rng() < conflictChance;

  const decisions = [
    'approved a routine zoning variance',
    'scheduled additional community office hours',
    'reallocated emergency funds to road repair',
    'met with the school board on your behalf',
    'deferred a developer meeting to next month',
    'committed to a neighborhood cleanup event',
  ];

  const conflictDecisions = [
    'approved a permit you would have questioned',
    'cancelled a community meeting you had planned',
    'made a public statement that contradicts your position',
    'allocated discretionary funds without consulting you',
  ];

  const pool = conflicts ? conflictDecisions : decisions;
  const idx = Math.floor(rng() * pool.length);

  return { decision: pool[idx], conflictsWithPlayer: conflicts };
}
