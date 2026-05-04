import type { GameState, Season, MeterDelta, TurnSummary } from '../state/types';
import { applyMeterFeedback, clampMeters, calculateMaxProjects } from './meters';
import { advanceProjects, decayGentrification } from './projects';
import { generateProposals } from './proposals';
import { PROJECT_CATALOG } from '../data/content/project-catalog';
import { POLICY_CATALOG } from '../data/content/policy-catalog';
import { applyPolicyDrain } from './policies';
import {
  applyOpinionDrift,
  generateCounterNarrative,
  applyCounterNarrative,
  resetNarrativeActions,
} from './narrative';
import {
  applyLeaderTrustDecay,
  calculateLeaderTrustMeterBonus,
  calculateCouncilWillBonus,
} from './relationships';
import {
  updateEventCooldowns,
  checkAntagonistActivation,
  escalateAntagonists,
  generateEvents,
} from './events';
import { checkTippingPoints, applySeasonalEffects, generateClimateEvent } from './climate';
import { applyProgressionEffects } from './progression';

// ---------------------------------------------------------------------------
// Season helpers
// ---------------------------------------------------------------------------

const SEASON_ORDER: Season[] = ['spring', 'summer', 'fall', 'winter'];

function nextSeason(current: Season): { season: Season; yearIncrement: number } {
  const idx = SEASON_ORDER.indexOf(current);
  if (idx === SEASON_ORDER.length - 1) {
    return { season: 'spring', yearIncrement: 1 };
  }
  return { season: SEASON_ORDER[idx + 1], yearIncrement: 0 };
}

// ---------------------------------------------------------------------------
// resolveTurn — the 10-step resolve pipeline
// ---------------------------------------------------------------------------

