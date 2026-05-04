## 1. Project Scaffolding

- [ ] 1.1 Initialize Vite + React + TypeScript project
- [ ] 1.2 Install dependencies: PixiJS, d3-geo, topojson-client
- [ ] 1.3 Configure TypeScript strict mode and path aliases (`@/state`, `@/systems`, `@/ui`, `@/renderer`, `@/data`)
- [ ] 1.4 Set up directory structure: `src/state/`, `src/systems/`, `src/ui/`, `src/renderer/`, `src/data/`, `src/data/geo/`, `src/data/content/`
- [ ] 1.5 Set up a shared state store (Zustand or React context) that holds GameState and dispatches GameActions
- [ ] 1.6 Verify dev server runs with blank React app and PixiJS canvas side by side

## 2. Game State Foundation

- [ ] 2.1 Define all core TypeScript types: `GameState`, `Tile`, `Meter`, `Season`, `Stage`, `Project`, `Policy`, `GameEvent`, `CouncilMember`, `CommunityLeader`, `Antagonist`, `Relationship`, `ContinentalGoal`, `PublicOpinion`
- [ ] 2.2 Define `GameAction` union type for all state transitions (start-project, enact-policy, narrative-action, respond-event, respond-proposal, end-turn, lobby-council, direct-engagement, send-regional-resources, etc.)
- [ ] 2.3 Implement `gameReducer(state: GameState, action: GameAction): GameState` skeleton with action routing
- [ ] 2.4 Implement `createNewGame(): GameState` with all starting values from game-state spec (meters, tiles, council, leaders, antagonists, public opinion, version 2)
- [ ] 2.5 Implement save to localStorage (key: `detroit_solarpunk_save`) and load with version check and v1→v2 migration
- [ ] 2.6 Implement undo: keep last 3 states in memory for single-turn undo

## 3. Detroit Map Data

- [ ] 3.1 Acquire Detroit neighborhood boundary GeoJSON from City of Detroit open data portal or OpenStreetMap
- [ ] 3.2 Acquire Detroit River / water feature GeoJSON for water boundary rendering
- [ ] 3.3 Write build-time preprocessing script: simplify polygons (Douglas-Peucker), project to screen coordinates (d3-geo Michigan State Plane), compute polygon centroids for labels, compute adjacency graph from shared boundaries
- [ ] 3.4 Create neighborhood data file mapping each polygon to game properties: name, terrain type, starting vacancy, starting contamination, starting eco health, existing_uses array, neighborhood_traits array (from detroit-research.md)
- [ ] 3.5 Validate ~30-35 neighborhoods are represented with correct relative positions and the river along the southern edge
- [ ] 3.6 Output preprocessed data as TypeScript-typed JSON importable at runtime

## 4. Map Renderer

- [ ] 4.1 Set up PixiJS Application within a React component with proper resize handling
- [ ] 4.2 Render Detroit neighborhood polygons from preprocessed GeoJSON data as filled Graphics objects in PixiJS
- [ ] 4.3 Color polygons by visual stage: dystopia (gray/brown), transition (mixed green/gray), restoration (green), beyond (lush green/blue)
- [ ] 4.4 Render Detroit River as blue water polygons along the southern boundary
- [ ] 4.5 Implement smooth zoom (scroll wheel) and pan (click-drag) with min/max bounds
- [ ] 4.6 Implement polygon click detection (point-in-polygon) — identify which neighborhood was clicked
- [ ] 4.7 Add hover highlight (border glow) and selection state (bright border) for polygons
- [ ] 4.8 Communicate tile selection from PixiJS to React UI via shared state/events
- [ ] 4.9 Render neighborhood name labels at polygon centroids (scale with zoom)
- [ ] 4.10 Implement seasonal palette shifts: spring (bright greens), summer (saturated), fall (warm amber), winter (muted/blue-white)
- [ ] 4.11 Add project-in-progress indicators on polygons (icon or overlay)
- [ ] 4.12 Add gentrification pressure heat overlay (red tint scaling with pressure value)
- [ ] 4.13 Add contamination overlay (brown/toxic tint for contaminated neighborhoods)

## 5. Turn Engine

