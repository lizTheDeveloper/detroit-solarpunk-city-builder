import type { GameState, AdvisorState } from '../state/types';
import { arcTemplateMap } from '../data/arcs';
import { predictElectionOutcome } from './reelection';
import { PROJECT_CATALOG } from '../data/content/project-catalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdvisorPrompt {
  conditionId: string;
  characterId: string;
  characterName: string;
  message: string;
  priority: number;
}

export interface AdvisorCondition {
  id: string;
  priority: number;
  characterId: string;
  characterName: string;
  condition: (state: GameState) => boolean;
  message: (state: GameState) => string;
}

// ---------------------------------------------------------------------------
// Condition Definitions
// ---------------------------------------------------------------------------

/**
 * Priority-ordered advisor conditions. Lower number = higher priority.
 * Each condition maps to a community leader whose voice fits the warning.
 */
export const ADVISOR_CONDITIONS: AdvisorCondition[] = [
  {
    id: 'arc-crisis-imminent',
    priority: 1,
    characterId: 'tamika',
    characterName: 'Tamika Jefferson',
    condition: (state) => {
      for (const arc of state.activeArcs) {
        if (arc.currentStage === 'dormant' || arc.currentStage === 'resolved') continue;
        const config = arcTemplateMap[arc.arcId]?.config;
        if (!config) continue;
        if (arc.inactionTimer >= config.escalationThreshold - 1) {
          return true;
        }
      }
      return false;
    },
    message: (state) => {
      for (const arc of state.activeArcs) {
        if (arc.currentStage === 'dormant' || arc.currentStage === 'resolved') continue;
        const config = arcTemplateMap[arc.arcId]?.config;
        if (!config) continue;
        if (arc.inactionTimer >= config.escalationThreshold - 1) {
          const template = arcTemplateMap[arc.arcId];
          const name = template?.name ?? arc.arcId;
          return `A crisis is about to break. The ${name} situation is one step from boiling over and we are not ready. I've seen what happens when we wait too long.`;
        }
      }
      return 'A crisis is about to break. We need to act now.';
    },
  },
  {
    id: 'budget-critical',
    priority: 2,
    characterId: 'kez',
    characterName: 'Kezia "Kez" Monroe',
    condition: (state) => state.meters.budget < 0.2,
    message: (_state) =>
      "You're running out of money. When the budget dries up, it's the neighborhoods that get cut first. I've watched it happen. Find revenue or start making hard choices.",
  },
  {
    id: 'election-risk',
    priority: 3,
    characterId: 'big_mike',
    characterName: 'Big Mike Novak',
    condition: (state) => {
      const turnsUntilElection = 48 - ((state.turn - 1) % 48);
      if (turnsUntilElection >= 10) return false;
      const prediction = predictElectionOutcome(state);
      return prediction.predictedScore < 45; // threshold is 45, so < 45 = losing
    },
    message: (state) => {
      const turnsUntilElection = 48 - ((state.turn - 1) % 48);
      return `Re-election is at risk. You've got ${turnsUntilElection} months and the numbers don't look good. People on my block are asking what you've actually done for them. Time to deliver something they can see.`;
    },
  },
  {
    id: 'will-at-zero',
    priority: 4,
    characterId: 'elder_whitehorse',
    characterName: 'Elder Whitehorse',
    condition: (state) => state.meters.politicalWill <= 2,
    message: (_state) =>
      "You have no political capital to spend. A leader without support is just a person with a title. Build relationships. Listen before you ask. The will comes back if you earn it.",
  },
  {
    id: 'trust-dropping',
    priority: 5,
    characterId: 'grace',
    characterName: 'Grace Okafor-Williams',
    condition: (state) => state.meters.communityTrust < 40,
    message: (_state) =>
      "The community is losing faith. People have been promised things before. If you don't show up for them consistently, they'll stop showing up for you. That's not a threat, that's just how trust works.",
  },
  {
    id: 'no-eco-projects',
    priority: 6,
    characterId: 'lucia',
    characterName: 'Lucia Espinoza',
    condition: (state) => {
      if (state.meters.ecologicalHealth >= 40) return false;
      const allProjects = Object.values(state.tiles).flatMap((t) => t.activeProjects);
      const hasEcoProject = allProjects.some((p) => {
        const def = PROJECT_CATALOG[p.definitionId];
        return def?.category === 'ecology';
      });
      return !hasEcoProject;
    },
    message: (_state) =>
      "Ecological health is declining with no investment. The water doesn't care about your budget meetings. Every month without a rain garden or remediation project is another month the soil gets worse. Agua es vida.",
  },
  {
    id: 'food-stagnant',
    priority: 7,
    characterId: 'grace',
    characterName: 'Grace Okafor-Williams',
    condition: (state) => {
      if (state.turn <= 12) return false;
      if (state.meters.foodSovereignty >= 20) return false;
      const allProjects = Object.values(state.tiles).flatMap((t) => t.activeProjects);
      const hasFoodProject = allProjects.some((p) => {
        const def = PROJECT_CATALOG[p.definitionId];
        return def?.category === 'ecology' && (def.effects.foodSov > 0);
      });
      return !hasFoodProject;
    },
    message: (_state) =>
      "Food access hasn't improved. A year in and people are still driving forty minutes for fresh greens. We could have a food forest half-grown by now. Feeding ourselves to free ourselves — but only if we start.",
  },
  {
    id: 'no-narrative-used',
    priority: 8,
    characterId: 'darius',
    characterName: 'Darius Kemp',
    condition: (state) => {
      if (state.turn <= 6) return false;
      return state.narrativeState.actionsRemaining === state.narrativeState.actionsPerTurn;
    },
    message: (_state) =>
      "You haven't used your voice this month. The mayor's office has a platform. Use it. A rally, a mural unveiling, a press conference — something to remind people there's a vision here, not just paperwork.",
  },
];

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Returns the highest-priority advisor prompt that isn't dismissed or on cooldown.
 * Returns null if no conditions are currently met.
 */
export function getAdvisorPrompt(state: GameState): AdvisorPrompt | null {
  const { dismissedConditions, cooldowns } = state.advisorState;

  for (const cond of ADVISOR_CONDITIONS) {
    // Skip permanently dismissed
    if (dismissedConditions.includes(cond.id)) continue;

    // Skip if on cooldown
    if (cooldowns[cond.id] != null && state.turn < cooldowns[cond.id]) continue;

    // Check condition
    if (cond.condition(state)) {
      return {
        conditionId: cond.id,
        characterId: cond.characterId,
        characterName: cond.characterName,
        message: cond.message(state),
        priority: cond.priority,
      };
    }
  }

  return null;
}

/**
 * Permanently dismiss a condition so it never fires again.
 */
export function dismissCondition(state: GameState, conditionId: string): GameState {
  const advisorState: AdvisorState = {
    ...state.advisorState,
    dismissedConditions: [...state.advisorState.dismissedConditions, conditionId],
  };
  return { ...state, advisorState };
}

/**
 * Apply a cooldown so the condition won't fire again for 8 turns.
 */
export function applyCooldown(state: GameState, conditionId: string): GameState {
  const advisorState: AdvisorState = {
    ...state.advisorState,
    cooldowns: {
      ...state.advisorState.cooldowns,
      [conditionId]: state.turn + 8,
    },
  };
  return { ...state, advisorState };
}
