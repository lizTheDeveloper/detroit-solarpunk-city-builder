## ADDED Requirements

### Requirement: Speed vs. justice transformation modes
Every project SHALL have two execution modes: Player-Initiated (top-down) and Community-Led. The player chooses the mode when starting a project. This choice is the game's central recurring dilemma: move fast to beat climate pressure, or slow down to build genuine community power.

#### Scenario: Player-initiated project (top-down mode)
- **WHEN** the player starts a project in Player-Initiated mode
- **THEN** the project costs 100% of base budget, takes 100% of base duration, Community Trust gain on completion is reduced by 40% (compared to Community-Led), and gentrification_pressure increase is 50% higher than base (e.g., base 8% becomes 12%)

#### Scenario: Community-led project
- **WHEN** the player starts a project in Community-Led mode
- **THEN** the project costs 130% of base budget (community process is resource-intensive), takes 150% of base duration (rounded up, minimum +1 turn), Community Trust gain on completion is increased by 60%, gentrification_pressure increase is reduced by 50% (e.g., base 8% becomes 4%), and the tile gains a "Community Ownership" modifier that halves future gentrification increases

#### Scenario: Community-led projects require minimum trust
- **WHEN** the player attempts to start a Community-Led project in a neighborhood where Community Trust is below 30%
- **THEN** the system blocks the project and displays: "Community trust too low for community-led process. Build relationships first through narrative actions or choose player-initiated mode."

#### Scenario: Community-led projects unlock neighborhood bonuses
- **WHEN** a Community-Led project completes
- **THEN** the neighborhood gains a "Community Power" token. Accumulating 3 Community Power tokens in a neighborhood unlocks a unique neighborhood-specific bonus project proposed by community leaders (not available through player-initiated mode)

#### Scenario: Speed pressure from climate
- **WHEN** Climate Pressure is above 70%
- **THEN** climate events become more frequent (1 per turn guaranteed) and more severe, creating pressure to use faster Player-Initiated mode even though it erodes trust, embodying the speed-vs-justice tension

### Requirement: Community-proposed projects
Community leaders SHALL propose projects based on neighborhood needs, Community Trust level, and game state. These proposals represent what the community actually wants, which may conflict with the player's strategic priorities.

#### Scenario: Community proposal appears
- **WHEN** Community Trust in a neighborhood reaches 40% or higher
- **THEN** a community leader from that neighborhood proposes a project at the start of the next turn. The proposal appears in the event phase with the leader's name, reasoning, and the specific project.

#### Scenario: Accepting a community proposal
- **WHEN** the player accepts a community-proposed project
- **THEN** the project starts in Community-Led mode at 80% of normal Community-Led cost (community is already organized), Community Trust in that neighborhood increases by 5% immediately, and Political Will increases by 3%

#### Scenario: Rejecting a community proposal
- **WHEN** the player rejects a community-proposed project
- **THEN** Community Trust in that neighborhood drops by 8%, a "Community Frustration" narrative event fires ("Mayor ignores neighborhood voices"), and if 3 community proposals from the same neighborhood are rejected consecutively, that neighborhood's Community Trust drops by 20% and a "Community Opposition" modifier activates (all future projects in that neighborhood cost 25% more and take +1 turn)

#### Scenario: Community proposal conflicts with player strategy
- **WHEN** a community leader proposes a Community Kitchen project in a neighborhood where the player planned a Solar Grid
- **THEN** the player must choose: accept the community's priority (building trust but delaying their infrastructure plan) or reject it (advancing their strategy but damaging trust). Both the proposal and the player's queued project are shown side-by-side with trade-off comparison.

### Requirement: Growth vs. de-growth tension
Projects SHALL be categorized as either Growth (revenue-generating, density-increasing) or De-growth (ecology-restoring, revenue-neutral or revenue-negative). The game's budget system creates pressure toward Growth projects, while the game's win conditions and theme push toward De-growth.

