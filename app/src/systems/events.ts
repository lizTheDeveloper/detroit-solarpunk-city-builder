import type {
  GameState,
  GameEvent,
  EventChoice,
  EventCategory,
  MeterDelta,
  Antagonist,
  Season,
  Meters,
} from '../state/types';
import type { ActiveArc } from '../state/crisis-types';
import type { ArcTemplate } from '../data/arcs/types';
import { assessTaboo } from './overton-window';
import { scheduleConsequence } from './delayed-consequences';
import { arcTemplateMap } from '../data/arcs';
import { PROJECT_CATALOG } from '../data/content/project-catalog';
import { advanceMarcusPhase, arcPhaseOf, tallyResponses } from './marcus-arc';

// Marcus Webb's childhood neighborhood. North End is an east-side / central
// Detroit neighborhood that starts with high vacancy (~55%) and very low
// ecological health (~9%), led by Tamika Jefferson — it grounds his "I grew up
// on the east side" motivation (spec 4.6) in a real, neglect-prone tile. Marcus's
// antagonist definition carries this in tileTargets; this is the fallback.
const MARCUS_CHILDHOOD_TILE_ID = 'north_end';

/** Resolve Marcus's childhood tile + its leader, honoring tileTargets override. */
function findChildhoodNeighborhood(
  state: GameState,
  ant: Antagonist,
): { tile: GameState['tiles'][string]; leader: GameState['leaders'][string] | null } | null {
  const tileId = ant.tileTargets[0] ?? MARCUS_CHILDHOOD_TILE_ID;
  const tile = state.tiles[tileId];
  if (!tile) return null;
  const leader = Object.values(state.leaders).find(l => l.tileIds.includes(tileId)) ?? null;
  return { tile, leader };
}

/** True when the childhood tile is in visible distress (spec 4.6 trigger). */
function childhoodTileInDistress(tile: GameState['tiles'][string]): boolean {
  return tile.ecologicalHealth < 30 || tile.vacancyRate > 50;
}

