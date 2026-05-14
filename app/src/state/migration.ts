import type { GameState, CalendarState, StrategicContact, MentorCharacter } from './types';
import { initCalendarState } from '../systems/calendar-slots';
import { initMentor, MENTOR_DEFINITIONS } from '../data/characters/mentors';

/**
 * Validate save data. Pre-launch, so no migration needed.
 */
export function migrateSave(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid save data');
  }

  const data = raw as Record<string, unknown>;
  const version = data.version as number;

  if (version === 2) {
    return data as unknown as GameState;
  }

  throw new Error(`Unknown save version: ${version}`);
}

/**
 * Create a fresh GameState with calendar system enabled.
 * Used for new games.
 */
export function createInitialCalendarState(turn: number = 1): {
  calendarState: CalendarState;
  strategicContacts: StrategicContact[];
  mentors: MentorCharacter[];
} {
  const calendarState = initCalendarState();
  calendarState.monthNumber = turn;

  const mentors: MentorCharacter[] = MENTOR_DEFINITIONS.map(def => initMentor(def));
  const strategicContacts: StrategicContact[] = [];

  return { calendarState, strategicContacts, mentors };
}
