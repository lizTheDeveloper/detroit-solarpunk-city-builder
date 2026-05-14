/**
 * One-shot headline ingest script.
 * Run with: node --import tsx scripts/ingest-headlines.ts
 *
 * Fetches all configured RSS/JSON feeds and writes headlines to
 * server/pipeline/data/headlines/<date>.json so The Wire panel has data.
 * Classification is skipped (no API key required).
 */

import { runPipeline } from '../server/pipeline/index.ts';

console.log('Starting headline ingest...');

try {
  const result = await runPipeline();
  console.log('\nIngest complete:');
  console.log(`  Sources attempted: ${result.sourcesAttempted}`);
  console.log(`  Sources succeeded: ${result.sourcesSucceeded}`);
  console.log(`  New headlines:     ${result.newHeadlines}`);

  if (result.errors.length > 0) {
    console.log('\nSource errors:');
    for (const e of result.errors) {
      console.log(`  ${e.source}: ${e.error}`);
    }
  }
} catch (err) {
  console.error('Ingest failed:', err);
  process.exit(1);
}
