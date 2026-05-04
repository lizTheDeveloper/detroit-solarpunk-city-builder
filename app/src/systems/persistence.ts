import type { GameState, Season, Stage } from '../state/types';

export interface SaveMetadata {
  slot: string;
  turn: number;
  season: Season;
  year: number;
  stage: Stage;
  savedAt: string;
}

export interface UndoStack {
  past: GameState[];
  maxSize: number;
}

type Storage = Pick<typeof localStorage, 'getItem' | 'setItem' | 'removeItem' | 'length' | 'key'>;

const SAVE_PREFIX = 'detroit_solarpunk_save_';
const META_PREFIX = 'detroit_solarpunk_meta_';
const CURRENT_VERSION = 2;

export function saveGame(
  state: GameState,
  slot: string = 'auto',
  storage: Storage = window.localStorage,
): void {
  const key = `${SAVE_PREFIX}${slot}`;
  storage.setItem(key, JSON.stringify(state));

  const metadata: SaveMetadata = {
    slot,
    turn: state.turn,
    season: state.season,
    year: state.year,
    stage: state.stage,
    savedAt: new Date().toISOString(),
  };
  storage.setItem(`${META_PREFIX}${slot}`, JSON.stringify(metadata));
}

export function loadGame(
  slot: string = 'auto',
  storage: Storage = window.localStorage,
): GameState | null {
  const key = `${SAVE_PREFIX}${slot}`;
  const raw = storage.getItem(key);
  if (raw === null) return null;

  try {
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function listSaves(
  storage: Storage = window.localStorage,
): SaveMetadata[] {
  const results: SaveMetadata[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(META_PREFIX)) {
      const raw = storage.getItem(key);
      if (raw) {
        try {
          results.push(JSON.parse(raw) as SaveMetadata);
        } catch {
          // skip malformed entries
        }
      }
    }
  }
  return results;
}

export function deleteSave(
  slot: string,
  storage: Storage = window.localStorage,
): void {
  storage.removeItem(`${SAVE_PREFIX}${slot}`);
  storage.removeItem(`${META_PREFIX}${slot}`);
}

export function autoSave(
  state: GameState,
  storage: Storage = window.localStorage,
): void {
  saveGame(state, 'auto', storage);
}

export function createUndoStack(): UndoStack {
  return {
    past: [],
    maxSize: 10,
  };
}

export function pushState(stack: UndoStack, state: GameState): UndoStack {
  const past = [...stack.past, state];
  // Trim to maxSize by removing oldest entries
  const trimmed = past.length > stack.maxSize ? past.slice(past.length - stack.maxSize) : past;
  return { ...stack, past: trimmed };
}

export function undo(stack: UndoStack): { stack: UndoStack; state: GameState | null } {
  if (stack.past.length === 0) {
    return { stack, state: null };
  }
  const past = [...stack.past];
  const state = past.pop()!;
  return { stack: { ...stack, past }, state };
}

export function canUndo(stack: UndoStack): boolean {
  return stack.past.length > 0;
}
