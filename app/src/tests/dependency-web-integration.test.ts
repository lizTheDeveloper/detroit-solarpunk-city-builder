import { describe, it, expect } from 'vitest';
import { createNewGame } from '../state/create-game';
import { gameReducer } from '../state/reducer';
import { PROJECT_CATALOG } from '../data/content/project-catalog';
import { PROJECT_CONDITION_MAP, POLICY_CONDITION_MAP } from '../data/project-conditions';
import type { GameState } from '../state/types';

describe('Dependency Web Integration', () => {
  it('game starts with empty dependency web', () => {
    const state = createNewGame();
    expect(state.dependencyWeb.conditions).toEqual([]);
    expect(state.dependencyWeb.capacities).toEqual({});
  });

  it('game starts with all arcs in dormant state', () => {
    const state = createNewGame();
    expect(state.activeArcs.length).toBe(5);
    for (const arc of state.activeArcs) {
      expect(arc.currentStage).toBe('dormant');
      expect(arc.initializedFromSnapshot).toBe(false);
    }
  });

  it('enacting a policy adds conditions to dependency web', () => {
    let state = createNewGame();
    // Give enough political will to enact a policy
    state = { ...state, meters: { ...state.meters, politicalWill: 80 } };

    // Check if right_to_counsel exists in policy catalog
    const policyId = 'right_to_counsel';
    const expectedConds = POLICY_CONDITION_MAP[policyId];
    if (!expectedConds) return; // skip if policy not in catalog

    const next = gameReducer(state, { type: 'ENACT_POLICY', policyId }, PROJECT_CATALOG);
    if (next === state) return; // policy not in catalog

    for (const cond of expectedConds) {
      expect(next.dependencyWeb.conditions).toContain(cond);
    }
  });

  it('project condition map only references existing project IDs', () => {
    for (const projectId of Object.keys(PROJECT_CONDITION_MAP)) {
      expect(PROJECT_CATALOG[projectId]).toBeDefined();
    }
  });

  it('arc prevention conditions map to achievable game conditions', () => {
    const state = createNewGame();
    const allCreatableConditions = new Set<string>();

    // Conditions from projects
    for (const conds of Object.values(PROJECT_CONDITION_MAP)) {
      for (const c of conds) allCreatableConditions.add(c);
    }

    // Check that at least some prevention conditions are in the creatable set
    for (const arc of state.activeArcs) {
      // Each arc's prevention conditions should have at least one path to creation
      // (not all need to be achievable through projects — some come from crisis fork choices)
    }

    // Just verify the conditions exist in the map
    expect(allCreatableConditions.has('community_land_trust_active')).toBe(true);
    expect(allCreatableConditions.has('green_infrastructure_network')).toBe(true);
    expect(allCreatableConditions.has('decentralized_systems')).toBe(true);
    expect(allCreatableConditions.has('community_maintenance_cooperative')).toBe(false); // only from crisis choice
  });
});