/** Human-readable project name from a definition id. */
function projectDisplayName(projectDefinitionId: string): string {
  return PROJECT_CATALOG[projectDefinitionId]?.name ?? projectDefinitionId.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Event definitions: base probabilities, conditions, and choice templates
// ---------------------------------------------------------------------------

interface EventDef {
  type: string;
  category: EventCategory;
  title: string;
  description: string;
  baseProbability: (season: Season) => number;
  condition: (state: GameState) => boolean;
  cooldownTurns: number;
  needsTargetTile: boolean;
  choices: (state: GameState) => EventChoice[];
}

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
        description: 'Expensive, but people remember you showed up',
        effects: {
          meterDeltas: [
            { meter: 'ecologicalHealth', amount: -2, source: 'heat_wave' },
            { meter: 'budget', amount: -0.15, source: 'heat_wave_cooling' },
            { meter: 'communityTrust', amount: 2, source: 'heat_wave_response' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'endure',
        label: 'Community Self-Organize',
        description: 'Free — mutual aid networks step up, but more eco damage without city resources',
        effects: {
          meterDeltas: [
            { meter: 'ecologicalHealth', amount: -4, source: 'heat_wave_unmitigated' },
            { meter: 'communityTrust', amount: 1, source: 'heat_wave_mutual_aid' },
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
        label: 'Full Flood Response',
        description: 'Deploy crews, pump water, relocate families',
        effects: {
          meterDeltas: [
            { meter: 'ecologicalHealth', amount: -2, source: 'flooding' },
            { meter: 'budget', amount: -0.2, source: 'flooding_response' },
          ],
          relationshipChanges: [],
          other: ['-3% tile eco'],
        },
        requirements: null,
      },
      {
        id: 'minimal',
        label: 'Sandbags and Prayers',
        description: 'Cheaper, but the damage lingers and people notice',
        effects: {
          meterDeltas: [
            { meter: 'ecologicalHealth', amount: -5, source: 'flooding_unmitigated' },
            { meter: 'budget', amount: -0.05, source: 'flooding_minimal' },
            { meter: 'communityTrust', amount: -3, source: 'flooding_inaction' },
          ],
          relationshipChanges: [],
          other: ['-8% tile eco'],
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
        description: 'Expensive but projects stay on track',
        effects: {
          meterDeltas: [{ meter: 'budget', amount: -0.15, source: 'severe_storm_repair' }],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'defer_repair',
        label: 'Defer Repairs',
        description: 'Save money now, but all active projects slip 2 months',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.03, source: 'severe_storm_patch' },
            { meter: 'ecologicalHealth', amount: -2, source: 'severe_storm_deferred' },
          ],
          relationshipChanges: [],
          other: ['delays all active projects 2 turns'],
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
        label: 'Deploy Emergency Generators',
        description: 'Keep the lights on — costs real money',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.15, source: 'ice_storm_generators' },
            { meter: 'communityTrust', amount: 2, source: 'ice_storm_response' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'wait_it_out',
        label: 'Wait for DTE',
        description: 'Free — but DTE takes days to restore power in these neighborhoods',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: -3, source: 'ice_storm_inaction' },
            { meter: 'ecologicalHealth', amount: -1, source: 'ice_storm_damage' },
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
        description: 'Refuse the strings — community sees you chose sovereignty over easy money',
        effects: {
          meterDeltas: [
            { meter: 'politicalWill', amount: 2, source: 'federal_grant_independence' },
            { meter: 'communityTrust', amount: 1, source: 'federal_grant_sovereignty' },
          ],
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
        description: 'Pass it to neighbors who need it more — no budget, but builds broader solidarity',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: 2, source: 'mutual_aid_redirect' },
            { meter: 'politicalWill', amount: 1, source: 'mutual_aid_solidarity' },
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
        description: 'Put city money behind it — bigger celebration, bigger impact',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.05, source: 'cultural_celebration_sponsor' },
            { meter: 'communityTrust', amount: 3, source: 'cultural_celebration' },
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
      'Mass water shutoffs threaten vulnerable neighborhoods. The utility doesn\'t care.',
    baseProbability: () => 0.08,
    condition: (state) => state.meters.budget < 1.0,
    cooldownTurns: 4,
    needsTargetTile: false,
    choices: () => [
      {
        id: 'emergency_fund',
        label: 'Pay the Bills',
        description: 'Cover water arrears from city budget — keeps the taps on',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.2, source: 'water_shutoff_pay' },
            { meter: 'communityTrust', amount: 1, source: 'water_shutoff_solidarity' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'protest',
        label: 'Organize Against Shutoffs',
        description: 'Rally at city hall — builds power but water stays off this month',
        effects: {
          meterDeltas: [
            { meter: 'politicalWill', amount: 3, source: 'water_shutoff_protest' },
            { meter: 'communityTrust', amount: -2, source: 'water_shutoff_suffering' },
            { meter: 'ecologicalHealth', amount: -2, source: 'water_shutoff_health' },
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
        description: 'Fix it right — expensive but the neighborhood heals',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.25, source: 'infrastructure_failure' },
            { meter: 'communityTrust', amount: 1, source: 'infrastructure_fixed' },
          ],
          relationshipChanges: [],
          other: ['-3% tile eco'],
        },
        requirements: null,
      },
      {
        id: 'patch',
        label: 'Temporary Patch',
        description: 'Cheap fix — saves money but it\'ll break again and trust erodes',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.08, source: 'infrastructure_failure_patch' },
            { meter: 'communityTrust', amount: -3, source: 'infrastructure_neglect' },
            { meter: 'ecologicalHealth', amount: -3, source: 'infrastructure_decay' },
          ],
          relationshipChanges: [],
          other: ['-8% tile eco', 'infrastructure failure cooldown reduced by 1'],
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
      'Environmental contamination is making people sick. The press is calling.',
    baseProbability: () => 0.04,
    condition: (state) => state.meters.climatePressure > 60,
    cooldownTurns: 4,
    needsTargetTile: false,
    choices: () => [
      {
        id: 'full_response',
        label: 'Full Health Response',
        description: 'Testing, treatment, relocation — it\'ll cost, but saves lives',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.3, source: 'public_health_emergency' },
            { meter: 'communityTrust', amount: 2, source: 'public_health_response' },
            { meter: 'politicalWill', amount: 2, source: 'public_health_leadership' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: { minWill: null, minBudget: 0.3, minTrust: null },
      },
      {
        id: 'limited_response',
        label: 'Issue Advisory',
        description: 'Post a warning and redirect to existing services. Saves $300K but people feel abandoned.',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: -5, source: 'public_health_neglect' },
            { meter: 'politicalWill', amount: 1, source: 'public_health_fiscal_prudence' },
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

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

const CATEGORY_PRIORITY: Record<EventCategory, number> = {
  crisis: 4,
  climate: 3,
  antagonist: 3,
  political: 2,
  community: 1,
};

export function getEventPriority(event: GameEvent): number {
  return CATEGORY_PRIORITY[event.category] ?? 0;
}

// ---------------------------------------------------------------------------
// generateCrisisForkEvent — converts arc template forks into player events
// ---------------------------------------------------------------------------

export function generateCrisisForkEvent(
  arc: ActiveArc,
  template: ArcTemplate,
  state: GameState,
): GameEvent | null {
  const fork = template.crisisForks.find(f => f.stage === arc.currentStage);
  if (!fork) return null;

  const eventType = `crisis_fork_${fork.id}`;
  if (state.eventQueue.some(e => e.type === eventType)) return null;
  if ((state.eventCooldowns[eventType] ?? 0) > 0) return null;

  const choices: EventChoice[] = [];
  for (const forkChoice of fork.choices) {
    const meterDeltas: MeterDelta[] = forkChoice.immediate.map(i => ({
      meter: i.meter as keyof Meters,
      amount: i.amount,
      source: i.source,
    }));

    if (forkChoice.taboo) {
      const assessment = assessTaboo(forkChoice.taboo, state.publicOpinion);
      if (assessment.status === 'locked') continue;
      if (assessment.socialCost > 0) {
        meterDeltas.push({
          meter: 'communityTrust',
          amount: -assessment.socialCost,
          source: `taboo_social_cost_${forkChoice.id}`,
        });
      }
    }

    choices.push({
      id: forkChoice.id,
      label: forkChoice.label,
      description: forkChoice.appeal,
      effects: {
        meterDeltas,
        relationshipChanges: [],
        other: [],
      },
      requirements: null,
    });
  }

  if (choices.length === 0) return null;

  return {
    id: `evt-crisis-fork-${fork.id}-${state.turn}`,
    type: eventType,
    category: 'crisis',
    title: fork.title,
    description: fork.description,
    choices,
    turnGenerated: state.turn,
    cooldownTurns: 999,
    targetTileId: null,
    targetCharacterId: null,
    arcId: arc.arcId,
    crisisForkId: fork.id,
  };
}

// ---------------------------------------------------------------------------
// generateEvents
// ---------------------------------------------------------------------------

export function generateEvents(state: GameState, rng: () => number): GameEvent[] {
  const candidates: GameEvent[] = [];
  const tileIds = Object.keys(state.tiles);

  for (const def of ALL_EVENT_DEFS) {
    // Check cooldown
    if ((state.eventCooldowns[def.type] ?? 0) > 0) continue;

    // Check condition
    if (!def.condition(state)) continue;

    // Compute probability
    let prob = def.baseProbability(state.season);
    if (prob <= 0) continue;

    // Climate probability modifier
    if (def.category === 'climate') {
      prob = prob * (1 + state.meters.climatePressure * 0.01);
    }

    // Roll
    const roll = rng();
    if (roll >= prob) continue;

    // Pick a target tile if needed
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

  // Sort by priority (highest first)
  candidates.sort((a, b) => getEventPriority(b) - getEventPriority(a));

  // Apply per-turn caps
  const result: GameEvent[] = [];
  let crisisCount = 0;
  let climateCount = 0;

  for (const event of candidates) {
    if (result.length >= 3) break;

    if (event.category === 'crisis') {
      if (crisisCount >= 1) continue;
      crisisCount++;
    }

    if (event.category === 'climate') {
      if (climateCount >= 1) continue;
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
): { state: GameState; deltas: MeterDelta[]; applied: boolean } {
  const event = state.eventQueue.find((e) => e.id === eventId);
  if (!event) return { state, deltas: [], applied: false };

  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) return { state, deltas: [], applied: false };

  // Check requirements
  if (choice.requirements) {
    const req = choice.requirements;
    if (req.minWill !== null && state.meters.politicalWill < req.minWill) {
      return { state, deltas: [], applied: false };
    }
    if (req.minBudget !== null && state.meters.budget < req.minBudget) {
      return { state, deltas: [], applied: false };
    }
    if (req.minTrust !== null && state.meters.communityTrust < req.minTrust) {
      return { state, deltas: [], applied: false };
    }
  }

  // Apply meter deltas with clamping to prevent negative budget mid-turn
  const updatedMeters = { ...state.meters };
  for (const delta of choice.effects.meterDeltas) {
    updatedMeters[delta.meter] += delta.amount;
  }
  for (const key of Object.keys(updatedMeters) as Array<keyof typeof updatedMeters>) {
    if (typeof updatedMeters[key] === 'number') {
      updatedMeters[key] = Math.max(0, updatedMeters[key]);
    }
  }

  // Set cooldown
  const cooldownValue = event.cooldownTurns;
  const updatedCooldowns = { ...state.eventCooldowns, [event.type]: cooldownValue };

  // Remove event from queue
  const updatedQueue = state.eventQueue.filter((e) => e.id !== eventId);

  let updatedState: GameState = {
    ...state,
    meters: updatedMeters,
    eventQueue: updatedQueue,
    eventCooldowns: updatedCooldowns,
  };

  // Marcus Webb arc: latch the Sterling/motivation reveal on relevant choices.
  if (event.type.startsWith('marcus_webb_')) {
    updatedState = applyMarcusArcTracking(updatedState, choiceId, event.type);
  }

  // Crisis fork: apply dependency web changes, schedule delayed consequences, update arc
  if (event.arcId && event.crisisForkId) {
    updatedState = applyCrisisForkChoice(updatedState, event.arcId, event.crisisForkId, choiceId);
  }

  return {
    state: updatedState,
    deltas: choice.effects.meterDeltas,
    applied: true,
  };
}

/**
 * Bucket a Marcus event choice into one of the four response kinds used by
 * the derived confront/ignore tallies (see marcus-arc.ts tallyResponses) and the
 * flat responseHistory log.
 * Exported so marcus-arc.ts can classify responses without duplicating the map.
 */
export function classifyMarcusResponse(
  choiceId: string,
): 'confront' | 'ignore' | 'co_opt' | 'strategic' {
  if (choiceId === 'co_opt') return 'co_opt';
  if (choiceId === 'ignore') return 'ignore';
  if (
    choiceId === 'confront' || choiceId === 'attend' || choiceId === 'debate' ||
    choiceId === 'invest' || choiceId === 'leverage' || choiceId === 'acknowledge'
  ) {
    return 'confront';
  }
  // counter_media / community_response / negotiate / cautious / accept etc.
  return 'strategic';
}

/**
 * Latch the Sterling/motivation reveal flag in response to a Marcus event choice.
 *
 * The confront/ignore/co-opt tallies are no longer stored — they are derived from
 * `responseHistory` (appended by the reducer via recordMarcusResponse) on demand
 * in marcus-arc.ts. Here we only maintain the `motivationRevealed` latch, which
 * depends on game state at response time (not reconstructable from history alone).
 */
function applyMarcusArcTracking(
  state: GameState,
  choiceId: string,
  eventType: string,
): GameState {
  const marcus = state.antagonists['marcus_webb'];
  if (!marcus) return state;

  let revealed = marcus.motivationRevealed ?? false;

  // Confronting during a Phase 2 Sterling-active beat surfaces the funding tie.
  if (choiceId === 'confront' && state.antagonists['sterling_cross']?.active &&
      arcPhaseOf(marcus) === 2 && !revealed) {
    revealed = true;
  }

  // The Sterling reveal event itself (now firing or already queued) surfaces it.
  if (eventType === 'marcus_webb_sterling_reveal' ||
      state.eventQueue.some(e => e.type === 'marcus_webb_sterling_reveal')) {
    revealed = true;
  }

  if (revealed === (marcus.motivationRevealed ?? false)) return state;

  return {
    ...state,
    antagonists: {
      ...state.antagonists,
      marcus_webb: { ...marcus, motivationRevealed: revealed },
    },
  };
}

function applyCrisisForkChoice(
  state: GameState,
  arcId: string,
  crisisForkId: string,
  choiceId: string,
): GameState {
  const template = arcTemplateMap[arcId];
  if (!template) return state;

  const fork = template.crisisForks.find(f => f.id === crisisForkId);
  if (!fork) return state;

  const forkChoice = fork.choices.find(c => c.id === choiceId);
  if (!forkChoice) return state;

  let current = state;

  // Update dependency web conditions
  if (forkChoice.conditionsCreated.length > 0 || forkChoice.conditionsRemoved.length > 0) {
    const conditions = new Set(current.dependencyWeb?.conditions ?? []);
    for (const c of forkChoice.conditionsCreated) conditions.add(c);
    for (const c of forkChoice.conditionsRemoved) conditions.delete(c);
    current = {
      ...current,
      dependencyWeb: { ...current.dependencyWeb, conditions: Array.from(conditions) },
    };
  }

  // Schedule delayed consequences
  if (forkChoice.delayedConsequences.length > 0) {
    let queue = [...(current.delayedConsequenceQueue ?? [])];
    for (let i = 0; i < forkChoice.delayedConsequences.length; i++) {
      const dc = forkChoice.delayedConsequences[i];
      queue = scheduleConsequence(queue, {
        id: `dc-${arcId}-${crisisForkId}-${choiceId}-${i}`,
        arcId,
        triggerTurn: current.turn + dc.delay,
        activationConditions: dc.activationConditions,
        cancelConditions: dc.cancelConditions,
        effects: dc.effects.map(e => {
          if (e.type === 'meterDelta') return { type: 'meterDelta' as const, meter: e.meter, amount: e.amount };
          if (e.type === 'tileDamage') return { type: 'tileDamage' as const, tileId: null, damage: e.damage };
          if (e.type === 'spawnEvent') return { type: 'spawnEvent' as const, eventId: e.eventId };
          return { type: 'conditionChange' as const, condition: e.condition, action: e.action };
        }),
        foreshadowHint: dc.foreshadowHint,
        hintTurnsBeforeTrigger: dc.hintTurnsBeforeTrigger,
      });
    }
    current = { ...current, delayedConsequenceQueue: queue };
  }

  // Update arc's lastEventTurn so crisis → reckoning transition fires
  const updatedArcs = current.activeArcs.map(a =>
    a.arcId === arcId ? { ...a, lastEventTurn: current.turn } : a
  );
  current = { ...current, activeArcs: updatedArcs };

  return current;
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

export function checkAntagonistActivation(
  state: GameState,
): Record<string, Antagonist> {
  const updated: Record<string, Antagonist> = {};

  for (const [id, ant] of Object.entries(state.antagonists)) {
    if (ant.active) {
      updated[id] = { ...ant };
      continue;
    }

    let shouldActivate = false;

    switch (id) {
      case 'sterling_cross': {
        // Activates when any tile with 'vacant' terrain has a completed project
        shouldActivate = Object.values(state.tiles).some(
          (tile) => tile.terrain === 'vacant' && tile.completedProjects.length > 0,
        );
        break;
      }
      case 'senator_voss': {
        shouldActivate = state.meters.communityTrust > 55;
        break;
      }
      case 'marcus_webb': {
        // Should already be active from turn 1
        shouldActivate = state.turn >= 1;
        break;
      }
      case 'amanda_chen': {
        shouldActivate = state.stage === 'transition';
        break;
      }
      default:
        break;
    }

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

    // Marcus Webb uses custom phase-based escalation, driven by the flat arc fields.
    if (id === 'marcus_webb') {
      const transitioned = advanceMarcusPhase(ant, state);
      const event = createMarcusEvent(transitioned, state);
      const updated: Antagonist = {
        ...transitioned,
        lastEscalationTurn: state.turn,
        phaseEventCount: (transitioned.phaseEventCount ?? 0) + (event ? 1 : 0),
      };
      updatedAntagonists[id] = updated;
      if (event) events.push(event);
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

// ---------------------------------------------------------------------------
// Marcus Webb 4-phase arc — event builders.
//
// The phase state machine (advanceMarcusPhase / determineResolutionType /
// tallyResponses) lives in marcus-arc.ts. These builders read the flat arc
// fields (arcPhase, phaseEventCount, motivationRevealed, resolutionType) plus
// the derived confront tally to pick and interpolate the phase-appropriate event.
// ---------------------------------------------------------------------------

function findNeglectedNeighborhood(state: GameState): { tile: GameState['tiles'][string]; leader: GameState['leaders'][string] } | null {
  for (const tile of Object.values(state.tiles)) {
    if (tile.activeProjects.length === 0 && tile.completedProjects.length === 0) {
      const leader = Object.values(state.leaders).find(l => l.tileIds.includes(tile.id));
      if (leader) return { tile, leader };
    }
  }
  return null;
}

function findIgnoredProposal(state: GameState): { proposal: GameState['activeProposals'][number]; leader: GameState['leaders'][string] } | null {
  const highPressure = [...state.activeProposals, ...state.pendingProposals]
    .filter(p => p.pressureLevel >= 3)
    .sort((a, b) => b.turnProposed - a.turnProposed);
  if (highPressure.length === 0) return null;

  const proposal = highPressure[0];
  const leader = state.leaders[proposal.leaderId];
  if (!leader) return null;

  return { proposal, leader };
}

function findPartnerLeader(state: GameState): GameState['leaders'][string] | null {
  return Object.values(state.leaders).find(l => l.trust >= 70) ?? null;
}

export function createMarcusEvent(ant: Antagonist, state: GameState): GameEvent | null {
  if (ant.id !== 'marcus_webb') return null;

  const turn = state.turn;
  const eventId = `evt-antag-marcus_webb-${turn}`;

  switch (arcPhaseOf(ant)) {
    case 1:
      return createMarcusPhase1Event(eventId, turn, state);
    case 2:
      return createMarcusPhase2Event(eventId, turn, ant, state);
    case 3:
      return createMarcusPhase3Event(eventId, turn, ant, state);
    case 4:
      return createMarcusPhase4Event(eventId, turn, ant, state);
    default:
      return null;
  }
}

/**
 * Motivation-layer event (spec 4.6): fires when Marcus's childhood tile is in
 * visible distress (eco < 30% OR vacancy > 50%). The text references his personal
 * connection and the player gets an option to address THAT neighborhood directly.
 */
function createMarcusChildhoodEvent(
  eventId: string,
  turn: number,
  tile: GameState['tiles'][string],
  leader: GameState['leaders'][string] | null,
): GameEvent {
  const leaderRef = leader ? ` Ask ${leader.name} — they've watched it happen.` : '';
  return {
    id: eventId,
    type: 'marcus_webb_childhood_motivation',
    category: 'antagonist',
    title: `Marcus Webb: Where I'm From`,
    description: `Webb drops the talk-radio act tonight. "I grew up in ${tile.name}. The vacant lots where my friends' houses used to be — ${tile.vacancyRate}% of that neighborhood is empty now. The contaminated soil. Every administration promised, and ${tile.name} is still bleeding. I'm not doing this for ratings."${leaderRef}`,
    turnGenerated: turn,
    cooldownTurns: 3,
    targetTileId: tile.id,
    targetCharacterId: leader?.id ?? null,
    choices: [
      {
        id: 'invest',
        label: `Prioritize ${tile.name}`,
        description: `Announce a concrete investment plan for ${tile.name} — address his grievance with action, not words`,
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.5, source: 'marcus_webb_childhood_invest' },
            { meter: 'communityTrust', amount: 3, source: 'marcus_webb_childhood_action' },
            { meter: 'politicalWill', amount: -1, source: 'marcus_webb_childhood_invest_cost' },
          ],
          relationshipChanges: [],
          other: [
            `Direct investment commitment for ${tile.name}`,
            ...(leader ? [`${leader.name} trust boost (childhood neighborhood addressed)`] : []),
          ],
        },
        requirements: { minWill: null, minBudget: 1, minTrust: null },
      },
      {
        id: 'acknowledge',
        label: 'Acknowledge the History',
        description: `Respond publicly: "${tile.name} was failed for decades. We're trying to change that." Honesty without a checkbook`,
        effects: {
          meterDeltas: [
            { meter: 'politicalWill', amount: -2, source: 'marcus_webb_childhood_acknowledge' },
            { meter: 'communityTrust', amount: 2, source: 'marcus_webb_childhood_honesty' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'ignore',
        label: 'Stay Quiet',
        description: 'Don\'t touch the personal story — trap or real, it\'s dangerous either way',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: -2, source: 'marcus_webb_childhood_no_empathy' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  };
}

function createMarcusPhase1Event(eventId: string, turn: number, state: GameState): GameEvent {
  const recentProjects = Object.values(state.tiles)
    .flatMap(t => t.activeProjects)
    .slice(0, 1);
  const projectRef = recentProjects.length > 0
    ? recentProjects[0].definitionId.replace(/_/g, ' ')
    : 'community projects';

  const variants = [
    {
      type: 'marcus_webb_potshot_spending',
      title: 'Marcus Webb: Taxpayer Dollar Watch',
      description: `"Another day, another vanity project. The mayor's spending your money on ${projectRef} while potholes swallow cars whole." Webb's show gets modest ratings, but the comments section is heating up.`,
    },
    {
      type: 'marcus_webb_potshot_priorities',
      title: 'Marcus Webb: Misplaced Priorities',
      description: `"Solar panels on abandoned buildings? Community gardens in food deserts? Sure sounds pretty — but where are the JOBS?" Webb's rant goes semi-viral on local Facebook groups.`,
    },
    {
      type: 'marcus_webb_potshot_outsider',
      title: 'Marcus Webb: Who Benefits?',
      description: `"Let's be real about who's really benefiting from this administration's 'green revolution.' Hint: it ain't the folks who've been here for decades." Webb raises an uncomfortable question that some residents echo.`,
    },
    {
      type: 'marcus_webb_potshot_credibility',
      title: 'Marcus Webb: Track Record Check',
      description: `"The mayor promises transformation every week. I promise you the truth every night at 7." Webb's audience is small but loyal, and they vote.`,
    },
  ];

  const variant = variants[turn % variants.length];

  return {
    id: eventId,
    type: variant.type,
    category: 'antagonist',
    title: variant.title,
    description: variant.description,
    turnGenerated: turn,
    cooldownTurns: 2,
    targetTileId: null,
    targetCharacterId: null,
    choices: [
      {
        id: 'confront',
        label: 'Confront On-Air',
        description: 'Call into the show and challenge Webb directly — costs political capital but shows backbone',
        effects: {
          meterDeltas: [
            { meter: 'politicalWill', amount: -3, source: 'marcus_webb_confront_p1' },
            { meter: 'communityTrust', amount: 1, source: 'marcus_webb_stood_up_p1' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'ignore',
        label: 'Don\'t Engage',
        description: 'Stay above the fray — but Webb\'s narrative gains a little ground unchallenged',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: -2, source: 'marcus_webb_unchecked_p1' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'counter_media',
        label: 'Fund Counter-Media',
        description: 'Support local journalism to provide balanced coverage — costs budget but builds lasting credibility',
        effects: {
          meterDeltas: [
            { meter: 'budget', amount: -0.3, source: 'marcus_webb_counter_media_p1' },
            { meter: 'communityTrust', amount: 1, source: 'marcus_webb_media_balance_p1' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: { minWill: null, minBudget: 1, minTrust: null },
      },
    ],
  };
}

function createMarcusPhase2Event(
  eventId: string,
  turn: number,
  ant: Antagonist,
  state: GameState,
): GameEvent {
  const neglected = findNeglectedNeighborhood(state);
  const ignored = findIgnoredProposal(state);
  const partner = findPartnerLeader(state);
  const sterlingActive = state.antagonists['sterling_cross']?.active ?? false;
  const motivationRevealed = ant.motivationRevealed ?? false;

  // Motivation layer (spec 4.6): when his childhood neighborhood is in distress,
  // surface the personal grievance and offer a direct-address option. Yields to
  // the Sterling reveal (which only fires once) and to an active high-pressure
  // ignored proposal, but otherwise takes precedence so the motivation surfaces.
  const childhood = findChildhoodNeighborhood(state, ant);
  if (
    childhood && childhoodTileInDistress(childhood.tile) &&
    !(sterlingActive && !motivationRevealed) &&
    !ignored
  ) {
    return createMarcusChildhoodEvent(eventId, turn, childhood.tile, childhood.leader);
  }

  if (sterlingActive && !motivationRevealed) {
    return {
      id: eventId,
      type: 'marcus_webb_sterling_reveal',
      category: 'antagonist',
      title: 'Marcus Webb: Follow the Money',
      description: `An anonymous tip lands in your inbox: Webb's show is partially funded by Sterling Cross Development LLC. He's been attacking your land reclamation projects while his benefactor buys up the same blocks. The conflict of interest is explosive — if you can prove it.`,
      turnGenerated: turn,
      cooldownTurns: 0,
      targetTileId: null,
      targetCharacterId: null,
      choices: [
        {
          id: 'confront',
          label: 'Go Public with Proof',
          description: 'Release the financial records — nuclear option that costs massive political capital but exposes the corruption',
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -5, source: 'marcus_webb_expose_sterling' },
              { meter: 'communityTrust', amount: 3, source: 'marcus_webb_transparency' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: { minWill: 15, minBudget: null, minTrust: null },
        },
        {
          id: 'ignore',
          label: 'File It Away',
          description: 'Save the evidence for later — but Webb keeps his credibility for now',
          effects: {
            meterDeltas: [
              { meter: 'communityTrust', amount: -1, source: 'marcus_webb_sterling_hidden' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'leverage',
          label: 'Confront Webb Privately',
          description: 'Use the information as leverage — risky but could neutralize him without the public spectacle',
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -2, source: 'marcus_webb_private_leverage' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
      ],
    };
  }

  if (ignored) {
    const { proposal, leader } = ignored;
    const tileName = state.tiles[proposal.tileId]?.name ?? proposal.tileId;
    const projectName = projectDisplayName(proposal.projectDefinitionId);
    return {
      id: eventId,
      type: 'marcus_webb_weaponize_proposal',
      category: 'antagonist',
      title: `Marcus Webb: ${tileName} Abandoned`,
      description: `"${leader.name} begged the mayor for a ${projectName} in ${tileName}. The answer? Silence. This administration doesn't care about Black neighborhoods — they care about photo ops." Webb holds up a printout of the ignored ${projectName} proposal on camera.`,
      turnGenerated: turn,
      cooldownTurns: 2,
      targetTileId: proposal.tileId,
      targetCharacterId: leader.id,
      choices: [
        {
          id: 'confront',
          label: 'Address It Publicly',
          description: `Explain why the proposal was delayed — ${leader.name} may appreciate the honesty`,
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -4, source: 'marcus_webb_confront_p2' },
              { meter: 'communityTrust', amount: 2, source: 'marcus_webb_accountability_p2' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'ignore',
          label: 'Stay Silent',
          description: 'The narrative hurts — trust drops in the targeted neighborhood',
          effects: {
            meterDeltas: [
              { meter: 'communityTrust', amount: -3, source: 'marcus_webb_neglect_exposed' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'community_response',
          label: 'Let Community Organizers Respond',
          description: `Stay out of it — but empower ${tileName} residents to tell their own story`,
          effects: {
            meterDeltas: [
              { meter: 'communityTrust', amount: -1, source: 'marcus_webb_community_handle' },
            ],
            relationshipChanges: [],
            other: ['+1 community power token on target tile'],
          },
          requirements: null,
        },
      ],
    };
  }

  if (neglected) {
    const { tile, leader } = neglected;
    return {
      id: eventId,
      type: 'marcus_webb_neglect_attack',
      category: 'antagonist',
      title: `Marcus Webb: ${tile.name} Forgotten`,
      description: `"While the mayor builds solar panels in the trendy neighborhoods, ${tile.name} hasn't seen a single dollar of investment. Ask ${leader.name} how that feels." Webb's camera crew films crumbling infrastructure.`,
      turnGenerated: turn,
      cooldownTurns: 2,
      targetTileId: tile.id,
      targetCharacterId: leader.id,
      choices: [
        {
          id: 'confront',
          label: 'Announce Investment Plan',
          description: `Promise specific projects for ${tile.name} — costs Will but rebuilds trust`,
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -4, source: 'marcus_webb_confront_neglect' },
              { meter: 'communityTrust', amount: 2, source: 'marcus_webb_promise_invest' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'ignore',
          label: 'Ignore the Segment',
          description: 'Focus on existing priorities — but the neighborhood feels abandoned',
          effects: {
            meterDeltas: [
              { meter: 'communityTrust', amount: -3, source: 'marcus_webb_ignore_neglect' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'community_response',
          label: 'Support Grassroots Response',
          description: `Fund community organizers in ${tile.name} to push back — saves face but costs budget`,
          effects: {
            meterDeltas: [
              { meter: 'budget', amount: -0.3, source: 'marcus_webb_grassroots_p2' },
              { meter: 'communityTrust', amount: 1, source: 'marcus_webb_grassroots_trust' },
            ],
            relationshipChanges: [],
            other: ['+1 community power token on target tile'],
          },
          requirements: { minWill: null, minBudget: 1, minTrust: null },
        },
      ],
    };
  }

  if (partner) {
    return {
      id: eventId,
      type: 'marcus_webb_wedge_driver',
      category: 'antagonist',
      title: `Marcus Webb: Questioning Alliances`,
      description: `"Funny how ${partner.name} went from community advocate to administration lapdog. What promises were made? What was the price?" Webb aims to split the mayor from their strongest ally.`,
      turnGenerated: turn,
      cooldownTurns: 2,
      targetTileId: partner.tileIds[0] ?? null,
      targetCharacterId: partner.id,
      choices: [
        {
          id: 'confront',
          label: 'Defend the Alliance',
          description: `Stand publicly with ${partner.name} — costs Will but solidifies the relationship`,
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -4, source: 'marcus_webb_confront_wedge' },
              { meter: 'communityTrust', amount: 1, source: 'marcus_webb_loyalty' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'ignore',
          label: 'Let It Play Out',
          description: 'Don\'t dignify it with a response — but the seeds of doubt are planted',
          effects: {
            meterDeltas: [
              { meter: 'communityTrust', amount: -2, source: 'marcus_webb_wedge_unchecked' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'counter_media',
          label: 'Amplify Partnership Wins',
          description: 'Release data showing what the partnership has accomplished — facts vs narrative',
          effects: {
            meterDeltas: [
              { meter: 'budget', amount: -0.2, source: 'marcus_webb_counter_wedge' },
              { meter: 'communityTrust', amount: 2, source: 'marcus_webb_facts_win' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: { minWill: null, minBudget: 1, minTrust: null },
        },
      ],
    };
  }

  // Fallback Phase 2 event
  return {
    id: eventId,
    type: 'marcus_webb_demagogue_general',
    category: 'antagonist',
    title: 'Marcus Webb: The People Deserve Better',
    description: `"This city deserves leadership that listens, not lectures. Every week I hear from more residents who feel invisible to this administration." Webb's audience has grown. The comment sections are angrier.`,
    turnGenerated: turn,
    cooldownTurns: 2,
    targetTileId: null,
    targetCharacterId: null,
    choices: [
      {
        id: 'confront',
        label: 'Town Hall Challenge',
        description: 'Invite Webb to a public debate — high risk, high reward',
        effects: {
          meterDeltas: [
            { meter: 'politicalWill', amount: -4, source: 'marcus_webb_confront_p2_gen' },
            { meter: 'communityTrust', amount: 3, source: 'marcus_webb_debate_win' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: { minWill: 20, minBudget: null, minTrust: null },
      },
      {
        id: 'ignore',
        label: 'Stay Focused on Work',
        description: 'Let results speak for themselves — but the narrative keeps building',
        effects: {
          meterDeltas: [
            { meter: 'communityTrust', amount: -2, source: 'marcus_webb_unchecked_p2' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
      {
        id: 'community_response',
        label: 'Community Listening Tour',
        description: 'Launch neighborhood listening sessions — shows you hear the criticism',
        effects: {
          meterDeltas: [
            { meter: 'politicalWill', amount: -2, source: 'marcus_webb_listening_tour' },
            { meter: 'communityTrust', amount: 2, source: 'marcus_webb_listened' },
          ],
          relationshipChanges: [],
          other: [],
        },
        requirements: null,
      },
    ],
  };
}

function createMarcusPhase3Event(
  eventId: string,
  turn: number,
  ant: Antagonist,
  _state: GameState,
): GameEvent {
  const phaseEventsFired = ant.phaseEventCount ?? 0;
  const { confrontations } = tallyResponses(ant.responseHistory ?? []);
  if (phaseEventsFired === 0 && confrontations < 3) {
    return {
      id: eventId,
      type: 'marcus_webb_council_run',
      category: 'antagonist',
      title: 'Marcus Webb: Council Run Announced',
      description: `Marcus Webb announces his candidacy for city council. "I've spent years telling the truth on air. Now I'm going to do it from the inside." His campaign launch draws a crowd. This changes the game.`,
      turnGenerated: turn,
      cooldownTurns: 0,
      targetTileId: null,
      targetCharacterId: null,
      choices: [
        {
          id: 'confront',
          label: 'Oppose Publicly',
          description: 'Endorse his opponent and make this a proxy fight — expensive but prevents him gaining institutional power',
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -5, source: 'marcus_webb_oppose_run' },
              { meter: 'communityTrust', amount: 1, source: 'marcus_webb_oppose_fight' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: { minWill: 20, minBudget: null, minTrust: null },
        },
        {
          id: 'ignore',
          label: 'Let Democracy Work',
          description: 'Don\'t interfere — but if he wins, he\'ll have real power to block your agenda',
          effects: {
            meterDeltas: [
              { meter: 'communityTrust', amount: -2, source: 'marcus_webb_run_unchecked' },
              { meter: 'politicalWill', amount: -3, source: 'marcus_webb_council_threat' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'co_opt',
          label: 'Offer a Seat at the Table',
          description: 'Invite Webb to join an advisory board — controversial but could transform an enemy into an ally',
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -3, source: 'marcus_webb_co_opt_cost' },
              { meter: 'communityTrust', amount: -1, source: 'marcus_webb_co_opt_skepticism' },
            ],
            relationshipChanges: [],
            other: ['Marcus may become ally in Phase 4'],
          },
          requirements: null,
        },
      ],
    };
  }

  const variants = [
    {
      type: 'marcus_webb_endorsement_raid',
      title: 'Marcus Webb: Stealing Endorsements',
      description: `Webb has been meeting with council members behind closed doors. Two moderates are wavering on their support for your infrastructure bill. He's not just talking anymore — he's organizing.`,
      choices: [
        {
          id: 'confront',
          label: 'Shore Up Support',
          description: 'Spend political capital to keep your coalition together',
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -4, source: 'marcus_webb_shore_up' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'ignore',
          label: 'Accept the Loss',
          description: 'Let the votes fall where they may — focus on other battles',
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -2, source: 'marcus_webb_lost_votes' },
              { meter: 'communityTrust', amount: -2, source: 'marcus_webb_weak_coalition' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'negotiate',
          label: 'Negotiate with Waverers',
          description: 'Offer concessions to keep the moderates — pragmatic but dilutes your agenda',
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -1, source: 'marcus_webb_negotiate_mods' },
              { meter: 'budget', amount: -0.3, source: 'marcus_webb_concession_cost' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
      ] as EventChoice[],
    },
    {
      type: 'marcus_webb_rally',
      title: 'Marcus Webb: Community Rally',
      description: `Webb's holding a rally at the old Packard Plant. "The mayor talks green but thinks green — as in money for their friends." Hundreds show up. Some of your supporters are in the crowd, looking uncertain.`,
      choices: [
        {
          id: 'confront',
          label: 'Hold Counter-Rally',
          description: 'Organize your own event — show the community what you\'ve actually built',
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -5, source: 'marcus_webb_counter_rally' },
              { meter: 'communityTrust', amount: 3, source: 'marcus_webb_rally_response' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: { minWill: 15, minBudget: null, minTrust: null },
        },
        {
          id: 'ignore',
          label: 'Let Him Have the Spotlight',
          description: 'Don\'t escalate — but momentum is shifting',
          effects: {
            meterDeltas: [
              { meter: 'communityTrust', amount: -3, source: 'marcus_webb_rally_wins' },
              { meter: 'politicalWill', amount: -2, source: 'marcus_webb_momentum' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'attend',
          label: 'Show Up at His Rally',
          description: 'Walk into the lion\'s den — incredibly risky but could show real courage',
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -3, source: 'marcus_webb_attend_cost' },
              { meter: 'communityTrust', amount: 2, source: 'marcus_webb_attend_courage' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: { minWill: 25, minBudget: null, minTrust: null },
        },
      ] as EventChoice[],
    },
    {
      type: 'marcus_webb_childhood',
      title: 'Marcus Webb: Where I\'m From',
      description: `Tonight's show is different. Webb drops the performance and talks about growing up on the east side — the vacant lots where his friends' houses used to be, the contaminated water, the broken promises from every administration. "I'm not doing this for ratings. I'm doing this because nobody else will."`,
      choices: [
        {
          id: 'confront',
          label: 'Acknowledge His Pain',
          description: 'Respond publicly — "He\'s right about the history. We\'re trying to change the future." Risky honesty',
          effects: {
            meterDeltas: [
              { meter: 'politicalWill', amount: -2, source: 'marcus_webb_acknowledge' },
              { meter: 'communityTrust', amount: 3, source: 'marcus_webb_honesty' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'ignore',
          label: 'Stay Quiet',
          description: 'Don\'t touch the personal story — it\'s a trap or it\'s real, either way dangerous',
          effects: {
            meterDeltas: [
              { meter: 'communityTrust', amount: -2, source: 'marcus_webb_no_empathy' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: null,
        },
        {
          id: 'invest',
          label: 'Prioritize His Neighborhood',
          description: 'Announce investment in the east side — lets actions speak louder than words',
          effects: {
            meterDeltas: [
              { meter: 'budget', amount: -0.5, source: 'marcus_webb_invest_eastside' },
              { meter: 'communityTrust', amount: 2, source: 'marcus_webb_action_words' },
              { meter: 'politicalWill', amount: -1, source: 'marcus_webb_invest_cost' },
            ],
            relationshipChanges: [],
            other: [],
          },
          requirements: { minWill: null, minBudget: 2, minTrust: null },
        },
      ] as EventChoice[],
    },
  ];

  const variant = variants[phaseEventsFired % variants.length];
  return {
    id: eventId,
    type: variant.type,
    category: 'antagonist',
    title: variant.title,
    description: variant.description,
    turnGenerated: turn,
    cooldownTurns: 2,
    targetTileId: null,
    targetCharacterId: null,
    choices: variant.choices,
  };
}

function createMarcusPhase4Event(
  eventId: string,
  turn: number,
  ant: Antagonist,
  _state: GameState,
): GameEvent {
  switch (ant.resolutionType ?? null) {
    case 'reluctant_ally':
      return {
        id: eventId,
        type: 'marcus_webb_reluctant_ally',
        category: 'antagonist',
        title: 'Marcus Webb: Grudging Respect',
        description: `"I still think this mayor's wrong about half of everything. But I've been at the table now, and I've seen the books, and I've seen the work. They're not a grifter — they're just stubborn as hell." Webb's show takes a surprising turn. Your approval ratings tick up.`,
        turnGenerated: turn,
        cooldownTurns: 6,
        targetTileId: null,
        targetCharacterId: null,
        choices: [
          {
            id: 'accept',
            label: 'Welcome the Truce',
            description: 'Accept the olive branch publicly — a powerful moment of political reconciliation',
            effects: {
              meterDeltas: [
                { meter: 'communityTrust', amount: 3, source: 'marcus_webb_ally_trust' },
                { meter: 'politicalWill', amount: 2, source: 'marcus_webb_ally_will' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: null,
          },
          {
            id: 'cautious',
            label: 'Stay Cautious',
            description: 'Accept quietly — don\'t give him too much credit, he caused a lot of damage',
            effects: {
              meterDeltas: [
                { meter: 'communityTrust', amount: 1, source: 'marcus_webb_cautious_ally' },
                { meter: 'politicalWill', amount: 1, source: 'marcus_webb_cautious_will' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: null,
          },
          {
            id: 'leverage',
            label: 'Leverage His Platform',
            description: 'Ask Webb to champion a specific policy on-air — use the détente for maximum impact',
            effects: {
              meterDeltas: [
                { meter: 'communityTrust', amount: 2, source: 'marcus_webb_leverage_ally' },
                { meter: 'politicalWill', amount: 3, source: 'marcus_webb_ally_champion' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: null,
          },
        ],
      };

    case 'election_threat':
      return {
        id: eventId,
        type: 'marcus_webb_election_threat',
        category: 'antagonist',
        title: 'Marcus Webb: The Challenge',
        description: `Marcus Webb announces he's running for mayor. "This city needs someone who listens. I've spent years listening on the air — now I'll listen from City Hall." His campaign has real funding, real volunteers, and real momentum. Polling shows a dead heat.`,
        turnGenerated: turn,
        cooldownTurns: 4,
        targetTileId: null,
        targetCharacterId: null,
        choices: [
          {
            id: 'confront',
            label: 'Campaign Hard',
            description: 'Pour everything into the re-election fight — massive Will drain but you might survive',
            effects: {
              meterDeltas: [
                { meter: 'politicalWill', amount: -8, source: 'marcus_webb_campaign_drain' },
                { meter: 'communityTrust', amount: 2, source: 'marcus_webb_campaign_fight' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: { minWill: 20, minBudget: null, minTrust: null },
          },
          {
            id: 'ignore',
            label: 'Govern, Don\'t Campaign',
            description: 'Let your record speak — principled but dangerous with Webb\'s momentum',
            effects: {
              meterDeltas: [
                { meter: 'politicalWill', amount: -5, source: 'marcus_webb_election_pressure' },
                { meter: 'communityTrust', amount: -3, source: 'marcus_webb_election_doubt' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: null,
          },
          {
            id: 'debate',
            label: 'Challenge to Public Debate',
            description: 'One debate, prime time, no edits — the highest stakes political moment of your career',
            effects: {
              meterDeltas: [
                { meter: 'politicalWill', amount: -4, source: 'marcus_webb_debate_risk' },
                { meter: 'communityTrust', amount: 4, source: 'marcus_webb_debate_courage' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: { minWill: 25, minBudget: null, minTrust: null },
          },
        ],
      };

    case 'cynicism_engine':
    default:
      return {
        id: eventId,
        type: 'marcus_webb_cynicism',
        category: 'antagonist',
        title: 'Marcus Webb: The Grind',
        description: `Webb doesn't attack anymore — he just corrodes. Every night, small jabs. "Another week, another promise." "Remember when they said...?" He's become background noise that slowly poisons the well. His audience is steady, your fatigue is growing.`,
        turnGenerated: turn,
        cooldownTurns: 3,
        targetTileId: null,
        targetCharacterId: null,
        choices: [
          {
            id: 'confront',
            label: 'Final Reckoning',
            description: 'One comprehensive public response — lay out everything you\'ve done and dare Webb to match it',
            effects: {
              meterDeltas: [
                { meter: 'politicalWill', amount: -3, source: 'marcus_webb_final_confront' },
                { meter: 'communityTrust', amount: 2, source: 'marcus_webb_final_defense' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: null,
          },
          {
            id: 'ignore',
            label: 'Endure It',
            description: 'Accept the erosion as the cost of governance — the damage is slow but constant',
            effects: {
              meterDeltas: [
                { meter: 'communityTrust', amount: -1, source: 'marcus_webb_erosion' },
                { meter: 'politicalWill', amount: -1, source: 'marcus_webb_fatigue' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: null,
          },
          {
            id: 'community_response',
            label: 'Empower Community Voices',
            description: 'Fund local media and storytelling projects — drown out the cynicism with lived experience',
            effects: {
              meterDeltas: [
                { meter: 'budget', amount: -0.3, source: 'marcus_webb_community_media' },
                { meter: 'communityTrust', amount: 1, source: 'marcus_webb_community_voice' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: { minWill: null, minBudget: 1, minTrust: null },
          },
        ],
      };
  }
}

function createAntagonistEvent(
  id: string,
  _ant: Antagonist,
  state: GameState,
): GameEvent | null {
  const tileIds = Object.keys(state.tiles);
  const vacantTiles = Object.values(state.tiles)
    .filter((t) => t.terrain === 'vacant')
    .map((t) => t.id);

  switch (id) {
    case 'sterling_cross':
      return {
        id: `evt-antag-${id}-${state.turn}`,
        type: `${id}_land_acquisition`,
        category: 'antagonist',
        title: 'Sterling Cross: Land Acquisition',
        description:
          'Sterling Cross is attempting to acquire vacant land for commercial development.',
        turnGenerated: state.turn,
        cooldownTurns: 3,
        targetTileId: vacantTiles.length > 0 ? vacantTiles[0] : (tileIds[0] ?? null),
        targetCharacterId: null,
        choices: [
          {
            id: 'block',
            label: 'Block Acquisition',
            description: 'Use political capital to block the purchase',
            effects: {
              meterDeltas: [
                { meter: 'politicalWill', amount: -5, source: 'sterling_cross_block' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: { minWill: 20, minBudget: null, minTrust: null },
          },
          {
            id: 'negotiate',
            label: 'Negotiate Terms',
            description: 'Try to get community benefit agreement',
            effects: {
              meterDeltas: [
                { meter: 'politicalWill', amount: -2, source: 'sterling_cross_negotiate' },
              ],
              relationshipChanges: [],
              other: ['+3% gentrification on target'],
            },
            requirements: null,
          },
        ],
      };

    case 'senator_voss':
      return {
        id: `evt-antag-${id}-${state.turn}`,
        type: `${id}_interference`,
        category: 'antagonist',
        title: 'Senator Voss: Political Interference',
        description:
          'Senator Voss is using political influence to undermine community initiatives.',
        turnGenerated: state.turn,
        cooldownTurns: 3,
        targetTileId: null,
        targetCharacterId: null,
        choices: [
          {
            id: 'counter',
            label: 'Counter Campaign',
            description: 'Spend political capital to neutralize Voss — community sees you fight back',
            effects: {
              meterDeltas: [
                { meter: 'politicalWill', amount: -4, source: 'senator_voss_counter' },
                { meter: 'communityTrust', amount: 2, source: 'senator_voss_stood_up' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: null,
          },
          {
            id: 'ignore',
            label: 'Ignore and Keep Building',
            description: 'Don\'t waste energy on Voss — but her narrative chips away at your base',
            effects: {
              meterDeltas: [
                { meter: 'politicalWill', amount: -1, source: 'senator_voss_erosion' },
                { meter: 'communityTrust', amount: -2, source: 'senator_voss_unchallenged' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: null,
          },
        ],
      };

    case 'marcus_webb':
      // Marcus Webb uses phase-based arc system — handled in escalateAntagonists
      return null;

    case 'amanda_chen':
      return {
        id: `evt-antag-${id}-${state.turn}`,
        type: `${id}_ppp_offer`,
        category: 'antagonist',
        title: 'Amanda Chen: Public-Private Partnership',
        description:
          'Amanda Chen offers a public-private partnership that could bring short-term funding.',
        turnGenerated: state.turn,
        cooldownTurns: 3,
        targetTileId: null,
        targetCharacterId: null,
        choices: [
          {
            id: 'accept',
            label: 'Accept Partnership',
            description: 'Take the funding, accept the strings',
            effects: {
              meterDeltas: [
                { meter: 'budget', amount: 0.5, source: 'amanda_chen_accept' },
                { meter: 'communityTrust', amount: -3, source: 'amanda_chen_accept' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: null,
          },
          {
            id: 'decline',
            label: 'Decline Partnership',
            description: 'Maintain community independence',
            effects: {
              meterDeltas: [
                { meter: 'communityTrust', amount: 1, source: 'amanda_chen_decline' },
              ],
              relationshipChanges: [],
              other: [],
            },
            requirements: null,
          },
        ],
      };

    default:
      return null;
  }
}
