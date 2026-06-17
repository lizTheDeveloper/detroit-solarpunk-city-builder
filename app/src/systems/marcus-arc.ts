import type { GameState, GameEvent, Antagonist, AntagonistArcState, MarcusResponse } from '../state/types';
import { advanceMarcusPhase, createMarcusEvent, classifyMarcusResponse } from './events';

// ---------------------------------------------------------------------------
// Marcus Webb 4-phase antagonist arc — state-machine driver.
//
// This module is the canonical, state-level API for the Marcus arc requested by
// the marcus-arc spec. It operates on the flat arc fields living directly on the
// `marcus_webb` antagonist (`arcPhase`, `responseHistory`, `phaseEventCount`,
// `motivationRevealed`) while keeping the legacy `arcState` sub-object — which
// the templated event-pool builders in events.ts consume — in sync.
//
// Phase transitions (spec: "Phase transitions are driven by game state"):
//   1 Gadfly      → 2 Demagogue    : turn >= 9 AND (ignored 3+ / 2+ proposals at
//                                      pressure>=3 / a neighborhood neglected for
//                                      3+ months). EARLY at turn >= 6 if Sterling
//                                      Cross is co-active.
//   2 Demagogue   → 3 Power Broker : turn >= 20 AND 4+ Phase 2 events fired.
//   3 Power Broker→ 4 Resolution   : turn >= 36.
//
// Event selection (spec: "selectMarcusEvent picks from the current phase's pool
// by game state") delegates to the templated builders, which already choose
// among 3-5 variants per phase using neglected neighborhoods, high-pressure /
// expired proposals, partner leaders, and the Sterling Cross funding reveal.
// ---------------------------------------------------------------------------

const MARCUS_ID = 'marcus_webb';

/** Read the Marcus antagonist, or null if absent/never initialized. */
export function getMarcus(state: GameState): Antagonist | null {
  return state.antagonists[MARCUS_ID] ?? null;
}

/** True if a neighborhood has had 0 calendar time allocation for 3+ months. */
export function hasNeglectedNeighborhood(state: GameState): boolean {
  const allocation = state.calendarState?.neighborhoodTimeAllocation;
  if (!allocation) return false;
  const monthIdx = Math.max(0, (state.calendarState.monthNumber ?? 1) - 1);
  for (const slots of Object.values(allocation)) {
    if (!Array.isArray(slots)) continue;
    // Look back over the trailing window ending at the current month.
    const window = slots.slice(Math.max(0, monthIdx - 2), monthIdx + 1);
    if (window.length >= 3 && window.every(s => (s ?? 0) === 0)) {
      return true;
    }
  }
  return false;
}

/** Count active/pending proposals that have reached press-level pressure (>=3). */
export function highPressureProposalCount(state: GameState): number {
  return [...state.activeProposals, ...state.pendingProposals].filter(
    p => p.pressureLevel >= 3,
  ).length;
}

/**
 * Build the flat arc fields from an antagonist, defaulting any that are missing.
 * Lets callers (and tests) work with a guaranteed-present shape.
 */
function readFlatArc(ant: Antagonist): {
  arcPhase: 1 | 2 | 3 | 4;
  responseHistory: MarcusResponse[];
  phaseEventCount: number;
  motivationRevealed: boolean;
} {
  return {
    arcPhase: ant.arcPhase ?? ant.arcState?.phase ?? 1,
    responseHistory: ant.responseHistory ?? [],
    phaseEventCount: ant.phaseEventCount ?? ant.arcState?.phaseEventsFired ?? 0,
    motivationRevealed:
      ant.motivationRevealed ?? ant.arcState?.sterlingConnectionRevealed ?? false,
  };
}

/** Derive confront/ignore counts from the flat response history. */
export function tallyResponses(history: MarcusResponse[]): {
  confrontations: number;
  ignores: number;
  coOpted: boolean;
  total: number;
  ignoreRatio: number;
} {
  let confrontations = 0;
  let ignores = 0;
  let coOpted = false;
  for (const r of history) {
    if (r.kind === 'ignore') ignores += 1;
    else if (r.kind === 'co_opt') {
      coOpted = true;
      confrontations += 1;
    } else if (r.kind === 'confront') confrontations += 1;
    // 'strategic' responses are engagements but not pure confrontations;
    // they still count toward "not ignoring" via total.
  }
  const total = history.length;
  const ignoreRatio = total === 0 ? 0 : ignores / total;
  return { confrontations, ignores, coOpted, total, ignoreRatio };
}

/**
 * Sync the legacy `arcState` sub-object FROM the flat fields + response history,
 * so the templated event builders (which read arcState) reflect the canonical
 * flat data before we ask them to advance/build.
 */
function syncArcStateFromFlat(ant: Antagonist): Antagonist {
  const flat = readFlatArc(ant);
  const tally = tallyResponses(flat.responseHistory);
  const prev: AntagonistArcState = ant.arcState ?? {
    phase: flat.arcPhase,
    phaseEventsFired: flat.phaseEventCount,
    confrontations: 0,
    ignores: 0,
    coOpted: false,
    resolutionType: null,
    sterlingConnectionRevealed: false,
  };
  const arcState: AntagonistArcState = {
    ...prev,
    phase: flat.arcPhase,
    phaseEventsFired: flat.phaseEventCount,
    // Prefer the higher of the recorded counters and the response-history tally
    // (escalateAntagonists may have incremented arcState directly in legacy flows).
    confrontations: Math.max(prev.confrontations, tally.confrontations),
    ignores: Math.max(prev.ignores, tally.ignores),
    coOpted: prev.coOpted || tally.coOpted,
    sterlingConnectionRevealed: prev.sterlingConnectionRevealed || flat.motivationRevealed,
  };
  return { ...ant, arcState, arcPhase: flat.arcPhase };
}

