import { describe, it, expect } from 'vitest';
import {
  checkTransition,
  incrementInactionTimer,
  resetInactionTimer,
  checkPreventionConditions,
  applyTransition,
  initializeArcsFromSnapshot,
  getDefaultArcConfig,
} from './arc-progression';
import type { ActiveArc, ArcConfig, PipelineArcState } from '../state/crisis-types';

function makeArc(overrides: Partial<ActiveArc> = {}): ActiveArc {
  return {
    arcId: 'energy-grid',
    currentStage: 'dormant',
    stageEnteredTurn: 1,
    inactionTimer: 0,
    lastEventTurn: 0,
    initializedFromSnapshot: false,
    ...overrides,
  };
}

function makeConfig(overrides: Partial<ArcConfig> = {}): ArcConfig {
  return {
    arcId: 'energy-grid',
    escalationThreshold: 5,
    maxTurnsAtEscalation: 4,
    minStageDuration: {
      dormant: 0,
      foreshadow: 2,
      escalation: 2,
      crisis: 1,
      reckoning: 2,
      resolved: 0,
    },
    preventionConditions: ['community_solar_built', 'microgrid_operational'],
    reckoningDelay: 3,
    cooldownAfterResolution: 8,
    ...overrides,
  };
}

function makePipelineState(overrides: Partial<PipelineArcState> = {}): PipelineArcState {
  return {
    arcId: 'energy-grid',
    stage: 'foreshadow',
    weeklyHits: 3,
    maxSeverity: 2,
    lastHeadlineTimestamp: '2026-05-01T12:00:00Z',
    ...overrides,
  };
}

