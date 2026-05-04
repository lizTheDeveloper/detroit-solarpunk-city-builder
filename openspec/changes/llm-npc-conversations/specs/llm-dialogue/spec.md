## ADDED Requirements

### Requirement: LLM-powered character dialogue generation
The system SHALL generate character dialogue via the Anthropic API (Claude Haiku) when LLM features are enabled. Each character interaction produces dialogue that is personality-consistent, game-state-aware, and tied to a specific game action. LLM dialogue is display-only — it SHALL NOT affect game mechanics, meter values, or state transitions.

#### Scenario: Character responds to accepted proposal
- **WHEN** the player accepts Grace Okafor-Williams' food forest proposal with LLM enabled
- **THEN** the system sends a request to Claude Haiku with Grace's system prompt and current game context (her trust level, Brightmoor's state, recent events), and displays the generated response in the conversation panel within 2 seconds

#### Scenario: LLM disabled falls back to static line
- **WHEN** the player accepts Grace's proposal with LLM disabled in settings
- **THEN** the system displays a pre-written static dialogue line from Grace's dialogue pool instead of making an API call

#### Scenario: API failure falls back to static line
- **WHEN** the LLM API call fails (network error, rate limit, timeout after 5 seconds)
- **THEN** the system displays a static fallback line and logs the error. The game continues normally with no interruption.

### Requirement: Per-character system prompts
Each of the 21 named characters SHALL have a system prompt that encodes: personality description, speech patterns (vocabulary, sentence structure, verbal tics), backstory summary, priority issues, relationship dynamics, and 2-3 example dialogue lines as few-shot examples. System prompts are static and cacheable.

#### Scenario: System prompt produces consistent voice
- **WHEN** Grace Okafor-Williams' system prompt includes "speaks slowly and deliberately, references soil and seasons, uses farming metaphors, does not trust outsiders easily"
- **THEN** generated dialogue consistently uses agricultural metaphors, measured pacing, and reflects her guarded-but-warm personality across multiple interactions

#### Scenario: Antagonist system prompt produces distinct voice
- **WHEN** Sterling Cross's system prompt includes "speaks in corporate jargon, frames everything as investment opportunity, is condescending toward community-led approaches, uses phrases like 'real money' and 'market reality'"
- **THEN** generated dialogue is recognizably Sterling Cross and distinct from other characters

### Requirement: Game state context injection
Each LLM call SHALL include relevant game state in the user message: current meters (trust, eco, budget), the character's relationship score, recent events affecting their neighborhood, active projects on their tiles, the specific game action triggering the dialogue, and the last 3 exchanges with this character (conversation memory).

#### Scenario: Character references specific game state
- **WHEN** the player lobbies Victor Marek on a policy with budget at $1.1M and Marek's district having just experienced flooding
- **THEN** the generated dialogue may reference the tight budget ("Show me the numbers — $1.1M does not leave much room for experiments") and the flooding ("My district just flooded. Fix that first, then we talk policy.")

#### Scenario: Character references relationship history
- **WHEN** Kez Monroe's trust is -25 after 3 rejected proposals, and the player starts a direct engagement
- **THEN** the generated dialogue reflects the damaged relationship ("You rejected my housing proposals three times. Why should I believe you now?")

### Requirement: Conversation memory per character
Each character SHALL maintain a conversation history of their last 5 exchanges with the player. This history is included in subsequent LLM calls for that character and is pruned on game save (only the most recent 5 are persisted). Memory enables characters to reference past conversations.

#### Scenario: Character references past conversation
- **WHEN** the player promised Grace in a previous conversation to prioritize Brightmoor food projects, then started a Solar Grid in Downtown instead
- **THEN** Grace's next interaction may reference the broken promise: "You told me Brightmoor was next. I see a solar grid downtown instead."

#### Scenario: Memory is pruned on save
- **WHEN** a character has 7 conversation entries and the game saves
- **THEN** only the 5 most recent entries are persisted. The 2 oldest are discarded.

### Requirement: Bounded conversation structure
Character interactions SHALL follow a fixed exchange structure based on the interaction type. The player does NOT type free text — they select from 2-3 pre-defined or LLM-generated response options.

| Interaction Type | Max Exchanges | Player Input |
|-----------------|---------------|--------------|
| Proposal response | 1 | None (character reacts to accept/modify/defer/reject) |
| Council lobbying | 3 | Select argument from 2-3 options |
| Direct engagement | 3 | Select topic from character's priorities |
| Antagonist event | 2 | Select from event response options |
| Re-election speech | 1 | None (character endorses or opposes) |

#### Scenario: Council lobbying conversation
- **WHEN** the player spends a narrative action to lobby Bobby Slade on Green Infrastructure Grants
- **THEN** the system generates 2-3 argument options for the player (e.g., "Frame as property value protection", "Appeal to infrastructure repair", "Show neighborhood flood data"). The player selects one. Slade responds via LLM. The player may get one more exchange. The mechanical lobbying bonus (+5 to +15) is determined by argument alignment, not by the LLM.

#### Scenario: Direct engagement conversation
- **WHEN** the player uses a narrative action for direct engagement with Hassan Farah
- **THEN** the system shows Hassan's opening (LLM-generated based on his current concerns). The player selects a topic from Hassan's priorities. Hassan responds. The mechanical trust bonus (+5 to +10) is applied regardless of dialogue content.

### Requirement: Cost controls and rate limiting
The system SHALL enforce cost controls: maximum 200 API calls per game session, maximum 600 input tokens and 200 output tokens per call, and a per-minute rate limit of 10 calls. The settings panel SHALL display estimated cost per interaction and total session cost.

#### Scenario: Rate limit reached
- **WHEN** the player has made 200 API calls in the current session
- **THEN** all subsequent character interactions fall back to static dialogue. A notification displays: "LLM dialogue limit reached for this session. Using pre-written dialogue."

#### Scenario: Cost display in settings
- **WHEN** the player opens LLM settings
- **THEN** the panel shows: current session API calls (e.g., "47 / 200"), estimated cost so far (e.g., "~$0.47"), estimated cost for full game (e.g., "~$0.80-1.20"), and a toggle to disable LLM dialogue

### Requirement: Response caching
The system SHALL cache LLM responses in memory keyed by a hash of (character ID, interaction type, game state snapshot). Duplicate requests with identical context return the cached response. Cache uses LRU eviction at 100 entries and is not persisted across page reloads.

#### Scenario: Cached response on undo/replay
- **WHEN** the player undoes a turn and re-accepts the same proposal from the same character with identical game state
- **THEN** the cached LLM response is returned immediately without an API call

#### Scenario: Different game state produces new response
- **WHEN** the player undoes a turn, changes their actions (starts a different project first), then accepts the same proposal
- **THEN** the game state hash differs and a new LLM call is made, producing a response that reflects the different context
