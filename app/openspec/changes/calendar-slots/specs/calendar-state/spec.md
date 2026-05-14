## ADDED Requirements

### Requirement: Calendar slot budget per turn
The system SHALL provide the player with a monthly time budget of calendar slots. Total slots SHALL be 60 per month, divided into fixed obligation slots (~38) and discretionary slots (~22). Fixed obligations represent unavoidable mayoral duties (council meetings, press, admin). Only discretionary slots are available for player-directed actions.

#### Scenario: New game initial budget
- **WHEN** a new game begins
- **THEN** the player SHALL have 60 total slots, 38 fixed, and 22 discretionary slots available

#### Scenario: Month transition resets budget
- **WHEN** a new month (turn) begins
- **THEN** discretionary slots SHALL reset to the base value minus any crisis slot taxes minus any delegation management costs

### Requirement: Variable action slot costs
The system SHALL assign different slot costs to different action types. Community meetings SHALL cost 2 slots. Proposal review SHALL cost 1 slot. Deep relationship-building (1-on-1 meetings) SHALL cost 2 slots. Public events SHALL cost 3 slots. Quick check-ins SHALL cost 1 slot.

#### Scenario: Community meeting deducts 2 slots
- **WHEN** the player initiates a community meeting action
- **THEN** 2 discretionary slots SHALL be deducted from the current month's budget

#### Scenario: Proposal review deducts 1 slot
- **WHEN** the player reviews a proposal
- **THEN** 1 discretionary slot SHALL be deducted from the current month's budget

#### Scenario: Insufficient slots prevents action
- **WHEN** the player attempts an action costing more slots than remaining discretionary slots AND the player is not in overschedule state
- **THEN** the system SHALL warn the player that this action would trigger overschedule

### Requirement: Overschedule allowance
The system SHALL allow players to spend beyond their discretionary budget up to a configurable overschedule limit (default: 5 extra slots). Overscheduled slots reduce the burnout buffer and incur next-month penalties.

#### Scenario: Player overschedules by 3 slots
- **WHEN** the player spends 3 slots beyond their discretionary budget
- **THEN** the burnout buffer SHALL decrease by 3 points AND the next month's discretionary slots SHALL be reduced by 2

#### Scenario: Player hits overschedule cap
- **WHEN** the player has already overscheduled to the maximum limit
- **THEN** no further actions SHALL be allowed this month

### Requirement: Slot tracking state
The system SHALL maintain a CalendarState object containing: totalSlots, fixedSlots, discretionarySlots, slotsSpent, overscheduleAmount, burnoutBuffer, burnoutState, interactionsThisMonth (map of NPC ID → count), and month number.

#### Scenario: State serialization for save
- **WHEN** the game state is saved
- **THEN** CalendarState SHALL be serialized as part of GameState replacing the old NarrativeState

#### Scenario: State migration from v2
- **WHEN** a v2 save (with NarrativeState) is loaded
- **THEN** the system SHALL migrate to CalendarState using defaults (22 discretionary, burnout buffer at max, no interactions logged)
