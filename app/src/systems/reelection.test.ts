import { describe, it, expect } from 'vitest';
import {
  isElectionTurn,
  isCampaignTurn,
  calculateElectionScore,
  getCampaignBonuses,
  applyElectionResult,
  getElectionNarrative,
  predictElectionOutcome,
} from './reelection';
import type { GameState } from '../state/types';

// ---------------------------------------------------------------------------
// Helper: minimal GameState factory for testing
// ---------------------------------------------------------------------------

function makeTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    turn: 16,
    month: 5,
    season: 'spring',
    year: 1,
    phase: 'events',
    stage: 'awakening',
    path: null,
    meters: {
      communityTrust: 60,
      ecologicalHealth: 15,
      foodSovereignty: 10,
      politicalWill: 60,
      budget: 2.8,
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
      foodSovereignty: 15,
      waterCommons: 10,
      landReform: 8,
      ecologicalRestoration: 20,
      cooperativeEconomics: 12,
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
    ...overrides,
  } as GameState;
}

// ---------------------------------------------------------------------------
// 1. isElectionTurn
// ---------------------------------------------------------------------------

describe('isElectionTurn', () => {
  it('returns true for turn 48, 96, 144, 192', () => {
    expect(isElectionTurn(48)).toBe(true);
    expect(isElectionTurn(96)).toBe(true);
    expect(isElectionTurn(144)).toBe(true);
    expect(isElectionTurn(192)).toBe(true);
  });

  it('returns false for non-election turns', () => {
    expect(isElectionTurn(1)).toBe(false);
    expect(isElectionTurn(16)).toBe(false);
    expect(isElectionTurn(47)).toBe(false);
    expect(isElectionTurn(49)).toBe(false);
    expect(isElectionTurn(95)).toBe(false);
    expect(isElectionTurn(0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. isCampaignTurn
// ---------------------------------------------------------------------------

describe('isCampaignTurn', () => {
  it('returns true for turn 47, 95, 143, 191', () => {
    expect(isCampaignTurn(47)).toBe(true);
    expect(isCampaignTurn(95)).toBe(true);
    expect(isCampaignTurn(143)).toBe(true);
    expect(isCampaignTurn(191)).toBe(true);
  });

  it('returns false for non-campaign turns', () => {
    expect(isCampaignTurn(48)).toBe(false);
    expect(isCampaignTurn(46)).toBe(false);
    expect(isCampaignTurn(1)).toBe(false);
    expect(isCampaignTurn(64)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. calculateElectionScore
// ---------------------------------------------------------------------------

describe('calculateElectionScore', () => {
  it('calculates baseTrust as communityTrust * 0.6', () => {
    const state = makeTestState({
      meters: { communityTrust: 80, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 0, budget: 2.8, climatePressure: 30 },
    });
    const result = calculateElectionScore(state);
    expect(result.breakdown.baseTrust).toBe(48);
  });

  it('gives +2 per friendly council member (disposition > 30)', () => {
    const state = makeTestState({
      councilMembers: {
        cm1: { id: 'cm1', name: 'A', district: 'd1', districtNumber: 1, leaning: 'progressive', priorities: [], disposition: 50, backstory: '', tileIds: [] },
        cm2: { id: 'cm2', name: 'B', district: 'd2', districtNumber: 2, leaning: 'moderate', priorities: [], disposition: 40, backstory: '', tileIds: [] },
      },
    });
    const result = calculateElectionScore(state);
    expect(result.breakdown.councilSupport).toBe(4);
  });

  it('gives -2 per hostile council member (disposition < -20)', () => {
    const state = makeTestState({
      councilMembers: {
        cm1: { id: 'cm1', name: 'A', district: 'd1', districtNumber: 1, leaning: 'conservative', priorities: [], disposition: -30, backstory: '', tileIds: [] },
        cm2: { id: 'cm2', name: 'B', district: 'd2', districtNumber: 2, leaning: 'moderate', priorities: [], disposition: -25, backstory: '', tileIds: [] },
      },
    });
    const result = calculateElectionScore(state);
    expect(result.breakdown.councilSupport).toBe(-4);
  });

  it('gives +3 per leader with trust >= 40', () => {
    const state = makeTestState({
      leaders: {
        l1: { id: 'l1', name: 'L1', neighborhood: 'n', tileIds: [], backstory: '', priorities: [], trust: 40, advocacyPower: 5, proposalCooldown: 0, consecutiveDeferrals: 0 },
        l2: { id: 'l2', name: 'L2', neighborhood: 'n', tileIds: [], backstory: '', priorities: [], trust: 60, advocacyPower: 5, proposalCooldown: 0, consecutiveDeferrals: 0 },
        l3: { id: 'l3', name: 'L3', neighborhood: 'n', tileIds: [], backstory: '', priorities: [], trust: 20, advocacyPower: 5, proposalCooldown: 0, consecutiveDeferrals: 0 },
      },
    });
    const result = calculateElectionScore(state);
    expect(result.breakdown.leaderAdvocates).toBe(6); // 2 leaders at >= 40
  });

  it('gives +5 per active coalition', () => {
    const state = makeTestState({
      coalitions: [
        { id: 'c1', name: 'C1', memberIds: ['a', 'b', 'c'], topic: 'food', active: true, formedTurn: 5 },
        { id: 'c2', name: 'C2', memberIds: ['d', 'e', 'f'], topic: 'eco', active: true, formedTurn: 8 },
        { id: 'c3', name: 'C3', memberIds: ['g', 'h', 'i'], topic: 'water', active: false, formedTurn: 3 },
      ],
    });
    const result = calculateElectionScore(state);
    expect(result.breakdown.coalitionBonus).toBe(10); // 2 active coalitions
  });

  it('gives -4 per antagonist with escalationLevel >= 3', () => {
    const state = makeTestState({
      antagonists: {
        a1: { id: 'a1', name: 'A1', role: 'dev', activationCondition: '', escalationLevel: 3, escalationInterval: 4, active: true, lastEscalationTurn: 10, tileTargets: [] },
        a2: { id: 'a2', name: 'A2', role: 'pol', activationCondition: '', escalationLevel: 4, escalationInterval: 4, active: true, lastEscalationTurn: 10, tileTargets: [] },
        a3: { id: 'a3', name: 'A3', role: 'corp', activationCondition: '', escalationLevel: 2, escalationInterval: 4, active: true, lastEscalationTurn: 10, tileTargets: [] },
      },
    });
    const result = calculateElectionScore(state);
    expect(result.breakdown.antagonistPenalty).toBe(-8); // 2 at level >= 3
  });

  it('caps politicalWill contribution at 8', () => {
    const state = makeTestState({
      meters: { communityTrust: 60, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 200, budget: 2.8, climatePressure: 30 },
    });
    const result = calculateElectionScore(state);
    expect(result.breakdown.politicalWill).toBe(8);
  });

  it('gives -3 per tile with gentrificationPressure > 50', () => {
    const state = makeTestState({
      tiles: {
        t1: { id: 't1', name: 'T1', terrain: 'urban-dense', vacancyRate: 0, ecologicalHealth: 10, contamination: 0, gentrificationPressure: 70, existingUses: [], neighborhoodTraits: [], activeProjects: [], completedProjects: [], communityPowerTokens: 0, communityOwned: false, adjacentTileIds: [], visualStage: 'dystopia', consumedByproducts: [], vacantLots: 5, reclaimedLots: 0 },
        t2: { id: 't2', name: 'T2', terrain: 'urban-dense', vacancyRate: 0, ecologicalHealth: 10, contamination: 0, gentrificationPressure: 80, existingUses: [], neighborhoodTraits: [], activeProjects: [], completedProjects: [], communityPowerTokens: 0, communityOwned: false, adjacentTileIds: [], visualStage: 'dystopia', consumedByproducts: [], vacantLots: 5, reclaimedLots: 0 },
        t3: { id: 't3', name: 'T3', terrain: 'urban-dense', vacancyRate: 0, ecologicalHealth: 10, contamination: 0, gentrificationPressure: 30, existingUses: [], neighborhoodTraits: [], activeProjects: [], completedProjects: [], communityPowerTokens: 0, communityOwned: false, adjacentTileIds: [], visualStage: 'dystopia', consumedByproducts: [], vacantLots: 5, reclaimedLots: 0 },
      },
    });
    const result = calculateElectionScore(state);
    expect(result.breakdown.displacementPenalty).toBe(-6); // 2 tiles above 50
  });

  it('reports win when score >= 50', () => {
    const state = makeTestState({
      meters: { communityTrust: 100, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 2.8, climatePressure: 30 },
    });
    const result = calculateElectionScore(state);
    expect(result.won).toBe(true);
    expect(result.margin).toBeGreaterThanOrEqual(0);
  });

  it('reports loss when score < 50', () => {
    const state = makeTestState({
      meters: { communityTrust: 20, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 0, budget: 2.8, climatePressure: 30 },
    });
    const result = calculateElectionScore(state);
    expect(result.won).toBe(false);
    expect(result.margin).toBeLessThan(0);
  });

  it('calculates total score as sum of all factors', () => {
    const state = makeTestState({
      meters: { communityTrust: 60, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 40, budget: 2.8, climatePressure: 30 },
      leaders: {
        l1: { id: 'l1', name: 'L1', neighborhood: 'n', tileIds: [], backstory: '', priorities: [], trust: 50, advocacyPower: 5, proposalCooldown: 0, consecutiveDeferrals: 0 },
      },
      councilMembers: {
        cm1: { id: 'cm1', name: 'A', district: 'd1', districtNumber: 1, leaning: 'progressive', priorities: [], disposition: 50, backstory: '', tileIds: [] },
      },
      coalitions: [
        { id: 'c1', name: 'C1', memberIds: ['a', 'b', 'c'], topic: 'food', active: true, formedTurn: 5 },
      ],
    });
    const result = calculateElectionScore(state);
    // baseTrust: 60*0.6=36, council: +2, leader: +3, coalition: +5, antagonist: 0, politicalWill: min(8, 40*0.08)=3.2, displacement: 0
    expect(result.score).toBeCloseTo(36 + 2 + 3 + 5 + 0 + 3.2 + 0, 5);
    expect(result.score).toBeCloseTo(49.2, 5);
    expect(result.won).toBe(true); // 49.2 >= 45 threshold
    expect(result.margin).toBeCloseTo(4.2, 5);
  });
});

// ---------------------------------------------------------------------------
// 4. getCampaignBonuses
// ---------------------------------------------------------------------------

describe('getCampaignBonuses', () => {
  it('returns correct bonus values', () => {
    const bonuses = getCampaignBonuses();
    expect(bonuses.extraNarrativeActions).toBe(2);
    expect(bonuses.trustGainMultiplier).toBe(1.5);
    expect(bonuses.lobbyingEffectivenessBonus).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// 5. applyElectionResult
// ---------------------------------------------------------------------------

describe('applyElectionResult', () => {
  it('sets lossCondition to reelection on loss', () => {
    const state = makeTestState();
    const result = { score: 40, won: false, breakdown: {} as any, margin: -10 };
    const newState = applyElectionResult(state, result);
    expect(newState.lossCondition).toBe('reelection');
  });

  it('boosts politicalWill by 10% and communityTrust by 5% on win', () => {
    const state = makeTestState({
      meters: { communityTrust: 60, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 80, budget: 2.8, climatePressure: 30 },
    });
    const result = { score: 55, won: true, breakdown: {} as any, margin: 5 };
    const newState = applyElectionResult(state, result);
    expect(newState.meters.politicalWill).toBeCloseTo(88); // 80 * 1.1
    expect(newState.meters.communityTrust).toBeCloseTo(63); // 60 * 1.05
  });

  it('adds $500K budget bonus on large margin win (margin > 20)', () => {
    const state = makeTestState({
      meters: { communityTrust: 60, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 80, budget: 2.8, climatePressure: 30 },
    });
    const result = { score: 75, won: true, breakdown: {} as any, margin: 25 };
    const newState = applyElectionResult(state, result);
    expect(newState.meters.budget).toBeCloseTo(3.3); // 2.8 + 0.5
  });

  it('does not add budget bonus on moderate win (margin <= 20)', () => {
    const state = makeTestState({
      meters: { communityTrust: 60, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 80, budget: 2.8, climatePressure: 30 },
    });
    const result = { score: 60, won: true, breakdown: {} as any, margin: 10 };
    const newState = applyElectionResult(state, result);
    expect(newState.meters.budget).toBeCloseTo(2.8);
  });

  it('does not modify meters on loss', () => {
    const state = makeTestState();
    const result = { score: 30, won: false, breakdown: {} as any, margin: -20 };
    const newState = applyElectionResult(state, result);
    expect(newState.meters.communityTrust).toBe(state.meters.communityTrust);
    expect(newState.meters.politicalWill).toBe(state.meters.politicalWill);
    expect(newState.meters.budget).toBe(state.meters.budget);
  });
});

// ---------------------------------------------------------------------------
// 6. getElectionNarrative
// ---------------------------------------------------------------------------

describe('getElectionNarrative', () => {
  it('returns resounding mandate narrative for large win (margin > 20)', () => {
    const result = { score: 75, won: true, breakdown: {} as any, margin: 25 };
    expect(getElectionNarrative(result)).toBe('A resounding mandate. The community believes in the vision.');
  });

  it('returns close call narrative for narrow win (margin 0-10)', () => {
    const result = { score: 55, won: true, breakdown: {} as any, margin: 5 };
    expect(getElectionNarrative(result)).toBe('A close call. The community gave you another chance — barely.');
  });

  it('returns solid victory narrative for moderate win (margin 10-20)', () => {
    const result = { score: 65, won: true, breakdown: {} as any, margin: 15 };
    expect(getElectionNarrative(result)).toBe('A solid victory. The work is paying off.');
  });

  it('returns so close narrative for narrow loss (margin -10 to 0)', () => {
    const result = { score: 45, won: false, breakdown: {} as any, margin: -5 };
    expect(getElectionNarrative(result)).toBe("So close. The community wasn't quite ready to continue.");
  });

  it('returns clear rejection narrative for bad loss (margin < -10)', () => {
    const result = { score: 30, won: false, breakdown: {} as any, margin: -20 };
    expect(getElectionNarrative(result)).toBe('A clear rejection. The community chose a different path.');
  });
});

// ---------------------------------------------------------------------------
// 7. predictElectionOutcome
// ---------------------------------------------------------------------------

describe('predictElectionOutcome', () => {
  it('returns predicted score matching calculateElectionScore', () => {
    const state = makeTestState();
    const prediction = predictElectionOutcome(state);
    const actual = calculateElectionScore(state);
    expect(prediction.predictedScore).toBe(actual.score);
  });

  it('flags low community trust when trust < 40', () => {
    const state = makeTestState({
      meters: { communityTrust: 30, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 2.8, climatePressure: 30 },
    });
    const prediction = predictElectionOutcome(state);
    expect(prediction.risks).toContain('Low community trust');
  });

  it('flags council opposition when more hostile than friendly', () => {
    const state = makeTestState({
      councilMembers: {
        cm1: { id: 'cm1', name: 'A', district: 'd1', districtNumber: 1, leaning: 'conservative', priorities: [], disposition: -30, backstory: '', tileIds: [] },
        cm2: { id: 'cm2', name: 'B', district: 'd2', districtNumber: 2, leaning: 'conservative', priorities: [], disposition: -25, backstory: '', tileIds: [] },
        cm3: { id: 'cm3', name: 'C', district: 'd3', districtNumber: 3, leaning: 'progressive', priorities: [], disposition: 50, backstory: '', tileIds: [] },
      },
    });
    const prediction = predictElectionOutcome(state);
    expect(prediction.risks).toContain('Council opposition');
  });

  it('flags antagonist pressure when any antagonist at level 4+', () => {
    const state = makeTestState({
      antagonists: {
        a1: { id: 'a1', name: 'A1', role: 'dev', activationCondition: '', escalationLevel: 4, escalationInterval: 4, active: true, lastEscalationTurn: 10, tileTargets: [] },
      },
    });
    const prediction = predictElectionOutcome(state);
    expect(prediction.risks).toContain('Antagonist pressure');
  });

  it('flags gentrification concerns when 3+ tiles above 60%', () => {
    const makeTile = (id: string, gp: number) => ({
      id, name: id, terrain: 'urban-dense' as const, vacancyRate: 0, ecologicalHealth: 10, contamination: 0, gentrificationPressure: gp, existingUses: [] as any[], neighborhoodTraits: [] as string[], activeProjects: [] as any[], completedProjects: [] as string[], communityPowerTokens: 0, communityOwned: false, adjacentTileIds: [] as string[], visualStage: 'dystopia' as const, consumedByproducts: [] as string[], vacantLots: 5, reclaimedLots: 0,
    });
    const state = makeTestState({
      tiles: {
        t1: makeTile('t1', 70),
        t2: makeTile('t2', 80),
        t3: makeTile('t3', 65),
      },
    });
    const prediction = predictElectionOutcome(state);
    expect(prediction.risks).toContain('Gentrification concerns');
  });

  it('flags leader dissatisfaction when fewer than 3 leaders at trust >= 40', () => {
    const state = makeTestState({
      leaders: {
        l1: { id: 'l1', name: 'L1', neighborhood: 'n', tileIds: [], backstory: '', priorities: [], trust: 50, advocacyPower: 5, proposalCooldown: 0, consecutiveDeferrals: 0 },
        l2: { id: 'l2', name: 'L2', neighborhood: 'n', tileIds: [], backstory: '', priorities: [], trust: 10, advocacyPower: 5, proposalCooldown: 0, consecutiveDeferrals: 0 },
      },
    });
    const prediction = predictElectionOutcome(state);
    expect(prediction.risks).toContain('Leader dissatisfaction');
  });

  it('returns no risks when everything is favorable', () => {
    const state = makeTestState({
      meters: { communityTrust: 80, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 2.8, climatePressure: 30 },
      leaders: {
        l1: { id: 'l1', name: 'L1', neighborhood: 'n', tileIds: [], backstory: '', priorities: [], trust: 50, advocacyPower: 5, proposalCooldown: 0, consecutiveDeferrals: 0 },
        l2: { id: 'l2', name: 'L2', neighborhood: 'n', tileIds: [], backstory: '', priorities: [], trust: 60, advocacyPower: 5, proposalCooldown: 0, consecutiveDeferrals: 0 },
        l3: { id: 'l3', name: 'L3', neighborhood: 'n', tileIds: [], backstory: '', priorities: [], trust: 70, advocacyPower: 5, proposalCooldown: 0, consecutiveDeferrals: 0 },
      },
      councilMembers: {
        cm1: { id: 'cm1', name: 'A', district: 'd1', districtNumber: 1, leaning: 'progressive', priorities: [], disposition: 50, backstory: '', tileIds: [] },
      },
    });
    const prediction = predictElectionOutcome(state);
    expect(prediction.risks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('perfect score: max trust, all allies, coalitions, no antagonists', () => {
    const state = makeTestState({
      meters: { communityTrust: 100, ecologicalHealth: 50, foodSovereignty: 50, politicalWill: 100, budget: 10, climatePressure: 0 },
      leaders: {
        l1: { id: 'l1', name: 'L1', neighborhood: 'n', tileIds: [], backstory: '', priorities: [], trust: 80, advocacyPower: 5, proposalCooldown: 0, consecutiveDeferrals: 0 },
        l2: { id: 'l2', name: 'L2', neighborhood: 'n', tileIds: [], backstory: '', priorities: [], trust: 80, advocacyPower: 5, proposalCooldown: 0, consecutiveDeferrals: 0 },
      },
      councilMembers: {
        cm1: { id: 'cm1', name: 'A', district: 'd1', districtNumber: 1, leaning: 'progressive', priorities: [], disposition: 80, backstory: '', tileIds: [] },
        cm2: { id: 'cm2', name: 'B', district: 'd2', districtNumber: 2, leaning: 'progressive', priorities: [], disposition: 60, backstory: '', tileIds: [] },
      },
      coalitions: [
        { id: 'c1', name: 'C1', memberIds: ['a', 'b', 'c'], topic: 'food', active: true, formedTurn: 5 },
        { id: 'c2', name: 'C2', memberIds: ['d', 'e', 'f'], topic: 'eco', active: true, formedTurn: 8 },
      ],
    });
    const result = calculateElectionScore(state);
    // baseTrust: 60, council: +4, leaders: +6, coalitions: +10, antagonist: 0, politicalWill: 8, displacement: 0
    expect(result.score).toBe(60 + 4 + 6 + 10 + 0 + 8 + 0);
    expect(result.won).toBe(true);
    expect(result.margin).toBe(43); // 88 - 45 = 43
  });

  it('zero trust: no allies, worst case', () => {
    const state = makeTestState({
      meters: { communityTrust: 0, ecologicalHealth: 0, foodSovereignty: 0, politicalWill: 0, budget: 0, climatePressure: 100 },
      councilMembers: {
        cm1: { id: 'cm1', name: 'A', district: 'd1', districtNumber: 1, leaning: 'conservative', priorities: [], disposition: -50, backstory: '', tileIds: [] },
      },
      antagonists: {
        a1: { id: 'a1', name: 'A1', role: 'dev', activationCondition: '', escalationLevel: 5, escalationInterval: 4, active: true, lastEscalationTurn: 10, tileTargets: [] },
      },
    });
    const result = calculateElectionScore(state);
    // baseTrust: 0, council: -2, leaders: 0, coalitions: 0, antagonist: -4, politicalWill: 0, displacement: 0
    expect(result.score).toBe(-6);
    expect(result.won).toBe(false);
    expect(result.margin).toBe(-51); // -6 - 45 = -51
  });

  it('all antagonists active at high escalation', () => {
    const state = makeTestState({
      antagonists: {
        a1: { id: 'a1', name: 'A1', role: 'dev', activationCondition: '', escalationLevel: 3, escalationInterval: 4, active: true, lastEscalationTurn: 10, tileTargets: [] },
        a2: { id: 'a2', name: 'A2', role: 'pol', activationCondition: '', escalationLevel: 4, escalationInterval: 4, active: true, lastEscalationTurn: 10, tileTargets: [] },
        a3: { id: 'a3', name: 'A3', role: 'corp', activationCondition: '', escalationLevel: 5, escalationInterval: 4, active: true, lastEscalationTurn: 10, tileTargets: [] },
        a4: { id: 'a4', name: 'A4', role: 'media', activationCondition: '', escalationLevel: 3, escalationInterval: 4, active: true, lastEscalationTurn: 10, tileTargets: [] },
      },
    });
    const result = calculateElectionScore(state);
    expect(result.breakdown.antagonistPenalty).toBe(-16); // 4 * -4
  });
});
