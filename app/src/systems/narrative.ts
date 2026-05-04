import type {
  GameState,
  NarrativeActionType,
  NarrativeState,
  PublicOpinion,
  CounterNarrative,
  MeterDelta,
} from '../state/types';

/**
 * Calculate how many narrative actions a player gets per turn based on community trust.
 * actions_per_turn = floor(1 + trust / 30), capped at 4.
 */
export function calculateActionsPerTurn(trust: number): number {
  return Math.min(4, Math.floor(1 + trust / 30));
}

/**
 * Base effect values for each narrative action type.
 * Values stored as decimals (0.01 = 1%).
 */
export function getBaseActionValues(actionType: NarrativeActionType): {
  willGain: number;
  trustGain: number;
  policyThresholdReduction: number;
  opinionGain: number;
} {
  const table: Record<NarrativeActionType, { willGain: number; trustGain: number; policyThresholdReduction: number; opinionGain: number }> = {
    community_meeting:  { willGain: 1.0,  trustGain: 1.5,   policyThresholdReduction: 0,    opinionGain: 0 },
    media_campaign:     { willGain: 1.0,  trustGain: 0,     policyThresholdReduction: 0.03, opinionGain: 0 },
    education_program:  { willGain: 0.5,  trustGain: 0,     policyThresholdReduction: 0,    opinionGain: 2.0 },
    cultural_event:     { willGain: 1.0,  trustGain: 1.5,   policyThresholdReduction: 0,    opinionGain: 0 },
    demonstration:      { willGain: 2.0,  trustGain: -1.5,  policyThresholdReduction: 0,    opinionGain: 0 },
    direct_engagement:  { willGain: 0,    trustGain: 0,     policyThresholdReduction: 0,    opinionGain: 0 },
    lobbying:           { willGain: 0,    trustGain: 0,     policyThresholdReduction: 0,    opinionGain: 0 },
  };
  return table[actionType];
}

/**
 * Compounding bonus for consecutive turns on the same topic.
 * bonus = min(0.25, consecutiveTurns * 0.05)
 */
export function calculateCompoundingBonus(consecutiveTurns: number): number {
  return Math.min(0.25, consecutiveTurns * 0.05);
}

/**
 * Apply a narrative action to the game state.
 * Returns the updated state and an array of meter deltas.
 */
export function applyNarrativeAction(
  state: GameState,
  actionType: NarrativeActionType,
  topic: string,
  _target: string,
): { state: GameState; deltas: MeterDelta[] } {
  if (state.narrativeState.actionsRemaining <= 0) {
    throw new Error('No narrative actions remaining this turn');
  }

  const deltas: MeterDelta[] = [];
  const base = getBaseActionValues(actionType);
  const consecutive = state.narrativeState.consecutiveTurns[topic] ?? 0;
  const bonus = calculateCompoundingBonus(consecutive);
  const multiplier = 1 + bonus;

  const effectiveWill = base.willGain * multiplier;
  const effectiveTrust = base.trustGain * multiplier;
  const effectiveOpinion = base.opinionGain * multiplier;

  // Deep copy state
  const newState: GameState = {
    ...state,
    meters: { ...state.meters },
    narrativeState: {
      ...state.narrativeState,
      consecutiveTurns: { ...state.narrativeState.consecutiveTurns },
    },
    publicOpinion: { ...state.publicOpinion },
  };

  // Apply will gain
  if (effectiveWill !== 0) {
    deltas.push({ meter: 'politicalWill', amount: effectiveWill, source: `narrative_${actionType}` });
    newState.meters.politicalWill += effectiveWill;
  }

  // Apply trust gain
  if (effectiveTrust !== 0) {
    deltas.push({ meter: 'communityTrust', amount: effectiveTrust, source: `narrative_${actionType}` });
    newState.meters.communityTrust += effectiveTrust;
  }

  // Apply opinion gain for education_program
  if (actionType === 'education_program' && effectiveOpinion !== 0) {
    const opinionKey = topic as keyof PublicOpinion;
    if (opinionKey in newState.publicOpinion) {
      newState.publicOpinion[opinionKey] += effectiveOpinion;
    }
  }

  // Update consecutive turns for the targeted topic
  newState.narrativeState.consecutiveTurns[topic] = consecutive + 1;

  // Decrement actions remaining
  newState.narrativeState.actionsRemaining -= 1;

  return { state: newState, deltas };
}

