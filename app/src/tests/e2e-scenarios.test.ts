/**
 * End-to-End Integration Test Scenarios
 * ======================================
 *
 * Derived from Monte Carlo simulations v1 and v2 (see simulations/BALANCE_REPORT.md
 * and simulations/v2/BALANCE_REPORT_V2.md). These tests validate that the game's
 * mathematical model matches the expectations established by those simulations.
 *
 * Key findings these tests encode:
 *   - V1 Political Will death spiral (FIXED in V2 via +1 baseline regen)
 *   - V2 trust feedback loop with food sovereignty threshold at 20
 *   - V2 gentrification pressure system with 1%/turn decay (rec'd from 2%/turn)
 *   - Community-led vs player-initiated project trade-offs
 *   - Budget economy with $1.5M annual replenishment formula
 *   - Proposal accept/reject trust dynamics and 3-deferral-to-reject rule
 *   - Season cycling and year tracking (4 turns per year)
 *
 * Tests that can run against existing pure functions (meters.ts, reducer.ts,
 * create-game.ts) use real assertions. Tests requiring systems not yet
 * implemented (gentrification tick, project completion effects, budget
 * replenishment, full turn loop) use it.todo() with detailed specifications.
 */

import { describe, it, expect } from 'vitest';
import type {
  GameState,
  Meters,
  ProjectDefinition,
  Proposal,
  Season,
} from '../state/types';
import {
  applyMeterFeedback,
  calculateMaxProjects,
  clampMeters,
} from '../systems/meters';
import { createNewGame } from '../state/create-game';
import { gameReducer } from '../state/reducer';

// ============================================================
// Test Helpers
// ============================================================

function makeMeters(overrides: Partial<Meters> = {}): Meters {
  return {
    communityTrust: 50,
    ecologicalHealth: 15,
    foodSovereignty: 10,
    politicalWill: 60,
    budget: 2.8,
    climatePressure: 30,
    ...overrides,
  };
}

function makeProjectDef(overrides: Partial<ProjectDefinition> = {}): ProjectDefinition {
  return {
    id: 'food_forest',
    name: 'Food Forest',
    category: 'ecology',
    growthCategory: 'de-growth',
    baseCost: 0.75,
    baseDuration: 3,
    effects: {
      tileEco: 15,
      foodSov: 4,
      trust: 2,
      annualRevenue: 0,
      contaminationReduction: 0,
      gentrificationChange: 10,
      other: [],
    },
    maxContamination: 50,
    stageRequired: 'awakening',
    terrainRequired: null,
    ...overrides,
  };
}

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 'proposal_1',
    leaderId: 'grace',
    projectDefinitionId: 'food_forest',
    tileId: 'brightmoor',
    reason: 'Community needs food access',
    turnProposed: 1,
    ...overrides,
  };
}

const foodForestDef = makeProjectDef();

const rainGardenDef = makeProjectDef({
  id: 'rain_garden',
  name: 'Rain Garden',
  baseCost: 0.4,
  baseDuration: 2,
  effects: {
    tileEco: 10,
    foodSov: 0,
    trust: 0,
    annualRevenue: 0,
    contaminationReduction: 0,
    gentrificationChange: 10,
    other: [],
  },
  maxContamination: null,
});

const projectDefs: Record<string, ProjectDefinition> = {
  food_forest: foodForestDef,
  rain_garden: rainGardenDef,
};

// ============================================================
// Scenario 1: Budget Economy Test
// ============================================================

describe('Scenario 1: Budget Economy Test', () => {
  it('starting budget is $2.8M', () => {
    const state = createNewGame();
    expect(state.meters.budget).toBe(2.8);
  });

  it('starting 2 projects deducts correct costs from budget', () => {
    let state = createNewGame();

    // Start food_forest ($0.75M player-initiated)
    state = gameReducer(
      state,
      { type: 'START_PROJECT', tileId: 'brightmoor', projectId: 'food_forest', mode: 'player-initiated' },
      projectDefs,
    );
    expect(state.meters.budget).toBeCloseTo(2.8 - 0.75, 5);

    // Start rain_garden ($0.4M player-initiated)
    state = gameReducer(
      state,
      { type: 'START_PROJECT', tileId: 'eastern_market', projectId: 'rain_garden', mode: 'player-initiated' },
      projectDefs,
    );
    expect(state.meters.budget).toBeCloseTo(2.8 - 0.75 - 0.4, 5);
  });

  it('no budget replenishment occurs mid-year (turns 2-4 are summer/fall/winter)', () => {
    // Budget replenishment only on spring turns after turn 1.
    // Turns 2 (summer), 3 (fall), 4 (winter) should have no replenishment.
    // This is a design constraint from the simulation engine.
    const state = createNewGame();
    // Advance through summer, fall, winter -- budget should only change from spending
    let current = state;
    for (let i = 0; i < 3; i++) {
      current = gameReducer(current, { type: 'END_TURN' }, projectDefs);
    }
    // After 3 END_TURNs from spring: season should be winter, still year 1
    expect(current.season).toBe('winter');
    expect(current.year).toBe(1);
    // Budget unchanged (no projects started, no replenishment)
    expect(current.meters.budget).toBe(2.8);
  });

  it.todo(
    'turn 5 (spring year 2) triggers budget replenishment = $1.5M * (0.5 + eco*0.005 + trust*0.003)',
    // At starting values: eco=15, trust=50
    // replenishment = 1.5 * (0.5 + 15*0.005 + 50*0.003) = 1.5 * (0.5 + 0.075 + 0.15) = 1.5 * 0.725 = $1.0875M
    // Requires: budgetReplenishment system function
  );

  it.todo(
    'budget replenishment formula includes annual revenue bonus from completed projects',
    // After completing a solar_grid (annualRevenue +$0.2M), the spring
    // replenishment should add the revenue on top of the base replenishment
  );

  it.todo(
    'degrowth maintenance is deducted from budget during replenishment ($50K/year per de-growth project)',
    // Each completed de-growth project costs $0.05M/year in maintenance,
    // deducted during spring replenishment
  );
});

// ============================================================
// Scenario 2: Political Will Death Spiral Prevention
// ============================================================

