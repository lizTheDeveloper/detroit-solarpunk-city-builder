import type { GameState } from '../state/types';

export type FrameType = 'establishment' | 'community' | 'market';

export interface PropagandaFrame {
  type: FrameType;
  text: string;
  source: string;
}

export interface FramedHeadline {
  headlineId: string;
  rawTitle: string;
  arcId: string;
  severity: number;
  frames: {
    establishment: PropagandaFrame | null;
    community: PropagandaFrame | null;
    market: PropagandaFrame | null;
  };
}

/**
 * Select which propaganda frame to show a player based on their game state.
 *
 * Logic:
 * - If an active antagonist matches this headline's arc AND the player hasn't
 *   countered them yet → show establishment frame (antagonist is pushing their narrative)
 * - If antagonist is countered → show market frame (they shift to economic arguments)
 * - Default → community frame (player's home base perspective)
 */
export function selectFrame(
  headline: FramedHeadline,
  state: GameState
): PropagandaFrame | null {
  const conditions = new Set(state.dependencyWeb?.conditions ?? []);

  const arcActive = state.activeArcs?.some(
    a => a.arcId === headline.arcId && a.currentStage !== 'dormant' && a.currentStage !== 'resolved'
  );

  if (arcActive) {
    const countered = conditions.has(`countered_${headline.arcId}`);
    if (countered && headline.frames.market) {
      return headline.frames.market;
    }
    if (headline.frames.establishment) {
      return headline.frames.establishment;
    }
  }

  return headline.frames.community;
}

/**
 * Generate a static frame for use in playtest mode when no pipeline frames exist.
 * Creates simple frames based on arc template antagonist voice profiles.
 */
export function generateStaticFrames(
  headlineTitle: string,
  arcId: string,
  severity: number
): FramedHeadline {
  return {
    headlineId: `static_${arcId}_${Date.now()}`,
    rawTitle: headlineTitle,
    arcId,
    severity,
    frames: {
      establishment: {
        type: 'establishment',
        text: `Industry leaders emphasize measured response to ${headlineTitle.toLowerCase()}`,
        source: 'static',
      },
      community: {
        type: 'community',
        text: `Community organizations demand accountability: "${headlineTitle}"`,
        source: 'static',
      },
      market: {
        type: 'market',
        text: `Markets react to ${headlineTitle.toLowerCase()} — analysts weigh economic impact`,
        source: 'static',
      },
    },
  };
}
