## Why

The current quarterly (seasonal) turn structure gives 16 turns per 4-year mayoral term. This is too compressed for crisis arcs to develop meaningfully — foreshadow, escalation, and crisis all happen in the span of a few turns. A real mayor operates on monthly cycles: council meetings, budget reports, project milestones. Monthly turns (48 per term) give crisis arcs room to breathe, delayed consequences time to land, and players more granular decision-making that matches how city governance actually works.

## What Changes

- Turn duration changes from 1 season (3 months) to 1 month
- 48 turns per 4-year term instead of 16
- Season is now derived from month (Jan-Mar: winter, Apr-Jun: spring, Jul-Sep: summer, Oct-Dec: fall)
- All per-turn meter effects scaled to ~1/3 current values (same total impact per year)
- Project durations multiplied by 3 (a "2 turn" project becomes "6 turns" = still 6 months)
- Election occurs at turn 48 instead of turn 16
- Crisis arc timing calibrated for monthly granularity (foreshadow 3-6 turns, escalation 4-8 turns)
- Narrative action refresh still per-turn (monthly meetings/campaigns feel natural)
- Seasonal effects apply once per 3 turns (when season changes) not every turn
- **BREAKING**: All test expected values need recalculation for new per-turn magnitudes

## Capabilities

### New Capabilities
- `monthly-calendar`: Turn-to-month/season/year mapping system. Tracks current month, derives season, handles year boundaries and election timing.

### Modified Capabilities

## Impact

- `src/systems/meters.ts`: All decay/growth rates divided by 3
- `src/systems/projects.ts`: Base durations multiplied by 3, per-turn progress unchanged
- `src/systems/climate.ts`: Seasonal effects fire once per season change (every 3 turns), not every turn
- `src/systems/narrative.ts`: Action count per turn unchanged (monthly narrative cadence is natural)
- `src/systems/resolve.ts`: Turn resolution logic unchanged, just operates on monthly ticks
- `src/state/types.ts`: Add `month: number` (1-12) to GameState, season becomes derived
- `src/state/create-game.ts`: Starting month configurable (default: January of current year)
- `src/data/content/project-catalog.ts`: All baseDuration values multiplied by 3
- All test files: Expected values recalculated
- Playtest scripts: Turn count expectations updated (32 turns = ~2.5 years, not 8 years)
