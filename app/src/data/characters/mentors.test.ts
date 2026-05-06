import { describe, it, expect } from 'vitest';
import {
  checkMentorUnlock,
  isMentorAvailable,
  applyMentorMeeting,
  getMentorPrompt,
  MENTOR_DEFINITIONS,
} from './mentors';
import type { MentorCharacter } from '../../state/types';

describe('Mentor Characters', () => {
  describe('checkMentorUnlock - Grace Lee Boggs', () => {
    const grace = MENTOR_DEFINITIONS[0];

    it('unlocks when any overton topic > 30', () => {
      expect(checkMentorUnlock(grace, {
        publicOpinion: { landReform: 35, deGrowth: 10 },
        communityTrust: 50,
        currentMonth: 10,
      })).toBe(true);
    });

    it('stays locked when no topic > 30', () => {
      expect(checkMentorUnlock(grace, {
        publicOpinion: { landReform: 25, deGrowth: 10 },
        communityTrust: 50,
        currentMonth: 10,
      })).toBe(false);
    });

    it('unlocks via alternate path after month 24 with trust > 65', () => {
      expect(checkMentorUnlock(grace, {
        publicOpinion: { landReform: 10, deGrowth: 5 },
        communityTrust: 70,
        currentMonth: 25,
      })).toBe(true);
    });

    it('alternate path fails before month 24', () => {
      expect(checkMentorUnlock(grace, {
        publicOpinion: { landReform: 10 },
        communityTrust: 70,
        currentMonth: 20,
      })).toBe(false);
    });
  });

  describe('checkMentorUnlock - Ron Scott', () => {
    const ron = MENTOR_DEFINITIONS[1];

    it('unlocks when decarceration > 25', () => {
      expect(checkMentorUnlock(ron, {
        publicOpinion: { decarceration: 30 },
        communityTrust: 50,
        currentMonth: 10,
      })).toBe(true);
    });

    it('stays locked when decarceration < 25', () => {
      expect(checkMentorUnlock(ron, {
        publicOpinion: { decarceration: 20 },
        communityTrust: 50,
        currentMonth: 10,
      })).toBe(false);
    });
  });

  describe('isMentorAvailable', () => {
    it('available if never met and unlocked', () => {
      const mentor: MentorCharacter = {
        id: 'grace', name: 'Grace', philosophy: '', cooldownMonths: 3,
        lastMetMonth: 0, yieldType: 'overton', yieldAmount: 4.0,
        bufferGain: 3, unlocked: true,
      };
      expect(isMentorAvailable(mentor, 5)).toBe(true);
    });

    it('unavailable if not unlocked', () => {
      const mentor: MentorCharacter = {
        id: 'grace', name: 'Grace', philosophy: '', cooldownMonths: 3,
        lastMetMonth: 0, yieldType: 'overton', yieldAmount: 4.0,
        bufferGain: 3, unlocked: false,
      };
      expect(isMentorAvailable(mentor, 5)).toBe(false);
    });

    it('unavailable during cooldown', () => {
      const mentor: MentorCharacter = {
        id: 'grace', name: 'Grace', philosophy: '', cooldownMonths: 3,
        lastMetMonth: 5, yieldType: 'overton', yieldAmount: 4.0,
        bufferGain: 3, unlocked: true,
      };
      expect(isMentorAvailable(mentor, 7)).toBe(false); // only 2 months since
    });

    it('available after cooldown', () => {
      const mentor: MentorCharacter = {
        id: 'grace', name: 'Grace', philosophy: '', cooldownMonths: 3,
        lastMetMonth: 5, yieldType: 'overton', yieldAmount: 4.0,
        bufferGain: 3, unlocked: true,
      };
      expect(isMentorAvailable(mentor, 8)).toBe(true); // 3 months since
    });
  });

  describe('applyMentorMeeting', () => {
    it('updates lastMetMonth and returns yields', () => {
      const mentor: MentorCharacter = {
        id: 'grace', name: 'Grace', philosophy: '', cooldownMonths: 3,
        lastMetMonth: 3, yieldType: 'overton', yieldAmount: 4.0,
        bufferGain: 3, unlocked: true,
      };
      const result = applyMentorMeeting(mentor, 6);
      expect(result.updatedMentor.lastMetMonth).toBe(6);
      expect(result.yieldAmount).toBe(4.0);
      expect(result.bufferGain).toBe(3);
    });
  });

  describe('getMentorPrompt', () => {
    it('includes burnout context when overextended', () => {
      const prompt = getMentorPrompt(MENTOR_DEFINITIONS[0], 'overextended', { turn: 10, stage: 'transition', delegationTier: 1 });
      expect(prompt).toContain('tired');
    });

    it('includes strong burnout message when burned out', () => {
      const prompt = getMentorPrompt(MENTOR_DEFINITIONS[0], 'burnout', { turn: 15, stage: 'restoration', delegationTier: 2 });
      expect(prompt).toContain('burned out');
      expect(prompt).toContain('rest');
    });

    it('includes game context', () => {
      const prompt = getMentorPrompt(MENTOR_DEFINITIONS[0], 'sustainable', { turn: 10, stage: 'transition', delegationTier: 0 });
      expect(prompt).toContain('Month 10');
      expect(prompt).toContain('transition');
    });
  });
});
