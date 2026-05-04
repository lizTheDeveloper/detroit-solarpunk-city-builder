import { describe, it, expect } from 'vitest';
import {
  calculateSpeedVsJustice,
  calculateGrowthVsDegrowth,
  calculateTopDownVsBottomUp,
  getTensionSummary,
  getSpeedJusticeAdvice,
  calculateGentrificationRisk,
} from './tensions';
import { createNewGame } from '../state/create-game';
import type { GameState, Tile } from '../state/types';

/**
 * Helper: create a minimal game state with overrides for testing tensions.
 */
function makeTestState(overrides: Partial<GameState> = {}): GameState {
  const base = createNewGame();
  return { ...base, ...overrides };
}

/**
 * Helper: create a tile with specific properties for testing.
 */
function makeTile(overrides: Partial<Tile> & { id: string }): Tile {
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    terrain: overrides.terrain ?? 'vacant',
    vacancyRate: overrides.vacancyRate ?? 0,
    ecologicalHealth: overrides.ecologicalHealth ?? 0,
    contamination: overrides.contamination ?? 0,
    gentrificationPressure: overrides.gentrificationPressure ?? 0,
    existingUses: overrides.existingUses ?? [],
    neighborhoodTraits: overrides.neighborhoodTraits ?? [],
    activeProjects: overrides.activeProjects ?? [],
    completedProjects: overrides.completedProjects ?? [],
    communityPowerTokens: overrides.communityPowerTokens ?? 0,
    communityOwned: overrides.communityOwned ?? false,
    adjacentTileIds: overrides.adjacentTileIds ?? [],
    visualStage: overrides.visualStage ?? 'dystopia',
  };
}

describe('calculateSpeedVsJustice', () => {
  it('tension is 0 when speed and justice scores are equal', () => {
    // speed_score = (eco + food) / 2 = (50 + 50) / 2 = 50
    // justice_score = 100 - avg_gentrification = 100 - 50 = 50
    // tension = |50 - 50| = 0
    const state = makeTestState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 50,
        foodSovereignty: 50,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
      tiles: {
        a: makeTile({ id: 'a', gentrificationPressure: 50 }),
      },
    });

    const result = calculateSpeedVsJustice(state);
    expect(result.speedScore).toBe(50);
    expect(result.justiceScore).toBe(50);
    expect(result.tension).toBe(0);
    expect(result.level).toBe('low');
  });

  it('tension is high (>30) when eco is high but gentrification is high', () => {
    // speed_score = (80 + 60) / 2 = 70
    // justice_score = 100 - 70 = 30
    // tension = |70 - 30| = 40
    const state = makeTestState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 80,
        foodSovereignty: 60,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
      tiles: {
        a: makeTile({ id: 'a', gentrificationPressure: 70 }),
      },
    });

    const result = calculateSpeedVsJustice(state);
    expect(result.tension).toBeGreaterThan(30);
    expect(result.level).toBe('high');
  });

  it('level is low when tension < 15', () => {
    // speed_score = (30 + 20) / 2 = 25
    // justice_score = 100 - 80 = 20
    // tension = |25 - 20| = 5
    const state = makeTestState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 30,
        foodSovereignty: 20,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
      tiles: {
        a: makeTile({ id: 'a', gentrificationPressure: 80 }),
      },
    });

    const result = calculateSpeedVsJustice(state);
    expect(result.tension).toBe(5);
    expect(result.level).toBe('low');
  });

  it('level is medium when tension is between 15 and 30', () => {
    // speed_score = (60 + 40) / 2 = 50
    // justice_score = 100 - 25 = 75
    // tension = |50 - 75| = 25
    const state = makeTestState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 60,
        foodSovereignty: 40,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
      tiles: {
        a: makeTile({ id: 'a', gentrificationPressure: 25 }),
      },
    });

    const result = calculateSpeedVsJustice(state);
    expect(result.tension).toBe(25);
    expect(result.level).toBe('medium');
  });
});

