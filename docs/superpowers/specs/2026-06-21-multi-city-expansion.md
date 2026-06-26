# Multi-City Expansion Plan

**Date:** 2026-06-21  
**Status:** Draft  
**Author:** annhoward

## Summary

The Detroit solarpunk city builder is currently a single-city experience. This plan outlines how to expand support to multiple cities while maintaining the real-world civic data integrity that makes the game valuable.

**Current state:**
- Detroit hardcoded as `detroit.ts` + `CityPackage` in `app/src/city/detroit.ts`
- Civic data updater (`scripts/update-civic-data.py`) is Detroit-specific
- Beyond-the-map spec already defines multi-city cooperation mechanics (regional projects, city relationships)
- `CityPackage` type exists but only Detroit implementation

**Goal:**
- Support arbitrary US cities with the same civic-integrity model
- Each city has real mayor, council, agencies, calibration data
- Civic data updaters can be extended per-city or generalized
- City selection UI for players
- Regional cooperation between cities (already specced in beyond-the-map)

---

## Phase 1: City Abstraction Layer

### 1.1 City Registry System

**Problem:** Detroit is hardcoded. Need to support multiple cities.

**Solution:**
- Create `app/src/city/registry.ts` — loads city packages dynamically
- Each city stored as `app/src/city/{city-slug}/package.ts` + supporting data
- Detroit becomes `app/src/city/detroit/package.ts` (refactor from current location)
- City packages export `CityPackage` interface (already defined)

**Deliverables:**
- [ ] `app/src/city/registry.ts` — `getCity(slug)`, `listCities()`, `loadCityPackage(slug)`
- [ ] Move `detroit.ts` → `detroit/package.ts`
- [ ] `app/src/city/detroit/index.ts` — barrel export
- [ ] Update all imports from `./city/detroit` → use registry
- [ ] Tests: `app/src/city/registry.test.ts`

**Architecture:**
```typescript
// app/src/city/registry.ts
import { detroitPackage } from './detroit/package';

const cityRegistry: Record<string, CityPackage> = {
  detroit: detroitPackage,
  // future: minneapolis: minneapolisPackage,
};

export function getCity(slug: string): CityPackage | undefined {
  return cityRegistry[slug];
}

export function listCities(): Array<{ slug: string; meta: CityMeta }> {
  return Object.entries(cityRegistry).map(([slug, pkg]) => ({
    slug,
    meta: pkg.meta,
  }));
}
```

### 1.2 City Selection UI

**Problem:** Players can only play Detroit. Need to choose a city.

**Solution:**
- Main menu → "Play Campaign" → City selection screen
- Each city card shows: name, state, population, starting conditions, difficulty indicator
- City cards pull from `listCities()` registry

**Deliverables:**
- [ ] `app/src/ui/screens/CitySelectionScreen.tsx`
- [ ] `app/src/ui/components/CityCard.tsx`
- [ ] Wire into main menu: `app/src/ui/screens/MainMenu.tsx`
- [ ] Store selected city in game state: `app/src/state/types.ts` → `selectedCity: string`
- [ ] Load city package on game start: `app/src/state/create-game.ts`

**UI/UX:**
```
┌─────────────────────────────────────────────┐
│  Select Your City                            │
│                                              │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ Detroit, MI  │  │ Coming Soon  │         │
│  │ Pop: 639K    │  │ Minneapolis? │         │
│  │ ▰▰▰▰▱ 72%    │  │ Vote for it! │         │
│  │ [Play]       │  │              │         │
│  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────┘
```

### 1.3 Game Initialization Refactor

**Problem:** Game init assumes Detroit values from `detroit.ts` constants.

**Solution:**
- `createGame(citySlug: string)` loads city package
- Pass city calibration to initial game state (budget, population, vacancy, etc.)
- Replace hardcoded Detroit references with city package values

**Deliverables:**
- [ ] Refactor `app/src/state/create-game.ts` to accept `citySlug`
- [ ] Refactor `app/src/state/game-state.ts` to initialize from city package
- [ ] Replace `import { detroit } from './detroit'` with `getCity(slug)`
- [ ] Update map panel to use city package geography
- [ ] Tests: verify game initializes correctly for city packages

