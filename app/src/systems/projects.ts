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
import { calculateSynergies } from './synergies';
import { getSeasonalDurationBonus } from './seasons';
import { calculateByproductBonuses } from './byproducts';
import { getReclamationCapacityBonus } from './reclamation';
import { calculateBlockModifiers } from './block-modifiers';

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
  if (mode === 'community-led') return baseCost * 1.3;
  if (mode === 'direct-action') return 0.02; // scavenged materials, token cost
  return baseCost;
}

function effectiveDuration(baseDuration: number, mode: ProjectMode): number {
  if (mode === 'community-led') {
    return Math.max(Math.ceil(baseDuration * 1.5), baseDuration + 1);
  }
  if (mode === 'direct-action') {
    return Math.max(1, Math.ceil(baseDuration * 0.5));
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

  // Budget check (with synergy + byproduct discounts)
  const synergies = calculateSynergies(state, tileId, projectId);
  const byproductBonuses = calculateByproductBonuses(state, tileId, projectId);
  const cost = effectiveCost(def.baseCost * synergies.costMultiplier * byproductBonuses.costMultiplier, mode);
  if (state.meters.budget < cost) {
    return {
      allowed: false,
      reason: `Insufficient budget: need ${cost.toFixed(2)}M, have ${state.meters.budget.toFixed(2)}M`,
    };
  }

  // Concurrent project limit (reclaimed lots add bonus capacity)
  const totalActive = Object.values(state.tiles).reduce(
    (sum, t) => sum + t.activeProjects.length,
    0,
  );
  const reclamationBonus = Object.values(state.tiles).reduce(
    (sum, t) => sum + getReclamationCapacityBonus(t),
    0,
  );
  const effectiveLimit = state.maxConcurrentProjects + reclamationBonus;
  if (totalActive >= effectiveLimit) {
    return {
      allowed: false,
      reason: `Concurrent project limit reached (${effectiveLimit})`,
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

  if (tile.completedProjects.includes(projectId)) {
    return {
      allowed: false,
      reason: `${def.name} is already built on this tile`,
    };
  }

  // Community-led trust requirement
  if (mode === 'community-led' && state.meters.communityTrust < 30) {
    return {
      allowed: false,
      reason: `Community-led projects require trust >= 30%, currently ${state.meters.communityTrust}%`,
    };
  }

  // Direct action: need high trust (people won't stick their necks out otherwise)
  if (mode === 'direct-action' && state.meters.communityTrust < 50) {
    return {
      allowed: false,
      reason: `Direct action requires trust >= 50% — people won't risk it otherwise. Currently ${state.meters.communityTrust.toFixed(0)}%`,
    };
  }

  return { allowed: true };
}

export function startProject(
  state: GameState,
  tileId: string,
  projectId: string,
  mode: ProjectMode,
  blockId?: string,
): GameState {
  const def = PROJECT_CATALOG[projectId];
  const synergies = calculateSynergies(state, tileId, projectId);
  const byproductBonuses = calculateByproductBonuses(state, tileId, projectId);
  const blockMods = calculateBlockModifiers(
    blockId ? state.blockDataMap?.[blockId] : undefined,
    def,
  );

  // Byproduct cost multiplier stacks with synergy and block cost multipliers
  const baseCostWithBonuses = def.baseCost * synergies.costMultiplier * byproductBonuses.costMultiplier * blockMods.costMultiplier;
  const cost = effectiveCost(baseCostWithBonuses, mode);

  // Byproduct duration reduction stacks with synergy and block duration multipliers
  const seasonReduction = getSeasonalDurationBonus(state.season, def.category);
  const baseDurationWithSynergy = Math.max(1, Math.round(def.baseDuration * synergies.durationMultiplier * blockMods.durationMultiplier));
  const baseDurationWithBonuses = Math.max(1, baseDurationWithSynergy - byproductBonuses.durationReduction + seasonReduction);
  const duration = effectiveDuration(baseDurationWithBonuses, mode);

  const newProject: ActiveProject = {
    definitionId: projectId,
    tileId,
    mode,
    progress: 0,
    duration,
    cost,
    blockId,
  };

  const tile = state.tiles[tileId];
  const newTile: Tile = {
    ...tile,
    activeProjects: [...tile.activeProjects, newProject],
  };

  let newMeters = {
    ...state.meters,
    budget: state.meters.budget - cost,
  };

  // Direct action: costs trust, angers council
  let newCouncilMembers = state.councilMembers;
  if (mode === 'direct-action') {
    newMeters.communityTrust -= 8;
    // Council members don't appreciate people ignoring permits
    newCouncilMembers = { ...state.councilMembers };
    for (const [id, member] of Object.entries(newCouncilMembers)) {
      newCouncilMembers[id] = { ...member, disposition: member.disposition - 5 };
    }
  }

  return {
    ...state,
    meters: newMeters,
    councilMembers: newCouncilMembers,
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
      consumedByproducts: [...(tile.consumedByproducts || [])],
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

        // Calculate synergy eco bonus from surrounding completed projects
        const completionSynergies = calculateSynergies(
          { ...state, tiles: newTiles },
          tileId,
          project.definitionId,
        );
        const synergyEco = completionSynergies.ecoBonus;

        // Calculate byproduct effect boosts
        const byproductBonuses = calculateByproductBonuses(
          { ...state, tiles: newTiles },
          tileId,
          project.definitionId,
        );

        // Calculate block-level modifiers
        const blockMods = calculateBlockModifiers(
          project.blockId ? state.blockDataMap?.[project.blockId] : undefined,
          def,
        );

        // Mark one-shot byproducts as consumed
        for (const activeBp of byproductBonuses.activeByproducts) {
          if (activeBp.lifetime === 'one-shot') {
            const consumeKey = `${activeBp.sourceProjectId}:${activeBp.byproductId}`;
            const sourceTile = newTiles[activeBp.sourceTileId];
            if (sourceTile && !sourceTile.consumedByproducts.includes(consumeKey)) {
              sourceTile.consumedByproducts.push(consumeKey);
            }
          }
        }

        // Helper to get effect boost for a specific field
        const getEffectBoost = (field: string): number => {
          const boost = byproductBonuses.effectBoosts.find((eb) => eb.field === field);
          return boost ? boost.boost : 0;
        };

        // Apply tileEco — also contributes to global meter (greening neighborhoods greens the city)
        const tileEcoBoost = getEffectBoost('tileEco');
        const boostedTileEco = def.effects.tileEco * (1 + tileEcoBoost);
        tile.ecologicalHealth += boostedTileEco + synergyEco + blockMods.ecoBonus;
        tile.contamination = Math.min(100, tile.contamination + blockMods.contaminationPenalty);
        const totalEco = boostedTileEco + synergyEco + blockMods.ecoBonus;
        if (totalEco !== 0) {
          const globalEcoGain = totalEco * 0.30;
          newMeters.ecologicalHealth += globalEcoGain;
          const source = synergyEco > 0 || tileEcoBoost > 0
            ? `${def.name} (+synergy/byproduct)`
            : def.name;
          deltas.push({
            meter: 'ecologicalHealth',
            amount: globalEcoGain,
            source,
          });
        }

        // Apply contamination reduction
        if (def.effects.contaminationReduction > 0) {
          tile.contamination -= tile.contamination * (def.effects.contaminationReduction / 100);
        }

        // Apply food sovereignty (with byproduct boost)
        if (def.effects.foodSov !== 0) {
          const foodSovBoost = getEffectBoost('foodSov');
          const boostedFoodSov = def.effects.foodSov * (1 + foodSovBoost);
          newMeters.foodSovereignty += boostedFoodSov;
          deltas.push({
            meter: 'foodSovereignty',
            amount: boostedFoodSov,
            source: foodSovBoost > 0 ? `${def.name} (+byproduct)` : def.name,
          });
        }

        // Apply trust with mode modifier + diminishing returns at high trust
        // Real organizing: building trust from 20→50 is easier than 70→80.
        // At trust 80+, gains halved. The community already trusts you — new wins matter less.
        const trustMultiplier = project.mode === 'direct-action' ? 2.0 : project.mode === 'community-led' ? 1.2 : 0.5;
        const directActionBonus = project.mode === 'direct-action' ? 6 : 0;
        const rawTrustGain = def.effects.trust * trustMultiplier + directActionBonus + blockMods.trustBonus;
        const diminishingFactor = newMeters.communityTrust > 70
          ? 1.0 - (newMeters.communityTrust - 70) * 0.02
          : 1.0;
        const trustGain = rawTrustGain * Math.max(0.3, diminishingFactor);
        if (trustGain !== 0) {
          newMeters.communityTrust += trustGain;
          deltas.push({
            meter: 'communityTrust',
            amount: trustGain,
            source: def.name,
          });
        }

        // Apply annual revenue (with byproduct + block boost)
        if (def.effects.annualRevenue > 0 || blockMods.revenueBonus > 0) {
          const revenueBoost = getEffectBoost('annualRevenue');
          const boostedRevenue = def.effects.annualRevenue * (1 + revenueBoost) + blockMods.revenueBonus;
          newMeters.budget += boostedRevenue;
          deltas.push({
            meter: 'budget',
            amount: boostedRevenue,
            source: revenueBoost > 0 ? `${def.name} (+byproduct)` : def.name,
          });
        }

        // Apply gentrification: project's own change + mode-based base pressure
        // Direct action: zero gentrification (you're not attracting capital, you're seizing space)
        const gentMultiplier = project.mode === 'direct-action' ? 0 : project.mode === 'player-initiated' ? 1.5 : 0.5;
        const baseGent = project.mode === 'direct-action' ? 0 : def.effects.gentrificationChange;
        const tileGent = baseGent + (baseGent >= 0 ? 5 * gentMultiplier : 0);
        const adjGent = baseGent >= 0 ? 3 * gentMultiplier : 0;

        tile.gentrificationPressure = Math.max(0, tile.gentrificationPressure + tileGent);

        // Adjacent tiles (only spread positive gentrification)
        if (adjGent > 0) {
          for (const adjId of tile.adjacentTileIds) {
            if (newTiles[adjId]) {
              newTiles[adjId] = {
                ...newTiles[adjId],
                gentrificationPressure: newTiles[adjId].gentrificationPressure + adjGent,
              };
            }
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
