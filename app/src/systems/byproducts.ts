import type { GameState, ByproductId, ByproductLifetime, ProjectEffects } from '../state/types';
import { PROJECT_CATALOG } from '../data/content/project-catalog';

export interface AvailableByproduct {
  byproductId: ByproductId;
  lifetime: ByproductLifetime;
  amount: number;
  strength: number; // 1.0 local, 0.5 adjacent
  sourceProjectId: string;
  sourceTileId: string;
}

export interface ByproductBonusResult {
  costMultiplier: number;
  durationReduction: number;
  effectBoosts: Array<{ field: keyof ProjectEffects; boost: number }>;
  activeByproducts: AvailableByproduct[];
}

/**
 * Scans completed projects on tile and adjacent tiles, returns availability list.
 * Strength: 1.0 for same-tile, 0.5 for adjacent.
 * One-shot byproducts that have been consumed are excluded.
 */
export function getAvailableByproducts(
  state: GameState,
  tileId: string,
): AvailableByproduct[] {
  const tile = state.tiles[tileId];
  if (!tile) return [];

  const available: AvailableByproduct[] = [];

  const tileConsumed = tile.consumedByproducts || [];

  // Scan same tile (strength 1.0)
  for (const projectId of tile.completedProjects) {
    const def = PROJECT_CATALOG[projectId];
    if (!def) continue;
    for (const output of def.produces) {
      if (output.lifetime === 'one-shot') {
        const consumeKey = `${projectId}:${output.byproductId}`;
        if (tileConsumed.includes(consumeKey)) continue;
      }
      available.push({
        byproductId: output.byproductId,
        lifetime: output.lifetime,
        amount: output.amount,
        strength: 1.0,
        sourceProjectId: projectId,
        sourceTileId: tileId,
      });
    }
  }

  // Scan adjacent tiles (strength 0.5)
  for (const adjId of tile.adjacentTileIds) {
    const adjTile = state.tiles[adjId];
    if (!adjTile) continue;
    const adjConsumed = adjTile.consumedByproducts || [];
    for (const projectId of adjTile.completedProjects) {
      const def = PROJECT_CATALOG[projectId];
      if (!def) continue;
      for (const output of def.produces) {
        if (output.lifetime === 'one-shot') {
          const consumeKey = `${projectId}:${output.byproductId}`;
          if (adjConsumed.includes(consumeKey)) continue;
        }
        available.push({
          byproductId: output.byproductId,
          lifetime: output.lifetime,
          amount: output.amount,
          strength: 0.5,
          sourceProjectId: projectId,
          sourceTileId: adjId,
        });
      }
    }
  }

  return available;
}

/**
 * Calculate byproduct bonuses for a project about to be started/completed on a tile.
 *
 * Rules:
 * - Same byproduct from multiple sources does NOT stack (best effective value wins)
 * - Effective value = amount * strength (1.0 local, 0.5 adjacent)
 * - Caps: cost multiplier never below 0.70, duration reduction max 1 turn, effect boost max 0.25
 */
export function calculateByproductBonuses(
  state: GameState,
  tileId: string,
  projectId: string,
): ByproductBonusResult {
  const def = PROJECT_CATALOG[projectId];
  if (!def || def.consumes.length === 0) {
    return { costMultiplier: 1, durationReduction: 0, effectBoosts: [], activeByproducts: [] };
  }

  const available = getAvailableByproducts(state, tileId);
  if (available.length === 0) {
    return { costMultiplier: 1, durationReduction: 0, effectBoosts: [], activeByproducts: [] };
  }

  let costReduction = 0;
  let durationReduction = 0;
  const effectBoosts: Array<{ field: keyof ProjectEffects; boost: number }> = [];
  const activeByproducts: AvailableByproduct[] = [];

  for (const input of def.consumes) {
    // Find the best source for this byproduct (highest effective value)
    let bestSource: AvailableByproduct | null = null;
    let bestEffective = 0;

    for (const avail of available) {
      if (avail.byproductId === input.byproductId) {
        const effective = avail.amount * avail.strength;
        if (effective > bestEffective) {
          bestEffective = effective;
          bestSource = avail;
        }
      }
    }

    if (!bestSource || bestEffective === 0) continue;

    activeByproducts.push(bestSource);

    switch (input.bonusType) {
      case 'costReduction': {
        // Scale reduction by effective strength
        costReduction += input.bonusValue * bestEffective;
        break;
      }
      case 'durationReduction': {
        // Grant full turn reduction if byproduct is available at >= half effective
        // (i.e., adjacent with amount 1.0 still grants the bonus)
        if (bestEffective >= 0.5) {
          durationReduction += input.bonusValue;
        }
        break;
      }
      case 'effectBoost': {
        if (input.effectField) {
          effectBoosts.push({
            field: input.effectField,
            boost: input.bonusValue * bestEffective,
          });
        }
        break;
      }
    }
  }

  // Apply caps
  costReduction = Math.min(costReduction, 0.30);
  durationReduction = Math.min(durationReduction, 1);

  const cappedEffectBoosts = effectBoosts.map((eb) => ({
    field: eb.field,
    boost: Math.min(eb.boost, 0.25),
  }));

  return {
    costMultiplier: Math.max(1 - costReduction, 0.70),
    durationReduction,
    effectBoosts: cappedEffectBoosts,
    activeByproducts,
  };
}