describe('arc-progression', () => {
  describe('checkTransition: dormant → foreshadow', () => {
    it('transitions when first headline appears', () => {
      const arc = makeArc({ currentStage: 'dormant', stageEnteredTurn: 1 });
      const config = makeConfig();
      const pipeline = makePipelineState({ weeklyHits: 1 });

      const result = checkTransition(arc, pipeline, config, 5);
      expect(result).toBe('foreshadow');
    });

    it('does not transition without pipeline data', () => {
      const arc = makeArc({ currentStage: 'dormant', stageEnteredTurn: 1 });
      const config = makeConfig();

      const result = checkTransition(arc, null, config, 5);
      expect(result).toBeNull();
    });

    it('does not transition when no headlines', () => {
      const arc = makeArc({ currentStage: 'dormant', stageEnteredTurn: 1 });
      const config = makeConfig();
      const pipeline = makePipelineState({ weeklyHits: 0, lastHeadlineTimestamp: null });

      const result = checkTransition(arc, pipeline, config, 5);
      expect(result).toBeNull();
    });
  });

  describe('checkTransition: foreshadow → escalation', () => {
    it('transitions when weekly hits exceed threshold', () => {
      const arc = makeArc({ currentStage: 'foreshadow', stageEnteredTurn: 1 });
      const config = makeConfig({ escalationThreshold: 5 });
      const pipeline = makePipelineState({ weeklyHits: 6 });

      const result = checkTransition(arc, pipeline, config, 5);
      expect(result).toBe('escalation');
    });

    it('transitions when severity-3 headline appears', () => {
      const arc = makeArc({ currentStage: 'foreshadow', stageEnteredTurn: 1 });
      const config = makeConfig();
      const pipeline = makePipelineState({ weeklyHits: 2, maxSeverity: 3 });

      const result = checkTransition(arc, pipeline, config, 5);
      expect(result).toBe('escalation');
    });

    it('does not transition below threshold with low severity', () => {
      const arc = makeArc({ currentStage: 'foreshadow', stageEnteredTurn: 1 });
      const config = makeConfig({ escalationThreshold: 5 });
      const pipeline = makePipelineState({ weeklyHits: 3, maxSeverity: 2 });

      const result = checkTransition(arc, pipeline, config, 5);
      expect(result).toBeNull();
    });

    it('enforces minimum stage duration', () => {
      const arc = makeArc({ currentStage: 'foreshadow', stageEnteredTurn: 4 });
      const config = makeConfig({ minStageDuration: { ...makeConfig().minStageDuration, foreshadow: 2 } });
      const pipeline = makePipelineState({ weeklyHits: 10, maxSeverity: 3 });

      // Turn 5: only 1 turn in foreshadow, minimum is 2
      const result = checkTransition(arc, pipeline, config, 5);
      expect(result).toBeNull();
    });

    it('allows transition after minimum duration met', () => {
      const arc = makeArc({ currentStage: 'foreshadow', stageEnteredTurn: 3 });
      const config = makeConfig({ minStageDuration: { ...makeConfig().minStageDuration, foreshadow: 2 } });
      const pipeline = makePipelineState({ weeklyHits: 10, maxSeverity: 3 });

      // Turn 5: 2 turns in foreshadow, minimum is 2
      const result = checkTransition(arc, pipeline, config, 5);
      expect(result).toBe('escalation');
    });
  });

  describe('checkTransition: escalation → crisis', () => {
    it('transitions when inaction timer exceeds max', () => {
      const arc = makeArc({
        currentStage: 'escalation',
        stageEnteredTurn: 1,
        inactionTimer: 4,
      });
      const config = makeConfig({ maxTurnsAtEscalation: 4 });

      const result = checkTransition(arc, null, config, 5);
      expect(result).toBe('crisis');
    });

    it('does not transition when inaction timer below max', () => {
      const arc = makeArc({
        currentStage: 'escalation',
        stageEnteredTurn: 1,
        inactionTimer: 2,
      });
      const config = makeConfig({ maxTurnsAtEscalation: 4 });

      const result = checkTransition(arc, null, config, 5);
      expect(result).toBeNull();
    });

    it('enforces minimum stage duration for escalation', () => {
      const arc = makeArc({
        currentStage: 'escalation',
        stageEnteredTurn: 4,
        inactionTimer: 10,
      });
      const config = makeConfig({ minStageDuration: { ...makeConfig().minStageDuration, escalation: 2 } });

      // Turn 5: only 1 turn in escalation, minimum is 2
      const result = checkTransition(arc, null, config, 5);
      expect(result).toBeNull();
    });
  });

  describe('checkTransition: crisis → reckoning', () => {
    it('transitions when player makes a choice (lastEventTurn >= stageEnteredTurn)', () => {
      const arc = makeArc({
        currentStage: 'crisis',
        stageEnteredTurn: 5,
        lastEventTurn: 6,
      });
      const config = makeConfig({ minStageDuration: { ...makeConfig().minStageDuration, crisis: 1 } });

      const result = checkTransition(arc, null, config, 7);
      expect(result).toBe('reckoning');
    });

    it('does not transition without player choice', () => {
      const arc = makeArc({
        currentStage: 'crisis',
        stageEnteredTurn: 5,
        lastEventTurn: 3, // last event was before crisis stage
      });
      const config = makeConfig({ minStageDuration: { ...makeConfig().minStageDuration, crisis: 1 } });

      const result = checkTransition(arc, null, config, 7);
      expect(result).toBeNull();
    });

    it('enforces minimum stage duration for crisis', () => {
      const arc = makeArc({
        currentStage: 'crisis',
        stageEnteredTurn: 5,
        lastEventTurn: 5,
      });
      const config = makeConfig({ minStageDuration: { ...makeConfig().minStageDuration, crisis: 2 } });

      // Turn 6: only 1 turn in crisis, minimum is 2
      const result = checkTransition(arc, null, config, 6);
      expect(result).toBeNull();
    });
  });

  describe('checkTransition: reckoning → resolved', () => {
    it('transitions after reckoning delay', () => {
      const arc = makeArc({
        currentStage: 'reckoning',
        stageEnteredTurn: 10,
      });
      const config = makeConfig({ reckoningDelay: 3 });

      const result = checkTransition(arc, null, config, 13);
      expect(result).toBe('resolved');
    });

    it('does not transition before reckoning delay', () => {
      const arc = makeArc({
        currentStage: 'reckoning',
        stageEnteredTurn: 10,
      });
      const config = makeConfig({ reckoningDelay: 3 });

      const result = checkTransition(arc, null, config, 12);
      expect(result).toBeNull();
    });

    it('enforces minimum stage duration for reckoning', () => {
      const arc = makeArc({
        currentStage: 'reckoning',
        stageEnteredTurn: 10,
      });
      const config = makeConfig({
        reckoningDelay: 1,
        minStageDuration: { ...makeConfig().minStageDuration, reckoning: 3 },
      });

      // Turn 12: reckoning delay met (1) but min duration (3) not met (only 2 turns)
      const result = checkTransition(arc, null, config, 12);
      expect(result).toBeNull();
    });
  });

  describe('checkTransition: resolved stays resolved', () => {
    it('returns null for resolved arcs', () => {
      const arc = makeArc({ currentStage: 'resolved', stageEnteredTurn: 1 });
      const config = makeConfig();
      const pipeline = makePipelineState({ weeklyHits: 100, maxSeverity: 3 });

      const result = checkTransition(arc, pipeline, config, 100);
      expect(result).toBeNull();
    });
  });

  describe('inaction timer', () => {
    it('increments the timer', () => {
      const arc = makeArc({ inactionTimer: 2 });
      const updated = incrementInactionTimer(arc);
      expect(updated.inactionTimer).toBe(3);
    });

    it('does not mutate original', () => {
      const arc = makeArc({ inactionTimer: 2 });
      incrementInactionTimer(arc);
      expect(arc.inactionTimer).toBe(2);
    });

    it('resets the timer', () => {
      const arc = makeArc({ inactionTimer: 5 });
      const updated = resetInactionTimer(arc);
      expect(updated.inactionTimer).toBe(0);
    });
  });

  describe('checkPreventionConditions', () => {
    it('returns true when a new prevention condition appears', () => {
      const config = makeConfig({ preventionConditions: ['community_solar_built'] });
      const previous = new Set<string>();
      const current = new Set(['community_solar_built']);

      expect(checkPreventionConditions(config, current, previous)).toBe(true);
    });

    it('returns false when condition was already present', () => {
      const config = makeConfig({ preventionConditions: ['community_solar_built'] });
      const previous = new Set(['community_solar_built']);
      const current = new Set(['community_solar_built']);

      expect(checkPreventionConditions(config, current, previous)).toBe(false);
    });

    it('returns false when no prevention conditions are met', () => {
      const config = makeConfig({ preventionConditions: ['community_solar_built'] });
      const previous = new Set<string>();
      const current = new Set(['something_else']);

      expect(checkPreventionConditions(config, current, previous)).toBe(false);
    });

    it('returns true if any prevention condition is new', () => {
      const config = makeConfig({
        preventionConditions: ['community_solar_built', 'microgrid_operational'],
      });
      const previous = new Set<string>();
      const current = new Set(['microgrid_operational']);

      expect(checkPreventionConditions(config, current, previous)).toBe(true);
    });
  });

  describe('applyTransition', () => {
    it('updates stage and stageEnteredTurn', () => {
      const arc = makeArc({
        currentStage: 'foreshadow',
        stageEnteredTurn: 3,
        inactionTimer: 2,
      });
      const updated = applyTransition(arc, 'escalation', 7);

      expect(updated.currentStage).toBe('escalation');
      expect(updated.stageEnteredTurn).toBe(7);
      expect(updated.inactionTimer).toBe(0);
    });

    it('does not mutate original', () => {
      const arc = makeArc({ currentStage: 'foreshadow', stageEnteredTurn: 3 });
      applyTransition(arc, 'escalation', 7);
      expect(arc.currentStage).toBe('foreshadow');
      expect(arc.stageEnteredTurn).toBe(3);
    });
  });

  describe('initializeArcsFromSnapshot', () => {
    it('creates arcs at their pipeline stage', () => {
      const pipelineStates: PipelineArcState[] = [
        {
          arcId: 'energy-grid',
          stage: 'escalation',
          weeklyHits: 8,
          maxSeverity: 3,
          lastHeadlineTimestamp: '2026-05-01T12:00:00Z',
        },
        {
          arcId: 'water-pfas',
          stage: 'foreshadow',
          weeklyHits: 2,
          maxSeverity: 1,
          lastHeadlineTimestamp: '2026-05-02T08:00:00Z',
        },
        {
          arcId: 'housing-speculation',
          stage: 'dormant',
          weeklyHits: 0,
          maxSeverity: 0,
          lastHeadlineTimestamp: null,
        },
      ];

      const arcs = initializeArcsFromSnapshot(pipelineStates, 1);

      expect(arcs.length).toBe(3);
      expect(arcs[0].arcId).toBe('energy-grid');
      expect(arcs[0].currentStage).toBe('escalation');
      expect(arcs[0].initializedFromSnapshot).toBe(true);
      expect(arcs[0].stageEnteredTurn).toBe(1);
      expect(arcs[0].inactionTimer).toBe(0);

      expect(arcs[1].arcId).toBe('water-pfas');
      expect(arcs[1].currentStage).toBe('foreshadow');
      expect(arcs[1].initializedFromSnapshot).toBe(true);

      expect(arcs[2].arcId).toBe('housing-speculation');
      expect(arcs[2].currentStage).toBe('dormant');
    });

    it('handles empty pipeline state', () => {
      const arcs = initializeArcsFromSnapshot([], 1);
      expect(arcs.length).toBe(0);
    });

    it('sets initializedFromSnapshot flag', () => {
      const pipelineStates: PipelineArcState[] = [
        {
          arcId: 'energy-grid',
          stage: 'crisis',
          weeklyHits: 12,
          maxSeverity: 3,
          lastHeadlineTimestamp: '2026-05-05T14:00:00Z',
        },
      ];

      const arcs = initializeArcsFromSnapshot(pipelineStates, 1);
      expect(arcs[0].initializedFromSnapshot).toBe(true);
    });

    it('all arcs start with zero inaction timer', () => {
      const pipelineStates: PipelineArcState[] = [
        {
          arcId: 'energy-grid',
          stage: 'escalation',
          weeklyHits: 8,
          maxSeverity: 3,
          lastHeadlineTimestamp: '2026-05-01T12:00:00Z',
        },
      ];

      const arcs = initializeArcsFromSnapshot(pipelineStates, 1);
      expect(arcs[0].inactionTimer).toBe(0);
    });
  });

  describe('getDefaultArcConfig', () => {
    it('returns a valid config for any arcId', () => {
      const config = getDefaultArcConfig('energy-grid');
      expect(config.arcId).toBe('energy-grid');
      expect(config.escalationThreshold).toBeGreaterThan(0);
      expect(config.maxTurnsAtEscalation).toBeGreaterThan(0);
      expect(config.minStageDuration.foreshadow).toBeGreaterThan(0);
    });
  });
});
