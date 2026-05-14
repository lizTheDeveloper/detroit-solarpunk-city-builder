import type { BurnoutState, CalendarState } from '../state/types';

export const EFFECTIVENESS_MODIFIERS: Record<BurnoutState, number> = {
  sustainable: 1.0,
  overextended: 0.8,
  burnout: 0.5,
  collapse: 0.0,
};

/**
 * Determine burnout state transitions based on buffer level and history.
 * Called at month end after buffer adjustments.
 */
export function evaluateBurnoutTransition(
  currentState: BurnoutState,
  buffer: number,
  bufferMax: number,
  consecutiveMonthsAboveThreshold: number,
): BurnoutState {
  const bufferPercent = buffer / bufferMax;

  switch (currentState) {
    case 'sustainable':
      if (bufferPercent < 0.5) return 'overextended';
      return 'sustainable';

    case 'overextended':
      // Recovery: above 60% for 1 month
      if (bufferPercent >= 0.6 && consecutiveMonthsAboveThreshold >= 1) return 'sustainable';
      // Escalation: below 20% OR stayed overextended 2+ months with buffer still low
      if (bufferPercent < 0.2) return 'burnout';
      if (consecutiveMonthsAboveThreshold === 0 && bufferPercent < 0.5) return 'burnout';
      return 'overextended';

    case 'burnout':
      // Recovery: above 50% for 2 consecutive months
      if (bufferPercent >= 0.5 && consecutiveMonthsAboveThreshold >= 2) return 'overextended';
      // Escalation: buffer hits 0
      if (buffer <= 0) return 'collapse';
      return 'burnout';

    case 'collapse':
      // Recovery: buffer above 50% for 2 months (can only recover after forced rest)
      if (bufferPercent >= 0.5 && consecutiveMonthsAboveThreshold >= 2) return 'overextended';
      return 'collapse';
  }
}

/**
 * Get effectiveness modifier for current burnout state.
 */
export function getEffectivenessModifier(state: BurnoutState): number {
  return EFFECTIVENESS_MODIFIERS[state];
}

/**
 * Calculate burnout buffer adjustment for end of month.
 */
export function calculateBufferAdjustment(
  currentBuffer: number,
  bufferMax: number,
  overscheduleAmount: number,
  tookRestDay: boolean,
  metMentor: boolean,
  attendedCelebration: boolean,
  hadSupportConversation: boolean,
  crisisSlotTax: number = 0,
): number {
  let adjustment = 0;

  // Drains
  adjustment -= overscheduleAmount; // -1 per overscheduled slot
  if (!tookRestDay && !metMentor && !attendedCelebration) {
    adjustment -= 2; // passive drain when no recovery activities taken
  }
  if (crisisSlotTax > 4) {
    adjustment -= 1; // stress of managing heavy crisis load
  }

  // Gains
  if (tookRestDay) adjustment += 3;
  if (metMentor) adjustment += 3;
  if (attendedCelebration) adjustment += 2;
  if (hadSupportConversation) adjustment += 1;

  const newBuffer = Math.max(0, Math.min(bufferMax, currentBuffer + adjustment));
  return newBuffer - currentBuffer; // return the actual delta applied
}

/**
 * Determine if a forgotten commitment occurs this month.
 * Only happens in burnout state with 4+ scheduled interactions.
 */
export function checkForgottenCommitment(
  burnoutState: BurnoutState,
  totalInteractions: number,
  rng: () => number = Math.random,
): { forgotten: boolean; count: number } {
  if (burnoutState === 'collapse') {
    // In collapse: ALL commitments are forgotten (you're hospitalized)
    if (totalInteractions > 0) {
      return { forgotten: true, count: Math.min(totalInteractions, 3) };
    }
    return { forgotten: false, count: 0 };
  }

  if (burnoutState !== 'burnout') {
    return { forgotten: false, count: 0 };
  }

  if (totalInteractions < 4) {
    return { forgotten: false, count: 0 };
  }

  // In burnout: 60% chance of forgetting 1, 20% chance of forgetting 2
  const roll = rng();
  if (roll < 0.2) return { forgotten: true, count: 2 };
  if (roll < 0.6) return { forgotten: true, count: 1 };
  return { forgotten: false, count: 0 };
}

/**
 * Select which NPCs' commitments are forgotten.
 */
export function selectForgottenCommitments(
  interactionsThisMonth: Record<string, number>,
  count: number,
  rng: () => number = Math.random,
): string[] {
  const npcIds = Object.keys(interactionsThisMonth);
  if (npcIds.length === 0 || count === 0) return [];

  const shuffled = [...npcIds].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Apply rest day: costs 1 slot, produces nothing, but recovers buffer.
 */
export function applyRestDay(calendarState: CalendarState): CalendarState {
  return {
    ...calendarState,
    burnoutBuffer: Math.min(
      calendarState.burnoutBufferMax,
      calendarState.burnoutBuffer + 3,
    ),
  };
}