#### Scenario: Growth project generates revenue
- **WHEN** a Growth project completes (Solar Grid, Maker Space, Green Manufacturing, Cooperative Business)
- **THEN** the project generates ongoing budget revenue: Solar Grid +$150K/year, Maker Space +$80K/year, Green Manufacturing +$300K/year, Cooperative Business +$120K/year. But the tile's commercial activity increases, gentrification_pressure increases by an additional 5%, and Ecological Health gain is capped at +10% for that tile.

#### Scenario: De-growth project costs ongoing budget
- **WHEN** a De-growth project completes (Wetland Restoration, Native Planting, Rewilding, Depaving)
- **THEN** the project provides no revenue and costs $50K-$150K/year in ongoing maintenance. But Ecological Health gain is uncapped, gentrification_pressure decreases by 5%, and the tile contributes to Wildlife Corridor and continental goals.

#### Scenario: Budget pressure toward growth
- **WHEN** the city budget drops below $1M
- **THEN** an "Austerity Pressure" event fires, the city council demands revenue-generating projects, and any De-growth project started while budget is below $1M requires 20% more Political Will to begin

#### Scenario: Stage 3 requires de-growth shift
- **WHEN** the game enters Restoration stage
- **THEN** the Restoration stage transition conditions require at least 8 tiles with De-growth projects AND Ecological Health >= 60%. Growth-only strategies cannot reach Restoration. A "Recognize the Costs" milestone event fires, echoing the Cahokia theme: the player must confront that revenue-generating transformation alone is insufficient.

#### Scenario: De-growth budget crisis
- **WHEN** the player has 5 or more active De-growth projects AND budget is below $2M
- **THEN** a "De-growth Budget Crisis" event fires, offering the player a choice: (A) accept federal green infrastructure grants ($2M, but with federal oversight that reduces Political Will by 10%), (B) launch a community fundraising campaign ($800K, requires Community Trust > 60%, takes 2 turns), or (C) convert one De-growth project to a mixed-use Growth/De-growth hybrid (50% ecological benefit, but generates $100K/year)

### Requirement: Local vs. regional tension
Starting in Transition stage, the player SHALL face choices between investing locally and contributing to regional goals. Resources spent regionally reduce local capacity but are required for the cooperative endgame win condition.

#### Scenario: Regional project request appears
- **WHEN** the game is in Transition stage or later AND a turn begins
- **THEN** there is a 25% chance per turn that a regional cooperation request appears: another Great Lakes city asks for help (resources, expertise, project templates). The request specifies a cost ($200K-$500K from budget) and what it contributes to (a continental goal).

#### Scenario: Accepting regional request
- **WHEN** the player accepts a regional cooperation request
- **THEN** the specified budget cost is deducted, no local project benefits occur, but regional goal progress increases by 5-15% and a "Regional Solidarity" modifier activates (+3% Political Will for 4 turns, as the city gains national attention)

#### Scenario: Rejecting regional request
- **WHEN** the player rejects a regional cooperation request
- **THEN** no local cost occurs, but regional goal progress stalls, a "Regional Isolation" modifier may activate (if 3+ requests rejected: -5% Political Will as the city appears insular), and the cooperative win condition becomes harder to reach

#### Scenario: Community leaders want local focus
- **WHEN** the player accepts a regional cooperation request AND Community Trust is below 60%
- **THEN** Community Trust drops by 5% and a community leader event fires: "Our neighborhoods still need help. Why are we sending resources to Cleveland when Brightmoor doesn't have clean water?"

#### Scenario: Cahokia moment - choosing the bigger picture
- **WHEN** the game reaches Beyond the Map stage
- **THEN** a major narrative event fires: "The Cahokia Choice." The player is presented with the historical parallel: a great city that recognized its impact on the wider region and chose to reorganize. The player must commit 20% of their annual budget to regional goals permanently. Refusing blocks the cooperative win condition. Accepting triggers the "Reorganization" modifier: local project costs increase by 15% but all continental goals receive ongoing progress.

### Requirement: Political compromise system
Policies SHALL have two versions: Full-Strength and Compromised. The player chooses which version to push through the city council. This creates a trade-off between political capital and policy effectiveness.

