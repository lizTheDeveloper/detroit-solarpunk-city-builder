## ADDED Requirements

### Requirement: Contact cultivation pipeline
The system SHALL model high-value NPC relationships through a 5-stage pipeline: discovery → introduction → cooldown → follow-up → established. Each stage has prerequisites, slot costs, and minimum cooldown periods between stages.

#### Scenario: Discovery stage
- **WHEN** the player meets prerequisites for a strategic contact (e.g., trust threshold with introducer, project completion, meter threshold)
- **THEN** the contact SHALL appear in "discovery" state with a hint about who can introduce them

#### Scenario: Introduction stage
- **WHEN** the player has a mutual connection at champion+ trust AND spends 2 slots on an introduction meeting
- **THEN** the contact SHALL advance to "introduction" state AND a cooldown timer of 2 months SHALL begin

#### Scenario: Cooldown enforcement
- **WHEN** a contact is in cooldown state AND the player attempts to advance the relationship
- **THEN** the system SHALL block the action with message: "Give it time. [NPC] needs to see your work before the next step."

#### Scenario: Follow-up to established
- **WHEN** the cooldown expires AND the player spends 2 slots on a follow-up meeting AND meets any stage-specific conditions (project success, meter improvement)
- **THEN** the contact SHALL advance to "established" state

### Requirement: Strategic contact prerequisites
Each strategic contact SHALL have explicit unlock conditions defined in data. Conditions MAY include: trust threshold with a specific NPC, completion of a specific project type, a meter reaching a threshold, or a combination thereof.

#### Scenario: Funder requires community trust proof
- **WHEN** a funder contact requires "3 completed projects + Community Trust > 60"
- **THEN** the funder SHALL remain in "undiscovered" state until both conditions are met

#### Scenario: Multiple prerequisites
- **WHEN** a contact requires both an introducer at champion trust AND a specific meter > 50
- **THEN** both conditions MUST be satisfied for discovery to trigger

### Requirement: Door-close mechanic
The system SHALL permanently close a strategic contact opportunity if the player neglects the relationship during cooldown or fails to follow up within a window. Each contact has a patience timer.

#### Scenario: Patience timer expires
- **WHEN** a contact has been in "introduction" state for 4+ months without follow-up (2 months cooldown + 2 months window)
- **THEN** the contact SHALL transition to "closed" state with a narrative event explaining they moved on

#### Scenario: Closed contact notification
- **WHEN** a strategic contact closes
- **THEN** the player SHALL receive a notification: "[Contact] has moved on. That door is closed."

### Requirement: Deepening existing contacts
The system SHALL allow established strategic contacts to deepen over time, providing increasing yields. Deepening requires ongoing monthly maintenance (1 slot) and occasional milestone interactions.

#### Scenario: Established contact deepens after 3 maintained months
- **WHEN** an established contact has been maintained for 3 consecutive months
- **THEN** their resource yield multiplier SHALL increase by 0.25
