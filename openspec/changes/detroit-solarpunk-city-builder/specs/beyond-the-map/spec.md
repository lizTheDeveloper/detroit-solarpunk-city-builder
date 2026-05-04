## ADDED Requirements

### Requirement: Regional view activation
When the player reaches the Beyond the Map stage, the UI SHALL add a regional view showing the Great Lakes bioregion as a node-and-connection map. The player can toggle between the local Detroit map and the regional view.

#### Scenario: Regional view unlocks
- **WHEN** the game transitions to Beyond the Map stage
- **THEN** a "Regional View" toggle button appears in the top navigation bar, a cinematic transition zooms out from Detroit to show the Great Lakes bioregion, and a tutorial overlay explains the new regional mechanics

#### Scenario: Toggle between views
- **WHEN** the player clicks the Regional View toggle
- **THEN** the display switches between the detailed Detroit tile map (local view) and the Great Lakes regional map (regional view). All local actions (projects, policies, narrative) are only available in local view. Regional actions (send resources, propose regional projects, coordinate corridors) are only available in regional view.

#### Scenario: Regional view layout
- **WHEN** the regional view is displayed
- **THEN** it shows a stylized map of the Great Lakes region with city nodes at: Detroit (player-controlled, highlighted), Ann Arbor (55 miles west), Toledo (60 miles south), Cleveland (170 miles east), Chicago (280 miles west), Milwaukee (370 miles northwest), Windsor/Ontario (across river), Flint (70 miles north), Lansing (90 miles northwest), and Grand Rapids (150 miles west). Connection lines between cities show potential corridor routes and active collaborations.

### Requirement: AI-controlled regional cities
Each non-player city in the regional view SHALL have its own simulated transformation progress, updated each turn. These cities transform slowly and independently, but player assistance accelerates them.

#### Scenario: City node properties
- **WHEN** the player inspects a regional city node
- **THEN** the node displays: city name, population, transformation stage (Awakening/Transition/Restoration/Beyond), Ecological Health (0-100%), Food Sovereignty (0-100%), Community Trust (0-100%), active projects summary (count by type), relationship with Detroit (Neutral/Cooperative/Allied), and what resources/help the city needs

#### Scenario: AI city progression rate
- **WHEN** a turn resolves in Beyond the Map stage
- **THEN** each AI city's meters change by a base rate: Ecological Health +1.0% per turn, Food Sovereignty +0.6% per turn, Community Trust +0.8% per turn. These rates are modified by: the city's current stage (+50% in Transition, +100% in Restoration), whether Detroit has sent resources (+25% per active resource transfer), and random events (-5% to -15% for climate disasters, -3% to -8% for political setbacks). AI cities do NOT progress to the next stage until their meters meet the same thresholds as the player (but using only the generalist path: all meters at threshold simultaneously).

