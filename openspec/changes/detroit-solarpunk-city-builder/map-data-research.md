# Detroit Neighborhood Map Data Research

Research for the tile-based city builder where each "tile" is a real Detroit neighborhood rendered as a stylized polygon in a PixiJS canvas — no slippy map tiles, no Leaflet.

---

## 1. GeoJSON Boundary Data for Detroit Neighborhoods

### Best Source: City of Detroit Open Data Portal

**URL:** https://data.detroitmi.gov/datasets/detroitmi::current-city-of-detroit-neighborhoods/about

The authoritative source. Published by the Department of Neighborhoods, compiled with community input. Updated September 2025.

- **Format:** GeoJSON (also available as Shapefile, KML, GeoPackage, CSV, File GDB)
- **License:** Listed as "No License Provided" — this is city government data published on a public open data portal, which in practice means it is in the public domain or at minimum freely usable. No attribution requirement is specified, but crediting "City of Detroit Department of Neighborhoods" is good practice.
- **Direct GeoJSON API:** The portal is built on ArcGIS Hub. The pattern for ArcGIS FeatureServer GeoJSON exports is:
  ```
  https://services2.arcgis.com/qvkbeam8BMDvu3DF/arcgis/rest/services/Neighborhoods/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson
  ```
  Verify the exact service URL on the dataset's "About" page — look for the "ArcGIS GeoService" API link, then append the query parameters above.
- **Neighborhood count:** Detroit's neighborhoods are not canonically fixed — the city recognizes roughly 200 named areas, but the Department of Neighborhoods dataset groups these into approximately 50–60 planning neighborhoods suitable for a tile-based game. The `click_that_hood` GitHub file (see below) has 24 broader districts, which may be too coarse.

**Also check:** https://data.detroitmi.gov/maps/master-plan-neighborhoods — this is the official Master Plan neighborhood layer and likely the right granularity for a game (roughly 50 neighborhoods matching the city's planning framework).

### Second Source: click_that_hood GitHub (Ready-to-Use GeoJSON)

**URL:** https://github.com/codeforgermany/click_that_hood/blob/main/public/data/detroit.geojson

**Raw file:** https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/detroit.geojson

- **License:** MIT (project-level). The data within the file is ultimately derived from public sources; the MIT license on the repo makes this straightforwardly usable in a commercial game.
- **Format:** Standard GeoJSON FeatureCollection, WGS84 (lon/lat), ~338 KB
- **Features:** 24 neighborhood polygons. Fields per feature: `name`, `cartodb_id`, `created_at`, `updated_at`
- **Assessment:** This is the fastest way to get started. Only 24 neighborhoods is fewer than the ideal 30–50 for the game, but the polygon geometry is clean and game-ready. Good for prototyping.

### Third Source: blackmad/neighborhoods

**URL:** https://github.com/blackmad/neighborhoods/blob/master/detroit.geojson

**Raw:** https://raw.githubusercontent.com/blackmad/neighborhoods/master/detroit.geojson

- **License:** Not explicitly stated; the detroit.metadata.json credits the source as Zillow neighborhood boundary data. **Avoid for commercial use** — Zillow's data has redistribution restrictions.

### Fourth Option: OpenStreetMap via Overpass API

OSM contains named neighborhoods as relations tagged `boundary=administrative` or `place=neighbourhood`. Detroit neighborhoods are inconsistently mapped in OSM — coverage is partial and quality varies.

**Overpass QL query to extract Detroit neighborhood boundaries:**

```
[out:json][timeout:60];
area["name"="Detroit"]["admin_level"="6"]->.detroit;
(
  relation(area.detroit)["boundary"="administrative"]["admin_level"="10"];
  relation(area.detroit)["place"="neighbourhood"];
);
out body;
>;
out skel qt;
```

Run this at https://overpass-turbo.eu/ and export as GeoJSON. The `admin_level=10` tag is used for neighborhoods in US cities. **Caveat:** OSM Detroit neighborhood data is incomplete — you'll likely get a subset of neighborhoods.

**License:** ODbL (see Section 5 below). Safe for commercial games with attribution.

### Fifth Option: US Census TIGER/Line

**URL:** https://www.census.gov/cgi-bin/geo/shapefiles/index.php

Census TIGER does not have "neighborhoods" as a geographic unit. The closest equivalents are:
- **Census Tracts** (297 in Detroit) — statistically defined, not neighborhood names
- **Block Groups** — even finer-grained, no neighborhood names

