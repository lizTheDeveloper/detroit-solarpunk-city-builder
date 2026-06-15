import { describe, it, expect } from 'vitest';
import {
  getRelationshipTier,
  monthsSinceLastInteraction,
  calculateDecayForNpc,
  getDecayWarnings,
  applyMonthlyDecay,
  getMaintenanceBudget,
} from './relationship-decay';
import type { CalendarState } from '../state/types';

function makeCalendarState(month: number, lastInteractions: Record<string, number> = {}): CalendarState {
  return {
    totalSlots: 60, fixedSlots: 38, discretionarySlots: 22, slotsSpent: 0,
    overscheduleAmount: 0, overscheduleLimit: 5, burnoutBuffer: 15,
    burnoutBufferMax: 20, burnoutState: 'sustainable',
    interactionsThisMonth: {}, lastInteractionMonth: lastInteractions,
    monthNumber: month, delegationTier: 0, crisisSlotTax: 0,
    neighborhoodTimeAllocation: {},
    consecutiveRecoveryMonths: 0,
    leaderTrustGrantedThisMonth: {},
  };
}

describe('Relationship Decay', () => {
  describe('getRelationshipTier', () => {
    it('inner circle at 80+', () => expect(getRelationshipTier(80)).toBe('innerCircle'));
    it('key ally at 55-79', () => expect(getRelationshipTier(60)).toBe('keyAlly'));
    it('active network at 30-54', () => expect(getRelationshipTier(40)).toBe('activeNetwork'));
    it('known contact below 30', () => expect(getRelationshipTier(20)).toBe('knownContact'));
  });

  describe('monthsSinceLastInteraction', () => {
    it('returns full month count for never-met NPC', () => {
      const state = makeCalendarState(5);
      expect(monthsSinceLastInteraction(state, 'unknown')).toBe(5);
    });

    it('returns months since last interaction', () => {
      const state = makeCalendarState(8, { npc_1: 5 });
      expect(monthsSinceLastInteraction(state, 'npc_1')).toBe(3);
    });
  });

  describe('calculateDecayForNpc', () => {
    it('no decay when within frequency window', () => {
      // Key ally (trust 60), frequency 2 months, last met 1 month ago
      const state = makeCalendarState(5, { npc_1: 4 });
      expect(calculateDecayForNpc(state, 'npc_1', 60)).toBeNull();
    });

    it('decays inner circle after 1 month neglect', () => {
      // Inner circle (trust 85), frequency 1 month, last met 3 months ago = 2 months past
      const state = makeCalendarState(5, { npc_1: 2 });
      const result = calculateDecayForNpc(state, 'npc_1', 85);
      expect(result).not.toBeNull();
      expect(result!.trustLoss).toBe(16); // 8 * 2 months past
      expect(result!.tier).toBe('innerCircle');
    });

    it('decays key ally after 2+ months neglect', () => {
      // Key ally (trust 60), frequency 2, last met 5 months ago = 3 months past
      const state = makeCalendarState(8, { npc_1: 3 });
      const result = calculateDecayForNpc(state, 'npc_1', 60);
      expect(result!.trustLoss).toBe(15); // 5 * 3
    });

    it('known contacts decay gently', () => {
      // Known contact (trust 20), frequency 6, 8 months past = 2 months over
      const state = makeCalendarState(10, { npc_1: 2 });
      const result = calculateDecayForNpc(state, 'npc_1', 20);
      expect(result!.trustLoss).toBe(4); // 2 * 2
    });
  });

  describe('getDecayWarnings', () => {
    it('warns when approaching threshold', () => {
      // Key ally, frequency 2, last met 1 month ago → 1 month until decay
      const state = makeCalendarState(3, { npc_1: 2 });
      const warnings = getDecayWarnings(state, [{ id: 'npc_1', trust: 60 }]);
      expect(warnings.length).toBe(1);
      expect(warnings[0].type).toBe('approaching');
    });

    it('shows active decay', () => {
      // Inner circle, frequency 1, last met 3 months ago
      const state = makeCalendarState(5, { npc_1: 2 });
      const warnings = getDecayWarnings(state, [{ id: 'npc_1', trust: 85 }]);
      expect(warnings[0].type).toBe('active');
    });
  });

  describe('applyMonthlyDecay', () => {
    it('applies decay to multiple NPCs', () => {
      const state = makeCalendarState(10, { a: 3, b: 7 });
      const npcs = [
        { id: 'a', trust: 85 }, // inner circle, 7 months past frequency 1 = 6 past
        { id: 'b', trust: 60 }, // key ally, 3 months since, frequency 2 = 1 past
      ];
      const { results, updatedTrust } = applyMonthlyDecay(state, npcs);
      expect(results.length).toBe(2);
      expect(updatedTrust['a']).toBe(85 - 48); // 8 * 6
      expect(updatedTrust['b']).toBe(60 - 5);  // 5 * 1
    });
  });

  describe('getMaintenanceBudget', () => {
    it('calculates total maintenance slots needed', () => {
      const npcs = [
        { id: 'a', trust: 85 }, // inner circle
        { id: 'b', trust: 60 }, // key ally
        { id: 'c', trust: 40 }, // active network
      ];
      const { totalSlotsPerMonth, breakdown } = getMaintenanceBudget(npcs);
      expect(breakdown.innerCircle).toBe(1);
      expect(breakdown.keyAlly).toBe(1);
      expect(breakdown.activeNetwork).toBe(1);
      expect(totalSlotsPerMonth).toBe(2); // ceil(1 + 0.5 + 0.33) = 2
    });
  });
});
