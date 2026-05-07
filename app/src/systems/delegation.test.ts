import { describe, it, expect } from 'vitest';
import {
  canUnlockTier,
  getNetSlotGain,
  applyDelegationToCalendar,
  checkDeputyDecision,
} from './delegation';
import type { CalendarState } from '../state/types';

function makeCalendarState(): CalendarState {
  return {
    totalSlots: 60, fixedSlots: 38, discretionarySlots: 22, slotsSpent: 0,
    overscheduleAmount: 0, overscheduleLimit: 5, burnoutBuffer: 15,
    burnoutBufferMax: 20, burnoutState: 'sustainable',
    interactionsThisMonth: {}, lastInteractionMonth: {},
    monthNumber: 1, delegationTier: 0, crisisSlotTax: 0,
    neighborhoodTimeAllocation: {},
    consecutiveRecoveryMonths: 0,
  };
}

const fullContext = {
  turn: 20, budget: 100000, politicalWill: 60,
  communityTrust: 75, communityOwnedTiles: 4,
  hasChampionNpc: true, stage: 'beyond',
};

describe('Delegation System', () => {
  describe('canUnlockTier', () => {
    it('tier 0 is always unlockable', () => {
      expect(canUnlockTier(0, { turn: 1, budget: 0, politicalWill: 0, communityTrust: 0, communityOwnedTiles: 0, hasChampionNpc: false, stage: 'awakening' })).toBe(true);
    });

    it('tier 1 requires turn 8+, $50K, will > 40', () => {
      expect(canUnlockTier(1, { turn: 5, budget: 60000, politicalWill: 50, communityTrust: 50, communityOwnedTiles: 0, hasChampionNpc: false, stage: 'awakening' })).toBe(false); // turn too low
      expect(canUnlockTier(1, { turn: 8, budget: 60000, politicalWill: 50, communityTrust: 50, communityOwnedTiles: 0, hasChampionNpc: false, stage: 'awakening' })).toBe(true);
    });

    it('tier 2 requires champion NPC', () => {
      expect(canUnlockTier(2, { turn: 20, budget: 100000, politicalWill: 60, communityTrust: 50, communityOwnedTiles: 0, hasChampionNpc: false, stage: 'transition' })).toBe(false);
      expect(canUnlockTier(2, { turn: 20, budget: 100000, politicalWill: 60, communityTrust: 50, communityOwnedTiles: 0, hasChampionNpc: true, stage: 'transition' })).toBe(true);
    });

    it('tier 3 requires 3 community-owned tiles and trust > 70', () => {
      expect(canUnlockTier(3, { ...fullContext, communityOwnedTiles: 2 })).toBe(false);
      expect(canUnlockTier(3, fullContext)).toBe(true);
    });

    it('tier 4 requires beyond stage', () => {
      expect(canUnlockTier(4, { ...fullContext, stage: 'restoration' })).toBe(false);
      expect(canUnlockTier(4, fullContext)).toBe(true);
    });
  });

  describe('getNetSlotGain', () => {
    it('tier 0 = 0 gain', () => expect(getNetSlotGain(0)).toBe(0));
    it('tier 1 = +4 (6 reduction - 2 management)', () => expect(getNetSlotGain(1)).toBe(4));
    it('tier 2 = +9 (12 - 3)', () => expect(getNetSlotGain(2)).toBe(9));
    it('tier 3 = +20 (20 - 0)', () => expect(getNetSlotGain(3)).toBe(20));
    it('tier 4 = +23 (23 - 0)', () => expect(getNetSlotGain(4)).toBe(23));
  });

  describe('applyDelegationToCalendar', () => {
    it('tier 1 reduces fixed by 6, adds 2 management', () => {
      const state = makeCalendarState();
      const result = applyDelegationToCalendar(state, 1);
      expect(result.fixedSlots).toBe(32); // 38 - 6
      expect(result.discretionarySlots).toBe(26); // 60 - 32 - 0 tax - 2 mgmt
      expect(result.delegationTier).toBe(1);
    });

    it('tier 4 reduces fixed to minimum 15', () => {
      const state = makeCalendarState();
      const result = applyDelegationToCalendar(state, 4);
      expect(result.fixedSlots).toBe(15);
      expect(result.discretionarySlots).toBe(45); // 60 - 15 - 0 - 0
    });
  });

  describe('checkDeputyDecision', () => {
    it('returns null for tier 0 and 1', () => {
      expect(checkDeputyDecision(0, 0)).toBeNull();
      expect(checkDeputyDecision(1, 10)).toBeNull();
    });

    it('can return a decision at tier 2', () => {
      // Force decision with low rng
      const result = checkDeputyDecision(2, 0, () => 0.2);
      expect(result).not.toBeNull();
      expect(result!.decision).toBeTruthy();
    });

    it('conflict chance decreases after 6 months', () => {
      // With rng = 0.15: below 0.20 threshold (early) = conflict
      // but above 0.10 threshold (after 6 months) = no conflict
      let result = checkDeputyDecision(2, 3, () => 0.15);
      expect(result!.conflictsWithPlayer).toBe(true);

      result = checkDeputyDecision(2, 7, () => 0.15);
      expect(result!.conflictsWithPlayer).toBe(false);
    });
  });
});
