import type { PublicOpinion } from '../state/types';
import type { TabooConfig } from '../data/arcs/types';

export type TabooStatus = 'locked' | 'available' | 'normalized';

export interface TabooAssessment {
  status: TabooStatus;
  currentOpinion: number;
  threshold: number;
  socialCost: number;
  nearUnlock: boolean;
}

/**
 * Assess whether a taboo solution is available and what it costs.
 *
 * Social cost curve: trustPenalty = baseCost * max(0, 1 - (opinion - threshold) / 35)
 * - Below threshold: locked
 * - At threshold to threshold+35: available with declining cost
 * - Above threshold+35: normalized (zero cost)
 */
export function assessTaboo(
  taboo: TabooConfig,
  publicOpinion: PublicOpinion
): TabooAssessment {
  const currentOpinion = (publicOpinion as unknown as Record<string, number>)[taboo.opinionTopic] ?? 0;
  const threshold = taboo.unlockThreshold;
  const nearUnlock = currentOpinion >= threshold - 10 && currentOpinion < threshold;

  if (currentOpinion < threshold) {
    return { status: 'locked', currentOpinion, threshold, socialCost: taboo.baseSocialCost, nearUnlock };
  }

  const socialCost = taboo.baseSocialCost * Math.max(0, 1 - (currentOpinion - threshold) / 35);

  if (socialCost <= 0) {
    return { status: 'normalized', currentOpinion, threshold, socialCost: 0, nearUnlock: false };
  }

  return { status: 'available', currentOpinion, threshold, socialCost, nearUnlock: false };
}

/**
 * Calculate the trust penalty for choosing a taboo solution.
 * Returns 0 if normalized, the social cost value otherwise.
 */
export function getTabooTrustPenalty(taboo: TabooConfig, publicOpinion: PublicOpinion): number {
  const assessment = assessTaboo(taboo, publicOpinion);
  if (assessment.status === 'locked') return Infinity;
  return assessment.socialCost;
}

/**
 * Check if research papers should be surfaced (within 10 points of threshold).
 */
export function shouldShowResearchHint(taboo: TabooConfig, publicOpinion: PublicOpinion): boolean {
  const currentOpinion = (publicOpinion as unknown as Record<string, number>)[taboo.opinionTopic] ?? 0;
  return currentOpinion >= taboo.unlockThreshold - 10 && currentOpinion < taboo.unlockThreshold;
}
