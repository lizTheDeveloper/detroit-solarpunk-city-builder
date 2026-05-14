import { describe, it, expect } from 'vitest';
import {
  calculateTotalCrisisSlotTax,
  getCrisisSlotTaxBreakdown,
  estimateArcSlotCost,
  calculatePreventionROI,
} from './crisis-slot-tax';
import type { ActiveArc } from '../state/crisis-types';

describe('Crisis Slot Tax', () => {
  describe('calculateTotalCrisisSlotTax', () => {
    it('returns 0 for no active arcs', () => {
      expect(calculateTotalCrisisSlotTax([])).toBe(0);
    });

    it('returns 0 for dormant arcs', () => {
      const arcs: ActiveArc[] = [{
        arcId: 'energy-grid',
        currentStage: 'dormant',
        stageEnteredTurn: 1,
        inactionTimer: 0,
        lastEventTurn: 0,
        initializedFromSnapshot: false,
      }];
      expect(calculateTotalCrisisSlotTax(arcs)).toBe(0);
    });

    it('sums tax from multiple active arcs', () => {
      const arcs: ActiveArc[] = [
        { arcId: 'energy-grid', currentStage: 'escalation', stageEnteredTurn: 5, inactionTimer: 0, lastEventTurn: 5, initializedFromSnapshot: false },
        { arcId: 'water-pfas', currentStage: 'crisis', stageEnteredTurn: 3, inactionTimer: 0, lastEventTurn: 3, initializedFromSnapshot: false },
      ];
      const tax = calculateTotalCrisisSlotTax(arcs);
      // energy-grid escalation = 2, water-pfas crisis = 5
      expect(tax).toBe(7);
    });
  });

  describe('getCrisisSlotTaxBreakdown', () => {
    it('returns empty for no active arcs', () => {
      expect(getCrisisSlotTaxBreakdown([])).toEqual([]);
    });

    it('includes arc names and stages', () => {
      const arcs: ActiveArc[] = [
        { arcId: 'energy-grid', currentStage: 'crisis', stageEnteredTurn: 5, inactionTimer: 0, lastEventTurn: 5, initializedFromSnapshot: false },
      ];
      const breakdown = getCrisisSlotTaxBreakdown(arcs);
      expect(breakdown.length).toBe(1);
      expect(breakdown[0].slots).toBe(4);
      expect(breakdown[0].arcName).toContain('Grid');
    });
  });

  describe('estimateArcSlotCost', () => {
    it('returns 0 for unknown arc', () => {
      expect(estimateArcSlotCost('nonexistent')).toBe(0);
    });

    it('estimates total cost for energy grid arc', () => {
      const cost = estimateArcSlotCost('energy-grid');
      // foreshadow: 1*3=3, escalation: 2*4=8, crisis: 4*1=4, reckoning: 3*3=9 → total = 24
      expect(cost).toBe(24);
    });
  });

  describe('calculatePreventionROI', () => {
    it('returns 0 for project with no prevention', () => {
      expect(calculatePreventionROI('unknown_project')).toBe(0);
    });

    it('returns positive for rain garden (prevents infrastructure debt)', () => {
      const roi = calculatePreventionROI('rain_garden');
      expect(roi).toBeGreaterThan(0);
    });

    it('returns positive for solar grid (prevents energy grid crisis)', () => {
      const roi = calculatePreventionROI('solar_grid');
      expect(roi).toBeGreaterThan(0);
    });
  });
});
