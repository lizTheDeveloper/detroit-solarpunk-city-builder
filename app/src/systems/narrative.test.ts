import { describe, it, expect } from 'vitest';
import type { GameState, PublicOpinion, NarrativeState, CounterNarrative } from '../state/types';
import { createNewGame } from '../state/create-game';
import {
  calculateActionsPerTurn,
  getBaseActionValues,
  calculateCompoundingBonus,
  applyNarrativeAction,
  applyOpinionDrift,
  generateCounterNarrative,
  applyCounterNarrative,
  resetNarrativeActions,
} from './narrative';

function makeTestState(overrides?: Partial<GameState>): GameState {
  const base = createNewGame();
  return { ...base, ...overrides };
}

describe('calculateActionsPerTurn', () => {
  it('returns 1 at trust 0', () => {
    expect(calculateActionsPerTurn(0)).toBe(1);
  });

  it('returns 1 at trust 29', () => {
    expect(calculateActionsPerTurn(29)).toBe(1);
  });

  it('returns 2 at trust 30', () => {
    expect(calculateActionsPerTurn(30)).toBe(2);
  });

  it('returns 3 at trust 60', () => {
    expect(calculateActionsPerTurn(60)).toBe(3);
  });

  it('returns 4 at trust 90', () => {
    expect(calculateActionsPerTurn(90)).toBe(4);
  });

  it('caps at 4 for trust above 90', () => {
    expect(calculateActionsPerTurn(120)).toBe(4);
  });
});

describe('getBaseActionValues', () => {
  it('community_meeting: will 0.33, trust 0.5, policy 0, opinion 0', () => {
    const v = getBaseActionValues('community_meeting');
    expect(v).toEqual({ willGain: 0.33, trustGain: 0.5, policyThresholdReduction: 0, opinionGain: 0 });
  });

  it('media_campaign: will 0.33, trust 0, policy 0.01, opinion 0', () => {
    const v = getBaseActionValues('media_campaign');
    expect(v).toEqual({ willGain: 0.33, trustGain: 0, policyThresholdReduction: 0.01, opinionGain: 0 });
  });

  it('education_program: will 0.17, trust 0, policy 0, opinion 0.67', () => {
    const v = getBaseActionValues('education_program');
    expect(v).toEqual({ willGain: 0.17, trustGain: 0, policyThresholdReduction: 0, opinionGain: 0.67 });
  });

  it('cultural_event: will 0.33, trust 0.5, policy 0, opinion 0', () => {
    const v = getBaseActionValues('cultural_event');
    expect(v).toEqual({ willGain: 0.33, trustGain: 0.5, policyThresholdReduction: 0, opinionGain: 0 });
  });

  it('demonstration: will 2.0, trust -0.5, policy 0, opinion 0', () => {
    const v = getBaseActionValues('demonstration');
    expect(v).toEqual({ willGain: 2.0, trustGain: -0.5, policyThresholdReduction: 0, opinionGain: 0 });
  });

  it('direct_engagement: all zeros', () => {
    const v = getBaseActionValues('direct_engagement');
    expect(v).toEqual({ willGain: 0, trustGain: 0, policyThresholdReduction: 0, opinionGain: 0 });
  });

  it('lobbying: will 0.5, trust -0.33, policy 0.02, opinion 0', () => {
    const v = getBaseActionValues('lobbying');
    expect(v).toEqual({ willGain: 0.5, trustGain: -0.33, policyThresholdReduction: 0.02, opinionGain: 0 });
  });
});

