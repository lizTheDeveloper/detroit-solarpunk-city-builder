## ADDED Requirements

### Requirement: Multi-turn projects with specific durations
Projects SHALL take multiple turns to complete. Each project has a defined duration in turns, a target tile, a budget cost, and effects that apply on completion. Spring season grants ecology-type projects +1 extra turn of progress (removed after Tipping Point 1). Winter reduces outdoor project progress by 1 turn (minimum 0 progress that turn).

#### Scenario: Start a project
- **WHEN** the player starts a "Food Forest" project on the Brightmoor tile
- **THEN** the project is added to active projects with progress 0/3 turns, $0.75M is deducted from budget, and the tile shows a project-in-progress indicator

#### Scenario: Project advances each turn
- **WHEN** a turn resolves with an active Food Forest project at 1/3 progress in Spring
- **THEN** the project advances by 1 + 1 (Spring ecology bonus) = 2 turns of progress, reaching 3/3 and completing

#### Scenario: Winter slows outdoor projects
- **WHEN** a turn resolves with an active Rain Garden project at 1/2 progress in Winter
- **THEN** the project advances by 1 - 1 (Winter penalty) = 0 turns of progress, remaining at 1/2

#### Scenario: Project completes
- **WHEN** a project's progress reaches its duration
- **THEN** the project's effects apply (tile transformation, meter changes), it is removed from active projects, and completion is announced in the turn summary

### Requirement: Project catalog with specific costs and effects
The system SHALL provide a catalog of projects with exact costs, durations, and effects:

**Ecology Projects (available from Awakening):**

| Project | Cost | Duration | Tile Eco | Food Sov | Trust | Budget/yr | Other |
|---------|------|----------|----------|----------|-------|-----------|-------|
| Food Forest | $0.75M | 3 turns | +15% | +4% | +2% | -- | Requires tile contamination <= 50% |
| Soil Remediation | $1.0M | 4 turns | +10% | -- | -- | -- | Removes 60% of tile contamination |
| Rain Garden | $0.4M | 2 turns | +10% | -- | -- | -- | Flood damage -40% on tile |
| Native Planting | $0.8M | 3 turns | +12% | -- | -- | -- | Heat damage -20% on tile; wildlife corridor eligible |

**Infrastructure Projects (available from Awakening):**

| Project | Cost | Duration | Tile Eco | Food Sov | Trust | Budget/yr | Other |
|---------|------|----------|----------|----------|-------|-----------|-------|
| Solar Grid | $1.5M | 4 turns | +5% | -- | -- | +$0.2M | Heat damage -15% on tile |
| Greenway | $1.0M | 3 turns | +8% | -- | -- | -- | Storm damage -25% on tile; adjacency bonus +3% eco to all neighboring tiles |
| Water Transit Route | $2.5M | 6 turns | -- | -- | +5% | -- | Unlocks water transit on adjacent tiles; requires waterfront tile |

**Community Projects (available from Awakening):**

| Project | Cost | Duration | Tile Eco | Food Sov | Trust | Budget/yr | Other |
|---------|------|----------|----------|----------|-------|-----------|-------|
| Maker Space | $0.6M | 2 turns | -- | -- | +4% | +$0.1M | -- |
| Community Kitchen | $0.5M | 2 turns | -- | +5% | +3% | -- | Requires tile contamination <= 50% |
| Land Trust | $1.2M | 3 turns | -- | -- | +5% | -- | Blocks gentrification events on tile permanently |

**Restoration Projects (available from Transition stage OR Eco >= 75%):**

| Project | Cost | Duration | Tile Eco | Food Sov | Trust | Budget/yr | Other |
|---------|------|----------|----------|----------|-------|-----------|-------|
| Wetland Restoration | $2.0M | 5 turns | +20% | -- | -- | -- | Flood damage -60% on tile; +5% water quality to adjacent water tiles |
| Wildlife Corridor | $3.0M | 8 turns | +15% to all connected tiles | -- | -- | -- | Requires 3+ adjacent tiles at restoration visual or higher |
| Regional Collaboration | $2.0M | 6 turns | -- | -- | +3% | -- | Unlocks Beyond the Map stage transition; requires 20+ tiles at transition visual or higher |

#### Scenario: View available projects for a tile
- **WHEN** the player selects a vacant tile (20% contamination) in Brightmoor and opens the project menu
- **THEN** the system displays: Food Forest ($0.75M, 3 turns), Rain Garden ($0.4M, 2 turns), Native Planting ($0.8M, 3 turns), Solar Grid ($1.5M, 4 turns), Greenway ($1.0M, 3 turns), Maker Space ($0.6M, 2 turns), Community Kitchen ($0.5M, 2 turns), Land Trust ($1.2M, 3 turns). Soil Remediation is available but flagged as optional (contamination 20% is below blocking threshold). Restoration projects are hidden (not in Transition stage and Eco < 75%).

