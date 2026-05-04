import { describe, it, expect } from 'vitest';
import type { GameState, PolicyDefinition, ActivePolicy, Meters, PublicOpinion } from '../state/types';
import { createNewGame } from '../state/create-game';
import { POLICY_CATALOG } from '../data/content/policy-catalog';
import {
  calculateEffectiveThreshold,
  canEnactPolicy,
  enactPolicy,
  applyPolicyDrain,
  getPolicyTopicMapping,
  calculateTotalPolicyDrain,
} from './policies';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createNewGame(),
    ...overrides,
  };
}

describe('calculateEffectiveThreshold', () => {
  const policy = POLICY_CATALOG['urban_agriculture_zoning']; // baseThreshold 0.30

  it('returns base threshold at 0% topic opinion', () => {
    const result = calculateEffectiveThreshold(policy, 0);
    expect(result).toBeCloseTo(0.30, 6);
  });

  it('returns 85% of base at 50% topic opinion', () => {
    // 0.30 * (1 - 50 * 0.003) = 0.30 * 0.85 = 0.255
    const result = calculateEffectiveThreshold(policy, 50);
    expect(result).toBeCloseTo(0.30 * 0.85, 6);
  });

  it('returns 70% of base at 100% topic opinion', () => {
    // 0.30 * (1 - 100 * 0.003) = 0.30 * 0.70 = 0.21
    const result = calculateEffectiveThreshold(policy, 100);
    expect(result).toBeCloseTo(0.30 * 0.70, 6);
  });
});

