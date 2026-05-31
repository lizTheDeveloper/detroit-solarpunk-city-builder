import type { EventCategory } from '../state/types';

export const CLIMATE_CONFIG = {
  baseIncreasePerTurn: 0.183,
  yearAccelerationFactor: 0.05,
  maxPressure: 100,
} as const;

export const BUDGET_CONFIG = {
  baseMonthlyRevenue: 0.06,
  trustRevenueCoefficient: 0.00033,
  maxTrustForRevenue: 60,
  ecoRevenueCoefficient: 0.000167,
  revenueFloor: 0.033,
  diminishingReturnsFactor: 0.5,
} as const;

export const EVENT_CONFIG = {
  maxEventsPerTurn: 3,
  maxCrisisPerTurn: 1,
  maxClimatePerTurn: 1,
  climateProbabilityModifier: 0.01,
} as const;

export const CATEGORY_PRIORITY: Record<EventCategory, number> = {
  crisis: 4,
  climate: 3,
  antagonist: 3,
  political: 2,
  community: 1,
};

export const PROJECT_CONFIG = {
  communityLedCostMultiplier: 1.3,
  maintenanceDivisor: 3,
  annualRevenueDivisor: 12,
} as const;

export const CAMPAIGN_CONFIG = {
  electionTurn: 15,
  rally: { willDelta: 3, trustDelta: 1 },
  promise: { willDelta: 2, trustDelta: 0 },
  coalition_building: { willDelta: 1, trustDelta: 2 },
} as const;

export const PROPOSAL_CONFIG = {
  acceptTrustBonus: 5,
  acceptWithContributionTrustBonus: 8,
  modifyTrustBonus: 2,
  deferTrustPenalty: -5,
  rejectTrustPenalty: -15,
  maxConsecutiveDeferrals: 2,
  deferralOverflowTrustPenalty: -15,
} as const;