describe('calculateGrowthVsDegrowth', () => {
  it('ratio is 0.5 when no projects completed', () => {
    const state = makeTestState({
      tiles: {
        a: makeTile({ id: 'a', completedProjects: [] }),
      },
    });

    const result = calculateGrowthVsDegrowth(state);
    expect(result.ratio).toBe(0.5);
    expect(result.growthCount).toBe(0);
    expect(result.degrowthCount).toBe(0);
  });

  it('is growth-dominant when mostly growth projects', () => {
    // solar_grid and maker_space are 'growth' category
    const state = makeTestState({
      tiles: {
        a: makeTile({
          id: 'a',
          completedProjects: ['solar_grid', 'maker_space', 'solar_grid', 'food_forest'],
        }),
      },
    });

    const result = calculateGrowthVsDegrowth(state);
    expect(result.growthCount).toBe(3);
    expect(result.degrowthCount).toBe(1);
    // ratio = 1 / 4 = 0.25 (< 0.3 = growth-dominant)
    expect(result.ratio).toBe(0.25);
    expect(result.label).toBe('growth-dominant');
  });

  it('is degrowth-dominant when mostly de-growth projects', () => {
    // food_forest, rain_garden, native_planting, wetland_restoration are 'de-growth'
    const state = makeTestState({
      tiles: {
        a: makeTile({
          id: 'a',
          completedProjects: ['food_forest', 'rain_garden', 'native_planting', 'solar_grid'],
        }),
      },
    });

    const result = calculateGrowthVsDegrowth(state);
    expect(result.degrowthCount).toBe(3);
    expect(result.growthCount).toBe(1);
    // ratio = 3 / 4 = 0.75 (> 0.7 = degrowth-dominant)
    expect(result.ratio).toBe(0.75);
    expect(result.label).toBe('degrowth-dominant');
  });

  it('is balanced in the middle', () => {
    // 2 growth (solar_grid, maker_space) + 2 degrowth (food_forest, rain_garden)
    const state = makeTestState({
      tiles: {
        a: makeTile({
          id: 'a',
          completedProjects: ['solar_grid', 'maker_space', 'food_forest', 'rain_garden'],
        }),
      },
    });

    const result = calculateGrowthVsDegrowth(state);
    expect(result.growthCount).toBe(2);
    expect(result.degrowthCount).toBe(2);
    // ratio = 2 / 4 = 0.5
    expect(result.ratio).toBe(0.5);
    expect(result.label).toBe('balanced');
  });

  it('ignores projects with neither growth category', () => {
    // soil_remediation, greenway, community_kitchen, land_trust are 'neither'
    const state = makeTestState({
      tiles: {
        a: makeTile({
          id: 'a',
          completedProjects: ['soil_remediation', 'greenway', 'solar_grid'],
        }),
      },
    });

    const result = calculateGrowthVsDegrowth(state);
    expect(result.growthCount).toBe(1);
    expect(result.degrowthCount).toBe(0);
    // ratio = 0 / 1 = 0.0
    expect(result.ratio).toBe(0);
    expect(result.label).toBe('growth-dominant');
  });
});

