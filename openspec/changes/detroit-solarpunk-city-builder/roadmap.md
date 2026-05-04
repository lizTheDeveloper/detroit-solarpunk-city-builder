# Detroit Solarpunk City Builder — Implementation Roadmap

## Wardley Map

Every component in the game sits on two axes: how directly the player experiences it (visibility) and how novel/uncertain it is (evolution). The map drives our build order.

```
                    GENESIS          CUSTOM BUILT         PRODUCT          COMMODITY
                    (novel,          (understood,         (patterns         (off-the-
                     uncertain)       custom soln)        exist)            shelf)
                    |                |                    |                 |
  VISIBLE    4  ----+----------------+--------------------+-----------------+----
  (player        [PROPOSALS]     [COUNCIL VOTE]                            |
   directly      [TENSIONS]      [RE-ELECTION]                            |
   touches)      [GENTRIFIC]     [SPEC PATHS]                             |
                 [BEYOND MAP]    [CLIMATE PRESS]                          |
                 [DETROIT                                                  |
                  CONTENT]                                                 |
                 [CHARACTERS]                                              |
                    |                |                    |                 |
  ENABLING   3  ----+----------------+--------------------+-----------------+----
  (player sees   [DISPLACE-      [METERS]             [PROJECTS]          |
   effects)       MENT]          [POLICIES]           [EVENT SYS]         |
                                 [NARRATIVE]                               |
                                 [PROGRESSION]                            |
                    |                |                    |                 |
  INFRA      2  ----+----------------+--------------------+-----------------+----
  (invisible     [SOLARPUNK       [TURN ENGINE]        [STATE REDUCER]  [REACT UI]
   to player)     VISUAL]                              [MAP DATA PIPE]  [VITE+TS]
                 [PORTRAITS]                           [PIXI RENDERER]  [SAVE/LOAD]
                                                                        [KBD SHORT]
                    |                |                    |                 |
              1  ---+-genesis--------+-custom-built-------+-product---------+-commodity-
```

### What the map tells us

The upper-left quadrant is dense. Community proposals, tensions, gentrification, character relationships, Beyond the Map, and Detroit-specific content are all **genesis-evolution components at the highest visibility level**. These are the components that make this game worth playing — and the components most likely to need fundamental redesign.

The lower-right quadrant (React UI, Vite, save/load, keyboard shortcuts) is pure commodity. No design risk. No uncertainty. Don't over-invest here.

**The old roadmap built bottom-up: commodity first, genesis last.** That means you wouldn't discover whether the game is actually good until more than halfway through the build. The Wardley-informed order flips this: **validate genesis first, build commodity infrastructure around proven mechanics.**

This is not a prototype strategy — every system ships. The difference is sequencing: you don't pave roads to a town that might move.

---

## Build Order

### Phase 1: Core Interaction Loop

**Goal**: Test the one thing that makes this game different from every other city builder — community proposals and the speed-vs-justice tension. Minimal UI. Real state consequences.

| Component | Evolution | Tasks |
|-----------|-----------|-------|
| Game state types (tiles, meters, leaders) | Product | 2.1 (scoped to what proposals need) |
| Minimal reducer (proposal response, end turn) | Product | 2.2–2.3 (scoped) |
| 3 community leaders (Grace, Kez, Darius) | **Genesis** | 8.1–8.2 (scoped to 3 leaders) |
| Proposal generation based on neighborhood state | **Genesis** | 8.4 |
| Accept/Modify/Defer/Reject with trust consequences | **Genesis** | 8.5 |
| Player-initiated vs community-led project toggle | **Genesis** | 7.3 |
| Gentrification pressure from projects | **Genesis** | 7.5 (partial), tile-map gentrif logic |
| 3 meters: Trust, Budget, Gentrification | Custom | 6.1 (scoped) |
| Minimal React UI (not PixiJS, not the map) | Commodity | Text list of tiles, proposal cards, meter readouts |

**What you learn**: Does the proposal interaction create genuine dilemmas? Does accept/modify/defer/reject feel meaningfully different? Does speed-vs-justice emerge naturally from the cost/trust/gentrification trade-off? Is the community-led premium worth paying?

**What you defer**: Map rendering, full meter system, seasonal cycles, events, policies, narrative, climate, progression, endgame, visual design.

