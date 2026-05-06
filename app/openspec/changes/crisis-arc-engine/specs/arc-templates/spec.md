## ADDED Requirements

### Requirement: Configuration-driven arc definitions
Arc templates SHALL be defined in configuration files (YAML or JSON), not hardcoded. Each template MUST specify: arc ID, escalation thresholds, stage durations, crisis fork structures, antagonist associations, and related paper DOIs.

#### Scenario: Reading arc template
- **WHEN** the system loads arc template "energy-grid"
- **THEN** it has access to escalation thresholds, minimum stage durations, fork choice definitions, and associated antagonist faction

### Requirement: Initial arc set
The system SHALL ship with at minimum 5 arc templates: energy-grid, water-pfas, phosphorus-food, housing-speculation, and infrastructure-debt. Each MUST be fully playable with choices, consequences, and dependency conditions.

#### Scenario: All initial arcs loadable
- **WHEN** the system starts
- **THEN** all 5 initial arc templates load without error and are ready to activate when headlines trigger them

### Requirement: Arc template choice structure
Each arc template MUST define at least one crisis fork with 2-3 choices. Each choice MUST specify: label, appeal text (why it's attractive), immediate effects, conditions created/removed, delayed consequences with delays and hints, and antagonist alignment.

#### Scenario: Template choice validation
- **WHEN** an arc template is loaded
- **THEN** every choice in every fork has non-empty label, appeal, at least one immediate effect, and at least one delayed consequence

### Requirement: Antagonist association
Each arc template SHALL name 1-2 antagonist factions whose structural opposition drives the crisis. Antagonists MUST have: a name, their genuine argument (why they oppose the player), who depends on them (employees, ratepayers, etc.), and how they manifest in-game (counter-narratives, lobby pressure, delayed consequences).

#### Scenario: Antagonist definition
- **WHEN** the energy-grid arc template is loaded
- **THEN** it defines DTE Energy as an antagonist with fields for their argument ("grid reliability, union jobs, rate base investment"), dependents ("11,000 employees, 2.2M ratepayers"), and in-game manifestation (counter-narrative probability modifier, lobby condition)

### Requirement: Prevention conditions
Each arc template SHALL define which dependency conditions or capacity thresholds constitute "player took proactive action" for the purpose of delaying escalation.

#### Scenario: Prevention defined
- **WHEN** energy-grid arc template specifies prevention_conditions: ["community_solar_built", "microgrid_operational"]
- **THEN** a player who has either condition in their dependency web is considered to have acted proactively, resetting the arc's inaction timer

### Requirement: Template extensibility
New arc templates MUST be addable by creating a new configuration file in the arcs config directory. No code changes to the engine SHALL be required to add a new arc.

#### Scenario: Adding sixth arc
- **WHEN** a new file `arcs/transit-equity.yaml` is added to the config directory
- **THEN** the system recognizes it on next load and the transit-equity arc can activate from headline data
