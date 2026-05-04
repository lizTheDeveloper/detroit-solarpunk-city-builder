import { describe, it, expect } from 'vitest';
import {
  getRelationshipLevel,
  applyRelationshipChange,
  applyLeaderTrustDecay,
  calculateDistrictConditionBonus,
  canFormCoalition,
  formCoalition,
  updateCoalitions,
  calculateLeaderTrustMeterBonus,
  calculateCouncilWillBonus,
  calculateNarrativeMultiplier,
  calculateProjectCostModifier,
  calculateReElectionScore,
} from './relationships';
import type {
  GameState,
  CommunityLeader,
  CouncilMember,
  Tile,

  Antagonist,
} from '../state/types';
import { createNewGame } from '../state/create-game';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLeader(overrides: Partial<CommunityLeader> = {}): CommunityLeader {
  return {
    id: 'leader-1',
    name: 'Test Leader',
    neighborhood: 'Brightmoor',
    tileIds: ['brightmoor'],
    backstory: '',
    priorities: [],
    trust: 0,
    advocacyPower: 3,
    proposalCooldown: 0,
    consecutiveDeferrals: 0,
    ...overrides,
  };
}

function makeCouncilMember(overrides: Partial<CouncilMember> = {}): CouncilMember {
  return {
    id: 'council-1',
    name: 'Test Council',
    district: 'District 1',
    districtNumber: 1,
    leaning: 'moderate',
    priorities: [],
    disposition: 0,
    backstory: '',
    tileIds: [],
    ...overrides,
  };
}

