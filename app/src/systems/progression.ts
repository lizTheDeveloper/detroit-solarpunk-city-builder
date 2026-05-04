import type { GameState, Stage, SpecializationPath, CommunityLeader } from '../state/types';

export interface PathBonuses {
  projectCostModifier: Record<string, number>; // category -> multiplier
  ecoPassiveGain: number;
  extraNarrativeActions: number;
  trustDecayMultiplier: number;
  policyDrainMultiplier: number;
  dispositionBonusOnEnact: number;
}

const STAGE_ORDER: Stage[] = ['awakening', 'transition', 'restoration', 'beyond'];

/**
 * Returns the stage the game should be in based on current meters and conditions.
 * Never goes backward.
 */
export function checkStageTransition(state: GameState): Stage {
  const currentIndex = STAGE_ORDER.indexOf(state.stage);
  let targetStage = state.stage;

  const { ecologicalHealth, foodSovereignty, communityTrust } = state.meters;
  const policiesEnacted = state.activePolicies.length;
  const activeCoalitions = state.coalitions.filter((c) => c.active).length;

  // Check awakening → transition: ANY threshold met
  if (currentIndex < 1) {
    if (ecologicalHealth >= 35 || foodSovereignty >= 25 || communityTrust >= 65) {
      targetStage = 'transition';
    }
  }

  // Check transition → restoration: ALL conditions met
  const targetIndex = STAGE_ORDER.indexOf(targetStage);
  if (targetIndex < 2 && currentIndex < 2) {
    // Must be at least in transition to advance to restoration
    if (STAGE_ORDER.indexOf(targetStage) >= 1) {
      if (
        ecologicalHealth >= 55 &&
        foodSovereignty >= 40 &&
        communityTrust >= 50 &&
        policiesEnacted >= 2
      ) {
        targetStage = 'restoration';
      }
    }
  }

  // Check restoration → beyond: ALL conditions met
  const targetIndex2 = STAGE_ORDER.indexOf(targetStage);
  if (targetIndex2 < 3 && currentIndex < 3) {
    if (STAGE_ORDER.indexOf(targetStage) >= 2) {
      if (
        ecologicalHealth >= 75 &&
        foodSovereignty >= 60 &&
        communityTrust >= 70 &&
        policiesEnacted >= 4 &&
        activeCoalitions >= 1
      ) {
        targetStage = 'beyond';
      }
    }
  }

  // Never go backward
  const finalIndex = STAGE_ORDER.indexOf(targetStage);
  if (finalIndex < currentIndex) {
    return state.stage;
  }

  return targetStage;
}

/**
 * Analyzes game state to determine which specialization path the player is on.
 * Returns null if no clear path.
 */
export function detectSpecializationPath(state: GameState): SpecializationPath {
  const { ecologicalHealth, foodSovereignty, communityTrust, politicalWill } = state.meters;
  const policiesEnacted = state.activePolicies.length;

  // Calculate relative gains (using absolute values as proxy for emphasis)
  const ecoGain = ecologicalHealth;
  const trustGain = communityTrust;
  const foodGain = foodSovereignty;

  // Policy path: 3+ policies enacted AND political will > 40%
  const isPolicyPath = policiesEnacted >= 3 && politicalWill > 40;

  // Ecology path: eco is highest % gain AND food > 30%
  const isEcologyPath = ecoGain >= trustGain && ecoGain >= foodGain && foodSovereignty > 30;

  // Community path: trust is highest % gain AND 3+ leaders at trust >= 40
  const leadersWithHighTrust = Object.values(state.leaders).filter(
    (leader: CommunityLeader) => leader.trust >= 40,
  ).length;
  const isCommunityPath = trustGain >= ecoGain && trustGain >= foodGain && leadersWithHighTrust >= 3;

  // Priority: check all conditions, return first match
  // If multiple match, use priority order: ecology > community > policy
  if (isEcologyPath) return 'ecology';
  if (isCommunityPath) return 'community';
  if (isPolicyPath) return 'policy';

  return null;
}

/**
 * Returns the passive bonuses for a given specialization path.
 */
export function getPathBonuses(path: SpecializationPath): PathBonuses {
  const base: PathBonuses = {
    projectCostModifier: {},
    ecoPassiveGain: 0,
    extraNarrativeActions: 0,
    trustDecayMultiplier: 1.0,
    policyDrainMultiplier: 1.0,
    dispositionBonusOnEnact: 0,
  };

  if (path === null) return base;

  switch (path) {
    case 'ecology':
      return {
        ...base,
        projectCostModifier: { ecology: 0.9 },
        ecoPassiveGain: 1,
      };
    case 'community':
      return {
        ...base,
        extraNarrativeActions: 1,
        trustDecayMultiplier: 0.5,
      };
    case 'policy':
      return {
        ...base,
        policyDrainMultiplier: 0.75,
        dispositionBonusOnEnact: 5,
      };
  }
}

/**
 * Returns what project IDs are unlocked at each stage.
 */
export function getStageUnlocks(stage: Stage): string[] {
  switch (stage) {
    case 'awakening':
      return ['food_forest', 'rain_garden', 'soil_remediation', 'native_planting', 'community_kitchen'];
    case 'transition':
      return ['solar_grid', 'greenway', 'maker_space', 'land_trust', 'water_transit'];
    case 'restoration':
      return ['wetland_restoration', 'wildlife_corridor', 'regional_collab'];
    case 'beyond':
      return ['endgame_content'];
  }
}

/**
 * Called during resolve phase. Checks stage transition, detects path,
 * applies passive bonuses, and updates state.
 */
export function applyProgressionEffects(state: GameState): GameState {
  const updated = { ...state, meters: { ...state.meters } };

  // Check stage transition
  const newStage = checkStageTransition(updated);
  updated.stage = newStage;

  // Detect specialization path
  const newPath = detectSpecializationPath(updated);
  updated.path = newPath;

  // Apply passive bonuses
  const bonuses = getPathBonuses(newPath);

  // Ecology path: +1% eco/turn passive gain
  if (bonuses.ecoPassiveGain > 0) {
    updated.meters.ecologicalHealth += bonuses.ecoPassiveGain;
  }

  return updated;
}
