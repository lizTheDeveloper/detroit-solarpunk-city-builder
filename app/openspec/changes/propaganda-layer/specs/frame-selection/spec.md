## ADDED Requirements

### Requirement: Game-state-aware frame selection
The game client SHALL select which pre-generated frame to display based on the player's current game state. Selection logic MUST run client-side with no LLM calls.

#### Scenario: Active antagonist determines frame
- **WHEN** a headline's arc has an active antagonist in the player's game
- **THEN** the establishment frame is displayed (showing the antagonist's spin)

#### Scenario: Countered antagonist shifts frame
- **WHEN** the player has a dependency web condition indicating they've countered the antagonist (e.g., "countered_dte")
- **THEN** the market frame is displayed instead (antagonist shifts to economic arguments)

#### Scenario: No active antagonist
- **WHEN** a headline's arc has no active antagonist in the player's current state
- **THEN** the community frame is displayed (player's home base perspective)

### Requirement: Frame adaptation to player choices
The same headline SHALL display different frames for players who made different choices in crisis forks. A player who aligned with the establishment sees community push-back; a player who opposed sees establishment escalation.

#### Scenario: Player accepted establishment offer
- **WHEN** player's dependency web contains "accepted_dte_grid_plan"
- **AND** a new energy-grid headline appears
- **THEN** community frame is shown (community organizations responding to the deal)

#### Scenario: Player rejected establishment offer
- **WHEN** player's dependency web contains "rejected_dte_grid_plan"
- **AND** a new energy-grid headline appears
- **THEN** establishment frame is shown (DTE's PR response to opposition)

### Requirement: Frame with source attribution
Displayed frames SHALL include attribution to the faction perspective (not a fake person). Attribution MUST make clear this is an interpretation, not a quote.

#### Scenario: Frame display
- **WHEN** a frame is shown to the player
- **THEN** it is attributed as a perspective: e.g., "DTE Energy's position:" or "Community organizers say:" — never as a direct quote from a named individual
