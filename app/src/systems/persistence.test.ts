import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveGame,
  loadGame,
  listSaves,
  deleteSave,
  autoSave,
  createUndoStack,
  pushState,
  undo,
  canUndo,
} from './persistence';
import type { GameState } from '../state/types';
import { createNewGame } from '../state/create-game';

// Mock localStorage
let mockStorage: Record<string, string>;
let mockLocalStorage: {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  length: number;
  key: (i: number) => string | null;
  clear: () => void;
};

function createMockStorage() {
  mockStorage = {};
  mockLocalStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    get length() { return Object.keys(mockStorage).length; },
    key: (i: number) => Object.keys(mockStorage)[i] ?? null,
    clear: () => { for (const k of Object.keys(mockStorage)) delete mockStorage[k]; },
  };
}

describe('Save/Load System', () => {
  let gameState: GameState;

  beforeEach(() => {
    createMockStorage();
    gameState = createNewGame();
  });

  it('1. saveGame stores state as JSON in storage', () => {
    saveGame(gameState, 'detroit', 'test', mockLocalStorage);
    const stored = mockStorage['detroit_solarpunk_save_test'];
    expect(stored).toBeDefined();
    expect(JSON.parse(stored)).toEqual(gameState);
  });

  it('2. loadGame retrieves and parses stored state', () => {
    saveGame(gameState, 'detroit', 'test', mockLocalStorage);
    const loaded = loadGame('detroit', 'test', mockLocalStorage);
    expect(loaded).toEqual(gameState);
  });

  it('3. loadGame returns null for missing slot', () => {
    const loaded = loadGame('detroit', 'nonexistent', mockLocalStorage);
    expect(loaded).toBeNull();
  });

  it('4. loadGame returns null for wrong version', () => {
    const wrongVersion = { ...gameState, version: 1 };
    mockStorage['detroit_solarpunk_save_test'] = JSON.stringify(wrongVersion);
    const loaded = loadGame('detroit', 'test', mockLocalStorage);
    expect(loaded).toBeNull();
  });

  it('5. listSaves returns metadata for all saves', () => {
    saveGame(gameState, 'detroit', 'slot1', mockLocalStorage);
    const laterState = { ...gameState, turn: 5, season: 'summer' as const, year: 2, stage: 'transition' as const };
    saveGame(laterState, 'detroit', 'slot2', mockLocalStorage);

    const saves = listSaves('detroit', mockLocalStorage);
    expect(saves).toHaveLength(2);

    const slot1Meta = saves.find(s => s.slot === 'slot1');
    expect(slot1Meta).toBeDefined();
    expect(slot1Meta!.turn).toBe(1);
    expect(slot1Meta!.season).toBe(gameState.season); // Season is dynamic based on current date
    expect(slot1Meta!.year).toBe(1);
    expect(slot1Meta!.stage).toBe('awakening');
    expect(slot1Meta!.savedAt).toBeDefined();

    const slot2Meta = saves.find(s => s.slot === 'slot2');
    expect(slot2Meta).toBeDefined();
    expect(slot2Meta!.turn).toBe(5);
    expect(slot2Meta!.season).toBe('summer');
    expect(slot2Meta!.stage).toBe('transition');
  });

  it('6. listSaves returns empty array when no saves exist', () => {
    const saves = listSaves('detroit', mockLocalStorage);
    expect(saves).toEqual([]);
  });

  it('7. deleteSave removes the save', () => {
    saveGame(gameState, 'detroit', 'doomed', mockLocalStorage);
    expect(loadGame('detroit', 'doomed', mockLocalStorage)).not.toBeNull();

    deleteSave('detroit', 'doomed', mockLocalStorage);
    expect(loadGame('detroit', 'doomed', mockLocalStorage)).toBeNull();
    // metadata also removed
    const saves = listSaves('detroit', mockLocalStorage);
    expect(saves.find(s => s.slot === 'doomed')).toBeUndefined();
  });

  it('8. autoSave stores in auto slot', () => {
    autoSave(gameState, 'detroit', mockLocalStorage);
    const loaded = loadGame('detroit', 'auto', mockLocalStorage);
    expect(loaded).toEqual(gameState);
  });

  it('9. Multiple save slots work independently', () => {
    const state1 = { ...gameState, turn: 1 };
    const state2 = { ...gameState, turn: 7 };
    const state3 = { ...gameState, turn: 15 };

    saveGame(state1, 'detroit', 'early', mockLocalStorage);
    saveGame(state2, 'detroit', 'mid', mockLocalStorage);
    saveGame(state3, 'detroit', 'late', mockLocalStorage);

    expect(loadGame('detroit', 'early', mockLocalStorage)!.turn).toBe(1);
    expect(loadGame('detroit', 'mid', mockLocalStorage)!.turn).toBe(7);
    expect(loadGame('detroit', 'late', mockLocalStorage)!.turn).toBe(15);
  });

  it('10. saves are namespaced per city - minneapolis and detroit saves don\'t overlap', () => {
    saveGame({ ...gameState, turn: 5 }, 'detroit', 'shared', mockLocalStorage);
    saveGame({ ...gameState, turn: 10 }, 'minneapolis', 'shared', mockLocalStorage);

    expect(loadGame('detroit', 'shared', mockLocalStorage)!.turn).toBe(5);
    expect(loadGame('minneapolis', 'shared', mockLocalStorage)!.turn).toBe(10);

    deleteSave('detroit', 'shared', mockLocalStorage);
    expect(loadGame('detroit', 'shared', mockLocalStorage)).toBeNull();
    expect(loadGame('minneapolis', 'shared', mockLocalStorage)!.turn).toBe(10);
  });

  it('11. listSaves filters by citySlug', () => {
    saveGame(gameState, 'detroit', 'd-slot', mockLocalStorage);
    saveGame(gameState, 'minneapolis', 'm-slot', mockLocalStorage);

    const detroitSaves = listSaves('detroit', mockLocalStorage);
    expect(detroitSaves).toHaveLength(1);
    expect(detroitSaves[0].slot).toBe('d-slot');

    const minneapolisSaves = listSaves('minneapolis', mockLocalStorage);
    expect(minneapolisSaves).toHaveLength(1);
    expect(minneapolisSaves[0].slot).toBe('m-slot');
  });

  it('12. listSaves with no citySlug returns all saves', () => {
    saveGame(gameState, 'detroit', 'd-slot', mockLocalStorage);
    saveGame(gameState, 'minneapolis', 'm-slot', mockLocalStorage);

    const allSaves = listSaves(undefined, mockLocalStorage);
    expect(allSaves).toHaveLength(2);
  });

  it('15. Full cycle: save -> load -> verify equality', () => {
    saveGame(gameState, 'detroit', 'full_cycle', mockLocalStorage);
    const loaded = loadGame('detroit', 'full_cycle', mockLocalStorage);
    expect(loaded).toEqual(gameState);
    // Verify deep structure
    expect(loaded!.meters).toEqual(gameState.meters);
    expect(loaded!.tiles).toEqual(gameState.tiles);
    expect(loaded!.leaders).toEqual(gameState.leaders);
  });
});

