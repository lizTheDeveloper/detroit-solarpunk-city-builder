import { describe, it, expect } from 'vitest';
import { selectFrame, generateStaticFrames } from '../systems/frame-selection';
import type { FramedHeadline } from '../systems/frame-selection';
import type { GameState } from '../state/types';
import { createNewGame } from '../state/create-game';

function makeHeadline(arcId: string): FramedHeadline {
  return {
    headlineId: 'test-1',
    rawTitle: 'DTE Proposes Rate Hike',
    arcId,
    severity: 2,
    frames: {
      establishment: { type: 'establishment', text: 'Grid modernization requires investment', source: 'test' },
      community: { type: 'community', text: 'Residents demand accountability for rate hikes', source: 'test' },
      market: { type: 'market', text: 'DTE stock rises on infrastructure spending signal', source: 'test' },
    },
  };
}

describe('Frame Selection', () => {
  it('shows establishment frame when arc is active and antagonist not countered', () => {
    const state = createNewGame();
    // energy-grid arc starts dormant but let's push it to foreshadow
    const stateWithActiveArc = {
      ...state,
      activeArcs: [{ arcId: 'energy-grid', currentStage: 'escalation' as const, stageEnteredTurn: 1, inactionTimer: 0, lastEventTurn: 0, initializedFromSnapshot: false }],
      dependencyWeb: { conditions: [], capacities: {} },
    };

    const headline = makeHeadline('energy-grid');
    const frame = selectFrame(headline, stateWithActiveArc as GameState);
    expect(frame?.type).toBe('establishment');
  });

  it('shows market frame when antagonist has been countered', () => {
    const state = createNewGame();
    const stateWithCountered = {
      ...state,
      activeArcs: [{ arcId: 'energy-grid', currentStage: 'escalation' as const, stageEnteredTurn: 1, inactionTimer: 0, lastEventTurn: 0, initializedFromSnapshot: false }],
      dependencyWeb: { conditions: ['countered_energy-grid'], capacities: {} },
    };

    const headline = makeHeadline('energy-grid');
    const frame = selectFrame(headline, stateWithCountered as GameState);
    expect(frame?.type).toBe('market');
  });

  it('shows community frame when arc is dormant', () => {
    const state = createNewGame();
    const stateWithDormant = {
      ...state,
      activeArcs: [{ arcId: 'energy-grid', currentStage: 'dormant' as const, stageEnteredTurn: 1, inactionTimer: 0, lastEventTurn: 0, initializedFromSnapshot: false }],
      dependencyWeb: { conditions: [], capacities: {} },
    };

    const headline = makeHeadline('energy-grid');
    const frame = selectFrame(headline, stateWithDormant as GameState);
    expect(frame?.type).toBe('community');
  });

  it('shows community frame when no arcs match headline', () => {
    const state = createNewGame();
    const stateWithOtherArc = {
      ...state,
      activeArcs: [{ arcId: 'water-pfas', currentStage: 'escalation' as const, stageEnteredTurn: 1, inactionTimer: 0, lastEventTurn: 0, initializedFromSnapshot: false }],
      dependencyWeb: { conditions: [], capacities: {} },
    };

    const headline = makeHeadline('energy-grid');
    const frame = selectFrame(headline, stateWithOtherArc as GameState);
    expect(frame?.type).toBe('community');
  });

  it('shows community frame when arc is resolved', () => {
    const state = createNewGame();
    const stateWithResolved = {
      ...state,
      activeArcs: [{ arcId: 'energy-grid', currentStage: 'resolved' as const, stageEnteredTurn: 1, inactionTimer: 0, lastEventTurn: 0, initializedFromSnapshot: false }],
      dependencyWeb: { conditions: [], capacities: {} },
    };

    const headline = makeHeadline('energy-grid');
    const frame = selectFrame(headline, stateWithResolved as GameState);
    expect(frame?.type).toBe('community');
  });

  describe('generateStaticFrames', () => {
    it('generates all three frames', () => {
      const framed = generateStaticFrames('DTE Rate Increase', 'energy-grid', 2);
      expect(framed.frames.establishment).not.toBeNull();
      expect(framed.frames.community).not.toBeNull();
      expect(framed.frames.market).not.toBeNull();
      expect(framed.arcId).toBe('energy-grid');
      expect(framed.severity).toBe(2);
    });
  });
});
