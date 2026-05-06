import type { GameState } from '../state/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ElectionScoreBreakdown {
  baseTrust: number;
  councilSupport: number;
  leaderAdvocates: number;
  coalitionBonus: number;
  antagonistPenalty: number;
  politicalWill: number;
  displacementPenalty: number;
}

export interface ElectionResult {
  score: number;
  won: boolean;
  breakdown: ElectionScoreBreakdown;
  margin: number;
}

export interface CampaignBonuses {
  extraNarrativeActions: number;
  trustGainMultiplier: number;
  lobbyingEffectivenessBonus: number;
}

// ---------------------------------------------------------------------------
// 1. isElectionTurn
// ---------------------------------------------------------------------------

export function isElectionTurn(turn: number): boolean {
  return turn === 48 || turn === 96 || turn === 144 || turn === 192;
}

// ---------------------------------------------------------------------------
// 2. isCampaignTurn
// ---------------------------------------------------------------------------

export function isCampaignTurn(turn: number): boolean {
  return turn === 47 || turn === 95 || turn === 143 || turn === 191;
}

// ---------------------------------------------------------------------------
// 3. calculateElectionScore
// ---------------------------------------------------------------------------

/**
 * Election scoring calibrated to Detroit mayoral elections 2013-2025.
 * - Duggan 2013: 55% vote, contested, trust ~55% equivalent
 * - Duggan 2017: 72% vote, comfortable, trust ~72%
 * - Duggan 2021: 75% vote, blowout, trust ~75%
 * - Sheffield 2025: 77% vote, mandate, trust ~77%
 * Turnout only 18-22%, so engaged community (leaders/council) matters disproportionately.
 * Trust < 50% = lose. Trust 55% + some allies = barely win. Trust 70%+ = safe.
 * Source: Ballotpedia, BridgeDetroit, Detroit News polling.
 */
export function calculateElectionScore(state: GameState): ElectionResult {
  // baseTrust: communityTrust * 0.6 (primary factor — trust IS the election)
  const baseTrust = state.meters.communityTrust * 0.6;

  // councilSupport: +2 per friendly (disposition > 30), -2 per hostile (disposition < -20)
  // 9 council members, so max ±18. Represents endorsement/opposition machine.
  let councilSupport = 0;
  for (const member of Object.values(state.councilMembers)) {
    if (member.disposition > 30) {
      councilSupport += 2;
    } else if (member.disposition < -20) {
      councilSupport -= 2;
    }
  }

  // leaderAdvocates: +3 per leader with trust >= 40
  // Community leaders drive turnout in their neighborhoods (800 block clubs)
  let leaderAdvocates = 0;
  for (const leader of Object.values(state.leaders)) {
    if (leader.trust >= 40) {
      leaderAdvocates += 3;
    }
  }

  // coalitionBonus: +5 per active coalition (Detroit organizing: 20+ orgs = actionable)
  const activeCoalitions = state.coalitions.filter((c) => c.active);
  const coalitionBonus = activeCoalitions.length * 5;

  // antagonistPenalty: -4 per antagonist with escalationLevel >= 3
  // Opposition from business/state can kill even popular incumbents (Prop P lesson)
  let antagonistPenalty = 0;
  for (const antagonist of Object.values(state.antagonists)) {
    if (antagonist.escalationLevel >= 3) {
      antagonistPenalty -= 4;
    }
  }

  // politicalWill: Math.min(8, state.meters.politicalWill * 0.08)
  const politicalWill = Math.min(8, state.meters.politicalWill * 0.08);

  // displacementPenalty: -3 per tile with gentrificationPressure > 50
  // Gentrification was the core issue in Duggan 2017 (Young II ran on "neighborhoods left behind")
  let displacementPenalty = 0;
  for (const tile of Object.values(state.tiles)) {
    if (tile.gentrificationPressure > 50) {
      displacementPenalty -= 3;
    }
  }

  const breakdown: ElectionScoreBreakdown = {
    baseTrust,
    councilSupport,
    leaderAdvocates,
    coalitionBonus,
    antagonistPenalty,
    politicalWill,
    displacementPenalty,
  };

  const score =
    baseTrust +
    councilSupport +
    leaderAdvocates +
    coalitionBonus +
    antagonistPenalty +
    politicalWill +
    displacementPenalty;

  // Threshold 45 (not 50) because the bonus sources push a trust-50% player to ~30 base
  // + some allies. This means 50% trust alone isn't enough — you need some allies too.
  const threshold = 45;
  const margin = score - threshold;

  return {
    score,
    won: score >= threshold,
    breakdown,
    margin,
  };
}

