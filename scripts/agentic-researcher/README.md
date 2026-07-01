# Agentic Researcher System for City Expansion

Automated research system for discovering real climate leaders, sustainability movements, and governance structures when expanding the game to new cities.

## Overview

The agentic researcher solves the problem of manually researching every city's local context. It uses a hybrid 4-layer approach to gather authentic, real-world data about:

1. **Local climate leaders** - activists, organizers, community figures already doing the work
2. **Existing solarpunk movements** - community gardens, mutual aid networks, land trusts, cooperatives
3. **Governance structures** - mayor-council vs council-manager, district vs at-large representation
4. **Character role suggestions** - based on governance type, suggests which archetypes would be most impactful

## Current Status (v2.0 - Enhanced)

✅ **Character Name Extraction**: Uses journalist attribution patterns ("said X", "according to X") to extract real person names from search snippets. Validates names aren't organizations or common phrases.

✅ **Movement Mapping**: Expanded from 8 to 25+ movement types including:
- Housing: Community Land Trust, Housing Cooperative, Co-housing, Eco-village, Intentional Community
- Food & Agriculture: Community Garden, Urban Farm, Food Cooperative, CSA, Permaculture, Community Kitchen, Seed Library
- Energy & Climate: Mutual Aid, Time Bank, Repair Cafe, Climate Action, Transition Town, Zero Waste, Composting, Bike Cooperative
- Cooperation: Worker Cooperative, Tool Library, Gift Economy

✅ **Movement Filtering**: Filters out:
- Educational sites (investopedia, definitions, wikis)
- Government websites
- Generic/non-city-specific results
- Definition-type titles ("What is...", "How to...")

✅ **Governance Analysis**: Correctly identifies mayor-council, council-manager, or commission systems with council size when available.

## Usage

```bash
# Research a single city
python3 scripts/agentic-researcher/city-expander.py "Portland" --state "OR"

# Output JSON for programmatic use
python3 scripts/agentic-researcher/city-expander.py "Seattle" --state "WA" --json

# Run test suite
python3 scripts/agentic-researcher/test_researcher.py
```

## Architecture

**Hybrid 4-Layer Pipeline:**

1. **Wikidata SPARQL** (primary structured data)
   - Mayor name and start date
   - Governance type (mayor-council, council-manager)
   - Council size and structure

2. **Wikipedia REST API** (fallback for governance/movement names)
   - Neighborhood lists
   - Local organizations
   - Historical context

3. **DDGS (DuckDuckGo Search)** (primary for character discovery)
   - Local news articles about climate activists
   - Organization websites
   - Community initiatives

4. **Web Scraping** (fallback for DDGS)
   - HTML parsing for attribution patterns
   - Organization details from search results

**Why hybrid?**
- Wikidata is structured but incomplete (many cities lack governance data)
- Wikipedia is comprehensive but static (movements evolve)
- DDGS finds real people but requires attribution parsing
- Web scraping is last resort (fragile, rate-limited)

## Dependencies

Install in your venv:

```bash
python3 -m venv scripts/venv
source scripts/venv/bin/activate
pip install ddgs beautifulsoup4
```

## Integration with add-city.py

```bash
# Step 1: Scaffold city structure
python3 scripts/add-city.py "Portland" --state "OR"

# Step 2: Run agentic researcher
python3 scripts/agentic-researcher/city-expander.py "Portland" --state "OR"

# Step 3: Review research output
cat research-output/portland-or-research.json | jq

# Step 4: Manually review and refine characters
# (See docs/CHARACTER_REVIEW_GUIDE.md for character validation)
```

## Output Format

JSON structure in `research-output/{city}-{state}-research.json`:

```json
{
  "city": "Portland",
  "state": "OR",
  "governance": {
    "governance_type": "mayor-council",
    "council_size": 12,
    "council_structure": "at-large",
    "discretionary_slots": 3
  },
  "characters": [
    {
      "name": "Lori Villarosa",
      "role": "Executive Director",
      "organization": "Racial Equity",
      "description": "As the founder and executive director of the Philanthropic Initiative..."
    },
    {
      "name": "Ahlam Osman",
      "role": "Advocate",
      "organization": "Local Organization",
      "description": "Environmental and Climate Advocacy through which she will address..."
    }
  ],
  "movements": [
    {
      "name": "Community Gardens & Urban Farms",
      "type": "Community Garden",
      "description": "Portland community gardens program..."
    },
    {
      "name": "Food Front Cooperative Grocery",
      "type": "Cooperative",
      "description": "A unique opportunity to join a thriving hub of restaurants..."
    }
  ],
  "suggested_roles": [
    "mayor-ally",
    "opposition-councilor",
    "community-activist",
    "neighborhood-association-leader",
    "district-representative"
  ]
}
```

## Known Limitations

