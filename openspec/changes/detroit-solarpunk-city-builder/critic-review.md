# Critical Review: Detroit Solarpunk City Builder

**Reviewer verdict: Ambitious, thematically compelling, systemically undercooked.**

This is one of those designs that reads beautifully as a pitch document and would collapse under its own weight within three weeks of implementation. The vision is strong. The spec work is above average for a game design doc. The problems are in the gaps between systems, the math that nobody has done yet, and the disconnect between scope and reality.

---

## 1. Design Holes

### 1.1 The Meter Feedback Loops Are Specified in Prose, Not Math

The meter-system spec says things like "high Community Trust increases Political Will regeneration" and "high Food Sovereignty increases Community Trust" (meter-system/spec.md, Requirement: Meter feedback loops). But there are no actual formulas. The scenarios give one example each:

- Community Trust > 70% gives +2% Political Will per turn
- Food Sovereignty > 50% gives +1% Community Trust per turn

These are binary thresholds with flat bonuses. Is there nothing at 40% Food Sovereignty? 69% Community Trust? The system as described creates cliff effects where crossing a threshold suddenly activates a passive bonus, which is both unrealistic and creates unintuitive gameplay. A player at 49% Food Sovereignty gets nothing; at 50% they get free Trust forever. This needs continuous functions, not step functions.

### 1.2 No Economic Model Whatsoever

Budget is described as a dollar amount ($4.2M starting) that "depletes when projects are started and policies enacted, replenishes each year from tax revenue" (meter-system/spec.md). But there is zero specification of:

- How much tax revenue is generated per year
- What "city economic health" means or how it is computed
- How enacted policies affect tax revenue (the co-op economics in Transition "generate budget without extractive taxation" -- how much?)
- What project costs actually are (the Food Forest scenario deducts budget but no number is given)
- How budget scales across the game -- is $4.2M per year enough for 3-5 active projects? 

Without an economic model, balancing is impossible. You cannot playtest a game where the numbers do not exist yet.

### 1.3 Tile Transformation Thresholds Are Undefined

The tile-map spec says tiles visually progress through dystopia, transition, restoration, and beyond (tile-map/spec.md, Requirement: Tile transformation). The project-system spec says a Food Forest gives +25% ecological health to a tile. But what triggers a tile visual stage change? The Food Forest scenario says "the tile's visual state advances if threshold is met" -- what threshold? Is it the tile's ecological health? Some combination of properties? This is the core visual reward loop of the game and it is not specified.

### 1.4 Adjacency Effects Are Mentioned But Never Defined

The tile-map spec mentions "adjacency bonuses" from water tiles (tile-map/spec.md, Requirement: Water tiles). The progression spec mentions "wildlife corridor projects that span multiple adjacent tiles and provide compounding ecological bonuses" (progression-system/spec.md). But nowhere in any spec is there a definition of how adjacency works. Does a food forest next to another food forest get a bonus? Does a remediated tile help its neighbors? Adjacency is one of the most important spatial strategy mechanics and it is handwaved.

### 1.5 The Re-Election Mechanic Is Dangerously Thin

Turn 16 triggers re-election (turn-engine/spec.md, task 4.7). The event-system says you lose if Community Trust < 30% or Political Will < 20% (event-system/spec.md). That is a binary pass/fail check on two meters. There is no campaign, no opponent, no voter coalition dynamics, no platform promises. For a game about being a "revolutionary mayor," the actual political mechanics of being a mayor are shockingly absent. The player just needs to keep two numbers above low thresholds. This should be a dramatic, multi-turn arc, not a threshold check.

### 1.6 The City Council Is a Black Box

The policy-system spec says council members have positions (supportive, neutral, opposed) that shift based on narrative actions and events (policy-system/spec.md, Requirement: City council dynamics). But: How many council members? How are their initial positions determined? How exactly do narrative actions shift them? Can the player target specific council members? What happens when a vote fails -- can you try again next turn? The council is potentially one of the most interesting political mechanics in the game and it gets one scenario.

### 1.7 No Specification of What "Ecological Debt" Actually Contains

The climate-system spec lists soil contamination, polluted waterways, and degraded air quality (climate-system/spec.md, Requirement: Ecological debt). But which tiles start with which contamination levels? Is this per-tile data in the initial state? The initial state spec (game-state/spec.md) mentions tiles have vacancy rates and ecological health but does not mention contamination as a starting property. If contaminated soil blocks food projects (a critical early-game action), the placement of contamination across the map is a major level design decision that is completely unaddressed.

### 1.8 Concurrent Project Limit Is Unspecified

