## ADDED Requirements

### Requirement: Three-frame generation per headline
The system SHALL generate up to 3 interpretation frames (establishment, community, market) for each classified headline with severity >= 2. Frames MUST be generated in the hourly batch job, not at runtime.

#### Scenario: Severity 2 headline processed
- **WHEN** a new headline is classified with severity 2 or 3
- **THEN** the batch job generates establishment, community, and market frames and stores them alongside the headline

#### Scenario: Severity 1 headline skipped
- **WHEN** a headline is classified with severity 1 (background)
- **THEN** no frames are generated (raw headline text used as-is)

#### Scenario: Frame not applicable
- **WHEN** the LLM determines a frame archetype doesn't apply to a headline
- **THEN** that frame is stored as null (e.g., a community garden story may have no market frame)

### Requirement: Frame grounding in real coverage
Frame generation prompts SHALL include memeorandum cluster data (related coverage from multiple outlets) when available. Frames MUST sound like real editorial stances, not invented positions.

#### Scenario: Headline has memeorandum cluster
- **WHEN** a headline has matching cluster links from memeorandum
- **THEN** the generation prompt includes those links as examples of real framing patterns

#### Scenario: No cluster available
- **WHEN** a headline has no memeorandum cluster match
- **THEN** the generation prompt uses only the antagonist voice profile for guidance

### Requirement: Frame format
Each generated frame SHALL be 1-2 sentences, include the faction it represents, and convey an opinionated interpretation (not a neutral summary). Frames MUST serve the faction's interests and use their characteristic language.

#### Scenario: Frame output shape
- **WHEN** a frame is generated
- **THEN** it includes `{ faction, text, confidence }` where text is 1-2 sentences and confidence is 0-1

### Requirement: Batch processing with classification
Frame generation SHALL run as part of the same hourly batch as headline classification. Frames are generated immediately after classification assigns arc tags and severity.

#### Scenario: Pipeline order
- **WHEN** the hourly batch runs
- **THEN** headlines are fetched → classified → frames generated for severity 2+ → all stored together

### Requirement: LLM failure fallback
If frame generation fails for a headline, the system SHALL store the headline without frames. Frameless headlines MUST still be servable via the API (client falls back to raw headline text).

#### Scenario: LLM rate limited during frame generation
- **WHEN** the LLM returns a rate limit error mid-batch
- **THEN** remaining headlines are stored without frames, marked for retry next cycle
