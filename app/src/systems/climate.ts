import type { GameState, Tile, MeterDelta, GameEvent, Season } from '../state/types';
import { climateEventProbability } from './meters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TippingPointResult {
  point: 1 | 2;
  message: string;
  meterDeltas: MeterDelta[];
  tileEffects: Array<{ tileId: string; ecoDamage: number }>;
}

export type DamageType = 'flood' | 'heat' | 'storm' | 'ice';

export interface AdaptationSummary {
  floodReduction: number;
  heatReduction: number;
  iceReduction: number;
}

// ---------------------------------------------------------------------------
// Seasonal multipliers for climate event types
// ---------------------------------------------------------------------------

const SEASONAL_EVENT_MULTIPLIERS: Record<string, Record<Season, number>> = {
  heat_wave: { spring: 0.5, summer: 3, fall: 0.5, winter: 0 },
  flooding: { spring: 2, summer: 0.5, fall: 1.5, winter: 0.5 },
  severe_storm: { spring: 1, summer: 1, fall: 1.5, winter: 1 },
  ice_storm: { spring: 0, summer: 0, fall: 0.5, winter: 2 },
};

// ---------------------------------------------------------------------------
// 1. checkTippingPoints
// ---------------------------------------------------------------------------

export function checkTippingPoints(state: GameState): {
  triggered: TippingPointResult[];
  updatedState: GameState;
} {
  const triggered: TippingPointResult[] = [];
  let updatedState = { ...state };

  const pressure = state.meters.climatePressure;

  // Tipping point 1: 60% threshold
  if (pressure >= 60 && (state.eventCooldowns['tipping_point_1'] ?? 0) === 0) {
    const tileEffects: Array<{ tileId: string; ecoDamage: number }> = [];
    const tiles = { ...updatedState.tiles };

    for (const tileId of Object.keys(tiles)) {
      tiles[tileId] = {
        ...tiles[tileId],
        ecologicalHealth: Math.max(0, tiles[tileId].ecologicalHealth - 5),
      };
      tileEffects.push({ tileId, ecoDamage: -5 });
    }

    const result: TippingPointResult = {
      point: 1,
      message: 'Climate tipping point reached. Severe weather is now the baseline.',
      meterDeltas: [],
      tileEffects,
    };

    triggered.push(result);
    updatedState = {
      ...updatedState,
      tiles,
      eventCooldowns: {
        ...updatedState.eventCooldowns,
        tipping_point_1: 9999,
      },
    };
  }

  // Tipping point 2: 85% threshold
  if (pressure >= 85 && (state.eventCooldowns['tipping_point_2'] ?? 0) === 0) {
    const tileEffects: Array<{ tileId: string; ecoDamage: number }> = [];
    const tiles = { ...updatedState.tiles };

    // Find 3 tiles with lowest ecological health
    const tilesByEco = Object.keys(tiles)
      .map((id) => ({ id, eco: tiles[id].ecologicalHealth }))
      .sort((a, b) => a.eco - b.eco)
      .slice(0, 3);

    for (const { id } of tilesByEco) {
      tiles[id] = {
        ...tiles[id],
        ecologicalHealth: Math.max(0, tiles[id].ecologicalHealth - 15),
      };
      tileEffects.push({ tileId: id, ecoDamage: -15 });
    }

    const meterDeltas: MeterDelta[] = [
      { meter: 'budget', amount: -0.5, source: 'tipping_point_2_flooding' },
    ];

    const result: TippingPointResult = {
      point: 2,
      message: 'Cascading climate failure. Damage is now amplified across all systems.',
      meterDeltas,
      tileEffects,
    };

    triggered.push(result);
    updatedState = {
      ...updatedState,
      tiles,
      meters: {
        ...updatedState.meters,
        budget: updatedState.meters.budget - 0.5,
      },
      eventCooldowns: {
        ...updatedState.eventCooldowns,
        tipping_point_2: 9999,
      },
    };
  }

  return { triggered, updatedState };
}

// ---------------------------------------------------------------------------
// 2. applySeasonalEffects
// ---------------------------------------------------------------------------

export function applySeasonalEffects(
  state: GameState,
  _rng: () => number
): { state: GameState; deltas: MeterDelta[] } {
  const deltas: MeterDelta[] = [];
  let updatedState = { ...state };
  const season = state.season;

  if (season === 'spring') {
    // +0.5% eco to tiles with rain_garden completed
    const tiles = { ...updatedState.tiles };
    for (const tileId of Object.keys(tiles)) {
      if (tiles[tileId].completedProjects.includes('rain_garden')) {
        tiles[tileId] = {
          ...tiles[tileId],
          ecologicalHealth: Math.min(100, tiles[tileId].ecologicalHealth + 0.5),
        };
      }
    }
    updatedState = { ...updatedState, tiles };
  } else if (season === 'summer') {
    // -1% food sov if no tile has water_transit completed
    const hasWaterTransit = Object.values(updatedState.tiles).some((tile) =>
      tile.completedProjects.includes('water_transit')
    );
    if (!hasWaterTransit) {
      deltas.push({ meter: 'foodSovereignty', amount: -1, source: 'summer_drought' });
      updatedState = {
        ...updatedState,
        meters: {
          ...updatedState.meters,
          foodSovereignty: updatedState.meters.foodSovereignty - 1,
        },
      };
    }
  } else if (season === 'fall') {
    // +1% food sov harvest
    deltas.push({ meter: 'foodSovereignty', amount: 1, source: 'fall_harvest' });
    updatedState = {
      ...updatedState,
      meters: {
        ...updatedState.meters,
        foodSovereignty: updatedState.meters.foodSovereignty + 1,
      },
    };
  } else if (season === 'winter') {
    // -$0.05M per tile with active projects
    let tilesWithActiveProjects = 0;
    for (const tileId of Object.keys(updatedState.tiles)) {
      if (updatedState.tiles[tileId].activeProjects.length > 0) {
        tilesWithActiveProjects++;
      }
    }
    if (tilesWithActiveProjects > 0) {
      const cost = -0.05 * tilesWithActiveProjects;
      deltas.push({ meter: 'budget', amount: cost, source: 'winter_heating' });
      updatedState = {
        ...updatedState,
        meters: {
          ...updatedState.meters,
          budget: updatedState.meters.budget + cost,
        },
      };
    }
  }

  return { state: updatedState, deltas };
}

