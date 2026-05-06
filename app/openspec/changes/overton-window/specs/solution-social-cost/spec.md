## ADDED Requirements

### Requirement: Social cost calculation
When a player selects an unlocked taboo solution, the system SHALL apply a trust penalty (social cost) calculated from: baseSocialCost * max(0, 1 - (currentOpinion - unlockThreshold) / 35). Cost MUST decrease linearly as opinion rises above threshold.

#### Scenario: Solution chosen at threshold
- **WHEN** opinion is exactly at threshold (45) and base social cost is 5
- **THEN** trust penalty is 5.0 (full cost)

#### Scenario: Solution chosen well above threshold
- **WHEN** opinion is 62 (17 above threshold 45) and base social cost is 5
- **THEN** trust penalty is approximately 2.6 (reduced cost)

#### Scenario: Solution fully normalized
- **WHEN** opinion is 80 (35 above threshold 45) and base social cost is 5
- **THEN** trust penalty is 0 (no social cost, society fully accepts this)

### Requirement: Social cost applied as trust delta
The social cost MUST be applied as a communityTrust meter delta during choice resolution. It is in addition to any trust effects defined in the choice's immediate effects.

#### Scenario: Cost stacks with choice effects
- **WHEN** a taboo solution has immediate effect trust +3 and social cost of -4
- **THEN** net trust change is -1 (both applied in same resolution)

### Requirement: Social cost visibility
The UI SHALL display the current social cost alongside the taboo solution before the player selects it. The display MUST show both the cost and explain why ("Community isn't fully ready for this — trust will take a hit").

#### Scenario: Cost shown before selection
- **WHEN** a taboo solution is available with social cost 3.2
- **THEN** the choice displays "Social cost: -3.2 Trust (public opinion shifting but not yet fully accepting)"

#### Scenario: Zero cost shown
- **WHEN** a taboo solution has been normalized (cost = 0)
- **THEN** the choice displays no social cost warning (or "Fully accepted — no political risk")

### Requirement: Cost does not apply retroactively
If opinion drops after a taboo solution was chosen, no retroactive trust penalty SHALL be applied. The social cost is a one-time penalty at the moment of choice.

#### Scenario: Opinion drops after choice
- **WHEN** player chose a solution with cost 3 at opinion 48
- **AND** opinion later drops to 30
- **THEN** no additional trust penalty is applied; the -3 from the original choice is the only cost ever paid
