import { describe, it, expect } from 'vitest';
import { calculateYield, calculateInteractionYield, previewMeetingYields, getMeetingCount } from './yields';
import type { CalendarState } from '../state/types';

function makeCalendarState(overrides: Partial<CalendarState> = {}): CalendarState {
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
    ...overrides,
  };
}

describe('Yields System', () => {
  describe('calculateYield', () => {
    it('first meeting with high base gives ~3.0 for champion', () => {
      // log10(1000/1) * 1.0 = 3.0
      const result = calculateYield(1000, 1, 'champion');
      expect(result).toBeCloseTo(3.0);
    });

    it('first meeting with partner gives 1.5x champion', () => {
      // log10(1000/1) * 1.5 = 4.5
      const result = calculateYield(1000, 1, 'partner');
      expect(result).toBeCloseTo(4.5);
    });

    it('first meeting with neutral gives 0.5x champion', () => {
      // log10(1000/1) * 0.5 = 1.5
      const result = calculateYield(1000, 1, 'neutral');
      expect(result).toBeCloseTo(1.5);
    });

    it('third meeting shows steep dropoff', () => {
      // log10(1000/27) * 1.0 = log10(37.04) = ~1.569
      const result = calculateYield(1000, 3, 'champion');
      expect(result).toBeCloseTo(1.569, 2);
    });

    it('fifth meeting produces minimal yield', () => {
      // log10(1000/125) * 1.0 = log10(8) = ~0.903
      const result = calculateYield(1000, 5, 'champion');
      expect(result).toBeCloseTo(0.903, 2);
    });

    it('mentor with base 10000 gives 4.0 on first meeting', () => {
      // log10(10000/1) * 1.0 = 4.0
      const result = calculateYield(10000, 1, 'champion');
      expect(result).toBeCloseTo(4.0);
    });

    it('returns 0 for zero or negative inputs', () => {
      expect(calculateYield(0, 1, 'champion')).toBe(0);
      expect(calculateYield(1000, 0, 'champion')).toBe(0);
      expect(calculateYield(-100, 1, 'champion')).toBe(0);
    });

    it('returns 0 when base/count³ < 1 (negative log)', () => {
      // log10(10/125) = log10(0.08) = negative → clamped to 0
      const result = calculateYield(10, 5, 'champion');
      expect(result).toBe(0);
    });

    it('applies effectiveness modifier', () => {
      // log10(1000/1) * 1.0 * 0.8 = 2.4
      const result = calculateYield(1000, 1, 'champion', 0.8);
      expect(result).toBeCloseTo(2.4);
    });
  });

  describe('getMeetingCount', () => {
    it('returns 0 for unseen NPC', () => {
      const state = makeCalendarState();
      expect(getMeetingCount(state, 'unknown')).toBe(0);
    });

    it('returns count for tracked NPC', () => {
      const state = makeCalendarState({ interactionsThisMonth: { npc_1: 3 } });
      expect(getMeetingCount(state, 'npc_1')).toBe(3);
    });
  });

  describe('calculateInteractionYield', () => {
    it('uses meeting count + 1 for upcoming meeting', () => {
      const state = makeCalendarState({ interactionsThisMonth: { npc_1: 2 } });
      // Next meeting = 3rd: log10(1000/27) * 1.0 = ~1.569
      const result = calculateInteractionYield(state, 'npc_1', 'community_leader', 'trust', 'champion');
      expect(result).toBeCloseTo(1.569, 2);
    });
  });

  describe('previewMeetingYields', () => {
    it('returns yields for all resource types', () => {
      const state = makeCalendarState();
      const results = previewMeetingYields(state, 'npc_1', 'community_leader', 'champion');
      // With cubic formula: log10(1000/1)=3.0, log10(100/1)=2.0, log10(500/1)=2.699
      // First meeting (count=1), divisor is 1^3=1, so same as before
      expect(results.trust).toBeCloseTo(3.0);
      expect(results.politicalWill).toBeCloseTo(2.0);
      expect(results.knowledge).toBeCloseTo(2.699, 2);
    });
  });
});
