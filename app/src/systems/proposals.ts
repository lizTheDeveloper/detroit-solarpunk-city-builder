import type {
  GameState,
  CommunityLeader,
  Proposal,
  ProposalResponse,
  ActiveProject,
  GameEvent,
} from '../state/types';
import { PROJECT_CATALOG } from '../data/content/project-catalog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampTrust(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

function communityLedDuration(baseDuration: number): number {
  return Math.max(baseDuration + 1, Math.ceil(baseDuration * 1.5));
}

function generateReason(leader: CommunityLeader, projectId: string): string {
  const project = PROJECT_CATALOG[projectId];
  const projectName = project ? project.name : projectId;
  return `${leader.name} proposes ${projectName} for ${leader.neighborhood}: "${leader.backstory}"`;
}

function canPlaceOnTile(
  projectId: string,
  tile: { contamination: number; activeProjects: ActiveProject[]; completedProjects: string[] },
): boolean {
  const def = PROJECT_CATALOG[projectId];
  if (!def) return false;

  if (tile.activeProjects.some((p) => p.definitionId === projectId)) {
    return false;
  }

  if (tile.completedProjects.includes(projectId)) {
    return false;
  }

  if (def.maxContamination !== null && tile.contamination > def.maxContamination) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// generateProposals
// ---------------------------------------------------------------------------

const DEFAULT_URGENCY_WINDOW = 3;

export function generateProposals(state: GameState): Proposal[] {
  const proposals: Proposal[] = [];
  const activeLeaderIds = new Set(state.activeProposals.map(p => p.leaderId));

  const leaderIds = Object.keys(state.leaders).sort();

  for (const leaderId of leaderIds) {
    const leader = state.leaders[leaderId];

    if (leader.trust < 0 || leader.proposalCooldown > 0 || activeLeaderIds.has(leaderId)) {
      continue;
    }

    const tileId = leader.tileIds[0];
    const tile = state.tiles[tileId];
    if (!tile) continue;

    let selectedProject: string | null = null;
    for (const priority of leader.priorities) {
      if (canPlaceOnTile(priority, tile)) {
        selectedProject = priority;
        break;
      }
    }

    if (selectedProject === null) continue;

    const proposal: Proposal = {
      id: `${leaderId}_${state.turn}`,
      leaderId,
      projectDefinitionId: selectedProject,
      tileId,
      reason: generateReason(leader, selectedProject),
      turnProposed: state.turn,
      expirationTurn: state.turn + (leader.urgencyWindow ?? DEFAULT_URGENCY_WINDOW),
      pressureLevel: 0,
    };

    proposals.push(proposal);
  }

  return proposals;
}

export function tickProposalPressure(
  proposals: Proposal[],
  currentTurn: number,
  leaders: Record<string, CommunityLeader>,
): { active: Proposal[]; expired: Proposal[]; pressureEvents: GameEvent[] } {
  const active: Proposal[] = [];
  const expired: Proposal[] = [];
  const pressureEvents: GameEvent[] = [];

  for (const p of proposals) {
    if (currentTurn >= p.expirationTurn) {
      expired.push(p);
      continue;
    }

    const ticked: Proposal = { ...p, pressureLevel: p.pressureLevel + 1 };
    active.push(ticked);

    if (ticked.pressureLevel >= 3) {
      const leader = leaders[p.leaderId];
      const leaderName = leader?.name ?? p.leaderId;
      pressureEvents.push({
        id: `pressure_${p.id}_${currentTurn}`,
        type: 'proposal_pressure',
        title: `${leaderName} Goes Public`,
        description: `${leaderName} has taken their ignored proposal to the press. Community frustration is mounting.`,
        category: 'community',
        choices: [],
        turnGenerated: currentTurn,
        cooldownTurns: 0,
        targetTileId: p.tileId,
        targetCharacterId: p.leaderId,
      });
    }
  }

  return { active, expired, pressureEvents };
}

export function applyExpirationPenalties(
  leaders: Record<string, CommunityLeader>,
  expiredProposals: Proposal[],
): Record<string, CommunityLeader> {
  const updated = { ...leaders };
  for (const p of expiredProposals) {
    const leader = updated[p.leaderId];
    if (!leader) continue;
    const basePenalty = leader.trust >= 40 ? -12 : leader.trust >= 0 ? -8 : -3;
    const pressureMultiplier = p.pressureLevel >= 3 ? 1.0 : p.pressureLevel >= 2 ? 0.75 : 0.5;
    const penalty = Math.round(basePenalty * pressureMultiplier);
    updated[p.leaderId] = {
      ...leader,
      trust: clampTrust(leader.trust + penalty),
    };
  }
  return updated;
}

// ---------------------------------------------------------------------------
// applyProposalResponse
// ---------------------------------------------------------------------------

export function applyProposalResponse(
  state: GameState,
  proposalId: string,
  response: ProposalResponse,
): GameState {
  const proposal = state.activeProposals.find((p) => p.id === proposalId);
  if (!proposal) return state;

  const leader = state.leaders[proposal.leaderId];
  if (!leader) return state;

  const def = PROJECT_CATALOG[proposal.projectDefinitionId];
  if (!def) return state;

  // Deep-copy mutable parts of state
  const newLeaders = { ...state.leaders };
  const newLeader = { ...leader };
  newLeaders[leader.id] = newLeader;

  const newMeters = { ...state.meters };
  const newTiles = { ...state.tiles };
  const newActiveProposals = state.activeProposals.filter((p) => p.id !== proposalId);
  let newPendingProposals = [...state.pendingProposals];

  let startProject = false;
  let costMultiplier = 1.0;

  switch (response) {
    case 'accept': {
      const trustBonus = proposal.pressureLevel >= 3 ? 3
        : proposal.pressureLevel >= 2 ? 4
        : proposal.pressureLevel >= 1 ? 5
        : 6;
      newLeader.trust += trustBonus;
      newLeader.consecutiveDeferrals = 0;
      startProject = true;
      costMultiplier = 0.85;
      break;
    }

    case 'modify': {
      newLeader.trust += 2;
      newLeader.consecutiveDeferrals = 0;
      startProject = true;
      costMultiplier = 0.90;
      break;
    }

    case 'reject': {
      newLeader.trust -= 15;
      newLeader.consecutiveDeferrals = 0;
      break;
    }
  }

  // Clamp trust
  newLeader.trust = clampTrust(newLeader.trust);

  // Start project if needed
  if (startProject) {
    const cost = def.baseCost * costMultiplier;
    if (state.meters.budget < cost) return state;
    const duration = communityLedDuration(def.baseDuration);

    const newProject: ActiveProject = {
      definitionId: def.id,
      tileId: proposal.tileId,
      mode: 'community-led',
      progress: 0,
      duration,
      cost,
    };

    const tile = state.tiles[proposal.tileId];
    newTiles[proposal.tileId] = {
      ...tile,
      activeProjects: [...tile.activeProjects, newProject],
    };

    newMeters.budget -= cost;
  }

  return {
    ...state,
    leaders: newLeaders,
    meters: newMeters,
    tiles: newTiles,
    activeProposals: newActiveProposals,
    pendingProposals: newPendingProposals,
  };
}

// ---------------------------------------------------------------------------
// Advocate helpers
// ---------------------------------------------------------------------------

export function isLeaderAdvocate(leader: CommunityLeader): boolean {
  return leader.trust >= 40;
}

export function getAdvocateCount(leaders: Record<string, CommunityLeader>): number {
  return Object.values(leaders).filter(isLeaderAdvocate).length;
}
