import type { DelayedConsequence, DependencyWeb } from '../state/crisis-types';
import { hasCondition } from './dependency-web';

// ---------------------------------------------------------------------------
// Delayed Consequence Queue
// ---------------------------------------------------------------------------
// A priority queue sorted by trigger turn. Each turn, the resolve step pops
// all consequences where triggerTurn <= currentTurn, checks activation and
// cancellation conditions, then applies effects.
// ---------------------------------------------------------------------------

/**
 * Result of processing the consequence queue for a single turn.
 */
export interface ConsequenceProcessResult {
  fired: DelayedConsequence[];
  cancelled: DelayedConsequence[];
  remaining: DelayedConsequence[];
}

/**
 * A foreshadow hint to show the player.
 */
export interface ForeshadowHint {
  consequenceId: string;
  arcId: string;
  hint: string;
}

// ---------------------------------------------------------------------------
// Queue operations
// ---------------------------------------------------------------------------

/**
 * Schedule a new consequence into the queue. Maintains sort order by triggerTurn.
 * Returns a new queue array (immutable).
 */
export function scheduleConsequence(
  queue: DelayedConsequence[],
  consequence: DelayedConsequence
): DelayedConsequence[] {
  const newQueue = [...queue, consequence];
  newQueue.sort((a, b) => a.triggerTurn - b.triggerTurn);
  return newQueue;
}

/**
 * Process all consequences that are ready to fire this turn.
 * - Consequences with triggerTurn <= currentTurn are evaluated.
 * - If ANY cancel condition is present in the web, the consequence is cancelled.
 * - If ALL activation conditions are present (or there are none), it fires.
 * - If activation conditions are NOT met, the consequence is cancelled (missed window).
 *
 * Returns fired, cancelled, and remaining consequences.
 */
export function processConsequences(
  queue: DelayedConsequence[],
  currentTurn: number,
  dependencyWeb: DependencyWeb
): ConsequenceProcessResult {
  const fired: DelayedConsequence[] = [];
  const cancelled: DelayedConsequence[] = [];
  const remaining: DelayedConsequence[] = [];

  for (const consequence of queue) {
    if (consequence.triggerTurn > currentTurn) {
      remaining.push(consequence);
      continue;
    }

    // Check cancellation conditions first — any present means cancelled
    const isCancelled = consequence.cancelConditions.some(
      (cond) => hasCondition(dependencyWeb, cond)
    );

    if (isCancelled) {
      cancelled.push(consequence);
      continue;
    }

    // Check activation conditions — all must be present (empty = always active)
    const isActivated = consequence.activationConditions.every(
      (cond) => hasCondition(dependencyWeb, cond)
    );

    if (isActivated) {
      fired.push(consequence);
    } else {
      // Activation conditions not met — consequence fizzles
      cancelled.push(consequence);
    }
  }

  return { fired, cancelled, remaining };
}

/**
 * Get foreshadow hints for consequences approaching their trigger turn.
 * A hint is shown when: currentTurn >= (triggerTurn - hintTurnsBeforeTrigger)
 * and the consequence has not yet been cancelled.
 */
export function getForeshadowHints(
  queue: DelayedConsequence[],
  currentTurn: number,
  dependencyWeb: DependencyWeb
): ForeshadowHint[] {
  const hints: ForeshadowHint[] = [];

  for (const consequence of queue) {
    // Only show hints for consequences that haven't fired yet
    if (consequence.triggerTurn <= currentTurn) continue;

    // Check if we're within the hint window
    const hintTurn = consequence.triggerTurn - consequence.hintTurnsBeforeTrigger;
    if (currentTurn < hintTurn) continue;

    // Don't show hint if consequence would be cancelled
    const isCancelled = consequence.cancelConditions.some(
      (cond) => hasCondition(dependencyWeb, cond)
    );
    if (isCancelled) continue;

    hints.push({
      consequenceId: consequence.id,
      arcId: consequence.arcId,
      hint: consequence.foreshadowHint,
    });
  }

  return hints;
}
