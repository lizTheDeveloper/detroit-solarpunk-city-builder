import { describe, it, expect } from 'vitest';
import type { GameState, Tile, Meters } from '../state/types';
import {
  checkTippingPoints,
  applySeasonalEffects,
  calculateAdaptedDamage,
  generateClimateEvent,
  applyTippingPointDamageMultiplier,
  getAdaptationSummary,
} from './climate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMeters(overrides: Partial<Meters> = {}): Meters {
  return {
    communityTrust: 50,
    ecologicalHealth: 30,
    foodSovereignty: 20,
    politicalWill: 60,
    budget: 4.0,
    climatePressure: 30,
    ...overrides,
  };
}

function makeTile(overrides: Partial<Tile> = {}): Tile {
  return {
    id: 'tile_1',
    name: 'Test Tile',
    terrain: 'urban-sparse',
    vacancyRate: 0.2,
    ecologicalHealth: 40,
    contamination: 0,
    gentrificationPressure: 10,
    existingUses: ['vacant_lot'],
    neighborhoodTraits: [],
    activeProjects: [],
    completedProjects: [],
    communityPowerTokens: 0,
    communityOwned: false,
    adjacentTileIds: [],
    visualStage: 'dystopia',
    ...overrides,
    consumedByproducts: overrides.consumedByproducts ?? [],
    vacantLots: overrides.vacantLots ?? 5,
    reclaimedLots: overrides.reclaimedLots ?? 0,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    turn: 5,
    season: 'summer',
    year: 2,
    phase: 'resolve',
    stage: 'awakening',
    path: null,
    meters: makeMeters(),
    tiles: {
      tile_1: makeTile({ id: 'tile_1', ecologicalHealth: 40 }),
      tile_2: makeTile({ id: 'tile_2', ecologicalHealth: 30 }),
      tile_3: makeTile({ id: 'tile_3', ecologicalHealth: 20 }),
      tile_4: makeTile({ id: 'tile_4', ecologicalHealth: 50 }),
    },
    leaders: {},
    councilMembers: {},
    antagonists: {},
    activeProposals: [],
    pendingProposals: [],
    activePolicies: [],
    publicOpinion: {
      foodSovereignty: 50,
      waterCommons: 50,
      landReform: 50,
      ecologicalRestoration: 50,
      cooperativeEconomics: 50,
    },
    narrativeState: {
      actionsRemaining: 2,
      actionsPerTurn: 2,
      consecutiveTurns: {},
      counterNarrativeCooldowns: {},
    },
    coalitions: [],
    eventQueue: [],
    eventCooldowns: {},
    councilVoteHistory: [],
    turnSummary: null,
    turnHistory: [],
    maxConcurrentProjects: 3,
    ...overrides,
  } as GameState;
}

// ---------------------------------------------------------------------------
// checkTippingPoints
// ---------------------------------------------------------------------------

