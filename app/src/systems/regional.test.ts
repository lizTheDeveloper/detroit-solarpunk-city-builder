import { describe, it, expect } from 'vitest';
import {
  initializeRegionalCities,
  progressRegionalCities,
  sendBudget,
  sendTemplate,
  sendExpertise,
  checkRelationshipUpgrade,
  initializeContinentalGoals,
  progressContinentalGoals,
  checkWinCondition,
  checkLossCondition,
} from './regional';
import type {
  GameState,
  RegionalCity,
  ContinentalGoal,
  Tile,
} from '../state/types';

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    turn: 1,
    season: 'spring',
    year: 1,
    phase: 'events',
    stage: 'beyond',
    path: null,
    meters: {
      communityTrust: 70,
      ecologicalHealth: 80,
      foodSovereignty: 65,
      politicalWill: 60,
      budget: 5.0,
      climatePressure: 30,
    },
    tiles: {},
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
      nutrientRecycling: 0,
      nuclearEnergy: 0,
      landExpropriation: 0,
      decarceration: 0,
      deGrowth: 0,
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
    maxConcurrentProjects: 4,
    regionalCities: {},
    activeTransfers: [],
    regionalProjects: [],
    continentalGoals: initializeContinentalGoals(),
    winCondition: null,
    lossCondition: null,
    sandbox: false,
    ...overrides,
  } as GameState;
}

