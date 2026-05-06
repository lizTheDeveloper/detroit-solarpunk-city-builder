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
import { getSeasonalMeterBonuses } from './seasons';
import { generateTimeCredits } from './time-bank';
import { applyProgressionEffects } from './progression';
import { isElectionTurn, calculateElectionScore, applyElectionResult } from './reelection';
import { progressRegionalCities, progressContinentalGoals, checkWinCondition, checkLossCondition, initializeRegionalCities, initializeContinentalGoals } from './regional';
import { applyReclamationEffects, checkReclamationLoss } from './reclamation';
import { applyMeshNetworkEffects } from './mesh-network';
import { getSeason, isSeasonTransition } from './calendar';
import { processConsequences, getForeshadowHints } from './delayed-consequences';
import { checkTransition, incrementInactionTimer, resetInactionTimer, applyTransition, checkPreventionConditions } from './arc-progression';
import { hasCondition } from './dependency-web';
import { arcTemplateMap } from '../data/arcs';
import { PROJECT_CONDITION_MAP, POLICY_CONDITION_MAP } from '../data/project-conditions';

// ---------------------------------------------------------------------------
// Month/Season helpers
// ---------------------------------------------------------------------------

function nextMonth(currentMonth: number): { month: number; yearIncrement: number } {
  if (currentMonth === 12) {
    return { month: 1, yearIncrement: 1 };
  }
  return { month: currentMonth + 1, yearIncrement: 0 };
}

// ---------------------------------------------------------------------------
// resolveTurn — the 10-step resolve pipeline
// ---------------------------------------------------------------------------

