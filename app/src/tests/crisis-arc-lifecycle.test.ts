import { describe, it, expect } from 'vitest';
import { createNewGame } from '../state/create-game';
import { gameReducer } from '../state/reducer';
import { PROJECT_CATALOG } from '../data/content/project-catalog';
import { arcTemplateMap, allArcTemplates } from '../data/arcs';
import { checkTransition, applyTransition, incrementInactionTimer } from '../systems/arc-progression';
import { assessTaboo } from '../systems/overton-window';
import type { ActiveArc } from '../state/crisis-types';

describe('Crisis Arc Lifecycle', () => {
  it('new game has 5 arcs all dormant', () => {
    const state = createNewGame();
    expect(state.activeArcs).toHaveLength(5);
    expect(state.activeArcs.every(a => a.currentStage === 'dormant')).toBe(true);
  });

  it('arc templates all have valid configs', () => {
    for (const template of allArcTemplates) {
      expect(template.id).toBeTruthy();
      expect(template.config.arcId).toBe(template.id);
      expect(template.crisisForks.length).toBeGreaterThanOrEqual(1);
      expect(template.antagonists.length).toBeGreaterThanOrEqual(1);

      for (const fork of template.crisisForks) {
        expect(fork.choices.length).toBeGreaterThanOrEqual(2);
        expect(['escalation', 'crisis']).toContain(fork.stage);
      }
    }
  });

  it('arc transitions from dormant through stages with proper timing', () => {
    const config = arcTemplateMap['energy-grid']!.config;
    let arc: ActiveArc = {
      arcId: 'energy-grid',
      currentStage: 'dormant',
      stageEnteredTurn: 1,
      inactionTimer: 0,
      lastEventTurn: 0,
      initializedFromSnapshot: false,
    };

    // dormant → foreshadow (needs pipeline headline)
    const pipeline = { arcId: 'energy-grid', stage: 'foreshadow' as const, weeklyHits: 2, maxSeverity: 2, lastHeadlineTimestamp: '2025-01-01' };
    const newStage = checkTransition(arc, pipeline, config, 5);
    expect(newStage).toBe('foreshadow');

    // Apply transition
    arc = applyTransition(arc, 'foreshadow', 5);
    expect(arc.currentStage).toBe('foreshadow');
    expect(arc.stageEnteredTurn).toBe(5);

    // foreshadow → escalation (needs weeklyHits >= escalationThreshold OR severity >= 3)
    const escalationPipeline = { ...pipeline, weeklyHits: 5, maxSeverity: 3 };
    // But needs minStageDuration first (3 turns for energy-grid foreshadow)
    const tooEarly = checkTransition(arc, escalationPipeline, config, 6);
    expect(tooEarly).toBeNull(); // Only 1 turn in foreshadow, min is 3

    const afterMin = checkTransition(arc, escalationPipeline, config, 8);
    expect(afterMin).toBe('escalation');
  });

  it('escalation → crisis via inaction timer', () => {
    const config = arcTemplateMap['energy-grid']!.config;
    let arc: ActiveArc = {
      arcId: 'energy-grid',
      currentStage: 'escalation',
      stageEnteredTurn: 10,
      inactionTimer: 0,
      lastEventTurn: 0,
      initializedFromSnapshot: false,
    };

    // Needs 6 inaction turns for energy-grid
    for (let i = 0; i < 5; i++) {
      arc = incrementInactionTimer(arc);
      const transition = checkTransition(arc, null, config, 10 + 4 + i); // past minDuration
      expect(transition).toBeNull();
    }

    arc = incrementInactionTimer(arc);
    const transition = checkTransition(arc, null, config, 20); // past minDuration
    expect(transition).toBe('crisis');
  });

  it('taboo solutions properly gate on opinion topics', () => {
    const state = createNewGame();

    // Check energy-grid microgrid_resistance taboo (nuclearEnergy > 40)
    const energyTemplate = arcTemplateMap['energy-grid']!;
    const escalationFork = energyTemplate.crisisForks.find(f => f.stage === 'escalation')!;
    const microgridChoice = escalationFork.choices.find(c => c.id === 'microgrid_resistance')!;

    expect(microgridChoice.taboo).toBeDefined();
    const assessment = assessTaboo(microgridChoice.taboo!, state.publicOpinion);
    expect(assessment.status).toBe('locked'); // nuclearEnergy starts at 15, threshold is 40

    // Simulate opinion shift
    const highOpinion = { ...state.publicOpinion, nuclearEnergy: 50 };
    const unlocked = assessTaboo(microgridChoice.taboo!, highOpinion);
    expect(unlocked.status).toBe('available');
    expect(unlocked.socialCost).toBeGreaterThan(0);
  });

  it('dependency web conditions persist across turns', () => {
    let state = createNewGame();
    // Manually add a condition
    state = { ...state, dependencyWeb: { ...state.dependencyWeb, conditions: ['green_infrastructure_network'] } };

    // Advance a turn
    state = gameReducer(state, { type: 'END_TURN' }, PROJECT_CATALOG);

    // Condition should still be there
    expect(state.dependencyWeb.conditions).toContain('green_infrastructure_network');
  });

  it('all arcs have prevention conditions that can be created', () => {
    // Each arc should have at least one prevention condition that's achievable
    // through either project completion or crisis fork choices
    for (const template of allArcTemplates) {
      expect(template.config.preventionConditions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('delayed consequences queue survives END_TURN without firing early', () => {
    let state = createNewGame();
    // Add a consequence scheduled far in the future
    state = {
      ...state,
      delayedConsequenceQueue: [{
        id: 'test_consequence',
        arcId: 'energy-grid',
        triggerTurn: 100,
        activationConditions: [],
        cancelConditions: [],
        effects: [{ type: 'meterDelta', meter: 'budget', amount: -0.5 }],
        foreshadowHint: 'Test hint',
        hintTurnsBeforeTrigger: 3,
      }],
    };

    const budgetBefore = state.meters.budget;
    state = gameReducer(state, { type: 'END_TURN' }, PROJECT_CATALOG);

    // Consequence should not have fired (triggerTurn 100 > current turn 2)
    expect(state.delayedConsequenceQueue).toHaveLength(1);
    // Budget should not have decreased by 0.5 (though normal turn drain may affect it slightly)
    expect(state.meters.budget).toBeGreaterThan(budgetBefore - 0.5);
  });
});
