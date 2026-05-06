## ADDED Requirements

### Requirement: LLM-powered arc tagging
The system SHALL classify each new headline by relevance to configured arc templates using an LLM. Classification MUST assign zero or more arc tags per headline.

#### Scenario: Headline matches single arc
- **WHEN** a headline about "DTE grid failure leaves 50,000 without power" is classified
- **THEN** it receives arc tag `energy-grid` with confidence score

#### Scenario: Headline matches multiple arcs
- **WHEN** a headline about "PFAS contamination found in Detroit community garden soil" is classified
- **THEN** it receives arc tags `water-pfas` AND `food-sovereignty`

#### Scenario: Headline matches no arcs
- **WHEN** a headline about "Lions win playoff game" is classified
- **THEN** it receives empty arc tags and severity 0

### Requirement: Severity assignment
The system SHALL assign a severity level (1-3) to each classified headline. Severity 1 is background/foreshadow, severity 2 is rising/escalation, severity 3 is crisis-level.

#### Scenario: Routine infrastructure story
- **WHEN** a headline reports planned maintenance or minor policy discussion
- **THEN** severity is assigned as 1 (background)

#### Scenario: Emerging crisis
- **WHEN** a headline reports widespread outage, emergency declaration, or mass displacement
- **THEN** severity is assigned as 3 (crisis)

### Requirement: Locality detection
The system SHALL tag each headline with locality: `detroit`, `michigan`, `national`, or `global`. Detroit-specific headlines MUST be prioritized in game surfacing.

#### Scenario: Detroit-specific headline
- **WHEN** a headline explicitly mentions Detroit, a Detroit neighborhood, or a Detroit institution (DTE, DWSD, Wayne County)
- **THEN** locality is tagged as `detroit`

#### Scenario: National policy headline
- **WHEN** a headline discusses federal EPA regulation without Michigan-specific impact
- **THEN** locality is tagged as `national`

### Requirement: Classification fallback on LLM failure
The system SHALL store headlines unclassified when LLM quota is exhausted or API fails. Unclassified headlines MUST be retried on the next successful batch cycle.

#### Scenario: LLM API rate limited
- **WHEN** classification batch receives a 429 rate limit response
- **THEN** unprocessed headlines are stored with `classified: false` and retried next hour

### Requirement: Batch processing
The system SHALL classify headlines in batches of up to 50 items per LLM call. Total processing MUST be capped at 200 headlines per hourly cycle.

#### Scenario: High volume news day
- **WHEN** 300 new headlines are fetched in one hour
- **THEN** the first 200 are classified this cycle, remaining 100 are queued for next cycle
