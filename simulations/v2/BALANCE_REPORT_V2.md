# Detroit Solarpunk City Builder - V2 Balance Report

Monte Carlo simulation results (1000 iterations per strategy/scenario, 64 turns = 16 years = 4 mayoral terms).

All V2 spec changes incorporated: continuous feedback formulas, reduced narrative gains, new character/relationship/tension systems, gentrification pressure, specialization paths, and continental goals.

---

## Executive Summary

The V2 parameter changes **fixed the V1 Political Will death spiral** -- Will is now sustainable for all strategies except Aggressive Growth. However, **three new balance issues** have emerged:

1. **Stage progression is bottlenecked by tile transformation counts**: Most strategies reach Transition but cannot reach Restoration. The tile count thresholds (12-25 tiles at specific eco levels) are harder to achieve than the meter thresholds. Community-First is the only path that reliably reaches Restoration, because its Transition-to-Restoration gate checks community-led project counts (10) rather than tile eco thresholds.

2. **Policy-First path has a structural re-election problem**: The Policy path's lower proposal acceptance rate (player-initiated projects, less community engagement) causes leader trust to decay, which tanks re-election scores. Only 2% of Policy-First games survive all 4 terms.

3. **Nobody reaches Beyond the Map**: The Restoration-to-Beyond gate requires 25 tiles at restoration visual (eco >= 70%) AND a completed Regional Collaboration project. With 40 total tiles and each needing 4-5 stacked projects to reach 70%, this is unreachable in 64 turns even for the best strategies.

### Comparison to V1

| Issue | V1 Status | V2 Status |
|-------|-----------|-----------|
| Political Will death spiral | CRITICAL (0-9% survival) | FIXED (100% survival for 4/6 strategies) |
| Stage stuck at Transition | CRITICAL (0% reach Restoration) | PARTIALLY FIXED (Community-First reaches Restoration at 100%) |
| Narrative actions overpowered | CRITICAL (880% Will from narrative) | FIXED (Will from narrative is ~250-350%, balanced) |
| Counter-narratives too harsh | CRITICAL (170% drain) | FIXED (~80-100% drain, manageable) |
| Trust trivially reaches 100% | MODERATE | PARTIALLY FIXED (Trust reaches 99% for good strategies but takes 30+ turns) |
| Project throughput too high | MODERATE (110+ projects) | FIXED (20-30 projects per game, appropriate pacing) |
| Budget too generous | MODERATE | FIXED (budget runs tight, ~$0.5M at end of game) |

---

## Simulation 1: Full Game Playthrough

### Results Summary

| Metric | Ecology-First | Community-First | Policy-First | Balanced | Aggressive Growth | Pure De-growth |
|--------|--------------|----------------|-------------|----------|-------------------|---------------|
| **Survival Rate** | 100% | 100% | 2% | 100% | 0% | 100% |
| **Final Trust** | 99.7% | 99.7% | 45.7% | 99.7% | 25.5% | 99.7% |
| **Final Eco** | 100% | 100% | 46.8% | 100% | 24.9% | 100% |
| **Final Food** | 78.9% | 96.3% | 22.8% | 90.9% | 14.0% | 75.5% |
| **Final Will** | 97.5% | 97.5% | 63.4% | 97.5% | 87.3% | 97.5% |
| **Final Budget** | $0.56M | $0.54M | $0.98M | $0.51M | $0.75M | $0.54M |
| **Final Climate** | 100% | 100% | 57.5% | 100% | 46.2% | 100% |
| **Reached Transition** | 71.2% | 100% | 57.2% | 100% | 0% | 68.2% |
| **Reached Restoration** | 0% | 100% | 0% | 0% | 0% | 0% |
| **Reached Beyond** | 0% | 0% | 0% | 0% | 0% | 0% |
| **Avg Transition Turn** | 51.6 | 15.4 | 16.3 | 20.7 | -- | 51.1 |
| **Avg Restoration Turn** | -- | 28.4 | -- | -- | -- | -- |
| **Avg Projects** | 27.6 | 26.5 | 10.5 | 30.9 | 5.7 | 27.5 |
| **Avg Leader Trust** | 28.8 | 95.5 | 2.3 | 29.2 | -2.3 | 95.5 |
| **Re-election (1/2/3/4)** | 100/100/100/100 | 100/100/100/100 | 50/8/4/2 | 100/100/100/100 | 0/0/0/0 | 100/100/100/100 |