function makeTile(overrides: Partial<Tile> = {}): Tile {
  return {
    id: 'tile-1',
    name: 'Test Tile',
    terrain: 'vacant',
    vacancyRate: 0,
    ecologicalHealth: 10,
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
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createNewGame();
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// 1. getRelationshipLevel - all 7 thresholds
// ---------------------------------------------------------------------------

describe('getRelationshipLevel', () => {
  it('returns partner for trust >= 80', () => {
    expect(getRelationshipLevel(80)).toBe('partner');
    expect(getRelationshipLevel(100)).toBe('partner');
  });

  it('returns champion for trust >= 60 and < 80', () => {
    expect(getRelationshipLevel(60)).toBe('champion');
    expect(getRelationshipLevel(79)).toBe('champion');
  });

  it('returns advocate for trust >= 40 and < 60', () => {
    expect(getRelationshipLevel(40)).toBe('advocate');
    expect(getRelationshipLevel(59)).toBe('advocate');
  });

  it('returns neutral for trust 0 to 39', () => {
    expect(getRelationshipLevel(0)).toBe('neutral');
    expect(getRelationshipLevel(39)).toBe('neutral');
  });

  it('returns disillusioned for trust -1 to -20', () => {
    expect(getRelationshipLevel(-1)).toBe('disillusioned');
    expect(getRelationshipLevel(-20)).toBe('disillusioned');
  });

  it('returns opposition for trust -21 to -50', () => {
    expect(getRelationshipLevel(-21)).toBe('opposition');
    expect(getRelationshipLevel(-49)).toBe('opposition');
  });

  it('returns hostile for trust <= -50', () => {
    expect(getRelationshipLevel(-50)).toBe('hostile');
    expect(getRelationshipLevel(-100)).toBe('hostile');
  });
});

// ---------------------------------------------------------------------------
// 2. applyRelationshipChange - clamp to -100..+100
// ---------------------------------------------------------------------------

describe('applyRelationshipChange', () => {
  it('applies trust change to a leader', () => {
    const state = makeState({
      leaders: {
        grace: makeLeader({ id: 'grace', trust: 30 }),
      },
      turnSummary: {
        turn: 1,
        season: 'spring',
        year: 1,
        deltas: [],
        completedProjects: [],
        proposals: [],
        tileTransformations: [],
      },
    });
    const result = applyRelationshipChange(state, {
      characterId: 'grace',
      characterType: 'leader',
      amount: 15,
      source: 'test',
    });
    expect(result.leaders.grace.trust).toBe(45);
  });

  it('applies disposition change to a council member', () => {
    const state = makeState({
      councilMembers: {
        cm1: makeCouncilMember({ id: 'cm1', disposition: 20 }),
      },
      turnSummary: {
        turn: 1,
        season: 'spring',
        year: 1,
        deltas: [],
        completedProjects: [],
        proposals: [],
        tileTransformations: [],
      },
    });
    const result = applyRelationshipChange(state, {
      characterId: 'cm1',
      characterType: 'council',
      amount: -10,
      source: 'test',
    });
    expect(result.councilMembers.cm1.disposition).toBe(10);
  });

  it('clamps leader trust to +100', () => {
    const state = makeState({
      leaders: {
        grace: makeLeader({ id: 'grace', trust: 95 }),
      },
      turnSummary: {
        turn: 1,
        season: 'spring',
        year: 1,
        deltas: [],
        completedProjects: [],
        proposals: [],
        tileTransformations: [],
      },
    });
    const result = applyRelationshipChange(state, {
      characterId: 'grace',
      characterType: 'leader',
      amount: 20,
      source: 'test',
    });
    expect(result.leaders.grace.trust).toBe(100);
  });

  it('clamps leader trust to -100', () => {
    const state = makeState({
      leaders: {
        grace: makeLeader({ id: 'grace', trust: -90 }),
      },
      turnSummary: {
        turn: 1,
        season: 'spring',
        year: 1,
        deltas: [],
        completedProjects: [],
        proposals: [],
        tileTransformations: [],
      },
    });
    const result = applyRelationshipChange(state, {
      characterId: 'grace',
      characterType: 'leader',
      amount: -20,
      source: 'test',
    });
    expect(result.leaders.grace.trust).toBe(-100);
  });

  it('clamps council disposition to +100', () => {
    const state = makeState({
      councilMembers: {
        cm1: makeCouncilMember({ id: 'cm1', disposition: 95 }),
      },
      turnSummary: {
        turn: 1,
        season: 'spring',
        year: 1,
        deltas: [],
        completedProjects: [],
        proposals: [],
        tileTransformations: [],
      },
    });
    const result = applyRelationshipChange(state, {
      characterId: 'cm1',
      characterType: 'council',
      amount: 20,
      source: 'test',
    });
    expect(result.councilMembers.cm1.disposition).toBe(100);
  });

  it('clamps council disposition to -100', () => {
    const state = makeState({
      councilMembers: {
        cm1: makeCouncilMember({ id: 'cm1', disposition: -95 }),
      },
      turnSummary: {
        turn: 1,
        season: 'spring',
        year: 1,
        deltas: [],
        completedProjects: [],
        proposals: [],
        tileTransformations: [],
      },
    });
    const result = applyRelationshipChange(state, {
      characterId: 'cm1',
      characterType: 'council',
      amount: -20,
      source: 'test',
    });
    expect(result.councilMembers.cm1.disposition).toBe(-100);
  });
});

// ---------------------------------------------------------------------------
// 3-5. applyLeaderTrustDecay
// ---------------------------------------------------------------------------

describe('applyLeaderTrustDecay', () => {
  it('decays positive trust by 1 point toward zero', () => {
    const leaders: Record<string, CommunityLeader> = {
      a: makeLeader({ id: 'a', trust: 30 }),
    };
    const result = applyLeaderTrustDecay(leaders);
    expect(result.a.trust).toBe(29);
  });

  it('decays negative trust by 1 point toward zero', () => {
    const leaders: Record<string, CommunityLeader> = {
      a: makeLeader({ id: 'a', trust: -15 }),
    };
    const result = applyLeaderTrustDecay(leaders);
    expect(result.a.trust).toBe(-14);
  });

  it('does not decay trust at zero', () => {
    const leaders: Record<string, CommunityLeader> = {
      a: makeLeader({ id: 'a', trust: 0 }),
    };
    const result = applyLeaderTrustDecay(leaders);
    expect(result.a.trust).toBe(0);
  });

  it('decays champion (trust >= 60) at 0.5/turn', () => {
    const leaders: Record<string, CommunityLeader> = {
      a: makeLeader({ id: 'a', trust: 65 }),
    };
    const result = applyLeaderTrustDecay(leaders);
    expect(result.a.trust).toBe(64.5);
  });

  it('does not decay hostile (trust <= -50)', () => {
    const leaders: Record<string, CommunityLeader> = {
      a: makeLeader({ id: 'a', trust: -55 }),
    };
    const result = applyLeaderTrustDecay(leaders);
    expect(result.a.trust).toBe(-55);
  });

  it('decays at boundary trust = 60 (champion) at 0.5', () => {
    const leaders: Record<string, CommunityLeader> = {
      a: makeLeader({ id: 'a', trust: 60 }),
    };
    const result = applyLeaderTrustDecay(leaders);
    expect(result.a.trust).toBe(59.5);
  });

  it('decays at boundary trust = -50 (hostile) does not decay', () => {
    const leaders: Record<string, CommunityLeader> = {
      a: makeLeader({ id: 'a', trust: -50 }),
    };
    const result = applyLeaderTrustDecay(leaders);
    expect(result.a.trust).toBe(-50);
  });
});

// ---------------------------------------------------------------------------
// 16. calculateDistrictConditionBonus
// ---------------------------------------------------------------------------

describe('calculateDistrictConditionBonus', () => {
  it('gives +2 per completed project, capped at +10', () => {
    const state = makeState({
      tiles: {
        t1: makeTile({ id: 't1', completedProjects: ['p1', 'p2', 'p3'] }),
        t2: makeTile({ id: 't2', completedProjects: ['p4', 'p5', 'p6'] }),
      },
    });
    // 6 completed projects * 2 = 12, capped at 10
    expect(calculateDistrictConditionBonus(state, ['t1', 't2'])).toBe(10);
  });

  it('gives -2 per degraded tile (no projects + high contamination)', () => {
    const state = makeState({
      tiles: {
        t1: makeTile({ id: 't1', completedProjects: [], contamination: 60 }),
        t2: makeTile({ id: 't2', completedProjects: [], contamination: 70 }),
      },
    });
    // 2 degraded tiles * -2 = -4
    expect(calculateDistrictConditionBonus(state, ['t1', 't2'])).toBe(-4);
  });

  it('caps negative at -10', () => {
    const state = makeState({
      tiles: {
        t1: makeTile({ id: 't1', completedProjects: [], contamination: 60 }),
        t2: makeTile({ id: 't2', completedProjects: [], contamination: 60 }),
        t3: makeTile({ id: 't3', completedProjects: [], contamination: 60 }),
        t4: makeTile({ id: 't4', completedProjects: [], contamination: 60 }),
        t5: makeTile({ id: 't5', completedProjects: [], contamination: 60 }),
        t6: makeTile({ id: 't6', completedProjects: [], contamination: 60 }),
      },
    });
    // 6 degraded tiles * -2 = -12, capped at -10
    expect(calculateDistrictConditionBonus(state, ['t1', 't2', 't3', 't4', 't5', 't6'])).toBe(-10);
  });

  it('combines completed projects and degraded tiles', () => {
    const state = makeState({
      tiles: {
        t1: makeTile({ id: 't1', completedProjects: ['p1', 'p2'] }),
        t2: makeTile({ id: 't2', completedProjects: [], contamination: 60 }),
      },
    });
    // 2 completed * 2 = +4, 1 degraded * -2 = -2, net = +2
    expect(calculateDistrictConditionBonus(state, ['t1', 't2'])).toBe(2);
  });

  it('returns 0 for tiles with no projects and low contamination', () => {
    const state = makeState({
      tiles: {
        t1: makeTile({ id: 't1', completedProjects: [], contamination: 10 }),
      },
    });
    expect(calculateDistrictConditionBonus(state, ['t1'])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. canFormCoalition
// ---------------------------------------------------------------------------

describe('canFormCoalition', () => {
  it('requires at least 3 members', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 50 }),
        b: makeLeader({ id: 'b', trust: 50 }),
      },
      coalitions: [],
    });
    const result = canFormCoalition(state, ['a', 'b']);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('requires all members to have trust >= 40', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 50 }),
        b: makeLeader({ id: 'b', trust: 50 }),
        c: makeLeader({ id: 'c', trust: 30 }),
      },
      coalitions: [],
    });
    const result = canFormCoalition(state, ['a', 'b', 'c']);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('allows coalition when all prerequisites are met', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 50 }),
        b: makeLeader({ id: 'b', trust: 50 }),
        c: makeLeader({ id: 'c', trust: 50 }),
      },
      coalitions: [],
    });
    const result = canFormCoalition(state, ['a', 'b', 'c']);
    expect(result.allowed).toBe(true);
  });

  it('enforces max 2 active coalitions', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 50 }),
        b: makeLeader({ id: 'b', trust: 50 }),
        c: makeLeader({ id: 'c', trust: 50 }),
        d: makeLeader({ id: 'd', trust: 50 }),
        e: makeLeader({ id: 'e', trust: 50 }),
        f: makeLeader({ id: 'f', trust: 50 }),
        g: makeLeader({ id: 'g', trust: 50 }),
        h: makeLeader({ id: 'h', trust: 50 }),
        i: makeLeader({ id: 'i', trust: 50 }),
      },
      coalitions: [
        { id: 'c1', name: 'C1', memberIds: ['a', 'b', 'c'], topic: 'food', active: true, formedTurn: 1 },
        { id: 'c2', name: 'C2', memberIds: ['d', 'e', 'f'], topic: 'water', active: true, formedTurn: 1 },
      ],
    });
    const result = canFormCoalition(state, ['g', 'h', 'i']);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('blocks members already in coalition with same topic', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 50 }),
        b: makeLeader({ id: 'b', trust: 50 }),
        c: makeLeader({ id: 'c', trust: 50 }),
        d: makeLeader({ id: 'd', trust: 50 }),
      },
      coalitions: [
        { id: 'c1', name: 'C1', memberIds: ['a', 'b', 'c'], topic: 'food', active: true, formedTurn: 1 },
      ],
    });
    // 'a' is already in a coalition about 'food'
    const result = canFormCoalition(state, ['a', 'c', 'd'], 'food');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('allows same members on different topics', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 50 }),
        b: makeLeader({ id: 'b', trust: 50 }),
        c: makeLeader({ id: 'c', trust: 50 }),
      },
      coalitions: [
        { id: 'c1', name: 'C1', memberIds: ['a', 'b', 'c'], topic: 'food', active: true, formedTurn: 1 },
      ],
    });
    const result = canFormCoalition(state, ['a', 'b', 'c'], 'water');
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formCoalition
// ---------------------------------------------------------------------------

