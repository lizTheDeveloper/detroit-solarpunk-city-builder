## Context

Current turn structure: 4 turns/year (one per season), 16 turns per mayoral term, election at T16. Each turn represents 3 months of game time. This was set early in development for fast iteration but is now too coarse for the crisis arc system (which needs foreshadow → escalation → crisis to feel gradual) and for delayed consequences (which need to land months after a choice, not years after).

A real Detroit mayor's calendar: monthly council meetings, monthly budget reports, quarterly milestones, annual state of the city. Monthly is the natural action cadence.

## Goals / Non-Goals

**Goals:**
- 48 turns per term (monthly resolution)
- All existing balance ratios preserved (same total meter change per year, just spread over 12 turns instead of 4)
- Season derived from month, seasonal effects fire at season transitions
- Crisis arcs calibrated for monthly granularity
- Minimal refactor surface (change the tick rate, scale the numbers, keep the architecture)

**Non-Goals:**
- Changing the number of player actions per turn (still 1-4 narrative actions, still can start projects)
- Adding day-level granularity (monthly is sufficient)
- Changing election mechanics (still one election per term, just at T48 not T16)
- Reworking the project system beyond duration scaling

## Decisions

### 1. Simple scalar transformation (divide by 3)

Every per-turn rate gets divided by 3. The game plays identically at macro level — same total trust gained per year, same total eco growth, same budget trajectory. Just more granular steps.

```
CURRENT (quarterly):          MONTHLY:
Trust decay: -0.3/turn        → -0.1/turn
Food bonus: +0.03/turn        → +0.01/turn  
Budget revenue cap: 0.10/turn → 0.033/turn
Project trust: +6/completion  → +6/completion (unchanged — projects still complete discretely)
```

Project completion effects stay the same (a project finishing is a discrete event). Only continuous per-turn effects get scaled.

### 2. Season as derived property

```typescript
function getSeason(month: number): Season {
  if (month >= 1 && month <= 3) return 'winter';
  if (month >= 4 && month <= 6) return 'spring';
  if (month >= 7 && month <= 9) return 'summer';
  return 'fall'; // 10-12
}

function isSeasonTransition(prevMonth: number, currentMonth: number): boolean {
  return getSeason(prevMonth) !== getSeason(currentMonth);
}
```

Seasonal effects (spring eco bonus, summer drought, fall harvest, winter heating costs) fire ONLY on season transitions — months 1, 4, 7, 10. Not every turn.

### 3. Election at turn 48, warning starts at turn 36

Current: election at T16, warning at T10 (6 turns early).
Monthly: election at T48, warning at T36 (12 turns early = 1 year before election).

Election formula unchanged — still based on trust, coalitions, gentrification. Just more time to prepare and more time for consequences to manifest before the vote.

### 4. Project durations × 3

A rain garden that took 2 turns (6 months) now takes 6 turns (still 6 months). A maker space that took 3 turns (9 months) now takes 9 turns. Calendar time unchanged, turn count tripled.

### 5. Climate events: probability per month, not per season

Climate event probability currently runs once per turn (quarterly). In monthly mode, it still runs once per turn but the probability is divided by 3 (same expected events per year). Alternatively, keep probability the same but only roll on season boundaries — simpler, same result.

Decision: roll only on season transitions (every 3 turns). Keeps existing probability math intact.

### 6. "Game always begins today" anchored to real month

New games start at the current real-world month. If you start playing in May 2026, turn 1 is May 2026. This aligns the in-game calendar with reality, making headline integration seamless — a May headline surfaces in your May turn.

## Risks / Trade-offs

- **Test recalculation burden** → Many tests have hardcoded expected values. Mitigation: do a bulk find/replace pass on test assertions, or parameterize key constants.
- **Gameplay feels slower** → More turns to reach milestones. Mitigation: projects complete at same calendar pace, just more turns between completions. Player still sees progress every turn via meter ticks.
- **Action overflow** → 48 turns × 2-4 narrative actions = 96-192 total narrative actions per term. Could make opinion-shifting too easy. Mitigation: may need to reduce actions-per-turn or increase opinion drift to compensate. Monitor in playtest.
- **Existing playtest data invalid** → All prior playtest reports (T16 election, etc.) no longer apply. Mitigation: acceptable — we're rebalancing anyway.

## Open Questions

- Should narrative actions be per-turn (monthly) or should some cadence be biweekly/weekly within a month-turn? Leaning monthly is fine — one council meeting, one campaign push, one outreach session per month is realistic.
- Should budget income/expenses be monthly or keep quarterly (fire every 3 turns)? Leaning monthly — real municipal budgets account monthly.
