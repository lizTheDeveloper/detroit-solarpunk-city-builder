import type { GameState, GameEvent, Antagonist, MarcusResponse, MarcusResolutionType } from '../state/types';
import { createMarcusEvent, classifyMarcusResponse } from './events';

// ---------------------------------------------------------------------------
// Marcus Webb 4-phase antagonist arc — state-machine driver.
//
// This module is the canonical, state-level API for the Marcus arc. It operates
// ONLY on the flat arc fields living directly on the `marcus_webb` antagonist:
//   arcPhase, responseHistory, phaseEventCount, motivationRevealed, resolutionType
// There is no separate `arcState` sub-object; the confront/ignore/co-opt tallies
// that drive transitions and the resolution branch are DERIVED from
// responseHistory (see `tallyResponses`).
//
// Phase transitions (spec: "Phase transitions are driven by game state"):
//   1 Gadfly      → 2 Demagogue    : turn >= 9 AND (ignored 3+ / 2+ proposals at
//                                      pressure>=3 / 3+ neighborhoods with no
//                                      projects / a neighborhood neglected for
//                                      3+ months). EARLY at turn >= 6 if Sterling
//                                      Cross is co-active.
//   2 Demagogue   → 3 Power Broker : turn >= 20 AND 4+ Phase 2 events fired.
//   3 Power Broker→ 4 Resolution   : turn >= 36 (resolutionType frozen here).
//
// Event selection delegates to the templated builders in events.ts, which
// interpolate real neighborhood, leader, project, and budget data.
// ---------------------------------------------------------------------------

const MARCUS_ID = 'marcus_webb';

/** Read the Marcus antagonist, or null if absent/never initialized. */
export function getMarcus(state: GameState): Antagonist | null {
  return state.antagonists[MARCUS_ID] ?? null;
}