describe('Undo System', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createNewGame();
  });

  it('10. pushState adds to undo stack', () => {
    const stack = createUndoStack();
    const newStack = pushState(stack, gameState);
    expect(newStack.past).toHaveLength(1);
    expect(newStack.past[0]).toEqual(gameState);
  });

  it('11. pushState trims to maxSize (10)', () => {
    let stack = createUndoStack();
    // Push 12 states
    for (let i = 0; i < 12; i++) {
      const state = { ...gameState, turn: i + 1 };
      stack = pushState(stack, state);
    }
    expect(stack.past).toHaveLength(10);
    // Oldest should be turn 3 (1 and 2 were trimmed)
    expect(stack.past[0].turn).toBe(3);
    // Most recent should be turn 12
    expect(stack.past[9].turn).toBe(12);
  });

  it('12. undo returns most recent state', () => {
    let stack = createUndoStack();
    const state1 = { ...gameState, turn: 1 };
    const state2 = { ...gameState, turn: 2 };
    const state3 = { ...gameState, turn: 3 };

    stack = pushState(stack, state1);
    stack = pushState(stack, state2);
    stack = pushState(stack, state3);

    const result = undo(stack);
    expect(result.state).toEqual(state3);
    expect(result.stack.past).toHaveLength(2);

    const result2 = undo(result.stack);
    expect(result2.state).toEqual(state2);
    expect(result2.stack.past).toHaveLength(1);
  });

  it('13. undo returns null when stack is empty', () => {
    const stack = createUndoStack();
    const result = undo(stack);
    expect(result.state).toBeNull();
    expect(result.stack.past).toHaveLength(0);
  });

  it('14. canUndo returns true/false correctly', () => {
    let stack = createUndoStack();
    expect(canUndo(stack)).toBe(false);

    stack = pushState(stack, gameState);
    expect(canUndo(stack)).toBe(true);

    const { stack: afterUndo } = undo(stack);
    expect(canUndo(afterUndo)).toBe(false);
  });

  it('16. Undo stack preserves game state exactly', () => {
    let stack = createUndoStack();
    const originalState = createNewGame();

    stack = pushState(stack, originalState);
    const { state: recovered } = undo(stack);

    expect(recovered).toEqual(originalState);
    expect(recovered!.meters).toEqual(originalState.meters);
    expect(recovered!.tiles).toEqual(originalState.tiles);
    expect(recovered!.leaders).toEqual(originalState.leaders);
    expect(recovered!.councilMembers).toEqual(originalState.councilMembers);
    expect(recovered!.antagonists).toEqual(originalState.antagonists);
    expect(recovered!.calendarState).toEqual(originalState.calendarState);
  });
});