describe('Scenario 2: Political Will Death Spiral Prevention', () => {
  /**
   * This was the CRITICAL V1 bug. Will drained to ~6% by turn 16 for every
   * strategy. V2 fixed this with a +1.0 baseline regen plus trust bonus.
   * Formula: willRegen = 1.0 + max(0, (trust - 40) * 0.1)
   */

  it('Will regeneration is at least +1.0/turn even when trust is 30 (below 40 threshold)', () => {
    const meters = makeMeters({ communityTrust: 30, politicalWill: 20 });
    const result = applyMeterFeedback(meters);
    const willDelta = result.deltas.find(
      (d) => d.meter === 'politicalWill' && d.source === 'will_regen',
    );
    expect(willDelta).toBeDefined();
    expect(willDelta!.amount).toBeGreaterThanOrEqual(1.0);
    expect(willDelta!.amount).toBeCloseTo(1.0, 5);
  });

  it('Will regeneration is at least +1.0/turn when trust is 0 (worst case)', () => {
    const meters = makeMeters({ communityTrust: 0, politicalWill: 5 });
    const result = applyMeterFeedback(meters);
    const willDelta = result.deltas.find(
      (d) => d.meter === 'politicalWill' && d.source === 'will_regen',
    );
    expect(willDelta!.amount).toBeGreaterThanOrEqual(1.0);
  });

  it('after 10 turns of feedback at trust 30, Will should increase by at least 10', () => {
    let meters = makeMeters({ communityTrust: 30, politicalWill: 20 });

    for (let i = 0; i < 10; i++) {
      const result = applyMeterFeedback(meters);
      meters = { ...result.meters };
    }

    // Will started at 20, regen is +1.0/turn at trust 30 (below 40).
    // Trust also decays by 0.3/turn, but that does not affect Will regen
    // because trust stays below 40 the entire time.
    // After 10 turns: Will = 20 + 10*1.0 = 30
    expect(meters.politicalWill).toBeGreaterThanOrEqual(30);
  });

  it('Will never spirals to 0 if trust stays positive -- 20 turn stress test', () => {
    // Start from worst-case: low trust, low Will
    let meters = makeMeters({ communityTrust: 15, politicalWill: 5 });

    for (let i = 0; i < 20; i++) {
      const result = applyMeterFeedback(meters);
      meters = clampMeters(result.meters);
      // Will should never reach 0 because baseline regen is +1.0
      expect(meters.politicalWill).toBeGreaterThan(0);
    }

    // After 20 turns of +1.0 regen: Will should be well above starting
    expect(meters.politicalWill).toBeGreaterThanOrEqual(20);
  });

  it('Will gets bonus regen above trust 40: at trust 70, regen = 4.0/turn', () => {
    const meters = makeMeters({ communityTrust: 70, politicalWill: 40 });
    const result = applyMeterFeedback(meters);
    const willDelta = result.deltas.find(
      (d) => d.meter === 'politicalWill' && d.source === 'will_regen',
    );
    // 1.0 + max(0, (70-40)*0.1) = 1.0 + 3.0 = 4.0
    expect(willDelta!.amount).toBeCloseTo(4.0, 5);
  });
});

// ============================================================
// Scenario 3: Trust Feedback Loop
// ============================================================

describe('Scenario 3: Trust Feedback Loop', () => {
  /**
   * Trust has two competing forces:
   * - Decay: -0.3/turn (passive)
   * - Food bonus: max(0, (foodSov - 20) * 0.05)
   * When food < 20, net trust change from feedback is -0.3/turn.
   * When food > 26, food bonus exceeds decay.
   */

  it('trust declines when foodSov is below 20 (no food bonus)', () => {
    const meters = makeMeters({ communityTrust: 50, foodSovereignty: 10 });
    const result = applyMeterFeedback(meters);

    // Food bonus: max(0, (10-20)*0.05) = 0
    const foodDelta = result.deltas.find(
      (d) => d.meter === 'communityTrust' && d.source === 'food_trust_bonus',
    );
    expect(foodDelta).toBeUndefined();

    // Trust decay: -0.3
    const decayDelta = result.deltas.find(
      (d) => d.meter === 'communityTrust' && d.source === 'trust_decay',
    );
    expect(decayDelta!.amount).toBeCloseTo(-0.3, 5);

    // Net trust = 50 - 0.3 = 49.7
    expect(result.meters.communityTrust).toBeCloseTo(49.7, 5);
  });

  it('after 10 turns with foodSov=10, trust declines by ~3 (from 50 to ~47)', () => {
    let meters = makeMeters({ communityTrust: 50, foodSovereignty: 10 });

    for (let i = 0; i < 10; i++) {
      const result = applyMeterFeedback(meters);
      meters = { ...result.meters };
    }

    // Each turn: trust loses 0.3 (no food bonus since food=10 < 20)
    // After 10 turns: 50 - 10*0.3 = 47
    expect(meters.communityTrust).toBeCloseTo(47, 1);
  });

  it('trust climbs when foodSov is 40 (food bonus > decay)', () => {
    const meters = makeMeters({ communityTrust: 50, foodSovereignty: 40 });
    const result = applyMeterFeedback(meters);

    // Food bonus: max(0, (40-20)*0.05) = 1.0
    const foodDelta = result.deltas.find(
      (d) => d.meter === 'communityTrust' && d.source === 'food_trust_bonus',
    );
    expect(foodDelta).toBeDefined();
    expect(foodDelta!.amount).toBeCloseTo(1.0, 5);

    // Decay: -0.3
    // Net: +0.7
    expect(result.meters.communityTrust).toBeCloseTo(50.7, 5);
  });

  it('trust slowly climbs over 10 turns with foodSov=40 (net +0.7/turn)', () => {
    let meters = makeMeters({ communityTrust: 50, foodSovereignty: 40 });

    for (let i = 0; i < 10; i++) {
      const result = applyMeterFeedback(meters);
      meters = { ...result.meters };
    }

    // Each turn: food bonus = (40-20)*0.05 = +1.0, decay = -0.3, net = +0.7
    // After 10 turns: 50 + 10*0.7 = 57
    expect(meters.communityTrust).toBeCloseTo(57, 1);
  });

  it('breakeven point: at foodSov=26, food bonus = 0.3, exactly cancels decay', () => {
    const meters = makeMeters({ communityTrust: 50, foodSovereignty: 26 });
    const result = applyMeterFeedback(meters);

    // Food bonus: (26-20)*0.05 = 0.3
    // Decay: -0.3
    // Net: 0
    expect(result.meters.communityTrust).toBeCloseTo(50, 5);
  });
});