**Milestone**: Play 8 turns in text mode. Grace proposes a food forest in Brightmoor. Accept it — trust goes up, project starts in community-led mode (slow, expensive, but low gentrification). Next turn, you need something fast before climate catches up. Start a player-initiated Solar Grid — cheap and quick, but gentrification ticks up and trust gain is weak. Kez proposes a land trust in Corktown. You reject it because you're out of budget. Her trust drops hard. You feel the dilemma. The game's thesis works — or it doesn't, and you know now.

---

### Phase 2: People & Politics

**Goal**: Test the full character relationship system, council voting, re-election, and antagonist pressure. The game is about people, not numbers — validate the people system.

| Component | Evolution | Tasks |
|-----------|-----------|-------|
| All 21 character definitions (data) | **Genesis** | 8.1–8.3 (full), 8.6–8.11 |
| 6-channel relationship system | **Genesis → Custom** | 9.1–9.6 |
| Threshold behaviors (advocate, hostile, etc.) | **Genesis** | 9.3–9.4 |
| Council voting formula + lobbying | Custom | 8.6–8.8 |
| Re-election scoring (turn 16) | Custom | 9.8, 5.7 |
| Antagonist activation + escalation | **Genesis → Custom** | 8.9–8.10 |
| Coalition mechanics | **Genesis** | 9.6 |
| Displacement consequences | **Genesis** | 7.7 |
| Cross-system integration (leaders → Trust, council → Will) | Custom | 6.6, 9.7 |

**What you learn**: Do 21 characters feel like too many to track? Is the trust-vs-agreement distinction legible? Does council lobbying feel strategic or like busywork? Does re-election create genuine tension? Do coalitions matter? Does Sterling Cross actually feel threatening?

**What you defer**: Map rendering, visual design, climate, events beyond antagonists, progression paths, narrative system, Beyond the Map.

**Milestone**: Play through 16 turns to re-election. You've been accepting Grace and Lucia's proposals but rejecting Kez's (too expensive). Kez is at -15 trust and organizing opposition. Sterling Cross shows up at turn 4 trying to buy vacant lots. You lobby Victor Marek on a land trust policy — he's pragmatic, the numbers work, he votes yes. Turn 15 is campaign season. Turn 16: re-election. Your score is Trust (62) + council (+9) + advocates (+15) + coalitions (+8) - antagonists (-6) = 88. You win, but Kez's opposition cost you. You'd play differently next time.

---

### Phase 3: Map + Turn Infrastructure

**Goal**: Now that the core interactions are validated, build the real infrastructure around them. The Detroit map, the full turn engine, the production UI.

| Component | Evolution | Tasks |
|-----------|-----------|-------|
| GeoJSON pipeline (acquire, simplify, project, adjacency) | Product | 3.1–3.6 |
| PixiJS renderer (polygons, zoom/pan, click, labels) | Product | 4.1–4.9 |
| Full turn engine (10-step resolve pipeline) | Custom | 5.1–5.6 |
| Full 6-meter system with feedback formulas | Custom | 6.1–6.5 (complete) |
| Full project system (catalog, costs, adjacency bonuses) | Product | 7.1–7.6 (complete) |
| React UI shell (layout, meters, tile detail, panels) | Commodity | 17.1, 17.3, 17.4, 17.7, 17.9, 17.13, 17.14 |
| Proposal panel, character panel in real UI | Commodity | 17.5, 17.6, 17.8, 17.15, 17.16 |
| Save/load/undo | Product | 2.4–2.6 |
| New game with all starting values | Product | 2.4 |
| Seasonal cycle | Product | 5.1–5.2, 5.5 |

**Why now and not earlier**: By this point, you know what state shape the game actually needs. You know whether tiles need the "community ownership" modifier (because you tested community-led projects). You know what the UI needs to show (because you played the game in text mode and know which information matters for decisions). You're building infrastructure around proven mechanics.

**Milestone**: The game looks real. Click Brightmoor on the map — see its traits, vacancy, contamination. Start a Community-Led Food Forest — see the polygon start greening over 3 turns. Grace's portrait appears with her proposal. The council vote screen shows 9 faces with disposition bars. Turn summary shows every meter delta with source attribution. Seasonal palette shifts from spring green to summer heat.

