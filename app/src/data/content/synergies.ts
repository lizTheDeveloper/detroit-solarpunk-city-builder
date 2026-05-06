/**
 * Project synergies: completed projects modify cost, duration, or effects
 * of future projects on the same tile or adjacent tiles.
 *
 * Represents real circular economy logic:
 * - Maker space has tools → solar grid assembly is cheaper/faster
 * - Soil remediation cleans ground → food forest establishes faster
 * - Community kitchen produces compost → food forest eco bonus
 * - Rain garden manages water → wetland restoration is cheaper
 * - Food forest produces biomass → soil remediation works faster
 */

export interface Synergy {
  /** Project that must be completed (the "provider") */
  sourceProject: string;
  /** Project that benefits (the "consumer") */
  targetProject: string;
  /** Does the source need to be on the same tile, or can it be adjacent? */
  range: 'same-tile' | 'adjacent';
  /** Multiplier on baseCost (0.75 = 25% cheaper). null = no change */
  costMultiplier: number | null;
  /** Multiplier on baseDuration (0.67 = 33% faster). null = no change */
  durationMultiplier: number | null;
  /** Additive bonus to tileEco effect. null = no change */
  ecoBonus: number | null;
  /** Short explanation shown to player */
  reason: string;
}

export const SYNERGIES: Synergy[] = [
  // Maker Space enables cheaper/faster builds
  {
    sourceProject: 'maker_space',
    targetProject: 'solar_grid',
    range: 'adjacent',
    costMultiplier: 0.75,
    durationMultiplier: 0.67,
    ecoBonus: null,
    reason: 'Maker space fabricates inverters and mounts from salvage',
  },
  {
    sourceProject: 'maker_space',
    targetProject: 'rain_garden',
    range: 'adjacent',
    costMultiplier: 0.80,
    durationMultiplier: null,
    ecoBonus: null,
    reason: 'Maker space welds overflow pipes and grates from scrap',
  },

  // Soil remediation unlocks faster growing
  {
    sourceProject: 'soil_remediation',
    targetProject: 'food_forest',
    range: 'same-tile',
    costMultiplier: null,
    durationMultiplier: 0.67,
    ecoBonus: 4,
    reason: 'Clean soil lets perennials establish without raised beds',
  },
  {
    sourceProject: 'soil_remediation',
    targetProject: 'native_planting',
    range: 'same-tile',
    costMultiplier: null,
    durationMultiplier: 0.5,
    ecoBonus: 3,
    reason: 'Native seeds germinate faster in decontaminated ground',
  },

  // Food forest feeds back into the system
  {
    sourceProject: 'food_forest',
    targetProject: 'community_kitchen',
    range: 'adjacent',
    costMultiplier: 0.85,
    durationMultiplier: null,
    ecoBonus: null,
    reason: 'Food forest supplies produce — less cold storage needed',
  },
  {
    sourceProject: 'food_forest',
    targetProject: 'soil_remediation',
    range: 'same-tile',
    costMultiplier: null,
    durationMultiplier: 0.80,
    ecoBonus: null,
    reason: 'Biomass and leaf litter accelerate mycoremediation',
  },

  // Community kitchen creates compost loop
  {
    sourceProject: 'community_kitchen',
    targetProject: 'food_forest',
    range: 'adjacent',
    costMultiplier: 0.90,
    durationMultiplier: null,
    ecoBonus: 3,
    reason: 'Kitchen scraps composted into food forest mulch',
  },
  {
    sourceProject: 'community_kitchen',
    targetProject: 'native_planting',
    range: 'adjacent',
    costMultiplier: null,
    durationMultiplier: null,
    ecoBonus: 2,
    reason: 'Compost tea feeds native seedlings in establishment year',
  },

  // Rain garden → wetland pipeline
  {
    sourceProject: 'rain_garden',
    targetProject: 'wetland_restoration',
    range: 'adjacent',
    costMultiplier: 0.80,
    durationMultiplier: null,
    ecoBonus: 3,
    reason: 'Existing bioswale network feeds wetland hydrology',
  },

  // Native planting supports wildlife corridor
  {
    sourceProject: 'native_planting',
    targetProject: 'wildlife_corridor',
    range: 'adjacent',
    costMultiplier: 0.85,
    durationMultiplier: 0.83,
    ecoBonus: null,
    reason: 'Established native habitat anchors the corridor',
  },

  // Wetland boosts adjacent ecology
  {
    sourceProject: 'wetland_restoration',
    targetProject: 'wildlife_corridor',
    range: 'adjacent',
    costMultiplier: null,
    durationMultiplier: null,
    ecoBonus: 5,
    reason: 'Wetland provides water source and breeding habitat',
  },
  {
    sourceProject: 'wetland_restoration',
    targetProject: 'native_planting',
    range: 'adjacent',
    costMultiplier: null,
    durationMultiplier: null,
    ecoBonus: 4,
    reason: 'Wetland raises water table, meadow stays green through drought',
  },

  // Land trust makes everything cheaper (no landlord extraction)
  {
    sourceProject: 'land_trust',
    targetProject: 'food_forest',
    range: 'same-tile',
    costMultiplier: 0.70,
    durationMultiplier: null,
    ecoBonus: null,
    reason: 'Community-owned land — no lease, no eviction risk, plant permanent',
  },
  {
    sourceProject: 'land_trust',
    targetProject: 'community_kitchen',
    range: 'same-tile',
    costMultiplier: 0.75,
    durationMultiplier: null,
    ecoBonus: null,
    reason: 'No rent on the building — budget goes to equipment',
  },
  {
    sourceProject: 'land_trust',
    targetProject: 'maker_space',
    range: 'same-tile',
    costMultiplier: 0.75,
    durationMultiplier: null,
    ecoBonus: null,
    reason: 'No landlord means no rent hike when the neighborhood improves',
  },

  // Greenway connects everything
  {
    sourceProject: 'greenway',
    targetProject: 'wildlife_corridor',
    range: 'adjacent',
    costMultiplier: 0.80,
    durationMultiplier: null,
    ecoBonus: 4,
    reason: 'Greenway provides linear habitat spine for the corridor',
  },
  {
    sourceProject: 'greenway',
    targetProject: 'native_planting',
    range: 'adjacent',
    costMultiplier: null,
    durationMultiplier: null,
    ecoBonus: 2,
    reason: 'Greenway seed dispersal spreads native species to adjacent lots',
  },

  // Solar grid powers maker space
  {
    sourceProject: 'solar_grid',
    targetProject: 'maker_space',
    range: 'adjacent',
    costMultiplier: 0.85,
    durationMultiplier: null,
    ecoBonus: null,
    reason: 'Free power for the CNC and laser cutter',
  },

  // Regional collaboration reduces big project costs
  {
    sourceProject: 'regional_collab',
    targetProject: 'wetland_restoration',
    range: 'same-tile',
    costMultiplier: 0.70,
    durationMultiplier: null,
    ecoBonus: null,
    reason: 'Shared equipment and expertise from partner municipalities',
  },
  {
    sourceProject: 'regional_collab',
    targetProject: 'wildlife_corridor',
    range: 'same-tile',
    costMultiplier: 0.75,
    durationMultiplier: null,
    ecoBonus: null,
    reason: 'Cross-jurisdiction coordination already established',
  },
];
