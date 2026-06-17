import { describe, it, expect } from 'vitest';
import { createNewGame } from '../state/create-game';
import {
  TUTORIAL_STEPS,
  checkTutorialTriggers,
  completeStep,
  skipTutorial,
  isStepCompleted,
} from '../systems/tutorial';
import type { GameState } from '../state/types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createNewGame(), ...overrides };
}

describe('Tutorial System', () => {
  describe('step triggering conditions', () => {
    it('triggers start-project on turn 1', () => {
      const state = makeState({ turn: 1 });
      const result = checkTutorialTriggers(state);
      expect(result).not.toBeNull();
      expect(result!.stepId).toBe('start-project');
    });

    it('triggers read-meters on turn 2 after start-project is completed', () => {
      let state = makeState({ turn: 2 });
      state = completeStep(state, 'start-project');
      const result = checkTutorialTriggers(state);
      expect(result).not.toBeNull();
      expect(result!.stepId).toBe('read-meters');
    });

    it('does not skip steps — returns null if next uncompleted step trigger is not met', () => {
      // Turn 1, complete start-project, but read-meters needs turn >= 2
      let state = makeState({ turn: 1 });
      state = completeStep(state, 'start-project');
      const result = checkTutorialTriggers(state);
      expect(result).toBeNull();
    });

    it('triggers proposals when proposals exist and turn >= 3', () => {
      let state = makeState({
        turn: 3,
        activeProposals: [{
          id: 'test-proposal',
          leaderId: 'leader-1',
          projectDefinitionId: 'community_garden',
          tileId: 'brightmoor',
          reason: 'testing',
          turnProposed: 3,
          expirationTurn: 6,
          pressureLevel: 0,
        }],
      });
      state = completeStep(state, 'start-project');
      state = completeStep(state, 'read-meters');
      const result = checkTutorialTriggers(state);
      expect(result).not.toBeNull();
      expect(result!.stepId).toBe('proposals');
    });

    it('triggers narrative-actions when trust drops below 45', () => {
      let state = makeState({
        turn: 3,
        meters: { ...createNewGame().meters, communityTrust: 40 },
      });
      state = completeStep(state, 'start-project');
      state = completeStep(state, 'read-meters');
      state = completeStep(state, 'proposals');
      const result = checkTutorialTriggers(state);
      expect(result).not.toBeNull();
      expect(result!.stepId).toBe('narrative-actions');
    });

    it('triggers crisis-foreshadow when an arc reaches foreshadow stage', () => {
      let state = makeState();
      state = completeStep(state, 'start-project');
      state = completeStep(state, 'read-meters');
      state = completeStep(state, 'proposals');
      state = completeStep(state, 'narrative-actions');

      // Simulate an arc in foreshadow
      state = {
        ...state,
        activeArcs: state.activeArcs.map((a, i) =>
          i === 0 ? { ...a, currentStage: 'foreshadow' as const } : a,
        ),
      };

      const result = checkTutorialTriggers(state);
      expect(result).not.toBeNull();
      expect(result!.stepId).toBe('crisis-foreshadow');
    });

    it('triggers election-prep at turn 40', () => {
      let state = makeState({ turn: 40 });
      // Complete all prior steps
      state = completeStep(state, 'start-project');
      state = completeStep(state, 'read-meters');
      state = completeStep(state, 'proposals');
      state = completeStep(state, 'narrative-actions');
      state = completeStep(state, 'crisis-foreshadow');
      state = completeStep(state, 'crisis-fork');
      state = completeStep(state, 'policies');
      const result = checkTutorialTriggers(state);
      expect(result).not.toBeNull();
      expect(result!.stepId).toBe('election-prep');
    });
  });

  describe('auto-completion (player acts before trigger)', () => {
    it('completing a step that is already completed is a no-op', () => {
      let state = makeState({ turn: 1 });
      state = completeStep(state, 'start-project');
      const before = state.tutorialState.completedSteps.length;
      state = completeStep(state, 'start-project');
      expect(state.tutorialState.completedSteps.length).toBe(before);
    });

    it('steps can be completed out of trigger order via completeStep', () => {
      let state = makeState();
      state = completeStep(state, 'read-meters');
      expect(isStepCompleted(state, 'read-meters')).toBe(true);
      // But checkTutorialTriggers still returns start-project (sequential gate)
      const result = checkTutorialTriggers(state);
      expect(result!.stepId).toBe('start-project');
    });
  });

  describe('skip behavior', () => {
    it('skipTutorial marks all steps completed and sets active false', () => {
      const state = makeState();
      const skipped = skipTutorial(state);
      expect(skipped.tutorialState.active).toBe(false);
      expect(skipped.tutorialState.completedSteps).toHaveLength(TUTORIAL_STEPS.length);
      for (const step of TUTORIAL_STEPS) {
        expect(skipped.tutorialState.completedSteps).toContain(step.id);
      }
    });

    it('checkTutorialTriggers returns null after skip', () => {
      const state = makeState();
      const skipped = skipTutorial(state);
      expect(checkTutorialTriggers(skipped)).toBeNull();
    });
  });

  describe('all steps eventually complete', () => {
    it('completing all steps in order deactivates the tutorial', () => {
      let state = makeState({
        turn: 40,
        stage: 'transition',
        activeProposals: [{
          id: 'p1',
          leaderId: 'l1',
          projectDefinitionId: 'proj',
          tileId: 'brightmoor',
          reason: 'test',
          turnProposed: 3,
          expirationTurn: 6,
          pressureLevel: 0,
        }],
        activeArcs: createNewGame().activeArcs.map((a, i) => ({
          ...a,
          currentStage: i === 0 ? 'crisis' as const : 'foreshadow' as const,
        })),
      });

      for (const step of TUTORIAL_STEPS) {
        state = completeStep(state, step.id);
      }

      expect(state.tutorialState.active).toBe(false);
      expect(state.tutorialState.completedSteps).toHaveLength(TUTORIAL_STEPS.length);
    });

    it('tutorial-complete is the final step and always triggers when all others are done', () => {
      let state = makeState({ turn: 40, stage: 'transition' });
      // Complete all steps except the last
      for (const step of TUTORIAL_STEPS.slice(0, -1)) {
        state = completeStep(state, step.id);
      }
      // tutorial-complete trigger is always true
      const result = checkTutorialTriggers(state);
      expect(result).not.toBeNull();
      expect(result!.stepId).toBe('tutorial-complete');

      // Completing it deactivates the tutorial
      state = completeStep(state, 'tutorial-complete');
      expect(state.tutorialState.active).toBe(false);
    });
  });

  describe('isStepCompleted', () => {
    it('returns false for uncompleted step', () => {
      const state = makeState();
      expect(isStepCompleted(state, 'start-project')).toBe(false);
    });

    it('returns true for completed step', () => {
      const state = completeStep(makeState(), 'start-project');
      expect(isStepCompleted(state, 'start-project')).toBe(true);
    });
  });
});
