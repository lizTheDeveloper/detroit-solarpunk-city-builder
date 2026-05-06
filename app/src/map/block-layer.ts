export interface BlockData {
  blockId: string;
  neighborhoodId: string;
  censusData?: {
    population: number;
    medianIncome: number;
    vacancyRate: number;
  };
  epaSites: Array<{
    name: string;
    type: string;
    status: string;
  }>;
  floodZone?: string;
  transitStops: Array<{
    name: string;
    routes: string[];
  }>;
  communityAssets: Array<{
    name: string;
    type: string;
  }>;
  dataGaps: Array<{
    layer: string;
    reason: string;
    advocacyTarget?: string;
  }>;
}

export function getBlockFillColor(block: BlockData): string {
  if (block.epaSites.length > 0) return 'rgba(255, 99, 71, 0.2)';
  if (block.dataGaps.length > 0) return 'rgba(251, 191, 36, 0.15)';
  return 'rgba(0, 255, 65, 0.1)';
}

export function getBlockPopupContent(block: BlockData): string {
  const sections: string[] = [];

  sections.push(`<div class="block-popup__id">${block.blockId.toUpperCase()}</div>`);

  if (block.censusData) {
    sections.push(`<div class="block-popup__section">
      <span class="block-popup__label">POPULATION</span> ${block.censusData.population.toLocaleString()}
      <br/><span class="block-popup__label">MEDIAN INCOME</span> $${block.censusData.medianIncome.toLocaleString()}
      <br/><span class="block-popup__label">VACANCY</span> ${(block.censusData.vacancyRate * 100).toFixed(0)}%
    </div>`);
  }

  if (block.epaSites.length > 0) {
    sections.push(`<div class="block-popup__section block-popup__warning">
      <span class="block-popup__label">EPA SITES</span>
      ${block.epaSites.map(s => `<div>${s.name} (${s.type})</div>`).join('')}
    </div>`);
  }

  if (block.transitStops.length > 0) {
    sections.push(`<div class="block-popup__section">
      <span class="block-popup__label">TRANSIT</span>
      ${block.transitStops.map(s => `<div>${s.name}: ${s.routes.join(', ')}</div>`).join('')}
    </div>`);
  }

  if (block.communityAssets.length > 0) {
    sections.push(`<div class="block-popup__section">
      <span class="block-popup__label">COMMUNITY</span>
      ${block.communityAssets.map(a => `<div>${a.name} (${a.type})</div>`).join('')}
    </div>`);
  }

  for (const gap of block.dataGaps) {
    sections.push(`<div class="block-popup__section block-popup__gap">
      <span class="block-popup__label">⚠ NO DATA: ${gap.layer.toUpperCase()}</span>
      <div>${gap.reason}</div>
      ${gap.advocacyTarget ? `<div class="block-popup__advocacy">DEMAND TRANSPARENCY → ${gap.advocacyTarget}</div>` : ''}
    </div>`);
  }

  return sections.join('');
}
