## ADDED Requirements

### Requirement: Per-arc slot tax
Each active crisis arc stage SHALL consume a fixed number of discretionary slots per month while active. The tax is defined per arc per stage in crisis arc data files.

#### Scenario: Single crisis consumes slots
- **WHEN** the "water shutoffs" arc is in stage 2 (escalation)
- **THEN** 3 discretionary slots SHALL be consumed as crisis tax, reducing available discretionary from 22 to 19

#### Scenario: Multiple crises stack
- **WHEN** "water shutoffs" (3 slots) and "blight spiral" (2 slots) are both active
- **THEN** total crisis tax SHALL be 5 slots, reducing available discretionary from 22 to 17

#### Scenario: Crisis resolution releases slots
- **WHEN** a crisis arc resolves (moves to resolved stage)
- **THEN** its slot tax SHALL immediately cease and those slots SHALL be available next month

### Requirement: Prevention ROI display
The system SHALL display, for each preventative project, how many crisis slots it would save if implemented. This teaches that prevention is measurable in time saved.

#### Scenario: Rain garden shows flood prevention ROI
- **WHEN** the player views a rain garden proposal
- **THEN** the card SHALL show "Prevents ~28 crisis slots over your term" (based on expected flood arc frequency × slot tax × months prevented)

#### Scenario: Prevention ROI updates with context
- **WHEN** a flood crisis is currently active AND the player views rain garden
- **THEN** the ROI display SHALL emphasize "Would save 3 slots/month right now"

### Requirement: Cascading crisis bandwidth squeeze
The system SHALL model how multiple concurrent crises compound: total crisis tax reduces discretionary budget, which makes it harder to address any single crisis, which lets crises escalate, which increases their slot tax.

#### Scenario: Spiral warning
- **WHEN** total crisis slot tax exceeds 50% of discretionary budget
- **THEN** the system SHALL display a "bandwidth crisis" warning: "Crises are consuming most of your available time"

#### Scenario: Collapse from crisis overload
- **WHEN** total crisis slot tax equals or exceeds total discretionary budget
- **THEN** the player SHALL have 0 discretionary slots AND a special "crisis triage" mode SHALL activate allowing only crisis-response actions at 1 slot each

### Requirement: Crisis slot tax as ConsequenceEffectDef
The crisis slot tax SHALL be implemented as a new effect type in the ConsequenceEffectDef union: `{ type: 'slotTax'; slots: number; reason: string }`. This keeps crisis arc data declarative.

#### Scenario: Arc data defines slot tax
- **WHEN** a crisis arc stage has `effects: [{ type: 'slotTax', slots: 3, reason: 'Emergency council sessions' }]`
- **THEN** the calendar system SHALL deduct 3 discretionary slots per month while that stage is active

#### Scenario: Different stages have different taxes
- **WHEN** a crisis arc moves from stage 1 (emerging, tax: 1) to stage 2 (escalating, tax: 3)
- **THEN** the monthly slot tax from that arc SHALL increase from 1 to 3
