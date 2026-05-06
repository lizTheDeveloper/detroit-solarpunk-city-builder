import type { Season, ProjectCategory } from '../state/types';

/**
 * Seasonal modifiers — real permaculture timing.
 *
 * Spring: planting season. Ecology projects finish faster.
 * Summer: construction season. Infrastructure goes up quick.
 * Fall: harvest + organizing. Community projects and food sovereignty peak.
 * Winter: planning season. Everything slows down, but political will regens faster.
 *
 * These aren't arbitrary — in Zone 6a (Detroit):
 * - Last frost: May 10. First frost: Oct 10. Growing season: 150 days.
 * - Construction season: May-October (ground thaws, permits flow).
 * - Harvest: August-October. Community festivals: June-September.
 * - Winter: organizing, grant-writing, planning. Nothing grows but ideas.
 */

export interface SeasonalModifier {
  durationModifier: Partial<Record<ProjectCategory, number>>;
  meterBonus: {
    politicalWillRegen?: number;
    foodSovereigntyBonus?: number;
    ecoDecayReduction?: number;
  };
  flavor: string;
}

export const SEASONAL_MODIFIERS: Record<Season, SeasonalModifier> = {
  spring: {
    durationModifier: {
      ecology: -1, // ecology projects 1 turn faster
    },
    meterBonus: {
      ecoDecayReduction: 0.1, // nature's waking up, decay slows
    },
    flavor: 'Planting season. The ground thaws and everything wants to grow.',
  },
  summer: {
    durationModifier: {
      infrastructure: -1, // construction season
    },
    meterBonus: {},
    flavor: 'Long days, construction crews out till 9 PM. Block parties every Saturday.',
  },
  fall: {
    durationModifier: {
      community: -1, // organizing peaks after harvest
    },
    meterBonus: {
      foodSovereigntyBonus: 2, // harvest time
    },
    flavor: 'Harvest. The food forests produce. The block is eating well.',
  },
  winter: {
    durationModifier: {},
    meterBonus: {
      politicalWillRegen: 3, // planning season, grant-writing, strategy
    },
    flavor: 'Nothing grows but ideas. Living rooms full of plans for spring.',
  },
};

/**
 * Get duration adjustment for a project category in the current season.
 * Returns number of turns to subtract (0 or 1).
 */
export function getSeasonalDurationBonus(season: Season, category: ProjectCategory): number {
  const mod = SEASONAL_MODIFIERS[season].durationModifier[category];
  return mod ?? 0;
}

/**
 * Get seasonal meter bonuses for the current turn.
 */
export function getSeasonalMeterBonuses(season: Season): SeasonalModifier['meterBonus'] {
  return SEASONAL_MODIFIERS[season].meterBonus;
}