### Character Name Extraction
- Journalist attribution patterns work well but may miss edge cases
- Some extracted names may include extra context (e.g., "Organizer And Artist Duo Maya Vivas")
- DDGS rate limiting can occur with repeated queries (mitigated by intelligent caching)

### Movement Mapping
- City-specific filtering is strict but occasionally returns movements from other cities with similar names
- Some movements get generic categorization ("Community Organization") when specific keywords aren't found
- Need neighborhood-level mapping to identify which districts have active communities

### Governance Analysis
- Falls back to "Unknown" when both Wikidata and Wikipedia queries fail
- Council size extraction is fragile (regex-based)
- No fallback to manual data entry when automated sources fail

### Performance
- Cold run (no cache): ~35-55 seconds
- Cached run: ~2-3 seconds
- DDGS rate limiting: Add 1-2 second delays between queries if needed

## Testing

Run the end-to-end test suite:

```bash
# Activate venv first
source scripts/venv/bin/activate

# Run tests (uses caching, completes in ~2-3 seconds after first run)
python3 scripts/agentic-researcher/test_researcher.py
```

**Test Results (Portland, OR):**
```
✓ Governance: Mayor-Council (0.0s)
✓ Found 6 characters (0.6s cold, 0.0s cached)
✓ Found 3 movements (0.6s cold, 0.0s cached)
✓ Full pipeline (1.3s cached, ~35-55s cold)
Total: 2.5s (cached)
```

Tests verify:
- ✓ Governance analysis returns valid structure (mayor-council, council size)
- ✓ Character discovery returns 1+ real people with roles and organizations
- ✓ Movement mapping identifies 3+ real organizations with types
- ✓ Character role recommendations match governance type
- ✓ Tests complete in under 60 seconds (target: 2-3s with caching)

## Next Steps (Subagent Work)

### Phase 1: Improve Character Robustness
**Goal**: Extract more real person names with fewer false positives

**Tasks**:
- Extract full article content from search URLs (currently only using snippets)
- Add more journalist attribution patterns (e.g., "X, who...", "X said that...")
- Validate extracted names against Wikidata (check if person exists)
- Add confidence scores for each extracted character

**Success Criteria**:
- Extract 5+ real characters per city (currently 1-3)
- Zero false positives (no "About Neighborhood" or "United Front")
- All extracted names validated as real people

### Phase 2: Improve Movement Specificity
**Goal**: Filter out non-city-specific movements and categorize all results

**Tasks**:
- Add city name validation (reject movements that don't mention the city)
- Improve keyword matching for movement types (currently 25+, but some fall through to "Community Organization")
- Add neighborhood-level mapping (which districts have active communities)
- Fetch full movement descriptions from websites (currently only using snippets)

**Success Criteria**:
- All movements mention the target city in name or description
- Zero "Community Organization" fallbacks (all movements have specific types)
- Neighborhood mapping identifies 5+ active districts per city

### Phase 3: Governance Robustness & Fallback
**Goal**: Always return governance data, with manual fallback when automated sources fail

**Tasks**:
- Add fallback to Wikipedia API (currently only using Wikidata)
- Add manual data entry mode (let user edit JSON before game integration)
- Validate governance structure against city size (e.g., small cities shouldn't have 12 council members)
- Add historical data (previous mayors, major policy changes)

**Success Criteria**:
- 100% of cities return governance data (no "Unknown")
- Council size validated against city population
- Historical data available for at least 5 years

## Future Enhancements

- [ ] **Character validation pipeline** - verify discovered people are real activists (not fictional)
- [ ] **Movement mapping by neighborhood** - identify which districts have active communities
- [ ] **Historical context scraping** - extract past climate victories/failures for storyline arcs
- [ ] **Multi-language support** - Spanish, French for international expansion
- [ ] **Integration with city package generator** - auto-populate package.ts with discovered data
- [ ] **Conflict identification** - detect tensions between organizations (e.g., developers vs. housing advocates)

## Architecture Decisions

**Why DDGS and not Google/Bing?**
- No API key required
- Good coverage of local news
- Respects robots.txt
- Rate limits are manageable

**Why not LLM-powered extraction?**
- Too expensive for bulk research (50+ cities)
- Overkill for structured data (Wikidata has mayor/governance)
- Privacy concerns (sending local activist names to cloud LLMs)
- Hybrid approach is faster and more transparent

**Why keep web scraping as fallback?**
- DDGS may rate-limit or block
- Some cities have poor search coverage
- Web scraping can extract from specific URLs (city council pages, org websites)
- Provides transparency when DDGS fails

## Maintenance

The system requires minimal maintenance:
- DDGS library updates: `pip install --upgrade ddgs` quarterly
- Wikidata queries are stable (SPARQL standard)
- Web scraping may break if cities redesign websites (update selectors as needed)

## License

Same as main project (see repo root LICENSE file).
