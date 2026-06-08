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

export interface AgentSummary {
  agentId: string;
  runs: number;
  winRate: number;
  lossRate: number;
  survivedRate: number;
  meanTurnsSurvived: number;
  electionScore: { mean: number; p5: number; p50: number; p95: number; std: number };
  meanFinalMeters: Record<string, number>;
  meanFingerprint: {
    accept: number; reject: number; modify: number; ignoredExpired: number;
    policiesEnacted: number; neighborhoodGini: number;
  };
  lossConditions: Record<string, number>;
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
      meanFinalMeters,
      meanFingerprint: {
        accept: mean(ms.map((m) => m.fingerprint.proposals.accept)),
        reject: mean(ms.map((m) => m.fingerprint.proposals.reject)),
        modify: mean(ms.map((m) => m.fingerprint.proposals.modify)),
        ignoredExpired: mean(ms.map((m) => m.fingerprint.proposals.ignoredExpired)),
        policiesEnacted: mean(ms.map((m) => m.fingerprint.policiesEnacted)),
        neighborhoodGini: mean(ms.map((m) => m.fingerprint.neighborhoodGini)),
      },
      lossConditions,
    });
  }
  rows.sort((a, b) => b.electionScore.mean - a.electionScore.mean);
  return rows;
}

export function renderLeaderboard(title: string, rows: AgentSummary[], notes: string[] = []): string {
  const out: string[] = [`# ${title}`, ''];
  if (notes.length) { out.push(...notes.map((n) => `> ${n}`), ''); }
  out.push('| Rank | Agent | Runs | Score (mean ±std) | Win% | Loss% | Turns | Trust | Eco | Food | Gini | Accept/Reject/Ignored |');
  out.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  rows.forEach((r, i) => {
    const fm = r.meanFinalMeters;
    const fp = r.meanFingerprint;
    out.push(
      `| ${i + 1} | ${r.agentId} | ${r.runs} | ${r.electionScore.mean.toFixed(1)} ±${r.electionScore.std.toFixed(1)} ` +
      `| ${(r.winRate * 100).toFixed(0)}% | ${(r.lossRate * 100).toFixed(0)}% | ${r.meanTurnsSurvived.toFixed(0)} ` +
      `| ${(fm.communityTrust ?? 0).toFixed(0)} | ${(fm.ecologicalHealth ?? 0).toFixed(0)} | ${(fm.foodSovereignty ?? 0).toFixed(0)} ` +
      `| ${fp.neighborhoodGini.toFixed(2)} | ${fp.accept.toFixed(1)}/${fp.reject.toFixed(1)}/${fp.ignoredExpired.toFixed(1)} |`,
    );
  });
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
