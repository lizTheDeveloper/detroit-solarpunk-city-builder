/**
 * Loads the project's app/.env and OVERRIDES process.env for the keys it
 * defines. Node's process.loadEnvFile does not override already-set vars, but a
 * stale shell `GROQ_API_KEY` should not beat the project's canonical .env.
 * Import for side effect from any bench entry script that needs keys.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

function loadDotEnv(): void {
  // env.ts lives at app/scripts/bench/ — the .env is two dirs up at app/.env
  const path = join(import.meta.dirname, '..', '..', '.env');
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch {
    return; // no .env — rely on the ambient environment
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) process.env[key] = value;
  }
}

loadDotEnv();
