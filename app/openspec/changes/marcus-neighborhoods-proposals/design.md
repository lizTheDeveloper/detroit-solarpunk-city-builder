## Context

The game currently has three interrelated weaknesses identified during a 10-turn visual playtest:

1. **Marcus Webb** is defined as an antagonist with `escalationInterval: 0`, meaning he generates the identical "Counter-Narrative" event every turn he's active (which is every turn from turn 1). He never escalates, never evolves, and has exactly two choices that produce the same -3 Will / -2 Trust tradeoff. His backstory as a performative populist talk radio host is well-written but never surfaces mechanically.

2. **8 neighborhoods** cover a fraction of Detroit. Leaders already reference missing areas (Delray, West Village, Banglatown, Highland Park, Rouge Park) but no tiles exist. Detroiters will notice the gaps. The map panel uses hardcoded GeoJSON bounding boxes.

3. **Proposals require mandatory defer-clicking** every turn. With 8 leaders generating proposals each turn, players click Defer 6-7 times per turn just to reach End Turn. There's no expiration concept, no organic pressure, and no consequence for ignoring a proposal besides a -5 trust deferral penalty.

The existing antagonist system (`antagonists.ts`, `events.ts`) supports activation conditions, escalation intervals, and tile targeting. The proposal system (`proposals.ts`) tracks `consecutiveDeferrals` and `proposalCooldown` (unused). The leader system has trust, advocacy power, and priorities. All the hooks exist — they're just not connected.

## Goals / Non-Goals

**Goals:**
- Marcus Webb becomes a 4-phase character arc that reacts to game state and creates meaningful strategic decisions
- Detroit neighborhood coverage expands to ~16-18 tiles so residents recognize their city
- Proposals become passive objects with timers that generate organic NPC pressure, eliminating mandatory defer clicks
- The three systems interconnect: ignored proposals become Marcus's ammunition, more neighborhoods create richer proposal variety

**Non-Goals:**
- Not adding all 50+ Detroit neighborhoods — diminishing returns past ~18
- Not redesigning the entire event system — Marcus uses the existing antagonist/event infrastructure with extensions
- Not adding AI-generated dialogue for Marcus — his events use templated text with state interpolation
- Not changing the proposal negotiation system — it stays as-is
- Not adding new project types for new neighborhoods — existing catalog covers them

## Decisions

### 1. Marcus Arc: State machine on the existing `Antagonist` type

Extend the antagonist data model with an `arcPhase` field rather than creating a separate Marcus-specific system. His 4 phases map to escalation levels 0-3, but with custom transition logic instead of the generic interval-based escalation.

**Phase transitions driven by:**
- Turn number (minimum thresholds)
- Player response history (how often you confronted vs. ignored)
- Game state triggers (crisis active, proposals ignored, neighborhood neglect)
- The Sterling Cross connection activates Phase 2 early if the developer antagonist is also active

**Event pool per phase** (3-5 events each, selected based on game state):
- Phase 1: generic media pot-shots referencing recent player actions
- Phase 2: targeted attacks naming specific neighborhoods/leaders, weaponizing ignored proposals
- Phase 3: political maneuvering — council endorsements, rally events, can be co-opted
- Phase 4: resolution events based on cumulative player choices

**Alternative considered:** Making Marcus a crisis arc. Rejected because crisis arcs have a fixed stage pipeline (foreshadow → escalation → crisis → reckoning → resolved) that doesn't fit Marcus's reactive, player-driven evolution. He needs to branch, not progress linearly.

### 2. Neighborhoods: Data-driven expansion in `create-game.ts`

Add ~8-10 new tiles following the exact same `Tile` structure. Each gets:
- Realistic starting metrics based on real Detroit data (vacancy rates, contamination from EPA/DEQ records, gentrification pressure from real estate trends)
- GeoJSON polygons (simplified) in `MapPanel.tsx` — replace bounding boxes with rough neighborhood outlines
- Adjacency links forming a connected graph across the city
- A community leader (some leaders span 2-3 adjacent neighborhoods)

**New neighborhoods (targeting 16-18 total):**

| Neighborhood | Terrain | Key Trait | Leader |
|---|---|---|---|
| Midtown | urban-dense | university_adjacent, gentrifying | New: academic/activist type |
| Mexicantown | urban-sparse | immigrant_community, food_culture | Lucia Espinoza (existing, spans SW Detroit) |
| Delray | industrial | pollution_hotspot, marathon_refinery | New: environmental justice organizer |
| Grandmont-Rosedale | urban-sparse | historic_homes, stable_community | New: neighborhood association leader |
| West Village | urban-sparse | waterfront_adjacent, rapid_change | Elder Whitehorse (existing, spans Indian Village) |
| Palmer Park | urban-sparse | lgbtq_history, diverse | New: arts/culture organizer |
| Bagley/UDistrict | urban-sparse | university_adjacent, student_population | New: student/community bridge |
| Livernois-McNichols | urban-sparse | avenue_of_fashion, revitalizing | New: small business coalition leader |
| Fitzgerald | vacant | high_vacancy, rewilding_potential | Tamika Jefferson (existing, spans North End) |
| Rouge Park | park | greenspace, flood_management | Big Mike Novak (existing, spans Warrendale) |

