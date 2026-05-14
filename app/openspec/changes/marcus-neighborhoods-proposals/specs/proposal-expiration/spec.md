## ADDED Requirements

### Requirement: Proposals have expiration timers
The `Proposal` type SHALL include `expirationTurn: number` and `pressureLevel: number` fields. When a proposal is generated, `expirationTurn` SHALL be set to `currentTurn + leader.urgencyWindow` (default 3 turns). `pressureLevel` SHALL start at 0.

#### Scenario: New proposal gets expiration
- **WHEN** a proposal is generated for a leader with no custom urgency window
- **THEN** `expirationTurn` SHALL equal `currentTurn + 3` and `pressureLevel` SHALL be `0`

#### Scenario: Leader-specific urgency window
- **WHEN** a proposal is generated for a leader with `urgencyWindow: 2`
- **THEN** `expirationTurn` SHALL equal `currentTurn + 2`

### Requirement: Proposals auto-defer without player interaction
The End Turn action SHALL NOT gate on unresolved proposals. Players SHALL be able to end their turn at any time regardless of how many active proposals exist. Unacted-on proposals SHALL remain active and continue aging.

#### Scenario: End turn with pending proposals
- **WHEN** the player clicks End Turn AND there are 3 active proposals
- **THEN** the turn SHALL advance without requiring the player to defer or respond to any proposal

#### Scenario: No defer button on proposals
- **WHEN** a proposal card is displayed on a tile
- **THEN** the card SHALL NOT include a "Defer" button — only Fund, Reject, and Discuss actions

### Requirement: Pressure level escalates each turn
During turn resolution, the system SHALL increment `pressureLevel` by 1 for each active proposal that was not acted on during that turn. Pressure level SHALL NOT exceed the proposal's remaining turns before expiration.

#### Scenario: Pressure increments
- **WHEN** a proposal has been active for 2 turns without player action
- **THEN** its `pressureLevel` SHALL be `2`

#### Scenario: Pressure caps at expiration
- **WHEN** a proposal reaches its expiration turn
- **THEN** the system SHALL process it as expired rather than incrementing pressure further

### Requirement: NPC pressure ladder generates events at thresholds
The system SHALL generate escalating NPC behavior at each pressure level:
- Level 0: Proposal appears passively on tile (green indicator)
- Level 1: Leader mentions proposal in meetings (yellow indicator)
- Level 2: Leader rallies neighborhood support, petition count visible (orange indicator)
- Level 3: Goes to local press, Marcus Webb picks it up as ammunition if Phase 2+ (red indicator)

#### Scenario: Level 1 pressure notification
- **WHEN** a proposal reaches pressure level 1
- **THEN** a notification SHALL appear indicating the leader has mentioned the proposal and the proposal card indicator SHALL change to yellow

#### Scenario: Level 2 pressure event
- **WHEN** a proposal reaches pressure level 2
- **THEN** the system SHALL generate a narrative event showing the leader rallying support, display a petition counter on the proposal card, and change the indicator to orange

#### Scenario: Level 3 feeds Marcus
- **WHEN** a proposal reaches pressure level 3 AND Marcus Webb is in Phase 2 or higher
- **THEN** the system SHALL generate a Marcus Webb event that references the specific ignored proposal by neighborhood, leader, and project name, and the indicator SHALL change to red

#### Scenario: Level 3 without Marcus
- **WHEN** a proposal reaches pressure level 3 AND Marcus Webb is NOT in Phase 2+
- **THEN** the system SHALL generate a "goes to press" narrative event without Marcus involvement

### Requirement: Expired proposals generate trust penalties and narrative
When a proposal passes its `expirationTurn` without being funded, the system SHALL remove it from active proposals, apply a trust penalty to the proposing leader, and generate a narrative event describing the leader's reaction.

#### Scenario: Partner-level leader's proposal expires
- **WHEN** a proposal expires AND the proposing leader has partner-level trust AND the proposal reached pressure level 3
- **THEN** the trust penalty SHALL be -12 and the narrative event SHALL reflect deep disappointment/betrayal

#### Scenario: Neutral leader's low-priority proposal expires
- **WHEN** a proposal expires AND the proposing leader has neutral trust AND the proposal reached pressure level 1
- **THEN** the trust penalty SHALL be -3 and the narrative event SHALL be a mild expression of frustration

#### Scenario: Expired proposal removed from active list
- **WHEN** a proposal expires
- **THEN** it SHALL be removed from `activeProposals` and the proposal card SHALL be removed from the tile with a brief removal animation

### Requirement: Proposal cards display expiration timer
Each proposal card anchored to a neighborhood tile SHALL display a visible timer showing turns remaining until expiration. The timer's color SHALL correspond to the current pressure level (green/yellow/orange/red).

#### Scenario: Timer display on new proposal
- **WHEN** a new proposal card appears on a tile
- **THEN** it SHALL show "Funds needed by Month X" with a green timer bar indicating turns remaining

#### Scenario: Timer color changes with pressure
- **WHEN** a proposal's pressure level increases to 2
- **THEN** the timer bar color SHALL change from yellow to orange

#### Scenario: Timer at final turn
- **WHEN** a proposal has 1 turn remaining before expiration
- **THEN** the timer bar SHALL be red and the card SHALL display an "Expiring" label

### Requirement: Rejected proposals resolve immediately
When a player explicitly rejects a proposal, it SHALL skip the expiration timer and resolve immediately with the existing trust penalty mechanics. No pressure escalation occurs for rejected proposals.

#### Scenario: Player rejects proposal
- **WHEN** the player clicks Reject on an active proposal
- **THEN** the proposal SHALL be removed from active proposals immediately, the existing rejection trust penalty SHALL apply, and no further pressure events SHALL be generated for that proposal

### Requirement: Early funding reduces trust cost
Funding a proposal before it reaches high pressure levels SHALL result in better trust outcomes. The trust bonus from funding SHALL scale inversely with pressure level: funding at level 0 grants full trust, funding at level 3 grants reduced trust.

#### Scenario: Fund at pressure level 0
- **WHEN** the player funds a proposal at pressure level 0
- **THEN** the trust bonus from the project's effects SHALL apply at full value

#### Scenario: Fund at pressure level 3
- **WHEN** the player funds a proposal at pressure level 3
- **THEN** the trust bonus SHALL be reduced by 50% because the leader feels they had to fight for basic support

### Requirement: Proposal expiration processing runs during turn resolution
The `prepareTurn` / resolve pipeline SHALL process proposal expiration as part of turn resolution: tick pressure levels, fire pressure events for thresholds reached, expire proposals past their deadline, and generate appropriate narrative events.

#### Scenario: Turn resolution processes proposals
- **WHEN** a turn resolves
- **THEN** the system SHALL in order: (1) generate new proposals with expiration timers, (2) increment pressure on existing proposals, (3) fire pressure events for newly-reached thresholds, (4) expire and remove proposals past deadline, (5) generate expiration narrative events

#### Scenario: Multiple proposals expire same turn
- **WHEN** 3 proposals expire on the same turn
- **THEN** the system SHALL process each independently with its own trust penalty and narrative event