describe('calculateCompoundingBonus', () => {
  it('returns 0 for 0 consecutive turns', () => {
    expect(calculateCompoundingBonus(0)).toBe(0);
  });

  it('returns 0.05 for 1 consecutive turn', () => {
    expect(calculateCompoundingBonus(1)).toBe(0.05);
  });

  it('returns 0.10 for 2 consecutive turns', () => {
    expect(calculateCompoundingBonus(2)).toBeCloseTo(0.10);
  });

  it('returns 0.15 for 3 consecutive turns', () => {
    expect(calculateCompoundingBonus(3)).toBeCloseTo(0.15);
  });

  it('caps at 0.25 for 5 consecutive turns', () => {
    expect(calculateCompoundingBonus(5)).toBe(0.25);
  });

  it('caps at 0.25 for 10 consecutive turns', () => {
    expect(calculateCompoundingBonus(10)).toBe(0.25);
  });
});

describe('applyNarrativeAction', () => {
  it('deducts actionsRemaining by 1', () => {
    const state = makeTestState();
    state.narrativeState.actionsRemaining = 2;
    const result = applyNarrativeAction(state, 'community_meeting', 'foodSovereignty', 'brightmoor');
    expect(result.state.narrativeState.actionsRemaining).toBe(1);
  });

  it('throws when actionsRemaining is 0', () => {
    const state = makeTestState();
    state.narrativeState.actionsRemaining = 0;
    expect(() => applyNarrativeAction(state, 'community_meeting', 'foodSovereignty', 'brightmoor'))
      .toThrow();
  });

  it('compounding applies correctly to media campaign values', () => {
    const state = makeTestState();
    state.narrativeState.actionsRemaining = 2;
    // Set consecutive turns on the same topic to 2 (bonus = 0.10)
    state.narrativeState.consecutiveTurns = { foodSovereignty: 2 };
    const result = applyNarrativeAction(state, 'media_campaign', 'foodSovereignty', 'brightmoor');

    // base willGain = 0.33, compounding = 1 + 0.10 = 1.10
    // effective willGain = 0.33 * 1.10 = 0.363
    const willDelta = result.deltas.find(d => d.meter === 'politicalWill');
    expect(willDelta).toBeDefined();
    expect(willDelta!.amount).toBeCloseTo(0.363);
  });

  it('increments consecutiveTurns for the targeted topic', () => {
    const state = makeTestState();
    state.narrativeState.actionsRemaining = 2;
    state.narrativeState.consecutiveTurns = { foodSovereignty: 1 };
    const result = applyNarrativeAction(state, 'community_meeting', 'foodSovereignty', 'brightmoor');
    expect(result.state.narrativeState.consecutiveTurns['foodSovereignty']).toBe(2);
  });

  it('does not reset consecutive turns for other topics within a turn', () => {
    const state = makeTestState();
    state.narrativeState.actionsRemaining = 2;
    state.narrativeState.consecutiveTurns = { foodSovereignty: 3, waterCommons: 2 };
    const result = applyNarrativeAction(state, 'community_meeting', 'foodSovereignty', 'brightmoor');
    // Other topic should remain unchanged during action
    expect(result.state.narrativeState.consecutiveTurns['waterCommons']).toBe(2);
  });

  it('education_program increases public opinion on topic', () => {
    const state = makeTestState();
    state.narrativeState.actionsRemaining = 2;
    state.narrativeState.consecutiveTurns = {};
    state.publicOpinion.foodSovereignty = 15;
    const result = applyNarrativeAction(state, 'education_program', 'foodSovereignty', 'brightmoor');
    // base opinionGain = 0.67, compounding = 0 (0 consecutive), effective = 0.67 * 1.0 = 0.67
    expect(result.state.publicOpinion.foodSovereignty).toBeCloseTo(15.67);
  });

  it('demonstration gains Will but costs Trust', () => {
    const state = makeTestState();
    state.narrativeState.actionsRemaining = 1;
    state.meters.politicalWill = 60;
    state.meters.communityTrust = 50;
    const result = applyNarrativeAction(state, 'demonstration', 'landReform', 'corktown');

    const willDelta = result.deltas.find(d => d.meter === 'politicalWill');
    const trustDelta = result.deltas.find(d => d.meter === 'communityTrust');
    expect(willDelta).toBeDefined();
    expect(willDelta!.amount).toBeGreaterThan(0);
    expect(trustDelta).toBeDefined();
    expect(trustDelta!.amount).toBeLessThan(0);

    expect(result.state.meters.politicalWill).toBeGreaterThan(60);
    expect(result.state.meters.communityTrust).toBeLessThan(50);
  });
});

