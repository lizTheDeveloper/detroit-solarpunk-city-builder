import type {
  GameState,
  CommunityLeader,
  Proposal,
  ProposalResponse,
  ActiveProject,
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
  tile: { contamination: number; activeProjects: ActiveProject[] },
): boolean {
  const def = PROJECT_CATALOG[projectId];
  if (!def) return false;

  // Check if project is already active on this tile
  if (tile.activeProjects.some((p) => p.definitionId === projectId)) {
    return false;
  }

  // Check contamination constraint
  if (def.maxContamination !== null && tile.contamination > def.maxContamination) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// generateProposals
// ---------------------------------------------------------------------------

export function generateProposals(state: GameState): Proposal[] {
  const proposals: Proposal[] = [];

  // Sort leaders by id for deterministic ordering
  const leaderIds = Object.keys(state.leaders).sort();

  for (const leaderId of leaderIds) {
    const leader = state.leaders[leaderId];

    // Eligibility: trust >= 0 and no cooldown
    if (leader.trust < 0 || leader.proposalCooldown > 0) {
      continue;
    }

    const tileId = leader.tileIds[0];
    const tile = state.tiles[tileId];
    if (!tile) continue;

    // Find first available priority project
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
    };

    proposals.push(proposal);
  }

  return proposals;
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
      newLeader.trust += 6;
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

    case 'defer': {
      if (newLeader.consecutiveDeferrals >= 2) {
        // Third consecutive deferral -> treat as reject
        newLeader.trust -= 15;
        newLeader.consecutiveDeferrals = 0;
        // proposal is already removed from activeProposals (filtered above)
        // do NOT add to pending
      } else {
        newLeader.trust -= 5;
        newLeader.consecutiveDeferrals += 1;
        newPendingProposals = [...newPendingProposals, proposal];
      }
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
