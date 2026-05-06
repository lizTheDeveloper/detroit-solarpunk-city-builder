import { describe, it, expect } from 'vitest';
import { calculateMeshNetworkStrength, getMeshNetworkStatus, applyMeshNetworkEffects } from './mesh-network';
import type { GameState, Tile } from '../state/types';

function makeTile(overrides: Partial<Tile> = {}): Tile {
  return {
    id: 'test',
    name: 'Test',
    terrain: 'vacant',
    vacancyRate: 30,
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

function makeState(communityOwnedCount: number): GameState {
  const tiles: Record<string, Tile> = {};
  for (let i = 0; i < 8; i++) {
    tiles[`tile_${i}`] = makeTile({
      id: `tile_${i}`,
      name: `Tile ${i}`,
      communityOwned: i < communityOwnedCount,
    });
  }
  return {
    version: 2,
    turn: 5,
    season: 'spring',
    year: 2,
    phase: 'events',
    stage: 'transition',
    path: null,
    meters: {
      communityTrust: 55,
      ecologicalHealth: 30,
      foodSovereignty: 20,
      politicalWill: 40,
      budget: 1.0,
      climatePressure: 35,
    },
    tiles,
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

describe('mesh-network', () => {
  describe('calculateMeshNetworkStrength', () => {
    it('returns 0 with no community-owned tiles', () => {
      const state = makeState(0);
      expect(calculateMeshNetworkStrength(state)).toBe(0);
    });

    it('counts community-owned tiles', () => {
      const state = makeState(4);
      expect(calculateMeshNetworkStrength(state)).toBe(4);
    });
  });

  describe('getMeshNetworkStatus', () => {
    it('no bonuses below 2 tiles', () => {
      const status = getMeshNetworkStatus(makeState(1));
      expect(status.narrativeBonus).toBe(0);
      expect(status.counterNarrativeResistance).toBe(0);
      expect(status.extraActions).toBe(0);
      expect(status.passiveTrustGain).toBe(0);
    });

    it('narrative bonus at 2+ tiles', () => {
      const status = getMeshNetworkStatus(makeState(2));
      expect(status.narrativeBonus).toBe(0.20);
      expect(status.passiveTrustGain).toBeCloseTo(0.10, 5);
    });

    it('counter-narrative resistance at 4+ tiles', () => {
      const status = getMeshNetworkStatus(makeState(4));
      expect(status.counterNarrativeResistance).toBe(0.30);
      expect(status.passiveTrustGain).toBeCloseTo(0.20, 5);
    });

    it('extra actions at 6+ tiles', () => {
      const status = getMeshNetworkStatus(makeState(6));
      expect(status.extraActions).toBe(1);
      expect(status.passiveTrustGain).toBeCloseTo(0.30, 5);
    });
  });

  describe('applyMeshNetworkEffects', () => {
    it('no effect with 0-1 community tiles', () => {
      const state = makeState(1);
      const { state: newState, deltas } = applyMeshNetworkEffects(state);
      expect(deltas).toHaveLength(0);
      expect(newState.meters.communityTrust).toBe(55);
    });

    it('adds passive trust gain with 3 community tiles', () => {
      const state = makeState(3);
      const { state: newState, deltas } = applyMeshNetworkEffects(state);
      expect(deltas).toHaveLength(1);
      expect(deltas[0].source).toBe('mesh_network');
      expect(newState.meters.communityTrust).toBeCloseTo(55.15, 5);
    });

    it('increases maxActionsPerTurn at 6+ tiles', () => {
      const state = makeState(6);
      const { state: newState } = applyMeshNetworkEffects(state);
      expect(newState.narrativeState.maxActionsPerTurn).toBe(3);
    });
  });
});
