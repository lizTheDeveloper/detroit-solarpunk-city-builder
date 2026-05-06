import { describe, it, expect } from 'vitest';
import {
  scheduleConsequence,
  processConsequences,
  getForeshadowHints,
} from './delayed-consequences';
import { createDependencyWeb, addCondition } from './dependency-web';
import type { DelayedConsequence, DependencyWeb } from '../state/crisis-types';

function makeConsequence(overrides: Partial<DelayedConsequence> = {}): DelayedConsequence {
  return {
    id: 'test-consequence-1',
    arcId: 'energy-grid',
    triggerTurn: 16,
    activationConditions: [],
    cancelConditions: [],
    effects: [{ type: 'meterDelta', meter: 'budget', amount: -0.5 }],
    foreshadowHint: 'Energy costs are rising...',
    hintTurnsBeforeTrigger: 3,
    ...overrides,
  };
}

describe('delayed-consequences', () => {
  describe('scheduleConsequence', () => {
    it('adds a consequence to an empty queue', () => {
      const queue = scheduleConsequence([], makeConsequence());
      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe('test-consequence-1');
    });

    it('maintains sort order by triggerTurn', () => {
      let queue: DelayedConsequence[] = [];
      queue = scheduleConsequence(queue, makeConsequence({ id: 'late', triggerTurn: 20 }));
      queue = scheduleConsequence(queue, makeConsequence({ id: 'early', triggerTurn: 10 }));
      queue = scheduleConsequence(queue, makeConsequence({ id: 'middle', triggerTurn: 15 }));

      expect(queue[0].id).toBe('early');
      expect(queue[1].id).toBe('middle');
      expect(queue[2].id).toBe('late');
    });

    it('does not mutate the original queue', () => {
      const original: DelayedConsequence[] = [];
      scheduleConsequence(original, makeConsequence());
      expect(original.length).toBe(0);
    });
  });

  describe('processConsequences', () => {
    it('fires consequences at their trigger turn', () => {
      const queue = [makeConsequence({ triggerTurn: 10 })];
      const web = createDependencyWeb();
      const result = processConsequences(queue, 10, web);

      expect(result.fired.length).toBe(1);
      expect(result.cancelled.length).toBe(0);
      expect(result.remaining.length).toBe(0);
    });

    it('fires consequences past their trigger turn', () => {
      const queue = [makeConsequence({ triggerTurn: 8 })];
      const web = createDependencyWeb();
      const result = processConsequences(queue, 10, web);

      expect(result.fired.length).toBe(1);
    });

    it('keeps consequences with future trigger turn in remaining', () => {
      const queue = [makeConsequence({ triggerTurn: 20 })];
      const web = createDependencyWeb();
      const result = processConsequences(queue, 10, web);

      expect(result.fired.length).toBe(0);
      expect(result.remaining.length).toBe(1);
    });

    it('cancels consequence when cancel condition is present', () => {
      const queue = [
        makeConsequence({
          triggerTurn: 10,
          cancelConditions: ['has_community_solar'],
        }),
      ];
      const web = addCondition(createDependencyWeb(), 'has_community_solar');
      const result = processConsequences(queue, 10, web);

      expect(result.fired.length).toBe(0);
      expect(result.cancelled.length).toBe(1);
    });

    it('fires consequence when activation conditions are met', () => {
      const queue = [
        makeConsequence({
          triggerTurn: 10,
          activationConditions: ['no_alternative_grid'],
        }),
      ];
      const web = addCondition(createDependencyWeb(), 'no_alternative_grid');
      const result = processConsequences(queue, 10, web);

      expect(result.fired.length).toBe(1);
    });

    it('cancels consequence when activation conditions are NOT met', () => {
      const queue = [
        makeConsequence({
          triggerTurn: 10,
          activationConditions: ['no_alternative_grid'],
        }),
      ];
      const web = createDependencyWeb(); // condition not present
      const result = processConsequences(queue, 10, web);

      expect(result.fired.length).toBe(0);
      expect(result.cancelled.length).toBe(1);
    });

    it('cancel conditions take priority over activation conditions', () => {
      const queue = [
        makeConsequence({
          triggerTurn: 10,
          activationConditions: ['no_alternative_grid'],
          cancelConditions: ['has_community_solar'],
        }),
      ];
      let web = createDependencyWeb();
      web = addCondition(web, 'no_alternative_grid');
      web = addCondition(web, 'has_community_solar');
      const result = processConsequences(queue, 10, web);

      expect(result.fired.length).toBe(0);
      expect(result.cancelled.length).toBe(1);
    });

    it('processes multiple consequences in the same turn', () => {
      const queue = [
        makeConsequence({ id: 'a', triggerTurn: 15 }),
        makeConsequence({ id: 'b', triggerTurn: 15 }),
        makeConsequence({ id: 'c', triggerTurn: 15 }),
      ];
      const web = createDependencyWeb();
      const result = processConsequences(queue, 15, web);

      expect(result.fired.length).toBe(3);
      expect(result.remaining.length).toBe(0);
    });

    it('correctly separates fired, cancelled, and remaining', () => {
      const queue = [
        makeConsequence({ id: 'fire', triggerTurn: 10 }),
        makeConsequence({ id: 'cancel', triggerTurn: 10, cancelConditions: ['blocked'] }),
        makeConsequence({ id: 'future', triggerTurn: 20 }),
      ];
      const web = addCondition(createDependencyWeb(), 'blocked');
      const result = processConsequences(queue, 10, web);

      expect(result.fired.length).toBe(1);
      expect(result.fired[0].id).toBe('fire');
      expect(result.cancelled.length).toBe(1);
      expect(result.cancelled[0].id).toBe('cancel');
      expect(result.remaining.length).toBe(1);
      expect(result.remaining[0].id).toBe('future');
    });
  });

  describe('getForeshadowHints', () => {
    it('returns no hints when queue is empty', () => {
      const hints = getForeshadowHints([], 10, createDependencyWeb());
      expect(hints.length).toBe(0);
    });

    it('returns hint when within hint window', () => {
      const queue = [
        makeConsequence({
          triggerTurn: 16,
          hintTurnsBeforeTrigger: 3,
          foreshadowHint: 'Energy costs are rising...',
        }),
      ];
      // Hint should show at turn 13 (16 - 3)
      const hints = getForeshadowHints(queue, 13, createDependencyWeb());
      expect(hints.length).toBe(1);
      expect(hints[0].hint).toBe('Energy costs are rising...');
    });

    it('returns hint when past hint window but before trigger', () => {
      const queue = [
        makeConsequence({
          triggerTurn: 16,
          hintTurnsBeforeTrigger: 3,
        }),
      ];
      // Turn 14 is past the hint start (13) but before trigger (16)
      const hints = getForeshadowHints(queue, 14, createDependencyWeb());
      expect(hints.length).toBe(1);
    });

    it('does not return hint before hint window', () => {
      const queue = [
        makeConsequence({
          triggerTurn: 16,
          hintTurnsBeforeTrigger: 3,
        }),
      ];
      // Turn 12 is before hint window (16 - 3 = 13)
      const hints = getForeshadowHints(queue, 12, createDependencyWeb());
      expect(hints.length).toBe(0);
    });

    it('does not return hint for already triggered consequences', () => {
      const queue = [
        makeConsequence({
          triggerTurn: 10,
          hintTurnsBeforeTrigger: 3,
        }),
      ];
      // Turn 10 = trigger turn, consequence should have fired already
      const hints = getForeshadowHints(queue, 10, createDependencyWeb());
      expect(hints.length).toBe(0);
    });

    it('does not return hint for cancelled consequences', () => {
      const queue = [
        makeConsequence({
          triggerTurn: 16,
          hintTurnsBeforeTrigger: 3,
          cancelConditions: ['has_community_solar'],
        }),
      ];
      const web = addCondition(createDependencyWeb(), 'has_community_solar');
      const hints = getForeshadowHints(queue, 13, web);
      expect(hints.length).toBe(0);
    });

    it('returns multiple hints from different arcs', () => {
      const queue = [
        makeConsequence({
          id: 'energy-hint',
          arcId: 'energy-grid',
          triggerTurn: 16,
          hintTurnsBeforeTrigger: 3,
          foreshadowHint: 'Energy costs are rising...',
        }),
        makeConsequence({
          id: 'water-hint',
          arcId: 'water-pfas',
          triggerTurn: 17,
          hintTurnsBeforeTrigger: 4,
          foreshadowHint: 'Water quality reports are concerning...',
        }),
      ];
      const hints = getForeshadowHints(queue, 13, createDependencyWeb());
      expect(hints.length).toBe(2);
      expect(hints[0].arcId).toBe('energy-grid');
      expect(hints[1].arcId).toBe('water-pfas');
    });
  });
});
