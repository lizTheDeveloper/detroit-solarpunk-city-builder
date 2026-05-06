## ADDED Requirements

### Requirement: Tutorial introduces mechanics progressively
The system SHALL introduce game mechanics one at a time through a sequence of tutorial steps, each triggered by a game state condition. Until a mechanic is introduced, its UI panel SHALL be visually de-emphasized (grayed/collapsed) but not hidden.

#### Scenario: First turn — only projects available
- **WHEN** the game starts for the first time and tutorial is active
- **THEN** the project panel is highlighted, narrative/policy panels are collapsed, and a tooltip says "Start by investing in a project for your community"

#### Scenario: Proposals introduced when first arrives
- **WHEN** the first community proposal is generated (typically T3)
- **THEN** a tooltip highlights the proposal panel explaining "Community leaders are bringing you ideas. Accept, modify, or defer."

#### Scenario: Narrative actions introduced on trust drop or T5
- **WHEN** communityTrust drops below 45% OR turn reaches 5 (whichever first)
- **THEN** the narrative panel is highlighted with tooltip "You can shape public opinion through direct action"

### Requirement: Tutorial steps auto-complete on player competence
The system SHALL mark a tutorial step as completed if the player performs the relevant action before the step triggers, proving they already understand the mechanic.

#### Scenario: Player starts project before tutorial prompts
- **WHEN** the player starts a project on T1 before the tutorial tooltip appears
- **THEN** the "start-project" step is marked completed and no tooltip is shown for it

#### Scenario: Player uses narrative action early
- **WHEN** the player performs a narrative action before T5 or trust drop
- **THEN** the "narrative-actions" step is auto-completed

### Requirement: Tutorial can be skipped entirely
The system SHALL provide a "Skip Tutorial" button visible from T1 that immediately marks all steps as completed and removes all guardrails.

#### Scenario: Skip button on first turn
- **WHEN** the player clicks "Skip Tutorial" on T1
- **THEN** all panels are fully visible, no tooltips appear, and the tutorial state is marked complete

#### Scenario: Skip persists across sessions
- **WHEN** the player skips the tutorial and saves the game
- **THEN** loading the save does not re-trigger the tutorial

### Requirement: Tutorial tracks progression in game state
The system SHALL store tutorial state as `{ active: boolean, completedSteps: string[], dismissedTooltips: string[] }` in GameState.

#### Scenario: State after partial tutorial
- **WHEN** the player has completed steps "start-project" and "read-meters" but not yet reached "proposals"
- **THEN** `tutorialState.completedSteps` contains ["start-project", "read-meters"]

#### Scenario: New game has tutorial active by default
- **WHEN** a new game is created
- **THEN** `tutorialState.active` is true and `completedSteps` is empty

### Requirement: Crisis mechanics introduced via foreshadow
The system SHALL introduce the crisis arc system when the first foreshadow hint appears, with a brief contextual explanation of arcs, escalation, and consequences.

#### Scenario: First foreshadow triggers tutorial step
- **WHEN** `getForeshadowHints()` returns a non-empty array for the first time
- **THEN** a tutorial overlay explains: "A crisis is developing. Foreshadow hints warn you of coming consequences. Take action to prevent them — or face the fork."

#### Scenario: Crisis fork has action prompt
- **WHEN** the player encounters their first crisis fork event
- **THEN** the crisis choice UI includes a brief explanation: "Each choice has immediate effects AND delayed consequences. Some options are locked behind public opinion thresholds."

### Requirement: Tutorial does not persist across games for new players
The system SHALL reset tutorial state when a new game is created (not loaded from save).

#### Scenario: Starting a second game
- **WHEN** a player who completed the tutorial in game 1 starts a new game
- **THEN** the tutorial is active again (they might want the refresher, and skip is one click away)