The project-system says the limit "increases as Community Trust rises" (project-system/spec.md). What is the starting limit? What is the formula? If the starting limit is 1, the early game is agonizingly slow. If it is 5, there is no meaningful constraint. The task list (task 6.5) says to implement it based on Community Trust level but provides no numbers.

---

## 2. Balance Concerns

### 2.1 Positive Feedback Spiral: Trust-Will-Narrative Death Spiral (Upward)

The feedback loop chain is: Community Trust > 70% gives +2% Political Will per turn. Political Will lets you enact policies. Policies give ongoing benefits. Narrative actions (which scale with Community Trust) shift opinion, which reduces policy thresholds. More policies mean more project cost reductions and meter boosts.

Once a player crosses the Community Trust 70% threshold, they enter a virtuous cycle where everything gets easier. More trust means more narrative actions (narrative-system/spec.md: 2 at 50%, 4 at 80%), which means more opinion shifting, which means easier policies, which means more projects, which means more trust. There is no friction that scales with success. The design has resistance systems listed in the proposal (infrastructure lock-in, political opposition, economic inertia) but these are not mechanically specified anywhere except as vague event triggers.

### 2.2 Negative Feedback Spiral: The Early Game Budget Trap

Budget starts at $4.2M. Projects cost budget. Policies cost political will (not budget directly, but some policies redirect budget). Budget replenishes yearly. If the player overspends in Year 1 and hits $0, an austerity crisis triggers (meter-system/spec.md). Austerity forces cutting active projects. Cut projects mean no tile transformations. No transformations mean no meter improvements. No meter improvements mean no stage progression. No stage progression means no new tools to recover.

There is no specified recovery mechanism from budget crisis except "emergency funding" events and "federal grants," which are random. A player who makes two bad budget decisions in the first four turns could be in an unrecoverable state with no clear signal that they have lost.

### 2.3 Climate Pressure Curve Is Untuned

Climate pressure starts at 30% and "always rises" with "year-based acceleration" (climate-system/spec.md). Tipping points at 70% and 85%. But the rate is not specified. If pressure rises 2% per turn, it hits 70% by turn 20 (Year 5). If it rises 1% per turn with 50% acceleration by Year 10, it hits 70% around turn 45. The entire difficulty curve of the game depends on this number and it does not exist in the spec.

Additionally, climate pressure "cannot be reduced, only adapted to." This means the game has a hard clock. Every game ends eventually because climate pressure hits 100%. But the game over condition for climate is "pressure 100% with no adaptation" (tasks.md, task 13.5). What counts as "adaptation"? If the player has completed ecology projects on 10 tiles, is that enough adaptation? This binary between "adapted" and "not adapted" is not defined.

### 2.4 Seasonal Modifiers Stack Unpredictably

Spring gives ecology projects +1 turn progress (turn-engine/spec.md). Fall gives harvest/food sovereignty bonuses. Summer increases climate pressure. Winter limits outdoor projects. But policies also modify project costs and speeds. And the narrative compounding effect (50% more effective after 3 consecutive turns on the same topic, narrative-system/spec.md) interacts with seasonal narrative bonuses that... do not exist? The narrative system has no seasonal modifiers specified. So the narrative system operates identically across all seasons while every other system changes, which feels inconsistent.

### 2.5 Stage Transition Thresholds May Be Impossible or Trivial

Awakening to Transition requires: Community Trust >= 50%, Ecological Health >= 30%, Food Sovereignty >= 25%, and 5 tiles transformed (progression-system/spec.md). Starting values are Trust 50%, Eco Health 15%, Food Sov 10%, Political Will 60%, Climate Pressure 30%.

Trust starts at the threshold already. Ecological Health needs to double from 15% to 30%. Food Sovereignty needs to go from 10% to 25%. With a Food Forest giving +25% tile ecology and +5% Food Sovereignty, the player needs roughly 5 food forests to hit Food Sovereignty (assuming no other sources), which also gives 5 tile transformations. But each food forest takes 3 turns, and we do not know the concurrent project limit. If the limit starts at 2, that is 8-9 turns minimum to clear Awakening, which is over half the first term spent in the tutorial stage. If the limit starts at 4, it is 4-5 turns, which feels too fast. Nobody has done this math because the numbers do not exist.

---

## 3. Fun Factor

### 3.1 The Projects-Policy-Narrative Triad Risks Feeling Samey

Every turn, the player does the same three things: pick projects for tiles, enact/manage policies, run narrative actions. The specs describe these as three distinct systems but the player experience is: click tile, start project, open policy panel, click policy, open narrative panel, click narrative action, end turn. The interaction patterns are identical -- browse a list, click the one you can afford. The strategic texture comes from the interactions between these systems, but those interactions are underspecified (see Section 1).

