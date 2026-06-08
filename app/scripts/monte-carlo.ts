/**
 * Monte-Carlo strategy benchmark — deterministic archetypes × many seeds,
 * driven through the REAL reducer. Covers all meters + win/loss, not just budget.
 *
 * Run:  npx tsx scripts/monte-carlo.ts [--runs 200] [--turns 48]
 */

import { join } from 'path';
import { ARCHETYPES } from './bench/archetypes.ts';
import { playGame } from './bench/runner.ts';
import { summarize } from './bench/metrics.ts';
import { writeBenchResults } from './bench/report.ts';
import type { GameMetrics, GameResult } from './bench/types.ts';

function arg(flag: string, def: number): number {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : def;
}

async function main() {
  const runs = arg('--runs', 200);
  const maxTurns = arg('--turns', 48);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(import.meta.dirname, 'bench', 'results', `mc-${stamp}`);

  console.log(`Monte-Carlo: ${ARCHETYPES.length} archetypes × ${runs} runs × ${maxTurns} turns`);

  const metrics: GameMetrics[] = [];
  const results: GameResult[] = [];

  for (const agent of ARCHETYPES) {
    process.stdout.write(`  ${agent.id}: `);
    let wins = 0, losses = 0;
    for (let r = 0; r < runs; r++) {
      const seed = r * 7919 + 31; // shared seed schedule across archetypes
      const result = await playGame(agent, seed, { maxTurns });
      const m = summarize(result);
      metrics.push(m);
      if (r < 1) results.push(result); // keep one full log per archetype
      if (m.outcome === 'win') wins++;
      if (m.outcome === 'loss') losses++;
    }
    console.log(`${wins}W/${losses}L (${runs - wins - losses} survived)`);
  }

  writeBenchResults({
    outDir,
    title: `Monte-Carlo Strategy Benchmark (${runs} runs/archetype, ${maxTurns} turns)`,
    metrics,
    results,
    notes: [
      'Deterministic archetypes through the real reducer. Seeds shared across archetypes (paired).',
      'Archetypes exercise event choice via chooseEvent (unlike the LLM benchmark).',
    ],
  });
  console.log(`\nWrote ${outDir}/leaderboard.md`);
}

main().catch((e) => { console.error(e); process.exit(1); });
