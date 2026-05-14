import { describe, it, expect } from 'vitest';
import { migrateSave, createInitialCalendarState } from './migration';

describe('Save Migration', () => {
  describe('migrateSave', () => {
    it('throws on invalid data', () => {
      expect(() => migrateSave(null)).toThrow('Invalid save data');
      expect(() => migrateSave(undefined)).toThrow('Invalid save data');
    });

    it('throws on unknown version', () => {
      expect(() => migrateSave({ version: 1 })).toThrow('Unknown save version');
      expect(() => migrateSave({ version: 3 })).toThrow('Unknown save version');
    });

    it('passes through v2 saves', () => {
      const v2 = { version: 2, calendarState: { monthNumber: 5 } };
      const result = migrateSave(v2);
      expect((result as any).version).toBe(2);
    });
  });

  describe('createInitialCalendarState', () => {
    it('creates fresh state with correct defaults', () => {
      const { calendarState, strategicContacts, mentors } = createInitialCalendarState(1);
      expect(calendarState.totalSlots).toBe(60);
      expect(calendarState.fixedSlots).toBe(38);
      expect(calendarState.discretionarySlots).toBe(22);
      expect(calendarState.burnoutBuffer).toBe(15);
      expect(calendarState.monthNumber).toBe(1);
      expect(strategicContacts).toEqual([]);
      expect(mentors.length).toBe(2); // Grace + Ron
    });

    it('sets month number from turn parameter', () => {
      const { calendarState } = createInitialCalendarState(15);
      expect(calendarState.monthNumber).toBe(15);
    });
  });
});
