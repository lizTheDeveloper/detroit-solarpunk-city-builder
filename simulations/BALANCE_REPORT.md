# Detroit Solarpunk City Builder - Balance Report

Monte Carlo simulation results (1000 iterations per strategy, 64 turns = 16 years = 4 mayoral terms).

---

## Executive Summary

The game has **three critical balance problems** that must be addressed before playtesting:

1. **Political Will death spiral**: Every strategy loses to re-election failure. The aggressive strategy has a 0% survival rate because Political Will drains to ~6% by Turn 16. Counter-narratives drain ~170% total Will over the game, while the main regen source (Trust feedback) only provides ~120%. The Will economy is structurally negative without heavy narrative investment.

2. **Stage progression is stuck at Transition**: No strategy in 1000 iterations ever reaches Restoration or Beyond the Map. The Transition->Restoration threshold (Trust>=75%, Eco>=60%, Food>=60%, Will>=50%, 15 tiles) is unachievable because Political Will cannot stay above 50% while simultaneously spending Will on policies needed to advance other meters.

3. **Narrative actions are either overpowered or useless**: Simulation 4 shows that strategies using full narrative actions each turn (balanced/narrative_first) generate ~880% total Will from narrative over 64 turns, making Will trivially sustainable. But strategies that neglect narrative (policy_heavy, reactive) collapse. There is no middle ground -- the system is binary.

---

## Simulation 1: Meter Dynamics

### Key Findings

| Metric | Aggressive | Balanced | Conservative |
|--------|-----------|----------|-------------|
| Survival Rate | 0.0% | 1.4% | 8.8% |
| Avg Turn to Transition | 14.0 | 12.1 | 25.1 |
| % Reaching Transition | 78.0% | 99.9% | 86.6% |
| % Reaching Restoration | 0.0% | 0.0% | 0.0% |
| Final Trust | 83.9% | 89.6% | 62.6% |
| Final Eco | 59.7% | 65.2% | 32.5% |
| Final Food | 51.6% | 64.7% | 37.2% |
| **Final Political Will** | **6.2%** | **7.9%** | **17.0%** |
| Final Budget ($M) | 3.1 | 4.5 | 15.4 |
| Final Climate | 48.6% | 61.2% | 78.8% |

### Problems Identified

1. **0% survival for aggressive, 1.4% for balanced**: The primary loss condition is re-election (Will < 20% at Turn 16/32/48). Political Will collapses in all strategies because the drain from policies (-3%/turn aggressive) plus counter-narratives (-2.5 to -5%/turn random) outpaces regen from trust (+2%/turn above 70% trust).

2. **No strategy reaches Restoration**: Even though balanced play gets Eco to 65% and Food to 65%, Will never reaches the 50% threshold simultaneously. The Transition->Restoration gate requires all four meters high at the same time.

3. **Climate pressure hits 61-79% by Turn 64**: This is appropriate pacing -- tipping points create meaningful late-game pressure. But the game ends at re-election long before climate becomes the problem.

4. **Conservative strategy hoards budget uselessly**: $15.4M final budget means the conservative player is under-spending, but still loses to low Will.

### Recommendations

- **Increase Political Will regen from trust**: Change Trust>70% bonus from +2%/turn to +3%/turn, and add a +1%/turn baseline regen for all players
- **Reduce counter-narrative frequency**: Current ~0.35/turn combined probability means ~22 counter-narrative events over 64 turns, draining 110%+ Will. Reduce individual probabilities by 40%
- **Lower re-election Will threshold**: 20% is too punishing given the structural Will deficit. Consider 15% or make the re-election a narrative event where the player can campaign

---

## Simulation 2: Project Economy

### Key Findings

| Metric | Aggressive | Balanced | Conservative |
|--------|-----------|----------|-------------|
| Total Projects (64 turns) | 83.0 | 111.5 | 117.0 |
| Projects/Term 1 | 24.6 | 30.1 | 21.0 |
| Tiles Transformed | 68.3 | 109.8 | 31.1 |
| 5 tiles by Turn 16 | 100% | 100% | 100% |
| 15 tiles by Turn 32 | 100% | 100% | 100% |
| 25 tiles by Turn 48 | 100% | 100% | 0.3% |

### Problems Identified

1. **Tile counts are way too high**: 68-110 tiles transformed over 64 turns, when the map only has 30-50 tiles. The project throughput is too fast. Players are transforming tiles multiple times over.

2. **Project completion is too easy**: 83-117 projects in 64 turns = 1.3-1.8 projects per turn. With projects taking 2-5 turns each, this means 3-5 concurrent projects always running, which is the max allowed.

3. **Conservative strategy still hits 31 tiles**: Even the most passive approach transforms all neighborhoods. There is no resource tension -- budget replenishment ($2.5M/year) is far more than project costs demand.

