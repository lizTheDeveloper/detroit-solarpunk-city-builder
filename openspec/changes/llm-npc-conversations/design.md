## Context

The game has 21 named characters with distinct personalities, priorities, and relationship arcs. The current spec calls for 3+ static dialogue lines per interaction type per character (~150+ lines). Static lines work for a first playthrough but become repetitive by the second term, especially for characters the player interacts with frequently (Grace, the council swing votes, Sterling Cross).

The game is browser-based (React + TypeScript + Vite). Characters already have rich data: backstory, priorities, speech patterns described in the character-system spec, relationship scores, and full game state context. This is exactly the context an LLM needs to generate personality-consistent dialogue.

The player base will be running this in a browser. API calls go from client to the Anthropic API (or a lightweight proxy for key management).

## Goals / Non-Goals

**Goals:**
- Characters speak in-context: reference specific game state, recent events, and relationship history
- Each character has a distinct voice that matches their personality description
- Conversations are structured around game actions (proposals, votes, lobbying) — not open-ended chat
- Graceful degradation: game is fully playable with static fallback lines when offline
- Cost-controlled: bounded conversations, smaller models, caching

**Non-Goals:**
- Open-ended free chat with characters (conversations are 2-3 exchanges tied to game actions)
- Player typing free-form text to characters (player selects from response options, not a text input)
- LLM-driven game logic (the LLM generates flavor text only — all mechanical effects are deterministic)
- Real-time streaming for NPC dialogue (fire-and-forget with typing indicator is fine)
- Multiplayer or social features

## Decisions

### 1. Claude Haiku for dialogue generation

**Choice**: Use Claude Haiku (claude-haiku-4-5-20251001) via the Anthropic TypeScript SDK.

**Why**: Haiku is fast (~500ms), cheap (~$0.01 per interaction at ~500 input + 150 output tokens), and produces quality creative writing. A full playthrough with ~80 character interactions costs ~$0.80. Opus or Sonnet would be 10-30x more expensive with marginal quality improvement for short dialogue.

**Alternative considered**: Local LLM (e.g., llama.cpp in WASM). Rejected because: browser WASM inference is too slow for good UX (5-15 seconds), model download is 2-4GB, and quality is significantly lower for personality-consistent creative writing.

**Alternative considered**: OpenAI GPT-4o-mini. Comparable price/speed but Anthropic SDK is already the natural fit, and Claude's creative writing is stronger for character voice.

### 2. System prompt per character, game state injected per call

**Choice**: Each character has a static system prompt (personality, backstory, speech patterns, priorities) stored in the character data files. On each interaction, the game state context (relevant meters, recent events, relationship history, what the interaction is about) is injected into the user message.

```
System: You are Grace Okafor-Williams, an urban farmer in her 60s...
        You speak slowly and deliberately. You reference soil, seasons, growth.
        You do not trust outsiders easily but you are fiercely loyal once earned.
        
User:   [Game context: Turn 12, Spring Year 3. Grace's trust: 45 (Advocate).
        She just proposed a Food Forest in Brightmoor. The player accepted.
        Brightmoor has 2 completed food projects. Budget is tight at $1.2M.
        Last turn, a heat wave damaged crops in Eastern Market.]
        
        Generate Grace's response to the player accepting her food forest proposal.
```

**Why**: Keeps system prompts cacheable (same across interactions), keeps game state in the user message (changes each call), and gives the model full context to generate relevant dialogue.

**Alternative considered**: Fine-tuning a model per character. Rejected: overkill for 21 characters, expensive, inflexible when character data changes.

### 3. Structured conversation flow (not free chat)

**Choice**: Conversations are triggered by game actions and follow a fixed structure:

| Trigger | Structure | Max exchanges |
|---------|-----------|---------------|
| Proposal response (accept/reject/etc.) | Character reacts to your choice | 1 (one-shot) |
| Council lobbying | Player argument → council member response → optional counter | 2-3 |
| Direct engagement (narrative action) | Character shares concerns → player responds → character reacts | 2-3 |
| Antagonist event | Antagonist threatens → player response option selected → antagonist reacts | 2 |
| Re-election campaign | Character endorsement/opposition speech | 1 (one-shot) |

The player does NOT type free text. They select from 2-3 response options (generated or pre-defined), and the character's reply is LLM-generated based on the selected option.

**Why**: Unbounded chat would break the game's pacing (it's turn-based strategy, not a visual novel), create unpredictable state, and multiply API costs. Structured conversations keep dialogue tied to game mechanics while still feeling dynamic.

### 4. Client-side API calls with proxy option

**Choice**: The browser makes direct API calls to the Anthropic API using a user-provided API key, with an optional lightweight proxy endpoint for hosted deployments.

```
┌──────────┐     ┌──────────────┐     ┌───────────┐
│ Browser   │────▶│ Proxy (opt.) │────▶│ Anthropic │
│ (game)    │     │ (rate limit, │     │ API       │
│           │◀────│  key mgmt)   │◀────│           │
└──────────┘     └──────────────┘     └───────────┘
```

For self-hosted / local play: user enters their own API key in settings.
For hosted deployment: proxy manages the API key and enforces rate limits.

**Why**: No backend required for the core game. API key in browser is acceptable for a single-player game where the user provides their own key. Proxy is optional infrastructure for a hosted version.

**Alternative considered**: Bundling API costs into a game subscription. Rejected for Phase 1 — adds billing complexity. Can be added later.

### 5. Caching by game-state hash

**Choice**: Cache LLM responses keyed by a hash of (character ID, interaction type, relevant game state snapshot). If the player reloads or replays the same turn with identical state, the cached response is returned without an API call.

Cache is in-memory (Map) with LRU eviction at 100 entries. Not persisted across page reloads (LLM responses are ephemeral flavor, not game state).

**Why**: Prevents redundant API calls during undo/replay. Keeps costs predictable.

### 6. Fallback hierarchy

```
LLM available? ──yes──▶ Generate dynamic dialogue
       │
      no
       │
       ▼
Static lines exist? ──yes──▶ Use static dialogue line
       │
      no
       │
       ▼
Generic fallback ──▶ "[Character name] responds."
```

The game ships with all static dialogue lines regardless of LLM availability. LLM dialogue is a layer on top, not a replacement. Player can disable LLM dialogue in settings.

## Risks / Trade-offs

**[API cost unpredictability]** → Mitigated by: Haiku pricing (~$0.01/interaction), bounded conversations (max 3 exchanges), per-session rate limit (max 200 API calls per game session), clear cost display in settings.

**[Latency disrupts game flow]** → Mitigated by: Haiku is fast (~500ms), typing indicator in UI, dialogue is non-blocking (player can dismiss and continue), pre-fetch likely next interactions during the player's turn.

**[Character voice inconsistency]** → Mitigated by: Detailed system prompts with speech pattern examples, few-shot examples in the system prompt (2-3 example lines from the static dialogue pool), temperature 0.7 for creativity with consistency.

**[Inappropriate content from LLM]** → Mitigated by: System prompts include behavioral constraints ("never break character", "never reference real-world events outside Detroit history", "never use slurs or graphic violence"), Anthropic's built-in safety layer, content is about city governance not sensitive topics.

**[Offline play breaks]** → Mitigated by: Complete static dialogue fallback. LLM features are opt-in. Game state never depends on LLM output — dialogue is display-only.

**[API key security in browser]** → Mitigated by: Key stored in localStorage (same security model as the game save), user provides their own key, proxy option for hosted deployments. Single-player game with no PII at risk.