// ---------------------------------------------------------------------------
// 3. calculateAdaptedDamage
// ---------------------------------------------------------------------------

export function calculateAdaptedDamage(
  tile: Tile,
  baseDamage: number,
  damageType: DamageType
): number {
  let damage = baseDamage;

  if (damageType === 'flood') {
    if (tile.completedProjects.includes('rain_garden')) {
      damage *= 0.5; // 50% reduction
    }
    // Note: wetland_restoration on adjacent tiles would need adjacency check
    // handled externally - here we just check if this tile has wetland_restoration
    // (the 30% adjacent reduction is applied by the caller with adjacency data)
  } else if (damageType === 'heat') {
    if (tile.completedProjects.includes('greenway')) {
      damage *= 0.6; // 40% reduction
    }
  } else if (damageType === 'ice') {
    if (tile.completedProjects.includes('solar_grid')) {
      damage = 0; // eliminates ice damage
    }
  }
  // storm: no specific adaptation (full damage)

  return damage;
}

// ---------------------------------------------------------------------------
// 4. generateClimateEvent
// ---------------------------------------------------------------------------

export function generateClimateEvent(
  state: GameState,
  season: Season,
  rng: () => number
): GameEvent | null {
  const pressure = state.meters.climatePressure;
  let baseProb = climateEventProbability(pressure);

  // Tipping point 1 adds +0.10
  if ((state.eventCooldowns['tipping_point_1'] ?? 0) > 0) {
    baseProb += 0.10;
  }

  // Determine event type probabilities weighted by season
  const eventTypes = ['heat_wave', 'flooding', 'severe_storm', 'ice_storm'] as const;
  const weights = eventTypes.map((type) => {
    const mult = SEASONAL_EVENT_MULTIPLIERS[type][season];
    return baseProb * mult;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return null;

  // Roll to see if any event occurs
  const roll = rng();
  // The max probability across all event types determines if we get an event
  const maxProb = Math.max(...weights);
  if (roll > maxProb) return null;

  // Pick which event type based on relative weights
  const typeRoll = rng() * totalWeight;
  let cumulative = 0;
  let selectedType: string = eventTypes[0];
  for (let i = 0; i < eventTypes.length; i++) {
    cumulative += weights[i];
    if (typeRoll <= cumulative) {
      selectedType = eventTypes[i];
      break;
    }
  }

  const eventTitles: Record<string, string> = {
    heat_wave: 'Extreme Heat Wave',
    flooding: 'Flash Flooding',
    severe_storm: 'Severe Storm',
    ice_storm: 'Ice Storm',
  };

  const eventDescriptions: Record<string, string> = {
    heat_wave: 'Dangerous heat threatens vulnerable residents and infrastructure.',
    flooding: 'Heavy rains cause flooding in low-lying areas.',
    severe_storm: 'A powerful storm system threatens the city.',
    ice_storm: 'Freezing rain coats the city in ice, disrupting services.',
  };

  const event: GameEvent = {
    id: `climate_${selectedType}_${state.turn}`,
    type: selectedType,
    category: 'climate',
    title: eventTitles[selectedType],
    description: eventDescriptions[selectedType],
    choices: [
      {
        id: 'emergency_response',
        label: 'Emergency Response',
        description: 'Deploy emergency resources to mitigate damage.',
        effects: {
          meterDeltas: [{ meter: 'budget', amount: -0.2, source: 'emergency_response' }],
          relationshipChanges: [],
          other: ['reduce_damage_50'],
        },
        requirements: { minWill: null, minBudget: 0.2, minTrust: null },
      },
      {
        id: 'community_shelter',
        label: 'Community Shelter',
        description: 'Open community spaces as shelters.',
        effects: {
          meterDeltas: [{ meter: 'communityTrust', amount: 2, source: 'community_shelter' }],
          relationshipChanges: [],
          other: ['reduce_damage_25'],
        },
        requirements: { minWill: null, minBudget: null, minTrust: 30 },
      },
    ],
    turnGenerated: state.turn,
    cooldownTurns: 3,
    targetTileId: null,
    targetCharacterId: null,
  };

  return event;
}

// ---------------------------------------------------------------------------
// 5. applyTippingPointDamageMultiplier
// ---------------------------------------------------------------------------

export function applyTippingPointDamageMultiplier(
  baseDamage: number,
  state: GameState
): number {
  if ((state.eventCooldowns['tipping_point_2'] ?? 0) > 0) {
    return baseDamage * 1.5;
  }
  return baseDamage;
}

// ---------------------------------------------------------------------------
// 6. getAdaptationSummary
// ---------------------------------------------------------------------------

export function getAdaptationSummary(tile: Tile): AdaptationSummary {
  let floodReduction = 0;
  let heatReduction = 0;
  let iceReduction = 0;

  if (tile.completedProjects.includes('rain_garden')) {
    floodReduction += 50;
  }

  if (tile.completedProjects.includes('greenway')) {
    heatReduction += 40;
  }

  if (tile.completedProjects.includes('solar_grid')) {
    iceReduction = 100;
  }

  return { floodReduction, heatReduction, iceReduction };
}
