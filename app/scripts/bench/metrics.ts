/**
 * summarize — turns a raw GameResult into the analyzable GameMetrics unit.
 * Reads meters generically (Object.keys) so a new meter like `discretionary`
 * is measured automatically. Reuses the game's own calculateElectionScore as
 * the canonical mayor-quality metric, and captures its breakdown so the
 * benchmark surfaces WHY a run wins/loses.
 */

import { calculateElectionScore } from '../../src/systems/reelection.ts';
import type { GameResult, GameMetrics, MeterSummary, Fingerprint, ProposalDisposition } from './types.ts';

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

/** Gini coefficient of a non-negative distribution (0 equal … 1 concentrated). */
export function gini(values: number[]): number {
  const xs = values.filter((v) => v >= 0);
  const n = xs.length;
  const total = xs.reduce((a, b) => a + b, 0);
  if (n === 0 || total === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * sorted[i];
  return (2 * cum) / (n * total) - (n + 1) / n;
}

export function summarize(result: GameResult): GameMetrics {
  const final = result.finalState;

  // Per-meter trajectories, keyed generically.
  const meterKeys = Object.keys(final.meters);
  const meters: Record<string, MeterSummary> = {};
  for (const key of meterKeys) {
    const series: number[] = [];
    if (result.turns[0]) series.push((result.turns[0].metersBefore as unknown as Record<string, number>)[key]);
    for (const t of result.turns) series.push((t.metersAfter as unknown as Record<string, number>)[key]);
    meters[key] = {
      final: (final.meters as unknown as Record<string, number>)[key],
      min: Math.min(...series),
      max: Math.max(...series),
      volatility: stddev(series),
    };
  }

  // Aggregate fingerprint from the per-turn log.
  const proposals: ProposalDisposition = { accept: 0, modify: 0, reject: 0, ignoredExpired: 0 };
  const calendarActions: Record<string, number> = {};
  const eventChoices: Record<string, number> = {};
  let policiesEnacted = 0;

  for (const t of result.turns) {
    proposals.accept += t.proposalDisposition.accept;
    proposals.modify += t.proposalDisposition.modify;
    proposals.reject += t.proposalDisposition.reject;
    proposals.ignoredExpired += t.proposalDisposition.ignoredExpired;
    for (const a of t.appliedActions) {
      if (a.type === 'ENACT_POLICY') policiesEnacted++;
      else if (a.type === 'CALENDAR_ACTION') calendarActions[a.actionType] = (calendarActions[a.actionType] ?? 0) + 1;
      else if (a.type === 'CALENDAR_REST_DAY') calendarActions['rest_day'] = (calendarActions['rest_day'] ?? 0) + 1;
    }
    for (const e of t.events) eventChoices[e.choiceId] = (eventChoices[e.choiceId] ?? 0) + 1;
  }

  const completedPerTile = Object.values(final.tiles).map((tile) => tile.completedProjects.length);
  const fingerprint: Fingerprint = {
    proposals,
    policiesEnacted,
    calendarActions,
    eventChoices,
    neighborhoodGini: gini(completedPerTile),
  };

  const election = calculateElectionScore(final);

  return {
    agentId: result.agentId,
    seed: result.seed,
    outcome: final.winCondition ? 'win' : final.lossCondition ? 'loss' : 'survived',
    condition: final.winCondition ?? final.lossCondition ?? null,
    turnsPlayed: result.turnsPlayed,
    electionScore: election.score,
    electionBreakdown: { ...(election.breakdown as unknown as Record<string, number>) },
    meters,
    fingerprint,
  };
}