Without strong event variety and meaningful dilemmas, turns 5-12 will feel like autopilot. The mid-game needs more disruption.

### 3.2 Optimal Strategy Will Be Obvious Within One Playthrough

Maximize Community Trust first (it gates narrative actions, which gate everything else). Run food-related projects to build Food Sovereignty, which feeds back into Trust. Use narrative actions on the topic that is closest to its next threshold. Avoid expensive policies until trust is high. This strategy is derivable from the spec without playtesting.

There is no system that punishes focusing. No tradeoff that forces the player to sacrifice one meter for another. The meters have independent inputs and positive cross-feedback. A good city builder needs impossible choices. This design has convenient choices.

### 3.3 The Tile Map Is Undifferentiated

There are 30-50 tiles with terrain types (urban-dense, urban-sparse, vacant, industrial, waterfront, park). But the gameplay difference between placing a food forest on Brightmoor vs. Corktown vs. any other vacant tile is... what? Tiles have vacancy rates and ecological health, which affect project eligibility. But if three tiles are all "vacant with 60% vacancy and 10% ecological health," the choice between them is meaningless.

Real Detroit neighborhoods have wildly different characters, histories, and communities. The Heidelberg Project in eastern Detroit is not interchangeable with the urban farms in Brightmoor. Without neighborhood-specific traits, bonuses, challenges, or narrative content, the map is just a grid with labels.

### 3.4 No Player Expression or Build Diversity

There is no tech tree, no skill tree, no specialization path. Every game will follow the same progression: Awakening projects, then Transition projects, then Restoration projects. The player cannot choose to be an ecology-focused mayor vs. a community-focused mayor vs. a policy-focused mayor. The stage transitions require all meters to hit thresholds simultaneously, which means you must be a generalist. This kills replayability.

### 3.5 The "Beyond the Map" Stage Sounds Cool and Is Completely Undesigned

The progression-system spec says Beyond the Map shows "Detroit as one node in the Great Lakes bioregion" with "continental-scale goals" (progression-system/spec.md). The task list has one task for this (task 11.5): "implement Beyond the Map stage: regional view UI showing Detroit as one node in Great Lakes bioregion, continental goal tracking."

This is not a task, it is a second game. What is the gameplay? How does the player interact with the regional view? What are the continental goals? How does the player contribute to them? Can they fail at this stage? This is either going to be cut entirely or be a deeply unsatisfying "you win, here is a pretty picture" screen. Be honest about which one it is.

---

## 4. Scope Reality Check

### 4.1 73 Tasks Across 12 Systems Is 3-6 Months of Work

Even with a skilled solo developer, each task in this list is a 2-8 hour implementation (define types, implement logic, wire UI, test). At ~4 hours average, that is 292 hours, or about 7 months of part-time work (10 hrs/week) or 7 weeks of full-time work. But that estimate is fantasy because:

- Task dependencies mean you cannot parallelize freely
- Integration work (task 13.1, "connect all systems through the game reducer") is always 3x harder than estimated
- Balancing (task 13.3) requires playtesting cycles, not just code
- No task accounts for creating the ~50 projects, ~100 events, and policy catalog content

### 4.2 Content Authoring Is Not in the Task List

The specs reference catalogs of projects (task 6.1 lists categories but not individual items), events (task 7.1 lists types), policies (task 8.1 lists categories), and narrative actions (task 9.1 lists types). Actually writing 50 balanced projects with costs, durations, prerequisites, effects, and descriptions is a content design task that dwarfs the engineering. Same for 100 events with branching choices and delayed consequences. This is not in the task list at all.

### 4.3 Minimum Viable Game: Cut to 5 Systems

For a playable prototype that proves the concept, you need:

1. **Game State + Turn Engine** (tasks 2.x + 4.x): The skeleton. Non-negotiable.
2. **Tile Map + Map Renderer** (tasks 3.x + 12.x for map only): The visual payoff. But cut seasonal visuals, cut layer compositing, just render colored rectangles with labels that change color when transformed.
3. **Project System** (tasks 6.x): The core action. This is what the player does.
4. **Meter System** (tasks 5.x): The feedback. But implement only 3 meters for prototype: Community Trust, Budget, and Climate Pressure.
5. **Minimal UI** (tasks 12.1-12.6): Enough to play.

**Cut for prototype:** Policy system, narrative system, event system (replace with hardcoded events at fixed turns), progression system (one stage is enough), climate system (just a rising number with no events), city council.

