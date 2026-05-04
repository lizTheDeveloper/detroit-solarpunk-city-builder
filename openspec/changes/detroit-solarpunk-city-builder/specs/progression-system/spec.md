## ADDED Requirements

### Requirement: Four progression stages with specific thresholds
The game SHALL progress through four stages: Awakening, Transition, Restoration, and Beyond the Map. Each stage unlocks new project types, events, and gameplay mechanics. Stage transitions require meeting all threshold conditions simultaneously.

#### Scenario: Game starts in Awakening
- **WHEN** a new game begins
- **THEN** the progression stage is Awakening, with only Awakening-stage projects available (Food Forest, Soil Remediation, Rain Garden, Native Planting, Solar Grid, Greenway, Water Transit Route, Maker Space, Community Kitchen, Land Trust)

#### Scenario: Stage transition unlocks content
- **WHEN** the game transitions from Awakening to Transition
- **THEN** Restoration-stage projects (Wetland Restoration, Wildlife Corridor, Regional Collaboration) become visible in the catalog (but remain locked until Transition stage or Eco >= 75%), and new event types activate (cooperative economics events, pilot program opportunities)

### Requirement: Stage transition conditions with exact numbers
Stage transitions SHALL require meeting ALL of the following conditions simultaneously:

**Awakening to Transition (reachable in 10-14 turns for a focused player):**
- Community Trust >= 50%
- Ecological Health >= 25%
- Food Sovereignty >= 20%
- At least 5 tiles at transition visual or higher (tile eco >= 40%)

**Transition to Restoration (reachable by Turn 32-40):**
- Community Trust >= 70%
- Ecological Health >= 55%
- Food Sovereignty >= 55%
- Political Will >= 40%
- At least 12 tiles at transition visual or higher (tile eco >= 25%)

**Restoration to Beyond the Map (reachable by Turn 48-56):**
- Ecological Health >= 80%
- Food Sovereignty >= 75%
- At least 15 tiles at restoration visual or higher (tile eco >= 70%)
- Regional Collaboration project completed OR at least 20 tiles at transition visual or higher

#### Scenario: Awakening to Transition
- **WHEN** at the end of a resolve phase: Community Trust = 52%, Ecological Health = 27%, Food Sovereignty = 22%, and 6 tiles have eco >= 40%
- **THEN** all Awakening-to-Transition conditions are met. The stage transitions to Transition with a milestone event: "The seeds of change have taken root. Detroit's communities are beginning to believe transformation is possible."

#### Scenario: Transition to Restoration requires Political Will
- **WHEN** Community Trust = 72%, Ecological Health = 58%, Food Sovereignty = 57%, Political Will = 38%, and 16 tiles are at transition+
- **THEN** the transition does NOT fire because Political Will (38%) is below the 40% threshold. The player must raise Will before the transition can occur. The UI shows progress toward each threshold with Will highlighted as the gap.

#### Scenario: Restoration to Beyond the Map
- **WHEN** Ecological Health = 82%, Food Sovereignty = 78%, 16 tiles are at restoration+ (eco >= 70%), and Regional Collaboration is completed (or 20+ tiles at transition+)
- **THEN** the stage transitions to Beyond the Map, expanding the game scope to show Detroit as one node in the Great Lakes bioregion

### Requirement: Stage-specific mechanics
Each stage SHALL introduce new gameplay mechanics:

**Awakening (Turns 1-~14):**
- Basic projects only (ecology, infrastructure, community)
- Crisis management events (water shutoffs, infrastructure failures)
- Learning period: first project completion triggers a milestone event with tutorial guidance
- Re-election at Turn 16 checks Trust >= 20% and Will >= 12%

**Transition (Turns ~14-~36):**
- Restoration-stage projects unlock in catalog (Wetland Restoration, Wildlife Corridor, Regional Collaboration)
- Cooperative economics: Maker Space and Community Kitchen generate ongoing revenue
- Pilot program events: opportunities to test new approaches at reduced cost (-30%) on 1 tile before committing
- Regional awareness: events reference other Great Lakes cities

**Restoration (Turns ~36-~52):**
- Wildlife corridor projects: span multiple adjacent tiles, require 3+ adjacent tiles at restoration visual
- Regional Collaboration project available (6 turns, $2.0M, prerequisite for Beyond the Map)
- Counter-narrative intensity increases: State Legislature Pushback probability increases to 0.08 (from 0.05)
- Continental-scale events begin appearing (federal environmental policy, Great Lakes compact decisions)

**Beyond the Map (Turns ~52-64):**
- Regional view UI showing Detroit as one node in Great Lakes bioregion
- Continental-scale goals: watershed restoration (contribute Eco toward regional target), migratory species return (requires wildlife corridors), Great Lakes water quality (contribute adaptation toward regional target)
- Player's city-level actions contribute percentage points toward continental goals
- Win condition: 2+ continental goals progressed past 50% by Turn 64

#### Scenario: Transition introduces cooperatives
- **WHEN** the stage is Transition and a Maker Space completes
- **THEN** the Maker Space generates +$0.1M/year revenue starting at the next annual budget replenishment, representing cooperative economics

#### Scenario: Restoration introduces corridors
- **WHEN** the stage is Restoration and 3 adjacent tiles are at restoration visual (eco >= 70%)
- **THEN** the Wildlife Corridor project becomes eligible for those tiles: 8 turns, $3.0M, grants +15% eco to ALL tiles connected through the corridor

### Requirement: Beyond the Map endgame with defined goals
In the Beyond the Map stage, the game SHALL expand the player's view and track continental-scale goals:

Continental goals (each 0-100%):
1. **Great Lakes Watershed Restoration**: player contributes (city Eco - 50%) * 0.5 percentage points per turn (only contributes when Eco > 50%)
2. **Migratory Species Return**: player contributes (number of wildlife corridors completed) * 2 percentage points per turn
3. **Regional Food Network**: player contributes (city Food Sov - 60%) * 0.4 percentage points per turn (only contributes when Food Sov > 60%)

Win condition: at least 2 of 3 continental goals reach 50%+ by Turn 64.

#### Scenario: Continental goal tracking
- **WHEN** the stage is Beyond the Map with Eco at 85% and 2 wildlife corridors completed
- **THEN** Great Lakes Watershed Restoration gains (85 - 50) * 0.5 = +17.5% per turn contribution (capped at a reasonable rate by the system). Migratory Species Return gains 2 * 2 = +4% per turn.

### Requirement: No stage regression
Once a stage is reached, the game SHALL NOT regress to a previous stage. However, meters can still decline, creating tension between stage identity and current conditions.

#### Scenario: Meters decline but stage holds
- **WHEN** the stage is Transition and Community Trust drops to 45% (below the 50% entry threshold)
- **THEN** the stage remains Transition (no regression). A warning event triggers: "Community confidence is shaken. Trust has fallen below the level that brought us to Transition. Rebuilding relationships is critical."

#### Scenario: Stage holds through climate crisis
- **WHEN** the stage is Restoration and a climate tipping point reduces Ecological Health temporarily below 55%
- **THEN** the stage remains Restoration, but a warning displays: "Climate damage threatens our progress. Eco has fallen below Restoration entry levels. Prioritize adaptation."