describe('checkTippingPoints', () => {
  it('triggers tipping point 1 at exactly 60% pressure', () => {
    const state = makeState({
      meters: makeMeters({ climatePressure: 60 }),
    });
    const { triggered, updatedState } = checkTippingPoints(state);

    expect(triggered).toHaveLength(1);
    expect(triggered[0].point).toBe(1);
    expect(triggered[0].message).toBe(
      'Climate tipping point reached. Severe weather is now the baseline.'
    );
    expect(updatedState.eventCooldowns['tipping_point_1']).toBe(9999);
  });

  it('does NOT re-trigger tipping point 1 once already triggered', () => {
    const state = makeState({
      meters: makeMeters({ climatePressure: 65 }),
      eventCooldowns: { tipping_point_1: 9999 },
    });
    const { triggered } = checkTippingPoints(state);

    expect(triggered).toHaveLength(0);
  });

  it('tipping point 1 applies -5% eco to all tiles', () => {
    const state = makeState({
      meters: makeMeters({ climatePressure: 60 }),
      tiles: {
        tile_1: makeTile({ id: 'tile_1', ecologicalHealth: 40 }),
        tile_2: makeTile({ id: 'tile_2', ecologicalHealth: 30 }),
        tile_3: makeTile({ id: 'tile_3', ecologicalHealth: 20 }),
      },
    });
    const { updatedState, triggered } = checkTippingPoints(state);

    expect(updatedState.tiles['tile_1'].ecologicalHealth).toBe(35);
    expect(updatedState.tiles['tile_2'].ecologicalHealth).toBe(25);
    expect(updatedState.tiles['tile_3'].ecologicalHealth).toBe(15);

    // Verify tileEffects
    expect(triggered[0].tileEffects).toHaveLength(3);
    for (const effect of triggered[0].tileEffects) {
      expect(effect.ecoDamage).toBe(-5);
    }
  });

  it('triggers tipping point 2 at 85% pressure', () => {
    const state = makeState({
      meters: makeMeters({ climatePressure: 85 }),
    });
    const { triggered, updatedState } = checkTippingPoints(state);

    expect(triggered).toHaveLength(2); // Both TP1 and TP2 trigger if neither has been triggered
    const tp2 = triggered.find((t) => t.point === 2);
    expect(tp2).toBeDefined();
    expect(tp2!.message).toBe(
      'Cascading climate failure. Damage is now amplified across all systems.'
    );
    expect(updatedState.eventCooldowns['tipping_point_2']).toBe(9999);
  });

  it('tipping point 2 floods 3 lowest-eco tiles with -15% eco', () => {
    const state = makeState({
      meters: makeMeters({ climatePressure: 85 }),
      eventCooldowns: { tipping_point_1: 9999 }, // TP1 already triggered
      tiles: {
        tile_a: makeTile({ id: 'tile_a', ecologicalHealth: 50 }),
        tile_b: makeTile({ id: 'tile_b', ecologicalHealth: 20 }),
        tile_c: makeTile({ id: 'tile_c', ecologicalHealth: 10 }),
        tile_d: makeTile({ id: 'tile_d', ecologicalHealth: 30 }),
        tile_e: makeTile({ id: 'tile_e', ecologicalHealth: 5 }),
      },
    });
    const { triggered, updatedState } = checkTippingPoints(state);

    expect(triggered).toHaveLength(1);
    expect(triggered[0].point).toBe(2);

    // The 3 lowest eco tiles are: tile_e (5), tile_c (10), tile_b (20)
    expect(updatedState.tiles['tile_e'].ecologicalHealth).toBe(0); // 5 - 15 clamped to 0
    expect(updatedState.tiles['tile_c'].ecologicalHealth).toBe(0); // 10 - 15 clamped to 0
    expect(updatedState.tiles['tile_b'].ecologicalHealth).toBe(5); // 20 - 15 = 5

    // Higher eco tiles are unaffected
    expect(updatedState.tiles['tile_a'].ecologicalHealth).toBe(50);
    expect(updatedState.tiles['tile_d'].ecologicalHealth).toBe(30);
  });

  it('tipping point 2 costs -$0.5M', () => {
    const state = makeState({
      meters: makeMeters({ climatePressure: 85, budget: 4.0 }),
      eventCooldowns: { tipping_point_1: 9999 },
    });
    const { triggered, updatedState } = checkTippingPoints(state);

    const tp2 = triggered.find((t) => t.point === 2)!;
    expect(tp2.meterDeltas).toContainEqual({
      meter: 'budget',
      amount: -0.5,
      source: 'tipping_point_2_flooding',
    });
    expect(updatedState.meters.budget).toBe(3.5);
  });
});

// ---------------------------------------------------------------------------
// applySeasonalEffects
// ---------------------------------------------------------------------------

