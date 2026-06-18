import { describe, it, expect } from 'vitest';
import type { GameState, Antagonist, MarcusResponse, MarcusResolutionType, Proposal } from '../state/types';
import { createNewGame } from '../state/create-game';
import { gameReducer } from '../state/reducer';
import { resolveTurn } from './resolve';
import { PROJECT_CATALOG } from '../data/content/project-catalog';
import {
  evaluateMarcusPhaseTransition,
  selectMarcusEvent,
  processMarcusArc,
  recordMarcusResponse,
  tallyResponses,
  highPressureProposalCount,
  hasNeglectedNeighborhood,
  getMarcus,
} from './marcus-arc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createNewGame();
  return { ...base, ...overrides, meters: { ...base.meters, ...(overrides.meters ?? {}) } };
}

/**
 * The Marcus arc's confront/ignore/co-opt tallies are now DERIVED from
 * responseHistory. This shape lets tests express the intent ("Marcus has been
 * ignored 3 times", "5 confrontations, co-opted") and we synthesize a
 * responseHistory that yields exactly those derived counts under tallyResponses.
 */
interface ArcShape {
  phase?: 1 | 2 | 3 | 4;
  phaseEventsFired?: number;
  confrontations?: number;
  ignores?: number;
  coOpted?: boolean;
  resolutionType?: MarcusResolutionType;
  sterlingConnectionRevealed?: boolean;
}

/**
 * Build a responseHistory that derives to the requested confront/ignore/co-opt
 * tallies. Each `confront` choiceId adds 1 to confrontations; `ignore` adds 1 to
 * ignores; a single `co_opt` (when coOpted) both flags coOpted and counts as a
 * confrontation, so we emit (confrontations-1) confronts + 1 co_opt.
 */
function historyFor(shape: ArcShape): MarcusResponse[] {
  const confrontations = shape.confrontations ?? 0;
  const ignores = shape.ignores ?? 0;
  const coOpted = shape.coOpted ?? false;
  const out: MarcusResponse[] = [];
  let turn = 1;
  const confrontCount = coOpted ? Math.max(0, confrontations - 1) : confrontations;
  for (let i = 0; i < confrontCount; i++) {
    out.push({ turn: turn++, eventType: 'marcus_webb_potshot_spending', choiceId: 'confront', kind: 'confront' });
  }
  if (coOpted) {
    out.push({ turn: turn++, eventType: 'marcus_webb_council_run', choiceId: 'co_opt', kind: 'co_opt' });
  }
  for (let i = 0; i < ignores; i++) {
    out.push({ turn: turn++, eventType: 'marcus_webb_potshot_spending', choiceId: 'ignore', kind: 'ignore' });
  }
  return out;
}

/** Build a Marcus antagonist from an arc-shape, projecting onto flat fields. */
function makeMarcus(overrides: Partial<Antagonist> & { arc?: ArcShape } = {}): Antagonist {
  const arc = overrides.arc ?? {};
  const { arc: _omit, ...antOverrides } = overrides;
  const phase = arc.phase ?? 1;
  return {
    id: 'marcus_webb',
    name: 'Marcus Webb',
    role: 'Media Figure',
    activationCondition: 'turn_1',
    escalationLevel: phase - 1,
    escalationInterval: 1,
    active: true,
    lastEscalationTurn: 0,
    tileTargets: [],
    arcPhase: phase,
    responseHistory: historyFor(arc),
    phaseEventCount: arc.phaseEventsFired ?? 0,
    motivationRevealed: arc.sterlingConnectionRevealed ?? false,
    resolutionType: arc.resolutionType ?? null,
    ...antOverrides,
  };
}

function makeSterling(active = true): Antagonist {
  return {
    id: 'sterling_cross',
    name: 'Sterling Cross',
    role: 'Corporate Developer',
    activationCondition: 'player_reclaims_vacant_land',
    escalationLevel: 0,
    escalationInterval: 4,
    active,
    lastEscalationTurn: 0,
    tileTargets: [],
  };
}

function makeProposal(overrides: Partial<Proposal> & Pick<Proposal, 'id'>): Proposal {
  return {
    leaderId: 'grace',
    projectDefinitionId: 'food_forest',
    tileId: 'brightmoor',
    reason: 'test',
    turnProposed: 1,
    expirationTurn: 99,
    pressureLevel: 0,
    ...overrides,
  };
}

