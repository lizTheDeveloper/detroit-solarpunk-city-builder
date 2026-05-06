## 1. Project Setup

- [ ] 1.1 Create `src/server/pipeline/` directory structure with entry point
- [ ] 1.2 Add dependencies: node-cron (or similar scheduler), rss-parser, faiss-node (or equivalent)
- [ ] 1.3 Create feed source config file (`config/feeds.yaml`) with theblue.report and memeorandum entries
- [ ] 1.4 Create arc template config file (`config/arcs.yaml`) with initial 5 arcs: energy-grid, water-pfas, phosphorus, housing-speculation, infrastructure-debt

## 2. Feed Ingestion

- [ ] 2.1 Implement base `FeedSource` interface and `FeedFetcher` that iterates configured sources
- [ ] 2.2 Implement `BlueskyTrendingParser` for theblue.report JSON format (extract headline, url, engagement, timestamp)
- [ ] 2.3 Implement `MemeorandumParser` for RSS format (extract headline, url, cluster links)
- [ ] 2.4 Implement URL-hash deduplication against stored headline IDs
- [ ] 2.5 Implement error isolation (one source failing doesn't block others) with failure logging
- [ ] 2.6 Wire up hourly cron schedule with idempotent execution guard

## 3. Headline Classification

- [ ] 3.1 Create LLM classification prompt template that accepts arc definitions + batch of headlines
- [ ] 3.2 Implement `ClassificationBatcher` that chunks headlines into groups of 50
- [ ] 3.3 Implement classification result parser (extract arc tags, severity 1-3, locality, confidence)
- [ ] 3.4 Implement 200/hour processing cap with overflow queue for next cycle
- [ ] 3.5 Implement fallback: store unclassified headlines on LLM failure, retry next cycle
- [ ] 3.6 Add few-shot examples to classification prompt for Detroit-specific locality detection

## 4. Arc State Tracking

- [ ] 4.1 Define `ArcState` type: { arcId, stage, weeklyHits, cumulativeHits, lastHeadlineTimestamp, thresholds }
- [ ] 4.2 Implement arc state persistence (read/write per-arc JSON files)
- [ ] 4.3 Implement hit accumulation logic (increment counters on each classified headline)
- [ ] 4.4 Implement weekly counter reset on calendar boundary
- [ ] 4.5 Implement stage transition logic (dormant→foreshadow→escalation→crisis based on thresholds)

## 5. Headline API

- [ ] 5.1 Implement `GET /api/headlines` with query params: arc, severity, locality, since, limit
- [ ] 5.2 Implement `GET /api/arc-state` returning all arc states
- [ ] 5.3 Implement `GET /api/health/pipeline` with per-source status and pending classification count
- [ ] 5.4 Add cache headers (15min for headlines, 5min for arc-state)
- [ ] 5.5 Implement headline response serialization matching spec format

## 6. Research Corpus

- [ ] 6.1 Port paper metadata and FAISS index from ai_game_theory_simulation repo
- [ ] 6.2 Implement `GET /api/papers?topic=X&limit=N` with FAISS vector similarity search
- [ ] 6.3 Implement `GET /api/papers?arc=X` returning curated paper list from arc config
- [ ] 6.4 Implement paper response serialization (title, authors, doi, abstract, year, score)
- [ ] 6.5 Add incremental paper insertion (metadata + embedding → index update)

## 7. Integration & Deploy

- [ ] 7.1 Wire cron → fetch → classify → store → update arc state as single pipeline run
- [ ] 7.2 Add pipeline run logging (items fetched, classified, stored per run)
- [ ] 7.3 Deploy to multiversestudios.xyz server with cron enabled
- [ ] 7.4 Verify end-to-end: cron fires → headlines appear in API → arc state updates
- [ ] 7.5 Monitor first 24 hours of production data for classification quality
