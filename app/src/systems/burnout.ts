import type { BurnoutState, CalendarState } from '../state/types';

/**
 * Evaluate the burnout state machine transition.
 *
 * Buffer thresholds (as fractions of max):
 * - sustainable → overextended: buffer < 50%
 * - overextended → burnout: buffer < 20%
 * - burnout → collapse: buffer = 0
 * Recovery (requires consecutive months above threshold):
 * - overextended → sustainable: buffer > 60% for 1 month
 * - burnout → overextended: buffer > 50% for 2 months
 * - collapse → overextended: buffer > 50% for 2 months
 */
export function evaluateBurnoutTransition(
  current: BurnoutState,
  buffer: number,
  bufferMax: number,
  consecutiveRecoveryMonths: number,
): BurnoutState {
  const ratio = bufferMax > 0 ? buffer / bufferMax : 0;

  switch (current) {
    case 'sustainable':
      if (ratio < 0.5) return 'overextended';
      return 'sustainable';
    case 'overextended':
      if (buffer === 0 || ratio < 0.2) return 'burnout';
      if (ratio > 0.6 && consecutiveRecoveryMonths >= 1) return 'sustainable';
      return 'overextended';
    case 'burnout':
      if (buffer === 0) return 'collapse';
      if (ratio > 0.5 && consecutiveRecoveryMonths >= 2) return 'overextended';
      return 'burnout';
    case 'collapse':
      if (ratio > 0.5 && consecutiveRecoveryMonths >= 2) return 'overextended';
      return 'collapse';
  }
}

/** Effectiveness multiplier applied to yield/interaction outcomes by burnout state. */
export function getEffectivenessModifier(state: BurnoutState): number {
  switch (state) {
    case 'sustainable': return 1.0;
    case 'overextended': return 0.8;
    case 'burnout': return 0.5;
    case 'collapse': return 0.0;
  }
}

/**
 * Calculate this turn's buffer change, clamped to [0, bufferMax].
 *
 * Effects (additive):
 * - Overschedule cost: -1 per overscheduled slot
 * - Rest day: +3
 * - Mentor meeting: +3
 * - Other recovery activity: +1
 * - Crisis slot tax > 4: -1
 * - No recovery activity in turn: -2 passive drain
 */
export function calculateBufferAdjustment(
  buffer: number,
  bufferMax: number,
  overscheduleAmount: number,
  hadRestDay: boolean,
  hadMentorMeeting: boolean,
  hadStrategicMeeting: boolean,
  hadRecoveryActivity: boolean,
  crisisSlotTax: number = 0,
): number {
  let delta = 0;

  if (hadRestDay) delta += 3;
  if (hadMentorMeeting) delta += 3;
  if (hadStrategicMeeting) delta += 1;
  if (hadRecoveryActivity) delta += 1;

  const recovered = hadRestDay || hadMentorMeeting || hadStrategicMeeting || hadRecoveryActivity;
  if (!recovered) delta -= 2;

  delta -= overscheduleAmount;
  if (crisisSlotTax > 4) delta -= 1;

  const target = Math.max(0, Math.min(bufferMax, buffer + delta));
  return target - buffer;
}

/**
 * Decide whether NPC commitments slip this turn due to burnout.
 * Returns the number to be forgotten (0 if none).
 */
export function checkForgottenCommitment(
  burnoutState: BurnoutState,
  totalInteractions: number,
  rng: () => number = Math.random,
): { forgotten: boolean; count: number } {
  if (burnoutState === 'collapse') {
    const count = Math.min(3, totalInteractions);
    return count > 0 ? { forgotten: true, count } : { forgotten: false, count: 0 };
  }
  if (burnoutState !== 'burnout') return { forgotten: false, count: 0 };
  if (totalInteractions < 4) return { forgotten: false, count: 0 };

  const roll = rng();
  if (roll < 0.2) return { forgotten: true, count: 2 };
  if (roll < 0.5) return { forgotten: true, count: 1 };
  return { forgotten: false, count: 0 };
}

/**
 * Pick which NPC commitments will be forgotten this turn.
 * Weighted random selection over NPCs with at least one interaction.
 */
export function selectForgottenCommitments(
  interactions: Record<string, number>,
  count: number,
  rng: () => number = Math.random,
): string[] {
  const candidates = Object.keys(interactions).filter(id => interactions[id] > 0);
  if (candidates.length === 0 || count <= 0) return [];

  const selected: string[] = [];
  const remaining = [...candidates];
  const actualCount = Math.min(count, remaining.length);

  for (let i = 0; i < actualCount; i++) {
    const idx = Math.floor(rng() * remaining.length);
    selected.push(remaining[Math.min(idx, remaining.length - 1)]);
    remaining.splice(Math.min(idx, remaining.length - 1), 1);
  }
  return selected;
}

/** Apply a rest day: +3 to burnout buffer, capped at max. */
export function applyRestDay(state: CalendarState): CalendarState {
  const newBuffer = Math.min(state.burnoutBufferMax, state.burnoutBuffer + 3);
  return { ...state, burnoutBuffer: newBuffer };
}
