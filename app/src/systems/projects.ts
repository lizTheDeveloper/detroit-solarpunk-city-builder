import type {
  GameState,
  Tile,
  ActiveProject,
  ProjectMode,
  MeterDelta,
  VisualStage,
  Stage,
} from '../state/types';
import { PROJECT_CATALOG } from '../data/content/project-catalog';

const STAGE_ORDER: Stage[] = ['awakening', 'transition', 'restoration', 'beyond'];

function stageIndex(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage);
}

function computeVisualStage(eco: number): VisualStage {
  if (eco >= 85) return 'beyond';
  if (eco >= 60) return 'restoration';
  if (eco >= 25) return 'transition';
  return 'dystopia';
}

function effectiveCost(baseCost: number, mode: ProjectMode): number {
  return mode === 'community-led' ? baseCost * 1.3 : baseCost;
}

function effectiveDuration(baseDuration: number, mode: ProjectMode): number {
  if (mode === 'community-led') {
    return Math.max(Math.ceil(baseDuration * 1.5), baseDuration + 1);
  }
  return baseDuration;
}

export function canStartProject(
  state: GameState,
  tileId: string,
  projectId: string,
  mode: ProjectMode,
): { allowed: boolean; reason?: string } {
  const def = PROJECT_CATALOG[projectId];
  if (!def) {
    return { allowed: false, reason: `Unknown project: ${projectId}` };
  }

  const tile = state.tiles[tileId];
  if (!tile) {
    return { allowed: false, reason: `Unknown tile: ${tileId}` };
  }

  // Budget check
  const cost = effectiveCost(def.baseCost, mode);
  if (state.meters.budget < cost) {
    return {
      allowed: false,
      reason: `Insufficient budget: need ${cost}M, have ${state.meters.budget}M`,
    };
  }

  // Concurrent project limit
  const totalActive = Object.values(state.tiles).reduce(
    (sum, t) => sum + t.activeProjects.length,
    0,
  );
  if (totalActive >= state.maxConcurrentProjects) {
    return {
      allowed: false,
      reason: `Concurrent project limit reached (${state.maxConcurrentProjects})`,
    };
  }

  // Contamination check
  if (def.maxContamination !== null && tile.contamination > def.maxContamination) {
    return {
      allowed: false,
      reason: `Tile contamination ${tile.contamination}% exceeds maximum ${def.maxContamination}% for ${def.name}`,
    };
  }

  // Stage requirement
  if (stageIndex(state.stage) < stageIndex(def.stageRequired)) {
    return {
      allowed: false,
      reason: `Requires stage ${def.stageRequired}, currently in ${state.stage}`,
    };
  }

  // Duplicate project on same tile
  if (tile.activeProjects.some((p) => p.definitionId === projectId)) {
    return {
      allowed: false,
      reason: `Tile already has an active ${def.name} project`,
    };
  }

  // Community-led trust requirement
  if (mode === 'community-led' && state.meters.communityTrust < 30) {
    return {
      allowed: false,
      reason: `Community-led projects require trust >= 30%, currently ${state.meters.communityTrust}%`,
    };
  }

  return { allowed: true };
}

export function startProject(
  state: GameState,
  tileId: string,
  projectId: string,
  mode: ProjectMode,
): GameState {
  const def = PROJECT_CATALOG[projectId];
  const cost = effectiveCost(def.baseCost, mode);
  const duration = effectiveDuration(def.baseDuration, mode);

  const newProject: ActiveProject = {
    definitionId: projectId,
    tileId,
    mode,
    progress: 0,
    duration,
    cost,
  };

  const tile = state.tiles[tileId];
  const newTile: Tile = {
    ...tile,
    activeProjects: [...tile.activeProjects, newProject],
  };

  return {
    ...state,
    meters: {
      ...state.meters,
      budget: state.meters.budget - cost,
    },
    tiles: {
      ...state.tiles,
      [tileId]: newTile,
    },
  };
}

export function advanceProjects(state: GameState): { state: GameState; deltas: MeterDelta[] } {
  const deltas: MeterDelta[] = [];
  let newTiles: Record<string, Tile> = {};

  // Deep copy all tiles first
  for (const [id, tile] of Object.entries(state.tiles)) {
    newTiles[id] = {
      ...tile,
      activeProjects: tile.activeProjects.map((p) => ({ ...p })),
      completedProjects: [...tile.completedProjects],
    };
  }

  let newMeters = { ...state.meters };

  // Process each tile
  for (const tileId of Object.keys(newTiles)) {
    const tile = newTiles[tileId];
    const stillActive: ActiveProject[] = [];

    for (const project of tile.activeProjects) {
      project.progress += 1;

      if (project.progress >= project.duration) {
        // Project completes
        const def = PROJECT_CATALOG[project.definitionId];

        // Apply tileEco
        tile.ecologicalHealth += def.effects.tileEco;

        // Apply contamination reduction
        if (def.effects.contaminationReduction > 0) {
          tile.contamination -= tile.contamination * (def.effects.contaminationReduction / 100);
        }

        // Apply food sovereignty
        if (def.effects.foodSov !== 0) {
          newMeters.foodSovereignty += def.effects.foodSov;
          deltas.push({
            meter: 'foodSovereignty',
            amount: def.effects.foodSov,
            source: def.name,
          });
        }

        // Apply trust with mode modifier
        const trustMultiplier = project.mode === 'community-led' ? 1.6 : 0.6;
        const trustGain = def.effects.trust * trustMultiplier;
        if (trustGain !== 0) {
          newMeters.communityTrust += trustGain;
          deltas.push({
            meter: 'communityTrust',
            amount: trustGain,
            source: def.name,
          });
        }

        // Apply annual revenue
        if (def.effects.annualRevenue > 0) {
          newMeters.budget += def.effects.annualRevenue;
          deltas.push({
            meter: 'budget',
            amount: def.effects.annualRevenue,
            source: def.name,
          });
        }

        // Apply gentrification
        const gentMultiplier = project.mode === 'player-initiated' ? 1.5 : 0.5;
        const tileGent = 10 * gentMultiplier;
        const adjGent = 5 * gentMultiplier;

        tile.gentrificationPressure += tileGent;

        // Adjacent tiles
        for (const adjId of tile.adjacentTileIds) {
          if (newTiles[adjId]) {
            newTiles[adjId] = {
              ...newTiles[adjId],
              gentrificationPressure: newTiles[adjId].gentrificationPressure + adjGent,
            };
          }
        }

        // Community-led ownership
        if (project.mode === 'community-led') {
          tile.communityOwned = true;
          tile.communityPowerTokens += 1;
        }

        // Update visual stage
        tile.visualStage = computeVisualStage(tile.ecologicalHealth);

        // Move to completed
        tile.completedProjects.push(project.definitionId);
      } else {
        stillActive.push(project);
      }
    }

    tile.activeProjects = stillActive;
  }

  return {
    state: {
      ...state,
      meters: newMeters,
      tiles: newTiles,
    },
    deltas,
  };
}

export function decayGentrification(tiles: Record<string, Tile>): Record<string, Tile> {
  const result: Record<string, Tile> = {};
  for (const [id, tile] of Object.entries(tiles)) {
    result[id] = {
      ...tile,
      gentrificationPressure: Math.max(0, tile.gentrificationPressure - 1),
    };
  }
  return result;
}
