## MODIFIED Requirements

### Requirement: Side panel modes
The right-side panel SHALL support the following modes, switching based on player actions: default (active projects list), event mode (event description and response buttons), community proposal mode (leader portrait, proposal details, response buttons), tile detail mode (neighborhood properties and available projects), and **conversation mode** (character portrait, dialogue thread, player response options or dismiss button). The conversation mode activates when a character interaction generates dialogue (proposal response, lobbying, direct engagement, antagonist event).

#### Scenario: Side panel switches to conversation mode
- **WHEN** the player responds to a community leader's proposal
- **THEN** the side panel switches to conversation mode showing the leader's portrait, dialogue, and a dismiss button to return to the previous panel mode

#### Scenario: Conversation mode dismisses to previous mode
- **WHEN** the player dismisses the conversation panel
- **THEN** the side panel returns to whatever mode it was in before the conversation (tile detail, proposal list, etc.)
