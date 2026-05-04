import { createContext, useContext } from 'react';
import type { GameState, GameAction } from './types';

export interface GameStore {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export const GameContext = createContext<GameStore | null>(null);

export function useGame(): GameStore {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameContext.Provider');
  }
  return ctx;
}