**Key changes:**
```typescript
// Before (hardcoded):
import { detroit } from './detroit';
function createGame() {
  return { budget: detroit.calibration.cityBudget.game, ... };
}

// After (dynamic):
import { getCity } from './registry';
function createGame(citySlug: string = 'detroit') {
  const city = getCity(citySlug);
  return { budget: city.calibration.cityBudget.game, ... };
}
```

---

## Phase 2: Generic Civic Data Updater

### 2.1 Multi-City Updater Architecture

**Problem:** `update-civic-data.py` is Detroit-specific. Need to support arbitrary cities.

**Solution:**
- Refactor updater into a framework: `scripts/civic-data-update/`
- Each city has a config: `scripts/civic-data-update/cities/detroit.yaml`
- Common logic: Wikidata mayor query, Wikipedia election scraping, website scraping
- City-specific overrides for data sources, selectors, entity IDs

**Deliverables:**
- [ ] `scripts/civic-data-update/updater.py` — generic updater framework
- [ ] `scripts/civic-data-update/sources/wikidata.py` — Wikidata layer (shared)
- [ ] `scripts/civic-data-update/sources/wikipedia.py` — Wikipedia layer (shared)
- [ ] `scripts/civic-data-update/sources/scraper.py` — Generic scraper (shared)
- [ ] `scripts/civic-data-update/cities/detroit.yaml` — Detroit config
- [ ] `scripts/civic-data-update/cities/{new-city}.yaml` — template for new cities
- [ ] Update `update-civic-data.py` to use new framework (backward compat)

**City config format:**
```yaml
# scripts/civic-data-update/cities/detroit.yaml
city:
  name: Detroit
  state: MI
  slug: detroit

wikidata:
  mayor_position: Q14916519  # Verified
  city_council: Q5265877  # Organization
  known_members:
    - name: James Tate
      district: 1
      wikidata_id: Q531155
    # ...

scraper:
  url: https://detroitmi.gov/government/city-council
  profile_slugs:
    - path: /government/city-council/city-council-president-district-1
      name: James Tate
      district: 1
    - path: /government/city-council/mary-waters
      name: Mary Waters
      district: 0
  selectors:
    bio_section: "h2:contains('Council Member Bio')"
    name_from_h1: true

wikipedia:
  mayor_election: 2025_Detroit_mayoral_election
  mayors_list: List_of_mayors_of_Detroit
```

### 2.2 Wikidata Query Generalization

**Problem:** Mayor query uses Detroit-specific QID.

**Solution:**
- Generic query: "Find current holder of position Q{mayor_position}"
- Works for any city if Wikidata has the position entity
- Fallback to scraper if position not on Wikidata

**Implementation:**
```python
def query_mayor(position_qid: str) -> Optional[dict]:
    """Generic Wikidata mayor query."""
    sparql = f"""
    SELECT ?person ?personLabel ?start ?end
    WHERE {{
      ?person p:P39 ?stmt .
      ?stmt ps:P39 wd:{position_qid} .
      ?stmt pq:P580 ?start .
      OPTIONAL {{ ?stmt pq:P582 ?end }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    ORDER BY DESC(?start)
    LIMIT 3
    """
    # ... execute and parse
```

**Coverage research needed:**
- [ ] Survey which major US cities have Wikidata mayor positions
- [ ] Identify fallback scraper patterns for cities without Wikidata
- [ ] Document coverage: "Cities X, Y, Z have good Wikidata. Cities A, B, C need scrapers."

### 2.3 City Discovery Tooling

**Problem:** Adding a new city requires manual research.

**Solution:**
- `scripts/civic-data-update/discover-city.py {city-name}` — scaffolding tool
- Prompts for: city name, state, government website URL
- Scrapes the city council page structure
- Generates stub config: `cities/{city-slug}.yaml`
- Outputs: "Found {n} council member profiles at {urls}. Verify and customize."

