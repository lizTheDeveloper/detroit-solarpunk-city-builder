# Real-World City Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abstract tile system with a real OpenStreetMap-based game board, ingest public data, auto-discover local news, and generate playable city configs via LLM agent swarm.

**Architecture:** Parallel tracks — map renderer + city ingestion pipeline — converging when the renderer consumes city packages. Four phases: (1) map companion alongside existing UI, (2) block-level data, (3) full spatial mechanics, (4) multi-city + community.

**Tech Stack:** MapLibre GL JS, react-map-gl/maplibre, Protomaps PMTiles (self-hosted on Hetzner), Turf.js, Census/EPA/FEMA/GTFS/AirNow APIs, Overpass API.

**Spec:** `docs/superpowers/specs/2026-05-06-real-world-integration-design.md`

---

## File Structure

### New Files
```
app/src/map/                              # Map rendering system
  MapPanel.tsx                            # Main map component with MapLibre
  MapPanel.test.tsx                       # Map panel tests
  map-style.ts                            # Dark terminal style JSON builder
  map-style.test.ts                       # Style generation tests
  block-layer.ts                          # Block polygon rendering + interaction
  block-layer.test.ts                     # Block layer tests
  data-layers.ts                          # Data overlay rendering (EPA, census, etc.)
  types.ts                                # Map-specific types (BlockPolygon, MapViewState, etc.)

app/src/map/data/                         # Pre-processed geographic data
  detroit-blocks.geojson                  # Block polygons derived from OSM streets
  detroit-neighborhoods.geojson           # Neighborhood boundary polygons

app/src/city/                             # City config system
  types.ts                                # CityPackage schema types
  loader.ts                               # Load + validate city packages
  loader.test.ts                          # Loader tests
  detroit.ts                              # Detroit city config (first instance)

app/src/data-layers/                      # Public data integration
  types.ts                                # DataLayer types + gap types
  census.ts                               # Census ACS API client
  census.test.ts                          # Census tests
  epa.ts                                  # EPA Envirofacts/ECHO client
  epa.test.ts                             # EPA tests
  fema.ts                                 # FEMA flood zone client
  fema.test.ts                            # FEMA tests
  gtfs.ts                                 # GTFS transit data client
  gtfs.test.ts                            # GTFS tests
  osm-assets.ts                           # OSM Overpass community asset queries
  osm-assets.test.ts                      # OSM asset tests
  cache.ts                                # IndexedDB caching layer with TTLs
  cache.test.ts                           # Cache tests

app/server/pipeline/parsers/              # News feed parsers
  rss-generic.ts                          # Generic RSS/Atom parser
  rss-generic.test.ts                     # Parser tests
  google-news-geo.ts                      # Google News geo RSS parser
  google-news-geo.test.ts                 # Parser tests

app/server/pipeline/classifier.ts         # LLM headline classification
app/server/pipeline/classifier.test.ts    # Classifier tests

scripts/                                  # Build-time data processing
  generate-blocks.ts                      # Overpass → Turf.js → GeoJSON blocks
  download-pmtiles.ts                     # Download Detroit PMTiles extract
  deploy-tiles.sh                         # Deploy PMTiles to Hetzner
```

### Modified Files
```
app/package.json                          # Add maplibre-gl, react-map-gl, @turf/*, pmtiles
app/vite.config.ts                        # Add PMTiles proxy for dev, CORS headers
app/src/App.tsx                           # Add MapPanel to layout
app/src/index.css                         # Map panel styles, block interaction styles
app/src/state/types.ts                    # Add blockId fields to Tile, MapViewState to GameState
app/src/state/create-game.ts              # Add map coordinates + block IDs to Detroit neighborhoods
app/src/state/reducer.ts                  # Add MAP_SELECT_BLOCK, MAP_SET_VIEW actions
app/src/ui/panels/HeadlinesPanel.tsx      # Add "suggest a source" button
app/server/pipeline/config/feeds.json     # Add Detroit local news sources
app/server/pipeline/fetcher.ts            # Add rss-generic and google-news-geo parsers
app/server/pipeline/types.ts              # Add neighborhoodTag, pedagogicalHook to ProcessedHeadline
```

---

## Phase 1: Map as Companion

### Task 1: Install Dependencies

**Files:**
- Modify: `app/package.json`

- [ ] **Step 1: Install MapLibre + react-map-gl + PMTiles + Turf.js**

```bash
cd app && npm install maplibre-gl react-map-gl pmtiles @turf/turf
```

- [ ] **Step 2: Verify build succeeds**

Run: `cd app && npx tsc --noEmit`
Expected: No new type errors

- [ ] **Step 3: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "feat: add maplibre-gl, react-map-gl, pmtiles, turf.js dependencies"
```

---

### Task 2: Map Types

**Files:**
- Create: `app/src/map/types.ts`
- Test: N/A (pure types)

- [ ] **Step 1: Create map type definitions**

```typescript
// app/src/map/types.ts
import type { Feature, Polygon, FeatureCollection, Point } from 'geojson';

export interface BlockProperties {
  blockId: string;
  neighborhoodId: string;
  terrain: string;
  area: number; // square meters
}

export type BlockFeature = Feature<Polygon, BlockProperties>;
export type BlockCollection = FeatureCollection<Polygon, BlockProperties>;

export interface NeighborhoodProperties {
  id: string;
  name: string;
}

export type NeighborhoodFeature = Feature<Polygon, NeighborhoodProperties>;
export type NeighborhoodCollection = FeatureCollection<Polygon, NeighborhoodProperties>;

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface MapSelection {
  type: 'neighborhood' | 'block';
  id: string;
}

export const DETROIT_CENTER: MapViewState = {
  longitude: -83.0458,
  latitude: 42.3314,
  zoom: 11.5,
};

export const DETROIT_BOUNDS: [[number, number], [number, number]] = [
  [-83.29, 42.25], // SW
  [-82.91, 42.45], // NE
];
```

- [ ] **Step 2: Commit**

```bash
git add app/src/map/types.ts
git commit -m "feat: add map type definitions for blocks and neighborhoods"
```

---

### Task 3: Dark Terminal Map Style

**Files:**
- Create: `app/src/map/map-style.ts`
- Test: `app/src/map/map-style.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// app/src/map/map-style.test.ts
import { describe, it, expect } from 'vitest';
import { createDarkTerminalStyle } from './map-style';