**Alternative considered:** Loading neighborhoods from a JSON config file instead of hardcoding. Rejected for now — the game ships with a fixed Detroit map, and the config adds indirection without benefit. Can extract later if modding support is desired.

### 3. Proposals: Timer field on `Proposal` type + expiration in resolve pipeline

Add `expirationTurn: number` and `pressureLevel: number` to the `Proposal` interface. The resolve pipeline ticks pressure and expires proposals.

**Flow:**
```
prepareTurn():
  - Generate new proposals with expirationTurn = currentTurn + leader.urgencyWindow (default 3)
  - Tick pressureLevel on existing active proposals
  - Fire pressure events for proposals at level 3+ (goes to press, Marcus picks it up)
  - Expire proposals past their deadline → trust penalty, generate narrative event
  - Move expired proposals out of activeProposals

Key change: End Turn NO LONGER gates on "proposals remaining"
  - Proposals are passive objects on tiles
  - Player acts on them when they choose (or doesn't)
  - The consequence of inaction is the pressure ladder + expiration, not a UI gate
```

**Pressure ladder:**

| Level | Turns Pending | NPC Behavior | UI Indicator |
|---|---|---|---|
| 0 | Just proposed | Card appears on tile | Green timer bar |
| 1 | 1 turn ignored | Leader mentions in meetings | Yellow timer bar |
| 2 | 2 turns ignored | Leader rallies support, petition count | Orange timer bar, notification |
| 3 | 3 turns ignored | Goes to press, Marcus weaponizes | Red timer bar, event generated |
| expired | Past deadline | Trust penalty, proposal dies | Card removed with narrative |

**Expiration trust penalty:** Scales with leader trust and pressure level. A partner-level leader whose proposal you ignored for 3 turns takes it much harder (-12 trust) than a neutral leader whose low-priority proposal expired quietly (-3 trust).

**Alternative considered:** Keeping the defer button but making it optional. Rejected — the point is eliminating the mandatory click. If the button exists, players will click it out of habit. Clean removal forces the new system to carry its weight.

### 4. Interconnection: Marcus → Proposals → Neighborhoods

The three systems talk to each other through the existing event/state infrastructure:

- **Ignored proposals feed Marcus**: When a proposal hits pressure level 3 ("goes to press"), if Marcus is in Phase 2+, he generates a targeted event: "Mayor ignores {neighborhood}'s plea for {project}. Where's the money going?"
- **Neighborhood neglect feeds Marcus Phase 2**: The calendar system's `neighborhoodTimeAllocation` already tracks where the mayor spends time. If any neighborhood has 0 allocation for 3+ months, Marcus targets it.
- **Marcus events reference real state**: Event text interpolates actual neighborhood names, leader names, project names, and budget figures from the current game state.
- **More neighborhoods = more targets**: With 16-18 neighborhoods, it's harder to keep everyone happy, giving Marcus more material and making the proposal pressure system more meaningful.

## Risks / Trade-offs

**[Risk] 16-18 neighborhoods overwhelms the sidebar** → The neighborhood list in the left sidebar currently shows all tiles. With 16-18, it needs either scrolling, collapsible groups (by district), or a condensed view. Mitigation: group neighborhoods by geographic cluster (Northwest, Northeast, Central, Southwest, Southeast, Enclaves) with expand/collapse.

**[Risk] Marcus arc is too complex to balance** → 4 phases × multiple events × branching choices creates a large state space. Mitigation: Each phase is self-contained. Phase transitions are driven by simple thresholds (turn number + response count). Events are templated with interpolation, not fully dynamic.

**[Risk] Removing defer button breaks the turn flow expectation** → Players from the current version expect to handle proposals before ending. Mitigation: The "End Turn (N proposals remaining)" message changes to show proposal status passively ("3 proposals pending, 1 expiring soon") without gating.

**[Risk] New neighborhoods need new leaders with backstories** → Character writing is time-intensive and must feel authentic to Detroit. Mitigation: ~5-6 new leaders (not 10), with some existing leaders spanning adjacent neighborhoods. New leaders draw on real Detroit organizing traditions (UFAD, Heidelberg, Boggs Center, Soulardarity).

**[Risk] GeoJSON polygon accuracy** → Simplified polygons may not match residents' mental maps. Mitigation: Use Detroit Open Data neighborhood boundaries as source, simplify to reduce point count but preserve recognizable shapes.