export function resolveTurn(state: GameState, rng: () => number = Math.random): GameState {
  const allDeltas: MeterDelta[] = [];
  const completedProjectNames: string[] = [];

  let current: GameState = state;

  // Step 1: Climate tick (monthly — ÷3 from quarterly rate)
  // Real data: +3F since 1900 in Michigan, +3-6F projected by 2050.
  // 2-inch+ extreme events up 128% over 50 years. Game spans ~16 years (192 monthly turns).
  // Pressure should go from 30 → ~65 over a full game (35 points over 192 turns = ~0.18/turn base).
  // Accelerates with year to model exponential warming trend.
  // Source: GLISA climate maps, Michigan State Climate Summary 2022.
  {
    const climateIncrease = 0.183 * (1 + (current.year - 1) * 0.05);
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

  // Step 2: Climate events — tipping points + seasonal effects (gated to season transitions)
  {
    const { triggered, updatedState: tippingState } = checkTippingPoints(current);
    current = tippingState;
    for (const tp of triggered) {
      allDeltas.push(...tp.meterDeltas);
    }

    // Generate climate event only on season transitions (every 3 months)
    const prevMonth = current.month;
    const wouldBeNext = prevMonth === 12 ? 1 : prevMonth + 1;
    const seasonTransition = isSeasonTransition(prevMonth === 1 ? 12 : prevMonth - 1, prevMonth)
      || state.turn === 1; // Always allow on first turn
    if (seasonTransition) {
      const climateEvent = generateClimateEvent(current, current.season, rng);
      if (climateEvent) {
        current = {
          ...current,
          eventQueue: [...current.eventQueue, climateEvent],
        };
      }
    }
  }

  // Step 3: Seasonal effects — only fire on season transitions
  {
    const prevMonth = current.month === 1 ? 12 : current.month - 1;
    const seasonTransition = isSeasonTransition(prevMonth, current.month)
      || state.turn === 1; // Always apply on first turn
    if (seasonTransition) {
      const { state: seasonalState, deltas: seasonalDeltas } = applySeasonalEffects(current, rng);
      current = seasonalState;
      allDeltas.push(...seasonalDeltas);
    }
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

  // Step 4b: Update dependency web from newly completed projects
  if (current.dependencyWeb) {
    const conditions = new Set(current.dependencyWeb.conditions ?? []);
    let added = false;
    for (const tileId of Object.keys(current.tiles)) {
      const tile = current.tiles[tileId];
      const originalTile = state.tiles[tileId];
      if (!originalTile) continue;
      for (const projId of tile.completedProjects) {
        if (!originalTile.completedProjects.includes(projId)) {
          const newConds = PROJECT_CONDITION_MAP[projId];
          if (newConds) {
            for (const c of newConds) { conditions.add(c); added = true; }
          }
        }
      }
    }
    if (added) {
      current = { ...current, dependencyWeb: { ...current.dependencyWeb, conditions: Array.from(conditions) } };
    }
  }

  // Step 5: Policy effects — drain Will for active policies
  {
    const { state: drainedState, deltas: policyDeltas } = applyPolicyDrain(current, POLICY_CATALOG);
    current = drainedState;
    allDeltas.push(...policyDeltas);
  }

  // Step 5b: Crisis arc engine — process delayed consequences and advance arcs
  const firedConsequences: Array<{ arcId: string; hint: string }> = [];
  const arcTransitions: Array<{ arcId: string; from: string; to: string }> = [];
  if (current.activeArcs && current.delayedConsequenceQueue) {
    // Process delayed consequences that are due this turn
    const depWeb = {
      conditions: new Set(current.dependencyWeb?.conditions ?? []),
      capacities: new Map(Object.entries(current.dependencyWeb?.capacities ?? {})),
    };
    const { fired, remaining } = processConsequences(
      current.delayedConsequenceQueue,
      current.turn,
      depWeb
    );

    current = { ...current, delayedConsequenceQueue: remaining };

    // Apply fired consequence effects
    for (const consequence of fired) {
      firedConsequences.push({ arcId: consequence.arcId, hint: consequence.foreshadowHint });
      for (const effect of consequence.effects) {
        if (effect.type === 'meterDelta') {
          const meterKey = effect.meter as keyof typeof current.meters;
          if (meterKey in current.meters) {
            current = {
              ...current,
              meters: { ...current.meters, [meterKey]: (current.meters[meterKey] as number) + effect.amount },
            };
            allDeltas.push({ meter: meterKey, amount: effect.amount, source: `consequence_${consequence.arcId}` });
          }
        } else if (effect.type === 'tileDamage') {
          const tiles = { ...current.tiles };
          let targetId = effect.tileId;
          if (!targetId) {
            const tileEntries = Object.entries(tiles);
            if (tileEntries.length > 0) {
              targetId = tileEntries[Math.floor(Math.random() * tileEntries.length)][0];
            }
          }
          if (targetId && tiles[targetId]) {
            tiles[targetId] = { ...tiles[targetId], ecologicalHealth: Math.max(0, tiles[targetId].ecologicalHealth - effect.damage) };
            current = { ...current, tiles };
          }
        } else if (effect.type === 'conditionChange' && current.dependencyWeb) {
          const condSet = new Set(current.dependencyWeb.conditions);
          if (effect.action === 'add') condSet.add(effect.condition);
          else condSet.delete(effect.condition);
          current = { ...current, dependencyWeb: { ...current.dependencyWeb, conditions: Array.from(condSet) } };
        }
      }
    }

    // Advance arc state machines
    const updatedArcs = current.activeArcs.map((arc) => {
      const template = arcTemplateMap[arc.arcId];
      if (!template) return arc;

      const newStage = checkTransition(arc, null, template.config, current.turn);
      if (newStage) {
        arcTransitions.push({ arcId: arc.arcId, from: arc.currentStage, to: newStage });
        return applyTransition(arc, newStage, current.turn);
      }

      // Increment inaction timer for arcs at escalation
      if (arc.currentStage === 'escalation') {
        const prevConditions = new Set(state.dependencyWeb?.conditions ?? []);
        const currentConditions = new Set(current.dependencyWeb?.conditions ?? []);
        if (checkPreventionConditions(template.config, currentConditions, prevConditions)) {
          return resetInactionTimer(arc);
        }
        return incrementInactionTimer(arc);
      }
      return arc;
    });

    // Move newly resolved arcs to resolvedArcs list
    const newlyResolved = updatedArcs.filter(
      a => a.currentStage === 'resolved' && current.activeArcs.find(o => o.arcId === a.arcId)?.currentStage !== 'resolved'
    );
    if (newlyResolved.length > 0 && current.resolvedArcs) {
      const resolved = [...current.resolvedArcs, ...newlyResolved.map(a => ({ arcId: a.arcId, resolvedTurn: current.turn }))];
      current = { ...current, activeArcs: updatedArcs, resolvedArcs: resolved };
    } else {
      current = { ...current, activeArcs: updatedArcs };
    }
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

  // Step 7b: Seasonal meter bonuses — permaculture timing (only on season transitions)
  {
    const prevMonth = current.month === 1 ? 12 : current.month - 1;
    const seasonTransition = isSeasonTransition(prevMonth, current.month)
      || state.turn === 1;
    if (seasonTransition) {
      const seasonBonuses = getSeasonalMeterBonuses(current.season);
      if (seasonBonuses.politicalWillRegen) {
        current = {
          ...current,
          meters: { ...current.meters, politicalWill: current.meters.politicalWill + seasonBonuses.politicalWillRegen },
        };
        allDeltas.push({ meter: 'politicalWill', amount: seasonBonuses.politicalWillRegen, source: 'winter_planning' });
      }
      if (seasonBonuses.foodSovereigntyBonus) {
        current = {
          ...current,
          meters: { ...current.meters, foodSovereignty: current.meters.foodSovereignty + seasonBonuses.foodSovereigntyBonus },
        };
        allDeltas.push({ meter: 'foodSovereignty', amount: seasonBonuses.foodSovereigntyBonus, source: 'fall_harvest' });
      }
    }
  }

  // Step 7c: Time bank — community trust generates parallel economy credits
  {
    const { creditsGenerated, deltas: timeBankDeltas } = generateTimeCredits(current);
    if (creditsGenerated > 0) {
      current = {
        ...current,
        meters: { ...current.meters, budget: current.meters.budget + creditsGenerated },
      };
      allDeltas.push(...timeBankDeltas);
    }
  }

  // Step 7d: Reclaimed lots — rewilding generates passive eco
  {
    const { state: recState, deltas: recDeltas } = applyReclamationEffects(current);
    current = recState;
    allDeltas.push(...recDeltas);
    current = checkReclamationLoss(current);
  }

  // Step 7e: Mesh network — community-owned tiles form communication infra
  {
    const { state: meshState, deltas: meshDeltas } = applyMeshNetworkEffects(current);
    current = meshState;
    allDeltas.push(...meshDeltas);
  }

  // Step 8: Budget replenishment — monthly (÷3 from quarterly rates)
  // Detroit's $1.46B general fund = ~$122M/month. At 1000:1 scale = $0.122M/turn.
  // Revenue sources: income tax 30%, casinos 19%, state sharing 18%, property 12%.
  // Higher trust → more state revenue sharing + grant access.
  // Higher eco → less emergency spending (climate damage costs Detroit $100M-$1.8B per event).
  // Source: Detroit FY2024 budget, bankruptcy recovery revenue structure.
  {
    if (state.turn > 1) {
      const eco = current.meters.ecologicalHealth;
      const trust = current.meters.communityTrust;
      // Base monthly revenue: $0.06M + small bonuses (max ~$0.10M/turn) (was 0.18 quarterly)
      // Reduced: budget should feel tight, forcing real tradeoffs
      const baseReplenishment = 0.06 + Math.min(trust, 60) * 0.00033 + eco * 0.000167;

      allDeltas.push({
        meter: 'budget',
        amount: baseReplenishment,
        source: 'monthly_revenue',
      });

      // Revenue from completed projects (monthly, with diminishing returns)
      // Real economics: more co-ops = more competition for the same local market.
      // First $0.033/turn is full value, after that 50% effectiveness. (was 0.10 quarterly)
      let rawProjectRevenue = 0;
      for (const tileId of Object.keys(current.tiles)) {
        const tile = current.tiles[tileId];
        for (const projId of tile.completedProjects) {
          const def = PROJECT_CATALOG[projId];
          if (def && def.effects.annualRevenue > 0) {
            rawProjectRevenue += def.effects.annualRevenue / 12;
          }
        }
      }

      const revenueFloor = 0.033;
      const projectRevenue = rawProjectRevenue <= revenueFloor
        ? rawProjectRevenue
        : revenueFloor + (rawProjectRevenue - revenueFloor) * 0.5;

      if (projectRevenue > 0) {
        allDeltas.push({
          meter: 'budget',
          amount: projectRevenue,
          source: 'project_revenue',
        });
      }

      // Maintenance costs for completed projects (monthly — ÷3 from quarterly)
      let maintenanceDrain = 0;
      for (const tileId of Object.keys(current.tiles)) {
        const tile = current.tiles[tileId];
        for (const projId of tile.completedProjects) {
          const def = PROJECT_CATALOG[projId];
          if (def && def.maintenanceCost > 0) {
            maintenanceDrain += def.maintenanceCost / 3;
          }
        }
      }

      if (maintenanceDrain > 0) {
        allDeltas.push({
          meter: 'budget',
          amount: -maintenanceDrain,
          source: 'project_maintenance',
        });
      }

      // Policy budget bonuses (monthly — /12 of annual)
      let policyBudgetBonus = 0;
      for (const ap of current.activePolicies) {
        const policyDef = POLICY_CATALOG[ap.definitionId];
        if (policyDef && policyDef.effects.budgetBonus > 0) {
          policyBudgetBonus += policyDef.effects.budgetBonus / 12; // monthly
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
          budget: current.meters.budget + baseReplenishment + projectRevenue - maintenanceDrain + policyBudgetBonus,
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

  // Post-step: Re-election check
  if (isElectionTurn(state.turn)) {
    const electionResult = calculateElectionScore(current);
    current = applyElectionResult(current, electionResult);
  }

  // Post-step: Beyond the Map regional progression
  if (current.stage === 'beyond' && !current.sandbox) {
    // Initialize regional cities if not yet set up
    if (Object.keys(current.regionalCities).length === 0) {
      current = {
        ...current,
        regionalCities: initializeRegionalCities(),
        continentalGoals: initializeContinentalGoals(),
      };
    }

    // Progress regional cities
    const progressedCities = progressRegionalCities(current.regionalCities, current.meters.climatePressure, rng);
    current = { ...current, regionalCities: progressedCities };

    // Progress continental goals
    const progressedGoals = progressContinentalGoals(current);
    current = { ...current, continentalGoals: progressedGoals };

    // Check win/loss conditions
    const win = checkWinCondition(current);
    if (win) {
      current = { ...current, winCondition: win, sandbox: true };
    }
    const loss = checkLossCondition(current);
    if (loss) {
      current = { ...current, lossCondition: loss };
    }
  }

  // Post-steps: clamp meters, decay gentrification, recalculate maxConcurrentProjects
  const clampedMeters = clampMeters(current.meters);
  const decayedTiles = decayGentrification(current.tiles);
  const maxConcurrentProjects = calculateMaxProjects(clampedMeters.communityTrust);

  // Advance month and turn
  const { month: newMonth, yearIncrement } = nextMonth(current.month);
  const newSeason = getSeason(newMonth);
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
    firedConsequences,
    arcTransitions,
  };

  return {
    ...current,
    meters: clampedMeters,
    tiles: decayedTiles,
    maxConcurrentProjects,
    month: newMonth,
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