- [ ] 5.1 Implement season cycling: Spring → Summer → Fall → Winter → Spring (next year)
- [ ] 5.2 Implement year (4 turns), term (16 turns), and game-end (64 turns) tracking
- [ ] 5.3 Implement turn phase state machine: Events → Player Actions → Resolve
- [ ] 5.4 Implement 10-step Resolve pipeline: climate tick, climate events, adaptation, project progress, policy effects, narrative drift, meter feedback, budget replenishment, counter-narrative gen, stage check
- [ ] 5.5 Implement seasonal gameplay modifiers: Spring ecology +1 progress (pre-tipping-point), Summer +0.2% climate bonus, Fall +1% food sov harvest, Winter -1 outdoor progress / +0.5% narrative Will
- [ ] 5.6 Implement turn summary generation: collect all meter deltas with source attribution, completed projects, events resolved, tile transformations
- [ ] 5.7 Wire re-election trigger at turns 16, 32, 48, 64 — multi-turn arc (campaign turn 15 + election turn 16)

## 6. Meter System

- [ ] 6.1 Implement 6 meters with starting values: Trust 50%, Eco 15%, Food 10%, Will 60%, Budget $4.2M, Climate 30%
- [ ] 6.2 Implement continuous feedback formulas: `Will_regen = 1 + max(0, (Trust - 40) * 0.1)`, `Trust_food_bonus = max(0, (FoodSov - 20) * 0.05)`, Trust decay -0.3%/turn
- [ ] 6.3 Implement meter threshold triggers: Budget=$0 austerity, Will<20% recall warning, Will<12% re-election fail, Trust<25% protests, Eco>75% restoration unlocks
- [ ] 6.4 Implement budget: annual replenishment $1.5M * economic_modifier + policy revenue bonuses, on Spring turns
- [ ] 6.5 Implement meter change tracking: each delta tagged with source for turn summary display
- [ ] 6.6 Implement cross-system integration: leader trust average → Trust modifier, council disposition → Will modifier

## 7. Project System

- [ ] 7.1 Define project catalog as typed JSON: 13+ projects with exact costs, durations, effects, requirements, terrain eligibility (from project-system spec)
- [ ] 7.2 Implement project start action: validate budget, political will threshold, tile contamination, tile eligibility, stage requirement, concurrent limit `floor(2 + Trust/25)`
- [ ] 7.3 Implement player-initiated vs community-led mode: PI costs 100%/100% duration/-40% trust/+50% gentrif; CL costs 130%/150% duration/+60% trust/-50% gentrif
- [ ] 7.4 Implement project progress advancement in Resolve step 4: base 1 turn + seasonal modifiers (Spring +1 ecology, Winter -1 outdoor)
- [ ] 7.5 Implement project completion: apply effects to tile eco/contamination, meter changes, gentrification pressure, tile visual stage advancement (eco >= 25% transition, >= 60% restoration, >= 85% beyond)
- [ ] 7.6 Implement adjacency bonuses: food corridor +5% food sov, eco near water +10% eco, greenway connection +15% transit, solar adjacency +20% energy. Max 3 bonuses per tile.
- [ ] 7.7 Implement displacement consequences: displacing businesses -8% trust, displacing housing -12% trust +25% gentrif, include-existing-uses option (+40% cost, +1 turn, no displacement)
- [ ] 7.8 Implement growth vs de-growth categorization: growth projects generate revenue, de-growth costs maintenance. Track ratio for tension dashboard.

## 8. Character System

