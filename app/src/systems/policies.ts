import type {
  GameState,
  PolicyDefinition,
  ActivePolicy,
  PublicOpinion,
  MeterDelta,
} from '../state/types';

const DRAIN_CAP = 0.04;

const POLICY_TOPIC_MAP: Record<string, keyof PublicOpinion> = {
  urban_agriculture_zoning: 'foodSovereignty',
  green_infrastructure_grants: 'ecologicalRestoration',
  cooperative_tax_incentives: 'cooperativeEconomics',
  participatory_budgeting: 'cooperativeEconomics',
  community_land_trust: 'landReform',
  water_commons: 'waterCommons',
};

/**
 * Calculate the effective threshold for enacting a policy, reduced by public opinion.
 * effective_threshold = baseThreshold * (1 - topicOpinion * 0.003)
 * topicOpinion is 0-100.
 */
export function calculateEffectiveThreshold(
  policy: PolicyDefinition,
  topicOpinion: number,
): number {
  return policy.baseThreshold * (1 - topicOpinion * 0.003);
}

/**
 * Check whether a policy can be enacted given current game state.
 * Political Will is stored as 0-100 in the meters, thresholds/costs as decimals (0-1).
 * Will (as decimal) must be >= effectiveThreshold + enactmentCost.
 */
export function canEnactPolicy(
  state: GameState,
  policyId: string,
  policyCatalog: Record<string, PolicyDefinition>,
  councilApproved: boolean,
): { allowed: boolean; reason?: string } {
  const policy = policyCatalog[policyId];
  if (!policy) {
    return { allowed: false, reason: `Unknown policy: ${policyId}` };
  }

  // Check if already enacted
  if (state.activePolicies.some((ap) => ap.definitionId === policyId)) {
    return { allowed: false, reason: `Policy "${policy.name}" is already enacted` };
  }

  // Check council vote requirement
  if (policy.requiresCouncilVote && !councilApproved) {
    return { allowed: false, reason: `Policy "${policy.name}" requires council approval` };
  }

  // Determine topic opinion for this policy
  const topic = getPolicyTopicMapping(policyId);
  const topicOpinion = topic ? state.publicOpinion[topic] : 0;

  const effectiveThreshold = calculateEffectiveThreshold(policy, topicOpinion);
  const requiredWill = effectiveThreshold + policy.enactmentCost;

  // Convert Will from 0-100 scale to 0-1 decimal for comparison
  const currentWillDecimal = state.meters.politicalWill / 100;

  if (currentWillDecimal < requiredWill) {
    return {
      allowed: false,
      reason: `Insufficient Political Will: need ${(requiredWill * 100).toFixed(1)}%, have ${state.meters.politicalWill.toFixed(1)}%`,
    };
  }

  return { allowed: true };
}

/**
 * Enact a policy: deduct enactment cost, add to active policies, apply one-time effects.
 * Returns a new GameState (immutable update).
 */
export function enactPolicy(
  state: GameState,
  policyId: string,
  policyCatalog: Record<string, PolicyDefinition>,
): GameState {
  const policy = policyCatalog[policyId];

  // Deduct enactment cost (convert from decimal to 0-100 scale)
  const willDeduction = policy.enactmentCost * 100;

  const newPolicy: ActivePolicy = {
    definitionId: policyId,
    enactedTurn: state.turn,
  };

  return {
    ...state,
    meters: {
      ...state.meters,
      politicalWill: state.meters.politicalWill - willDeduction,
      communityTrust: state.meters.communityTrust + policy.effects.trustBonus,
      foodSovereignty: state.meters.foodSovereignty + policy.effects.foodSovBonus,
    },
    activePolicies: [...state.activePolicies, newPolicy],
  };
}

/**
 * Apply per-turn drain from all active policies.
 * Total drain is capped at DRAIN_CAP (0.04 = 4%).
 * Returns updated state and deltas for the turn summary.
 */
export function applyPolicyDrain(
  state: GameState,
  policyCatalog: Record<string, PolicyDefinition>,
): { state: GameState; deltas: MeterDelta[] } {
  const totalDrain = calculateTotalPolicyDrain(state.activePolicies, policyCatalog);

  if (totalDrain === 0) {
    return { state, deltas: [] };
  }

  // Calculate per-policy drain, proportionally scaled if capped
  const uncappedTotal = state.activePolicies.reduce((sum, ap) => {
    const def = policyCatalog[ap.definitionId];
    return def ? sum + def.ongoingDrain : sum;
  }, 0);

  const scale = uncappedTotal > DRAIN_CAP ? DRAIN_CAP / uncappedTotal : 1;

  const deltas: MeterDelta[] = [];
  let totalWillDrain = 0;

  for (const ap of state.activePolicies) {
    const def = policyCatalog[ap.definitionId];
    if (!def) continue;
    const drain = def.ongoingDrain * scale;
    const drainScaled = drain * 100; // Convert to 0-100 scale
    totalWillDrain += drainScaled;
    deltas.push({
      meter: 'politicalWill',
      amount: -drainScaled,
      source: `policy_drain:${ap.definitionId}`,
    });
  }

  return {
    state: {
      ...state,
      meters: {
        ...state.meters,
        politicalWill: state.meters.politicalWill - totalWillDrain,
      },
    },
    deltas,
  };
}

/**
 * Map a policy ID to its corresponding public opinion topic.
 */
export function getPolicyTopicMapping(policyId: string): keyof PublicOpinion | null {
  return POLICY_TOPIC_MAP[policyId] ?? null;
}

/**
 * Calculate the total ongoing drain from all active policies, capped at DRAIN_CAP.
 */
export function calculateTotalPolicyDrain(
  activePolicies: ActivePolicy[],
  policyCatalog: Record<string, PolicyDefinition>,
): number {
  const total = activePolicies.reduce((sum, ap) => {
    const def = policyCatalog[ap.definitionId];
    return def ? sum + def.ongoingDrain : sum;
  }, 0);
  return Math.min(total, DRAIN_CAP);
}
