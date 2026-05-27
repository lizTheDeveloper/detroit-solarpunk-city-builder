import { describe, it, expect, beforeEach } from 'vitest';
import { contentRegistry } from './content-registry';
import type { EventDef } from './content-registry';

describe('ContentRegistry', () => {
  describe('event registration', () => {
    it('returns registered event definitions from the built-in events module', () => {
      // events.ts registers built-in events on import
      import('../systems/events').then(() => {
        const defs = contentRegistry.getEventDefs();
        expect(defs.length).toBeGreaterThan(0);
        const types = defs.map(d => d.type);
        expect(types).toContain('heat_wave');
        expect(types).toContain('federal_grant');
        expect(types).toContain('water_shutoff');
      });
    });

    it('allows registering custom event definitions', () => {
      const initialCount = contentRegistry.getEventDefs().length;
      const customEvent: EventDef = {
        type: 'test_custom_event',
        category: 'community',
        title: 'Test Event',
        description: 'A test event',
        baseProbability: () => 0.5,
        condition: () => true,
        cooldownTurns: 2,
        needsTargetTile: false,
        choices: () => [],
      };

      contentRegistry.registerEvents([customEvent]);
      const defs = contentRegistry.getEventDefs();
      expect(defs.length).toBe(initialCount + 1);
      expect(defs.find(d => d.type === 'test_custom_event')).toBeTruthy();
    });
  });

  describe('antagonist activation rules', () => {
    it('returns registered antagonist rules', () => {
      import('../systems/events').then(() => {
        const rule = contentRegistry.getAntagonistRule('sterling_cross');
        expect(rule).toBeTruthy();
      });
    });

    it('allows registering custom antagonist rules', () => {
      contentRegistry.registerAntagonistRule({
        id: 'test_antagonist',
        shouldActivate: (state) => state.turn > 10,
      });

      const rule = contentRegistry.getAntagonistRule('test_antagonist');
      expect(rule).toBeTruthy();
    });

    it('returns undefined for unregistered antagonists', () => {
      expect(contentRegistry.getAntagonistRule('nonexistent')).toBeUndefined();
    });
  });

  describe('arc template registration', () => {
    it('returns registered arc templates', () => {
      import('../data/arcs').then(() => {
        const templates = contentRegistry.getAllArcTemplates();
        expect(templates.length).toBeGreaterThan(0);

        const map = contentRegistry.getArcTemplateMap();
        expect(Object.keys(map).length).toBeGreaterThan(0);
      });
    });
  });
});
