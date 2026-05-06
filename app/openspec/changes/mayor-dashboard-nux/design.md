## Context

The game currently surfaces information through: the meter bar (current values only), the tile list (active/completed projects per tile), the turn summary modal (deltas from last turn), and event popups (crisis forks, proposals). There is no forward-looking view. Players must mentally track: when their 3 active projects finish, what their budget will be next turn, whether they're on track for stage advancement, and when crisis consequences might fire.

The tutorial problem is simpler: there isn't one. New games start with full complexity exposed. The AI playtest system prompt serves as a de facto tutorial document — it explains stage progression, action types, crisis mechanics, and strategy. This needs to become a progressive in-game experience.

The game is React (Vite, TypeScript), state managed via `useReducer`-style pattern with a pure `gameReducer`. UI components read from `GameState` via context. No server — everything client-side except the optional pipeline API for arc initialization.

## Goals / Non-Goals

**Goals:**
- Player can see project completion timelines without mental arithmetic
- Player can see meter trajectories ("will I reach eco 55% in time?")
- Player knows when elections, consequences, and arc events are approaching
- First-time players learn mechanics progressively without reading a manual
- Experienced players can dismiss/hide tutorial affordances permanently
- Dashboard information is always accurate (derived from state, not cached)

**Non-Goals:**
- AI-generated advice or strategy suggestions (that's what the advisor system is for later)
- Multiplayer dashboards or shared state
- Detailed simulation ("what if I start this project?") — just current trajectory
- Replacing the existing turn summary — dashboard is persistent, summary is per-turn
- Mobile-optimized layout (desktop-first for now)

## Decisions

### 1. Projections as pure function, not state

**Decision**: Projections are calculated on-demand from current GameState, not stored in state.

**Why**: Projections change every turn and depend on the full state. Storing them would mean updating them in every reducer path. A pure function `calculateProjections(state): Projections` keeps it simple and always accurate.

**Alternative considered**: Memoized selector pattern (recompute only when inputs change). Worth adding if perf becomes an issue, but the calculation is lightweight — just meter math over 12 turns without the full resolve pipeline.

### 2. Timeline as a horizontal swimlane component

**Decision**: Timeline view shows horizontal time axis (turns) with swimlanes for: active projects, scheduled events, foreshadow windows, election. Each item is a bar or marker positioned by turn.

**Why**: This is the standard Gantt-like pattern that's immediately readable. Players see overlap, density, and gaps at a glance. The 12-turn window means it fits on screen without scrolling for the common case.

**Alternative considered**: Vertical list sorted by completion date. Simpler to build but loses the "what's happening simultaneously" insight.

### 3. Tutorial as state machine with feature gates

**Decision**: Tutorial progression is a flat array of "steps" in GameState. Each step has: an `id`, a `trigger` condition (game state predicate), an `introduced` boolean, and optional `constrainActions` (which action types are available). Steps unlock when their trigger fires.

**Why**: This avoids branching tutorial paths (combinatorial explosion). Linear progression with conditional triggers means the tutorial adapts to player pace without complex logic. The constraint system uses the same `GameAction` types the reducer already understands.

**Alternative considered**: Modal tutorial screens before gameplay. Rejected — breaks flow, players skip them, and they can't reference live game state.

**Step sequence:**
1. `start-project` — triggered T1. Only action: start a project. Tooltip on project list.
2. `read-meters` — triggered after first END_TURN. Highlight meter changes. No constraint.
3. `proposals` — triggered when first proposal arrives (~T3). Tooltip on proposal panel.
4. `narrative-actions` — triggered T5 or when trust drops below 45. Unlock narrative panel.
5. `crisis-foreshadow` — triggered on first foreshadow hint. Tooltip explaining arc system.
6. `crisis-fork` — triggered on first crisis event. No constraint (player must choose).
7. `policies` — triggered at transition stage. Unlock policy panel.
8. `election-prep` — triggered at T40. Tooltip on election forecast.
9. `tutorial-complete` — triggered when all above are introduced. Remove all guardrails.

### 4. Advisor prompts as character-voiced condition checks

**Decision**: Advisors are existing community leaders speaking in-character. Each advisor "watches" a condition and fires a one-liner when it's met. Max 1 advisor prompt per turn. Player can dismiss permanently ("don't tell me this again") which adds the condition ID to a dismissed set.

**Why**: Using existing characters (Marcus, Doña Rosa, etc.) makes the advice feel like part of the world, not a game system. One per turn prevents spam. The dismiss mechanic respects player agency.

**Trigger examples:**
- Marcus (eco focus): "No ecology projects active and eco is decaying" → "We're losing ground every month we don't have something growing."
- Doña Rosa (trust): "Trust below 40" → "People are starting to wonder if you're listening."
- Council context: "Election in 8 turns and approval below 50%" → "You might want to think about your re-election chances."

### 5. Dashboard as a persistent left-panel tab

**Decision**: Dashboard lives as a tab in the existing content area (alongside tiles, characters, policies). Not a modal or overlay.

**Why**: It's reference information you glance at, not a workflow. A tab means it's always one click away but doesn't obscure the game. It can coexist with the tile detail panel on the right.

**Alternative considered**: Always-visible bottom bar. Rejected — too much screen real estate for information you check intermittently.

## Risks / Trade-offs

**[Projections accuracy] → Simplified model**
The projection engine won't run the full resolve pipeline (too expensive, has randomness). It'll use a simplified model: current regen rates + known project completions + known drains. This means projections won't account for counter-narratives, random events, or cascading feedback loops. Mitigation: label projections as "trend" not "forecast", use dashed lines to convey uncertainty.

**[Tutorial feels patronizing] → Quick escape hatch**
Experienced players (or players who read the manual) shouldn't be forced through 10 turns of hand-holding. Mitigation: "Skip tutorial" button visible from T1. Also, tutorial steps auto-complete if the player performs the action before the step triggers (proving they already know).

**[Advisor prompt fatigue] → Aggressive cooldowns**
Even one prompt per turn can feel naggy if it's always the same thing. Mitigation: each condition has a cooldown (won't fire again for 8 turns after dismissal). The "don't tell me again" option permanently silences that specific check.

**[Timeline clutter with many active arcs] → Visual hierarchy**
With 5 arcs + 3 projects + election + consequences, the timeline could be overwhelming. Mitigation: color-code by category, collapse resolved arcs, only show consequences the player has been foreshadowed about (not hidden ones).

**[Tutorial state adds to GameState size] → Minimal footprint**
Tutorial tracking is just `{ currentStep: string, dismissed: string[], completed: string[] }`. Negligible size impact. Excluded from save files if the player has completed the tutorial.

## Open Questions

- Should projections show a "best case / worst case" band, or just the single trend line?
- Should the timeline be interactive (click a project to see details) or read-only?
- Do we want tutorial progression to persist across games, or reset each new game?
- Should advisor prompts have a "tell me more" option that opens a longer explanation?