#### Scenario: Full-strength policy attempt
- **WHEN** the player proposes a full-strength version of a policy (e.g., full Rent Stabilization)
- **THEN** the policy requires 70% council support (higher threshold), costs 15% Political Will to push, has 100% of its stated effect, and if it fails the council vote, Political Will drops by 8% and the policy cannot be re-proposed for 4 turns

#### Scenario: Compromised policy attempt
- **WHEN** the player proposes a compromised version of a policy (e.g., limited Rent Stabilization)
- **THEN** the policy requires only 40% council support (lower threshold), costs 5% Political Will to push, has 50% of its stated effect, and may have an unintended side effect (specified per policy)

#### Scenario: Rent Stabilization compromise side effect
- **WHEN** the player enacts Compromised Rent Stabilization
- **THEN** the policy reduces gentrification pressure increases by 20% (instead of 40% for full-strength) BUT the compromise includes a loophole: new construction is exempt, meaning Growth projects on tiles covered by the policy still generate full gentrification pressure. The compromise helps existing residents but does nothing about new development.

#### Scenario: Land Trust policy compromise side effect
- **WHEN** the player enacts Compromised Community Land Trust policy
- **THEN** the policy enables Community Land Trust projects at 25% cost reduction (instead of 50% for full-strength) BUT the compromise limits eligible neighborhoods to those with vacancy > 50%, excluding the neighborhoods that most need anti-gentrification protection

#### Scenario: Green Jobs Transition compromise side effect
- **WHEN** the player enacts Compromised Green Jobs Transition policy
- **THEN** the policy provides job retraining at 50% effectiveness (fewer workers transitioned) AND the compromise includes a 2-year sunset clause: the policy automatically expires after 8 turns and must be re-enacted, costing Political Will again

#### Scenario: Stacking compromises erodes trust
- **WHEN** the player has 3 or more active compromised policies and 0 full-strength policies
- **THEN** a "Half-Measures" narrative event fires, Community Trust drops by 5% city-wide, and community leaders publicly question the mayor's commitment. The event text reads: "Another watered-down policy. At what point does compromise become complicity?"

### Requirement: Specialization paths for stage transitions
Stage transitions SHALL allow multiple paths based on the player's strategic focus, replacing the requirement that ALL meters hit thresholds simultaneously. Each path emphasizes different meters and unlocks different stage-specific content.