/** Mirror the flat fields back out of a freshly-advanced antagonist. */
function syncFlatFromArcState(ant: Antagonist, prevHistory: MarcusResponse[]): Antagonist {
  const arc = ant.arcState;
  if (!arc) return ant;
  return {
    ...ant,
    arcPhase: arc.phase,
    phaseEventCount: arc.phaseEventsFired,
    responseHistory: ant.responseHistory ?? prevHistory,
    motivationRevealed: (ant.motivationRevealed ?? false) || arc.sterlingConnectionRevealed,
  };
}

/**
 * Evaluate Marcus's phase transition against current game state and return the
 * updated GameState (with Marcus's flat fields + arcState advanced). Pure — does
 * not fire events. Safe to call when Marcus is absent or inactive (no-op).
 *
 * Re-uses the battle-tested transition thresholds in advanceMarcusPhase, then
 * augments the Phase 1→2 trigger with the neighborhood-neglect signal sourced
 * from calendarState.neighborhoodTimeAllocation (spec 8.2 / scenario "Marcus
 * targets neighborhood neglect").
 */
export function evaluateMarcusPhaseTransition(state: GameState): GameState {
  const marcus = getMarcus(state);
  if (!marcus || !marcus.active) return state;

  const synced = syncArcStateFromFlat(marcus);
  const prevHistory = synced.responseHistory ?? [];
  const prevPhase = synced.arcState?.phase ?? 1;

  // Primary transition via the shared engine.
  let transitioned = advanceMarcusPhase(synced, state);

  // Augmented Phase 1→2 trigger: time-allocation neglect (months with 0 slots).
  // advanceMarcusPhase only sees project-based neglect; here we also honor the
  // calendar neglect signal the spec calls out.
  if (
    transitioned.arcState?.phase === 1 &&
    state.turn >= 9 &&
    hasNeglectedNeighborhood(state)
  ) {
    transitioned = advancePhaseTo(transitioned, 2);
  }

  if (transitioned === synced && prevPhase === (transitioned.arcState?.phase ?? 1)) {
    // No change — still write back synced arcState so flat/legacy stay aligned.
    return writeMarcus(state, syncFlatFromArcState(synced, prevHistory));
  }

  return writeMarcus(state, syncFlatFromArcState(transitioned, prevHistory));
}

/** Force-advance an antagonist to a target phase, resetting per-phase counters. */
function advancePhaseTo(ant: Antagonist, phase: 1 | 2 | 3 | 4): Antagonist {
  const arc = ant.arcState;
  if (!arc) return ant;
  const newArc: AntagonistArcState = { ...arc, phase, phaseEventsFired: 0 };
  return {
    ...ant,
    escalationLevel: phase - 1,
    arcState: newArc,
    arcPhase: phase,
    phaseEventCount: 0,
  };
}

/**
 * Select the Marcus event appropriate to his current phase and game state.
 * Returns null if Marcus is absent/inactive/uninitialized. Delegates to the
 * templated event-pool builders, which interpolate real neighborhood, leader,
 * project, and budget data and weaponize the most-recent high-pressure proposal.
 */
export function selectMarcusEvent(state: GameState): GameEvent | null {
  const marcus = getMarcus(state);
  if (!marcus || !marcus.active || !marcus.arcState) return null;
  const synced = syncArcStateFromFlat(marcus);
  return createMarcusEvent(synced, state);
}

/**
 * Full resolve-pipeline step: evaluate the phase transition, then select and
 * enqueue exactly one Marcus event, incrementing the per-phase event counter.
 * Intended to run AFTER proposal expiration so Marcus can reference newly
 * expired / high-pressure proposals (spec 5.3 / 8.1).
 */
export function processMarcusArc(state: GameState): GameState {
  const marcus0 = getMarcus(state);
  if (!marcus0 || !marcus0.active) return state;

  // 1) Phase transition.
  let next = evaluateMarcusPhaseTransition(state);

  // 2) Event selection.
  const event = selectMarcusEvent(next);
  if (!event) return next;

  // 3) Enqueue + bump per-phase counter on both flat + legacy mirrors.
  const marcus = getMarcus(next)!;
  const newPhaseCount = (marcus.phaseEventCount ?? marcus.arcState?.phaseEventsFired ?? 0) + 1;
  const updatedMarcus: Antagonist = {
    ...marcus,
    lastEscalationTurn: next.turn,
    phaseEventCount: newPhaseCount,
    arcState: marcus.arcState
      ? { ...marcus.arcState, phaseEventsFired: newPhaseCount }
      : marcus.arcState,
  };

  next = writeMarcus(next, updatedMarcus);
  return { ...next, eventQueue: [...next.eventQueue, event] };
}

/** Record a player's response to a Marcus event into the flat responseHistory. */
export function recordMarcusResponse(
  state: GameState,
  eventType: string,
  choiceId: string,
): GameState {
  const marcus = getMarcus(state);
  if (!marcus) return state;
  const kind = classifyMarcusResponse(choiceId);
  const responseHistory: MarcusResponse[] = [
    ...(marcus.responseHistory ?? []),
    { turn: state.turn, eventType, choiceId, kind },
  ];
  return writeMarcus(state, { ...marcus, responseHistory });
}

function writeMarcus(state: GameState, marcus: Antagonist): GameState {
  return {
    ...state,
    antagonists: { ...state.antagonists, [MARCUS_ID]: marcus },
  };
}
