## MODIFIED Requirements

### Requirement: LLM system prompt includes burnout state
The LLM conversation system SHALL inject the player's current burnout state into the system prompt for all NPC conversations. NPCs SHALL respond differently to a burned-out mayor.

#### Scenario: Sustainable state - normal conversations
- **WHEN** the player is in "sustainable" burnout state AND initiates a conversation
- **THEN** the system prompt SHALL include: "The mayor is well-rested and focused."

#### Scenario: Overextended state - NPCs notice fatigue
- **WHEN** the player is in "overextended" state AND initiates a conversation
- **THEN** the system prompt SHALL include: "The mayor seems tired and rushed. They've been overcommitting." AND NPCs MAY comment on the mayor's health

#### Scenario: Burnout state - NPCs express concern
- **WHEN** the player is in "burnout" state AND initiates a conversation
- **THEN** the system prompt SHALL include: "The mayor is visibly burned out — forgetting commitments, struggling to focus. They look exhausted." AND NPCs SHALL express concern or frustration depending on their relationship

## ADDED Requirements

### Requirement: Diminished trust yields when burned out
Conversations held while overextended or burned out SHALL produce reduced trust gains. The burnout effectiveness modifier (0.8× or 0.5×) SHALL apply to all [TRUST: N] outcomes from LLM conversations.

#### Scenario: Overextended trust penalty
- **WHEN** a conversation produces [TRUST: +5] AND the player is overextended
- **THEN** actual trust gain SHALL be 5 × 0.8 = 4

#### Scenario: Burnout trust penalty
- **WHEN** a conversation produces [TRUST: +5] AND the player is in burnout
- **THEN** actual trust gain SHALL be 5 × 0.5 = 2 (rounded down)

### Requirement: Charm reduction in burnout
The LLM system prompt SHALL instruct the AI that the mayor's dialogue options feel less charismatic when burned out. The mayor struggles to be persuasive, occasionally says the wrong thing, and may come across as distracted.

#### Scenario: Burnout reduces persuasion
- **WHEN** the player attempts a persuasion-heavy conversation while burned out
- **THEN** the system prompt SHALL bias the NPC toward skepticism: "The mayor isn't at their best. They seem distracted and their arguments lack their usual conviction."