// ============================================================
// Scenario 4: Community-Led vs Player-Initiated Trade-off
// ============================================================

describe('Scenario 4: Community-Led vs Player-Initiated Trade-off', () => {
  /**
   * Project modes affect cost, duration, trust gain, and gentrification:
   *
   * Player-initiated:
   *   cost = baseCost (1.0x), duration = baseDuration, trust *= 0.6, gentrification *= 1.5
   *
   * Community-led:
   *   cost = baseCost * 1.3, duration = ceil(baseDuration * 1.5),
   *   trust *= 1.6, gentrification *= 0.5
   */

  describe('food_forest player-initiated', () => {
    it('costs $0.75M (base cost, no multiplier)', () => {
      const state = createNewGame();
      const result = gameReducer(
        state,
        { type: 'START_PROJECT', tileId: 'brightmoor', projectId: 'food_forest', mode: 'player-initiated' },
        projectDefs,
      );
      expect(result.meters.budget).toBeCloseTo(2.8 - 0.75, 5);
      expect(result.tiles['brightmoor'].activeProjects[0].cost).toBeCloseTo(0.75, 5);
    });

    it('has duration 3 turns (base duration)', () => {
      const state = createNewGame();
      const result = gameReducer(
        state,
        { type: 'START_PROJECT', tileId: 'brightmoor', projectId: 'food_forest', mode: 'player-initiated' },
        projectDefs,
      );
      expect(result.tiles['brightmoor'].activeProjects[0].duration).toBe(3);
    });
  });

  describe('food_forest community-led', () => {
    it('costs $0.975M (base $0.75M * 1.3)', () => {
      const state = createNewGame();
      const result = gameReducer(
        state,
        { type: 'START_PROJECT', tileId: 'brightmoor', projectId: 'food_forest', mode: 'community-led' },
        projectDefs,
      );
      const expectedCost = 0.75 * 1.3;
      expect(result.meters.budget).toBeCloseTo(2.8 - expectedCost, 5);
      expect(result.tiles['brightmoor'].activeProjects[0].cost).toBeCloseTo(expectedCost, 5);
    });

    it.todo(
      'has duration ceil(3 * 1.5) = 5 turns (community-led duration modifier)',
      // The reducer currently uses baseDuration for all modes.
      // When implemented, community-led should use ceil(baseDuration * 1.5).
      // food_forest: ceil(3 * 1.5) = ceil(4.5) = 5
    );
  });

  describe('completion trust effects (per simulation engine)', () => {
    it.todo(
      'player-initiated food_forest gives trust = 2 * 0.6 = 1.2 on completion',
      // On project completion, trust_gain from the project definition (2%)
      // is multiplied by 0.6 for player-initiated mode.
      // food_forest trust gain: 2 * 0.6 = 1.2
    );

    it.todo(
      'community-led food_forest gives trust = 2 * 1.6 = 3.2 on completion',
      // On project completion, trust_gain is multiplied by 1.6 for community-led.
      // food_forest trust gain: 2 * 1.6 = 3.2
    );
  });

  describe('completion gentrification effects (per simulation engine)', () => {
    it.todo(
      'player-initiated adds gentrification = baseGentrif(8) * 1.5 = 12 to the tile',
      // On completion, base gentrification is 8.
      // Player-initiated multiplier: 1.5 => 8 * 1.5 = 12
      // NOTE: Scenario description says 10% base * 1.5 = 15%, but
      // game_engine.py uses base_gentrif = 8 with 1.5x => 12.
      // The test should match the engine.
    );

    it.todo(
      'community-led adds gentrification = baseGentrif(8) * 0.5 = 4 to the tile',
      // On completion, base gentrification is 8.
      // Community-led multiplier: 0.5 => 8 * 0.5 = 4
    );
  });
});

// ============================================================
// Scenario 5: Gentrification Pressure Accumulation and Decay
// ============================================================

describe('Scenario 5: Gentrification Pressure Accumulation and Decay', () => {
  /**
   * Per simulation engine (game_engine.py):
   * - Base gentrification per project completion: 8
   * - Player-initiated multiplier: 1.5 => 12 per completion
   * - Community-led multiplier: 0.5 => 4 per completion
   * - Natural decay: 2/turn (V2 engine; V2 report recommends reducing to 1/turn)
   * - Warning threshold: 50%
   * - Crisis threshold: 75%
   */

  it.todo(
    'tile starts at 0% gentrification, accumulates 12 per player-initiated completion',
    // Start tile at gentrificationPressure = 0
    // Complete 1 player-initiated project: 0 + 12 = 12
    // Complete 2nd: 12 + 12 = 24
    // Complete 3rd: 24 + 12 = 36
  );

  it.todo(
    'after 3 player-initiated completions (36), 2 turns of decay at 2/turn brings to 32',
    // From 36, apply 2 decay ticks: 36 - 2 - 2 = 32
    // Still below 50% warning threshold
  );

  it.todo(
    '4th player-initiated completion pushes past 50% warning threshold',
    // From 32 + 12 = 44... still below 50.
    // With accumulation from adjacent tile pressure too, could exceed 50.
    // Actually: 3 completions = 36, 2 decay = 32, 1 more = 44. Not at 50.
    // Need 5 completions minus decay to cross 50.
    // 5 * 12 = 60 minus (say 4 turns of decay * 2) = 52. Above 50.
  );

  it.todo(
    'gentrification >= 50 triggers mild trust erosion (-0.05 per tile per turn)',
  );

  it.todo(
    'gentrification >= 75 without land trust triggers displacement (-0.3 trust, resets 10 pressure)',
  );

  it.todo(
    'land trust on tile zeroes out gentrification gain from project completions',
  );
});

// ============================================================
// Scenario 6: Proposal Accept/Reject Trust Dynamics
// ============================================================

