## Why

City builder games universally reward growth — more people, more buildings, more GDP. But the most interesting urban story of our time is transformation, not expansion. Detroit has 40 square miles of vacant land, an existing urban farming movement, and a history of radical community organizing. The game reimagines the city builder genre: instead of building up, you're transforming what exists — from post-industrial dystopia to solarpunk utopia.

Inspired by the peoples of Turtle Island — particularly Cahokia, which at its peak (~1100 CE) was larger than London, and whose people chose to reorganize rather than continue extractive urban growth. That choice is the game's core mechanic: at every stage, the player must recognize costs and choose transformation over expansion.

The player is not a top-down planner. They are a facilitator — a revolutionary mayor who must earn and maintain community trust by listening to community leaders, navigating a city council, fending off corporate interests and state interference, and making hard choices between speed and justice, growth and de-growth, local needs and regional solidarity.

## What Changes

This is a greenfield project — a browser-based, turn-based strategy game built for commercial launch.

- Player takes the role of a newly elected revolutionary mayor of Detroit
- Real Detroit geography rendered from OpenStreetMap GeoJSON data — actual neighborhood boundaries, the Detroit River, and Great Lakes context
- Neighborhoods as interactive polygons (not grid tiles) that visually transform across four progression stages (Awakening → Transition → Restoration → Beyond the Map)
- Three interlocking gameplay layers: Narrative (public opinion/media), Policy (incentives/governance), Physical (neighborhoods/infrastructure/ecology)
- Seasonal turn structure: 4 turns/year, 16 turns/mayoral term, game spans 64 turns (16 years, 4 terms)
- Turn phases: Events → Player Actions (Projects, Policy, Narrative) → Resolve (10-step pipeline)
- 21 named characters: 9 city council members, 8 community leaders, 4 antagonists — all with personalities, dialogue, relationships, and mechanical impact
- Community leaders propose projects to the player, shifting the gameplay from top-down planning to facilitation
- Pressure systems: climate change (defined curve with tipping points), ecological debt (per-tile contamination), gentrification pressure, antagonist escalation
- Resistance systems: infrastructure lock-in, political opposition, economic inertia, community disagreement, state/federal interference, re-election as multi-turn arc
- Core tensions: Speed vs. Justice, Growth vs. De-growth (the Cahokia mechanic), Local vs. Regional, Political Compromise
- Three specialization paths (Ecology-First, Community-First, Policy-First) with distinct content unlocks and trade-offs
- Six meters with continuous-function feedback loops and specific formulas
- Endgame: regional view of Great Lakes bioregion, 9 AI cities, 4 continental goals (Watershed, Wildlife Corridor, Food Network, Buffalo Commons), cooperative and survival win conditions
- Detailed reflection screen that accounts for displacement, governance style, and regional impact
- Tech stack: TypeScript, React, PixiJS, Vite, d3-geo (projection), OpenStreetMap data

## Capabilities

### New Capabilities

- `game-state`: Core state model with version field, TypeScript types for all entities, reducer pattern, save/load with migration, undo history
- `tile-map`: Detroit neighborhoods as GeoJSON polygons from OpenStreetMap, existing uses, contamination, gentrification pressure, adjacency system, neighborhood-specific traits
- `turn-engine`: Seasonal turn cycle, 10-step resolve phase pipeline with defined ordering, seasonal gameplay modifiers with specific values
- `project-system`: 13+ project types with exact costs/durations/effects, player-initiated vs community-led modes, concurrent limits, tile transformation thresholds
- `policy-system`: 6+ policies with full-strength and compromised versions, council vote mechanics, ongoing drain caps, political compromise system
- `narrative-system`: 5 narrative action types with specific effects, compounding (+5%/turn cap +25%), opinion drift, counter-narratives with reduced probabilities
- `climate-system`: Defined pressure curve (base 0.92, acceleration 1+year*0.03, ±20% randomness), tipping points at 60% and 85%, ecological debt per tile type
- `event-system`: Priority queue with frequency caps (3/turn max, 1 crisis max), cooldowns, Detroit-specific events, multi-turn re-election arc, scripted milestones
- `meter-system`: 6 meters with continuous feedback formulas, threshold triggers, budget as dollar amount with annual replenishment
- `progression-system`: 3 specialization paths per stage transition, path-specific content unlocks and late-game strengths/weaknesses
- `character-system`: 9 council members with voting mechanics, 8 community leaders with proposals, 4 antagonists with escalation schedules, character portraits and dialogue
- `relationship-system`: -100 to +100 scores, 6 change channels, threshold behaviors, coalition building, relationship decay, cross-system integration with meters
- `tension-system`: Speed/justice, growth/de-growth, local/regional, political compromise mechanics, tension dashboard UI
- `beyond-the-map`: Regional view with 9 AI cities, resource transfers, regional projects, 4 continental goals with progress formulas, cooperative/survival/loss win conditions, sandbox mode, reflection screen
- `ui-shell`: React UI shell — top bar, side panels, bottom meters, tension dashboard, character panels, regional view toggle
- `map-renderer`: PixiJS rendering of GeoJSON polygons, seasonal visual changes, transformation animations, layer compositing, zoom/pan, click detection via point-in-polygon
- `detroit-content`: Detroit-specific event catalog, neighborhood traits, historical references, character dialogue, sourced from real research

### Modified Capabilities

(none �� greenfield project)

## Impact

- New repository structure: TypeScript + React + PixiJS + Vite + d3-geo
- No existing code affected (greenfield)
- Dependencies: React, PixiJS, Vite, TypeScript, d3-geo, topojson-client
- OpenStreetMap data (ODbL license — compatible with commercial release with attribution)
- Browser-based — no server required for core gameplay
- Estimated scope: 16 systems, ~120 tasks, content authoring for 50+ projects, 100+ events, 21 character profiles