TIGER is public domain and excellent for the city outline and water features, but **not suitable** as a neighborhood tile layer unless you want census tracts as your tiles.

### Recommendation

**Use the City of Detroit Open Data Portal** (Master Plan Neighborhoods layer) for production. It has the right granularity (~50 neighborhoods), is authoritative, and is city government data. Download the GeoJSON file at build time, commit it to the repo, and do not fetch it at runtime.

For prototyping today, the `click_that_hood` GeoJSON is immediately usable with zero setup.

---

## 2. Rendering GeoJSON Polygons in PixiJS

### Core Approach: d3-geo Projection + PixiJS Graphics

Do not use a slippy map library. The correct pattern is:

1. **d3-geo** handles the geographic projection (lon/lat → pixel x/y)
2. **PixiJS v8 Graphics** draws the resulting screen-space polygons

#### Step 1: Set Up the Projection

```typescript
import { geoMercator, geoPath, geoContains } from 'd3-geo';
import type { FeatureCollection, Feature, Polygon } from 'geojson';

// Load your GeoJSON at module init or build time
const neighborhoodGeoJSON: FeatureCollection = /* imported JSON */;

// fitSize auto-scales and centers the map to fill your canvas
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 960;
const PADDING = 40; // pixels of padding on each side

const projection = geoMercator().fitExtent(
  [[PADDING, PADDING], [CANVAS_WIDTH - PADDING, CANVAS_HEIGHT - PADDING]],
  neighborhoodGeoJSON
);

// project([lon, lat]) → [x, y] in screen space
```

`fitExtent` automatically computes the correct scale and translation — you do not need to hardcode any projection parameters. This works for any GeoJSON extent.

For Detroit specifically, `geoMercator` is fine. If you want to minimize distortion for a local area, `geoConicConformal` centered on Michigan (standard parallels ~42.5° and ~45°) is marginally more accurate, but the difference is imperceptible at game scale.

#### Step 2: Project GeoJSON Coordinates to Screen Space

```typescript
function projectCoordinates(coords: number[][]): number[] {
  // GeoJSON polygon ring: [[lon, lat], [lon, lat], ...]
  // Returns flat array: [x0, y0, x1, y1, ...]
  return coords.flatMap(([lon, lat]) => {
    const [x, y] = projection([lon, lat])!;
    return [x, y];
  });
}
```

#### Step 3: Draw in PixiJS v8

PixiJS v8 changed the Graphics API significantly. Build shapes first, then apply fill/stroke:

```typescript
import { Graphics, GraphicsContext } from 'pixi.js';

function buildNeighborhoodContext(
  feature: Feature<Polygon>,
  fillColor: number,
  strokeColor: number
): GraphicsContext {
  const context = new GraphicsContext();

  for (const ring of feature.geometry.coordinates) {
    const pts = projectCoordinates(ring);
    context.poly(pts, true); // true = close the path
  }

  context
    .fill({ color: fillColor, alpha: 1 })
    .stroke({ color: strokeColor, width: 2, alpha: 1 });

  return context;
}

// Create one Graphics per neighborhood
function createNeighborhoodSprite(
  feature: Feature<Polygon>,
  fillColor: number
): Graphics {
  const ctx = buildNeighborhoodContext(feature, fillColor, 0x000000);
  const g = new Graphics(ctx);
  g.eventMode = 'static'; // enable pointer events
  g.cursor = 'pointer';
  return g;
}
```

**Important PixiJS v8 notes:**
- Use `context.poly(flatPointArray, true)` for polygons — the `true` parameter closes the path
- Chain `.fill()` and `.stroke()` after the shape commands, not before
- Use `GraphicsContext` for shared geometry (e.g., all neighborhoods at the same zoom level share the same geometry, just different instances). Do NOT clear and rebuild graphics every frame — create `GraphicsContext` objects once and swap them when the neighborhood state changes (e.g., selected, hovered, owned)
- Call `.destroy()` on contexts when they are no longer needed

#### MultiPolygon Support

Some Detroit neighborhoods may be MultiPolygons (e.g., islands). Handle both:

```typescript
import type { Polygon, MultiPolygon } from 'geojson';

function drawFeatureGeometry(ctx: GraphicsContext, geom: Polygon | MultiPolygon): void {
  const rings = geom.type === 'Polygon'
    ? geom.coordinates
    : geom.coordinates.flat(); // MultiPolygon → flatten one level

  for (const ring of rings) {
    ctx.poly(projectCoordinates(ring), true);
  }
}
```

