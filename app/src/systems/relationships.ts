import type {
  GameState,
  CommunityLeader,
  CouncilMember,
  RelationshipLevel,
  RelationshipChange,
  Coalition,
} from '../state/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// 1. getRelationshipLevel
// ---------------------------------------------------------------------------

export function getRelationshipLevel(trust: number): RelationshipLevel {
  if (trust >= 80) return 'partner';
  if (trust >= 60) return 'champion';
  if (trust >= 40) return 'advocate';
  if (trust >= 0) return 'neutral';
  if (trust >= -20) return 'disillusioned';
  if (trust > -50) return 'opposition';
  return 'hostile';
}

// ---------------------------------------------------------------------------
// 2. applyRelationshipChange
// ---------------------------------------------------------------------------

export function applyRelationshipChange(
  state: GameState,
  change: RelationshipChange,
): GameState {
  const newState = { ...state };

  if (change.characterType === 'leader') {
    const leader = state.leaders[change.characterId];
    if (!leader) return state;
    const newTrust = clamp(leader.trust + change.amount, -100, 100);
    newState.leaders = {
      ...state.leaders,
      [change.characterId]: { ...leader, trust: newTrust },
    };
  } else {
    const member = state.councilMembers[change.characterId];
    if (!member) return state;
    const newDisposition = clamp(member.disposition + change.amount, -100, 100);
    newState.councilMembers = {
      ...state.councilMembers,
      [change.characterId]: { ...member, disposition: newDisposition },
    };
  }

  // Record in turn summary
  if (newState.turnSummary) {
    newState.turnSummary = {
      ...newState.turnSummary,
      deltas: [
        ...newState.turnSummary.deltas,
        {
          meter: 'communityTrust',
          amount: change.amount,
          source: `${change.characterType}:${change.characterId}:${change.source}`,
        },
      ],
    };
  }

  return newState;
}

// ---------------------------------------------------------------------------
// 3. applyLeaderTrustDecay
// ---------------------------------------------------------------------------

export function applyLeaderTrustDecay(
  leaders: Record<string, CommunityLeader>,
): Record<string, CommunityLeader> {
  const result: Record<string, CommunityLeader> = {};

  for (const [id, leader] of Object.entries(leaders)) {
    const { trust } = leader;

    // Hostile: no decay
    if (trust <= -50) {
      result[id] = { ...leader };
      continue;
    }

    // At zero: no decay
    if (trust === 0) {
      result[id] = { ...leader };
      continue;
    }

    // Champion (trust >= 60): decay 0.5/turn
    const decayRate = trust >= 60 ? 0.5 : 1;

    // Drift toward zero
    const direction = trust > 0 ? -1 : 1;
    const newTrust = trust + direction * decayRate;

    result[id] = { ...leader, trust: newTrust };
  }

  return result;
}

// ---------------------------------------------------------------------------
// 4. calculateDistrictConditionBonus
// ---------------------------------------------------------------------------

const CONTAMINATION_THRESHOLD = 50;

export function calculateDistrictConditionBonus(
  state: GameState,
  characterTileIds: string[],
): number {
  let completedCount = 0;
  let degradedCount = 0;

  for (const tileId of characterTileIds) {
    const tile = state.tiles[tileId];
    if (!tile) continue;

    completedCount += tile.completedProjects.length;

    // Degraded: no completed projects AND high contamination
    if (tile.completedProjects.length === 0 && tile.contamination >= CONTAMINATION_THRESHOLD) {
      degradedCount++;
    }
  }

  const projectBonus = Math.min(completedCount * 2, 10);
  const degradedPenalty = Math.max(degradedCount * -2, -10);

  return projectBonus + degradedPenalty;
}

// ---------------------------------------------------------------------------
// 5. canFormCoalition
// ---------------------------------------------------------------------------

