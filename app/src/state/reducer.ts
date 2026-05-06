import type {
  GameState,
  GameAction,
  ProjectDefinition,
  ActiveProject,
} from './types';
import { resolveTurn, prepareTurn } from '../systems/resolve';
import { canEnactPolicy, enactPolicy } from '../systems/policies';
import { applyNarrativeAction } from '../systems/narrative';
import { applyEventChoice } from '../systems/events';
import { calculateLobbyingBonus } from '../systems/council';
import { canFormCoalition, formCoalition } from '../systems/relationships';
import { reclaimLot, canReclaimLot } from '../systems/reclamation';
import { POLICY_CATALOG } from '../data/content/policy-catalog';

function countAllActiveProjects(state: GameState): number {
  let count = 0;
  for (const tileId of Object.keys(state.tiles)) {
    count += state.tiles[tileId].activeProjects.length;
  }
  return count;
}

function handleStartProject(
  state: GameState,
  action: Extract<GameAction, { type: 'START_PROJECT' }>,
  projectDefs: Record<string, ProjectDefinition>,
): GameState {
  const projectDef = projectDefs[action.projectId];
  if (!projectDef) return state;

  const tile = state.tiles[action.tileId];
  if (!tile) return state;

  // Contamination check
  if (projectDef.maxContamination !== null && tile.contamination > projectDef.maxContamination) {
    return state;
  }

  // Cost calculation
  const costMultiplier = action.mode === 'community-led' ? 1.3 : 1.0;
  const cost = projectDef.baseCost * costMultiplier;

  // Budget check
  if (state.meters.budget < cost) {
    return state;
  }

  // Concurrent project limit check
  if (countAllActiveProjects(state) >= state.maxConcurrentProjects) {
    return state;
  }

  const newProject: ActiveProject = {
    definitionId: projectDef.id,
    tileId: action.tileId,
    mode: action.mode,
    progress: 0,
    duration: projectDef.baseDuration,
    cost,
  };

  return {
    ...state,
    meters: {
      ...state.meters,
      budget: state.meters.budget - cost,
    },
    tiles: {
      ...state.tiles,
      [action.tileId]: {
        ...tile,
        activeProjects: [...tile.activeProjects, newProject],
      },
    },
  };
}

function handleRespondProposal(
  state: GameState,
  action: Extract<GameAction, { type: 'RESPOND_PROPOSAL' }>,
  projectDefs: Record<string, ProjectDefinition>,
): GameState {
  const proposalIndex = state.activeProposals.findIndex((p) => p.id === action.proposalId);
  if (proposalIndex === -1) return state;

  const proposal = state.activeProposals[proposalIndex];
  const leader = state.leaders[proposal.leaderId];
  if (!leader) return state;

  const remainingProposals = state.activeProposals.filter((p) => p.id !== action.proposalId);

  switch (action.response) {
    case 'accept': {
      const projectDef = projectDefs[proposal.projectDefinitionId];
      if (!projectDef) return state;

      const cost = projectDef.baseCost * 0.85;
      if (state.meters.budget < cost) return state;
      const newProject: ActiveProject = {
        definitionId: proposal.projectDefinitionId,
        tileId: proposal.tileId,
        mode: 'community-led',
        progress: 0,
        duration: projectDef.baseDuration,
        cost,
      };

      const tile = state.tiles[proposal.tileId];

      return {
        ...state,
        activeProposals: remainingProposals,
        meters: {
          ...state.meters,
          budget: state.meters.budget - cost,
        },
        tiles: {
          ...state.tiles,
          [proposal.tileId]: {
            ...tile,
            activeProjects: [...tile.activeProjects, newProject],
          },
        },
        leaders: {
          ...state.leaders,
          [leader.id]: {
            ...leader,
            trust: leader.trust + 5,
          },
        },
      };
    }

    case 'modify': {
      const projectDef = projectDefs[proposal.projectDefinitionId];
      if (!projectDef) return state;

      const cost = projectDef.baseCost;
      if (state.meters.budget < cost) return state;
      const newProject: ActiveProject = {
        definitionId: proposal.projectDefinitionId,
        tileId: proposal.tileId,
        mode: 'community-led',
        progress: 0,
        duration: projectDef.baseDuration,
        cost,
      };

      const tile = state.tiles[proposal.tileId];

      return {
        ...state,
        activeProposals: remainingProposals,
        meters: {
          ...state.meters,
          budget: state.meters.budget - cost,
        },
        tiles: {
          ...state.tiles,
          [proposal.tileId]: {
            ...tile,
            activeProjects: [...tile.activeProjects, newProject],
          },
        },
        leaders: {
          ...state.leaders,
          [leader.id]: {
            ...leader,
            trust: leader.trust + 2,
          },
        },
      };
    }

    case 'defer': {
      // If this would be the 3rd consecutive deferral (already at 2), treat as reject
      if (leader.consecutiveDeferrals >= 2) {
        return {
          ...state,
          activeProposals: remainingProposals,
          leaders: {
            ...state.leaders,
            [leader.id]: {
              ...leader,
              trust: leader.trust - 15,
              consecutiveDeferrals: leader.consecutiveDeferrals + 1,
            },
          },
        };
      }

      return {
        ...state,
        activeProposals: remainingProposals,
        pendingProposals: [...state.pendingProposals, proposal],
        leaders: {
          ...state.leaders,
          [leader.id]: {
            ...leader,
            trust: leader.trust - 5,
            consecutiveDeferrals: leader.consecutiveDeferrals + 1,
          },
        },
      };
    }

    case 'reject': {
      return {
        ...state,
        activeProposals: remainingProposals,
        leaders: {
          ...state.leaders,
          [leader.id]: {
            ...leader,
            trust: leader.trust - 15,
          },
        },
      };
    }

    default:
      return state;
  }
}