describe('applyOpinionDrift', () => {
  it('reduces opinion by 0.67 per turn of neglect', () => {
    const opinion: PublicOpinion = {
      foodSovereignty: 20,
      waterCommons: 15,
      landReform: 12,
      ecologicalRestoration: 25,
      cooperativeEconomics: 18,
    };
    const narrativeState: NarrativeState = {
      actionsRemaining: 0,
      actionsPerTurn: 2,
      consecutiveTurns: {},
      counterNarrativeCooldowns: {},
    };
    const drifted = applyOpinionDrift(opinion, narrativeState);
    expect(drifted.foodSovereignty).toBeCloseTo(19.33, 1);
    expect(drifted.waterCommons).toBeCloseTo(14.33, 1);
    expect(drifted.landReform).toBeCloseTo(11.33, 1);
    expect(drifted.ecologicalRestoration).toBeCloseTo(24.33, 1);
    expect(drifted.cooperativeEconomics).toBeCloseTo(17.33, 1);
  });

  it('does not drift below starting values', () => {
    const opinion: PublicOpinion = {
      foodSovereignty: 15,     // at floor
      waterCommons: 10,        // at floor
      landReform: 8,           // at floor
      ecologicalRestoration: 20, // at floor
      cooperativeEconomics: 12,  // at floor
    };
    const narrativeState: NarrativeState = {
      actionsRemaining: 0,
      actionsPerTurn: 2,
      consecutiveTurns: {},
      counterNarrativeCooldowns: {},
    };
    const drifted = applyOpinionDrift(opinion, narrativeState);
    expect(drifted.foodSovereignty).toBe(15);
    expect(drifted.waterCommons).toBe(10);
    expect(drifted.landReform).toBe(8);
    expect(drifted.ecologicalRestoration).toBe(20);
    expect(drifted.cooperativeEconomics).toBe(12);
  });

  it('does not drift topics that had consecutive turns > 0', () => {
    const opinion: PublicOpinion = {
      foodSovereignty: 25,
      waterCommons: 15,
      landReform: 12,
      ecologicalRestoration: 25,
      cooperativeEconomics: 18,
    };
    const narrativeState: NarrativeState = {
      actionsRemaining: 0,
      actionsPerTurn: 2,
      consecutiveTurns: { foodSovereignty: 1 },
      counterNarrativeCooldowns: {},
    };
    const drifted = applyOpinionDrift(opinion, narrativeState);
    // foodSovereignty had action, should not drift
    expect(drifted.foodSovereignty).toBe(25);
    // others should drift by 0.67
    expect(drifted.waterCommons).toBeCloseTo(14.33, 1);
  });
});