#### pixi-react v8 Integration

If using `@pixi/react` with React:

```tsx
import { useCallback, useMemo } from 'react';
import type { Graphics } from 'pixi.js';
import type { Feature, Polygon } from 'geojson';

interface NeighborhoodTileProps {
  feature: Feature<Polygon>;
  fillColor: number;
  selected: boolean;
  onClick: (name: string) => void;
}

export function NeighborhoodTile({ feature, fillColor, selected, onClick }: NeighborhoodTileProps) {
  const pts = useMemo(() => projectCoordinates(feature.geometry.coordinates[0]), [feature]);

  const draw = useCallback((g: Graphics) => {
    g.clear();
    g.poly(pts, true);
    g.fill({ color: selected ? 0xffcc00 : fillColor });
    g.stroke({ color: 0x000000, width: selected ? 3 : 1.5 });
  }, [pts, fillColor, selected]);

  return (
    <pixiGraphics
      draw={draw}
      eventMode="static"
      cursor="pointer"
      onclick={() => onClick(feature.properties?.name)}
    />
  );
}
```

Note: In pixi-react v8, PixiJS objects are prefixed with `pixi` as JSX components (`pixiGraphics`, `pixiContainer`, etc.).

### Pre-processing vs. Runtime Projection

**Recommendation: pre-process at build time.**

The GeoJSON file for ~50 neighborhoods is small (~200–400 KB raw). Pre-processing at build time gives you:
- Zero runtime dependency on d3-geo (tree-shake it out of the production bundle)
- Simpler runtime code (no projection math on the hot path)
- Ability to bake in simplification, coordinate rounding, and any custom transformations

Build script approach using a Node.js script (`scripts/preprocess-map.ts`):

```typescript
import { geoMercator } from 'd3-geo';
import neighborhoodGeoJSON from '../data/detroit-neighborhoods.geojson';
import fs from 'fs';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 960;
const PADDING = 40;

const projection = geoMercator().fitExtent(
  [[PADDING, PADDING], [CANVAS_WIDTH - PADDING, CANVAS_HEIGHT - PADDING]],
  neighborhoodGeoJSON
);

const processed = neighborhoodGeoJSON.features.map(feature => ({
  id: feature.properties.cartodb_id ?? feature.properties.nhood_id,
  name: feature.properties.name ?? feature.properties.nhood_name,
  // Pre-projected flat point arrays per ring, rounded to 1 decimal
  rings: feature.geometry.coordinates.map(ring =>
    ring.map(([lon, lat]) => {
      const [x, y] = projection([lon, lat])!;
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    })
  ),
}));

fs.writeFileSync(
  'src/data/detroit-map.json',
  JSON.stringify({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, neighborhoods: processed })
);
```

Add to `package.json`:
```json
"scripts": {
  "preprocess-map": "tsx scripts/preprocess-map.ts"
}
```

The output `detroit-map.json` is loaded at runtime; no projection library needed in the game bundle.

---

## 3. Detroit River and Water Features

### Getting the River Boundary

