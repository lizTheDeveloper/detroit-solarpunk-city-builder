## 1. Types and Data Layer

- [ ] 1.1 Add LLM conversation types to types.ts (ConversationExchange, ConversationHistory, CharacterSystemPrompt, LLMSettings, ConversationState, InteractionType)
- [ ] 1.2 Add system prompt field and conversation history to existing character types (CommunityLeader, CouncilMember, Antagonist)
- [ ] 1.3 Add conversation mode to side panel state type

## 2. Per-Character System Prompts

- [ ] 2.1 Write system prompts for 5 community leaders (Grace, Kez, Darius, Hassan, Elder Whitehorse) with personality, speech patterns, priorities, and 2-3 example lines each
- [ ] 2.2 Write system prompts for 9 council members with distinct voices and political positions
- [ ] 2.3 Write system prompts for 4 antagonists (Sterling Cross, Vanessa Kohl, Senator Briggs, DTE) with corporate/political speech patterns
- [ ] 2.4 Write static fallback dialogue pools (3+ lines per interaction type per character)

## 3. LLM Service Layer

- [ ] 3.1 Create llm-service.ts with Anthropic SDK integration (sendMessage, buildSystemPrompt, buildUserContext)
- [ ] 3.2 Implement game state context injection (meters, relationship score, recent events, active projects, last 3 exchanges)
- [ ] 3.3 Implement response caching with LRU eviction (100 entries, keyed by hash of character+interaction+state)
- [ ] 3.4 Implement rate limiting (max 200 calls/session, 10 calls/minute)
- [ ] 3.5 Implement token budget enforcement (600 input / 200 output tokens per call)
- [ ] 3.6 Implement fallback hierarchy (LLM → static line → generic fallback)
- [ ] 3.7 Implement 5-second timeout with automatic fallback to static dialogue

## 4. Conversation State Management

- [ ] 4.1 Create conversation reducer/manager for tracking active conversation state (current exchange, pending response, dismiss)
- [ ] 4.2 Implement conversation memory per character (store last 5 exchanges, prune on save)
- [ ] 4.3 Implement bounded conversation flow controller (exchange limits per interaction type from spec table)
- [ ] 4.4 Implement response option generation (2-3 options for lobbying, direct engagement, antagonist events)

## 5. Conversation UI Components

- [ ] 5.1 Create ConversationPanel component (character portrait, name, relationship indicator, scrollable thread)
- [ ] 5.2 Create speech bubble components for character and player messages
- [ ] 5.3 Create PlayerResponseOptions component (2-3 selectable options with effectiveness hints)
- [ ] 5.4 Create TypingIndicator component ("[Character name] is thinking..." with animated dots)
- [ ] 5.5 Create conversation dismiss button with return-to-previous-panel behavior

## 6. Side Panel Integration

- [ ] 6.1 Add conversation mode to side panel mode switching logic
- [ ] 6.2 Wire proposal response to trigger conversation panel (character reacts to accept/modify/defer/reject)
- [ ] 6.3 Wire council lobbying to trigger conversation panel with argument selection
- [ ] 6.4 Wire direct engagement narrative action to trigger conversation panel with topic selection
- [ ] 6.5 Wire antagonist events to trigger conversation panel

## 7. LLM Settings UI

- [ ] 7.1 Create LLM settings panel with API key input (masked), enable/disable toggle, model selection
- [ ] 7.2 Implement API key storage in localStorage and test connection button
- [ ] 7.3 Implement session usage display (calls made / limit, estimated cost)
- [ ] 7.4 Wire settings toggle to enable/disable LLM across all character interactions

## 8. Integration Tests

- [ ] 8.1 Test full conversation flow: proposal response → conversation panel → character dialogue → dismiss
- [ ] 8.2 Test lobbying flow: narrative action → argument options → council member response → counter-argument
- [ ] 8.3 Test direct engagement flow: narrative action → opening → topic selection → character response
- [ ] 8.4 Test fallback: LLM disabled → static lines displayed, LLM timeout → static fallback
- [ ] 8.5 Test rate limiting: 200 calls → automatic fallback notification
- [ ] 8.6 Test conversation memory: character references past exchanges
- [ ] 8.7 Test cache hit: identical game state → cached response returned