---

### Phase 4: Systems Layering

**Goal**: Add the remaining game systems with confidence that the foundation works. Climate pressure, policies, narrative actions, events, progression paths.

| Component | Evolution | Tasks |
|-----------|-----------|-------|
| Climate system (curve, tipping points, adaptation) | Custom | 13.1–13.7 |
| Policy system (full/compromised, council votes) | Custom | 11.1–11.7 |
| Event system (priority queue, milestones, scripted) | Product | 10.1–10.8 |
| Narrative system (5 action types, opinion, compounding) | Custom | 12.1–12.6 |
| Progression system (3 paths, stage transitions) | Custom | 15.1–15.6 |
| Tension dashboard | Custom | 14.1–14.7 |
| Growth vs de-growth categorization | **Genesis** | 7.8, 14.3–14.4 |
| Map overlays (seasonal palettes, gentrification heat, contamination) | Product | 4.10–4.13 |
| UI for policies, narrative, events, progression | Commodity | 17.2, 17.10, 17.11, 17.12 |

**Milestone**: Full first-three-stages game. Play an Ecology-First run — rush food forests, hit Transition around turn 12 with the fixed 25% food threshold. Climate ticks up. A heat wave hits Summer Year 4 — your rain gardens save Brightmoor but Delray floods. Push Rent Stabilization through council as compromised (the loophole stings later). Marcus Webb's counter-narratives erode your Will. You make it to Restoration by turn 35. The tension dashboard shows you moved fast on ecology but neglected community power.

---

### Phase 5: Beyond the Map — Go/No-Go Gate

**Goal**: Build the endgame as a standalone prototype and evaluate honestly: does it add to the game or dilute it?

| Component | Evolution | Tasks |
|-----------|-----------|-------|
| Regional view (Detroit as one node among 9 cities) | **Genesis** | 16.1–16.2 |
| AI city state and progression | **Genesis** | 16.3–16.4 |
| Resource transfers (budget, templates, expertise) | **Genesis** | 16.5 |
| City relationships (Neutral → Cooperative → Allied) | **Genesis** | 16.6 |
| Regional projects | **Genesis** | 16.7 |
| 4 continental goals with progress formulas | **Genesis** | 16.8 |
| 3 win conditions (cooperative, survival, loss) | **Genesis** | 16.9 |
| Cahokia Choice event | **Genesis** | 14.6, 16.10 |
| Sandbox mode | Custom | 16.11 |
| Reflection screen | **Genesis** | 16.12 |
| Regional view UI | Custom | 17.17 |

**Critical decision point**: After building this, play through 15 turns of Beyond the Map. Ask: Is managing 9 AI cities compelling, or is it bookkeeping? Does the Cahokia Choice feel earned? Does the cooperative win feel like a real achievement? If the answer is yes, integrate it. If no, replace the endgame with a simpler reflection/scoring system and save the scope. The critic review was right that this is "a second game." Evaluate it as one.

