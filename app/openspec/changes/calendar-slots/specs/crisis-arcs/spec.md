## MODIFIED Requirements

### Requirement: Crisis arc stages include slot tax
Each crisis arc stage definition SHALL include an optional `slotTax` field specifying how many discretionary slots that stage consumes per month while active.

#### Scenario: Emerging stage has light tax
- **WHEN** a crisis arc enters its "emerging" stage with slotTax: 1
- **THEN** the calendar system SHALL deduct 1 discretionary slot from the player's monthly budget

#### Scenario: Escalating stage has heavy tax
- **WHEN** a crisis arc reaches "escalating" stage with slotTax: 3
- **THEN** the calendar system SHALL deduct 3 discretionary slots per month

#### Scenario: No tax defined defaults to 0
- **WHEN** a crisis arc stage has no slotTax field defined
- **THEN** no calendar slots SHALL be consumed by that stage

## ADDED Requirements

### Requirement: Crisis effects include time theft
Crisis arc consequence effects SHALL support the new `slotTax` effect type alongside existing meter effects and event spawns. Multiple effect types MAY appear in the same consequence.

#### Scenario: Crisis consequence with slot tax and meter damage
- **WHEN** a crisis consequence fires with effects `[{ type: 'meter', target: 'eco', delta: -5 }, { type: 'slotTax', slots: 2, reason: 'Emergency repairs' }]`
- **THEN** both the meter damage AND the slot tax SHALL be applied

### Requirement: Crisis prevention displays slot savings
Each crisis arc SHALL calculate and expose an estimated "total slots consumed if unchecked" value based on expected duration × stage taxes. Preventative actions display this as ROI.

#### Scenario: Arc calculates total slot cost
- **WHEN** a crisis arc has stages with taxes [1, 2, 3] and expected durations [3, 3, 2] months
- **THEN** total estimated slot cost SHALL be (1×3 + 2×3 + 3×2) = 15 slots
