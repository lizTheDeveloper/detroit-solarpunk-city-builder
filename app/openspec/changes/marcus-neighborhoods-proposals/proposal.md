## Why

The usability playtest surfaced three interconnected problems: Marcus Webb fires the identical counter-narrative event every turn, creating severe event fatigue; Detroit is represented by only 8 neighborhoods, which will alienate players from unrepresented areas; and the proposal system requires tedious per-turn defer clicking with no organic pressure or consequence for inaction. These three systems are tightly coupled — Marcus feeds on ignored proposals, proposals live on neighborhood tiles, and more neighborhoods create richer proposal surface area — so they should be redesigned together.

## What Changes

### Marcus Webb: From Cartoon Villain to Full Character
- Replace the single repeating "Counter-Narrative" event with a **4-phase character arc** that evolves based on player actions and game state
- Phase 1 (Gadfly, T1-8): low-stakes media pot-shots every 3-4 turns
- Phase 2 (Demagogue, T9-20): targets specific neighborhoods/leaders, weaponizes ignored proposals, drives wedges between allies
- Phase 3 (Power Broker, T20-35): pivots to political ambitions — council run, backs challengers, or can be co-opted
- Phase 4 (Resolution, T36-48): multiple endings — reluctant ally, election threat, or cynicism engine depending on cumulative player choices
- Add a **motivation layer**: Marcus is funded by developer interests (Sterling Cross connection) but has a real grievance from a neglected childhood neighborhood
- His events now reference actual game state: specific projects funded/ignored, specific neighborhoods neglected, specific leaders he targets
- New player options: confront on-air, fund counter-media, co-opt with a seat at the table, let community organizers handle it

### Detroit Neighborhoods: Full Coverage (~16-18 tiles)
- Expand from 8 to **~16-18 neighborhoods** covering recognizable Detroit
- Add: Midtown, Mexicantown/Delray, Grandmont-Rosedale, West Village, Palmer Park, Bagley/University District, Livernois-McNichols, Russell Woods/Fitzgerald, Rouge Park area, Belle Isle (park/water)
- Each new neighborhood gets: terrain type, starting metrics, existing uses, traits, adjacency links, GeoJSON polygon
- ~7-10 new community leaders with backstories, priorities, and project preferences
- Existing leaders who reference missing neighborhoods (Lucia→Delray, Elder→West Village, Hassan→Banglatown, Tamika→Highland Park, Mike→Rouge Park) get their secondary tiles connected
- Map GeoJSON updated with real neighborhood boundaries (simplified polygons)

### Proposal System: Expiration Timers + NPC Pressure Campaign
- **BREAKING**: Remove mandatory defer-clicking — proposals now auto-defer if not acted on
- Proposals appear as cards anchored to their neighborhood tile with a visible **expiration timer** ("Funds needed by Month X")
- Default expiration window: 3 turns (configurable per leader based on urgency/trust)
- **NPC escalation ladder** for ignored proposals:
  - Turn 1: Proposal appears passively on tile
  - Turn 2: Leader mentions it in conversation encounters
  - Turn 3: Leader rallies neighborhood support, petition counter visible
  - Turn 4: Goes to local press / Marcus Webb picks it up as ammunition
  - Turn 5: Deadline expires → trust penalty, proposal dies, leader becomes bitter
- Player can fund at any point during the window — earlier = cheaper trust cost
- Rejected proposals skip the timer and resolve immediately (same trust penalty as now)
- Expired proposals generate a narrative event: the leader's reaction based on their personality and trust level

## Capabilities

### New Capabilities
- `marcus-arc`: Marcus Webb's 4-phase character arc with state machine, phase-specific events, player choice branching, and Sterling Cross connection
- `neighborhood-expansion`: Full Detroit neighborhood coverage (~16-18 tiles) with leaders, traits, adjacency, and map polygons
- `proposal-expiration`: Proposal timer system with auto-defer, expiration deadlines, and NPC pressure escalation ladder

### Modified Capabilities
- (none — existing specs don't cover these systems at the requirement level)

## Impact

- **Data files**: `antagonists.ts`, `character-prompts.ts`, `leaders.ts`, `create-game.ts` — new character data, expanded neighborhood definitions
- **Map layer**: `MapPanel.tsx`, `map-style.ts` — new GeoJSON polygons, updated neighborhood source data
- **Event system**: `events.ts` — Marcus arc events replace single counter-narrative, proposal expiration events
- **Proposal system**: `proposals.ts`, `ProposalPanel.tsx`, `TileDetailPanel.tsx` — expiration timers, auto-defer, pressure ladder UI
- **State types**: `types.ts` — new fields for Marcus arc phase, proposal expiration turn, pressure level
- **Reducer**: `reducer.ts` — remove mandatory proposal handling gate on End Turn, add expiration processing
- **Resolve pipeline**: `resolve.ts` — proposal expiration tick, Marcus phase transitions
- **Tests**: All affected system tests need updates; new playtest scenarios for Marcus arc and proposal expiration
