import { describe, it, expect } from 'vitest';
import type { GameState, Meters } from './types';

describe('Type sanity checks', () => {
  it('Meters has all 6 required fields', () => {
    const meters: Meters = {
      communityTrust: 50,
      ecologicalHealth: 15,
      foodSovereignty: 10,
      politicalWill: 60,
      budget: 4.2,
      climatePressure: 30,
    };
    expect(Object.keys(meters)).toHaveLength(6);
  });

  it('GameState starting values match spec', () => {
    const state: Partial<GameState> = {
      version: 2,
      turn: 1,
      season: 'spring',
      year: 1,
      phase: 'events',
      stage: 'awakening',
      path: null,
      meters: {
        communityTrust: 50,
        ecologicalHealth: 15,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 4.2,
        climatePressure: 30,
      },
    };
    expect(state.meters!.communityTrust).toBe(50);
    expect(state.meters!.budget).toBe(4.2);
    expect(state.stage).toBe('awakening');
  });
});
