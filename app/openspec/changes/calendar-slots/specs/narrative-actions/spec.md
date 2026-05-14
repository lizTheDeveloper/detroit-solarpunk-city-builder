## MODIFIED Requirements

### Requirement: Action dispatch uses calendar slots
The narrative action system SHALL replace flat "1 action" costs with variable calendar slot costs. Each NarrativeActionType SHALL have a defined slot cost. Actions SHALL be dispatched through the calendar system rather than the narrative system.

#### Scenario: Action costs deducted from calendar
- **WHEN** the player performs any action (community meeting, proposal review, conversation)
- **THEN** the calendar system SHALL deduct the appropriate slot cost AND record the interaction in interactionsThisMonth

#### Scenario: Action blocked by insufficient slots
- **WHEN** the player attempts an action with 0 remaining discretionary slots and overschedule limit reached
- **THEN** the action SHALL be blocked with an explanation of remaining options (rest, end turn)

## REMOVED Requirements

### Requirement: NarrativePanel as separate tab
**Reason**: Actions move inline to tiles and character cards. The separate "Actions" panel with topic + target neighborhood dropdowns is replaced by contextual action buttons.
**Migration**: All action types previously shown in NarrativePanel appear as inline buttons on TileDetailPanel and CharacterCards with slot costs displayed.

### Requirement: Flat action cost (all actions = 1)
**Reason**: Replaced by variable slot costs per action type to model that different activities take different amounts of time.
**Migration**: Default slot cost of 1 for quick actions, 2 for meetings, 3 for events. Existing action types get mapped costs.

### Requirement: actionsRemaining / actionsPerTurn state fields
**Reason**: Replaced by CalendarState with discretionary slots, fixed slots, and overschedule tracking.
**Migration**: Save migration converts actionsRemaining to proportional discretionary slots remaining.