**Deliverables:**
- [ ] `scripts/civic-data-update/discover-city.py`
- [ ] Prompt user for: city name, government website, known officials
- [ ] Auto-detect: council page URL, profile page pattern
- [ ] Generate stub config with comments
- [ ] Document: "How to add a new city"

---

## Phase 3: City Package Generation Pipeline

### 3.1 Package Builder

**Problem:** Creating `package.ts` for a new city is manual work.

**Solution:**
- `scripts/generate-city-package.py {city-slug}` — builds `package.ts`
- Reads city config YAML + scraped data
- Generates TypeScript `package.ts` exporting `CityPackage`
- Includes: calibration data, geography (if GeoJSON available), news sources

**Deliverables:**
- [ ] `scripts/generate-city-package.py`
- [ ] Reads `scripts/civic-data-update/cities/{city}.yaml`
- [ ] Reads scraped data (civic-data-updater output)
- [ ] Generates `app/src/city/{city-slug}/package.ts`
- [ ] Template: `scripts/generate-city-package/templates/package.ts.tmpl`

**Calibration data sources:**
- US Census ACS 5-year → population, median income, vacancy rate
- USDA Food Access Research Atlas → food access percentage
- EPA Envirofacts → contamination sites
- OpenStreetMap → neighborhood boundaries (if available)

**Geography:**
- Many cities have neighborhood boundary GeoJSON (OpenStreetMap, city open data portals)
- Block-level polygons harder to find (city assessors, parcel data)
- Fallback: use neighborhood boundaries only (block-level is nice-to-have)

### 3.2 City Package Validation

**Problem:** How do we know a generated package is valid?

**Solution:**
- `validateCityPackage(pkg: CityPackage): string[]` — already exists in types
- Extend with stricter validation
- Add CI check: `npm run validate-city-packages`

**Validation rules:**
- [ ] `meta.cityName` non-empty
- [ ] `meta.center` is [lon, lat] tuple
- [ ] `calibration.cityBudget.game` is positive number
- [ ] `powerStructure.mayor.name` non-empty
- [ ] `geography.neighborhoodBoundaries` is valid GeoJSON
- [ ] All required fields present

**Deliverables:**
- [ ] Extend `app/src/city/types.ts` validation function
- [ ] `scripts/validate-city-packages.ts` — CLI validator
- [ ] Wire into CI: `.github/workflows/validate-city-packages.yml`
- [ ] Tests: `app/src/city/types.test.ts`

---

## Phase 4: First Expansion City

### 4.1 City Selection: Minneapolis

**Why Minneapolis?**
- Large enough to be interesting (429K pop)
- Strong solarpunk relevance (food sovereignty, cooperatives, climate resilience)
- Rich open data ecosystem (Minneapolis Open Data portal)
- Good Wikidata coverage (mayor, council members)
- Geographic proximity to Detroit (Great Lakes region)
- Existing beyond-the-map spec references "Minneapolis-St. Paul"

**Research needed:**
- [ ] Identify Minneapolis mayor + city council (Wikidata + website)
- [ ] Find neighborhood boundaries GeoJSON
- [ ] Gather calibration data (Census, USDA, EPA)
- [ ] Identify local news sources (MinnPost, Minneapolis Star Tribune)
- [ ] Research local crisis arcs (redlining, lead pipes, food deserts)

**Deliverables:**
- [ ] `scripts/civic-data-update/cities/minneapolis.yaml`
- [ ] `app/src/city/minneapolis/package.ts`
- [ ] Local characters (min 3 real people inspired by local orgs)
- [ ] Local news sources (min 5 RSS feeds)
- [ ] Local crisis arcs (min 3)
- [ ] Test game with Minneapolis package

### 4.2 Minneapolis Civic Data Updater

**Problem:** Detroit updater doesn't work for Minneapolis.

**Solution:**
- Research Minneapolis government structure (mayor-council vs council-manager)
- Find Wikidata positions (mayor, council members)
- Build city-specific scraper for minneapolismn.gov
- Test: "Run updater, verify mayor is Jacob Frey (as of 2026)"

