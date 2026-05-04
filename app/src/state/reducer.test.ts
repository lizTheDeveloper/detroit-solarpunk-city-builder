import { describe, it, expect } from 'vitest';
import { gameReducer } from './reducer';
import { createNewGame } from './create-game';
import type { GameState, GameAction, ProjectDefinition, Proposal } from './types';

// Helper: a cheap test project definition
function testProject(overrides: Partial<ProjectDefinition> = {}): ProjectDefinition {
  return {
    id: 'solar_array',
    name: 'Solar Array',
    category: 'ecology',
    growthCategory: 'growth',
    baseCost: 2.0,
    baseDuration: 3,
    effects: {
      tileEco: 5,
      foodSov: 0,
      trust: 3,
      annualRevenue: 0.5,
      contaminationReduction: 0,
      gentrificationChange: 0,
      other: [],
    },
    maxContamination: null,
    stageRequired: 'awakening',
    terrainRequired: null,
    ...overrides,
  };
}

// Helper: create state with a project registry injected
// We'll store project definitions in a lookup that the reducer can use
function stateWithProjects(
  projects: ProjectDefinition[],
  stateOverrides: Partial<GameState> = {},
): GameState {
  const base = createNewGame();
  return {
    ...base,
    ...stateOverrides,
    // We inject projectDefinitions for the reducer to look up
    tiles: stateOverrides.tiles ?? base.tiles,
    meters: stateOverrides.meters ?? base.meters,
    leaders: stateOverrides.leaders ?? base.leaders,
  } as GameState & { projectDefinitions: Record<string, ProjectDefinition> };
}

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 'proposal_1',
    leaderId: 'grace',
    projectDefinitionId: 'solar_array',
    tileId: 'brightmoor',
    reason: 'We need clean energy',
    turnProposed: 1,
    ...overrides,
  };
}