function makeTile(overrides: Partial<Tile> = {}): Tile {
  return {
    id: 'test_tile',
    name: 'Test Tile',
    terrain: 'urban-sparse',
    vacancyRate: 0,
    ecologicalHealth: 50,
    contamination: 0,
    gentrificationPressure: 0,
    existingUses: [],
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

describe('initializeRegionalCities', () => {
  it('creates 9 cities', () => {
    const cities = initializeRegionalCities();
    expect(Object.keys(cities)).toHaveLength(9);
  });

  it('creates Ann Arbor with correct starting state', () => {
    const cities = initializeRegionalCities();
    const annArbor = cities['ann_arbor'];
    expect(annArbor.name).toBe('Ann Arbor');
    expect(annArbor.stage).toBe('transition');
    expect(annArbor.meters.ecologicalHealth).toBe(45);
    expect(annArbor.meters.foodSovereignty).toBe(30);
    expect(annArbor.meters.communityTrust).toBe(55);
    expect(annArbor.relationship).toBe('cooperative');
  });

  it('creates Flint with correct starting state', () => {
    const cities = initializeRegionalCities();
    const flint = cities['flint'];
    expect(flint.name).toBe('Flint');
    expect(flint.stage).toBe('awakening');
    expect(flint.meters.ecologicalHealth).toBe(15);
    expect(flint.meters.foodSovereignty).toBe(10);
    expect(flint.meters.communityTrust).toBe(25);
    expect(flint.relationship).toBe('neutral');
  });

  it('creates Chicago with correct starting state', () => {
    const cities = initializeRegionalCities();
    const chicago = cities['chicago'];
    expect(chicago.name).toBe('Chicago');
    expect(chicago.stage).toBe('transition');
    expect(chicago.meters.ecologicalHealth).toBe(35);
    expect(chicago.meters.foodSovereignty).toBe(25);
    expect(chicago.meters.communityTrust).toBe(30);
    expect(chicago.relationship).toBe('neutral');
  });

  it('all cities start with 0 transfers and no templates', () => {
    const cities = initializeRegionalCities();
    for (const city of Object.values(cities)) {
      expect(city.transfersReceived).toBe(0);
      expect(city.templatesReceived).toEqual([]);
      expect(city.regionalProjectsCompleted).toBe(0);
    }
  });
});

describe('progressRegionalCities', () => {
  it('increases meters at base rate for awakening cities', () => {
    const cities: Record<string, RegionalCity> = {
      flint: {
        id: 'flint',
        name: 'Flint',
        population: 95000,
        stage: 'awakening',
        meters: { ecologicalHealth: 15, foodSovereignty: 10, communityTrust: 25 },
        relationship: 'neutral',
        transfersReceived: 0,
        templatesReceived: [],
        regionalProjectsCompleted: 0,
        meterImprovementSinceUnlock: 0,
      },
    };

    const result = progressRegionalCities(cities, 50, () => 0.5);
    expect(result['flint'].meters.ecologicalHealth).toBe(16); // +1.0
    expect(result['flint'].meters.foodSovereignty).toBeCloseTo(10.6); // +0.6
    expect(result['flint'].meters.communityTrust).toBeCloseTo(25.8); // +0.8
  });

  it('increases meters at 1.5x rate for transition cities', () => {
    const cities: Record<string, RegionalCity> = {
      ann_arbor: {
        id: 'ann_arbor',
        name: 'Ann Arbor',
        population: 125000,
        stage: 'transition',
        meters: { ecologicalHealth: 45, foodSovereignty: 30, communityTrust: 55 },
        relationship: 'cooperative',
        transfersReceived: 0,
        templatesReceived: [],
        regionalProjectsCompleted: 0,
        meterImprovementSinceUnlock: 0,
      },
    };

    const result = progressRegionalCities(cities, 50, () => 0.5);
    expect(result['ann_arbor'].meters.ecologicalHealth).toBe(46.5); // +1.5
    expect(result['ann_arbor'].meters.foodSovereignty).toBeCloseTo(30.9); // +0.9
    expect(result['ann_arbor'].meters.communityTrust).toBeCloseTo(56.2); // +1.2
  });

  it('increases meters at 2x rate for restoration cities', () => {
    const cities: Record<string, RegionalCity> = {
      test_city: {
        id: 'test_city',
        name: 'Test City',
        population: 100000,
        stage: 'restoration',
        meters: { ecologicalHealth: 60, foodSovereignty: 45, communityTrust: 55 },
        relationship: 'neutral',
        transfersReceived: 0,
        templatesReceived: [],
        regionalProjectsCompleted: 0,
        meterImprovementSinceUnlock: 0,
      },
    };

    const result = progressRegionalCities(cities, 50, () => 0.5);
    expect(result['test_city'].meters.ecologicalHealth).toBe(62); // +2.0
    expect(result['test_city'].meters.foodSovereignty).toBeCloseTo(46.2); // +1.2
    expect(result['test_city'].meters.communityTrust).toBeCloseTo(56.6); // +1.6
  });

  it('applies climate catastrophe to awakening cities when pressure > 85%', () => {
    const cities: Record<string, RegionalCity> = {
      flint: {
        id: 'flint',
        name: 'Flint',
        population: 95000,
        stage: 'awakening',
        meters: { ecologicalHealth: 30, foodSovereignty: 20, communityTrust: 35 },
        relationship: 'neutral',
        transfersReceived: 0,
        templatesReceived: [],
        regionalProjectsCompleted: 0,
        meterImprovementSinceUnlock: 0,
      },
    };

    // rng returns 0.1 which is < 0.15, so catastrophe triggers
    const result = progressRegionalCities(cities, 90, () => 0.1);
    expect(result['flint'].meters.ecologicalHealth).toBe(11); // 30 + 1 - 20
    expect(result['flint'].meters.communityTrust).toBeCloseTo(25.8); // 35 + 0.8 - 10
  });

  it('does not apply climate catastrophe when rng roll >= 0.15', () => {
    const cities: Record<string, RegionalCity> = {
      flint: {
        id: 'flint',
        name: 'Flint',
        population: 95000,
        stage: 'awakening',
        meters: { ecologicalHealth: 30, foodSovereignty: 20, communityTrust: 35 },
        relationship: 'neutral',
        transfersReceived: 0,
        templatesReceived: [],
        regionalProjectsCompleted: 0,
        meterImprovementSinceUnlock: 0,
      },
    };

    // rng returns 0.5 which is >= 0.15, so no catastrophe
    const result = progressRegionalCities(cities, 90, () => 0.5);
    expect(result['flint'].meters.ecologicalHealth).toBe(31); // 30 + 1, no catastrophe
  });

  it('does not apply climate catastrophe to transition cities', () => {
    const cities: Record<string, RegionalCity> = {
      test: {
        id: 'test',
        name: 'Test',
        population: 100000,
        stage: 'transition',
        meters: { ecologicalHealth: 40, foodSovereignty: 30, communityTrust: 50 },
        relationship: 'neutral',
        transfersReceived: 0,
        templatesReceived: [],
        regionalProjectsCompleted: 0,
        meterImprovementSinceUnlock: 0,
      },
    };

    const result = progressRegionalCities(cities, 90, () => 0.0);
    expect(result['test'].meters.ecologicalHealth).toBe(41.5); // +1.5, no catastrophe
  });

  it('triggers stage transition when thresholds met', () => {
    const cities: Record<string, RegionalCity> = {
      test: {
        id: 'test',
        name: 'Test',
        population: 100000,
        stage: 'awakening',
        meters: { ecologicalHealth: 34.5, foodSovereignty: 20, communityTrust: 40 },
        relationship: 'neutral',
        transfersReceived: 0,
        templatesReceived: [],
        regionalProjectsCompleted: 0,
        meterImprovementSinceUnlock: 0,
      },
    };

    // After +1.0 eco, the city will have 35.5 eco, meeting the 35 threshold
    const result = progressRegionalCities(cities, 50, () => 0.5);
    expect(result['test'].stage).toBe('transition');
  });

  it('clamps meters to 0 minimum', () => {
    const cities: Record<string, RegionalCity> = {
      test: {
        id: 'test',
        name: 'Test',
        population: 100000,
        stage: 'awakening',
        meters: { ecologicalHealth: 5, foodSovereignty: 5, communityTrust: 5 },
        relationship: 'neutral',
        transfersReceived: 0,
        templatesReceived: [],
        regionalProjectsCompleted: 0,
        meterImprovementSinceUnlock: 0,
      },
    };

    // Climate catastrophe: eco goes 5 + 1 - 20 = -14, should be clamped to 0
    const result = progressRegionalCities(cities, 90, () => 0.0);
    expect(result['test'].meters.ecologicalHealth).toBe(0);
    expect(result['test'].meters.communityTrust).toBe(0); // 5 + 0.8 - 10 = -4.2 -> 0
  });
});

describe('sendBudget', () => {
  it('deducts budget and boosts lowest meter', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
    });

    const result = sendBudget(state, 'flint', 'small');
    // Flint's lowest meter is foodSovereignty (10)
    expect(result.regionalCities['flint'].meters.foodSovereignty).toBe(15); // 10 + 5
    expect(result.meters.budget).toBeCloseTo(4.8); // 5.0 - 0.2
  });

  it('grants +2% political will per transfer', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
    });

    const result = sendBudget(state, 'flint', 'small');
    expect(result.meters.politicalWill).toBe(62); // 60 + 2
  });

  it('applies medium boost correctly', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
    });

    const result = sendBudget(state, 'flint', 'medium');
    expect(result.regionalCities['flint'].meters.foodSovereignty).toBe(20); // 10 + 10
    expect(result.meters.budget).toBeCloseTo(4.5); // 5.0 - 0.5
  });

  it('applies large boost correctly', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
    });

    const result = sendBudget(state, 'flint', 'large');
    expect(result.regionalCities['flint'].meters.foodSovereignty).toBe(30); // 10 + 20
    expect(result.meters.budget).toBeCloseTo(4.0); // 5.0 - 1.0
  });

  it('blocks transfer when budget is insufficient', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
      meters: {
        communityTrust: 70,
        ecologicalHealth: 80,
        foodSovereignty: 65,
        politicalWill: 60,
        budget: 0.1,
        climatePressure: 30,
      },
    });

    const result = sendBudget(state, 'flint', 'large');
    expect(result.meters.budget).toBe(0.1); // unchanged
  });

  it('blocks transfer when max 2 per turn reached', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
      activeTransfers: [
        { type: 'budget', targetCityId: 'flint', amount: 0.2 },
        { type: 'budget', targetCityId: 'toledo', amount: 0.5 },
      ],
    });

    const result = sendBudget(state, 'cleveland', 'small');
    // Should be unchanged
    expect(result.activeTransfers).toHaveLength(2);
  });

  it('increments transfersReceived on target city', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
    });

    const result = sendBudget(state, 'flint', 'small');
    expect(result.regionalCities['flint'].transfersReceived).toBe(1);
  });
});

