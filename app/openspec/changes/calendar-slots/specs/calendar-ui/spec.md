## ADDED Requirements

### Requirement: Stamina bar (always visible)
The system SHALL display an abstract stamina bar showing remaining discretionary slots as a proportion of total discretionary budget. The bar SHALL change color as slots deplete: green (>60%), yellow (30-60%), orange (10-30%), red (<10%), pulsing red (overscheduled).

#### Scenario: Full budget at month start
- **WHEN** a new month begins with 22 discretionary slots available
- **THEN** the stamina bar SHALL display as full and green

#### Scenario: Overschedule visual
- **WHEN** the player has overscheduled by 3 slots
- **THEN** the stamina bar SHALL show a pulsing red extension beyond 100% indicating debt

#### Scenario: Crisis tax visible on bar
- **WHEN** active crises consume 5 discretionary slots
- **THEN** the stamina bar's maximum SHALL visually shrink, showing a grayed-out "taxed" portion

### Requirement: Monthly calendar grid (expandable)
The system SHALL provide an expandable monthly grid view showing all 60 slots as cells. Fixed obligations SHALL appear as pre-filled gray cells. Spent discretionary slots SHALL show the action taken and NPC involved. Remaining discretionary slots SHALL appear as open cells.

#### Scenario: Expand calendar view
- **WHEN** the player clicks the stamina bar or a "view calendar" control
- **THEN** a monthly grid SHALL expand showing all slots with their status (fixed/spent/available/taxed)

#### Scenario: Spent slot shows detail
- **WHEN** a discretionary slot has been used
- **THEN** that cell SHALL show the action type icon and the NPC/location name

#### Scenario: Crisis-taxed slots marked
- **WHEN** a crisis is consuming discretionary slots
- **THEN** those slots SHALL appear with a crisis indicator and the arc name

### Requirement: Year heatmap (election view)
The system SHALL provide a 48-month (4-year term) heatmap view showing time allocation across all neighborhoods over the full term. This view SHALL be available at any time and SHALL be prominently featured during election evaluation.

#### Scenario: Heatmap shows neighborhood distribution
- **WHEN** the player opens the year view
- **THEN** each month SHALL show a color-coded breakdown of how discretionary slots were allocated per neighborhood

#### Scenario: Election uses heatmap
- **WHEN** the election event fires at month 48
- **THEN** the voter evaluation SHALL incorporate the 48-month allocation pattern as a factor (did the mayor spread time equitably or concentrate on favorites?)

### Requirement: Inline action buttons with slot costs
All player actions SHALL appear inline on tile detail panels and character cards (not in a separate actions panel). Each action button SHALL display its slot cost prominently.

#### Scenario: Tile shows available actions with costs
- **WHEN** the player views a neighborhood tile detail
- **THEN** available actions SHALL appear as buttons showing "[Action Name] — [N] slots"

#### Scenario: Character card shows interaction options
- **WHEN** the player views an NPC character card
- **THEN** available interaction types SHALL appear with slot costs and expected yield preview

#### Scenario: Grayed out when insufficient slots
- **WHEN** the player has fewer discretionary slots than an action costs
- **THEN** that action button SHALL appear grayed with "Would overschedule" warning