### Key Findings

1. **Will economy is now healthy**: The +1% baseline regen + trust bonus formula produces stable Will for strategies that maintain Trust above 40%. Will reaches 97.5% ceiling for cooperative strategies, while Policy-First stabilizes around 63%.

2. **Community-First dominates**: It's the only strategy reaching Restoration (100% of runs, avg turn 28). Its high proposal acceptance rate builds leader trust to 95.5, creating a strong re-election foundation and unlocking the community-led project count gates.

3. **Ecology-First transitions late (turn 51.6)**: The ecology path needs food >= 35%, which is slow to accumulate from food_forests alone (+3% each). Despite reaching eco 100% and food 78.9% by game end, the combined eco+food+tiles threshold is met very late.

4. **Policy-First has a fatal flaw**: Only 2% survive all 4 terms. The first re-election passes at 50%, but subsequent ones drop to 8%/4%/2% because leader trust erodes (avg 2.3 at game end). The player-initiated project mode + low proposal acceptance destroys community relationships.

5. **Aggressive Growth is unplayable**: 0% survival, 0% transition. The strategy's low acceptance rate (-15 trust rejections) drives all leaders hostile, and the player-initiated mode tanks Trust below re-election threshold.

6. **Budget runs appropriately tight**: Final budgets of $0.5-1.0M indicate real resource scarcity. The $1.5M base replenishment with economic modifier creates meaningful budget pressure.

### Problems Identified

- **Ecology path Transition timing is way too late** (turn 51.6 vs target 10-14). The ecology path's food >= 35% requirement needs ~8 food_forests from a 10% start, but community-led food_forests take 5 turns each and cost $1.27M. This is a 40-turn process.
- **Balanced path cannot reach Restoration** despite reaching eco 100% and food 90.9%. The generalist Restoration gate (trust >= 70, eco >= 55, food >= 55, will >= 40, 15 tiles) fails on the 15-tile count.
- **Trust caps at 99.7% too easily** for strategies with good leader relationships. The +0.3%/turn decay is insufficient to counter the Trust gains from projects + food feedback + leader trust bonus.
- **Policy-First path is effectively nonviable** due to structural re-election failure from character system.

---

## Simulation 2: Specialization Path Viability

### Results Summary

| Path | Reached Transition | In Target (10-14) | Avg Turn | Reached Restoration | In Target (32-40) | Reached Beyond |
|------|-------------------|-------------------|----------|--------------------|--------------------|---------------|
| Ecology-First | 72.4% | 0% | 51.7 | 0% | 0% | 0% |
| Community-First | 100% | 48.3% | 15.3 | 100% | 17.8% | 0% |
| Policy-First | 57.0% | 15.9% | 16.0 | 0% | 0% | 0% |

### Key Findings

1. **Community-First is the golden path**: 48.3% hit Transition in the target window (turns 10-14), and 100% reach Restoration by turn 28.4. However, Restoration timing is early relative to the target (32-40), arriving at 17.8% within the window and 82.2% early.

2. **Ecology-First misses all target windows**: Transition arrives at turn 51.7 on average, 37 turns late. The food sovereignty bottleneck delays everything. The path's strength (eco growth) is wasted because its gate also requires food.

3. **Policy-First reaches Transition on time but dies**: 15.9% hit the 10-14 window, and avg turn 16 is close. But the path cannot sustain past the first term due to re-election failure.

4. **No path reaches Beyond the Map**: The Restoration-to-Beyond gate (eco >= 80, food >= 75, 25 restoration tiles, Regional Collab done) is structurally unachievable given the tile stacking requirements.

### Path-Specific Strengths and Weaknesses

