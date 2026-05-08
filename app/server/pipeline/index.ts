import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { loadFeedConfig, fetchAllSources, loadSeenIds } from './fetcher.ts';
import { storeHeadlines, loadUnclassifiedHeadlines, updateHeadlineClassifications, updateHeadlineFrames, loadFramelessHeadlines } from './storage.ts';
import { updateArcStates } from './arc-state.ts';
import { classifyBatch, type ClassifierConfig, type ClassifierChatFn } from './llm-classifier.ts';
import { generateFramesBatch, type FrameGeneratorConfig } from './frame-generator.ts';
import { createLogger } from './utils.ts';
import type { PipelineRunResult, PipelineHealth } from './types.ts';

const log = createLogger('pipeline');

const DATA_DIR = join(import.meta.dirname, 'data');
const CONFIG_DIR = join(import.meta.dirname, 'config');
const RUN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let classifierConfig: ClassifierConfig = {
  enabled: !!process.env.ANTHROPIC_API_KEY,
  model: process.env.CLASSIFIER_MODEL ?? 'claude-haiku-4-5-20251001',
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
  apiUrl: process.env.ANTHROPIC_API_URL ?? 'https://api.anthropic.com',
};

let classifierChatFn: ClassifierChatFn | null = null;

let frameGenConfig: FrameGeneratorConfig = {
  enabled: !!process.env.ANTHROPIC_API_KEY,
  model: process.env.FRAME_GEN_MODEL ?? 'claude-haiku-4-5-20251001',
};

export function setFrameGenConfig(config: FrameGeneratorConfig): void {
  frameGenConfig = config;
}

export function setClassifierConfig(config: ClassifierConfig): void {
  classifierConfig = config;
}

export function setClassifierChatFn(fn: ClassifierChatFn): void {
  classifierChatFn = fn;
}

async function defaultChatFn(params: {
  model: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens: number;
  temperature: number;
}): Promise<string> {
  const resp = await fetch(`${classifierConfig.apiUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': classifierConfig.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: params.model,
      system: params.system,
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Anthropic API error: ${resp.status} ${resp.statusText}`);
  }

  const body = await resp.json() as { content: Array<{ text: string }> };
  return body.content[0]?.text ?? '';
}

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

  // Classify headlines: new ones plus any previously unclassified (retry)
  const unclassified = loadUnclassifiedHeadlines(DATA_DIR);
  const chatFn = classifierChatFn ?? defaultChatFn;

  let classifiedCount = 0;
  if (unclassified.length > 0 && classifierConfig.enabled) {
    try {
      const classifications = await classifyBatch(unclassified, chatFn, classifierConfig, CONFIG_DIR);
      if (classifications.length > 0) {
        const newlyClassified = updateHeadlineClassifications(DATA_DIR, classifications);
        classifiedCount = newlyClassified.length;
        updateArcStates(DATA_DIR, newlyClassified);
      }
    } catch (err) {
      log.error('Classification step failed, headlines stored as unclassified for retry', err);
    }
  }

  // Update arc states with any pre-classified headlines from storage
  const classifiedHeadlines = stored.filter(h => h.classified);
  if (classifiedHeadlines.length > 0) {
    updateArcStates(DATA_DIR, classifiedHeadlines);
  }

  // Generate frames for classified headlines without frames (severity >= 2)
  if (frameGenConfig.enabled) {
    try {
      const frameless = loadFramelessHeadlines(DATA_DIR);
      if (frameless.length > 0) {
        const frames = await generateFramesBatch(frameless, chatFn, frameGenConfig);
        if (frames.length > 0) {
          updateHeadlineFrames(DATA_DIR, frames);
          log.info(`Generated frames for ${frames.length} headlines`);
        }
      }
    } catch (err) {
      log.error('Frame generation step failed, headlines stored without frames for retry', err);
    }
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
