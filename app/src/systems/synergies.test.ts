import { describe, it, expect } from 'vitest';
import { calculateSynergies } from './synergies';
import type { GameState, Tile } from '../state/types';

function makeTile(overrides: Partial<Tile> = {}): Tile {
  return {
    id: 'tile1',
    name: 'Test Tile',
    terrain: 'vacant',
    vacancyRate: 80,
    ecologicalHealth: 10,
    contamination: 0,
    gentrificationPressure: 0,
    existingUses: ['vacant_lot'],
    neighborhoodTraits: [],
    activeProjects: [],
    completedProjects: [],
    communityPowerTokens: 0,
    communityOwned: false,
    adjacentTileIds: ['tile2'],
    visualStage: 'dystopia',
    consumedByproducts: [],
    ...overrides,
  };
}

function makeState(tiles: Record<string, Tile>): GameState {
  return {
    tiles,
    meters: { communityTrust: 50, ecologicalHealth: 20, foodSovereignty: 10, politicalWill: 30, budget: 2, climatePressure: 20 },
  } as unknown as GameState;
}

describe('calculateSynergies', () => {
  it('returns no synergies when no completed projects exist', () => {
    const state = makeState({ tile1: makeTile() });
    const result = calculateSynergies(state, 'tile1', 'food_forest');
    expect(result.costMultiplier).toBe(1);
    expect(result.durationMultiplier).toBe(1);
    expect(result.ecoBonus).toBe(0);
    expect(result.activeSynergies).toHaveLength(0);
  });

  it('applies same-tile synergy: soil_remediation → food_forest', () => {
    const state = makeState({
      tile1: makeTile({ completedProjects: ['soil_remediation'] }),
    });
    const result = calculateSynergies(state, 'tile1', 'food_forest');
    expect(result.durationMultiplier).toBe(0.67);
    expect(result.ecoBonus).toBe(4);
    expect(result.costMultiplier).toBe(1);
    expect(result.activeSynergies).toHaveLength(1);
    expect(result.activeSynergies[0].synergy.reason).toContain('Clean soil');
  });

  it('applies adjacent synergy: maker_space on tile2 → solar_grid on tile1', () => {
    const state = makeState({
      tile1: makeTile({ adjacentTileIds: ['tile2'] }),
      tile2: makeTile({ id: 'tile2', completedProjects: ['maker_space'], adjacentTileIds: ['tile1'] }),
    });
    const result = calculateSynergies(state, 'tile1', 'solar_grid');
    expect(result.costMultiplier).toBe(0.75);
    expect(result.durationMultiplier).toBe(0.67);
    expect(result.activeSynergies).toHaveLength(1);
  });

  it('does not apply adjacent synergy for same-tile-only rules', () => {
    const state = makeState({
      tile1: makeTile({ adjacentTileIds: ['tile2'] }),
      tile2: makeTile({ id: 'tile2', completedProjects: ['soil_remediation'], adjacentTileIds: ['tile1'] }),
    });
    const result = calculateSynergies(state, 'tile1', 'food_forest');
    // soil_remediation → food_forest is same-tile only
    expect(result.activeSynergies).toHaveLength(0);
  });

  it('stacks multiple synergies', () => {
    const state = makeState({
      tile1: makeTile({
        completedProjects: ['soil_remediation', 'land_trust'],
        adjacentTileIds: ['tile2'],
      }),
      tile2: makeTile({ id: 'tile2', completedProjects: ['community_kitchen'], adjacentTileIds: ['tile1'] }),
    });
    const result = calculateSynergies(state, 'tile1', 'food_forest');
    // soil_remediation: duration 0.67, eco +4
    // land_trust: cost 0.70
    // community_kitchen (adjacent): cost 0.90, eco +3
    expect(result.durationMultiplier).toBe(0.67);
    expect(result.costMultiplier).toBeCloseTo(0.70 * 0.90);
    expect(result.ecoBonus).toBe(7);
    expect(result.activeSynergies).toHaveLength(3);
  });

  it('respects floor: cost never below 0.30', () => {
    // Hypothetical scenario with many cost reducers
    const state = makeState({
      tile1: makeTile({
        completedProjects: ['land_trust', 'soil_remediation'],
        adjacentTileIds: ['tile2', 'tile3', 'tile4'],
      }),
      tile2: makeTile({ id: 'tile2', completedProjects: ['community_kitchen'], adjacentTileIds: ['tile1'] }),
      tile3: makeTile({ id: 'tile3', completedProjects: ['community_kitchen'], adjacentTileIds: ['tile1'] }),
      tile4: makeTile({ id: 'tile4', completedProjects: ['community_kitchen'], adjacentTileIds: ['tile1'] }),
    });
    const result = calculateSynergies(state, 'tile1', 'food_forest');
    expect(result.costMultiplier).toBeGreaterThanOrEqual(0.30);
  });

  it('returns empty for unknown tile', () => {
    const state = makeState({ tile1: makeTile() });
    const result = calculateSynergies(state, 'nonexistent', 'food_forest');
    expect(result.activeSynergies).toHaveLength(0);
  });

  it('land_trust reduces maker_space cost on same tile', () => {
    const state = makeState({
      tile1: makeTile({ completedProjects: ['land_trust'] }),
    });
    const result = calculateSynergies(state, 'tile1', 'maker_space');
    expect(result.costMultiplier).toBe(0.75);
    expect(result.activeSynergies[0].synergy.reason).toContain('no rent');
  });
});