| Path | Strength | Weakness |
|------|----------|----------|
| Ecology-First | Eco reaches 100%, strong climate adaptation | Food sovereignty grows too slowly; late transitions |
| Community-First | Fast transitions, high trust, leader relationships | Depends on high acceptance rates; potentially too easy |
| Policy-First | Policies enacted early, good Will management | Structural re-election failure from poor leader relationships |

---

## Simulation 3: Character System Stress Test

### Results Summary

| Accept Rate | Final Advocates | Final Coalitions | First Coalition Turn | Council Allies | Re-election Win Rate (1/2/3/4) |
|------------|----------------|-----------------|---------------------|---------------|-------------------------------|
| 10% | 0.0 | 0.0 | never | 3.0 | 0/0/0/0% |
| 20% | 0.0 | 0.0 | never | 3.0 | 0/0/0/0% |
| 30% | 0.1 | 0.0 | turn 12 | 3.0 | 0/0/0/0% |
| 40% | 1.0 | 0.1 | turn 26 | 3.0 | 14/5/2/0% |
| **50%** | **6.9** | **1.8** | **turn 10** | **3.0** | **88/93/96/97%** |
| 60% | 8.0 | 2.0 | turn 5 | 3.0 | 100/100/100/100% |
| 70%+ | 8.0 | 2.0 | turn 3 | 3.0 | 100/100/100/100% |

### Key Findings

1. **50% acceptance is the critical threshold**: Below 50%, leader trust collapses and re-election fails. At exactly 50%, 88% win the first re-election and the rate improves over time (93/96/97%). Above 60%, it's guaranteed.

2. **The cliff between 40% and 50% is very steep**: At 40%, only 1 advocate and 14% first re-election. At 50%, 6.9 advocates and 88% first re-election. There's no gradual transition -- this is a binary pass/fail.

3. **Council allies are stuck at 3**: Regardless of acceptance rate, council allies stay at 3 (the starting 3 progressives). The council disposition system doesn't shift moderates enough to create new allies. This means the re-election score depends almost entirely on leader trust and city-wide Trust, not council dynamics.

4. **Coalitions form quickly at high acceptance**: At 60%+, first coalition forms by turn 5. At 50%, it takes turn 10. Coalitions provide +8 re-election score per coalition, which is significant.

5. **No hostile leaders at any acceptance rate**: The decay system prevents leaders from reaching -50 because negative relationships decay toward 0. This means the "organized opposition" mechanic never triggers. Leaders get disillusioned (trust < 0) but not hostile.

### Problems Identified

- **Council system is inert**: Dispositions barely change, moderates never convert. The council vote mechanic is decorative rather than strategic.
- **The 50% acceptance cliff** is too binary. A player slightly below 50% acceptance is doomed; slightly above is fine.
- **No hostile leaders** means the opposition/resistance mechanics are dead code.

---

## Simulation 4: Gentrification & Displacement

### Results Summary

| Strategy | Avg Displacement | Zero Displacement % | Final Avg Gentrif | Tiles Transformed | Final Trust |
|----------|-----------------|--------------------|--------------------|-------------------|------------|
| Community-Led | 0.0 | 100% | 0.0% | 10.0 | 50.0% |
| Player-Initiated | 0.6 | 74.1% | 12.7% | 8.4 | 46.3% |
| Mixed (50/50) | 0.0 | 100% | 1.4% | 9.2 | 50.0% |
| Aggressive Growth | 0.8 | 71.0% | 12.9% | 8.4 | 46.0% |
| With Land Trusts | 0.0 | 100% | 0.0% | 6.9 | 50.0% |
| Anti-Gentrif Policies | 0.0 | 100% | 0.3% | 10.1 | 50.0% |

### Key Findings

1. **Community-led mode completely prevents displacement**: 100% zero-displacement rate. The 50% gentrification reduction for community-led projects plus 2%/turn natural decay means pressure never accumulates.

2. **Player-initiated mode creates modest displacement**: Average 0.6 events per game, 74% zero-displacement. The 50% increase for player-initiated projects does create pressure, but the 2%/turn decay rate bleeds it off fast enough that crises are rare.

