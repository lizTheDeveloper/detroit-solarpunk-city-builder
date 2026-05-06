import type {
  GameState,
  RegionalCity,
  ResourceTransfer,
  ContinentalGoal,
  CityRelationship,
  WinCondition,
  LossCondition,
  Stage,
} from '../state/types';

const STAGE_ORDER: Stage[] = ['awakening', 'transition', 'restoration', 'beyond'];

function stageIndex(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage);
}

/**
 * Checks if a city should advance to the next stage based on meter thresholds.
 * Uses the same logic as player stage transitions.
 */
function checkCityStageTransition(city: RegionalCity): Stage {
  const { ecologicalHealth, foodSovereignty, communityTrust } = city.meters;
  const currentIndex = stageIndex(city.stage);

  // awakening -> transition: ANY threshold met
  if (currentIndex < 1) {
    if (ecologicalHealth >= 35 || foodSovereignty >= 25 || communityTrust >= 65) {
      return 'transition';
    }
  }

  // transition -> restoration: ALL conditions met
  if (currentIndex < 2 && currentIndex >= 1) {
    if (ecologicalHealth >= 55 && foodSovereignty >= 40 && communityTrust >= 50) {
      return 'restoration';
    }
  }

  // restoration -> beyond: ALL conditions met
  if (currentIndex < 3 && currentIndex >= 2) {
    if (ecologicalHealth >= 75 && foodSovereignty >= 60 && communityTrust >= 70) {
      return 'beyond';
    }
  }

  return city.stage;
}

/**
 * Initialize 9 regional cities with starting states.
 */
export function initializeRegionalCities(): Record<string, RegionalCity> {
  const cities: RegionalCity[] = [
    {
      id: 'ann_arbor',
      name: 'Ann Arbor',
      population: 125000,
      stage: 'transition',
      meters: { ecologicalHealth: 45, foodSovereignty: 30, communityTrust: 55 },
      relationship: 'cooperative',
      transfersReceived: 0,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 0,
    },
    {
      id: 'toledo',
      name: 'Toledo',
      population: 270000,
      stage: 'awakening',
      meters: { ecologicalHealth: 20, foodSovereignty: 15, communityTrust: 35 },
      relationship: 'neutral',
      transfersReceived: 0,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 0,
    },
    {
      id: 'cleveland',
      name: 'Cleveland',
      population: 370000,
      stage: 'awakening',
      meters: { ecologicalHealth: 25, foodSovereignty: 20, communityTrust: 40 },
      relationship: 'neutral',
      transfersReceived: 0,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 0,
    },
    {
      id: 'chicago',
      name: 'Chicago',
      population: 2700000,
      stage: 'transition',
      meters: { ecologicalHealth: 35, foodSovereignty: 25, communityTrust: 30 },
      relationship: 'neutral',
      transfersReceived: 0,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 0,
    },
    {
      id: 'milwaukee',
      name: 'Milwaukee',
      population: 570000,
      stage: 'awakening',
      meters: { ecologicalHealth: 30, foodSovereignty: 25, communityTrust: 45 },
      relationship: 'neutral',
      transfersReceived: 0,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 0,
    },
    {
      id: 'windsor',
      name: 'Windsor',
      population: 230000,
      stage: 'transition',
      meters: { ecologicalHealth: 40, foodSovereignty: 35, communityTrust: 50 },
      relationship: 'neutral',
      transfersReceived: 0,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 0,
    },
    {
      id: 'flint',
      name: 'Flint',
      population: 95000,
      stage: 'awakening',
      meters: { ecologicalHealth: 15, foodSovereignty: 10, communityTrust: 25 },
      relationship: 'neutral',
      transfersReceived: 0,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 0,
    },
    {
      id: 'lansing',
      name: 'Lansing',
      population: 118000,
      stage: 'awakening',
      meters: { ecologicalHealth: 25, foodSovereignty: 20, communityTrust: 40 },
      relationship: 'neutral',
      transfersReceived: 0,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 0,
    },
    {
      id: 'grand_rapids',
      name: 'Grand Rapids',
      population: 200000,
      stage: 'transition',
      meters: { ecologicalHealth: 35, foodSovereignty: 30, communityTrust: 50 },
      relationship: 'neutral',
      transfersReceived: 0,
      templatesReceived: [],
      regionalProjectsCompleted: 0,
      meterImprovementSinceUnlock: 0,
    },
  ];

  const result: Record<string, RegionalCity> = {};
  for (const city of cities) {
    result[city.id] = city;
  }
  return result;
}

