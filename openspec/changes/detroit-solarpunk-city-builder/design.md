## Context

This is a greenfield browser-based strategy game built for commercial launch. The player is a revolutionary mayor of Detroit, transforming the city from post-industrial dystopia to solarpunk utopia. The game is turn-based (seasonal turns), uses real Detroit geography (OpenStreetMap GeoJSON), and has interlocking systems across narrative, policy, physical, character, and tension layers.

The core gameplay loop: each turn, community leaders propose projects, events land on the player's desk, and the player responds to proposals, runs their own projects, enacts policy, and shifts public narrative. Climate change acts as an escalating external pressure. The city visually transforms neighborhood-by-neighborhood across four stages. 21 named characters create the human story.

Key constraints:
- Browser-only, no server for core gameplay
- 16 interlocking systems with defined formulas (Monte Carlo validated)
- Real Detroit geography from OpenStreetMap data
- 21 named characters with portraits, dialogue, and mechanical impact
- Full 4-stage game with endgame regional mechanics
- Commercial release quality — not a prototype

## Goals / Non-Goals

**Goals:**
- Complete, balanced, launch-quality game spanning all 4 stages and 64 turns
- Real Detroit map rendered from OpenStreetMap GeoJSON as stylized interactive polygons
- 21 characters with distinct personalities, dialogue, and mechanical roles
- Three replayable specialization paths with different content unlocks
- Meaningful trade-offs at every decision point (speed/justice, growth/de-growth, local/regional)
- Reducer-based game state with save/load, undo, and version migration
- Responsive browser UI for desktop (1280px+)
- Full content: 13+ project types, 6+ policies, 100+ events, character dialogue

**Non-Goals:**
- Multiplayer networking (Beyond the Map uses AI cities, not real players)
- Mobile optimization (desktop-first; responsive down to 1280px)
- Procedural generation (Detroit map is real data, content is authored)
- Mod support
- Server-side persistence or accounts
- 3D rendering

## Decisions

### Architecture: Game state as a pure reducer

The game state is a single immutable TypeScript object with a version field. Every turn produces a new state via `(state, action) => state`. No mutation, no side effects in the simulation.

**Why:** Turn-based games map perfectly to reducers. Free save/load (serialize state), free undo (keep previous states), free replay (replay action sequence), easy testing (pure functions). With 16 systems, the ability to inspect any state snapshot is critical for debugging balance.

**Alternatives considered:**
- ECS: Overkill for turn-based with no real-time physics.
- MVC with mutable models: Harder to serialize, harder to test, harder to debug balance across 16 systems.

### Rendering: PixiJS polygons from GeoJSON + React UI

PixiJS renders the Detroit map as filled polygons projected from GeoJSON coordinate data using d3-geo (Michigan State Plane or custom Mercator projection). React handles all management UI. They communicate through shared game state.

**Why:** Real neighborhood boundaries give the map authenticity that grid tiles can't match. PixiJS handles polygon rendering, zoom/pan, layered effects, and point-in-polygon click detection. React handles the substantial management UI (character panels, project lists, policy menus, tension dashboard, event dialogs).

**Map data pipeline:**
1. Source: OpenStreetMap / City of Detroit open data portal GeoJSON
2. Build time: simplify polygons (reduce point count), project to screen coordinates, compute adjacency graph, compute centroids for labels
3. Runtime: PixiJS renders pre-processed polygons with fill colors based on ecological health / visual stage / season

**Alternatives considered:**
- Leaflet/Mapbox slippy map: Too cartographic, not game-like. We want stylized polygons, not street maps.
- Grid tiles with labels: Loses the real geography that makes the Detroit setting authentic.
- SVG rendering: Slower than PixiJS for layered rendering with zoom/pan.

### Map structure: Real neighborhood polygons (~35 neighborhoods)