describe('generateCounterNarrative', () => {
  it('generates corporate_media first with rng always returning 0.01', () => {
    const state = makeTestState();
    const counter = generateCounterNarrative(state, () => 0.01);
    expect(counter).not.toBeNull();
    expect(counter!.type).toBe('corporate_media');
  });

  it('generates nothing when rng always returns 0.99', () => {
    const state = makeTestState();
    const counter = generateCounterNarrative(state, () => 0.99);
    expect(counter).toBeNull();
  });

  it('developer_lobbying only triggers when land_reform policy enacted', () => {
    const state = makeTestState();
    state.activePolicies = [];
    // rng that would hit corporate_media (0.08) but not developer_lobbying
    // We need to skip corporate_media and test developer_lobbying
    let callCount = 0;
    const rng = () => {
      callCount++;
      if (callCount === 1) return 0.99; // miss corporate_media
      return 0.01; // hit everything else
    };
    // No land_reform policy, developer_lobbying should be skipped
    const counter = generateCounterNarrative(state, rng);
    // Should not be developer_lobbying
    if (counter) {
      expect(counter.type).not.toBe('developer_lobbying');
    }
  });

  it('developer_lobbying triggers when land_reform policy is enacted', () => {
    const state = makeTestState();
    state.activePolicies = [{ definitionId: 'land_reform', enactedTurn: 1 }];
    let callCount = 0;
    const rng = () => {
      callCount++;
      if (callCount === 1) return 0.99; // miss corporate_media
      return 0.01; // hit developer_lobbying
    };
    const counter = generateCounterNarrative(state, rng);
    expect(counter).not.toBeNull();
    expect(counter!.type).toBe('developer_lobbying');
  });

  it('state_legislature only triggers with 3+ policies enacted', () => {
    const state = makeTestState();
    state.activePolicies = [{ definitionId: 'a', enactedTurn: 1 }]; // only 1
    let callCount = 0;
    const rng = () => {
      callCount++;
      // miss corporate_media and developer_lobbying (no land_reform)
      if (callCount <= 2) return 0.99;
      return 0.01; // hit state_legislature if eligible
    };
    const counter = generateCounterNarrative(state, rng);
    // Should not be state_legislature with < 3 policies
    if (counter) {
      expect(counter.type).not.toBe('state_legislature');
    }
  });

  it('state_legislature triggers with 3+ policies', () => {
    const state = makeTestState();
    state.activePolicies = [
      { definitionId: 'a', enactedTurn: 1 },
      { definitionId: 'b', enactedTurn: 2 },
      { definitionId: 'c', enactedTurn: 3 },
    ];
    let callCount = 0;
    const rng = () => {
      callCount++;
      // Eligible order: corporate_media(1), developer_lobbying skipped (no land_reform),
      // state_legislature(2). Miss #1, hit #2.
      if (callCount <= 1) return 0.99;
      return 0.01;
    };
    const counter = generateCounterNarrative(state, rng);
    expect(counter).not.toBeNull();
    expect(counter!.type).toBe('state_legislature');
  });

  it('federal_intervention only triggers at restoration stage+', () => {
    const state = makeTestState();
    state.stage = 'awakening';
    state.activePolicies = [
      { definitionId: 'a', enactedTurn: 1 },
      { definitionId: 'b', enactedTurn: 2 },
      { definitionId: 'c', enactedTurn: 3 },
    ];
    let callCount = 0;
    const rng = () => {
      callCount++;
      // miss corporate_media, skip developer_lobbying, miss state_legislature
      if (callCount <= 3) return 0.99;
      return 0.01;
    };
    const counter = generateCounterNarrative(state, rng);
    // Should not be federal_intervention in awakening
    if (counter) {
      expect(counter.type).not.toBe('federal_intervention');
    }
  });

  it('federal_intervention triggers at restoration stage', () => {
    const state = makeTestState();
    state.stage = 'restoration';
    state.activePolicies = [
      { definitionId: 'a', enactedTurn: 1 },
      { definitionId: 'b', enactedTurn: 2 },
      { definitionId: 'c', enactedTurn: 3 },
    ];
    let callCount = 0;
    const rng = () => {
      callCount++;
      // Eligible order: corporate_media(1), developer_lobbying skipped (no land_reform),
      // state_legislature(2), federal_intervention(3). Miss 1-2, hit 3.
      if (callCount <= 2) return 0.99;
      return 0.01;
    };
    const counter = generateCounterNarrative(state, rng);
    expect(counter).not.toBeNull();
    expect(counter!.type).toBe('federal_intervention');
  });

  it('nimbyism only triggers with 3+ concurrent projects', () => {
    const state = makeTestState();
    state.stage = 'awakening';
    // No active projects (0 concurrent)
    let callCount = 0;
    const rng = () => {
      callCount++;
      // miss first 4 eligible types
      if (callCount <= 4) return 0.99;
      return 0.01;
    };
    const counter = generateCounterNarrative(state, rng);
    // nimbyism should not trigger with < 3 projects
    if (counter) {
      expect(counter.type).not.toBe('nimbyism');
    }
  });

  it('nimbyism triggers with 3+ concurrent projects', () => {
    const state = makeTestState();
    state.stage = 'awakening';
    // Add 3 active projects across tiles
    const project = { definitionId: 'x', tileId: 'brightmoor', mode: 'player-initiated' as const, progress: 0, duration: 4, cost: 1 };
    state.tiles['brightmoor'].activeProjects = [project, { ...project, definitionId: 'y' }];
    state.tiles['corktown'].activeProjects = [{ ...project, tileId: 'corktown', definitionId: 'z' }];
    let callCount = 0;
    const rng = () => {
      callCount++;
      // Eligible (awakening, 0 policies): corporate_media(1), astroturf_campaign(2), nimbyism(3)
      // developer_lobbying skipped (no land_reform), state_legislature skipped (<3 policies),
      // federal_intervention skipped (not restoration+). Miss 1-2, hit 3.
      if (callCount <= 2) return 0.99;
      return 0.01;
    };
    const counter = generateCounterNarrative(state, rng);
    expect(counter).not.toBeNull();
    expect(counter!.type).toBe('nimbyism');
  });
});