- [ ] 8.1 Define 9 council member data: names, districts, political leanings, priority issues, starting dispositions, dialogue lines (from character-system spec)
- [ ] 8.2 Define 8 community leader data: names, neighborhoods, priorities, starting trust, advocacy power, dialogue lines (from character-system spec)
- [ ] 8.3 Define 4 antagonist data: names, activation triggers, escalation schedules, event templates, neutralization conditions, dialogue (from character-system spec)
- [ ] 8.4 Implement community leader proposal generation: 1-2 proposals per turn based on neighborhood conditions, trust >= 0, responsive to events/contamination/climate
- [ ] 8.5 Implement 4 proposal response options: Accept (+10 trust, 85% cost, 150% trust gain), Modify (+3, reduced scope), Defer (-5, re-propose next turn, 3 deferrals = reject), Reject (-15, -5% local trust, possible opposition)
- [ ] 8.6 Implement council voting: vote_score = disposition + priority_alignment(-20 to +20) + district_conditions(-10 to +10) + leader_advocacy(0 to +15) + lobbying(0 to +15). YES if > 0, NO if < -10, ABSTAIN if between.
- [ ] 8.7 Implement player lobbying: spend 1 narrative action per council member, +5 to +15 based on priority alignment
- [ ] 8.8 Implement failed vote mechanics: 2-turn cooldown, one-vote-short shows breakdown, landslide rejection = -5% Will + 4-turn cooldown
- [ ] 8.9 Implement antagonist activation triggers and escalation (1-5 scale, level 5 = crisis event)
- [ ] 8.10 Implement antagonist-specific events: Cross land acquisition, Voss emergency manager threat, Webb amplification, Chen partnership offer
- [ ] 8.11 Implement joint proposals when 2+ leaders have trust >= 30 with overlapping priorities

## 9. Relationship System

- [ ] 9.1 Implement relationship scores (-100 to +100) for all 17 characters (9 council + 8 leaders)
- [ ] 9.2 Implement 6 change channels: proposal responses, policy effects on priorities, district conditions, narrative alignment, direct engagement (1/turn, +5 to +10), events/crises
- [ ] 9.3 Implement threshold behaviors — leaders: Advocate(40), Champion(60), Partner(80), Disillusioned(0), Opposition(-20), Hostile(-50)
- [ ] 9.4 Implement threshold behaviors — council: Lean Yes(30), Ally(60), Coalition Partner(80), Skeptic(0), Opponent(-20), Adversary(-50)
- [ ] 9.5 Implement relationship decay: -1/turn toward zero, -0.5 for Champion/Ally, no decay for Hostile/Adversary
- [ ] 9.6 Implement coalition building: 3+ leaders at trust >= 40, provides joint narrative (200%), joint proposals, +5 council disposition, antagonist counter. Max 2 active.
- [ ] 9.7 Implement cross-system integration: avg leader trust/10 → Trust modifier, council allies → +1% Will each, leader trust modifies project cost and narrative effectiveness in their neighborhood
- [ ] 9.8 Implement re-election score: base Trust + council support (±3 per member) + advocate bonus (+5 per) + coalition bonus (+8 per) - antagonist penalty (-3 per level 3+). Win if >= 50.

## 10. Event System

- [ ] 10.1 Define event catalog as typed JSON: climate events (heat wave, flood, storm, ice storm), political (state pushback, developer proposal, federal grant), community (neighborhood request, mutual aid, celebration), crisis (water shutoff, infrastructure failure)
- [ ] 10.2 Define Detroit-specific scripted events based on real history (detroit-research.md): water shutoff crisis, emergency manager threat, I-375 highway decision, Heidelberg Project, etc.
- [ ] 10.3 Implement event queue with priority: Crisis > Climate > Political > Community. Max 3/turn, max 1 crisis, max 1 climate.
- [ ] 10.4 Implement cooldowns: same event type can't fire within 3 turns, crisis cooldown 4 turns
- [ ] 10.5 Implement event choice resolution: 2-3 options per event with specific meter/tile/political effects
- [ ] 10.6 Implement delayed consequences: some choices create follow-up events N turns later
- [ ] 10.7 Implement scripted milestone events table: first project, first tile transformation, first rejection, stage transitions, re-election, tipping points (~13 milestones)
- [ ] 10.8 Implement re-election as multi-turn arc: Campaign Turn (turn 15/31/47/63) with +2 narrative actions, Election Turn (16/32/48/64) with score calculation

## 11. Policy System

