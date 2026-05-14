## Context

The game currently uses a flat `NarrativeState` with `actionsRemaining` (1-4 per turn based on trust) and `actionsPerTurn`. All actions cost 1 point regardless of type. There's no relationship between crisis severity and player bandwidth, no decay on neglected relationships, no burnout, no delegation path, and no teaching of Dunbar's Number principles.

The action system touches: `src/systems/narrative.ts`, `src/state/types.ts` (NarrativeState, NarrativeActionType), `src/state/reducer.ts` (NARRATIVE_ACTION case), `src/ui/panels/NarrativePanel.tsx`, and `src/systems/resolve.ts` (prepareTurn resets actions). The crisis arc system in `src/data/arcs/` and `src/systems/crisis-engine.ts` currently only affects meters and spawns events — it doesn't touch action economy.

The LLM conversation system (`src/systems/llm-service.ts`, `src/ui/panels/ConversationPanel.tsx`) already supports context injection via system prompts and game state. Adding burnout context is architecturally trivial.

Source inspiration: User's Dunbar's Number Network Strategy spreadsheet modeling time allocation across relationship tiers with logarithmic resource multipliers.

## Goals / Non-Goals

**Goals:**
- Replace flat action economy with calendar-slot time budget (60 slots/month, ~38 fixed, ~22 discretionary)
- Model diminishing returns per person (log scale) and relationship decay from neglect
- Teach time management and Dunbar's limits through mechanics, not text
- Make crisis prevention measurable in "saved calendar slots"
- Add burnout as a consequence of overcommitting (with LLM personality effects)
- Provide delegation as a progression path that parallels the game's narrative arc
- Add strategic contact cultivation (movers, shakers, Grace Lee Boggs as mentor)
- Make the calendar itself a narrative device (election-time portrait of your priorities)

**Non-Goals:**
- Real-time scheduling (still turn-based, just with richer action economy)
- Simulating individual hours/minutes within a day (slots are abstract, ~2hr blocks)
- Replacing the tile/neighborhood spatial model (calendar adds a time dimension ON TOP)
- Full Dunbar's 150 simulation (game has ~25-30 NPCs, not 150)

## Decisions

### 1. Calendar state replaces narrative state entirely

**Choice:** Single `CalendarState` object replaces `NarrativeState`. No parallel system.

**Why:** The narrative action system IS the calendar system. Keeping both would create confusing dual economies. Clean replacement with migration path (existing saves get `calendarState` computed from old `narrativeState`).

**Alternative considered:** Layering calendar on top of existing actions → rejected because it would mean two resource pools (actions AND slots) which is cognitively expensive for the player.

### 2. Logarithmic resource yield formula

**Choice:** `yield = log₁₀(baseMultiplier / meetingCount²) × depthFactor`

Where:
- `baseMultiplier` comes from a `[relationshipType][resourceType]` matrix (values: 10-10000)
- `meetingCount` = times met this person THIS month (creates diminishing returns)
- `depthFactor` = trust-scaled multiplier (0.5 at neutral, 1.0 at champion, 1.5 at partner)

**Why:** log₁₀ compresses the massive range (10 to 10000) into playable values (1.0 to 4.0). The 1/count² in the denominator creates steep dropoff: 1st meeting = full value, 5th meeting = 53%. This matches Dunbar's research that relationship maintenance has sharply diminishing returns on frequency.

**Alternative considered:** Linear diminishing returns (each meeting -20%) → rejected because it doesn't model the "first meeting is worth 10x the fifth" reality. Square root scaling → too gentle, doesn't punish spam enough.

### 3. Burnout as a state machine, not a meter

**Choice:** Four states: `sustainable | overextended | burnout | collapse`. Transitions based on cumulative overschedule + buffer level.

```
sustainable ──[buffer depleted]──→ overextended
overextended ──[continue over]──→ burnout  
burnout ──[continue over]──→ collapse
any state ──[rest + recovery]──→ previous state (with cooldown)
```

**Why:** State machine is clearer to the player than a continuous meter. You're either fine, tired, burned out, or collapsed. Each state has discrete effects (×0.8, ×0.5, ×0.0 effectiveness). The buffer is the continuous variable that determines WHEN you transition.

**Alternative considered:** Continuous burnout meter (0-100) with gradual degradation → rejected because gradual degradation is invisible until it's too late. Discrete states create clear "you crossed a line" moments that teach.

### 4. Crisis slot tax as a new ConsequenceEffectDef type

**Choice:** Add `{ type: 'slotTax'; slots: number; reason: string }` to the existing `ConsequenceEffectDef` union type in crisis arc data.

**Why:** Crises already have a structured effects system. Adding a new effect type is minimal disruption. The crisis engine applies slot taxes each month an arc is in an active stage. Stacks across multiple concurrent crises.

**Alternative considered:** Hardcoding crisis slot costs in the calendar system → rejected because it couples calendar to specific arcs. The data-driven approach lets us tune per-arc and add new arcs without touching calendar code.

### 5. Actions inline on tiles, not in a separate panel

**Choice:** Remove NarrativePanel. Action buttons appear on TileDetailPanel and CharacterCards with slot costs displayed.

