## ADDED Requirements

### Requirement: Hourly feed fetching
The system SHALL fetch headlines from all configured feed sources on an hourly schedule. Each fetch MUST be idempotent — re-running the same hour SHALL NOT produce duplicate entries.

#### Scenario: Normal hourly fetch
- **WHEN** the hourly cron fires
- **THEN** the system fetches from each configured source and stores new headlines with a stable ID derived from URL hash

#### Scenario: Duplicate detection
- **WHEN** a headline URL has already been processed in a previous fetch
- **THEN** the system skips it without error

### Requirement: Multiple feed source support
The system SHALL support at minimum theblue.report JSON feed and memeorandum RSS feed. Sources MUST be defined in a configuration file, not hardcoded.

#### Scenario: theblue.report JSON ingestion
- **WHEN** fetching from `data.theblue.report/feeds/top-day.json`
- **THEN** the system extracts headline text, source URL, engagement metrics, and timestamp for each item

#### Scenario: memeorandum RSS ingestion
- **WHEN** fetching from `memeorandum.com/feed.xml`
- **THEN** the system extracts headline text, source URL, and related coverage cluster links

#### Scenario: Adding a new source
- **WHEN** a new source entry is added to the feed configuration file with a parser identifier
- **THEN** the system includes it in the next hourly fetch without code changes to the pipeline

### Requirement: Graceful feed failure handling
The system SHALL continue operating when individual feed sources fail. A single source outage MUST NOT block processing of other sources.

#### Scenario: One source times out
- **WHEN** theblue.report is unreachable but memeorandum responds
- **THEN** memeorandum headlines are processed normally and theblue.report failure is logged with timestamp

#### Scenario: All sources fail
- **WHEN** no feed sources respond
- **THEN** the system logs the failure, serves stale cached data to clients, and retries on next hourly cycle

### Requirement: Rate limiting
The system SHALL make at most one request per source per hour. The system MUST NOT make per-player or per-session requests to external feeds.

#### Scenario: High player count
- **WHEN** 1000 players are active simultaneously
- **THEN** the system still makes exactly one fetch per source per hour (not per player)
