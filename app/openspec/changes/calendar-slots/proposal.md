## Why

The current action system (3-4 flat "narrative actions" per turn) doesn't model the actual constraint of political leadership: **time**. Every action costs the same, there's no trade-off between breadth and depth of relationships, no consequence for overcommitting, and no mechanical connection between crises consuming your bandwidth and your ability to respond. The game tells players that "community meetings build trust" but never teaches them WHY leaders burn out, WHY relationships decay, or WHY prevention matters more than response.

A Dunbar's Number-based calendar slot system replaces the flat action economy with a time-budget that models real relationship maintenance, logarithmic resource flows per interaction type, diminishing returns, overschedule/burnout mechanics, and crisis-as-time-theft. This makes every project's ROI measurable in saved calendar slots (a rain garden isn't "Eco +8" — it's "28 fewer crisis slots over your term"), and teaches actual leadership through mechanics rather than text.

## What Changes

- **BREAKING**: Replace `NarrativeState` (actionsRemaining, actionsPerTurn) with `CalendarState` (totalSlots, fixedSlots, discretionary, spent, burnoutBuffer, interactionsThisTurn, cooldowns)
- **BREAKING**: Remove the "Actions" tab/panel. Actions move inline to neighborhood tile views and character cards.
- **BREAKING**: Replace flat `NarrativeActionType` cost (all = 1 action) with per-action slot costs (1-3 slots depending on action type)
- Add calendar slot visualization: abstract stamina bar (always visible) + expandable monthly calendar grid + election-time year view
- Add overschedule/burnout progression: sustainable → overextended (-20% effectiveness, -2 slots next month) → burnout (-50%, forgotten commitments, trust penalties) → collapse (hospitalization, 0 slots next month)
- Add burnout buffer as hidden-until-critical meter, sourced from emotional support interactions (community leaders, mentors, cultural events, rest)
- Add diminishing returns per person per month: yield = log₁₀(base_multiplier / meetingCount²) × relationship_depth
- Add crisis slot tax: each active crisis arc stage consumes fixed discretionary slots per month
- Add delegation progression (Tier 0-4): solo mayor → first hire → deputy → community self-governance → movement
- Add strategic contact cultivation system: discovery → introduction → cooldown → follow-up → established → deepening
- Add Grace Lee Boggs as mentor character (1 slot/quarter, Vision + Burnout Buffer yield at log(10000) = 4.0)
- Add relationship maintenance decay: relationships not visited within their frequency threshold lose trust/disposition
- Add burnout effects on LLM conversations: system prompt reflects mayor's exhaustion state, NPCs respond to burned-out mayor differently
- Add calendar-as-narrative: monthly summary shows time allocation, election uses 48-month time portrait as voter evaluation
- Add "rest day" mechanic: deliberately burning a slot for nothing gives burnout buffer recovery, at political cost

## Capabilities

### New Capabilities
- `calendar-state`: Core calendar slot state management — total/fixed/discretionary/spent tracking, overschedule detection, month transitions, slot cost per action type
- `burnout-system`: Burnout buffer meter, overextended/burnout/collapse state machine, effectiveness modifiers, forgotten commitment generation, recovery mechanics
- `relationship-maintenance`: Frequency-based relationship decay, maintenance slot requirements per tier, decay notifications, pruning mechanics
- `strategic-contacts`: Contact cultivation pipeline (discovery → established), cooldowns, prerequisite gating, deepening progression, door-close mechanics
- `delegation-progression`: Hire/deputy/self-governance/movement tiers, fixed obligation reduction, management cost, deputy autonomous decisions
- `calendar-ui`: Visual calendar component (abstract bar + monthly grid + year heatmap), slot fill animations, crisis/burnout indicators, election portrait
- `crisis-slot-tax`: Per-arc per-stage slot consumption, cascading crisis bandwidth squeeze, prevention ROI display
- `mentor-characters`: Grace Lee Boggs + other mentor NPCs, quarterly meeting cadence, Vision/Overton/burnout-buffer yields at transformative scale

### Modified Capabilities
- `narrative-actions`: **BREAKING** — Actions no longer live in a separate panel or cost a flat "1 action." They appear inline per tile/character with variable slot costs. The `NarrativeActionType` union and `applyNarrativeAction` system are replaced by calendar-slot-aware action dispatch.
- `crisis-arcs`: Each arc stage gains a `slotTax` field specifying discretionary slots consumed while active. Crisis effects now include time theft, not just meter damage.
- `llm-conversations`: System prompt gains burnout-state context. Characters respond differently to exhausted mayor. Diminished trust yields when overextended/burned out.
- `proposals`: Reviewing a proposal costs 1 calendar slot. Proposal cards show "crisis slots prevented" alongside other effects.
- `elections`: Voter evaluation incorporates 48-month time allocation heatmap per neighborhood. Opponents weaponize calendar data in attack events.

## Impact

**State**: `GameState.narrativeState` replaced with `GameState.calendarState`. New fields for burnout buffer, interaction history, strategic contacts, delegation tier. `GameState.mentors` added.

**Systems**: `src/systems/narrative.ts` → `src/systems/calendar.ts`. New: `src/systems/burnout.ts`, `src/systems/relationship-decay.ts`, `src/systems/strategic-contacts.ts`, `src/systems/delegation.ts`.

**UI**: `NarrativePanel.tsx` removed. New: `CalendarBar.tsx` (stamina bar), `CalendarGrid.tsx` (monthly view), `CalendarYear.tsx` (election view). Tile panels and character cards gain inline action buttons with slot costs. Burnout warning overlays.

**Data**: New character data for Grace Lee Boggs and other mentors. Crisis arc definitions gain `slotTax` per stage. Action definitions gain slot costs and resource yield matrices.

**Reducer**: All action dispatch paths gain slot-cost deduction. New action types for overschedule, rest day, delegation hire, strategic contact cultivation stages.

**Tests**: ~200 lines of narrative tests become calendar tests. New test suites for burnout state machine, diminishing returns formula, decay calculations, delegation unlocks.
