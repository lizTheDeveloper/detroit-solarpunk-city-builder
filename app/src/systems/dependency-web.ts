import type { DependencyWeb, SerializedDependencyWeb } from '../state/crisis-types';

// ---------------------------------------------------------------------------
// Dependency Web
// ---------------------------------------------------------------------------
// A flat condition set + numeric capacity map. The "web" emerges from arc
// templates referencing each other's conditions — template A creates condition
// X, template B gates a choice on condition X existing.
// ---------------------------------------------------------------------------

/**
 * Create an empty dependency web.
 */
export function createDependencyWeb(): DependencyWeb {
  return {
    conditions: new Set(),
    capacities: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Condition operations
// ---------------------------------------------------------------------------

/**
 * Add a named condition to the dependency web.
 * Returns a new DependencyWeb (immutable style).
 */
export function addCondition(web: DependencyWeb, condition: string): DependencyWeb {
  const conditions = new Set(web.conditions);
  conditions.add(condition);
  return { ...web, conditions };
}

/**
 * Remove a named condition from the dependency web.
 * Returns a new DependencyWeb. No-op if condition doesn't exist.
 */
export function removeCondition(web: DependencyWeb, condition: string): DependencyWeb {
  const conditions = new Set(web.conditions);
  conditions.delete(condition);
  return { ...web, conditions };
}

/**
 * Check if a condition exists in the dependency web.
 */
export function hasCondition(web: DependencyWeb, condition: string): boolean {
  return web.conditions.has(condition);
}

// ---------------------------------------------------------------------------
// Capacity operations
// ---------------------------------------------------------------------------

/**
 * Get the current value of a named capacity. Returns 0 if not set.
 */
export function getCapacity(web: DependencyWeb, capacity: string): number {
  return web.capacities.get(capacity) ?? 0;
}

/**
 * Modify a capacity by a delta amount. Creates the capacity if it doesn't exist.
 * Returns a new DependencyWeb.
 */
export function modifyCapacity(web: DependencyWeb, capacity: string, delta: number): DependencyWeb {
  const capacities = new Map(web.capacities);
  const current = capacities.get(capacity) ?? 0;
  capacities.set(capacity, current + delta);
  return { ...web, capacities };
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Serialize a DependencyWeb to a plain object for JSON storage.
 * Sets become arrays, Maps become Records.
 */
export function serializeDependencyWeb(web: DependencyWeb): SerializedDependencyWeb {
  return {
    conditions: Array.from(web.conditions),
    capacities: Object.fromEntries(web.capacities),
  };
}

/**
 * Deserialize a plain object back into a DependencyWeb with proper Set/Map types.
 */
export function deserializeDependencyWeb(data: SerializedDependencyWeb): DependencyWeb {
  return {
    conditions: new Set(data.conditions),
    capacities: new Map(Object.entries(data.capacities)),
  };
}