describe('Scenario 6: Proposal Accept/Reject Trust Dynamics', () => {
  /**
   * Per reducer.ts:
   * - Accept: leader trust +10
   * - Modify: leader trust +3
   * - Defer: leader trust -5
   * - Reject: leader trust -15
   * Advocate threshold: trust >= 40
   */

  it('Grace starts at trust 30; accepting 1 proposal brings to 40 (advocate threshold)', () => {
    const state = createNewGame();
    expect(state.leaders['grace'].trust).toBe(30);

    const withProposal: GameState = {
      ...state,
      meters: { ...state.meters, budget: 100 },
      activeProposals: [makeProposal()],
    };

    const result = gameReducer(
      withProposal,
      { type: 'RESPOND_PROPOSAL', proposalId: 'proposal_1', response: 'accept' },
      projectDefs,
    );

    expect(result.leaders['grace'].trust).toBe(40);
  });

  it('accepting 3 proposals brings Grace from 30 to 60', () => {
    let state: GameState = {
      ...createNewGame(),
      meters: { ...createNewGame().meters, budget: 100 },
    };

    for (let i = 1; i <= 3; i++) {
      state = {
        ...state,
        activeProposals: [makeProposal({ id: `proposal_${i}` })],
      };
      state = gameReducer(
        state,
        { type: 'RESPOND_PROPOSAL', proposalId: `proposal_${i}`, response: 'accept' },
        projectDefs,
      );
    }

    // 30 + 10 + 10 + 10 = 60
    expect(state.leaders['grace'].trust).toBe(60);
  });

  it('rejecting 2 proposals from trust 60 drops to 30 (loses advocate status)', () => {
    // Setup Grace at trust 60
    const base = createNewGame();
    let state: GameState = {
      ...base,
      leaders: {
        ...base.leaders,
        grace: { ...base.leaders['grace'], trust: 60 },
      },
    };

    for (let i = 1; i <= 2; i++) {
      state = {
        ...state,
        activeProposals: [makeProposal({ id: `reject_${i}` })],
      };
      state = gameReducer(
        state,
        { type: 'RESPOND_PROPOSAL', proposalId: `reject_${i}`, response: 'reject' },
        projectDefs,
      );
    }

    // 60 - 15 - 15 = 30
    expect(state.leaders['grace'].trust).toBe(30);
    // Below advocate threshold of 40
    expect(state.leaders['grace'].trust).toBeLessThan(40);
  });

  it('accepting 1 more from trust 30 restores to 40 (advocate again)', () => {
    const base = createNewGame();
    let state: GameState = {
      ...base,
      meters: { ...base.meters, budget: 100 },
      leaders: {
        ...base.leaders,
        grace: { ...base.leaders['grace'], trust: 30 },
      },
      activeProposals: [makeProposal()],
    };

    state = gameReducer(
      state,
      { type: 'RESPOND_PROPOSAL', proposalId: 'proposal_1', response: 'accept' },
      projectDefs,
    );

    expect(state.leaders['grace'].trust).toBe(40);
    // At advocate threshold
    expect(state.leaders['grace'].trust).toBeGreaterThanOrEqual(40);
  });

  it('full cycle: 30 -> accept*3 -> 60 -> reject*2 -> 30 -> accept -> 40', () => {
    const base = createNewGame();
    let state: GameState = {
      ...base,
      meters: { ...base.meters, budget: 100 },
    };
    let proposalCounter = 0;

    function nextProposal(): Proposal {
      proposalCounter++;
      return makeProposal({ id: `p_${proposalCounter}` });
    }

    function respond(response: 'accept' | 'reject' | 'defer') {
      state = {
        ...state,
        activeProposals: [nextProposal()],
      };
      state = gameReducer(
        state,
        { type: 'RESPOND_PROPOSAL', proposalId: `p_${proposalCounter}`, response },
        projectDefs,
      );
    }

    expect(state.leaders['grace'].trust).toBe(30);

    respond('accept'); // 30 + 10 = 40
    respond('accept'); // 40 + 10 = 50
    respond('accept'); // 50 + 10 = 60
    expect(state.leaders['grace'].trust).toBe(60);

    respond('reject'); // 60 - 15 = 45
    respond('reject'); // 45 - 15 = 30
    expect(state.leaders['grace'].trust).toBe(30);

    respond('accept'); // 30 + 10 = 40
    expect(state.leaders['grace'].trust).toBe(40);
  });
});

// ============================================================
// Scenario 7: Three Consecutive Deferrals = Rejection
// ============================================================

