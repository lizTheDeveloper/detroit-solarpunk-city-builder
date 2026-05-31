import type { CalendarState } from '../state/types';

export type RelationshipQuality =
  | 'partner'
  | 'champion'
  | 'trusted'
  | 'supporter'
  | 'advocate'
  | 'neutral'
  | 'opposition';

export type NpcType = 'community_leader' | 'council_member' | 'activist' | 'funder' | 'mentor' | 'strategic_contact';

export type YieldType = 'trust' | 'politicalWill' | 'knowledge' | 'overton' | 'budget';

const QUALITY_MULTIPLIER: Record<RelationshipQuality, number> = {
  partner: 1.5,
  champion: 1.0,
  trusted: 0.9,
  supporter: 0.75,
  advocate: 0.7,
  neutral: 0.5,
  opposition: 0.0,
};

/**
 * Base yield values per NPC type × resource. Indexed first by NPC type, then by yield resource.
 * Used by callers that want to compute custom-depth yields without going through {@link calculateInteractionYield}.
 */
export const BASE_MULTIPLIERS: Record<NpcType, Record<YieldType, number>> = {
  community_leader: { trust: 1000, politicalWill: 100, knowledge: 500, overton: 0, budget: 0 },
  council_member: { trust: 200, politicalWill: 800, knowledge: 100, overton: 0, budget: 50 },
  activist: { trust: 500, politicalWill: 600, knowledge: 200, overton: 300, budget: 0 },
  funder: { trust: 100, politicalWill: 200, knowledge: 50, overton: 0, budget: 10000 },
  mentor: { trust: 0, politicalWill: 0, knowledge: 10000, overton: 10000, budget: 0 },
  strategic_contact: { trust: 300, politicalWill: 500, knowledge: 800, overton: 0, budget: 100 },
};

/**
 * Cubic-decay yield: log10(base / count^3) * qualityMultiplier * effectiveness.
 * Clamped to 0 (never negative). First meeting (count=1) → log10(base).
 */
export function calculateYield(
  base: number,
  meetingCount: number,
  quality: RelationshipQuality,
  effectiveness: number = 1.0,
): number {
  if (base <= 0 || meetingCount <= 0) return 0;
  const ratio = base / Math.pow(meetingCount, 3);
  if (ratio < 1) return 0;
  const raw = Math.log10(ratio);
  const result = raw * (QUALITY_MULTIPLIER[quality] ?? 0) * effectiveness;
  return Math.max(0, result);
}

/** Count of prior meetings with this NPC this month. */
export function getMeetingCount(state: CalendarState, npcId: string): number {
  return state.interactionsThisMonth[npcId] ?? 0;
}

/** Yield for the *next* meeting with this NPC (count + 1). */
export function calculateInteractionYield(
  state: CalendarState,
  npcId: string,
  npcType: NpcType,
  yieldType: YieldType,
  quality: RelationshipQuality,
  effectiveness: number = 1.0,
): number {
  const count = getMeetingCount(state, npcId) + 1;
  const base = BASE_MULTIPLIERS[npcType]?.[yieldType] ?? 0;
  return calculateYield(base, count, quality, effectiveness);
}

/** Preview all yield types for the next meeting with this NPC. */
export function previewMeetingYields(
  state: CalendarState,
  npcId: string,
  npcType: NpcType,
  quality: RelationshipQuality,
  effectiveness: number = 1.0,
): Record<YieldType, number> {
  return {
    trust: calculateInteractionYield(state, npcId, npcType, 'trust', quality, effectiveness),
    politicalWill: calculateInteractionYield(state, npcId, npcType, 'politicalWill', quality, effectiveness),
    knowledge: calculateInteractionYield(state, npcId, npcType, 'knowledge', quality, effectiveness),
    overton: calculateInteractionYield(state, npcId, npcType, 'overton', quality, effectiveness),
    budget: calculateInteractionYield(state, npcId, npcType, 'budget', quality, effectiveness),
  };
}
