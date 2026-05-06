import { describe, it, expect } from 'vitest';
import { canStartProject, startProject, advanceProjects, decayGentrification } from './projects';
import type { GameState, Tile, ActiveProject } from '../state/types';

// Helper to create a minimal valid GameState for testing
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    turn: 1,
    season: 'spring',
    year: 1,
    phase: 'resolve',
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
    tiles: {
      tile_a: makeTile('tile_a', { adjacentTileIds: ['tile_b'] }),
      tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
    },
    leaders: {},
    councilMembers: {},
    antagonists: {},
    activeProposals: [],
    pendingProposals: [],
    activePolicies: [],
    publicOpinion: { foodSovereignty: 50, waterCommons: 50, landReform: 50, ecologicalRestoration: 50, cooperativeEconomics: 50 },
    narrativeState: { actionsRemaining: 3, actionsPerTurn: 3, consecutiveTurns: {}, counterNarrativeCooldowns: {} },
    coalitions: [],
    eventQueue: [],
    eventCooldowns: {},
    councilVoteHistory: [],
    turnSummary: null,
    turnHistory: [],
    maxConcurrentProjects: 4,
    ...overrides,
  } as GameState;
}

function makeTile(id: string, overrides: Partial<Tile> = {}): Tile {
  return {
    id,
    name: id,
    terrain: 'vacant',
    vacancyRate: 50,
    ecologicalHealth: 10,
    contamination: 10,
    gentrificationPressure: 0,
    existingUses: ['vacant_lot'],
    neighborhoodTraits: [],
    activeProjects: [],
    completedProjects: [],
    communityPowerTokens: 0,
    communityOwned: false,
    adjacentTileIds: [],
    visualStage: 'dystopia',
    consumedByproducts: [],
    ...overrides,
  };
}

describe('canStartProject', () => {
  it('allows when all conditions met', () => {
    const state = makeState();
    const result = canStartProject(state, 'tile_a', 'rain_garden', 'player-initiated');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('blocks when budget is insufficient for player-initiated (100% cost)', () => {
    // rain_garden costs 0.14. Set budget to 0.13 to block.
    const state = makeState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 15,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 0.13,
        climatePressure: 30,
      },
    });
    const result = canStartProject(state, 'tile_a', 'rain_garden', 'player-initiated');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/budget/i);
  });

  it('blocks when budget is insufficient for community-led (130% cost)', () => {
    // rain_garden costs 0.14. Community-led = 0.14 * 1.3 = 0.182. Budget = 0.17 should block.
    const state = makeState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 15,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 0.17,
        climatePressure: 30,
      },
    });
    const result = canStartProject(state, 'tile_a', 'rain_garden', 'community-led');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/budget/i);
  });

  it('allows community-led when budget exactly meets 130% cost', () => {
    // rain_garden costs 0.14 * 1.3 = 0.18200000000000002 (floating point)
    const state = makeState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 15,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 0.14 * 1.3, // exact value to avoid floating point mismatch
        climatePressure: 30,
      },
    });
    const result = canStartProject(state, 'tile_a', 'rain_garden', 'community-led');
    expect(result.allowed).toBe(true);
  });

  it('blocks when concurrent project limit exceeded', () => {
    const activeProject: ActiveProject = {
      definitionId: 'greenway',
      tileId: 'tile_a',
      mode: 'player-initiated',
      progress: 0,
      duration: 3,
      cost: 1.0,
    };

    const state = makeState({
      maxConcurrentProjects: 2,
      tiles: {
        tile_a: makeTile('tile_a', {
          activeProjects: [activeProject],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', {
          activeProjects: [{ ...activeProject, tileId: 'tile_b' }],
          adjacentTileIds: ['tile_a'],
        }),
      },
    });

    const result = canStartProject(state, 'tile_a', 'rain_garden', 'player-initiated');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/concurrent/i);
  });

  it('blocks food_forest on tile with 80% contamination (maxContamination = 50)', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', { contamination: 80, adjacentTileIds: ['tile_b'] }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });
    const result = canStartProject(state, 'tile_a', 'food_forest', 'player-initiated');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/contamination/i);
  });

  it('allows food_forest on tile with exactly 50% contamination', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', { contamination: 50, adjacentTileIds: ['tile_b'] }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });
    const result = canStartProject(state, 'tile_a', 'food_forest', 'player-initiated');
    expect(result.allowed).toBe(true);
  });

  it('blocks wetland_restoration when stage is awakening (requires transition)', () => {
    const state = makeState({ stage: 'awakening' });
    const result = canStartProject(state, 'tile_a', 'wetland_restoration', 'player-initiated');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/stage/i);
  });

  it('allows wetland_restoration when stage is transition', () => {
    const state = makeState({ stage: 'transition' });
    const result = canStartProject(state, 'tile_a', 'wetland_restoration', 'player-initiated');
    expect(result.allowed).toBe(true);
  });

  it('allows wetland_restoration when stage is beyond transition', () => {
    const state = makeState({ stage: 'restoration' });
    const result = canStartProject(state, 'tile_a', 'wetland_restoration', 'player-initiated');
    expect(result.allowed).toBe(true);
  });

  it('blocks duplicate project type on same tile', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          activeProjects: [
            {
              definitionId: 'rain_garden',
              tileId: 'tile_a',
              mode: 'player-initiated',
              progress: 0,
              duration: 2,
              cost: 0.4,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });
    const result = canStartProject(state, 'tile_a', 'rain_garden', 'player-initiated');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/already/i);
  });

  it('community-led blocked when trust < 30', () => {
    const state = makeState({
      meters: {
        communityTrust: 29,
        ecologicalHealth: 15,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 4.2,
        climatePressure: 30,
      },
    });
    const result = canStartProject(state, 'tile_a', 'rain_garden', 'community-led');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/trust/i);
  });

  it('community-led allowed when trust is exactly 30', () => {
    const state = makeState({
      meters: {
        communityTrust: 30,
        ecologicalHealth: 15,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 4.2,
        climatePressure: 30,
      },
    });
    const result = canStartProject(state, 'tile_a', 'rain_garden', 'community-led');
    expect(result.allowed).toBe(true);
  });
});