That reduces scope to roughly 25 tasks and produces a game where the player places projects on tiles, watches meters change, and sees the map transform. If that core loop is fun, add systems one at a time.

### 4.4 The PixiJS Renderer Is Overscoped

Task 3.9 (visual stage rendering with four distinct looks), 3.10 (seasonal palette shifts), and the entire map-renderer spec (layer compositing, weather effects, heat shimmer, snow coverage, bare tree sprites, harvest indicators) describe a AAA-quality tile renderer. For a prototype, you need colored rectangles. The 60fps performance requirement (map-renderer/spec.md) for 50 tiles is trivially met by any renderer; this is not a hard constraint and wastes spec space.

---

## 5. Narrative/Theme Critique

### 5.1 The Cahokia Framing Is Window Dressing

The proposal mentions Cahokia as an inspiration: peoples of Turtle Island who "built great cities, recognized the costs, and chose to reorganize how they lived." This is a powerful framing. It appears exactly once in the entire design (the proposal). No spec references Cahokia. No event references indigenous history. No progression milestone acknowledges this lineage. No game mechanic embodies the idea of "recognizing costs and choosing to reorganize."

If this is a real design pillar, it should manifest in gameplay: perhaps the progression system could have moments where the player confronts the costs of growth, or indigenous land stewardship practices could be a project category, or there could be a mechanic around choosing to de-grow. As it stands, Cahokia is a pitch-deck name-drop.

### 5.2 "Revolutionary Mayor" Does Not Feel Revolutionary

The game describes the player as a "revolutionary mayor" but the mechanics are: start projects, enact policies, run media campaigns. This is just... being a mayor. Where is the revolution? Where is the tension between institutional power and community power? Where is the moment where the player has to choose between doing things through official channels (slow, limited, safe) and supporting direct community action (fast, risky, politically costly)?

The narrative system has "demonstrations" as an action type but treats them identically to "media campaigns" -- they shift opinion and cost an action point. A demonstration and a media campaign are fundamentally different political acts. The game flattens them into the same mechanic.

### 5.3 Detroit's Actual History Is Missing

The game is set in Detroit but the specs contain almost no Detroit-specific content. Where is the legacy of the auto industry? Where is the 2013 bankruptcy? Where is the water shutoff crisis? Where is the Heidelberg Project? Where is the real urban farming movement that already exists? Where are the land contracts and predatory development?

The event-system spec lists generic categories (heat wave, flood, developer proposal) that could be set in any city. The power of this concept is that it is set in a real place with real history. That specificity needs to be in the game mechanics, not just the neighborhood names on the tiles.

### 5.4 The Solarpunk Aesthetic Is Unspecified

"Solarpunk" is in the title but there is no art direction document, no visual references, no specification of what solarpunk Detroit looks like. The map-renderer spec describes generic transitions (gray to green) that could be any eco-city game. Solarpunk has a specific visual language: solar panels integrated into organic architecture, vertical farms, community spaces, art deco meets botanical garden. None of this is specified. The "lush" description of the Beyond the Map stage (task 3.9) is doing zero work.

### 5.5 The Game Accidentally Reinforces Technocratic Top-Down Urbanism

The player is a mayor who decides where projects go, what policies to enact, and what narratives to push. The community is a meter to manage. This is the exact opposite of the solarpunk ethos, which centers community self-determination and mutual aid. The game could have mechanics where communities propose projects and the player's role is to support or redirect, where neighborhoods have their own priorities that conflict with the player's plan, where the "best" outcome requires giving up control. None of this exists. The community is a number that goes up when you do nice things.

---

## 6. Missing Systems

### 6.1 No Difficulty Settings or Accessibility

There are no difficulty modes. The climate pressure curve is fixed. The starting budget is fixed. A player who finds the game too hard or too easy has no recourse. For a game about systemic transformation that presumably wants to reach a broad audience, this is a significant omission.

### 6.2 No Tutorial or Onboarding

The design doc explicitly lists this as a non-goal ("manual/docs suffice for prototype"). This is a mistake. The game has 6 meters, 4 project types, 4 policy types, 5 narrative actions, a turn phase system, and a progression system. A new player will be overwhelmed. Even a minimal "your first three turns" scripted sequence would dramatically improve accessibility.

### 6.3 No Undo Mechanism Despite Reducer Architecture

The design doc touts the reducer architecture as enabling "free undo (keep previous states)." But no spec, task, or UI element implements undo. If the player accidentally starts the wrong project (spending scarce budget), they have no recourse. The architecture supports it; the design does not use it.