function makeResponse(kind: MarcusResponse['kind'], turn = 1): MarcusResponse {
  return { turn, eventType: 'marcus_webb_potshot_spending', choiceId: kind, kind };
}

// ===========================================================================
// 9.1 — evaluateMarcusPhaseTransition: all 4 phase transitions, early Phase 2
//       via Sterling Cross, response-history tracking
// ===========================================================================

describe('9.1 evaluateMarcusPhaseTransition — phase transitions', () => {
  it('stays in Phase 1 when no transition conditions are met', () => {
    const marcus = makeMarcus();
    const state = makeState({ turn: 5, antagonists: { marcus_webb: marcus } });
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.arcPhase).toBe(1);
  });

  it('transitions Phase 1 → 2 at turn 9+ when ignored 3+ times (via response history)', () => {
    const marcus = makeMarcus({
      arc: { ignores: 3 },
      responseHistory: [makeResponse('ignore'), makeResponse('ignore'), makeResponse('ignore')],
    });
    const state = makeState({ turn: 9, antagonists: { marcus_webb: marcus } });
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.arcPhase).toBe(2);
    expect(getMarcus(next)!.phaseEventCount).toBe(0);
    expect(getMarcus(next)!.escalationLevel).toBe(1);
  });

  it('transitions Phase 1 → 2 when 2+ proposals are at pressure level 3+', () => {
    const marcus = makeMarcus();
    const state = makeState({
      turn: 9,
      antagonists: { marcus_webb: marcus },
      activeProposals: [
        makeProposal({ id: 'p1', pressureLevel: 3 }),
        makeProposal({ id: 'p2', pressureLevel: 4, leaderId: 'kez', tileId: 'corktown' }),
      ],
    });
    expect(highPressureProposalCount(state)).toBe(2);
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.arcPhase).toBe(2);
  });

  it('transitions Phase 1 → 2 early via Sterling Cross co-activation at turn 6+', () => {
    const marcus = makeMarcus();
    const state = makeState({
      turn: 6,
      antagonists: { marcus_webb: marcus, sterling_cross: makeSterling(true) },
    });
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.arcPhase).toBe(2);
  });

  it('does NOT early-transition via Sterling Cross before turn 6', () => {
    const marcus = makeMarcus();
    const state = makeState({
      turn: 5,
      antagonists: { marcus_webb: marcus, sterling_cross: makeSterling(true) },
    });
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.arcPhase).toBe(1);
  });

  it('transitions Phase 1 → 2 via calendar neighborhood neglect (0 slots for 3+ months)', () => {
    const marcus = makeMarcus();
    const base = makeState({ turn: 10, antagonists: { marcus_webb: marcus } });
    // Give every tile a completed project so ONLY the calendar-neglect signal
    // (0 slots for 3+ months in brightmoor) can drive the transition.
    const tiles = { ...base.tiles };
    for (const id of Object.keys(tiles)) {
      tiles[id] = { ...tiles[id], completedProjects: ['food_forest'] };
    }
    const state: GameState = {
      ...base,
      tiles,
      calendarState: {
        ...base.calendarState,
        monthNumber: 3,
        neighborhoodTimeAllocation: {
          brightmoor: [0, 0, 0, 0],
          corktown: [2, 1, 2, 0],
        },
      },
    };
    expect(hasNeglectedNeighborhood(state)).toBe(true);
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.arcPhase).toBe(2);
  });

  it('does NOT transition via the calendar-neglect path when every neighborhood gets time', () => {
    const marcus = makeMarcus();
    const base = makeState({ turn: 10, antagonists: { marcus_webb: marcus } });
    // Give every tile a completed project so advanceMarcusPhase's project-based
    // "severe neglect" trigger cannot fire — this isolates the calendar signal.
    const tiles = { ...base.tiles };
    for (const id of Object.keys(tiles)) {
      tiles[id] = { ...tiles[id], completedProjects: ['food_forest'] };
    }
    const state: GameState = {
      ...base,
      tiles,
      calendarState: {
        ...base.calendarState,
        monthNumber: 3,
        neighborhoodTimeAllocation: {
          brightmoor: [1, 0, 1, 0],
          corktown: [0, 2, 0, 0],
        },
      },
    };
    expect(hasNeglectedNeighborhood(state)).toBe(false);
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.arcPhase).toBe(1);
  });

  it('transitions Phase 2 → 3 at turn 20+ with 4+ Phase 2 events fired', () => {
    const marcus = makeMarcus({
      arc: { phase: 2, phaseEventsFired: 4 },
    });
    const state = makeState({ turn: 20, antagonists: { marcus_webb: marcus } });
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.arcPhase).toBe(3);
    expect(getMarcus(next)!.escalationLevel).toBe(2);
  });

  it('does NOT transition Phase 2 → 3 before 4 Phase 2 events', () => {
    const marcus = makeMarcus({
      arc: { phase: 2, phaseEventsFired: 3 },
    });
    const state = makeState({ turn: 25, antagonists: { marcus_webb: marcus } });
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.arcPhase).toBe(2);
  });

  it('transitions Phase 3 → 4 at turn 36+ and sets a resolution type', () => {
    const marcus = makeMarcus({
      arc: { phase: 3, confrontations: 5, ignores: 2 },
    });
    const state = makeState({ turn: 36, antagonists: { marcus_webb: marcus } });
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.arcPhase).toBe(4);
    expect(getMarcus(next)!.resolutionType).not.toBeNull();
  });

  it('is a no-op when Marcus is inactive', () => {
    const marcus = makeMarcus({ active: false, arc: { ignores: 9 } });
    const state = makeState({ turn: 30, antagonists: { marcus_webb: marcus } });
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.arcPhase).toBe(1);
  });
});

