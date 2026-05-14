import type { CalendarState } from '../state/types';

// Depth factors by relationship level
const DEPTH_FACTORS: Record<string, number> = {
  neutral: 0.5,
  supporter: 0.7,
  trusted: 0.85,
  champion: 1.0,
  partner: 1.5,
};

// Base multipliers: [relationshipType][resourceType] → value (10-10000)
// Higher base = rarer/more valuable yield from that relationship type
export const BASE_MULTIPLIERS: Record<string, Record<string, number>> = {
  community_leader: {
    trust: 1000,
    politicalWill: 100,
    knowledge: 500,
    budget: 10,
  },
  council_member: {
    trust: 100,
    politicalWill: 1000,
    knowledge: 100,
    budget: 50,
  },
  activist: {
    trust: 500,
    politicalWill: 500,
    knowledge: 1000,
    budget: 10,
  },
  funder: {
    trust: 50,
    politicalWill: 100,
    knowledge: 100,
    budget: 10000,
  },
  mentor: {
    trust: 100,
    politicalWill: 100,
    knowledge: 10000,
    budget: 10,
  },
};

/**
 * Calculate resource yield for a meeting with an NPC.
 *
 * yield = log₁₀(baseMultiplier / meetingCount³) × depthFactor × effectivenessModifier
 *
 * This creates steep diminishing returns:
 * - 1st meeting: full value (log₁₀(base/1))
 * - 2nd meeting: log₁₀(base/8) — significantly less
 * - 3rd meeting: log₁₀(base/27) — most value extracted
 * - 5th meeting: near zero for non-premium resources
 */
export function calculateYield(
  baseMultiplier: number,
  meetingCount: number,
  depthLevel: string,
  effectivenessModifier: number = 1.0,
): number {
  if (meetingCount <= 0) return 0;
  if (baseMultiplier <= 0) return 0;

  const depthFactor = DEPTH_FACTORS[depthLevel] ?? 0.5;
  const adjustedBase = baseMultiplier / (meetingCount * meetingCount * meetingCount);

  if (adjustedBase <= 0) return 0;

  const rawYield = Math.log10(adjustedBase) * depthFactor * effectivenessModifier;
  return Math.max(0, rawYield);
}

/**
 * Get the meeting count for an NPC this month from calendar state.
 */
export function getMeetingCount(calendarState: CalendarState, npcId: string): number {
  return calendarState.interactionsThisMonth[npcId] ?? 0;
}

/**
 * Calculate yield for a specific NPC interaction given current state.
 */
export function calculateInteractionYield(
  calendarState: CalendarState,
  npcId: string,
  npcType: string,
  resourceType: string,
  depthLevel: string,
  effectivenessModifier: number = 1.0,
): number {
  const meetingCount = getMeetingCount(calendarState, npcId) + 1; // +1 for this meeting
  const baseMultiplier = BASE_MULTIPLIERS[npcType]?.[resourceType] ?? 100;
  return calculateYield(baseMultiplier, meetingCount, depthLevel, effectivenessModifier);
}

/**
 * Preview yields for a potential meeting (without committing).
 * Returns a map of resource type → expected yield.
 */
export function previewMeetingYields(
  calendarState: CalendarState,
  npcId: string,
  npcType: string,
  depthLevel: string,
  effectivenessModifier: number = 1.0,
): Record<string, number> {
  const multipliers = BASE_MULTIPLIERS[npcType] ?? {};
  const results: Record<string, number> = {};

  for (const [resourceType, baseMultiplier] of Object.entries(multipliers)) {
    const meetingCount = getMeetingCount(calendarState, npcId) + 1;
    const yield_ = calculateYield(baseMultiplier, meetingCount, depthLevel, effectivenessModifier);
    if (yield_ > 0) {
      results[resourceType] = yield_;
    }
  }

  return results;
}
