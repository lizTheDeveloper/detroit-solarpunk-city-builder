import type { GameState, Tile, CommunityLeader, PublicOpinion, TutorialState, AdvisorState } from './types';
import { createInitialCalendarState } from './migration';
import type { ActiveArc, SerializedDependencyWeb } from './crisis-types';
import { COUNCIL_MEMBERS } from '../data/content/council-members';
import { LEADER_DEFINITIONS } from '../data/content/leaders';
import { ANTAGONIST_DEFINITIONS } from '../data/content/antagonists';
import { allArcTemplates } from '../data/arcs';
import { getSeason } from '../systems/calendar';

function makeTile(overrides: Partial<Tile> & Pick<Tile, 'id' | 'name' | 'terrain'>): Tile {
  return {
    vacancyRate: 0,
    ecologicalHealth: 0,
    contamination: 0,
    gentrificationPressure: 0,
    existingUses: [],
    neighborhoodTraits: [],
    activeProjects: [],
    completedProjects: [],
    communityPowerTokens: 0,
    communityOwned: false,
    adjacentTileIds: [],
    visualStage: 'dystopia',
    consumedByproducts: [],
    vacantLots: 5,
    reclaimedLots: 0,
    ...overrides,
  };
}

function makeLeader(
  overrides: Partial<CommunityLeader> & Pick<CommunityLeader, 'id' | 'trust' | 'advocacyPower'>,
): CommunityLeader {
  return {
    name: '',
    neighborhood: '',
    tileIds: [],
    backstory: '',
    priorities: [],
    proposalCooldown: 0,
    consecutiveDeferrals: 0,
    ...overrides,
  };
}

