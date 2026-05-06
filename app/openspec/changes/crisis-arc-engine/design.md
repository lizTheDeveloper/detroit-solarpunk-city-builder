## Context

The city builder has a working climate event system (`src/systems/climate.ts`) that generates isolated one-shot events per turn based on climate pressure and season. These events have 3 choices but no memory — nothing from turn 5 affects what happens on turn 12. The live-news-pipeline (separate change) provides real-time arc state data showing which real-world crisis arcs are active and at what severity.

This engine sits between the headline data and the player-facing event system. It transforms "energy-grid arc is at escalation stage" into concrete in-game events with choices that create lasting consequences.

## Goals / Non-Goals

**Goals:**
- Arc-driven event generation that respects real-world crisis timelines
- Dependency web that makes early choices matter for late-game options
- Delayed consequences that surprise players (foreshadowed but not telegraphed)
- Antagonists with genuine logic — choices where both sides are appealing
- Existing climate events continue to work for non-arc scenarios
- Arc templates configurable without code changes

**Non-Goals:**
- The propaganda/framing layer (how choices are presented — separate change)
- The Overton window / taboo solution mechanic (separate change)
- LLM generation of event text at runtime (events use pre-authored template text)
- Procedural generation of entirely new arcs (arcs are designed, content is live)

## Decisions

### 1. Arc state machine with headline-driven transitions

Each arc follows: `dormant → foreshadow → escalation → crisis → reckoning → resolved/dormant`

Transitions are driven by the live-news-pipeline arc-state data:
- `dormant → foreshadow`: First classified headline appears for this arc
- `foreshadow → escalation`: Weekly hits exceed threshold OR a severity-3 headline appears
- `escalation → crisis`: Player ignores escalation for N turns OR headline severity stays at 3
- `crisis → reckoning`: Fixed delay after crisis (consequences land)
- `reckoning → resolved`: Consequences applied, arc either resolves or cycles back to dormant

The player CAN prevent escalation by taking proactive action during foreshadow/escalation. This is the core tension — act early when it's cheap and uncertain, or wait for confirmation when it's expensive and forced.

### 2. Dependency web as a flat condition set

Dependencies are simple string tags stored in a `Set<string>` on GameState. Choices add or remove tags. Future event availability checks tag presence.

```typescript
interface DependencyWeb {
  conditions: Set<string>;        // e.g., "accepted_dte_grid_plan", "has_community_solar"
  capacities: Map<string, number>; // e.g., "grid_resilience": 3, "food_processing": 1
}
```

No complex graph structure. Tags are flat, queryable, and trivially serializable. The "web" emerges from arc templates referencing each other's conditions — template A creates condition X, template B gates a choice on condition X existing.

**Alternative considered:** Full directed graph with typed edges. Rejected — over-engineered for the actual query patterns (which are all "does condition X exist?" or "is capacity Y >= threshold?").

### 3. Delayed consequences as a priority queue

A min-heap sorted by trigger turn. Each turn, `resolve.ts` pops all consequences where `triggerTurn <= currentTurn` and applies them.

```typescript
interface DelayedConsequence {
  id: string;
  arcId: string;
  triggerTurn: number;           // when it fires
  activationConditions: string[]; // all must be present in dependency web
  cancelConditions: string[];     // if any present, consequence is cancelled
  effects: ConsequenceEffect[];   // meter deltas, tile damage, event generation
  foreshadowHint: string;        // shown to player N turns before trigger
  hintTurnsBeforeTrigger: number; // when to show the hint
}
```

A consequence can be **cancelled** if the player takes action between scheduling and triggering. This is the "you can still prevent it" window. The player sees a vague hint ("infrastructure strain is building...") but doesn't know the exact turn or magnitude.

### 4. Crisis fork events generated from arc templates

When an arc reaches escalation or crisis, the engine generates an event card from the arc template. Templates define 2-3 choice paths, each with:
- Immediate effects (budget, trust, etc.)
- Dependency conditions CREATED by this choice
- Delayed consequences SCHEDULED by this choice
- Which antagonist/faction this aligns with

The choices are designed so both sides look genuinely appealing:

```yaml
# In arc template config
energy_grid_crisis:
  choices:
    - id: support_dte_plan
      label: "Support DTE Grid Modernization"
      appeal: "200 union jobs, grid reliability, federal matching funds"
      immediate: { budget: -0.3, trust: +2 }
      creates_conditions: ["accepted_dte_grid_plan", "union_support"]
      schedules:
        - effect: { budget: -0.5 }  # rate hikes hit later
          delay: 6
          hint: "Energy costs are rising..."
    - id: community_solar
      label: "Counter-Propose Community Solar"
      appeal: "Cheaper per-kWh, local ownership, energy independence"
      immediate: { budget: -0.2, trust: -1 }
      creates_conditions: ["community_solar_proposal"]
      removes_conditions: ["union_support"]
      schedules:
        - effect: { politicalWill: -3 }  # union opposition
          delay: 3
          hint: "Labor groups are organizing..."
```

### 5. Antagonists as arc-associated factions, not global villains

Each arc has 1-2 associated antagonist factions. They're not evil — they have employees, obligations, and genuine arguments. Their opposition to the player is structural, not personal.

Antagonists don't have separate AI. They manifest through:
- Which propaganda frame surfaces (propaganda-layer change)
- Counter-narrative probability modifiers
- Delayed consequences that represent their structural power
- Lobby pressure as a condition check ("if dte_lobby_active AND NOT community_solar_built → trust -2/turn")

### 6. Integration with existing event system

The arc engine WRAPS the existing event generation, it doesn't replace it:

```
Turn resolution order (in resolve.ts):
1. ...existing steps...
2. Process delayed consequence queue (pop triggered consequences)
3. Check arc states from live-news-pipeline
4. For any arc at escalation/crisis: generate crisis fork event (if not on cooldown)
5. Existing generateClimateEvent runs for non-arc-covered weather events
6. ...remaining steps...
```

Arc-generated events go into the same `eventQueue` as existing events. The player sees them through the same UI. No parallel event system.

## Risks / Trade-offs

- **Arc template authoring burden** → Still requires human design of choice structures and consequence schedules. Mitigation: start with 3-5 well-designed arcs, expand based on which real-world topics are generating headlines.
- **Dependency web complexity** → Many conditions interacting could create unexpected states. Mitigation: each arc template documents which conditions it reads/writes. Test arcs in isolation and combination.
- **Delayed consequence surprise vs fairness** → If consequences are too surprising, players feel cheated. If too telegraphed, no tension. Mitigation: always show a vague hint 2-3 turns before trigger. The hint doesn't reveal magnitude or exact timing.
- **Arc pacing mismatch** → Real-world arc might escalate faster than game turns allow player response. Mitigation: arcs have a minimum-turns-per-stage floor (can't skip foreshadow in 1 turn even if headlines spike).
- **Dependency on live-news-pipeline** → If pipeline is down, arcs can't transition. Mitigation: manual override for arc state; arcs also have time-based fallback transitions (if no headline data for 48h, use conservative escalation schedule).

## Open Questions

- Should arcs be able to interfere with each other? (e.g., energy crisis makes water crisis responses more expensive because budget is strained) — leaning yes, via shared dependency conditions
- Maximum number of simultaneously active arcs? 2-3 feels manageable for player attention
- Can a resolved arc re-trigger if reality re-escalates? Probably yes, with a cooldown