- [ ] 11.1 Define policy catalog: 6+ policies with full-strength and compromised versions, thresholds, costs, ongoing effects, drain caps (from policy-system spec)
- [ ] 11.2 Implement policy enactment: validate Will threshold, deduct Will cost, activate ongoing effects, trigger council vote for major policies (threshold > 50%)
- [ ] 11.3 Implement ongoing policy effects: per-turn modifiers to project costs, meter rates, event probabilities. Drain cap 0.5%/turn per policy, 4%/turn total.
- [ ] 11.4 Implement full-strength vs compromised: full = higher threshold/cost/effect, compromised = lower threshold/cost/50% effect + side effects
- [ ] 11.5 Implement compromise side effects per policy (rent stabilization loophole, land trust neighborhood restriction, green jobs sunset clause)
- [ ] 11.6 Implement half-measures penalty: 3+ compromised / 0 full-strength → -5% Trust event
- [ ] 11.7 Implement policy revocation

## 12. Narrative System

- [ ] 12.1 Define 5 narrative action types with specific effects: Community Meeting (+1% Will, +2% local Trust), Media Campaign (+1.5% Will, -3% policy threshold), Education Program (+1% Will, +2% opinion), Cultural Event (+2% Trust, +1% Will), Demonstration (+2% Will, -2% Trust)
- [ ] 12.2 Implement narrative action budget: `floor(1 + Trust/30)` actions per turn, +1 per 3 advocates
- [ ] 12.3 Implement public opinion model: per-topic spectrum (0-100%) for 5 topics (food sovereignty, water commons, land reform, ecological restoration, cooperative economics)
- [ ] 12.4 Implement compounding: +5% effectiveness per consecutive turn on same topic, cap +25%
- [ ] 12.5 Implement opinion drift: -2% per turn of neglect on each topic
- [ ] 12.6 Implement counter-narratives: probability 0.03-0.10 per type per turn, max 1 firing per turn, 3-turn cooldown

## 13. Climate System

- [ ] 13.1 Implement climate pressure curve: `rise = 0.92 * (1 + year * 0.03) * (1 + random(-0.2, 0.2))`
- [ ] 13.2 Implement Summer heat bonus: +0.2% additional climate increase
- [ ] 13.3 Implement tipping point 1 at 60%: remove Spring ecology bonus, double climate event probabilities
- [ ] 13.4 Implement tipping point 2 at 85%: new severe event types, Fall food bonus halved, permanent difficulty increase
- [ ] 13.5 Implement ecological debt: per-tile contamination starting values (industrial 80%, urban-dense 40%, vacant 20%, etc.), contamination blocks food/ecology projects above thresholds
- [ ] 13.6 Implement climate event generation: probability and severity scale with pressure, season-specific (Summer heat, Spring flood, Fall storm, Winter ice)
- [ ] 13.7 Implement adaptation: completed ecology projects reduce climate event damage on their tiles (Rain Garden -40% flood, Wetland -60%, tree canopy reduces heat)

## 14. Tension System

- [ ] 14.1 Implement speed vs justice tracking: ratio of player-initiated to community-led projects over last 8 turns
- [ ] 14.2 Implement community-led mode: projects blocked if neighborhood Trust < 30%, Community Power tokens (3 = unique bonus project)
- [ ] 14.3 Implement growth vs de-growth tracking: categorize projects, track revenue vs maintenance ratio, austerity pressure event at budget < $1M
- [ ] 14.4 Implement de-growth gate for Restoration stage: require 8+ de-growth tiles + Eco >= 60%, fire "Recognize the Costs" milestone
- [ ] 14.5 Implement local vs regional: 25% chance/turn of regional request in Transition+, accept costs budget but builds regional progress, reject risks isolation
- [ ] 14.6 Implement Cahokia Choice event in Beyond the Map: commit 20% budget permanently to regional goals or block cooperative win
- [ ] 14.7 Implement political compromise: full-strength vs compromised versions of all policies with distinct side effects

## 15. Progression System

- [ ] 15.1 Implement 3 specialization paths for Awakening→Transition: Ecology-First (Eco>=45%, Food>=35%, 6 eco tiles, Trust>=35%), Community-First (Trust>=65%, Food>=35%, 5 community-led projects, Eco>=20%), Policy-First (4 policies, Will>=55%, Eco>=25%, Trust>=40%)
- [ ] 15.2 Implement path-specific content unlocks for Transition stage (ecology: restoration projects; community: co-ops/mutual aid; policy: zoning reform/public banking)
- [ ] 15.3 Implement 3 paths for Transition→Restoration with late-game strengths/weaknesses per path
- [ ] 15.4 Implement Restoration→Beyond: Eco>=80%, Food>=75%, 25 tiles restoration+, Regional Collaboration project complete
- [ ] 15.5 Implement path convergence in Beyond the Map: all content unlocked, path bonuses/penalties retained
- [ ] 15.6 Implement stage transition milestone events with narrative and path-specific text