**Why:** Eliminates the "topic + target neighborhood" dropdown pattern. Every action is already contextualized by WHERE you are and WHO you're interacting with. Inline placement teaches: "this action happens HERE, with THIS person, and costs THIS much of your time."

**Alternative considered:** Keeping a calendar panel that aggregates all possible actions → rejected because it recreates the dropdown problem. The spatial model (actions live on tiles) is stronger.

### 6. Delegation as unlockable progression tiers

**Choice:** 4 tiers unlocked by game state thresholds (turn count, political will, trust, community-owned tiles). Each tier has budget cost + management overhead + net slot gain.

**Why:** Maps cleanly onto the game's existing stage progression (awakening → transition → restoration → beyond). Each tier teaches a leadership lesson: hiring costs management time; deputy makes autonomous decisions; community self-governance means letting go.

**Alternative considered:** Delegation as purchasable "projects" → partially adopted (Tier 1 hires ARE like projects with ongoing cost). But Tier 3-4 are narrative milestones, not purchases.

### 7. Strategic contacts as a gated social game

**Choice:** 5-stage pipeline: discovery → introduction → cooldown → follow-up → established. Gated by prerequisites (trust thresholds, project completions, meter thresholds). Cooldowns between stages enforce patience.

**Why:** Models real power-broker cultivation. You can't just "unlock" a funder — you need an introduction from someone who trusts you, then you need to prove yourself, then wait. This teaches that high-value relationships take TIME to build (the Dunbar tier structure in action).

**Alternative considered:** Static contact list unlocked by milestones → rejected because it doesn't model the RELATIONSHIP aspect. The pipeline creates a mini-game within the game.

### 8. Grace Lee Boggs as a mentor character with unique mechanics

**Choice:** Special mentor NPC. Available 1 slot/quarter. Yield: Vision (Overton shift) at 4.0 + Burnout Buffer at 3.0. LLM-powered conversations drawing from her actual philosophy. Unlocks when player pushes any taboo Overton topic past 30%.

**Why:** Grounds the mentor tier in Detroit's actual radical history. Her philosophy ("the most radical thing is to learn to let go") directly supports the delegation progression and the game's arc. She's not generic — she's GRACE.

**Alternative considered:** Generic "advisor" characters → rejected. This game is about Detroit specifically. The mentors should be Detroit legends.

## Risks / Trade-offs

**[Complexity spike]** → This is the largest system change since crisis arcs. Mitigation: Implement in phases — Phase 1 (calendar state + slot costs + inline actions), Phase 2 (burnout + diminishing returns), Phase 3 (delegation + strategic contacts + mentors), Phase 4 (calendar UI + election portrait).

**[Breaking saves]** → CalendarState replaces NarrativeState. Mitigation: Version bump to GameState v3 with migration function that converts old NarrativeState to CalendarState defaults.

**[Balance uncertainty]** → log₁₀ formula + slot costs + decay rates need playtesting. Mitigation: All numbers in a single tuning constants file. Expose a balance sandbox mode.

**[UI overwhelm]** → Calendar grid + inline actions + burnout warnings could be too much. Mitigation: Layer 1 (stamina bar) is all you need to play. Calendar grid is opt-in. Burnout only surfaces when you're close to threshold. Progressive disclosure.

**[LLM cost increase]** → More conversations per turn (actions are inline, tempting to talk more). Mitigation: The slot cost IS the rate limiter. You can only have ~20 conversations/month. Same LLM budget as before, just better allocated.

**[Forgotten commitment randomness]** → Players may feel frustrated by random missed meetings. Mitigation: Only triggers in BURNOUT state (player was warned). Show probability before committing. Allow "cancel" to prevent the miss (but still costs the slot).

## Migration Plan

1. Add `CalendarState` to types alongside `NarrativeState` (both exist temporarily)
2. Implement `src/systems/calendar.ts` with slot tracking, parallel to narrative.ts
3. Wire inline action buttons on tiles (alongside existing NarrativePanel)
4. Feature-flag: `useCalendarSlots` in game state. When true, use new system.
5. Once stable: remove NarrativeState, NarrativePanel, old narrative.ts
6. Save migration: v2 → v3 converts `narrativeState` to `calendarState`
7. Add burnout/decay/contacts in subsequent PRs

## Open Questions

1. **Exact slot counts**: 60 total / 38 fixed / 22 discretionary feels right directionally. Playtest needed.
2. **Seasonal variation**: Should summer have more outdoor event slots? Winter more indoor meetings? Or keep it constant for simplicity?
3. **Delegation budget costs**: $50K and $80K for hires — does this fit the existing budget economy (starting budget ~$2.8M)?
4. **Grace's unlock condition**: Overton topic > 30% works thematically. But what if player never pushes Overton? Should there be an alternate path?
5. **Election weight**: How much should calendar allocation data weigh vs. meter values in election outcome? 30%? 50%?
6. **Forgotten commitment UX**: Show the miss in real-time ("You forgot! -8 trust with Mike") or discover it next turn via event?
7. **Rest day political cost**: How much trust/will penalty for publicly resting? Is it always negative, or do some NPCs respect it?
