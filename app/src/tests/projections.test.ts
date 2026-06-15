import { describe, it, expect } from 'vitest';
import { calculateProjections } from '../systems/projections';
import type { GameState, Meters } from '../state/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMeters(overrides: Partial<Meters> = {}): Meters {
  return {
    communityTrust: 50,
    ecologicalHealth: 30,
    foodSovereignty: 10,
    politicalWill: 40,
    budget: 5.0,
    climatePressure: 30,
    ...overrides,
  };
}

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    turn: 10,
    month: 4,
    season: 'spring',
    year: 1,
    phase: 'resolve',
    stage: 'awakening',
    path: null,
    meters: makeMeters(),
    tiles: {},
    leaders: {},
    councilMembers: {},
    antagonists: {},
    activeProposals: [],
    pendingProposals: [],
    activePolicies: [],
    publicOpinion: {
      foodSovereignty: 30,
      waterCommons: 30,
      landReform: 30,
      ecologicalRestoration: 30,
      cooperativeEconomics: 30,
      nutrientRecycling: 10,
      nuclearEnergy: 10,
      landExpropriation: 10,
      decarceration: 10,
      deGrowth: 10,
    },
    coalitions: [],
    eventQueue: [],
    eventCooldowns: {},
    councilVoteHistory: [],
    turnSummary: null,
    turnHistory: [],
    maxConcurrentProjects: 3,
    regionalCities: {},
    activeTransfers: [],
    regionalProjects: [],
    continentalGoals: [],
    winCondition: null,
    lossCondition: null,
    sandbox: false,
    dependencyWeb: { conditions: [], capacities: {} },
    delayedConsequenceQueue: [],
    activeArcs: [],
    resolvedArcs: [],
    tutorialState: { active: false, completedSteps: [], dismissedTooltips: [] },
    advisorState: { dismissedConditions: [], cooldowns: {} },
    calendarState: {
      totalSlots: 60, fixedSlots: 38, discretionarySlots: 22, slotsSpent: 0,
      overscheduleAmount: 0, overscheduleLimit: 5, burnoutBuffer: 15, burnoutBufferMax: 20,
      burnoutState: 'sustainable', interactionsThisMonth: {}, lastInteractionMonth: {},
      monthNumber: 1, delegationTier: 0, crisisSlotTax: 0, neighborhoodTimeAllocation: {},
      consecutiveRecoveryMonths: 0,
      leaderTrustGrantedThisMonth: {},
    },
    strategicContacts: [],
    mentors: [],
    mapState: { selectedBlockId: null, viewState: { longitude: -83.0458, latitude: 42.3314, zoom: 12 } },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateProjections', () => {
  describe('basic regen projection', () => {
    it('will climbs with trust bonus when trust > 40', () => {
      // Trust 50 → will regen = 1.0 + (50-40)*0.033 = 1.33/turn
      const state = makeMinimalState({
        meters: makeMeters({ communityTrust: 50, politicalWill: 40 }),
      });
      const result = calculateProjections(state);

      expect(result.turns).toHaveLength(12);
      // After 1 turn, will should be approx 40 + 1.33 = 41.33
      expect(result.meters.politicalWill[0]).toBeGreaterThan(41);
      // After 12 turns, will should climb substantially
      expect(result.meters.politicalWill[11]).toBeGreaterThan(50);
    });

    it('will gets recovery boost when critically low', () => {
      const state = makeMinimalState({
        meters: makeMeters({ communityTrust: 50, politicalWill: 5 }),
      });
      const result = calculateProjections(state);

      // Will should recover faster when < 15 due to recovery boost
      // First turn: regen = 1.33 + (15-5)*0.1 = 2.33
      expect(result.meters.politicalWill[0]).toBeCloseTo(7.33, 1);
    });

    it('trust decays each turn', () => {
      const state = makeMinimalState({
        meters: makeMeters({ communityTrust: 50, foodSovereignty: 0 }),
      });
      const result = calculateProjections(state);

      // Trust decay at 50: -(0.1 + 50*0.004) = -0.3/turn (no food bonus since food < 20)
      expect(result.meters.communityTrust[0]).toBeLessThan(50);
      expect(result.meters.communityTrust[0]).toBeCloseTo(49.7, 1);
    });

    it('eco decays at -0.05/turn', () => {
      const state = makeMinimalState({
        meters: makeMeters({ ecologicalHealth: 30 }),
      });
      const result = calculateProjections(state);

      expect(result.meters.ecologicalHealth[0]).toBeCloseTo(29.95, 1);
      expect(result.meters.ecologicalHealth[11]).toBeCloseTo(30 - 0.05 * 12, 0);
    });
  });

  describe('project completion effects', () => {
    it('applies project effects at correct turn', () => {
      // food_forest: tileEco 12, foodSov 8, trust 2, duration 9
      // Place a project at progress=6 with duration=9 → completes in 3 turns
      const state = makeMinimalState({
        tiles: {
          tile1: {
            id: 'tile1',
            name: 'Test Tile',
            terrain: 'vacant',
            vacancyRate: 80,
            ecologicalHealth: 5,
            contamination: 0,
            gentrificationPressure: 0,
            existingUses: ['vacant_lot'],
            neighborhoodTraits: [],
            activeProjects: [
              {
                definitionId: 'food_forest',
                tileId: 'tile1',
                mode: 'player-initiated',
                progress: 6,
                duration: 9,
                cost: 0.10,
              },
            ],
            completedProjects: [],
            communityPowerTokens: 0,
            communityOwned: false,
            adjacentTileIds: [],
            visualStage: 'dystopia',
            consumedByproducts: [],
            vacantLots: 5,
            reclaimedLots: 0,
          },
        },
      });

      const result = calculateProjections(state);

      // Project completes at turn 3 (progress=6, duration=9, remaining=3)
      const completionEvent = result.events.find(
        (e) => e.type === 'project' && e.label === 'Food Forest'
      );
      expect(completionEvent).toBeDefined();
      expect(completionEvent!.turn).toBe(state.turn + 3);

      // foodSov should jump at turn 3 (index 2)
      // Before completion (index 1): only decay happens to foodSov (stays ~10)
      // After completion (index 2): +8 foodSov from food_forest
      expect(result.meters.foodSovereignty[2]).toBeGreaterThan(result.meters.foodSovereignty[1] + 5);
    });

    it('applies eco as global contribution (tileEco * 0.25)', () => {
      // rain_garden: tileEco 8, completes quickly
      const state = makeMinimalState({
        meters: makeMeters({ ecologicalHealth: 30 }),
        tiles: {
          tile1: {
            id: 'tile1',
            name: 'Test Tile',
            terrain: 'vacant',
            vacancyRate: 80,
            ecologicalHealth: 5,
            contamination: 0,
            gentrificationPressure: 0,
            existingUses: ['vacant_lot'],
            neighborhoodTraits: [],
            activeProjects: [
              {
                definitionId: 'rain_garden',
                tileId: 'tile1',
                mode: 'player-initiated',
                progress: 5,
                duration: 6,
                cost: 0.14,
              },
            ],
            completedProjects: [],
            communityPowerTokens: 0,
            communityOwned: false,
            adjacentTileIds: [],
            visualStage: 'dystopia',
            consumedByproducts: [],
            vacantLots: 5,
            reclaimedLots: 0,
          },
        },
      });

      const result = calculateProjections(state);

      // rain_garden tileEco=8, global contribution = 8*0.25 = 2.0
      // Completes at turn 1 (progress=5, duration=6, remaining=1)
      // After turn 1: 30 - 0.05 (decay) + 2.0 (project) = 31.95
      expect(result.meters.ecologicalHealth[0]).toBeCloseTo(31.95, 1);
    });
  });

  describe('delayed consequence effects', () => {
    it('applies foreshadowed consequence drain at correct turn', () => {
      const state = makeMinimalState({
        turn: 10,
        meters: makeMeters({ communityTrust: 60 }),
        delayedConsequenceQueue: [
          {
            id: 'dc1',
            arcId: 'water_crisis',
            triggerTurn: 15,
            activationConditions: [],
            cancelConditions: [],
            effects: [
              { type: 'meterDelta', meter: 'communityTrust', amount: -10 },
            ],
            foreshadowHint: 'Water infrastructure failing',
            hintTurnsBeforeTrigger: 6, // hint at turn 9, visible now (turn 10)
          },
        ],
      });

      const result = calculateProjections(state);

      // Consequence fires at turn 15 = state.turn + 5 → index 4
      const consequenceEvent = result.events.find(
        (e) => e.type === 'consequence'
      );
      expect(consequenceEvent).toBeDefined();
      expect(consequenceEvent!.turn).toBe(15);
      expect(consequenceEvent!.label).toBe('Water infrastructure failing');

      // Trust should drop sharply at index 4 compared to index 3
      const dropAtConsequence = result.meters.communityTrust[3] - result.meters.communityTrust[4];
      // Should be approximately 10 (minus the normal decay which is small)
      expect(dropAtConsequence).toBeGreaterThan(9);
    });

    it('does not show consequence that is not yet foreshadowed', () => {
      const state = makeMinimalState({
        turn: 5,
        delayedConsequenceQueue: [
          {
            id: 'dc_hidden',
            arcId: 'hidden_arc',
            triggerTurn: 20,
            activationConditions: [],
            cancelConditions: [],
            effects: [
              { type: 'meterDelta', meter: 'politicalWill', amount: -15 },
            ],
            foreshadowHint: 'Hidden crisis',
            hintTurnsBeforeTrigger: 3, // hint at turn 17, not yet visible at turn 5
          },
        ],
      });

      const result = calculateProjections(state);

      const consequenceEvent = result.events.find(
        (e) => e.type === 'consequence'
      );
      expect(consequenceEvent).toBeUndefined();
    });
  });

  describe('budget projection with maintenance', () => {
    it('drains budget from existing completed project maintenance', () => {
      // solar_grid maintenance = 0.03/quarter → 0.03/3 = 0.01/turn
      const state = makeMinimalState({
        meters: makeMeters({ budget: 5.0 }),
        tiles: {
          tile1: {
            id: 'tile1',
            name: 'Test Tile',
            terrain: 'vacant',
            vacancyRate: 0,
            ecologicalHealth: 50,
            contamination: 0,
            gentrificationPressure: 0,
            existingUses: ['vacant_lot'],
            neighborhoodTraits: [],
            activeProjects: [],
            completedProjects: ['solar_grid'],
            communityPowerTokens: 0,
            communityOwned: false,
            adjacentTileIds: [],
            visualStage: 'transition',
            consumedByproducts: [],
            vacantLots: 0,
            reclaimedLots: 0,
          },
        },
      });

      const result = calculateProjections(state);

      // solar_grid maintenance: 0.03/3 = 0.01/turn
      // After 12 turns, budget should decrease by 0.01*12 = 0.12
      // Budget starts at 5.0, minus 0.12 maintenance over 12 turns
      expect(result.meters.budget[11]).toBeLessThan(5.0);
      // Each turn loses 0.01 to maintenance
      const perTurnDrain = result.meters.budget[0] - result.meters.budget[1];
      expect(perTurnDrain).toBeCloseTo(0.01, 2);
    });

    it('adds maintenance for newly completed projects', () => {
      // maker_space: maintenance=0.015, duration=9
      // After completion, maintenance should apply to subsequent turns
      const state = makeMinimalState({
        meters: makeMeters({ budget: 5.0 }),
        tiles: {
          tile1: {
            id: 'tile1',
            name: 'Test Tile',
            terrain: 'vacant',
            vacancyRate: 0,
            ecologicalHealth: 50,
            contamination: 0,
            gentrificationPressure: 0,
            existingUses: ['vacant_lot'],
            neighborhoodTraits: [],
            activeProjects: [
              {
                definitionId: 'maker_space',
                tileId: 'tile1',
                mode: 'player-initiated',
                progress: 7,
                duration: 9,
                cost: 0.15,
              },
            ],
            completedProjects: [],
            communityPowerTokens: 0,
            communityOwned: false,
            adjacentTileIds: [],
            visualStage: 'transition',
            consumedByproducts: [],
            vacantLots: 0,
            reclaimedLots: 0,
          },
        },
      });

      const result = calculateProjections(state);

      // maker_space completes at turn 2 (remaining=9-7=2)
      // Before completion: no maintenance. After: 0.015/3 = 0.005/turn
      // The budget drop between turns 2→3 should include the new maintenance
      const dropBeforeCompletion = result.meters.budget[0] - result.meters.budget[1];
      const dropAfterCompletion = result.meters.budget[2] - result.meters.budget[3];
      // After completion, maintenance should kick in (0.005 more per turn)
      expect(dropAfterCompletion).toBeGreaterThan(dropBeforeCompletion + 0.003);
    });
  });

  describe('meter clamping', () => {
    it('clamps trust to 0 when decay would go negative', () => {
      const state = makeMinimalState({
        meters: makeMeters({ communityTrust: 0.05, foodSovereignty: 0 }),
      });
      const result = calculateProjections(state);

      // Trust at 0.05 decays by -(0.1 + 0.05*0.004) = -0.1002 → goes negative → clamps to 0
      expect(result.meters.communityTrust[0]).toBe(0);
    });

    it('clamps will to 100 when regen would exceed', () => {
      const state = makeMinimalState({
        meters: makeMeters({ communityTrust: 100, politicalWill: 99 }),
      });
      const result = calculateProjections(state);

      // Will regen at trust 100: 1.0 + (100-40)*0.033 = 2.98
      // 99 + 2.98 = 101.98 → clamps to 100
      expect(result.meters.politicalWill[0]).toBe(100);
    });

    it('clamps eco to 0 after prolonged decay', () => {
      const state = makeMinimalState({
        meters: makeMeters({ ecologicalHealth: 0.01 }),
      });
      const result = calculateProjections(state);

      // 0.01 - 0.05 = -0.04 → clamps to 0
      expect(result.meters.ecologicalHealth[0]).toBe(0);
      // Stays at 0
      expect(result.meters.ecologicalHealth[5]).toBe(0);
    });

    it('budget clamps to 0, not negative', () => {
      const state = makeMinimalState({
        meters: makeMeters({ budget: 0.005 }),
        tiles: {
          tile1: {
            id: 'tile1',
            name: 'Test Tile',
            terrain: 'vacant',
            vacancyRate: 0,
            ecologicalHealth: 50,
            contamination: 0,
            gentrificationPressure: 0,
            existingUses: ['vacant_lot'],
            neighborhoodTraits: [],
            activeProjects: [],
            completedProjects: ['solar_grid'], // maintenance = 0.01/turn
            communityPowerTokens: 0,
            communityOwned: false,
            adjacentTileIds: [],
            visualStage: 'transition',
            consumedByproducts: [],
            vacantLots: 0,
            reclaimedLots: 0,
          },
        },
      });
      const result = calculateProjections(state);

      // Budget 0.005 - 0.01 maintenance = -0.005 → clamps to 0
      expect(result.meters.budget[0]).toBe(0);
    });

    it('climatePressure stays clamped within 0-100', () => {
      const state = makeMinimalState({
        meters: makeMeters({ climatePressure: 99.99 }),
      });
      const result = calculateProjections(state);

      // climatePressure just sits at whatever it is (projection doesn't add climate tick)
      // But clamping ensures it never exceeds 100
      for (const val of result.meters.climatePressure) {
        expect(val).toBeLessThanOrEqual(100);
        expect(val).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('election turn event', () => {
    it('marks election at turn 48 if within projection window', () => {
      const state = makeMinimalState({ turn: 40 });
      const result = calculateProjections(state);

      // Projection covers turns 41-52, so turn 48 is included
      const electionEvent = result.events.find((e) => e.type === 'election');
      expect(electionEvent).toBeDefined();
      expect(electionEvent!.turn).toBe(48);
      expect(electionEvent!.label).toBe('Election');
    });

    it('does not mark election if beyond projection window', () => {
      const state = makeMinimalState({ turn: 10 });
      const result = calculateProjections(state);

      // Projection covers turns 11-22, so turn 48 is not included
      const electionEvent = result.events.find((e) => e.type === 'election');
      expect(electionEvent).toBeUndefined();
    });
  });

  describe('structure', () => {
    it('returns 12 turns with sequential turn numbers', () => {
      const state = makeMinimalState({ turn: 5 });
      const result = calculateProjections(state);

      expect(result.turns).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    });

    it('returns arrays of length 12 for all meters', () => {
      const state = makeMinimalState();
      const result = calculateProjections(state);

      for (const key of Object.keys(result.meters) as Array<keyof Meters>) {
        expect(result.meters[key]).toHaveLength(12);
      }
    });
  });
});
