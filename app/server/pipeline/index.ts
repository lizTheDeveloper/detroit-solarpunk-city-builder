import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { loadFeedConfig, fetchAllSources, loadSeenIds } from './fetcher.ts';
import { storeHeadlines } from './storage.ts';
import { updateArcStates } from './arc-state.ts';
import { createLogger } from './utils.ts';
import type { PipelineRunResult, PipelineHealth } from './types.ts';

const log = createLogger('pipeline');

const DATA_DIR = join(import.meta.dirname, 'data');
const RUN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let lastRunResult: PipelineRunResult | null = null;
let pipelineHealth: PipelineHealth = {
  lastRun: null,
  sources: {},
  unclassifiedCount: 0,
  totalHeadlines: 0,
};

/**
 * Get the data directory path.
 */
export function getDataDir(): string {
  return DATA_DIR;
}

/**
 * Run the full pipeline: fetch -> store -> update arc state.
 */
export async function runPipeline(): Promise<PipelineRunResult> {
  log.info('Pipeline run starting');

  // Ensure data directories exist
  const headlinesDir = join(DATA_DIR, 'headlines');
  const arcStateDir = join(DATA_DIR, 'arc-state');
  if (!existsSync(headlinesDir)) mkdirSync(headlinesDir, { recursive: true });
  if (!existsSync(arcStateDir)) mkdirSync(arcStateDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const sources = loadFeedConfig();
  const seenIds = loadSeenIds(DATA_DIR);

  // Fetch from all sources
  const { headlines: rawHeadlines, results } = await fetchAllSources(sources, seenIds);

  // Store new headlines
  const stored = storeHeadlines(DATA_DIR, rawHeadlines);

  // Update arc states with any classified headlines (initially none will be classified)
  const classifiedHeadlines = stored.filter(h => h.classified);
  if (classifiedHeadlines.length > 0) {
    updateArcStates(DATA_DIR, classifiedHeadlines);
  }

  // Build run result
  const sourcesSucceeded = results.filter(r => r.success).length;
  const errors = results.filter(r => !r.success).map(r => ({ source: r.source, error: r.error! }));

  const runResult: PipelineRunResult = {
    timestamp,
    sourcesAttempted: sources.length,
    sourcesSucceeded,
    newHeadlines: stored.length,
    duplicatesSkipped: 0, // dedup happens inside fetchAllSources
    errors,
  };

  // Update health state
  lastRunResult = runResult;
  pipelineHealth = {
    lastRun: timestamp,
    sources: Object.fromEntries(
      results.map(r => [r.source, {
        lastFetch: timestamp,
        lastSuccess: r.success,
        error: r.error,
        itemCount: r.count,
      }])
    ),
    unclassifiedCount: stored.filter(h => !h.classified).length,
    totalHeadlines: stored.length,
  };

  log.info(`Pipeline run complete: ${stored.length} new headlines from ${sourcesSucceeded}/${sources.length} sources`, {
    errors: errors.length > 0 ? errors : undefined,
  });

  return runResult;
}

/**
 * Get the current pipeline health status.
 */
export function getPipelineHealth(): PipelineHealth {
  return pipelineHealth;
}

/**
 * Get the last pipeline run result.
 */
export function getLastRunResult(): PipelineRunResult | null {
  return lastRunResult;
}

/**
 * Start the pipeline on a recurring schedule.
 * Returns a cleanup function to stop the interval.
 */
export function startPipelineSchedule(): () => void {
  log.info(`Pipeline scheduler started (interval: ${RUN_INTERVAL_MS / 1000}s)`);

  // Run immediately on startup
  runPipeline().catch(err => {
    log.error('Initial pipeline run failed', err);
  });

  // Schedule hourly runs
  const intervalId = setInterval(() => {
    runPipeline().catch(err => {
      log.error('Scheduled pipeline run failed', err);
    });
  }, RUN_INTERVAL_MS);

  return () => {
    clearInterval(intervalId);
    log.info('Pipeline scheduler stopped');
  };
}