## 16. Beyond the Map

- [ ] 16.1 Implement regional view toggle: local Detroit map ↔ Great Lakes regional map
- [ ] 16.2 Render regional map: 9 city nodes (Ann Arbor, Toledo, Cleveland, Chicago, Milwaukee, Windsor, Flint, Lansing, Grand Rapids) with connection lines
- [ ] 16.3 Implement AI city state: per-city meters, base progression rate (+0.5% eco, +0.3% food, +0.4% trust/turn), stage-based modifiers, climate vulnerability
- [ ] 16.4 Implement AI city starting states from beyond-the-map spec (Ann Arbor Transition, Flint Awakening, etc.)
- [ ] 16.5 Implement resource transfers: send budget (small/med/large), send project template (-$100K, 50% cost reduction for target), send expertise (-1 project slot for 4 turns, target doubles rate)
- [ ] 16.6 Implement city relationships: Neutral → Cooperative (3 transfers + 10% improvement) → Allied (2 regional projects + Transition stage)
- [ ] 16.7 Implement 7 regional project types with costs, durations, and continental goal contributions
- [ ] 16.8 Implement 4 continental goals with per-turn progress formulas: Watershed Restoration, Wildlife Corridor, Food Sovereignty Network, Buffalo Commons
- [ ] 16.9 Implement 3 win conditions: cooperative (2 of 4 goals at 100%), survival (80 turns, all meters > 50%), and loss (re-election, budget collapse, climate catastrophe)
- [ ] 16.10 Implement endgame events: climate refugees, federal intervention, sacrifice mechanic, final push
- [ ] 16.11 Implement sandbox mode after win: freeze climate, suspend re-election, +$1M/year
- [ ] 16.12 Implement reflection screen: displacement accounting, speed/justice accounting, regional impact, path summary, "try a different path" invitation

## 17. UI Shell

- [ ] 17.1 Build app layout: top bar, main area (map + side panel), bottom meter bar
- [ ] 17.2 Build top bar: season icon, year/term display, political will gauge, progression stage/path indicator, regional view toggle (Beyond the Map only)
- [ ] 17.3 Build bottom meter bar: 6 meters with labeled gauges, numeric values, delta indicators
- [ ] 17.4 Build side panel — default mode: active projects list with progress bars
- [ ] 17.5 Build side panel — event mode: event description, context, 2-3 response buttons
- [ ] 17.6 Build side panel — community proposal mode: leader portrait, proposal details, Accept/Modify/Defer/Reject buttons, comparison with player's planned project
- [ ] 17.7 Build side panel — tile detail mode: neighborhood properties, existing uses, contamination warning, gentrification gauge, available projects, active projects
- [ ] 17.8 Build character panel: portrait, name, role, relationship score, recent changes with sources, priorities, current stance, dialogue, vote prediction (for council)
- [ ] 17.9 Build project selection UI: catalog filtered by tile, player-initiated vs community-led toggle, cost/duration/effects display, prerequisite warnings
- [ ] 17.10 Build policy panel: available/enacted policies, full-strength vs compromised toggle, council vote prediction, enact/revoke buttons
- [ ] 17.11 Build narrative action panel: 5 action types, topic targeting, remaining actions count, compounding indicator
- [ ] 17.12 Build tension dashboard: speed/justice slider, growth/de-growth ratio, local/regional spending, gentrification hotspots
- [ ] 17.13 Build End Turn button with disabled state for pending crisis/proposal responses
- [ ] 17.14 Build turn summary overlay: meter deltas by source, completed projects, events, tile transitions, dismiss to proceed
- [ ] 17.15 Build council vote screen: member portraits in a grid, disposition bars, predicted votes, lobbying option
- [ ] 17.16 Build re-election screen: campaign phase (bonus actions), election phase (score breakdown), result (win/loss)
- [ ] 17.17 Build regional view UI: city nodes with meters, connection lines, resource transfer panel, regional project menu, continental goal progress bars
- [ ] 17.18 Build main menu: New Game, Load Game, path selection display for replayability
- [ ] 17.19 Ensure responsive layout at 1280px minimum width

