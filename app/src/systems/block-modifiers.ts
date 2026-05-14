import type { ProjectDefinition, ProjectCategory } from '../state/types';
import type { BlockData } from '../map/block-layer';

export interface BlockModifierResult {
  costMultiplier: number;
  durationMultiplier: number;
  ecoBonus: number;
  trustBonus: number;
  revenueBonus: number;
  contaminationPenalty: number;
  suitabilityScore: number;
  flags: BlockFlag[];
}

export type BlockFlag =
  | 'epa_brownfield'
  | 'flood_zone'
  | 'high_vacancy'
  | 'transit_adjacent'
  | 'community_assets'
  | 'data_gaps';

const DEFAULT_RESULT: BlockModifierResult = {
  costMultiplier: 1,
  durationMultiplier: 1,
  ecoBonus: 0,
  trustBonus: 0,
  revenueBonus: 0,
  contaminationPenalty: 0,
  suitabilityScore: 50,
  flags: [],
};

export function calculateBlockModifiers(
  block: BlockData | undefined,
  projectDef: ProjectDefinition,
): BlockModifierResult {
  if (!block) return { ...DEFAULT_RESULT };

  const flags: BlockFlag[] = [];
  let costMultiplier = 1;
  let durationMultiplier = 1;
  let ecoBonus = 0;
  let trustBonus = 0;
  let revenueBonus = 0;
  let contaminationPenalty = 0;

  const hasEpaSites = block.epaSites.length > 0;
  const isFloodZone = !!block.floodZone;
  const hasTransit = block.transitStops.length > 0;
  const hasCommunityAssets = block.communityAssets.length > 0;
  const hasDataGaps = block.dataGaps.length > 0;
  const vacancyRate = block.censusData?.vacancyRate ?? 0;
  const highVacancy = vacancyRate > 0.3;

  if (hasEpaSites) {
    flags.push('epa_brownfield');
    contaminationPenalty = Math.min(block.epaSites.length * 10, 30);

    if (isEcologyOrFood(projectDef)) {
      durationMultiplier *= 1.4;
      costMultiplier *= 1.25;
    }

    if (projectDef.id === 'soil_remediation') {
      ecoBonus += 5;
      trustBonus += 3;
    }
  }

  if (isFloodZone) {
    flags.push('flood_zone');
    if (isInfrastructure(projectDef)) {
      durationMultiplier *= 1.3;
      costMultiplier *= 1.15;
    }
    if (projectDef.id === 'rain_garden' || projectDef.id === 'bioswale_network') {
      ecoBonus += 8;
      costMultiplier *= 0.85;
    }
  }

  if (highVacancy) {
    flags.push('high_vacancy');
    costMultiplier *= 0.8;
    if (projectDef.growthCategory === 'de-growth') {
      costMultiplier *= 0.9;
      ecoBonus += 3;
    }
  }

  if (hasTransit) {
    flags.push('transit_adjacent');
    if (isCommunityOrInfra(projectDef)) {
      trustBonus += 2;
      revenueBonus += 0.01;
    }
  }

  if (hasCommunityAssets) {
    flags.push('community_assets');
    if (projectDef.category === 'community') {
      trustBonus += 3;
      durationMultiplier *= 0.85;
    }
  }

  if (hasDataGaps) {
    flags.push('data_gaps');
  }

  costMultiplier = Math.max(costMultiplier, 0.5);
  durationMultiplier = Math.max(durationMultiplier, 0.5);

  const suitabilityScore = scoreBlockSuitability(block, projectDef);

  return {
    costMultiplier,
    durationMultiplier,
    ecoBonus,
    trustBonus,
    revenueBonus,
    contaminationPenalty,
    suitabilityScore,
    flags,
  };
}

export function scoreBlockSuitability(
  block: BlockData,
  projectDef: ProjectDefinition,
): number {
  let score = 50;

  const vacancyRate = block.censusData?.vacancyRate ?? 0;
  score += vacancyRate * 20;

  if (block.epaSites.length > 0) {
    if (projectDef.id === 'soil_remediation') {
      score += 30;
    } else if (isEcologyOrFood(projectDef)) {
      score -= 20;
    }
  }

  if (block.floodZone) {
    if (projectDef.id === 'rain_garden' || projectDef.id === 'bioswale_network') {
      score += 25;
    } else if (isInfrastructure(projectDef)) {
      score -= 15;
    }
  }

  if (block.transitStops.length > 0 && isCommunityOrInfra(projectDef)) {
    score += 15;
  }

  if (block.communityAssets.length > 0 && projectDef.category === 'community') {
    score += 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function isEcologyOrFood(def: ProjectDefinition): boolean {
  return def.category === 'ecology' || def.effects.foodSov > 0;
}

function isInfrastructure(def: ProjectDefinition): boolean {
  return def.category === 'infrastructure';
}

function isCommunityOrInfra(def: ProjectDefinition): boolean {
  return def.category === 'community' || def.category === 'infrastructure';
}