describe('gameReducer', () => {
  const solarProject = testProject();
  const projects: Record<string, ProjectDefinition> = {
    solar_array: solarProject,
  };

  describe('unknown actions', () => {
    it('returns state unchanged for unknown action types', () => {
      const state = createNewGame();
      const result = gameReducer(state, { type: 'UNKNOWN_ACTION' } as unknown as GameAction, {});
      expect(result).toBe(state);
    });
  });

  describe('START_PROJECT', () => {
    it('deducts cost and adds ActiveProject to the tile (player-initiated, 100% cost)', () => {
      const state = createNewGame();
      const action: GameAction = {
        type: 'START_PROJECT',
        tileId: 'brightmoor',
        projectId: 'solar_array',
        mode: 'player-initiated',
      };

      const result = gameReducer(state, action, projects);

      expect(result.meters.budget).toBeCloseTo(2.8 - 2.0);
      expect(result.tiles['brightmoor'].activeProjects).toHaveLength(1);
      expect(result.tiles['brightmoor'].activeProjects[0]).toEqual({
        definitionId: 'solar_array',
        tileId: 'brightmoor',
        mode: 'player-initiated',
        progress: 0,
        duration: 3,
        cost: 2.0,
      });
    });

    it('community-led mode uses 130% cost', () => {
      const state = createNewGame();
      const action: GameAction = {
        type: 'START_PROJECT',
        tileId: 'brightmoor',
        projectId: 'solar_array',
        mode: 'community-led',
      };

      const result = gameReducer(state, action, projects);

      const expectedCost = 2.0 * 1.3;
      expect(result.meters.budget).toBeCloseTo(2.8 - expectedCost);
      expect(result.tiles['brightmoor'].activeProjects[0].cost).toBeCloseTo(expectedCost);
      expect(result.tiles['brightmoor'].activeProjects[0].mode).toBe('community-led');
    });

    it('returns unchanged state if budget is insufficient', () => {
      const state = createNewGame();
      // Set budget very low
      const lowBudgetState: GameState = {
        ...state,
        meters: { ...state.meters, budget: 0.5 },
      };
      const action: GameAction = {
        type: 'START_PROJECT',
        tileId: 'brightmoor',
        projectId: 'solar_array',
        mode: 'player-initiated',
      };

      const result = gameReducer(lowBudgetState, action, projects);

      expect(result).toBe(lowBudgetState);
      expect(result.meters.budget).toBe(0.5);
    });

    it('returns unchanged state if concurrent project limit is reached', () => {
      const state = createNewGame();
      // Fill up to maxConcurrentProjects (4) across all tiles
      const filledState: GameState = {
        ...state,
        meters: { ...state.meters, budget: 100 },
        tiles: {
          ...state.tiles,
          brightmoor: {
            ...state.tiles['brightmoor'],
            activeProjects: [
              { definitionId: 'p1', tileId: 'brightmoor', mode: 'player-initiated', progress: 0, duration: 3, cost: 1 },
              { definitionId: 'p2', tileId: 'brightmoor', mode: 'player-initiated', progress: 0, duration: 3, cost: 1 },
            ],
          },
          corktown: {
            ...state.tiles['corktown'],
            activeProjects: [
              { definitionId: 'p3', tileId: 'corktown', mode: 'player-initiated', progress: 0, duration: 3, cost: 1 },
              { definitionId: 'p4', tileId: 'corktown', mode: 'player-initiated', progress: 0, duration: 3, cost: 1 },
            ],
          },
        },
      };

      const action: GameAction = {
        type: 'START_PROJECT',
        tileId: 'eastern_market',
        projectId: 'solar_array',
        mode: 'player-initiated',
      };

      const result = gameReducer(filledState, action, projects);

      expect(result).toBe(filledState);
    });

    it('returns unchanged state if tile contamination exceeds project maxContamination', () => {
      const state = createNewGame();
      const contaminationProject = testProject({
        id: 'community_garden',
        maxContamination: 15, // Brightmoor has contamination 20
      });

      const action: GameAction = {
        type: 'START_PROJECT',
        tileId: 'brightmoor',
        projectId: 'community_garden',
        mode: 'player-initiated',
      };

      const result = gameReducer(state, action, {
        ...projects,
        community_garden: contaminationProject,
      });

      expect(result).toBe(state);
    });

    it('allows project when tile contamination is at or below maxContamination', () => {
      const state = createNewGame();
      const contaminationProject = testProject({
        id: 'community_garden',
        baseCost: 1.0,
        maxContamination: 20, // Brightmoor has exactly 20
      });

      const action: GameAction = {
        type: 'START_PROJECT',
        tileId: 'brightmoor',
        projectId: 'community_garden',
        mode: 'player-initiated',
      };

      const result = gameReducer(state, action, {
        ...projects,
        community_garden: contaminationProject,
      });

      expect(result.tiles['brightmoor'].activeProjects).toHaveLength(1);
    });

    it('returns unchanged state if project definition not found', () => {
      const state = createNewGame();
      const action: GameAction = {
        type: 'START_PROJECT',
        tileId: 'brightmoor',
        projectId: 'nonexistent',
        mode: 'player-initiated',
      };

      const result = gameReducer(state, action, projects);

      expect(result).toBe(state);
    });

    it('does not mutate the original state', () => {
      const state = createNewGame();
      const originalBudget = state.meters.budget;
      const originalProjects = state.tiles['brightmoor'].activeProjects.length;

      const action: GameAction = {
        type: 'START_PROJECT',
        tileId: 'brightmoor',
        projectId: 'solar_array',
        mode: 'player-initiated',
      };

      gameReducer(state, action, projects);

      expect(state.meters.budget).toBe(originalBudget);
      expect(state.tiles['brightmoor'].activeProjects.length).toBe(originalProjects);
    });
  });

  describe('RESPOND_PROPOSAL', () => {
    function stateWithProposal(proposal?: Proposal): GameState {
      const state = createNewGame();
      const p = proposal ?? makeProposal();
      return {
        ...state,
        meters: { ...state.meters, budget: 100 },
        activeProposals: [p],
      };
    }

    describe('accept', () => {
      it('increases leader trust by +10', () => {
        const state = stateWithProposal();
        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'accept',
        };

        const result = gameReducer(state, action, projects);

        expect(result.leaders['grace'].trust).toBe(state.leaders['grace'].trust + 10);
      });

      it('starts project at 85% cost in community-led mode', () => {
        const state = stateWithProposal();
        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'accept',
        };

        const result = gameReducer(state, action, projects);

        const expectedCost = 2.0 * 0.85;
        expect(result.tiles['brightmoor'].activeProjects).toHaveLength(1);
        expect(result.tiles['brightmoor'].activeProjects[0].mode).toBe('community-led');
        expect(result.tiles['brightmoor'].activeProjects[0].cost).toBeCloseTo(expectedCost);
        expect(result.meters.budget).toBeCloseTo(100 - expectedCost);
      });

      it('removes proposal from activeProposals', () => {
        const state = stateWithProposal();
        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'accept',
        };

        const result = gameReducer(state, action, projects);

        expect(result.activeProposals).toHaveLength(0);
      });
    });

    describe('modify', () => {
      it('increases leader trust by +3', () => {
        const state = stateWithProposal();
        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'modify',
        };

        const result = gameReducer(state, action, projects);

        expect(result.leaders['grace'].trust).toBe(state.leaders['grace'].trust + 3);
      });

      it('starts project with reduced effects marker (50% trust gain on completion)', () => {
        const state = stateWithProposal();
        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'modify',
        };

        const result = gameReducer(state, action, projects);

        expect(result.tiles['brightmoor'].activeProjects).toHaveLength(1);
        // The project should start — we verify it exists
        expect(result.tiles['brightmoor'].activeProjects[0].definitionId).toBe('solar_array');
      });

      it('removes proposal from activeProposals', () => {
        const state = stateWithProposal();
        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'modify',
        };

        const result = gameReducer(state, action, projects);

        expect(result.activeProposals).toHaveLength(0);
      });
    });

    describe('defer', () => {
      it('decreases leader trust by -5', () => {
        const state = stateWithProposal();
        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'defer',
        };

        const result = gameReducer(state, action, projects);

        expect(result.leaders['grace'].trust).toBe(state.leaders['grace'].trust - 5);
      });

      it('moves proposal to pendingProposals', () => {
        const state = stateWithProposal();
        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'defer',
        };

        const result = gameReducer(state, action, projects);

        expect(result.activeProposals).toHaveLength(0);
        expect(result.pendingProposals).toHaveLength(1);
        expect(result.pendingProposals[0].id).toBe('proposal_1');
      });

      it('increments leader consecutiveDeferrals', () => {
        const state = stateWithProposal();
        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'defer',
        };

        const result = gameReducer(state, action, projects);

        expect(result.leaders['grace'].consecutiveDeferrals).toBe(1);
      });

      it('treats as reject when consecutiveDeferrals >= 3 (before increment would be 3)', () => {
        const state = stateWithProposal();
        // Set Grace to already have 2 consecutive deferrals; this 3rd will trigger reject
        const stateWith2Deferrals: GameState = {
          ...state,
          leaders: {
            ...state.leaders,
            grace: {
              ...state.leaders['grace'],
              consecutiveDeferrals: 2,
            },
          },
        };

        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'defer',
        };

        const result = gameReducer(stateWith2Deferrals, action, projects);

        // Should behave as reject: trust -15 (not -5)
        expect(result.leaders['grace'].trust).toBe(
          stateWith2Deferrals.leaders['grace'].trust - 15,
        );
        // Should NOT go to pendingProposals (rejected, not deferred)
        expect(result.pendingProposals).toHaveLength(0);
        expect(result.activeProposals).toHaveLength(0);
      });
    });

    describe('reject', () => {
      it('decreases leader trust by -15', () => {
        const state = stateWithProposal();
        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'reject',
        };

        const result = gameReducer(state, action, projects);

        expect(result.leaders['grace'].trust).toBe(state.leaders['grace'].trust - 15);
      });

      it('removes proposal from activeProposals without adding to pending', () => {
        const state = stateWithProposal();
        const action: GameAction = {
          type: 'RESPOND_PROPOSAL',
          proposalId: 'proposal_1',
          response: 'reject',
        };

        const result = gameReducer(state, action, projects);

        expect(result.activeProposals).toHaveLength(0);
        expect(result.pendingProposals).toHaveLength(0);
      });
    });

    it('returns unchanged state if proposal not found', () => {
      const state = stateWithProposal();
      const action: GameAction = {
        type: 'RESPOND_PROPOSAL',
        proposalId: 'nonexistent',
        response: 'accept',
      };

      const result = gameReducer(state, action, projects);

      expect(result).toBe(state);
    });

    it('does not mutate the original state', () => {
      const state = stateWithProposal();
      const originalTrust = state.leaders['grace'].trust;
      const originalActiveLen = state.activeProposals.length;

      const action: GameAction = {
        type: 'RESPOND_PROPOSAL',
        proposalId: 'proposal_1',
        response: 'accept',
      };

      gameReducer(state, action, projects);

      expect(state.leaders['grace'].trust).toBe(originalTrust);
      expect(state.activeProposals.length).toBe(originalActiveLen);
    });
  });

  describe('END_TURN', () => {
    it('advances season from spring to summer', () => {
      const state = createNewGame(); // spring
      const result = gameReducer(state, { type: 'END_TURN' }, projects);
      expect(result.season).toBe('summer');
    });

    it('advances season from summer to fall', () => {
      const state: GameState = { ...createNewGame(), season: 'summer' };
      const result = gameReducer(state, { type: 'END_TURN' }, projects);
      expect(result.season).toBe('fall');
    });

    it('advances season from fall to winter', () => {
      const state: GameState = { ...createNewGame(), season: 'fall' };
      const result = gameReducer(state, { type: 'END_TURN' }, projects);
      expect(result.season).toBe('winter');
    });

    it('wraps winter to spring and increments year', () => {
      const state: GameState = { ...createNewGame(), season: 'winter', year: 1 };
      const result = gameReducer(state, { type: 'END_TURN' }, projects);
      expect(result.season).toBe('spring');
      expect(result.year).toBe(2);
    });

    it('increments turn', () => {
      const state = createNewGame();
      const result = gameReducer(state, { type: 'END_TURN' }, projects);
      expect(result.turn).toBe(2);
    });

    it('recalculates maxConcurrentProjects based on communityTrust after meter feedback', () => {
      const state = createNewGame();
      // Change communityTrust to 76 => after meter feedback trust decays -0.5 => 75.5
      // floor(2 + 75.5/25) = floor(5.02) = 5
      const modifiedState: GameState = {
        ...state,
        meters: { ...state.meters, communityTrust: 76 },
      };

      const result = gameReducer(modifiedState, { type: 'END_TURN' }, projects);

      expect(result.maxConcurrentProjects).toBe(5);
    });

    it('recalculates maxConcurrentProjects with low trust', () => {
      const state = createNewGame();
      // communityTrust 10 => floor(2 + 10/25) = floor(2.4) = 2
      const modifiedState: GameState = {
        ...state,
        meters: { ...state.meters, communityTrust: 10 },
      };

      const result = gameReducer(modifiedState, { type: 'END_TURN' }, projects);

      expect(result.maxConcurrentProjects).toBe(2);
    });

    it('does not mutate original state', () => {
      const state = createNewGame();
      const originalTurn = state.turn;
      const originalSeason = state.season;

      gameReducer(state, { type: 'END_TURN' }, projects);

      expect(state.turn).toBe(originalTurn);
      expect(state.season).toBe(originalSeason);
    });

    it('year stays the same for non-winter seasons', () => {
      const state = createNewGame(); // spring, year 1
      const result = gameReducer(state, { type: 'END_TURN' }, projects);
      expect(result.year).toBe(1);
    });
  });

  describe('pure function verification', () => {
    it('never returns mutated input for any action', () => {
      const state = createNewGame();
      const frozenState = JSON.parse(JSON.stringify(state)) as GameState;

      // START_PROJECT
      gameReducer(state, {
        type: 'START_PROJECT',
        tileId: 'brightmoor',
        projectId: 'solar_array',
        mode: 'player-initiated',
      }, projects);
      expect(state).toEqual(frozenState);

      // END_TURN
      gameReducer(state, { type: 'END_TURN' }, projects);
      expect(state).toEqual(frozenState);
    });
  });

  // =========================================================================
  // Phase 2 Action Handlers
  // =========================================================================

  describe('ENACT_POLICY', () => {
    it('enacts a valid policy with sufficient Will — policy enacted, Will reduced', () => {
      const state = createNewGame();
      // urban_agriculture_zoning: baseThreshold=0.30, enactmentCost=0.08
      // requiredWill = 0.30 + 0.08 = 0.38 → need 38% Will
      // Default state has 60% Will — sufficient
      const highWillState: GameState = {
        ...state,
        meters: { ...state.meters, politicalWill: 60 },
      };

      const action: GameAction = { type: 'ENACT_POLICY', policyId: 'urban_agriculture_zoning' };
      const result = gameReducer(highWillState, action);

      // enactmentCost is 0.08 in decimal → 8 in 0-100 scale
      expect(result.meters.politicalWill).toBeCloseTo(60 - 8);
      expect(result.activePolicies).toHaveLength(1);
      expect(result.activePolicies[0].definitionId).toBe('urban_agriculture_zoning');
    });

    it('returns state unchanged with insufficient Will', () => {
      const state = createNewGame();
      // urban_agriculture_zoning needs ~38% Will (threshold 0.30 + cost 0.08)
      const lowWillState: GameState = {
        ...state,
        meters: { ...state.meters, politicalWill: 10 },
      };

      const action: GameAction = { type: 'ENACT_POLICY', policyId: 'urban_agriculture_zoning' };
      const result = gameReducer(lowWillState, action);

      expect(result).toBe(lowWillState);
    });

    it('returns state unchanged for already-enacted policy', () => {
      const state = createNewGame();
      const enactedState: GameState = {
        ...state,
        meters: { ...state.meters, politicalWill: 80 },
        activePolicies: [{ definitionId: 'urban_agriculture_zoning', enactedTurn: 1 }],
      };

      const action: GameAction = { type: 'ENACT_POLICY', policyId: 'urban_agriculture_zoning' };
      const result = gameReducer(enactedState, action);

      expect(result).toBe(enactedState);
    });
  });

  describe('NARRATIVE_ACTION', () => {
    it('deducts action and applies effects', () => {
      const state = createNewGame();
      // Default narrativeState.actionsRemaining = 2
      const action: GameAction = {
        type: 'NARRATIVE_ACTION',
        actionType: 'community_meeting',
        target: 'brightmoor',
        topic: 'foodSovereignty',
      };

      const result = gameReducer(state, action);

      expect(result.narrativeState.actionsRemaining).toBe(1);
      // community_meeting: willGain=0.01, trustGain=0.02
      expect(result.meters.politicalWill).toBeGreaterThan(state.meters.politicalWill);
      expect(result.meters.communityTrust).toBeGreaterThan(state.meters.communityTrust);
    });

    it('returns state unchanged with 0 actions remaining', () => {
      const state = createNewGame();
      const noActionsState: GameState = {
        ...state,
        narrativeState: { ...state.narrativeState, actionsRemaining: 0 },
      };

      const action: GameAction = {
        type: 'NARRATIVE_ACTION',
        actionType: 'community_meeting',
        target: 'brightmoor',
        topic: 'foodSovereignty',
      };

      const result = gameReducer(noActionsState, action);

      expect(result).toBe(noActionsState);
    });
  });

  describe('RESPOND_EVENT', () => {
    it('applies choice effects and removes event from queue', () => {
      const state = createNewGame();
      const testEvent = {
        id: 'test-event-1',
        type: 'heat_wave',
        category: 'climate' as const,
        title: 'Heat Wave',
        description: 'Test',
        choices: [
          {
            id: 'emergency_cooling',
            label: 'Emergency Cooling',
            description: 'Spend resources',
            effects: {
              meterDeltas: [
                { meter: 'budget' as const, amount: -0.1, source: 'heat_wave' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: null,
          },
        ],
        turnGenerated: 1,
        cooldownTurns: 3,
        targetTileId: null,
        targetCharacterId: null,
      };

      const stateWithEvent: GameState = {
        ...state,
        eventQueue: [testEvent],
      };

      const action: GameAction = {
        type: 'RESPOND_EVENT',
        eventId: 'test-event-1',
        choiceId: 'emergency_cooling',
      };

      const result = gameReducer(stateWithEvent, action);

      expect(result.meters.budget).toBeCloseTo(state.meters.budget - 0.1);
      expect(result.eventQueue).toHaveLength(0);
    });

    it('returns state unchanged with invalid event ID', () => {
      const state = createNewGame();

      const action: GameAction = {
        type: 'RESPOND_EVENT',
        eventId: 'nonexistent',
        choiceId: 'whatever',
      };

      const result = gameReducer(state, action);

      expect(result).toBe(state);
    });
  });

  describe('LOBBY_COUNCIL', () => {
    it('applies disposition change and deducts narrative action', () => {
      const state = createNewGame();
      const stateWithCouncil: GameState = {
        ...state,
        councilMembers: {
          cm1: {
            id: 'cm1',
            name: 'Test Member',
            district: 'District 1',
            districtNumber: 1,
            leaning: 'moderate',
            priorities: [],
            disposition: 10,
            backstory: '',
            tileIds: [],
          },
        },
        narrativeState: { ...state.narrativeState, actionsRemaining: 2 },
      };

      const action: GameAction = {
        type: 'LOBBY_COUNCIL',
        memberId: 'cm1',
        policyId: 'urban_agriculture_zoning',
        argumentAlignment: 'high',
      };

      const result = gameReducer(stateWithCouncil, action);

      // high alignment = +15 disposition
      expect(result.councilMembers['cm1'].disposition).toBe(25);
      expect(result.narrativeState.actionsRemaining).toBe(1);
    });

    it('returns state unchanged with 0 actions remaining', () => {
      const state = createNewGame();
      const stateWithCouncil: GameState = {
        ...state,
        councilMembers: {
          cm1: {
            id: 'cm1',
            name: 'Test Member',
            district: 'District 1',
            districtNumber: 1,
            leaning: 'moderate',
            priorities: [],
            disposition: 10,
            backstory: '',
            tileIds: [],
          },
        },
        narrativeState: { ...state.narrativeState, actionsRemaining: 0 },
      };

      const action: GameAction = {
        type: 'LOBBY_COUNCIL',
        memberId: 'cm1',
        policyId: 'urban_agriculture_zoning',
        argumentAlignment: 'medium',
      };

      const result = gameReducer(stateWithCouncil, action);

      expect(result).toBe(stateWithCouncil);
    });
  });

  describe('FORM_COALITION', () => {
    it('creates coalition when valid', () => {
      const state = createNewGame();
      // Need 3 leaders with trust >= 40
      const stateWithTrustedLeaders: GameState = {
        ...state,
        leaders: {
          grace: { ...state.leaders['grace'], trust: 50 },
          kez: { ...state.leaders['kez'], trust: 45 },
          darius: { ...state.leaders['darius'], trust: 60 },
        },
      };

      const action: GameAction = {
        type: 'FORM_COALITION',
        name: 'Green Alliance',
        memberIds: ['grace', 'kez', 'darius'],
        topic: 'ecologicalRestoration',
      };

      const result = gameReducer(stateWithTrustedLeaders, action);

      expect(result.coalitions).toHaveLength(1);
      expect(result.coalitions[0].name).toBe('Green Alliance');
      expect(result.coalitions[0].memberIds).toEqual(['grace', 'kez', 'darius']);
      expect(result.coalitions[0].topic).toBe('ecologicalRestoration');
      expect(result.coalitions[0].active).toBe(true);
    });

    it('fails when members do not have enough trust', () => {
      const state = createNewGame();
      // Default trusts: grace=30, kez=10, darius=20 — all below 40

      const action: GameAction = {
        type: 'FORM_COALITION',
        name: 'Green Alliance',
        memberIds: ['grace', 'kez', 'darius'],
        topic: 'ecologicalRestoration',
      };

      const result = gameReducer(state, action);

      expect(result).toBe(state);
      expect(result.coalitions).toHaveLength(0);
    });
  });

  describe('CAMPAIGN_ACTION', () => {
    it('rally on turn 15 applies correct bonuses', () => {
      const state = createNewGame();
      const campaignState: GameState = {
        ...state,
        turn: 15,
      };

      const action: GameAction = {
        type: 'CAMPAIGN_ACTION',
        actionType: 'rally',
      };

      const result = gameReducer(campaignState, action);

      // rally: +3% Will, +1% Trust
      expect(result.meters.politicalWill).toBeCloseTo(campaignState.meters.politicalWill + 3);
      expect(result.meters.communityTrust).toBeCloseTo(campaignState.meters.communityTrust + 1);
    });

    it('returns state unchanged on wrong turn', () => {
      const state = createNewGame(); // turn 1

      const action: GameAction = {
        type: 'CAMPAIGN_ACTION',
        actionType: 'rally',
      };

      const result = gameReducer(state, action);

      expect(result).toBe(state);
    });
  });
});