#### Scenario: Contamination blocks food project on industrial tile
- **WHEN** the player selects an industrial tile with 80% contamination
- **THEN** Food Forest and Community Kitchen are grayed out with message "Requires contamination <= 50% (current: 80%). Complete Soil Remediation first." Soil Remediation ($1.0M, 4 turns) is highlighted as the prerequisite.

### Requirement: Project costs and prerequisites
Each project SHALL have: a budget cost (deducted on start), optional tile contamination requirements, a progression stage requirement, and tile type requirements.

Projects do NOT require Political Will to start (policies do, not projects). This separates the project economy (budget) from the policy economy (political will).

#### Scenario: Insufficient budget blocks project
- **WHEN** the player attempts to start a Water Transit Route ($2.5M) with $2.0M in budget
- **THEN** the system prevents the project and shows: "Insufficient budget. Need $2.5M, have $2.0M ($0.5M short)."

#### Scenario: Stage-locked projects
- **WHEN** the progression stage is Awakening and Ecological Health is 60%
- **THEN** Wetland Restoration, Wildlife Corridor, and Regional Collaboration are not available (require Transition stage or Eco >= 75%)

#### Scenario: Wildlife Corridor adjacency prerequisite
- **WHEN** the player attempts to start a Wildlife Corridor on a tile
- **THEN** the system checks that at least 3 tiles adjacent to the target are at restoration visual (tile eco >= 70%). If not, the project is blocked with message showing which adjacent tiles qualify and how many more are needed.

### Requirement: Concurrent project limit based on Trust
The player SHALL be limited in concurrent active projects by the formula:
```
max_concurrent_projects = floor(2 + Trust / 25)
```
- Trust 0-24%: 2 concurrent projects
- Trust 25-49%: 3 concurrent projects
- Trust 50-74%: 4 concurrent projects
- Trust 75-99%: 5 concurrent projects
- Trust 100%: 6 concurrent projects

At game start (Trust 50%): 4 concurrent projects.

#### Scenario: At project capacity
- **WHEN** the player has 4 active projects and Community Trust is 60% (limit = floor(2 + 60/25) = floor(4.4) = 4)
- **THEN** the system prevents starting new projects and displays: "Project capacity reached (4/4). Complete a project or increase Community Trust to expand capacity."

#### Scenario: Trust increase expands capacity
- **WHEN** Community Trust rises from 74% to 75%
- **THEN** the concurrent project limit increases from floor(2 + 74/25) = 4 to floor(2 + 75/25) = 5, and the player is notified: "Administrative capacity expanded! You can now run 5 concurrent projects."

### Requirement: Project effects on tiles and meters with transformation thresholds
Each project SHALL define specific effects on completion as listed in the project catalog above. Tile visual stage transitions are determined by the tile's ecological health:
```
Tile eco < 40%:  dystopia visual (gray, degraded)
Tile eco >= 40%: transition visual (greening, signs of life)
Tile eco >= 70%: restoration visual (lush, thriving ecosystem)
Tile eco >= 90%: beyond visual (solarpunk, fully integrated nature-tech)
```

#### Scenario: Food Forest completion effects
- **WHEN** a Food Forest project completes on a tile with 25% ecological health
- **THEN** the tile's ecological health increases by +15% (to 40%), Food Sovereignty meter increases by +3%, Community Trust increases by +2%, and the tile's visual transitions from dystopia to transition (crossing the 40% threshold)

#### Scenario: Greenway adjacency bonus
- **WHEN** a Greenway project completes on a tile
- **THEN** the target tile gains +8% eco, AND each tile directly adjacent to the Greenway tile gains +3% eco. If any adjacent tile crosses a visual threshold (40%, 70%, 90%) due to this bonus, its visual updates immediately.

#### Scenario: Solar Grid ongoing revenue
- **WHEN** a Solar Grid project completes
- **THEN** the tile gains +5% eco, and starting from the next annual budget replenishment, the player receives an additional +$0.2M/year permanently (added to the budget replenishment calculation)

#### Scenario: Tile reaches restoration visual
- **WHEN** a tile's ecological health reaches 70% through cumulative project effects
- **THEN** the tile's visual transitions to restoration (lush ecosystem), and the tile counts toward progression stage tile requirements for "restoration-stage or higher"

### Requirement: Policy cost reduction applies to projects
When policies that reduce project costs are active (e.g., Green Infrastructure Grants: -20% ecology project costs), the reduced cost is shown in the project catalog and deducted on project start.

#### Scenario: Discounted project cost
- **WHEN** Green Infrastructure Grants policy is active and the player starts a Rain Garden (base $0.4M)
- **THEN** the actual cost deducted is $0.4M * 0.80 = $0.32M, and the project catalog shows "Rain Garden: $0.32M (was $0.40M)"