describe('sendTemplate', () => {
  it('sends template and deducts $100K', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
    });

    const result = sendTemplate(state, 'flint', 'food_forest');
    expect(result.regionalCities['flint'].templatesReceived).toContain('food_forest');
    expect(result.meters.budget).toBeCloseTo(4.9); // 5.0 - 0.1
  });

  it('blocks duplicate template to same city', () => {
    const cities = initializeRegionalCities();
    cities['flint'].templatesReceived = ['food_forest'];
    const state = makeMinimalState({ regionalCities: cities });

    const result = sendTemplate(state, 'flint', 'food_forest');
    expect(result.meters.budget).toBe(5.0); // unchanged
  });

  it('allows same template to different cities', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
    });

    const result1 = sendTemplate(state, 'flint', 'food_forest');
    const result2 = sendTemplate(result1, 'toledo', 'food_forest');
    expect(result2.regionalCities['flint'].templatesReceived).toContain('food_forest');
    expect(result2.regionalCities['toledo'].templatesReceived).toContain('food_forest');
  });

  it('increments transfersReceived', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
    });

    const result = sendTemplate(state, 'toledo', 'rain_garden');
    expect(result.regionalCities['toledo'].transfersReceived).toBe(1);
  });
});

describe('sendExpertise', () => {
  it('reduces maxConcurrentProjects by 1', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
    });

    const result = sendExpertise(state, 'flint');
    expect(result.maxConcurrentProjects).toBe(3); // 4 - 1
  });

  it('adds expertise transfer with 4 turns remaining', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
    });

    const result = sendExpertise(state, 'flint');
    const expertiseTransfer = result.activeTransfers.find(
      (t) => t.type === 'expertise' && t.targetCityId === 'flint',
    );
    expect(expertiseTransfer).toBeDefined();
    expect(expertiseTransfer!.turnsRemaining).toBe(4);
  });

  it('blocks when maxConcurrentProjects is 1', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
      maxConcurrentProjects: 1,
    });

    const result = sendExpertise(state, 'flint');
    expect(result.maxConcurrentProjects).toBe(1); // unchanged
  });

  it('increments transfersReceived on target city', () => {
    const state = makeMinimalState({
      regionalCities: initializeRegionalCities(),
    });

    const result = sendExpertise(state, 'toledo');
    expect(result.regionalCities['toledo'].transfersReceived).toBe(1);
  });
});

