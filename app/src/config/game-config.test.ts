import { describe, it, expect } from 'vitest';
import {
  CLIMATE_CONFIG,
  BUDGET_CONFIG,
  EVENT_CONFIG,
  CATEGORY_PRIORITY,
  PROJECT_CONFIG,
  CAMPAIGN_CONFIG,
  PROPOSAL_CONFIG,
} from './game-config';

describe('Game Config', () => {
  it('has valid climate config', () => {
    expect(CLIMATE_CONFIG.baseIncreasePerTurn).toBeGreaterThan(0);
    expect(CLIMATE_CONFIG.maxPressure).toBe(100);
    expect(CLIMATE_CONFIG.yearAccelerationFactor).toBeGreaterThan(0);
  });

  it('has valid budget config', () => {
    expect(BUDGET_CONFIG.baseMonthlyRevenue).toBeGreaterThan(0);
    expect(BUDGET_CONFIG.revenueFloor).toBeGreaterThan(0);
    expect(BUDGET_CONFIG.diminishingReturnsFactor).toBeGreaterThan(0);
    expect(BUDGET_CONFIG.diminishingReturnsFactor).toBeLessThanOrEqual(1);
  });

  it('has valid event config', () => {
    expect(EVENT_CONFIG.maxEventsPerTurn).toBeGreaterThan(0);
    expect(EVENT_CONFIG.maxCrisisPerTurn).toBeGreaterThan(0);
    expect(EVENT_CONFIG.maxClimatePerTurn).toBeGreaterThan(0);
  });

  it('has priorities for all event categories', () => {
    expect(CATEGORY_PRIORITY.crisis).toBeGreaterThan(0);
    expect(CATEGORY_PRIORITY.climate).toBeGreaterThan(0);
    expect(CATEGORY_PRIORITY.antagonist).toBeGreaterThan(0);
    expect(CATEGORY_PRIORITY.political).toBeGreaterThan(0);
    expect(CATEGORY_PRIORITY.community).toBeGreaterThan(0);
  });

  it('has valid project config', () => {
    expect(PROJECT_CONFIG.communityLedCostMultiplier).toBeGreaterThan(1);
    expect(PROJECT_CONFIG.maintenanceDivisor).toBeGreaterThan(0);
  });

  it('has valid campaign config with all action types', () => {
    expect(CAMPAIGN_CONFIG.electionTurn).toBeGreaterThan(0);
    expect(CAMPAIGN_CONFIG.rally).toBeDefined();
    expect(CAMPAIGN_CONFIG.promise).toBeDefined();
    expect(CAMPAIGN_CONFIG.coalition_building).toBeDefined();
  });

  it('has valid proposal config', () => {
    expect(PROPOSAL_CONFIG.acceptTrustBonus).toBeGreaterThan(0);
    expect(PROPOSAL_CONFIG.rejectTrustPenalty).toBeLessThan(0);
    expect(PROPOSAL_CONFIG.deferTrustPenalty).toBeLessThan(0);
    expect(PROPOSAL_CONFIG.maxConsecutiveDeferrals).toBeGreaterThan(0);
  });
});