Each "tile" is an actual Detroit neighborhood polygon. Properties are aggregate (vacancy rate, eco health, contamination, gentrification pressure, existing uses). Adjacency is computed from shared polygon boundaries.

**Why:** Real geography creates emotional connection. Players who know Detroit recognize their neighborhood. Players who don't learn real places. Adjacency is computed from actual geography, not grid coordinates, so spatial strategy (clustering projects, corridor building) feels natural.

### Turn resolution: 10-step resolve pipeline

The Resolve phase executes 10 sub-steps in defined order: climate tick → climate events → adaptation → project progress → policy effects → narrative drift → meter feedback → budget replenishment → counter-narrative generation → stage check. Order matters: later steps use values updated by earlier steps.

**Why:** With 16 systems all modifying shared state, resolution order creates different outcomes. Defining it explicitly prevents order-dependent bugs and makes balance predictable. Monte Carlo simulations validated the balance using this exact ordering.

### Character system: Named NPCs with mechanical impact

21 characters (9 council, 8 leaders, 4 antagonists) with -100 to +100 relationship scores, 6 change channels, threshold behaviors, and coalition mechanics. Community leaders propose projects. Council members vote on policies. Antagonists generate escalating opposition.

**Why:** The critic review identified that a game about community transformation cannot have "no people." Characters create emotional stakes, unpredictable interactions, and the human cost/benefit dimension that meters alone can't provide. The community-proposal mechanic flips the game from top-down planning to facilitation, embodying solarpunk values.

### Tension system: Structural trade-offs

Four interlocking tensions (speed/justice, growth/de-growth, local/regional, political compromise) and three specialization paths create genuine dilemmas. No optimal strategy — every approach has costs.

**Why:** The critic identified that the original design had no trade-offs — an obvious optimal strategy (max trust first). The tension system ensures every turn has a meaningful choice with real costs on both sides. Specialization paths create replayability (3 distinct experiences).

### Balance: Monte Carlo validated with continuous formulas

All meter interactions use continuous functions (not binary thresholds). Every number in the specs comes from Monte Carlo simulation of 3,000+ games across multiple strategies. The golden path is designed: always running out of something (early: budget/trust, mid: political will/time, late: climate race).

**Why:** The initial spec had no math — just prose. Simulations revealed three game-breaking problems (Political Will death spiral, stuck progression, binary narrative). All formulas are tuned to the recommended parameters from the balance report.

## Risks / Trade-offs

**[Risk] 16 systems creates integration complexity.**
→ Mitigation: Build in layers. Core loop first (state, map, turns, projects, meters), then add character/relationship, then policy/narrative, then climate/events, then tensions, then progression/endgame. Each layer tests against the existing ones.

**[Risk] GeoJSON polygon rendering is more complex than grid tiles.**
→ Mitigation: Pre-process at build time. Simplify polygons, pre-compute adjacency, pre-project coordinates. Runtime rendering is just "draw filled polygon" which PixiJS handles easily.

**[Risk] 21 characters require substantial content (dialogue, portraits, behavior).**
→ Mitigation: Start with placeholder portraits and 3 dialogue lines per character per interaction type. Expand in content passes. The mechanical system (proposals, votes, relationships) works with minimal dialogue.

**[Risk] Content volume (50+ projects, 100+ events, policies, dialogue).**
→ Mitigation: Create a content data format (typed JSON) that separates content from code. Content can be authored and balanced independently. Prioritize content for Stages 1-2 first, then 3-4.

**[Risk] Balance may diverge from simulations when all systems interact.**
→ Mitigation: The reducer architecture makes automated playtesting possible. Run simulation bots through the full game regularly during development. Adjust parameters in data files without code changes.

**[Risk] Real Detroit geography creates accuracy expectations.**
→ Mitigation: Stylized rendering (solid colors, not satellite imagery). Neighborhood names and boundaries are accurate; visual style is clearly a game, not a map. Attribution to OpenStreetMap per ODbL license.