describe('checkRelationshipUpgrade', () => {
  it('upgrades neutral to cooperative with 3+ transfers and 10+ improvement', () => {
    const city: RegionalCity = {
      id: 'test',
      name: 'Test',
      population: 100000,
      stage: 'awakening',
      meters: { ecologicalHealth: 30, foodSovereignty: 20, communityTrust: 40 },
      relationship: 'neutral',
      transfersReceived: 3,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 10,
    };

    expect(checkRelationshipUpgrade(city)).toBe('cooperative');
  });

  it('does not upgrade with insufficient transfers', () => {
    const city: RegionalCity = {
      id: 'test',
      name: 'Test',
      population: 100000,
      stage: 'awakening',
      meters: { ecologicalHealth: 30, foodSovereignty: 20, communityTrust: 40 },
      relationship: 'neutral',
      transfersReceived: 2,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 15,
    };

    expect(checkRelationshipUpgrade(city)).toBe('neutral');
  });

  it('does not upgrade with insufficient meter improvement', () => {
    const city: RegionalCity = {
      id: 'test',
      name: 'Test',
      population: 100000,
      stage: 'awakening',
      meters: { ecologicalHealth: 30, foodSovereignty: 20, communityTrust: 40 },
      relationship: 'neutral',
      transfersReceived: 5,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 5,
    };

    expect(checkRelationshipUpgrade(city)).toBe('neutral');
  });

  it('upgrades cooperative to allied with 2+ regional projects and transition stage', () => {
    const city: RegionalCity = {
      id: 'test',
      name: 'Test',
      population: 100000,
      stage: 'transition',
      meters: { ecologicalHealth: 40, foodSovereignty: 30, communityTrust: 50 },
      relationship: 'cooperative',
      transfersReceived: 5,
      templatesReceived: [],
      regionalProjectsCompleted: 2,
      meterImprovementSinceUnlock: 20,
    };

    expect(checkRelationshipUpgrade(city)).toBe('allied');
  });

  it('does not upgrade cooperative if stage is awakening', () => {
    const city: RegionalCity = {
      id: 'test',
      name: 'Test',
      population: 100000,
      stage: 'awakening',
      meters: { ecologicalHealth: 30, foodSovereignty: 20, communityTrust: 40 },
      relationship: 'cooperative',
      transfersReceived: 5,
      templatesReceived: [],
      regionalProjectsCompleted: 3,
      meterImprovementSinceUnlock: 20,
    };

    expect(checkRelationshipUpgrade(city)).toBe('cooperative');
  });
});