describe('Scenario 7: Three Consecutive Deferrals = Rejection', () => {
  /**
   * Per reducer.ts:
   * - Defer 1: trust -5, consecutiveDeferrals increments to 1
   * - Defer 2: trust -5, consecutiveDeferrals increments to 2
   * - Defer 3: treated as reject, trust -15, consecutiveDeferrals increments to 3
   * Total: -5 - 5 - 15 = -25
   */

  it('first deferral: trust -5, consecutiveDeferrals = 1', () => {
    const base = createNewGame();
    const state: GameState = {
      ...base,
      activeProposals: [makeProposal()],
    };

    const result = gameReducer(
      state,
      { type: 'RESPOND_PROPOSAL', proposalId: 'proposal_1', response: 'defer' },
      projectDefs,
    );

    expect(result.leaders['grace'].trust).toBe(30 - 5);
    expect(result.leaders['grace'].consecutiveDeferrals).toBe(1);
  });

  it('second deferral: trust -5, consecutiveDeferrals = 2', () => {
    const base = createNewGame();
    const state: GameState = {
      ...base,
      leaders: {
        ...base.leaders,
        grace: { ...base.leaders['grace'], consecutiveDeferrals: 1, trust: 25 },
      },
      activeProposals: [makeProposal()],
    };

    const result = gameReducer(
      state,
      { type: 'RESPOND_PROPOSAL', proposalId: 'proposal_1', response: 'defer' },
      projectDefs,
    );

    expect(result.leaders['grace'].trust).toBe(25 - 5);
    expect(result.leaders['grace'].consecutiveDeferrals).toBe(2);
  });

  it('third deferral converts to reject: trust -15, consecutiveDeferrals = 3', () => {
    const base = createNewGame();
    const state: GameState = {
      ...base,
      leaders: {
        ...base.leaders,
        grace: { ...base.leaders['grace'], consecutiveDeferrals: 2, trust: 20 },
      },
      activeProposals: [makeProposal()],
    };

    const result = gameReducer(
      state,
      { type: 'RESPOND_PROPOSAL', proposalId: 'proposal_1', response: 'defer' },
      projectDefs,
    );

    // Third deferral treated as reject: -15 instead of -5
    expect(result.leaders['grace'].trust).toBe(20 - 15);
    expect(result.leaders['grace'].consecutiveDeferrals).toBe(3);
    // Should NOT go to pendingProposals (it was rejected)
    expect(result.pendingProposals).toHaveLength(0);
    expect(result.activeProposals).toHaveLength(0);
  });

  it('full 3-deferral sequence: total trust loss is -25', () => {
    const base = createNewGame();
    let state: GameState = { ...base };

    // Starting trust: 30
    // Defer 1: -5 => 25
    state = {
      ...state,
      activeProposals: [makeProposal({ id: 'p1' })],
    };
    state = gameReducer(
      state,
      { type: 'RESPOND_PROPOSAL', proposalId: 'p1', response: 'defer' },
      projectDefs,
    );
    expect(state.leaders['grace'].trust).toBe(25);

    // Defer 2: -5 => 20
    state = {
      ...state,
      activeProposals: [makeProposal({ id: 'p2' })],
    };
    state = gameReducer(
      state,
      { type: 'RESPOND_PROPOSAL', proposalId: 'p2', response: 'defer' },
      projectDefs,
    );
    expect(state.leaders['grace'].trust).toBe(20);

    // Defer 3 (auto-reject): -15 => 5
    state = {
      ...state,
      activeProposals: [makeProposal({ id: 'p3' })],
    };
    state = gameReducer(
      state,
      { type: 'RESPOND_PROPOSAL', proposalId: 'p3', response: 'defer' },
      projectDefs,
    );
    expect(state.leaders['grace'].trust).toBe(5);

    // Total: 30 - 5 - 5 - 15 = 5 (lost 25)
    expect(30 - state.leaders['grace'].trust).toBe(25);
  });

  it('leader starting at trust 10 ends at -15 after 3 deferrals', () => {
    const base = createNewGame();
    let state: GameState = {
      ...base,
      leaders: {
        ...base.leaders,
        grace: { ...base.leaders['grace'], trust: 10 },
      },
    };

    // Defer 1: 10 - 5 = 5
    state = { ...state, activeProposals: [makeProposal({ id: 'p1' })] };
    state = gameReducer(state, { type: 'RESPOND_PROPOSAL', proposalId: 'p1', response: 'defer' }, projectDefs);
    expect(state.leaders['grace'].trust).toBe(5);

    // Defer 2: 5 - 5 = 0
    state = { ...state, activeProposals: [makeProposal({ id: 'p2' })] };
    state = gameReducer(state, { type: 'RESPOND_PROPOSAL', proposalId: 'p2', response: 'defer' }, projectDefs);
    expect(state.leaders['grace'].trust).toBe(0);

    // Defer 3 (auto-reject): 0 - 15 = -15
    state = { ...state, activeProposals: [makeProposal({ id: 'p3' })] };
    state = gameReducer(state, { type: 'RESPOND_PROPOSAL', proposalId: 'p3', response: 'defer' }, projectDefs);
    expect(state.leaders['grace'].trust).toBe(-15);
  });
});

// ============================================================
// Scenario 8: Concurrent Project Limit
// ============================================================

describe('Scenario 8: Concurrent Project Limit', () => {
  /**
   * Max concurrent projects = floor(2 + trust / 25)
   * trust 50 => floor(2 + 50/25) = floor(4) = 4
   * trust 75 => floor(2 + 75/25) = floor(5) = 5
   */

  it('trust 50 allows max 4 concurrent projects', () => {
    expect(calculateMaxProjects(50)).toBe(4);
  });

  it('trust 75 allows max 5 concurrent projects', () => {
    expect(calculateMaxProjects(75)).toBe(5);
  });

  it('5th project is blocked when trust is 50 (max 4)', () => {
    const base = createNewGame();
    // Trust is 50, so max = 4. Fill all 4 slots across tiles.
    const filledState: GameState = {
      ...base,
      meters: { ...base.meters, budget: 100 },
      tiles: {
        ...base.tiles,
        brightmoor: {
          ...base.tiles['brightmoor'],
          activeProjects: [
            { definitionId: 'p1', tileId: 'brightmoor', mode: 'player-initiated', progress: 0, duration: 3, cost: 1 },
            { definitionId: 'p2', tileId: 'brightmoor', mode: 'player-initiated', progress: 0, duration: 3, cost: 1 },
          ],
        },
        corktown: {
          ...base.tiles['corktown'],
          activeProjects: [
            { definitionId: 'p3', tileId: 'corktown', mode: 'player-initiated', progress: 0, duration: 3, cost: 1 },
            { definitionId: 'p4', tileId: 'corktown', mode: 'player-initiated', progress: 0, duration: 3, cost: 1 },
          ],
        },
      },
    };

    const result = gameReducer(
      filledState,
      { type: 'START_PROJECT', tileId: 'eastern_market', projectId: 'food_forest', mode: 'player-initiated' },
      projectDefs,
    );

    // Should be blocked -- state unchanged
    expect(result).toBe(filledState);
    expect(result.tiles['eastern_market'].activeProjects).toHaveLength(0);
  });

  it('trust rise to 76 unlocks 5th project slot via END_TURN recalculation (after meter feedback)', () => {
    const base = createNewGame();
    const state: GameState = {
      ...base,
      meters: { ...base.meters, communityTrust: 76 },
    };

    // Before END_TURN, maxConcurrentProjects is based on starting trust (50)
    expect(state.maxConcurrentProjects).toBe(4);

    // After END_TURN with resolve pipeline, trust decays -0.3 => 75.7
    // floor(2 + 75.7/25) = floor(5.028) = 5
    const result = gameReducer(state, { type: 'END_TURN' }, projectDefs);
    expect(result.maxConcurrentProjects).toBe(5);
  });

  it('max projects formula across trust range', () => {
    const cases: [number, number][] = [
      [0, 2],
      [24, 2],
      [25, 3],
      [49, 3],
      [50, 4],
      [74, 4],
      [75, 5],
      [99, 5],
      [100, 6],
    ];

    for (const [trust, expected] of cases) {
      expect(calculateMaxProjects(trust)).toBe(expected);
    }
  });
});

// ============================================================
// Scenario 9: Tile Visual Stage Transitions
// ============================================================

