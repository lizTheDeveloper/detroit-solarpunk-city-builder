import { describe, it, expect } from 'vitest';
import { assessTaboo, getTabooTrustPenalty, shouldShowResearchHint } from '../systems/overton-window';
import type { PublicOpinion } from '../state/types';
import type { TabooConfig } from '../data/arcs/types';

function makeOpinion(overrides: Partial<PublicOpinion> = {}): PublicOpinion {
  return {
    foodSovereignty: 15,
    waterCommons: 10,
    landReform: 8,
    ecologicalRestoration: 20,
    cooperativeEconomics: 12,
    nutrientRecycling: 5,
    nuclearEnergy: 15,
    landExpropriation: 8,
    decarceration: 6,
    deGrowth: 3,
    ...overrides,
  };
}

const humanureTaboo: TabooConfig = {
  opinionTopic: 'nutrientRecycling',
  unlockThreshold: 50,
  baseSocialCost: 5,
  justificationPapers: ['doi:10.1234/example'],
  tabooLabel: 'Requires public acceptance of nutrient recycling',
};

describe('Overton Window', () => {
  describe('assessTaboo', () => {
    it('returns locked when opinion below threshold', () => {
      const opinion = makeOpinion({ nutrientRecycling: 30 });
      const result = assessTaboo(humanureTaboo, opinion);
      expect(result.status).toBe('locked');
      expect(result.currentOpinion).toBe(30);
      expect(result.threshold).toBe(50);
    });

    it('returns available with full social cost at threshold', () => {
      const opinion = makeOpinion({ nutrientRecycling: 50 });
      const result = assessTaboo(humanureTaboo, opinion);
      expect(result.status).toBe('available');
      expect(result.socialCost).toBe(5);
    });

    it('returns available with reduced cost above threshold', () => {
      const opinion = makeOpinion({ nutrientRecycling: 67.5 });
      const result = assessTaboo(humanureTaboo, opinion);
      expect(result.status).toBe('available');
      expect(result.socialCost).toBe(2.5);
    });

    it('returns normalized when opinion far above threshold', () => {
      const opinion = makeOpinion({ nutrientRecycling: 85 });
      const result = assessTaboo(humanureTaboo, opinion);
      expect(result.status).toBe('normalized');
      expect(result.socialCost).toBe(0);
    });

    it('marks nearUnlock when within 10 points below threshold', () => {
      const opinion = makeOpinion({ nutrientRecycling: 42 });
      const result = assessTaboo(humanureTaboo, opinion);
      expect(result.status).toBe('locked');
      expect(result.nearUnlock).toBe(true);
    });

    it('nearUnlock is false when far from threshold', () => {
      const opinion = makeOpinion({ nutrientRecycling: 20 });
      const result = assessTaboo(humanureTaboo, opinion);
      expect(result.nearUnlock).toBe(false);
    });

    it('handles deGrowth taboo with high threshold', () => {
      const deGrowthTaboo: TabooConfig = {
        opinionTopic: 'deGrowth',
        unlockThreshold: 60,
        baseSocialCost: 7,
        justificationPapers: [],
        tabooLabel: 'Requires acceptance of planned contraction',
      };
      const opinion = makeOpinion({ deGrowth: 60 });
      const result = assessTaboo(deGrowthTaboo, opinion);
      expect(result.status).toBe('available');
      expect(result.socialCost).toBe(7);
    });
  });

  describe('getTabooTrustPenalty', () => {
    it('returns Infinity when locked', () => {
      const opinion = makeOpinion({ nutrientRecycling: 10 });
      expect(getTabooTrustPenalty(humanureTaboo, opinion)).toBe(Infinity);
    });

    it('returns social cost when available', () => {
      const opinion = makeOpinion({ nutrientRecycling: 50 });
      expect(getTabooTrustPenalty(humanureTaboo, opinion)).toBe(5);
    });

    it('returns 0 when normalized', () => {
      const opinion = makeOpinion({ nutrientRecycling: 90 });
      expect(getTabooTrustPenalty(humanureTaboo, opinion)).toBe(0);
    });
  });

  describe('shouldShowResearchHint', () => {
    it('returns true when within 10 points below threshold', () => {
      const opinion = makeOpinion({ nutrientRecycling: 43 });
      expect(shouldShowResearchHint(humanureTaboo, opinion)).toBe(true);
    });

    it('returns false when far below threshold', () => {
      const opinion = makeOpinion({ nutrientRecycling: 30 });
      expect(shouldShowResearchHint(humanureTaboo, opinion)).toBe(false);
    });

    it('returns false when at or above threshold', () => {
      const opinion = makeOpinion({ nutrientRecycling: 50 });
      expect(shouldShowResearchHint(humanureTaboo, opinion)).toBe(false);
    });

    it('returns true at exactly threshold - 10', () => {
      const opinion = makeOpinion({ nutrientRecycling: 40 });
      expect(shouldShowResearchHint(humanureTaboo, opinion)).toBe(true);
    });
  });
});
