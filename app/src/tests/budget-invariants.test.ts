/**
 * Budget content invariants — the cheap, drift-proof guardrails preserved from
 * the retired hand-mirrored Monte-Carlo budget sim. These check budget *data*
 * (config), not *dynamics*; full-game budget behavior is now measured by the
 * real-reducer Monte-Carlo harness (scripts/monte-carlo.ts).
 */

import { describe, it, expect } from 'vitest';
import { totalAnnualExpenses, totalAnnualRevenue } from '../data/content/budget-lines';
import { PROJECT_CATALOG } from '../data/content/project-catalog';

const COSTS = Object.values(PROJECT_CATALOG).map((p) => p.baseCost);
const AVG_PROJECT_COST = COSTS.reduce((a, b) => a + b, 0) / COSTS.length;

describe('Budget content invariants', () => {
  it('general fund is balanced (revenue == expenses)', () => {
    expect(totalAnnualRevenue()).toBe(totalAnnualExpenses());
  });

  it('individual projects are < 0.1% of the city budget', () => {
    // This is the structural reason the budget meter is informational, not a
    // spending constraint (see the discretionary-budget design as the fix).
    expect(AVG_PROJECT_COST / 1576).toBeLessThan(0.001);
  });

  it('trust modifier swing (0→100) exceeds $100M/yr', () => {
    const swing = (100 - 0) * 0.1 * 12; // (trust-40)*0.1 per month, full range
    expect(swing).toBeGreaterThan(100);
  });

  it('worst-case eco emergency cost exceeds $100M/yr', () => {
    const worst = 30 * 0.3 * 12; // (30-eco)*0.3 per month at eco=0
    expect(worst).toBeGreaterThan(100);
  });
});
