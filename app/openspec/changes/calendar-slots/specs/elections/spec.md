## MODIFIED Requirements

### Requirement: Election incorporates calendar allocation data
The election evaluation system SHALL use the player's 48-month time allocation pattern as a factor in voter outcome. Neighborhoods that received more of the mayor's time SHALL have higher approval. Neglected neighborhoods SHALL penalize the mayor's score.

#### Scenario: Equitable distribution bonus
- **WHEN** the player distributed discretionary slots relatively evenly across all neighborhoods over 48 months (no neighborhood below 10% of average)
- **THEN** a "equitable leader" bonus SHALL apply to overall election score (+5%)

#### Scenario: Neglected neighborhood penalty
- **WHEN** a neighborhood received less than 5% of total discretionary time over the term
- **THEN** that neighborhood's voter approval SHALL receive a -15% penalty

#### Scenario: Calendar weight in election
- **WHEN** the election outcome is calculated
- **THEN** calendar allocation data SHALL account for 30% of the voter evaluation (with meters at 50% and narrative choices at 20%)

## ADDED Requirements

### Requirement: Calendar portrait as election narrative
The system SHALL generate a narrative summary of the player's time allocation for the election event. This "portrait of priorities" SHALL be visible to the player and referenced by opponent attacks.

#### Scenario: Portrait generated at election
- **WHEN** month 48 (election) arrives
- **THEN** the system SHALL generate a summary: "Over 4 years, you spent X% of your time in [neighborhood], Y% on crisis response, Z% on relationship building..."

#### Scenario: Opponent weaponizes calendar data
- **WHEN** the player significantly neglected any neighborhood (< 5% time) OR overscheduled frequently (burnout events > 3)
- **THEN** an opponent attack event SHALL fire referencing the specific data: "Where were you when [neighborhood] needed you?"

### Requirement: Year heatmap in election UI
The election UI SHALL prominently feature the 48-month heatmap showing the player's time allocation across all neighborhoods as a visual summary of their term.

#### Scenario: Heatmap displayed during election
- **WHEN** the election event UI renders
- **THEN** the 48-month heatmap SHALL be displayed showing monthly slot allocation per neighborhood with color intensity representing time spent