**Deliverables:**
- [ ] Research: Minneapolis government structure
- [ ] `scripts/civic-data-update/cities/minneapolis.yaml`
- [ ] Wikidata query: `Q...` (mayor position)
- [ ] Scraper: minneapolismn.gov city council page
- [ ] GitHub Action: `update-civic-data-minneapolis.yml`
- [ ] Documentation: "Minneapolis civic data sources"

---

## Phase 5: Multi-City Gameplay

### 5.1 Regional Cooperation (Already Specced)

**Status:** Beyond-the-map spec already defines:
- City relationships (Neutral → Cooperative → Allied)
- Regional projects (Great Lakes Watershed, Wildlife Corridor, Food Sovereignty Network)
- Continental goals (cooperative win conditions)
- Resource transfers between cities

**Implementation:**
- [ ] Build on beyond-the-map spec
- [ ] Each AI city is a separate `GameState` instance
- [ ] Regional projects require multiple city `GameState` coordination
- [ ] UI: "Regional Map" showing city relationships and project progress

### 5.2 City Comparison & Learning Transfer

**Problem:** Players learn Detroit mechanics. How do they transfer to new cities?

**Solution:**
- "City comparison" screen: Detroit vs Minneapolis metrics
- Highlight shared mechanics: both have food sovereignty, housing speculation arcs
- Highlight city-specific differences: different government structure, different utility companies
- "What you learned" narrative: "In Detroit, you mastered community land trusts. Minneapolis needs them too."

**Deliverables:**
- [ ] `app/src/ui/screens/CityComparisonScreen.tsx`
- [ ] Shared mechanics documentation
- [ ] City-specific onboarding: "In Minneapolis, the mayor has more power" or "Council is weaker here"
- [ ] Achievement system: "Played Detroit" → unlocks Minneapolis

---

## Phase 6: Community-Generated Cities

### 6.1 City Contribution Framework

**Problem:** Can't manually add every city. Need community to contribute.

**Solution:**
- Open-source city package format
- Community contribution guide: "How to add your city"
- Submission process: PR with city package + validation
- Review: automated validation + manual review of civic data accuracy

**Deliverables:**
- [ ] `docs/CITY_CONTRIBUTION_GUIDE.md`
- [ ] Template: `templates/new-city-package/`
- [ ] Validation script: `scripts/validate-city-contribution.ts`
- [ ] GitHub issue template: "Add {city} to the game"
- [ ] PR review process documented in `CONTRIBUTING.md`

### 6.2 City Data Quality Assurance

**Problem:** Community contributions may have inaccurate civic data.

**Solution:**
- Mandatory civic data sources: must link to official government website
- Automated fact-checking: cross-reference Wikidata + official sources
- Review checklist: "Mayor is current as of {date}? Council has {n} members?"
- City package includes `generatedAt` timestamp → stale detection

**Deliverables:**
- [ ] `scripts/city-qa-fact-check.ts` — automated fact-checker
- [ ] Review checklist template
- [ ] Staleness detection: "City package generated {date}, may need update"
- [ ] Integration with civic-data-updater: community cities can use same updater

---

## Timeline & Priorities

**Immediate (this sprint):**
1. City abstraction layer (Phase 1.1-1.3) — refactor Detroit into registry
2. City selection UI (Phase 1.2) — let players choose Detroit or "Coming Soon"

**Next sprint:**
3. Generic civic data updater (Phase 2.1-2.2) — refactor Detroit updater
4. First expansion city research (Phase 4.1) — Minneapolis deep dive

**Future sprints:**
5. City package generator (Phase 3.1-3.2) — automate package creation
6. Minneapolis implementation (Phase 4.1-4.2) — first new city
7. Multi-city gameplay (Phase 5.1-5.2) — regional cooperation
8. Community cities (Phase 6.1-6.2) — open-source contribution

---

## Risks & Mitigations

**Risk 1: Wikidata coverage is spotty**
- Not all cities have mayor positions on Wikidata
- Mitigation: Build robust scraper fallbacks, document coverage

