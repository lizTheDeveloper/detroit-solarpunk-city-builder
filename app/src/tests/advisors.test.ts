import { describe, it, expect } from 'vitest';
import { createNewGame } from '../state/create-game';
import { getAdvisorPrompt, dismissCondition, applyCooldown, ADVISOR_CONDITIONS } from '../systems/advisors';
import type { GameState } from '../state/types';

function withMeters(state: GameState, overrides: Partial<GameState['meters']>): GameState {
  return { ...state, meters: { ...state.meters, ...overrides } };
}

describe('Advisor System', () => {
  describe('Priority ordering', () => {
    it('returns highest-priority condition when multiple are met', () => {
      let state = createNewGame();
      // Set up conditions so both budget-critical (priority 2) and trust-dropping (priority 5) fire
      state = withMeters(state, { budget: 0.1, communityTrust: 30 });

      const prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('budget-critical');
      expect(prompt!.priority).toBe(2);
    });

    it('returns next-priority condition when higher one is dismissed', () => {
      let state = createNewGame();
      state = withMeters(state, { budget: 0.1, communityTrust: 30 });

      // Dismiss budget-critical
      state = dismissCondition(state, 'budget-critical');

      const prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('trust-dropping');
    });

    it('conditions are sorted by priority (lower number = higher priority)', () => {
      const priorities = ADVISOR_CONDITIONS.map((c) => c.priority);
      const sorted = [...priorities].sort((a, b) => a - b);
      expect(priorities).toEqual(sorted);
    });
  });

  describe('Cooldown enforcement', () => {
    it('condition on cooldown does not fire until cooldown expires', () => {
      let state = createNewGame();
      state = withMeters(state, { communityTrust: 30 });

      // Verify it fires initially
      let prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('trust-dropping');

      // Apply cooldown at turn 1 -> expires at turn 9
      state = applyCooldown(state, 'trust-dropping');
      expect(state.advisorState.cooldowns['trust-dropping']).toBe(9);

      // Still turn 1 — should not fire
      prompt = getAdvisorPrompt(state);
      // trust-dropping is on cooldown, so it should be null (no other conditions met)
      expect(prompt?.conditionId).not.toBe('trust-dropping');

      // Advance to turn 8 — still on cooldown
      state = { ...state, turn: 8 };
      prompt = getAdvisorPrompt(state);
      expect(prompt?.conditionId).not.toBe('trust-dropping');

      // Advance to turn 9 — cooldown expired, should fire again
      state = { ...state, turn: 9 };
      prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('trust-dropping');
    });
  });

  describe('Dismissal', () => {
    it('dismissed condition never fires again', () => {
      let state = createNewGame();
      state = withMeters(state, { communityTrust: 30 });

      state = dismissCondition(state, 'trust-dropping');

      // Even with low trust, it should never fire
      const prompt = getAdvisorPrompt(state);
      expect(prompt?.conditionId).not.toBe('trust-dropping');

      // Even far in the future
      state = { ...state, turn: 100 };
      const laterPrompt = getAdvisorPrompt(state);
      expect(laterPrompt?.conditionId).not.toBe('trust-dropping');
    });
  });

  describe('Individual conditions', () => {
    it('arc-crisis-imminent fires when inactionTimer hits threshold - 1', () => {
      let state = createNewGame();
      // energy-grid has escalationThreshold: 3, so fires at inactionTimer >= 2
      state = {
        ...state,
        activeArcs: state.activeArcs.map((arc) =>
          arc.arcId === 'energy-grid'
            ? { ...arc, currentStage: 'escalation' as const, inactionTimer: 2 }
            : arc,
        ),
      };

      const prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('arc-crisis-imminent');
      expect(prompt!.characterId).toBe('tamika');
    });

    it('arc-crisis-imminent does not fire for dormant arcs', () => {
      let state = createNewGame();
      // Even with high inaction timer, dormant arcs shouldn't trigger
      state = {
        ...state,
        activeArcs: state.activeArcs.map((arc) =>
          arc.arcId === 'energy-grid'
            ? { ...arc, currentStage: 'dormant' as const, inactionTimer: 10 }
            : arc,
        ),
      };

      const prompt = getAdvisorPrompt(state);
      expect(prompt?.conditionId).not.toBe('arc-crisis-imminent');
    });

    it('budget-critical fires when budget < 0.2', () => {
      let state = createNewGame();
      state = withMeters(state, { budget: 0.19 });

      const prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('budget-critical');
      expect(prompt!.characterId).toBe('kez');
    });

    it('budget-critical does not fire when budget >= 0.2', () => {
      let state = createNewGame();
      state = withMeters(state, { budget: 0.2 });

      const prompt = getAdvisorPrompt(state);
      expect(prompt?.conditionId).not.toBe('budget-critical');
    });

    it('election-risk fires when close to election with low score', () => {
      let state = createNewGame();
      // Turn 40 means 8 turns until election (48 - ((40-1) % 48) = 9... let's use turn 41)
      // Turn 41: 48 - ((41-1) % 48) = 48 - 40 = 8 turns left (< 10)
      state = { ...state, turn: 41 };
      // Low trust = low predicted score
      state = withMeters(state, { communityTrust: 20, politicalWill: 5 });

      const prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('election-risk');
      expect(prompt!.characterId).toBe('big_mike');
    });

    it('election-risk does not fire when far from election', () => {
      let state = createNewGame();
      // Turn 10: 48 - ((10-1) % 48) = 48 - 9 = 39 turns left (>= 10)
      state = { ...state, turn: 10 };
      state = withMeters(state, { communityTrust: 20 });

      const prompt = getAdvisorPrompt(state);
      expect(prompt?.conditionId).not.toBe('election-risk');
    });

    it('will-at-zero fires when politicalWill <= 2', () => {
      let state = createNewGame();
      state = withMeters(state, { politicalWill: 2 });

      const prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('will-at-zero');
      expect(prompt!.characterId).toBe('elder_whitehorse');
    });

    it('trust-dropping fires when trust < 40', () => {
      let state = createNewGame();
      state = withMeters(state, { communityTrust: 39 });

      const prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('trust-dropping');
      expect(prompt!.characterId).toBe('grace');
    });

    it('no-eco-projects fires when eco < 40 and no ecology projects active', () => {
      let state = createNewGame();
      state = withMeters(state, { ecologicalHealth: 30, communityTrust: 50 });
      // Ensure no active eco projects (default state has none)

      const prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('no-eco-projects');
      expect(prompt!.characterId).toBe('lucia');
    });

    it('no-eco-projects does not fire when eco >= 40', () => {
      let state = createNewGame();
      state = withMeters(state, { ecologicalHealth: 40, communityTrust: 50 });

      const prompt = getAdvisorPrompt(state);
      expect(prompt?.conditionId).not.toBe('no-eco-projects');
    });

    it('no-eco-projects does not fire when eco project is active', () => {
      let state = createNewGame();
      state = withMeters(state, { ecologicalHealth: 30, communityTrust: 50 });
      // Add an active ecology project
      state = {
        ...state,
        tiles: {
          ...state.tiles,
          brightmoor: {
            ...state.tiles['brightmoor'],
            activeProjects: [
              {
                definitionId: 'food_forest',
                tileId: 'brightmoor',
                mode: 'player-initiated' as const,
                progress: 3,
                duration: 9,
                cost: 0.1,
              },
            ],
          },
        },
      };

      const prompt = getAdvisorPrompt(state);
      expect(prompt?.conditionId).not.toBe('no-eco-projects');
    });

    it('food-stagnant fires when foodSov < 20, no food projects, and turn > 12', () => {
      let state = createNewGame();
      state = { ...state, turn: 13 };
      state = withMeters(state, { foodSovereignty: 15, communityTrust: 50, ecologicalHealth: 50 });

      const prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('food-stagnant');
      expect(prompt!.characterId).toBe('grace');
    });

    it('food-stagnant does not fire before turn 12', () => {
      let state = createNewGame();
      state = { ...state, turn: 12 };
      state = withMeters(state, { foodSovereignty: 15, communityTrust: 50, ecologicalHealth: 50 });

      const prompt = getAdvisorPrompt(state);
      expect(prompt?.conditionId).not.toBe('food-stagnant');
    });

    it('no-slots-used fires when no calendar slots spent and turn > 6', () => {
      let state = createNewGame();
      state = { ...state, turn: 7 };
      state = withMeters(state, { communityTrust: 50, ecologicalHealth: 50 });
      // calendarState starts with slotsSpent === 0

      const prompt = getAdvisorPrompt(state);
      expect(prompt).not.toBeNull();
      expect(prompt!.conditionId).toBe('no-slots-used');
      expect(prompt!.characterId).toBe('darius');
    });

    it('no-slots-used does not fire when a slot has been spent', () => {
      let state = createNewGame();
      state = { ...state, turn: 7 };
      state = withMeters(state, { communityTrust: 50, ecologicalHealth: 50 });
      state = {
        ...state,
        calendarState: { ...state.calendarState, slotsSpent: 1 },
      };

      const prompt = getAdvisorPrompt(state);
      expect(prompt?.conditionId).not.toBe('no-slots-used');
    });

    it('no-slots-used does not fire at turn <= 6', () => {
      let state = createNewGame();
      state = { ...state, turn: 6 };
      state = withMeters(state, { communityTrust: 50, ecologicalHealth: 50 });

      const prompt = getAdvisorPrompt(state);
      expect(prompt?.conditionId).not.toBe('no-slots-used');
    });
  });

  describe('Edge cases', () => {
    it('returns null when no conditions are met', () => {
      const state = createNewGame();
      // Default state: trust 50, budget 1.5, will 25, eco 20 — eco and narrative might fire
      // Let's set everything to safe values
      let safe = withMeters(state, {
        communityTrust: 60,
        ecologicalHealth: 50,
        foodSovereignty: 30,
        politicalWill: 30,
        budget: 1.5,
      });
      // Spend at least one slot so that condition doesn't fire
      safe = {
        ...safe,
        calendarState: { ...safe.calendarState, slotsSpent: 1 },
      };

      const prompt = getAdvisorPrompt(safe);
      expect(prompt).toBeNull();
    });

    it('initializes with empty advisor state', () => {
      const state = createNewGame();
      expect(state.advisorState).toEqual({
        dismissedConditions: [],
        cooldowns: {},
      });
    });
  });
});