3. **The gentrification system is too mild**: Even Aggressive Growth only averages 0.8 displacement events per game with 71% zero-displacement. The 2%/turn natural decay is too strong -- it counteracts project pressure before tiles reach the 75% crisis threshold.

4. **Land trusts are powerful but slow**: They completely zero out gentrification on protected tiles, but at $1.2M cost they compete with other projects for budget.

5. **Mixed strategy avoids all displacement**: Any strategy that includes even 50% community-led projects avoids displacement entirely. The speed-vs-justice tension is toothless because the "just" path has no meaningful cost.

### Problems Identified

- **Natural decay is too fast**: 2%/turn decay means a tile needs 4+ project completions in rapid succession to reach 75%. This never happens in practice.
- **No meaningful displacement trade-off**: The game's central tension (speed vs justice) requires displacement to be a real risk. Currently it's avoidable by every strategy except pure player-initiated.
- **Gentrification pressure is purely local**: No city-wide effects from high-pressure neighborhoods. The 0.05% trust erosion per tile at 50%+ is invisible.

---

## Simulation 5: Endgame & Continental Goals

### Results Summary

| Scenario | Coop Win Rate | Goals at 100% | Goals at 50%+ | Watershed | Wildlife | Food Network | Buffalo Commons | Final Budget |
|----------|-------------|---------------|---------------|-----------|----------|-------------|----------------|-------------|
| No Regional Aid | 0% | 1.0 | 1.3 | 100% | 29.6% | 30.0% | 34.2% | $8.68M |
| Light Aid (~10%) | 0% | 1.0 | 2.0 | 100% | 41.0% | 48.5% | 40.1% | $2.94M |
| Moderate Aid (~20%) | 0% | 1.0 | 2.0 | 100% | 40.4% | 48.5% | 40.2% | $1.19M |
| Heavy Aid (~30%) | 0% | 1.0 | 2.0 | 100% | 40.0% | 49.1% | 40.0% | $0.57M |
| Cahokia + Moderate | 0% | 1.0 | 2.9 | 100% | 40.2% | 47.6% | 70.0% | $0.90M |
| Cahokia Early | 0% | 1.0 | 3.0 | 100% | 40.4% | 48.4% | 69.8% | $0.90M |

### Key Findings

1. **Cooperative win (2 goals at 100%) is impossible in 15 turns**: Only Watershed reaches 100%, because the player's eco (~80%) contributes (80-50) * 0.5 = 15%/turn, reaching 100% in ~7 turns. No other goal gets close to 100%.

2. **Watershed is trivially easy**: With player eco above 80%, the Watershed goal completes in under 10 turns regardless of regional aid. It provides no strategic tension.

3. **Wildlife and Food Network are stuck around 40-50%**: They need AI cities at restoration stage with high eco/food, which doesn't happen in 15 turns. AI cities progress too slowly (~0.5% eco/turn) to reach the thresholds that generate goal progress.

4. **Buffalo Commons requires Cahokia**: Without the Cahokia commitment (+2/turn), Buffalo Commons only reaches 34%. With it, 70%. But neither reaches 100%.

5. **The Cahokia Choice is net positive**: Committing 20% budget to regional goals costs ~$0.3M/year but pushes Buffalo Commons from 34% to 70%. The budget impact is manageable because the player has accumulated revenue sources by this point.

6. **More budget to regional goals doesn't help much**: Light (10%) and Heavy (30%) produce nearly identical goal progress. The bottleneck is AI city progression speed, not resource transfers.

### Problems Identified

- **AI cities are too slow**: Starting from Awakening at turn 50, most AI cities can't reach Transition in 15 turns, let alone Restoration.
- **Only Watershed has a viable player-contribution formula**: The player's 80%+ eco trivially completes Watershed. Other goals depend on AI cities that don't progress fast enough.
- **Cooperative win needs either (a) more turns in Beyond the Map, (b) faster AI city progression, (c) stronger player contribution formulas, or (d) lower completion thresholds** (50% instead of 100%).
- **The progression-system spec says "2 of 3 goals at 50%" in one place and "2 of 4 goals at 100%" in beyond-the-map spec.** The 50% threshold is achievable with Cahokia (Watershed + 2 others); the 100% threshold is not.