describe('calculateTopDownVsBottomUp', () => {
  it('ratio is 0.5 when no projects completed', () => {
    const state = makeTestState({
      tiles: {
        a: makeTile({ id: 'a', completedProjects: [], communityPowerTokens: 0 }),
      },
    });

    const result = calculateTopDownVsBottomUp(state);
    expect(result.ratio).toBe(0.5);
    expect(result.playerInitiated).toBe(0);
    expect(result.communityLed).toBe(0);
  });

  it('detects top-down when mostly player-initiated', () => {
    // 4 completed projects, 1 community-led (communityPowerTokens = 1)
    const state = makeTestState({
      tiles: {
        a: makeTile({
          id: 'a',
          completedProjects: ['solar_grid', 'maker_space', 'food_forest', 'rain_garden'],
          communityPowerTokens: 1,
        }),
      },
    });

    const result = calculateTopDownVsBottomUp(state);
    expect(result.playerInitiated).toBe(3);
    expect(result.communityLed).toBe(1);
    // ratio = 1 / 4 = 0.25 (< 0.3 = top-down)
    expect(result.ratio).toBe(0.25);
    expect(result.label).toBe('top-down');
  });

  it('detects bottom-up when mostly community-led', () => {
    // 4 completed projects, 3 community-led (communityPowerTokens = 3)
    const state = makeTestState({
      tiles: {
        a: makeTile({
          id: 'a',
          completedProjects: ['solar_grid', 'maker_space', 'food_forest', 'rain_garden'],
          communityPowerTokens: 3,
        }),
      },
    });

    const result = calculateTopDownVsBottomUp(state);
    expect(result.playerInitiated).toBe(1);
    expect(result.communityLed).toBe(3);
    // ratio = 3 / 4 = 0.75 (> 0.7 = bottom-up)
    expect(result.ratio).toBe(0.75);
    expect(result.label).toBe('bottom-up');
  });

  it('detects mixed when balanced between modes', () => {
    // 4 completed projects, 2 community-led
    const state = makeTestState({
      tiles: {
        a: makeTile({
          id: 'a',
          completedProjects: ['solar_grid', 'maker_space', 'food_forest', 'rain_garden'],
          communityPowerTokens: 2,
        }),
      },
    });

    const result = calculateTopDownVsBottomUp(state);
    expect(result.playerInitiated).toBe(2);
    expect(result.communityLed).toBe(2);
    expect(result.ratio).toBe(0.5);
    expect(result.label).toBe('mixed');
  });
});

describe('getTensionSummary', () => {
  it('overall health is healthy when all tensions are low', () => {
    // speed_score = (50 + 50) / 2 = 50
    // justice_score = 100 - 50 = 50
    // tension = 0 (< 15)
    // growth ratio = 0.5 (balanced, within 0.2-0.8)
    // topdown ratio = 0.5 (mixed, within 0.2-0.8)
    const state = makeTestState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 50,
        foodSovereignty: 50,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
      tiles: {
        a: makeTile({
          id: 'a',
          gentrificationPressure: 50,
          completedProjects: ['solar_grid', 'food_forest'],
          communityPowerTokens: 1,
        }),
      },
    });

    const result = getTensionSummary(state);
    expect(result.overallHealth).toBe('healthy');
  });

  it('overall health is critical when speed-justice tension > 30', () => {
    // speed_score = (80 + 60) / 2 = 70
    // justice_score = 100 - 70 = 30
    // tension = 40 (> 30)
    const state = makeTestState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 80,
        foodSovereignty: 60,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
      tiles: {
        a: makeTile({
          id: 'a',
          gentrificationPressure: 70,
          completedProjects: ['solar_grid', 'food_forest'],
          communityPowerTokens: 1,
        }),
      },
    });

    const result = getTensionSummary(state);
    expect(result.overallHealth).toBe('critical');
  });

  it('overall health is critical when any ratio is extreme (< 0.1)', () => {
    // Growth ratio extreme: all growth, no degrowth
    // 10 growth projects, 0 degrowth -> ratio = 0/10 = 0.0 (< 0.1)
    const state = makeTestState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 50,
        foodSovereignty: 50,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
      tiles: {
        a: makeTile({
          id: 'a',
          gentrificationPressure: 50,
          completedProjects: [
            'solar_grid',
            'solar_grid',
            'solar_grid',
            'solar_grid',
            'solar_grid',
            'maker_space',
            'maker_space',
            'maker_space',
            'maker_space',
            'maker_space',
          ],
          communityPowerTokens: 5,
        }),
      },
    });

    const result = getTensionSummary(state);
    expect(result.growthVsDegrowth.ratio).toBe(0);
    expect(result.overallHealth).toBe('critical');
  });

  it('overall health is critical when topdown ratio is extreme (> 0.9)', () => {
    // 10 completed, 10 community-led -> ratio = 10/10 = 1.0 (> 0.9)
    const state = makeTestState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 50,
        foodSovereignty: 50,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
      tiles: {
        a: makeTile({
          id: 'a',
          gentrificationPressure: 50,
          completedProjects: [
            'food_forest',
            'food_forest',
            'food_forest',
            'food_forest',
            'food_forest',
            'solar_grid',
            'solar_grid',
            'solar_grid',
            'solar_grid',
            'solar_grid',
          ],
          communityPowerTokens: 10,
        }),
      },
    });

    const result = getTensionSummary(state);
    expect(result.topDownVsBottomUp.ratio).toBe(1.0);
    expect(result.overallHealth).toBe('critical');
  });

  it('overall health is concerning when not healthy and not critical', () => {
    // speed_score = (40 + 30) / 2 = 35
    // justice_score = 100 - 50 = 50
    // tension = 15 (exactly on the border: not < 15, so not healthy)
    // growth ratio = 0.5 (balanced)
    // topdown ratio = 0.5 (mixed)
    const state = makeTestState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 40,
        foodSovereignty: 30,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
      tiles: {
        a: makeTile({
          id: 'a',
          gentrificationPressure: 50,
          completedProjects: ['solar_grid', 'food_forest'],
          communityPowerTokens: 1,
        }),
      },
    });

    const result = getTensionSummary(state);
    // tension = |35 - 50| = 15, which is not < 15. So not healthy, but <= 30 so not critical
    expect(result.speedVsJustice.tension).toBe(15);
    expect(result.overallHealth).toBe('concerning');
  });
});