/**
 * Progress all regional cities by one turn.
 * Base rates: Eco +1.0%, Food +0.6%, Trust +0.8%
 * Transition stage: +50% to rates
 * Restoration stage: +100% to rates
 * Climate vulnerability: if pressure > 85%, Awakening cities have 15% chance of catastrophe
 */
export function progressRegionalCities(
  cities: Record<string, RegionalCity>,
  climatePressure: number,
  rng: () => number,
): Record<string, RegionalCity> {
  const result: Record<string, RegionalCity> = {};

  for (const [id, city] of Object.entries(cities)) {
    let stageMultiplier = 1.0;
    if (city.stage === 'transition') stageMultiplier = 1.5;
    if (city.stage === 'restoration') stageMultiplier = 2.0;

    let ecoRate = 1.0 * stageMultiplier;
    let foodRate = 0.6 * stageMultiplier;
    let trustRate = 0.8 * stageMultiplier;

    let newEco = city.meters.ecologicalHealth + ecoRate;
    let newFood = city.meters.foodSovereignty + foodRate;
    let newTrust = city.meters.communityTrust + trustRate;

    // Climate catastrophe for Awakening cities
    if (climatePressure > 85 && city.stage === 'awakening') {
      const roll = rng();
      if (roll < 0.15) {
        newEco -= 20;
        newTrust -= 10;
      }
    }

    // Clamp values
    newEco = Math.max(0, Math.min(100, newEco));
    newFood = Math.max(0, Math.min(100, newFood));
    newTrust = Math.max(0, Math.min(100, newTrust));

    const updatedCity: RegionalCity = {
      ...city,
      meters: {
        ecologicalHealth: newEco,
        foodSovereignty: newFood,
        communityTrust: newTrust,
      },
      meterImprovementSinceUnlock:
        city.meterImprovementSinceUnlock + ecoRate + foodRate + trustRate,
    };

    // Check stage transition
    updatedCity.stage = checkCityStageTransition(updatedCity);

    result[id] = updatedCity;
  }

  return result;
}

/**
 * Send budget resources to a target city.
 * Small: $200K cost, +5% to target's lowest meter
 * Medium: $500K cost, +10% boost
 * Large: $1M cost, +20% boost
 * Detroit gains +2% Political Will per transfer
 * Max 2 transfers per turn
 */
export function sendBudget(
  state: GameState,
  targetCityId: string,
  size: 'small' | 'medium' | 'large',
): GameState {
  const city = state.regionalCities[targetCityId];
  if (!city) return state;

  // Check max transfers per turn (count budget/template transfers this turn)
  const budgetTransfersThisTurn = state.activeTransfers.filter(
    (t) => t.type === 'budget',
  ).length;
  if (budgetTransfersThisTurn >= 2) return state;

  const costs: Record<string, number> = { small: 0.2, medium: 0.5, large: 1.0 };
  const boosts: Record<string, number> = { small: 5, medium: 10, large: 20 };

  const cost = costs[size];
  const boost = boosts[size];

  if (state.meters.budget < cost) return state;

  // Find lowest meter
  const { ecologicalHealth, foodSovereignty, communityTrust } = city.meters;
  let lowestMeter: 'ecologicalHealth' | 'foodSovereignty' | 'communityTrust' = 'ecologicalHealth';
  if (foodSovereignty <= ecologicalHealth && foodSovereignty <= communityTrust) {
    lowestMeter = 'foodSovereignty';
  } else if (communityTrust <= ecologicalHealth && communityTrust <= foodSovereignty) {
    lowestMeter = 'communityTrust';
  }

  const updatedCity: RegionalCity = {
    ...city,
    meters: {
      ...city.meters,
      [lowestMeter]: Math.min(100, city.meters[lowestMeter] + boost),
    },
    transfersReceived: city.transfersReceived + 1,
    meterImprovementSinceUnlock: city.meterImprovementSinceUnlock + boost,
  };

  const newTransfer: ResourceTransfer = {
    type: 'budget',
    targetCityId,
    amount: cost,
  };

  return {
    ...state,
    meters: {
      ...state.meters,
      budget: state.meters.budget - cost,
      politicalWill: Math.min(100, state.meters.politicalWill + 2),
    },
    regionalCities: {
      ...state.regionalCities,
      [targetCityId]: updatedCity,
    },
    activeTransfers: [...state.activeTransfers, newTransfer],
  };
}