**Risk 2: City government websites change**
- Scrapers break when CMS updates
- Mitigation: Generic scraper framework with city-specific selectors, automated monitoring

**Risk 3: Geography data is hard to find**
- Not all cities publish neighborhood boundary GeoJSON
- Mitigation: Use OpenStreetMap as fallback, allow city packages without block-level polygons

**Risk 4: Civic data accuracy**
- Community contributions may be inaccurate
- Mitigation: Mandatory source links, automated fact-checking, review process

**Risk 5: Scope creep**
- Multi-city is a huge feature
- Mitigation: Phase 1 (city abstraction) is complete, stop there if needed
- Don't build Minneapolis until city abstraction is solid

---

## Success Metrics

**Phase 1 complete:**
- Detroit plays identically (no regression)
- Registry can load multiple cities (even if only Detroit exists)
- City selection UI works (shows Detroit + placeholders)

**Phase 2 complete:**
- Updater framework supports 2+ cities
- Minneapolis updater drafted (even if not fully working)

**Phase 3 complete:**
- Package generator creates valid Minneapolis package
- CI validates both Detroit + Minneapolis packages

**Phase 4 complete:**
- Minneapolis is playable
- Civic data updater keeps Minneapolis mayor/council current
- Regional cooperation between Detroit + Minneapolis works

**Phase 6 complete:**
- At least 1 community-contributed city accepted
- Contribution guide is clear and used by others
- Automated QA catches inaccurate civic data

---

## Open Questions

**Should we support international cities?**
- Current spec is US-only (US Census, US government websites)
- International cities need different data sources (Wikipedia, Wikidata, city websites)
- Decision: Phase 1-5 are US-only. Phase 6 (community cities) can include international if someone contributes.

**Should cities share mechanics?**
- Detroit has 12 arcs, Minneapolis might need different arcs
- Decision: Shared mechanics framework (housing speculation, food sovereignty) but city-specific implementations. Core arcs are universal, local arcs are optional.

**Should city packages be versioned?**
- Detroit v1 might have different calibration than Detroit v2
- Decision: Yes, city packages have `version` field. Breaking changes increment version. Old game saves tied to old version.

**How do we handle city-specific government structures?**
- Detroit: Mayor + 9-member council (7 district + 2 at-large)
- Minneapolis: Mayor + 13-member council (all at-large, but with wards)
- Decision: `powerStructure.council` is flexible array. Each city defines its own structure. Game mechanics work with any council size/structure.

---

## Next Steps

1. **Review this plan** — get feedback on scope, priorities, timeline
2. **Implement Phase 1 (City Abstraction Layer)** — refactor Detroit into registry
3. **Test Phase 1** — verify Detroit plays identically, registry works
4. **Implement City Selection UI** — let players choose Detroit
5. **Stop** — evaluate if this is enough for now, or continue to Phase 2

**Decision point after Phase 1:**
- If city abstraction is clean and extensible → continue to Phase 2 (Minneapolis research)
- If city abstraction is messy or scope creep detected → ship Phase 1 only, revisit later

---

## Appendix: Existing Architecture

**Current Detroit implementation:**
- `app/src/city/detroit.ts` — hardcodes `CityPackage` for Detroit
- `app/src/city/types.ts` — defines `CityPackage` interface
- `scripts/update-civic-data.py` — Detroit-specific civic data updater
- `app/src/state/game-state.ts` — loads Detroit package on init

**What already supports multi-city:**
- `CityPackage` type is generic (can represent any city)
- Beyond-the-map spec defines regional cooperation mechanics
- Civic data updater framework is extensible (Python + YAML configs)

**What needs refactoring:**
- `detroit.ts` → `detroit/package.ts` (move into registry structure)
- `game-state.ts` → load from registry instead of hardcoded import
- `update-civic-data.py` → generic updater with city config files

**What needs building:**
- City registry (`app/src/city/registry.ts`)
- City selection UI
- Generic civic data updater framework
- City package generator
- Minneapolis city package