4. **Sim2 shows 100% in Transition stage for aggressive/balanced but 97.8% Beyond for conservative**: This is a bug in Sim2's simplified stage check -- it does not model Political Will properly. The discrepancy between Sim1 (stuck at Transition) and Sim2 (reaching Beyond) confirms that Will is the binding constraint, not tiles or other meters.

### Awakening->Transition Feasibility (1 Term)

The Awakening->Transition threshold (Trust>=50%, Eco>=30%, Food>=25%, 5 tiles) **is reachable in 1 term**:
- Starting Trust is already at 50% (meets threshold immediately if maintained)
- Need +15% Eco (15->30) and +15% Food (10->25)
- 5 Food Forests at 3 turns each with 2-3 concurrent slots = achievable in 6-9 turns
- Budget cost: ~$2.5M of $4.2M starting budget

**Verdict**: The Awakening->Transition gate is well-calibrated. Reachable in 10-14 turns for a focused player.

### Recommendations

- **Increase project costs by 50-100%**: Food Forest should cost $0.75-1.0M instead of $0.5M. This creates real budget tension.
- **Reduce project effect magnitudes by 30%**: Food Forest should give +3% eco, +3% food instead of +5%/+5%
- **Cap tiles at map size (40-50)**: Prevent multiple transformations of the same tile, or make subsequent transformations on the same tile give diminishing returns
- **Reduce annual budget replenishment**: $2.5M base is too generous. Try $1.5M base to create real scarcity

---

## Simulation 3: Climate Pressure Race

### Key Findings

| Climate Milestone | Turn | Year | Season |
|------------------|------|------|--------|
| Tipping Point 1 (70%) | 40 | 10 | Spring |
| Tipping Point 2 (85%) | 53 | 13 | Summer |
| Climate reaches 97.5% | 64 | 16 | Winter |

| Adaptation Pace | Final Eco | % Unwinnable |
|----------------|-----------|-------------|
| None | 0.0% | 100% |
| Slow (0.5%/turn) | 0.5% | 98.2% |
| Medium (1.2%/turn) | 55.3% | 0% |
| Fast (2.0%/turn) | 100.0% | 0% |
| Optimal (3.0%/turn) | 100.0% | 0% |

| Adaptation Start Delay | Final Eco | % Unwinnable |
|------------------------|-----------|-------------|
| Turn 0 | 55.2% | 0% |
| Turn 8 | 41.6% | 0% |
| Turn 16 (1 term) | 28.3% | 0% |
| Turn 24 | 15.3% | 0.5% |
| Turn 32 (2 terms) | 2.8% | 77.2% |

### Problems Identified

1. **Cliff between "slow" and "medium" adaptation**: At slow pace (0.5% eco gain/turn), 98.2% of games become unwinnable. At medium pace (1.2%/turn), 0% do. There is no gradual difficulty curve -- it is a binary pass/fail.

2. **Point of no return is Turn 32 (Year 8)**: If the player has not started adapting by Turn 32, 77% of games are unwinnable. This is reasonable timing but should be clearly signaled in-game.

3. **Tipping Point 1 at Turn 40 feels late**: By Turn 40 (Year 10), the player has either adapted or not. The first tipping point should create drama earlier to incentivize adaptation.

4. **Climate pressure is deterministic**: Since it always rises at the same rate (base * acceleration), the pressure curve is the same every game. Only the events are random. Consider adding random variation to the base rise rate.

### Recommendations

- **Add an intermediate adaptation tier**: Insert a pace between slow and medium. Currently the jump from 0.5%/turn to 1.2%/turn is too steep. A "moderate" tier at 0.8%/turn that produces ~30% unwinnable would create a meaningful difficulty gradient.
- **Move Tipping Point 1 earlier**: Reduce from 70% to 60%, making it hit around Turn 30 (Year 7.5). This gives the player a warning shot mid-game rather than in the final third.
- **Increase base climate rise by 15%**: Change from 0.8 to 0.92 per turn. This moves Tipping 1 to ~Turn 34 and Tipping 2 to ~Turn 46, creating more urgency.
- **Add randomness to climate rise**: +/- 20% random variation per turn makes each game feel different.

---

## Simulation 4: Political Will Dynamics

### Key Findings