function handleEnactPolicy(
  state: GameState,
  action: Extract<GameAction, { type: 'ENACT_POLICY' }>,
): GameState {
  const policy = POLICY_CATALOG[action.policyId];
  if (!policy) return state;

  const check = canEnactPolicy(state, action.policyId, POLICY_CATALOG, true);
  if (!check.allowed) return state;

  return enactPolicy(state, action.policyId, POLICY_CATALOG);
}

function handleNarrativeAction(
  state: GameState,
  action: Extract<GameAction, { type: 'NARRATIVE_ACTION' }>,
): GameState {
  if (state.narrativeState.actionsRemaining <= 0) return state;

  const result = applyNarrativeAction(state, action.actionType, action.topic, action.target);
  return result.state;
}

function handleRespondEvent(
  state: GameState,
  action: Extract<GameAction, { type: 'RESPOND_EVENT' }>,
): GameState {
  const result = applyEventChoice(state, action.eventId, action.choiceId);
  return result.state;
}

function handleLobbyCouncil(
  state: GameState,
  action: Extract<GameAction, { type: 'LOBBY_COUNCIL' }>,
): GameState {
  if (state.narrativeState.actionsRemaining <= 0) return state;

  const member = state.councilMembers[action.memberId];
  if (!member) return state;

  const bonus = calculateLobbyingBonus(action.argumentAlignment);

  return {
    ...state,
    councilMembers: {
      ...state.councilMembers,
      [action.memberId]: {
        ...member,
        disposition: member.disposition + bonus,
      },
    },
    narrativeState: {
      ...state.narrativeState,
      actionsRemaining: state.narrativeState.actionsRemaining - 1,
    },
  };
}

function handleFormCoalition(
  state: GameState,
  action: Extract<GameAction, { type: 'FORM_COALITION' }>,
): GameState {
  const check = canFormCoalition(state, action.memberIds, action.topic);
  if (!check.allowed) return state;

  return formCoalition(state, action.name, action.memberIds, action.topic);
}

function handleCampaignAction(
  state: GameState,
  action: Extract<GameAction, { type: 'CAMPAIGN_ACTION' }>,
): GameState {
  if (state.turn !== 15) return state;

  let willDelta = 0;
  let trustDelta = 0;

  switch (action.actionType) {
    case 'rally':
      willDelta = 3;
      trustDelta = 1;
      break;
    case 'promise':
      willDelta = 2;
      break;
    case 'coalition_building':
      trustDelta = 2;
      willDelta = 1;
      break;
  }

  return {
    ...state,
    meters: {
      ...state.meters,
      politicalWill: state.meters.politicalWill + willDelta,
      communityTrust: state.meters.communityTrust + trustDelta,
    },
  };
}

function handleEndTurn(state: GameState): GameState {
  return resolveTurn(state);
}

export function gameReducer(
  state: GameState,
  action: GameAction,
  projectDefs: Record<string, ProjectDefinition> = {},
): GameState {
  switch (action.type) {
    case 'START_PROJECT':
      return handleStartProject(state, action, projectDefs);
    case 'RESPOND_PROPOSAL':
      return handleRespondProposal(state, action, projectDefs);
    case 'ENACT_POLICY':
      return handleEnactPolicy(state, action);
    case 'NARRATIVE_ACTION':
      return handleNarrativeAction(state, action);
    case 'RESPOND_EVENT':
      return handleRespondEvent(state, action);
    case 'LOBBY_COUNCIL':
      return handleLobbyCouncil(state, action);
    case 'FORM_COALITION':
      return handleFormCoalition(state, action);
    case 'CAMPAIGN_ACTION':
      return handleCampaignAction(state, action);
    case 'RECLAIM_LOT': {
      const check = canReclaimLot(state, action.tileId);
      if (!check.allowed) return state;
      return reclaimLot(state, action.tileId).state;
    }
    case 'CONVERSATION_OUTCOME': {
      const leader = state.leaders[action.characterId];
      if (!leader) return state;
      const newTrust = Math.max(-100, Math.min(100, leader.trust + action.trustDelta));
      return {
        ...state,
        leaders: {
          ...state.leaders,
          [action.characterId]: { ...leader, trust: newTrust },
        },
      };
    }
    case 'END_TURN':
      return handleEndTurn(state);
    case 'PREPARE_TURN':
      return prepareTurn(state);
    default:
      return state;
  }
}
