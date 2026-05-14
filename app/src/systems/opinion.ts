import type {
  GameState,
  PublicOpinion,
  CounterNarrative,
  MeterDelta,
} from '../state/types';

/** Starting (floor) values for public opinion topics. */
const OPINION_FLOORS: PublicOpinion = {
  foodSovereignty: 15,
  waterCommons: 10,
  landReform: 8,
  ecologicalRestoration: 20,
  cooperativeEconomics: 12,
  nutrientRecycling: 5,
  nuclearEnergy: 15,
  landExpropriation: 8,
  decarceration: 6,
  deGrowth: 3,
};

const DRIFT_RATE = 0.67;

const ALL_OPINION_TOPICS: (keyof PublicOpinion)[] = [
  'foodSovereignty',
  'waterCommons',
  'landReform',
  'ecologicalRestoration',
  'cooperativeEconomics',
  'nutrientRecycling',
  'nuclearEnergy',
  'landExpropriation',
  'decarceration',
  'deGrowth',
];

/**
 * Apply opinion drift: each topic drifts -0.67% per turn.
 * (Was -2% quarterly; /3 for monthly.) Cannot drift below starting values.
 *
 * With the calendar system, there is no per-topic action tracking,
 * so all topics drift uniformly each month.
 */
export function applyOpinionDrift(
  opinion: PublicOpinion,
): PublicOpinion {
  const result: PublicOpinion = { ...opinion };

  for (const topic of ALL_OPINION_TOPICS) {
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

  // Mesh network resistance: community-owned tiles reduce counter-narrative impact
  const meshStrength = Object.values(state.tiles).filter(t => t.communityOwned).length;
  const resistance = meshStrength >= 4 ? 0.70 : 1.0;

  // Always apply will drain (reduced by mesh resistance)
  const effectiveWillDrain = counter.willDrain * resistance;
  if (effectiveWillDrain !== 0) {
    deltas.push({ meter: 'politicalWill', amount: effectiveWillDrain, source: `counter_${counter.type}` });
    newState.meters.politicalWill += effectiveWillDrain;
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
      newState.publicOpinion[highest] -= 2.0 * resistance;
      break;
    }
    case 'developer_lobbying': {
      const budgetDrain = -0.1 * resistance;
      deltas.push({ meter: 'budget', amount: budgetDrain, source: 'counter_developer_lobbying' });
      newState.meters.budget += budgetDrain;
      break;
    }
    case 'state_legislature': {
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
      newState.publicOpinion[highest] -= 3.0 * resistance;
      break;
    }
    case 'federal_intervention': {
      const trustDrain = -2.0 * resistance;
      deltas.push({ meter: 'communityTrust', amount: trustDrain, source: 'counter_federal_intervention' });
      newState.meters.communityTrust += trustDrain;
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