#### Scenario: Ecology-first path - Awakening to Transition
- **WHEN** Ecological Health >= 45% AND Food Sovereignty >= 25% AND at least 6 tiles have ecology or food projects completed AND Community Trust >= 35%
- **THEN** the stage transitions to Transition via the Ecology-First path. A "Green Awakening" milestone event fires. Transition stage unlocks ecology-focused content: advanced restoration projects, ecological corridor planning, and bioregional survey projects. Community and policy projects in Transition cost 15% more (the community hasn't fully bought in yet).

#### Scenario: Community-first path - Awakening to Transition
- **WHEN** Community Trust >= 65% AND Food Sovereignty >= 35% AND at least 5 community-led projects completed AND Ecological Health >= 20%
- **THEN** the stage transitions to Transition via the Community-First path. A "People's Transition" milestone event fires. Transition stage unlocks community-focused content: cooperative networks, mutual aid systems, community land trusts, and neighborhood assemblies. Ecology projects in Transition gain +10% effectiveness (community support accelerates ecological work).

#### Scenario: Policy-first path - Awakening to Transition
- **WHEN** at least 4 policies enacted (any combination of full-strength and compromised) AND Political Will >= 55% AND Ecological Health >= 25% AND Community Trust >= 40%
- **THEN** the stage transitions to Transition via the Policy-First path. An "Institutional Shift" milestone event fires. Transition stage unlocks policy-focused content: zoning reform, municipal enterprise, public banking, and regional coordination frameworks. Project costs in Transition are reduced by 10% (institutional support) but community-led projects take +1 turn (bureaucratic process).

#### Scenario: Policy-first path reduces rejection penalty
- **WHEN** the player is on the Policy-First path and rejects a community leader proposal
- **THEN** the leader trust penalty from rejection is reduced by 50% (e.g., -15 becomes -7.5, rounded to -8). Policy-focused players reject proposals for strategic alignment reasons, not malice, and the community recognizes the player's institutional investment. Additionally, when an enacted policy directly matches a community leader's priority issues, that leader gains +5 trust (the policy delivered what they wanted through institutional channels rather than direct projects).

#### Scenario: Ecology-first path - Transition to Restoration
- **WHEN** path is Ecology-First AND Ecological Health >= 70% AND Food Sovereignty >= 55% AND at least 12 tiles are at transition-stage or higher AND at least 2 wildlife corridor segments established
- **THEN** the stage transitions to Restoration via Ecology-First path. Late-game strength: ecology and restoration projects cost 20% less. Late-game weakness: community organizing projects cost 25% more and take +1 turn.

#### Scenario: Community-first path - Transition to Restoration
- **WHEN** path is Community-First AND Community Trust >= 80% AND Ecological Health >= 50% AND Food Sovereignty >= 55% AND at least 10 tiles have community-led projects
- **THEN** the stage transitions to Restoration via Community-First path. Late-game strength: all community-led projects cost 25% less and Community Trust cannot drop below 40% (deep roots). Late-game weakness: policy enactment requires 15% more Political Will (grassroots movement is skeptical of institutional power).

#### Scenario: Policy-first path - Transition to Restoration
- **WHEN** path is Policy-First AND at least 7 policies enacted AND Political Will >= 60% AND Ecological Health >= 50% AND at least 10 tiles at transition-stage or higher
- **THEN** the stage transitions to Restoration via Policy-First path. Late-game strength: policies cost 30% less Political Will and compromised policies have 65% effectiveness (instead of 50%). Late-game weakness: gentrification pressure increases 20% faster (institutional change without community roots invites speculative development).

#### Scenario: Path convergence in Beyond the Map
- **WHEN** the game reaches Beyond the Map stage (any path)
- **THEN** all three paths converge mechanically (all content unlocked) but the player retains their path-specific strengths and weaknesses. The endgame tests whether the player can compensate for their path's weakness while leveraging its strength.

#### Scenario: Path identity displayed in UI
- **WHEN** the player triggers a stage transition via a specific path
- **THEN** the UI displays the path name and icon (leaf for Ecology-First, raised fist for Community-First, gavel for Policy-First) in the progression bar, and the path name appears in save files for replayability tracking

### Requirement: Tension dashboard
The UI SHALL display an active tensions panel showing the player's current dilemmas and their consequences. This makes trade-offs visible and legible rather than hidden in system interactions.

#### Scenario: Speed vs. justice indicator
- **WHEN** the player views the tension dashboard
- **THEN** the dashboard shows a slider visualization between "Moving Fast" and "Building Power" based on the ratio of Player-Initiated to Community-Led projects in the last 8 turns. If ratio is > 2:1 toward Player-Initiated, a warning displays: "You're moving fast but not building lasting community power."

#### Scenario: Growth vs. de-growth indicator
- **WHEN** the player views the tension dashboard
- **THEN** the dashboard shows the ratio of Growth to De-growth projects completed, current annual revenue vs. maintenance costs, and a projection of budget trajectory for the next 4 turns. If De-growth maintenance costs exceed 40% of annual revenue, a warning displays: "Ecological restoration is straining the budget."

#### Scenario: Local vs. regional indicator
- **WHEN** the game is in Transition stage or later
- **THEN** the tension dashboard shows percentage of budget spent locally vs. regionally over the last 4 turns, regional goal progress, and whether the cooperative win condition is on track. If regional spending is 0% for 4+ turns, a warning displays: "Detroit is thriving, but the region needs solidarity."

#### Scenario: Gentrification hotspot indicator
- **WHEN** any tile has gentrification_pressure above 50%
- **THEN** the tension dashboard highlights the neighborhood with a red indicator, shows displacement risk level, and lists available anti-gentrification measures the player could take
