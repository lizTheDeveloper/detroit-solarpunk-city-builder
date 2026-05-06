import { describe, it, expect } from 'vitest';
import {
  initCalendarState,
  getAvailableSlots,
  canAffordAction,
  wouldOverschedule,
  spendSlots,
  transitionMonth,
} from './calendar-slots';

describe('Calendar System', () => {
  describe('initCalendarState', () => {
    it('creates state with correct defaults', () => {
      const state = initCalendarState();
      expect(state.totalSlots).toBe(60);
      expect(state.fixedSlots).toBe(38);
      expect(state.discretionarySlots).toBe(22);
      expect(state.slotsSpent).toBe(0);
      expect(state.burnoutBuffer).toBe(15);
      expect(state.burnoutState).toBe('sustainable');
      expect(state.delegationTier).toBe(0);
    });
  });

  describe('getAvailableSlots', () => {
    it('returns discretionary minus spent', () => {
      const state = { ...initCalendarState(), slotsSpent: 5 };
      expect(getAvailableSlots(state)).toBe(17);
    });
  });

  describe('canAffordAction', () => {
    it('allows action within budget', () => {
      const state = initCalendarState();
      expect(canAffordAction(state, 'community_meeting')).toBe(true);
    });

    it('allows overschedule up to limit', () => {
      const state = { ...initCalendarState(), slotsSpent: 21 };
      // 1 slot remaining + 5 overschedule = 6 available
      expect(canAffordAction(state, 'public_event')).toBe(true); // costs 3
    });

    it('rejects when exceeds overschedule limit', () => {
      const state = { ...initCalendarState(), slotsSpent: 22, overscheduleAmount: 5 };
      expect(canAffordAction(state, 'community_meeting')).toBe(false);
    });
  });

  describe('wouldOverschedule', () => {
    it('returns false when within budget', () => {
      const state = initCalendarState();
      expect(wouldOverschedule(state, 'quick_check_in')).toBe(false);
    });

    it('returns true when would exceed discretionary', () => {
      const state = { ...initCalendarState(), slotsSpent: 21 };
      expect(wouldOverschedule(state, 'community_meeting')).toBe(true);
    });
  });

  describe('spendSlots', () => {
    it('deducts slot cost', () => {
      const state = initCalendarState();
      const result = spendSlots(state, 'community_meeting', 'npc_1', 'tile_1');
      expect(result.slotsSpent).toBe(2);
    });

    it('tracks NPC interaction count', () => {
      const state = initCalendarState();
      const result = spendSlots(state, 'quick_check_in', 'npc_1');
      expect(result.interactionsThisMonth['npc_1']).toBe(1);
      const result2 = spendSlots(result, 'deep_conversation', 'npc_1');
      expect(result2.interactionsThisMonth['npc_1']).toBe(2);
    });

    it('tracks overschedule when exceeding budget', () => {
      const state = { ...initCalendarState(), slotsSpent: 21 };
      const result = spendSlots(state, 'community_meeting'); // costs 2, only 1 available
      expect(result.overscheduleAmount).toBe(1);
      expect(result.slotsSpent).toBe(23);
    });

    it('tracks neighborhood allocation', () => {
      const state = initCalendarState();
      const result = spendSlots(state, 'community_meeting', undefined, 'brightmoor');
      expect(result.neighborhoodTimeAllocation['brightmoor'][0]).toBe(2);
    });
  });

  describe('transitionMonth', () => {
    it('resets spent slots and interactions', () => {
      const state = { ...initCalendarState(), slotsSpent: 15, interactionsThisMonth: { npc_1: 3 } };
      const result = transitionMonth(state, 0);
      expect(result.slotsSpent).toBe(0);
      expect(result.interactionsThisMonth).toEqual({});
      expect(result.monthNumber).toBe(2);
    });

    it('applies crisis slot tax to reduce discretionary', () => {
      const state = initCalendarState();
      const result = transitionMonth(state, 5);
      expect(result.crisisSlotTax).toBe(5);
      expect(result.discretionarySlots).toBe(17); // 60 - 38 - 5
    });

    it('applies overschedule penalty next month', () => {
      const state = { ...initCalendarState(), overscheduleAmount: 3 };
      const result = transitionMonth(state, 0);
      expect(result.discretionarySlots).toBe(20); // 22 - 2 penalty
    });

    it('drains burnout buffer from overschedule', () => {
      const state = { ...initCalendarState(), overscheduleAmount: 4 };
      const result = transitionMonth(state, 0);
      expect(result.burnoutBuffer).toBe(11); // 15 - 4
    });
  });
});