describe('applyCounterNarrative', () => {
  it('reduces politicalWill (Will) by the willDrain amount', () => {
    const state = makeTestState();
    state.meters.politicalWill = 60;
    const counter: CounterNarrative = {
      type: 'corporate_media',
      willDrain: -3.5,
      otherEffect: '-2% highest opinion',
      probability: 0.05,
      trigger: null,
    };
    const result = applyCounterNarrative(state, counter);
    const willDelta = result.deltas.find(d => d.meter === 'politicalWill');
    expect(willDelta).toBeDefined();
    expect(willDelta!.amount).toBeCloseTo(-3.5);
    expect(result.state.meters.politicalWill).toBeCloseTo(56.5);
  });

  it('astroturf_campaign reduces trust', () => {
    const state = makeTestState();
    state.meters.politicalWill = 60;
    state.meters.communityTrust = 50;
    const counter: CounterNarrative = {
      type: 'astroturf_campaign',
      willDrain: -2.0,
      otherEffect: '-3% Trust',
      probability: 0.045,
      trigger: null,
    };
    const result = applyCounterNarrative(state, counter);
    const trustDelta = result.deltas.find(d => d.meter === 'communityTrust');
    expect(trustDelta).toBeDefined();
    expect(trustDelta!.amount).toBeCloseTo(-3.0);
  });
});

describe('resetNarrativeActions', () => {
  it('resets actionsRemaining based on trust', () => {
    const state = makeTestState();
    state.meters.communityTrust = 60;
    state.narrativeState.actionsRemaining = 0;
    const result = resetNarrativeActions(state);
    expect(result.narrativeState.actionsRemaining).toBe(3);
    expect(result.narrativeState.actionsPerTurn).toBe(3);
  });

  it('resets consecutive turns for topics not targeted this turn', () => {
    const state = makeTestState();
    state.meters.communityTrust = 50;
    // foodSovereignty was targeted (has count), waterCommons was not (will be reset)
    state.narrativeState.consecutiveTurns = { foodSovereignty: 3, waterCommons: 0 };
    const result = resetNarrativeActions(state);
    // Topics with 0 consecutive turns should be removed/reset
    expect(result.narrativeState.consecutiveTurns['foodSovereignty']).toBe(3);
    expect(result.narrativeState.consecutiveTurns['waterCommons'] ?? 0).toBe(0);
  });
});