#### Scenario: AI city starting states
- **WHEN** the game enters Beyond the Map stage
- **THEN** regional cities start at the following states:
  - Ann Arbor: Transition stage, Eco 45%, Food 30%, Trust 55% (progressive college town, ahead on policy)
  - Toledo: Awakening stage, Eco 20%, Food 15%, Trust 35% (industrial legacy, slower start)
  - Cleveland: Awakening stage, Eco 25%, Food 20%, Trust 40% (similar to Detroit's early journey)
  - Chicago: Transition stage, Eco 35%, Food 25%, Trust 30% (large city, low trust despite progress)
  - Milwaukee: Awakening stage, Eco 30%, Food 25%, Trust 45% (strong community base)
  - Windsor: Transition stage, Eco 40%, Food 35%, Trust 50% (Canadian policy advantages)
  - Flint: Awakening stage, Eco 15%, Food 10%, Trust 25% (water crisis legacy, needs most help)
  - Lansing: Awakening stage, Eco 25%, Food 20%, Trust 40% (state capital, policy potential)
  - Grand Rapids: Transition stage, Eco 35%, Food 30%, Trust 50% (furniture industry pivot)

#### Scenario: AI city climate vulnerability
- **WHEN** Climate Pressure exceeds 85% (global)
- **THEN** AI cities in Awakening stage have a 15% chance per turn of suffering a climate catastrophe that resets their Ecological Health by -20% and Community Trust by -10%. Cities in Transition have a 5% chance. Cities in Restoration or Beyond are resilient (0% chance). This creates urgency to help vulnerable cities progress.

### Requirement: Resource transfer to regional cities
The player SHALL be able to send budget, project templates, and expertise to other regional cities. Each transfer has a local cost and a regional benefit.

#### Scenario: Send budget to another city
- **WHEN** the player sends budget to a regional city
- **THEN** the player can choose an amount: Small ($200K, +5% target city meter boost), Medium ($500K, +10% boost), or Large ($1M, +20% boost). The budget is deducted from Detroit immediately. The target city's lowest meter receives the boost. Detroit gains +2% Political Will (regional leadership recognition) per transfer.

#### Scenario: Send project template
- **WHEN** the player sends a completed project as a template to a regional city
- **THEN** the target city gains a copy of that project type at 50% reduced cost and 25% reduced duration. Detroit gains no direct benefit but the target city's transformation accelerates. The template costs Detroit $100K (documentation and knowledge transfer). A city can only receive each template once.

#### Scenario: Send expertise (advisors)
- **WHEN** the player sends expertise to a regional city
- **THEN** Detroit's concurrent project limit decreases by 1 for 4 turns (advisors are away), but the target city's transformation rate doubles for those 4 turns. When advisors return, Detroit gains a "Regional Knowledge" bonus: +5% effectiveness on the same project type for 8 turns.

#### Scenario: Transfer limit per turn
- **WHEN** the player attempts to send resources to regional cities
- **THEN** the player may make a maximum of 2 resource transfers per turn. Each transfer is processed during the Resolve phase.

### Requirement: Regional project proposals
The player SHALL be able to propose regional projects that require cooperation from multiple cities. Regional projects contribute to continental goals and provide shared benefits.

#### Scenario: Propose a regional project
- **WHEN** the player opens the regional project menu
- **THEN** the system displays available regional projects filtered by: the player's current stage, which continental goals are active, and which cities have Cooperative or Allied relationship status. Each regional project shows: required participating cities (minimum count), cost per city, duration in turns, and which continental goal it advances.

#### Scenario: Regional project acceptance
- **WHEN** the player proposes a regional project
- **THEN** each required AI city evaluates the proposal based on: their relationship with Detroit (Allied: 85% accept, Cooperative: 60% accept, Neutral: 30% accept), their current budget (reject if budget < cost), and their strategic priorities (reject if the project doesn't align with their lowest meter). The result is displayed next turn.

#### Scenario: Regional project types
- **WHEN** the regional project menu is opened
- **THEN** available regional projects include:
  - Great Lakes Water Monitoring Network: 3+ cities, $300K each, 6 turns, advances Watershed Restoration goal by 15%
  - Interstate Wildlife Corridor Segment: 2 adjacent cities, $500K each, 8 turns, advances Wildlife Corridor goal by 10% per segment
  - Regional Seed Bank: 4+ cities with Food Sov > 50%, $200K each, 4 turns, advances Food Sovereignty Network goal by 20%
  - Bioregional Climate Adaptation Plan: 5+ cities, $400K each, 10 turns, reduces climate event severity by 25% for all participating cities
  - Great Lakes Fishery Restoration: 3+ lakefront cities, $600K each, 12 turns, advances Watershed Restoration goal by 20%
  - Regional Transit Corridor: 2 adjacent cities, $800K each, 10 turns, enables resource transfers at 50% reduced cost between connected cities
  - Indigenous Land Return Initiative: any 2+ cities, $300K each, 6 turns, advances all continental goals by 5%, increases Community Trust by 8% in participating cities

### Requirement: City relationship system
The player's relationship with each regional city SHALL progress through three tiers: Neutral, Cooperative, and Allied. Relationship tier affects regional project acceptance rates and unlocks shared benefits.

#### Scenario: Relationship starts at Neutral
- **WHEN** the game enters Beyond the Map stage
- **THEN** all regional cities start at Neutral relationship with Detroit (except Ann Arbor which starts at Cooperative due to geographic and institutional proximity)

#### Scenario: Building relationship to Cooperative
- **WHEN** the player has sent 3 or more resource transfers to a city AND that city's lowest meter has improved by at least 10% since Beyond the Map began
- **THEN** the relationship upgrades to Cooperative. A "Partnership Established" event fires. The city now accepts regional project proposals at 60% rate and shares intelligence about their transformation progress (detailed meter breakdowns visible).

#### Scenario: Building relationship to Allied
- **WHEN** the player has completed 2 or more regional projects with a Cooperative city AND the city has reached Transition stage or higher
- **THEN** the relationship upgrades to Allied. An "Alliance Forged" event fires. The city now accepts regional project proposals at 85% rate, resource transfers to this city cost 25% less, and the city may independently propose regional projects to Detroit (player can accept/reject).

#### Scenario: Relationship degradation
- **WHEN** the player rejects 3 consecutive requests or proposals from a regional city
- **THEN** the relationship degrades by one tier (Allied -> Cooperative, Cooperative -> Neutral). A "Strained Relations" event fires. Rebuilding requires 2 additional resource transfers beyond normal thresholds.

### Requirement: Continental goal - Great Lakes Watershed Restoration
The Great Lakes Watershed Restoration goal SHALL track collective progress toward restoring the Great Lakes watershed ecosystem. Completion requires sustained multi-city cooperation on water-related projects.

#### Scenario: Watershed goal tracking
- **WHEN** the player views continental goals
- **THEN** the Watershed Restoration goal displays: current progress (0-100%), contributing cities (list), required conditions (3+ cities at Restoration stage with water projects connected via regional projects), progress rate per turn, and estimated turns to completion

#### Scenario: Watershed goal progress sources
- **WHEN** a turn resolves
- **THEN** Watershed Restoration progress increases by:
  - +1% per city at Restoration stage or higher with Ecological Health > 70%
  - +2% per completed Great Lakes Water Monitoring Network project
  - +3% per completed Great Lakes Fishery Restoration project
  - +0.5% per Detroit tile with a water-adjacent ecology project at restoration-stage visual
  - -1% per AI city that suffers a climate catastrophe affecting water systems

#### Scenario: Watershed goal completion
- **WHEN** Watershed Restoration progress reaches 100%
- **THEN** a "Watershed Restored" cinematic event fires showing the Great Lakes ecosystem recovering, all participating cities gain +15% Ecological Health permanently, climate event severity is reduced by 15% region-wide, and the goal counts as 1 of 2 required for cooperative win

### Requirement: Continental goal - Wildlife Corridor
The Wildlife Corridor goal SHALL track the establishment of a connected chain of restored ecological tiles across multiple cities in the region, enabling wildlife migration and ecosystem connectivity.

#### Scenario: Wildlife Corridor goal tracking
- **WHEN** the player views continental goals
- **THEN** the Wildlife Corridor goal displays: current progress (0-100%), connected corridor segments (visual map overlay showing chain), gaps in the corridor that need filling, which cities need to contribute segments, and species that would benefit (displayed as flavor text: "Eastern box turtle migration route," "Monarch butterfly waystation chain")

#### Scenario: Wildlife Corridor progress sources
- **WHEN** a turn resolves
- **THEN** Wildlife Corridor progress increases by:
  - +3% per completed Interstate Wildlife Corridor Segment regional project
  - +1% per Detroit tile with "Wildlife Corridor" adjacency tag (from 4+ connected ecology tiles locally)
  - +2% per AI city that reaches Restoration stage with Ecological Health > 65%
  - +1% per completed Indigenous Land Return Initiative (traditional ecological knowledge)
  - -2% per AI city climate catastrophe that destroys ecological infrastructure

#### Scenario: Wildlife Corridor completion
- **WHEN** Wildlife Corridor progress reaches 100%
- **THEN** a "Corridor Connected" cinematic event fires showing wildlife returning to the region (deer in Detroit, herons along the river, monarchs in restored prairies), all participating cities gain +10% Ecological Health permanently, Food Sovereignty gains +5% in all corridor cities (pollination boost), and the goal counts as 1 of 2 required for cooperative win

### Requirement: Continental goal - Food Sovereignty Network
The Food Sovereignty Network goal SHALL track the creation of a regional food system independent of industrial agriculture, built on connected local food production across multiple cities.

#### Scenario: Food Sovereignty Network goal tracking
- **WHEN** the player views continental goals
- **THEN** the Food Sovereignty Network goal displays: current progress (0-100%), participating cities with Food Sovereignty > 50% (highlighted), shared seed bank status, food exchange routes between cities, and estimated regional food independence percentage

#### Scenario: Food Sovereignty Network progress sources
- **WHEN** a turn resolves
- **THEN** Food Sovereignty Network progress increases by:
  - +2% per city with Food Sovereignty > 60% (including Detroit)
  - +3% per completed Regional Seed Bank project
  - +1% per Detroit tile with "Food Corridor" adjacency tag (from adjacent food projects)
  - +1% per AI city that transitions from Awakening to Transition with food-focused projects
  - -1% per turn that Detroit's Food Sovereignty drops below 60% (network anchor weakening)

#### Scenario: Food Sovereignty Network completion
- **WHEN** Food Sovereignty Network progress reaches 100%
- **THEN** a "Food Free" cinematic event fires showing the regional food network in action (seed exchanges, harvest festivals, food trains between cities), all participating cities gain +10% Food Sovereignty permanently, Budget gains +$300K/year for Detroit (reduced food import costs), Community Trust gains +5% region-wide, and the goal counts as 1 of 2 required for cooperative win

### Requirement: Continental goal - Buffalo Commons
The Buffalo Commons goal SHALL represent the ultimate aspiration: demonstrating that de-urbanization and ecological restoration at continental scale is possible. This is the hardest goal, requiring the most sacrifice and the longest commitment.

#### Scenario: Buffalo Commons goal tracking
- **WHEN** the player views continental goals
- **THEN** the Buffalo Commons goal displays: current progress (0-100%), a map showing the Great Plains region with restoration progress, Detroit's contribution (as a model city), required conditions (all 4 continental goals at 50%+ OR this goal at 100% independently), and a historical note about the original Buffalo Commons proposal

#### Scenario: Buffalo Commons progress sources
- **WHEN** a turn resolves
- **THEN** Buffalo Commons progress increases by:
  - +1% per turn that Detroit has 20+ tiles at restoration-stage or higher
  - +2% per turn that Detroit commits 20%+ of budget to regional goals (Cahokia commitment active)
  - +1% per Allied relationship with a regional city
  - +1% per other continental goal at 50%+ progress
  - +3% per completed Indigenous Land Return Initiative
  - +0.5% per De-growth project completed in Detroit (demonstrating the model)
  - -3% if Detroit's Ecological Health drops below 70% (the model fails)

#### Scenario: Buffalo Commons completion
- **WHEN** Buffalo Commons progress reaches 100%
- **THEN** a "The Great Return" cinematic event fires, the longest and most dramatic in the game: showing buffalo herds on restored prairie, Detroit as a green jewel in the Great Lakes, a continental map of restored ecosystems, and a closing meditation on Cahokia -- a civilization that chose to reorganize. All meters receive +20% permanently. The goal counts as 1 of 2 required for cooperative win. If this is the 2nd goal completed, the cooperative win triggers immediately.

### Requirement: Win conditions
The game SHALL have three possible endings: cooperative win (the "real" ending), survival win, and loss. The cooperative win fulfills the Cahokia theme of being part of something larger than one city.

#### Scenario: Cooperative win condition
- **WHEN** 2 of the 4 continental goals reach 75%
- **THEN** the cooperative win triggers. A "Beyond the Map" cinematic plays showing Detroit's transformation rippling outward across the continent. The game displays: total turns played, path taken (Ecology/Community/Policy-First), continental goals completed, neighborhoods transformed, communities displaced vs. protected, and a final score. After the cinematic, the game continues in sandbox mode.

#### Scenario: Survival win condition
- **WHEN** the player completes 80 turns (20 years of in-game time) with all meters above 50%
- **THEN** the survival win triggers. A "Detroit Endures" cinematic plays showing a transformed but isolated city -- thriving locally but the region around it still struggles. The game displays the same stats as cooperative win but with commentary noting that the city succeeded alone, echoing the limits of individual action. The tone is bittersweet: "Detroit is beautiful. But the lakes are still dying. The corridor is still broken. One city was never going to be enough." After the cinematic, the game continues in sandbox mode.

#### Scenario: Loss condition - re-election failure
- **WHEN** turn 16, 32, 48, or 64 arrives (every 4 years / 16 turns) AND Community Trust is below 25% OR Political Will is below 15%
- **THEN** the player loses re-election. A "Voted Out" cinematic plays showing the city reverting to conventional governance. The game displays: what was accomplished, what was lost, which neighborhoods were displaced, and an invitation to try again with a different path.

#### Scenario: Loss condition - budget collapse
- **WHEN** budget reaches $0 AND no recovery event resolves within 2 turns
- **THEN** a "Fiscal Emergency" triggers. The state appoints an emergency manager (referencing Detroit's real 2013 experience). The game displays the consequences and ends. The player is invited to try again.

#### Scenario: Loss condition - climate catastrophe
- **WHEN** Climate Pressure reaches 100% AND fewer than 15 tiles have ecological adaptation (restoration-stage or higher)
- **THEN** a "Climate Collapse" event triggers: catastrophic flooding, heat death, infrastructure failure. The game ends with a somber cinematic about what could have been. The player is invited to try again with the lesson: "You cannot out-build the climate. The region needed you."

### Requirement: Endgame tension mechanics
During Beyond the Map stage, the game SHALL increase pressure on the player through escalating climate events, resource demands from the region, and dramatic narrative events that test the player's commitment to their path.

#### Scenario: Climate pressure in endgame
- **WHEN** the game is in Beyond the Map stage
- **THEN** Climate Pressure is between 85-100% and increases by 1.5% per turn (instead of the normal rate). Climate events fire every turn (guaranteed) and have severe effects: floods affect 2-3 tiles simultaneously, heat waves last 2 turns, storms can damage completed projects (reducing their effectiveness by 25% until repaired at 50% of original cost).

#### Scenario: Climate refugee events
- **WHEN** an AI city suffers a climate catastrophe AND that city's Community Trust is below 30%
- **THEN** a "Climate Refugees" event fires in Detroit. 10,000-50,000 people arrive. The player must choose: (A) welcome refugees (Budget -$500K, gentrification_pressure +10% on 3 tiles, but Community Trust +8% and Political Will +5% nationally), (B) provide limited support (Budget -$200K, gentrification_pressure +5% on 2 tiles, Community Trust -3%), or (C) redirect to other cities (no local cost, Community Trust -10%, Political Will -8%, relationship with source city degrades)

#### Scenario: Federal intervention event
- **WHEN** the game is in Beyond the Map stage AND Detroit's Ecological Health is above 75%
- **THEN** a "Federal Green New Deal" event has a 20% chance of firing each turn. If it fires, the player chooses: (A) accept federal partnership ($3M grant, +10% to all continental goals, but federal oversight requires approval for projects over $500K for 8 turns -- losing some autonomy), (B) decline and maintain independence (no funding, Community Trust +5% from self-determination narrative, but missed acceleration toward cooperative win)

#### Scenario: Sacrifice mechanic
- **WHEN** a continental goal is within 10% of completion AND a regional city is in crisis (any meter below 20%)
- **THEN** a "The Sacrifice" event fires. The player is asked to divert a major completed project's benefits to the struggling city. Accepting: Detroit loses the project's ongoing meter benefits for 8 turns, the regional city stabilizes, and the continental goal gains +10% progress. Refusing: no local cost, but the continental goal stalls and the regional city may collapse (removed from goal calculations).

#### Scenario: The final push
- **WHEN** any continental goal is at 90%+ progress
- **THEN** a "Final Push" event fires offering a dramatic choice: commit $2M and 3 concurrent project slots for 4 turns to push the goal to completion quickly, OR let it complete naturally over approximately 10 more turns (risking climate events that could set it back). The aggressive option strains Detroit's local capacity severely but ensures completion.

### Requirement: Sandbox mode after win
After any win condition is met, the game SHALL continue in sandbox mode with reduced pressure, allowing the player to explore, complete remaining goals, or simply enjoy the transformed city and region.

#### Scenario: Sandbox mode activation
- **WHEN** a win condition is achieved
- **THEN** Climate Pressure stops increasing (locked at current value), re-election checks are suspended, budget receives a +$1M/year "stability bonus," and a "Sandbox Mode" indicator appears in the UI. All remaining continental goals are still trackable and completable. The player can continue playing indefinitely.

#### Scenario: Sandbox mode exploration
- **WHEN** the player is in sandbox mode
- **THEN** the player can: complete remaining continental goals for achievement credit, transform remaining untransformed tiles, experiment with different project combinations, view a comprehensive statistics dashboard showing the full history of their playthrough (meters over time, choices made, neighborhoods transformed, communities affected), and toggle a "time-lapse" view that replays the city's transformation from turn 1 to present.

### Requirement: Endgame scoring and reflection
Upon any game ending (win or loss), the system SHALL present a detailed reflection screen that surfaces the consequences of the player's choices throughout the game, emphasizing trade-offs rather than optimization.

#### Scenario: Reflection screen - displacement accounting
- **WHEN** the game ends
- **THEN** the reflection screen shows: total residents displaced (sum of all displacement events), total residents protected (by anti-gentrification measures), neighborhoods where gentrification_pressure exceeded 75% (named), and businesses displaced vs. included. The text frames these as real human consequences, not statistics.

#### Scenario: Reflection screen - speed vs. justice accounting
- **WHEN** the game ends
- **THEN** the reflection screen shows: ratio of Player-Initiated to Community-Led projects, number of community proposals accepted vs. rejected, number of compromised vs. full-strength policies, and the resulting Community Trust trajectory over time. A narrative summary characterizes the player's governance style (e.g., "You governed quickly but not deeply. Projects were built, but communities were not.")

#### Scenario: Reflection screen - regional impact
- **WHEN** the game ends AND the game reached Beyond the Map stage
- **THEN** the reflection screen shows: resources sent to regional cities, regional projects completed, continental goal progress, cities that reached Restoration stage with Detroit's help, and cities that collapsed. A narrative summary addresses the Cahokia theme: did the player choose to be part of something larger, or did they build a beautiful island in a dying region?

#### Scenario: Reflection screen - invitation to replay
- **WHEN** the game ends
- **THEN** the reflection screen ends with: "Detroit's story is not one story. Try a different path." The screen shows which specialization paths the player has NOT yet tried and what content they would unlock, encouraging replayability.
