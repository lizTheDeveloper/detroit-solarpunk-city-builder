import type { ActiveArc } from '../state/crisis-types';
import { arcTemplateMap } from '../data/arcs';

/**
 * Calculate the total slot tax from all active crisis arcs.
 * Each arc's current stage contributes its defined slotTax.
 */
export function calculateTotalCrisisSlotTax(activeArcs: ActiveArc[]): number {
  let total = 0;

  for (const arc of activeArcs) {
    const template = arcTemplateMap[arc.arcId];
    if (!template?.slotTaxByStage) continue;

    const stageTax = template.slotTaxByStage[arc.currentStage] ?? 0;
    total += stageTax;
  }

  return total;
}

/**
 * Get breakdown of slot tax by arc (for UI display).
 */
export function getCrisisSlotTaxBreakdown(activeArcs: ActiveArc[]): Array<{
  arcId: string;
  arcName: string;
  stage: string;
  slots: number;
  reason: string;
}> {
  const breakdown: Array<{ arcId: string; arcName: string; stage: string; slots: number; reason: string }> = [];

  for (const arc of activeArcs) {
    const template = arcTemplateMap[arc.arcId];
    if (!template?.slotTaxByStage) continue;

    const stageTax = template.slotTaxByStage[arc.currentStage] ?? 0;
    if (stageTax > 0) {
      breakdown.push({
        arcId: arc.arcId,
        arcName: template.name,
        stage: arc.currentStage,
        slots: stageTax,
        reason: `${template.name} (${arc.currentStage})`,
      });
    }
  }

  return breakdown;
}

/**
 * Calculate estimated total slot cost of an arc if it goes unchecked.
 * Used for prevention ROI display on project cards.
 */
export function estimateArcSlotCost(arcId: string): number {
  const template = arcTemplateMap[arcId];
  if (!template?.slotTaxByStage) return 0;

  const config = template.config;
  // Estimate: each stage lasts its minimum duration
  const stageEstimates: Record<string, number> = {
    foreshadow: config.minStageDuration?.foreshadow ?? 2,
    escalation: config.minStageDuration?.escalation ?? 3,
    crisis: config.minStageDuration?.crisis ?? 3,
    reckoning: config.minStageDuration?.reckoning ?? 2,
  };

  let totalCost = 0;
  for (const [stage, duration] of Object.entries(stageEstimates)) {
    const tax = template.slotTaxByStage[stage] ?? 0;
    totalCost += tax * duration;
  }

  return totalCost;
}

/**
 * Map project IDs to the arcs they help prevent.
 * Used for "crisis slots prevented" display on proposal cards.
 */
export const PREVENTION_MAP: Record<string, string[]> = {
  rain_garden: ['infrastructure-debt'],
  solar_grid: ['energy-grid'],
  wetland_restoration: ['water-pfas', 'infrastructure-debt'],
  water_filtration: ['water-pfas'],
  food_forest: ['phosphorus-food'],
  community_kitchen: ['phosphorus-food'],
  land_trust: ['housing-speculation'],
  cooperative_housing: ['housing-speculation'],
  native_planting: ['phosphorus-food'],
  greenway: ['infrastructure-debt'],
};

/**
 * Calculate prevention ROI for a project in terms of saved calendar slots.
 */
export function calculatePreventionROI(projectId: string): number {
  const arcsPreventedBy = PREVENTION_MAP[projectId];
  if (!arcsPreventedBy || arcsPreventedBy.length === 0) return 0;

  let totalSaved = 0;
  for (const arcId of arcsPreventedBy) {
    totalSaved += estimateArcSlotCost(arcId);
  }

  return totalSaved;
}
