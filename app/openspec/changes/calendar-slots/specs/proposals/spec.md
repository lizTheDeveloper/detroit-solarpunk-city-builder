## MODIFIED Requirements

### Requirement: Proposal review costs calendar slot
Reviewing a proposal SHALL cost 1 calendar slot. The player must spend time to evaluate proposals, making proposal review a deliberate time allocation decision.

#### Scenario: Reviewing costs 1 slot
- **WHEN** the player opens a proposal for review (expanding it to read details and make a decision)
- **THEN** 1 discretionary slot SHALL be deducted from the calendar budget

#### Scenario: Quick glance is free
- **WHEN** the player views the collapsed proposal card (title + primary effects only)
- **THEN** no slots SHALL be consumed (browsing is free, committing to review costs time)

## ADDED Requirements

### Requirement: Proposals show crisis slots prevented
Each proposal card SHALL display the estimated number of crisis calendar slots it would prevent over the player's term. This quantifies prevention in time-budget terms.

#### Scenario: Rain garden shows slot prevention
- **WHEN** a rain garden proposal is displayed
- **THEN** it SHALL show "Saves ~28 crisis slots over your term" based on flood arc frequency × flood stage taxes × expected prevention duration

#### Scenario: Non-preventative proposal shows nothing
- **WHEN** a proposal has no climate adaptation or crisis prevention benefit
- **THEN** no "crisis slots prevented" line SHALL appear

### Requirement: Proposal slot cost displayed on card
Every proposal card SHALL prominently show "Review: 1 slot" to make the time cost visible before the player commits.

#### Scenario: Slot cost visible on collapsed card
- **WHEN** a proposal card is displayed in collapsed state
- **THEN** the slot cost "1 slot to review" SHALL be visible alongside the proposal title