describe('formCoalition', () => {
  it('creates a coalition and adds to state', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 50 }),
        b: makeLeader({ id: 'b', trust: 50 }),
        c: makeLeader({ id: 'c', trust: 50 }),
      },
      coalitions: [],
    });
    const result = formCoalition(state, 'Food Coalition', ['a', 'b', 'c'], 'food');
    expect(result.coalitions).toHaveLength(1);
    expect(result.coalitions[0].name).toBe('Food Coalition');
    expect(result.coalitions[0].memberIds).toEqual(['a', 'b', 'c']);
    expect(result.coalitions[0].topic).toBe('food');
    expect(result.coalitions[0].active).toBe(true);
  });

  it('throws when prerequisites are not met', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 50 }),
        b: makeLeader({ id: 'b', trust: 50 }),
      },
      coalitions: [],
    });
    expect(() => formCoalition(state, 'Bad Coalition', ['a', 'b'], 'food')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7-8. updateCoalitions - weakening, dissolving, dissolution penalty
// ---------------------------------------------------------------------------

describe('updateCoalitions', () => {
  it('dissolves coalition when 2+ members drop below 30', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 25 }),
        b: makeLeader({ id: 'b', trust: 25 }),
        c: makeLeader({ id: 'c', trust: 50 }),
      },
      coalitions: [
        { id: 'c1', name: 'C1', memberIds: ['a', 'b', 'c'], topic: 'food', active: true, formedTurn: 1 },
      ],
      turnSummary: {
        turn: 1,
        season: 'spring',
        year: 1,
        deltas: [],
        completedProjects: [],
        proposals: [],
        tileTransformations: [],
      },
    });
    const result = updateCoalitions(state);
    expect(result.coalitions[0].active).toBe(false);
  });

  it('applies -5 trust penalty to all members on dissolution', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 25 }),
        b: makeLeader({ id: 'b', trust: 25 }),
        c: makeLeader({ id: 'c', trust: 50 }),
      },
      coalitions: [
        { id: 'c1', name: 'C1', memberIds: ['a', 'b', 'c'], topic: 'food', active: true, formedTurn: 1 },
      ],
      turnSummary: {
        turn: 1,
        season: 'spring',
        year: 1,
        deltas: [],
        completedProjects: [],
        proposals: [],
        tileTransformations: [],
      },
    });
    const result = updateCoalitions(state);
    expect(result.leaders.a.trust).toBe(20);
    expect(result.leaders.b.trust).toBe(20);
    expect(result.leaders.c.trust).toBe(45);
  });

  it('does not dissolve when only 1 member is below 30', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 25 }),
        b: makeLeader({ id: 'b', trust: 50 }),
        c: makeLeader({ id: 'c', trust: 50 }),
      },
      coalitions: [
        { id: 'c1', name: 'C1', memberIds: ['a', 'b', 'c'], topic: 'food', active: true, formedTurn: 1 },
      ],
      turnSummary: {
        turn: 1,
        season: 'spring',
        year: 1,
        deltas: [],
        completedProjects: [],
        proposals: [],
        tileTransformations: [],
      },
    });
    const result = updateCoalitions(state);
    // Still active (weakened but not dissolved)
    expect(result.coalitions[0].active).toBe(true);
  });

  it('ignores already-inactive coalitions', () => {
    const state = makeState({
      leaders: {
        a: makeLeader({ id: 'a', trust: 10 }),
        b: makeLeader({ id: 'b', trust: 10 }),
        c: makeLeader({ id: 'c', trust: 10 }),
      },
      coalitions: [
        { id: 'c1', name: 'C1', memberIds: ['a', 'b', 'c'], topic: 'food', active: false, formedTurn: 1 },
      ],
      turnSummary: {
        turn: 1,
        season: 'spring',
        year: 1,
        deltas: [],
        completedProjects: [],
        proposals: [],
        tileTransformations: [],
      },
    });
    const result = updateCoalitions(state);
    // Trust should not be affected
    expect(result.leaders.a.trust).toBe(10);
    expect(result.leaders.b.trust).toBe(10);
    expect(result.leaders.c.trust).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 10. calculateLeaderTrustMeterBonus (CT bonus)
// ---------------------------------------------------------------------------

describe('calculateLeaderTrustMeterBonus', () => {
  it('returns average trust / 10', () => {
    const leaders: Record<string, CommunityLeader> = {
      a: makeLeader({ id: 'a', trust: 40 }),
      b: makeLeader({ id: 'b', trust: 60 }),
    };
    // average = 50, bonus = 50 / 10 = 5
    expect(calculateLeaderTrustMeterBonus(leaders)).toBeCloseTo(5);
  });

  it('returns correct bonus for average trust of +40', () => {
    const leaders: Record<string, CommunityLeader> = {
      a: makeLeader({ id: 'a', trust: 40 }),
      b: makeLeader({ id: 'b', trust: 40 }),
      c: makeLeader({ id: 'c', trust: 40 }),
    };
    expect(calculateLeaderTrustMeterBonus(leaders)).toBeCloseTo(4);
  });

  it('returns 0 when no leaders', () => {
    expect(calculateLeaderTrustMeterBonus({})).toBe(0);
  });

  it('returns negative bonus for negative average trust', () => {
    const leaders: Record<string, CommunityLeader> = {
      a: makeLeader({ id: 'a', trust: -30 }),
      b: makeLeader({ id: 'b', trust: -50 }),
    };
    // average = -40, bonus = -40 / 10 = -4
    expect(calculateLeaderTrustMeterBonus(leaders)).toBeCloseTo(-4);
  });
});

// ---------------------------------------------------------------------------
// 11. calculateCouncilWillBonus
// ---------------------------------------------------------------------------

describe('calculateCouncilWillBonus', () => {
  it('gives +1 per member with disposition >= 30', () => {
    const members: Record<string, CouncilMember> = {
      a: makeCouncilMember({ id: 'a', disposition: 30 }),
      b: makeCouncilMember({ id: 'b', disposition: 50 }),
    };
    expect(calculateCouncilWillBonus(members)).toBe(2);
  });

  it('gives -1 per member with disposition <= -30', () => {
    const members: Record<string, CouncilMember> = {
      a: makeCouncilMember({ id: 'a', disposition: -30 }),
      b: makeCouncilMember({ id: 'b', disposition: -50 }),
    };
    expect(calculateCouncilWillBonus(members)).toBe(-2);
  });

  it('returns 0 for members in neutral range', () => {
    const members: Record<string, CouncilMember> = {
      a: makeCouncilMember({ id: 'a', disposition: 0 }),
      b: makeCouncilMember({ id: 'b', disposition: 20 }),
      c: makeCouncilMember({ id: 'c', disposition: -20 }),
    };
    expect(calculateCouncilWillBonus(members)).toBe(0);
  });

  it('handles mixed positive and negative', () => {
    const members: Record<string, CouncilMember> = {
      a: makeCouncilMember({ id: 'a', disposition: 50 }),
      b: makeCouncilMember({ id: 'b', disposition: -40 }),
      c: makeCouncilMember({ id: 'c', disposition: 10 }),
    };
    // +1 - 1 + 0 = 0
    expect(calculateCouncilWillBonus(members)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 12. calculateNarrativeMultiplier
// ---------------------------------------------------------------------------

describe('calculateNarrativeMultiplier', () => {
  it('returns 1.3 for trust of +60', () => {
    expect(calculateNarrativeMultiplier(60)).toBeCloseTo(1.3);
  });

  it('returns 0.8 for trust of -40', () => {
    expect(calculateNarrativeMultiplier(-40)).toBeCloseTo(0.8);
  });

  it('returns 1.0 for trust of 0', () => {
    expect(calculateNarrativeMultiplier(0)).toBeCloseTo(1.0);
  });

  it('returns 1.5 for trust of +100', () => {
    expect(calculateNarrativeMultiplier(100)).toBeCloseTo(1.5);
  });
});

// ---------------------------------------------------------------------------
// 13. calculateProjectCostModifier
// ---------------------------------------------------------------------------

describe('calculateProjectCostModifier', () => {
  it('returns -0.10 for trust >= 40', () => {
    expect(calculateProjectCostModifier(40)).toBeCloseTo(-0.10);
    expect(calculateProjectCostModifier(80)).toBeCloseTo(-0.10);
  });

  it('returns +0.15 for trust <= -20', () => {
    expect(calculateProjectCostModifier(-20)).toBeCloseTo(0.15);
    expect(calculateProjectCostModifier(-50)).toBeCloseTo(0.15);
  });

  it('returns 0 for trust in neutral range', () => {
    expect(calculateProjectCostModifier(0)).toBe(0);
    expect(calculateProjectCostModifier(39)).toBe(0);
    expect(calculateProjectCostModifier(-19)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 14-15. calculateReElectionScore
// ---------------------------------------------------------------------------

describe('calculateReElectionScore', () => {
  it('calculates a winning score (>= 50)', () => {
    const state = makeState({
      meters: {
        communityTrust: 55,
        ecologicalHealth: 30,
        foodSovereignty: 20,
        politicalWill: 60,
        budget: 5,
        climatePressure: 30,
      },
      councilMembers: {
        cm1: makeCouncilMember({ id: 'cm1', disposition: 40 }),
        cm2: makeCouncilMember({ id: 'cm2', disposition: 35 }),
      },
      leaders: {
        a: makeLeader({ id: 'a', trust: 50 }),
        b: makeLeader({ id: 'b', trust: 45 }),
      },
      coalitions: [
        { id: 'c1', name: 'C1', memberIds: ['a', 'b'], topic: 'food', active: true, formedTurn: 1 },
      ],
      antagonists: {},
    });
    // score = 55 + (2*3) + (2*5) + (1*8) = 55 + 6 + 10 + 8 = 79
    const score = calculateReElectionScore(state);
    expect(score).toBe(79);
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it('calculates a losing score (< 50)', () => {
    const state = makeState({
      meters: {
        communityTrust: 20,
        ecologicalHealth: 10,
        foodSovereignty: 5,
        politicalWill: 30,
        budget: 2,
        climatePressure: 50,
      },
      councilMembers: {
        cm1: makeCouncilMember({ id: 'cm1', disposition: -40 }),
        cm2: makeCouncilMember({ id: 'cm2', disposition: -35 }),
      },
      leaders: {
        a: makeLeader({ id: 'a', trust: -30 }),
        b: makeLeader({ id: 'b', trust: -25 }),
      },
      coalitions: [],
      antagonists: {
        ant1: {
          id: 'ant1',
          name: 'Developer',
          role: 'developer',
          activationCondition: '',
          escalationLevel: 3,
          escalationInterval: 4,
          active: true,
          lastEscalationTurn: 1,
          tileTargets: [],
        } as Antagonist,
      },
    });
    // score = 20 + (-2*3) + (-2*5) + 0 - (1*3) = 20 - 6 - 10 - 3 = 1
    const score = calculateReElectionScore(state);
    expect(score).toBe(1);
    expect(score).toBeLessThan(50);
  });

  it('accounts for antagonists at escalation level 3+', () => {
    const state = makeState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 30,
        foodSovereignty: 20,
        politicalWill: 60,
        budget: 5,
        climatePressure: 30,
      },
      councilMembers: {},
      leaders: {},
      coalitions: [],
      antagonists: {
        ant1: {
          id: 'ant1',
          name: 'Developer',
          role: 'developer',
          activationCondition: '',
          escalationLevel: 3,
          escalationInterval: 4,
          active: true,
          lastEscalationTurn: 1,
          tileTargets: [],
        } as Antagonist,
        ant2: {
          id: 'ant2',
          name: 'Polluter',
          role: 'polluter',
          activationCondition: '',
          escalationLevel: 4,
          escalationInterval: 4,
          active: true,
          lastEscalationTurn: 1,
          tileTargets: [],
        } as Antagonist,
      },
    });
    // score = 50 - (2*3) = 50 - 6 = 44
    const score = calculateReElectionScore(state);
    expect(score).toBe(44);
  });

  it('only counts active antagonists', () => {
    const state = makeState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 30,
        foodSovereignty: 20,
        politicalWill: 60,
        budget: 5,
        climatePressure: 30,
      },
      councilMembers: {},
      leaders: {},
      coalitions: [],
      antagonists: {
        ant1: {
          id: 'ant1',
          name: 'Developer',
          role: 'developer',
          activationCondition: '',
          escalationLevel: 3,
          escalationInterval: 4,
          active: false,
          lastEscalationTurn: 1,
          tileTargets: [],
        } as Antagonist,
      },
    });
    // Inactive antagonist should not count
    const score = calculateReElectionScore(state);
    expect(score).toBe(50);
  });
});
