import type { GameState } from './types';
import type { PipelineArcState } from './crisis-types';
import { initializeArcsFromSnapshot } from '../systems/arc-progression';

const PIPELINE_URL = '/api/arc-state';

/**
 * Fetch current arc states from the live-news-pipeline and initialize
 * the game's arcs to match reality. "The game always begins today."
 *
 * If the pipeline is unavailable, arcs remain at their default dormant state.
 */
export async function initializeArcsFromPipeline(state: GameState): Promise<GameState> {
  try {
    const response = await fetch(PIPELINE_URL);
    if (!response.ok) return state;

    const pipelineStates: PipelineArcState[] = await response.json();
    if (!Array.isArray(pipelineStates) || pipelineStates.length === 0) return state;

    const activeArcs = initializeArcsFromSnapshot(pipelineStates, state.turn);

    return { ...state, activeArcs };
  } catch {
    return state;
  }
}