**Milestone**: Reach Beyond the Map around turn 50. See the Great Lakes regional view. Send resources to Flint (they're struggling). Make the Cahokia Choice — commit 20% of budget permanently. Push Watershed Restoration and Food Network past 50%. Win the cooperative victory. Read the reflection screen: how many people were displaced, how fast you moved, what it cost.

---

### Phase 6: Detroit Content + Polish

**Goal**: Ship it. The game mechanics are proven. Now fill in the content and visual identity that make it specifically *Detroit*.

| Component | Evolution | Tasks |
|-----------|-----------|-------|
| Neighborhood trait data (all ~35 neighborhoods) | **Genesis** | 18.1 |
| 15+ Detroit-specific scripted events | **Genesis** | 18.2 |
| All character dialogue (21 characters, 150+ lines) | **Genesis** | 18.3, 18.8 |
| Project descriptions with Detroit flavor | **Genesis** | 18.4 |
| Milestone event narratives | **Genesis** | 18.5 |
| Cahokia/indigenous context in narratives | **Genesis** | 18.6 |
| Win/loss screen narratives | **Genesis** | 18.7 |
| Solarpunk visual design (palettes, stages, seasons) | **Genesis** | 19.1–19.2 |
| Character portrait placeholders | **Genesis** | 19.3 |
| UI visual style | Custom | 19.4 |
| Project/path iconography | Custom | 19.5–19.6 |
| Playtest bot (1000x per strategy) | Product | 20.1–20.3 |
| Manual playtesting (full loop, all paths) | -- | 20.4–20.8 |
| Game over screens, new game flow | Product | 21.1–21.2, 17.18 |
| Keyboard shortcuts, animations | Commodity | 21.3–21.4 |
| Attribution, perf, browser testing, deploy | Commodity | 21.5–21.8, 17.19 |

**Milestone**: Production build on a public URL. Someone who's never seen the specs opens it. They click Brightmoor, Grace proposes a food forest, Sterling Cross tries to buy the lot next door. They feel the tension between moving fast and building trust. They make it to re-election by the skin of their teeth. They keep playing. The reflection screen at the end makes them want to try a different path.

---

## Wardley-Informed Priorities

### Invest deeply (Genesis, high-visibility — this IS the game)
- Community proposal interaction loop
- Speed vs justice tension (player-initiated vs community-led)
- Character relationships and trust consequences
- Gentrification as central mechanic
- Beyond the Map endgame (with go/no-go gate)
- Detroit-specific authored content

### Build carefully (Custom, enabling — the machinery that makes genesis components work)
- Meter feedback formulas (already Monte Carlo validated, but watch for emergent issues)
- Council voting and lobbying
- Policy compromise system
- Narrative action compounding
- 10-step resolve pipeline ordering
- 3 specialization paths with different thresholds

### Build thin (Product — well-known patterns, just implement them)
- Project catalog (costs, durations, effects)
- Event priority queue
- Turn engine / seasonal cycling
- Game state reducer
- GeoJSON processing pipeline
- PixiJS polygon rendering
- Save/load/undo

### Don't over-invest (Commodity — use off-the-shelf, move on)
- Vite + TypeScript scaffolding
- React UI components (panels, buttons, meters)
- Keyboard shortcuts
- Browser compatibility
- Basic zoom/pan/click

---

## Critical Path

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6
Core Loop    People      Map + UI    Systems     Endgame     Content
(genesis)    (genesis)   (product)   (custom)    (genesis    + Ship
                                                  go/no-go)
```

The first two phases validate genesis components with minimal infrastructure. Phase 3 builds production infrastructure around proven mechanics. Phase 4 layers in the remaining systems. Phase 5 is a go/no-go gate on the endgame scope. Phase 6 fills in content and ships.

Within each phase, build system logic first (reducer + types), verify with console/tests, then wire UI. The reducer pattern makes this natural.

## Balance Validation Checkpoints

- After Phase 1: Does the proposal/tension loop create real dilemmas? (Qualitative, not Monte Carlo)
- After Phase 2: Does re-election feel tense? Do character relationships feel trackable? (Qualitative)
- After Phase 3: Run simplified Monte Carlo — meters + projects for 64 turns. Verify budget doesn't collapse or explode.
- After Phase 4: Run full V2 simulation suite. Compare against balance report numbers.
- After Phase 5: Full playtest, all 3 paths, manual. This is where you find "feels wrong" problems simulations miss.
- After Phase 6: External playtesting. Someone who didn't build it plays it cold.

## Known Risks

1. **Community proposal design** (Phase 1): If accept/modify/defer/reject doesn't create genuine dilemmas, the game's entire thesis needs rethinking. This is the highest-risk, highest-value component. Find out first.
2. **21 characters may be too many** (Phase 2): Players may not be able to track relationships with 9 council members + 8 leaders + 4 antagonists. Be prepared to reduce the cast.
3. **Beyond the Map scope** (Phase 5): This is effectively a second game. The go/no-go gate is not optional — if the endgame isn't compelling in prototype, cut it to a reflection screen and ship what works.
4. **Content volume** (Phase 6): 150+ lines of personality-specific dialogue, 15+ scripted events, neighborhood data for 35 tiles. This is irreducible creative labor that cannot be parallelized or accelerated.
5. **GeoJSON data quality** (Phase 3): If City of Detroit portal data needs heavy cleanup, it could slow the map phase. By then the game design is proven, so this is schedule risk, not design risk.
