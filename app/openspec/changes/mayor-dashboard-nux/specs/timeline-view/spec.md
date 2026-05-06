## ADDED Requirements

### Requirement: Timeline displays active project completion
The system SHALL display all active projects as horizontal bars on a turn-based timeline, showing their start turn, current progress, and expected completion turn.

#### Scenario: Single active project shown
- **WHEN** a player has one active project with 3 turns remaining out of 6 total duration
- **THEN** the timeline shows a bar spanning 6 turns, filled 50%, with the completion turn labeled

#### Scenario: Multiple projects shown simultaneously
- **WHEN** a player has 3 active projects on different tiles with different completion times
- **THEN** all 3 appear as separate swimlane bars, ordered by soonest completion first

#### Scenario: Project completes and disappears
- **WHEN** an active project completes on END_TURN
- **THEN** the project bar is removed from the timeline on the next render

### Requirement: Timeline shows election deadline
The system SHALL display the election turn (T48) as a fixed vertical marker on the timeline at all times during Term 1+.

#### Scenario: Election marker visible
- **WHEN** the player views the timeline during any turn
- **THEN** a distinct marker at T48 (or the next election turn) is visible with label "Election"

#### Scenario: Election approaching
- **WHEN** fewer than 8 turns remain before election
- **THEN** the election marker is visually emphasized (color change or pulsing)

### Requirement: Timeline shows foreshadow windows
The system SHALL display foreshadow hints for delayed consequences as shaded regions on the timeline, starting at `triggerTurn - hintTurnsBeforeTrigger` and ending at `triggerTurn`.

#### Scenario: Approaching consequence shown
- **WHEN** a delayed consequence has `hintTurnsBeforeTrigger: 3` and `triggerTurn: 15` and current turn is 10
- **THEN** a shaded warning region appears on the timeline from T12 to T15 with the foreshadow hint text

#### Scenario: Cancelled consequence disappears
- **WHEN** a delayed consequence's cancel conditions are met
- **THEN** the corresponding foreshadow region is removed from the timeline

### Requirement: Timeline shows arc stage context
The system SHALL display currently active crisis arcs with their stage and an indicator of escalation pressure (inaction timer progress toward threshold).

#### Scenario: Arc at escalation stage
- **WHEN** an arc is at `escalation` stage with inaction timer 2/3
- **THEN** the timeline shows the arc name, "Escalation" label, and a 2/3 progress indicator toward forced crisis

#### Scenario: Arc at dormant stage
- **WHEN** an arc is at `dormant` stage
- **THEN** the arc does NOT appear on the timeline (avoid clutter from inactive arcs)

### Requirement: Timeline window is 12 turns
The system SHALL display a 12-turn lookahead from the current turn by default.

#### Scenario: Default view
- **WHEN** the player opens the timeline
- **THEN** turns [current, current+12] are visible

#### Scenario: Nothing scheduled far out
- **WHEN** no events or projects extend beyond 6 turns
- **THEN** the timeline still shows the full 12-turn window (with empty space indicating breathing room)