describe('getSpeedJusticeAdvice', () => {
  it('advises to slow down when speed exceeds justice by 15+', () => {
    const advice = getSpeedJusticeAdvice(20, 60, 40);
    expect(advice).toBe(
      'Transformation is outpacing community. Slow down or invest in anti-displacement.',
    );
  });

  it('advises more projects when justice exceeds speed by 15+', () => {
    const advice = getSpeedJusticeAdvice(20, 30, 50);
    expect(advice).toBe('Community is protected but progress is stalling. Consider more projects.');
  });

  it('reports good balance when tension is low', () => {
    const advice = getSpeedJusticeAdvice(5, 50, 48);
    expect(advice).toBe('Good balance between progress and justice.');
  });
});

describe('calculateGentrificationRisk', () => {
  it('identifies tiles with gentrification pressure > 50 as at risk', () => {
    const state = makeTestState({
      tiles: {
        safe: makeTile({ id: 'safe', gentrificationPressure: 30 }),
        risky: makeTile({ id: 'risky', gentrificationPressure: 60 }),
        danger: makeTile({ id: 'danger', gentrificationPressure: 80 }),
      },
    });

    const result = calculateGentrificationRisk(state);
    expect(result.atRisk).toContain('risky');
    expect(result.atRisk).toContain('danger');
    expect(result.atRisk).not.toContain('safe');
    expect(result.atRisk.length).toBe(2);
  });

  it('calculates average pressure across all tiles', () => {
    const state = makeTestState({
      tiles: {
        a: makeTile({ id: 'a', gentrificationPressure: 20 }),
        b: makeTile({ id: 'b', gentrificationPressure: 40 }),
        c: makeTile({ id: 'c', gentrificationPressure: 60 }),
      },
    });

    const result = calculateGentrificationRisk(state);
    expect(result.averagePressure).toBe(40);
  });

  it('returns empty array when no tiles are at risk', () => {
    const state = makeTestState({
      tiles: {
        a: makeTile({ id: 'a', gentrificationPressure: 10 }),
        b: makeTile({ id: 'b', gentrificationPressure: 25 }),
      },
    });

    const result = calculateGentrificationRisk(state);
    expect(result.atRisk).toEqual([]);
    expect(result.averagePressure).toBe(17.5);
  });
});