---

## The Golden Path: Each Specialization

### Ecology-First Golden Path

**Current problem**: Food sovereignty bottleneck delays Transition to turn 51. The path NEEDS food projects early but its priority list favors pure ecology.

**What a well-played Ecology-First game should look like**:
- Turns 1-8: Mix of food_forests and rain_gardens. Target 2-3 tiles to transition visual.
- Turns 9-16: Continue food_forests for food sovereignty growth. Pass Urban Ag Zoning.
- Turns 17-24: Transition happens around turn 20 if food_forests are prioritized early.
- Turns 25-40: Push ecology projects (wetlands, native planting). 12 tiles at transition+.
- Turns 41-64: Restoration and Beyond attempts.

**Recommended fix**: Lower ecology path food threshold from 35% to 25% (more aligned with an ecology-focused player who prioritizes eco over food).

### Community-First Golden Path (current best path)

**Turns 1-14**: Accept most leader proposals. Build food_forests and community_kitchens in community-led mode. Food reaches 35%+ by turn 12-14. 5+ community-led projects done. Trust at 65%+. **Transition at turn 15.**

**Turns 15-28**: Continue accepting proposals. Build toward 10 community-led projects. Eco reaches 50%+ through food_forests and rain_gardens. Food reaches 55%+. **Restoration at turn 28.**

**Turns 28-64**: Eco continues rising. Would need 25 restoration tiles for Beyond -- not achievable. Focus on building toward continental goals.

**Key insight**: The community path works because its gates check project counts rather than tile eco thresholds. This rewards consistent community engagement over geographic coverage.

### Policy-First Golden Path (needs fixes)

**Current problem**: Re-election failure at 98% rate. The path needs council and leader relationship management that the current AI model doesn't support.

**What it should look like**: Pass 4+ policies in the first 10 turns while maintaining Will above 55% and Trust above 40%. Use narrative actions to lobby council members and build leader relationships alongside policy work.

**Recommended fix**: (1) Policy path's player-initiated mode should not penalize leader trust as heavily. (2) Add a "policy alignment" leader trust bonus when enacted policies match leader priorities. (3) Council system needs to actually shift moderate members based on successful policy outcomes.

---

## Remaining Balance Issues (Prioritized)

### Critical

1. **Beyond the Map is unreachable**: The 25-tile restoration requirement is structurally impossible. Each tile needs 4-5 projects to reach 70% eco, and 25 tiles * 4 projects = 100 projects. At ~30 projects per game, this needs at minimum 3x current project throughput OR the threshold needs to drop to 15 tiles.

2. **Policy-First path is broken**: 2% survival rate makes it unplayable. Needs structural character system integration.

3. **Cooperative win impossible in 15 turns**: Needs either longer Beyond the Map stage, faster AI city progression, or lower goal thresholds (50% instead of 100%).

### High

4. **Ecology path Transition is 37 turns late**: Food threshold should drop from 35% to 25%, or food_forests should give +5% food instead of +3%.

5. **Council system is decorative**: Council dispositions don't change meaningfully. Moderates never convert. Council votes are predetermined by starting positions.

6. **Gentrification is too mild**: Natural decay of 2%/turn prevents displacement crises from ever occurring for community-inclusive strategies. Reduce to 1%/turn or increase base gentrification from 8% to 12%.

### Medium

7. **Trust caps too easily**: Trust reaches 99.7% by mid-game for any strategy with decent leader relationships. The 0.3%/turn decay is insufficient. Consider 0.5%/turn or adding a cap-resistance mechanic near 90%.

8. **No hostile leaders ever form**: The relationship decay system prevents anyone from reaching -50. The organized opposition mechanic is dead code.

9. **Aggressive Growth is completely nonviable**: 0% survival, 0% transitions. Consider adding a mechanical path that sacrifices community for speed -- currently it just fails at everything.

---

## Parameter Adjustment Recommendations

