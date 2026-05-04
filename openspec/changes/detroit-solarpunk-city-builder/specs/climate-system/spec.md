## ADDED Requirements

### Requirement: Climate pressure always rises with defined curve
The climate pressure meter SHALL increase every turn with the following formula:
```
base_rise = 0.92
acceleration = 1 + (year - 1) * 0.03
randomness = uniform_random(0.8, 1.2)
climate_increase = base_rise * acceleration * randomness
```
Climate pressure cannot be reduced by any player action. It can only be adapted to.

Per-turn increase examples (expected value, before randomness):
- Year 1: 0.92 * 1.00 = 0.92% per turn (3.68% per year)
- Year 4: 0.92 * 1.09 = 1.00% per turn (4.01% per year)
- Year 8: 0.92 * 1.21 = 1.11% per turn (4.46% per year)
- Year 12: 0.92 * 1.33 = 1.22% per turn (4.90% per year)
- Year 16: 0.92 * 1.45 = 1.33% per turn (5.34% per year)

Cumulative expected climate pressure (starting at 30%):
- Turn 16 (Year 4): ~46%
- Turn 32 (Year 8): ~64%
- Turn 40 (Year 10): ~75%
- Turn 48 (Year 12): ~87%
- Turn 64 (Year 16): ~97%

With +/-20% randomness, actual values will deviate by roughly +/-5% from these expected values by Turn 32.

#### Scenario: Climate pressure increases each turn
- **WHEN** turn 13 resolves (Year 4, Spring)
- **THEN** climate pressure increases by 0.92 * (1 + 3 * 0.03) * random(0.8, 1.2) = 0.92 * 1.09 * random = approximately 0.80 to 1.20%, expected 1.00%

#### Scenario: Acceleration over time
- **WHEN** the game reaches Year 10 (Turn 37)
- **THEN** the acceleration factor is 1 + 9 * 0.03 = 1.27, so per-turn climate rise is 0.92 * 1.27 * random = approximately 0.94 to 1.40%, which is 27% faster than Year 1

#### Scenario: Randomness creates variation between games
- **WHEN** two games are at the same turn
- **THEN** their climate pressures may differ by up to +/-5% due to cumulative random variation, making each playthrough feel distinct

### Requirement: Seasonal climate events with defined probabilities
The climate system SHALL generate weather events based on season and current climate pressure. Event probability formula:
```
event_prob = base_seasonal_prob * (0.5 + ClimatePressure * 0.01)
```

Base seasonal event probabilities:
- Summer heat wave: base 0.25
- Spring flooding: base 0.20
- Fall severe storm: base 0.15
- Winter ice storm: base 0.10

Severity scaling with climate pressure:
```
severity_multiplier = 0.5 + (ClimatePressure / 100)
```
At 30% pressure: 0.8x severity. At 60% pressure: 1.1x severity. At 85% pressure: 1.35x severity.

Base damage values (before severity multiplier and adaptation):
- Heat wave: -2% Community Trust (health impact), -$0.1M budget (cooling costs)
- Flooding: -15% tile ecological health on affected low-lying tiles, -$0.2M budget (repairs)
- Severe storm: -10% tile ecological health on random tiles, -$0.15M budget
- Ice storm: -5% tile ecological health, -1 turn progress on outdoor projects

#### Scenario: Summer heat wave
- **WHEN** the season is Summer and climate pressure is 55%
- **THEN** heat wave probability is 0.25 * (0.5 + 0.55) = 0.2625 (26.25% chance), with severity multiplier 0.5 + 0.55 = 1.05x if it fires

#### Scenario: Spring flooding
- **WHEN** the season is Spring and climate pressure is 45%
- **THEN** flooding probability is 0.20 * (0.5 + 0.45) = 0.19 (19% chance), affecting low-lying and waterfront tiles

#### Scenario: Severity scales with pressure
- **WHEN** climate pressure is 80% and a storm event triggers
- **THEN** the severity multiplier is 0.5 + 0.80 = 1.30x, so storm damage is -10% * 1.30 = -13% tile ecological health

### Requirement: Ecological debt with per-tile-type starting contamination
The system SHALL track accumulated ecological damage per tile. Initial contamination levels by tile type:
- Industrial: 80% contamination (heavy metals, chemicals)
- Urban-dense: 40% contamination (lead paint runoff, exhaust)
- Urban-sparse: 25% contamination (moderate urban runoff)
- Waterfront: 50% contamination (industrial discharge, combined sewers)
- Vacant: 20% contamination (mild, mostly neglect)
- Park: 10% contamination (legacy pesticides)

