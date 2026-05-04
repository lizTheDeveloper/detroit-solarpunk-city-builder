import type {
  CouncilMember,
  PolicyDefinition,
  GameState,
  CouncilVote,
  CouncilMemberVote,
  VoteFactor,
  DispositionLevel,
  CommunityLeader,
} from '../state/types';

// ---------------------------------------------------------------------------
// getDispositionLevel
// ---------------------------------------------------------------------------

export function getDispositionLevel(disposition: number): DispositionLevel {
  if (disposition >= 80) return 'coalition_partner';
  if (disposition >= 60) return 'ally';
  if (disposition >= 30) return 'lean_yes';
  if (disposition >= 0) return 'neutral';
  if (disposition >= -20) return 'skeptic';
  if (disposition >= -50) return 'opponent';
  return 'adversary';
}

// ---------------------------------------------------------------------------
// calculateLobbyingBonus
// ---------------------------------------------------------------------------

export function calculateLobbyingBonus(alignment: 'high' | 'medium' | 'low'): number {
  switch (alignment) {
    case 'high':
      return 15;
    case 'medium':
      return 10;
    case 'low':
      return 5;
  }
}

// ---------------------------------------------------------------------------
// resolveVote
// ---------------------------------------------------------------------------

export function resolveVote(
  _member: CouncilMember,
  score: number,
): 'yes' | 'no' | 'abstain' {
  if (score > 0) return 'yes';
  if (score < -10) return 'no';
  return 'abstain';
}

// ---------------------------------------------------------------------------
// calculateVoteScore
// ---------------------------------------------------------------------------

/**
 * Extracts the policy's effective "tags" from its effects for alignment matching.
 * Uses the `other` array as explicit topic tags, plus infers tags from non-zero bonuses.
 */
function getPolicyTags(policy: PolicyDefinition): string[] {
  const tags = new Set<string>(policy.effects.other);
  if (policy.effects.ecoBonus > 0) tags.add('ecology');
  if (policy.effects.trustBonus > 0) tags.add('community');
  if (policy.effects.foodSovBonus > 0) tags.add('food_sovereignty');
  if (policy.effects.budgetBonus > 0) tags.add('budget');
  return Array.from(tags);
}

/**
 * Extracts the policy's "conflict" tags -- things the policy hurts.
 */
function getPolicyConflictTags(policy: PolicyDefinition): string[] {
  const tags: string[] = [];
  if (policy.effects.budgetBonus < 0) tags.push('budget');
  if (policy.effects.ecoBonus < 0) tags.push('ecology');
  if (policy.effects.trustBonus < 0) tags.push('community');
  if (policy.effects.foodSovBonus < 0) tags.push('food_sovereignty');
  return tags;
}

function calculatePolicyPriorityAlignment(
  member: CouncilMember,
  policy: PolicyDefinition,
): number {
  const policyTags = getPolicyTags(policy);
  const conflictTags = getPolicyConflictTags(policy);

  let alignment = 0;
  for (const priority of member.priorities) {
    if (policyTags.includes(priority)) {
      alignment += 10;
    }
    if (conflictTags.includes(priority)) {
      alignment -= 10;
    }
  }

  // Clamp to [-20, +20]
  return Math.max(-20, Math.min(20, alignment));
}

function calculateDistrictConditions(
  member: CouncilMember,
  state: GameState,
): number {
  let totalScore = 0;
  let tileCount = 0;

  for (const tileId of member.tileIds) {
    const tile = state.tiles[tileId];
    if (!tile) continue;
    tileCount++;

    // Positive indicators: completed projects, higher eco health
    const completedCount = tile.completedProjects.length;
    const ecoHealth = tile.ecologicalHealth;

    // Negative indicators: high contamination, low eco health
    const contamination = tile.contamination;

    // Improvement score based on completed projects: +2 per project, capped contribution
    let tileScore = Math.min(completedCount * 2, 8);

    // Eco health bonus: above 30 is good
    if (ecoHealth >= 30) tileScore += 2;

    // Degradation: high contamination and no projects
    if (contamination >= 50 && completedCount === 0) tileScore -= 4;
    if (ecoHealth < 10 && completedCount === 0) tileScore -= 3;
    if (contamination >= 70) tileScore -= 3;

    totalScore += tileScore;
  }

  if (tileCount === 0) return 0;

  // Average across tiles, then clamp to [-10, +10]
  const avg = totalScore / tileCount;
  return Math.max(-10, Math.min(10, avg));
}