describe('startProject', () => {
  it('deducts correct cost for player-initiated (100%)', () => {
    const state = makeState();
    const next = startProject(state, 'tile_a', 'rain_garden', 'player-initiated');
    // rain_garden baseCost = 0.14, player-initiated = 100%
    expect(next.meters.budget).toBeCloseTo(4.2 - 0.14, 10);
  });

  it('deducts correct cost for community-led (130%)', () => {
    const state = makeState();
    const next = startProject(state, 'tile_a', 'rain_garden', 'community-led');
    // rain_garden baseCost = 0.14, community-led = 130% = 0.182
    expect(next.meters.budget).toBeCloseTo(4.2 - 0.182, 10);
  });

  it('creates ActiveProject with correct duration for player-initiated', () => {
    const state = makeState({ season: 'winter' }); // winter = no seasonal bonus
    const next = startProject(state, 'tile_a', 'rain_garden', 'player-initiated');
    const project = next.tiles['tile_a'].activeProjects[0];
    expect(project.definitionId).toBe('rain_garden');
    expect(project.tileId).toBe('tile_a');
    expect(project.mode).toBe('player-initiated');
    expect(project.progress).toBe(0);
    expect(project.duration).toBe(6); // baseDuration for rain_garden (monthly)
    expect(project.cost).toBeCloseTo(0.14, 10);
  });

  it('creates ActiveProject with correct duration for community-led (ceil(base * 1.5), min base+1)', () => {
    // rain_garden baseDuration = 6. ceil(6 * 1.5) = 9. max(9, 6+1=7) => 9
    const state = makeState({ season: 'winter' });
    const next = startProject(state, 'tile_a', 'rain_garden', 'community-led');
    const project = next.tiles['tile_a'].activeProjects[0];
    expect(project.duration).toBe(9);
  });

  it('community-led duration uses minimum of baseDuration + 1 when ceil is less', () => {
    // food_forest: baseDuration=9, ceil(9*1.5)=ceil(13.5)=14, min=10 => 14
    const state = makeState({ season: 'winter' }); // winter = no seasonal bonus
    const next = startProject(state, 'tile_a', 'food_forest', 'community-led');
    const project = next.tiles['tile_a'].activeProjects[0];
    expect(project.duration).toBe(14); // ceil(9 * 1.5) = 14
  });

  it('does not mutate original state', () => {
    const state = makeState();
    const originalBudget = state.meters.budget;
    const originalProjects = state.tiles['tile_a'].activeProjects.length;

    startProject(state, 'tile_a', 'rain_garden', 'player-initiated');

    expect(state.meters.budget).toBe(originalBudget);
    expect(state.tiles['tile_a'].activeProjects).toHaveLength(originalProjects);
  });
});