| Parameter | Current V2 | Recommended | Rationale |
|-----------|-----------|-------------|-----------|
| Ecology path food threshold (Awakening->Transition) | 35% | 25% | Ecology path focuses on eco, not food; 35% is unreasonable early |
| Restoration tile threshold (any path) | 25 tiles at 70% | 15 tiles at 70% | 25 tiles requires ~100 projects; 15 is achievable |
| Generalist Restoration tile threshold | 15 tiles at 40% | 12 tiles at 40% | Slightly more achievable |
| Gentrification natural decay | 2%/turn | 1%/turn | Make displacement a real risk |
| Base gentrification per project | 8% | 10% | Increase pressure to make speed-vs-justice meaningful |
| Trust passive decay | 0.3%/turn | 0.5%/turn | Prevent trivial 99% Trust cap |
| Food Forest food gain | +3% | +4% | Speed food growth to make ecology/degrowth paths viable |
| Continental goal completion threshold | 100% for cooperative win | 75% for cooperative win | Make cooperative win achievable in 15 turns |
| AI city base progression rate | 0.5/0.3/0.4% per turn | 1.0/0.6/0.8% per turn | Let AI cities reach Transition in the Beyond stage |
| Beyond the Map entry: Regional Collab | Required | Optional (but boosts goals) | Remove hard gate that blocks Beyond |
| Council moderate starting dispositions | +5 to +20 | +5 to +25 | Give moderates slightly more goodwill toward player |
| Policy path leader trust penalty | Same as all paths | -50% rejection penalty | Policy players reject proposals for strategic reasons, not malice |

---

## Overall Verdict: Is the Game Balanced Enough to Start Building?

**Yes, with caveats.** The V2 changes successfully fixed the V1 Political Will death spiral and project economy issues. The core gameplay loop (build projects, manage narrative, maintain relationships, pass re-elections) works for the Community-First and Balanced paths. The game has meaningful resource tension with budget scarcity.

**Before building, fix these 3 critical issues:**

1. **Lower the Beyond the Map tile threshold** from 25 to 15. This single change unblocks the entire endgame.
2. **Fix the Policy-First path** by integrating policy enactment with leader trust gains and making council members actually shift.
3. **Lower the cooperative win goal threshold** from 100% to 75% (or extend Beyond the Map by giving 20 turns instead of 15).

**The Community-First path can serve as the reference implementation.** It works end-to-end through Restoration with good pacing and meaningful choices. Build this path first, then iterate on the others.

---

## Files Generated

### Charts (13 total)
- `sim1_meter_trajectories.png` - All 6 meters over 64 turns by strategy
- `sim1_outcomes.png` - Survival rates, stage progression, re-election rates, final meters
- `sim1_characters_gentrif.png` - Gentrification, leader trust, council disposition, displacement
- `sim1_stage_progression.png` - Average stage over time by strategy
- `sim2_path_viability.png` - Stage timing distributions and target window achievement
- `sim2_path_meters.png` - Per-path meter trajectories
- `sim3_character_system.png` - Advocates, coalitions, council allies, re-election by acceptance rate
- `sim3_individual_chars.png` - Individual leader and council member trajectories
- `sim3_acceptance_metrics.png` - Summary metrics vs proposal acceptance rate
- `sim4_gentrification.png` - Gentrification pressure, peak tiles, displacement
- `sim4_tradeoffs.png` - Transformation speed vs displacement trade-off scatter
- `sim5_continental_goals.png` - Continental goal progress over endgame turns
- `sim5_endgame_outcomes.png` - Win rates, budget impact, final goal values

### Data (5 JSON files)
- `sim1_results.json` - Full playthrough numeric results
- `sim2_results.json` - Path viability results
- `sim3_results.json` - Character system results
- `sim4_results.json` - Gentrification results
- `sim5_results.json` - Endgame results

### Scripts (6 Python files)
- `game_engine.py` - Shared simulation engine (all game systems)
- `sim1_full_playthrough.py` - Full game simulation
- `sim2_specialization_paths.py` - Path viability simulation
- `sim3_character_system.py` - Character system stress test
- `sim4_gentrification.py` - Gentrification and displacement
- `sim5_endgame_continental.py` - Endgame and continental goals