/**
 * Send a project template to a target city.
 * Costs $100K. Can only send each template once per city.
 */
export function sendTemplate(
  state: GameState,
  targetCityId: string,
  projectId: string,
): GameState {
  const city = state.regionalCities[targetCityId];
  if (!city) return state;

  // Check if already sent this template to this city
  if (city.templatesReceived.includes(projectId)) return state;

  // Check budget
  if (state.meters.budget < 0.1) return state;

  const updatedCity: RegionalCity = {
    ...city,
    templatesReceived: [...city.templatesReceived, projectId],
    transfersReceived: city.transfersReceived + 1,
  };

  const newTransfer: ResourceTransfer = {
    type: 'template',
    targetCityId,
    projectId,
  };

  return {
    ...state,
    meters: {
      ...state.meters,
      budget: state.meters.budget - 0.1,
    },
    regionalCities: {
      ...state.regionalCities,
      [targetCityId]: updatedCity,
    },
    activeTransfers: [...state.activeTransfers, newTransfer],
  };
}

/**
 * Send expertise to a target city.
 * Reduces Detroit's maxConcurrentProjects by 1 for 4 turns.
 * Target city's progression rate doubles for 4 turns.
 */
export function sendExpertise(
  state: GameState,
  targetCityId: string,
): GameState {
  const city = state.regionalCities[targetCityId];
  if (!city) return state;

  // Check that we have capacity to send
  if (state.maxConcurrentProjects <= 1) return state;

  const newTransfer: ResourceTransfer = {
    type: 'expertise',
    targetCityId,
    turnsRemaining: 4,
  };

  const updatedCity: RegionalCity = {
    ...city,
    transfersReceived: city.transfersReceived + 1,
  };

  return {
    ...state,
    maxConcurrentProjects: state.maxConcurrentProjects - 1,
    regionalCities: {
      ...state.regionalCities,
      [targetCityId]: updatedCity,
    },
    activeTransfers: [...state.activeTransfers, newTransfer],
  };
}

/**
 * Check if a city's relationship should be upgraded.
 * Neutral -> Cooperative: 3+ transfers received AND meterImprovement >= 10
 * Cooperative -> Allied: 2+ regional projects completed AND stage >= 'transition'
 */
export function checkRelationshipUpgrade(city: RegionalCity): CityRelationship {
  if (city.relationship === 'neutral') {
    if (city.transfersReceived >= 3 && city.meterImprovementSinceUnlock >= 10) {
      return 'cooperative';
    }
  }

  if (city.relationship === 'cooperative') {
    if (city.regionalProjectsCompleted >= 2 && stageIndex(city.stage) >= stageIndex('transition')) {
      return 'allied';
    }
  }

  return city.relationship;
}

/**
 * Initialize the 4 continental goals.
 */
export function initializeContinentalGoals(): ContinentalGoal[] {
  return [
    {
      id: 'watershed_restoration',
      name: 'Great Lakes Watershed Restoration',
      progress: 0,
      description: 'Restore the Great Lakes watershed through regional cooperation.',
    },
    {
      id: 'wildlife_corridor',
      name: 'Wildlife Corridor Network',
      progress: 0,
      description: 'Establish connected wildlife corridors across the Great Lakes region.',
    },
    {
      id: 'food_sovereignty_network',
      name: 'Food Sovereignty Network',
      progress: 0,
      description: 'Build a regional network of food-sovereign communities.',
    },
    {
      id: 'buffalo_commons',
      name: 'Buffalo Commons',
      progress: 0,
      description: 'Restore the buffalo commons through de-growth and rewilding.',
    },
  ];
}

/**
 * Progress continental goals by one turn based on current state.
 */
