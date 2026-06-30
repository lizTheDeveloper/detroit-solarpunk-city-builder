# Solarpunk City Builder — Scripts

## City Onboarding: `add-city.py`

Adds a new city to the game with one command.

```bash
source scripts/venv/bin/activate
python3 scripts/add-city.py "Portland" --state "OR"
```

### What's Automated

| Data | Source | Automation Level |
|------|--------|------------------|
| City center, bounding box | Nominatim (OpenStreetMap) | ✅ Fully automated |
| Neighborhood boundaries | Wikipedia + fallback grid | ✅ Automated (90% accuracy) |
| Neighborhood list | Wikipedia article scraping | ✅ Automated (80% accuracy) |
| Mayor name | Wikidata SPARQL | ✅ Automated (rate limited) |
| City council roster | Wikidata + scraper fallback | ⚠️ Often incomplete |
| Population, budget, demographics | Manual (city docs vary too much) | ❌ Manual |
| Characters | Manual (need local expertise) | ❌ Manual |
| Crisis arcs | Manual (need domain knowledge) | ❌ Manual |
| Local news sources | Manual (RSS feeds vary) | ❌ Manual |

### Output Structure

```
app/src/city/{slug}/
├── package.ts      # City package with characters, arcs, calibration
└── index.ts        # Barrel export

public/data/cities/{slug}/
└── neighborhoods.geojson   # Neighborhood boundaries (used by MapPanel)
```

### Adding a New City (Checklist)

1. Run `add-city.py` to scaffold the package
2. Review `package.ts`:
   - Add real mayor name, contact, since date
   - Populate city council members (7 district + 2 at-large typical)
   - Add calibration data from city budget documents
   - Write 6 city characters (inspired by real local orgs)
   - Define 3 crisis arcs for the city's unique challenges
3. Add local news sources (RSS feeds that actually work)
4. Replace placeholder neighborhood boundaries with real ones if available (search for "{city} open data neighborhood geojson")
5. Test in-game: `npm run dev`, select the new city
6. Run `npm run build` and `npx vitest run` to verify nothing breaks

## Civic Data Updates: `update-civic-data.py`

Keeps current city data fresh (mayor, council members) from live sources.

```bash
# Detroit only
python3 scripts/update-civic-data.py --apply

# Dry run first
python3 scripts/update-civic-data.py
```

## Geographic Data: `fetch-city-geojson.py`

Fetches neighborhood boundaries for a city. Called automatically by `add-city.py`.

```bash
python3 scripts/fetch-city-geojson.py "Seattle" --state "WA"
python3 scripts/fetch-city-geojson.py "Minneapolis" --state "MN" --use-geocoding  # slow, 1 sec per neighborhood
```

Use `--use-geocoding` for better polygon placement (slower due to Nominatim rate limit).

## Setup

```bash
cd /path/to/city_builder
python3 -m venv scripts/venv
source scripts/venv/bin/activate
pip install -r scripts/requirements.txt
```

**Dependencies:**
- `requests` — HTTP requests to APIs
- `beautifulsoup4` — HTML scraping (detroitmi.gov)
- `SPARQLWrapper` — Wikidata SPARQL queries