export function canFormCoalition(
  state: GameState,
  memberIds: string[],
  topic?: string,
): { allowed: boolean; reason?: string } {
  // Require 3+ members
  if (memberIds.length < 3) {
    return { allowed: false, reason: 'Coalition requires at least 3 community leaders' };
  }

  // All members must have trust >= 40
  for (const id of memberIds) {
    const leader = state.leaders[id];
    if (!leader) {
      return { allowed: false, reason: `Leader ${id} not found` };
    }
    if (leader.trust < 40) {
      return { allowed: false, reason: `Leader ${id} has trust ${leader.trust}, requires >= 40` };
    }
  }

  // Max 2 active coalitions
  const activeCoalitions = state.coalitions.filter((c) => c.active);
  if (activeCoalitions.length >= 2) {
    return { allowed: false, reason: 'Maximum of 2 active coalitions reached' };
  }

  // Members can't already be in another coalition on same topic
  if (topic) {
    for (const coalition of activeCoalitions) {
      if (coalition.topic === topic) {
        const overlap = memberIds.filter((id) => coalition.memberIds.includes(id));
        if (overlap.length > 0) {
          return {
            allowed: false,
            reason: `Members ${overlap.join(', ')} already in coalition on topic "${topic}"`,
          };
        }
      }
    }
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// 6. formCoalition
// ---------------------------------------------------------------------------

export function formCoalition(
  state: GameState,
  name: string,
  memberIds: string[],
  topic: string,
): GameState {
  const check = canFormCoalition(state, memberIds, topic);
  if (!check.allowed) {
    throw new Error(`Cannot form coalition: ${check.reason}`);
  }

  const coalition: Coalition = {
    id: `coalition-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    memberIds,
    topic,
    active: true,
    formedTurn: state.turn,
  };

  return {
    ...state,
    coalitions: [...state.coalitions, coalition],
  };
}

// ---------------------------------------------------------------------------
// 7. updateCoalitions
// ---------------------------------------------------------------------------

export function updateCoalitions(state: GameState): GameState {
  let leaders = { ...state.leaders };
  // Deep-copy each leader so we can safely mutate
  for (const id of Object.keys(leaders)) {
    leaders[id] = { ...leaders[id] };
  }

  const updatedCoalitions: Coalition[] = state.coalitions.map((coalition) => {
    if (!coalition.active) return coalition;

    const membersBelow30 = coalition.memberIds.filter((id) => {
      const leader = leaders[id];
      return leader && leader.trust < 30;
    });

    if (membersBelow30.length >= 2) {
      // Dissolve: apply -5 trust penalty to all members
      for (const id of coalition.memberIds) {
        if (leaders[id]) {
          leaders[id] = {
            ...leaders[id],
            trust: leaders[id].trust - 5,
          };
        }
      }
      return { ...coalition, active: false };
    }

    // Weakened but still active if only 1 below 30
    return coalition;
  });

  return {
    ...state,
    leaders,
    coalitions: updatedCoalitions,
  };
}

// ---------------------------------------------------------------------------
// 8. calculateLeaderTrustMeterBonus
// ---------------------------------------------------------------------------

export function calculateLeaderTrustMeterBonus(
  leaders: Record<string, CommunityLeader>,
): number {
  const entries = Object.values(leaders);
  if (entries.length === 0) return 0;

  const totalTrust = entries.reduce((sum, l) => sum + l.trust, 0);
  const averageTrust = totalTrust / entries.length;

  return averageTrust / 10;
}

// ---------------------------------------------------------------------------
// 9. calculateCouncilWillBonus
// ---------------------------------------------------------------------------

export function calculateCouncilWillBonus(
  members: Record<string, CouncilMember>,
): number {
  let bonus = 0;

  for (const member of Object.values(members)) {
    if (member.disposition >= 30) {
      bonus += 1;
    } else if (member.disposition <= -30) {
      bonus -= 1;
    }
  }

  return bonus;
}

// ---------------------------------------------------------------------------
// 10. calculateNarrativeMultiplier
// ---------------------------------------------------------------------------

export function calculateNarrativeMultiplier(leaderTrust: number): number {
  return 1 + leaderTrust / 200;
}

// ---------------------------------------------------------------------------
// 11. calculateProjectCostModifier
// ---------------------------------------------------------------------------

export function calculateProjectCostModifier(leaderTrust: number): number {
  if (leaderTrust >= 40) return -0.10;
  if (leaderTrust <= -20) return 0.15;
  return 0;
}

// ---------------------------------------------------------------------------
// 12. calculateReElectionScore
// ---------------------------------------------------------------------------

export function calculateReElectionScore(state: GameState): number {
  let score = state.meters.communityTrust;

  // Council members
  for (const member of Object.values(state.councilMembers)) {
    if (member.disposition >= 30) {
      score += 3;
    } else if (member.disposition <= -30) {
      score -= 3;
    }
  }

  // Leaders
  for (const leader of Object.values(state.leaders)) {
    if (leader.trust >= 40) {
      score += 5;
    } else if (leader.trust <= -20) {
      score -= 5;
    }
  }

  // Active coalitions
  const activeCoalitions = state.coalitions.filter((c) => c.active);
  score += activeCoalitions.length * 8;

  // Active antagonists at escalation 3+
  for (const antagonist of Object.values(state.antagonists)) {
    if (antagonist.active && antagonist.escalationLevel >= 3) {
      score -= 3;
    }
  }

  return score;
}
