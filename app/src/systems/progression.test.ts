import { describe, it, expect } from 'vitest';
import type { GameState } from '../state/types';
import {
  checkStageTransition,
  detectSpecializationPath,
  getPathBonuses,
  getStageUnlocks,
  applyProgressionEffects,
} from './progression';

function makeTestState(overrides: Partial<GameState> = {}): GameState {
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
      ecologicalHealth: 15,
      foodSovereignty: 10,
      politicalWill: 60,
      budget: 2.8,
      climatePressure: 30,
    },
    tiles: {},
    leaders: {},
    councilMembers: {},
    antagonists: {},
    activeProposals: [],
    pendingProposals: [],
    activePolicies: [],
    publicOpinion: {
      foodSovereignty: 15,
      waterCommons: 10,
      landReform: 8,
      ecologicalRestoration: 20,
      cooperativeEconomics: 12,
    },
    coalitions: [],
    eventQueue: [],
    eventCooldowns: {},
    councilVoteHistory: [],
    turnSummary: null,
    turnHistory: [],
    maxConcurrentProjects: 4,
    ...overrides,
  } as GameState;
}

describe('checkStageTransition', () => {
  it('stays at awakening when no thresholds met', () => {
    const state = makeTestState({
      stage: 'awakening',
      meters: {
        communityTrust: 30,
        ecologicalHealth: 10,
        foodSovereignty: 5,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
    });
    expect(checkStageTransition(state)).toBe('awakening');
  });

  it('transitions awakening → transition when eco >= 35%', () => {
    const state = makeTestState({
      stage: 'awakening',
      meters: {
        communityTrust: 30,
        ecologicalHealth: 35,
        foodSovereignty: 5,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
    });
    expect(checkStageTransition(state)).toBe('transition');
  });

  it('transitions awakening → transition when food >= 25%', () => {
    const state = makeTestState({
      stage: 'awakening',
      meters: {
        communityTrust: 30,
        ecologicalHealth: 10,
        foodSovereignty: 25,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
    });
    expect(checkStageTransition(state)).toBe('transition');
  });

  it('transitions awakening → transition when trust >= 65%', () => {
    const state = makeTestState({
      stage: 'awakening',
      meters: {
        communityTrust: 65,
        ecologicalHealth: 10,
        foodSovereignty: 5,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
    });
    expect(checkStageTransition(state)).toBe('transition');
  });

  it('transitions transition → restoration when ALL conditions met', () => {
    const state = makeTestState({
      stage: 'transition',
      meters: {
        communityTrust: 50,
        ecologicalHealth: 55,
        foodSovereignty: 40,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
      activePolicies: [
        { definitionId: 'p1', enactedTurn: 5 },
        { definitionId: 'p2', enactedTurn: 8 },
      ],
    });
    expect(checkStageTransition(state)).toBe('restoration');
  });

  it('stays at transition when not all restoration conditions met', () => {
    const state = makeTestState({
      stage: 'transition',
      meters: {
        communityTrust: 50,
        ecologicalHealth: 55,
        foodSovereignty: 40,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
      activePolicies: [{ definitionId: 'p1', enactedTurn: 5 }], // only 1 policy
    });
    expect(checkStageTransition(state)).toBe('transition');
  });

  it('never goes backward', () => {
    const state = makeTestState({
      stage: 'restoration',
      meters: {
        communityTrust: 10,
        ecologicalHealth: 5,
        foodSovereignty: 2,
        politicalWill: 20,
        budget: 0.5,
        climatePressure: 80,
      },
      activePolicies: [],
    });
    expect(checkStageTransition(state)).toBe('restoration');
  });

  it('transitions restoration → beyond when ALL conditions met', () => {
    const state = makeTestState({
      stage: 'restoration',
      meters: {
        communityTrust: 70,
        ecologicalHealth: 75,
        foodSovereignty: 60,
        politicalWill: 60,
        budget: 5,
        climatePressure: 20,
      },
      activePolicies: [
        { definitionId: 'p1', enactedTurn: 5 },
        { definitionId: 'p2', enactedTurn: 8 },
        { definitionId: 'p3', enactedTurn: 12 },
        { definitionId: 'p4', enactedTurn: 15 },
      ],
      coalitions: [{ id: 'c1', name: 'Green Coalition', memberIds: ['l1', 'l2'], topic: 'eco', active: true, formedTurn: 20 }],
    });
    expect(checkStageTransition(state)).toBe('beyond');
  });
});

describe('detectSpecializationPath', () => {
  it('detects ecology when 5+ ecology/restoration projects completed and food > 30%', () => {
    const state = makeTestState({
      meters: {
        communityTrust: 40,
        ecologicalHealth: 60,
        foodSovereignty: 35,
        politicalWill: 50,
        budget: 3,
        climatePressure: 25,
      },
      tiles: {
        t1: { id: 't1', name: 'T1', completedProjects: ['food_forest', 'rain_garden', 'soil_remediation'], activeProjects: [], ecologicalHealth: 30, contamination: 0, gentrificationPressure: 0, reclaimed: false, zoning: 'residential' } as any,
        t2: { id: 't2', name: 'T2', completedProjects: ['native_planting', 'wetland_restoration'], activeProjects: [], ecologicalHealth: 20, contamination: 0, gentrificationPressure: 0, reclaimed: false, zoning: 'residential' } as any,
      },
    });
    expect(detectSpecializationPath(state)).toBe('ecology');
  });

  it('detects community when trust is highest and 3+ leaders at trust >= 40', () => {
    const state = makeTestState({
      meters: {
        communityTrust: 70,
        ecologicalHealth: 30,
        foodSovereignty: 20,
        politicalWill: 50,
        budget: 3,
        climatePressure: 25,
      },
      leaders: {
        l1: { id: 'l1', name: 'A', neighborhood: 'n1', tileIds: [], backstory: '', priorities: [], trust: 45, advocacyPower: 3, proposalCooldown: 0, consecutiveDeferrals: 0 },
        l2: { id: 'l2', name: 'B', neighborhood: 'n2', tileIds: [], backstory: '', priorities: [], trust: 50, advocacyPower: 3, proposalCooldown: 0, consecutiveDeferrals: 0 },
        l3: { id: 'l3', name: 'C', neighborhood: 'n3', tileIds: [], backstory: '', priorities: [], trust: 42, advocacyPower: 3, proposalCooldown: 0, consecutiveDeferrals: 0 },
      },
    });
    expect(detectSpecializationPath(state)).toBe('community');
  });

  it('detects policy when 3+ policies enacted and will > 40%', () => {
    const state = makeTestState({
      meters: {
        communityTrust: 40,
        ecologicalHealth: 30,
        foodSovereignty: 20,
        politicalWill: 55,
        budget: 3,
        climatePressure: 25,
      },
      activePolicies: [
        { definitionId: 'p1', enactedTurn: 3 },
        { definitionId: 'p2', enactedTurn: 6 },
        { definitionId: 'p3', enactedTurn: 9 },
      ],
    });
    expect(detectSpecializationPath(state)).toBe('policy');
  });

  it('returns null when no clear path', () => {
    const state = makeTestState({
      meters: {
        communityTrust: 40,
        ecologicalHealth: 30,
        foodSovereignty: 20,
        politicalWill: 30,
        budget: 3,
        climatePressure: 25,
      },
      activePolicies: [],
      leaders: {},
    });
    expect(detectSpecializationPath(state)).toBeNull();
  });
});

describe('getPathBonuses', () => {
  it('ecology path: -10% cost on ecology projects, +1% eco gain', () => {
    const bonuses = getPathBonuses('ecology');
    expect(bonuses.projectCostModifier).toEqual({ ecology: 0.9 });
    expect(bonuses.ecoPassiveGain).toBe(1);
    expect(bonuses.extraNarrativeActions).toBe(0);
    expect(bonuses.trustDecayMultiplier).toBe(1.0);
    expect(bonuses.policyDrainMultiplier).toBe(1.0);
    expect(bonuses.dispositionBonusOnEnact).toBe(0);
  });

  it('community path: +1 narrative action, halved trust decay', () => {
    const bonuses = getPathBonuses('community');
    expect(bonuses.extraNarrativeActions).toBe(1);
    expect(bonuses.trustDecayMultiplier).toBe(0.5);
    expect(bonuses.projectCostModifier).toEqual({});
    expect(bonuses.ecoPassiveGain).toBe(0);
    expect(bonuses.policyDrainMultiplier).toBe(1.0);
    expect(bonuses.dispositionBonusOnEnact).toBe(0);
  });

  it('policy path: -25% policy drain, +5 disposition on enactment', () => {
    const bonuses = getPathBonuses('policy');
    expect(bonuses.policyDrainMultiplier).toBe(0.75);
    expect(bonuses.dispositionBonusOnEnact).toBe(5);
    expect(bonuses.projectCostModifier).toEqual({});
    expect(bonuses.ecoPassiveGain).toBe(0);
    expect(bonuses.extraNarrativeActions).toBe(0);
    expect(bonuses.trustDecayMultiplier).toBe(1.0);
  });

  it('null path returns default bonuses (no modifications)', () => {
    const bonuses = getPathBonuses(null);
    expect(bonuses.projectCostModifier).toEqual({});
    expect(bonuses.ecoPassiveGain).toBe(0);
    expect(bonuses.extraNarrativeActions).toBe(0);
    expect(bonuses.trustDecayMultiplier).toBe(1.0);
    expect(bonuses.policyDrainMultiplier).toBe(1.0);
    expect(bonuses.dispositionBonusOnEnact).toBe(0);
  });
});

describe('getStageUnlocks', () => {
  it('returns correct unlocks for each stage', () => {
    expect(getStageUnlocks('awakening')).toEqual([
      'food_forest', 'rain_garden', 'soil_remediation', 'native_planting', 'community_kitchen',
    ]);
    expect(getStageUnlocks('transition')).toEqual([
      'solar_grid', 'greenway', 'maker_space', 'land_trust', 'water_transit',
    ]);
    expect(getStageUnlocks('restoration')).toEqual([
      'wetland_restoration', 'wildlife_corridor', 'regional_collab',
    ]);
    expect(getStageUnlocks('beyond')).toEqual(['endgame_content']);
  });
});

describe('applyProgressionEffects', () => {
  it('transitions stage when threshold met', () => {
    const state = makeTestState({
      stage: 'awakening',
      meters: {
        communityTrust: 30,
        ecologicalHealth: 40,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
    });
    const result = applyProgressionEffects(state);
    expect(result.stage).toBe('transition');
  });

  it('updates path when conditions met', () => {
    const state = makeTestState({
      stage: 'transition',
      meters: {
        communityTrust: 40,
        ecologicalHealth: 60,
        foodSovereignty: 35,
        politicalWill: 50,
        budget: 3,
        climatePressure: 25,
      },
      tiles: {
        t1: { id: 't1', name: 'T1', completedProjects: ['food_forest', 'rain_garden', 'soil_remediation'], activeProjects: [], ecologicalHealth: 30, contamination: 0, gentrificationPressure: 0, reclaimed: false, zoning: 'residential' } as any,
        t2: { id: 't2', name: 'T2', completedProjects: ['native_planting', 'wetland_restoration'], activeProjects: [], ecologicalHealth: 20, contamination: 0, gentrificationPressure: 0, reclaimed: false, zoning: 'residential' } as any,
      },
    });
    const result = applyProgressionEffects(state);
    expect(result.path).toBe('ecology');
  });

  it('applies ecology passive eco gain', () => {
    const state = makeTestState({
      stage: 'transition',
      meters: {
        communityTrust: 40,
        ecologicalHealth: 60,
        foodSovereignty: 35,
        politicalWill: 50,
        budget: 3,
        climatePressure: 25,
      },
      tiles: {
        t1: { id: 't1', name: 'T1', completedProjects: ['food_forest', 'rain_garden', 'soil_remediation'], activeProjects: [], ecologicalHealth: 30, contamination: 0, gentrificationPressure: 0, reclaimed: false, zoning: 'residential' } as any,
        t2: { id: 't2', name: 'T2', completedProjects: ['native_planting', 'wetland_restoration'], activeProjects: [], ecologicalHealth: 20, contamination: 0, gentrificationPressure: 0, reclaimed: false, zoning: 'residential' } as any,
      },
    });
    const result = applyProgressionEffects(state);
    expect(result.path).toBe('ecology');
    expect(result.meters.ecologicalHealth).toBe(61); // 60 + 1 passive gain
  });

  it('does not mutate original state', () => {
    const state = makeTestState({
      stage: 'awakening',
      meters: {
        communityTrust: 30,
        ecologicalHealth: 40,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 2.8,
        climatePressure: 30,
      },
    });
    applyProgressionEffects(state);
    expect(state.stage).toBe('awakening');
    expect(state.meters.ecologicalHealth).toBe(40);
  });
});
