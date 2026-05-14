## ADDED Requirements

### Requirement: Grace Lee Boggs as mentor NPC
The system SHALL include Grace Lee Boggs as a special mentor character. She SHALL be available once per quarter (1 slot every 3 months). Her yields SHALL be: Vision/Overton shift at 4.0 (log₁₀(10000)) AND Burnout Buffer at +3. Her conversations SHALL be LLM-powered drawing from her actual philosophy of revolution, transformation, and letting go.

#### Scenario: Grace available quarterly
- **WHEN** 3 months have passed since last meeting with Grace
- **THEN** a "Meet with Grace" action SHALL appear, costing 1 slot

#### Scenario: Grace gives Vision yield
- **WHEN** the player meets with Grace
- **THEN** the Overton window on one player-chosen topic SHALL shift by 4.0 points AND the burnout buffer SHALL increase by 3

#### Scenario: Grace unavailable during cooldown
- **WHEN** the player met Grace last month
- **THEN** the "Meet with Grace" action SHALL NOT appear for 2 more months

### Requirement: Mentor unlock conditions
Each mentor SHALL have specific unlock conditions that gate when they become available. Grace Lee Boggs SHALL unlock when any taboo Overton topic exceeds 30% acceptance.

#### Scenario: Grace unlock via Overton threshold
- **WHEN** the player pushes any Overton topic past 30% acceptance
- **THEN** Grace SHALL become available with an introduction narrative event

#### Scenario: Alternate unlock path
- **WHEN** the player has not triggered any Overton topic past 30% by month 24
- **THEN** an alternate path SHALL open: a community elder introduces Grace if community trust > 65

### Requirement: Mentor conversation via LLM
Mentor meetings SHALL use the existing LLM conversation system with a specialized system prompt. The prompt SHALL include the mentor's philosophical framework, their historical context, and the current game state. The mentor's advice SHALL feel grounded in their actual worldview.

#### Scenario: Grace conversation reflects her philosophy
- **WHEN** the player meets Grace and the LLM generates dialogue
- **THEN** the system prompt SHALL include: Grace's philosophy of "becoming" vs "having", her emphasis on transformation over revolution, her Detroit roots, and the player's current burnout/delegation state

#### Scenario: Mentor responds to burnout
- **WHEN** the player is in overextended or burnout state AND meets a mentor
- **THEN** the mentor's system prompt SHALL include the burnout context AND the mentor SHALL be more likely to advise rest/delegation/letting go

### Requirement: Mentor character data structure
Mentor NPCs SHALL have additional data fields beyond standard NPCs: philosophy (string for LLM prompt), cooldownMonths (3 for quarterly), yieldType (resource type produced), yieldAmount (log-scale value), bufferGain (burnout buffer points), unlockCondition (structured prerequisite).

#### Scenario: Mentor data defines behavior
- **WHEN** a mentor is defined with cooldownMonths: 3, yieldAmount: 4.0, bufferGain: 3
- **THEN** the system SHALL enforce quarterly availability, produce 4.0 vision yield, and grant 3 buffer points per meeting

### Requirement: Multiple mentor characters
The system SHALL support multiple mentors beyond Grace, each with unique philosophical frameworks, yield types, and unlock conditions. All mentors SHALL be grounded in Detroit's actual radical history.

#### Scenario: Second mentor available
- **WHEN** a second mentor's unlock conditions are met (defined per mentor in data)
- **THEN** that mentor SHALL become available on their own quarterly cadence independent of other mentors
