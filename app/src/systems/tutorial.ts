import type { GameState } from '../state/types';

export interface TutorialStep {
  id: string;
  trigger: (state: GameState) => boolean;
  message: string;
  panel: string | null;
}

/**
 * Tutorial steps are ordered; the system advances through them sequentially.
 * Each step triggers when its condition is met AND all prior steps are completed.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'start-project',
    trigger: (state) => state.turn === 1,
    message: 'Select a neighborhood and start your first project. This is how you shape the city.',
    panel: 'tiles',
  },
  {
    id: 'read-meters',
    trigger: (state) => state.turn >= 2,
    message: 'Your meters shifted after that turn. Watch how projects, events, and community trust affect the city.',
    panel: null,
  },
  {
    id: 'proposals',
    trigger: (state) => state.activeProposals.length > 0 && state.turn >= 3,
    message: 'A community leader proposed a project. You can accept, modify, defer, or reject. Relationships depend on your choice.',
    panel: 'tiles',
  },
  {
    id: 'narrative-actions',
    trigger: (state) => state.turn >= 5 || state.meters.communityTrust < 45,
    message: 'Narrative actions let you build trust, shift public opinion, and counter opposition outside of projects.',
    panel: 'narrative',
  },
  {
    id: 'crisis-foreshadow',
    trigger: (state) => state.activeArcs.some(a => a.currentStage === 'foreshadow'),
    message: 'A crisis is forming on the horizon. Watch for escalation — early action can prevent the worst outcomes.',
    panel: 'tensions',
  },
  {
    id: 'crisis-fork',
    trigger: (state) => state.activeArcs.some(a => a.currentStage === 'crisis'),
    message: 'A crisis has arrived. The choice you make now will shape the city for turns to come. There is no neutral option.',
    panel: 'tensions',
  },
  {
    id: 'policies',
    trigger: (state) => state.stage === 'transition',
    message: 'You have reached the transition stage. Policies can now be enacted to reshape the rules of the city.',
    panel: 'policies',
  },
  {
    id: 'election-prep',
    trigger: (state) => state.turn >= 40,
    message: 'The election approaches. Your council relationships, public opinion, and track record all factor into reelection.',
    panel: 'council',
  },
  {
    id: 'tutorial-complete',
    trigger: (_state) => true, // always true — triggers once all prior steps are done
    message: 'You have seen all core systems. The guardrails are off. Build the city Detroit deserves.',
    panel: null,
  },
];

/**
 * Returns the next tutorial step whose trigger condition is met,
 * respecting sequential ordering (all prior steps must be completed first).
 */
export function checkTutorialTriggers(
  state: GameState,
): { stepId: string; message: string; panel: string | null } | null {
  if (!state.tutorialState.active) return null;

  for (const step of TUTORIAL_STEPS) {
    if (state.tutorialState.completedSteps.includes(step.id)) continue;

    // Steps must be completed in order: if this step's trigger isn't met, stop.
    if (!step.trigger(state)) return null;

    return { stepId: step.id, message: step.message, panel: step.panel };
  }

  return null;
}

/**
 * Mark a tutorial step as completed. If all steps are done, deactivate tutorial.
 */
export function completeStep(state: GameState, stepId: string): GameState {
  if (state.tutorialState.completedSteps.includes(stepId)) return state;

  const completedSteps = [...state.tutorialState.completedSteps, stepId];
  const allDone = TUTORIAL_STEPS.every(s => completedSteps.includes(s.id));

  return {
    ...state,
    tutorialState: {
      ...state.tutorialState,
      completedSteps,
      active: !allDone,
    },
  };
}

/**
 * Skip the entire tutorial — marks all steps completed and deactivates.
 */
export function skipTutorial(state: GameState): GameState {
  return {
    ...state,
    tutorialState: {
      active: false,
      completedSteps: TUTORIAL_STEPS.map(s => s.id),
      dismissedTooltips: state.tutorialState.dismissedTooltips,
    },
  };
}

/**
 * Check if a specific step has been completed.
 */
export function isStepCompleted(state: GameState, stepId: string): boolean {
  return state.tutorialState.completedSteps.includes(stepId);
}
