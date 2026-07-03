import type { GameState, Season, Stage } from '../state/types';

export interface SaveMetadata {
  slot: string;
  citySlug: string;
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

// City-scoped save/load system
// Each city has its own save namespace to prevent conflicts

function getSavePrefix(citySlug: string): string {
  return `${citySlug}_solarpunk_save_`;
}

function getMetaPrefix(citySlug: string): string {
  return `${citySlug}_solarpunk_meta_`;
}

const CURRENT_VERSION = 2;

export function saveGame(
  state: GameState,
  citySlug: string,
  slot: string = 'auto',
  storage: Storage = window.localStorage,
): void {
  const saveKey = `${getSavePrefix(citySlug)}${slot}`;
  const metaKey = `${getMetaPrefix(citySlug)}${slot}`;
  
  storage.setItem(saveKey, JSON.stringify(state));
  
  const metadata: SaveMetadata = {
    slot,
    citySlug,
    turn: state.turn,
    season: state.season,
    year: state.year,
    stage: state.stage,
    savedAt: new Date().toISOString(),
  };
  storage.setItem(metaKey, JSON.stringify(metadata));
}

export function loadGame(
  citySlug: string,
  slot: string = 'auto',
  storage: Storage = window.localStorage,
): GameState | null {
  const key = `${getSavePrefix(citySlug)}${slot}`;
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
  citySlug?: string,
  storage: Storage = window.localStorage,
): SaveMetadata[] {
  // When citySlug is specified, filter to that city's prefix.
  // When undefined, scan ALL keys but only treat "_solarpunk_meta_" keys as metadata.
  const metaPrefix = citySlug ? getMetaPrefix(citySlug) : '';
  const results: SaveMetadata[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    // Skip save keys - only include metadata keys
    const isMetaKey = citySlug ? key.startsWith(metaPrefix) : key.includes('_solarpunk_meta_');
    if (!isMetaKey) continue;
    const raw = storage.getItem(key);
    if (raw) {
      try {
        results.push(JSON.parse(raw) as SaveMetadata);
      } catch {
        // skip malformed entries
      }
    }
  }
  return results;
}

export function deleteSave(
  citySlug: string,
  slot: string,
  storage: Storage = window.localStorage,
): void {
  storage.removeItem(`${getSavePrefix(citySlug)}${slot}`);
  storage.removeItem(`${getMetaPrefix(citySlug)}${slot}`);
}

export function autoSave(
  state: GameState,
  citySlug: string,
  storage: Storage = window.localStorage,
): void {
  saveGame(state, citySlug, 'auto', storage);
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
