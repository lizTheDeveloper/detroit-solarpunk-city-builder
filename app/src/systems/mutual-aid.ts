import type { GameState, Tile, MeterDelta } from '../state/types';

/**
 * Mutual Aid Networks
 *
 * When a tile gets hit by a crisis event (climate, antagonist), adjacent tiles
 * with high community trust can absorb some of the damage. This isn't charity —
 * it's reciprocity. The helping tile loses a small amount of trust (people are
 * tired) but gains food sovereignty (shared meals) and the helped tile takes
 * less damage.
 *
 * Real Detroit precedents:
 * - Detroit Community Fridge Network (mutual aid during COVID)
 * - People's Water Campaign (paid each other's water bills, 2014-present)
 * - Brightmoor Maker Space sharing tools with SW Detroit after storm damage
 * - Block clubs clearing snow for elderly neighbors (no city plow for weeks)
 * - Heidelberg Project rebuilding each other's houses after arson
 *
 * Mechanically:
 * - Triggers automatically when a tile takes damage from climate/crisis events
 * - Each adjacent tile with communityOwned=true OR communityPowerTokens >= 2 can help
 * - Helping tiles absorb 30% of the eco/food damage
 * - Helper loses 2 trust (exhaustion), gains 1 food sovereignty (shared resources)
 * - Creates a delta so the player sees it happening
 */

export interface MutualAidResult {
  aided: boolean;
  helperTileIds: string[];
  damageAbsorbed: number;
  deltas: MeterDelta[];
}

export function canProvideMutualAid(tile: Tile): boolean {
  return tile.communityOwned || tile.communityPowerTokens >= 2;
}

export function applyMutualAid(
  state: GameState,
  damagedTileId: string,
  damageAmount: number,
  damageMeter: 'ecologicalHealth' | 'foodSovereignty',
): MutualAidResult {
  const damagedTile = state.tiles[damagedTileId];
  if (!damagedTile) {
    return { aided: false, helperTileIds: [], damageAbsorbed: 0, deltas: [] };
  }

  const helpers = damagedTile.adjacentTileIds
    .map(id => state.tiles[id])
    .filter(t => t && canProvideMutualAid(t));

  if (helpers.length === 0) {
    return { aided: false, helperTileIds: [], damageAbsorbed: 0, deltas: [] };
  }

  // Each helper absorbs a share of 30% of the damage
  const totalAbsorption = damageAmount * 0.30;
  const perHelper = totalAbsorption / helpers.length;
  const deltas: MeterDelta[] = [];

  deltas.push({
    meter: damageMeter,
    amount: totalAbsorption,
    source: `mutual_aid (${helpers.map(h => h.name).join(', ')})`,
  });

  // Helpers pay a small trust cost (people are tired) but gain food sov (shared meals)
  for (const helper of helpers) {
    deltas.push({
      meter: 'communityTrust',
      amount: -2,
      source: `mutual_aid_exhaustion (${helper.name})`,
    });
    deltas.push({
      meter: 'foodSovereignty',
      amount: 1,
      source: `mutual_aid_sharing (${helper.name})`,
    });
  }

  return {
    aided: true,
    helperTileIds: helpers.map(h => h.id),
    damageAbsorbed: totalAbsorption,
    deltas,
  };
}
