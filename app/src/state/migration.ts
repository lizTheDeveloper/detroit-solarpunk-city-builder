import type { CalendarState, NarrativeState, StrategicContact, MentorCharacter } from './types';
import { MENTOR_DEFINITIONS } from '../data/characters/mentors';

export function createInitialCalendarState(monthNumber: number = 1): {
  calendarState: CalendarState;
  strategicContacts: StrategicContact[];
  mentors: MentorCharacter[];
} {
  return {
    calendarState: {
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
      monthNumber,
      delegationTier: 0,
      crisisSlotTax: 0,
      neighborhoodTimeAllocation: {},
      consecutiveRecoveryMonths: 0,
    },
    strategicContacts: [],
    mentors: MENTOR_DEFINITIONS.map((def): MentorCharacter => ({
      id: def.id,
      name: def.name,
      philosophy: def.philosophy,
      cooldownMonths: def.cooldownMonths,
      lastMetMonth: def.lastMetMonth,
      yieldType: def.yieldType,
      yieldAmount: def.yieldAmount,
      bufferGain: def.bufferGain,
      unlocked: def.unlocked,
    })),
  };
}

export function createInitialNarrativeState(communityTrust: number = 50): NarrativeState {
  const actionsPerTurn = Math.min(4, Math.floor(1 + communityTrust / 30));
  return {
    actionsRemaining: actionsPerTurn,
    actionsPerTurn,
    consecutiveTurns: {},
    counterNarrativeCooldowns: {},
  };
}