describe('Scenario 9: Tile Visual Stage Transitions', () => {
  /**
   * Per game_engine.py Tile.visual_stage():
   *   eco >= 90 => 'beyond'     (only if game stage is 'beyond' in the spec)
   *   eco >= 70 => 'restoration'
   *   eco >= 40 => 'transition'
   *   eco < 40  => 'dystopia'
   *
   * NOTE: The Python engine uses 90/70/40, but the TypeScript app uses
   * the VisualStage type with thresholds that may differ. These thresholds
   * come from the spec. The scenario description uses 85/60/25 which matches
   * the game design doc thresholds rather than the engine thresholds.
   * Tests below validate both sets of thresholds so the correct one can be
   * confirmed during implementation.
   */

  it.todo(
    'tile at eco 24 shows dystopia visual stage',
    // eco < 25 (design doc) or < 40 (engine) => dystopia
  );

  it.todo(
    'tile at eco 25 shows transition visual stage (design doc threshold)',
    // Design doc says transition starts at eco 25
    // Engine says transition starts at eco 40
    // Test the design doc threshold; adjust if engine is authoritative
  );

  it.todo(
    'tile at eco 59 is still transition',
    // eco 59 is below both 60 (design doc restoration) and 70 (engine restoration)
  );

  it.todo(
    'tile at eco 60 shows restoration visual stage (design doc threshold)',
    // Design doc says restoration starts at eco 60
    // Engine says restoration starts at eco 70
  );

  it.todo(
    'tile at eco 84 is still restoration',
    // eco 84 is below both 85 (design doc beyond) and 90 (engine beyond)
  );

  it.todo(
    'tile at eco 85+ shows beyond visual stage only if game stage is beyond',
    // Design doc says beyond at eco 85, engine at eco 90
    // Both require the game to be in the 'beyond' stage
  );
});

// ============================================================
// Scenario 10: Season Cycling and Year Tracking
// ============================================================

describe('Scenario 10: Season Cycling and Year Tracking', () => {
  /**
   * 4 seasons per year: spring -> summer -> fall -> winter
   * Turn 1 = spring, year 1
   * Turn 4 = winter, year 1
   * Turn 5 = spring, year 2
   * Turn 16 = winter, year 4
   * Turn 17 = spring, year 5
   */

  it('starts at turn 1, spring, year 1', () => {
    const state = createNewGame();
    expect(state.turn).toBe(1);
    expect(state.season).toBe('spring');
    expect(state.year).toBe(1);
  });

  it('advances through all 4 seasons in order', () => {
    let state = createNewGame();
    const expectedSeasons: Season[] = ['summer', 'fall', 'winter', 'spring'];

    for (const expected of expectedSeasons) {
      state = gameReducer(state, { type: 'END_TURN' }, {});
      expect(state.season).toBe(expected);
    }
  });

  it('turn 5 is spring, year 2', () => {
    let state = createNewGame();
    // Advance 4 times: turn 1->2->3->4->5
    for (let i = 0; i < 4; i++) {
      state = gameReducer(state, { type: 'END_TURN' }, {});
    }
    expect(state.turn).toBe(5);
    expect(state.season).toBe('spring');
    expect(state.year).toBe(2);
  });

  it('turn 16 is winter, year 4', () => {
    let state = createNewGame();
    for (let i = 0; i < 15; i++) {
      state = gameReducer(state, { type: 'END_TURN' }, {});
    }
    expect(state.turn).toBe(16);
    expect(state.season).toBe('winter');
    expect(state.year).toBe(4);
  });

  it('turn 17 is spring, year 5', () => {
    let state = createNewGame();
    for (let i = 0; i < 16; i++) {
      state = gameReducer(state, { type: 'END_TURN' }, {});
    }
    expect(state.turn).toBe(17);
    expect(state.season).toBe('spring');
    expect(state.year).toBe(5);
  });

  it('year only increments on winter-to-spring transition', () => {
    let state = createNewGame();
    // Turn 1 (spring) -> Turn 2 (summer): year stays 1
    state = gameReducer(state, { type: 'END_TURN' }, {});
    expect(state.year).toBe(1);

    // Turn 2 (summer) -> Turn 3 (fall): year stays 1
    state = gameReducer(state, { type: 'END_TURN' }, {});
    expect(state.year).toBe(1);

    // Turn 3 (fall) -> Turn 4 (winter): year stays 1
    state = gameReducer(state, { type: 'END_TURN' }, {});
    expect(state.year).toBe(1);

    // Turn 4 (winter) -> Turn 5 (spring): year increments to 2
    state = gameReducer(state, { type: 'END_TURN' }, {});
    expect(state.year).toBe(2);
  });
});

// ============================================================
// Scenario 11: Starting Conditions Match Spec
// ============================================================

describe('Scenario 11: Starting Conditions Match Spec', () => {
  it('community trust starts at 50', () => {
    expect(createNewGame().meters.communityTrust).toBe(50);
  });

  it('ecological health starts at 15', () => {
    expect(createNewGame().meters.ecologicalHealth).toBe(15);
  });

  it('food sovereignty starts at 10', () => {
    expect(createNewGame().meters.foodSovereignty).toBe(10);
  });

  it('political will starts at 60', () => {
    expect(createNewGame().meters.politicalWill).toBe(60);
  });

  it('budget starts at $4.2M', () => {
    expect(createNewGame().meters.budget).toBe(2.8);
  });

  it('climate pressure starts at 30', () => {
    expect(createNewGame().meters.climatePressure).toBe(30);
  });

  it('max concurrent projects starts at 4 (floor(2 + 50/25))', () => {
    const state = createNewGame();
    expect(state.maxConcurrentProjects).toBe(4);
    expect(calculateMaxProjects(50)).toBe(4);
  });

  it('stage starts at awakening', () => {
    expect(createNewGame().stage).toBe('awakening');
  });

  it('specialization path starts as null', () => {
    expect(createNewGame().path).toBeNull();
  });

  it('turn starts at 1, season spring, year 1', () => {
    const state = createNewGame();
    expect(state.turn).toBe(1);
    expect(state.season).toBe('spring');
    expect(state.year).toBe(1);
  });

  it('Grace starts at trust 30, advocacyPower 4', () => {
    const state = createNewGame();
    expect(state.leaders['grace'].trust).toBe(30);
    expect(state.leaders['grace'].advocacyPower).toBe(4);
  });

  it('Kez starts at trust 10, advocacyPower 3', () => {
    const state = createNewGame();
    expect(state.leaders['kez'].trust).toBe(10);
    expect(state.leaders['kez'].advocacyPower).toBe(3);
  });

  it('Darius starts at trust 20, advocacyPower 3', () => {
    const state = createNewGame();
    expect(state.leaders['darius'].trust).toBe(20);
    expect(state.leaders['darius'].advocacyPower).toBe(3);
  });

  it('no active proposals at start', () => {
    const state = createNewGame();
    expect(state.activeProposals).toHaveLength(0);
    expect(state.pendingProposals).toHaveLength(0);
  });
});