export function createNewGame(): GameState {
  const communityTrust = 50;
  const startMonth = new Date().getMonth() + 1; // 1-12

  return {
    version: 2,
    turn: 1,
    month: startMonth,
    season: getSeason(startMonth),
    year: 1,
    phase: 'player-actions',
    stage: 'awakening',
    path: null,
    // Starting meters calibrated to Detroit 2024 baseline.
    // Trust 50%: Duggan approval was 84% but that's after 12 years; new mayor starts lower.
    // Eco 20%: Tree canopy 26% (target 40%), 2200+ gardens but <5% food needs met.
    // Food 12%: 36% lack adequate food access (USDA), 550K lbs grown but city needs millions.
    // Will 25%: Fresh administration, some goodwill but no active coalitions yet.
    // Budget $1.5M: First-year discretionary budget (general fund portion for sustainability).
    // Climate 30%: Already experiencing floods every 1-2 years, 13 days 90F+/year.
    // Source: Detroit FY2024 budget, Keep Growing Detroit, American Lung Association, GLISA.
    meters: {
      communityTrust,
      ecologicalHealth: 20,
      foodSovereignty: 12,
      politicalWill: 25,
      budget: 1.5,
      climatePressure: 30,
    },
    tiles: {
      brightmoor: makeTile({
        id: 'brightmoor',
        name: 'Brightmoor',
        terrain: 'vacant',
        vacancyRate: 70,
        ecologicalHealth: 8,
        contamination: 20,
        gentrificationPressure: 0,
        existingUses: ['vacant_lot'],
        neighborhoodTraits: ['high_vacancy', 'strong_community_networks'],
        adjacentTileIds: [],
        vacantLots: 8,
      }),
      corktown: makeTile({
        id: 'corktown',
        name: 'Corktown',
        terrain: 'urban-sparse',
        vacancyRate: 25,
        ecologicalHealth: 12,
        contamination: 10,
        gentrificationPressure: 45,
        existingUses: ['small_businesses', 'occupied_housing'],
        neighborhoodTraits: ['ford_development', 'rapid_change', 'transit_adjacent'],
        adjacentTileIds: ['eastern_market'],
        vacantLots: 3,
      }),
      eastern_market: makeTile({
        id: 'eastern_market',
        name: 'Eastern Market',
        terrain: 'urban-sparse',
        vacancyRate: 15,
        ecologicalHealth: 14,
        contamination: 5,
        gentrificationPressure: 10,
        existingUses: ['small_businesses', 'historic_site'],
        neighborhoodTraits: ['food_heritage', 'small_business_dense', 'historic_site'],
        adjacentTileIds: ['corktown'],
      }),
      southwest_detroit: makeTile({
        id: 'southwest_detroit',
        name: 'Southwest Detroit',
        terrain: 'industrial',
        vacancyRate: 20,
        ecologicalHealth: 10,
        contamination: 35,
        gentrificationPressure: 15,
        existingUses: ['active_industrial', 'occupied_housing', 'small_businesses'],
        neighborhoodTraits: ['pollution_hotspot', 'immigrant_community', 'water_issues'],
        adjacentTileIds: ['corktown'],
      }),
      indian_village: makeTile({
        id: 'indian_village',
        name: 'Indian Village',
        terrain: 'urban-sparse',
        vacancyRate: 10,
        ecologicalHealth: 18,
        contamination: 3,
        gentrificationPressure: 30,
        existingUses: ['occupied_housing', 'historic_site'],
        neighborhoodTraits: ['historic_district', 'waterfront_adjacent', 'flood_risk'],
        adjacentTileIds: ['eastern_market'],
      }),
      hamtramck: makeTile({
        id: 'hamtramck',
        name: 'Hamtramck',
        terrain: 'urban-dense',
        vacancyRate: 12,
        ecologicalHealth: 11,
        contamination: 8,
        gentrificationPressure: 20,
        existingUses: ['small_businesses', 'occupied_housing', 'church'],
        neighborhoodTraits: ['diverse_community', 'small_business_dense', 'walkable'],
        adjacentTileIds: ['eastern_market'],
      }),
      north_end: makeTile({
        id: 'north_end',
        name: 'North End',
        terrain: 'vacant',
        vacancyRate: 55,
        ecologicalHealth: 9,
        contamination: 15,
        gentrificationPressure: 5,
        existingUses: ['vacant_lot', 'church', 'community_garden'],
        neighborhoodTraits: ['high_vacancy', 'health_desert', 'strong_churches'],
        adjacentTileIds: ['hamtramck'],
        vacantLots: 7,
      }),
      warrendale: makeTile({
        id: 'warrendale',
        name: 'Warrendale',
        terrain: 'urban-sparse',
        vacancyRate: 30,
        ecologicalHealth: 12,
        contamination: 10,
        gentrificationPressure: 8,
        existingUses: ['occupied_housing', 'vacant_lot'],
        neighborhoodTraits: ['flood_prone', 'working_class', 'infrastructure_aging'],
        adjacentTileIds: ['brightmoor'],
      }),
    },
    leaders: Object.fromEntries(
      Object.entries(LEADER_DEFINITIONS).map(([id, def]) => [
        id,
        makeLeader({ ...def }),
      ]),
    ),
    councilMembers: { ...COUNCIL_MEMBERS },
    antagonists: Object.fromEntries(
      Object.entries(ANTAGONIST_DEFINITIONS).map(([id, def]) => [
        id,
        id === 'marcus_webb' ? { ...def, active: true } : { ...def },
      ]),
    ),
    activeProposals: [],
    pendingProposals: [],
    activePolicies: [],
    publicOpinion: {
      foodSovereignty: 15,
      waterCommons: 10,
      landReform: 8,
      ecologicalRestoration: 20,
      cooperativeEconomics: 12,
      nutrientRecycling: 5,
      nuclearEnergy: 15,
      landExpropriation: 8,
      decarceration: 6,
      deGrowth: 3,
    } as PublicOpinion,
    coalitions: [],
    eventQueue: [],
    eventCooldowns: {},
    councilVoteHistory: [],
    turnSummary: null,
    turnHistory: [],
    maxConcurrentProjects: Math.floor(2 + communityTrust / 25),
    regionalCities: {},
    activeTransfers: [],
    regionalProjects: [],
    continentalGoals: [],
    winCondition: null,
    lossCondition: null,
    sandbox: false,
    // Crisis Arc Engine — all arcs start dormant, pipeline will advance them
    dependencyWeb: { conditions: [], capacities: {} } as SerializedDependencyWeb,
    delayedConsequenceQueue: [],
    activeArcs: allArcTemplates.map((template): ActiveArc => ({
      arcId: template.id,
      currentStage: 'dormant',
      stageEnteredTurn: 1,
      inactionTimer: 0,
      lastEventTurn: 0,
      initializedFromSnapshot: false,
    })),
    resolvedArcs: [],
    // Tutorial / NUX — guides new players through first ~10 turns
    tutorialState: {
      active: true,
      completedSteps: [],
      dismissedTooltips: [],
    } as TutorialState,
    // Advisor prompts — context-sensitive warnings from community leaders
    advisorState: {
      dismissedConditions: [],
      cooldowns: {},
    } as AdvisorState,
    // Calendar Slot System
    ...createInitialCalendarState(1),
    // Map integration
    mapState: {
      selectedBlockId: null,
      viewState: { longitude: -83.0458, latitude: 42.3314, zoom: 11.5 },
    },
  };
}
