## ADDED Requirements

### Requirement: Six core meters with defined starting values and ranges
The system SHALL track six meters with the following starting values and ranges:
- Community Trust: 0-100%, starts at 50%
- Ecological Health: 0-100%, starts at 15%
- Food Sovereignty: 0-100%, starts at 10%
- Political Will: 0-100%, starts at 60%
- Budget: dollar amount, starts at $4.2M, minimum $0, no hard maximum
- Climate Pressure: 0-100%, starts at 30%, only increases (never decreases)

#### Scenario: All meters visible with exact values
- **WHEN** the game UI renders
- **THEN** all six meters are displayed with their current numeric values, visual indicators (bar/gauge), and delta arrows showing the per-turn trend from the last resolve phase

### Requirement: Meter feedback loops with continuous functions
Meters SHALL influence each other through continuous feedback functions computed every resolve phase. All formulas use post-action meter values from the current turn.

**Political Will regeneration:**
```
Will_regen = 1.0 + max(0, (Trust - 40) * 0.1)
```
This yields: +1.0%/turn at Trust <= 40%, +2.0%/turn at Trust 50%, +4.0%/turn at Trust 70%, +7.0%/turn at Trust 100%. The +1.0% baseline always applies regardless of Trust.

**Food Sovereignty to Trust (continuous):**
```
Trust_food_bonus = max(0, (FoodSov - 20) * 0.05)
```
This yields: +0%/turn at FoodSov <= 20%, +0.5%/turn at FoodSov 30%, +1.5%/turn at FoodSov 50%, +4.0%/turn at FoodSov 100%. No step function at 50%.

**Trust passive decay:**
```
Trust_decay = -0.5 per turn (always applied)
```
Represents public attention fading. Stronger decay prevents Trust from trivially capping at 99%. Must be offset by projects, narrative actions, and food sovereignty feedback.

**Ecological Health damage reduction:**
```
Climate_damage_multiplier = max(0.1, 1.0 - (Eco * 0.008))
```
At Eco 0%: full damage (1.0x). At Eco 50%: 0.6x damage. At Eco 100%: 0.2x damage. Minimum 10% damage always applies.

**Climate Pressure event frequency:**
```
Climate_event_probability = 0.05 + (ClimatePressure * 0.005)
```
At 30% pressure: 0.2 probability per applicable event type. At 80% pressure: 0.45 probability.

#### Scenario: Political Will regenerates with continuous trust bonus
- **WHEN** Community Trust is 55% during the resolve phase
- **THEN** Political Will regenerates by 1.0 + max(0, (55 - 40) * 0.1) = 1.0 + 1.5 = +2.5% this turn

#### Scenario: Political Will regenerates at minimum rate with low trust
- **WHEN** Community Trust is 30% during the resolve phase
- **THEN** Political Will regenerates by 1.0 + max(0, (30 - 40) * 0.1) = 1.0 + 0 = +1.0% this turn (baseline only)

#### Scenario: Food Sovereignty boosts Community Trust continuously
- **WHEN** Food Sovereignty is 35% during the resolve phase
- **THEN** Community Trust increases by max(0, (35 - 20) * 0.05) = +0.75% this turn

#### Scenario: Trust decays passively every turn
- **WHEN** the resolve phase computes meter feedback loops
- **THEN** Community Trust decreases by 0.3% (representing fading public attention), before other bonuses are applied

### Requirement: Meter thresholds trigger events
Specific meter values SHALL trigger events or state changes with the following exact thresholds:
- Budget reaches $0: austerity crisis event triggers
- Political Will below 15%: recall threat event triggers (warning)
- Political Will below 12% at re-election turn: re-election failure (game over)
- Community Trust below 25%: protest event triggers
- Community Trust below 20% at re-election turn: re-election failure (game over)
- Ecological Health >= 75%: restoration-stage projects unlock in catalog regardless of progression stage

#### Scenario: Budget crisis
- **WHEN** Budget reaches $0
- **THEN** an austerity crisis event triggers forcing the player to cut 1 active project or seek emergency funding ($0.5M federal grant at cost of -5% Political Will)

#### Scenario: High ecology unlocks projects
- **WHEN** Ecological Health reaches 75%
- **THEN** restoration-stage projects (wetland restoration, native planting, wildlife corridor) become available in the project catalog regardless of overall progression stage

#### Scenario: Recall threat warning
- **WHEN** Political Will drops below 15%
- **THEN** a recall threat event fires warning the player that re-election is at risk, providing a 1-turn narrative opportunity to recover

### Requirement: Meters change via defined channels only
Meters SHALL only change through these channels, and each change SHALL be traceable to a source in the turn summary:
1. Project completion effects (specific per project, see project-system)
2. Policy enactment costs (immediate Will reduction) and ongoing effects
3. Event consequences (player choice determines meter impact)
4. Narrative actions (specific per action type, see narrative-system)
5. Feedback loop passive effects (computed during resolve phase using formulas above)
6. Climate system ticks (Climate Pressure increase, see climate-system)
7. Counter-narrative drains (see narrative-system counter-narrative probabilities)

#### Scenario: Meter change is traceable
- **WHEN** Community Trust changes during a turn
- **THEN** the turn summary shows each source and amount, e.g.: "Trust: +2% (Food Forest completed) +0.75% (Food Sov feedback) -0.3% (passive decay) -1.5% (Corporate Media counter-narrative) = net +0.95%"

### Requirement: Budget as resource meter with specific economics
Budget SHALL function as a dollar amount with these specific parameters:
- Starting value: $4.2M
- Annual base replenishment: $1.5M (arrives on the Spring turn of each new year)
- Economic health modifier on replenishment: multiply base by (0.5 + Eco * 0.005 + Trust * 0.003)
  - At starting values (Eco 15%, Trust 50%): $1.5M * (0.5 + 0.075 + 0.15) = $1.5M * 0.725 = $1.09M
  - At mid-game (Eco 50%, Trust 70%): $1.5M * (0.5 + 0.25 + 0.21) = $1.5M * 0.96 = $1.44M
  - At late-game (Eco 80%, Trust 85%): $1.5M * (0.5 + 0.4 + 0.255) = $1.5M * 1.155 = $1.73M
- Revenue from enacted economic policies (see policy-system for specific amounts)
- Emergency funding events: +$0.5M (federal grant) or +$0.3M (mutual aid), both rare
- Minimum: $0 (triggers austerity crisis)

#### Scenario: Annual budget replenishment with economic modifier
- **WHEN** a new year begins (Spring turn) with Ecological Health at 40% and Community Trust at 65%
- **THEN** the budget receives $1.5M * (0.5 + 0.40 * 0.005/0.01... ) -- specifically: $1.5M * (0.5 + 40 * 0.005 + 65 * 0.003) = $1.5M * (0.5 + 0.2 + 0.195) = $1.5M * 0.895 = $1.34M

#### Scenario: Budget insufficient for project
- **WHEN** the player attempts to start a Solar Grid project ($1.5M) with only $1.2M in budget
- **THEN** the system prevents the project from starting and shows the deficit ($0.3M short)
