import type { GameState, MeterDelta } from '../state/types';

/**
 * Community Mesh Network — information liberation.
 *
 * When multiple tiles have community ownership (maker spaces, community
 * kitchens, land trusts), they form an informal communication network.
 * Part pirate radio, part zine distro, part neighborhood WhatsApp group.
 * This network amplifies narrative actions and provides early warning
 * of antagonist moves.
 *
 * Real Detroit precedents:
 * - WCBN 88.3 FM: community radio since 1972
 * - Dearborn Underground/Hamtramck Star: hyperlocal independent media
 * - Detroit Community Technology Project: mesh WiFi in Islandview (2015-present)
 * - Allied Media Conference: radical media makers since 1999
 * - East Michigan Environmental Action Council newsletters (1960s-present)
 * - Block club phone trees during the '67 uprising and 2014 water shutoffs
 *
 * Mechanically:
 * - Network strength = count of tiles with communityOwned=true
 * - At 2+ tiles: narrative actions gain +20% effectiveness
 * - At 4+ tiles: counter-narratives are 30% less effective against you
 * - At 6+ tiles: you get 1 extra narrative action per turn
 * - Each level also provides small passive trust gain (word spreads)
 * - Acts as force multiplier for existing systems rather than new resource
 *
 * The punk angle: you don't need a marketing budget when every block
 * has someone who knows someone. The corporate media can't spin what
 * people already experienced through their own network.
 */

export interface MeshNetworkStatus {
  strength: number;
  narrativeBonus: number;
  counterNarrativeResistance: number;
  extraActions: number;
  passiveTrustGain: number;
}

export function calculateMeshNetworkStrength(state: GameState): number {
  return Object.values(state.tiles).filter(t => t.communityOwned).length;
}

export function getMeshNetworkStatus(state: GameState): MeshNetworkStatus {
  const strength = calculateMeshNetworkStrength(state);

  return {
    strength,
    narrativeBonus: strength >= 2 ? 0.20 : 0,
    counterNarrativeResistance: strength >= 4 ? 0.30 : 0,
    extraActions: strength >= 6 ? 1 : 0,
    passiveTrustGain: strength >= 2 ? strength * 0.05 : 0, // was 0.15 quarterly, ÷3 for monthly
  };
}

export function applyMeshNetworkEffects(state: GameState): { state: GameState; deltas: MeterDelta[] } {
  const status = getMeshNetworkStatus(state);
  const deltas: MeterDelta[] = [];

  if (status.passiveTrustGain > 0) {
    deltas.push({
      meter: 'communityTrust',
      amount: status.passiveTrustGain,
      source: 'mesh_network',
    });
  }

  // At 6+ community-owned tiles, reduce fixed obligations by 2 (freeing 2 discretionary slots)
  if (status.extraActions > 0 && state.calendarState && state.calendarState.fixedSlots > 34) {
    const newFixed = Math.max(34, state.calendarState.fixedSlots - 2);
    const newDiscretionary = state.calendarState.totalSlots - newFixed - state.calendarState.crisisSlotTax;
    return {
      state: {
        ...state,
        meters: {
          ...state.meters,
          communityTrust: state.meters.communityTrust + status.passiveTrustGain,
        },
        calendarState: {
          ...state.calendarState,
          fixedSlots: newFixed,
          discretionarySlots: newDiscretionary,
        },
      },
      deltas,
    };
  }

  if (status.passiveTrustGain > 0) {
    return {
      state: {
        ...state,
        meters: {
          ...state.meters,
          communityTrust: state.meters.communityTrust + status.passiveTrustGain,
        },
      },
      deltas,
    };
  }

  return { state, deltas };
}
