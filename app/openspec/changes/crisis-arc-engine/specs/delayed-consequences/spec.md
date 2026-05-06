## ADDED Requirements

### Requirement: Consequence scheduling from choices
When a player makes a choice in a crisis fork event, the system SHALL schedule zero or more delayed consequences as defined in the arc template. Each consequence has a trigger turn calculated as current turn + configured delay.

#### Scenario: Choice schedules consequence
- **WHEN** player selects "Support DTE Grid Modernization" which specifies a consequence with delay 6
- **AND** current turn is 10
- **THEN** a delayed consequence is queued with triggerTurn = 16

### Requirement: Consequence activation conditions
Each delayed consequence SHALL specify activation conditions (all must be present in dependency web) and cancellation conditions (any present cancels the consequence). This allows player action between scheduling and triggering to prevent or modify consequences.

#### Scenario: Consequence activates
- **WHEN** triggerTurn is reached AND all activation conditions are present
- **THEN** the consequence fires its effects (meter deltas, tile damage, event generation)

#### Scenario: Consequence cancelled
- **WHEN** triggerTurn is reached AND a cancellation condition is present in the dependency web
- **THEN** the consequence is removed from the queue without firing

#### Scenario: Player prevents consequence
- **WHEN** a consequence requires activation condition "no_alternative_grid" to fire
- **AND** player builds community solar (adding "has_community_solar" as a cancellation condition)
- **THEN** the consequence is cancelled when its trigger turn arrives

### Requirement: Foreshadow hints
Each delayed consequence SHALL have a foreshadow hint string and a configured number of turns before trigger to show it. The hint MUST be vague — indicating direction but not magnitude or exact timing.

#### Scenario: Hint appears
- **WHEN** current turn equals triggerTurn minus hintTurnsBeforeTrigger
- **THEN** the foreshadow hint is shown to the player (e.g., "Energy costs are rising...")

#### Scenario: Hint for cancelled consequence
- **WHEN** a hint would appear but the consequence has already been cancelled
- **THEN** no hint is shown

### Requirement: Consequence queue processing
The turn resolution system SHALL process the consequence queue each turn, firing all consequences where triggerTurn <= currentTurn and activation conditions are met.

#### Scenario: Multiple consequences same turn
- **WHEN** 3 consequences all have triggerTurn = 15
- **THEN** all 3 are processed in the same turn resolution step

#### Scenario: Queue survives across turns
- **WHEN** a consequence is scheduled for turn 20 and current turn is 12
- **THEN** the consequence remains in queue through turns 12-19 without firing

### Requirement: Consequence effect types
Consequences SHALL support: meter deltas (budget, trust, eco, food, will, climate), tile damage to specific or random tiles, event generation (spawn a new event into the queue), and condition creation/removal in the dependency web.

#### Scenario: Budget consequence
- **WHEN** a consequence fires with effect `{ meter: 'budget', amount: -0.5 }`
- **THEN** player budget decreases by $0.5M

#### Scenario: Event-spawning consequence
- **WHEN** a consequence fires with effect `{ spawnEvent: 'rate_hike_protest' }`
- **THEN** the specified event is added to the event queue for player response