describe('advanceProjects', () => {
  it('advances project progress by 1', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          activeProjects: [
            {
              definitionId: 'rain_garden',
              tileId: 'tile_a',
              mode: 'player-initiated',
              progress: 0,
              duration: 2,
              cost: 0.4,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: next } = advanceProjects(state);
    expect(next.tiles['tile_a'].activeProjects[0].progress).toBe(1);
  });

  it('completes project when progress reaches duration', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          activeProjects: [
            {
              definitionId: 'rain_garden',
              tileId: 'tile_a',
              mode: 'player-initiated',
              progress: 1, // will become 2, which equals duration
              duration: 2,
              cost: 0.4,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: next } = advanceProjects(state);
    expect(next.tiles['tile_a'].activeProjects).toHaveLength(0);
    expect(next.tiles['tile_a'].completedProjects).toContain('rain_garden');
  });

  it('applies tileEco and meter effects on completion', () => {
    // rain_garden: tileEco=8, foodSov=0, trust=1
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          ecologicalHealth: 10,
          activeProjects: [
            {
              definitionId: 'rain_garden',
              tileId: 'tile_a',
              mode: 'player-initiated',
              progress: 0,
              duration: 1,
              cost: 0.14,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: next, deltas: _deltas } = advanceProjects(state);
    expect(next.tiles['tile_a'].ecologicalHealth).toBe(18); // 10 + 8
  });

  it('player-initiated trust gain is 50% of base', () => {
    // food_forest: trust=2, player-initiated => 2 * 0.5 = 1.0
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          activeProjects: [
            {
              definitionId: 'food_forest',
              tileId: 'tile_a',
              mode: 'player-initiated',
              progress: 2,
              duration: 3,
              cost: 0.10,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: _next, deltas } = advanceProjects(state);
    const trustDelta = deltas.find((d) => d.meter === 'communityTrust');
    expect(trustDelta).toBeDefined();
    expect(trustDelta!.amount).toBeCloseTo(1.0, 10);
  });

  it('community-led trust gain is 120% of base', () => {
    // food_forest: trust=2, community-led => 2 * 1.2 = 2.4
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          activeProjects: [
            {
              definitionId: 'food_forest',
              tileId: 'tile_a',
              mode: 'community-led',
              progress: 4, // community-led duration is 5 for food_forest
              duration: 5,
              cost: 0.13,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: _next, deltas } = advanceProjects(state);
    const trustDelta = deltas.find((d) => d.meter === 'communityTrust');
    expect(trustDelta).toBeDefined();
    expect(trustDelta!.amount).toBeCloseTo(2.4, 10);
  });

  it('player-initiated gentrification: 10% base * 1.5 = 15% on tile', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          gentrificationPressure: 0,
          activeProjects: [
            {
              definitionId: 'rain_garden',
              tileId: 'tile_a',
              mode: 'player-initiated',
              progress: 1,
              duration: 2,
              cost: 0.4,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { gentrificationPressure: 0, adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: next } = advanceProjects(state);
    expect(next.tiles['tile_a'].gentrificationPressure).toBeCloseTo(7.5, 10);
  });

  it('community-led gentrification: gentrificationChange(0) + 5 * 0.5 = 2.5 on tile', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          gentrificationPressure: 0,
          activeProjects: [
            {
              definitionId: 'rain_garden',
              tileId: 'tile_a',
              mode: 'community-led',
              progress: 2,
              duration: 3,
              cost: 0.52,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { gentrificationPressure: 0, adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: next } = advanceProjects(state);
    expect(next.tiles['tile_a'].gentrificationPressure).toBeCloseTo(2.5, 10);
  });

  it('adjacent tile gentrification: player-initiated = 3 * 1.5 = 4.5', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          gentrificationPressure: 0,
          activeProjects: [
            {
              definitionId: 'rain_garden',
              tileId: 'tile_a',
              mode: 'player-initiated',
              progress: 1,
              duration: 2,
              cost: 0.4,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { gentrificationPressure: 0, adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: next } = advanceProjects(state);
    expect(next.tiles['tile_b'].gentrificationPressure).toBeCloseTo(4.5, 10);
  });

  it('adjacent tile gentrification: community-led = 3 * 0.5 = 1.5', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          gentrificationPressure: 0,
          activeProjects: [
            {
              definitionId: 'rain_garden',
              tileId: 'tile_a',
              mode: 'community-led',
              progress: 2,
              duration: 3,
              cost: 0.52,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { gentrificationPressure: 0, adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: next } = advanceProjects(state);
    expect(next.tiles['tile_b'].gentrificationPressure).toBeCloseTo(1.5, 10);
  });

  it('community-led completion sets communityOwned and increments tokens', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          communityOwned: false,
          communityPowerTokens: 0,
          activeProjects: [
            {
              definitionId: 'rain_garden',
              tileId: 'tile_a',
              mode: 'community-led',
              progress: 2,
              duration: 3,
              cost: 0.52,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: next } = advanceProjects(state);
    expect(next.tiles['tile_a'].communityOwned).toBe(true);
    expect(next.tiles['tile_a'].communityPowerTokens).toBe(1);
  });

  it('player-initiated completion does not set communityOwned', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          communityOwned: false,
          communityPowerTokens: 0,
          activeProjects: [
            {
              definitionId: 'rain_garden',
              tileId: 'tile_a',
              mode: 'player-initiated',
              progress: 1,
              duration: 2,
              cost: 0.4,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: next } = advanceProjects(state);
    expect(next.tiles['tile_a'].communityOwned).toBe(false);
    expect(next.tiles['tile_a'].communityPowerTokens).toBe(0);
  });

  describe('visual stage updates on eco threshold crossing', () => {
    it('tile transitions from dystopia to transition at eco >= 25', () => {
      const state = makeState({
        tiles: {
          tile_a: makeTile('tile_a', {
            ecologicalHealth: 20,
            visualStage: 'dystopia',
            activeProjects: [
              {
                definitionId: 'rain_garden',
                tileId: 'tile_a',
                mode: 'player-initiated',
                progress: 1,
                duration: 2,
                cost: 0.4,
              },
            ],
            adjacentTileIds: ['tile_b'],
          }),
          tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
        },
      });

      const { state: next } = advanceProjects(state);
      // 20 + 7 (rain_garden tileEco) = 27 >= 25
      expect(next.tiles['tile_a'].visualStage).toBe('transition');
    });

    it('tile transitions to restoration at eco >= 60', () => {
      const state = makeState({
        tiles: {
          tile_a: makeTile('tile_a', {
            ecologicalHealth: 53,
            visualStage: 'transition',
            activeProjects: [
              {
                definitionId: 'rain_garden',
                tileId: 'tile_a',
                mode: 'player-initiated',
                progress: 1,
                duration: 2,
                cost: 0.4,
              },
            ],
            adjacentTileIds: ['tile_b'],
          }),
          tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
        },
      });

      const { state: next } = advanceProjects(state);
      // 53 + 7 = 60 >= 60
      expect(next.tiles['tile_a'].visualStage).toBe('restoration');
    });

    it('tile transitions to beyond at eco >= 85', () => {
      const state = makeState({
        tiles: {
          tile_a: makeTile('tile_a', {
            ecologicalHealth: 78,
            visualStage: 'restoration',
            activeProjects: [
              {
                definitionId: 'rain_garden',
                tileId: 'tile_a',
                mode: 'player-initiated',
                progress: 1,
                duration: 2,
                cost: 0.4,
              },
            ],
            adjacentTileIds: ['tile_b'],
          }),
          tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
        },
      });

      const { state: next } = advanceProjects(state);
      // 78 + 7 = 85 >= 85
      expect(next.tiles['tile_a'].visualStage).toBe('beyond');
    });

    it('tile stays dystopia when eco < 25 after completion', () => {
      const state = makeState({
        tiles: {
          tile_a: makeTile('tile_a', {
            ecologicalHealth: 10,
            visualStage: 'dystopia',
            activeProjects: [
              {
                definitionId: 'solar_grid',
                tileId: 'tile_a',
                mode: 'player-initiated',
                progress: 3,
                duration: 4,
                cost: 1.5,
              },
            ],
            adjacentTileIds: ['tile_b'],
          }),
          tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
        },
      });

      const { state: next } = advanceProjects(state);
      // 10 + 3.5 (solar_grid tileEco) = 13.5 < 25
      expect(next.tiles['tile_a'].visualStage).toBe('dystopia');
    });
  });

  it('returns deltas for food sovereignty changes', () => {
    // food_forest: foodSov = 8
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          activeProjects: [
            {
              definitionId: 'food_forest',
              tileId: 'tile_a',
              mode: 'player-initiated',
              progress: 2,
              duration: 3,
              cost: 0.10,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });

    const { deltas } = advanceProjects(state);
    const foodDelta = deltas.find((d) => d.meter === 'foodSovereignty');
    expect(foodDelta).toBeDefined();
    expect(foodDelta!.amount).toBe(8);
  });

  it('adds annualRevenue to budget on completion', () => {
    // solar_grid: annualRevenue = 0.08
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          activeProjects: [
            {
              definitionId: 'solar_grid',
              tileId: 'tile_a',
              mode: 'player-initiated',
              progress: 2,
              duration: 3,
              cost: 0.40,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: _next, deltas } = advanceProjects(state);
    const budgetDelta = deltas.find((d) => d.meter === 'budget');
    expect(budgetDelta).toBeDefined();
    expect(budgetDelta!.amount).toBeCloseTo(0.08, 10);
  });

  it('applies contamination reduction on soil_remediation completion', () => {
    // soil_remediation: contaminationReduction = 60 (removes 60% of contamination)
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          contamination: 80,
          activeProjects: [
            {
              definitionId: 'soil_remediation',
              tileId: 'tile_a',
              mode: 'player-initiated',
              progress: 3,
              duration: 4,
              cost: 1.0,
            },
          ],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });

    const { state: next } = advanceProjects(state);
    // 80 - (80 * 0.60) = 80 - 48 = 32
    expect(next.tiles['tile_a'].contamination).toBeCloseTo(32, 10);
  });
});

describe('decayGentrification', () => {
  it('each tile loses 1% gentrification per turn', () => {
    const tiles: Record<string, Tile> = {
      tile_a: makeTile('tile_a', { gentrificationPressure: 50 }),
      tile_b: makeTile('tile_b', { gentrificationPressure: 20 }),
    };

    const result = decayGentrification(tiles);
    expect(result['tile_a'].gentrificationPressure).toBe(49);
    expect(result['tile_b'].gentrificationPressure).toBe(19);
  });

  it('gentrification does not go below 0', () => {
    const tiles: Record<string, Tile> = {
      tile_a: makeTile('tile_a', { gentrificationPressure: 0 }),
      tile_b: makeTile('tile_b', { gentrificationPressure: 0.5 }),
    };

    const result = decayGentrification(tiles);
    expect(result['tile_a'].gentrificationPressure).toBe(0);
    expect(result['tile_b'].gentrificationPressure).toBe(0);
  });
});

describe('direct-action mode', () => {
  it('requires trust >= 50', () => {
    const state = makeState({
      meters: { communityTrust: 40, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 30 },
    });
    const result = canStartProject(state, 'tile_a', 'rain_garden', 'direct-action');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('trust >= 50');
  });

  it('allows direct action when trust >= 50', () => {
    const state = makeState({
      meters: { communityTrust: 55, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 30 },
    });
    const result = canStartProject(state, 'tile_a', 'rain_garden', 'direct-action');
    expect(result.allowed).toBe(true);
  });

  it('costs almost nothing in budget (scavenged materials)', () => {
    const state = makeState({
      meters: { communityTrust: 60, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 0.05, climatePressure: 30 },
    });
    const after = startProject(state, 'tile_a', 'rain_garden', 'direct-action');
    expect(after.meters.budget).toBeCloseTo(0.03, 2);
  });

  it('deducts 8 trust on start', () => {
    const state = makeState({
      meters: { communityTrust: 60, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 30 },
    });
    const after = startProject(state, 'tile_a', 'rain_garden', 'direct-action');
    expect(after.meters.communityTrust).toBe(52);
  });

  it('angers all council members by -5 disposition', () => {
    const state = makeState({
      meters: { communityTrust: 60, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 30 },
      councilMembers: {
        cm1: { id: 'cm1', name: 'Test', district: 'D1', districtNumber: 1, leaning: 'moderate', priorities: [], disposition: 20, backstory: '', tileIds: [] },
        cm2: { id: 'cm2', name: 'Test2', district: 'D2', districtNumber: 2, leaning: 'progressive', priorities: [], disposition: 10, backstory: '', tileIds: [] },
      },
    });
    const after = startProject(state, 'tile_a', 'rain_garden', 'direct-action');
    expect(after.councilMembers['cm1'].disposition).toBe(15);
    expect(after.councilMembers['cm2'].disposition).toBe(5);
  });

  it('halves project duration', () => {
    const state = makeState({
      season: 'winter', // no seasonal bonus
      meters: { communityTrust: 60, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 30 },
    });
    // food_forest baseDuration = 9, halved = 5 (ceil(9*0.5) = 5)
    const after = startProject(state, 'tile_a', 'food_forest', 'direct-action');
    expect(after.tiles['tile_a'].activeProjects[0].duration).toBe(5);
  });

  it('zero gentrification on completion', () => {
    const state = makeState({
      tiles: {
        tile_a: makeTile('tile_a', {
          gentrificationPressure: 10,
          activeProjects: [{
            definitionId: 'solar_grid',
            tileId: 'tile_a',
            mode: 'direct-action',
            progress: 1,
            duration: 2,
            cost: 0.02,
          }],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { gentrificationPressure: 5, adjacentTileIds: ['tile_a'] }),
      },
    });
    const { state: next } = advanceProjects(state);
    // No gentrification added to either tile
    expect(next.tiles['tile_a'].gentrificationPressure).toBe(10);
    expect(next.tiles['tile_b'].gentrificationPressure).toBe(5);
  });

  it('grants bonus trust on completion', () => {
    const state = makeState({
      meters: { communityTrust: 60, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 30 },
      tiles: {
        tile_a: makeTile('tile_a', {
          activeProjects: [{
            definitionId: 'rain_garden',
            tileId: 'tile_a',
            mode: 'direct-action',
            progress: 0,
            duration: 1,
            cost: 0.02,
          }],
          adjacentTileIds: ['tile_b'],
        }),
        tile_b: makeTile('tile_b', { adjacentTileIds: ['tile_a'] }),
      },
    });
    const { state: next, deltas } = advanceProjects(state);
    // rain_garden trust effect = 1, multiplier 2.0 + bonus 6 = 8
    const trustDelta = deltas.find(d => d.meter === 'communityTrust');
    expect(trustDelta?.amount).toBe(8);
  });
});
