## MODIFIED Requirements

### Requirement: Direct engagement as conversation
The direct engagement narrative action (spend 1 narrative action to visit a specific character) SHALL open a structured conversation with the targeted character instead of applying a flat relationship bonus. The conversation follows the direct engagement structure (character shares concerns, player selects topic, character responds, 2-3 exchanges max). The mechanical bonus (+5 to +10 relationship) is applied when the action is taken, regardless of conversation content. The conversation provides narrative flavor and reveals the character's current priorities and upcoming proposals.

#### Scenario: Direct engagement with LLM enabled
- **WHEN** the player spends 1 narrative action on "Visit Elder Whitehorse in Indian Village" with LLM enabled
- **THEN** Whitehorse's trust increases by +7 (mechanical effect applied immediately), and the conversation panel opens with Whitehorse's LLM-generated opening reflecting his current concerns. The player selects from topic options. Whitehorse responds with personality-consistent dialogue that may hint at upcoming events or proposals.

#### Scenario: Direct engagement with LLM disabled
- **WHEN** the player spends 1 narrative action on "Visit Elder Whitehorse in Indian Village" with LLM disabled
- **THEN** Whitehorse's trust increases by +7 (same mechanical effect), and a static dialogue line is displayed. The player learns Whitehorse's next proposal topic through a text summary rather than conversation.
