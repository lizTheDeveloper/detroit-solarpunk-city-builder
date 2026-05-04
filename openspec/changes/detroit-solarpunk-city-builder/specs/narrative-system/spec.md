## ADDED Requirements

### Requirement: Narrative actions with specific effects
The player SHALL spend narrative actions each turn to shift public opinion and build political will. Each action type has defined effects:

| Action | Will Gain | Trust Gain | Other Effect |
|--------|-----------|------------|--------------|
| Community Meeting | +1% Will | +2% local Trust (target neighborhood only, contributes 0.5% to city-wide Trust) | -- |
| Media Campaign | +1.5% Will | -- | -3% policy threshold for target topic (e.g., food sovereignty policies become 3% easier to pass) |
| Education Program | +1% Will | -- | +2% public opinion on target topic |
| Cultural Event | +1% Will | +2% Trust (city-wide) | -- |
| Demonstration | +2% Will | -2% Trust | High Will gain but costs Trust (risky); represents disruptive political action |

All Will and Trust gains listed are base values before compounding is applied.

#### Scenario: Community Meeting increases local trust
- **WHEN** the player runs a "Community Meeting" narrative action targeting Brightmoor
- **THEN** Political Will increases by +1%, Community Trust for that neighborhood increases by +2% (contributing +0.5% to the city-wide Trust meter)

#### Scenario: Media Campaign shifts opinion
- **WHEN** the player runs a "Media Campaign" targeting food sovereignty
- **THEN** Political Will increases by +1.5%, and the Political Will threshold for all food-related policies decreases by 3 percentage points (e.g., a policy requiring 50% Will now requires 47%)

#### Scenario: Demonstration trades trust for will
- **WHEN** the player runs a "Demonstration"
- **THEN** Political Will increases by +2% but Community Trust decreases by -2%. This is the highest single-action Will gain but the only action that reduces Trust.

### Requirement: Narrative action budget with Trust scaling
The player SHALL have a limited number of narrative actions per turn based on Community Trust:
```
narrative_actions_per_turn = floor(1 + Trust / 30)
```
- Trust 0-29%: 1 action per turn
- Trust 30-59%: 2 actions per turn
- Trust 60-89%: 3 actions per turn
- Trust 90-100%: 4 actions per turn (maximum)

At game start (Trust 50%): 2 narrative actions per turn.

#### Scenario: Limited narrative actions at start
- **WHEN** a new turn begins with Community Trust at 50%
- **THEN** the player has floor(1 + 50/30) = floor(2.67) = 2 narrative actions available

#### Scenario: More trust means more actions
- **WHEN** Community Trust reaches 85%
- **THEN** the player has floor(1 + 85/30) = floor(3.83) = 3 narrative actions per turn

### Requirement: Public opinion model with continuous tracking
The system SHALL track public opinion as a continuous 0-100% value for each key topic:
- Food Sovereignty (starts at 15%)
- Water Commons (starts at 10%)
- Land Reform (starts at 8%)
- Ecological Restoration (starts at 20%)
- Cooperative Economics (starts at 12%)

Public opinion on a topic modifies the Political Will threshold for related policies:
```
effective_threshold = base_threshold * (1 - topic_opinion * 0.003)
```
At 0% opinion: full threshold. At 50% opinion: threshold * 0.85 (15% reduction). At 100% opinion: threshold * 0.70 (30% reduction).

#### Scenario: Opinion reduces policy threshold
- **WHEN** public opinion on food sovereignty is 40% and the base threshold for Urban Agriculture Zoning is 30% Will
- **THEN** the effective threshold is 30% * (1 - 40 * 0.003) = 30% * 0.88 = 26.4% Will

### Requirement: Counter-narratives with reduced probabilities
Opposition forces SHALL generate counter-narratives with the following per-turn probabilities and effects. Maximum 1 counter-narrative can fire per turn (if multiple trigger, the highest-severity one fires).

| Counter-Narrative | Probability/turn | Will Drain | Other Effect | Trigger Condition |
|-------------------|-----------------|------------|--------------|-------------------|
| Corporate Media | 0.08 | -3.5% Will | -2% public opinion on highest topic | Always active |
| Developer Lobbying | 0.06 | -2.5% Will | -$0.1M budget | Active when any Land Reform policy enacted |
| State Legislature Pushback | 0.05 | -5.5% Will | -3% public opinion on target topic | Active when 3+ policies enacted |
| Federal Intervention Threat | 0.03 | -4% Will | -2% Trust | Active when in Restoration stage or later |
| Astroturf Campaign | 0.07 | -2% Will | -3% Trust | Always active |
| NIMBYism | 0.10 | -1.5% Will | Blocks 1 random project for 1 turn | Active when 3+ concurrent projects running |

Combined expected counter-narrative frequency: approximately 1 every 2.5 turns (0.39/turn combined, but max 1 fires).
Expected total Will drain over 64 turns: approximately 80-100% (down from 170% in original).

#### Scenario: Corporate counter-narrative fires
- **WHEN** the counter-narrative roll for Corporate Media succeeds (8% chance per turn)
- **THEN** Political Will decreases by -3.5% and the highest public opinion topic loses -2%. The player sees: "Corporate media coverage paints community projects as wasteful. Political will eroded."

#### Scenario: Maximum one counter-narrative per turn
- **WHEN** both Corporate Media and Astroturf Campaign trigger on the same turn
- **THEN** only the higher-severity one fires (Corporate Media at -3.5% Will vs Astroturf at -2% Will, so Corporate Media fires). The other is suppressed for this turn.

### Requirement: Narrative compounding with reduced power
Sustained narrative effort on a topic SHALL compound with these specific mechanics:
```
compounding_bonus = min(0.25, consecutive_turns_on_topic * 0.05)
effective_action_value = base_value * (1 + compounding_bonus)
```
- 1st consecutive turn: +0% bonus (base value)
- 2nd consecutive turn: +5% bonus
- 3rd consecutive turn: +10% bonus
- 4th consecutive turn: +15% bonus
- 5th+ consecutive turn: +25% bonus (cap)

The "consecutive" counter resets to 0 if no narrative action targets that topic for 1 turn.

#### Scenario: Compounding narrative investment
- **WHEN** the player runs a Media Campaign on food sovereignty for the 4th consecutive turn (base +1.5% Will)
- **THEN** the compounding bonus is min(0.25, 3 * 0.05) = 0.15, so the action gives +1.5% * 1.15 = +1.725% Will and the -3% policy threshold becomes -3% * 1.15 = -3.45%

#### Scenario: Compounding resets on neglect
- **WHEN** the player skips food sovereignty narrative actions for 1 turn after 4 consecutive turns
- **THEN** the food sovereignty consecutive counter resets to 0. The next food sovereignty action starts at base value with no compounding bonus.

### Requirement: Opinion drift on neglect
Public opinion on each topic SHALL drift downward when no narrative action targets it:
```
opinion_drift = -2% per turn of neglect (no narrative action on that topic)
```
Opinion cannot drift below its starting value (the floor is the initial opinion for each topic).

#### Scenario: Neglect causes opinion drift
- **WHEN** no narrative actions target food sovereignty for 3 turns, and food sovereignty opinion is 35%
- **THEN** food sovereignty opinion drifts to 35% - (3 * 2%) = 29%

#### Scenario: Opinion cannot drift below starting value
- **WHEN** food sovereignty opinion has drifted to 16% (starting value 15%) and no action targets it
- **THEN** food sovereignty opinion drifts to max(15%, 16% - 2%) = 15% (floor at starting value)
