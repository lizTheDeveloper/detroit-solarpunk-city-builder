// Fetches Detroit street network from Overpass API,
// derives city block polygons using Turf.js polygonize,
// assigns each block to a neighborhood,
// writes output to app/src/map/data/detroit-blocks.geojson
//
// Run: npx tsx app/scripts/generate-blocks.ts

import * as turf from '@turf/turf';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DETROIT_BBOX = '42.25,-83.30,42.45,-83.00';

const OVERPASS_QUERY = `
[out:json][timeout:120];
(
  way["highway"~"^(primary|secondary|tertiary|residential|trunk|motorway)$"](${DETROIT_BBOX});
);
out body;
>;
out skel qt;
`;

async function fetchStreets(): Promise<any> {
  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const url of servers) {
    try {
      console.log(`Trying ${url}...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'DetroitSolarpunkCityBuilder/1.0 (block generation)',
          'Accept': 'application/json',
        },
        body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      });
      if (res.ok) return res.json();
      console.log(`  ${url} returned ${res.status}, trying next...`);
    } catch (err) {
      console.log(`  ${url} failed: ${(err as Error).message}, trying next...`);
    }
  }
  throw new Error('All Overpass API servers failed');
}

function osmToLineStrings(osmData: any): turf.FeatureCollection {
  const nodes = new Map<number, [number, number]>();
  for (const el of osmData.elements) {
    if (el.type === 'node') {
      nodes.set(el.id, [el.lon, el.lat]);
    }
  }

  const features: turf.Feature[] = [];
  for (const el of osmData.elements) {
    if (el.type === 'way' && el.nodes) {
      const coords = el.nodes
        .map((nid: number) => nodes.get(nid))
        .filter(Boolean);
      if (coords.length >= 2) {
        features.push(turf.lineString(coords, { wayId: el.id }));
      }
    }
  }

  return turf.featureCollection(features);
}

function assignNeighborhood(
  blockCentroid: [number, number],
  neighborhoods: turf.FeatureCollection
): string | null {
  const pt = turf.point(blockCentroid);
  for (const hood of neighborhoods.features) {
    if (turf.booleanPointInPolygon(pt, hood as any)) {
      return (hood.properties as any).id;
    }
  }
  return null;
}

async function main() {
  console.log('Fetching Detroit street network from Overpass API...');
  const osmData = await fetchStreets();
  console.log(`Got ${osmData.elements.length} elements`);

  console.log('Converting to LineStrings...');
  const lines = osmToLineStrings(osmData);
  console.log(`${lines.features.length} street segments`);

  console.log('Polygonizing street network into blocks...');
  const polygonized = turf.polygonize(lines);
  console.log(`${polygonized.features.length} raw block polygons`);

  const hoodsPath = join(__dirname, '../src/map/data/detroit-neighborhoods.geojson');
  const neighborhoods = JSON.parse(readFileSync(hoodsPath, 'utf-8'));

  // Filter: keep blocks between 500m² and 500,000m²
  const blocks = polygonized.features
    .map((f, i) => {
      const area = turf.area(f);
      const centroid = turf.centroid(f);
      const neighborhoodId = assignNeighborhood(
        centroid.geometry.coordinates as [number, number],
        neighborhoods
      );
      return {
        ...f,
        properties: {
          blockId: `block-${i}`,
          neighborhoodId: neighborhoodId || 'unassigned',
          terrain: 'urban-sparse',
          area: Math.round(area),
        },
      };
    })
    .filter(f => f.properties.area >= 500 && f.properties.area <= 500000);

  console.log(`${blocks.length} blocks after filtering`);

  const output = {
    type: 'FeatureCollection' as const,
    features: blocks,
  };

  const outPath = join(__dirname, '../src/map/data/detroit-blocks.geojson');
  writeFileSync(outPath, JSON.stringify(output));
  const sizeMB = (JSON.stringify(output).length / 1024 / 1024).toFixed(1);
  console.log(`Wrote ${outPath} (${sizeMB} MB)`);
}

main().catch(console.error);
