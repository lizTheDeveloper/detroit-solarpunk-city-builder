## ADDED Requirements

### Requirement: Advisors surface contextual warnings
The system SHALL display at most one advisor prompt per turn, selected from a priority-ordered list of conditions. Each prompt is voiced by an existing community leader character and references the specific game state that triggered it.

#### Scenario: No eco projects and eco decaying
- **WHEN** no active projects have category "ecology" AND ecologicalHealth < 40%
- **THEN** an advisor prompt from the ecology-focused leader appears: character-voiced warning about losing ground

#### Scenario: Budget critical
- **WHEN** budget < $200K AND at least one project has maintenance cost
- **THEN** an advisor prompt warns about budget shortfall with specific numbers

#### Scenario: Election approaching with low approval
- **WHEN** turns until election < 10 AND predictedElectionScore < 50%
- **THEN** an advisor prompt warns about re-election risk

### Requirement: Advisor prompts are dismissable per-condition
The system SHALL allow the player to dismiss a specific advisor condition permanently with a "Don't remind me" action. Dismissed conditions SHALL NOT trigger again for the rest of the game.

#### Scenario: Player dismisses eco warning
- **WHEN** the player clicks "Don't remind me" on the eco decay warning
- **THEN** the eco-no-projects condition never triggers an advisor prompt again this game

#### Scenario: Dismissed conditions persist in save
- **WHEN** a condition is dismissed and the game is saved/loaded
- **THEN** the condition remains dismissed after load

### Requirement: Advisor prompts have cooldowns
The system SHALL enforce a minimum cooldown of 8 turns between firings of the same advisor condition (even if not permanently dismissed).

#### Scenario: Same warning won't repeat for 8 turns
- **WHEN** the budget warning fires on T10 and the player doesn't dismiss it
- **THEN** the budget warning cannot fire again until T18 even if the condition remains true

#### Scenario: Different conditions can fire on consecutive turns
- **WHEN** the eco warning fires on T10 and the budget warning condition is met on T11
- **THEN** the budget warning fires on T11 (different condition, independent cooldown)

### Requirement: Advisor prompts are non-blocking
The system SHALL display advisor prompts as a brief toast/banner that does not require interaction to continue playing. The prompt fades or collapses after 10 seconds if not interacted with.

#### Scenario: Prompt doesn't block turn actions
- **WHEN** an advisor prompt appears
- **THEN** the player can still click buttons, start projects, and take actions without dismissing the prompt

#### Scenario: Prompt auto-hides
- **WHEN** an advisor prompt appears and the player doesn't interact with it
- **THEN** the prompt fades out after 10 seconds and is treated as "seen but not dismissed"

### Requirement: Advisor prompts use character voice
The system SHALL display advisor prompts with the speaking character's name, portrait (if available), and a message written in that character's voice. The character selected SHALL be the one whose priorities most align with the warning topic.

#### Scenario: Eco warning from ecology leader
- **WHEN** the eco-no-projects condition triggers
- **THEN** the prompt shows the ecology-focused leader's name and a message in their voice (e.g., referencing their neighborhood, using their speech patterns)

#### Scenario: Political warning from council-connected character
- **WHEN** the election-risk condition triggers
- **THEN** the prompt comes from a character with political connections, not the ecology leader

### Requirement: Priority ordering resolves multiple conditions
The system SHALL select the highest-priority condition when multiple advisor conditions are met simultaneously. Priority order: crisis-related > budget-critical > election-approaching > meter-decay > general-strategy.

#### Scenario: Budget critical and eco decaying same turn
- **WHEN** both budget < $200K and eco < 40% with no eco projects
- **THEN** only the budget warning appears (higher priority)

#### Scenario: Crisis overrides everything
- **WHEN** an arc is at crisis stage with inaction timer maxed AND budget is critical
- **THEN** the crisis-related prompt appears (highest priority)
