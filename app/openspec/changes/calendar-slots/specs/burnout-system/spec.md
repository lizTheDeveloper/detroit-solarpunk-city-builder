## ADDED Requirements

### Requirement: Burnout state machine
The system SHALL model burnout as a four-state machine: sustainable → overextended → burnout → collapse. Transitions SHALL be triggered by cumulative overschedule and burnout buffer depletion.

#### Scenario: Transition from sustainable to overextended
- **WHEN** the player's burnout buffer drops below 50% of maximum
- **THEN** the burnout state SHALL transition to "overextended"

#### Scenario: Transition from overextended to burnout
- **WHEN** the player remains overextended for 2 consecutive months OR the burnout buffer drops below 20%
- **THEN** the burnout state SHALL transition to "burnout"

#### Scenario: Transition from burnout to collapse
- **WHEN** the player overschedules while in burnout state OR the burnout buffer reaches 0
- **THEN** the burnout state SHALL transition to "collapse"

#### Scenario: Recovery from overextended
- **WHEN** the player maintains burnout buffer above 60% for 1 month (via rest days, mentor visits, cultural events)
- **THEN** the burnout state SHALL transition back to "sustainable"

#### Scenario: Recovery from burnout
- **WHEN** the player maintains burnout buffer above 50% for 2 consecutive months
- **THEN** the burnout state SHALL transition back to "overextended"

### Requirement: Burnout effectiveness modifiers
Each burnout state SHALL apply a multiplier to all action yields. Sustainable = 1.0×, overextended = 0.8×, burnout = 0.5×, collapse = 0.0× (no actions possible).

#### Scenario: Overextended reduces meeting yield
- **WHEN** the player holds a community meeting while overextended
- **THEN** all resource yields from that meeting SHALL be multiplied by 0.8

#### Scenario: Collapse prevents all actions
- **WHEN** the player is in collapse state
- **THEN** no discretionary actions SHALL be available for that month AND a narrative event SHALL fire describing hospitalization/breakdown

### Requirement: Burnout buffer meter
The system SHALL maintain a burnout buffer (0-20 points, starting at 15). Buffer increases from: rest days (+3), mentor meetings (+3), community celebrations (+2), emotional support conversations (+1). Buffer decreases from: overscheduling (-1 per extra slot), consecutive months without rest (-2), forgotten commitments (-3).

#### Scenario: Rest day replenishes buffer
- **WHEN** the player takes a rest day action (costs 1 slot, produces nothing)
- **THEN** the burnout buffer SHALL increase by 3 (capped at 20)

#### Scenario: Overschedule depletes buffer
- **WHEN** the player overschedules by N slots in a month
- **THEN** the burnout buffer SHALL decrease by N at month end

### Requirement: Forgotten commitments
When in burnout state, the system SHALL randomly fail to execute 1-2 scheduled interactions per month. Each forgotten commitment SHALL reduce trust with the affected NPC by 8 and generate a narrative event.

#### Scenario: Commitment forgotten while burned out
- **WHEN** the player is in burnout state AND has scheduled 4+ interactions this month
- **THEN** the system SHALL randomly select 1 interaction to fail with a "forgotten commitment" event AND reduce trust with that NPC by 8

#### Scenario: Forgotten commitment notification
- **WHEN** a commitment is forgotten
- **THEN** the player SHALL see a notification: "You forgot your meeting with [NPC]. -8 trust."
