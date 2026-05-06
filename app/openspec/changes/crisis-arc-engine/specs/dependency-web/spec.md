## ADDED Requirements

### Requirement: Condition creation from choices
Player choices in crisis fork events SHALL create named string conditions that persist in game state. Conditions represent commitments, alliances, capacities, or consequences of past decisions.

#### Scenario: Choice creates condition
- **WHEN** player selects "Support DTE Grid Modernization" in an energy crisis fork
- **THEN** conditions "accepted_dte_grid_plan" and "union_support" are added to the dependency web

#### Scenario: Choice removes condition
- **WHEN** a choice specifies `removes_conditions: ["union_support"]`
- **THEN** "union_support" is removed from the dependency web upon that choice

### Requirement: Condition gating on future choices
Arc template choices SHALL specify required conditions. A choice MUST NOT be available to the player unless all its required conditions are present in the dependency web.

#### Scenario: Gated choice unavailable
- **WHEN** a crisis fork offers choice "Activate microgrid backup" requiring condition "has_community_solar"
- **AND** "has_community_solar" is NOT in the dependency web
- **THEN** that choice is shown as locked/unavailable with a hint about what's missing

#### Scenario: Gated choice available
- **WHEN** the same choice is presented AND "has_community_solar" IS in the dependency web
- **THEN** that choice is available for the player to select

### Requirement: Capacity tracking
The dependency web SHALL support numeric capacities (not just boolean conditions). Capacities represent quantified infrastructure or social capabilities built through projects and choices.

#### Scenario: Capacity accumulation
- **WHEN** player completes a solar_grid project
- **THEN** capacity "grid_resilience" increases by the project's configured contribution (e.g., +2)

#### Scenario: Capacity threshold check
- **WHEN** a crisis fork choice requires "grid_resilience >= 5"
- **THEN** it is available only if the player's grid_resilience capacity meets that threshold

### Requirement: Cross-arc condition sharing
Conditions created by one arc's choices SHALL be readable by other arcs' templates. Arcs interact through shared conditions, not direct coupling.

#### Scenario: Energy arc affects water arc
- **WHEN** player accepted "dte_grid_plan" in energy arc (creating that condition)
- **AND** water arc escalates to crisis
- **THEN** water arc template can gate a choice on "accepted_dte_grid_plan" being present (e.g., "DTE lobbies against your water infrastructure spending")

### Requirement: Condition persistence
All conditions and capacities SHALL persist across turns, elections, and stage transitions. They MUST be serializable as part of game save state.

#### Scenario: Save and load
- **WHEN** a game is saved with conditions ["accepted_dte_grid_plan", "community_solar_proposal"] and capacity {grid_resilience: 3}
- **THEN** loading that save restores the exact same dependency web state
