## Why

The game has 21 named characters (9 council members, 8 community leaders, 4 antagonists) each with distinct personalities, speech patterns, priorities, and relationship dynamics. Static dialogue lines (3+ per interaction type) will feel repetitive after a few turns and undermine the game's thesis that transformation is about people, not numbers. LLM-powered conversations let characters respond dynamically to the actual game state — Grace can reference the specific food forest you just completed, Bukowski can grill you about the exact budget numbers, and Sterling Cross can tailor his threats to your actual vulnerabilities. This turns characters from flavor text into the living political relationships the game is about.

## What Changes

- Each character gets a system prompt encoding their personality, priorities, speech patterns, backstory, and current relationship with the player
- Character dialogue is generated via LLM API calls instead of pulled from a static line pool
- Conversations are context-aware: characters reference specific game state (meters, tiles, projects, recent events, their relationship history with the player)
- Fallback to static lines when offline, rate-limited, or if the player opts out (LLM dialogue is opt-in, not required)
- Conversation UI panel where the player can engage in 2-3 turn exchanges with a character (not open-ended chat — structured around game actions like proposals, votes, lobbying)
- Character memory: each character tracks a short conversation history so they can reference past exchanges ("You promised me last term you'd fund east side youth programs")
- Cost management: conversations are bounded (max 3 exchanges per interaction), use a smaller/cheaper model for NPC dialogue, and are cached per game state hash to avoid redundant calls

## Capabilities

### New Capabilities
- `llm-dialogue`: LLM-powered character dialogue generation with personality prompts, game state injection, conversation structure (proposal discussions, lobbying exchanges, antagonist confrontations), fallback to static lines, cost controls, and caching
- `conversation-ui`: In-game conversation panel for structured character exchanges during proposal responses, council lobbying, direct engagement, and antagonist events

### Modified Capabilities
- `character-system`: Characters gain system prompts, conversation history tracking, and personality-consistent dialogue generation parameters
- `ui-shell`: Side panel gains a conversation mode for character exchanges
- `narrative-system`: Direct engagement narrative action becomes a conversation with the targeted character instead of a flat +5 to +10 bonus

## Impact

- **New dependency**: Anthropic SDK (`@anthropic-ai/sdk`) for Claude API calls
- **API costs**: ~$0.01-0.03 per character interaction using Claude Haiku; roughly $0.50-1.50 per full playthrough (64 turns, ~50-100 character interactions)
- **Network requirement**: Game becomes partially online (LLM features), but core gameplay remains fully offline with static dialogue fallback
- **State changes**: GameState gains per-character conversation history (last 5 exchanges per character, pruned on save)
- **Privacy**: Game state sent to API contains no real user data — only fictional game state. Player can disable LLM features entirely.
- **Latency**: Character responses take 1-3 seconds. UI shows typing indicator. Conversations are async and don't block game actions.
