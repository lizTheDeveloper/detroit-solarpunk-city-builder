/**
 * Multi-model LLM benchmark — each model plays K games on a SHARED seed set
 * (paired comparison) through the real reducer. Preserves full per-turn JSONL
 * logs (prompts + raw responses) for later re-classification.
 *
 * Run:  npx tsx scripts/bench-llm.ts [--games 3] [--turns 48] [--models a,b]
 *
 * v1 limitation: LLM agents use a fixed first-choice event policy (documented),
 * to avoid an extra slow/timeout-prone model call per event per turn.
 */

import { join } from 'path';
import { MODEL_REGISTRY, llmAgent } from './bench/models.ts';
import { playGame } from './bench/runner.ts';
import { summarize } from './bench/metrics.ts';
import { writeBenchResults } from './bench/report.ts';
import type { GameMetrics, GameResult } from './bench/types.ts';

function numArg(flag: string, def: number): number {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : def;
}
function strArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

async function main() {
  const games = numArg('--games', 3);
  const maxTurns = numArg('--turns', 48);
  const modelsArg = strArg('--models');
  const modelIds = modelsArg ? modelsArg.split(',') : Object.keys(MODEL_REGISTRY);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(import.meta.dirname, 'bench', 'results', `llm-${stamp}`);
  const seeds = Array.from({ length: games }, (_, i) => i * 104729 + 17); // shared across models

  console.log(`LLM benchmark: [${modelIds.join(', ')}] × ${games} games × ${maxTurns} turns (sequential)`);

  const metrics: GameMetrics[] = [];
  const results: GameResult[] = [];

  for (const id of modelIds) {
    const adapter = MODEL_REGISTRY[id];
    if (!adapter) { console.warn(`  unknown model: ${id} — skipping`); continue; }
    for (const seed of seeds) {
      process.stdout.write(`  ${id} seed${seed}: `);
      const result = await playGame(llmAgent(adapter), seed, { maxTurns });
      const m = summarize(result);
      metrics.push(m);
      results.push(result);
      console.log(`${m.outcome}${m.condition ? ` (${m.condition})` : ''} | score ${m.electionScore.toFixed(1)} | ${result.turnsPlayed} turns`);
    }
  }

  writeBenchResults({
    outDir,
    title: `LLM Mayor Benchmark (${games} games/model, ${maxTurns} turns)`,
    metrics,
    results,
    notes: [
      'Each model plays the same seed set (paired). Sequential execution (seeded global RNG).',
      'LIMITATION: LLM agents use fixed first-choice event handling in v1. Archetype Monte-Carlo exercises event choice.',
    ],
  });
  console.log(`\nWrote ${outDir}/leaderboard.md`);
}

main().catch((e) => { console.error(e); process.exit(1); });