Contamination effects:
- Tiles with contamination > 50% BLOCK food projects (Food Forest, Community Kitchen with garden). Soil Remediation must reduce contamination first.
- Tiles with contamination > 30% reduce ecology project effectiveness by 50% (the project still works, but gives half the tile eco bonus).
- Contamination is reduced ONLY by Soil Remediation projects: each removes 60% of remaining contamination on completion (e.g., 80% becomes 32%, 40% becomes 16%).
- Contamination does NOT decay naturally. It persists until remediated.

#### Scenario: Contaminated soil blocks food projects
- **WHEN** the player attempts to start a Food Forest on an industrial tile with 80% contamination
- **THEN** the system blocks the project and indicates that contamination is 80% (threshold 50%), requiring Soil Remediation first

#### Scenario: Moderate contamination reduces effectiveness
- **WHEN** the player completes a Rain Garden on an urban-dense tile with 35% contamination
- **THEN** the tile ecological health bonus is +10% * 0.5 = +5% (reduced by half due to contamination > 30%)

#### Scenario: Remediation reduces contamination
- **WHEN** a Soil Remediation project completes on a tile with 80% contamination
- **THEN** contamination drops to 80% * 0.4 = 32%, which is below the 50% food project threshold but still above 30% (ecology projects still at half effectiveness until further remediation or reaching 30% via a second remediation: 32% * 0.4 = 12.8%)

### Requirement: Climate adaptation reduces damage with specific formulas
Completed ecology and infrastructure projects SHALL reduce climate event damage on affected tiles using this formula:
```
damage_after_adaptation = base_damage * severity_multiplier * Climate_damage_multiplier * (1 - tile_adaptation_bonus)
```
Where Climate_damage_multiplier is from the meter-system (based on global Eco) and tile_adaptation_bonus is from completed projects on that tile:
- Rain Garden on tile: 40% flood damage reduction (tile_adaptation_bonus += 0.40 for flood events)
- Wetland Restoration on tile: 60% flood damage reduction (tile_adaptation_bonus += 0.60 for flood events)
- Food Forest / Native Planting on tile: 20% heat damage reduction (tile_adaptation_bonus += 0.20 for heat events)
- Solar Grid on tile: 15% heat damage reduction (tile_adaptation_bonus += 0.15 for heat events)
- Greenway on tile: 25% storm damage reduction (tile_adaptation_bonus += 0.25 for storm events)

Tile adaptation bonuses stack additively but cap at 0.90 (always at least 10% residual damage).

#### Scenario: Green infrastructure mitigates flooding
- **WHEN** a flooding event hits a tile that has a completed Rain Garden (0.40 flood reduction)
- **THEN** flooding damage to that tile is base -15% * severity * global_eco_multiplier * (1 - 0.40) = 60% of the otherwise-expected damage

#### Scenario: Multiple adaptations stack
- **WHEN** a flooding event hits a tile with both Rain Garden (0.40) and Wetland Restoration (0.60) on adjacent connected tile
- **THEN** the tile's flood adaptation bonus is min(0.90, 0.40 + 0.30) = 0.70 (Wetland on adjacent provides half its bonus = 0.30), so damage is 30% of expected

### Requirement: Climate tipping points with specific effects
At defined climate pressure thresholds, the system SHALL trigger permanent, irreversible changes:

**Tipping Point 1: 60% climate pressure (expected around Turn 30, Year 8)**
- Growing season reduced: Spring ecology project bonus drops from +1 extra turn progress to +0 extra turns
- Fall harvest bonus reduced by 50% (food sovereignty seasonal bonus halved)
- New event type unlocked: "Invasive Species" (probability 0.15/turn, damages tile eco by -5%)
- Permanent notification: "The growing season has shifted. Adaptation is now critical."

**Tipping Point 2: 85% climate pressure (expected around Turn 46, Year 12)**
- All climate event base probabilities doubled
- New event type unlocked: "Infrastructure Cascade" (probability 0.10/turn, damages 2-3 random tiles simultaneously)
- Water tile benefits reduced by 30% (Great Lakes stress)
- Permanent notification: "Great Lakes ecosystem under severe stress. The window for restoration is closing."

#### Scenario: Tipping point 1 triggers
- **WHEN** climate pressure reaches 60% (expected around Turn 30)
- **THEN** a tipping point event fires: Spring ecology bonus removed (no +1 turn progress), Fall food bonus halved, Invasive Species events begin at 0.15 probability per turn

#### Scenario: Tipping point 2 triggers
- **WHEN** climate pressure reaches 85% (expected around Turn 46)
- **THEN** a tipping point event fires: all climate event base probabilities doubled (Summer heat wave base becomes 0.50, etc.), Infrastructure Cascade events begin, water tile benefits reduced by 30%
