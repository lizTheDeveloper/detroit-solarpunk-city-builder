import type { GameState } from '../state/types';
import { SYNERGIES, type Synergy } from '../data/content/synergies';

export interface SynergyResult {
  costMultiplier: number;
  durationMultiplier: number;
  ecoBonus: number;
  activeSynergies: Array<{ synergy: Synergy; sourceTileId: string }>;
}

/**
 * Calculate all active synergies for a project about to be placed on a tile.
 * Checks completed projects on the same tile and adjacent tiles.
 */
export function calculateSynergies(
  state: GameState,
  tileId: string,
  projectId: string,
): SynergyResult {
  const tile = state.tiles[tileId];
  if (!tile) {
    return { costMultiplier: 1, durationMultiplier: 1, ecoBonus: 0, activeSynergies: [] };
  }

  const relevantSynergies = SYNERGIES.filter((s) => s.targetProject === projectId);
  if (relevantSynergies.length === 0) {
    return { costMultiplier: 1, durationMultiplier: 1, ecoBonus: 0, activeSynergies: [] };
  }

  const activeSynergies: Array<{ synergy: Synergy; sourceTileId: string }> = [];

  for (const synergy of relevantSynergies) {
    if (synergy.range === 'same-tile') {
      if (tile.completedProjects.includes(synergy.sourceProject)) {
        activeSynergies.push({ synergy, sourceTileId: tileId });
      }
    } else {
      // adjacent — check all neighboring tiles
      for (const adjId of tile.adjacentTileIds) {
        const adjTile = state.tiles[adjId];
        if (adjTile && adjTile.completedProjects.includes(synergy.sourceProject)) {
          activeSynergies.push({ synergy, sourceTileId: adjId });
          break; // one source is enough per synergy
        }
      }
    }
  }

  if (activeSynergies.length === 0) {
    return { costMultiplier: 1, durationMultiplier: 1, ecoBonus: 0, activeSynergies: [] };
  }

  // Multiply all cost multipliers together (stacking with diminishing effect)
  let costMultiplier = 1;
  let durationMultiplier = 1;
  let ecoBonus = 0;

  for (const { synergy } of activeSynergies) {
    if (synergy.costMultiplier !== null) {
      costMultiplier *= synergy.costMultiplier;
    }
    if (synergy.durationMultiplier !== null) {
      durationMultiplier *= synergy.durationMultiplier;
    }
    if (synergy.ecoBonus !== null) {
      ecoBonus += synergy.ecoBonus;
    }
  }

  // Floor: never reduce below 30% cost or 40% duration
  costMultiplier = Math.max(costMultiplier, 0.30);
  durationMultiplier = Math.max(durationMultiplier, 0.40);

  return { costMultiplier, durationMultiplier, ecoBonus, activeSynergies };
}
