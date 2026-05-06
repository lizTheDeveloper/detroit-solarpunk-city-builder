## ADDED Requirements

### Requirement: Arc lifecycle state machine
Each arc SHALL follow the progression: dormant → foreshadow → escalation → crisis → reckoning → resolved. Transitions MUST be driven by headline arc-state data from the live-news-pipeline combined with player action/inaction.

#### Scenario: Arc activation from dormant
- **WHEN** the first classified headline appears for a dormant arc
- **THEN** the arc transitions to foreshadow stage

#### Scenario: Escalation from headline volume
- **WHEN** an arc's weekly headline hits exceed its configured escalation threshold
- **THEN** the arc transitions from foreshadow to escalation

#### Scenario: Escalation from severity spike
- **WHEN** a severity-3 headline is classified for an arc in foreshadow stage
- **THEN** the arc immediately transitions to escalation regardless of hit count

#### Scenario: Crisis from player inaction
- **WHEN** an arc remains at escalation for its configured max-turns-at-escalation without player intervention
- **THEN** the arc transitions to crisis

#### Scenario: Reckoning after crisis
- **WHEN** a crisis event is resolved (player makes a choice)
- **THEN** the arc schedules reckoning for a configured number of turns later

### Requirement: Minimum stage duration
Each arc stage MUST have a configurable minimum number of turns before it can transition to the next stage. Headlines cannot force instant escalation through multiple stages in one turn.

#### Scenario: Rapid headline spike
- **WHEN** 10 severity-3 headlines appear in one hour for an arc in dormant stage
- **THEN** the arc transitions to foreshadow but CANNOT skip to escalation until minimum foreshadow duration (configurable, default 2 turns) has elapsed

### Requirement: Player-preventable escalation
Players SHALL be able to prevent arc escalation by taking proactive action during foreshadow or escalation stages. Actions that build relevant capacity or create relevant dependency conditions MUST reset the inaction timer.

#### Scenario: Proactive response prevents crisis
- **WHEN** an arc is at escalation AND the player completes a project or makes a choice that creates a condition listed in the arc's "prevention_conditions" config
- **THEN** the arc's inaction timer resets and escalation-to-crisis transition is delayed

### Requirement: Multiple simultaneous arcs
The system SHALL support up to 3 arcs in active (non-dormant) state simultaneously. If a 4th arc would activate, it MUST remain dormant until an active arc resolves.

#### Scenario: Arc queue overflow
- **WHEN** 3 arcs are active and a 4th arc receives its first headline
- **THEN** the 4th arc remains dormant with queued activation, transitioning to foreshadow when the next active arc resolves

### Requirement: Arc re-triggering
A resolved arc SHALL be able to re-trigger (return to dormant→foreshadow) if reality re-escalates. A minimum cooldown of configurable turns MUST elapse before re-triggering.

#### Scenario: Arc cycles back
- **WHEN** a resolved arc's cooldown expires AND new headlines appear for it
- **THEN** the arc returns to foreshadow stage with fresh counters

### Requirement: Game always begins today
When a new game is created, the system SHALL initialize arc states from the CURRENT live-news-pipeline arc-state data. Arcs that are already at escalation or crisis in reality MUST start at that stage in the new game. The game does NOT begin from a clean/dormant baseline — it begins from today's reality.

#### Scenario: New game during active energy crisis
- **WHEN** a player starts a new game AND the global arc-state shows energy-grid at escalation with 8 weekly hits
- **THEN** the new game's energy-grid arc begins at escalation stage with an immediate crisis fork event queued for the player's first few turns

#### Scenario: New game during quiet period
- **WHEN** a player starts a new game AND the global arc-state shows all arcs at dormant or foreshadow
- **THEN** the new game begins with those arcs at their current real-world stages (some foreshadowing, no immediate crisis pressure)

#### Scenario: Different players start on different days
- **WHEN** player A starts Monday (energy at crisis) and player B starts Thursday (energy resolved)
- **THEN** player A's game has immediate energy pressure, player B's does not — their games are shaped by when they started, just like reality

### Requirement: Initial arc state snapshot
At game creation, the system SHALL take a snapshot of current global arc-state and use it as the game's starting arc configuration. After creation, the game's arcs continue to be driven by live data but the starting position is locked to the moment of creation.

#### Scenario: Arc state at game creation
- **WHEN** a new game is created at 2026-05-05T14:00Z
- **THEN** the game records the arc-state snapshot from that moment as its initialization baseline, and future arc transitions build from that starting point
