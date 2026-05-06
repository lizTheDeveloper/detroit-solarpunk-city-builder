## ADDED Requirements

### Requirement: Per-arc hit accumulation
The system SHALL maintain a persistent counter of classified headline hits per arc, bucketed by severity level. These counters drive escalation detection for the crisis arc engine.

#### Scenario: Foreshadow accumulation
- **WHEN** 3 severity-1 headlines tagged `energy-grid` are processed within 7 days
- **THEN** the `energy-grid` arc state reflects `foreshadowHits: 3` for the current week

#### Scenario: Counter reset on weekly boundary
- **WHEN** a new calendar week begins
- **THEN** weekly hit counters reset to 0 while cumulative counters persist

### Requirement: Arc state persistence
Arc state MUST persist across server restarts. Each arc's state SHALL be stored as a separate JSON file.

#### Scenario: Server restart
- **WHEN** the server process restarts
- **THEN** arc state is loaded from disk and reflects the same values as before restart

### Requirement: Arc state structure
Each arc state file SHALL contain: arc ID, current stage (dormant/foreshadow/escalation/crisis), weekly hit counts by severity, cumulative hit count, last headline timestamp, and escalation threshold configuration.

#### Scenario: Reading arc state
- **WHEN** the crisis arc engine queries arc state for `phosphorus`
- **THEN** it receives stage, weekly hits, cumulative hits, and threshold config sufficient to determine escalation

### Requirement: Global arc state
Arc state SHALL be global — shared across all game instances. Reality-driven pressure is the same for all players regardless of their individual game state.

#### Scenario: Two players in different game stages
- **WHEN** player A is in awakening stage and player B is in restoration stage
- **THEN** both see the same arc state (e.g., `energy-grid` at escalation stage) but the crisis arc engine decides independently how each player's game responds
