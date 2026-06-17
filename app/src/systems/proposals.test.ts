import { describe, it, expect } from 'vitest';
import {
  generateProposals,
  applyProposalResponse,
  isLeaderAdvocate,
  getAdvocateCount,
  tickProposalPressure,
  applyExpirationPenalties,
} from './proposals';
import type {
  GameState,
  CommunityLeader,
  Tile,
  Proposal,
  ActiveProject,
} from '../state/types';

// ---------------------------------------------------------------------------
// The real implementation imports PROJECT_CATALOG from data/content/project-catalog.
// Tests below use the canonical catalog values:
//
//   food_forest:       baseCost 0.75, baseDuration 3, maxContamination 50
//   community_kitchen: baseCost 0.50, baseDuration 2, maxContamination 50
//   soil_remediation:  baseCost 1.00, baseDuration 4, maxContamination null
//   land_trust:        baseCost 1.20, baseDuration 3, maxContamination null
//   maker_space:       baseCost 0.60, baseDuration 2, maxContamination null
//   greenway:          baseCost 1.00, baseDuration 3, maxContamination null
//   native_planting:   baseCost 0.80, baseDuration 3, maxContamination null
// ---------------------------------------------------------------------------

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

function makeLeader(overrides: Partial<CommunityLeader> = {}): CommunityLeader {
  return {
    id: 'grace',
    name: 'Grace Okafor-Williams',
    neighborhood: 'Brightmoor',
    tileIds: ['brightmoor'],
    backstory:
      'An urban farmer in her 60s who has been growing food on vacant lots since 2008.',
    priorities: ['food_forest', 'community_kitchen', 'soil_remediation'],
    trust: 30,
    advocacyPower: 4,
    proposalCooldown: 0,
    consecutiveDeferrals: 0,
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
    leaders: {
      grace: makeLeader(),
    },
    councilMembers: {},
    antagonists: {},
    activeProposals: [],
    pendingProposals: [],
    activePolicies: [],
    publicOpinion: { foodSovereignty: 50, waterCommons: 50, landReform: 50, ecologicalRestoration: 50, cooperativeEconomics: 50 },
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

function makeActiveProject(overrides: Partial<ActiveProject> = {}): ActiveProject {
  return {
    definitionId: 'food_forest',
    tileId: 'brightmoor',
    mode: 'community-led',
    progress: 0,
    duration: 5,
    cost: 0.6375,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: generateProposals
// ---------------------------------------------------------------------------

describe('generateProposals', () => {
  it('generates a proposal for a leader with trust >= 0 and cooldown 0', () => {
    const state = makeGameState();
    const proposals = generateProposals(state);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].leaderId).toBe('grace');
    expect(proposals[0].projectDefinitionId).toBe('food_forest');
  });

  it('does NOT generate a proposal for a leader with trust < 0', () => {
    const state = makeGameState({
      leaders: { grace: makeLeader({ trust: -5 }) },
    });
    const proposals = generateProposals(state);
    expect(proposals).toHaveLength(0);
  });

  it('does NOT generate a proposal for a leader with proposalCooldown > 0', () => {
    const state = makeGameState({
      leaders: { grace: makeLeader({ proposalCooldown: 2 }) },
    });
    const proposals = generateProposals(state);
    expect(proposals).toHaveLength(0);
  });

  it('picks the first available priority project', () => {
    const state = makeGameState({
      leaders: {
        kez: makeLeader({
          id: 'kez',
          name: 'Kezia "Kez" Monroe',
          neighborhood: 'Corktown',
          tileIds: ['corktown'],
          priorities: ['land_trust', 'community_kitchen', 'maker_space'],
          trust: 10,
          advocacyPower: 3,
        }),
      },
      tiles: {
        corktown: makeTile({ id: 'corktown', name: 'Corktown', terrain: 'urban-sparse' }),
      },
    });
    const proposals = generateProposals(state);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].projectDefinitionId).toBe('land_trust');
  });

  it('skips a priority project if already active on the leader tile', () => {
    const state = makeGameState({
      tiles: {
        brightmoor: makeTile({
          activeProjects: [makeActiveProject({ definitionId: 'food_forest' })],
        }),
      },
    });
    const proposals = generateProposals(state);
    expect(proposals).toHaveLength(1);
    // food_forest is active, so next priority is community_kitchen
    expect(proposals[0].projectDefinitionId).toBe('community_kitchen');
  });

  it('generates no proposal if no priority project fits', () => {
    const state = makeGameState({
      tiles: {
        brightmoor: makeTile({
          activeProjects: [
            makeActiveProject({ definitionId: 'food_forest' }),
            makeActiveProject({ definitionId: 'community_kitchen' }),
            makeActiveProject({ definitionId: 'soil_remediation' }),
          ],
        }),
      },
    });
    const proposals = generateProposals(state);
    expect(proposals).toHaveLength(0);
  });

  it('skips a project if the tile contamination exceeds maxContamination', () => {
    // food_forest has maxContamination: 50, community_kitchen has maxContamination: 50
    // tile contamination is 60, so both are skipped; next is soil_remediation (maxContamination: null)
    const state = makeGameState({
      tiles: {
        brightmoor: makeTile({ contamination: 60 }),
      },
    });
    const proposals = generateProposals(state);
    expect(proposals).toHaveLength(1);
    // food_forest and community_kitchen skipped due to contamination, next is soil_remediation
    expect(proposals[0].projectDefinitionId).toBe('soil_remediation');
  });

  it('produces deterministic proposals given the same state', () => {
    const state = makeGameState({
      leaders: {
        grace: makeLeader(),
        kez: makeLeader({
          id: 'kez',
          tileIds: ['corktown'],
          priorities: ['land_trust', 'community_kitchen', 'maker_space'],
          trust: 10,
        }),
      },
      tiles: {
        brightmoor: makeTile(),
        corktown: makeTile({ id: 'corktown', name: 'Corktown', terrain: 'urban-sparse' }),
      },
    });
    const proposals1 = generateProposals(state);
    const proposals2 = generateProposals(state);
    expect(proposals1).toEqual(proposals2);
  });

  it('sets proposal id as leaderId_turn', () => {
    const state = makeGameState({ turn: 7 });
    const proposals = generateProposals(state);
    expect(proposals[0].id).toBe('grace_7');
  });

  it('sets tileId to the first tile in the leader tileIds', () => {
    const state = makeGameState();
    const proposals = generateProposals(state);
    expect(proposals[0].tileId).toBe('brightmoor');
  });

  it('includes turnProposed matching the current turn', () => {
    const state = makeGameState({ turn: 12 });
    const proposals = generateProposals(state);
    expect(proposals[0].turnProposed).toBe(12);
  });

  it('includes a reason string', () => {
    const state = makeGameState();
    const proposals = generateProposals(state);
    expect(typeof proposals[0].reason).toBe('string');
    expect(proposals[0].reason.length).toBeGreaterThan(0);
  });

  it('leader with trust exactly 0 generates a proposal', () => {
    const state = makeGameState({
      leaders: { grace: makeLeader({ trust: 0 }) },
    });
    const proposals = generateProposals(state);
    expect(proposals).toHaveLength(1);
  });

  it('sets default expirationTurn to currentTurn + 3', () => {
    const state = makeGameState({ turn: 10 });
    const proposals = generateProposals(state);
    expect(proposals[0].expirationTurn).toBe(13);
  });

  it('uses leader urgencyWindow for expirationTurn when set', () => {
    const state = makeGameState({
      turn: 10,
      leaders: { grace: makeLeader({ urgencyWindow: 5 }) },
    });
    const proposals = generateProposals(state);
    expect(proposals[0].expirationTurn).toBe(15);
  });

  it('uses leader urgencyWindow of 2 for urgent leaders', () => {
    const state = makeGameState({
      turn: 10,
      leaders: { grace: makeLeader({ urgencyWindow: 2 }) },
    });
    const proposals = generateProposals(state);
    expect(proposals[0].expirationTurn).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Tests: applyProposalResponse
// ---------------------------------------------------------------------------

describe('applyProposalResponse', () => {
  function stateWithProposal(): GameState {
    const proposal: Proposal = {
      id: 'grace_5',
      leaderId: 'grace',
      projectDefinitionId: 'food_forest',
      tileId: 'brightmoor',
      reason: 'We need to grow our own food.',
      turnProposed: 5,
      expirationTurn: 8,
      pressureLevel: 0,
    };
    return makeGameState({
      activeProposals: [proposal],
    });
  }

  describe('accept', () => {
    it('increases leader trust by 6 at pressure 0 (early funding)', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'accept');
      expect(result.leaders.grace.trust).toBe(36); // 30 + 6
    });

    it('increases leader trust by 3 at pressure 3 (late funding)', () => {
      const state = stateWithProposal();
      state.activeProposals[0].pressureLevel = 3;
      const result = applyProposalResponse(state, 'grace_5', 'accept');
      expect(result.leaders.grace.trust).toBe(33); // 30 + 3
    });

    it('increases leader trust by 5 at pressure 1', () => {
      const state = stateWithProposal();
      state.activeProposals[0].pressureLevel = 1;
      const result = applyProposalResponse(state, 'grace_5', 'accept');
      expect(result.leaders.grace.trust).toBe(35); // 30 + 5
    });

    it('starts project at 85% base cost', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'accept');
      const tile = result.tiles.brightmoor;
      expect(tile.activeProjects).toHaveLength(1);
      const project = tile.activeProjects[0];
      // baseCost is 0.10, 85% = 0.085
      expect(project.cost).toBeCloseTo(0.085, 5);
    });

    it('starts project in community-led mode', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'accept');
      const project = result.tiles.brightmoor.activeProjects[0];
      expect(project.mode).toBe('community-led');
    });

    it('sets community-led duration: ceil(baseDuration * 1.5), min baseDuration + 1', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'accept');
      const project = result.tiles.brightmoor.activeProjects[0];
      // baseDuration is 9, ceil(9*1.5)=14, min is 9+1=10, so 14
      expect(project.duration).toBe(14);
    });

    it('removes the proposal from activeProposals', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'accept');
      expect(result.activeProposals).toHaveLength(0);
    });

    it('resets consecutiveDeferrals to 0', () => {
      const state = stateWithProposal();
      state.leaders.grace.consecutiveDeferrals = 2;
      const result = applyProposalResponse(state, 'grace_5', 'accept');
      expect(result.leaders.grace.consecutiveDeferrals).toBe(0);
    });

    it('deducts cost from budget', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'accept');
      // budget was 10.0, cost is 0.085
      expect(result.meters.budget).toBeCloseTo(10.0 - 0.085, 5);
    });
  });

  describe('modify', () => {
    it('increases leader trust by 2', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'modify');
      expect(result.leaders.grace.trust).toBe(32); // 30 + 2
    });

    it('starts project at 90% base cost', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'modify');
      const project = result.tiles.brightmoor.activeProjects[0];
      // baseCost is 0.10, 90% = 0.09
      expect(project.cost).toBeCloseTo(0.09, 5);
    });

    it('removes proposal from activeProposals', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'modify');
      expect(result.activeProposals).toHaveLength(0);
    });

    it('resets consecutiveDeferrals to 0', () => {
      const state = stateWithProposal();
      state.leaders.grace.consecutiveDeferrals = 1;
      const result = applyProposalResponse(state, 'grace_5', 'modify');
      expect(result.leaders.grace.consecutiveDeferrals).toBe(0);
    });

    it('deducts cost from budget', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'modify');
      // budget was 10.0, cost is 0.09
      expect(result.meters.budget).toBeCloseTo(10.0 - 0.09, 5);
    });
  });

  describe('reject', () => {
    it('decreases leader trust by 15', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'reject');
      expect(result.leaders.grace.trust).toBe(15); // 30 - 15
    });

    it('removes proposal from activeProposals', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'grace_5', 'reject');
      expect(result.activeProposals).toHaveLength(0);
    });

    it('resets consecutiveDeferrals to 0', () => {
      const state = stateWithProposal();
      state.leaders.grace.consecutiveDeferrals = 2;
      const result = applyProposalResponse(state, 'grace_5', 'reject');
      expect(result.leaders.grace.consecutiveDeferrals).toBe(0);
    });
  });

  describe('trust clamping', () => {
    it('clamps trust to max 100', () => {
      const proposal: Proposal = {
        id: 'grace_5',
        leaderId: 'grace',
        projectDefinitionId: 'food_forest',
        tileId: 'brightmoor',
        reason: 'We need to grow our own food.',
        turnProposed: 5,
        expirationTurn: 8,
        pressureLevel: 0,
      };
      const state = makeGameState({
        activeProposals: [proposal],
        leaders: { grace: makeLeader({ trust: 95 }) },
      });
      const result = applyProposalResponse(state, 'grace_5', 'accept');
      expect(result.leaders.grace.trust).toBe(100); // 95 + 6 = 101, clamped to 100
    });

    it('clamps trust to min -100', () => {
      const proposal: Proposal = {
        id: 'grace_5',
        leaderId: 'grace',
        projectDefinitionId: 'food_forest',
        tileId: 'brightmoor',
        reason: 'We need to grow our own food.',
        turnProposed: 5,
        expirationTurn: 8,
        pressureLevel: 0,
      };
      const state = makeGameState({
        activeProposals: [proposal],
        leaders: { grace: makeLeader({ trust: -90 }) },
      });
      const result = applyProposalResponse(state, 'grace_5', 'reject');
      expect(result.leaders.grace.trust).toBe(-100); // -90 - 15 = -105, clamped to -100
    });
  });

  describe('state immutability', () => {
    it('does not mutate the original state', () => {
      const state = stateWithProposal();
      const originalTrust = state.leaders.grace.trust;
      const originalBudget = state.meters.budget;
      const originalProposalCount = state.activeProposals.length;
      const originalTileProjects = state.tiles.brightmoor.activeProjects.length;

      applyProposalResponse(state, 'grace_5', 'accept');

      expect(state.leaders.grace.trust).toBe(originalTrust);
      expect(state.meters.budget).toBe(originalBudget);
      expect(state.activeProposals.length).toBe(originalProposalCount);
      expect(state.tiles.brightmoor.activeProjects.length).toBe(originalTileProjects);
    });
  });

  describe('invalid proposal', () => {
    it('returns state unchanged for an invalid proposalId', () => {
      const state = stateWithProposal();
      const result = applyProposalResponse(state, 'nonexistent_99', 'accept');
      expect(result).toEqual(state);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: isLeaderAdvocate
// ---------------------------------------------------------------------------

describe('isLeaderAdvocate', () => {
  it('returns true for leader with trust >= 40', () => {
    expect(isLeaderAdvocate(makeLeader({ trust: 40 }))).toBe(true);
  });

  it('returns false for leader with trust 39', () => {
    expect(isLeaderAdvocate(makeLeader({ trust: 39 }))).toBe(false);
  });

  it('returns true for leader with trust 100', () => {
    expect(isLeaderAdvocate(makeLeader({ trust: 100 }))).toBe(true);
  });

  it('returns false for leader with trust 0', () => {
    expect(isLeaderAdvocate(makeLeader({ trust: 0 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: getAdvocateCount
// ---------------------------------------------------------------------------

describe('getAdvocateCount', () => {
  it('returns 0 when no leaders are advocates', () => {
    const leaders: Record<string, CommunityLeader> = {
      grace: makeLeader({ trust: 30 }),
      kez: makeLeader({ id: 'kez', trust: 10 }),
    };
    expect(getAdvocateCount(leaders)).toBe(0);
  });

  it('counts leaders with trust >= 40', () => {
    const leaders: Record<string, CommunityLeader> = {
      grace: makeLeader({ trust: 45 }),
      kez: makeLeader({ id: 'kez', trust: 10 }),
      darius: makeLeader({ id: 'darius', trust: 50 }),
    };
    expect(getAdvocateCount(leaders)).toBe(2);
  });

  it('counts all leaders when all are advocates', () => {
    const leaders: Record<string, CommunityLeader> = {
      grace: makeLeader({ trust: 40 }),
      kez: makeLeader({ id: 'kez', trust: 40 }),
      darius: makeLeader({ id: 'darius', trust: 40 }),
    };
    expect(getAdvocateCount(leaders)).toBe(3);
  });

  it('returns 0 for empty record', () => {
    expect(getAdvocateCount({})).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: tickProposalPressure
// ---------------------------------------------------------------------------

describe('tickProposalPressure', () => {
  function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
    return {
      id: 'grace_5',
      leaderId: 'grace',
      projectDefinitionId: 'food_forest',
      tileId: 'brightmoor',
      reason: 'We need to grow our own food.',
      turnProposed: 5,
      expirationTurn: 8,
      pressureLevel: 0,
      ...overrides,
    };
  }

  it('increments pressureLevel on active proposals', () => {
    const proposals = [makeProposal({ pressureLevel: 0 })];
    const leaders = { grace: makeLeader() };
    const { active } = tickProposalPressure(proposals, 6, leaders);
    expect(active[0].pressureLevel).toBe(1);
  });

  it('expires proposals at or past expirationTurn', () => {
    const proposals = [makeProposal({ expirationTurn: 6 })];
    const leaders = { grace: makeLeader() };
    const { active, expired } = tickProposalPressure(proposals, 6, leaders);
    expect(active).toHaveLength(0);
    expect(expired).toHaveLength(1);
  });

  it('generates pressure event at level 3', () => {
    const proposals = [makeProposal({ pressureLevel: 2 })];
    const leaders = { grace: makeLeader() };
    const { pressureEvents } = tickProposalPressure(proposals, 6, leaders);
    expect(pressureEvents).toHaveLength(1);
    expect(pressureEvents[0].category).toBe('community');
  });

  it('does not generate pressure event below level 3', () => {
    const proposals = [makeProposal({ pressureLevel: 1 })];
    const leaders = { grace: makeLeader() };
    const { pressureEvents } = tickProposalPressure(proposals, 6, leaders);
    expect(pressureEvents).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: applyExpirationPenalties
// ---------------------------------------------------------------------------

describe('applyExpirationPenalties', () => {
  function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
    return {
      id: 'grace_5',
      leaderId: 'grace',
      projectDefinitionId: 'food_forest',
      tileId: 'brightmoor',
      reason: 'We need to grow our own food.',
      turnProposed: 5,
      expirationTurn: 8,
      pressureLevel: 0,
      ...overrides,
    };
  }

  it('applies full -12 penalty for partner-level leaders at pressure 3', () => {
    const leaders = { grace: makeLeader({ trust: 50 }) };
    const result = applyExpirationPenalties(leaders, [makeProposal({ pressureLevel: 3 })]);
    expect(result.grace.trust).toBe(38);
  });

  it('applies reduced -6 penalty for partner-level leaders at pressure 0', () => {
    const leaders = { grace: makeLeader({ trust: 50 }) };
    const result = applyExpirationPenalties(leaders, [makeProposal({ pressureLevel: 0 })]);
    expect(result.grace.trust).toBe(44);
  });

  it('applies -8 penalty for neutral leaders at pressure 3', () => {
    const leaders = { grace: makeLeader({ trust: 20 }) };
    const result = applyExpirationPenalties(leaders, [makeProposal({ pressureLevel: 3 })]);
    expect(result.grace.trust).toBe(12);
  });

  it('applies -4 penalty for neutral leaders at pressure 0', () => {
    const leaders = { grace: makeLeader({ trust: 20 }) };
    const result = applyExpirationPenalties(leaders, [makeProposal({ pressureLevel: 0 })]);
    expect(result.grace.trust).toBe(16);
  });

  it('applies -3 penalty for hostile leaders at pressure 3', () => {
    const leaders = { grace: makeLeader({ trust: -10 }) };
    const result = applyExpirationPenalties(leaders, [makeProposal({ pressureLevel: 3 })]);
    expect(result.grace.trust).toBe(-13);
  });

  it('scales penalty at pressure 2 (75% multiplier)', () => {
    const leaders = { grace: makeLeader({ trust: 50 }) };
    const result = applyExpirationPenalties(leaders, [makeProposal({ pressureLevel: 2 })]);
    // -12 * 0.75 = -9
    expect(result.grace.trust).toBe(41);
  });

  it('clamps trust to -100', () => {
    const leaders = { grace: makeLeader({ trust: -99 }) };
    const result = applyExpirationPenalties(leaders, [makeProposal({ pressureLevel: 3 })]);
    expect(result.grace.trust).toBe(-100);
  });
});