describe('9.1 Phase 4 resolution branch derives from response pattern', () => {
  it('reluctant_ally when co-opted and 4+ confrontations', () => {
    const marcus = makeMarcus({
      arc: { phase: 3, confrontations: 4, coOpted: true },
    });
    const state = makeState({ turn: 36, antagonists: { marcus_webb: marcus } });
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.resolutionType).toBe('reluctant_ally');
  });

  it('election_threat when ignored > 60% and not co-opted', () => {
    const marcus = makeMarcus({
      arc: { phase: 3, confrontations: 2, ignores: 6, coOpted: false },
    });
    const state = makeState({ turn: 36, antagonists: { marcus_webb: marcus } });
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.resolutionType).toBe('election_threat');
  });

  it('cynicism_engine for inconsistent (mixed) responses', () => {
    const marcus = makeMarcus({
      arc: { phase: 3, confrontations: 3, ignores: 3, coOpted: false },
    });
    const state = makeState({ turn: 36, antagonists: { marcus_webb: marcus } });
    const next = evaluateMarcusPhaseTransition(state);
    expect(getMarcus(next)!.resolutionType).toBe('cynicism_engine');
  });
});

describe('9.1 response-history tracking via reducer (RESPOND_EVENT)', () => {
  function stateWithMarcusEvent(choiceId: string, eventType: string, marcusOverrides: Partial<Antagonist> & { arc?: ArcShape } = {}) {
    const marcus = makeMarcus(marcusOverrides);
    const event = {
      id: 'evt-marcus-1',
      type: eventType,
      category: 'antagonist' as const,
      title: 'Test',
      description: 'Test',
      turnGenerated: 1,
      cooldownTurns: 2,
      targetTileId: null,
      targetCharacterId: null,
      choices: [
        {
          id: choiceId,
          label: choiceId,
          description: 'Test',
          effects: { meterDeltas: [], relationshipChanges: [], other: [] },
          requirements: null,
        },
      ],
    };
    return makeState({ turn: 4, antagonists: { marcus_webb: marcus }, eventQueue: [event] });
  }

  it('records a confront response into responseHistory with kind=confront', () => {
    const state = stateWithMarcusEvent('confront', 'marcus_webb_potshot_spending');
    const next = gameReducer(state, { type: 'RESPOND_EVENT', eventId: 'evt-marcus-1', choiceId: 'confront' });
    const history = getMarcus(next)!.responseHistory!;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ turn: 4, choiceId: 'confront', kind: 'confront', eventType: 'marcus_webb_potshot_spending' });
  });

  it('records an ignore response with kind=ignore', () => {
    const state = stateWithMarcusEvent('ignore', 'marcus_webb_potshot_priorities');
    const next = gameReducer(state, { type: 'RESPOND_EVENT', eventId: 'evt-marcus-1', choiceId: 'ignore' });
    expect(getMarcus(next)!.responseHistory![0].kind).toBe('ignore');
    // The derived ignore tally advances with the logged response.
    expect(tallyResponses(getMarcus(next)!.responseHistory!).ignores).toBe(1);
  });

  it('records a co_opt response with kind=co_opt and derives coOpted', () => {
    const state = stateWithMarcusEvent('co_opt', 'marcus_webb_council_run', { arc: { phase: 3 } });
    const next = gameReducer(state, { type: 'RESPOND_EVENT', eventId: 'evt-marcus-1', choiceId: 'co_opt' });
    expect(getMarcus(next)!.responseHistory![0].kind).toBe('co_opt');
    expect(tallyResponses(getMarcus(next)!.responseHistory!).coOpted).toBe(true);
  });

  it('does NOT record responses for non-Marcus events', () => {
    const marcus = makeMarcus();
    const event = {
      id: 'evt-grant',
      type: 'federal_grant',
      category: 'political' as const,
      title: 'Grant', description: 'Grant',
      turnGenerated: 1, cooldownTurns: 3, targetTileId: null, targetCharacterId: null,
      choices: [{ id: 'accept', label: 'A', description: 'A', effects: { meterDeltas: [], relationshipChanges: [], other: [] }, requirements: null }],
    };
    const state = makeState({ turn: 4, antagonists: { marcus_webb: marcus }, eventQueue: [event] });
    const next = gameReducer(state, { type: 'RESPOND_EVENT', eventId: 'evt-grant', choiceId: 'accept' });
    expect(getMarcus(next)!.responseHistory!).toHaveLength(0);
  });

  it('accumulates multiple responses in chronological order', () => {
    let state = stateWithMarcusEvent('confront', 'marcus_webb_potshot_spending');
    state = recordMarcusResponse(state, 'marcus_webb_potshot_spending', 'confront');
    state = recordMarcusResponse({ ...state, turn: 5 }, 'marcus_webb_potshot_priorities', 'ignore');
    state = recordMarcusResponse({ ...state, turn: 6 }, 'marcus_webb_neglect_attack', 'community_response');
    const history = getMarcus(state)!.responseHistory!;
    expect(history.map(h => h.kind)).toEqual(['confront', 'ignore', 'strategic']);
    expect(history.map(h => h.turn)).toEqual([4, 5, 6]);
  });
});

