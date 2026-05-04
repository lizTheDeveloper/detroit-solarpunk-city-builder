## ADDED Requirements

### Requirement: Conversation panel in side panel
The UI SHALL display a conversation panel as a mode of the right-side panel when a character interaction triggers dialogue. The panel shows the character's portrait, name, relationship indicator, and a scrollable conversation thread with speech bubbles.

#### Scenario: Conversation panel opens on proposal response
- **WHEN** the player responds to a community leader's proposal
- **THEN** the side panel switches to conversation mode showing the leader's portrait, their trust level, and their dialogue response (LLM-generated or static fallback)

#### Scenario: Conversation panel for lobbying
- **WHEN** the player spends a narrative action to lobby a council member
- **THEN** the conversation panel opens showing the council member, their disposition, and 2-3 argument options for the player to select. After selection, the council member's response appears.

### Requirement: Player response options (not free text)
The player SHALL interact with characters by selecting from 2-3 pre-defined response options, NOT by typing free text. Response options are either pre-defined (for proposal responses) or generated alongside the character's dialogue (for lobbying and direct engagement).

#### Scenario: Lobbying response options
- **WHEN** the player is lobbying Pat Lundgren on Green Infrastructure Grants
- **THEN** the panel shows 3 argument options like: "Frame as fiscal responsibility", "Reference recent flooding in her district", "Show infrastructure ROI projections". Each option has a small hint about likely effectiveness.

#### Scenario: Direct engagement topic selection
- **WHEN** the player visits Elder Whitehorse for direct engagement
- **THEN** the panel shows Whitehorse's opening remarks and 2-3 topic options drawn from his priorities: "Historic preservation", "Intergenerational programs", "Waterfront flooding concerns"

### Requirement: Typing indicator for LLM responses
The system SHALL display a typing indicator (animated dots) while waiting for an LLM response. The indicator appears in the conversation panel where the character's response will appear.

#### Scenario: Typing indicator during LLM call
- **WHEN** an LLM API call is in flight
- **THEN** the conversation panel shows "[Character name] is thinking..." with an animated dot indicator. When the response arrives, it replaces the indicator.

#### Scenario: Typing indicator timeout
- **WHEN** an LLM API call takes longer than 5 seconds
- **THEN** the typing indicator is replaced with the static fallback dialogue line and a subtle "(offline)" indicator

### Requirement: Conversation dismiss and continue
The player SHALL be able to dismiss the conversation panel at any time to continue their turn. Mechanical effects (trust changes, lobbying bonuses) are applied when the game action is taken, not when the conversation ends.

#### Scenario: Dismiss conversation mid-exchange
- **WHEN** the player is in a 3-exchange lobbying conversation and dismisses after the first exchange
- **THEN** the conversation panel closes, the lobbying bonus is already applied (it was applied when the player selected the argument), and the remaining exchanges are skipped

### Requirement: LLM settings panel
The settings SHALL include an LLM configuration section with: API key input (masked), enable/disable toggle, model selection (default Haiku), session usage display (calls made / limit, estimated cost), and a "Test Connection" button.

#### Scenario: Player configures API key
- **WHEN** the player enters an Anthropic API key in settings
- **THEN** the key is stored in localStorage, a test call verifies the key works, and LLM dialogue is enabled for all character interactions

#### Scenario: Player disables LLM dialogue
- **WHEN** the player toggles LLM dialogue off in settings
- **THEN** all character interactions use static fallback lines immediately with no API calls, and the API key remains stored for re-enabling later