The Detroit River separates Michigan from Ontario. For the game, you need the river polygon as a water tile (or as a visual boundary that neighborhoods can't extend into).

**Option A: OpenStreetMap via Overpass API (recommended)**

The Detroit River is tagged in OSM as `waterway=river` (for the named waterway relation) and `natural=water` (for the water area polygon). Use Overpass turbo to fetch it:

```
[out:json][timeout:60];
(
  relation["name"="Detroit River"]["natural"="water"];
  relation["name"="Detroit River"]["type"="multipolygon"];
  way["name"="Detroit River"]["waterway"="river"];
);
out body;
>;
out skel qt;
```

Run at https://overpass-turbo.eu/ and export as GeoJSON. The result will be a MultiPolygon or set of ways representing the river boundary.

**Option B: US Census TIGER Water Features (public domain)**

The Census Bureau's TIGER/Line shapefiles include area hydrography (AREAWATER) for Wayne County, Michigan. These are higher-quality than OSM for this purpose and are **public domain**.

Download: https://www.census.gov/cgi-bin/geo/shapefiles/index.php
- Select "2024" → "Area Water" → State: Michigan → County: Wayne

Convert the downloaded shapefile to GeoJSON using mapshaper:
```bash
npx mapshaper tl_2024_26163_areawater.shp -filter "FULLNAME == 'Detroit River'" -o format=geojson detroit-river.geojson
```

Or use ogr2gdal if available:
```bash
ogr2ogr -f GeoJSON detroit-river.geojson tl_2024_26163_areawater.shp -where "FULLNAME='Detroit River'"
```

**Option C: Natural Earth (low detail, but simple)**

https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/ — river centerlines only, not polygons. Not useful for a water tile but OK as a decorative overlay.

### Rendering Water in PixiJS

Treat the river boundary the same as neighborhood polygons — project and draw with a water fill color. Render it on a layer behind the neighborhood tiles:

```typescript
const riverContext = new GraphicsContext();
// ... add river polygon points ...
riverContext.poly(riverPts, true).fill({ color: 0x2a6db5, alpha: 0.85 });
const riverSprite = new Graphics(riverContext);
mapContainer.addChildAt(riverSprite, 0); // behind neighborhoods
```

---

## 4. Recommended Architecture

### Summary Recommendation

| Decision | Recommendation |
|---|---|
| Data source | City of Detroit Open Data Portal (Master Plan Neighborhoods GeoJSON) |
| Projection | `d3.geoMercator().fitExtent(...)` at build time |
| Coordinate processing | Pre-process at build time, commit `detroit-map.json` |
| Rendering | PixiJS v8 `Graphics` + `GraphicsContext`, one per neighborhood |
| Click detection | Inverse projection + `@turf/boolean-point-in-polygon` |
| Simplification | mapshaper at build time, 10–20% reduction |
| Water | TIGER/Line Wayne County areawater shapefile (public domain) |

### Click Detection on Irregular Polygons

Two approaches:

**Approach A: PixiJS hit-testing (simplest)**

PixiJS's built-in hit-testing works on the bounding box by default. For irregular polygons, use a custom hit area:

```typescript
import { Polygon as PixiPolygon } from 'pixi.js';

const g = new Graphics(context);
g.hitArea = new PixiPolygon(flatPointArray);
g.eventMode = 'static';
g.on('pointerdown', () => handleNeighborhoodClick(feature));
```

PixiJS uses point-in-polygon internally for `Polygon` hit areas, so this is correct for convex and concave polygons. This is the preferred approach — no extra library needed.

**Approach B: Turf.js point-in-polygon (for geographic coordinates)**

If you need to check clicks in geographic (lon/lat) space (e.g., for the pre-processed map approach where you want to avoid inverse projection):

```typescript
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';

function getNeighborhoodAtScreenPoint(screenX: number, screenY: number): string | null {
  // Invert the projection to get geographic coordinates
  const [lon, lat] = projection.invert!([screenX, screenY])!;
  const clickPoint = turfPoint([lon, lat]);

  for (const feature of neighborhoodGeoJSON.features) {
    if (booleanPointInPolygon(clickPoint, feature)) {
      return feature.properties?.name;
    }
  }
  return null;
}
```

The `projection.invert()` method is available on all standard d3-geo projections. However, **Approach A is simpler** and avoids keeping the geographic data in memory at runtime.

### Simplifying the GeoJSON

Detroit neighborhood boundaries from the official portal have more vertices than needed for a game tile. Simplify at build time using mapshaper (topology-aware, so shared boundaries remain aligned):

```bash
# Install once
npm install -D mapshaper

# In package.json scripts:
# "simplify-map": "mapshaper data/detroit-neighborhoods-raw.geojson -simplify dp 15% keep-shapes -o format=geojson data/detroit-neighborhoods.geojson"
```

Or as a Node.js build step using the `mapshaper` API:

```typescript
import mapshaper from 'mapshaper';

await mapshaper.runCommands(
  '-i detroit-neighborhoods-raw.geojson ' +
  '-simplify dp 15% keep-shapes ' +
  '-o format=geojson detroit-neighborhoods.geojson'
);
```

15% simplification typically reduces file size by 70–80% with no visible quality loss at game scale. Use the web UI at https://mapshaper.org/ to preview before committing to a percentage.

### What Projection to Use

**Use Web Mercator (`geoMercator`) with `fitExtent`.**

Do not use Michigan State Plane (EPSG:3078, NAD83 Michigan Oblique Mercator) for this use case. State plane coordinates are in meters/feet relative to a local origin and require proj4 or similar to transform — unnecessary complexity.

Web Mercator with `fitExtent` automatically handles all of this:
- Scales to your canvas size
- Centers the data
- Handles the y-axis flip (GeoJSON north-up vs. canvas top-down)
- Requires no EPSG knowledge

The only reason to use state plane would be if you were computing real-world areas or distances in the game logic — for visual rendering, Web Mercator is correct.

---

## 5. Licensing

### City of Detroit Open Data Portal Data

- **License:** "No License Provided" — US city government data published on a public open data portal.
- **Practical status:** Freely usable for any purpose including commercial games. Credit "City of Detroit Department of Neighborhoods" in your credits or README. No legal attribution requirement is stated, but it's good practice.
- **Risk:** Very low. This is a government open data publication.

### click_that_hood GeoJSON (GitHub)

- **License:** MIT
- **Commercial use:** Yes, explicitly permitted. Include the MIT license notice.
- **Caveat:** The underlying data may originate from various sources with their own licenses; the MIT applies to the compiled file as published by Code for Germany.

### OpenStreetMap Data (ODbL)

- **License:** Open Database License (ODbL) v1.0
- **Commercial use:** Yes. ODbL permits commercial use including commercial game releases.
- **Requirements:**
  1. Attribute: include "© OpenStreetMap contributors" visibly in the game (credits screen, about screen, or corner of any map view)
  2. Include a link or reference to https://openstreetmap.org/copyright
  3. If you distribute a **modified version of the database itself** (e.g., a bundled GeoJSON with your changes), that modified database must also be ODbL-licensed. Your game code is separate — it is a "produced work" and can be under any license.
- **Key point:** A game that renders OSM-derived boundary polygons is a "produced work." Your game code (TypeScript, game logic, assets) is NOT subject to ODbL. Only the boundary data file itself must remain ODbL if redistributed separately.

### US Census TIGER/Line Data

- **License:** Public domain (US government work, 17 U.S.C. § 105)
- **Commercial use:** Unrestricted. No attribution required (though "U.S. Census Bureau" attribution is courteous).
- **Best option** if licensing is a concern — but TIGER doesn't have neighborhood names, only city limits and water features.

### Simplemaps.com

- **License:** Prohibits redistribution — **do not use for a game**. Their license requires you to not redistribute the data, which you'd be doing by bundling it in a distributed game.

### blackmad/neighborhoods (Zillow data)

- **License:** Unclear; data credited to Zillow, which has strict redistribution restrictions. **Do not use for a commercial game.**

---

## 6. Quick-Start Implementation Plan

1. **Download data:**
   - Go to https://data.detroitmi.gov/datasets/detroitmi::current-city-of-detroit-neighborhoods/about
   - Click "Download" → select "GeoJSON"
   - Save as `data/detroit-neighborhoods-raw.geojson`
   - Also download Wayne County area water from Census TIGER for the river

2. **Simplify:**
   ```bash
   npx mapshaper data/detroit-neighborhoods-raw.geojson \
     -simplify dp 15% keep-shapes \
     -o format=geojson data/detroit-neighborhoods.geojson
   ```

3. **Pre-process** (run `npm run preprocess-map`):
   - Project all coordinates to screen space at the target canvas resolution
   - Output `src/data/detroit-map.json` with pre-projected rings
   - Commit `detroit-map.json` to the repo

4. **Install dependencies:**
   ```bash
   npm install pixi.js @pixi/react
   npm install -D d3-geo @types/d3-geo mapshaper tsx
   # Optional for runtime click detection:
   npm install @turf/boolean-point-in-polygon @turf/helpers
   ```

5. **Render:** Load `detroit-map.json`, create one `Graphics` per neighborhood using `GraphicsContext`, set `hitArea = new Polygon(ring)` for click detection.

---

## Key URLs

| Resource | URL |
|---|---|
| Detroit neighborhoods (official) | https://data.detroitmi.gov/datasets/detroitmi::current-city-of-detroit-neighborhoods/about |
| Master Plan neighborhoods | https://data.detroitmi.gov/maps/master-plan-neighborhoods |
| click_that_hood detroit.geojson | https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/detroit.geojson |
| Census TIGER shapefiles | https://www.census.gov/cgi-bin/geo/shapefiles/index.php |
| Overpass turbo | https://overpass-turbo.eu/ |
| OSM license | https://www.openstreetmap.org/copyright |
| d3-geo projection docs | https://d3js.org/d3-geo/projection |
| PixiJS v8 Graphics | https://pixijs.com/8.x/guides/components/scene-objects/graphics |
| mapshaper (simplification) | https://mapshaper.org/ |
| @turf/boolean-point-in-polygon | https://turfjs.org/docs/api/booleanPointInPolygon |
