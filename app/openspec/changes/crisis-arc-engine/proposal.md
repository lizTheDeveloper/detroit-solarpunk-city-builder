## Why

The current event system generates isolated climate events with no memory or escalation. Real crises don't work that way — they foreshadow, compound, and create dependency webs. The crisis arc engine replaces one-shot events with multi-turn arc structures that progress from foreshadow to crisis based on real-world headline data from the live-news-pipeline. Players don't know they're in a chain until it's too late to avoid consequences cheaply. Early choices create named conditions (dependencies/capacities) that gate or unlock future options.

## What Changes

- New arc progression system: dormant → foreshadow → escalation → crisis → reckoning (driven by live headline data)
- Dependency web tracking: player choices create named conditions that persist and affect future event availability
- Capacity tracking: infrastructure/social capacity built by projects determines what crisis responses are possible
- Delayed consequences: choices made during foreshadow/escalation resolve 3-8 turns later
- Crisis fork events: present 2-3 choices where both/all sides look genuinely appealing with real tradeoffs
- Reckoning events: unavoidable consequences that manifest based on accumulated dependency state
- Existing `generateClimateEvent` becomes one input source feeding into arc-aware event generation
- Event cooldown system extended to support arc-level cooldowns (not just per-event-type)

## Capabilities

### New Capabilities
- `arc-progression`: State machine governing arc lifecycle from dormant through reckoning. Driven by headline arc-state from live-news-pipeline. Each arc tracks its phase, accumulated player choices, and pending delayed consequences.
- `dependency-web`: Named conditions created by player choices (e.g., "accepted_dte_grid_plan", "has_community_solar", "sued_polluter"). Conditions persist across turns and gate/unlock future event choices.
- `delayed-consequences`: Queue of future effects scheduled by current choices. Each consequence has a trigger turn, conditions for activation, and meter/tile effects. Players see foreshadow hints but not exact timing.
- `crisis-fork-events`: Multi-choice event cards generated when arcs reach escalation/crisis phase. Choices are generated from arc templates with both sides presenting genuine appeal. Replaces simple climate event choices.
- `arc-templates`: Configuration-driven arc definitions. Each template specifies: escalation thresholds, crisis fork structures, dependency conditions created by each choice path, consequence schedules, and antagonist framing.

### Modified Capabilities

## Impact

- `src/systems/climate.ts`: `generateClimateEvent` wrapped by arc-aware layer that checks arc state before generating
- `src/systems/resolve.ts`: Turn resolution gains delayed consequence processing step
- `src/state/types.ts`: GameState extended with dependency web, delayed consequence queue, and active arc tracking
- Depends on `live-news-pipeline` for arc-state data (headline hit counts, severity signals)
- Event queue system extended to handle arc-generated events alongside existing event types
- Existing climate events continue working for non-arc-covered scenarios
