## ADDED Requirements

### Requirement: Marcus Webb has a 4-phase character arc
The antagonist system SHALL support an `arcPhase` field on the `Antagonist` type. Marcus Webb SHALL progress through 4 phases (Gadfly → Demagogue → Power Broker → Resolution) based on game state rather than a fixed escalation interval.

#### Scenario: Marcus starts in Phase 1 (Gadfly)
- **WHEN** a new game is created
- **THEN** Marcus Webb's `arcPhase` SHALL be `1` and his events SHALL be low-stakes media pot-shots referencing recent player actions

#### Scenario: Phase 1 event variety
- **WHEN** Marcus fires an event in Phase 1
- **THEN** the system SHALL select from a pool of 3-5 Phase 1 events based on current game state (recent projects, budget allocation, neighborhood activity) rather than repeating the same event

### Requirement: Phase transitions are driven by game state
Marcus SHALL transition between phases based on composite triggers: turn number thresholds, player response history (confront vs ignore ratio), active crises, ignored proposal count, and neighborhood neglect patterns. The system SHALL NOT use the generic `escalationInterval` timer for Marcus.

#### Scenario: Transition from Phase 1 to Phase 2
- **WHEN** the current turn is >= 9 AND at least one of: (a) player has ignored Marcus 3+ times, (b) 2+ proposals have reached pressure level 3, (c) any neighborhood has 0 time allocation for 3+ consecutive months
- **THEN** Marcus SHALL transition to Phase 2 (Demagogue)

#### Scenario: Early Phase 2 via Sterling Cross
- **WHEN** the Sterling Cross antagonist is also active AND Marcus is in Phase 1 AND the current turn is >= 6
- **THEN** Marcus SHALL transition to Phase 2 early, with events referencing the developer connection

#### Scenario: Transition from Phase 2 to Phase 3
- **WHEN** the current turn is >= 20 AND Marcus has fired at least 4 Phase 2 events
- **THEN** Marcus SHALL transition to Phase 3 (Power Broker)

#### Scenario: Transition from Phase 3 to Phase 4
- **WHEN** the current turn is >= 36
- **THEN** Marcus SHALL transition to Phase 4 (Resolution)

### Requirement: Phase 2 events weaponize ignored proposals
When Marcus is in Phase 2 (Demagogue), his events SHALL reference specific ignored or expired proposals by neighborhood name, leader name, and project name. The system SHALL select the most recently ignored/expired proposal as event fodder.

#### Scenario: Marcus targets an ignored proposal
- **WHEN** Marcus fires a Phase 2 event AND at least one proposal has reached pressure level 3 or expired in the last 3 turns
- **THEN** the event text SHALL interpolate the specific neighborhood, leader name, and project name from that proposal

#### Scenario: Marcus targets neighborhood neglect
- **WHEN** Marcus fires a Phase 2 event AND any neighborhood has received 0 time allocation for 3+ months
- **THEN** the event text SHALL name the neglected neighborhood and its community leader

#### Scenario: Marcus drives wedges between allies
- **WHEN** Marcus fires a Phase 2 event AND the player has a partner-level relationship with any leader
- **THEN** there SHALL be a chance that the event includes a choice that would damage that specific leader relationship

### Requirement: Phase 3 events involve political maneuvering
In Phase 3 (Power Broker), Marcus shifts from media attacks to political action. Events SHALL include council endorsement challenges, rally events, and co-option opportunities.

#### Scenario: Marcus announces a council run
- **WHEN** Marcus enters Phase 3 AND the player has confronted Marcus fewer than 3 times total
- **THEN** Marcus SHALL generate a "council run announcement" event with choices: oppose publicly (Will cost), negotiate privately (Trust risk), or let community organizers respond

#### Scenario: Player can co-opt Marcus
- **WHEN** Marcus is in Phase 3 AND the player chooses to offer Marcus a seat at the table
- **THEN** Marcus's hostility SHALL decrease and his Phase 4 resolution SHALL shift toward "reluctant ally"

### Requirement: Phase 4 resolves based on cumulative choices
Phase 4 (Resolution) SHALL have at least 3 distinct endings determined by the player's cumulative response pattern across all prior phases.

#### Scenario: Reluctant ally ending
- **WHEN** Marcus reaches Phase 4 AND the player confronted Marcus 4+ times AND co-opted him in Phase 3
- **THEN** Marcus SHALL become a grudging political ally, reducing his negative meter effects and generating occasional supportive events

#### Scenario: Election threat ending
- **WHEN** Marcus reaches Phase 4 AND the player ignored Marcus more than 60% of the time AND did not co-opt in Phase 3
- **THEN** Marcus SHALL mount a serious election challenge, creating a sustained Will drain and trust penalty in neglected neighborhoods

#### Scenario: Cynicism engine ending
- **WHEN** Marcus reaches Phase 4 AND the player's response pattern was inconsistent (neither consistently confronting nor consistently ignoring)
- **THEN** Marcus SHALL become a persistent background cynicism source, generating small but constant negative events that erode public trust citywide

### Requirement: Marcus events offer meaningful player choices
Each Marcus event SHALL offer at least 3 distinct response options with different mechanical tradeoffs. The options SHALL include at minimum: a direct confrontation option (costs Will, may gain Trust), an avoidance option (costs Trust, preserves Will), and a strategic/creative option (costs resources or time but creates new possibilities).

#### Scenario: Player confronts Marcus on air
- **WHEN** the player chooses the "confront on-air" response to a Marcus event
- **THEN** the system SHALL deduct Will (3-5 depending on phase) and grant Trust (+1 to +3 depending on neighborhood context)

#### Scenario: Player funds counter-media
- **WHEN** the player chooses a "fund counter-media" response
- **THEN** the system SHALL deduct Budget and create a delayed positive effect that reduces Marcus's next event's negative impact

#### Scenario: Player lets community handle it
- **WHEN** the player chooses "let community organizers respond"
- **THEN** the system SHALL deduct Trust (-2) from the targeted neighborhood but increase community power tokens for that tile

### Requirement: Marcus has a motivation layer
Marcus's backstory as a performative populist funded by developer interests (Sterling Cross) who also has a genuine grievance from a neglected childhood neighborhood SHALL surface mechanically. Events in Phase 2+ SHALL occasionally reveal his real motivations through dialogue text.

#### Scenario: Marcus references his childhood neighborhood
- **WHEN** Marcus fires an event AND his childhood neighborhood tile has low ecological health (< 30%) or high vacancy (> 50%)
- **THEN** the event text SHALL include a line referencing his personal connection, and the player SHALL have an option to address that neighborhood's needs directly

#### Scenario: Sterling Cross funding is revealed
- **WHEN** Marcus transitions to Phase 2 AND Sterling Cross is active
- **THEN** an event SHALL reveal the funding connection, giving the player information they can use in future confrontation choices
