## ADDED Requirements

### Requirement: Seasonal turn cycle
The turn engine SHALL cycle through four seasons in order: Spring, Summer, Fall, Winter. Four turns constitute one year. Sixteen turns constitute one mayoral term (4 years). The game spans 4 terms (64 turns / 16 years).

#### Scenario: Seasons cycle correctly
- **WHEN** the player ends a Spring turn
- **THEN** the next turn is Summer of the same year

#### Scenario: Year advances after Winter
- **WHEN** the player ends a Winter turn
- **THEN** the next turn is Spring of the next year

#### Scenario: Term advances after 4 years
- **WHEN** the player ends turn 16 of a term (Winter, Year 4)
- **THEN** a re-election arc triggers (see event-system) before the new term begins

### Requirement: Turn phase sequence
Each turn SHALL execute phases in fixed order: Events -> Player Actions (Projects, Policy, Narrative in any order) -> Resolve. The player makes decisions during the Player Actions phase. Events present situations at the start. Resolve computes all outcomes in a defined sub-order.

#### Scenario: Phases execute in order
- **WHEN** a new turn begins
- **THEN** the Events phase fires first, presenting any triggered events to the player before they can take other actions

#### Scenario: Player acts during middle phase
- **WHEN** the Events phase completes
- **THEN** the player can allocate actions to Projects, Policy, and Narrative in any order before ending the turn

#### Scenario: Resolve phase computes outcomes
- **WHEN** the player ends their turn
- **THEN** the Resolve phase executes all sub-steps in the defined order below

### Requirement: Resolve phase ordering
The Resolve phase SHALL execute sub-steps in this exact order. Order matters because later steps use values updated by earlier steps.

```
Resolve Phase Sub-steps (execute in this order):
1. Climate tick: Climate pressure increases per climate-system formula
2. Climate events: Seasonal weather events roll and apply tile damage
3. Adaptation reduction: Completed project adaptation bonuses reduce climate damage
4. Project progress: Active projects advance by 1 turn (+/- seasonal modifiers)
5. Policy ongoing effects: All enacted policy ongoing drains and benefits apply
6. Narrative compounding/drift: Compounding counters update; opinion drift applies to neglected topics
7. Meter feedback loops: Will_regen, Trust_food_bonus, Trust_decay, and all continuous functions compute using post-action values from this turn
8. Budget replenishment: If this is a Spring turn of a new year, annual budget arrives (base * economic modifier + policy revenue bonuses)
9. Counter-narrative generation: Roll for next turn's counter-narrative (result is queued for next turn's Events phase)
10. Stage transition check: Check if all conditions for the next progression stage are met; if so, trigger transition event
```

#### Scenario: Climate damage before adaptation
- **WHEN** the resolve phase runs steps 2 and 3
- **THEN** step 2 computes raw climate event damage to tiles, then step 3 applies adaptation reduction from completed projects. The net damage (after adaptation) is what actually reduces tile ecological health.

#### Scenario: Feedback loops use current-turn values
- **WHEN** the resolve phase runs step 7 (meter feedback loops)
- **THEN** the formulas use the Trust, Food Sovereignty, and Ecological Health values that include all changes from steps 1-6 of this resolve phase (not the start-of-turn values)

#### Scenario: Budget replenishment on Spring turns
- **WHEN** the resolve phase runs step 8 and the current turn is Spring of Year 3+
- **THEN** the budget receives the annual replenishment: $1.5M * economic_modifier + sum of all policy revenue bonuses ($0.2M per Solar Grid, $0.15M for Cooperative Tax Incentives, $0.1M per Maker Space)

#### Scenario: Stage check happens last
- **WHEN** the resolve phase runs step 10
- **THEN** the stage transition check uses fully updated meter values from this turn. If the player's actions this turn pushed meters past thresholds, the transition fires immediately at end of this turn.

### Requirement: Turn summary
After the Resolve phase, the system SHALL display a summary showing all changes with exact numbers:
- Each meter's delta broken down by source (e.g., "Trust: +2% project, +0.75% food feedback, -0.3% decay, -1.5% counter-narrative = net +0.95%")
- Completed projects and their effects
- Resolved events and chosen outcomes
- Tile visual stage transitions
- Climate pressure increase and current total
- Budget changes (costs deducted, revenue added)

#### Scenario: Turn summary shows changes
- **WHEN** the Resolve phase completes on a turn where a Food Forest completed, a counter-narrative fired, and climate ticked
- **THEN** the summary displays: "Trust: +2.0% (Food Forest) +0.6% (Food Sov feedback at 32%) -0.3% (decay) = +2.3% | Food Sov: +3.0% (Food Forest) | Will: +2.5% (regen at Trust 55%) -3.5% (Corporate Media) -0.7% (policy drain) = -1.7% | Climate: +0.95% (to 42.3%) | Eco: +1.2% (global from projects)"

### Requirement: Seasons affect gameplay with specific modifiers
Each season SHALL have these exact gameplay effects:

**Spring:**
- Ecology-type projects advance +1 extra turn of progress (removed after Tipping Point 1 at 60% climate)
- Budget replenishment arrives (if new year)
- Flooding event probability active (see climate-system)

**Summer:**
- Climate pressure receives +0.2% additional increase (summer heat bonus on top of base formula)
- Heat wave event probability active (see climate-system)
- No seasonal project modifier

**Fall:**
- Food Sovereignty gains +1% bonus (harvest season) -- reduced to +0.5% after Tipping Point 1
- Severe storm event probability active
- No seasonal project modifier

**Winter:**
- Outdoor projects (ecology, infrastructure) advance -1 turn progress (minimum 0 progress; indoor/community projects unaffected)
- Ice storm event probability active
- Planning bonus: narrative actions gain +0.5% additional Will (indoor organizing season)

#### Scenario: Spring planting bonus
- **WHEN** the current season is Spring (before Tipping Point 1)
- **THEN** ecology-type projects (Food Forest, Soil Remediation, Rain Garden, Native Planting, Wetland Restoration) advance +1 extra turn of progress

#### Scenario: Summer heat pressure
- **WHEN** the current season is Summer
- **THEN** climate pressure receives an additional +0.2% on top of the base formula increase, and heat wave probability is active at base 0.25 * pressure modifier

#### Scenario: Winter slows outdoor projects
- **WHEN** the current season is Winter and a Greenway is at 1/3 progress
- **THEN** the Greenway advances by max(0, 1 - 1) = 0 turns this turn (outdoor infrastructure project penalized). A Maker Space at 1/2 would still advance normally (+1, no penalty for community/indoor projects).