describe('initializeContinentalGoals', () => {
  it('creates 4 goals', () => {
    const goals = initializeContinentalGoals();
    expect(goals).toHaveLength(4);
  });

  it('all goals start at 0 progress', () => {
    const goals = initializeContinentalGoals();
    for (const goal of goals) {
      expect(goal.progress).toBe(0);
    }
  });

  it('contains all expected goal IDs', () => {
    const goals = initializeContinentalGoals();
    const ids = goals.map((g) => g.id);
    expect(ids).toContain('watershed_restoration');
    expect(ids).toContain('wildlife_corridor');
    expect(ids).toContain('food_sovereignty_network');
    expect(ids).toContain('buffalo_commons');
  });
});

describe('progressContinentalGoals', () => {
  it('advances watershed goal for restoration cities with high eco', () => {
    const cities = initializeRegionalCities();
    cities['ann_arbor'].stage = 'restoration';
    cities['ann_arbor'].meters.ecologicalHealth = 75;

    const state = makeMinimalState({ regionalCities: cities });
    const result = progressContinentalGoals(state);
    const watershed = result.find((g) => g.id === 'watershed_restoration')!;
    expect(watershed.progress).toBe(1); // 1 city at restoration w/ eco > 70
  });

  it('advances watershed goal for Detroit water tiles at restoration', () => {
    const cities = initializeRegionalCities();
    const tiles: Record<string, Tile> = {
      water1: makeTile({ id: 'water1', terrain: 'water', visualStage: 'restoration' }),
      water2: makeTile({ id: 'water2', terrain: 'water', visualStage: 'restoration' }),
    };

    const state = makeMinimalState({ regionalCities: cities, tiles });
    const result = progressContinentalGoals(state);
    const watershed = result.find((g) => g.id === 'watershed_restoration')!;
    expect(watershed.progress).toBe(1); // 2 * 0.5 = 1
  });

  it('advances wildlife corridor for allied cities', () => {
    const cities = initializeRegionalCities();
    cities['ann_arbor'].relationship = 'allied';
    cities['windsor'].relationship = 'allied';

    const state = makeMinimalState({ regionalCities: cities });
    const result = progressContinentalGoals(state);
    const wildlife = result.find((g) => g.id === 'wildlife_corridor')!;
    expect(wildlife.progress).toBe(2); // 2 allied cities * 1
  });

  it('advances food sovereignty network for cities with food > 50', () => {
    const cities = initializeRegionalCities();
    cities['ann_arbor'].meters.foodSovereignty = 55;
    cities['windsor'].meters.foodSovereignty = 60;

    const state = makeMinimalState({ regionalCities: cities });
    const result = progressContinentalGoals(state);
    const food = result.find((g) => g.id === 'food_sovereignty_network')!;
    expect(food.progress).toBe(2); // 2 cities with food > 50
  });

  it('advances buffalo commons based on allied cities and other goals', () => {
    const cities = initializeRegionalCities();
    cities['ann_arbor'].relationship = 'allied';

    const goals = initializeContinentalGoals();
    goals[0].progress = 55; // watershed above 50

    const state = makeMinimalState({ regionalCities: cities, continentalGoals: goals });
    const result = progressContinentalGoals(state);
    const buffalo = result.find((g) => g.id === 'buffalo_commons')!;
    expect(buffalo.progress).toBe(2); // 1 allied + 1 goal at 50+
  });
});