describe('applySeasonalEffects', () => {
  const rng = () => 0.5;

  it('spring: +0.5% eco to tiles with rain_garden', () => {
    const state = makeState({
      season: 'spring',
      tiles: {
        tile_1: makeTile({
          id: 'tile_1',
          ecologicalHealth: 40,
          completedProjects: ['rain_garden'],
        }),
        tile_2: makeTile({
          id: 'tile_2',
          ecologicalHealth: 30,
          completedProjects: [],
        }),
      },
    });
    const { state: result } = applySeasonalEffects(state, rng);

    expect(result.tiles['tile_1'].ecologicalHealth).toBe(40.5);
    expect(result.tiles['tile_2'].ecologicalHealth).toBe(30); // no rain garden, no bonus
  });

  it('summer: -1% food sov when no water_transit exists', () => {
    const state = makeState({
      season: 'summer',
      meters: makeMeters({ foodSovereignty: 20 }),
      tiles: {
        tile_1: makeTile({ id: 'tile_1', completedProjects: [] }),
        tile_2: makeTile({ id: 'tile_2', completedProjects: ['greenway'] }),
      },
    });
    const { state: result, deltas } = applySeasonalEffects(state, rng);

    expect(result.meters.foodSovereignty).toBe(19);
    expect(deltas).toContainEqual({
      meter: 'foodSovereignty',
      amount: -1,
      source: 'summer_drought',
    });
  });

  it('summer: no food sov penalty when water_transit exists', () => {
    const state = makeState({
      season: 'summer',
      meters: makeMeters({ foodSovereignty: 20 }),
      tiles: {
        tile_1: makeTile({ id: 'tile_1', completedProjects: ['water_transit'] }),
      },
    });
    const { state: result, deltas } = applySeasonalEffects(state, rng);

    expect(result.meters.foodSovereignty).toBe(20);
    expect(deltas).toHaveLength(0);
  });

  it('fall: +1% food sov harvest', () => {
    const state = makeState({
      season: 'fall',
      meters: makeMeters({ foodSovereignty: 20 }),
    });
    const { state: result, deltas } = applySeasonalEffects(state, rng);

    expect(result.meters.foodSovereignty).toBe(21);
    expect(deltas).toContainEqual({
      meter: 'foodSovereignty',
      amount: 1,
      source: 'fall_harvest',
    });
  });

  it('winter: -$0.05M per tile with active projects', () => {
    const state = makeState({
      season: 'winter',
      meters: makeMeters({ budget: 4.0 }),
      tiles: {
        tile_1: makeTile({
          id: 'tile_1',
          activeProjects: [
            {
              definitionId: 'rain_garden',
              tileId: 'tile_1',
              mode: 'player-initiated',
              progress: 1,
              duration: 3,
              cost: 0.3,
            },
          ],
        }),
        tile_2: makeTile({
          id: 'tile_2',
          activeProjects: [
            {
              definitionId: 'greenway',
              tileId: 'tile_2',
              mode: 'player-initiated',
              progress: 2,
              duration: 4,
              cost: 0.5,
            },
          ],
        }),
        tile_3: makeTile({ id: 'tile_3', activeProjects: [] }),
      },
    });
    const { state: result, deltas } = applySeasonalEffects(state, rng);

    // 2 tiles with active projects * -$0.05M = -$0.10M
    expect(result.meters.budget).toBeCloseTo(3.9);
    expect(deltas).toContainEqual({
      meter: 'budget',
      amount: -0.1,
      source: 'winter_heating',
    });
  });
});

// ---------------------------------------------------------------------------
// calculateAdaptedDamage
// ---------------------------------------------------------------------------

