## MODIFIED Requirements

### Requirement: Character portrait and dialogue
Each council member, community leader, and antagonist SHALL have a character portrait (placeholder art initially), a system prompt for LLM dialogue generation, a static dialogue pool (at least 3 lines per response type as fallback), and a conversation history (last 5 exchanges). The system prompt SHALL encode the character's personality, speech patterns, vocabulary, priorities, and 2-3 example dialogue lines. Dialogue lines SHALL reflect the character's personality, speech patterns, and values -- not generic placeholder text.

#### Scenario: Grace responds to accepted proposal with LLM enabled
- **WHEN** the player accepts Grace Okafor-Williams' food forest proposal and LLM is enabled
- **THEN** Grace's system prompt is sent with current game context (Brightmoor state, her trust, recent events) and the LLM generates a personality-consistent response referencing specific game state. The response appears in the conversation panel.

#### Scenario: Grace responds to accepted proposal with LLM disabled
- **WHEN** the player accepts Grace Okafor-Williams' food forest proposal and LLM is disabled
- **THEN** Grace's portrait appears with a static dialogue line such as: "Good. The soil has been waiting. We will show this city what vacant land can become when you trust the people who never left."

#### Scenario: Bukowski responds to policy he opposes
- **WHEN** Frank Bukowski votes NO on a progressive policy
- **THEN** Bukowski's portrait appears with dialogue (LLM or static) such as: "I have been in this city for 40 years. You do not fix Detroit with wish lists. You fix it with working streetlights and plowed roads. Come back when you have a real plan."

#### Scenario: Sterling Cross threatens the player
- **WHEN** Sterling Cross triggers a land acquisition event
- **THEN** Cross's portrait appears with dialogue (LLM or static) such as: "I am not the villain here, Mayor. I am offering investment. Real money, real jobs. What are you offering? Community gardens? Ask your residents if they would rather eat kale or pay rent."
