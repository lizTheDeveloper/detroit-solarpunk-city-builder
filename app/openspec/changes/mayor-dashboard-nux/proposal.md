## Why

Players currently get dumped into a complex system with 6 meters, crisis arcs, narrative actions, proposals, and policies — with no guidance on what matters or when. The AI playtest system prompt proves this: we had to write 100 lines of strategy explanation before Gemini could make competent decisions. Human players deserve at least that much.

Separately, even experienced players lack visibility into the future. Real mayors get regular briefings: project timelines, budget projections, upcoming deadlines. Our players are flying blind — they can't see when projects finish, what their meters will look like in 3 turns, or which consequences are approaching. This forces mental bookkeeping that isn't fun.

## What Changes

- **Mayor's Dashboard**: A persistent "briefing" panel showing project timelines, meter projections, upcoming events (foreshadow hints, elections, consequence triggers), and budget forecasts. Always accessible, updates each turn.
- **Timeline View**: Visual timeline of active projects (when they complete), scheduled events (elections, arc stages), and delayed consequence windows. Shows the next 6-12 turns at a glance.
- **Projections Engine**: Calculates where meters are heading based on current regen rates, active projects about to complete, and known drains. Shows "if nothing changes" trajectory.
- **Progressive Tutorial (NUX)**: First-game experience that introduces mechanics one at a time over the first ~10 turns, with contextual tooltips and constrained action space. Not a separate mode — just guardrails that fade as the player demonstrates competence.
- **Advisor Prompts**: Contextual one-liners from community leaders when the player might be making a mistake (ignoring a crisis, running out of budget, no eco projects active). Opt-out-able.

## Capabilities

### New Capabilities
- `timeline-view`: Visual timeline showing project completion dates, upcoming elections, foreshadow windows, and delayed consequence triggers. Scrollable 12-turn lookahead.
- `meter-projections`: Predictive engine calculating meter trajectories based on current state (regen rates, active project effects, known drains). Displays as sparkline or trend arrow per meter.
- `tutorial-progression`: Progressive disclosure system that constrains early-game complexity and introduces mechanics contextually. Tracks which mechanics the player has encountered and removes guardrails as competence is demonstrated.
- `advisor-prompts`: Context-sensitive guidance from in-game characters (leaders, staff) surfaced as brief messages when the player may be overlooking something important. Non-blocking, dismissable, learns what the player ignores.

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **UI**: New dashboard panel (likely a tab or slide-out), timeline component, projection sparklines on the meter bar, tooltip/overlay system for tutorial
- **State**: New fields for tutorial progression tracking (which mechanics introduced, which dismissed), advisor cooldowns
- **Systems**: New projections calculation module (reads current state, simulates forward without committing), tutorial gate logic
- **Data**: Advisor prompt content keyed to game conditions, tutorial step definitions
- **Performance**: Projections engine runs a lightweight forward simulation each turn — needs to be fast (no full resolve pipeline, just meter math)