/** Current arc phase, defaulting to 1. */
export function arcPhaseOf(ant: Antagonist): 1 | 2 | 3 | 4 {
  return ant.arcPhase ?? 1;
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
 * Choice ids that the legacy `applyMarcusArcTracking` counted as a confrontation
 * (distinct from `kind`-based bucketing: `counter_media` counts here but is
 * `strategic` under `kind`; `acknowledge` is the inverse).
 */
const CHOICE_ID_CONFRONT = new Set([
  'confront', 'counter_media', 'attend', 'debate', 'invest', 'leverage', 'co_opt',
]);

function isCounted(r: MarcusResponse): boolean {
  // Blocked choices (requirements unmet) were logged but never counted toward the
  // legacy arc counters; preserve that by skipping them in the derivation.
  return r.applied !== false;
}

/**
 * Derive confront/ignore/co-opt tallies from the flat response history.
 *
 * `confrontations` reproduces the legacy stored counter, which was a blend of two
 * counting schemes synced bidirectionally each turn — equivalent at all decision
 * sites to `max(choiceId-confront-count, kind-confront-count)`. (See
 * scripts/marcus-baseline.ts verification: at every Phase-3 entry / 3→4 turn the
 * blend equals this max across all exercised response patterns.) `ignores` and
 * `coOpted` have 1:1 choiceId↔kind maps, so they are unambiguous.
 *
 * NOTE: `ignoreRatio`/`total` are informational (all-applied denominator). The
 * Phase-4 resolution branch uses the narrower `confrontations + ignores`
 * denominator (see determineResolutionType) — do not wire `ignoreRatio` into a
 * decision without matching that denominator.
 */
export function tallyResponses(history: MarcusResponse[]): {
  confrontations: number;
  ignores: number;
  coOpted: boolean;
  total: number;
  ignoreRatio: number;
} {
  let choiceIdConfront = 0;
  let kindConfront = 0;
  let ignores = 0;
  let coOpted = false;
  for (const r of history) {
    if (!isCounted(r)) continue;
    if (CHOICE_ID_CONFRONT.has(r.choiceId)) choiceIdConfront += 1;
    if (r.kind === 'confront' || r.kind === 'co_opt') kindConfront += 1;
    if (r.kind === 'ignore') ignores += 1;
    if (r.kind === 'co_opt') coOpted = true;
  }
  const confrontations = Math.max(choiceIdConfront, kindConfront);
  const total = history.filter(isCounted).length;
  const ignoreRatio = total === 0 ? 0 : ignores / total;
  return { confrontations, ignores, coOpted, total, ignoreRatio };
}

/** Determine the frozen Phase-4 resolution branch from the response tally. */
export function determineResolutionType(history: MarcusResponse[]): MarcusResolutionType {
  const { confrontations, ignores, coOpted } = tallyResponses(history);
  const total = confrontations + ignores;
  if (total === 0) return 'cynicism_engine';
  if (coOpted && confrontations >= 4) return 'reluctant_ally';
  const ignoreRatio = ignores / total;
  if (ignoreRatio > 0.6 && !coOpted) return 'election_threat';
  return 'cynicism_engine';
}

/**
 * Pure phase-transition evaluation against the current game state. Returns the
 * (possibly) advanced antagonist; resets the per-phase counter and freezes the
 * resolution type on transition. Does not fire events. Augments the spec's
 * Phase 1→2 trigger with the calendar neighborhood-neglect signal.
 */
export function advanceMarcusPhase(ant: Antagonist, state: GameState): Antagonist {
  const phase = arcPhaseOf(ant);
  const history = ant.responseHistory ?? [];
  let nextPhase: 1 | 2 | 3 | 4 = phase;

  if (phase === 1) {
    const sterlingActive = state.antagonists['sterling_cross']?.active ?? false;
    const earlyViaSterling = sterlingActive && state.turn >= 6;

    const highPressureProposals = highPressureProposalCount(state);

    const neglectedTiles = Object.values(state.tiles).filter(
      t => t.activeProjects.length === 0 && t.completedProjects.length === 0,
    );
    const severeNeglect = neglectedTiles.length >= 3;

    const { ignores } = tallyResponses(history);

    const standardTransition = state.turn >= 9 && (
      ignores >= 3 ||
      highPressureProposals >= 2 ||
      severeNeglect ||
      hasNeglectedNeighborhood(state)
    );

    if (earlyViaSterling || standardTransition) {
      nextPhase = 2;
    }
  } else if (phase === 2) {
    if (state.turn >= 20 && (ant.phaseEventCount ?? 0) >= 4) {
      nextPhase = 3;
    }
  } else if (phase === 3) {
    if (state.turn >= 36) {
      nextPhase = 4;
    }
  }

  if (nextPhase === phase) return ant;

  const updated: Antagonist = {
    ...ant,
    escalationLevel: nextPhase - 1,
    arcPhase: nextPhase,
    phaseEventCount: 0,
  };
  if (nextPhase === 4) {
    updated.resolutionType = determineResolutionType(history);
  }
  return updated;
}

/**
 * Evaluate Marcus's phase transition and write the result back to the GameState.
 * Pure (does not fire events). No-op when Marcus is absent/inactive.
 */
export function evaluateMarcusPhaseTransition(state: GameState): GameState {
  const marcus = getMarcus(state);
  if (!marcus || !marcus.active) return state;
  const advanced = advanceMarcusPhase(marcus, state);
  if (advanced === marcus) return state;
  return writeMarcus(state, advanced);
}

/**
 * Select the Marcus event appropriate to his current phase and game state.
 * Returns null if Marcus is absent/inactive. Delegates to the templated builders.
 */
export function selectMarcusEvent(state: GameState): GameEvent | null {
  const marcus = getMarcus(state);
  if (!marcus || !marcus.active) return null;
  return createMarcusEvent(marcus, state);
}

/**
 * Full resolve-pipeline step: evaluate the phase transition, then select and
 * enqueue exactly one Marcus event, incrementing the per-phase event counter.
 */
export function processMarcusArc(state: GameState): GameState {
  const marcus0 = getMarcus(state);
  if (!marcus0 || !marcus0.active) return state;

  // 1) Phase transition.
  let next = evaluateMarcusPhaseTransition(state);

  // 2) Event selection.
  const event = selectMarcusEvent(next);
  if (!event) return next;

  // 3) Enqueue + bump per-phase counter.
  const marcus = getMarcus(next)!;
  const updatedMarcus: Antagonist = {
    ...marcus,
    lastEscalationTurn: next.turn,
    phaseEventCount: (marcus.phaseEventCount ?? 0) + 1,
  };

  next = writeMarcus(next, updatedMarcus);
  return { ...next, eventQueue: [...next.eventQueue, event] };
}

/**
 * Record a player's response to a Marcus event into the flat responseHistory.
 * `applied` defaults to true; pass false when the choice's requirements blocked
 * its effects so the response is logged but excluded from the arc tallies.
 */
export function recordMarcusResponse(
  state: GameState,
  eventType: string,
  choiceId: string,
  applied = true,
): GameState {
  const marcus = getMarcus(state);
  if (!marcus) return state;
  const kind = classifyMarcusResponse(choiceId);
  const entry: MarcusResponse = { turn: state.turn, eventType, choiceId, kind };
  if (!applied) entry.applied = false;
  const responseHistory: MarcusResponse[] = [...(marcus.responseHistory ?? []), entry];
  return writeMarcus(state, { ...marcus, responseHistory });
}

function writeMarcus(state: GameState, marcus: Antagonist): GameState {
  return {
    ...state,
    antagonists: { ...state.antagonists, [MARCUS_ID]: marcus },
  };
}
