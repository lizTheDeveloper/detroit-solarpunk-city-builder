import posthog from 'posthog-js';
import type { GameState, GameAction, Meters, CalendarActionType, BurnoutState, Stage } from '@/state/types';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com';

let initialized = false;
let sessionStartTime = 0;
let turnsThisSession = 0;

export function initAnalytics(): void {
  if (!POSTHOG_KEY || initialized) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    autocapture: false,
  });
  initialized = true;
  sessionStartTime = Date.now();
  turnsThisSession = 0;
  trackSessionStart();
}

function capture(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

// --- Session & Engagement ---

function trackSessionStart(): void {
  capture('game.session.start', {
    timestamp: new Date().toISOString(),
    referrer: document.referrer || 'direct',
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
  });
}

export function trackSessionEnd(state: GameState): void {
  const durationSec = Math.round((Date.now() - sessionStartTime) / 1000);
  capture('game.session.end', {
    duration_seconds: durationSec,
    turns_played: turnsThisSession,
    final_turn: state.turn,
    final_stage: state.stage,
    win_condition: state.winCondition,
    loss_condition: state.lossCondition,
    meters: snapshotMeters(state.meters),
  });
}

// --- Conversion Funnel ---

export function trackFunnelStep(step: string, properties?: Record<string, unknown>): void {
  capture('game.funnel', { step, ...properties });
}

// --- Game Action Middleware ---

export function trackGameAction(action: GameAction, prevState: GameState, nextState: GameState): void {
  switch (action.type) {
    case 'START_PROJECT':
      capture('game.action.start_project', {
        project_id: action.projectId,
        tile_id: action.tileId,
        mode: action.mode,
        turn: prevState.turn,
        stage: prevState.stage,
        budget_before: prevState.meters.budget,
        budget_after: nextState.meters.budget,
        active_project_count: countActiveProjects(nextState),
      });
      break;

    case 'RESPOND_PROPOSAL':
      trackProposalResponse(action, prevState, nextState);
      break;

    case 'ENACT_POLICY':
      capture('game.action.enact_policy', {
        policy_id: action.policyId,
        turn: prevState.turn,
        political_will: prevState.meters.politicalWill,
        active_policies: nextState.activePolicies.length,
      });
      break;

    case 'RESPOND_EVENT':
      capture('game.action.respond_event', {
        event_id: action.eventId,
        choice_id: action.choiceId,
        turn: prevState.turn,
        event_category: prevState.eventQueue.find(e => e.id === action.eventId)?.category,
        events_remaining: nextState.eventQueue.length,
      });
      break;

    case 'LOBBY_COUNCIL':
      capture('game.action.lobby_council', {
        member_id: action.memberId,
        argument_alignment: action.argumentAlignment,
        turn: prevState.turn,
        disposition_before: prevState.councilMembers[action.memberId]?.disposition,
        disposition_after: nextState.councilMembers[action.memberId]?.disposition,
      });
      break;

    case 'FORM_COALITION':
      capture('game.action.form_coalition', {
        topic: action.topic,
        member_count: action.memberIds.length,
        turn: prevState.turn,
        total_coalitions: nextState.coalitions.length,
      });
      break;

    case 'CAMPAIGN_ACTION':
      capture('game.action.campaign', {
        action_type: action.actionType,
        turn: prevState.turn,
        political_will_delta: nextState.meters.politicalWill - prevState.meters.politicalWill,
        trust_delta: nextState.meters.communityTrust - prevState.meters.communityTrust,
      });
      break;

    case 'RECLAIM_LOT':
      capture('game.action.reclaim_lot', {
        tile_id: action.tileId,
        turn: prevState.turn,
        community_owned_before: Object.values(prevState.tiles).filter(t => t.communityOwned).length,
      });
      break;

    case 'CONVERSATION_OUTCOME':
      capture('game.action.conversation', {
        character_id: action.characterId,
        trust_delta: action.trustDelta,
        turn: prevState.turn,
        trust_before: prevState.leaders[action.characterId]?.trust,
        trust_after: nextState.leaders[action.characterId]?.trust,
      });
      break;

    case 'NEGOTIATE_PROPOSAL':
      capture('game.action.negotiate_proposal', {
        proposal_id: action.proposalId,
        cost_multiplier: action.negotiation.costMultiplier,
        leader_contribution: action.negotiation.leaderContribution,
        duration_modifier: action.negotiation.durationModifier,
        turn: prevState.turn,
      });
      break;

    case 'CALENDAR_ACTION':
      trackCalendarAction(action, prevState, nextState);
      break;

    case 'CALENDAR_REST_DAY':
      capture('game.action.rest_day', {
        turn: prevState.turn,
        burnout_state: prevState.calendarState.burnoutState,
        burnout_buffer_before: prevState.calendarState.burnoutBuffer,
        burnout_buffer_after: nextState.calendarState.burnoutBuffer,
      });
      break;

    case 'DELEGATION_HIRE':
      capture('game.action.delegation_hire', {
        tier: action.tier,
        turn: prevState.turn,
        budget_cost: prevState.meters.budget - nextState.meters.budget,
      });
      break;

    case 'STRATEGIC_CONTACT_ADVANCE':
      capture('game.action.strategic_contact', {
        contact_id: action.contactId,
        turn: prevState.turn,
        stage_before: prevState.strategicContacts.find(c => c.id === action.contactId)?.stage,
        stage_after: nextState.strategicContacts.find(c => c.id === action.contactId)?.stage,
      });
      break;

    case 'MENTOR_MEETING':
      capture('game.action.mentor_meeting', {
        mentor_id: action.mentorId,
        turn: prevState.turn,
      });
      break;

    case 'MAP_SELECT_BLOCK':
      capture('game.action.map_select', {
        block_id: action.blockId,
        neighborhood_id: action.neighborhoodId,
      });
      break;

    case 'END_TURN':
      trackTurnEnd(prevState, nextState);
      break;

    case 'MAP_SET_VIEW':
    case 'PREPARE_TURN':
    case 'ADVANCE_PHASE':
      break;
  }
}

function trackProposalResponse(
  action: Extract<GameAction, { type: 'RESPOND_PROPOSAL' }>,
  prevState: GameState,
  nextState: GameState,
): void {
  const proposal = prevState.activeProposals.find(p => p.id === action.proposalId);
  if (!proposal) return;

  const leader = prevState.leaders[proposal.leaderId];
  capture('game.action.respond_proposal', {
    proposal_id: action.proposalId,
    response: action.response,
    leader_id: proposal.leaderId,
    leader_name: leader?.name,
    project_id: proposal.projectDefinitionId,
    tile_id: proposal.tileId,
    turn: prevState.turn,
    trust_before: leader?.trust,
    trust_after: nextState.leaders[proposal.leaderId]?.trust,
    had_negotiation: !!proposal.negotiation,
    consecutive_deferrals: leader?.consecutiveDeferrals,
  });
}

function trackCalendarAction(
  action: Extract<GameAction, { type: 'CALENDAR_ACTION' }>,
  prevState: GameState,
  nextState: GameState,
): void {
  capture('game.action.calendar', {
    action_type: action.actionType,
    target_id: action.targetId,
    tile_id: action.tileId,
    turn: prevState.turn,
    slots_before: prevState.calendarState.slotsSpent,
    slots_after: nextState.calendarState.slotsSpent,
    slots_remaining: nextState.calendarState.discretionarySlots - nextState.calendarState.slotsSpent,
    burnout_state: nextState.calendarState.burnoutState,
  });
}

// --- Turn Resolution ---

function trackTurnEnd(prevState: GameState, nextState: GameState): void {
  turnsThisSession++;

  const meterDeltas: Record<string, number> = {};
  for (const key of Object.keys(prevState.meters) as (keyof Meters)[]) {
    meterDeltas[key] = nextState.meters[key] - prevState.meters[key];
  }

  capture('game.turn.end', {
    turn: prevState.turn,
    turn_number: nextState.turn,
    season: prevState.season,
    year: prevState.year,
    stage: nextState.stage,
    stage_changed: prevState.stage !== nextState.stage,
    meters: snapshotMeters(nextState.meters),
    meter_deltas: meterDeltas,
    active_projects: countActiveProjects(nextState),
    completed_projects_this_turn: nextState.turnSummary?.completedProjects?.length ?? 0,
    active_arcs: nextState.activeArcs.length,
    active_policies: nextState.activePolicies.length,
    coalitions: nextState.coalitions.filter(c => c.active).length,
    burnout_state: nextState.calendarState.burnoutState,
    slots_spent: prevState.calendarState.slotsSpent,
    calendar_utilization: prevState.calendarState.slotsSpent / Math.max(1, prevState.calendarState.discretionarySlots),
    turns_this_session: turnsThisSession,
    proposals_pending: nextState.activeProposals.length,
    events_pending: nextState.eventQueue.length,
  });

  trackStageTransition(prevState, nextState);
  trackBurnoutTransition(prevState, nextState);
  trackArcTransitions(prevState, nextState);
  trackGameOutcome(nextState);
}

function trackStageTransition(prevState: GameState, nextState: GameState): void {
  if (prevState.stage !== nextState.stage) {
    capture('game.progression.stage_change', {
      from: prevState.stage,
      to: nextState.stage,
      turn: nextState.turn,
      meters: snapshotMeters(nextState.meters),
    });
  }
}

function trackBurnoutTransition(prevState: GameState, nextState: GameState): void {
  if (prevState.calendarState.burnoutState !== nextState.calendarState.burnoutState) {
    capture('game.burnout.state_change', {
      from: prevState.calendarState.burnoutState,
      to: nextState.calendarState.burnoutState,
      turn: nextState.turn,
      buffer: nextState.calendarState.burnoutBuffer,
    });
  }
}

function trackArcTransitions(prevState: GameState, nextState: GameState): void {
  const prevArcIds = new Set(prevState.activeArcs.map(a => a.arcId));
  const nextArcIds = new Set(nextState.activeArcs.map(a => a.arcId));

  for (const arc of nextState.activeArcs) {
    if (!prevArcIds.has(arc.arcId)) {
      capture('game.crisis.arc_started', {
        arc_id: arc.arcId,
        stage: arc.currentStage,
        turn: nextState.turn,
      });
    }
  }

  for (const resolved of nextState.resolvedArcs) {
    if (!prevState.resolvedArcs.some(r => r.arcId === resolved.arcId)) {
      capture('game.crisis.arc_resolved', {
        arc_id: resolved.arcId,
        resolved_turn: resolved.resolvedTurn,
        turn: nextState.turn,
      });
    }
  }
}

function trackGameOutcome(state: GameState): void {
  if (state.winCondition) {
    capture('game.outcome.win', {
      condition: state.winCondition,
      turn: state.turn,
      stage: state.stage,
      meters: snapshotMeters(state.meters),
      turns_this_session: turnsThisSession,
    });
    trackFunnelStep('game_completed', { outcome: 'win', condition: state.winCondition });
  }
  if (state.lossCondition) {
    capture('game.outcome.loss', {
      condition: state.lossCondition,
      turn: state.turn,
      stage: state.stage,
      meters: snapshotMeters(state.meters),
      turns_this_session: turnsThisSession,
    });
    trackFunnelStep('game_completed', { outcome: 'loss', condition: state.lossCondition });
  }
}

// --- UI Events ---

export function trackTabOpen(tabId: string, previousTab?: string): void {
  capture('game.ui.tab_open', { tab_id: tabId, previous_tab: previousTab });
}

export function trackPanelOpen(panelKind: string, context?: Record<string, unknown>): void {
  capture('game.ui.panel_open', { panel_kind: panelKind, ...context });
}

export function trackConversationStart(characterId: string, interactionType: string): void {
  capture('game.ui.conversation_start', { character_id: characterId, interaction_type: interactionType });
}

export function trackConversationEnd(characterId: string, interactionType: string, messageCount: number): void {
  capture('game.ui.conversation_end', { character_id: characterId, interaction_type: interactionType, message_count: messageCount });
}

export function trackTutorialStep(stepId: string): void {
  capture('game.tutorial.step', { step_id: stepId });
}

export function trackAdvisorShown(conditionId: string): void {
  capture('game.advisor.shown', { condition_id: conditionId });
}

export function trackSaveGame(slot: string): void {
  capture('game.save', { slot });
}

export function trackLoadGame(slot: string): void {
  capture('game.load', { slot });
}

export function trackUndo(): void {
  capture('game.undo');
}

export function trackMapInteraction(action: 'pan' | 'zoom' | 'select_tile', tileId?: string): void {
  capture('game.ui.map_interaction', { action, tile_id: tileId });
}

export function trackHeadlineClick(headline: string): void {
  capture('game.ui.headline_click', { headline: headline.slice(0, 200) });
}

// --- Strategy Analysis ---

export function trackStrategySnapshot(state: GameState): void {
  const projectCategories: Record<string, number> = {};
  for (const tile of Object.values(state.tiles)) {
    for (const proj of tile.activeProjects) {
      projectCategories[proj.definitionId] = (projectCategories[proj.definitionId] || 0) + 1;
    }
  }

  const leaderTrust: Record<string, number> = {};
  for (const [id, leader] of Object.entries(state.leaders)) {
    leaderTrust[id] = leader.trust;
  }

  capture('game.strategy.snapshot', {
    turn: state.turn,
    stage: state.stage,
    meters: snapshotMeters(state.meters),
    active_project_distribution: projectCategories,
    leader_trust_levels: leaderTrust,
    active_policies: state.activePolicies.map(p => p.definitionId),
    active_coalitions: state.coalitions.filter(c => c.active).map(c => c.topic),
    overton_window: snapshotOvertonWindow(state.publicOpinion),
    delegation_tier: state.calendarState.delegationTier,
    burnout_state: state.calendarState.burnoutState,
    community_owned_tiles: Object.values(state.tiles).filter(t => t.communityOwned).length,
    total_completed_projects: Object.values(state.tiles).reduce((sum, t) => sum + t.completedProjects.length, 0),
  });
}

// --- Helpers ---

function snapshotMeters(meters: Meters): Record<string, number> {
  return {
    community_trust: meters.communityTrust,
    ecological_health: meters.ecologicalHealth,
    food_sovereignty: meters.foodSovereignty,
    political_will: meters.politicalWill,
    budget: meters.budget,
    climate_pressure: meters.climatePressure,
  };
}

function snapshotOvertonWindow(opinion: GameState['publicOpinion']): Record<string, number> {
  return {
    food_sovereignty: opinion.foodSovereignty,
    water_commons: opinion.waterCommons,
    land_reform: opinion.landReform,
    ecological_restoration: opinion.ecologicalRestoration,
    cooperative_economics: opinion.cooperativeEconomics,
    nutrient_recycling: opinion.nutrientRecycling,
    nuclear_energy: opinion.nuclearEnergy,
    land_expropriation: opinion.landExpropriation,
    decarceration: opinion.decarceration,
    de_growth: opinion.deGrowth,
  };
}

function countActiveProjects(state: GameState): number {
  let count = 0;
  for (const tile of Object.values(state.tiles)) {
    count += tile.activeProjects.length;
  }
  return count;
}

export function identifyPlayer(playerId: string, traits?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.identify(playerId, traits);
}

export function resetAnalytics(): void {
  if (!initialized) return;
  posthog.reset();
}