describe('calculateAdaptedDamage', () => {
  it('rain garden reduces flood damage by 50%', () => {
    const tile = makeTile({ completedProjects: ['rain_garden'] });
    const result = calculateAdaptedDamage(tile, 10, 'flood');
    expect(result).toBe(5);
  });

  it('no rain garden means full flood damage', () => {
    const tile = makeTile({ completedProjects: [] });
    const result = calculateAdaptedDamage(tile, 10, 'flood');
    expect(result).toBe(10);
  });

  it('greenway reduces heat damage by 40%', () => {
    const tile = makeTile({ completedProjects: ['greenway'] });
    const result = calculateAdaptedDamage(tile, 10, 'heat');
    expect(result).toBe(6);
  });

  it('no greenway means full heat damage', () => {
    const tile = makeTile({ completedProjects: [] });
    const result = calculateAdaptedDamage(tile, 10, 'heat');
    expect(result).toBe(10);
  });

  it('solar grid eliminates ice damage', () => {
    const tile = makeTile({ completedProjects: ['solar_grid'] });
    const result = calculateAdaptedDamage(tile, 10, 'ice');
    expect(result).toBe(0);
  });

  it('no solar grid means full ice damage', () => {
    const tile = makeTile({ completedProjects: [] });
    const result = calculateAdaptedDamage(tile, 10, 'ice');
    expect(result).toBe(10);
  });

  it('storm damage has no adaptation (full damage always)', () => {
    const tile = makeTile({ completedProjects: ['rain_garden', 'greenway', 'solar_grid'] });
    const result = calculateAdaptedDamage(tile, 10, 'storm');
    expect(result).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// applyTippingPointDamageMultiplier
// ---------------------------------------------------------------------------

describe('applyTippingPointDamageMultiplier', () => {
  it('multiplies damage by 1.5x when tipping point 2 is triggered', () => {
    const state = makeState({
      eventCooldowns: { tipping_point_2: 9999 },
    });
    const result = applyTippingPointDamageMultiplier(10, state);
    expect(result).toBe(15);
  });

  it('returns base damage when tipping point 2 is not triggered', () => {
    const state = makeState({
      eventCooldowns: {},
    });
    const result = applyTippingPointDamageMultiplier(10, state);
    expect(result).toBe(10);
  });

  it('returns base damage when tipping point 2 cooldown is 0', () => {
    const state = makeState({
      eventCooldowns: { tipping_point_2: 0 },
    });
    const result = applyTippingPointDamageMultiplier(10, state);
    expect(result).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// generateClimateEvent
// ---------------------------------------------------------------------------

describe('generateClimateEvent', () => {
  it('climate event probability increases with pressure', () => {
    // At low pressure, probability is low so high rng roll returns null
    const lowPressureState = makeState({
      meters: makeMeters({ climatePressure: 10 }),
    });
    // baseProb = 0.05 + 10 * 0.005 = 0.10; max seasonal mult = 3 (summer heat_wave) => 0.30
    // roll of 0.95 > 0.30 => null
    const result1 = generateClimateEvent(lowPressureState, 'summer', () => 0.95);
    expect(result1).toBeNull();

    // At high pressure, probability is high so same roll might succeed
    const highPressureState = makeState({
      meters: makeMeters({ climatePressure: 80 }),
    });
    // baseProb = 0.05 + 80 * 0.005 = 0.45; max seasonal mult = 3 (summer heat_wave) => 1.35 (capped conceptually)
    // roll of 0.5 < 1.35 => event generated
    const result2 = generateClimateEvent(highPressureState, 'summer', () => 0.5);
    expect(result2).not.toBeNull();
  });

  it('summer heat_wave probability is 3x base', () => {
    // Set pressure so base prob = 0.20 (pressure = 30)
    // heat_wave in summer: 0.20 * 3 = 0.60
    // With rng roll of 0.5 < 0.60, event should fire
    const state = makeState({
      meters: makeMeters({ climatePressure: 30 }),
    });
    // Use rng that returns 0.5 for first call (event roll) and 0 for second (type selection)
    let callCount = 0;
    const rng = () => {
      callCount++;
      if (callCount === 1) return 0.5; // event check: 0.5 < 0.60 (heat_wave max)
      return 0.0; // type selection: picks first weighted type
    };
    const result = generateClimateEvent(state, 'summer', rng);
    expect(result).not.toBeNull();
    // In summer, heat_wave has highest weight (3x), so with typeRoll near 0 it should be heat_wave
    expect(result!.type).toBe('heat_wave');
  });

  it('winter ice_storm probability is 2x base', () => {
    // In winter: heat_wave=0, flooding=0.5x, severe_storm=1x, ice_storm=2x
    // With pressure = 30: base = 0.20
    // ice_storm weight = 0.20 * 2 = 0.40
    // Max weight is ice_storm at 0.40
    const state = makeState({
      meters: makeMeters({ climatePressure: 30 }),
    });
    // rng: first call returns something < 0.40 to trigger event
    // second call should select ice_storm (highest weight in winter)
    let callCount = 0;
    const rng = () => {
      callCount++;
      if (callCount === 1) return 0.35; // < 0.40 max (ice_storm)
      // Total weights: flooding=0.10, severe_storm=0.20, ice_storm=0.40 = total 0.70
      // ice_storm starts at cumulative 0.30 (flooding 0.10 + severe_storm 0.20)
      // To select ice_storm, typeRoll needs to be > 0.30/0.70 = 0.43
      return 0.99; // typeRoll = 0.99 * 0.70 = 0.693 > 0.30 => ice_storm
    };
    const result = generateClimateEvent(state, 'winter', rng);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('ice_storm');
  });

  it('returns null when probability roll exceeds threshold', () => {
    const state = makeState({
      meters: makeMeters({ climatePressure: 10 }),
    });
    // baseProb = 0.10; in spring: max is flooding at 2x = 0.20
    // roll of 0.99 > 0.20 => null
    const result = generateClimateEvent(state, 'spring', () => 0.99);
    expect(result).toBeNull();
  });

  it('tipping point 1 increases event probability by 0.10', () => {
    // Without TP1: pressure=10, base=0.10+10*0.008=0.18, summer heat_wave max = 0.18*3 = 0.54
    // With TP1: base=0.28, summer heat_wave max = 0.28*3 = 0.84
    // Roll of 0.7 > 0.54 (no TP1) but < 0.84 (with TP1)
    const stateWithTP1 = makeState({
      meters: makeMeters({ climatePressure: 10 }),
      eventCooldowns: { tipping_point_1: 9999 },
    });
    let callCount = 0;
    const rng = () => {
      callCount++;
      if (callCount === 1) return 0.7;
      return 0.0;
    };
    const result = generateClimateEvent(stateWithTP1, 'summer', rng);
    expect(result).not.toBeNull();

    // Without TP1, same roll fails
    const stateWithoutTP1 = makeState({
      meters: makeMeters({ climatePressure: 10 }),
      eventCooldowns: {},
    });
    const result2 = generateClimateEvent(stateWithoutTP1, 'summer', () => 0.7);
    expect(result2).toBeNull();
  });

  it('generates event with correct structure', () => {
    const state = makeState({
      meters: makeMeters({ climatePressure: 80 }),
    });
    let callCount = 0;
    const rng = () => {
      callCount++;
      if (callCount === 1) return 0.1;
      return 0.5;
    };
    const result = generateClimateEvent(state, 'summer', rng);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('climate');
    expect(result!.choices).toHaveLength(3);
    expect(result!.turnGenerated).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// getAdaptationSummary
// ---------------------------------------------------------------------------

describe('getAdaptationSummary', () => {
  it('correctly aggregates reductions for a tile with all adaptations', () => {
    const tile = makeTile({
      completedProjects: ['rain_garden', 'greenway', 'solar_grid'],
    });
    const summary = getAdaptationSummary(tile);
    expect(summary.floodReduction).toBe(50);
    expect(summary.heatReduction).toBe(40);
    expect(summary.iceReduction).toBe(100);
  });

  it('returns zero reductions for tile with no adaptation projects', () => {
    const tile = makeTile({ completedProjects: [] });
    const summary = getAdaptationSummary(tile);
    expect(summary.floodReduction).toBe(0);
    expect(summary.heatReduction).toBe(0);
    expect(summary.iceReduction).toBe(0);
  });

  it('returns partial reductions for tile with some adaptations', () => {
    const tile = makeTile({ completedProjects: ['rain_garden'] });
    const summary = getAdaptationSummary(tile);
    expect(summary.floodReduction).toBe(50);
    expect(summary.heatReduction).toBe(0);
    expect(summary.iceReduction).toBe(0);
  });
});
