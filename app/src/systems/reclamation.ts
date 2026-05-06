import type { GameState, Tile, MeterDelta } from '../state/types';

/**
 * Vacant Lot Reclamation — land liberation.
 *
 * Detroit has 70,000+ vacant lots. The Land Bank owns 40,000+ parcels
 * that sit empty for years while people need space to grow food, build
 * housing, store materials. This system lets you reclaim vacant lots
 * for community use without waiting for permits or purchases.
 *
 * Real Detroit precedents:
 * - Fireweed Universe City: guerrilla gardened 30+ lots before getting
 *   official Land Bank leases (2011-2015)
 * - Heidelberg Project: occupied an entire block of abandoned houses
 *   as art installations. City demolished them twice. They kept coming back.
 * - North End lots: community took over dozens of abandoned parcels for
 *   urban agriculture before the Land Bank existed (1990s-present)
 * - Brightmoor: residents mowed, planted, and maintained 100+ vacant
 *   lots for 20 years before any city program acknowledged it
 *
 * Mechanically:
 * - Each tile has a `vacantLots` count (starts 3-8 depending on neighborhood)
 * - Reclaiming a lot: costs 0 budget, requires trust >= 30
 * - Each reclaimed lot adds +1 to the tile's project capacity
 * - BUT: reclaiming increases gentrification pressure slightly (+2 per lot)
 *   unless the tile has a land trust (then +0)
 * - Risk: city may "take back" reclaimed lots if trust drops below 20
 *   (representing loss of community control / adverse possession failure)
 * - Reclaimed lots generate small eco bonus per turn (nature does the work)
 *
 * The punk angle: these lots have been abandoned for decades. The city
 * forgot they existed until someone made them beautiful. Then suddenly
 * there are code violations and demolition orders. Land trusts protect
 * against this. Direct action makes it permanent.
 */

export interface ReclamationResult {
  reclaimed: boolean;
  reason?: string;
  deltas: MeterDelta[];
}

export function canReclaimLot(state: GameState, tileId: string): { allowed: boolean; reason?: string } {
  const tile = state.tiles[tileId];
  if (!tile) return { allowed: false, reason: 'Unknown tile' };
  if (tile.vacantLots <= 0) return { allowed: false, reason: 'No vacant lots remaining' };
  if (state.meters.communityTrust < 30) return { allowed: false, reason: 'Need trust >= 30 (community backing)' };
  return { allowed: true };
}

export function reclaimLot(state: GameState, tileId: string): { state: GameState; result: ReclamationResult } {
  const check = canReclaimLot(state, tileId);
  if (!check.allowed) {
    return { state, result: { reclaimed: false, reason: check.reason, deltas: [] } };
  }

  const tile = state.tiles[tileId];
  const hasLandTrust = tile.completedProjects.includes('land_trust');
  const gentIncrease = hasLandTrust ? 0 : 2;

  const newTile: Tile = {
    ...tile,
    vacantLots: tile.vacantLots - 1,
    reclaimedLots: (tile.reclaimedLots || 0) + 1,
    gentrificationPressure: tile.gentrificationPressure + gentIncrease,
  };

  const deltas: MeterDelta[] = [];
  if (gentIncrease > 0) {
    deltas.push({
      meter: 'communityTrust',
      amount: -1,
      source: 'reclamation_risk',
    });
  }

  return {
    state: {
      ...state,
      tiles: { ...state.tiles, [tileId]: newTile },
      meters: {
        ...state.meters,
        communityTrust: state.meters.communityTrust + (gentIncrease > 0 ? -1 : 0),
      },
    },
    result: { reclaimed: true, deltas },
  };
}

export function applyReclamationEffects(state: GameState): { state: GameState; deltas: MeterDelta[] } {
  const deltas: MeterDelta[] = [];
  let ecoGain = 0;

  for (const tile of Object.values(state.tiles)) {
    const reclaimedCount = tile.reclaimedLots || 0;
    if (reclaimedCount > 0) {
      ecoGain += reclaimedCount * 0.1; // was 0.3 quarterly, ÷3 for monthly
    }
  }

  if (ecoGain > 0) {
    deltas.push({ meter: 'ecologicalHealth', amount: ecoGain, source: 'reclaimed_lots_rewilding' });
  }

  return {
    state: {
      ...state,
      meters: { ...state.meters, ecologicalHealth: state.meters.ecologicalHealth + ecoGain },
    },
    deltas,
  };
}

export function checkReclamationLoss(state: GameState): GameState {
  if (state.meters.communityTrust >= 20) return state;

  let lostAny = false;
  const newTiles = { ...state.tiles };

  for (const [id, tile] of Object.entries(state.tiles)) {
    const reclaimed = tile.reclaimedLots || 0;
    if (reclaimed > 0 && !tile.completedProjects.includes('land_trust')) {
      newTiles[id] = {
        ...tile,
        vacantLots: tile.vacantLots + 1,
        reclaimedLots: reclaimed - 1,
      };
      lostAny = true;
    }
  }

  return lostAny ? { ...state, tiles: newTiles } : state;
}

export function getReclamationCapacityBonus(tile: Tile): number {
  return tile.reclaimedLots || 0;
}
