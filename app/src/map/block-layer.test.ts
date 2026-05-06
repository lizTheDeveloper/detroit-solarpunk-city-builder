import { describe, it, expect } from 'vitest';
import { getBlockFillColor, getBlockPopupContent } from './block-layer';
import type { BlockData } from './block-layer';

describe('getBlockFillColor', () => {
  it('returns green for healthy blocks', () => {
    const color = getBlockFillColor({ epaSites: [], dataGaps: [] } as any);
    expect(color).toBe('rgba(0, 255, 65, 0.1)');
  });

  it('returns red for contaminated blocks', () => {
    const color = getBlockFillColor({
      epaSites: [{ name: 'Test', type: 'brownfield', status: 'active' }],
      dataGaps: [],
    } as any);
    expect(color).toBe('rgba(255, 99, 71, 0.2)');
  });

  it('returns amber for blocks with data gaps', () => {
    const color = getBlockFillColor({
      epaSites: [],
      dataGaps: [{ layer: 'contamination', reason: 'No monitoring' }],
    } as any);
    expect(color).toBe('rgba(251, 191, 36, 0.15)');
  });
});

describe('getBlockPopupContent', () => {
  it('includes data gap warnings', () => {
    const content = getBlockPopupContent({
      blockId: 'block-42',
      neighborhoodId: 'brightmoor',
      epaSites: [],
      transitStops: [],
      communityAssets: [],
      dataGaps: [{
        layer: 'soil_contamination',
        reason: 'City does not publish soil data for this area',
        advocacyTarget: 'Wayne County DEQ',
      }],
    });
    expect(content).toContain('NO DATA');
    expect(content).toContain('Wayne County DEQ');
  });
});
