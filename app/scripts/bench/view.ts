/**
 * Builds the structured TurnView from raw game state — the single source of
 * truth for the legal action space. Archetypes read the structured form;
 * LLM agents get a text rendering derived from the same view (see models.ts),
 * so the two never disagree about what's allowed.
 */

import type { GameState } from '../../src/state/types.ts';
import { PROJECT_CATALOG } from '../../src/data/content/project-catalog.ts';
import { POLICY_CATALOG } from '../../src/data/content/policy-catalog.ts';
import { SLOT_COSTS, getAvailableSlots } from '../../src/systems/calendar-slots.ts';
import { isElectionTurn } from '../../src/systems/reelection.ts';
import type { TurnView, ProposalView, PolicyView, CalendarOption } from './types.ts';

/** Calendar actions the benchmark agents are allowed to use (the simple,
 *  always-available ones — delegation/mentor/strategic need extra game state). */
const AGENT_CALENDAR_ACTIONS = [
  'community_meeting',
  'quick_check_in',
  'public_event',
  'rest_day',
] as const;

export function buildView(state: GameState): TurnView {
  const proposals: ProposalView[] = state.activeProposals.map((p) => {
    const def = PROJECT_CATALOG[p.projectDefinitionId];
    const tile = state.tiles[p.tileId];
    return {
      proposal: p,
      projectName: def?.name ?? p.projectDefinitionId,
      cost: (def?.baseCost ?? 0) * 0.85,
      durationTurns: def?.baseDuration ?? 0,
      effects: {
        eco: def?.effects.tileEco ?? 0,
        food: def?.effects.foodSov ?? 0,
        trust: def?.effects.trust ?? 0,
        gentrification: def?.effects.gentrificationChange ?? 0,
        annualRevenue: def?.effects.annualRevenue ?? 0,
      },
      tileName: tile?.name ?? p.tileId,
    };
  });

  const will = state.meters.politicalWill;
  const policies: PolicyView[] = Object.entries(POLICY_CATALOG)
    .filter(([id]) => !state.activePolicies.some((ap) => ap.definitionId === id))
    .map(([id, def]) => ({
      id,
      name: def.name,
      willThresholdPct: def.baseThreshold * 100,
      enactable: will >= def.baseThreshold * 100,
      effects: {
        trust: def.effects.trustBonus,
        eco: def.effects.ecoBonus,
        food: def.effects.foodSovBonus,
        budget: def.effects.budgetBonus,
      },
    }));

  const slotsRemaining = getAvailableSlots(state.calendarState);
  const calendar: CalendarOption[] = AGENT_CALENDAR_ACTIONS.filter(
    (a) => SLOT_COSTS[a] <= slotsRemaining,
  ).map((a) => ({ actionType: a, slotCost: SLOT_COSTS[a] }));

  const alloc = state.calendarState.neighborhoodTimeAllocation;
  const timeFor = (id: string) => (alloc[id] ?? []).reduce((s, n) => s + n, 0);

  return {
    turn: state.turn,
    season: state.season,
    year: state.year,
    stage: state.stage,
    meters: state.meters,
    proposals,
    policies,
    calendar,
    slotsRemaining,
    slotCosts: { ...SLOT_COSTS },
    burnout: {
      buffer: state.calendarState.burnoutBuffer,
      max: state.calendarState.burnoutBufferMax,
      state: state.calendarState.burnoutState,
    },
    tiles: Object.values(state.tiles).map((t) => ({
      id: t.id,
      name: t.name,
      gentrification: t.gentrificationPressure,
      eco: t.ecologicalHealth,
      timeAllocated: timeFor(t.id),
    })),
    electionSoon: isElectionTurn(state.turn + 1) || isElectionTurn(state.turn + 2),
  };
}