/** Starting (floor) values for public opinion topics. */
const OPINION_FLOORS: PublicOpinion = {
  foodSovereignty: 15,
  waterCommons: 10,
  landReform: 8,
  ecologicalRestoration: 20,
  cooperativeEconomics: 12,
};

const DRIFT_RATE = 2.0;

/**
 * Apply opinion drift: each topic drifts -2% per turn if no narrative action was taken.
 * Cannot drift below starting values.
 */
export function applyOpinionDrift(
  opinion: PublicOpinion,
  narrativeState: NarrativeState,
): PublicOpinion {
  const result: PublicOpinion = { ...opinion };
  const topics: (keyof PublicOpinion)[] = [
    'foodSovereignty',
    'waterCommons',
    'landReform',
    'ecologicalRestoration',
    'cooperativeEconomics',
  ];

  for (const topic of topics) {
    const consecutive = narrativeState.consecutiveTurns[topic] ?? 0;
    if (consecutive > 0) {
      // Action was taken on this topic, no drift
      continue;
    }
    const floor = OPINION_FLOORS[topic];
    result[topic] = Math.max(floor, result[topic] - DRIFT_RATE);
  }

  return result;
}

/** Counter-narrative definitions in trigger-check order. */
interface CounterNarrativeDef {
  type: string;
  probability: number;
  willDrain: number;
  otherEffect: string;
  trigger: string | null;
  isEligible: (state: GameState) => boolean;
}

const COUNTER_NARRATIVE_DEFS: CounterNarrativeDef[] = [
  {
    type: 'corporate_media',
    probability: 0.05,
    willDrain: -3.5,
    otherEffect: '-2% highest opinion',
    trigger: null,
    isEligible: () => true,
  },
  {
    type: 'developer_lobbying',
    probability: 0.04,
    willDrain: -2.5,
    otherEffect: '-$0.1M budget',
    trigger: 'land_reform policy enacted',
    isEligible: (state) => state.activePolicies.some(p => p.definitionId === 'land_reform'),
  },
  {
    type: 'state_legislature',
    probability: 0.03,
    willDrain: -5.5,
    otherEffect: '-3% target topic opinion',
    trigger: '3+ policies enacted',
    isEligible: (state) => state.activePolicies.length >= 3,
  },
  {
    type: 'federal_intervention',
    probability: 0.02,
    willDrain: -4.0,
    otherEffect: '-2% Trust',
    trigger: 'restoration stage+',
    isEligible: (state) => state.stage === 'restoration' || state.stage === 'beyond',
  },
  {
    type: 'astroturf_campaign',
    probability: 0.045,
    willDrain: -2.0,
    otherEffect: '-3% Trust',
    trigger: null,
    isEligible: () => true,
  },
  {
    type: 'nimbyism',
    probability: 0.065,
    willDrain: -1.5,
    otherEffect: 'blocks 1 project 1 turn',
    trigger: '3+ concurrent projects',
    isEligible: (state) => {
      let total = 0;
      for (const tile of Object.values(state.tiles)) {
        total += tile.activeProjects.length;
      }
      return total >= 3;
    },
  },
];

/**
 * Generate a counter-narrative event for the turn.
 * Returns at most 1 per turn. Checks triggers in order, first hit wins.
 */
