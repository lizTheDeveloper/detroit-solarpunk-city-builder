## ADDED Requirements

### Requirement: Opinion threshold check
The system SHALL check the player's current public opinion value for a taboo solution's gating topic against the solution's unlock threshold. Solutions with opinion below threshold MUST be locked.

#### Scenario: Opinion below threshold
- **WHEN** nutrientRecycling opinion is 32 and a taboo solution requires threshold 45
- **THEN** the solution is locked and not selectable

#### Scenario: Opinion at threshold
- **WHEN** nutrientRecycling opinion is exactly 45 and threshold is 45
- **THEN** the solution is unlocked and selectable (with social cost applied)

#### Scenario: Opinion above threshold
- **WHEN** nutrientRecycling opinion is 60 and threshold is 45
- **THEN** the solution is unlocked with reduced social cost

### Requirement: Taboo-specific opinion topics
The PublicOpinion state SHALL be extended with sub-topics specific to taboo solution gating: nutrientRecycling, nuclearEnergy, landExpropriation, decarceration, deGrowth. These topics follow the same drift mechanics as existing broad topics.

#### Scenario: New topic initialization
- **WHEN** a new game starts
- **THEN** all taboo-specific opinion topics initialize at their configured floor values (default: 5-15 depending on topic)

#### Scenario: Topic drift
- **WHEN** a turn passes without narrative action on a taboo-specific topic
- **THEN** that topic's opinion drifts down at the standard drift rate (cannot go below floor)

### Requirement: Targeted education for taboo topics
The education_program narrative action SHALL accept a target topic parameter. When targeting a taboo-specific topic, it MUST raise that topic's opinion instead of the broad parent topic.

#### Scenario: Education targets taboo topic
- **WHEN** player uses education_program with target "nutrientRecycling"
- **THEN** nutrientRecycling opinion increases by the education program's base effect (with compounding bonus)

#### Scenario: Education targets broad topic (unchanged)
- **WHEN** player uses education_program with target "foodSovereignty"
- **THEN** behavior is unchanged from current system (broad topic opinion increases)

### Requirement: Near-threshold paper surfacing
When opinion is within 10 points of a taboo solution's unlock threshold, the system SHALL surface that solution's justification papers via the research-corpus API.

#### Scenario: Approaching threshold
- **WHEN** nutrientRecycling opinion reaches 36 (threshold is 45, within 10 points)
- **THEN** the game surfaces research papers linked to the humanure composting solution with a message indicating the science supports this approach

#### Scenario: Far from threshold
- **WHEN** nutrientRecycling opinion is 20 (threshold is 45, more than 10 points away)
- **THEN** no papers are surfaced for this solution

### Requirement: Multiple solutions on same topic
Multiple taboo solutions MAY gate on the same opinion topic with different thresholds. Higher-threshold solutions are more radical versions that unlock later.

#### Scenario: Tiered solutions
- **WHEN** nutrientRecycling topic has two solutions: "biosolids processing" (threshold 35) and "humanure composting" (threshold 50)
- **AND** opinion is at 40
- **THEN** biosolids processing is unlocked but humanure composting remains locked
