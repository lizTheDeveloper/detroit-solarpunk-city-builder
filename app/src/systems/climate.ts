import type { GameState, Tile, MeterDelta, GameEvent, Season } from '../state/types';
import { climateEventProbability } from './meters';
import { applyMutualAid } from './mutual-aid';

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

// Seasonal multipliers calibrated to Great Lakes climate data.
// Detroit flooding: spring snowmelt + summer storms are highest risk. 2014 flood was August.
// Heat waves: 90F+ days projected to increase 5x by 2050; concentrated June-August.
// Ice storms: 2-3 per decade, exclusively Nov-March. 2023 + 2025 were both "unprecedented."
// Source: NWS Detroit heat data, Bridge Michigan flood analysis, GLE ice storm recovery reports.
const SEASONAL_EVENT_MULTIPLIERS: Record<string, Record<Season, number>> = {
  heat_wave: { spring: 0.3, summer: 3, fall: 0.3, winter: 0 },
  flooding: { spring: 2.5, summer: 2, fall: 1, winter: 0.3 },
  severe_storm: { spring: 1.5, summer: 1.5, fall: 1, winter: 0.5 },
  ice_storm: { spring: 0.5, summer: 0, fall: 0.3, winter: 3 },
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
      const aid = applyMutualAid(updatedState, tileId, 5, 'ecologicalHealth');
      const actualDamage = 5 - aid.damageAbsorbed;
      tiles[tileId] = {
        ...tiles[tileId],
        ecologicalHealth: Math.max(0, tiles[tileId].ecologicalHealth - actualDamage),
      };
      tileEffects.push({ tileId, ecoDamage: -actualDamage });
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
      const aid = applyMutualAid(updatedState, id, 15, 'ecologicalHealth');
      const actualDamage = 15 - aid.damageAbsorbed;
      tiles[id] = {
        ...tiles[id],
        ecologicalHealth: Math.max(0, tiles[id].ecologicalHealth - actualDamage),
      };
      tileEffects.push({ tileId: id, ecoDamage: -actualDamage });
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

  // Event data calibrated to real Detroit damage costs at 1000:1 scale.
  // 2014 flood: $1.8B real = $1.8M game scale (catastrophic).
  // 2021 flood: $100M+ = $0.10M game scale (moderate).
  // Ice storm 2023: $1.5B grid impact = $1.5M game scale.
  // Heat wave: harder to quantify but causes infrastructure damage + health costs.
  // Source: FEMA payouts, DTE restoration costs, Wayne County road repair data.
  const eventData: Record<string, { title: string; description: string; budgetDamage: number; ecoDamage: number; trustDamage: number }> = {
    heat_wave: {
      title: 'Extreme Heat Wave',
      description: 'Five consecutive days above 90°F. Urban heat islands hit 100°F+ in underserved neighborhoods. Detroit\'s grid faces "extreme" vulnerability.',
      budgetDamage: -0.08,
      ecoDamage: -3,
      trustDamage: -2,
    },
    flooding: {
      title: 'Flash Flooding',
      description: 'Combined sewers overflow after 4+ inches of rain. The system was designed for 2 inches — Detroit now exceeds this multiple times per year.',
      budgetDamage: -0.15,
      ecoDamage: -4,
      trustDamage: -3,
    },
    severe_storm: {
      title: 'Severe Storm',
      description: 'High winds and heavy precipitation damage infrastructure. 60% increase in major grid failures over the last 5 years.',
      budgetDamage: -0.10,
      ecoDamage: -2,
      trustDamage: -1,
    },
    ice_storm: {
      title: 'Ice Storm',
      description: 'Freezing rain coats power lines in 0.5-1.5 inches of ice. 3,100 poles snap. Outages last days to weeks — Michigan ranks worst nationally.',
      budgetDamage: -0.20,
      ecoDamage: -2,
      trustDamage: -4,
    },
  };

  const data = eventData[selectedType];

  const event: GameEvent = {
    id: `climate_${selectedType}_${state.turn}`,
    type: selectedType,
    category: 'climate',
    title: data.title,
    description: data.description,
    choices: [
      {
        id: 'emergency_response',
        label: 'Emergency Response',
        description: 'Deploy city resources — expensive but cuts damage to 25%. The city looks competent.',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: data.budgetDamage * 1.5, source: 'emergency_spending' },
            { meter: 'ecologicalHealth', amount: data.ecoDamage * 0.25, source: 'mitigated_eco_damage' },
            { meter: 'communityTrust', amount: 3, source: 'emergency_response_trust' },
          ],
          relationshipChanges: [],
          other: ['reduce_damage_75'],
        },
        requirements: { minWill: null, minBudget: Math.abs(data.budgetDamage * 1.5), minTrust: null },
      },
      {
        id: 'community_shelter',
        label: 'Community Mutual Aid',
        description: 'Let the neighborhood handle it — free for the city, builds solidarity, but infrastructure still takes a hit',
        effects: {
          meterDeltas: [
            { meter: 'ecologicalHealth', amount: data.ecoDamage * 0.75, source: 'partial_eco_damage' },
            { meter: 'communityTrust', amount: 4, source: 'mutual_aid_solidarity' },
          ],
          relationshipChanges: [],
          other: ['reduce_damage_25'],
        },
        requirements: { minWill: null, minBudget: null, minTrust: 20 },
      },
      {
        id: 'weather_the_storm',
        label: 'No Proactive Response',
        description: 'Deploy nothing — full damage hits, cleanup costs pile up, people remember',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: data.budgetDamage, source: 'climate_damage' },
            { meter: 'ecologicalHealth', amount: data.ecoDamage, source: 'climate_eco_damage' },
            { meter: 'communityTrust', amount: data.trustDamage, source: 'unprotected_residents' },
          ],
          relationshipChanges: [],
          other: ['full_damage'],
        },
        requirements: { minWill: null, minBudget: null, minTrust: null },
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
