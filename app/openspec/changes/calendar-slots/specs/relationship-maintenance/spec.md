## ADDED Requirements

### Requirement: Relationship decay from neglect
The system SHALL decay relationships that are not maintained within their tier's frequency threshold. Each relationship tier has a required interaction frequency: Inner Circle (monthly), Key Allies (every 2 months), Active Network (every 3 months), Known Contacts (every 6 months).

#### Scenario: Key ally not visited for 3 months
- **WHEN** a Key Ally NPC has not been interacted with for 3 months (1 month past threshold)
- **THEN** their trust SHALL decay by 5 points per month of neglect beyond the threshold

#### Scenario: Inner circle not visited for 2 months
- **WHEN** an Inner Circle NPC has not been interacted with for 2 months
- **THEN** their trust SHALL decay by 8 points (inner circle decays faster due to higher expectations)

#### Scenario: Known contact decay is gentle
- **WHEN** a Known Contact NPC has not been interacted with for 8 months
- **THEN** their trust SHALL decay by 2 points per month beyond threshold

### Requirement: Diminishing returns per person per month
The system SHALL apply logarithmic diminishing returns to repeated interactions with the same NPC within a single month. Formula: `yield = log₁₀(baseMultiplier / meetingCount²) × depthFactor`

#### Scenario: First meeting with NPC this month
- **WHEN** the player meets an NPC for the first time this month (meetingCount = 1)
- **THEN** the yield SHALL use the full base multiplier: `log₁₀(baseMultiplier / 1) × depthFactor`

#### Scenario: Third meeting with same NPC
- **WHEN** the player meets the same NPC for the third time this month (meetingCount = 3)
- **THEN** the yield SHALL be reduced: `log₁₀(baseMultiplier / 9) × depthFactor` (approximately 53% of first meeting for base 100)

#### Scenario: Fifth meeting produces minimal yield
- **WHEN** the player meets the same NPC for the fifth time this month
- **THEN** the yield SHALL be significantly diminished (approximately 28% of first meeting for base 100)

### Requirement: Relationship depth factor
The system SHALL scale yields by relationship depth: neutral (0.5×), supporter (0.7×), trusted (0.85×), champion (1.0×), partner (1.5×).

#### Scenario: Partner-tier NPC gives 1.5x yield
- **WHEN** the player meets a partner-tier NPC for the first time this month
- **THEN** the resource yield SHALL be multiplied by 1.5

#### Scenario: Neutral NPC gives half yield
- **WHEN** the player meets a neutral-tier NPC
- **THEN** the resource yield SHALL be multiplied by 0.5

### Requirement: Maintenance cost display
The system SHALL display, per NPC, their maintenance frequency requirement, months since last interaction, and decay warning when approaching threshold.

#### Scenario: Decay warning shown
- **WHEN** an NPC is within 1 month of their maintenance threshold
- **THEN** their character card SHALL display a warning indicator showing "needs attention"

#### Scenario: Active decay shown
- **WHEN** an NPC is past their maintenance threshold and actively decaying
- **THEN** their character card SHALL display the trust loss rate and a "relationship fading" indicator