describe('9.1 tallyResponses', () => {
  it('derives confront/ignore counts and ignore ratio from history', () => {
    const history = [makeResponse('confront'), makeResponse('ignore'), makeResponse('ignore'), makeResponse('strategic')];
    const t = tallyResponses(history);
    expect(t.confrontations).toBe(1);
    expect(t.ignores).toBe(2);
    expect(t.total).toBe(4);
    expect(t.ignoreRatio).toBeCloseTo(0.5, 5);
  });

  it('treats co_opt as a confrontation and flags coOpted', () => {
    const t = tallyResponses([makeResponse('co_opt')]);
    expect(t.coOpted).toBe(true);
    expect(t.confrontations).toBe(1);
  });

  it('returns zero ratio for empty history', () => {
    expect(tallyResponses([]).ignoreRatio).toBe(0);
  });
});

// ===========================================================================
// 9.2 — selectMarcusEvent: variety within phase, game-state interpolation,
//       proposal weaponization
// ===========================================================================

describe('9.2 selectMarcusEvent — Phase 1 variety + choices', () => {
  it('returns a Phase 1 pot-shot with at least 3 choices', () => {
    const marcus = makeMarcus();
    const state = makeState({ turn: 2, antagonists: { marcus_webb: marcus } });
    const event = selectMarcusEvent(state);
    expect(event).not.toBeNull();
    expect(event!.category).toBe('antagonist');
    expect(event!.type).toMatch(/^marcus_webb_potshot/);
    expect(event!.choices.length).toBeGreaterThanOrEqual(3);
  });

  it('produces different Phase 1 variants across turns (variety, not repetition)', () => {
    const marcus = makeMarcus();
    const types = new Set<string>();
    for (let turn = 0; turn < 4; turn++) {
      const state = makeState({ turn, antagonists: { marcus_webb: marcus } });
      types.add(selectMarcusEvent(state)!.type);
    }
    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it('every Phase 1 choice set includes confront / ignore / a creative option', () => {
    const marcus = makeMarcus();
    const state = makeState({ turn: 1, antagonists: { marcus_webb: marcus } });
    const ids = selectMarcusEvent(state)!.choices.map(c => c.id);
    expect(ids).toContain('confront');
    expect(ids).toContain('ignore');
    expect(ids.some(id => id === 'counter_media' || id === 'community_response')).toBe(true);
  });

  it('returns null when Marcus is inactive', () => {
    const marcus = makeMarcus({ active: false });
    const state = makeState({ turn: 2, antagonists: { marcus_webb: marcus } });
    expect(selectMarcusEvent(state)).toBeNull();
  });
});

describe('9.2 selectMarcusEvent — Phase 2 weaponizes ignored proposals (interpolation)', () => {
  it('interpolates real neighborhood + leader names from a high-pressure proposal', () => {
    const marcus = makeMarcus({
      arc: { phase: 2, sterlingConnectionRevealed: true },
    });
    const state = makeState({
      turn: 12,
      antagonists: { marcus_webb: marcus },
      activeProposals: [
        // Grace leads Brightmoor; food_forest is her top priority.
        makeProposal({ id: 'p1', leaderId: 'grace', tileId: 'brightmoor', pressureLevel: 3, projectDefinitionId: 'food_forest' }),
      ],
    });
    const event = selectMarcusEvent(state)!;
    expect(event.type).toBe('marcus_webb_weaponize_proposal');
    expect(event.description).toContain('Grace');
    expect(event.description).toContain('Brightmoor');
    // Spec: Phase 2 weaponization names the PROJECT too (food_forest → "Food Forest").
    const projectName = PROJECT_CATALOG['food_forest']?.name ?? 'food forest';
    expect(event.description).toContain(projectName);
    expect(event.targetTileId).toBe('brightmoor');
    expect(event.targetCharacterId).toBe('grace');
    expect(event.choices.length).toBeGreaterThanOrEqual(3);
  });

  it('reveals the Sterling Cross funding connection on first Phase 2 event when Sterling is active', () => {
    const marcus = makeMarcus({
      arc: { phase: 2, sterlingConnectionRevealed: false },
    });
    const state = makeState({
      turn: 10,
      antagonists: { marcus_webb: marcus, sterling_cross: makeSterling(true) },
    });
    const event = selectMarcusEvent(state)!;
    expect(event.type).toBe('marcus_webb_sterling_reveal');
    expect(event.description).toContain('Sterling Cross');
  });

  it('names a neglected neighborhood + its leader when no high-pressure proposal exists', () => {
    const marcus = makeMarcus({
      arc: { phase: 2, sterlingConnectionRevealed: true },
    });
    // Default tiles have no active/completed projects → first such tile is "neglected".
    // Heal north_end (Marcus's childhood tile) so the motivation event yields and a
    // generic neglect/wedge attack surfaces instead.
    const base = makeState({ turn: 12, antagonists: { marcus_webb: marcus }, activeProposals: [] });
    const state: GameState = {
      ...base,
      tiles: { ...base.tiles, north_end: { ...base.tiles.north_end, ecologicalHealth: 80, vacancyRate: 10 } },
    };
    const event = selectMarcusEvent(state)!;
    expect(['marcus_webb_neglect_attack', 'marcus_webb_wedge_driver', 'marcus_webb_demagogue_general'])
      .toContain(event.type);
    // A neglect attack must interpolate a real tile name into the title.
    if (event.type === 'marcus_webb_neglect_attack') {
      expect(event.targetTileId).toBeTruthy();
      expect(event.targetCharacterId).toBeTruthy();
    }
  });
});

describe('9.2 selectMarcusEvent — childhood motivation layer (spec 4.6)', () => {
  it('fires the childhood-motivation event when north_end is distressed (default state)', () => {
    const marcus = makeMarcus({
      arc: { phase: 2, sterlingConnectionRevealed: true },
    });
    // Default north_end starts distressed (vacancy 55% > 50%, eco 9% < 30%).
    const state = makeState({ turn: 12, antagonists: { marcus_webb: marcus }, activeProposals: [] });
    const event = selectMarcusEvent(state)!;
    expect(event.type).toBe('marcus_webb_childhood_motivation');
    // References his personal connection to the named neighborhood.
    expect(event.description).toContain('grew up');
    expect(event.description).toContain(state.tiles.north_end.name);
    expect(event.targetTileId).toBe('north_end');
    // Offers an option to address THAT neighborhood directly.
    const invest = event.choices.find(c => c.id === 'invest');
    expect(invest).toBeDefined();
    expect(invest!.label).toContain(state.tiles.north_end.name);
  });

  it('does NOT fire the motivation event when the childhood tile is healthy', () => {
    const marcus = makeMarcus({
      arc: { phase: 2, sterlingConnectionRevealed: true },
    });
    const base = makeState({ turn: 12, antagonists: { marcus_webb: marcus }, activeProposals: [] });
    const state: GameState = {
      ...base,
      tiles: { ...base.tiles, north_end: { ...base.tiles.north_end, ecologicalHealth: 75, vacancyRate: 12 } },
    };
    const event = selectMarcusEvent(state)!;
    expect(event.type).not.toBe('marcus_webb_childhood_motivation');
  });

  it('honors a tileTargets override for the childhood neighborhood', () => {
    const marcus = makeMarcus({
      tileTargets: ['fitzgerald'],
      arc: { phase: 2, sterlingConnectionRevealed: true },
    });
    // fitzgerald is also distressed by default (vacancy 65%); heal north_end so it
    // can't be the source.
    const base = makeState({ turn: 12, antagonists: { marcus_webb: marcus }, activeProposals: [] });
    const state: GameState = {
      ...base,
      tiles: { ...base.tiles, north_end: { ...base.tiles.north_end, ecologicalHealth: 80, vacancyRate: 10 } },
    };
    const event = selectMarcusEvent(state)!;
    expect(event.type).toBe('marcus_webb_childhood_motivation');
    expect(event.targetTileId).toBe('fitzgerald');
  });

  it('yields to a high-pressure ignored proposal over the motivation event', () => {
    const marcus = makeMarcus({
      arc: { phase: 2, sterlingConnectionRevealed: true },
    });
    const state = makeState({
      turn: 12,
      antagonists: { marcus_webb: marcus },
      activeProposals: [
        makeProposal({ id: 'p1', leaderId: 'grace', tileId: 'brightmoor', pressureLevel: 3, projectDefinitionId: 'food_forest' }),
      ],
    });
    const event = selectMarcusEvent(state)!;
    expect(event.type).toBe('marcus_webb_weaponize_proposal');
  });
});

describe('9.2 selectMarcusEvent — Phase 3 & 4 pools', () => {
  it('Phase 3 first event is the council-run announcement with a co_opt option', () => {
    const marcus = makeMarcus({
      arc: { phase: 3, phaseEventsFired: 0, confrontations: 1 },
    });
    const state = makeState({ turn: 22, antagonists: { marcus_webb: marcus } });
    const event = selectMarcusEvent(state)!;
    expect(event.type).toBe('marcus_webb_council_run');
    expect(event.choices.some(c => c.id === 'co_opt')).toBe(true);
  });

  it('Phase 4 reluctant_ally event offers a net-positive choice', () => {
    const marcus = makeMarcus({
      arc: { phase: 4, resolutionType: 'reluctant_ally' },
    });
    const state = makeState({ turn: 38, antagonists: { marcus_webb: marcus } });
    const event = selectMarcusEvent(state)!;
    expect(event.type).toBe('marcus_webb_reluctant_ally');
    expect(event.choices.some(c => c.effects.meterDeltas.some(d => d.amount > 0))).toBe(true);
  });

  it('Phase 4 election_threat event creates a sustained Will drain', () => {
    const marcus = makeMarcus({
      arc: { phase: 4, resolutionType: 'election_threat' },
    });
    const state = makeState({ turn: 38, antagonists: { marcus_webb: marcus } });
    const event = selectMarcusEvent(state)!;
    expect(event.type).toBe('marcus_webb_election_threat');
    expect(event.choices.some(c => c.effects.meterDeltas.some(d => d.meter === 'politicalWill' && d.amount < 0))).toBe(true);
  });
});

describe('9.2 processMarcusArc fires exactly one event and bumps the phase counter', () => {
  it('enqueues a single Marcus event and increments phaseEventCount', () => {
    const marcus = makeMarcus({ phaseEventCount: 0 });
    const state = makeState({ turn: 3, antagonists: { marcus_webb: marcus }, eventQueue: [] });
    const next = processMarcusArc(state);
    const marcusEvents = next.eventQueue.filter(e => e.type.startsWith('marcus_webb_'));
    expect(marcusEvents).toHaveLength(1);
    expect(getMarcus(next)!.phaseEventCount).toBe(1);
  });

  it('transitions phase AND fires the new phase event in one pass', () => {
    const marcus = makeMarcus({
      arc: { phase: 1, ignores: 3 },
      responseHistory: [makeResponse('ignore'), makeResponse('ignore'), makeResponse('ignore')],
    });
    const state = makeState({ turn: 9, antagonists: { marcus_webb: marcus }, eventQueue: [] });
    const next = processMarcusArc(state);
    expect(getMarcus(next)!.arcPhase).toBe(2);
    const ev = next.eventQueue.find(e => e.type.startsWith('marcus_webb_'));
    // A phase-2 event, not a phase-1 pot-shot.
    expect(ev!.type).not.toMatch(/potshot/);
  });
});

// ===========================================================================
// 9.5 — Integration: full resolve pipeline with Marcus phase transitions
// ===========================================================================

describe('9.5 resolve pipeline integration', () => {
  it('Marcus generates exactly one antagonist event per resolved turn (no double-fire)', () => {
    const state = makeState({ turn: 3, eventQueue: [] });
    // Block stochastic events so only Marcus contributes antagonist events.
    const resolved = resolveTurn(state, () => 0.999);
    const marcusEvents = resolved.eventQueue.filter(e => e.type.startsWith('marcus_webb_'));
    expect(marcusEvents).toHaveLength(1);
  });

  it('drives Marcus from Phase 1 to Phase 2 through the live pipeline when ignored repeatedly', () => {
    let state = makeState({ turn: 8, eventQueue: [] });
    // Seed an ignore-heavy history so the turn-9 transition trigger fires.
    const marcus = makeMarcus({
      arc: { ignores: 3 },
      responseHistory: [makeResponse('ignore'), makeResponse('ignore'), makeResponse('ignore')],
    });
    state = { ...state, antagonists: { ...state.antagonists, marcus_webb: marcus } };

    // Turn 8 → resolves to turn 9; phase transition is evaluated at turn 8 state.
    // Advance until we cross turn 9 so the >= 9 threshold is met during evaluation.
    state = { ...state, turn: 9 };
    const resolved = resolveTurn(state, () => 0.999);
    expect(resolved.antagonists.marcus_webb.arcPhase).toBe(2);
  });

  it('keeps the flat arc fields coherent after a resolve (single source of truth)', () => {
    const state = makeState({ turn: 3, eventQueue: [] });
    const resolved = resolveTurn(state, () => 0.999);
    const m = resolved.antagonists.marcus_webb;
    // After one resolve at turn 3 Marcus is still Phase 1 and has fired one event.
    expect(m.arcPhase).toBe(1);
    expect(m.escalationLevel).toBe((m.arcPhase ?? 1) - 1);
    expect(m.phaseEventCount).toBe(1);
  });

  it('end-to-end: respond to Marcus event then resolve — response is logged and arc advances', () => {
    // Phase 1 Marcus, set up so the next resolve will transition him to phase 2.
    let state = makeState({ turn: 9, eventQueue: [] });
    const marcus = makeMarcus({ arc: { ignores: 2 }, responseHistory: [makeResponse('ignore'), makeResponse('ignore')] });
    state = { ...state, antagonists: { ...state.antagonists, marcus_webb: marcus } };

    // Fire a Marcus event into the queue, then have the player ignore it via reducer.
    const fired = processMarcusArc(state);
    const marcusEvent = fired.eventQueue.find(e => e.type.startsWith('marcus_webb_'))!;
    const ignoreChoice = marcusEvent.choices.find(c => c.id === 'ignore');
    expect(ignoreChoice).toBeDefined();
    const afterRespond = gameReducer(fired, { type: 'RESPOND_EVENT', eventId: marcusEvent.id, choiceId: 'ignore' });

    // Response is logged in flat history.
    const history = getMarcus(afterRespond)!.responseHistory!;
    expect(history.length).toBeGreaterThanOrEqual(3);
    expect(history[history.length - 1].kind).toBe('ignore');

    // With 3+ ignores at turn 9, evaluating the transition promotes him to Phase 2.
    const transitioned = evaluateMarcusPhaseTransition(afterRespond);
    expect(getMarcus(transitioned)!.arcPhase).toBe(2);
  });
});
