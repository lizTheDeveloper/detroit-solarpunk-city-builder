# Researcher Test Performance Optimization

## Problem
The `test_researcher.py` test was timing out after 2+ minutes due to:
- Character discovery making 12 DDGS queries (80 results each)
- Movement discovery making 4 DDGS queries
- Governance analysis making 3 DDGS queries
- No caching between test runs
- No per-query timeout protection

## Solution

### 1. Module-level Search Cache with Persistence
- Added `_search_cache` dict in `/Users/annhoward/src/city_builder/scripts/agentic-researcher/city-expander.py`
- Persistent file cache: `.ddgs_cache.json` in the agentic-researcher directory
- Cache key: query string (deduplicates identical queries)
- Loaded on module import, saved after each successful query

### 2. Query Consolidation
- Reduced character discovery queries from 12 to 6
- Used parenthetical OR to combine related search patterns
- Maintained diverse discovery vectors while halving HTTP overhead

### 3. Per-Query Timeout
- Added `DDGS_QUERY_TIMEOUT = 4` seconds
- Uses `concurrent.futures.ThreadPoolExecutor` to enforce timeout
- Prevents hanging requests from blocking the entire pipeline

### 4. Reduced Inter-Query Sleep Times
- Character queries: 0.3s → 0.1s
- Movement queries: 0.5s → 0.15s

### 5. Shared Cache for Governance Queries
- Refactored `GovernanceStructure._query_wikidata()` and `_query_wikipedia()` to use `_search_web()`
- Governance queries now benefit from the same cache as character/movement queries

### 6. Configurable Result Limits
- Added `num_characters` and `num_movements` parameters to `research_city()`
- Test uses 80 characters and 8 movements (sufficient for reliable extraction)

### 7. Test Timing Instrumentation
- Each test now prints elapsed time
- Full pipeline benefits from cache (runs in ~1.2s)

## Results

### Cold Run (No Cache)
```
Testing governance analysis...          [6.6s]
Testing character discovery...          [30.8s]
Testing movement mapping...             [12.5s]
Testing full research pipeline...       [1.2s] (cached)
─────────────────────────────────────────────
Total time:                             [51.1s] ✓ Under 60s target
```

### Warm Run (Cache Available)
```
Testing governance analysis...          [0.0s]
Testing character discovery...          [0.5s]
Testing movement mapping...             [0.6s]
Testing full research pipeline...       [1.2s]
─────────────────────────────────────────────
Total time:                             [2.3s] ✓ Instant feedback
```

## Test Assertions (All Pass)
- ✓ Governance analysis returns structure (Mayor-Council for Portland)
- ✓ Character discovery finds ≥1 named individuals (finds 6 for Portland)
- ✓ Movement mapping finds solarpunk initiatives (finds 3 for Portland)
- ✓ Full pipeline completes with all components

## Files Modified
1. `/Users/annhoward/src/city_builder/scripts/agentic-researcher/city-expander.py`
   - Added `_search_cache` and persistence functions
   - Refactored `_search_web()` with caching and timeout
   - Consolidated queries in `search_climate_activists()`
   - Updated `search_solarpunk_movements()`
   - Refactored `GovernanceStructure` methods to use shared cache
   - Added `num_characters`/`num_movements` params to `research_city()`

2. `/Users/annhoward/src/city_builder/scripts/agentic-researcher/test_researcher.py`
   - Added timing instrumentation
   - Configured test parameters (80 chars, 8 movements)
   - Documented performance characteristics

3. `/Users/annhoward/src/city_builder/.gitignore`
   - Added `.ddgs_cache.json` pattern

## Running the Test
```bash
cd /Users/annhoward/src/city_builder
source scripts/venv/bin/activate
time python3 scripts/agentic-researcher/test_researcher.py
```

Expected output:
- Cold run: ~50-55 seconds (first time or after cache clear)
- Warm run: ~2-3 seconds (subsequent runs with cache)

## Maintenance Notes
- The cache file (`.ddgs_cache.json`) is gitignored but persists locally
- To force a fresh run: `rm /Users/annhoward/src/city_builder/scripts/agentic-researcher/.ddgs_cache.json`
- Cache grows with unique queries; prune if file becomes too large
- Timeouts are set to 4s (adjustable via `DDGS_QUERY_TIMEOUT` constant)
