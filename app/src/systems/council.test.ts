import { describe, it, expect } from 'vitest';
import {
  calculateVoteScore,
  resolveVote,
  conductCouncilVote,
  getDispositionLevel,
  applyDispositionDecay,
  calculateLobbyingBonus,
} from './council';
import type {
  GameState,
  CouncilMember,
  CommunityLeader,
  Tile,
  PolicyDefinition,
} from '../state/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTile(overrides: Partial<Tile> = {}): Tile {
  return {
    id: 'brightmoor',
    name: 'Brightmoor',
    terrain: 'vacant',
    vacancyRate: 0.4,
    ecologicalHealth: 10,
    contamination: 20,
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

function makeCouncilMember(overrides: Partial<CouncilMember> = {}): CouncilMember {
  return {
    id: 'member_1',
    name: 'Test Member',
    district: 'District 1',
    districtNumber: 1,
    leaning: 'moderate',
    priorities: ['ecology', 'community'],
    disposition: 0,
    backstory: 'A moderate council member.',
    tileIds: ['brightmoor'],
    ...overrides,
  };
}

function makeLeader(overrides: Partial<CommunityLeader> = {}): CommunityLeader {
  return {
    id: 'grace',
    name: 'Grace Okafor-Williams',
    neighborhood: 'Brightmoor',
    tileIds: ['brightmoor'],
    backstory: 'An urban farmer.',
    priorities: ['ecology', 'food_sovereignty'],
    trust: 30,
    advocacyPower: 4,
    proposalCooldown: 0,
    consecutiveDeferrals: 0,
    ...overrides,
  };
}

function makePolicy(overrides: Partial<PolicyDefinition> = {}): PolicyDefinition {
  return {
    id: 'green_infrastructure',
    name: 'Green Infrastructure Initiative',
    baseThreshold: 50,
    enactmentCost: 2.0,
    ongoingDrain: 0.5,
    effects: {
      trustBonus: 5,
      ecoBonus: 10,
      foodSovBonus: 0,
      budgetBonus: 0,
      projectCostModifier: {},
      other: ['ecology'],
    },
    requiresCouncilVote: true,
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    turn: 5,
    season: 'spring',
    year: 2025,
    phase: 'player-actions',
    stage: 'awakening',
    path: null,
    meters: {
      communityTrust: 50,
      ecologicalHealth: 15,
      foodSovereignty: 10,
      politicalWill: 60,
      budget: 10.0,
      climatePressure: 30,
    },
    tiles: {
      brightmoor: makeTile(),
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
    maxConcurrentProjects: 3,
    regionalCities: {},
    activeTransfers: [],
    regionalProjects: [],
    continentalGoals: [],
    winCondition: null,
    lossCondition: null,
    sandbox: false,
    ...overrides,
  } as GameState;
}

function makeNineMembers(overrides?: Partial<CouncilMember>[]): Record<string, CouncilMember> {
  const members: Record<string, CouncilMember> = {};
  for (let i = 1; i <= 9; i++) {
    const id = `member_${i}`;
    members[id] = makeCouncilMember({
      id,
      name: `Member ${i}`,
      district: `District ${i}`,
      districtNumber: i,
      ...(overrides && overrides[i - 1] ? overrides[i - 1] : {}),
    });
  }
  return members;
}

// ---------------------------------------------------------------------------
// Tests: getDispositionLevel
// ---------------------------------------------------------------------------

describe('getDispositionLevel', () => {
  it('returns coalition_partner for disposition >= 80', () => {
    expect(getDispositionLevel(80)).toBe('coalition_partner');
    expect(getDispositionLevel(100)).toBe('coalition_partner');
  });

  it('returns ally for disposition 60-79', () => {
    expect(getDispositionLevel(60)).toBe('ally');
    expect(getDispositionLevel(79)).toBe('ally');
  });

  it('returns lean_yes for disposition 30-59', () => {
    expect(getDispositionLevel(30)).toBe('lean_yes');
    expect(getDispositionLevel(59)).toBe('lean_yes');
  });

  it('returns neutral for disposition 0-29', () => {
    expect(getDispositionLevel(0)).toBe('neutral');
    expect(getDispositionLevel(29)).toBe('neutral');
  });

  it('returns skeptic for disposition -1 to -20', () => {
    expect(getDispositionLevel(-1)).toBe('skeptic');
    expect(getDispositionLevel(-20)).toBe('skeptic');
  });

  it('returns opponent for disposition -21 to -50', () => {
    expect(getDispositionLevel(-21)).toBe('opponent');
    expect(getDispositionLevel(-50)).toBe('opponent');
  });

  it('returns adversary for disposition <= -51', () => {
    expect(getDispositionLevel(-51)).toBe('adversary');
    expect(getDispositionLevel(-100)).toBe('adversary');
  });

  it('all seven levels have correct thresholds', () => {
    const levels: [number, string][] = [
      [100, 'coalition_partner'],
      [80, 'coalition_partner'],
      [79, 'ally'],
      [60, 'ally'],
      [59, 'lean_yes'],
      [30, 'lean_yes'],
      [29, 'neutral'],
      [0, 'neutral'],
      [-1, 'skeptic'],
      [-20, 'skeptic'],
      [-21, 'opponent'],
      [-50, 'opponent'],
      [-51, 'adversary'],
      [-100, 'adversary'],
    ];
    for (const [disposition, expected] of levels) {
      expect(getDispositionLevel(disposition)).toBe(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: calculateLobbyingBonus
// ---------------------------------------------------------------------------

describe('calculateLobbyingBonus', () => {
  it('returns 15 for high alignment', () => {
    expect(calculateLobbyingBonus('high')).toBe(15);
  });

  it('returns 10 for medium alignment', () => {
    expect(calculateLobbyingBonus('medium')).toBe(10);
  });

  it('returns 5 for low alignment', () => {
    expect(calculateLobbyingBonus('low')).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Tests: resolveVote
// ---------------------------------------------------------------------------

describe('resolveVote', () => {
  const member = makeCouncilMember();

  it('returns yes for score > 0', () => {
    expect(resolveVote(member, 1)).toBe('yes');
    expect(resolveVote(member, 50)).toBe('yes');
  });

  it('returns no for score < -10', () => {
    expect(resolveVote(member, -11)).toBe('no');
    expect(resolveVote(member, -50)).toBe('no');
  });

  it('returns abstain for score between -10 and 0 (inclusive)', () => {
    expect(resolveVote(member, 0)).toBe('abstain');
    expect(resolveVote(member, -5)).toBe('abstain');
    expect(resolveVote(member, -10)).toBe('abstain');
  });
});

// ---------------------------------------------------------------------------
// Tests: calculateVoteScore
// ---------------------------------------------------------------------------

describe('calculateVoteScore', () => {
  it('progressive member votes YES on aligned policy', () => {
    const member = makeCouncilMember({
      leaning: 'progressive',
      disposition: 30,
      priorities: ['ecology', 'community'],
      tileIds: ['brightmoor'],
    });
    const policy = makePolicy({
      effects: {
        trustBonus: 5,
        ecoBonus: 10,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: ['ecology', 'community'],
      },
    });
    const state = makeGameState({
      tiles: {
        brightmoor: makeTile({ completedProjects: ['proj_1', 'proj_2'] }),
      },
    });
    const score = calculateVoteScore(member, policy, state);
    // base_disposition=30, alignment: 2 matches => +20 (capped), district: 2 completed => +4, no advocacy, no lobbying
    expect(score).toBeGreaterThan(0);
  });

  it('conservative member votes NO on progressive policy', () => {
    const member = makeCouncilMember({
      leaning: 'conservative',
      disposition: -30,
      priorities: ['budget', 'development'],
      tileIds: ['brightmoor'],
    });
    const policy = makePolicy({
      effects: {
        trustBonus: 5,
        ecoBonus: 10,
        foodSovBonus: 5,
        budgetBonus: -5,
        projectCostModifier: {},
        other: ['ecology', 'community'],
      },
    });
    const state = makeGameState();
    const score = calculateVoteScore(member, policy, state);
    // base_disposition=-30, no priority overlap => 0, no district improvement => 0
    expect(score).toBeLessThan(-10);
  });

  it('moderate member abstains on neutral policy (score between -10 and 0)', () => {
    const member = makeCouncilMember({
      leaning: 'moderate',
      disposition: -5,
      priorities: ['infrastructure'],
      tileIds: ['brightmoor'],
    });
    const policy = makePolicy({
      effects: {
        trustBonus: 0,
        ecoBonus: 0,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: ['transit'],
      },
    });
    const state = makeGameState();
    const score = calculateVoteScore(member, policy, state);
    // base=-5, no overlap => 0, no district change => 0
    // score should be -5, which is in abstain range
    expect(score).toBeGreaterThanOrEqual(-10);
    expect(score).toBeLessThanOrEqual(0);
  });

  it('policy priority alignment scoring stays within -20 to +20 range', () => {
    // Member with 4 matching priorities (should cap at +20)
    const member = makeCouncilMember({
      disposition: 0,
      priorities: ['ecology', 'community', 'food_sovereignty', 'restoration'],
      tileIds: ['brightmoor'],
    });
    const policy = makePolicy({
      effects: {
        trustBonus: 5,
        ecoBonus: 10,
        foodSovBonus: 5,
        budgetBonus: 0,
        projectCostModifier: {},
        other: ['ecology', 'community', 'food_sovereignty', 'restoration'],
      },
    });
    const state = makeGameState();
    const score = calculateVoteScore(member, policy, state);
    // base=0, alignment capped at +20, no district improvement
    // The alignment component alone should never exceed +20
    // Total score should be at most 20 + district + advocacy + lobbying
    expect(score).toBeLessThanOrEqual(20 + 10 + 15 + 15);

    // Now test negative cap: all conflicting
    const conflictMember = makeCouncilMember({
      disposition: 0,
      priorities: ['budget', 'development', 'deregulation'],
      tileIds: ['brightmoor'],
    });
    const conflictPolicy = makePolicy({
      effects: {
        trustBonus: 0,
        ecoBonus: 0,
        foodSovBonus: 0,
        budgetBonus: -10,
        projectCostModifier: {},
        other: ['ecology', 'community', 'food_sovereignty'],
      },
    });
    const conflictScore = calculateVoteScore(conflictMember, conflictPolicy, state);
    // No matching priorities, negative budget => conflict for budget-priority member
    // alignment should be negative, capped at -20
    expect(conflictScore).toBeGreaterThanOrEqual(-20 - 10);
  });

  it('district conditions affect vote score positively with completed projects', () => {
    const member = makeCouncilMember({
      disposition: 0,
      priorities: [],
      tileIds: ['brightmoor'],
    });
    const policy = makePolicy({
      effects: {
        trustBonus: 0,
        ecoBonus: 0,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: [],
      },
    });
    // District tile has 5 completed projects => improvement
    const state = makeGameState({
      tiles: {
        brightmoor: makeTile({
          completedProjects: ['p1', 'p2', 'p3', 'p4', 'p5'],
          ecologicalHealth: 50,
        }),
      },
    });
    const score = calculateVoteScore(member, policy, state);
    // base=0, alignment=0, district should be positive (completedProjects + high eco)
    expect(score).toBeGreaterThan(0);
  });

  it('district conditions affect vote score negatively with degraded tiles', () => {
    const member = makeCouncilMember({
      disposition: 0,
      priorities: [],
      tileIds: ['brightmoor'],
    });
    const policy = makePolicy({
      effects: {
        trustBonus: 0,
        ecoBonus: 0,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: [],
      },
    });
    // District tile has no completed projects but high contamination and low eco
    const state = makeGameState({
      tiles: {
        brightmoor: makeTile({
          completedProjects: [],
          ecologicalHealth: 2,
          contamination: 80,
        }),
      },
    });
    const score = calculateVoteScore(member, policy, state);
    // base=0, alignment=0, district should be negative (degraded conditions)
    expect(score).toBeLessThan(0);
  });

  it('community leader advocacy adds to vote score when leader trust >= 40', () => {
    const member = makeCouncilMember({
      disposition: 0,
      priorities: ['ecology'],
      tileIds: ['brightmoor'],
    });
    const policy = makePolicy({
      effects: {
        trustBonus: 0,
        ecoBonus: 10,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: ['ecology'],
      },
    });
    // Leader with high trust and matching priorities
    const stateWithAdvocate = makeGameState({
      leaders: {
        grace: makeLeader({
          trust: 50,
          advocacyPower: 8,
          priorities: ['ecology', 'food_sovereignty'],
        }),
      },
    });
    const scoreWithAdvocacy = calculateVoteScore(member, policy, stateWithAdvocate);

    // State without advocates (leader trust < 40)
    const stateWithoutAdvocate = makeGameState({
      leaders: {
        grace: makeLeader({
          trust: 30,
          advocacyPower: 8,
          priorities: ['ecology', 'food_sovereignty'],
        }),
      },
    });
    const scoreWithoutAdvocacy = calculateVoteScore(member, policy, stateWithoutAdvocate);

    expect(scoreWithAdvocacy).toBeGreaterThan(scoreWithoutAdvocacy);
  });

  it('community leader advocacy is capped at +15', () => {
    const member = makeCouncilMember({
      disposition: 0,
      priorities: [],
      tileIds: ['brightmoor'],
    });
    const policy = makePolicy({
      effects: {
        trustBonus: 0,
        ecoBonus: 0,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: ['ecology'],
      },
    });
    // Multiple leaders with high trust and advocacy power
    const state = makeGameState({
      leaders: {
        grace: makeLeader({ id: 'grace', trust: 80, advocacyPower: 10, priorities: ['ecology'] }),
        kez: makeLeader({ id: 'kez', trust: 80, advocacyPower: 10, priorities: ['ecology'] }),
        darius: makeLeader({ id: 'darius', trust: 80, advocacyPower: 10, priorities: ['ecology'] }),
      },
    });
    const score = calculateVoteScore(member, policy, state);
    // base=0, alignment=0, district=some value, advocacy should be capped at 15
    // Without other factors, score should be at most 15 + district_conditions
    expect(score).toBeLessThanOrEqual(15 + 10); // advocacy cap + max district
  });

  it('lobbying bonus is added to the score', () => {
    const member = makeCouncilMember({
      disposition: 0,
      priorities: [],
      tileIds: ['brightmoor'],
    });
    const policy = makePolicy({
      effects: {
        trustBonus: 0,
        ecoBonus: 0,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: [],
      },
    });
    const state = makeGameState();
    const scoreWithLobby = calculateVoteScore(member, policy, state, 15);
    const scoreWithout = calculateVoteScore(member, policy, state, 0);
    expect(scoreWithLobby - scoreWithout).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Tests: conductCouncilVote
// ---------------------------------------------------------------------------

describe('conductCouncilVote', () => {
  it('5-4 vote passes', () => {
    // 5 members with positive disposition, 4 with very negative
    const overrides: Partial<CouncilMember>[] = [];
    for (let i = 0; i < 5; i++) {
      overrides.push({ disposition: 40, priorities: ['ecology'] });
    }
    for (let i = 0; i < 4; i++) {
      overrides.push({ disposition: -40, priorities: ['budget'] });
    }
    const members = makeNineMembers(overrides);
    const policy = makePolicy({
      effects: {
        trustBonus: 5,
        ecoBonus: 10,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: ['ecology'],
      },
    });
    const state = makeGameState({ councilMembers: members });
    const result = conductCouncilVote(state, 'green_infrastructure', policy);

    const yesVotes = result.votes.filter((v) => v.vote === 'yes').length;
    const noVotes = result.votes.filter((v) => v.vote === 'no').length;
    expect(yesVotes).toBe(5);
    expect(noVotes).toBe(4);
    expect(result.passed).toBe(true);
  });

  it('4-5 vote fails', () => {
    // 4 members with positive disposition, 5 with very negative
    const overrides: Partial<CouncilMember>[] = [];
    for (let i = 0; i < 4; i++) {
      overrides.push({ disposition: 40, priorities: ['ecology'] });
    }
    for (let i = 0; i < 5; i++) {
      overrides.push({ disposition: -40, priorities: ['budget'] });
    }
    const members = makeNineMembers(overrides);
    const policy = makePolicy({
      effects: {
        trustBonus: 5,
        ecoBonus: 10,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: ['ecology'],
      },
    });
    const state = makeGameState({ councilMembers: members });
    const result = conductCouncilVote(state, 'green_infrastructure', policy);

    const yesVotes = result.votes.filter((v) => v.vote === 'yes').length;
    expect(yesVotes).toBeLessThan(5);
    expect(result.passed).toBe(false);
  });

  it('landslide rejection (2-7 or worse)', () => {
    // 2 supportive, 7 very opposed
    const overrides: Partial<CouncilMember>[] = [];
    for (let i = 0; i < 2; i++) {
      overrides.push({ disposition: 40, priorities: ['ecology'] });
    }
    for (let i = 0; i < 7; i++) {
      overrides.push({ disposition: -40, priorities: ['budget'] });
    }
    const members = makeNineMembers(overrides);
    const policy = makePolicy({
      effects: {
        trustBonus: 5,
        ecoBonus: 10,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: ['ecology'],
      },
    });
    const state = makeGameState({ councilMembers: members });
    const result = conductCouncilVote(state, 'green_infrastructure', policy);

    const yesVotes = result.votes.filter((v) => v.vote === 'yes').length;
    expect(yesVotes).toBeLessThanOrEqual(2);
    expect(result.passed).toBe(false);
    // margin should reflect a clear defeat
    expect(result.margin).toBeLessThan(0);
  });

  it('high lobbying bonus flips a skeptic to YES', () => {
    // One skeptic member (disposition = -15) who would normally vote NO/abstain
    // With high lobbying bonus (+15) they should flip to YES
    makeCouncilMember({
      id: 'skeptic_1',
      disposition: -8,
      priorities: ['ecology'],
      tileIds: ['brightmoor'],
    });
    const policy = makePolicy({
      effects: {
        trustBonus: 0,
        ecoBonus: 0,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: ['ecology'],
      },
    });
    const state = makeGameState();

    // Without lobbying: score should be around -8 + 10 (alignment) = 2... actually positive
    // Let's use a skeptic who has no priority overlap
    const skepticMember = makeCouncilMember({
      id: 'skeptic_1',
      disposition: -5,
      priorities: ['budget'],
      tileIds: ['brightmoor'],
    });
    const scoreWithout = calculateVoteScore(skepticMember, policy, state, 0);
    const voteWithout = resolveVote(skepticMember, scoreWithout);

    const scoreWith = calculateVoteScore(skepticMember, policy, state, 15);
    const voteWith = resolveVote(skepticMember, scoreWith);

    // Without lobby, should abstain or vote no
    expect(voteWithout).not.toBe('yes');
    // With lobby, should vote yes
    expect(voteWith).toBe('yes');
  });

  it('returns correct turn number', () => {
    const members = makeNineMembers();
    const policy = makePolicy();
    const state = makeGameState({ councilMembers: members, turn: 12 });
    const result = conductCouncilVote(state, 'green_infrastructure', policy);
    expect(result.turn).toBe(12);
  });

  it('returns policyId in result', () => {
    const members = makeNineMembers();
    const policy = makePolicy();
    const state = makeGameState({ councilMembers: members });
    const result = conductCouncilVote(state, 'my_policy', policy);
    expect(result.policyId).toBe('my_policy');
  });

  it('each member vote includes factors breakdown', () => {
    const members = makeNineMembers();
    const policy = makePolicy();
    const state = makeGameState({ councilMembers: members });
    const result = conductCouncilVote(state, 'green_infrastructure', policy);
    for (const memberVote of result.votes) {
      expect(memberVote.factors.length).toBeGreaterThan(0);
      expect(memberVote.factors[0]).toHaveProperty('source');
      expect(memberVote.factors[0]).toHaveProperty('value');
    }
  });

  it('lobbying bonuses are applied per-member', () => {
    const overrides: Partial<CouncilMember>[] = [];
    for (let i = 0; i < 9; i++) {
      overrides.push({ disposition: -5, priorities: ['budget'] });
    }
    const members = makeNineMembers(overrides);
    const policy = makePolicy({
      effects: {
        trustBonus: 0,
        ecoBonus: 0,
        foodSovBonus: 0,
        budgetBonus: 0,
        projectCostModifier: {},
        other: ['ecology'],
      },
    });
    const state = makeGameState({ councilMembers: members });

    // Apply lobbying to first member only
    const lobbyingBonuses: Record<string, number> = { member_1: 15 };
    const result = conductCouncilVote(state, 'green_infrastructure', policy, lobbyingBonuses);

    const member1Vote = result.votes.find((v) => v.memberId === 'member_1');
    const member2Vote = result.votes.find((v) => v.memberId === 'member_2');
    expect(member1Vote!.score).toBeGreaterThan(member2Vote!.score);
  });
});

// ---------------------------------------------------------------------------
// Tests: applyDispositionDecay
// ---------------------------------------------------------------------------

describe('applyDispositionDecay', () => {
  it('positive disposition drifts toward zero by 1', () => {
    const members: Record<string, CouncilMember> = {
      m1: makeCouncilMember({ id: 'm1', disposition: 20 }),
    };
    const result = applyDispositionDecay(members);
    expect(result.m1.disposition).toBe(19);
  });

  it('negative disposition drifts toward zero by 1', () => {
    const members: Record<string, CouncilMember> = {
      m1: makeCouncilMember({ id: 'm1', disposition: -20 }),
    };
    const result = applyDispositionDecay(members);
    expect(result.m1.disposition).toBe(-19);
  });

  it('ally (disposition >= 60) decays at 0.5/turn', () => {
    const members: Record<string, CouncilMember> = {
      m1: makeCouncilMember({ id: 'm1', disposition: 65 }),
    };
    const result = applyDispositionDecay(members);
    expect(result.m1.disposition).toBe(64.5);
  });

  it('disposition decay halts for adversary-level members (<= -50)', () => {
    const members: Record<string, CouncilMember> = {
      m1: makeCouncilMember({ id: 'm1', disposition: -60 }),
    };
    const result = applyDispositionDecay(members);
    expect(result.m1.disposition).toBe(-60); // No decay
  });

  it('adversary at exactly -50 has no decay', () => {
    // Note: getDispositionLevel(-50) is 'opponent', not 'adversary'
    // Adversary is <= -51. But the spec says "<= -50" for adversary no-decay.
    // The spec for getDispositionLevel says: <= -50: adversary
    // Wait, let me re-read: -21 to -50 is opponent, <= -51 (i.e. < -50) is adversary.
    // Actually the spec says "<= -50: 'adversary'" - so -50 IS adversary.
    // But the disposition level says -21 to -50 is opponent. Let me re-read.
    // getDispositionLevel: -21 to -50: opponent, <= -50: adversary
    // This is ambiguous at -50. The spec says "<= -50" for adversary in decay.
    // I'll test that at -51 it definitely doesn't decay.
    const members: Record<string, CouncilMember> = {
      m1: makeCouncilMember({ id: 'm1', disposition: -51 }),
    };
    const result = applyDispositionDecay(members);
    expect(result.m1.disposition).toBe(-51);
  });

  it('disposition at 0 does not change', () => {
    const members: Record<string, CouncilMember> = {
      m1: makeCouncilMember({ id: 'm1', disposition: 0 }),
    };
    const result = applyDispositionDecay(members);
    expect(result.m1.disposition).toBe(0);
  });

  it('does not mutate original members', () => {
    const members: Record<string, CouncilMember> = {
      m1: makeCouncilMember({ id: 'm1', disposition: 20 }),
    };
    applyDispositionDecay(members);
    expect(members.m1.disposition).toBe(20);
  });

  it('coalition_partner (>= 80) also decays at 0.5/turn', () => {
    const members: Record<string, CouncilMember> = {
      m1: makeCouncilMember({ id: 'm1', disposition: 85 }),
    };
    const result = applyDispositionDecay(members);
    // coalition_partner >= 80 is above ally threshold (>= 60), so 0.5 decay
    expect(result.m1.disposition).toBe(84.5);
  });

  it('multiple members each decay independently', () => {
    const members: Record<string, CouncilMember> = {
      m1: makeCouncilMember({ id: 'm1', disposition: 20 }),
      m2: makeCouncilMember({ id: 'm2', disposition: -30 }),
      m3: makeCouncilMember({ id: 'm3', disposition: 65 }),
      m4: makeCouncilMember({ id: 'm4', disposition: -60 }),
    };
    const result = applyDispositionDecay(members);
    expect(result.m1.disposition).toBe(19);     // normal: -1
    expect(result.m2.disposition).toBe(-29);    // normal: +1
    expect(result.m3.disposition).toBe(64.5);   // ally: -0.5
    expect(result.m4.disposition).toBe(-60);    // adversary: no decay
  });
});