| Metric | Policy Heavy | Balanced | Narrative First | Reactive |
|--------|-------------|----------|-----------------|----------|
| Policies Enacted | 4.1 | 12.0 | 12.0 | 0.2 |
| Final Will | 14.5% | 99.2% | 98.5% | 46.7% |
| Final Trust | 100% | 100% | 100% | 76.7% |
| Counter-Narrative Hits | 34.4 | 37.4 | 35.5 | 32.2 |
| Will from Trust | 119.3% | 123.4% | 122.3% | 66.2% |
| Will from Narrative | 128.0% | 888.2% | 881.4% | 81.7% |
| Will Spent on Policies | 46.3% | 191.0% | 191.0% | 1.5% |
| Will Drained by Counters | 170.0% | 185.3% | 175.1% | 159.5% |
| Recall Triggered | 91.6% | 0.0% | 0.0% | 0.5% |
| Turns Below 40% Will | 63.1 | 0.1 | 0.0 | 4.6 |

### Problems Identified

1. **Narrative actions are absurdly overpowered**: The balanced/narrative_first strategies generate ~880% Will from narrative over 64 turns. Each narrative action gives 1-4% Will, compounded by the narrative streak bonus. With 2-4 actions per turn and compounding, this produces 10-15% Will per turn -- far more than any drain can match.

2. **Counter-narratives are toothless against narrative-focused play**: Counter-narratives drain ~175-185% Will total, but narrative actions generate 880%. The counter-narrative system is overwhelmed 5:1.

3. **Policy Heavy strategy fails despite only passing 4 policies**: Even spending only 46% Will on policies over the whole game, the policy_heavy player has Will below 40% for 63 out of 64 turns. The problem is that policy_heavy only takes 1 narrative action per turn (~2% Will gain) vs. counter-narrative drain (~2.7%/turn). The net is negative.

4. **Ongoing policy drain compounds fatally**: Each policy adds 0-2% ongoing drain per turn. By policy 4-5, the ongoing drain alone is 3-5%/turn, which exceeds passive Will regen.

5. **Trust reaches 100% in almost all strategies**: Trust is too easy to raise and too hard to lose. This makes the Trust->Will feedback loop (+2%/turn above 70%) essentially always active, but it is still not enough to offset counter-narrative drain without narrative actions.

### Recommendations

- **Reduce narrative action Will gain by 60%**: Community Meeting should give +1 Will instead of +2. Media Campaign should give +1 instead of +3. Total narrative Will gain should be ~350% over the game, not 880%.
- **Reduce narrative compounding multiplier**: Change from +10% per consecutive turn (up to +50%) to +5% per turn (up to +25%). Current compounding makes narrative snowball too hard.
- **Reduce counter-narrative Will drain by 30%**: Lower individual event drains (Corporate Media from 5% to 3.5%, State Pushback from 8% to 5.5%). Total counter-narrative drain should be ~120% over 64 turns.
- **Reduce ongoing policy drain**: Cap ongoing drain at 0.5%/turn per policy max. Total ongoing drain should never exceed 4%/turn.
- **Add passive Will regen of +1%/turn**: This baseline prevents the "no narrative = death" problem and gives policy-focused players a chance.
- **Make Trust harder to gain and easier to lose**: Reduce Trust gains from projects by 30%. Add Trust decay of -0.5%/turn baseline (representing public attention span). This prevents Trust from trivially capping at 100%.

---

## The Golden Path: What a Well-Played Game Should Look Like

Below is the recommended arc for a competent player over 64 turns, assuming the parameter adjustments above are implemented:

### Term 1 (Turns 1-16): Awakening

| Turn Range | Focus | Key Actions |
|-----------|-------|-------------|
| 1-4 (Year 1) | Foundation | 2 Community Gardens, 1 Soil Remediation. 1 narrative/turn. Budget: $4.2M -> $2.7M |
| 5-8 (Year 2) | Building Trust | 2 Food Forests started, 1 Rain Garden. Community Meetings. Trust: 50->58% |
| 9-12 (Year 3) | Stage Push | Complete Food Forests, start Solar + Kitchen. Pass Urban Ag Zoning (Will: 55->45%). Eco: 28->35%, Food: 22->30% |
| 13-16 (Year 4) | Transition Gate | 5+ tiles transformed. Trust 55%+, Eco 30%+, Food 25%+. **Stage transition to Transition**. Re-election: safe at Trust 55%, Will 40% |

**Meters at end of Term 1**: Trust ~58%, Eco ~35%, Food ~30%, Will ~42%, Budget ~$3.0M, Climate ~42%

### Term 2 (Turns 17-32): Transition

| Turn Range | Focus | Key Actions |
|-----------|-------|-------------|
| 17-20 | Expand | Maker Space, Greenway, Land Trust. Pass Coop Tax Incentives. Narrative compounding begins. |
| 21-24 | Adapt to Climate | Tipping Point 1 approaching. Green infrastructure priority. Water Transit Pilot policy. |
| 25-28 | Policy Push | Participatory Budget, Reparative Housing. Will dips to 35% then recovers. |
| 29-32 | Restoration Push | 15+ tiles. Trust 72%, Eco 55%, Food 55%. **If Will >= 50%, transition to Restoration**. |