## 18. Detroit-Specific Content

- [ ] 18.1 Write neighborhood trait data for all ~35 neighborhoods: unique modifiers, starting uses, community character, landmarks (from detroit-research.md)
- [ ] 18.2 Write 15+ Detroit-specific scripted events with historically-grounded details: water shutoff, emergency manager, I-375 highway decision, Heidelberg Project, auto industry echo, land bank crisis, Marathon refinery, etc.
- [ ] 18.3 Write dialogue lines for all 21 characters: 3+ lines per interaction type (positive, negative, signature issue), reflecting personality and speech patterns
- [ ] 18.4 Write project descriptions with Detroit-specific flavor text for all 13+ project types
- [ ] 18.5 Write milestone event narratives for all 13+ scripted milestones with path-specific variants
- [ ] 18.6 Write Cahokia/indigenous context into progression milestone narratives (Recognize the Costs, Cahokia Choice, Buffalo Commons) with respectful framing
- [ ] 18.7 Write win/loss screen narratives: cooperative win, survival win (bittersweet), re-election loss, budget collapse, climate catastrophe
- [ ] 18.8 Write antagonist event text and escalation narratives for all 4 antagonists across 5 escalation levels

## 19. Art & Visual Design

- [ ] 19.1 Design solarpunk color palette for each visual stage: dystopia (concrete/rust), transition (emerging green), restoration (lush/solar), beyond (integrated ecological)
- [ ] 19.2 Design seasonal palette variations (spring bloom, summer heat, fall harvest, winter frost) layered on visual stages
- [ ] 19.3 Create character portrait placeholders for all 21 characters (can be silhouettes with color coding initially)
- [ ] 19.4 Design UI component visual style: panels, buttons, meters, gauges with solarpunk aesthetic
- [ ] 19.5 Design project type icons (13+)
- [ ] 19.6 Design stage/path iconography (leaf for Ecology, fist for Community, gavel for Policy)

## 20. Integration & Balance

- [ ] 20.1 Connect all 16 systems through the game reducer: every action flows through, Resolve pipeline hits all systems
- [ ] 20.2 Implement automated playtest bot: random strategy, balanced strategy, and path-specific strategies that play through 64 turns
- [ ] 20.3 Run playtest bot 1000x per strategy, validate against Monte Carlo expectations (Stage 1 reachable by turn 10-14, Stage 2 by 32-40, Stage 3 by 48-56)
- [ ] 20.4 Playtest full turn loop manually: new game → events → proposals → projects → policy → narrative → end turn → summary → repeat for 16 turns
- [ ] 20.5 Balance first term (turns 1-16): verify Awakening→Transition is achievable, re-election is tense but winnable, budget doesn't collapse or overflow
- [ ] 20.6 Balance full game (turns 1-64): verify all 3 paths reach Beyond the Map, cooperative win is achievable but not guaranteed, climate creates genuine late-game pressure
- [ ] 20.7 Balance character interactions: verify council votes are winnable with lobbying, no leader becomes permanently hostile without player mistakes, antagonist escalation is challenging but manageable
- [ ] 20.8 Tune content: adjust project costs, event probabilities, dialogue triggers based on playtesting feedback

## 21. Polish & Launch

- [ ] 21.1 Add game over conditions with appropriate screens: re-election loss, budget collapse, climate catastrophe
- [ ] 21.2 Add new game flow: title screen → brief premise → start game
- [ ] 21.3 Add keyboard shortcuts: End Turn (Enter), Undo (Ctrl+Z), toggle regional view (Tab)
- [ ] 21.4 Add transition animations: tile color shifts, stage transition cinematics (text + visual), seasonal changes
- [ ] 21.5 Add OpenStreetMap attribution per ODbL license requirements
- [ ] 21.6 Performance optimization: verify 60fps zoom/pan with 35 polygons + all layers
- [ ] 21.7 Browser compatibility testing: Chrome, Firefox, Safari, Edge
- [ ] 21.8 Build production bundle and deploy to hosting
