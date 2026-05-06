## ADDED Requirements

### Requirement: Taboo solution definition
Crisis fork choices SHALL support a `taboo` property that marks them as gated behind public opinion. Taboo solutions MUST specify: gating opinion topic, unlock threshold, base social cost, justification paper DOIs, and player-facing lock description.

#### Scenario: Taboo choice in arc template
- **WHEN** an arc template defines a crisis fork choice with a `taboo` field
- **THEN** that choice is treated as a taboo solution subject to opinion gating and social cost mechanics

#### Scenario: Normalized choice (no taboo field)
- **WHEN** a crisis fork choice has no `taboo` field
- **THEN** it is always available with no opinion gate or social cost

### Requirement: Taboo solutions always visible
Locked taboo solutions SHALL be visible in crisis fork event UI. They MUST show the solution name, appeal text, lock status, gating topic, current opinion progress, and threshold needed.

#### Scenario: Player sees locked solution
- **WHEN** a crisis fork event is displayed with a taboo choice that is currently locked
- **THEN** the player sees the choice grayed out with: name, brief description, "Requires: [topic] acceptance (32/45)", and any near-threshold research paper links

#### Scenario: Player sees unlocked taboo solution
- **WHEN** opinion meets or exceeds the unlock threshold for a taboo choice
- **THEN** the choice is displayed as available with its social cost shown

### Requirement: Initial taboo solution set
The system SHALL launch with at minimum 5 taboo solutions across different arcs:
1. Humanure composting / nutrient recovery (phosphorus arc, gates on nutrientRecycling)
2. Community-scale nuclear (energy arc, gates on nuclearEnergy)
3. Eminent domain for community land trust (housing arc, gates on landExpropriation)
4. Planned de-growth / consumption limits (infrastructure arc, gates on deGrowth)
5. Biosolids-to-fertilizer processing (phosphorus arc, gates on nutrientRecycling)

#### Scenario: All initial taboo solutions loadable
- **WHEN** the system starts with initial arc templates
- **THEN** all 5 taboo solutions are defined with valid thresholds, costs, and paper links

### Requirement: Taboo solution choice is permanent
Once a player selects a taboo solution, that choice persists regardless of later opinion drift. Opinion drift MAY re-lock the solution for future events, but a choice already made CANNOT be revoked.

#### Scenario: Opinion drifts after choice
- **WHEN** a player chose humanure composting at opinion 47 (threshold 45)
- **AND** opinion later drifts to 38
- **THEN** the previously made choice and its effects remain active; the solution shows as locked again for any future fork that offers it