export function progressContinentalGoals(state: GameState): ContinentalGoal[] {
  const cities = Object.values(state.regionalCities);

  return state.continentalGoals.map((goal) => {
    let progress = goal.progress;

    switch (goal.id) {
      case 'watershed_restoration': {
        // +1% per city at Restoration with Eco > 70%
        const restorationHighEco = cities.filter(
          (c) => stageIndex(c.stage) >= stageIndex('restoration') && c.meters.ecologicalHealth > 70,
        );
        progress += restorationHighEco.length * 1;

        // +0.5% per Detroit water tile at restoration
        const waterTilesAtRestoration = Object.values(state.tiles).filter(
          (t) => t.terrain === 'water' && t.visualStage === 'restoration',
        );
        progress += waterTilesAtRestoration.length * 0.5;
        break;
      }

      case 'wildlife_corridor': {
        // +1% per Allied city
        const alliedCities = cities.filter((c) => c.relationship === 'allied');
        progress += alliedCities.length * 1;

        // +2% per completed Interstate Wildlife Corridor project
        const corridorProjects = Object.values(state.tiles).reduce((count, tile) => {
          return count + tile.completedProjects.filter((p) => p === 'wildlife_corridor').length;
        }, 0);
        progress += corridorProjects * 2;
        break;
      }

      case 'food_sovereignty_network': {
        // +1% per city with Food > 50%
        const highFoodCities = cities.filter((c) => c.meters.foodSovereignty > 50);
        progress += highFoodCities.length * 1;

        // +0.5% per Detroit food project completed
        const foodProjects = Object.values(state.tiles).reduce((count, tile) => {
          return count + tile.completedProjects.filter(
            (p) => p === 'food_forest' || p === 'community_kitchen',
          ).length;
        }, 0);
        progress += foodProjects * 0.5;
        break;
      }

      case 'buffalo_commons': {
        // +1% per Allied city
        const alliedCities = cities.filter((c) => c.relationship === 'allied');
        progress += alliedCities.length * 1;

        // +0.5% per de-growth project in Detroit
        const deGrowthProjects = Object.values(state.tiles).reduce((count, tile) => {
          // Count projects that are de-growth category (by naming convention)
          return count + tile.completedProjects.filter(
            (p) => p === 'wetland_restoration' || p === 'native_planting',
          ).length;
        }, 0);
        progress += deGrowthProjects * 0.5;

        // +1% per other goal at 50%+
        const otherGoalsAbove50 = state.continentalGoals.filter(
          (g) => g.id !== 'buffalo_commons' && g.progress >= 50,
        );
        progress += otherGoalsAbove50.length * 1;
        break;
      }
    }

    return {
      ...goal,
      progress: Math.min(100, progress),
    };
  });
}

/**
 * Check if the cooperative or survival win condition is met.
 * Cooperative: 2 of 4 continental goals >= 75%
 * Survival: turn >= 80 AND all meters > 50
 */
export function checkWinCondition(state: GameState): WinCondition {
  // Cooperative win: 2 of 4 goals >= 75%
  const goalsAtTarget = state.continentalGoals.filter((g) => g.progress >= 75);
  if (goalsAtTarget.length >= 2) return 'cooperative';

  // Survival win: turn >= 80 AND all meters > 50
  if (state.turn >= 80) {
    const { ecologicalHealth, foodSovereignty, communityTrust, politicalWill, budget } = state.meters;
    if (
      ecologicalHealth > 50 &&
      foodSovereignty > 50 &&
      communityTrust > 50 &&
      politicalWill > 50 &&
      budget > 50
    ) {
      return 'survival';
    }
  }

  return null;
}

/**
 * Check if a loss condition is met.
 * budget_collapse: budget <= 0
 * climate_catastrophe: climatePressure >= 100 AND fewer than 5 tiles with ecoHealth > 60
 */
export function checkLossCondition(state: GameState): LossCondition {
  // Budget collapse
  if (state.meters.budget <= 0) return 'budget_collapse';

  // Climate catastrophe
  if (state.meters.climatePressure >= 100) {
    const healthyTiles = Object.values(state.tiles).filter(
      (t) => t.ecologicalHealth > 60,
    );
    if (healthyTiles.length < 5) return 'climate_catastrophe';
  }

  return null;
}