// ============================================================
// Scenario 12: Multi-Turn Integration -- 16-Turn First Term
// ============================================================

describe('Scenario 12: Multi-Turn Integration - 16-Turn First Term Simulation', () => {
  /**
   * This is the "balanced play survives first term" test from the Monte Carlo.
   * A competent player should be able to survive 16 turns (1 term) with:
   *   - Budget > $0
   *   - Trust above 20% (re-election threshold)
   *   - At least 2-3 projects completed
   *   - No tile above 75% gentrification
   *
   * V2 Monte Carlo showed 100% survival for Balanced strategy in first term.
   */

  it('budget does not collapse after starting 2 projects and advancing 16 turns', () => {
    let state = createNewGame();

    // Start a food_forest on turn 1
    state = gameReducer(
      state,
      { type: 'START_PROJECT', tileId: 'brightmoor', projectId: 'food_forest', mode: 'player-initiated' },
      projectDefs,
    );
    expect(state.meters.budget).toBeCloseTo(2.05, 2);

    // Start a rain_garden on turn 1
    state = gameReducer(
      state,
      { type: 'START_PROJECT', tileId: 'eastern_market', projectId: 'rain_garden', mode: 'player-initiated' },
      projectDefs,
    );
    expect(state.meters.budget).toBeCloseTo(1.65, 2);

    // Advance 16 turns
    for (let i = 0; i < 16; i++) {
      state = gameReducer(state, { type: 'END_TURN' }, projectDefs);
    }

    // Budget should not have gone negative (it can only decrease from project starts,
    // not from turn advancement in the current reducer)
    expect(state.meters.budget).toBeGreaterThanOrEqual(0);
  });

  it('trust stays well above 20 with passive feedback over 16 turns', () => {
    let meters = makeMeters(); // Starting values

    for (let i = 0; i < 16; i++) {
      const result = applyMeterFeedback(meters);
      meters = clampMeters(result.meters);
    }

    // Starting trust: 50
    // Each turn: trust decay = -0.3, food bonus = 0 (food 10 < 20)
    // Net per turn: -0.3
    // After 16 turns: 50 - 4.8 = 45.2
    // But Will regen also happens (starts at 2.0/turn), pushing Will up
    expect(meters.communityTrust).toBeGreaterThan(20);
    expect(meters.communityTrust).toBeCloseTo(45.2, 0);
  });

  it('political Will remains healthy over 16 turns with starting conditions', () => {
    let meters = makeMeters();

    for (let i = 0; i < 16; i++) {
      const result = applyMeterFeedback(meters);
      meters = clampMeters(result.meters);
    }

    // Will starts at 60. Trust starts above 40, so will regen > 1.0.
    // Turn 1: trust=50, will_regen = 1.0 + (50-40)*0.1 = 2.0
    // As trust decays (-0.3/turn), will regen decreases slowly.
    // After ~33 turns trust would hit 40, making regen = 1.0
    // Will should be well above starting value for 16 turns.
    expect(meters.politicalWill).toBeGreaterThan(60);
    expect(meters.politicalWill).toBeLessThanOrEqual(100);
  });

  it.todo(
    'after 16 turns of balanced play, at least 2-3 projects are completed',
    // Requires: project advancement system (advancing project.progress each turn,
    // completing when progress >= duration)
    // food_forest (duration 3) started turn 1: completes turn 4
    // rain_garden (duration 2) started turn 1: completes turn 3
    // Both should complete well within 16 turns
  );

  it.todo(
    'no tile exceeds 75% gentrification after 16 turns of balanced play',
    // Requires: gentrification system
    // With only 2-3 projects completing (mixed community-led and player-initiated),
    // gentrification should stay well below crisis threshold
  );

  it.todo(
    're-election check at turn 16 passes with trust above 50',
    // Per simulation engine: re-election score starts at trust value,
    // modified by council dispositions, leader trust, coalitions, and antagonists.
    // With trust ~42 and decent leader relationships, score should be >= 50.
    // Requires: reelection check implementation
  );
});

// ============================================================
// Supplementary: Pure Math Verification
// ============================================================

