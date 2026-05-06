## Why

The game's event/crisis system currently relies on hand-authored content that goes stale. Real-world climate, infrastructure, and policy crises are happening daily — the game should surface them directly. A server-side pipeline that pulls real headlines hourly from trusted aggregators (theblue.report, memeorandum) and classifies them for game use means the game grows richer automatically without new content authoring. Players encounter the actual news cycle, not a fictional approximation.

## What Changes

- New server-side cron job (hourly) fetches headlines from configured feed sources
- Headlines are classified by arc relevance, severity, and locality (Detroit/Michigan/national/global)
- Classified headlines are stored as structured JSON, served to game clients via API
- Arc-state tracking accumulates headline hits over time to detect escalation patterns
- Feed source configuration is extensible — new sources added without code changes
- Research paper corpus (500+ papers from existing ai_game_theory_simulation repo) indexed and queryable by arc topic

## Capabilities

### New Capabilities
- `feed-ingestion`: Hourly pull from configured news feeds (theblue.report JSON, memeorandum RSS, extensible). Rate-limited, server-side only, cached results.
- `headline-classification`: LLM batch job that tags each headline to arc templates, assigns severity (1-3), extracts key claims, and flags Detroit/Michigan relevance.
- `arc-state-tracking`: Persistent per-arc counters that accumulate foreshadow/escalation/crisis hits from classified headlines. Drives escalation detection for the crisis arc engine.
- `headline-api`: REST endpoint serving processed headlines to game clients. Filterable by arc, severity, recency. CDN-friendly caching.
- `research-corpus`: FAISS-indexed research paper collection queryable by topic. Returns DOI links, abstracts, and relevance scores for contextual surfacing in-game.

### Modified Capabilities

## Impact

- New server infrastructure: cron scheduler, LLM batch runner, persistent storage for headline JSON and arc state
- New API endpoint(s) on multiversestudios.xyz
- Dependency on external feeds (theblue.report, memeorandum) — must handle downtime gracefully
- LLM API costs: ~50-100 headlines/hour × classification prompt ≈ modest token usage per day
- Research corpus port from github.com/lizTheDeveloper/ai_game_theory_simulation (embeddings + papers)
- Game client gains new data source but no breaking changes to existing systems