function calculateCommunityLeaderAdvocacy(
  policy: PolicyDefinition,
  state: GameState,
): number {
  const policyTags = getPolicyTags(policy);
  let totalAdvocacy = 0;

  for (const leader of Object.values(state.leaders)) {
    // Leader must have trust >= 40 to be an advocate
    if (leader.trust < 40) continue;

    // Check if leader's priorities align with policy
    const hasAlignment = leader.priorities.some((p) => policyTags.includes(p));
    if (hasAlignment) {
      totalAdvocacy += leader.advocacyPower;
    }
  }

  // Cap at +15
  return Math.min(15, totalAdvocacy);
}

export function calculateVoteScore(
  member: CouncilMember,
  policy: PolicyDefinition,
  state: GameState,
  lobbyingBonus: number = 0,
): number {
  const baseDisposition = member.disposition;
  const policyAlignment = calculatePolicyPriorityAlignment(member, policy);
  const districtConditions = calculateDistrictConditions(member, state);
  const communityAdvocacy = calculateCommunityLeaderAdvocacy(policy, state);

  return (
    baseDisposition +
    policyAlignment +
    districtConditions +
    communityAdvocacy +
    lobbyingBonus
  );
}

// ---------------------------------------------------------------------------
// conductCouncilVote
// ---------------------------------------------------------------------------

export function conductCouncilVote(
  state: GameState,
  policyId: string,
  policyDef: PolicyDefinition,
  lobbyingBonuses?: Record<string, number>,
): CouncilVote {
  const memberVotes: CouncilMemberVote[] = [];

  for (const member of Object.values(state.councilMembers)) {
    const lobby = lobbyingBonuses?.[member.id] ?? 0;

    // Calculate individual factors for the breakdown
    const baseDisposition = member.disposition;
    const policyAlignment = calculatePolicyPriorityAlignment(member, policyDef);
    const districtConditions = calculateDistrictConditions(member, state);
    const communityAdvocacy = calculateCommunityLeaderAdvocacy(policyDef, state);

    const factors: VoteFactor[] = [
      { source: 'base_disposition', value: baseDisposition },
      { source: 'policy_priority_alignment', value: policyAlignment },
      { source: 'district_conditions', value: districtConditions },
      { source: 'community_leader_advocacy', value: communityAdvocacy },
    ];

    if (lobby > 0) {
      factors.push({ source: 'lobbying_bonus', value: lobby });
    }

    const score =
      baseDisposition + policyAlignment + districtConditions + communityAdvocacy + lobby;
    const vote = resolveVote(member, score);

    memberVotes.push({
      memberId: member.id,
      vote,
      score,
      factors,
    });
  }

  const yesCount = memberVotes.filter((v) => v.vote === 'yes').length;
  const noCount = memberVotes.filter((v) => v.vote === 'no').length;
  const passed = yesCount >= 5;
  const margin = yesCount - noCount;

  return {
    policyId,
    turn: state.turn,
    votes: memberVotes,
    passed,
    margin,
  };
}

// ---------------------------------------------------------------------------
// applyDispositionDecay
// ---------------------------------------------------------------------------

export function applyDispositionDecay(
  members: Record<string, CouncilMember>,
): Record<string, CouncilMember> {
  const result: Record<string, CouncilMember> = {};

  for (const [id, member] of Object.entries(members)) {
    const disposition = member.disposition;

    // Adversary (<= -50): no decay
    if (disposition <= -50) {
      result[id] = { ...member };
      continue;
    }

    // Already at 0: no change
    if (disposition === 0) {
      result[id] = { ...member };
      continue;
    }

    // Ally (>= 60, which includes coalition_partner >= 80): decay 0.5/turn
    const decayRate = disposition >= 60 ? 0.5 : 1;

    // Drift toward 0
    const newDisposition =
      disposition > 0 ? disposition - decayRate : disposition + decayRate;

    result[id] = { ...member, disposition: newDisposition };
  }

  return result;
}
