/**
 * Reporting: distribution stats, a markdown leaderboard, and the flat-file
 * outputs (summary.json + per-game JSONL logs) that make runs re-classifiable.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { GameMetrics, GameResult } from './types.ts';

export function mean(xs: number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
export function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}
export function stddev(xs: number[]): number {
  if (!xs.length) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, v) => a + (v - m) ** 2, 0) / xs.length);
}

/** 95% CI half-width for a mean (normal approx; rough for very small n). */
export function ci95(xs: number[]): number {
  if (xs.length < 2) return 0;
  return 1.96 * (stddev(xs) / Math.sqrt(xs.length));
}

/** Wilson 95% score interval for a proportion k/n — honest for small n
 *  (e.g. 3/3 wins → ~[0.44, 1.0], not a misleading 100% ± 0). */
export function wilson95(k: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / d;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export interface AgentSummary {
  agentId: string;
  runs: number;
  winRate: number;
  lossRate: number;
  survivedRate: number;
  meanTurnsSurvived: number;
  electionScore: { mean: number; p5: number; p50: number; p95: number; std: number };
  /** 95% CI half-width on the score mean. */
  scoreCI95: number;
  /** Wilson 95% CI on the win rate (honest for small n). */
  winRateCI95: [number, number];
  meanFinalMeters: Record<string, number>;
  meanFingerprint: {
    accept: number; reject: number; modify: number; ignoredExpired: number;
    policiesEnacted: number; neighborhoodGini: number;
  };
  /** Mean of each election-score component — surfaces WHY runs win/lose. */
  meanElectionBreakdown: Record<string, number>;
  lossConditions: Record<string, number>;
  /** Distribution of final progression stage (e.g. {restoration: 3, beyond: 7}). */
  stageReached: Record<string, number>;
  /** Mean turn a win occurred (over winning games only), or null if no wins. */
  meanWinTurn: number | null;
}

export function aggregate(metrics: GameMetrics[]): AgentSummary[] {
  const byAgent = new Map<string, GameMetrics[]>();
  for (const m of metrics) {
    if (!byAgent.has(m.agentId)) byAgent.set(m.agentId, []);
    byAgent.get(m.agentId)!.push(m);
  }

  const rows: AgentSummary[] = [];
  for (const [agentId, ms] of byAgent) {
    const n = ms.length;
    const scores = ms.map((m) => m.electionScore);
    const meterKeys = Object.keys(ms[0].meters);
    const meanFinalMeters: Record<string, number> = {};
    for (const k of meterKeys) meanFinalMeters[k] = mean(ms.map((m) => m.meters[k].final));

    const lossConditions: Record<string, number> = {};
    for (const m of ms) {
      if (m.outcome === 'loss' && m.condition) lossConditions[m.condition] = (lossConditions[m.condition] ?? 0) + 1;
    }

    const breakdownKeys = Object.keys(ms[0].electionBreakdown);
    const meanElectionBreakdown: Record<string, number> = {};
    for (const k of breakdownKeys) meanElectionBreakdown[k] = mean(ms.map((m) => m.electionBreakdown[k] ?? 0));

    const stageReached: Record<string, number> = {};
    for (const m of ms) stageReached[m.stageReached] = (stageReached[m.stageReached] ?? 0) + 1;
    const winTurns = ms.filter((m) => m.winTurn != null).map((m) => m.winTurn as number);

    rows.push({
      agentId,
      runs: n,
      winRate: ms.filter((m) => m.outcome === 'win').length / n,
      lossRate: ms.filter((m) => m.outcome === 'loss').length / n,
      survivedRate: ms.filter((m) => m.outcome === 'survived').length / n,
      meanTurnsSurvived: mean(ms.map((m) => m.turnsPlayed)),
      electionScore: {
        mean: mean(scores), p5: percentile(scores, 0.05), p50: percentile(scores, 0.5),
        p95: percentile(scores, 0.95), std: stddev(scores),
      },
      scoreCI95: ci95(scores),
      winRateCI95: wilson95(ms.filter((m) => m.outcome === 'win').length, n),
      meanFinalMeters,
      meanFingerprint: {
        accept: mean(ms.map((m) => m.fingerprint.proposals.accept)),
        reject: mean(ms.map((m) => m.fingerprint.proposals.reject)),
        modify: mean(ms.map((m) => m.fingerprint.proposals.modify)),
        ignoredExpired: mean(ms.map((m) => m.fingerprint.proposals.ignoredExpired)),
        policiesEnacted: mean(ms.map((m) => m.fingerprint.policiesEnacted)),
        neighborhoodGini: mean(ms.map((m) => m.fingerprint.neighborhoodGini)),
      },
      meanElectionBreakdown,
      lossConditions,
      stageReached,
      meanWinTurn: winTurns.length ? mean(winTurns) : null,
    });
  }
  rows.sort((a, b) => b.electionScore.mean - a.electionScore.mean);
  return rows;
}

export function renderLeaderboard(title: string, rows: AgentSummary[], notes: string[] = []): string {
  const out: string[] = [`# ${title}`, ''];
  if (notes.length) { out.push(...notes.map((n) => `> ${n}`), ''); }
  out.push('| Rank | Agent | Runs | Score (mean ±std) | Win% | Loss% | WinTurn | Stage | Trust | Eco | Food | Will | Pol | Gini | Accept/Reject/Ignored |');
  out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  rows.forEach((r, i) => {
    const fm = r.meanFinalMeters;
    const fp = r.meanFingerprint;
    // Most-common final stage, with its share.
    const topStage = Object.entries(r.stageReached).sort((a, b) => b[1] - a[1])[0];
    const stageCell = topStage ? `${topStage[0]} ${Math.round((topStage[1] / r.runs) * 100)}%` : '—';
    out.push(
      `| ${i + 1} | ${r.agentId} | ${r.runs} | ${r.electionScore.mean.toFixed(1)} ±${r.electionScore.std.toFixed(1)} ` +
      `| ${(r.winRate * 100).toFixed(0)}% | ${(r.lossRate * 100).toFixed(0)}% | ${r.meanWinTurn != null ? r.meanWinTurn.toFixed(0) : '—'} | ${stageCell} ` +
      `| ${(fm.communityTrust ?? 0).toFixed(0)} | ${(fm.ecologicalHealth ?? 0).toFixed(0)} | ${(fm.foodSovereignty ?? 0).toFixed(0)} ` +
      `| ${(fm.politicalWill ?? 0).toFixed(0)} | ${fp.policiesEnacted.toFixed(1)} ` +
      `| ${fp.neighborhoodGini.toFixed(2)} | ${fp.accept.toFixed(1)}/${fp.reject.toFixed(1)}/${fp.ignoredExpired.toFixed(1)} |`,
    );
  });
  // Statistical confidence (95%) — keeps small-N results honest. Win rate uses a
  // Wilson interval, so 3/3 wins reads as ~[44%, 100%], not a misleading 100%±0.
  out.push('', '## Statistical confidence (95%)', '');
  out.push('| Agent | Runs | Score (mean, 95% CI) | Win rate (Wilson 95% CI) |');
  out.push('|---|---|---|---|');
  for (const r of rows) {
    const [lo, hi] = r.winRateCI95;
    out.push(
      `| ${r.agentId} | ${r.runs} | ${r.electionScore.mean.toFixed(1)} ` +
      `[${(r.electionScore.mean - r.scoreCI95).toFixed(1)}, ${(r.electionScore.mean + r.scoreCI95).toFixed(1)}] ` +
      `| ${(r.winRate * 100).toFixed(0)}% [${(lo * 100).toFixed(0)}%, ${(hi * 100).toFixed(0)}%] |`,
    );
  }

  // Election-score decomposition — shows WHICH term drives the ranking, so the
  // total can't be misread (e.g. one penalty dominating vs. a broad spread).
  const bkeys = rows.length ? Object.keys(rows[0].meanElectionBreakdown) : [];
  if (bkeys.length) {
    out.push('', '## Election-score breakdown (mean per archetype)', '');
    out.push(`| Agent | ${bkeys.join(' | ')} |`);
    out.push(`|---|${bkeys.map(() => '---').join('|')}|`);
    for (const r of rows) {
      out.push(`| ${r.agentId} | ${bkeys.map((k) => r.meanElectionBreakdown[k].toFixed(1)).join(' | ')} |`);
    }
  }

  // Loss-condition breakdown
  out.push('', '## Loss conditions', '');
  for (const r of rows) {
    const lc = Object.entries(r.lossConditions);
    if (lc.length) out.push(`- **${r.agentId}**: ${lc.map(([k, v]) => `${k}×${v}`).join(', ')}`);
  }
  return out.join('\n') + '\n';
}

/** Write summary.json, leaderboard.md, and per-game JSONL logs under outDir. */
export function writeBenchResults(opts: {
  outDir: string;
  title: string;
  metrics: GameMetrics[];
  results: GameResult[];
  notes?: string[];
}): void {
  const { outDir, title, metrics, results, notes = [] } = opts;
  mkdirSync(join(outDir, 'games'), { recursive: true });

  const rows = aggregate(metrics);
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ title, rows, metrics }, null, 2));
  writeFileSync(join(outDir, 'leaderboard.md'), renderLeaderboard(title, rows, notes));

  for (const r of results) {
    const lines = r.turns.map((t) => JSON.stringify(t));
    writeFileSync(join(outDir, 'games', `${r.agentId}-seed${r.seed}.jsonl`), lines.join('\n') + '\n');
  }
}
