import type { GameState, Meters, ActiveProject } from '../state/types';
import { PROJECT_CATALOG } from '../data/content/project-catalog';

// ---------------------------------------------------------------------------
// Projection Types
// ---------------------------------------------------------------------------

export interface ProjectionEvent {
  turn: number;
  label: string;
  type: 'project' | 'election' | 'consequence' | 'arc';
}

export interface ProjectionResult {
  turns: number[];
  meters: Record<keyof Meters, number[]>;
  events: ProjectionEvent[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECTION_HORIZON = 12;
const ELECTION_TURN = 48;

// ---------------------------------------------------------------------------
// Simplified meter regen/decay (mirrors meters.ts logic but standalone)
// ---------------------------------------------------------------------------

function applySimplifiedFeedback(meters: Meters): Meters {
  const updated = { ...meters };

  // Will regen: base 1.0 + trust bonus + recovery boost
  const baseWillRegen = 1.0 + Math.max(0, (meters.communityTrust - 40) * 0.033);
  const recoveryBoost = meters.politicalWill < 15 ? (15 - meters.politicalWill) * 0.1 : 0;
  updated.politicalWill += baseWillRegen + recoveryBoost;

  // Food → trust bonus (capped at 0.2)
  const foodAboveThreshold = Math.max(0, meters.foodSovereignty - 20);
  const diminishingFood = foodAboveThreshold > 25 ? 25 + (foodAboveThreshold - 25) * 0.2 : foodAboveThreshold;
  const trustFoodBonus = Math.min(0.2, diminishingFood * 0.01);
  updated.communityTrust += trustFoodBonus;

  // Trust decay
  const baseDecay = 0.1 + meters.communityTrust * 0.004;
  const highTrustPenalty = meters.communityTrust > 70 ? (meters.communityTrust - 70) * 0.013 : 0;
  updated.communityTrust -= (baseDecay + highTrustPenalty);

  // Eco decay
  updated.ecologicalHealth -= 0.05;

  return updated;
}

// ---------------------------------------------------------------------------
// Clamping (matches meters.ts clampMeters)
// ---------------------------------------------------------------------------

function clamp(meters: Meters): Meters {
  return {
    communityTrust: Math.max(0, Math.min(100, meters.communityTrust)),
    ecologicalHealth: Math.max(0, Math.min(100, meters.ecologicalHealth)),
    foodSovereignty: Math.max(0, Math.min(100, meters.foodSovereignty)),
    politicalWill: Math.max(0, Math.min(100, meters.politicalWill)),
    budget: Math.max(0, meters.budget),
    climatePressure: Math.max(0, Math.min(100, meters.climatePressure)),
  };
}

// ---------------------------------------------------------------------------
// calculateProjections — the main entry point
// ---------------------------------------------------------------------------

/**
 * Simulates 12 turns forward from the current game state using simplified
 * meter math. Does NOT run the full resolve pipeline — this is meant for
 * the UI projection display showing where meters are heading.
 *
 * Accounts for:
 * - Base regen/decay rates each turn
 * - Project completion effects (tileEco, foodSov, trust, annualRevenue/12)
 * - Maintenance costs from already-completed projects
 * - Delayed consequence effects (only if foreshadowed — visible to player)
 * - Election turn marker
 */
export function calculateProjections(state: GameState): ProjectionResult {
  const turns: number[] = [];
  const meterArrays: Record<keyof Meters, number[]> = {
    communityTrust: [],
    ecologicalHealth: [],
    foodSovereignty: [],
    politicalWill: [],
    budget: [],
    climatePressure: [],
  };
  const events: ProjectionEvent[] = [];

  // Snapshot meters to iterate forward
  let currentMeters: Meters = { ...state.meters };

  // Collect all active projects across tiles with their remaining turns
  const activeProjects: Array<{ project: ActiveProject; definitionId: string }> = [];
  for (const tile of Object.values(state.tiles)) {
    for (const project of tile.activeProjects) {
      activeProjects.push({ project: { ...project }, definitionId: project.definitionId });
    }
  }

  // Calculate current maintenance drain from completed projects
  let maintenanceDrain = 0;
  for (const tile of Object.values(state.tiles)) {
    for (const projId of tile.completedProjects) {
      const def = PROJECT_CATALOG[projId];
      if (def && def.maintenanceCost > 0) {
        maintenanceDrain += def.maintenanceCost / 3;
      }
    }
  }

  // Collect foreshadowed delayed consequences visible to the player
  const visibleConsequences = (state.delayedConsequenceQueue ?? []).filter((dc) => {
    const hintTurn = dc.triggerTurn - dc.hintTurnsBeforeTrigger;
    return hintTurn <= state.turn;
  });

  // Simulate each turn
  for (let i = 1; i <= PROJECTION_HORIZON; i++) {
    const projectedTurn = state.turn + i;
    turns.push(projectedTurn);

    // 1. Apply base regen/decay
    currentMeters = applySimplifiedFeedback(currentMeters);

    // 2. Apply maintenance drain to budget
    currentMeters.budget -= maintenanceDrain;

    // 3. Check for project completions this turn
    for (const ap of activeProjects) {
      const turnsRemaining = ap.project.duration - ap.project.progress;
      if (turnsRemaining === i) {
        const def = PROJECT_CATALOG[ap.definitionId];
        if (def) {
          // Apply project effects (simplified — no synergies/byproducts in projection)
          currentMeters.ecologicalHealth += def.effects.tileEco * 0.25; // global eco contribution
          currentMeters.foodSovereignty += def.effects.foodSov;
          currentMeters.communityTrust += def.effects.trust;
          if (def.effects.annualRevenue > 0) {
            currentMeters.budget += def.effects.annualRevenue / 12;
          }

          // Add maintenance for newly completed project going forward
          if (def.maintenanceCost > 0) {
            maintenanceDrain += def.maintenanceCost / 3;
          }

          events.push({
            turn: projectedTurn,
            label: def.name,
            type: 'project',
          });
        }
      }
    }

    // 4. Apply delayed consequence effects
    for (const dc of visibleConsequences) {
      if (dc.triggerTurn === projectedTurn) {
        for (const effect of dc.effects) {
          if (effect.type === 'meterDelta') {
            const meter = effect.meter as keyof Meters;
            if (meter in currentMeters) {
              currentMeters[meter] += effect.amount;
            }
          }
        }
        events.push({
          turn: projectedTurn,
          label: dc.foreshadowHint,
          type: 'consequence',
        });
      }
    }

    // 5. Election turn marker
    if (projectedTurn === ELECTION_TURN) {
      events.push({
        turn: projectedTurn,
        label: 'Election',
        type: 'election',
      });
    }

    // 6. Clamp and record
    currentMeters = clamp(currentMeters);

    meterArrays.communityTrust.push(currentMeters.communityTrust);
    meterArrays.ecologicalHealth.push(currentMeters.ecologicalHealth);
    meterArrays.foodSovereignty.push(currentMeters.foodSovereignty);
    meterArrays.politicalWill.push(currentMeters.politicalWill);
    meterArrays.budget.push(currentMeters.budget);
    meterArrays.climatePressure.push(currentMeters.climatePressure);
  }

  return { turns, meters: meterArrays, events };
}
