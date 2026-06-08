/**
 * The decision interface both archetype and LLM agents implement. The runner
 * talks to nothing but this, so a "strategy" (deterministic heuristic) and a
 * "model" (LLM) are interchangeable from the engine's point of view.
 */

import type { GameAction, GameEvent } from '../../src/state/types.ts';
import type { TurnView } from './types.ts';

export interface DecisionAgent {
  readonly id: string;
  /** Main-phase actions for this turn (proposals, policies, calendar, …). */
  decide(view: TurnView): Promise<GameAction[]>;
  /** Choose a choiceId for an event. Makes event response a real lever. */
  chooseEvent(event: GameEvent, view: TurnView): Promise<string>;
}

/** Convenience: always pick the first event choice (LLM v1 policy). */
export function firstChoice(event: GameEvent): string {
  return event.choices[0]?.id ?? '';
}