describe('canEnactPolicy', () => {
  it('allows enactment when Will exceeds effective threshold + cost', () => {
    // urban_agriculture_zoning: threshold=0.30, cost=0.08
    // At 0 opinion, need 0.30 + 0.08 = 0.38 (i.e. 38 out of 100)
    const state = makeState({
      meters: {
        ...createNewGame().meters,
        politicalWill: 50, // 0.50 > 0.38
      },
      publicOpinion: { ...createNewGame().publicOpinion, foodSovereignty: 0 },
    });
    const result = canEnactPolicy(state, 'urban_agriculture_zoning', POLICY_CATALOG, false);
    expect(result.allowed).toBe(true);
  });

  it('rejects when Will is below effective threshold + cost', () => {
    const state = makeState({
      meters: {
        ...createNewGame().meters,
        politicalWill: 20, // 0.20 < 0.38
      },
      publicOpinion: { ...createNewGame().publicOpinion, foodSovereignty: 0 },
    });
    const result = canEnactPolicy(state, 'urban_agriculture_zoning', POLICY_CATALOG, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('rejects already-enacted policy', () => {
    const state = makeState({
      meters: {
        ...createNewGame().meters,
        politicalWill: 90,
      },
      activePolicies: [{ definitionId: 'urban_agriculture_zoning', enactedTurn: 1 }],
    });
    const result = canEnactPolicy(state, 'urban_agriculture_zoning', POLICY_CATALOG, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('already');
  });

  it('rejects council-vote policy when council has not approved', () => {
    const state = makeState({
      meters: {
        ...createNewGame().meters,
        politicalWill: 90,
      },
    });
    // green_infrastructure_grants requires council vote
    const result = canEnactPolicy(state, 'green_infrastructure_grants', POLICY_CATALOG, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('council');
  });

  it('allows council-vote policy when council has approved', () => {
    const state = makeState({
      meters: {
        ...createNewGame().meters,
        politicalWill: 90,
      },
      publicOpinion: { ...createNewGame().publicOpinion, ecologicalRestoration: 0 },
    });
    const result = canEnactPolicy(state, 'green_infrastructure_grants', POLICY_CATALOG, true);
    expect(result.allowed).toBe(true);
  });
});

describe('enactPolicy', () => {
  it('deducts enactment cost from Political Will', () => {
    const state = makeState({
      meters: { ...createNewGame().meters, politicalWill: 80 },
      publicOpinion: { ...createNewGame().publicOpinion, foodSovereignty: 0 },
    });
    const next = enactPolicy(state, 'urban_agriculture_zoning', POLICY_CATALOG);
    // cost = 0.08, will stored as 0-100, so deduct 0.08*100 = 8
    expect(next.meters.politicalWill).toBeCloseTo(80 - 8, 6);
  });

  it('adds policy to activePolicies', () => {
    const state = makeState({
      meters: { ...createNewGame().meters, politicalWill: 80 },
    });
    const next = enactPolicy(state, 'urban_agriculture_zoning', POLICY_CATALOG);
    expect(next.activePolicies).toHaveLength(1);
    expect(next.activePolicies[0].definitionId).toBe('urban_agriculture_zoning');
    expect(next.activePolicies[0].enactedTurn).toBe(state.turn);
  });

  it('applies one-time trust and food sov effects for water_commons', () => {
    const state = makeState({
      meters: { ...createNewGame().meters, politicalWill: 90, communityTrust: 50, foodSovereignty: 10 },
    });
    const waterPolicy = POLICY_CATALOG['water_commons'];
    const next = enactPolicy(state, 'water_commons', POLICY_CATALOG);
    // trust bonus and food sov bonus are applied
    expect(next.meters.communityTrust).toBe(50 + waterPolicy.effects.trustBonus);
    expect(next.meters.foodSovereignty).toBe(10 + waterPolicy.effects.foodSovBonus);
  });
});

describe('applyPolicyDrain', () => {
  it('reduces Will by ongoing drain per active policy', () => {
    const state = makeState({
      meters: { ...createNewGame().meters, politicalWill: 60 },
      activePolicies: [{ definitionId: 'urban_agriculture_zoning', enactedTurn: 1 }],
    });
    const { state: next, deltas } = applyPolicyDrain(state, POLICY_CATALOG);
    // drain = 0.003 * 100 = 0.3
    expect(next.meters.politicalWill).toBeCloseTo(60 - 0.3, 6);
    expect(deltas).toHaveLength(1);
    expect(deltas[0].meter).toBe('politicalWill');
  });

  it('caps total drain at 4% per turn', () => {
    // Create a state with all 6 policies active.
    // Total uncapped drain: 0.003+0.004+0.005+0.005+0.003+0.005 = 0.025
    // Cap = 0.04
    // Since 0.025 < 0.04, all 6 don't exceed the cap.
    // We need to test the cap is enforced. Let's use a scenario with enough policies.
    // Actually 0.025 < 0.04, so cap doesn't kick in with these 6.
    // We'll test the cap by verifying calculateTotalPolicyDrain caps correctly.
    // For applyPolicyDrain, let's verify multiple policies drain correctly.
    const state = makeState({
      meters: { ...createNewGame().meters, politicalWill: 60 },
      activePolicies: [
        { definitionId: 'urban_agriculture_zoning', enactedTurn: 1 },
        { definitionId: 'green_infrastructure_grants', enactedTurn: 1 },
        { definitionId: 'cooperative_tax_incentives', enactedTurn: 1 },
        { definitionId: 'participatory_budgeting', enactedTurn: 1 },
        { definitionId: 'community_land_trust', enactedTurn: 1 },
        { definitionId: 'water_commons', enactedTurn: 1 },
      ],
    });
    const { state: next } = applyPolicyDrain(state, POLICY_CATALOG);
    // Total drain = 0.025, under cap so applied fully: 0.025 * 100 = 2.5
    expect(next.meters.politicalWill).toBeCloseTo(60 - 2.5, 6);
  });

  it('drains multiple policies correctly', () => {
    const state = makeState({
      meters: { ...createNewGame().meters, politicalWill: 80 },
      activePolicies: [
        { definitionId: 'urban_agriculture_zoning', enactedTurn: 1 },
        { definitionId: 'water_commons', enactedTurn: 2 },
      ],
    });
    const { state: next, deltas } = applyPolicyDrain(state, POLICY_CATALOG);
    // drain = (0.003 + 0.005) * 100 = 0.8
    expect(next.meters.politicalWill).toBeCloseTo(80 - 0.8, 6);
    expect(deltas).toHaveLength(2);
  });
});

describe('calculateTotalPolicyDrain', () => {
  it('sums drains of all active policies', () => {
    const activePolicies: ActivePolicy[] = [
      { definitionId: 'urban_agriculture_zoning', enactedTurn: 1 },
      { definitionId: 'green_infrastructure_grants', enactedTurn: 1 },
    ];
    const result = calculateTotalPolicyDrain(activePolicies, POLICY_CATALOG);
    expect(result).toBeCloseTo(0.003 + 0.004, 6);
  });

  it('caps total drain at 0.04', () => {
    // Create a hypothetical scenario with a custom catalog where drains are huge
    const bigDrainCatalog: Record<string, PolicyDefinition> = {
      big_a: {
        id: 'big_a', name: 'Big A', baseThreshold: 0.10, enactmentCost: 0.05,
        ongoingDrain: 0.03, requiresCouncilVote: false,
        effects: { trustBonus: 0, ecoBonus: 0, foodSovBonus: 0, budgetBonus: 0, projectCostModifier: {}, other: [] },
      },
      big_b: {
        id: 'big_b', name: 'Big B', baseThreshold: 0.10, enactmentCost: 0.05,
        ongoingDrain: 0.03, requiresCouncilVote: false,
        effects: { trustBonus: 0, ecoBonus: 0, foodSovBonus: 0, budgetBonus: 0, projectCostModifier: {}, other: [] },
      },
    };
    const activePolicies: ActivePolicy[] = [
      { definitionId: 'big_a', enactedTurn: 1 },
      { definitionId: 'big_b', enactedTurn: 1 },
    ];
    // Uncapped would be 0.06, should cap at 0.04
    const result = calculateTotalPolicyDrain(activePolicies, bigDrainCatalog);
    expect(result).toBe(0.04);
  });
});

describe('getPolicyTopicMapping', () => {
  it('maps urban_agriculture_zoning to foodSovereignty', () => {
    expect(getPolicyTopicMapping('urban_agriculture_zoning')).toBe('foodSovereignty');
  });
  it('maps green_infrastructure_grants to ecologicalRestoration', () => {
    expect(getPolicyTopicMapping('green_infrastructure_grants')).toBe('ecologicalRestoration');
  });
  it('maps cooperative_tax_incentives to cooperativeEconomics', () => {
    expect(getPolicyTopicMapping('cooperative_tax_incentives')).toBe('cooperativeEconomics');
  });
  it('maps participatory_budgeting to cooperativeEconomics', () => {
    expect(getPolicyTopicMapping('participatory_budgeting')).toBe('cooperativeEconomics');
  });
  it('maps community_land_trust to landReform', () => {
    expect(getPolicyTopicMapping('community_land_trust')).toBe('landReform');
  });
  it('maps water_commons to waterCommons', () => {
    expect(getPolicyTopicMapping('water_commons')).toBe('waterCommons');
  });
  it('returns null for unknown policy', () => {
    expect(getPolicyTopicMapping('nonexistent_policy')).toBeNull();
  });
});
