## ADDED Requirements

### Requirement: Projection engine calculates meter trajectories
The system SHALL calculate projected meter values for the next 12 turns based on: current regen rates, active project effects (on completion), known policy drains, and scheduled delayed consequence effects.

#### Scenario: Will projection with current regen
- **WHEN** will is at 25%, trust is at 50% (regen = 1.33/turn), and no drains are scheduled
- **THEN** the projection shows will climbing steadily: 26.3, 27.6, 28.9... over the next 12 turns

#### Scenario: Budget projection with project costs and revenue
- **WHEN** budget is $1200K, two projects cost $50K/turn maintenance, and one project completing in 3 turns adds $80K/turn revenue
- **THEN** the projection shows budget declining for 3 turns then stabilizing after the revenue project completes

#### Scenario: Eco projection with project completion
- **WHEN** eco is at 40%, natural decay is -0.05/turn, and a rain garden completing in 2 turns adds +5% eco on completion
- **THEN** the projection shows eco dipping slightly for 2 turns then jumping to ~45% on completion turn

### Requirement: Projections displayed as trend indicators on meter bar
The system SHALL display a trend arrow (up, down, flat) next to each meter showing the projected direction over the next 6 turns.

#### Scenario: Rising meter
- **WHEN** the projected value in 6 turns is more than 3% higher than current
- **THEN** an upward arrow appears next to the meter, colored green

#### Scenario: Falling meter
- **WHEN** the projected value in 6 turns is more than 3% lower than current
- **THEN** a downward arrow appears next to the meter, colored red/orange

#### Scenario: Stable meter
- **WHEN** the projected value in 6 turns is within 3% of current
- **THEN** a flat/horizontal arrow appears, colored neutral

### Requirement: Projections account for delayed consequences
The system SHALL include known delayed consequences (those the player has been foreshadowed about) in the projection calculation.

#### Scenario: Consequence will drain in projection
- **WHEN** a delayed consequence with effect `politicalWill: -3` is scheduled to fire in 4 turns and has been foreshadowed
- **THEN** the will projection shows a dip at turn+4

#### Scenario: Hidden consequences excluded
- **WHEN** a delayed consequence exists but its foreshadow window hasn't started yet
- **THEN** the projection does NOT include its effects (player doesn't know about it yet)

### Requirement: Projection shown on dashboard detail view
The system SHALL display a sparkline chart for each meter on the dashboard, showing the 12-turn projected trajectory with the current value marked.

#### Scenario: Sparkline for eco health
- **WHEN** the player views the dashboard
- **THEN** a small sparkline chart shows eco's projected path over 12 turns, with a dot at the current value and a dashed line for the projected portion

#### Scenario: Stage threshold lines
- **WHEN** a meter's stage advancement threshold is within the projection range
- **THEN** a horizontal reference line marks that threshold (e.g., "eco 55% for restoration") so the player can see if they're on track

### Requirement: Projections are pure calculations, not stored state
The system SHALL compute projections on render from current GameState, not persist them in the game state object.

#### Scenario: Projection updates after player action
- **WHEN** the player starts a new project that will boost eco
- **THEN** the eco projection immediately updates to reflect the future completion effect without waiting for END_TURN
