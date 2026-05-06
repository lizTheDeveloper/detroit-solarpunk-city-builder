import { describe, it, expect } from 'vitest';
import {
  createDependencyWeb,
  addCondition,
  removeCondition,
  hasCondition,
  getCapacity,
  modifyCapacity,
  serializeDependencyWeb,
  deserializeDependencyWeb,
} from './dependency-web';

describe('dependency-web', () => {
  describe('createDependencyWeb', () => {
    it('creates an empty web with no conditions or capacities', () => {
      const web = createDependencyWeb();
      expect(web.conditions.size).toBe(0);
      expect(web.capacities.size).toBe(0);
    });
  });

  describe('conditions', () => {
    it('adds a condition', () => {
      const web = createDependencyWeb();
      const updated = addCondition(web, 'accepted_dte_grid_plan');
      expect(hasCondition(updated, 'accepted_dte_grid_plan')).toBe(true);
    });

    it('does not mutate original web when adding', () => {
      const web = createDependencyWeb();
      addCondition(web, 'accepted_dte_grid_plan');
      expect(hasCondition(web, 'accepted_dte_grid_plan')).toBe(false);
    });

    it('removes a condition', () => {
      let web = createDependencyWeb();
      web = addCondition(web, 'union_support');
      web = removeCondition(web, 'union_support');
      expect(hasCondition(web, 'union_support')).toBe(false);
    });

    it('removing a non-existent condition is a no-op', () => {
      const web = createDependencyWeb();
      const updated = removeCondition(web, 'nonexistent');
      expect(updated.conditions.size).toBe(0);
    });

    it('supports multiple conditions', () => {
      let web = createDependencyWeb();
      web = addCondition(web, 'accepted_dte_grid_plan');
      web = addCondition(web, 'union_support');
      web = addCondition(web, 'has_community_solar');
      expect(hasCondition(web, 'accepted_dte_grid_plan')).toBe(true);
      expect(hasCondition(web, 'union_support')).toBe(true);
      expect(hasCondition(web, 'has_community_solar')).toBe(true);
      expect(web.conditions.size).toBe(3);
    });

    it('adding the same condition twice does not duplicate', () => {
      let web = createDependencyWeb();
      web = addCondition(web, 'union_support');
      web = addCondition(web, 'union_support');
      expect(web.conditions.size).toBe(1);
    });

    it('cross-arc conditions are shared in the same web', () => {
      let web = createDependencyWeb();
      // Energy arc creates a condition
      web = addCondition(web, 'accepted_dte_grid_plan');
      // Water arc checks for it
      expect(hasCondition(web, 'accepted_dte_grid_plan')).toBe(true);
    });
  });

  describe('capacities', () => {
    it('returns 0 for unset capacity', () => {
      const web = createDependencyWeb();
      expect(getCapacity(web, 'grid_resilience')).toBe(0);
    });

    it('modifies capacity by positive delta', () => {
      const web = createDependencyWeb();
      const updated = modifyCapacity(web, 'grid_resilience', 3);
      expect(getCapacity(updated, 'grid_resilience')).toBe(3);
    });

    it('modifies capacity by negative delta', () => {
      let web = createDependencyWeb();
      web = modifyCapacity(web, 'grid_resilience', 5);
      web = modifyCapacity(web, 'grid_resilience', -2);
      expect(getCapacity(web, 'grid_resilience')).toBe(3);
    });

    it('does not mutate original web', () => {
      const web = createDependencyWeb();
      modifyCapacity(web, 'grid_resilience', 5);
      expect(getCapacity(web, 'grid_resilience')).toBe(0);
    });

    it('supports multiple capacities independently', () => {
      let web = createDependencyWeb();
      web = modifyCapacity(web, 'grid_resilience', 3);
      web = modifyCapacity(web, 'food_processing', 1);
      expect(getCapacity(web, 'grid_resilience')).toBe(3);
      expect(getCapacity(web, 'food_processing')).toBe(1);
    });

    it('allows negative capacity values', () => {
      let web = createDependencyWeb();
      web = modifyCapacity(web, 'grid_resilience', -2);
      expect(getCapacity(web, 'grid_resilience')).toBe(-2);
    });
  });

  describe('serialization', () => {
    it('serializes empty web', () => {
      const web = createDependencyWeb();
      const serialized = serializeDependencyWeb(web);
      expect(serialized).toEqual({ conditions: [], capacities: {} });
    });

    it('serializes conditions and capacities', () => {
      let web = createDependencyWeb();
      web = addCondition(web, 'accepted_dte_grid_plan');
      web = addCondition(web, 'community_solar_proposal');
      web = modifyCapacity(web, 'grid_resilience', 3);

      const serialized = serializeDependencyWeb(web);
      expect(serialized.conditions).toContain('accepted_dte_grid_plan');
      expect(serialized.conditions).toContain('community_solar_proposal');
      expect(serialized.conditions.length).toBe(2);
      expect(serialized.capacities).toEqual({ grid_resilience: 3 });
    });

    it('deserializes back to a working DependencyWeb', () => {
      const serialized = {
        conditions: ['accepted_dte_grid_plan', 'union_support'],
        capacities: { grid_resilience: 3, food_processing: 1 },
      };

      const web = deserializeDependencyWeb(serialized);
      expect(hasCondition(web, 'accepted_dte_grid_plan')).toBe(true);
      expect(hasCondition(web, 'union_support')).toBe(true);
      expect(getCapacity(web, 'grid_resilience')).toBe(3);
      expect(getCapacity(web, 'food_processing')).toBe(1);
    });

    it('round-trips correctly', () => {
      let web = createDependencyWeb();
      web = addCondition(web, 'has_community_solar');
      web = modifyCapacity(web, 'grid_resilience', 7);

      const roundTripped = deserializeDependencyWeb(serializeDependencyWeb(web));
      expect(hasCondition(roundTripped, 'has_community_solar')).toBe(true);
      expect(getCapacity(roundTripped, 'grid_resilience')).toBe(7);
    });
  });
});
