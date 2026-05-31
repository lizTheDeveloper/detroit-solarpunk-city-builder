import type { CalendarState, CalendarActionType } from '../state/types';

// Slot costs per action type
export const SLOT_COSTS: Record<CalendarActionType, number> = {
  community_meeting: 2,
  proposal_review: 1,
  deep_conversation: 2,
  public_event: 3,
  quick_check_in: 1,
  rest_day: 1,
  delegation_hire: 3,
  strategic_cultivation: 2,
  mentor_meeting: 1,
};

export function initCalendarState(): CalendarState {
  return {
    totalSlots: 60,
    fixedSlots: 38,
    discretionarySlots: 22,
    slotsSpent: 0,
    overscheduleAmount: 0,
    overscheduleLimit: 5,
    burnoutBuffer: 15,
    burnoutBufferMax: 20,
    burnoutState: 'sustainable',
    interactionsThisMonth: {},
    lastInteractionMonth: {},
    monthNumber: 1,
    delegationTier: 0,
    crisisSlotTax: 0,
    neighborhoodTimeAllocation: {},
    consecutiveRecoveryMonths: 0,
  };
}

export function getAvailableSlots(state: CalendarState): number {
  return state.discretionarySlots - state.slotsSpent;
}

export function getEffectiveDiscretionary(state: CalendarState): number {
  return state.totalSlots - state.fixedSlots - state.crisisSlotTax;
}

export function canAffordAction(state: CalendarState, actionType: CalendarActionType): boolean {
  const cost = SLOT_COSTS[actionType];
  const available = getAvailableSlots(state);
  return available + (state.overscheduleLimit - state.overscheduleAmount) >= cost;
}

export function wouldOverschedule(state: CalendarState, actionType: CalendarActionType): boolean {
  const cost = SLOT_COSTS[actionType];
  return getAvailableSlots(state) < cost;
}

export function spendSlots(
  state: CalendarState,
  actionType: CalendarActionType,
  npcId?: string,
  tileId?: string,
): CalendarState {
  const cost = SLOT_COSTS[actionType];
  const available = getAvailableSlots(state);
  const overscheduleNeeded = Math.max(0, cost - available);

  const newInteractions = { ...state.interactionsThisMonth };
  if (npcId) {
    newInteractions[npcId] = (newInteractions[npcId] ?? 0) + 1;
  }

  const newLastInteraction = { ...state.lastInteractionMonth };
  if (npcId) {
    newLastInteraction[npcId] = state.monthNumber;
  }

  // Track neighborhood allocation
  const newAllocation = { ...state.neighborhoodTimeAllocation };
  if (tileId) {
    if (!newAllocation[tileId]) {
      newAllocation[tileId] = [];
    }
    const monthIdx = state.monthNumber - 1;
    while (newAllocation[tileId].length <= monthIdx) {
      newAllocation[tileId].push(0);
    }
    newAllocation[tileId][monthIdx] += cost;
  }

  return {
    ...state,
    slotsSpent: state.slotsSpent + cost,
    overscheduleAmount: state.overscheduleAmount + overscheduleNeeded,
    interactionsThisMonth: newInteractions,
    lastInteractionMonth: newLastInteraction,
    neighborhoodTimeAllocation: newAllocation,
  };
}

export function transitionMonth(state: CalendarState, crisisSlotTax: number): CalendarState {
  // Overschedule penalty: lose 2 slots next month for each overschedule event
  const overschedulePenalty = state.overscheduleAmount > 0 ? 2 : 0;

  // Delegation reduces fixed obligations
  const delegationReduction = getDelegationFixedReduction(state.delegationTier);
  const delegationManagement = getDelegationManagementCost(state.delegationTier);

  const newFixed = Math.max(15, 38 - delegationReduction);
  const effectiveDiscretionary = state.totalSlots - newFixed - crisisSlotTax - overschedulePenalty - delegationManagement;

  // Buffer drain from overschedule
  const bufferDrain = state.overscheduleAmount;

  const newBuffer = Math.max(0, Math.min(state.burnoutBufferMax, state.burnoutBuffer - bufferDrain));

  return {
    ...state,
    monthNumber: state.monthNumber + 1,
    slotsSpent: 0,
    overscheduleAmount: 0,
    interactionsThisMonth: {},
    fixedSlots: newFixed,
    discretionarySlots: Math.max(0, effectiveDiscretionary),
    crisisSlotTax: crisisSlotTax,
    burnoutBuffer: newBuffer,
  };
}

// Delegation helpers
function getDelegationFixedReduction(tier: number): number {
  switch (tier) {
    case 0: return 0;
    case 1: return 6;
    case 2: return 12;
    case 3: return 20;
    case 4: return 23;  // fixed drops to 15
    default: return 0;
  }
}

function getDelegationManagementCost(tier: number): number {
  switch (tier) {
    case 0: return 0;
    case 1: return 2;
    case 2: return 3;
    case 3: return 0;  // community self-governance
    case 4: return 0;  // movement
    default: return 0;
  }
}

// Crisis slot tax calculation
export function calculateCrisisSlotTax(_activeArcs: Array<{ arcId: string; currentStage: string }>): number {
  // This will be populated with real arc data later
  // Each arc stage has a slotTax defined in arc data
  // For now, return a placeholder that sums stage-based taxes
  return 0;
}
