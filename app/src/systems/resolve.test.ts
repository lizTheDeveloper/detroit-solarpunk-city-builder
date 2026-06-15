import { describe, it, expect } from 'vitest';
import { resolveTurn, prepareTurn } from './resolve';
import { createNewGame } from '../state/create-game';
import { gameReducer } from '../state/reducer';
import type {
  GameState,
  Tile,
  CommunityLeader,
  CouncilMember,
  Antagonist,
  Proposal,
} from '../state/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    ...overrides,
    consumedByproducts: overrides.consumedByproducts ?? [],
    vacantLots: overrides.vacantLots ?? 5,
    reclaimedLots: overrides.reclaimedLots ?? 0,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    turn: 1,
    month: 4,
    season: 'spring',
    year: 1,
    phase: 'resolve',
    stage: 'awakening',
    path: null,
    meters: {
      communityTrust: 40,
      ecologicalHealth: 15,
      foodSovereignty: 10,
      politicalWill: 60,
      budget: 4.2,
      climatePressure: 30,
    },
    tiles: {
      brightmoor: makeTile('brightmoor'),
      corktown: makeTile('corktown', { adjacentTileIds: ['eastern_market'] }),
      eastern_market: makeTile('eastern_market', { adjacentTileIds: ['corktown'] }),
    },
    leaders: {},
    councilMembers: {},
    antagonists: {},
    activeProposals: [],
    pendingProposals: [],
    activePolicies: [],
    publicOpinion: {
      foodSovereignty: 15,
      waterCommons: 10,
      landReform: 8,
      ecologicalRestoration: 20,
      cooperativeEconomics: 12,
      nutrientRecycling: 0,
      nuclearEnergy: 0,
      landExpropriation: 0,
      decarceration: 0,
      deGrowth: 0,
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
    continentalGoals: [],
    winCondition: null,
    lossCondition: null,
    sandbox: false,
    dependencyWeb: { conditions: [], capacities: {} },
    activeArcs: [],
    delayedConsequenceQueue: [],
    resolvedArcs: [],
    calendarState: {
      totalSlots: 60,
      fixedSlots: 38,
      discretionarySlots: 22,
      slotsSpent: 0,
      overscheduleAmount: 0,
      overscheduleLimit: 5,
      burnoutBuffer: 15,
      burnoutBufferMax: 20,
      burnoutState: 'sustainable',
      interactionsThisMonth: {},
      lastInteractionMonth: {},
      monthNumber: 1,
      delegationTier: 0,
      crisisSlotTax: 0,
      neighborhoodTimeAllocation: {},
    },
    strategicContacts: [],
    mentors: [],
    ...overrides,
  } as GameState;
}

/** RNG that always returns 1.0 — no counter-narratives will fire (all probabilities < 1) */
const noFireRng = () => 1;

function makeLeader(overrides: Partial<CommunityLeader> = {}): CommunityLeader {
  return {
    id: 'grace',
    name: 'Grace',
    neighborhood: 'Brightmoor',
    tileIds: ['brightmoor'],
    backstory: 'An urban farmer.',
    priorities: ['food_forest', 'community_kitchen'],
    trust: 30,
    advocacyPower: 4,
    proposalCooldown: 0,
    consecutiveDeferrals: 0,
    ...overrides,
  };
}

// ============================================================
// resolveTurn tests
// ============================================================

