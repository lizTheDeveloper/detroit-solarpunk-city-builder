## ADDED Requirements

### Requirement: Top bar displays turn context
The UI SHALL display a persistent top bar showing: current season (with icon), current year and term, and a political will gauge.

#### Scenario: Top bar shows current state
- **WHEN** the game is on Summer, Year 3, Term 1
- **THEN** the top bar displays "Summer | Year 3, Term 1" with a political will bar showing current percentage

### Requirement: Tile map occupies primary viewport
The PixiJS tile map SHALL occupy the largest portion of the screen (left/center area). It is the primary interaction surface where the player views and interacts with Detroit neighborhoods.

#### Scenario: Map is the dominant UI element
- **WHEN** the game renders
- **THEN** the tile map occupies at least 60% of the viewport width and the full viewport height minus top and bottom bars

### Requirement: Side panel for context
A collapsible right-side panel SHALL display contextual information: active projects with progress bars, current events requiring response, and tile details when a tile is selected.

#### Scenario: Side panel shows active projects
- **WHEN** no tile is selected and no event is pending
- **THEN** the side panel shows a list of active projects with name, target tile, and progress (e.g., "Food Forest - Brightmoor 2/3")

#### Scenario: Side panel shows event
- **WHEN** an event requires player response
- **THEN** the side panel displays the event description, context, and response options as clickable buttons

#### Scenario: Side panel shows tile details
- **WHEN** the player clicks a tile
- **THEN** the side panel switches to show that tile's properties, active projects, and available project actions

### Requirement: Bottom meter bar
The UI SHALL display all six meters in a persistent bottom bar with labeled gauges showing current values.

#### Scenario: Meters are always visible
- **WHEN** the game is active
- **THEN** the bottom bar shows: Community Trust, Ecological Health, Food Sovereignty, Political Will, Budget, and Climate Pressure with visual bars and numeric values

### Requirement: End Turn control
The UI SHALL provide a prominent "End Turn" button that advances to the Resolve phase and then the next turn. The button SHALL be disabled during events that require response.

#### Scenario: End turn advances game
- **WHEN** the player clicks "End Turn" with no pending mandatory events
- **THEN** the resolve phase executes and the game advances to the next turn

#### Scenario: End turn blocked by crisis
- **WHEN** a crisis event is pending
- **THEN** the End Turn button is disabled with a tooltip indicating the crisis must be resolved first

### Requirement: Turn summary overlay
After the Resolve phase, the UI SHALL display a turn summary overlay showing all changes before the next turn begins. The player dismisses it to proceed.

#### Scenario: Summary appears after resolve
- **WHEN** the resolve phase completes
- **THEN** an overlay displays: meter deltas (with +/- indicators), completed projects, tile transformations, and upcoming season preview

### Requirement: Responsive desktop layout
The UI SHALL render correctly on desktop screens (1280px width minimum). Layout uses a fixed structure: top bar, main area (map + side panel), bottom meters.

#### Scenario: Renders at minimum width
- **WHEN** the viewport is 1280px wide
- **THEN** all UI elements are visible and usable without horizontal scrolling