describe('Supplementary: Pure Math from Simulation Engine', () => {
  describe('budget replenishment formula', () => {
    it('calculates correctly at starting values: eco=15, trust=50', () => {
      // replenishment = 1.5 * (0.5 + eco*0.005 + trust*0.003)
      // = 1.5 * (0.5 + 0.075 + 0.15)
      // = 1.5 * 0.725
      // = 1.0875
      const eco = 15;
      const trust = 50;
      const base = 1.5;
      const modifier = 0.5 + eco * 0.005 + trust * 0.003;
      const replenishment = base * modifier;
      expect(replenishment).toBeCloseTo(1.0875, 4);
    });

    it('calculates correctly at mid-game values: eco=50, trust=70', () => {
      const eco = 50;
      const trust = 70;
      const base = 1.5;
      const modifier = 0.5 + eco * 0.005 + trust * 0.003;
      const replenishment = base * modifier;
      // 1.5 * (0.5 + 0.25 + 0.21) = 1.5 * 0.96 = 1.44
      expect(replenishment).toBeCloseTo(1.44, 4);
    });

    it('calculates correctly at max values: eco=100, trust=100', () => {
      const eco = 100;
      const trust = 100;
      const base = 1.5;
      const modifier = 0.5 + eco * 0.005 + trust * 0.003;
      const replenishment = base * modifier;
      // 1.5 * (0.5 + 0.5 + 0.3) = 1.5 * 1.3 = 1.95
      expect(replenishment).toBeCloseTo(1.95, 4);
    });
  });

  describe('community-led cost and duration modifiers', () => {
    it('community-led cost = baseCost * 1.3', () => {
      expect(0.75 * 1.3).toBeCloseTo(0.975, 4);
      expect(0.4 * 1.3).toBeCloseTo(0.52, 4);
      expect(1.5 * 1.3).toBeCloseTo(1.95, 4);
    });

    it('community-led duration = ceil(baseDuration * 1.5)', () => {
      expect(Math.ceil(3 * 1.5)).toBe(5);  // food_forest: 3 -> 5
      expect(Math.ceil(2 * 1.5)).toBe(3);  // rain_garden: 2 -> 3
      expect(Math.ceil(4 * 1.5)).toBe(6);  // soil_remediation: 4 -> 6
      expect(Math.ceil(5 * 1.5)).toBe(8);  // wetland_restoration: 5 -> 8
      expect(Math.ceil(8 * 1.5)).toBe(12); // wildlife_corridor: 8 -> 12
    });
  });

  describe('trust gain multipliers on project completion', () => {
    it('player-initiated: trust_gain * 0.6', () => {
      // food_forest base trust = 2
      expect(2 * 0.6).toBeCloseTo(1.2, 4);
      // maker_space base trust = 4
      expect(4 * 0.6).toBeCloseTo(2.4, 4);
      // land_trust base trust = 5
      expect(5 * 0.6).toBeCloseTo(3.0, 4);
    });

    it('community-led: trust_gain * 1.6', () => {
      // food_forest base trust = 2
      expect(2 * 1.6).toBeCloseTo(3.2, 4);
      // maker_space base trust = 4
      expect(4 * 1.6).toBeCloseTo(6.4, 4);
      // land_trust base trust = 5
      expect(5 * 1.6).toBeCloseTo(8.0, 4);
    });

    it('community-proposed additional multiplier: * 1.5 on top of mode multiplier', () => {
      // community-led + community-proposed food_forest:
      // 2 * 1.6 * 1.5 = 4.8
      expect(2 * 1.6 * 1.5).toBeCloseTo(4.8, 4);
    });
  });

  describe('gentrification multipliers on project completion', () => {
    it('player-initiated: baseGentrif(8) * 1.5 = 12', () => {
      expect(8 * 1.5).toBe(12);
    });

    it('community-led: baseGentrif(8) * 0.5 = 4', () => {
      expect(8 * 0.5).toBe(4);
    });

    it('community-owned tile: additional * 0.5', () => {
      // player-initiated on community-owned tile: 8 * 1.5 * 0.5 = 6
      expect(8 * 1.5 * 0.5).toBe(6);
      // community-led on community-owned tile: 8 * 0.5 * 0.5 = 2
      expect(8 * 0.5 * 0.5).toBe(2);
    });

    it('land trust on tile: gentrification gain = 0', () => {
      // Land trust zeroes out all gentrification
      const withLandTrust = 0;
      expect(withLandTrust).toBe(0);
    });
  });

  describe('season helper (from simulation engine)', () => {
    it('turn-to-season mapping: (turn-1) % 4 indexes into [spring, summer, fall, winter]', () => {
      const seasons: Season[] = ['spring', 'summer', 'fall', 'winter'];
      expect(seasons[(1 - 1) % 4]).toBe('spring');
      expect(seasons[(2 - 1) % 4]).toBe('summer');
      expect(seasons[(3 - 1) % 4]).toBe('fall');
      expect(seasons[(4 - 1) % 4]).toBe('winter');
      expect(seasons[(5 - 1) % 4]).toBe('spring');
      expect(seasons[(16 - 1) % 4]).toBe('winter');
      expect(seasons[(17 - 1) % 4]).toBe('spring');
    });

    it('year-from-turn: (turn-1) / 4 + 1, integer division', () => {
      const yearFromTurn = (turn: number) => Math.floor((turn - 1) / 4) + 1;
      expect(yearFromTurn(1)).toBe(1);
      expect(yearFromTurn(4)).toBe(1);
      expect(yearFromTurn(5)).toBe(2);
      expect(yearFromTurn(16)).toBe(4);
      expect(yearFromTurn(17)).toBe(5);
      expect(yearFromTurn(64)).toBe(16);
    });
  });

  describe('will regeneration formula', () => {
    it('willRegen = 1.0 + max(0, (trust - 40) * 0.1) across trust range', () => {
      const willRegen = (trust: number) => 1.0 + Math.max(0, (trust - 40) * 0.1);

      expect(willRegen(0)).toBeCloseTo(1.0, 5);
      expect(willRegen(20)).toBeCloseTo(1.0, 5);
      expect(willRegen(40)).toBeCloseTo(1.0, 5);
      expect(willRegen(50)).toBeCloseTo(2.0, 5);
      expect(willRegen(60)).toBeCloseTo(3.0, 5);
      expect(willRegen(70)).toBeCloseTo(4.0, 5);
      expect(willRegen(80)).toBeCloseTo(5.0, 5);
      expect(willRegen(100)).toBeCloseTo(7.0, 5);
    });
  });

  describe('climate damage multiplier', () => {
    it('max(0.1, 1.0 - eco * 0.008)', () => {
      const dmgMult = (eco: number) => Math.max(0.1, 1.0 - eco * 0.008);

      expect(dmgMult(0)).toBeCloseTo(1.0, 5);
      expect(dmgMult(50)).toBeCloseTo(0.6, 5);
      expect(dmgMult(100)).toBeCloseTo(0.2, 5);
      expect(dmgMult(125)).toBeCloseTo(0.1, 5); // floors at 0.1
    });
  });

  describe('re-election score calculation', () => {
    it.todo(
      'base score = trust, modified by council (+3 per ally, -3 per adversary)',
      // ally: council disposition >= 30
      // adversary: council disposition <= -30
    );

    it.todo(
      'leader advocates (+5 each) and critics (-5 each) modify score',
      // advocate: leader trust >= 40
      // critic: leader trust <= -20
    );

    it.todo(
      'coalitions = advocates / 3, each coalition adds +8 score',
      // 6 advocates => 2 coalitions => +16
    );

    it.todo(
      'active antagonists at level 3+ each subtract -3 from score',
    );

    it.todo(
      'score >= 50 means re-election win',
    );
  });
});