export function resolveTurn(state: GameState, rng: () => number = Math.random): GameState {
  const allDeltas: MeterDelta[] = [];
  const completedProjectNames: string[] = [];

  let current: GameState = state;

  // Step 1: Climate tick
  // climatePressure += 0.92 * (1 + (year-1) * 0.03)
  {
    const climateIncrease = 0.92 * (1 + (current.year - 1) * 0.03);
    const newClimatePressure = Math.min(100, current.meters.climatePressure + climateIncrease);
    allDeltas.push({
      meter: 'climatePressure',
      amount: climateIncrease,
      source: 'climate_tick',
    });
    current = {
      ...current,
      meters: {
        ...current.meters,
        climatePressure: newClimatePressure,
      },
    };
  }

  // Step 2: Climate events — tipping points + seasonal effects
  {
    const { triggered, updatedState: tippingState } = checkTippingPoints(current);
    current = tippingState;
    for (const tp of triggered) {
      allDeltas.push(...tp.meterDeltas);
    }

    // Generate climate event (may or may not fire based on probability)
    const climateEvent = generateClimateEvent(current, current.season, rng);
    if (climateEvent) {
      current = {
        ...current,
        eventQueue: [...current.eventQueue, climateEvent],
      };
    }
  }

  // Step 3: Seasonal effects
  {
    const { state: seasonalState, deltas: seasonalDeltas } = applySeasonalEffects(current, rng);
    current = seasonalState;
    allDeltas.push(...seasonalDeltas);
  }

  // Step 4: Project progress
  {
    const { state: advancedState, deltas: projectDeltas } = advanceProjects(current);
    current = advancedState;
    allDeltas.push(...projectDeltas);

    // Collect completed project names for the summary
    for (const tileId of Object.keys(current.tiles)) {
      const tile = current.tiles[tileId];
      // Compare with the original state to find newly completed projects
      const originalTile = state.tiles[tileId];
      if (originalTile) {
        for (const projId of tile.completedProjects) {
          if (!originalTile.completedProjects.includes(projId)) {
            const def = PROJECT_CATALOG[projId];
            completedProjectNames.push(def ? def.name : projId);
          }
        }
      }
    }
  }

  // Step 5: Policy effects — drain Will for active policies
  {
    const { state: drainedState, deltas: policyDeltas } = applyPolicyDrain(current, POLICY_CATALOG);
    current = drainedState;
    allDeltas.push(...policyDeltas);
  }

  // Step 6: Narrative drift — opinion drift + counter-narrative
  {
    // Apply opinion drift
    const driftedOpinion = applyOpinionDrift(current.publicOpinion, current.narrativeState);
    current = {
      ...current,
      publicOpinion: driftedOpinion,
    };

    // Maybe generate a counter-narrative
    const counter = generateCounterNarrative(current, rng);
    if (counter) {
      const { state: counterState, deltas: counterDeltas } = applyCounterNarrative(current, counter);
      current = counterState;
      allDeltas.push(...counterDeltas);
    }
  }

  // Step 7: Meter feedback
  {
    const { meters: updatedMeters, deltas: feedbackDeltas } = applyMeterFeedback(current.meters);
    current = {
      ...current,
      meters: updatedMeters,
    };
    allDeltas.push(...feedbackDeltas);
  }

  // Step 8: Budget replenishment
  // On spring turns when turn > 1 (start of a new year)
  {
    if (current.season === 'spring' && state.turn > 1) {
      const eco = current.meters.ecologicalHealth;
      const trust = current.meters.communityTrust;
      const baseReplenishment = 1.5 * (0.5 + eco * 0.005 + trust * 0.003);

      allDeltas.push({
        meter: 'budget',
        amount: baseReplenishment,
        source: 'annual_replenishment',
      });

      // Annual revenue from completed projects
      let annualRevenue = 0;
      for (const tileId of Object.keys(current.tiles)) {
        const tile = current.tiles[tileId];
        for (const projId of tile.completedProjects) {
          const def = PROJECT_CATALOG[projId];
          if (def && def.effects.annualRevenue > 0) {
            annualRevenue += def.effects.annualRevenue;
          }
        }
      }

      if (annualRevenue > 0) {
        allDeltas.push({
          meter: 'budget',
          amount: annualRevenue,
          source: 'annual_revenue',
        });
      }

      // Policy budget bonuses (e.g. cooperative_tax_incentives: +$0.15M)
      let policyBudgetBonus = 0;
      for (const ap of current.activePolicies) {
        const policyDef = POLICY_CATALOG[ap.definitionId];
        if (policyDef && policyDef.effects.budgetBonus > 0) {
          policyBudgetBonus += policyDef.effects.budgetBonus;
        }
      }

      if (policyBudgetBonus > 0) {
        allDeltas.push({
          meter: 'budget',
          amount: policyBudgetBonus,
          source: 'policy_budget_bonus',
        });
      }

      current = {
        ...current,
        meters: {
          ...current.meters,
          budget: current.meters.budget + baseReplenishment + annualRevenue + policyBudgetBonus,
        },
      };
    }
  }

  // Step 9: Counter-narrative generation — merged into step 6
  // Step 10: Progression — stage transitions and path bonuses
  {
    current = applyProgressionEffects(current);
  }

  // Post-steps: leader trust decay, meter bonuses from relationships, event cooldowns, antagonists
  {
    // Leader trust decay
    const decayedLeaders = applyLeaderTrustDecay(current.leaders);
    current = { ...current, leaders: decayedLeaders };

    // Leader trust meter bonus -> community trust
    const leaderTrustBonus = calculateLeaderTrustMeterBonus(current.leaders);
    if (leaderTrustBonus !== 0) {
      allDeltas.push({
        meter: 'communityTrust',
        amount: leaderTrustBonus,
        source: 'leader_trust_bonus',
      });
      current = {
        ...current,
        meters: {
          ...current.meters,
          communityTrust: current.meters.communityTrust + leaderTrustBonus,
        },
      };
    }

    // Council Will bonus -> political will
    const councilWillBonus = calculateCouncilWillBonus(current.councilMembers);
    if (councilWillBonus !== 0) {
      allDeltas.push({
        meter: 'politicalWill',
        amount: councilWillBonus,
        source: 'council_will_bonus',
      });
      current = {
        ...current,
        meters: {
          ...current.meters,
          politicalWill: current.meters.politicalWill + councilWillBonus,
        },
      };
    }

    // Update event cooldowns
    current = {
      ...current,
      eventCooldowns: updateEventCooldowns(current.eventCooldowns),
    };

    // Check antagonist activation
    const activatedAntagonists = checkAntagonistActivation(current);
    current = { ...current, antagonists: activatedAntagonists };

    // Escalate active antagonists
    const { antagonists: escalatedAntagonists, events: antagonistEvents } = escalateAntagonists(current);
    current = {
      ...current,
      antagonists: escalatedAntagonists,
      eventQueue: [...current.eventQueue, ...antagonistEvents],
    };
  }

  // Post-steps: clamp meters, decay gentrification, recalculate maxConcurrentProjects
  const clampedMeters = clampMeters(current.meters);
  const decayedTiles = decayGentrification(current.tiles);
  const maxConcurrentProjects = calculateMaxProjects(clampedMeters.communityTrust);

  // Advance season and turn
  const { season: newSeason, yearIncrement } = nextSeason(current.season);
  const newYear = current.year + yearIncrement;
  const newTurn = state.turn + 1;

  // Build TurnSummary
  const turnSummary: TurnSummary = {
    turn: state.turn,
    season: state.season,
    year: state.year,
    deltas: allDeltas,
    completedProjects: completedProjectNames,
    proposals: current.activeProposals,
    tileTransformations: [],
  };

  return {
    ...current,
    meters: clampedMeters,
    tiles: decayedTiles,
    maxConcurrentProjects,
    season: newSeason,
    year: newYear,
    turn: newTurn,
    turnSummary,
    turnHistory: [...state.turnHistory, turnSummary],
  };
}

// ---------------------------------------------------------------------------
// prepareTurn — called at the start of each turn
// ---------------------------------------------------------------------------

export function prepareTurn(state: GameState, rng: () => number = Math.random): GameState {
  // Reset narrative actions for the new turn
  let current = resetNarrativeActions(state);

  // Generate events for the turn
  const newEvents = generateEvents(current, rng);
  current = {
    ...current,
    eventQueue: [...current.eventQueue, ...newEvents],
  };

  // Generate proposals from eligible leaders
  const newProposals = generateProposals(current);

  // Move pending proposals to active and merge with newly generated
  const activeProposals = [...current.pendingProposals, ...newProposals];

  return {
    ...current,
    activeProposals,
    pendingProposals: [],
  };
}
