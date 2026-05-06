## ADDED Requirements

### Requirement: Monthly turn resolution
Each game turn SHALL represent one calendar month. A full mayoral term SHALL be 48 turns (4 years × 12 months).

#### Scenario: Turn advancement
- **WHEN** a turn is resolved
- **THEN** the month advances by 1, wrapping from December (12) to January (1) with year increment

### Requirement: Month-to-season derivation
Season SHALL be derived from the current month: Jan-Mar = winter, Apr-Jun = spring, Jul-Sep = summer, Oct-Dec = fall. Season is NOT stored independently — it is computed from month.

#### Scenario: Season lookup
- **WHEN** the game is in month 5 (May)
- **THEN** the derived season is "spring"

#### Scenario: Season transition detection
- **WHEN** the month advances from 3 (March/winter) to 4 (April/spring)
- **THEN** a season transition is detected and seasonal effects fire

### Requirement: Seasonal effects fire at transitions only
Seasonal effects (spring eco bonus, summer drought, fall harvest, winter heating) SHALL fire only on the first month of each season (months 1, 4, 7, 10) — not every turn.

#### Scenario: Mid-season turn
- **WHEN** month advances from 5 to 6 (both spring)
- **THEN** no seasonal effects fire

#### Scenario: Season boundary turn
- **WHEN** month advances from 6 to 7 (spring → summer)
- **THEN** summer seasonal effects fire

### Requirement: Scaled per-turn rates
All continuous per-turn meter effects (decay, growth, revenue) SHALL be approximately 1/3 of their current quarterly values. The total meter change per calendar year MUST remain approximately equal.

#### Scenario: Trust decay rate
- **WHEN** trust decay is calculated per monthly turn
- **THEN** the base rate is ~1/3 the current quarterly rate (preserving annual total)

### Requirement: Project durations in months
Project baseDuration values SHALL represent months (not seasons). Existing projects MUST have durations multiplied by 3 to maintain the same calendar completion time.

#### Scenario: Rain garden duration
- **WHEN** rain garden had baseDuration 2 (quarters = 6 months)
- **THEN** rain garden now has baseDuration 6 (months = still 6 months)

### Requirement: Election at turn 48
The mayoral election SHALL occur at turn 48. Election warning SHALL begin at turn 36 (12 months before election).

#### Scenario: Election timing
- **WHEN** a game reaches turn 48
- **THEN** the election is triggered using the same scoring formula as current system

### Requirement: Game starts at current real-world month
When a new game is created, the starting month SHALL be the current real-world month. Turn 1 of a game started in May 2026 represents May 2026.

#### Scenario: Game created in May
- **WHEN** a new game is created on 2026-05-15
- **THEN** turn 1 is May 2026, season is "spring", year is 1

### Requirement: Climate event probability monthly
Climate event rolls SHALL occur only at season transitions (every 3 turns). Probability values remain unchanged from current quarterly system (same expected events per year).

#### Scenario: Climate roll timing
- **WHEN** a season transition occurs (month 1, 4, 7, or 10)
- **THEN** climate event probability is rolled using existing formula

#### Scenario: Non-transition month
- **WHEN** a mid-season month is resolved (e.g., month 5)
- **THEN** no climate event roll occurs