export function generateCounterNarrative(
  state: GameState,
  rng: () => number,
): CounterNarrative | null {
  for (const def of COUNTER_NARRATIVE_DEFS) {
    if (!def.isEligible(state)) {
      continue;
    }
    const roll = rng();
    if (roll < def.probability) {
      return {
        type: def.type,
        willDrain: def.willDrain,
        otherEffect: def.otherEffect,
        probability: def.probability,
        trigger: def.trigger,
      };
    }
  }
  return null;
}

/**
 * Apply a counter-narrative's effects to the game state.
 */
export function applyCounterNarrative(
  state: GameState,
  counter: CounterNarrative,
): { state: GameState; deltas: MeterDelta[] } {
  const deltas: MeterDelta[] = [];
  const newState: GameState = {
    ...state,
    meters: { ...state.meters },
    publicOpinion: { ...state.publicOpinion },
  };

  // Always apply will drain
  if (counter.willDrain !== 0) {
    deltas.push({ meter: 'politicalWill', amount: counter.willDrain, source: `counter_${counter.type}` });
    newState.meters.politicalWill += counter.willDrain;
  }

  // Apply type-specific other effects
  switch (counter.type) {
    case 'corporate_media': {
      // -2% highest opinion
      const topics: (keyof PublicOpinion)[] = [
        'foodSovereignty', 'waterCommons', 'landReform',
        'ecologicalRestoration', 'cooperativeEconomics',
      ];
      let highest: keyof PublicOpinion = topics[0];
      for (const t of topics) {
        if (newState.publicOpinion[t] > newState.publicOpinion[highest]) {
          highest = t;
        }
      }
      newState.publicOpinion[highest] -= 2.0;
      break;
    }
    case 'developer_lobbying': {
      // -$0.1M budget
      deltas.push({ meter: 'budget', amount: -0.1, source: 'counter_developer_lobbying' });
      newState.meters.budget -= 0.1;
      break;
    }
    case 'state_legislature': {
      // -3% target topic opinion (we pick the highest for now)
      const topics: (keyof PublicOpinion)[] = [
        'foodSovereignty', 'waterCommons', 'landReform',
        'ecologicalRestoration', 'cooperativeEconomics',
      ];
      let highest: keyof PublicOpinion = topics[0];
      for (const t of topics) {
        if (newState.publicOpinion[t] > newState.publicOpinion[highest]) {
          highest = t;
        }
      }
      newState.publicOpinion[highest] -= 3.0;
      break;
    }
    case 'federal_intervention': {
      // -2% Trust
      deltas.push({ meter: 'communityTrust', amount: -2.0, source: 'counter_federal_intervention' });
      newState.meters.communityTrust -= 2.0;
      break;
    }
    case 'astroturf_campaign': {
      // -3% Trust
      deltas.push({ meter: 'communityTrust', amount: -3.0, source: 'counter_astroturf_campaign' });
      newState.meters.communityTrust -= 3.0;
      break;
    }
    case 'nimbyism': {
      // blocks 1 project 1 turn - mechanical effect handled by project system
      // No meter delta here, just record it
      break;
    }
  }

  return { state: newState, deltas };
}

/**
 * Reset narrative actions at the start of a new turn.
 * Recalculates actionsPerTurn based on trust.
 * Resets consecutiveTurns for topics not targeted this turn (those with 0 count).
 */
export function resetNarrativeActions(state: GameState): GameState {
  const actionsPerTurn = calculateActionsPerTurn(state.meters.communityTrust);

  // Keep only topics that had actions this turn (consecutiveTurns > 0)
  const newConsecutive: Record<string, number> = {};
  for (const [topic, count] of Object.entries(state.narrativeState.consecutiveTurns)) {
    if (count > 0) {
      newConsecutive[topic] = count;
    }
  }

  return {
    ...state,
    narrativeState: {
      ...state.narrativeState,
      actionsRemaining: actionsPerTurn,
      actionsPerTurn,
      consecutiveTurns: newConsecutive,
    },
  };
}
