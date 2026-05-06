export type { ArcTemplate, CrisisFork, CrisisForkChoice, Antagonist, TabooConfig, ArcPaper } from './types';
export { energyGridArc } from './energy-grid';
export { waterPfasArc } from './water-pfas';
export { phosphorusFoodArc } from './phosphorus-food';
export { housingSpeculationArc } from './housing-speculation';
export { infrastructureDebtArc } from './infrastructure-debt';

import type { ArcTemplate } from './types';
import { energyGridArc } from './energy-grid';
import { waterPfasArc } from './water-pfas';
import { phosphorusFoodArc } from './phosphorus-food';
import { housingSpeculationArc } from './housing-speculation';
import { infrastructureDebtArc } from './infrastructure-debt';

export const allArcTemplates: ArcTemplate[] = [
  energyGridArc,
  waterPfasArc,
  phosphorusFoodArc,
  housingSpeculationArc,
  infrastructureDebtArc,
];

export const arcTemplateMap: Record<string, ArcTemplate> = Object.fromEntries(
  allArcTemplates.map((arc) => [arc.id, arc])
);