### 6.4 No Win State for Normal Play

The Beyond the Map stage has vague continental goals. But what if the player never reaches Beyond the Map? What is "winning" in the normal Restoration stage? There are lose conditions (failed re-election, budget collapse, climate catastrophe) but no win condition short of the underdesigned Beyond the Map endgame. Games need satisfying conclusions.

### 6.5 No People

The game has meters and tiles but no characters. There are no named NPCs, no community leaders, no antagonists, no city council members with personalities. For a game about community transformation, the absence of actual community members is glaring. Events describe situations but not people. The narrative system shifts "public opinion" but there is no public -- just a number.

### 6.6 No Trade-offs in Project Placement

The design never addresses what happens to existing uses of land. If you build a food forest on a vacant lot in Brightmoor, what was there before? If you remediate soil in Delray, what happens to the industries that contaminated it? Real urban transformation involves displacement, gentrification, environmental justice conflicts, and community opposition to specific projects. None of this appears. Every project is purely additive -- you never take anything away, which makes the choice space shallow and the theme dishonest.

### 6.7 No Information Asymmetry or Discovery

The player can see all meter values, all tile properties, all available projects from turn 1. There is nothing to discover, investigate, or be surprised by (except random events). Real mayors do not have perfect information. Soil contamination levels might be unknown until you test. Community trust might be hard to measure. Budget revenue projections might be wrong. Some fog of war or uncertainty would add tension and replayability.

### 6.8 No Sound, Music, or Audio

Explicitly listed as a non-goal, which is fine for a prototype, but audio is a massive contributor to atmosphere in a game with such a strong aesthetic thesis. Flagging this as something that should be on the post-prototype roadmap.

---

## 7. Specific Spec Issues

### 7.1 Contradictory Stage Unlock Logic

The meter-system spec says "Ecological Health above 75% unlocks restoration-stage projects" (meter-system/spec.md, threshold events). The progression-system spec says Restoration stage requires Ecological Health >= 60% and multiple other conditions. So restoration-stage projects can unlock before the Restoration stage via meter threshold, bypassing the progression system entirely. Is this intentional? If so, it undermines the entire stage progression as a gating mechanism.

### 7.2 The Resolve Phase Does Too Much

The turn-engine spec says Resolve computes "project progress, meter changes, climate tick, stage checks" (turn-engine/spec.md). But every other system also has resolve-time effects: policy ongoing effects, narrative drift, counter-narratives, budget replenishment, ecological debt. The Resolve phase is where every system dumps its per-turn changes, but the order these are computed in matters enormously (does climate damage apply before or after adaptation? do meter feedback loops compute on pre-turn or post-turn values?). The spec does not address resolution order within the Resolve phase.

### 7.3 Event System Has No Cooldown or Frequency Cap

The event-system spec describes event triggering by type (climate from pressure, political from context, community from trust). But there is no maximum events per turn, no cooldown between events of the same type, and no mechanism to prevent the player from being buried in events during high-pressure periods. If climate pressure is 80% in Summer, the player could theoretically face a heat wave, a flood, a storm, and a political pushback event all in one turn. There is no cap specified.

### 7.4 Save/Load Versioning

The game-state spec says serialize to JSON in localStorage. But as the game is developed and the state schema changes, old saves will break. There is no version field in the state, no migration strategy, no error handling for incompatible saves. This will bite during development and after any public release.

---

## Summary

The concept is genuinely compelling. A Detroit solarpunk city builder that engages with real urban transformation is a game worth making. But the current design is:

1. **Missing its own math.** No formulas for meter interactions, project costs, budget economy, climate curve, or stage transition timing. You cannot balance what you cannot compute.

2. **Overscoped by roughly 3x** for a first playable. Cut to game state, tile map, projects, meters, and minimal UI. Prove the core loop before adding policy, narrative, events, climate, and progression as separate layers.

3. **Thematically shallow despite thematic ambition.** The Cahokia framing, the Detroit specificity, the solarpunk aesthetic, and the revolutionary politics are all in the pitch but not in the mechanics. The game as specced is a generic eco-city-builder with Detroit neighborhood names.

4. **Missing the hard design work** of character, conflict, trade-offs, and discovery that would make it a memorable game rather than a competent system.

5. **Systemically fragile.** The meter feedback loops will either create runaway positive spirals or early-game death spirals depending on numbers that do not yet exist.

The path forward is: pick the 5-system minimum viable game, define actual numbers for everything, playtest 16 turns (one term) on paper before writing code, and then build incrementally. The current plan of 73 tasks across 12 systems will produce either an unfinished game or a finished but unbalanced one.
