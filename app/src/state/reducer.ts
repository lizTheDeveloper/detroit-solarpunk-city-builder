import type {
  GameState,
  GameAction,
  ProjectDefinition,
  ActiveProject,
} from './types';
import { resolveTurn, prepareTurn } from '../systems/resolve';
import { canEnactPolicy, enactPolicy } from '../systems/policies';
import { applyEventChoice } from '../systems/events';
import { calculateLobbyingBonus } from '../systems/council';
import { canFormCoalition, formCoalition } from '../systems/relationships';
import { reclaimLot, canReclaimLot } from '../systems/reclamation';
import { POLICY_CATALOG } from '../data/content/policy-catalog';
import { canAffordAction, spendSlots } from '../systems/calendar-slots';
import { applyRestDay } from '../systems/burnout';
import { applyDelegationToCalendar, canUnlockTier, DELEGATION_TIERS } from '../systems/delegation';
import { advanceContact, canAdvanceContact } from '../systems/strategic-contacts';
import { applyMentorMeeting, isMentorAvailable } from '../data/characters/mentors';

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
    blockId: action.blockId,
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

  if (!canAffordAction(state.calendarState, 'proposal_review')) return state;
  const newCalendar = spendSlots(state.calendarState, 'proposal_review', proposal.leaderId);

  switch (action.response) {
    case 'accept': {
      const projectDef = projectDefs[proposal.projectDefinitionId];
      if (!projectDef) return state;
      if (countAllActiveProjects(state) >= state.maxConcurrentProjects) return state;

      const neg = proposal.negotiation;
      const baseCostMult = neg ? neg.costMultiplier : 0.85;
      const leaderContrib = neg ? neg.leaderContribution : 0;
      const durationMod = neg ? neg.durationModifier : 0;
      const grossCost = projectDef.baseCost * baseCostMult;
      const cost = Math.max(0, grossCost - leaderContrib);
      if (state.meters.budget < cost) return state;
      const newProject: ActiveProject = {
        definitionId: proposal.projectDefinitionId,
        tileId: proposal.tileId,
        mode: 'community-led',
        progress: 0,
        duration: Math.max(1, projectDef.baseDuration + durationMod),
        cost: grossCost,
      };

      const trustBonus = neg ? (leaderContrib > 0 ? 8 : 5) : 5;
      const tile = state.tiles[proposal.tileId];

      return {
        ...state,
        calendarState: newCalendar,
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
            trust: leader.trust + trustBonus,
            consecutiveDeferrals: 0,
          },
        },
      };
    }

    case 'modify': {
      const projectDef = projectDefs[proposal.projectDefinitionId];
      if (!projectDef) return state;
      if (countAllActiveProjects(state) >= state.maxConcurrentProjects) return state;

      const neg = proposal.negotiation;
      const baseCostMult = neg ? neg.costMultiplier : 1.0;
      const leaderContrib = neg ? neg.leaderContribution : 0;
      const durationMod = neg ? neg.durationModifier : 0;
      const grossCost = projectDef.baseCost * baseCostMult;
      const cost = Math.max(0, grossCost - leaderContrib);
      if (state.meters.budget < cost) return state;
      const newProject: ActiveProject = {
        definitionId: proposal.projectDefinitionId,
        tileId: proposal.tileId,
        mode: 'community-led',
        progress: 0,
        duration: Math.max(1, projectDef.baseDuration + durationMod),
        cost: grossCost,
      };

      const tile = state.tiles[proposal.tileId];

      return {
        ...state,
        calendarState: newCalendar,
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
            consecutiveDeferrals: 0,
          },
        },
      };
    }

    case 'reject': {
      return {
        ...state,
        calendarState: newCalendar,
        activeProposals: remainingProposals,
        leaders: {
          ...state.leaders,
          [leader.id]: {
            ...leader,
            trust: leader.trust - 15,
            consecutiveDeferrals: 0,
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
  if (!canAffordAction(state.calendarState, 'quick_check_in')) return state;

  const member = state.councilMembers[action.memberId];
  if (!member) return state;
  const bonus = calculateLobbyingBonus(action.argumentAlignment);
  const newCalendar = spendSlots(state.calendarState, 'quick_check_in', action.memberId);

  return {
    ...state,
    calendarState: newCalendar,
    councilMembers: {
      ...state.councilMembers,
      [action.memberId]: { ...member, disposition: member.disposition + bonus },
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
  if (state.turn < 42) return state;

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

function handleCalendarAction(
  state: GameState,
  action: Extract<GameAction, { type: 'CALENDAR_ACTION' }>,
): GameState {
  if (!canAffordAction(state.calendarState, action.actionType)) return state;

  const newCalendar = spendSlots(state.calendarState, action.actionType, action.targetId, action.tileId);
  let updated: GameState = { ...state, calendarState: newCalendar };

  if (action.actionType === 'community_meeting' && action.tileId) {
    const tile = updated.tiles[action.tileId];
    if (tile) {
      updated = {
        ...updated,
        meters: { ...updated.meters, communityTrust: Math.min(100, updated.meters.communityTrust + 1) },
        tiles: { ...updated.tiles, [action.tileId]: { ...tile, ecologicalHealth: Math.min(100, tile.ecologicalHealth + 0.5) } },
      };
    }
  } else if (action.actionType === 'public_event' && action.tileId) {
    updated = {
      ...updated,
      meters: {
        ...updated.meters,
        communityTrust: Math.min(100, updated.meters.communityTrust + 2),
        politicalWill: Math.min(100, updated.meters.politicalWill + 1),
      },
    };
  } else if (action.actionType === 'quick_check_in') {
    updated = {
      ...updated,
      meters: { ...updated.meters, communityTrust: Math.min(100, updated.meters.communityTrust + 0.5) },
    };
  }

  return updated;
}

function handleCalendarRestDay(state: GameState): GameState {
  if (!canAffordAction(state.calendarState, 'rest_day')) return state;

  const afterSpend = spendSlots(state.calendarState, 'rest_day');
  const afterRest = applyRestDay(afterSpend);
  return { ...state, calendarState: afterRest };
}

function handleDelegationHire(
  state: GameState,
  action: Extract<GameAction, { type: 'DELEGATION_HIRE' }>,
): GameState {
  if (!canAffordAction(state.calendarState, 'delegation_hire')) return state;
  if (action.tier !== state.calendarState.delegationTier + 1) return state;

  const communityOwnedTiles = Object.values(state.tiles).filter(t => t.communityOwned).length;
  const hasChampion = Object.values(state.leaders).some(l => l.trust >= 80);

  const canUnlock = canUnlockTier(action.tier, {
    turn: state.turn,
    budget: state.meters.budget,
    politicalWill: state.meters.politicalWill,
    communityTrust: state.meters.communityTrust,
    communityOwnedTiles,
    hasChampionNpc: hasChampion,
    stage: state.stage,
  });

  if (!canUnlock) return state;

  const afterSpend = spendSlots(state.calendarState, 'delegation_hire');
  const afterDelegation = applyDelegationToCalendar(afterSpend, action.tier);

  const tierDef = DELEGATION_TIERS[action.tier];
  const budgetCost = tierDef?.budgetCostPerYear ?? 0;

  return {
    ...state,
    calendarState: afterDelegation,
    meters: {
      ...state.meters,
      budget: state.meters.budget - budgetCost,
    },
  };
}

function handleStrategicContactAdvance(
  state: GameState,
  action: Extract<GameAction, { type: 'STRATEGIC_CONTACT_ADVANCE' }>,
): GameState {
  if (!canAffordAction(state.calendarState, 'strategic_cultivation')) return state;

  const contactIdx = state.strategicContacts.findIndex(c => c.id === action.contactId);
  if (contactIdx < 0) return state;

  const contact = state.strategicContacts[contactIdx];
  if (!canAdvanceContact(contact)) return state;

  const afterSpend = spendSlots(state.calendarState, 'strategic_cultivation', action.contactId);
  const advanced = advanceContact(contact, state.calendarState.monthNumber);

  const newContacts = [...state.strategicContacts];
  newContacts[contactIdx] = advanced;

  return { ...state, calendarState: afterSpend, strategicContacts: newContacts };
}

function handleMentorMeeting(
  state: GameState,
  action: Extract<GameAction, { type: 'MENTOR_MEETING' }>,
): GameState {
  if (!canAffordAction(state.calendarState, 'mentor_meeting')) return state;

  const mentorIdx = state.mentors.findIndex(m => m.id === action.mentorId);
  if (mentorIdx < 0) return state;

  const mentor = state.mentors[mentorIdx];
  if (!isMentorAvailable(mentor, state.calendarState.monthNumber)) return state;

  const afterSpend = spendSlots(state.calendarState, 'mentor_meeting', action.mentorId);
  const { updatedMentor, bufferGain } = applyMentorMeeting(mentor, state.calendarState.monthNumber);

  const newMentors = [...state.mentors];
  newMentors[mentorIdx] = updatedMentor;

  return {
    ...state,
    calendarState: {
      ...afterSpend,
      burnoutBuffer: Math.min(afterSpend.burnoutBufferMax, afterSpend.burnoutBuffer + bufferGain),
    },
    mentors: newMentors,
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
    case 'NEGOTIATE_PROPOSAL': {
      const idx = state.activeProposals.findIndex((p) => p.id === action.proposalId);
      if (idx < 0) return state;
      const updated = [...state.activeProposals];
      updated[idx] = { ...updated[idx], negotiation: action.negotiation };
      return { ...state, activeProposals: updated };
    }
    case 'CALENDAR_ACTION':
      return handleCalendarAction(state, action);
    case 'CALENDAR_REST_DAY':
      return handleCalendarRestDay(state);
    case 'DELEGATION_HIRE':
      return handleDelegationHire(state, action);
    case 'STRATEGIC_CONTACT_ADVANCE':
      return handleStrategicContactAdvance(state, action);
    case 'MENTOR_MEETING':
      return handleMentorMeeting(state, action);
    case 'MAP_SELECT_BLOCK':
      return {
        ...state,
        mapState: {
          ...state.mapState,
          selectedBlockId: action.blockId,
        },
      };
    case 'MAP_SET_VIEW':
      return {
        ...state,
        mapState: {
          ...state.mapState,
          viewState: action.viewState,
        },
      };
    case 'END_TURN':
      return handleEndTurn(state);
    case 'PREPARE_TURN':
      return prepareTurn(state);
    default:
      return state;
  }
}
