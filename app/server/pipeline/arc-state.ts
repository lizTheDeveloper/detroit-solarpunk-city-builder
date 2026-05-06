import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ArcState, ArcConfig, ProcessedHeadline } from './types.ts';
import { getWeekId, createLogger } from './utils.ts';

const log = createLogger('arc-state');

/**
 * Load arc configuration from disk.
 */
export function loadArcConfig(): Record<string, ArcConfig> {
  const configPath = join(import.meta.dirname, 'config', 'arcs.json');
  const raw = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(raw) as { arcs: Record<string, ArcConfig> };
  return config.arcs;
}

/**
 * Load the state for a single arc from its JSON file.
 * If no state file exists, returns a default dormant state.
 */
export function loadArcState(dataDir: string, arcId: string, config: ArcConfig): ArcState {
  const filePath = getArcStatePath(dataDir, arcId);

  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as ArcState;
    } catch (err) {
      log.error(`Failed to load arc state for ${arcId}, using default`, err);
    }
  }

  return createDefaultArcState(arcId, config);
}

/**
 * Load all arc states from disk.
 */
export function loadAllArcStates(dataDir: string): ArcState[] {
  const configs = loadArcConfig();
  return Object.entries(configs).map(([arcId, config]) => loadArcState(dataDir, arcId, config));
}

/**
 * Save arc state to disk.
 */
export function saveArcState(dataDir: string, state: ArcState): void {
  const dir = join(dataDir, 'arc-state');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = getArcStatePath(dataDir, state.arcId);
  writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Process a batch of classified headlines and update arc states accordingly.
 * Only processes headlines that are actually classified.
 */
export function updateArcStates(
  dataDir: string,
  headlines: ProcessedHeadline[]
): ArcState[] {
  const configs = loadArcConfig();
  const states: ArcState[] = [];

  for (const [arcId, config] of Object.entries(configs)) {
    let state = loadArcState(dataDir, arcId, config);

    // Check for weekly reset
    state = checkWeeklyReset(state);

    // Count headlines that hit this arc
    const relevantHeadlines = headlines.filter(
      h => h.classified && h.arcs.includes(arcId) && h.severity > 0
    );

    for (const headline of relevantHeadlines) {
      state = accumulateHit(state, headline);
    }

    // Check for stage transitions
    state = checkStageTransition(state);

    saveArcState(dataDir, state);
    states.push(state);
  }

  return states;
}

/**
 * Accumulate a single headline hit into arc state.
 */
export function accumulateHit(state: ArcState, headline: ProcessedHeadline): ArcState {
  const newState = { ...state, weeklyHits: { ...state.weeklyHits } };

  switch (headline.severity) {
    case 1:
      newState.weeklyHits.severity1++;
      break;
    case 2:
      newState.weeklyHits.severity2++;
      break;
    case 3:
      newState.weeklyHits.severity3++;
      break;
  }

  newState.cumulativeHits++;
  newState.lastHeadlineTimestamp = headline.date;

  return newState;
}

/**
 * Check if the arc state needs a weekly reset.
 * Resets weekly hit counters if we've crossed into a new ISO week.
 */
export function checkWeeklyReset(state: ArcState): ArcState {
  const currentWeek = getWeekId(new Date());
  const stateWeek = state.lastHeadlineTimestamp
    ? getWeekId(new Date(state.lastHeadlineTimestamp))
    : null;

  // If no headlines yet, or we're in the same week, no reset needed
  if (!stateWeek || stateWeek === currentWeek) return state;

  // Reset weekly counters
  log.info(`Weekly reset for arc ${state.arcId}: ${stateWeek} -> ${currentWeek}`);
  return {
    ...state,
    weeklyHits: { severity1: 0, severity2: 0, severity3: 0 },
  };
}

/**
 * Determine if the arc should transition to a new stage based on thresholds.
 *
 * Transition rules:
 * - dormant -> foreshadow: any severity-1+ hit
 * - foreshadow -> escalation: weekly hits reach escalationThreshold AND minStageDuration passed
 * - escalation -> crisis: severity-3 hit OR sustained high volume AND minStageDuration passed
 * - crisis -> reckoning: manual trigger (not automated in this pipeline)
 * - reckoning -> resolved: manual trigger
 */
export function checkStageTransition(state: ArcState): ArcState {
  const now = new Date();
  const stageEnteredAt = new Date(state.stageEnteredAt);
  const hoursInStage = (now.getTime() - stageEnteredAt.getTime()) / (1000 * 60 * 60);
  const minDuration = state.config.minStageDuration;
  const threshold = state.config.escalationThreshold;

  const totalWeeklyHits = state.weeklyHits.severity1 + state.weeklyHits.severity2 + state.weeklyHits.severity3;
  const weightedHits = state.weeklyHits.severity1 + (state.weeklyHits.severity2 * 2) + (state.weeklyHits.severity3 * 3);

  switch (state.stage) {
    case 'dormant':
      // Any hit moves to foreshadow
      if (totalWeeklyHits > 0) {
        return transitionTo(state, 'foreshadow');
      }
      break;

    case 'foreshadow':
      // Enough weekly hits -> escalation
      if (weightedHits >= threshold && hoursInStage >= minDuration) {
        return transitionTo(state, 'escalation');
      }
      break;

    case 'escalation':
      // Severity-3 hit or sustained high volume -> crisis
      if (state.weeklyHits.severity3 > 0 && hoursInStage >= minDuration) {
        return transitionTo(state, 'crisis');
      }
      if (weightedHits >= threshold * 2 && hoursInStage >= minDuration) {
        return transitionTo(state, 'crisis');
      }
      break;

    // crisis -> reckoning and reckoning -> resolved are manual triggers
    case 'crisis':
    case 'reckoning':
    case 'resolved':
      break;
  }

  return state;
}

/**
 * Transition an arc to a new stage.
 */
function transitionTo(state: ArcState, newStage: ArcState['stage']): ArcState {
  log.info(`Arc ${state.arcId} transitioning: ${state.stage} -> ${newStage}`);
  return {
    ...state,
    stage: newStage,
    stageEnteredAt: new Date().toISOString(),
  };
}

/**
 * Create a default (dormant) arc state.
 */
function createDefaultArcState(arcId: string, config: ArcConfig): ArcState {
  return {
    arcId,
    stage: 'dormant',
    weeklyHits: { severity1: 0, severity2: 0, severity3: 0 },
    cumulativeHits: 0,
    lastHeadlineTimestamp: null,
    stageEnteredAt: new Date().toISOString(),
    config,
  };
}

function getArcStatePath(dataDir: string, arcId: string): string {
  return join(dataDir, 'arc-state', `${arcId}.json`);
}
