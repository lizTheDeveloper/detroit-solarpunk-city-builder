## ADDED Requirements

### Requirement: Event generation from arc escalation
When an arc reaches escalation or crisis stage, the system SHALL generate a crisis fork event from the arc's template. Generated events MUST go into the existing event queue.

#### Scenario: Arc reaches escalation
- **WHEN** energy-grid arc transitions to escalation stage
- **AND** no energy-grid crisis fork is already on cooldown
- **THEN** a crisis fork event is generated from the energy-grid arc template and added to eventQueue

#### Scenario: Cooldown prevents spam
- **WHEN** an arc-generated event was already presented within its configured cooldown period
- **THEN** no new event is generated for that arc even if it remains at escalation/crisis

### Requirement: Genuine tradeoff choices
Each crisis fork event SHALL present 2-3 choices where each has clearly articulated appeal. No choice SHALL be obviously dominant. Each choice MUST have both immediate benefits AND future costs (via delayed consequences).

#### Scenario: Energy grid fork
- **WHEN** energy-grid crisis fork is presented
- **THEN** choices include at minimum one establishment-aligned option (jobs, reliability, federal funds) and one community-aligned option (local ownership, lower cost, independence) — both with genuine appeal

### Requirement: Condition-gated choices
Crisis fork choices SHALL support requirement conditions from the dependency web. Locked choices MUST be visible but not selectable, with a hint about what enables them.

#### Scenario: Locked choice shown
- **WHEN** a choice requires condition "community_energy_education_done" which is not present
- **THEN** the choice is displayed grayed out with text indicating the prerequisite

### Requirement: Choice consequences
Each choice in a crisis fork SHALL specify: immediate meter effects, conditions created/removed, delayed consequences scheduled, and which antagonist faction it aligns with or opposes.

#### Scenario: Choice with full effects
- **WHEN** player selects a choice
- **THEN** immediate meter effects are applied, conditions are updated in dependency web, and delayed consequences are queued — all in the same turn resolution

### Requirement: Arc-level cooldown
After a crisis fork event is generated for an arc, that arc MUST NOT generate another event for a configurable cooldown period (default: 4 turns). This prevents overwhelming the player with events from a single arc.

#### Scenario: Cooldown respected
- **WHEN** energy-grid generated a crisis fork on turn 8 with cooldown 4
- **THEN** energy-grid cannot generate another crisis fork until turn 12 at earliest