**Meters at end of Term 2**: Trust ~72%, Eco ~55%, Food ~55%, Will ~48%, Budget ~$2.5M, Climate ~62%

### Term 3 (Turns 33-48): Restoration

| Turn Range | Focus | Key Actions |
|-----------|-------|-------------|
| 33-36 | Ecological Corridors | Wetland Restoration, Native Planting. Climate Tipping Point 1 hits -- growing season reduced. |
| 37-40 | Counter-narrative Storm | State/Federal pushback intensifies. Must dedicate 2-3 narrative actions/turn to defense. |
| 41-44 | Regional Collaboration | Start Regional Collab project (6 turns). De-growth Transition policy. Will stress: 40->50% |
| 45-48 | Beyond Gate | 25+ tiles. Eco 80%+, Food 75%+. Tipping Point 2 approaching. |

**Meters at end of Term 3**: Trust ~80%, Eco ~80%, Food ~78%, Will ~45%, Budget ~$2.0M, Climate ~82%

### Term 4 (Turns 49-64): Beyond the Map

| Turn Range | Focus | Key Actions |
|-----------|-------|-------------|
| 49-52 | Continental Scale | Regional Collab completes. Beyond the Map transition. Tipping Point 2 hits. |
| 53-56 | Great Lakes Bioregion | Continental-scale goals. Massive adaptation needed. |
| 57-60 | Buffalo Commons | Final ecological push. Eco 90%+, Food 85%+ |
| 61-64 | Legacy | Win condition: sustainable systems in place despite 95%+ climate pressure |

**Final Meters**: Trust ~85%, Eco ~88%, Food ~85%, Will ~40%, Budget ~$1.5M, Climate ~97%

### The Golden Path Experience

The game should feel like: "I'm always running out of something." In early game, it is budget and trust. In mid-game, it is political will and time. In late game, it is a race against climate. The player should never feel comfortable -- every turn should require a meaningful trade-off. With current numbers, the player either dies to Will collapse (too hard) or cruises to max meters (too easy, in Sim2/Sim4). The golden path requires fixing the Will economy and the project economy to create sustained tension.

---

## Summary of Recommended Parameter Changes

| Parameter | Current | Recommended | Rationale |
|-----------|---------|-------------|-----------|
| Political Will baseline regen | 0%/turn | +1%/turn | Prevent death spiral without narrative |
| Trust>70% Will bonus | +2%/turn | +3%/turn | Strengthen feedback loop |
| Counter-narrative probabilities | 0.05-0.15 each | 0.03-0.10 each | Reduce total drain by 30% |
| Re-election Will threshold | 20% | 12% | More forgiving, match actual gameplay |
| Narrative action Will gain | 1-4%/action | 0.5-2%/action | Prevent narrative snowball |
| Narrative compounding cap | +50% | +25% | Reduce compounding power |
| Project costs | $0.2-1.5M | $0.4-2.5M | Create real budget tension |
| Project effect magnitudes | 1-10% per meter | 0.7-7% per meter | Slow progression by 30% |
| Annual budget replenishment | $2.5M base | $1.5M base | Increase scarcity |
| Trust gain from projects | 1-5%/project | 0.5-3.5%/project | Prevent trivial Trust cap |
| Trust passive decay | 0%/turn | -0.3%/turn | Represent fading attention |
| Ongoing policy drain cap | No cap | 0.5%/turn max per policy | Prevent drain spiral |
| Climate base rise | 0.8/turn | 0.92/turn | Earlier urgency |
| Tipping Point 1 | 70% | 60% | Move warning earlier |
| Slow adaptation eco rate | 0.5%/turn | 0.8%/turn | Fill gap between slow and medium |

---

## Files Generated

### Charts
- `sim1_meter_trajectories.png` - Average meter values over 64 turns by strategy
- `sim1_outcomes.png` - Win rates and stage distributions
- `sim2_project_economy.png` - Budget and tile counts over time
- `sim2_projects_per_term.png` - Project throughput per term
- `sim3_climate_race.png` - Climate vs ecological health by adaptation pace
- `sim3_delayed_adaptation.png` - Impact of delaying adaptation
- `sim3_pure_climate_rise.png` - Raw climate pressure curve with tipping points
- `sim4_political_will.png` - Will and trust trajectories by strategy
- `sim4_will_economy.png` - Will inflow vs outflow analysis
- `sim4_drain_vs_regen.png` - Turn-by-turn drain/regen balance

### Data
- `sim1_results.json` - Sim 1 numeric results
- `sim2_results.json` - Sim 2 numeric results
- `sim3_results.json` - Sim 3 numeric results
- `sim4_results.json` - Sim 4 numeric results
