## Context

The city builder game runs on multiversestudios.xyz with a server backend. Currently all game events are hand-authored in TypeScript data files. The game needs a pipeline that pulls real-world headlines hourly, classifies them for game relevance, and serves them to clients. An existing research corpus (500+ papers with FAISS embeddings) from github.com/lizTheDeveloper/ai_game_theory_simulation provides the academic grounding layer.

External feeds available:
- `data.theblue.report/feeds/top-day.json` — structured JSON, Bluesky trending links
- `memeorandum.com/feed.xml` — RSS, political news clustered by topic
- Both update frequently; one hourly server-side fetch is respectful to sources

## Goals / Non-Goals

**Goals:**
- Hourly automated ingestion from 2+ news feeds with extensible source config
- LLM-powered classification tagging headlines to game arc templates
- Persistent arc-state tracking (foreshadow count, escalation signals)
- REST API serving processed headlines to game clients
- Research paper index queryable by arc topic
- Graceful degradation when feeds are down or LLM quota exhausted

**Non-Goals:**
- Real-time streaming (hourly batch is sufficient)
- Player-facing search over raw headlines (game selects what to show)
- Full-text paper storage (store metadata + DOI links, not PDFs)
- Content moderation of headlines (source feeds are already curated)
- The propaganda/framing layer (separate change: `propaganda-layer`)
- Crisis arc game mechanics (separate change: `crisis-arc-engine`)

## Decisions

### 1. Hourly cron with idempotent processing

Run a cron job every hour that fetches all configured feeds, deduplicates against already-seen URLs, and processes only new items. Each headline gets a stable ID derived from its URL hash. Re-running the same hour is safe (idempotent).

**Alternative considered:** Event-driven (webhook from feed sources). Rejected because neither theblue.report nor memeorandum offer webhooks. Polling is the only option.

### 2. LLM classification as a batch step, not inline

After fetching, all new headlines are classified in a single LLM batch call (or chunked if >50 items). The classification prompt includes the current arc template definitions so the LLM can tag relevance. Results are stored alongside the headline.

**Alternative considered:** Rule-based keyword matching. Rejected because keyword lists can't handle the nuance of "is this headline actually about Detroit energy grid policy or just mentions Detroit in passing?" LLM classification is more accurate and handles novel framings.

**Fallback:** If LLM quota is exhausted, headlines are stored unclassified with `severity: 0` and `arcs: []`. They'll be classified on the next successful batch. Game clients filter out unclassified items.

### 3. Flat JSON file storage (not a database)

Processed headlines stored as daily JSON files: `headlines/2026-05-05.json`. Arc state stored as per-arc JSON: `arc-state/energy-grid.json`. Both served directly via static file hosting or a thin API layer.

**Alternative considered:** PostgreSQL or SQLite. Rejected for now — the volume is ~100-200 headlines/day, arc state is <20 files. JSON files are simpler to deploy, debug, inspect, and back up. Migrate to a DB only if query patterns demand it.

### 4. Arc templates as configuration, not code

Arc templates (what keywords/topics constitute "energy-grid" vs "water-pfas") are defined in a YAML/JSON config file that the classification prompt reads. Adding a new arc means adding a config entry, not writing code.

```yaml
arcs:
  energy-grid:
    keywords: ["grid", "DTE", "outage", "power", "transformer", "solar", "microgrid"]
    locality: ["detroit", "michigan", "great lakes"]
    escalation_threshold: 3  # foreshadow hits before escalation
    papers: ["doi:10.1234/...", "doi:10.5678/..."]
  phosphorus:
    keywords: ["phosphorus", "fertilizer", "Morocco", "phosphate", "nutrient recovery"]
    ...
```

### 5. Research corpus as a static FAISS index served via simple query endpoint

Port the existing FAISS embeddings and paper metadata from ai_game_theory_simulation. Serve via a `/api/papers?topic=phosphorus&limit=3` endpoint that runs a vector similarity search and returns DOI links + abstracts.

**Alternative considered:** Re-embed everything with a newer model. Deferred — existing 384-dim embeddings work fine for topic matching. Can re-index later if quality is poor.

### 6. Feed source configuration

Sources defined in a config file:

```yaml
sources:
  - id: theblue_report
    type: json
    url: https://data.theblue.report/feeds/top-day.json
    schedule: hourly
    parser: bluesky_trending
  - id: memeorandum
    type: rss
    url: http://www.memeorandum.com/feed.xml
    schedule: hourly
    parser: memeorandum_clusters
```

New sources require only a parser function (extract headline + url + metadata from the feed format) and a config entry.

## Risks / Trade-offs

- **Feed format changes** → Parser breaks silently. Mitigation: health check endpoint that reports last successful fetch per source + alert if no new items in 4+ hours.
- **LLM classification drift** → Model updates change tagging behavior. Mitigation: pin model version in config, include few-shot examples in classification prompt, log classification confidence scores.
- **Headline volume spikes** → Major news day could produce 500+ items. Mitigation: process in chunks of 50, cap at 200/hour, queue remainder for next cycle.
- **Feed downtime** → theblue.report or memeorandum go offline. Mitigation: each source independent, game continues with stale data. Health dashboard shows per-source status.
- **Cost** → LLM classification costs ~$0.50-2.00/day at current volumes. Acceptable for a hosted game.
- **Research corpus staleness** → Papers from 2024 won't include 2026 research. Mitigation: periodic re-index as part of maintenance, not part of this pipeline. The hourly feeds provide freshness; papers provide depth.

## Open Questions

- What's the deployment target? (Node.js server with cron? Separate worker process? Serverless function on schedule?)
- Should arc-state be global (shared across all players) or per-game-instance? Leaning global — reality doesn't care about your save file.
- Retention policy: how long to keep headline history? 30 days? 90 days? Forever?