// ---------------------------------------------------------------------------
// 4. getCampaignBonuses
// ---------------------------------------------------------------------------

export function getCampaignBonuses(): CampaignBonuses {
  return {
    extraNarrativeActions: 2,
    trustGainMultiplier: 1.5,
    lobbyingEffectivenessBonus: 5,
  };
}

// ---------------------------------------------------------------------------
// 5. applyElectionResult
// ---------------------------------------------------------------------------

export function applyElectionResult(state: GameState, result: ElectionResult): GameState {
  if (!result.won) {
    return {
      ...state,
      lossCondition: 'reelection',
    };
  }

  // Won: +10% Political Will, +5% Community Trust
  let newPoliticalWill = state.meters.politicalWill * 1.1;
  let newCommunityTrust = state.meters.communityTrust * 1.05;
  let newBudget = state.meters.budget;

  // Won by large margin (margin > 20): +$500K (0.5M) bonus
  if (result.margin > 20) {
    newBudget += 0.5;
  }

  return {
    ...state,
    meters: {
      ...state.meters,
      politicalWill: newPoliticalWill,
      communityTrust: newCommunityTrust,
      budget: newBudget,
    },
  };
}

// ---------------------------------------------------------------------------
// 6. getElectionNarrative
// ---------------------------------------------------------------------------

export function getElectionNarrative(result: ElectionResult): string {
  if (result.won) {
    if (result.margin > 20) {
      return 'A resounding mandate. The community believes in the vision.';
    }
    if (result.margin <= 10) {
      return 'A close call. The community gave you another chance — barely.';
    }
    return 'A solid victory. The work is paying off.';
  }

  // Lost
  if (result.margin >= -10) {
    return "So close. The community wasn't quite ready to continue.";
  }
  return 'A clear rejection. The community chose a different path.';
}

// ---------------------------------------------------------------------------
// 7. predictElectionOutcome
// ---------------------------------------------------------------------------

export function predictElectionOutcome(state: GameState): { predictedScore: number; risks: string[] } {
  const result = calculateElectionScore(state);
  const risks: string[] = [];

  // Low community trust
  if (state.meters.communityTrust < 40) {
    risks.push('Low community trust');
  }

  // Council opposition: more hostile than friendly
  let friendly = 0;
  let hostile = 0;
  for (const member of Object.values(state.councilMembers)) {
    if (member.disposition > 30) friendly++;
    if (member.disposition < -20) hostile++;
  }
  if (hostile > friendly) {
    risks.push('Council opposition');
  }

  // Antagonist pressure: any antagonist at level 4+
  for (const antagonist of Object.values(state.antagonists)) {
    if (antagonist.escalationLevel >= 4) {
      risks.push('Antagonist pressure');
      break;
    }
  }

  // Gentrification concerns: 3+ tiles above 60% pressure
  let highGentrificationTiles = 0;
  for (const tile of Object.values(state.tiles)) {
    if (tile.gentrificationPressure > 60) {
      highGentrificationTiles++;
    }
  }
  if (highGentrificationTiles >= 3) {
    risks.push('Gentrification concerns');
  }

  // Leader dissatisfaction: fewer than 3 leaders at trust >= 40
  let trustedLeaders = 0;
  for (const leader of Object.values(state.leaders)) {
    if (leader.trust >= 40) {
      trustedLeaders++;
    }
  }
  if (trustedLeaders < 3) {
    risks.push('Leader dissatisfaction');
  }

  return {
    predictedScore: result.score,
    risks,
  };
}
