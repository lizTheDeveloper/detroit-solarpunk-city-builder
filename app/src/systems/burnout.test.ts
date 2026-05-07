import { describe, it, expect } from 'vitest';
import {
  evaluateBurnoutTransition,
  getEffectivenessModifier,
  calculateBufferAdjustment,
  checkForgottenCommitment,
  selectForgottenCommitments,
  applyRestDay,
} from './burnout';

describe('Burnout System', () => {
  describe('evaluateBurnoutTransition', () => {
    it('stays sustainable when buffer is healthy', () => {
      expect(evaluateBurnoutTransition('sustainable', 15, 20, 0)).toBe('sustainable');
    });

    it('transitions to overextended when buffer < 50%', () => {
      expect(evaluateBurnoutTransition('sustainable', 9, 20, 0)).toBe('overextended');
    });

    it('transitions from overextended to burnout when buffer < 20%', () => {
      expect(evaluateBurnoutTransition('overextended', 3, 20, 0)).toBe('burnout');
    });

    it('recovers from overextended to sustainable when buffer > 60% for 1 month', () => {
      expect(evaluateBurnoutTransition('overextended', 13, 20, 1)).toBe('sustainable');
    });

    it('does not recover from overextended without enough months', () => {
      expect(evaluateBurnoutTransition('overextended', 13, 20, 0)).toBe('overextended');
    });

    it('transitions from burnout to collapse when buffer = 0', () => {
      expect(evaluateBurnoutTransition('burnout', 0, 20, 0)).toBe('collapse');
    });

    it('recovers from burnout to overextended when buffer > 50% for 2 months', () => {
      expect(evaluateBurnoutTransition('burnout', 11, 20, 2)).toBe('overextended');
    });

    it('does not recover from burnout with only 1 month above threshold', () => {
      expect(evaluateBurnoutTransition('burnout', 11, 20, 1)).toBe('burnout');
    });

    it('recovers from collapse when buffer > 50% for 2 months', () => {
      expect(evaluateBurnoutTransition('collapse', 11, 20, 2)).toBe('overextended');
    });
  });

  describe('getEffectivenessModifier', () => {
    it('returns 1.0 for sustainable', () => {
      expect(getEffectivenessModifier('sustainable')).toBe(1.0);
    });
    it('returns 0.8 for overextended', () => {
      expect(getEffectivenessModifier('overextended')).toBe(0.8);
    });
    it('returns 0.5 for burnout', () => {
      expect(getEffectivenessModifier('burnout')).toBe(0.5);
    });
    it('returns 0.0 for collapse', () => {
      expect(getEffectivenessModifier('collapse')).toBe(0.0);
    });
  });

  describe('calculateBufferAdjustment', () => {
    it('drains buffer by overschedule amount plus no-rest passive drain', () => {
      // -3 overschedule + -2 no-rest passive drain = -5
      const delta = calculateBufferAdjustment(15, 20, 3, false, false, false, false);
      expect(delta).toBe(-5);
    });

    it('rest day adds 3', () => {
      const delta = calculateBufferAdjustment(15, 20, 0, true, false, false, false);
      expect(delta).toBe(3);
    });

    it('mentor adds 3 (no passive drain since mentor counts as recovery)', () => {
      const delta = calculateBufferAdjustment(15, 20, 0, false, true, false, false);
      expect(delta).toBe(3);
    });

    it('no-rest passive drain of -2 when no recovery activities', () => {
      const delta = calculateBufferAdjustment(15, 20, 0, false, false, false, false);
      expect(delta).toBe(-2);
    });

    it('heavy crisis adds -1 additional buffer drain', () => {
      // crisis tax > 4: -2 passive + -1 crisis stress = -3
      const delta = calculateBufferAdjustment(15, 20, 0, false, false, false, false, 5);
      expect(delta).toBe(-3);
    });

    it('caps at max', () => {
      const delta = calculateBufferAdjustment(19, 20, 0, true, true, true, true);
      expect(delta).toBe(1); // can only gain 1 more to reach 20
    });

    it('floors at 0', () => {
      // -5 overschedule + -2 no-rest = -7, but clamped at 0 (from 2)
      const delta = calculateBufferAdjustment(2, 20, 5, false, false, false, false);
      expect(delta).toBe(-2); // drops to 0, not -7
    });
  });

  describe('checkForgottenCommitment', () => {
    it('never forgets when sustainable', () => {
      expect(checkForgottenCommitment('sustainable', 10)).toEqual({ forgotten: false, count: 0 });
    });

    it('never forgets when overextended', () => {
      expect(checkForgottenCommitment('overextended', 10)).toEqual({ forgotten: false, count: 0 });
    });

    it('never forgets with < 4 interactions', () => {
      expect(checkForgottenCommitment('burnout', 3)).toEqual({ forgotten: false, count: 0 });
    });

    it('forgets 2 on low roll', () => {
      expect(checkForgottenCommitment('burnout', 5, () => 0.1)).toEqual({ forgotten: true, count: 2 });
    });

    it('forgets 1 on mid roll', () => {
      expect(checkForgottenCommitment('burnout', 5, () => 0.3)).toEqual({ forgotten: true, count: 1 });
    });

    it('does not forget on high roll', () => {
      expect(checkForgottenCommitment('burnout', 5, () => 0.8)).toEqual({ forgotten: false, count: 0 });
    });

    it('collapse forgets all commitments (up to 3)', () => {
      expect(checkForgottenCommitment('collapse', 5)).toEqual({ forgotten: true, count: 3 });
    });

    it('collapse forgets fewer if fewer interactions', () => {
      expect(checkForgottenCommitment('collapse', 2)).toEqual({ forgotten: true, count: 2 });
    });

    it('collapse with zero interactions does not forget', () => {
      expect(checkForgottenCommitment('collapse', 0)).toEqual({ forgotten: false, count: 0 });
    });
  });

  describe('selectForgottenCommitments', () => {
    it('returns empty for no interactions', () => {
      expect(selectForgottenCommitments({}, 1)).toEqual([]);
    });

    it('selects correct number of NPCs', () => {
      const interactions = { a: 1, b: 2, c: 1, d: 3 };
      const result = selectForgottenCommitments(interactions, 2, () => 0.5);
      expect(result.length).toBe(2);
    });

    it('does not exceed available NPCs', () => {
      const interactions = { a: 1 };
      const result = selectForgottenCommitments(interactions, 3);
      expect(result.length).toBe(1);
    });
  });

  describe('applyRestDay', () => {
    it('adds 3 to burnout buffer', () => {
      const state = {
        totalSlots: 60, fixedSlots: 38, discretionarySlots: 22, slotsSpent: 0,
        overscheduleAmount: 0, overscheduleLimit: 5, burnoutBuffer: 10,
        burnoutBufferMax: 20, burnoutState: 'sustainable' as const,
        interactionsThisMonth: {}, lastInteractionMonth: {},
        monthNumber: 1, delegationTier: 0, crisisSlotTax: 0,
        neighborhoodTimeAllocation: {},
        consecutiveRecoveryMonths: 0,
      };
      const result = applyRestDay(state);
      expect(result.burnoutBuffer).toBe(13);
    });

    it('caps at max', () => {
      const state = {
        totalSlots: 60, fixedSlots: 38, discretionarySlots: 22, slotsSpent: 0,
        overscheduleAmount: 0, overscheduleLimit: 5, burnoutBuffer: 19,
        burnoutBufferMax: 20, burnoutState: 'sustainable' as const,
        interactionsThisMonth: {}, lastInteractionMonth: {},
        monthNumber: 1, delegationTier: 0, crisisSlotTax: 0,
        neighborhoodTimeAllocation: {},
        consecutiveRecoveryMonths: 0,
      };
      const result = applyRestDay(state);
      expect(result.burnoutBuffer).toBe(20);
    });
  });
});
