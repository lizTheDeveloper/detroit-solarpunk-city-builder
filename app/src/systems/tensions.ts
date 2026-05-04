import type { GameState } from '../state/types';
import { PROJECT_CATALOG } from '../data/content/project-catalog';

export interface SpeedVsJusticeResult {
  speedScore: number;
  justiceScore: number;
  tension: number;
  level: 'low' | 'medium' | 'high';
}

export interface GrowthVsDegrowthResult {
  growthCount: number;
  degrowthCount: number;
  ratio: number;
  label: 'growth-dominant' | 'balanced' | 'degrowth-dominant';
}

export interface TopDownVsBottomUpResult {
  playerInitiated: number;
  communityLed: number;
  ratio: number;
  label: 'top-down' | 'mixed' | 'bottom-up';
}

export interface TensionSummary {
  speedVsJustice: SpeedVsJusticeResult;
  growthVsDegrowth: GrowthVsDegrowthResult;
  topDownVsBottomUp: TopDownVsBottomUpResult;
  overallHealth: 'healthy' | 'concerning' | 'critical';
}

export interface GentrificationRiskResult {
  atRisk: string[];
  averagePressure: number;
}

export function calculateSpeedVsJustice(state: GameState): SpeedVsJusticeResult {
  const speedScore = (state.meters.ecologicalHealth + state.meters.foodSovereignty) / 2;

  const tiles = Object.values(state.tiles);
  const averageGentrification =
    tiles.length > 0
      ? tiles.reduce((sum, tile) => sum + tile.gentrificationPressure, 0) / tiles.length
      : 0;
  const justiceScore = 100 - averageGentrification;

  const tension = Math.abs(speedScore - justiceScore);

  let level: 'low' | 'medium' | 'high';
  if (tension < 15) {
    level = 'low';
  } else if (tension <= 30) {
    level = 'medium';
  } else {
    level = 'high';
  }

  return { speedScore, justiceScore, tension, level };
}

export function calculateGrowthVsDegrowth(state: GameState): GrowthVsDegrowthResult {
  let growthCount = 0;
  let degrowthCount = 0;

  for (const tile of Object.values(state.tiles)) {
    for (const projectId of tile.completedProjects) {
      const def = PROJECT_CATALOG[projectId];
      if (def) {
        if (def.growthCategory === 'growth') {
          growthCount++;
        } else if (def.growthCategory === 'de-growth') {
          degrowthCount++;
        }
      }
    }
  }

  const total = growthCount + degrowthCount;
  const ratio = total === 0 ? 0.5 : degrowthCount / total;

  let label: 'growth-dominant' | 'balanced' | 'degrowth-dominant';
  if (ratio < 0.3) {
    label = 'growth-dominant';
  } else if (ratio > 0.7) {
    label = 'degrowth-dominant';
  } else {
    label = 'balanced';
  }

  return { growthCount, degrowthCount, ratio, label };
}

export function calculateTopDownVsBottomUp(state: GameState): TopDownVsBottomUpResult {
  let communityLed = 0;
  let playerInitiated = 0;

  for (const tile of Object.values(state.tiles)) {
    // communityPowerTokens tracks the number of community-led project completions
    communityLed += tile.communityPowerTokens;
    // player-initiated completions = total completed - community-led completions
    playerInitiated += tile.completedProjects.length - tile.communityPowerTokens;
  }

  const total = playerInitiated + communityLed;
  const ratio = total === 0 ? 0.5 : communityLed / total;

  let label: 'top-down' | 'mixed' | 'bottom-up';
  if (ratio < 0.3) {
    label = 'top-down';
  } else if (ratio > 0.7) {
    label = 'bottom-up';
  } else {
    label = 'mixed';
  }

  return { playerInitiated, communityLed, ratio, label };
}

export function getTensionSummary(state: GameState): TensionSummary {
  const speedVsJustice = calculateSpeedVsJustice(state);
  const growthVsDegrowth = calculateGrowthVsDegrowth(state);
  const topDownVsBottomUp = calculateTopDownVsBottomUp(state);

  let overallHealth: 'healthy' | 'concerning' | 'critical';

  const isCritical =
    speedVsJustice.tension > 30 ||
    growthVsDegrowth.ratio < 0.1 ||
    growthVsDegrowth.ratio > 0.9 ||
    topDownVsBottomUp.ratio < 0.1 ||
    topDownVsBottomUp.ratio > 0.9;

  const isHealthy =
    speedVsJustice.tension < 15 &&
    growthVsDegrowth.ratio >= 0.2 &&
    growthVsDegrowth.ratio <= 0.8 &&
    topDownVsBottomUp.ratio >= 0.2 &&
    topDownVsBottomUp.ratio <= 0.8;

  if (isCritical) {
    overallHealth = 'critical';
  } else if (isHealthy) {
    overallHealth = 'healthy';
  } else {
    overallHealth = 'concerning';
  }

  return { speedVsJustice, growthVsDegrowth, topDownVsBottomUp, overallHealth };
}

export function getSpeedJusticeAdvice(
  tension: number,
  speedScore: number,
  justiceScore: number,
): string {
  if (speedScore - justiceScore >= 15) {
    return 'Transformation is outpacing community. Slow down or invest in anti-displacement.';
  }
  if (justiceScore - speedScore >= 15) {
    return 'Community is protected but progress is stalling. Consider more projects.';
  }
  return 'Good balance between progress and justice.';
}

export function calculateGentrificationRisk(state: GameState): GentrificationRiskResult {
  const tiles = Object.values(state.tiles);
  const atRisk: string[] = [];
  let totalPressure = 0;

  for (const tile of tiles) {
    totalPressure += tile.gentrificationPressure;
    if (tile.gentrificationPressure > 50) {
      atRisk.push(tile.id);
    }
  }

  const averagePressure = tiles.length > 0 ? totalPressure / tiles.length : 0;

  return { atRisk, averagePressure };
}
