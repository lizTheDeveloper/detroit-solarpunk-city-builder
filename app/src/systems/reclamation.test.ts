import { describe, it, expect } from 'vitest';
import { canReclaimLot, reclaimLot, applyReclamationEffects, checkReclamationLoss, getReclamationCapacityBonus } from './reclamation';
import type { GameState, Tile } from '../state/types';

function makeTile(overrides: Partial<Tile> = {}): Tile {
  return {
    id: 'test_tile',
    name: 'Test Tile',
    terrain: 'vacant',
    vacancyRate: 50,
    ecologicalHealth: 10,
    contamination: 0,
    gentrificationPressure: 10,
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

function makeState(_overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    turn: 1,
    season: 'spring',
    year: 1,
    phase: 'events',
    stage: 'awakening',
    path: null,
    meters: {
      communityTrust: 50,
      ecologicalHealth: 20,
      foodSovereignty: 12,
      politicalWill: 25,
      budget: 1.5,
      climatePressure: 30,
    },
    tiles: { test_tile: makeTile() },
    leaders: {},
    councilMembers: {},
    activeProposals: [],
    pendingProposals: [],
    activePolicies: [],
    eventQueue: [],
    eventCooldowns: {},
    narrativeState: { opinionMomentum: 0, framingStrength: 0, counterNarrativeActive: false, actionsThisTurn: 0, maxActionsPerTurn: 2 },
    publicOpinion: { approval: 50, mediaFrame: 'neutral', activeCampaigns: [] },
    turnHistory: [],
    turnSummary: null,
    maxConcurrentProjects: 4,
    sandbox: false,
    coalitions: [],
    antagonists: {},
    progression: { stageTransitions: [], pathBonusesApplied: [] },
    regionalCities: {},
    continentalGoals: [],
    winCondition: null,
    lossCondition: null,
  } as unknown as GameState;
}

describe('reclamation', () => {
  describe('canReclaimLot', () => {
    it('allows reclamation with sufficient trust and vacant lots', () => {
      const state = makeState();
      expect(canReclaimLot(state, 'test_tile')).toEqual({ allowed: true });
    });

    it('rejects when trust < 30', () => {
      const state = makeState();
      state.meters.communityTrust = 25;
      const result = canReclaimLot(state, 'test_tile');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('trust >= 30');
    });

    it('rejects when no vacant lots remain', () => {
      const state = makeState();
      state.tiles.test_tile = makeTile({ vacantLots: 0 });
      const result = canReclaimLot(state, 'test_tile');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No vacant lots');
    });
  });

  describe('reclaimLot', () => {
    it('reduces vacant lots and increases reclaimed lots', () => {
      const state = makeState();
      const { state: newState } = reclaimLot(state, 'test_tile');
      expect(newState.tiles.test_tile.vacantLots).toBe(4);
      expect(newState.tiles.test_tile.reclaimedLots).toBe(1);
    });

    it('adds gentrification pressure without land trust', () => {
      const state = makeState();
      const { state: newState } = reclaimLot(state, 'test_tile');
      expect(newState.tiles.test_tile.gentrificationPressure).toBe(12);
    });

    it('no gentrification with land trust present', () => {
      const state = makeState();
      state.tiles.test_tile = makeTile({ completedProjects: ['land_trust'] });
      const { state: newState } = reclaimLot(state, 'test_tile');
      expect(newState.tiles.test_tile.gentrificationPressure).toBe(10);
    });

    it('costs 1 trust without land trust (risk)', () => {
      const state = makeState();
      const { state: newState } = reclaimLot(state, 'test_tile');
      expect(newState.meters.communityTrust).toBe(49);
    });
  });

  describe('applyReclamationEffects', () => {
    it('generates eco from reclaimed lots', () => {
      const state = makeState();
      state.tiles.test_tile = makeTile({ reclaimedLots: 3 });
      const { state: newState, deltas } = applyReclamationEffects(state);
      expect(newState.meters.ecologicalHealth).toBeCloseTo(20.3, 5);
      expect(deltas[0].source).toBe('reclaimed_lots_rewilding');
    });

    it('no effect with zero reclaimed lots', () => {
      const state = makeState();
      const { deltas } = applyReclamationEffects(state);
      expect(deltas).toHaveLength(0);
    });
  });

  describe('checkReclamationLoss', () => {
    it('loses reclaimed lots when trust drops below 20', () => {
      const state = makeState();
      state.meters.communityTrust = 15;
      state.tiles.test_tile = makeTile({ reclaimedLots: 2, vacantLots: 3 });
      const result = checkReclamationLoss(state);
      expect(result.tiles.test_tile.reclaimedLots).toBe(1);
      expect(result.tiles.test_tile.vacantLots).toBe(4);
    });

    it('land trust protects reclaimed lots from loss', () => {
      const state = makeState();
      state.meters.communityTrust = 15;
      state.tiles.test_tile = makeTile({ reclaimedLots: 2, vacantLots: 3, completedProjects: ['land_trust'] });
      const result = checkReclamationLoss(state);
      expect(result.tiles.test_tile.reclaimedLots).toBe(2);
    });

    it('no loss when trust >= 20', () => {
      const state = makeState();
      state.meters.communityTrust = 25;
      state.tiles.test_tile = makeTile({ reclaimedLots: 2, vacantLots: 3 });
      const result = checkReclamationLoss(state);
      expect(result.tiles.test_tile.reclaimedLots).toBe(2);
    });
  });

  describe('getReclamationCapacityBonus', () => {
    it('returns reclaimed lots count', () => {
      const tile = makeTile({ reclaimedLots: 3 });
      expect(getReclamationCapacityBonus(tile)).toBe(3);
    });

    it('returns 0 for no reclamation', () => {
      const tile = makeTile();
      expect(getReclamationCapacityBonus(tile)).toBe(0);
    });
  });
});
