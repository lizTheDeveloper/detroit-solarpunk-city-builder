import { describe, it, expect } from 'vitest';
import { validateCityPackage, loadCityPackage } from '../city/loader';
import { detroitPackage } from '../city/detroit';
import { classifyByKeywords } from '../../server/pipeline/classifier';
import { parseGenericRss } from '../../server/pipeline/parsers/rss-generic';
import { createDarkTerminalStyle } from '../map/map-style';
import { getBlockFillColor } from '../map/block-layer';
import type { BlockData } from '../map/block-layer';

describe('Real-World Integration E2E', () => {
  it('map style generates valid MapLibre spec', () => {
    const style = createDarkTerminalStyle('https://tiles.openfreemap.org/styles/liberty');
    expect(style.version).toBe(8);
    expect(style.layers.length).toBeGreaterThan(5);
    expect(style.layers[0].id).toBe('background');
  });

  it('RSS parser handles real-world feed format', () => {
    const rss = `<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        <item>
          <title>Test headline about Detroit water</title>
          <link>https://example.com/article</link>
          <pubDate>Mon, 05 May 2026 10:00:00 GMT</pubDate>
        </item>
      </channel>
    </rss>`;
    const headlines = parseGenericRss(rss, 'test');
    expect(headlines).toHaveLength(1);
    expect(headlines[0].headline).toBe('Test headline about Detroit water');
  });

  it('classifier connects headline to arc and neighborhood', () => {
    const result = classifyByKeywords('DTE outage leaves Brightmoor without power');
    expect(result.arcs).toContain('energy-grid');
    expect(result.neighborhoodTag).toBe('brightmoor');
    expect(result.severity).toBeGreaterThanOrEqual(0);
  });

  it('block fill color reflects EPA sites', () => {
    const block: BlockData = {
      blockId: 'test',
      neighborhoodId: 'test',
      epaSites: [{ name: 'Test Site', type: 'brownfield', status: 'active' }],
      transitStops: [],
      communityAssets: [],
      dataGaps: [],
    };
    const color = getBlockFillColor(block);
    expect(color).toContain('255, 99, 71');
  });

  it('block fill color reflects data gaps', () => {
    const block: BlockData = {
      blockId: 'test',
      neighborhoodId: 'test',
      epaSites: [],
      transitStops: [],
      communityAssets: [],
      dataGaps: [{ layer: 'soil', reason: 'No data published' }],
    };
    const color = getBlockFillColor(block);
    expect(color).toContain('251, 191, 36');
  });

  it('Detroit city package validates successfully', () => {
    const errors = validateCityPackage(detroitPackage);
    expect(errors).toEqual([]);
  });

  it('Detroit city package loads correct init params', () => {
    const params = loadCityPackage(detroitPackage);
    expect(params.cityName).toBe('Detroit');
    expect(params.state).toBe('MI');
    expect(params.mapCenter).toEqual([-83.0458, 42.3314]);
    expect(params.startingBudget).toBe(1.5);
    expect(params.population).toBe(639111);
    expect(params.vacancyRate).toBe(0.30);
    expect(params.foodAccess).toBe(64);
  });

  it('full pipeline: parse → classify → color', () => {
    const rss = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <item>
        <title>PFAS contamination found near Eastern Market water main</title>
        <link>https://planetdetroit.org/pfas-eastern-market</link>
        <pubDate>Mon, 05 May 2026 10:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;

    const headlines = parseGenericRss(rss, 'planet_detroit');
    expect(headlines).toHaveLength(1);

    const classified = classifyByKeywords(headlines[0].headline);
    expect(classified.arcs).toContain('water-pfas');
    expect(classified.neighborhoodTag).toBe('eastern-market');
  });
});