describe('checkWinCondition', () => {
  it('returns cooperative when 2+ goals are at 75%', () => {
    const goals: ContinentalGoal[] = [
      { id: 'watershed_restoration', name: 'W', progress: 80, description: '' },
      { id: 'wildlife_corridor', name: 'X', progress: 75, description: '' },
      { id: 'food_sovereignty_network', name: 'Y', progress: 30, description: '' },
      { id: 'buffalo_commons', name: 'Z', progress: 10, description: '' },
    ];

    const state = makeMinimalState({ continentalGoals: goals });
    expect(checkWinCondition(state)).toBe('cooperative');
  });

  it('returns survival when turn >= 80 and all meters > 50', () => {
    const state = makeMinimalState({
      turn: 80,
      meters: {
        communityTrust: 60,
        ecologicalHealth: 60,
        foodSovereignty: 60,
        politicalWill: 60,
        budget: 60,
        climatePressure: 30,
      },
    });

    expect(checkWinCondition(state)).toBe('survival');
  });

  it('returns null when no win condition met', () => {
    const state = makeMinimalState({ turn: 50 });
    expect(checkWinCondition(state)).toBeNull();
  });

  it('returns null for survival when a meter is <= 50', () => {
    const state = makeMinimalState({
      turn: 80,
      meters: {
        communityTrust: 60,
        ecologicalHealth: 60,
        foodSovereignty: 40, // below 50
        politicalWill: 60,
        budget: 60,
        climatePressure: 30,
      },
    });

    expect(checkWinCondition(state)).toBeNull();
  });

  it('cooperative win takes priority over survival', () => {
    const goals: ContinentalGoal[] = [
      { id: 'watershed_restoration', name: 'W', progress: 80, description: '' },
      { id: 'wildlife_corridor', name: 'X', progress: 90, description: '' },
      { id: 'food_sovereignty_network', name: 'Y', progress: 30, description: '' },
      { id: 'buffalo_commons', name: 'Z', progress: 10, description: '' },
    ];

    const state = makeMinimalState({
      turn: 80,
      continentalGoals: goals,
      meters: {
        communityTrust: 60,
        ecologicalHealth: 60,
        foodSovereignty: 60,
        politicalWill: 60,
        budget: 60,
        climatePressure: 30,
      },
    });

    expect(checkWinCondition(state)).toBe('cooperative');
  });
});

describe('checkLossCondition', () => {
  it('returns budget_collapse when budget <= 0', () => {
    const state = makeMinimalState({
      meters: {
        communityTrust: 60,
        ecologicalHealth: 60,
        foodSovereignty: 60,
        politicalWill: 60,
        budget: 0,
        climatePressure: 30,
      },
    });

    expect(checkLossCondition(state)).toBe('budget_collapse');
  });

  it('returns climate_catastrophe when pressure >= 100 and fewer than 5 healthy tiles', () => {
    const tiles: Record<string, Tile> = {
      t1: makeTile({ id: 't1', ecologicalHealth: 70 }),
      t2: makeTile({ id: 't2', ecologicalHealth: 65 }),
      t3: makeTile({ id: 't3', ecologicalHealth: 30 }),
      t4: makeTile({ id: 't4', ecologicalHealth: 20 }),
    };

    const state = makeMinimalState({
      tiles,
      meters: {
        communityTrust: 60,
        ecologicalHealth: 60,
        foodSovereignty: 60,
        politicalWill: 60,
        budget: 3.0,
        climatePressure: 100,
      },
    });

    expect(checkLossCondition(state)).toBe('climate_catastrophe');
  });

  it('returns null when climate pressure is high but enough healthy tiles exist', () => {
    const tiles: Record<string, Tile> = {};
    for (let i = 0; i < 6; i++) {
      tiles[`t${i}`] = makeTile({ id: `t${i}`, ecologicalHealth: 70 });
    }

    const state = makeMinimalState({
      tiles,
      meters: {
        communityTrust: 60,
        ecologicalHealth: 60,
        foodSovereignty: 60,
        politicalWill: 60,
        budget: 3.0,
        climatePressure: 100,
      },
    });

    expect(checkLossCondition(state)).toBeNull();
  });

  it('returns null when no loss condition met', () => {
    const state = makeMinimalState();
    expect(checkLossCondition(state)).toBeNull();
  });
});