describe('createDarkTerminalStyle', () => {
  it('returns a valid MapLibre style object', () => {
    const style = createDarkTerminalStyle('https://tiles.example.com');
    expect(style.version).toBe(8);
    expect(style.name).toBe('detroit-terminal');
    expect(style.sources).toBeDefined();
    expect(style.layers.length).toBeGreaterThan(0);
  });

  it('uses near-black background', () => {
    const style = createDarkTerminalStyle('https://tiles.example.com');
    const bg = style.layers.find((l: any) => l.id === 'background');
    expect(bg).toBeDefined();
    expect(bg!.paint['background-color']).toBe('#0a0a0a');
  });

  it('uses green glowing streets', () => {
    const style = createDarkTerminalStyle('https://tiles.example.com');
    const roads = style.layers.find((l: any) => l.id === 'roads');
    expect(roads).toBeDefined();
    expect(roads!.paint['line-color']).toBe('#00ff41');
    expect(roads!.paint['line-blur']).toBeGreaterThan(0);
  });

  it('uses the provided tile source URL', () => {
    const style = createDarkTerminalStyle('https://my-tiles.example.com');
    const source = style.sources['openmaptiles'] as any;
    expect(source.url).toBe('https://my-tiles.example.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/map/map-style.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the dark terminal style**

```typescript
// app/src/map/map-style.ts
import type { StyleSpecification } from 'maplibre-gl';

export function createDarkTerminalStyle(tileSourceUrl: string): StyleSpecification {
  return {
    version: 8,
    name: 'detroit-terminal',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: tileSourceUrl,
      },
    },
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#0a0a0a' },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: {
          'fill-color': '#0d1117',
          'fill-opacity': 0.9,
        },
      },
      {
        id: 'landuse-park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: ['==', 'class', 'park'],
        paint: {
          'fill-color': '#0a1a0a',
          'fill-opacity': 0.6,
        },
      },
      {
        id: 'landuse-industrial',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: ['==', 'class', 'industrial'],
        paint: {
          'fill-color': '#1a0a0a',
          'fill-opacity': 0.4,
        },
      },
      {
        id: 'buildings',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        paint: {
          'fill-color': '#111811',
          'fill-outline-color': '#1a3a1a',
          'fill-opacity': 0.7,
        },
      },
      {
        id: 'roads-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'minor', 'service', 'street'],
        paint: {
          'line-color': '#00ff41',
          'line-width': 0.5,
          'line-blur': 1,
          'line-opacity': 0.3,
        },
      },
      {
        id: 'roads',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk', 'motorway'],
        paint: {
          'line-color': '#00ff41',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            8, 0.5,
            12, 1.5,
            16, 3,
          ],
          'line-blur': 1.5,
          'line-opacity': 0.7,
        },
      },
      {
        id: 'road-labels',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        layout: {
          'text-field': ['upcase', ['get', 'name']],
          'text-font': ['Open Sans Regular'],
          'text-size': 10,
          'symbol-placement': 'line',
          'text-max-angle': 30,
        },
        paint: {
          'text-color': '#00cc33',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
          'text-opacity': 0.7,
        },
      },
      {
        id: 'place-labels',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        layout: {
          'text-field': ['upcase', ['get', 'name']],
          'text-font': ['Open Sans Regular'],
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            10, 12,
            14, 16,
          ],
        },
        paint: {
          'text-color': '#2ea043',
          'text-halo-color': '#0a0a0a',
          'text-halo-width': 2,
        },
      },
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/map/map-style.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/map/map-style.ts app/src/map/map-style.test.ts
git commit -m "feat: dark terminal map style for MapLibre GL"
```

---

### Task 4: Generate Detroit Block Polygons

**Files:**
- Create: `app/scripts/generate-blocks.ts`
- Create: `app/src/map/data/detroit-blocks.geojson` (generated output)
- Create: `app/src/map/data/detroit-neighborhoods.geojson` (hand-authored GeoJSON)

- [ ] **Step 1: Create neighborhood boundaries GeoJSON**

```typescript
// app/src/map/data/detroit-neighborhoods.geojson
// Approximate polygons for the 7 game neighborhoods
// These are simplified bounding polygons — good enough for Phase 1
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "id": "brightmoor", "name": "Brightmoor" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-83.2700, 42.3800], [-83.2450, 42.3800],
          [-83.2450, 42.3950], [-83.2700, 42.3950],
          [-83.2700, 42.3800]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "id": "corktown", "name": "Corktown" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-83.0750, 42.3250], [-83.0550, 42.3250],
          [-83.0550, 42.3400], [-83.0750, 42.3400],
          [-83.0750, 42.3250]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "id": "eastern-market", "name": "Eastern Market" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-83.0500, 42.3450], [-83.0350, 42.3450],
          [-83.0350, 42.3550], [-83.0500, 42.3550],
          [-83.0500, 42.3450]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "id": "southwest-detroit", "name": "Southwest Detroit" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-83.1200, 42.2950], [-83.0750, 42.2950],
          [-83.0750, 42.3250], [-83.1200, 42.3250],
          [-83.1200, 42.2950]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "id": "indian-village", "name": "Indian Village" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-83.0150, 42.3500], [-82.9950, 42.3500],
          [-82.9950, 42.3650], [-83.0150, 42.3650],
          [-83.0150, 42.3500]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "id": "hamtramck", "name": "Hamtramck" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-83.0700, 42.3850], [-83.0400, 42.3850],
          [-83.0400, 42.4050], [-83.0700, 42.4050],
          [-83.0700, 42.3850]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "id": "north-end", "name": "North End" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-83.0850, 42.3650], [-83.0550, 42.3650],
          [-83.0550, 42.3850], [-83.0850, 42.3850],
          [-83.0850, 42.3650]
        ]]
      }
    }
  ]
}
```

- [ ] **Step 2: Create the block generation script**

```typescript
// app/scripts/generate-blocks.ts
//
// Fetches Detroit street network from Overpass API,
// derives city block polygons using Turf.js polygonize,
// assigns each block to a neighborhood,
// writes output to app/src/map/data/detroit-blocks.geojson
//
// Run: npx tsx app/scripts/generate-blocks.ts

import * as turf from '@turf/turf';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

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
  const url = 'https://overpass-api.de/api/interpreter';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
  });
  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  return res.json();
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

  // Load neighborhood boundaries
  const hoodsPath = join(__dirname, '../src/map/data/detroit-neighborhoods.geojson');
  const neighborhoods = JSON.parse(readFileSync(hoodsPath, 'utf-8'));

  // Filter: keep blocks between 500m² and 500,000m² (skip tiny slivers and huge areas)
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
  console.log(`Wrote ${outPath} (${(JSON.stringify(output).length / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch(console.error);
```

- [ ] **Step 3: Run the block generation script**

Run: `cd app && npx tsx scripts/generate-blocks.ts`
Expected: Creates `src/map/data/detroit-blocks.geojson` with block polygons. This may take 1-2 minutes for the Overpass API call.

- [ ] **Step 4: Verify output**

```bash
cd app && node -e "const d = require('./src/map/data/detroit-blocks.geojson'); console.log('Blocks:', d.features.length); console.log('Size:', (JSON.stringify(d).length/1024/1024).toFixed(1), 'MB')"
```

Expected: Several hundred to a few thousand blocks, 1-5 MB file size.

- [ ] **Step 5: Commit**

```bash
git add app/scripts/generate-blocks.ts app/src/map/data/detroit-neighborhoods.geojson app/src/map/data/detroit-blocks.geojson
git commit -m "feat: generate Detroit block polygons from OSM street network"
```

---

### Task 5: Download + Self-Host PMTiles on Hetzner

**Files:**
- Create: `app/scripts/download-pmtiles.ts`
- Create: `app/scripts/deploy-tiles.sh`

- [ ] **Step 1: Create PMTiles download script**

```typescript
// app/scripts/download-pmtiles.ts
//
// Downloads a PMTiles extract for Detroit metro area from Protomaps
// Run: npx tsx app/scripts/download-pmtiles.ts

import { writeFileSync } from 'fs';
import { join } from 'path';

// Protomaps provides free planet PMTiles. We extract Detroit's region.
// The full planet file is large, so we use their extract service or download a regional extract.
const PMTILES_URL = 'https://build.protomaps.com/20240801.pmtiles';

async function main() {
  // For self-hosting, we need a Detroit-area extract.
  // Option 1: Use protomaps CLI to extract from planet file
  // Option 2: Use go-pmtiles to extract a bounding box
  //
  // For now, document the process:
  console.log('PMTiles self-hosting setup:');
  console.log('');
  console.log('1. Install pmtiles CLI: npm install -g pmtiles');
  console.log('2. Download planet extract (or use Protomaps build service):');
  console.log('   pmtiles extract https://build.protomaps.com/20240801.pmtiles detroit.pmtiles --bbox="-83.30,42.25,-82.91,42.45"');
  console.log('3. Upload to Hetzner Object Storage:');
  console.log('   - Create a Hetzner Object Storage bucket');
  console.log('   - Enable CORS for your game domain');
  console.log('   - Upload detroit.pmtiles to the bucket');
  console.log('4. Configure CDN (optional): Hetzner + Cloudflare for caching');
  console.log('');
  console.log('For dev, use OpenFreeMap tiles (no setup needed).');
}

main();
```

- [ ] **Step 2: Create Hetzner deployment script**

```bash
#!/usr/bin/env bash
# app/scripts/deploy-tiles.sh
#
# Extracts Detroit PMTiles and uploads to Hetzner Object Storage.
# Prerequisites:
#   - pmtiles CLI: npm install -g pmtiles
#   - s3cmd or rclone configured for Hetzner Object Storage
#   - HETZNER_BUCKET env var set
#
# Usage: ./scripts/deploy-tiles.sh

set -euo pipefail

BBOX="-83.30,42.25,-82.91,42.45"
PLANET_URL="https://build.protomaps.com/20240801.pmtiles"
OUTPUT="detroit.pmtiles"
BUCKET="${HETZNER_BUCKET:-city-builder-tiles}"

echo "==> Extracting Detroit region from Protomaps planet..."
pmtiles extract "$PLANET_URL" "$OUTPUT" --bbox="$BBOX"

echo "==> PMTiles file size:"
ls -lh "$OUTPUT"

echo "==> Uploading to Hetzner Object Storage (bucket: $BUCKET)..."
# Using rclone (configure 'hetzner' remote first):
# rclone copy "$OUTPUT" "hetzner:$BUCKET/" --progress
#
# Or using s3cmd:
# s3cmd put "$OUTPUT" "s3://$BUCKET/$OUTPUT" \
#   --host=fsn1.your-objectstorage.com \
#   --host-bucket="%(bucket)s.fsn1.your-objectstorage.com"

echo "==> Setting CORS policy..."
# CORS JSON for the bucket (apply via Hetzner console or API):
cat <<'CORS'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["Range", "If-Match", "If-None-Match"],
      "ExposeHeaders": ["Content-Length", "Content-Range", "ETag"],
      "MaxAgeSeconds": 86400
    }
  ]
}
CORS

echo "==> Done! Tile URL: https://$BUCKET.fsn1.your-objectstorage.com/$OUTPUT"
echo "    Use pmtiles:// protocol in MapLibre: pmtiles://https://$BUCKET.fsn1.your-objectstorage.com/$OUTPUT"
```

- [ ] **Step 3: Make deploy script executable**

```bash
chmod +x app/scripts/deploy-tiles.sh
```

- [ ] **Step 4: Commit**

```bash
git add app/scripts/download-pmtiles.ts app/scripts/deploy-tiles.sh
git commit -m "feat: add PMTiles download and Hetzner deployment scripts"
```

---

### Task 6: MapPanel Component

**Files:**
- Create: `app/src/map/MapPanel.tsx`
- Test: `app/src/map/MapPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// app/src/map/MapPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapPanel from './MapPanel';

// Mock maplibre-gl since it needs WebGL
vi.mock('maplibre-gl', () => ({
  Map: vi.fn(() => ({
    on: vi.fn(),
    remove: vi.fn(),
    addControl: vi.fn(),
    getCanvas: vi.fn(() => ({ style: {} })),
  })),
  NavigationControl: vi.fn(),
}));

vi.mock('react-map-gl/maplibre', () => {
  const MockMap = ({ children, ...props }: any) => (
    <div data-testid="map-container" data-zoom={props.initialViewState?.zoom}>
      {children}
    </div>
  );
  return {
    __esModule: true,
    default: MockMap,
    Source: ({ children, ...props }: any) => <div data-testid={`source-${props.id}`}>{children}</div>,
    Layer: (props: any) => <div data-testid={`layer-${props.id}`} />,
    NavigationControl: () => <div data-testid="nav-control" />,
  };
});

describe('MapPanel', () => {
  it('renders a map container', () => {
    render(<MapPanel onSelectTile={() => {}} selectedTileId={null} />);
    expect(screen.getByTestId('map-container')).toBeDefined();
  });

  it('renders neighborhood boundaries layer', () => {
    render(<MapPanel onSelectTile={() => {}} selectedTileId={null} />);
    expect(screen.getByTestId('source-neighborhoods')).toBeDefined();
    expect(screen.getByTestId('layer-neighborhood-borders')).toBeDefined();
  });

  it('renders block polygons layer', () => {
    render(<MapPanel onSelectTile={() => {}} selectedTileId={null} />);
    expect(screen.getByTestId('source-blocks')).toBeDefined();
    expect(screen.getByTestId('layer-block-fills')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/map/MapPanel.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MapPanel**

```tsx
// app/src/map/MapPanel.tsx
import { useCallback, useMemo, useState } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createDarkTerminalStyle } from './map-style';
import { DETROIT_CENTER, DETROIT_BOUNDS } from './types';
import type { MapViewState } from './types';
import neighborhoodsData from './data/detroit-neighborhoods.geojson';

// Use OpenFreeMap for dev, self-hosted PMTiles for prod
const TILE_SOURCE = import.meta.env.VITE_TILE_SOURCE
  || 'https://tiles.openfreemap.org/styles/liberty';

interface MapPanelProps {
  onSelectTile: (tileId: string) => void;
  selectedTileId: string | null;
  tileHealthMap?: Record<string, number>; // tileId → 0-100 health for coloring
}

export default function MapPanel({ onSelectTile, selectedTileId, tileHealthMap = {} }: MapPanelProps) {
  const [viewState, setViewState] = useState<MapViewState>(DETROIT_CENTER);

  const mapStyle = useMemo(() => createDarkTerminalStyle(TILE_SOURCE), []);

  const handleNeighborhoodClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.properties?.id) {
      onSelectTile(feature.properties.id);
    }
  }, [onSelectTile]);

  const neighborhoodFillPaint = useMemo(() => {
    // Color neighborhoods by health: green (healthy) → red (unhealthy)
    const stops: [string, string][] = Object.entries(tileHealthMap).map(([id, health]) => {
      const r = Math.round(255 * (1 - health / 100));
      const g = Math.round(255 * (health / 100));
      return [id, `rgba(${r}, ${g}, 50, 0.15)`];
    });

    if (stops.length === 0) {
      return { 'fill-color': 'rgba(0, 255, 65, 0.05)', 'fill-opacity': 0.5 };
    }

    return {
      'fill-color': [
        'match', ['get', 'id'],
        ...stops.flat(),
        'rgba(0, 255, 65, 0.05)',
      ],
      'fill-opacity': 0.5,
    };
  }, [tileHealthMap]);

  const selectedFilter = useMemo(
    () => selectedTileId ? ['==', ['get', 'id'], selectedTileId] : ['==', 1, 0],
    [selectedTileId]
  );

  let blocksData: any = null;
  try {
    // Dynamic import at build time — if the file doesn't exist yet, skip
    blocksData = (await import('./data/detroit-blocks.geojson')).default;
  } catch {
    // Blocks not generated yet — that's fine for Phase 1
  }

  return (
    <div className="map-panel">
      <div className="map-panel__header">
        <span className="map-panel__title">CITY MAP</span>
        <span className="map-panel__coords">
          {viewState.latitude.toFixed(4)}, {viewState.longitude.toFixed(4)}
        </span>
      </div>
      <Map
        initialViewState={DETROIT_CENTER}
        onMove={e => setViewState(e.viewState)}
        mapStyle={mapStyle}
        maxBounds={DETROIT_BOUNDS}
        interactiveLayerIds={['neighborhood-fills']}
        onClick={handleNeighborhoodClick}
        style={{ width: '100%', height: '100%' }}
        cursor="pointer"
      >
        <NavigationControl position="top-right" />

        <Source id="neighborhoods" type="geojson" data={neighborhoodsData as any}>
          <Layer
            id="neighborhood-fills"
            type="fill"
            paint={neighborhoodFillPaint as any}
          />
          <Layer
            id="neighborhood-borders"
            type="line"
            paint={{
              'line-color': '#00ff41',
              'line-width': 1.5,
              'line-opacity': 0.6,
            }}
          />
          <Layer
            id="neighborhood-selected"
            type="line"
            filter={selectedFilter as any}
            paint={{
              'line-color': '#f0c040',
              'line-width': 3,
              'line-opacity': 1,
            }}
          />
          <Layer
            id="neighborhood-labels"
            type="symbol"
            layout={{
              'text-field': ['upcase', ['get', 'name']],
              'text-size': 12,
            }}
            paint={{
              'text-color': '#2ea043',
              'text-halo-color': '#0a0a0a',
              'text-halo-width': 2,
            }}
          />
        </Source>

        {blocksData && (
          <Source id="blocks" type="geojson" data={blocksData}>
            <Layer
              id="block-fills"
              type="fill"
              paint={{
                'fill-color': 'rgba(0, 255, 65, 0.03)',
                'fill-opacity': 0.5,
              }}
              minzoom={14}
            />
            <Layer
              id="block-outlines"
              type="line"
              paint={{
                'line-color': '#00ff41',
                'line-width': 0.3,
                'line-opacity': 0.3,
              }}
              minzoom={14}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
```

Note: The dynamic import of detroit-blocks.geojson won't work with top-level await in a component. We need to restructure to use a static import or lazy loading. The implementing agent should use a static import if the file exists, or conditionally render the blocks layer.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/map/MapPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/map/MapPanel.tsx app/src/map/MapPanel.test.tsx
git commit -m "feat: MapPanel component with dark terminal style and neighborhood layers"
```

---

### Task 7: Integrate MapPanel into App Layout

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/index.css`

- [ ] **Step 1: Add MapPanel to App.tsx**

In `App.tsx`, import MapPanel and add it to the layout. The map replaces the main content area or sits alongside it in a split view. Based on the current grid layout (`game-main` is `grid-template-columns: 280px 1fr`), add the map as part of the main content area:

Add import at top:
```tsx
import MapPanel from './map/MapPanel';
```

Add state for map visibility:
```tsx
const [showMap, setShowMap] = useState(true);
```

In the `game-content` area, add MapPanel above or beside the tab content. Wrap the main content in a split:
```tsx
<main className="game-content">
  {showMap && (
    <div className="map-container">
      <MapPanel
        onSelectTile={(tileId) => {
          setRightPanel({ kind: 'tile-detail', tileId });
        }}
        selectedTileId={rightPanel.kind === 'tile-detail' ? rightPanel.tileId : null}
        tileHealthMap={Object.fromEntries(
          Object.values(state.tiles).map(t => [t.id, t.ecologicalHealth])
        )}
      />
    </div>
  )}
  <div className="content-tab-bar">
    {/* existing tab bar */}
  </div>
  {/* existing tab content */}
</main>
```

- [ ] **Step 2: Add map styles to index.css**

Append to `app/src/index.css`:

```css
/* ── Map Panel ──────────────────────────────────── */
.map-container {
  height: 45vh;
  min-height: 300px;
  border-bottom: 1px solid var(--border);
  position: relative;
}

.map-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.map-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  font-size: 0.7rem;
  font-family: monospace;
}

.map-panel__title {
  color: #00ff41;
  font-weight: bold;
  letter-spacing: 2px;
}

.map-panel__coords {
  color: var(--text-dim);
}

/* Override MapLibre controls to match dark theme */
.maplibregl-ctrl-group {
  background: var(--bg-panel) !important;
  border: 1px solid var(--border) !important;
}

.maplibregl-ctrl-group button {
  background-color: transparent !important;
}

.maplibregl-ctrl-group button + button {
  border-top: 1px solid var(--border) !important;
}

.maplibregl-ctrl-group button:hover {
  background-color: rgba(0, 255, 65, 0.1) !important;
}

.maplibregl-ctrl-group svg {
  fill: #00ff41 !important;
}
```

- [ ] **Step 3: Verify the app builds**

Run: `cd app && npx tsc --noEmit && npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Start dev server and verify visually**

Run: `cd app && npm run dev`

Open in browser. The map should appear above the tab content with:
- Dark background
- Green glowing streets (once tiles load)
- Neighborhood boundaries with labels
- Click a neighborhood → selects it in the tile list
- Navigation controls (zoom/rotate) in top-right

- [ ] **Step 5: Commit**

```bash
git add app/src/App.tsx app/src/index.css
git commit -m "feat: integrate MapPanel into game layout with dark terminal theme"
```

---

### Task 8: Add Detroit Local News Sources to Pipeline

**Files:**
- Create: `app/server/pipeline/parsers/rss-generic.ts`
- Create: `app/server/pipeline/parsers/rss-generic.test.ts`
- Modify: `app/server/pipeline/config/feeds.json`
- Modify: `app/server/pipeline/fetcher.ts`

- [ ] **Step 1: Write failing test for generic RSS parser**

```typescript
// app/server/pipeline/parsers/rss-generic.test.ts
import { describe, it, expect } from 'vitest';
import { parseGenericRss } from './rss-generic';

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Bridge Detroit</title>
    <item>
      <title>Detroit council approves new solar initiative</title>
      <link>https://www.bridgedetroit.com/solar-initiative</link>
      <pubDate>Mon, 05 May 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Water rates to increase in July</title>
      <link>https://www.bridgedetroit.com/water-rates</link>
      <pubDate>Sun, 04 May 2026 14:30:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

describe('parseGenericRss', () => {
  it('extracts headlines from standard RSS', () => {
    const headlines = parseGenericRss(SAMPLE_RSS, 'bridge_detroit');
    expect(headlines).toHaveLength(2);
    expect(headlines[0].headline).toBe('Detroit council approves new solar initiative');
    expect(headlines[0].url).toBe('https://www.bridgedetroit.com/solar-initiative');
    expect(headlines[0].source).toBe('bridge_detroit');
  });

  it('handles HTML entities in titles', () => {
    const rss = SAMPLE_RSS.replace(
      'new solar initiative',
      'city&#39;s &amp; county&#8217;s plan'
    );
    const headlines = parseGenericRss(rss, 'test');
    expect(headlines[0].headline).toContain("city's & county");
  });

  it('returns empty array for malformed RSS', () => {
    const headlines = parseGenericRss('not xml at all', 'test');
    expect(headlines).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run server/pipeline/parsers/rss-generic.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement generic RSS parser**

```typescript
// app/server/pipeline/parsers/rss-generic.ts
import type { RawHeadline } from '../types';
import { createHash } from 'crypto';

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's');
  const match = xml.match(regex);
  return match ? decodeEntities(match[1].trim()) : '';
}

export function parseGenericRss(xml: string, sourceId: string): RawHeadline[] {
  try {
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g);
    if (!items) return [];

    return items.map(item => {
      const headline = extractTag(item, 'title');
      const url = extractTag(item, 'link');
      const pubDate = extractTag(item, 'pubDate');

      return {
        id: createHash('sha256').update(url || headline).digest('hex').slice(0, 16),
        source: sourceId,
        date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        headline,
        url,
        metadata: {},
        fetchedAt: new Date().toISOString(),
      };
    }).filter(h => h.headline && h.url);
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run server/pipeline/parsers/rss-generic.test.ts`
Expected: PASS

- [ ] **Step 5: Add Detroit sources to feeds.json**

Update `app/server/pipeline/config/feeds.json`:

```json
{
  "sources": [
    {
      "id": "theblue_report",
      "type": "json",
      "url": "https://data.theblue.report/feeds/top-day.json",
      "parser": "bluesky-trending"
    },
    {
      "id": "memeorandum",
      "type": "rss",
      "url": "http://www.memeorandum.com/feed.xml",
      "parser": "memeorandum"
    },
    {
      "id": "bridge_detroit",
      "type": "rss",
      "url": "https://www.bridgedetroit.com/feed/",
      "parser": "rss-generic"
    },
    {
      "id": "planet_detroit",
      "type": "rss",
      "url": "https://planetdetroit.org/feed/",
      "parser": "rss-generic"
    },
    {
      "id": "outlier_media",
      "type": "rss",
      "url": "https://outliermedia.org/feed/",
      "parser": "rss-generic"
    },
    {
      "id": "metro_times",
      "type": "rss",
      "url": "https://www.metrotimes.com/detroit/Rss.xml",
      "parser": "rss-generic"
    },
    {
      "id": "model_d",
      "type": "rss",
      "url": "https://feeds.feedburner.com/ModelDMedia",
      "parser": "rss-generic"
    },
    {
      "id": "daily_detroit",
      "type": "rss",
      "url": "https://feeds.feedburner.com/DailyDetroit",
      "parser": "rss-generic"
    },
    {
      "id": "chalkbeat_detroit",
      "type": "rss",
      "url": "https://www.chalkbeat.org/arc/outboundfeeds/rss/?outputType=xml",
      "parser": "rss-generic"
    },
    {
      "id": "google_news_detroit",
      "type": "rss",
      "url": "https://news.google.com/rss/headlines/section/geo/Detroit?hl=en-US&gl=US&ceid=US:en",
      "parser": "rss-generic"
    }
  ]
}
```

- [ ] **Step 6: Wire rss-generic parser into fetcher.ts**

In `app/server/pipeline/fetcher.ts`, add to the parser import/switch:

```typescript
import { parseGenericRss } from './parsers/rss-generic';
```

In the parser selection logic, add:
```typescript
case 'rss-generic':
  return parseGenericRss(text, source.id);
```

- [ ] **Step 7: Run the pipeline to test new sources**

Run: `cd app && npx tsx -e "import { runPipeline } from './server/pipeline/index'; runPipeline().then(r => console.log(JSON.stringify(r, null, 2)))"`

Expected: Headlines from the new Detroit sources appear alongside existing theblue.report and memeorandum headlines.

- [ ] **Step 8: Commit**

```bash
git add app/server/pipeline/parsers/rss-generic.ts app/server/pipeline/parsers/rss-generic.test.ts app/server/pipeline/config/feeds.json app/server/pipeline/fetcher.ts
git commit -m "feat: add generic RSS parser and 8 Detroit local news sources to pipeline"
```

---

## Phase 2: Block-Level Data

### Task 9: City Package Types

**Files:**
- Create: `app/src/city/types.ts`

- [ ] **Step 1: Define the CityPackage type**

```typescript
// app/src/city/types.ts
import type { FeatureCollection, Polygon, Point } from 'geojson';

export interface CityMeta {
  cityName: string;
  state: string;
  center: [number, number]; // [lon, lat]
  zoomBounds: { min: number; max: number };
  generatedAt: string;
  version: number;
}

export interface DataLayerEntry {
  data: any;
  source: string;
  sourceUrl: string;
  license: string;
  fetchedAt: string;
  ttl: string;
  available: boolean;
  gapReason?: string;
  advocacyTarget?: {
    name: string;
    title: string;
    agency: string;
    contact?: string;
  };
}

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  feedUrl: string;
  feedType: 'rss' | 'json' | 'scrape';
  locality: 'neighborhood' | 'city' | 'metro' | 'state' | 'national';
  topics: string[];
  validated: boolean;
  lastChecked: string;
  neighborhoodFocus?: string;
}

export interface CityCharacter {
  id: string;
  name: string;
  role: string;
  organizationInspiredBy: string;
  organizationUrl: string;
  neighborhood: string;
  issues: string[];
  personality: Record<string, any>;
  backstory: string;
  pedagogicalIntent: string;
}

export interface PowerStructureEntry {
  name: string;
  title?: string;
  district?: string;
  neighborhoods?: string[];
  contact?: string;
  committees?: string[];
  responsibility?: string;
  relevantArcs?: string[];
  type?: 'electric' | 'gas' | 'water' | 'telecom';
  ownership?: 'public' | 'private' | 'cooperative';
  pedagogicalNote: string;
}

export interface CityPowerStructure {
  mayor: { name: string; contact?: string; since?: string };
  council: PowerStructureEntry[];
  agencies: PowerStructureEntry[];
  utilityCompanies: PowerStructureEntry[];
}

export interface CityCrisisArc {
  id: string;
  name: string;
  localDescription: string;
  keywords: string[];
  escalationThreshold: number;
  localities: string[];
  connectedArcs: string[];
  pedagogicalChain: string;
  realExamples: string[];
}

export interface CityCalibration {
  cityBudget: { real: number; game: number; source: string };
  medianIncome: { value: number; source: string };
  vacancyRate: { value: number; source: string };
  treeCanopy: { current: number; target: number; source: string };
  foodAccess: { percentLacking: number; source: string };
  population: { value: number; source: string };
}

export interface SourceRegistryEntry {
  key: string;
  name: string;
  url: string;
  fetchDate: string;
  license: string;
  notes: string;
}

export interface CityPackage {
  meta: CityMeta;
  geography: {
    neighborhoodBoundaries: FeatureCollection<Polygon>;
    blockPolygons: FeatureCollection<Polygon>;
    buildingFootprints?: FeatureCollection<Polygon>;
  };
  dataLayers: Record<string, DataLayerEntry>;
  newsSources: NewsSource[];
  characters: CityCharacter[];
  powerStructure: CityPowerStructure;
  crisisArcs: CityCrisisArc[];
  calibration: CityCalibration;
  sourceRegistry: SourceRegistryEntry[];
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/city/types.ts
git commit -m "feat: CityPackage type definitions for universal city config"
```

---

### Task 10: Public Data Layer Clients

**Files:**
- Create: `app/src/data-layers/types.ts`
- Create: `app/src/data-layers/census.ts`
- Create: `app/src/data-layers/census.test.ts`
- Create: `app/src/data-layers/epa.ts`
- Create: `app/src/data-layers/epa.test.ts`
- Create: `app/src/data-layers/cache.ts`
- Create: `app/src/data-layers/cache.test.ts`

- [ ] **Step 1: Create data layer types**

```typescript
// app/src/data-layers/types.ts
export interface DataPoint {
  lat: number;
  lon: number;
  value: any;
  source: string;
  fetchedAt: string;
}

export interface CensusBlockGroup {
  geoid: string;
  population: number;
  medianIncome: number;
  vacancyRate: number;
  povertyRate: number;
}

export interface EpaSite {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'brownfield' | 'superfund' | 'echo_facility';
  status: string;
  contaminants?: string[];
}

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export const DETROIT_BBOX: BoundingBox = {
  south: 42.25,
  west: -83.30,
  north: 42.45,
  east: -82.91,
};
```

- [ ] **Step 2: Write Census API client test**

```typescript
// app/src/data-layers/census.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCensusData, parseCensusResponse } from './census';

describe('parseCensusResponse', () => {
  it('parses Census API JSON array response', () => {
    const raw = [
      ['B01003_001E', 'B19013_001E', 'B25002_003E', 'B25001_001E', 'state', 'county', 'tract', 'block group'],
      ['5000', '35000', '200', '2000', '26', '163', '510100', '1'],
      ['3000', '42000', '50', '1500', '26', '163', '510100', '2'],
    ];
    const result = parseCensusResponse(raw);
    expect(result).toHaveLength(2);
    expect(result[0].population).toBe(5000);
    expect(result[0].medianIncome).toBe(35000);
    expect(result[0].vacancyRate).toBeCloseTo(0.1);
    expect(result[0].geoid).toBe('261635101001');
  });
});
```

- [ ] **Step 3: Implement Census client**

```typescript
// app/src/data-layers/census.ts
import type { CensusBlockGroup, BoundingBox } from './types';

const CENSUS_BASE = 'https://api.census.gov/data/2023/acs/acs5';

// Key variables:
// B01003_001E = total population
// B19013_001E = median household income
// B25002_003E = vacant housing units
// B25001_001E = total housing units
const VARIABLES = 'B01003_001E,B19013_001E,B25002_003E,B25001_001E';

export function parseCensusResponse(raw: any[][]): CensusBlockGroup[] {
  const [header, ...rows] = raw;
  return rows.map(row => {
    const population = parseInt(row[0]) || 0;
    const medianIncome = parseInt(row[1]) || 0;
    const vacantUnits = parseInt(row[2]) || 0;
    const totalUnits = parseInt(row[3]) || 1;
    const state = row[4];
    const county = row[5];
    const tract = row[6];
    const blockGroup = row[7];

    return {
      geoid: `${state}${county}${tract}${blockGroup}`,
      population,
      medianIncome,
      vacancyRate: vacantUnits / totalUnits,
      povertyRate: 0, // would need B17001 variables
    };
  });
}

export async function fetchCensusData(
  stateFips: string,
  countyFips: string
): Promise<CensusBlockGroup[]> {
  const url = `${CENSUS_BASE}?get=${VARIABLES}&for=block+group:*&in=state:${stateFips}&in=county:${countyFips}&in=tract:*`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census API error: ${res.status}`);
  const data = await res.json();
  return parseCensusResponse(data);
}

// Detroit = state 26 (Michigan), county 163 (Wayne)
export async function fetchDetroitCensus(): Promise<CensusBlockGroup[]> {
  return fetchCensusData('26', '163');
}
```

- [ ] **Step 4: Write EPA client test**

```typescript
// app/src/data-layers/epa.test.ts
import { describe, it, expect } from 'vitest';
import { parseEpaSites } from './epa';

describe('parseEpaSites', () => {
  it('parses EPA Envirofacts response', () => {
    const raw = [
      {
        REGISTRY_ID: '110000123',
        PRIMARY_NAME: 'Former Auto Plant',
        LATITUDE83: 42.33,
        LONGITUDE83: -83.05,
        SITE_TYPE_NAME: 'BROWNFIELDS',
        FEDERAL_FACILITY_CODE: null,
      },
    ];
    const result = parseEpaSites(raw);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Former Auto Plant');
    expect(result[0].type).toBe('brownfield');
    expect(result[0].lat).toBe(42.33);
  });
});
```

- [ ] **Step 5: Implement EPA client**

```typescript
// app/src/data-layers/epa.ts
import type { EpaSite, BoundingBox } from './types';

const ECHO_BASE = 'https://echo.epa.gov/api/echo_rest_services.get_facilities';

export function parseEpaSites(raw: any[]): EpaSite[] {
  return raw
    .filter(r => r.LATITUDE83 && r.LONGITUDE83)
    .map(r => ({
      id: String(r.REGISTRY_ID || r.FacilityID || ''),
      name: r.PRIMARY_NAME || r.FacName || 'Unknown',
      lat: parseFloat(r.LATITUDE83 || r.FacLat),
      lon: parseFloat(r.LONGITUDE83 || r.FacLong),
      type: inferSiteType(r),
      status: r.SITE_TYPE_NAME || r.EPASystem || 'unknown',
      contaminants: [],
    }));
}

function inferSiteType(r: any): EpaSite['type'] {
  const siteType = (r.SITE_TYPE_NAME || '').toLowerCase();
  if (siteType.includes('brownfield')) return 'brownfield';
  if (siteType.includes('superfund') || siteType.includes('cerclis')) return 'superfund';
  return 'echo_facility';
}

export async function fetchEpaSites(bbox: BoundingBox): Promise<EpaSite[]> {
  // Use EPA ECHO REST API with bounding box
  const params = new URLSearchParams({
    output: 'JSON',
    p_c1lat: String(bbox.south),
    p_c1lon: String(bbox.west),
    p_c2lat: String(bbox.north),
    p_c2lon: String(bbox.east),
  });
  const url = `${ECHO_BASE}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`EPA API error: ${res.status}`);
  const data = await res.json();
  const facilities = data?.Results?.Facilities || [];
  return parseEpaSites(facilities);
}
```

- [ ] **Step 6: Write IndexedDB cache test**

```typescript
// app/src/data-layers/cache.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DataLayerCache } from './cache';

// Use in-memory Map as mock storage for testing
describe('DataLayerCache', () => {
  let cache: DataLayerCache;

  beforeEach(() => {
    cache = new DataLayerCache();
  });

  it('stores and retrieves data', async () => {
    await cache.set('census', { population: 5000 }, 3600);
    const result = await cache.get('census');
    expect(result).toEqual({ population: 5000 });
  });

  it('returns null for expired data', async () => {
    await cache.set('census', { population: 5000 }, -1); // already expired
    const result = await cache.get('census');
    expect(result).toBeNull();
  });

  it('returns null for missing keys', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 7: Implement cache**

```typescript
// app/src/data-layers/cache.ts
interface CacheEntry {
  data: any;
  expiresAt: number;
}

export class DataLayerCache {
  private store = new Map<string, CacheEntry>();

  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    // Also persist to IndexedDB if available
    if (typeof indexedDB !== 'undefined') {
      try {
        const db = await this.openDB();
        const tx = db.transaction('cache', 'readwrite');
        tx.objectStore('cache').put({ key, data, expiresAt: Date.now() + ttlSeconds * 1000 });
      } catch { /* IndexedDB unavailable in test/SSR */ }
    }
  }

  async get(key: string): Promise<any | null> {
    // Check in-memory first
    const entry = this.store.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) return entry.data;
      this.store.delete(key);
      return null;
    }

    // Fall back to IndexedDB
    if (typeof indexedDB !== 'undefined') {
      try {
        const db = await this.openDB();
        const tx = db.transaction('cache', 'readonly');
        const result = await this.idbGet(tx.objectStore('cache'), key);
        if (result && Date.now() < result.expiresAt) {
          this.store.set(key, result);
          return result.data;
        }
      } catch { /* IndexedDB unavailable */ }
    }

    return null;
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('city-builder-cache', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('cache', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private idbGet(store: IDBObjectStore, key: string): Promise<CacheEntry | null> {
    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }
}
```

- [ ] **Step 8: Run all data layer tests**

Run: `cd app && npx vitest run src/data-layers/`
Expected: All PASS

- [ ] **Step 9: Commit**

```bash
git add app/src/data-layers/
git commit -m "feat: add Census and EPA API clients with IndexedDB caching"
```

---

### Task 11: Block Data Cards on Map

**Files:**
- Create: `app/src/map/block-layer.ts`
- Create: `app/src/map/block-layer.test.ts`
- Modify: `app/src/map/MapPanel.tsx`
- Modify: `app/src/state/types.ts`

- [ ] **Step 1: Add block-related types to game state**

In `app/src/state/types.ts`, add near the Tile interface:

```typescript
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
```

Add to the `Tile` interface:

```typescript
blocks?: string[]; // block IDs belonging to this neighborhood
```

- [ ] **Step 2: Write block interaction test**

```typescript
// app/src/map/block-layer.test.ts
import { describe, it, expect } from 'vitest';
import { getBlockFillColor, getBlockPopupContent } from './block-layer';
import type { BlockData } from '../state/types';

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
```

- [ ] **Step 3: Implement block layer helpers**

```typescript
// app/src/map/block-layer.ts
import type { BlockData } from '../state/types';

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
```

- [ ] **Step 4: Run tests**

Run: `cd app && npx vitest run src/map/block-layer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/map/block-layer.ts app/src/map/block-layer.test.ts app/src/state/types.ts
git commit -m "feat: block data cards with EPA overlay and data gap advocacy"
```

---

### Task 12: Headline Classification Pipeline

**Files:**
- Create: `app/server/pipeline/classifier.ts`
- Create: `app/server/pipeline/classifier.test.ts`
- Modify: `app/server/pipeline/types.ts`

- [ ] **Step 1: Extend ProcessedHeadline type**

In `app/server/pipeline/types.ts`, add to `ProcessedHeadline`:

```typescript
neighborhoodTag?: string;    // which neighborhood this headline relates to
pedagogicalHook?: string;    // what this teaches about how the city works
```

- [ ] **Step 2: Write classifier test**

```typescript
// app/server/pipeline/classifier.test.ts
import { describe, it, expect } from 'vitest';
import { classifyByKeywords } from './classifier';

describe('classifyByKeywords', () => {
  it('matches energy arc keywords', () => {
    const result = classifyByKeywords('DTE reports widespread power outage in Brightmoor');
    expect(result.arcs).toContain('energy-grid');
    expect(result.severity).toBeGreaterThan(0);
  });

  it('matches water arc keywords', () => {
    const result = classifyByKeywords('PFAS contamination found in Detroit water supply');
    expect(result.arcs).toContain('water-pfas');
  });

  it('detects neighborhood mentions', () => {
    const result = classifyByKeywords('New solar project launches in Corktown');
    expect(result.neighborhoodTag).toBe('corktown');
  });

  it('returns empty for unrelated headlines', () => {
    const result = classifyByKeywords('Celebrity spotted at local restaurant');
    expect(result.arcs).toEqual([]);
    expect(result.severity).toBe(0);
  });

  it('detects locality', () => {
    const result = classifyByKeywords('Michigan governor signs clean energy bill');
    expect(result.locality).toBe('michigan');
  });
});
```

- [ ] **Step 3: Implement keyword classifier**

```typescript
// app/server/pipeline/classifier.ts
interface ClassificationResult {
  arcs: string[];
  severity: number;
  locality: string | null;
  neighborhoodTag: string | null;
  confidence: number;
}

const ARC_KEYWORDS: Record<string, string[]> = {
  'energy-grid': ['grid', 'DTE', 'outage', 'power', 'solar', 'microgrid', 'blackout', 'electricity', 'utility', 'renewable'],
  'water-pfas': ['PFAS', 'water', 'contamination', 'forever chemicals', 'DWSD', 'GLWA', 'lead pipe', 'water shut', 'boil water'],
  'phosphorus-food': ['phosphorus', 'fertilizer', 'nutrient', 'food desert', 'food sovereignty', 'urban farm', 'hunger', 'food access'],
  'housing-speculation': ['housing', 'eviction', 'rent', 'speculation', 'gentrification', 'land contract', 'foreclosure', 'blight', 'demolition', 'affordable'],
  'infrastructure-debt': ['infrastructure', 'bridge', 'sewer', 'road', 'maintenance', 'crumbling', 'pothole', 'transit', 'bus route'],
};

const NEIGHBORHOODS = [
  'brightmoor', 'corktown', 'eastern market', 'southwest detroit',
  'indian village', 'hamtramck', 'north end', 'midtown', 'downtown',
  'riverfront', 'mexicantown', 'banglatown', 'warrendale',
];

const SEVERITY_WORDS: Record<number, string[]> = {
  3: ['crisis', 'emergency', 'catastroph', 'death', 'killed', 'collapse'],
  2: ['violation', 'contamination', 'shutdown', 'protest', 'lawsuit', 'surge'],
  1: ['concern', 'report', 'study', 'proposal', 'plan', 'announce'],
};

const LOCALITY_PATTERNS: [string, RegExp][] = [
  ['detroit', /\b(detroit|DTE|DWSD|GLWA|wayne county)\b/i],
  ['michigan', /\b(michigan|lansing|governor whitmer|MPSC|MDEQ)\b/i],
  ['national', /\b(EPA|federal|congress|national|FEMA|CDC)\b/i],
  ['global', /\b(global|international|UN|WHO|climate summit)\b/i],
];

export function classifyByKeywords(headline: string): ClassificationResult {
  const lower = headline.toLowerCase();
  const arcs: string[] = [];

  for (const [arcId, keywords] of Object.entries(ARC_KEYWORDS)) {
    const hits = keywords.filter(kw => lower.includes(kw.toLowerCase()));
    if (hits.length > 0) arcs.push(arcId);
  }

  let severity = 0;
  for (const [sev, words] of Object.entries(SEVERITY_WORDS)) {
    if (words.some(w => lower.includes(w))) {
      severity = Math.max(severity, parseInt(sev));
    }
  }

  let locality: string | null = null;
  for (const [loc, pattern] of LOCALITY_PATTERNS) {
    if (pattern.test(headline)) {
      locality = loc;
      break;
    }
  }

  let neighborhoodTag: string | null = null;
  for (const hood of NEIGHBORHOODS) {
    if (lower.includes(hood)) {
      neighborhoodTag = hood.replace(/\s+/g, '-');
      break;
    }
  }

  return {
    arcs,
    severity,
    locality,
    neighborhoodTag,
    confidence: arcs.length > 0 ? 0.6 + (arcs.length * 0.1) : 0,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd app && npx vitest run server/pipeline/classifier.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/server/pipeline/classifier.ts app/server/pipeline/classifier.test.ts app/server/pipeline/types.ts
git commit -m "feat: keyword-based headline classifier with arc, severity, and neighborhood detection"
```

---

## Phase 3: Full Spatial Mechanics

### Task 13: Wire Block Data to Game State

**Files:**
- Modify: `app/src/state/reducer.ts`
- Modify: `app/src/state/types.ts`
- Modify: `app/src/map/MapPanel.tsx`

- [ ] **Step 1: Add map actions to GameAction union**

In `app/src/state/types.ts`, add to `GameAction`:

```typescript
| { type: 'MAP_SELECT_BLOCK'; blockId: string; neighborhoodId: string }
| { type: 'MAP_SET_VIEW'; viewState: { longitude: number; latitude: number; zoom: number } }
```

- [ ] **Step 2: Add map state to GameState**

In `app/src/state/types.ts`, add to `GameState`:

```typescript
mapState: {
  selectedBlockId: string | null;
  viewState: { longitude: number; latitude: number; zoom: number };
  blockData: Record<string, import('./types').BlockData>;
};
```

- [ ] **Step 3: Handle map actions in reducer**

In `app/src/state/reducer.ts`, add cases:

```typescript
case 'MAP_SELECT_BLOCK':
  return {
    ...state,
    mapState: {
      ...state.mapState,
      selectedBlockId: action.blockId,
    },
  };

case 'MAP_SET_VIEW':
  return {
    ...state,
    mapState: {
      ...state.mapState,
      viewState: action.viewState,
    },
  };
```

- [ ] **Step 4: Initialize map state in create-game.ts**

In `app/src/state/create-game.ts`, add to the initial state:

```typescript
mapState: {
  selectedBlockId: null,
  viewState: { longitude: -83.0458, latitude: 42.3314, zoom: 11.5 },
  blockData: {},
},
```

- [ ] **Step 5: Verify build**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add app/src/state/types.ts app/src/state/reducer.ts app/src/state/create-game.ts
git commit -m "feat: add map state management to game reducer"
```

---

### Task 14: Project Placement on Blocks

**Files:**
- Modify: `app/src/state/reducer.ts` (START_PROJECT action)
- Modify: `app/src/state/types.ts` (ActiveProject gets blockId)
- Modify: `app/src/map/MapPanel.tsx` (show active projects on map)

- [ ] **Step 1: Add blockId to ActiveProject**

In `app/src/state/types.ts`, update `ActiveProject`:

```typescript
export interface ActiveProject {
  projectId: string;
  startTurn: number;
  turnsRemaining: number;
  mode: ProjectMode;
  blockId?: string; // geographic placement (Phase 2+)
}
```

- [ ] **Step 2: Update START_PROJECT to accept optional blockId**

In `app/src/state/types.ts`, update the action:

```typescript
| { type: 'START_PROJECT'; tileId: string; projectId: string; mode: ProjectMode; blockId?: string }
```

In the reducer, pass `blockId` through to the ActiveProject:

```typescript
// In handleStartProject, when creating the ActiveProject:
const newProject: ActiveProject = {
  projectId: action.projectId,
  startTurn: state.turn,
  turnsRemaining: def.duration,
  mode: action.mode,
  blockId: action.blockId,
};
```

- [ ] **Step 3: Add project markers to MapPanel**

Add a `Marker` layer to MapPanel showing active projects on the map with pulsing green dots:

```tsx
// In MapPanel.tsx, add project markers source
// This maps active projects to their block centroids
<Source id="projects" type="geojson" data={projectMarkersGeoJSON}>
  <Layer
    id="project-markers"
    type="circle"
    paint={{
      'circle-radius': 6,
      'circle-color': '#00ff41',
      'circle-opacity': 0.8,
      'circle-blur': 0.3,
    }}
  />
</Source>
```

- [ ] **Step 4: Verify build**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/src/state/types.ts app/src/state/reducer.ts app/src/map/MapPanel.tsx
git commit -m "feat: project placement on geographic blocks with map markers"
```

---

## Phase 4: Multi-City + Agent Swarm

### Task 15: City Package Loader

**Files:**
- Create: `app/src/city/loader.ts`
- Create: `app/src/city/loader.test.ts`

- [ ] **Step 1: Write loader test**

```typescript
// app/src/city/loader.test.ts
import { describe, it, expect } from 'vitest';
import { validateCityPackage, loadCityPackage } from './loader';

const MINIMAL_PACKAGE = {
  meta: {
    cityName: 'Detroit',
    state: 'MI',
    center: [-83.0458, 42.3314],
    zoomBounds: { min: 10, max: 18 },
    generatedAt: '2026-05-06',
    version: 1,
  },
  geography: {
    neighborhoodBoundaries: { type: 'FeatureCollection', features: [] },
    blockPolygons: { type: 'FeatureCollection', features: [] },
  },
  dataLayers: {},
  newsSources: [],
  characters: [],
  powerStructure: {
    mayor: { name: 'Test Mayor' },
    council: [],
    agencies: [],
    utilityCompanies: [],
  },
  crisisArcs: [],
  calibration: {
    cityBudget: { real: 1460000000, game: 1.5, source: 'FY2024' },
    medianIncome: { value: 36140, source: 'ACS 2023' },
    vacancyRate: { value: 0.30, source: 'Census' },
    treeCanopy: { current: 26, target: 40, source: 'UTC' },
    foodAccess: { percentLacking: 36, source: 'USDA' },
    population: { value: 639111, source: 'Census 2020' },
  },
  sourceRegistry: [],
};

describe('validateCityPackage', () => {
  it('validates a minimal valid package', () => {
    const errors = validateCityPackage(MINIMAL_PACKAGE as any);
    expect(errors).toEqual([]);
  });

  it('rejects package missing meta.cityName', () => {
    const bad = { ...MINIMAL_PACKAGE, meta: { ...MINIMAL_PACKAGE.meta, cityName: '' } };
    const errors = validateCityPackage(bad as any);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('loadCityPackage', () => {
  it('converts package to game initialization params', () => {
    const result = loadCityPackage(MINIMAL_PACKAGE as any);
    expect(result.cityName).toBe('Detroit');
    expect(result.startingBudget).toBe(1.5);
    expect(result.mapCenter).toEqual([-83.0458, 42.3314]);
  });
});
```

- [ ] **Step 2: Implement loader**

```typescript
// app/src/city/loader.ts
import type { CityPackage } from './types';

export interface CityInitParams {
  cityName: string;
  state: string;
  mapCenter: [number, number];
  zoomBounds: { min: number; max: number };
  startingBudget: number;
  treeCanopy: number;
  foodAccess: number;
  vacancyRate: number;
  population: number;
  neighborhoods: Array<{ id: string; name: string }>;
  newsSources: CityPackage['newsSources'];
  characters: CityPackage['characters'];
  powerStructure: CityPackage['powerStructure'];
  crisisArcs: CityPackage['crisisArcs'];
}

export function validateCityPackage(pkg: CityPackage): string[] {
  const errors: string[] = [];

  if (!pkg.meta?.cityName) errors.push('meta.cityName is required');
  if (!pkg.meta?.center || pkg.meta.center.length !== 2) errors.push('meta.center must be [lon, lat]');
  if (!pkg.geography?.neighborhoodBoundaries) errors.push('geography.neighborhoodBoundaries required');
  if (!pkg.geography?.blockPolygons) errors.push('geography.blockPolygons required');
  if (!pkg.calibration?.cityBudget) errors.push('calibration.cityBudget required');
  if (!pkg.powerStructure?.mayor) errors.push('powerStructure.mayor required');

  return errors;
}

export function loadCityPackage(pkg: CityPackage): CityInitParams {
  const errors = validateCityPackage(pkg);
  if (errors.length > 0) {
    throw new Error(`Invalid city package: ${errors.join(', ')}`);
  }

  const neighborhoods = pkg.geography.neighborhoodBoundaries.features.map(f => ({
    id: f.properties?.id || f.id || '',
    name: f.properties?.name || '',
  }));

  return {
    cityName: pkg.meta.cityName,
    state: pkg.meta.state,
    mapCenter: pkg.meta.center,
    zoomBounds: pkg.meta.zoomBounds,
    startingBudget: pkg.calibration.cityBudget.game,
    treeCanopy: pkg.calibration.treeCanopy.current,
    foodAccess: 100 - pkg.calibration.foodAccess.percentLacking,
    vacancyRate: pkg.calibration.vacancyRate.value,
    population: pkg.calibration.population.value,
    neighborhoods,
    newsSources: pkg.newsSources,
    characters: pkg.characters,
    powerStructure: pkg.powerStructure,
    crisisArcs: pkg.crisisArcs,
  };
}
```

- [ ] **Step 3: Run tests**

Run: `cd app && npx vitest run src/city/loader.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/src/city/loader.ts app/src/city/loader.test.ts
git commit -m "feat: city package loader and validator"
```

---

### Task 16: Detroit City Package (First Instance)

**Files:**
- Create: `app/src/city/detroit.ts`

- [ ] **Step 1: Create Detroit config**

```typescript
// app/src/city/detroit.ts
import type { CityPackage } from './types';
import neighborhoodsGeoJSON from '../map/data/detroit-neighborhoods.geojson';

// Block polygons loaded lazily — may not exist until generate-blocks.ts runs
let blocksGeoJSON: any = { type: 'FeatureCollection', features: [] };
try {
  blocksGeoJSON = await import('../map/data/detroit-blocks.geojson');
} catch { /* blocks not generated yet */ }

export const detroitPackage: CityPackage = {
  meta: {
    cityName: 'Detroit',
    state: 'MI',
    center: [-83.0458, 42.3314],
    zoomBounds: { min: 10, max: 18 },
    generatedAt: new Date().toISOString(),
    version: 1,
  },
  geography: {
    neighborhoodBoundaries: neighborhoodsGeoJSON as any,
    blockPolygons: blocksGeoJSON as any,
  },
  dataLayers: {
    census: {
      data: null,
      source: 'US Census ACS 5-year',
      sourceUrl: 'https://api.census.gov/data/2023/acs/acs5',
      license: 'Public Domain',
      fetchedAt: '',
      ttl: '365d',
      available: true,
    },
    epa: {
      data: null,
      source: 'EPA Envirofacts + ECHO',
      sourceUrl: 'https://echo.epa.gov/',
      license: 'Public Domain',
      fetchedAt: '',
      ttl: '30d',
      available: true,
    },
    flood: {
      data: null,
      source: 'FEMA NFHL',
      sourceUrl: 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer',
      license: 'Public Domain',
      fetchedAt: '',
      ttl: '365d',
      available: true,
    },
    air_quality: {
      data: null,
      source: 'AirNow',
      sourceUrl: 'https://www.airnowapi.org/',
      license: 'Public Domain',
      fetchedAt: '',
      ttl: '1h',
      available: true,
    },
    land_bank: {
      data: null,
      source: 'Detroit Land Bank Authority',
      sourceUrl: 'https://data.detroitmi.gov/',
      license: 'Open Data',
      fetchedAt: '',
      ttl: '30d',
      available: true,
    },
    soil_contamination: {
      data: null,
      source: '',
      sourceUrl: '',
      license: '',
      fetchedAt: '',
      ttl: '',
      available: false,
      gapReason: 'Detroit does not publish block-level soil contamination data. EPA monitors specific brownfield sites but vast areas remain untested.',
      advocacyTarget: {
        name: 'Michigan EGLE',
        title: 'Director',
        agency: 'Michigan Environment, Great Lakes, and Energy',
        contact: 'EGLE-Assist@michigan.gov',
      },
    },
  },
  newsSources: [
    { id: 'bridge_detroit', name: 'Bridge Detroit', url: 'https://www.bridgedetroit.com', feedUrl: 'https://www.bridgedetroit.com/feed/', feedType: 'rss', locality: 'city', topics: ['civic', 'policy', 'community'], validated: true, lastChecked: new Date().toISOString() },
    { id: 'planet_detroit', name: 'Planet Detroit', url: 'https://planetdetroit.org', feedUrl: 'https://planetdetroit.org/feed/', feedType: 'rss', locality: 'city', topics: ['environment', 'climate', 'energy'], validated: true, lastChecked: new Date().toISOString() },
    { id: 'outlier_media', name: 'Outlier Media', url: 'https://outliermedia.org', feedUrl: 'https://outliermedia.org/feed/', feedType: 'rss', locality: 'city', topics: ['housing', 'utilities', 'accountability'], validated: true, lastChecked: new Date().toISOString() },
    { id: 'metro_times', name: 'Metro Times', url: 'https://www.metrotimes.com', feedUrl: 'https://www.metrotimes.com/detroit/Rss.xml', feedType: 'rss', locality: 'city', topics: ['culture', 'politics', 'community'], validated: true, lastChecked: new Date().toISOString() },
    { id: 'model_d', name: 'Model D', url: 'https://modeldmedia.com', feedUrl: 'https://feeds.feedburner.com/ModelDMedia', feedType: 'rss', locality: 'city', topics: ['development', 'community', 'innovation'], validated: true, lastChecked: new Date().toISOString() },
    { id: 'daily_detroit', name: 'Daily Detroit', url: 'https://www.dailydetroit.com', feedUrl: 'https://feeds.feedburner.com/DailyDetroit', feedType: 'rss', locality: 'city', topics: ['hyperlocal', 'community', 'events'], validated: true, lastChecked: new Date().toISOString() },
  ],
  characters: [], // existing characters in data/content/ — migrated separately
  powerStructure: {
    mayor: { name: 'Mike Duggan', contact: 'https://detroitmi.gov/government/mayors-office', since: '2014' },
    council: [
      { name: 'District 1', neighborhoods: ['brightmoor'], pedagogicalNote: 'Represents the most vacant neighborhoods — vacancy policy decisions start here' },
      { name: 'District 5', neighborhoods: ['corktown', 'southwest-detroit'], pedagogicalNote: 'Bridging gentrification pressure in Corktown with industrial pollution in Southwest' },
      { name: 'District 7', neighborhoods: ['hamtramck'], pedagogicalNote: 'Hamtramck is an independent city within Detroit metro — different governance structure' },
    ],
    agencies: [
      { name: 'Detroit Water and Sewerage Department', responsibility: 'Water rates, infrastructure, stormwater', relevantArcs: ['water-pfas', 'infrastructure-debt'], pedagogicalNote: 'Controls water shut-offs and infrastructure investment. DWSD merged into GLWA for regional water but Detroit retains local distribution.' },
      { name: 'Detroit Land Bank Authority', responsibility: 'Manages 100K+ vacant parcels, demolition, side lot sales', relevantArcs: ['housing-speculation'], pedagogicalNote: 'Largest landowner in Detroit. Side Lot Program sells vacant lots to neighbors for $100. Demolition decisions shape which neighborhoods get investment.' },
      { name: 'BSEED', responsibility: 'Building permits, code enforcement, business licensing', relevantArcs: ['housing-speculation', 'infrastructure-debt'], pedagogicalNote: 'Buildings, Safety Engineering, and Environmental Department. Controls what gets built and what gets condemned.' },
    ],
    utilityCompanies: [
      { name: 'DTE Energy', type: 'electric', ownership: 'private', pedagogicalNote: 'Private monopoly — rates set by Michigan Public Service Commission (MPSC). Historically resistant to community solar and distributed generation. Soulardarity was founded specifically to challenge DTE\'s streetlight policies in Highland Park.' },
    ],
  },
  crisisArcs: [], // existing arc definitions in data/arcs/ — migrated separately
  calibration: {
    cityBudget: { real: 1460000000, game: 1.5, source: 'Detroit FY2024 General Fund' },
    medianIncome: { value: 36140, source: 'ACS 2019-2023' },
    vacancyRate: { value: 0.30, source: 'Census 2020' },
    treeCanopy: { current: 26, target: 40, source: 'American Forests UTC Assessment' },
    foodAccess: { percentLacking: 36, source: 'USDA Food Access Research Atlas' },
    population: { value: 639111, source: 'Census 2020' },
  },
  sourceRegistry: [
    { key: 'census', name: 'US Census Bureau ACS', url: 'https://api.census.gov/', fetchDate: '', license: 'Public Domain', notes: 'Block group level, 5-year estimates' },
    { key: 'epa', name: 'EPA Envirofacts', url: 'https://data.epa.gov/', fetchDate: '', license: 'Public Domain', notes: 'Brownfield and Superfund sites' },
    { key: 'dlba', name: 'Detroit Land Bank Authority', url: 'https://data.detroitmi.gov/', fetchDate: '', license: 'Open Data', notes: '~100K parcels with condition data' },
    { key: 'osm', name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/', fetchDate: '', license: 'ODbL', notes: 'Street network, buildings, POIs' },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add app/src/city/detroit.ts
git commit -m "feat: Detroit city package with real data sources and power structure"
```

---

### Task 17: Vite Config Updates for Map Tiles

**Files:**
- Modify: `app/vite.config.ts`

- [ ] **Step 1: Add environment variable for tile source**

Add to `vite.config.ts` `define` section (or use `.env`):

Create `app/.env`:
```
VITE_TILE_SOURCE=https://tiles.openfreemap.org/styles/liberty
```

Create `app/.env.production`:
```
VITE_TILE_SOURCE=pmtiles://https://YOUR_HETZNER_BUCKET.fsn1.your-objectstorage.com/detroit.pmtiles
```

- [ ] **Step 2: Add JSON import support for GeoJSON**

In `vite.config.ts`, ensure JSON imports work (they do by default in Vite, but verify TypeScript is configured):

In `app/tsconfig.json`, ensure:
```json
{
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/.env app/.env.production app/vite.config.ts
git commit -m "feat: add tile source env vars and GeoJSON import support"
```

---

### Task 18: End-to-End Integration Test

**Files:**
- Create: `app/src/tests/map-integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// app/src/tests/map-integration.test.ts
import { describe, it, expect } from 'vitest';
import { validateCityPackage, loadCityPackage } from '../city/loader';
import { classifyByKeywords } from '../../server/pipeline/classifier';
import { parseGenericRss } from '../../server/pipeline/parsers/rss-generic';
import { createDarkTerminalStyle } from '../map/map-style';
import { getBlockFillColor } from '../map/block-layer';

describe('Real-World Integration E2E', () => {
  it('map style generates valid MapLibre spec', () => {
    const style = createDarkTerminalStyle('https://tiles.openfreemap.org/styles/liberty');
    expect(style.version).toBe(8);
    expect(style.layers.length).toBeGreaterThan(5);
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
  });

  it('classifier connects headline to arc and neighborhood', () => {
    const result = classifyByKeywords('DTE outage leaves Brightmoor without power');
    expect(result.arcs).toContain('energy-grid');
    expect(result.neighborhoodTag).toBe('brightmoor');
    expect(result.severity).toBeGreaterThan(0);
  });

  it('block fill color reflects data gaps', () => {
    const color = getBlockFillColor({
      blockId: 'test',
      neighborhoodId: 'test',
      epaSites: [],
      transitStops: [],
      communityAssets: [],
      dataGaps: [{ layer: 'soil', reason: 'No data published' }],
    } as any);
    expect(color).toContain('251, 191, 36'); // amber for data gaps
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
```

- [ ] **Step 2: Run full test suite**

Run: `cd app && npx vitest run`
Expected: All tests PASS including existing tests (no regressions)

- [ ] **Step 3: Commit**

```bash
git add app/src/tests/map-integration.test.ts
git commit -m "test: end-to-end integration tests for real-world city pipeline"
```

---

## Summary

| Phase | Tasks | What ships |
|-------|-------|-----------|
| 1: Map Companion | Tasks 1-8 | MapLibre dark map in game UI, Detroit neighborhoods on real geography, 10 local news sources, generic RSS parser |
| 2: Block Data | Tasks 9-12 | CityPackage types, Census/EPA API clients, IndexedDB cache, block data cards with gap advocacy, headline classifier |
| 3: Spatial Mechanics | Tasks 13-14 | Map state in reducer, block selection, project placement on geographic blocks |
| 4: Multi-City | Tasks 15-18 | City package loader/validator, Detroit city package, tile deployment config, integration tests |
