import type {
  GameState,
  GameEvent,
  EventChoice,
  EventCategory,
  MeterDelta,
  Antagonist,
  Season,
} from '../state/types';
import { contentRegistry } from '../config/content-registry';
import type { EventDef } from '../config/content-registry';
import { EVENT_CONFIG, CATEGORY_PRIORITY } from '../config/game-config';

export type { EventDef };

// ---------------------------------------------------------------------------
// Event definitions: base probabilities, conditions, and choice templates
// ---------------------------------------------------------------------------

const CLIMATE_EVENTS: EventDef[] = [
  {
    type: 'heat_wave',
    category: 'climate',
    title: 'Heat Wave',
    description: 'An extreme heat wave strikes the city, threatening vulnerable communities.',
    baseProbability: (season) => (season === 'summer' ? 0.15 : 0),
    condition: () => true,
    cooldownTurns: 3,
    needsTargetTile: true,
    choices: () => [
      {
        id: 'emergency_cooling',
        label: 'Open Emergency Cooling Centers',
        description: 'Spend resources to protect residents',
        effects: {
          meterDeltas: [
            { meter: 'ecologicalHealth', amount: -2, source: 'heat_wave' },
            { meter: 'budget', amount: -0.1, source: 'heat_wave' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'endure',
        label: 'Endure the Heat',
        description: 'Let communities fend for themselves',
        effects: {
          meterDeltas: [
            { meter: 'ecologicalHealth', amount: -2, source: 'heat_wave' },
            { meter: 'budget', amount: -0.1, source: 'heat_wave' },
            { meter: 'communityTrust', amount: -2, source: 'heat_wave_inaction' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  },
  {
    type: 'flooding',
    category: 'climate',
    title: 'Flooding',
    description: 'Heavy rains cause flooding in low-lying neighborhoods.',
    baseProbability: (season) =>
      season === 'spring' || season === 'fall' ? 0.12 : 0.05,
    condition: () => true,
    cooldownTurns: 3,
    needsTargetTile: true,
    choices: () => [
      {
        id: 'emergency_response',
        label: 'Emergency Flood Response',
        description: 'Deploy resources for cleanup and relief',
        effects: {
          meterDeltas: [
            { meter: 'ecologicalHealth', amount: -3, source: 'flooding' },
            { meter: 'budget', amount: -0.15, source: 'flooding' },
          ],
          relationshipChanges: [],
          other: ['-5% tile eco'],
        },
        requirements: null,
      },
      {
        id: 'minimal',
        label: 'Minimal Response',
        description: 'Save budget but lose community trust',
        effects: {
          meterDeltas: [
            { meter: 'ecologicalHealth', amount: -3, source: 'flooding' },
            { meter: 'budget', amount: -0.15, source: 'flooding' },
            { meter: 'communityTrust', amount: -3, source: 'flooding_inaction' },
          ],
          relationshipChanges: [],
          other: ['-5% tile eco'],
        },
        requirements: null,
      },
    ],
  },
  {
    type: 'severe_storm',
    category: 'climate',
    title: 'Severe Storm',
    description: 'A severe storm damages infrastructure and delays construction.',
    baseProbability: () => 0.08,
    condition: () => true,
    cooldownTurns: 3,
    needsTargetTile: false,
    choices: () => [
      {
        id: 'repair',
        label: 'Immediate Repairs',
        description: 'Spend to fix damage quickly',
        effects: {
          meterDeltas: [{ meter: 'budget', amount: -0.1, source: 'severe_storm' }],
          relationshipChanges: [],
          other: ['delays 1 active project 1 turn'],
        },
        requirements: null,
      },
      {
        id: 'defer_repair',
        label: 'Defer Repairs',
        description: 'Save money but projects are delayed longer',
        effects: {
          meterDeltas: [{ meter: 'budget', amount: -0.1, source: 'severe_storm' }],
          relationshipChanges: [],
          other: ['delays 1 active project 1 turn'],
        },
        requirements: null,
      },
    ],
  },
  {
    type: 'ice_storm',
    category: 'climate',
    title: 'Ice Storm',
    description: 'An ice storm grips the city, knocking out power in several neighborhoods.',
    baseProbability: (season) => (season === 'winter' ? 0.15 : 0),
    condition: () => true,
    cooldownTurns: 3,
    needsTargetTile: false,
    choices: () => [
      {
        id: 'emergency_aid',
        label: 'Deploy Emergency Aid',
        description: 'Spend budget to help affected areas',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.1, source: 'ice_storm' },
            { meter: 'communityTrust', amount: -1, source: 'ice_storm' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'wait_it_out',
        label: 'Wait for Thaw',
        description: 'Save resources but lose more trust',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.1, source: 'ice_storm' },
            { meter: 'communityTrust', amount: -3, source: 'ice_storm_inaction' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  },
];

const POLITICAL_EVENTS: EventDef[] = [
  {
    type: 'federal_grant',
    category: 'political',
    title: 'Federal Grant Opportunity',
    description:
      'A federal grant is available, but accepting it comes with strings attached.',
    baseProbability: () => 0.06,
    condition: () => true,
    cooldownTurns: 3,
    needsTargetTile: false,
    choices: () => [
      {
        id: 'accept',
        label: 'Accept Grant',
        description: 'Take the money but accept federal oversight',
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
        label: 'Decline Grant',
        description: 'Maintain independence',
        effects: {
          meterDeltas: [],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  },
  {
    type: 'developer_proposal',
    category: 'political',
    title: 'Developer Proposal',
    description:
      'A developer wants to build in the city, promising economic growth.',
    baseProbability: () => 0.08,
    condition: () => true,
    cooldownTurns: 3,
    needsTargetTile: true,
    choices: () => [
      {
        id: 'accept',
        label: 'Accept Proposal',
        description: 'Allow development, risking gentrification',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: 0.3, source: 'developer_proposal_accept' },
          ],
          relationshipChanges: [],
          other: ['+5% gentrification on target'],
        },
        requirements: null,
      },
      {
        id: 'reject',
        label: 'Reject Proposal',
        description: 'Block development, pay lobbying costs',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.05, source: 'developer_proposal_reject' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  },
];

const COMMUNITY_EVENTS: EventDef[] = [
  {
    type: 'neighborhood_request',
    category: 'community',
    title: 'Neighborhood Request',
    description:
      'Community members are requesting a specific project in their neighborhood.',
    baseProbability: () => 0.10,
    condition: (state) => state.meters.communityTrust > 40,
    cooldownTurns: 3,
    needsTargetTile: true,
    choices: () => [
      {
        id: 'honor',
        label: 'Honor the Request',
        description: 'Commit to the community project',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: 3, source: 'neighborhood_request_honored' },
          ],
          relationshipChanges: [],
          other: ['community requests specific project type'],
        },
        requirements: null,
      },
      {
        id: 'defer',
        label: 'Defer',
        description: 'Acknowledge but delay',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: -1, source: 'neighborhood_request_deferred' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  },
  {
    type: 'mutual_aid',
    category: 'community',
    title: 'Mutual Aid Network Activated',
    description:
      'Community mutual aid networks have pooled resources to support the cause.',
    baseProbability: () => 0.05,
    condition: (state) => state.meters.communityTrust > 60,
    cooldownTurns: 3,
    needsTargetTile: false,
    choices: () => [
      {
        id: 'embrace',
        label: 'Embrace Support',
        description: 'Accept community resources',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: 0.3, source: 'mutual_aid' },
            { meter: 'communityTrust', amount: 1, source: 'mutual_aid' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'redirect',
        label: 'Redirect to Others',
        description: 'Direct aid to those who need it more',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: 2, source: 'mutual_aid_redirect' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  },
  {
    type: 'cultural_celebration',
    category: 'community',
    title: 'Cultural Celebration',
    description:
      'A neighborhood cultural festival brings the community together.',
    baseProbability: () => 0.04,
    condition: (state) => state.meters.communityTrust > 50,
    cooldownTurns: 3,
    needsTargetTile: false,
    choices: () => [
      {
        id: 'sponsor',
        label: 'Sponsor the Event',
        description: 'Invest in community celebration',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: 2, source: 'cultural_celebration' },
            { meter: 'politicalWill', amount: 1, source: 'cultural_celebration' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'attend',
        label: 'Attend Only',
        description: 'Show support without spending',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: 1, source: 'cultural_celebration_attend' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  },
];

const CRISIS_EVENTS: EventDef[] = [
  {
    type: 'water_shutoff',
    category: 'crisis',
    title: 'Water Shutoff Crisis',
    description:
      'Mass water shutoffs threaten vulnerable neighborhoods.',
    baseProbability: () => 0.08,
    condition: (state) => state.meters.budget < 1.0,
    cooldownTurns: 4,
    needsTargetTile: false,
    choices: () => [
      {
        id: 'emergency_fund',
        label: 'Emergency Water Fund',
        description: 'Spend to keep water flowing',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: -3, source: 'water_shutoff' },
            { meter: 'politicalWill', amount: -2, source: 'water_shutoff' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'protest',
        label: 'Organize Protest',
        description: 'Rally community against shutoffs',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: -1, source: 'water_shutoff_protest' },
            { meter: 'politicalWill', amount: -3, source: 'water_shutoff_protest' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  },
  {
    type: 'infrastructure_failure',
    category: 'crisis',
    title: 'Infrastructure Failure',
    description:
      'Aging infrastructure has failed, causing widespread damage.',
    baseProbability: () => 0.06,
    condition: (state) => state.meters.ecologicalHealth < 25,
    cooldownTurns: 4,
    needsTargetTile: true,
    choices: () => [
      {
        id: 'repair',
        label: 'Emergency Repairs',
        description: 'Fix the damage immediately',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.2, source: 'infrastructure_failure' },
          ],
          relationshipChanges: [],
          other: ['-5% tile eco'],
        },
        requirements: null,
      },
      {
        id: 'patch',
        label: 'Temporary Patch',
        description: 'Cheap fix that may not last',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.1, source: 'infrastructure_failure_patch' },
            { meter: 'communityTrust', amount: -2, source: 'infrastructure_failure_patch' },
          ],
          relationshipChanges: [],
          other: ['-5% tile eco'],
        },
        requirements: null,
      },
    ],
  },
  {
    type: 'public_health_emergency',
    category: 'crisis',
    title: 'Public Health Emergency',
    description:
      'A public health crisis emerges from environmental contamination.',
    baseProbability: () => 0.04,
    condition: (state) => state.meters.climatePressure > 60,
    cooldownTurns: 4,
    needsTargetTile: false,
    choices: () => [
      {
        id: 'full_response',
        label: 'Full Health Response',
        description: 'Deploy all available health resources',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: -2, source: 'public_health_emergency' },
            { meter: 'budget', amount: -0.3, source: 'public_health_emergency' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'limited_response',
        label: 'Limited Response',
        description: 'Conserve resources with targeted intervention',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: -4, source: 'public_health_limited' },
            { meter: 'budget', amount: -0.15, source: 'public_health_limited' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  },
];

const ALL_EVENT_DEFS: EventDef[] = [
  ...CRISIS_EVENTS,
  ...CLIMATE_EVENTS,
  ...POLITICAL_EVENTS,
  ...COMMUNITY_EVENTS,
];

// Register built-in events with the content registry
contentRegistry.registerEvents(ALL_EVENT_DEFS);

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

export function getEventPriority(event: GameEvent): number {
  return CATEGORY_PRIORITY[event.category] ?? 0;
}

// ---------------------------------------------------------------------------
// generateEvents
// ---------------------------------------------------------------------------

export function generateEvents(state: GameState, rng: () => number): GameEvent[] {
  const candidates: GameEvent[] = [];
  const tileIds = Object.keys(state.tiles);
  const registeredDefs = contentRegistry.getEventDefs();

  for (const def of registeredDefs) {
    if ((state.eventCooldowns[def.type] ?? 0) > 0) continue;
    if (!def.condition(state)) continue;

    let prob = def.baseProbability(state.season);
    if (prob <= 0) continue;

    if (def.category === 'climate') {
      prob = prob * (1 + state.meters.climatePressure * EVENT_CONFIG.climateProbabilityModifier);
    }

    const roll = rng();
    if (roll >= prob) continue;

    let targetTileId: string | null = null;
    if (def.needsTargetTile && tileIds.length > 0) {
      const idx = Math.floor(rng() * tileIds.length);
      targetTileId = tileIds[idx < tileIds.length ? idx : 0];
    }

    const event: GameEvent = {
      id: `evt-${def.type}-${state.turn}-${candidates.length}`,
      type: def.type,
      category: def.category,
      title: def.title,
      description: def.description,
      choices: def.choices(state),
      turnGenerated: state.turn,
      cooldownTurns: def.cooldownTurns,
      targetTileId,
      targetCharacterId: null,
    };

    candidates.push(event);
  }

  candidates.sort((a, b) => getEventPriority(b) - getEventPriority(a));

  const result: GameEvent[] = [];
  let crisisCount = 0;
  let climateCount = 0;

  for (const event of candidates) {
    if (result.length >= EVENT_CONFIG.maxEventsPerTurn) break;

    if (event.category === 'crisis') {
      if (crisisCount >= EVENT_CONFIG.maxCrisisPerTurn) continue;
      crisisCount++;
    }

    if (event.category === 'climate') {
      if (climateCount >= EVENT_CONFIG.maxClimatePerTurn) continue;
      climateCount++;
    }

    result.push(event);
  }

  return result;
}

// ---------------------------------------------------------------------------
// applyEventChoice
// ---------------------------------------------------------------------------

export function applyEventChoice(
  state: GameState,
  eventId: string,
  choiceId: string,
): { state: GameState; deltas: MeterDelta[] } {
  const event = state.eventQueue.find((e) => e.id === eventId);
  if (!event) return { state, deltas: [] };

  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) return { state, deltas: [] };

  // Check requirements
  if (choice.requirements) {
    const req = choice.requirements;
    if (req.minWill !== null && state.meters.politicalWill < req.minWill) {
      return { state, deltas: [] };
    }
    if (req.minBudget !== null && state.meters.budget < req.minBudget) {
      return { state, deltas: [] };
    }
    if (req.minTrust !== null && state.meters.communityTrust < req.minTrust) {
      return { state, deltas: [] };
    }
  }

  // Apply meter deltas
  const updatedMeters = { ...state.meters };
  for (const delta of choice.effects.meterDeltas) {
    updatedMeters[delta.meter] += delta.amount;
  }

  // Set cooldown
  const cooldownValue = event.cooldownTurns;
  const updatedCooldowns = { ...state.eventCooldowns, [event.type]: cooldownValue };

  // Remove event from queue
  const updatedQueue = state.eventQueue.filter((e) => e.id !== eventId);

  return {
    state: {
      ...state,
      meters: updatedMeters,
      eventQueue: updatedQueue,
      eventCooldowns: updatedCooldowns,
    },
    deltas: choice.effects.meterDeltas,
  };
}

// ---------------------------------------------------------------------------
// updateEventCooldowns
// ---------------------------------------------------------------------------

export function updateEventCooldowns(
  cooldowns: Record<string, number>,
): Record<string, number> {
  const updated: Record<string, number> = {};
  for (const [key, value] of Object.entries(cooldowns)) {
    const next = value - 1;
    if (next > 0) {
      updated[key] = next;
    }
  }
  return updated;
}

// ---------------------------------------------------------------------------
// checkAntagonistActivation
// ---------------------------------------------------------------------------

// Built-in antagonist activation rules — register with content registry
const BUILTIN_ANTAGONIST_RULES: Array<{ id: string; shouldActivate: (state: GameState) => boolean }> = [
  {
    id: 'sterling_cross',
    shouldActivate: (state) => Object.values(state.tiles).some(
      (tile) => tile.terrain === 'vacant' && tile.completedProjects.length > 0,
    ),
  },
  {
    id: 'senator_voss',
    shouldActivate: (state) => state.meters.communityTrust > 55,
  },
  {
    id: 'marcus_webb',
    shouldActivate: (state) => state.turn >= 1,
  },
  {
    id: 'amanda_chen',
    shouldActivate: (state) => state.stage === 'transition',
  },
];

for (const rule of BUILTIN_ANTAGONIST_RULES) {
  contentRegistry.registerAntagonistRule(rule);
}

export function checkAntagonistActivation(
  state: GameState,
): Record<string, Antagonist> {
  const updated: Record<string, Antagonist> = {};

  for (const [id, ant] of Object.entries(state.antagonists)) {
    if (ant.active) {
      updated[id] = { ...ant };
      continue;
    }

    const rule = contentRegistry.getAntagonistRule(id);
    const shouldActivate = rule ? rule.shouldActivate(state) : false;

    updated[id] = { ...ant, active: shouldActivate ? true : ant.active };
  }

  return updated;
}

// ---------------------------------------------------------------------------
// escalateAntagonists
// ---------------------------------------------------------------------------

export function escalateAntagonists(
  state: GameState,
): { antagonists: Record<string, Antagonist>; events: GameEvent[] } {
  const updatedAntagonists: Record<string, Antagonist> = {};
  const events: GameEvent[] = [];

  for (const [id, ant] of Object.entries(state.antagonists)) {
    if (!ant.active) {
      updatedAntagonists[id] = { ...ant };
      continue;
    }

    const turnsSinceLastEscalation = state.turn - ant.lastEscalationTurn;
    if (turnsSinceLastEscalation < ant.escalationInterval) {
      updatedAntagonists[id] = { ...ant };
      continue;
    }

    // Escalate
    const escalated: Antagonist = {
      ...ant,
      escalationLevel: ant.escalationLevel + 1,
      lastEscalationTurn: state.turn,
    };
    updatedAntagonists[id] = escalated;

    // Generate antagonist event
    const event = createAntagonistEvent(id, escalated, state);
    if (event) events.push(event);
  }

  return { antagonists: updatedAntagonists, events };
}

// Built-in antagonist event factories — register with content registry
const BUILTIN_ANTAGONIST_EVENT_FACTORIES = [
  {
    id: 'sterling_cross',
    createEvent: (_ant: Antagonist, state: GameState): GameEvent | null => {
      const tileIds = Object.keys(state.tiles);
      const vacantTiles = Object.values(state.tiles)
        .filter((t) => t.terrain === 'vacant')
        .map((t) => t.id);
      return {
        id: `evt-antag-sterling_cross-${state.turn}`,
        type: 'sterling_cross_land_acquisition',
        category: 'antagonist' as const,
        title: 'Sterling Cross: Land Acquisition',
        description: 'Sterling Cross is attempting to acquire vacant land for commercial development.',
        turnGenerated: state.turn,
        cooldownTurns: 3,
        targetTileId: vacantTiles.length > 0 ? vacantTiles[0] : (tileIds[0] ?? null),
        targetCharacterId: null,
        choices: [
          {
            id: 'block', label: 'Block Acquisition',
            description: 'Use political capital to block the purchase',
            effects: { meterDeltas: [{ meter: 'politicalWill', amount: -5, source: 'sterling_cross_block' }], relationshipChanges: [], other: [] },
            requirements: { minWill: 20, minBudget: null, minTrust: null },
          },
          {
            id: 'negotiate', label: 'Negotiate Terms',
            description: 'Try to get community benefit agreement',
            effects: { meterDeltas: [{ meter: 'politicalWill', amount: -2, source: 'sterling_cross_negotiate' }], relationshipChanges: [], other: ['+3% gentrification on target'] },
            requirements: null,
          },
        ],
      };
    },
  },
  {
    id: 'senator_voss',
    createEvent: (_ant: Antagonist, state: GameState): GameEvent | null => ({
      id: `evt-antag-senator_voss-${state.turn}`,
      type: 'senator_voss_interference',
      category: 'antagonist' as const,
      title: 'Senator Voss: Political Interference',
      description: 'Senator Voss is using political influence to undermine community initiatives.',
      turnGenerated: state.turn, cooldownTurns: 3, targetTileId: null, targetCharacterId: null,
      choices: [
        { id: 'counter', label: 'Counter Campaign', description: 'Spend political will to counter the narrative',
          effects: { meterDeltas: [{ meter: 'politicalWill', amount: -4, source: 'senator_voss_counter' }], relationshipChanges: [], other: [] }, requirements: null },
        { id: 'ignore', label: 'Ignore', description: 'Focus on local work instead',
          effects: { meterDeltas: [{ meter: 'politicalWill', amount: -2, source: 'senator_voss_ignore' }], relationshipChanges: [], other: [] }, requirements: null },
      ],
    }),
  },
  {
    id: 'marcus_webb',
    createEvent: (_ant: Antagonist, state: GameState): GameEvent | null => ({
      id: `evt-antag-marcus_webb-${state.turn}`,
      type: 'marcus_webb_counter_narrative',
      category: 'antagonist' as const,
      title: 'Marcus Webb: Counter-Narrative',
      description: 'Marcus Webb is spreading a counter-narrative undermining community trust.',
      turnGenerated: state.turn, cooldownTurns: 3, targetTileId: null, targetCharacterId: null,
      choices: [
        { id: 'rebut', label: 'Public Rebuttal', description: 'Address the narrative head-on',
          effects: { meterDeltas: [{ meter: 'politicalWill', amount: -3, source: 'marcus_webb_rebut' }, { meter: 'communityTrust', amount: -1, source: 'marcus_webb_rebut' }], relationshipChanges: [], other: [] }, requirements: null },
        { id: 'community_response', label: 'Community Response', description: 'Let community voices counter the narrative',
          effects: { meterDeltas: [{ meter: 'politicalWill', amount: -1, source: 'marcus_webb_community' }, { meter: 'communityTrust', amount: -2, source: 'marcus_webb_community' }], relationshipChanges: [], other: [] }, requirements: null },
      ],
    }),
  },
  {
    id: 'amanda_chen',
    createEvent: (_ant: Antagonist, state: GameState): GameEvent | null => ({
      id: `evt-antag-amanda_chen-${state.turn}`,
      type: 'amanda_chen_ppp_offer',
      category: 'antagonist' as const,
      title: 'Amanda Chen: Public-Private Partnership',
      description: 'Amanda Chen offers a public-private partnership that could bring short-term funding.',
      turnGenerated: state.turn, cooldownTurns: 3, targetTileId: null, targetCharacterId: null,
      choices: [
        { id: 'accept', label: 'Accept Partnership', description: 'Take the funding, accept the strings',
          effects: { meterDeltas: [{ meter: 'budget', amount: 0.5, source: 'amanda_chen_accept' }, { meter: 'communityTrust', amount: -3, source: 'amanda_chen_accept' }], relationshipChanges: [], other: [] }, requirements: null },
        { id: 'decline', label: 'Decline Partnership', description: 'Maintain community independence',
          effects: { meterDeltas: [{ meter: 'communityTrust', amount: 1, source: 'amanda_chen_decline' }], relationshipChanges: [], other: [] }, requirements: null },
      ],
    }),
  },
];

for (const factory of BUILTIN_ANTAGONIST_EVENT_FACTORIES) {
  contentRegistry.registerAntagonistEventFactory(factory);
}

function createAntagonistEvent(
  id: string,
  ant: Antagonist,
  state: GameState,
): GameEvent | null {
  const factory = contentRegistry.getAntagonistEventFactory(id);
  if (factory) return factory.createEvent(ant, state);
  return null;
}
