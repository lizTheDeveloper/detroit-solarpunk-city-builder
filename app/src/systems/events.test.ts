import { describe, it, expect } from 'vitest';
import type { GameState, GameEvent, Antagonist, AntagonistArcState } from '../state/types';
import { createNewGame } from '../state/create-game';
import {
  generateEvents,
  applyEventChoice,
  updateEventCooldowns,
  checkAntagonistActivation,
  escalateAntagonists,
  getEventPriority,
  advanceMarcusPhase,
  createMarcusEvent,
} from './events';

/** Helper: create a base game state with sensible defaults */
function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createNewGame();
  return { ...base, ...overrides, meters: { ...base.meters, ...(overrides.meters ?? {}) } };
}

function makeAntagonist(overrides: Partial<Antagonist> & Pick<Antagonist, 'id'>): Antagonist {
  return {
    name: overrides.id,
    role: 'test',
    activationCondition: '',
    escalationLevel: 0,
    escalationInterval: 4,
    active: false,
    lastEscalationTurn: 0,
    tileTargets: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// generateEvents
// ---------------------------------------------------------------------------
describe('generateEvents', () => {
  it('1. generates no events when all probabilities miss (rng returns 0.99)', () => {
    const state = makeState();
    const events = generateEvents(state, () => 0.99);
    expect(events).toEqual([]);
  });

  it('2. generates heat_wave only in summer', () => {
    // summer: should generate
    const summer = makeState({ season: 'summer' });
    const events = generateEvents(summer, () => 0.01);
    expect(events.some((e) => e.type === 'heat_wave')).toBe(true);

    // winter: heat_wave prob is 0, should not generate
    const winter = makeState({ season: 'winter' });
    const winterEvents = generateEvents(winter, () => 0.01);
    expect(winterEvents.some((e) => e.type === 'heat_wave')).toBe(false);
  });

  it('3. climate probability scales with climate pressure', () => {
    // Use cooldowns to block competing climate events so severe_storm is the only climate candidate
    const baseCooldowns = { heat_wave: 1, flooding: 1, ice_storm: 1 };

    // At climatePressure=0 → actual = 0.08 * (1 + 0) = 0.08
    // rng=0.10 > 0.08 → should NOT trigger
    const lowPressure = makeState({
      meters: { communityTrust: 50, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 0 },
      eventCooldowns: baseCooldowns,
    });
    const events1 = generateEvents(lowPressure, () => 0.10);
    expect(events1.some((e) => e.type === 'severe_storm')).toBe(false);

    // At climatePressure=100 → actual = 0.08 * (1 + 1.0) = 0.16
    // rng=0.10 < 0.16 → should trigger
    const highPressure = makeState({
      meters: { communityTrust: 50, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 100 },
      eventCooldowns: baseCooldowns,
    });
    const events2 = generateEvents(highPressure, () => 0.10);
    expect(events2.some((e) => e.type === 'severe_storm')).toBe(true);
  });

  it('4. per-turn cap of 3 events enforced', () => {
    const state = makeState({ season: 'summer' });
    // rng always returns 0.001 so everything triggers
    const events = generateEvents(state, () => 0.001);
    expect(events.length).toBeLessThanOrEqual(3);
  });

  it('5. only 1 crisis event per turn', () => {
    // Force crisis conditions: low budget, low eco, high climate
    const state = makeState({
      meters: {
        communityTrust: 50,
        ecologicalHealth: 10,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 0.5,
        climatePressure: 80,
      },
    });
    const events = generateEvents(state, () => 0.001);
    const crisisEvents = events.filter((e) => e.category === 'crisis');
    expect(crisisEvents.length).toBeLessThanOrEqual(1);
  });

  it('6. only 1 climate event per turn', () => {
    const state = makeState({ season: 'summer' });
    const events = generateEvents(state, () => 0.001);
    const climateEvents = events.filter((e) => e.category === 'climate');
    expect(climateEvents.length).toBeLessThanOrEqual(1);
  });

  it('7. cooldowns prevent same event type from firing', () => {
    const state = makeState({
      season: 'summer',
      eventCooldowns: { heat_wave: 2 },
    });
    const events = generateEvents(state, () => 0.001);
    expect(events.some((e) => e.type === 'heat_wave')).toBe(false);
  });

  it('9. community events respect Trust thresholds (mutual_aid needs Trust > 60%)', () => {
    // Block all other event types with cooldowns so only mutual_aid can fire
    const blockOthers = {
      heat_wave: 1, flooding: 1, severe_storm: 1, ice_storm: 1,
      federal_grant: 1, developer_proposal: 1,
      water_shutoff: 1, infrastructure_failure: 1, public_health_emergency: 1,
      cultural_celebration: 1,
    };

    // Trust at 50 — should not generate (needs > 60)
    const lowTrust = makeState({
      meters: { communityTrust: 50, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 30 },
      eventCooldowns: blockOthers,
    });
    const events1 = generateEvents(lowTrust, () => 0.001);
    expect(events1.some((e) => e.type === 'mutual_aid')).toBe(false);

    // Trust at 70 — should generate
    const highTrust = makeState({
      meters: { communityTrust: 70, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 30 },
      eventCooldowns: blockOthers,
    });
    const events2 = generateEvents(highTrust, () => 0.001);
    expect(events2.some((e) => e.type === 'mutual_aid')).toBe(true);
  });

  it('10. crisis events respect meter thresholds (water_shutoff needs Budget < $1.0M)', () => {
    // Budget at 4.2 — should not generate water_shutoff
    const rich = makeState();
    const events1 = generateEvents(rich, () => 0.001);
    expect(events1.some((e) => e.type === 'water_shutoff')).toBe(false);

    // Budget at 0.5 — should generate
    const poor = makeState({ meters: { communityTrust: 50, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 0.5, climatePressure: 30 } });
    const events2 = generateEvents(poor, () => 0.001);
    expect(events2.some((e) => e.type === 'water_shutoff')).toBe(true);
  });

  it('14. priority order: crisis > climate > political > community', () => {
    // Force all categories to trigger, verify crisis appears before climate, etc.
    const state = makeState({
      season: 'summer',
      meters: {
        communityTrust: 70,
        ecologicalHealth: 10,
        foodSovereignty: 10,
        politicalWill: 60,
        budget: 0.5,
        climatePressure: 80,
      },
    });
    const events = generateEvents(state, () => 0.001);
    // With cap of 3, crisis should be present (highest priority)
    // and community should be excluded (lowest priority)
    if (events.length === 3) {
      const categories = events.map((e) => e.category);
      // crisis must appear before community if both present
      const crisisIdx = categories.indexOf('crisis');
      const communityIdx = categories.indexOf('community');
      if (crisisIdx >= 0 && communityIdx >= 0) {
        expect(crisisIdx).toBeLessThan(communityIdx);
      }
      // crisis has highest priority so should be included
      expect(categories).toContain('crisis');
    }
  });
});

// ---------------------------------------------------------------------------
// updateEventCooldowns
// ---------------------------------------------------------------------------
describe('updateEventCooldowns', () => {
  it('8. cooldowns decrement correctly', () => {
    const cooldowns = { heat_wave: 3, flooding: 1, severe_storm: 2 };
    const updated = updateEventCooldowns(cooldowns);
    expect(updated.heat_wave).toBe(2);
    expect(updated.severe_storm).toBe(1);
    // flooding was 1, decremented to 0 → removed
    expect(updated.flooding).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// applyEventChoice
// ---------------------------------------------------------------------------
describe('applyEventChoice', () => {
  function stateWithEvent(event: GameEvent, overrides: Partial<GameState> = {}): GameState {
    return makeState({ ...overrides, eventQueue: [event] });
  }

  const federalGrantEvent: GameEvent = {
    id: 'evt-grant-1',
    type: 'federal_grant',
    category: 'political',
    title: 'Federal Grant Opportunity',
    description: 'A federal grant is available.',
    turnGenerated: 1,
    cooldownTurns: 3,
    targetTileId: null,
    targetCharacterId: null,
    choices: [
      {
        id: 'accept',
        label: 'Accept',
        description: 'Accept the grant',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: 0.5, source: 'federal_grant_accept' },
            { meter: 'politicalWill', amount: -3, source: 'federal_grant_accept' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'decline',
        label: 'Decline',
        description: 'Decline the grant',
        effects: {
          meterDeltas: [],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  };

  it('11. event choices apply correct meter deltas', () => {
    const state = stateWithEvent(federalGrantEvent);
    const result = applyEventChoice(state, 'evt-grant-1', 'accept');
    expect(result.state.meters.budget).toBeCloseTo(1.5 + 0.5, 5);
    expect(result.state.meters.politicalWill).toBeCloseTo(25 - 3, 5);
    expect(result.deltas).toHaveLength(2);
  });

  it('12. event choice requirements are enforced', () => {
    const restrictedEvent: GameEvent = {
      ...federalGrantEvent,
      id: 'evt-restricted',
      choices: [
        {
          id: 'expensive',
          label: 'Expensive',
          description: 'Needs high budget',
          effects: {
            meterDeltas: [{ meter: 'budget', amount: -10, source: 'expensive' }],
            relationshipChanges: [],
            other: [],
          },
          requirements: { minBudget: 10, minWill: null, minTrust: null },
        },
      ],
    };
    const state = stateWithEvent(restrictedEvent);
    const result = applyEventChoice(state, 'evt-restricted', 'expensive');
    // Budget is 1.5, requirement is 10 — should not apply
    expect(result.state.meters.budget).toBeCloseTo(1.5, 5);
    expect(result.deltas).toHaveLength(0);
  });

  it('13. applied event is removed from queue', () => {
    const state = stateWithEvent(federalGrantEvent);
    const result = applyEventChoice(state, 'evt-grant-1', 'accept');
    expect(result.state.eventQueue).toHaveLength(0);
    expect(result.state.eventQueue.find((e) => e.id === 'evt-grant-1')).toBeUndefined();
  });

  it('20. federal grant accept gives +$0.5M and -3% Will', () => {
    const state = stateWithEvent(federalGrantEvent);
    const result = applyEventChoice(state, 'evt-grant-1', 'accept');
    const budgetDelta = result.deltas.find((d) => d.meter === 'budget');
    const willDelta = result.deltas.find((d) => d.meter === 'politicalWill');
    expect(budgetDelta).toBeDefined();
    expect(budgetDelta!.amount).toBe(0.5);
    expect(willDelta).toBeDefined();
    expect(willDelta!.amount).toBe(-3);
  });

  it('sets cooldown after applying event choice', () => {
    const state = stateWithEvent(federalGrantEvent);
    const result = applyEventChoice(state, 'evt-grant-1', 'accept');
    expect(result.state.eventCooldowns['federal_grant']).toBe(3);
  });

  it('sets 4-turn cooldown for crisis events', () => {
    const crisisEvent: GameEvent = {
      id: 'evt-crisis-1',
      type: 'water_shutoff',
      category: 'crisis',
      title: 'Water Shutoff',
      description: 'Water has been shut off.',
      turnGenerated: 1,
      cooldownTurns: 4,
      targetTileId: null,
      targetCharacterId: null,
      choices: [
        {
          id: 'respond',
          label: 'Respond',
          description: 'Respond to crisis',
          effects: {
            meterDeltas: [{ meter: 'communityTrust', amount: -3, source: 'water_shutoff' }],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
      ],
    };
    const state = stateWithEvent(crisisEvent);
    const result = applyEventChoice(state, 'evt-crisis-1', 'respond');
    expect(result.state.eventCooldowns['water_shutoff']).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// checkAntagonistActivation
// ---------------------------------------------------------------------------
describe('checkAntagonistActivation', () => {
  it('15. Sterling Cross activates when vacant land has completed project', () => {
    const state = makeState({
      antagonists: {
        sterling_cross: makeAntagonist({
          id: 'sterling_cross',
          activationCondition: 'vacant_project_completed',
          active: false,
        }),
      },
      tiles: {
        brightmoor: {
          id: 'brightmoor',
          name: 'Brightmoor',
          terrain: 'vacant',
          vacancyRate: 70,
          ecologicalHealth: 8,
          contamination: 20,
          gentrificationPressure: 0,
          existingUses: ['vacant_lot'],
          neighborhoodTraits: [],
          activeProjects: [],
          completedProjects: ['solar_farm'],
          communityPowerTokens: 0,
          communityOwned: false,
          adjacentTileIds: [],
          visualStage: 'dystopia',
          consumedByproducts: [],
          vacantLots: 5,
          reclaimedLots: 0,
        },
      },
    });
    const result = checkAntagonistActivation(state);
    expect(result.sterling_cross.active).toBe(true);
  });

  it('Sterling Cross stays inactive with no completed projects on vacant land', () => {
    const state = makeState({
      antagonists: {
        sterling_cross: makeAntagonist({
          id: 'sterling_cross',
          activationCondition: 'vacant_project_completed',
          active: false,
        }),
      },
    });
    // Default tiles: brightmoor is vacant but has no completedProjects
    const result = checkAntagonistActivation(state);
    expect(result.sterling_cross.active).toBe(false);
  });

  it('16. Senator Voss activates when trust > 55', () => {
    const state = makeState({
      meters: { communityTrust: 60, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 30 },
      antagonists: {
        senator_voss: makeAntagonist({
          id: 'senator_voss',
          activationCondition: 'trust_above_55',
          active: false,
        }),
      },
    });
    const result = checkAntagonistActivation(state);
    expect(result.senator_voss.active).toBe(true);
  });

  it('Senator Voss stays inactive when trust <= 55', () => {
    const state = makeState({
      meters: { communityTrust: 50, ecologicalHealth: 15, foodSovereignty: 10, politicalWill: 60, budget: 4.2, climatePressure: 30 },
      antagonists: {
        senator_voss: makeAntagonist({
          id: 'senator_voss',
          activationCondition: 'trust_above_55',
          active: false,
        }),
      },
    });
    const result = checkAntagonistActivation(state);
    expect(result.senator_voss.active).toBe(false);
  });

  it('17. Amanda Chen activates at transition stage', () => {
    const state = makeState({
      stage: 'transition',
      antagonists: {
        amanda_chen: makeAntagonist({
          id: 'amanda_chen',
          activationCondition: 'transition_stage',
          active: false,
        }),
      },
    });
    const result = checkAntagonistActivation(state);
    expect(result.amanda_chen.active).toBe(true);
  });

  it('already-active antagonists stay active', () => {
    const state = makeState({
      antagonists: {
        marcus_webb: makeAntagonist({
          id: 'marcus_webb',
          activationCondition: 'turn_1',
          active: true,
        }),
      },
    });
    const result = checkAntagonistActivation(state);
    expect(result.marcus_webb.active).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// escalateAntagonists
// ---------------------------------------------------------------------------
describe('escalateAntagonists', () => {
  it('18. antagonist escalation generates events', () => {
    const state = makeState({
      turn: 5,
      antagonists: {
        sterling_cross: makeAntagonist({
          id: 'sterling_cross',
          active: true,
          escalationLevel: 0,
          escalationInterval: 4,
          lastEscalationTurn: 0,
        }),
      },
    });
    const result = escalateAntagonists(state);
    expect(result.events.length).toBeGreaterThanOrEqual(1);
    expect(result.events[0].category).toBe('antagonist');
    expect(result.antagonists.sterling_cross.escalationLevel).toBe(1);
  });

  it('19. escalation respects interval (sterling_cross every 4 turns)', () => {
    const state = makeState({
      turn: 3,
      antagonists: {
        sterling_cross: makeAntagonist({
          id: 'sterling_cross',
          active: true,
          escalationLevel: 1,
          escalationInterval: 4,
          lastEscalationTurn: 1,
        }),
      },
    });
    // Turn 3, lastEscalation at 1 → only 2 turns passed, need 4
    const result = escalateAntagonists(state);
    expect(result.events).toHaveLength(0);
    expect(result.antagonists.sterling_cross.escalationLevel).toBe(1);
  });

  it('does not escalate inactive antagonists', () => {
    const state = makeState({
      turn: 10,
      antagonists: {
        sterling_cross: makeAntagonist({
          id: 'sterling_cross',
          active: false,
          escalationLevel: 0,
          escalationInterval: 4,
          lastEscalationTurn: 0,
        }),
      },
    });
    const result = escalateAntagonists(state);
    expect(result.events).toHaveLength(0);
  });

  it('updates lastEscalationTurn on escalation', () => {
    const state = makeState({
      turn: 8,
      antagonists: {
        senator_voss: makeAntagonist({
          id: 'senator_voss',
          active: true,
          escalationLevel: 0,
          escalationInterval: 4,
          lastEscalationTurn: 0,
        }),
      },
    });
    const result = escalateAntagonists(state);
    expect(result.antagonists.senator_voss.lastEscalationTurn).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// getEventPriority
// ---------------------------------------------------------------------------
describe('getEventPriority', () => {
  it('returns correct priorities for each category', () => {
    const makeEvent = (category: GameEvent['category']): GameEvent => ({
      id: 'e',
      type: 'test',
      category,
      title: '',
      description: '',
      choices: [],
      turnGenerated: 1,
      cooldownTurns: 3,
      targetTileId: null,
      targetCharacterId: null,
    });

    expect(getEventPriority(makeEvent('crisis'))).toBe(4);
    expect(getEventPriority(makeEvent('climate'))).toBe(3);
    expect(getEventPriority(makeEvent('antagonist'))).toBe(3);
    expect(getEventPriority(makeEvent('political'))).toBe(2);
    expect(getEventPriority(makeEvent('community'))).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Marcus Webb 4-phase arc
// ---------------------------------------------------------------------------

function makeMarcusArc(overrides: Partial<AntagonistArcState> = {}): AntagonistArcState {
  return {
    phase: 1,
    phaseEventsFired: 0,
    confrontations: 0,
    ignores: 0,
    coOpted: false,
    resolutionType: null,
    sterlingConnectionRevealed: false,
    ...overrides,
  };
}

function makeMarcus(overrides: Partial<Antagonist> = {}): Antagonist {
  return makeAntagonist({
    id: 'marcus_webb',
    name: 'Marcus Webb',
    role: 'Media Figure',
    active: true,
    escalationLevel: 0,
    escalationInterval: 0,
    lastEscalationTurn: 0,
    arcState: makeMarcusArc(),
    ...overrides,
  });
}

describe('Marcus Webb arc: advanceMarcusPhase', () => {
  it('stays in Phase 1 when no transition conditions are met', () => {
    const marcus = makeMarcus();
    const state = makeState({ turn: 5, antagonists: { marcus_webb: marcus } });
    const result = advanceMarcusPhase(marcus, state);
    expect(result.arcState!.phase).toBe(1);
  });

  it('transitions to Phase 2 at turn 9+ when ignores >= 3', () => {
    const marcus = makeMarcus({ arcState: makeMarcusArc({ ignores: 3 }) });
    const state = makeState({ turn: 9, antagonists: { marcus_webb: marcus } });
    const result = advanceMarcusPhase(marcus, state);
    expect(result.arcState!.phase).toBe(2);
    expect(result.arcState!.phaseEventsFired).toBe(0);
    expect(result.escalationLevel).toBe(1);
  });

  it('transitions to Phase 2 early via Sterling Cross at turn 6+', () => {
    const sterling = makeAntagonist({ id: 'sterling_cross', active: true });
    const marcus = makeMarcus();
    const state = makeState({
      turn: 6,
      antagonists: { marcus_webb: marcus, sterling_cross: sterling },
    });
    const result = advanceMarcusPhase(marcus, state);
    expect(result.arcState!.phase).toBe(2);
  });

  it('does not early-transition via Sterling Cross before turn 6', () => {
    const sterling = makeAntagonist({ id: 'sterling_cross', active: true });
    const marcus = makeMarcus();
    const state = makeState({
      turn: 5,
      antagonists: { marcus_webb: marcus, sterling_cross: sterling },
    });
    const result = advanceMarcusPhase(marcus, state);
    expect(result.arcState!.phase).toBe(1);
  });

  it('transitions to Phase 2 when 2+ proposals have pressureLevel >= 3', () => {
    const marcus = makeMarcus();
    const state = makeState({
      turn: 9,
      antagonists: { marcus_webb: marcus },
      activeProposals: [
        { id: 'p1', leaderId: 'l1', projectDefinitionId: 'pd1', tileId: 't1', reason: '', turnProposed: 1, expirationTurn: 10, pressureLevel: 3, },
        { id: 'p2', leaderId: 'l2', projectDefinitionId: 'pd2', tileId: 't2', reason: '', turnProposed: 2, expirationTurn: 11, pressureLevel: 4, },
      ],
    });
    const result = advanceMarcusPhase(marcus, state);
    expect(result.arcState!.phase).toBe(2);
  });

  it('transitions to Phase 3 at turn 20+ with 4+ Phase 2 events', () => {
    const marcus = makeMarcus({
      arcState: makeMarcusArc({ phase: 2, phaseEventsFired: 4 }),
      escalationLevel: 1,
    });
    const state = makeState({ turn: 20, antagonists: { marcus_webb: marcus } });
    const result = advanceMarcusPhase(marcus, state);
    expect(result.arcState!.phase).toBe(3);
    expect(result.escalationLevel).toBe(2);
  });

  it('does not transition to Phase 3 before 4 Phase 2 events', () => {
    const marcus = makeMarcus({
      arcState: makeMarcusArc({ phase: 2, phaseEventsFired: 3 }),
      escalationLevel: 1,
    });
    const state = makeState({ turn: 20, antagonists: { marcus_webb: marcus } });
    const result = advanceMarcusPhase(marcus, state);
    expect(result.arcState!.phase).toBe(2);
  });

  it('transitions to Phase 4 at turn 36+', () => {
    const marcus = makeMarcus({
      arcState: makeMarcusArc({ phase: 3, confrontations: 5, ignores: 2 }),
      escalationLevel: 2,
    });
    const state = makeState({ turn: 36, antagonists: { marcus_webb: marcus } });
    const result = advanceMarcusPhase(marcus, state);
    expect(result.arcState!.phase).toBe(4);
    expect(result.arcState!.resolutionType).not.toBeNull();
  });

  it('determines reluctant_ally when co-opted and 4+ confrontations', () => {
    const marcus = makeMarcus({
      arcState: makeMarcusArc({ phase: 3, confrontations: 4, coOpted: true }),
      escalationLevel: 2,
    });
    const state = makeState({ turn: 36, antagonists: { marcus_webb: marcus } });
    const result = advanceMarcusPhase(marcus, state);
    expect(result.arcState!.resolutionType).toBe('reluctant_ally');
  });

  it('determines election_threat when ignored > 60% and not co-opted', () => {
    const marcus = makeMarcus({
      arcState: makeMarcusArc({ phase: 3, confrontations: 2, ignores: 6, coOpted: false }),
      escalationLevel: 2,
    });
    const state = makeState({ turn: 36, antagonists: { marcus_webb: marcus } });
    const result = advanceMarcusPhase(marcus, state);
    expect(result.arcState!.resolutionType).toBe('election_threat');
  });

  it('determines cynicism_engine for inconsistent responses', () => {
    const marcus = makeMarcus({
      arcState: makeMarcusArc({ phase: 3, confrontations: 3, ignores: 3, coOpted: false }),
      escalationLevel: 2,
    });
    const state = makeState({ turn: 36, antagonists: { marcus_webb: marcus } });
    const result = advanceMarcusPhase(marcus, state);
    expect(result.arcState!.resolutionType).toBe('cynicism_engine');
  });
});

describe('Marcus Webb arc: createMarcusEvent', () => {
  it('generates Phase 1 events with 3 choices', () => {
    const marcus = makeMarcus();
    const state = makeState({ turn: 2, antagonists: { marcus_webb: marcus } });
    const event = createMarcusEvent(marcus, state);
    expect(event).not.toBeNull();
    expect(event!.category).toBe('antagonist');
    expect(event!.choices.length).toBe(3);
    expect(event!.type).toMatch(/^marcus_webb_potshot/);
  });

  it('generates different Phase 1 variants based on turn', () => {
    const marcus = makeMarcus();
    const s1 = makeState({ turn: 1, antagonists: { marcus_webb: marcus } });
    const s2 = makeState({ turn: 2, antagonists: { marcus_webb: marcus } });
    const e1 = createMarcusEvent(marcus, s1);
    const e2 = createMarcusEvent(marcus, s2);
    expect(e1!.type).not.toBe(e2!.type);
  });

  it('generates Phase 2 sterling reveal event when sterling active and not revealed', () => {
    const sterling = makeAntagonist({ id: 'sterling_cross', active: true });
    const marcus = makeMarcus({
      arcState: makeMarcusArc({ phase: 2, sterlingConnectionRevealed: false }),
    });
    const state = makeState({
      turn: 10,
      antagonists: { marcus_webb: marcus, sterling_cross: sterling },
    });
    const event = createMarcusEvent(marcus, state);
    expect(event!.type).toBe('marcus_webb_sterling_reveal');
  });

  it('generates Phase 3 council run event on first event with few confrontations', () => {
    const marcus = makeMarcus({
      arcState: makeMarcusArc({ phase: 3, phaseEventsFired: 0, confrontations: 1 }),
    });
    const state = makeState({ turn: 22, antagonists: { marcus_webb: marcus } });
    const event = createMarcusEvent(marcus, state);
    expect(event!.type).toBe('marcus_webb_council_run');
    const coOptChoice = event!.choices.find(c => c.id === 'co_opt');
    expect(coOptChoice).toBeDefined();
  });

  it('generates Phase 4 reluctant ally event', () => {
    const marcus = makeMarcus({
      arcState: makeMarcusArc({ phase: 4, resolutionType: 'reluctant_ally' }),
    });
    const state = makeState({ turn: 38, antagonists: { marcus_webb: marcus } });
    const event = createMarcusEvent(marcus, state);
    expect(event!.type).toBe('marcus_webb_reluctant_ally');
    expect(event!.choices.some(c => c.effects.meterDeltas.some(d => d.amount > 0))).toBe(true);
  });

  it('generates Phase 4 election threat event', () => {
    const marcus = makeMarcus({
      arcState: makeMarcusArc({ phase: 4, resolutionType: 'election_threat' }),
    });
    const state = makeState({ turn: 38, antagonists: { marcus_webb: marcus } });
    const event = createMarcusEvent(marcus, state);
    expect(event!.type).toBe('marcus_webb_election_threat');
  });

  it('generates Phase 4 cynicism event', () => {
    const marcus = makeMarcus({
      arcState: makeMarcusArc({ phase: 4, resolutionType: 'cynicism_engine' }),
    });
    const state = makeState({ turn: 38, antagonists: { marcus_webb: marcus } });
    const event = createMarcusEvent(marcus, state);
    expect(event!.type).toBe('marcus_webb_cynicism');
  });
});

describe('Marcus Webb arc: escalateAntagonists integration', () => {
  it('Marcus generates phase-based events through escalateAntagonists', () => {
    const marcus = makeMarcus({ active: true });
    const state = makeState({
      turn: 3,
      antagonists: { marcus_webb: marcus },
    });
    const result = escalateAntagonists(state);
    expect(result.events.length).toBe(1);
    expect(result.events[0].type).toMatch(/^marcus_webb_potshot/);
    expect(result.antagonists.marcus_webb.arcState!.phaseEventsFired).toBe(1);
    expect(result.antagonists.marcus_webb.lastEscalationTurn).toBe(3);
  });

  it('Marcus phase advances during escalation', () => {
    const marcus = makeMarcus({
      active: true,
      arcState: makeMarcusArc({ ignores: 4 }),
    });
    const state = makeState({
      turn: 10,
      antagonists: { marcus_webb: marcus },
    });
    const result = escalateAntagonists(state);
    expect(result.antagonists.marcus_webb.arcState!.phase).toBe(2);
  });
});

describe('Marcus Webb arc: applyEventChoice tracking', () => {
  it('tracks confrontation when player chooses confront', () => {
    const marcus = makeMarcus({ active: true });
    const event: GameEvent = {
      id: 'evt-test',
      type: 'marcus_webb_potshot_spending',
      category: 'antagonist',
      title: 'Test',
      description: 'Test',
      turnGenerated: 1,
      cooldownTurns: 2,
      targetTileId: null,
      targetCharacterId: null,
      choices: [{
        id: 'confront',
        label: 'Confront',
        description: 'Test',
        effects: {
          meterDeltas: [{ meter: 'politicalWill', amount: -3, source: 'test' }],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      }],
    };
    const state = makeState({
      antagonists: { marcus_webb: marcus },
      eventQueue: [event],
    });
    const result = applyEventChoice(state, 'evt-test', 'confront');
    expect(result.state.antagonists.marcus_webb.arcState!.confrontations).toBe(1);
  });

  it('tracks ignore when player chooses ignore', () => {
    const marcus = makeMarcus({ active: true });
    const event: GameEvent = {
      id: 'evt-test',
      type: 'marcus_webb_potshot_spending',
      category: 'antagonist',
      title: 'Test',
      description: 'Test',
      turnGenerated: 1,
      cooldownTurns: 2,
      targetTileId: null,
      targetCharacterId: null,
      choices: [{
        id: 'ignore',
        label: 'Ignore',
        description: 'Test',
        effects: {
          meterDeltas: [{ meter: 'communityTrust', amount: -2, source: 'test' }],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      }],
    };
    const state = makeState({
      antagonists: { marcus_webb: marcus },
      eventQueue: [event],
    });
    const result = applyEventChoice(state, 'evt-test', 'ignore');
    expect(result.state.antagonists.marcus_webb.arcState!.ignores).toBe(1);
  });

  it('marks co-opted when player chooses co_opt', () => {
    const marcus = makeMarcus({
      active: true,
      arcState: makeMarcusArc({ phase: 3 }),
    });
    const event: GameEvent = {
      id: 'evt-test',
      type: 'marcus_webb_council_run',
      category: 'antagonist',
      title: 'Test',
      description: 'Test',
      turnGenerated: 1,
      cooldownTurns: 0,
      targetTileId: null,
      targetCharacterId: null,
      choices: [{
        id: 'co_opt',
        label: 'Co-opt',
        description: 'Test',
        effects: {
          meterDeltas: [{ meter: 'politicalWill', amount: -3, source: 'test' }],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      }],
    };
    const state = makeState({
      antagonists: { marcus_webb: marcus },
      eventQueue: [event],
    });
    const result = applyEventChoice(state, 'evt-test', 'co_opt');
    expect(result.state.antagonists.marcus_webb.arcState!.coOpted).toBe(true);
    expect(result.state.antagonists.marcus_webb.arcState!.confrontations).toBe(1);
  });
});