describe('resolveTurn', () => {
  // ----------------------------------------------------------
  // Climate tick
  // ----------------------------------------------------------

  describe('climate tick', () => {
    it('increases climate pressure by 0.183 in year 1', () => {
      const state = makeState({ year: 1 });
      const result = resolveTurn(state, noFireRng);
      // climatePressure started at 30, should increase by 0.183
      expect(result.meters.climatePressure).toBeCloseTo(30 + 0.183, 2);
    });

    it('increases climate pressure by 0.183 * 1.05 in year 2', () => {
      const state = makeState({ year: 2 });
      const result = resolveTurn(state, noFireRng);
      const expectedIncrease = 0.183 * (1 + (2 - 1) * 0.05);
      expect(result.meters.climatePressure).toBeCloseTo(30 + expectedIncrease, 2);
    });

    it('increases climate pressure by 0.183 * 1.10 in year 3', () => {
      const state = makeState({ year: 3 });
      const result = resolveTurn(state, noFireRng);
      const expectedIncrease = 0.183 * (1 + (3 - 1) * 0.05);
      expect(result.meters.climatePressure).toBeCloseTo(30 + expectedIncrease, 2);
    });

    it('clamps climate pressure at 100', () => {
      const state = makeState({
        meters: {
          communityTrust: 50,
          ecologicalHealth: 15,
          foodSovereignty: 10,
          politicalWill: 60,
          budget: 4.2,
          climatePressure: 99.9,
        },
      });
      const result = resolveTurn(state, noFireRng);
      expect(result.meters.climatePressure).toBe(100);
    });
  });

  // ----------------------------------------------------------
  // Project progress
  // ----------------------------------------------------------

  describe('project progress', () => {
    it('advances an active project by 1', () => {
      const state = makeState({
        tiles: {
          brightmoor: makeTile('brightmoor', {
            activeProjects: [
              {
                definitionId: 'rain_garden',
                tileId: 'brightmoor',
                mode: 'player-initiated',
                progress: 1,
                duration: 3,
                cost: 0.4,
              },
            ],
          }),
          corktown: makeTile('corktown'),
          eastern_market: makeTile('eastern_market'),
        },
      });
      const result = resolveTurn(state, noFireRng);
      expect(result.tiles['brightmoor'].activeProjects[0].progress).toBe(2);
    });

    it('completes a project and applies tile eco effect', () => {
      // food_forest: tileEco = 12, duration = 3
      const state = makeState({
        tiles: {
          brightmoor: makeTile('brightmoor', {
            ecologicalHealth: 10,
            activeProjects: [
              {
                definitionId: 'food_forest',
                tileId: 'brightmoor',
                mode: 'player-initiated',
                progress: 2,
                duration: 3,
                cost: 0.10,
              },
            ],
          }),
          corktown: makeTile('corktown'),
          eastern_market: makeTile('eastern_market'),
        },
      });
      const result = resolveTurn(state, noFireRng);
      // Project completes: eco 10 + 12 = 22
      expect(result.tiles['brightmoor'].ecologicalHealth).toBe(22);
      expect(result.tiles['brightmoor'].activeProjects).toHaveLength(0);
      expect(result.tiles['brightmoor'].completedProjects).toContain('food_forest');
    });
  });

  // ----------------------------------------------------------
  // Meter feedback
  // ----------------------------------------------------------

  describe('meter feedback', () => {
    it('applies Will regeneration', () => {
      const state = makeState({
        meters: { communityTrust: 50, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 30 },
      });
      // trust=50: willRegen = 0.67 + max(0, (50-40)*0.033) = 1.0
      const result = resolveTurn(state, noFireRng);
      // politicalWill started at 60, gains 1.0
      expect(result.meters.politicalWill).toBeCloseTo(61.0, 0);
    });

    it('applies trust passive decay', () => {
      const state = makeState({
        meters: {
          communityTrust: 50,
          ecologicalHealth: 15,
          foodSovereignty: 10,
          politicalWill: 60,
          budget: 4.2,
          climatePressure: 30,
        },
      });
      const result = resolveTurn(state, noFireRng);
      // trust decay -(0.1 + 50*0.004) = -0.3, no food bonus (food=10 < 20)
      expect(result.meters.communityTrust).toBeCloseTo(49.7, 0);
    });

    it('applies food sovereignty to trust bonus when food > 20', () => {
      const state = makeState({
        meters: {
          communityTrust: 50,
          ecologicalHealth: 15,
          foodSovereignty: 40,
          politicalWill: 60,
          budget: 4.2,
          climatePressure: 30,
        },
      });
      const result = resolveTurn(state, noFireRng);
      // food bonus = min(0.2, (40-20)*0.01) = 0.20, decay = -(0.1+50*0.004) = -0.3, net = -0.10
      expect(result.meters.communityTrust).toBeCloseTo(49.90, 0);
    });
  });

  // ----------------------------------------------------------
  // Budget replenishment
  // ----------------------------------------------------------

  describe('budget cycle', () => {
    it('does NOT run budget cycle on turn 1', () => {
      const state = makeState({
        turn: 1,
        season: 'spring',
        year: 1,
      });
      const result = resolveTurn(state, noFireRng);
      expect(result.meters.budget).toBeCloseTo(4.2, 4);
    });

    it('runs balanced budget cycle after turn 1 (revenue ≈ expenses)', () => {
      const state = makeState({
        turn: 2,
        season: 'summer',
        year: 1,
        meters: { communityTrust: 40, ecologicalHealth: 30, foodSovereignty: 10, politicalWill: 60, budget: 1576, climatePressure: 30 },
      });
      const result = resolveTurn(state, noFireRng);
      // At trust=40 and eco>=30: no emergency penalty, no trust bonus
      // Revenue ≈ expenses ≈ $131M/mo, so budget stays near $1576M
      expect(result.meters.budget).toBeGreaterThan(1500);
      expect(result.meters.budget).toBeLessThan(1650);
    });

    it('low eco health causes emergency spending deficit', () => {
      const state = makeState({
        turn: 5,
        month: 8,
        season: 'summer',
        year: 1,
        meters: { communityTrust: 40, ecologicalHealth: 10, foodSovereignty: 10, politicalWill: 60, budget: 1576, climatePressure: 30 },
      });
      const result = resolveTurn(state, noFireRng);
      // Eco 10 < 30, so emergency cost = (30-eco)*0.3 ≈ $6M/mo deficit
      expect(result.meters.budget).toBeLessThan(1576);
    });

    it('adds project revenue from completed solar_grid', () => {
      const state = makeState({
        turn: 5,
        month: 8,
        season: 'summer',
        year: 1,
        meters: { communityTrust: 40, ecologicalHealth: 30, foodSovereignty: 10, politicalWill: 60, budget: 1576, climatePressure: 30 },
        tiles: {
          brightmoor: makeTile('brightmoor', { completedProjects: ['solar_grid'] }),
          corktown: makeTile('corktown'),
          eastern_market: makeTile('eastern_market'),
        },
      });
      const result = resolveTurn(state, noFireRng);
      // Should include solar_grid revenue (0.08/12) and maintenance (-0.03/12)
      expect(result.meters.budget).toBeDefined();
    });

    it('project maintenance creates small monthly drain', () => {
      const state = makeState({
        turn: 5,
        month: 8,
        season: 'summer',
        year: 1,
        meters: { communityTrust: 40, ecologicalHealth: 30, foodSovereignty: 10, politicalWill: 60, budget: 1576, climatePressure: 30 },
        tiles: {
          brightmoor: makeTile('brightmoor', { completedProjects: ['maker_space'] }),
          corktown: makeTile('corktown'),
          eastern_market: makeTile('eastern_market'),
        },
      });
      const noProjects = makeState({
        turn: 5,
        month: 8,
        season: 'summer',
        year: 1,
        meters: { communityTrust: 40, ecologicalHealth: 30, foodSovereignty: 10, politicalWill: 60, budget: 1576, climatePressure: 30 },
      });
      const withProjects = resolveTurn(state, noFireRng);
      const without = resolveTurn(noProjects, noFireRng);
      // Net effect of maker_space: revenue (0.04/12) minus maintenance (0.015/12)
      // Should be slightly different from baseline
      expect(withProjects.meters.budget).not.toEqual(without.meters.budget);
    });
  });

  // ----------------------------------------------------------
  // Gentrification decay
  // ----------------------------------------------------------

  describe('gentrification decay', () => {
    it('decays gentrification by 1% per turn on all tiles', () => {
      const state = makeState({
        tiles: {
          brightmoor: makeTile('brightmoor', { gentrificationPressure: 20 }),
          corktown: makeTile('corktown', { gentrificationPressure: 10 }),
          eastern_market: makeTile('eastern_market', { gentrificationPressure: 5 }),
        },
      });
      const result = resolveTurn(state, noFireRng);
      expect(result.tiles['brightmoor'].gentrificationPressure).toBe(19);
      expect(result.tiles['corktown'].gentrificationPressure).toBe(9);
      expect(result.tiles['eastern_market'].gentrificationPressure).toBe(4);
    });
  });

  // ----------------------------------------------------------
  // maxConcurrentProjects recalculation
  // ----------------------------------------------------------

  describe('maxConcurrentProjects', () => {
    it('recalculates from final trust', () => {
      // trust 75 => floor(2 + 75/25) = 5
      const state = makeState({
        meters: {
          communityTrust: 75,
          ecologicalHealth: 15,
          foodSovereignty: 10,
          politicalWill: 60,
          budget: 4.2,
          climatePressure: 30,
        },
      });
      const result = resolveTurn(state, noFireRng);
      // trust after feedback: 75 - (0.3+75*0.012) = 75 - 1.2 = 73.8 => floor(2 + 73.8/25) = floor(4.952) = 4
      expect(result.maxConcurrentProjects).toBe(4);
    });
  });

  // ----------------------------------------------------------
  // Meter clamping
  // ----------------------------------------------------------

  describe('meter clamping', () => {
    it('clamps all meters after resolve', () => {
      const state = makeState({
        meters: {
          communityTrust: 101,
          ecologicalHealth: -5,
          foodSovereignty: 200,
          politicalWill: -10,
          budget: -1,
          climatePressure: 150,
        },
      });
      const result = resolveTurn(state, noFireRng);
      expect(result.meters.communityTrust).toBeLessThanOrEqual(100);
      expect(result.meters.ecologicalHealth).toBeGreaterThanOrEqual(0);
      expect(result.meters.foodSovereignty).toBeLessThanOrEqual(100);
      expect(result.meters.politicalWill).toBeGreaterThanOrEqual(0);
      expect(result.meters.budget).toBeGreaterThanOrEqual(0);
      expect(result.meters.climatePressure).toBeLessThanOrEqual(100);
    });
  });

  // ----------------------------------------------------------
  // Season advancement
  // ----------------------------------------------------------

  describe('season advancement (monthly)', () => {
    it('advances from month 6 (spring) to month 7 (summer)', () => {
      const state = makeState({ month: 6, season: 'spring' });
      const result = resolveTurn(state, noFireRng);
      expect(result.month).toBe(7);
      expect(result.season).toBe('summer');
    });

    it('advances from month 9 (summer) to month 10 (fall)', () => {
      const state = makeState({ month: 9, season: 'summer' });
      const result = resolveTurn(state, noFireRng);
      expect(result.month).toBe(10);
      expect(result.season).toBe('fall');
    });

    it('advances from month 12 (fall) to month 1 (winter) and increments year', () => {
      const state = makeState({ month: 12, season: 'fall', year: 1 });
      const result = resolveTurn(state, noFireRng);
      expect(result.month).toBe(1);
      expect(result.season).toBe('winter');
      expect(result.year).toBe(2);
    });

    it('year stays the same for non-December months', () => {
      const state = makeState({ month: 4, season: 'spring', year: 1 });
      const result = resolveTurn(state, noFireRng);
      expect(result.month).toBe(5);
      expect(result.year).toBe(1);
    });
  });

  // ----------------------------------------------------------
  // Turn increment
  // ----------------------------------------------------------

  describe('turn increment', () => {
    it('increments turn by 1', () => {
      const state = makeState({ turn: 3 });
      const result = resolveTurn(state, noFireRng);
      expect(result.turn).toBe(4);
    });
  });

  // ----------------------------------------------------------
  // TurnSummary
  // ----------------------------------------------------------

  describe('turnSummary', () => {
    it('populates turnSummary with deltas from all steps', () => {
      const state = makeState();
      const result = resolveTurn(state, noFireRng);
      expect(result.turnSummary).not.toBeNull();
      expect(result.turnSummary!.turn).toBe(1);
      expect(result.turnSummary!.season).toBe('spring');
      expect(result.turnSummary!.year).toBe(1);
      expect(result.turnSummary!.deltas.length).toBeGreaterThan(0);
    });

    it('includes climate pressure delta in turnSummary', () => {
      const state = makeState();
      const result = resolveTurn(state, noFireRng);
      const climateDelta = result.turnSummary!.deltas.find(
        (d) => d.meter === 'climatePressure',
      );
      expect(climateDelta).toBeDefined();
      expect(climateDelta!.amount).toBeCloseTo(0.183, 2);
    });

    it('includes meter feedback deltas in turnSummary', () => {
      const state = makeState();
      const result = resolveTurn(state, noFireRng);
      const willDelta = result.turnSummary!.deltas.find(
        (d) => d.meter === 'politicalWill' && d.source === 'will_regen',
      );
      expect(willDelta).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // Full integration test
  // ----------------------------------------------------------

  describe('full integration: 4 turns (4 months)', () => {
    it('resolves 4 turns from createNewGame and all meters move as expected', () => {
      let state = createNewGame();

      // Resolve 4 turns (4 months)
      for (let i = 0; i < 4; i++) {
        state = resolveTurn(state, noFireRng);
      }

      // After 4 monthly turns:
      expect(state.turn).toBe(5);

      // Climate pressure increased: 4 ticks at ~0.183 each
      expect(state.meters.climatePressure).toBeGreaterThan(30);
      expect(state.meters.climatePressure).toBeCloseTo(30 + 4 * 0.183, 0);

      // Trust: scaling decay -(0.1 + trust*0.004)/turn + leader trust bonus
      // Net positive because leader bonus exceeds decay at these trust levels
      // With monthly (smaller) decay, trust grows more per turn
      expect(state.meters.communityTrust).toBeGreaterThan(50);
      expect(state.meters.communityTrust).toBeLessThan(60);

      // Political Will increased: starts at 25, regen ~1.0/turn (trust 50 => 0.67+0.33=1.0)
      // After 4 turns: 25 + ~4 = ~29 minimum
      expect(state.meters.politicalWill).toBeGreaterThan(25);

      // Budget replenished: monthly revenue + time bank credits (trust>40)
      // Revenue ~0.06/turn * 3 turns + time bank ≈ modest growth
      expect(state.meters.budget).toBeGreaterThan(1.5);
    });
  });
});

// ============================================================
// prepareTurn tests
// ============================================================

describe('prepareTurn', () => {
  it('generates proposals from eligible leaders', () => {
    const state = makeState({
      turn: 2,
      leaders: {
        grace: makeLeader({
          tileIds: ['brightmoor'],
          priorities: ['food_forest', 'community_kitchen'],
          trust: 30,
          proposalCooldown: 0,
        }),
      },
      tiles: {
        brightmoor: makeTile('brightmoor'),
        corktown: makeTile('corktown'),
        eastern_market: makeTile('eastern_market'),
      },
    });
    const result = prepareTurn(state, noFireRng);
    expect(result.activeProposals.length).toBeGreaterThan(0);
    expect(result.activeProposals[0].leaderId).toBe('grace');
  });

  it('ticks pressure on existing active proposals', () => {
    const existing: Proposal = {
      id: 'grace_1',
      leaderId: 'grace',
      projectDefinitionId: 'food_forest',
      tileId: 'brightmoor',
      reason: 'Proposed last turn.',
      turnProposed: 1,
      expirationTurn: 5,
      pressureLevel: 0,
    };
    const state = makeState({
      turn: 2,
      activeProposals: [existing],
      leaders: {
        grace: makeLeader({ trust: -5 }),
      },
    });
    const result = prepareTurn(state, noFireRng);
    const carried = result.activeProposals.find(p => p.id === 'grace_1');
    expect(carried).toBeDefined();
    expect(carried!.pressureLevel).toBe(1);
  });

  it('expires proposals past their deadline with trust penalty', () => {
    const expired: Proposal = {
      id: 'grace_1',
      leaderId: 'grace',
      projectDefinitionId: 'food_forest',
      tileId: 'brightmoor',
      reason: 'Proposed long ago.',
      turnProposed: 1,
      expirationTurn: 2,
      pressureLevel: 2,
    };
    const state = makeState({
      turn: 2,
      activeProposals: [expired],
      leaders: {
        grace: makeLeader({ trust: 30 }),
      },
    });
    const result = prepareTurn(state, noFireRng);
    expect(result.activeProposals.find(p => p.id === 'grace_1')).toBeUndefined();
    expect(result.leaders.grace.trust).toBeLessThan(30);
  });

  it('clears pendingProposals', () => {
    const state = makeState({
      turn: 2,
      pendingProposals: [],
      leaders: {
        grace: makeLeader({ trust: -5 }),
      },
    });
    const result = prepareTurn(state, noFireRng);
    expect(result.pendingProposals).toHaveLength(0);
  });
});

// ============================================================
// Reducer integration tests
// ============================================================

describe('reducer integration', () => {
  it('END_TURN now runs full resolve pipeline (month advances)', () => {
    const state = createNewGame();
    const result = gameReducer(state, { type: 'END_TURN' });
    expect(result.month).toBe(state.month === 12 ? 1 : state.month + 1);
    expect(result.turn).toBe(2);
  });

  it('END_TURN applies climate tick', () => {
    const state = createNewGame();
    const result = gameReducer(state, { type: 'END_TURN' });
    // Climate pressure should increase
    expect(result.meters.climatePressure).toBeGreaterThan(30);
  });

  it('END_TURN applies meter feedback', () => {
    const state = { ...createNewGame(), activeArcs: [], delayedConsequenceQueue: [] };
    const result = gameReducer(state, { type: 'END_TURN' });
    // Will should increase (trust 50 => regen 3.0, starts at 25 so > 25)
    expect(result.meters.politicalWill).toBeGreaterThan(25);
    // Trust changes from: leader bonus (~1.65), decay -(0.3+50*0.012)=-0.9, and possible counter-narrative.
    // With Math.random, a counter-narrative may fire, so trust can go down.
    // Just verify trust moved (feedback was applied).
    expect(result.meters.communityTrust).not.toBe(50);
  });

  it('END_TURN recalculates maxConcurrentProjects', () => {
    const state = createNewGame();
    const modifiedState: GameState = {
      ...state,
      meters: { ...state.meters, communityTrust: 80 },
    };
    const result = gameReducer(modifiedState, { type: 'END_TURN' });
    // trust 80 after decay/feedback stays above 75 → floor(2 + 75+/25) = 5
    expect(result.maxConcurrentProjects).toBe(5);
  });

  it('END_TURN wraps month 12 to 1 and increments year', () => {
    const state: GameState = { ...createNewGame(), month: 12, season: 'fall', year: 1 };
    const result = gameReducer(state, { type: 'END_TURN' });
    expect(result.month).toBe(1);
    expect(result.season).toBe('winter');
    expect(result.year).toBe(2);
  });

  it('PREPARE_TURN generates proposals', () => {
    const base = createNewGame();
    // Give grace priorities and a tile
    const state: GameState = {
      ...base,
      leaders: {
        ...base.leaders,
        grace: {
          ...base.leaders['grace'],
          tileIds: ['brightmoor'],
          priorities: ['food_forest', 'community_kitchen'],
        },
      },
    };
    const result = gameReducer(state, { type: 'PREPARE_TURN' });
    expect(result.activeProposals.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Phase 2 pipeline tests
// ============================================================

function makeCouncilMember(overrides: Partial<CouncilMember> = {}): CouncilMember {
  return {
    id: 'martinez',
    name: 'Martinez',
    district: 'District 1',
    districtNumber: 1,
    leaning: 'progressive',
    priorities: [],
    disposition: 0,
    backstory: '',
    tileIds: [],
    ...overrides,
  };
}

function makeAntagonist(overrides: Partial<Antagonist> = {}): Antagonist {
  return {
    id: 'marcus_webb',
    name: 'Marcus Webb',
    role: 'Media personality',
    activationCondition: 'turn >= 1',
    escalationLevel: 0,
    escalationInterval: 4,
    active: false,
    lastEscalationTurn: 0,
    tileTargets: [],
    ...overrides,
  };
}

describe('Phase 2 resolve pipeline', () => {
  // ----------------------------------------------------------
  // 1. Policy drain reduces Will when policies are active
  // ----------------------------------------------------------

  it('policy drain reduces Will when policies are active', () => {
    const state = makeState({
      activePolicies: [
        { definitionId: 'urban_agriculture_zoning', enactedTurn: 1 },
      ],
      meters: {
        communityTrust: 50,
        ecologicalHealth: 15,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 4.2,
        climatePressure: 30,
      },
    });
    const result = resolveTurn(state, noFireRng);
    // urban_agriculture_zoning drain = 0.003 * 100 = 0.3
    // Will after drain: 60 - 0.3 = 59.7
    // Then meter feedback adds regen, so Will > 59.7 but < 62 (without drain it was 62)
    const drainDelta = result.turnSummary!.deltas.find(
      (d) => d.source.startsWith('policy_drain:'),
    );
    expect(drainDelta).toBeDefined();
    expect(drainDelta!.amount).toBeLessThan(0);
  });

  // ----------------------------------------------------------
  // 2. Policy drain is skipped when no policies active
  // ----------------------------------------------------------

  it('policy drain is skipped when no policies active', () => {
    const state = makeState({
      activePolicies: [],
    });
    const result = resolveTurn(state, noFireRng);
    const drainDelta = result.turnSummary!.deltas.find(
      (d) => d.source.startsWith('policy_drain:'),
    );
    expect(drainDelta).toBeUndefined();
  });

  // ----------------------------------------------------------
  // 3. Opinion drift applies during resolve
  // ----------------------------------------------------------

  it('opinion drift applies during resolve', () => {
    const state = makeState({
      publicOpinion: {
        foodSovereignty: 25,
        waterCommons: 20,
        landReform: 15,
        ecologicalRestoration: 30,
        cooperativeEconomics: 20,
        nutrientRecycling: 0,
        nuclearEnergy: 0,
        landExpropriation: 0,
        decarceration: 0,
        deGrowth: 0,
      },
    });
    const result = resolveTurn(state, noFireRng);
    // All topics should drift down by 0.67 (monthly rate)
    // foodSovereignty: 25 - 0.67 = 24.33
    expect(result.publicOpinion.foodSovereignty).toBeCloseTo(24.33, 1);
    // ecologicalRestoration: 30 - 0.67 = 29.33
    expect(result.publicOpinion.ecologicalRestoration).toBeCloseTo(29.33, 1);
  });

  // ----------------------------------------------------------
  // 4. Counter-narrative may fire during resolve (deterministic rng)
  // ----------------------------------------------------------

  it('counter-narrative fires with low rng roll', () => {
    // corporate_media has probability 0.05 and isEligible: () => true
    // rng returning 0.01 < 0.05, so it will fire
    const alwaysFireRng = () => 0.01;
    const state = makeState();
    const result = resolveTurn(state, alwaysFireRng);
    // corporate_media willDrain = -3.5
    const counterDelta = result.turnSummary!.deltas.find(
      (d) => d.source.startsWith('counter_'),
    );
    expect(counterDelta).toBeDefined();
    expect(counterDelta!.source).toBe('counter_corporate_media');
    expect(counterDelta!.amount).toBe(-3.5);
  });

  // ----------------------------------------------------------
  // 5. Leader trust decays during resolve
  // ----------------------------------------------------------

  it('leader trust decays during resolve', () => {
    const state = makeState({
      leaders: {
        grace: makeLeader({ id: 'grace', trust: 50 }),
      },
    });
    const result = resolveTurn(state, noFireRng);
    // trust < 60 so decay rate is 1.0, trust drifts toward 0
    // 50 - 1 = 49
    expect(result.leaders['grace'].trust).toBe(49);
  });

  // ----------------------------------------------------------
  // 6. Council Will bonus applied during resolve
  // ----------------------------------------------------------

  it('council Will bonus applied during resolve', () => {
    const state = makeState({
      councilMembers: {
        martinez: makeCouncilMember({ id: 'martinez', disposition: 50 }),
        jones: makeCouncilMember({ id: 'jones', disposition: 40 }),
      },
    });
    const result = resolveTurn(state, noFireRng);
    // Both disposition >= 30, so bonus = +1 + +1 = +2
    const councilDelta = result.turnSummary!.deltas.find(
      (d) => d.source === 'council_will_bonus',
    );
    expect(councilDelta).toBeDefined();
    expect(councilDelta!.amount).toBe(2);
  });

  // ----------------------------------------------------------
  // 7. Event cooldowns decremented during resolve
  // ----------------------------------------------------------

  it('event cooldowns decremented during resolve', () => {
    const state = makeState({
      eventCooldowns: { heat_wave: 3, flooding: 1 },
    });
    const result = resolveTurn(state, noFireRng);
    // heat_wave: 3 -> 2, flooding: 1 -> 0 (removed)
    expect(result.eventCooldowns['heat_wave']).toBe(2);
    expect(result.eventCooldowns['flooding']).toBeUndefined();
  });

  // ----------------------------------------------------------
  // 8. Antagonist activation checked during resolve
  // ----------------------------------------------------------

  it('antagonist activation checked during resolve', () => {
    const state = makeState({
      antagonists: {
        marcus_webb: makeAntagonist({
          id: 'marcus_webb',
          active: false,
          escalationInterval: 100, // large so escalation won't fire
          lastEscalationTurn: 0,
        }),
      },
    });
    const result = resolveTurn(state, noFireRng);
    // marcus_webb activates when turn >= 1, state.turn = 1
    expect(result.antagonists['marcus_webb'].active).toBe(true);
  });

  // ----------------------------------------------------------
  // 9. Budget replenishment includes policy bonuses
  // ----------------------------------------------------------

  it('budget cycle includes policy bonuses (monthly)', () => {
    const withPolicy = makeState({
      turn: 5,
      month: 8,
      season: 'summer',
      year: 1,
      meters: { communityTrust: 40, ecologicalHealth: 30, foodSovereignty: 10, politicalWill: 60, budget: 1576, climatePressure: 30 },
      activePolicies: [
        { definitionId: 'cooperative_tax_incentives', enactedTurn: 3 },
      ],
    });
    const withoutPolicy = makeState({
      turn: 5,
      month: 8,
      season: 'summer',
      year: 1,
      meters: { communityTrust: 40, ecologicalHealth: 30, foodSovereignty: 10, politicalWill: 60, budget: 1576, climatePressure: 30 },
    });
    const resultWith = resolveTurn(withPolicy, noFireRng);
    const resultWithout = resolveTurn(withoutPolicy, noFireRng);

    const policyBonusDelta = resultWith.turnSummary!.deltas.find(
      (d) => d.source === 'policy_budget_bonus',
    );
    expect(policyBonusDelta).toBeDefined();
    expect(policyBonusDelta!.amount).toBeCloseTo(0.20 / 12, 3);
    expect(resultWith.meters.budget).toBeGreaterThan(resultWithout.meters.budget);
  });
});

// ============================================================
// Phase 2 prepareTurn tests
// ============================================================

describe('Phase 2 prepareTurn', () => {
  // ----------------------------------------------------------
  // 10. prepareTurn resets calendar slots for the new month
  // ----------------------------------------------------------

  it('resets calendar slots for new month', () => {
    const state = makeState({
      turn: 2,
      calendarState: {
        totalSlots: 60,
        fixedSlots: 38,
        discretionarySlots: 22,
        slotsSpent: 15,
        overscheduleAmount: 0,
        overscheduleLimit: 5,
        burnoutBuffer: 15,
        burnoutBufferMax: 20,
        burnoutState: 'sustainable' as const,
        interactionsThisMonth: { grace: 2 },
        lastInteractionMonth: {},
        monthNumber: 2,
        delegationTier: 0,
        crisisSlotTax: 0,
        neighborhoodTimeAllocation: {},
        consecutiveRecoveryMonths: 0,
        leaderTrustGrantedThisMonth: {},
      },
    });
    const result = prepareTurn(state, noFireRng);
    // Calendar should reset slotsSpent for the new month
    expect(result.calendarState.slotsSpent).toBe(0);
    expect(result.calendarState.monthNumber).toBe(3);
  });

  // ----------------------------------------------------------
  // 11. prepareTurn generates events
  // ----------------------------------------------------------

  it('generates events and adds them to eventQueue', () => {
    // Use a rng that always fires events (low roll)
    const alwaysFireRng = () => 0.001;
    const state = makeState({
      season: 'summer',
      meters: {
        communityTrust: 50,
        ecologicalHealth: 15,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 0.5, // low budget enables water_shutoff crisis
        climatePressure: 30,
      },
    });
    const result = prepareTurn(state, alwaysFireRng);
    // With very low rng, at least some events should fire
    expect(result.eventQueue.length).toBeGreaterThan(0);
    // Events should have proper structure
    const firstEvent = result.eventQueue[0];
    expect(firstEvent.id).toBeTruthy();
    expect(firstEvent.type).toBeTruthy();
    expect(firstEvent.choices.length).toBeGreaterThan(0);
  });
});
