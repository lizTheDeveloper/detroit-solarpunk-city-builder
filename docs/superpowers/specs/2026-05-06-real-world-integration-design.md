# Real-World City Integration — Design Spec

The game board becomes the real city. Real streets, real data, real power structures, real news. The game teaches players how their city actually works — who holds power, what data exists (and what's hidden), and what they can do about it.

## Approach: Parallel Tracks

Two workstreams that converge:

1. **Map + Renderer** — MapLibre GL JS + OSM tiles + dark terminal theme + block-level interaction. Detroit hardcoded initially.
2. **City Ingestion Pipeline** — Agent swarm + city config schema + public data APIs. Outputs a universal city package.

They meet when the renderer consumes city packages instead of hardcoded Detroit data.

---

## 1. Map Renderer & Game Board

The map replaces the current abstract tile system as the primary game interface.

### Tech Stack

- **Renderer:** MapLibre GL JS — open-source, WebGL vector rendering, full custom styling via JSON style spec, no API key required
- **React wrapper:** `react-map-gl/maplibre` — provides `<Map>`, `<Source>`, `<Layer>` components, works with React 19 + Vite
- **Dev tiles:** OpenFreeMap — free vector tiles, no key, no signup, unlimited
- **Prod tiles:** Self-hosted Protomaps PMTiles — single static file per city (~10-50MB), served from own hosting, zero external dependencies, works offline
- **Bundle cost:** ~270KB gzipped (maplibre-gl + react-map-gl + pmtiles)

### Dark Terminal Aesthetic

Custom MapLibre style JSON:
- Background: near-black (#0a0a0a)
- Streets: green (#00ff41) with `line-blur` for CRT glow effect
- Buildings: dark fill (#111811) with faint green outlines (#1a3a1a)
- Water: dark blue-black (#0d1117)
- Labels: green monospace, uppercase
- Selected blocks: gold border (#f0c040) with box-shadow glow
- Data overlays: red/green based on block health metrics

Style can be authored visually in Maputnik, stored as a JSON file in the repo.

### Block-Level Interaction

City blocks derived from OSM street network at build time:
1. Fetch streets from Overpass API for the city's bounding box
2. Run `turf.polygonize()` to derive block polygons from the street grid
3. Save as static GeoJSON (~1-5MB per city)
4. Each block gets a unique ID mapping to game state

Building footprints from OSM loaded separately and associated with their containing block via `turf.booleanPointInPolygon()`.

### Interaction Model

- **City view** (default zoom) — all neighborhoods visible, color-coded by health/status. Click a neighborhood to zoom in.
- **Neighborhood view** (mid zoom) — individual blocks visible, streets labeled. Blocks colored by state: vacant = dim, active project = glowing green, contaminated = red pulse, crisis = amber throb.
- **Block view** (click a block) — data card showing: what's actually there (real OSM buildings, vacant lots, POIs), what public data says (contamination, census, flood risk), what projects could be placed here, and what data is missing.

### Project Placement

When a player builds a food forest or solar array, they pick which block. The block's real-world properties affect outcomes:
- A food forest on a former industrial site (EPA brownfield data) requires soil remediation first
- A transit hub works better on a block near existing GTFS routes
- Community solar on a high-vacancy block has more available rooftop area
- A block in a flood zone (FEMA data) affects infrastructure durability

### Migration from Current Tile System

The existing 5-neighborhood tile system (Brightmoor, Corktown, Eastern Market, Midtown, Riverfront) maps onto real neighborhood boundaries in Detroit. The current `Tile` type's properties (terrain, vacancy, ecologicalHealth, contamination, gentrificationPressure) become derived from real data layers rather than hardcoded starting values. The tile adjacency system becomes actual geographic adjacency.

Phase 1: Map renders alongside existing UI, neighborhoods clickable but gameplay unchanged.
Phase 2: Block-level data cards, projects placed on real blocks.
Phase 3: Full spatial mechanics — adjacency, contamination spread, real geography driving gameplay.

---

## 2. City Config Package

The universal format for a playable city. Detroit is the first instance.

### Schema

```
CityPackage {
  meta: {
    cityName: string
    state: string
    center: [lon, lat]
    zoomBounds: { min: number, max: number }
    generatedAt: ISO date
    version: number
  }

  geography: {
    neighborhoodBoundaries: GeoJSON FeatureCollection  // polygons
    blockPolygons: GeoJSON FeatureCollection             // derived from streets
    buildingFootprints: GeoJSON FeatureCollection        // from OSM
    terrainClassification: Map<blockId, TerrainType>     // urban-dense, vacant, industrial, waterfront, park
  }

  dataLayers: {
    [sourceKey: string]: {
      data: GeoJSON or JSON
      source: string          // API URL or dataset name
      sourceUrl: string       // link for player verification
      license: string
      fetchedAt: ISO date
      ttl: duration           // cache TTL
      available: boolean      // false = data gap (advocacy moment)
      gapReason?: string      // "City does not publish soil contamination data"
      advocacyTarget?: {      // who to pressure for this data
        name: string
        title: string
        agency: string
        contact?: string
      }
    }
  }

  newsSources: [{
    name: string
    url: string
    feedUrl: string
    feedType: "rss" | "json" | "scrape"
    locality: "neighborhood" | "city" | "metro" | "state" | "national"
    topics: string[]          // ["environment", "housing", "transit", ...]
    validated: boolean
    lastChecked: ISO date
    neighborhoodFocus?: string  // for hyperlocal sources
  }]

  characters: [{              // variable count per city
    id: string
    name: string
    role: string
    organizationInspiredBy: string    // real org
    organizationUrl: string
    neighborhood: string
    issues: string[]
    personality: object               // for LLM dialogue generation
    backstory: string
    pedagogicalIntent: string         // what does meeting this character teach?
  }]

  powerStructure: {
    mayor: { name, contact, since }
    council: [{
      name: string
      district: string
      neighborhoods: string[]         // which game neighborhoods they represent
      contact: string
      committees: string[]
      pedagogicalNote: string         // "Controls zoning decisions for this area"
    }]
    agencies: [{
      name: string                    // "Detroit Water and Sewerage Department"
      head: string
      responsibility: string          // "Sets water rates, manages infrastructure"
      relevantArcs: string[]          // ["water-pfas"]
      contact: string
      pedagogicalNote: string
    }]
    utilityCompanies: [{
      name: string                    // "DTE Energy"
      type: "electric" | "gas" | "water" | "telecom"
      ownership: "public" | "private" | "cooperative"
      contact: string
      pedagogicalNote: string         // "Private monopoly — rates set by MPSC"
    }]
  }

  crisisArcs: [{
    id: string
    name: string
    localDescription: string          // city-specific framing
    keywords: string[]                // for headline matching
    escalationThreshold: number
    localities: string[]
    connectedArcs: string[]           // systemic connections
    pedagogicalChain: string          // "Water crisis → infrastructure disinvestment → population loss → tax base erosion"
    realExamples: string[]            // links to real incidents
  }]

  calibration: {
    cityBudget: { real: number, game: number, source: string }
    medianIncome: { value: number, source: string }
    vacancyRate: { value: number, source: string }
    treeCanopy: { current: number, target: number, source: string }
    foodAccess: { percentLacking: number, source: string }
    population: { value: number, source: string }
  }

  sourceRegistry: [{                 // every data source cited
    key: string
    name: string
    url: string
    fetchDate: ISO date
    license: string
    notes: string
  }]
}
```

### Key Principle

A city package is a snapshot that gets richer over time. The initial agent-generated package is good enough to play. Community submissions and periodic re-fetches improve it. Missing data is explicitly marked with `available: false` and includes who to pressure for transparency.

---

## 3. Public Data Layers

### Universal Stack (any US city, zero customization)

| Layer | Source | API | Granularity | TTL | Free |
|-------|--------|-----|-------------|-----|------|
| Demographics | Census ACS 5-year | `api.census.gov/data/2023/acs/acs5` | Block group | 1 year | Yes (500/day no key, unlimited with free key) |
| Air quality | AirNow | `airnowapi.org/aq/` | Metro area | Per game turn | Yes (free key, 500 req/hr) |
| Environmental hazards | EPA Envirofacts + ECHO | `data.epa.gov/efservice/`, `echo.epa.gov/` | Site-level | 1 month | Yes, no auth |
| Flood risk | FEMA NFHL | `hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer` | Parcel polygons | 1 year | Yes, no auth |
| Transit routes | GTFS via Mobility Database | `mobilitydatabase.org` | Stop-level | 3 months | Yes, open standard |
| Community assets | OSM Overpass | `overpass-api.de/api/interpreter` | Point/polygon | 1 month | Yes |

### City-Specific Layers (agent-discovered per city)

- **Land bank / vacancy** — Detroit: DLBA via `data.detroitmi.gov` (~100K parcels). Other cities: check for Socrata/ArcGIS open data portals.
- **Blight violations, building permits** — city open data portals where available
- **Parcel ownership + tax assessment** — county assessor data, varies by jurisdiction
- **Zoning** — no national standard yet (National Zoning Atlas may publish API in 2026). City GIS portals.
- **Tree canopy** — NLCD raster data (30m resolution, all CONUS), pre-processed to neighborhood averages
- **Food access** — USDA Food Access Research Atlas (bulk download, census tract level)
- **Environmental justice** — EJScreen was taken offline Feb 2025, plan for unavailability. Third-party mirrors may exist.

### Data Gaps as Gameplay

When a data layer has `available: false` for a city:
- The map shows the gap visually (hatched overlay, "NO DATA" label)
- The block data card explains what's missing and why it matters
- The `advocacyTarget` field shows who has the power to publish this data
- A "demand transparency" civic action could be available as a game mechanic
- The game literally tells you: "Your city doesn't monitor soil contamination here. Here's who to call."

### Caching Strategy

All data fetched at city initialization, stored in IndexedDB:
- Air quality: per game turn (monthly)
- Census: 1 year (ACS releases annually in December)
- EPA sites: 1 month
- Flood zones: 1 year (very stable)
- Transit GTFS: 3 months
- OSM community assets: 1 month
- City-specific data: varies, default 1 month

---

## 4. City Ingestion Pipeline — Agent Swarm

When a new city is requested, six agents run in parallel. Each agent has an explicit pedagogical mandate — they're not scrapers, they're curriculum designers who output JSON.

### Agent 1: Geography

**Task:** Pull OSM data, derive neighborhoods and blocks, classify terrain.

**Pedagogical intent:** "Help the player understand why neighborhoods are different. A neighborhood next to a freeway has different health outcomes than one next to a park. Look for the historical infrastructure decisions — redlining, highway placement, industrial zoning — that shaped the current map."

**Process:**
1. Query Overpass API for city boundary, streets, buildings, land use
2. Source neighborhood boundaries from city GIS portal or Wikipedia/Wikidata
3. Polygonize street network into block geometries via Turf.js
4. Classify blocks by terrain type from OSM `landuse` and `building` tags
5. Identify key geographic features (rivers, freeways, rail lines, parks) that define neighborhood character

**Output:** `geography` section of city package

### Agent 2: Public Data

**Task:** Hit universal APIs, discover city-specific data portals, flag gaps.

**Pedagogical intent:** "Help the player understand what their government measures and what it ignores. The presence of data — air quality monitoring — means someone fought for it. The absence of data — no soil testing in a former industrial zone — means nobody's watching. Every data gap is a story about priorities."

**Process:**
1. Query all 6 universal APIs with city bounding box
2. Search for city open data portal (Socrata, ArcGIS Hub patterns)
3. Inventory available datasets vs. expected datasets
4. For each gap, identify the responsible agency and contact info
5. Write `gapReason` explaining why this data matters

**Output:** `dataLayers` section of city package

### Agent 3: News Discovery

**Task:** Find local media sources, validate feeds, assess coverage.

**Pedagogical intent:** "Help the player understand whose stories get told. A city with only one newspaper and no neighborhood blogs has a media gap. Ethnic media, community radio, and hyperlocal blogs represent voices the mainstream misses. News deserts are power vacuums."

**Process:**
1. Search for: daily newspaper, alt-weekly, neighborhood blogs, community radio, local TV news, university papers, ethnic media, topic-specific outlets (food, music, environment, housing), community calendars, city council live streams
2. Check LION Publishers directory, INN member list, local subreddit sidebars
3. Validate each source: has RSS/JSON feed? Published in last 30 days? Relevant content?
4. Assess coverage: which neighborhoods have dedicated coverage? Which are news deserts?
5. Flag media gaps as explicitly as data gaps

**Output:** `newsSources` section of city package

### Agent 4: Characters

**Task:** Research real organizations and movements, generate characters inspired by them.

**Pedagogical intent:** "Help the player understand that real people are already doing this work. Every character is inspired by a real organization or movement. The player should leave the game knowing these organizations exist and wanting to support them. Find the people who are already building the solarpunk future in this city."

**Process:**
1. Research real community organizations: urban farms, community land trusts, solar co-ops, mutual aid networks, maker spaces, housing advocacy groups, environmental justice orgs, transit advocacy, food sovereignty projects
2. Identify key roles and archetypes present in this city's landscape
3. Generate characters (variable count) inspired by real orgs — not depicting real individuals
4. Link each character to real organizations with URLs
5. Write `pedagogicalIntent` for each: what does meeting this person teach?

**Output:** `characters` section of city package

### Agent 5: Power Structure

**Task:** Map the real government and institutional power.

**Pedagogical intent:** "Help the player understand how decisions actually get made. Who approves a rezoning? Who controls the water rates? Who decides where the bus routes go? The player should leave knowing exactly who to call and what to say. Democracy is a skill — this game teaches it."

**Process:**
1. Identify: mayor, city council members (with district boundaries), key agency heads
2. Map agencies to game-relevant issues: water department → water arc, planning department → housing arc, environmental department → contamination
3. Identify utility companies and their ownership structure (public/private/co-op)
4. Find contact information (public record)
5. Write `pedagogicalNote` for each: what power does this person hold? What decisions do they control?
6. Link council districts to game neighborhoods so players know who represents them

**Output:** `powerStructure` section of city package

### Agent 6: Crisis Arcs

**Task:** Analyze the city's real issues and generate city-specific crisis arc configurations.

**Pedagogical intent:** "Help the player understand that crises are systemic, not random. Show the chain of causes, not just symptoms. Detroit's water crisis connects to infrastructure disinvestment connects to population loss connects to tax base erosion. Every city has its own version of these chains — find them."

**Process:**
1. Analyze EPA data, news landscape, Census demographics to identify the city's real tensions
2. Map to arc types: what's this city's version of energy-grid, water-pfas, housing-speculation, infrastructure-debt, phosphorus-food? Some cities may have arcs that don't map to Detroit's five — that's fine.
3. Generate city-specific keywords and headline matching patterns
4. Set escalation thresholds based on local news volume
5. Document `pedagogicalChain` for each arc — the systemic connections
6. Link to real examples (news articles, incidents) that illustrate the arc

**Output:** `crisisArcs` section of city package

### Pre-Built Cities

Ship with agent-generated + human-reviewed configs for ~10 cities with rich open data and organizing histories: Detroit, Chicago, Philadelphia, Oakland, Cleveland, Baltimore, Pittsburgh, St. Louis, Milwaukee, Newark.

### Community Submissions

- "Suggest a source" button for news feeds — agent validates and adds
- "Add your city" flow — triggers agent swarm, produces draft config, community reviews before going live
- Corrections flow — players flag inaccurate data, outdated contacts, dead feeds

---

## 5. Local News Pipeline

Extends the existing pipeline (theblue.report + memeorandum, hourly fetch, daily JSON storage).

### Feed Processing Priority

1. **RSS/Atom** — ~60-90% of local papers have it depending on type. Existing parser handles this.
2. **JSON feeds** — like theblue.report. Already supported.
3. **Google News geo RSS** — `https://news.google.com/rss/headlines/section/geo/{City}` acts as a meta-feed, surfacing active outlets automatically. Also usable as a fallback feed for outlets without their own RSS.
4. **Structured scraping** — last resort for sites without feeds. LLM generates per-source CSS selectors for headline + link + date extraction.

### Agent Discovery Flow

1. Query Google News geo RSS for the city — parse `<source>` elements to auto-discover active outlets
2. For each discovered domain, probe common feed paths: `/feed/`, `/rss`, `/rss.xml`, `/arc/outboundfeeds/rss/`
3. Cross-reference against LION Publishers (480+ independent outlets) and INN/FindYourNews (500 nonprofit newsrooms)
4. Check FeedSpot for `{city} news RSS feeds`
5. Check `reddit.com/r/{cityname}` existence and subscriber count — all subreddits have RSS at `/.rss`
6. Search for ethnic media via CUNY Center for Community Media directories
7. Validate each source: recent posts within 30 days, relevant content, not paywalled

### Verified Detroit Sources (ready to add to pipeline)

| Outlet | Type | Feed URL |
|--------|------|----------|
| BridgeDetroit | Nonprofit civic | `https://www.bridgedetroit.com/feed/` |
| Planet Detroit | Environmental | `https://planetdetroit.org/feed/` |
| Outlier Media | Service journalism | `https://outliermedia.org/feed/` |
| Metro Times | Alt-weekly | `https://www.metrotimes.com/detroit/Rss.xml` |
| Detroit News | Daily paper | `http://rssfeeds.detroitnews.com/detroit/home` |
| ClickOnDetroit (WDIV) | TV news | `https://www.clickondetroit.com/arc/outboundfeeds/rss/category/news/` |
| FOX 2 Detroit | TV news | `https://www.fox2detroit.com/rss/category/local-news` |
| Model D | Development/community | `https://feeds.feedburner.com/ModelDMedia` |
| Daily Detroit | Hyperlocal | `https://feeds.feedburner.com/DailyDetroit` |
| Chalkbeat Detroit | Education | `https://www.chalkbeat.org/arc/outboundfeeds/rss/` |
| Google News Detroit | Meta-feed | `https://news.google.com/rss/headlines/section/geo/Detroit` |
| r/detroit | Community signal | `https://www.reddit.com/r/detroit/.rss` |

### Legal Considerations

- **Headlines + links only** — headline text alone is generally too short to be copyrightable. Facts cannot be copyrighted.
- **RSS = explicit consent to aggregate** — publishers who offer RSS intend for it.
- **Respect robots.txt** — check before any scraping.
- **Existing bot ID is good practice** — `User-Agent: DetroitSolarpunkCityBuilder/1.0 (game news pipeline)`
- **Don't reproduce article body text** — headline + link + source attribution only.
- **Prioritize nonprofit/independent outlets** — they need the traffic more than legacy media.

### Classification Pipeline

Currently scaffolded but empty (`classified: false`, `arcs: []` on all headlines). This fills it:

1. Each headline batch gets classified via LLM:
   - **Arc assignment:** which crisis arc(s) does it relate to?
   - **Severity:** 1-3 scale
   - **Locality:** neighborhood / city / state / national / international
   - **Neighborhood tagging:** if the headline mentions a specific area, tag it for map pinning
   - **Pedagogical hook:** what does this headline teach about how the city works?

2. Classified headlines drive arc state transitions via the existing state machine
3. Headlines tagged with neighborhoods get pinned to those blocks on the map — "The Wire" becomes spatial
4. Headline classification confidence scores filter low-quality matches

### News Deserts as Gameplay

When no local media covers a neighborhood:
- The map shows a "media desert" overlay
- "No neighborhood-level news coverage for this area. The stories here aren't being told."
- This is a real problem — and the game surfaces it just like data gaps

### Community News Submissions

- "Suggest a source" button in HeadlinesPanel
- Player submits URL → agent validates (has content, recent posts, usable feed or scrapeable)
- Approved sources added to city's feed list
- The game gets smarter as locals play it

---

## 6. Migration Path

### Phase 1: Map as Companion (low risk)
- Add MapLibre map panel alongside existing UI
- Detroit neighborhoods overlaid on real geography
- Clicking a neighborhood on the map selects it in the existing tile system (the existing `Tile` type and `tiles` array in game state remain the source of truth for gameplay)
- Map is read-only visualization — no gameplay changes
- Existing panels (Conversation, Proposal, Tension) continue to work unchanged

### Phase 2: Block-Level Data (medium risk)
- Block polygons loaded, clickable, showing real data cards
- Each block belongs to a neighborhood — the `Tile` type gains a `blocks: BlockId[]` field linking it to its geographic children
- Projects can be placed on specific blocks (but still aggregate effects to the parent `Tile` for existing game systems)
- News headlines pinned to blocks on the map
- Power structure panel shows real officials for the selected area

### Phase 3: Full Spatial Mechanics (high risk, high reward)
- Block adjacency drives gameplay (contamination spreads, transit connectivity matters)
- Project effects vary by block properties (real EPA/Census/flood data)
- The tile system is fully replaced by geographic blocks
- City ingestion pipeline produces new city packages

### Phase 4: Multi-City + Community
- "Add your city" flow with agent swarm
- Community review and correction system
- Pre-built city packages for top 10 cities
- Leaderboards and sharing across cities
