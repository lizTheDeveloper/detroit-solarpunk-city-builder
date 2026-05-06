import type { ActiveArc, ArcConfig, ArcStage, PipelineArcState } from '../state/crisis-types';

// ---------------------------------------------------------------------------
// Arc Progression State Machine
// ---------------------------------------------------------------------------
// Each arc follows: dormant → foreshadow → escalation → crisis → reckoning → resolved
// Transitions are driven by headline data from the live-news-pipeline combined
// with player action/inaction.
// ---------------------------------------------------------------------------

/**
 * The ordered progression of arc stages.
 */
const STAGE_ORDER: ArcStage[] = [
  'dormant',
  'foreshadow',
  'escalation',
  'crisis',
  'reckoning',
  'resolved',
];

/**
 * Get the next stage in the arc lifecycle, or null if already resolved.
 */
function nextStage(current: ArcStage): ArcStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

// ---------------------------------------------------------------------------
// Transition logic
// ---------------------------------------------------------------------------

/**
 * Check whether an arc should transition to a new stage.
 * Returns the new stage if a transition should occur, or null if no transition.
 *
 * Transition rules:
 * - dormant → foreshadow: first headline appears (weeklyHits > 0)
 * - foreshadow → escalation: weeklyHits exceed threshold OR maxSeverity >= 3
 * - escalation → crisis: inaction timer exceeds config max turns
 * - crisis → reckoning: player made a choice (lastEventTurn === currentTurn means choice was made)
 * - reckoning → resolved: fixed delay after entering reckoning
 *
 * All transitions are gated by minimum stage duration.
 */
export function checkTransition(
  arc: ActiveArc,
  pipelineState: PipelineArcState | null,
  config: ArcConfig,
  currentTurn: number
): ArcStage | null {
  const turnsInStage = currentTurn - arc.stageEnteredTurn;
  const minDuration = config.minStageDuration[arc.currentStage] ?? 0;

  // Enforce minimum stage duration
  if (turnsInStage < minDuration) {
    return null;
  }

  switch (arc.currentStage) {
    case 'dormant':
      return checkDormantToForeshadow(pipelineState);

    case 'foreshadow':
      return checkForeshadowToEscalation(pipelineState, config);

    case 'escalation':
      return checkEscalationToCrisis(arc, config);

    case 'crisis':
      return checkCrisisToReckoning(arc, currentTurn);

    case 'reckoning':
      return checkReckoningToResolved(arc, config, currentTurn);

    case 'resolved':
      return null;
  }
}

function checkDormantToForeshadow(pipelineState: PipelineArcState | null): ArcStage | null {
  if (!pipelineState) return null;
  // First headline appears for this arc
  if (pipelineState.weeklyHits > 0 || pipelineState.lastHeadlineTimestamp !== null) {
    return 'foreshadow';
  }
  return null;
}

function checkForeshadowToEscalation(
  pipelineState: PipelineArcState | null,
  config: ArcConfig
): ArcStage | null {
  if (!pipelineState) return null;
  // Weekly hits exceed threshold OR severity-3 headline
  if (pipelineState.weeklyHits >= config.escalationThreshold || pipelineState.maxSeverity >= 3) {
    return 'escalation';
  }
  return null;
}

function checkEscalationToCrisis(arc: ActiveArc, config: ArcConfig): ArcStage | null {
  // Player ignores escalation for max turns
  if (arc.inactionTimer >= config.maxTurnsAtEscalation) {
    return 'crisis';
  }
  return null;
}

function checkCrisisToReckoning(arc: ActiveArc, currentTurn: number): ArcStage | null {
  // Player made a choice during crisis (lastEventTurn updated)
  if (arc.lastEventTurn >= arc.stageEnteredTurn) {
    return 'reckoning';
  }
  // Also transition if there's been an event response this turn
  if (arc.lastEventTurn === currentTurn) {
    return 'reckoning';
  }
  return null;
}

function checkReckoningToResolved(
  arc: ActiveArc,
  config: ArcConfig,
  currentTurn: number
): ArcStage | null {
  // Fixed delay after entering reckoning
  const turnsInReckoning = currentTurn - arc.stageEnteredTurn;
  if (turnsInReckoning >= config.reckoningDelay) {
    return 'resolved';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Inaction timer
// ---------------------------------------------------------------------------

/**
 * Increment the inaction timer for an arc. Called each turn during escalation
 * if the player has not taken relevant action.
 */
export function incrementInactionTimer(arc: ActiveArc): ActiveArc {
  return {
    ...arc,
    inactionTimer: arc.inactionTimer + 1,
  };
}

/**
 * Reset the inaction timer. Called when the player takes an action that creates
 * a prevention condition for the arc.
 */
export function resetInactionTimer(arc: ActiveArc): ActiveArc {
  return {
    ...arc,
    inactionTimer: 0,
  };
}

// ---------------------------------------------------------------------------
// Prevention check
// ---------------------------------------------------------------------------

/**
 * Check if the player has taken action that should reset the inaction timer.
 * Returns true if any of the arc's prevention conditions are newly present.
 */
export function checkPreventionConditions(
  config: ArcConfig,
  currentConditions: Set<string>,
  previousConditions: Set<string>
): boolean {
  return config.preventionConditions.some(
    (cond) => currentConditions.has(cond) && !previousConditions.has(cond)
  );
}

// ---------------------------------------------------------------------------
// Stage transition application
// ---------------------------------------------------------------------------

/**
 * Apply a stage transition to an arc. Returns a new ActiveArc at the new stage.
 */
export function applyTransition(arc: ActiveArc, newStage: ArcStage, currentTurn: number): ActiveArc {
  return {
    ...arc,
    currentStage: newStage,
    stageEnteredTurn: currentTurn,
    inactionTimer: 0,
  };
}

// ---------------------------------------------------------------------------
// Game Always Begins Today
// ---------------------------------------------------------------------------

/**
 * Initialize active arcs from a pipeline arc-state snapshot. When a new game is
 * created, it calls the pipeline's /api/arc-state endpoint and initializes arcs
 * at whatever stage reality is currently at.
 *
 * If energy-grid is at escalation in reality, the new game starts with
 * energy-grid at escalation.
 */
export function initializeArcsFromSnapshot(
  pipelineArcStates: PipelineArcState[],
  currentTurn: number
): ActiveArc[] {
  return pipelineArcStates.map((pipelineState) => ({
    arcId: pipelineState.arcId,
    currentStage: pipelineState.stage,
    stageEnteredTurn: currentTurn,
    inactionTimer: 0,
    lastEventTurn: 0,
    initializedFromSnapshot: true,
  }));
}

/**
 * Default arc configs for when templates aren't loaded yet.
 */
export function getDefaultArcConfig(arcId: string): ArcConfig {
  return {
    arcId,
    escalationThreshold: 5,
    maxTurnsAtEscalation: 4,
    minStageDuration: {
      dormant: 0,
      foreshadow: 2,
      escalation: 2,
      crisis: 1,
      reckoning: 2,
      resolved: 0,
    },
    preventionConditions: [],
    reckoningDelay: 3,
    cooldownAfterResolution: 8,
  };
}
