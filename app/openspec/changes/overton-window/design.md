## Context

The game already has a PublicOpinion system (`src/systems/narrative.ts`) with 5 topics: foodSovereignty, waterCommons, landReform, ecologicalRestoration, cooperativeEconomics. Opinion drifts down 2%/turn if no narrative action is taken. Education programs raise opinion on specific topics. This is the perfect foundation for an Overton window mechanic — the infrastructure exists, it just needs a new consumer (taboo solution gating).

The crisis-arc-engine (separate change) generates crisis fork events with choices. This change adds a new category of choice — taboo solutions — that appear in those forks but are locked until opinion reaches a threshold.

## Goals / Non-Goals

**Goals:**
- Taboo solutions visible but locked (player can SEE what's possible, creating desire to unlock)
- Public opinion as the unlock key (education/narrative work has tangible payoff)
- Social cost curve (early adoption is politically expensive, late adoption is free)
- Research papers surface as justification near unlock threshold
- Taboo topics specific to Detroit's real politics (humanure, nuclear, land expropriation, etc.)
- Opinion drift creates urgency (you can lose progress if you stop educating)

**Non-Goals:**
- Changing the existing opinion drift rate or narrative action values
- Making taboo solutions strictly better than normalized ones (tradeoffs still exist)
- Permanent unlocks (opinion can drift back below threshold, re-locking solutions)
- Player-discoverable taboo solutions (all are visible from the start, just locked)

## Decisions

### 1. Extend PublicOpinion with taboo-specific topics

The existing 5 topics are too broad for precise gating. Add sub-topics that map to specific taboo solutions:

```typescript
interface PublicOpinion {
  // Existing broad topics (keep as-is)
  foodSovereignty: number;
  waterCommons: number;
  landReform: number;
  ecologicalRestoration: number;
  cooperativeEconomics: number;
  
  // New taboo-specific topics
  nutrientRecycling: number;      // gates: humanure composting, biosolids
  nuclearEnergy: number;          // gates: salt reactors, SMRs
  landExpropriation: number;      // gates: eminent domain for community, land back
  decarceration: number;          // gates: prison labor alternatives, abolition-adjacent
  deGrowth: number;               // gates: planned economic contraction, consumption limits
}
```

Education programs target either broad or specific topics. Taboo solutions gate on the specific ones.

**Alternative considered:** Gate on broad topics only. Rejected because "foodSovereignty at 45" is too vague to mean "people accept humanure composting" — you need the specific sub-topic.

### 2. Three-tier social cost curve

```
Opinion:  0────────30──────────45──────────60──────────80────100
Status:   LOCKED   |  LOCKED   |  AVAILABLE |  CHEAPER  | NORMALIZED
                               |  (high cost)|          | (zero cost)
                               unlock threshold
```

- Below threshold: solution locked, visible but not selectable
- At threshold to threshold+15: available but costs trust (social cost penalty)
- At threshold+15 to threshold+35: available, reduced cost
- Above threshold+35: normalized, zero social cost (society accepted it)

Social cost formula: `trustPenalty = baseCost * max(0, 1 - (opinion - threshold) / 35)`

This means a taboo solution with unlock threshold 45 and base cost 5 trust:
- At opinion 45: costs 5 trust to choose
- At opinion 60: costs ~2.9 trust
- At opinion 80: costs 0 trust (normalized)

### 3. Research papers surface at threshold - 10

When opinion is within 10 points of the unlock threshold, the game surfaces the research papers that justify this solution. This creates a "the science is there, people just aren't ready" moment.

```
Opinion at 37, threshold at 45:
  "📚 New research available: Cordell et al. shows phosphorus recovery
   from human waste at 95% efficiency. Opinion needs to shift before
   this becomes politically viable."
```

This uses the research-corpus API from live-news-pipeline. Each taboo solution definition includes DOI links for its justifying papers.

### 4. Taboo solutions as a choice property, not a separate system

Taboo solutions aren't a new event type — they're a property on crisis fork choices:

```typescript
interface CrisisForkChoice {
  id: string;
  label: string;
  appeal: string;
  immediate: MeterDelta[];
  conditions_created: string[];
  delayed_consequences: DelayedConsequence[];
  
  // Overton window fields (null = normalized solution)
  taboo?: {
    opinionTopic: keyof PublicOpinion;  // which topic gates this
    unlockThreshold: number;            // minimum opinion to be available
    baseSocialCost: number;             // trust penalty at threshold
    justificationPapers: string[];      // DOI links
    tabooLabel: string;                 // what to show when locked
  };
}
```

This means the crisis-arc-engine doesn't need to know about the Overton window — it just defines choices, some of which have a `taboo` field. The Overton window mechanic reads that field and handles gating/costing.

### 5. Opinion shifting through targeted education

The existing `education_program` narrative action gains a `targetTopic` parameter. When targeting a taboo-specific topic (e.g., `nutrientRecycling`), it raises that specific opinion instead of the broad topic.

This creates a clear player path:
1. See locked taboo solution in crisis fork ("humanure composting" locked, needs nutrientRecycling > 45)
2. Spend narrative actions on education_program targeting nutrientRecycling
3. Watch opinion rise over turns (while fighting drift)
4. Solution unlocks, choose it (paying social cost)
5. If opinion keeps rising, social cost drops to zero

### 6. Visual design: locked but visible

Locked taboo solutions MUST be visible in crisis fork events. They show:
- The solution name and brief appeal text
- A lock icon with the gating topic and current progress
- "Requires: public acceptance of [topic] (currently 32/45)"
- Research paper links (if within 10 points of threshold)

This is essential — the player needs to see what's POSSIBLE so they're motivated to do the opinion work. Hidden solutions don't create desire.

## Risks / Trade-offs

- **Taboo framing may offend** → Calling real solutions "taboo" might feel judgmental. Mitigation: in-game framing is "politically difficult" or "requires public support" — the word "taboo" is internal terminology, not player-facing.
- **Opinion grinding** → Players might feel forced to spam education programs. Mitigation: opinion thresholds are achievable in 4-6 turns of focused effort. Multiple paths contribute (projects, events, coalition bonuses).
- **Re-locking frustration** → Opinion drift can re-lock solutions after unlock. Mitigation: once a solution is CHOSEN (not just unlocked), the choice is permanent regardless of later opinion drift. Drift only affects future availability.
- **Balance with normalized solutions** → If taboo solutions are clearly better, it punishes players who don't grind opinion. Mitigation: taboo solutions are different, not better. They unlock new paths but normalized solutions are never dead ends.
- **Topic proliferation** → Too many sub-topics makes the opinion system confusing. Mitigation: cap at 5-7 taboo-specific topics for launch. Broad topics still work for general narrative actions.

## Open Questions

- Should coalitions provide opinion bonuses toward specific taboo topics? (e.g., environmental coalition gives +2/turn to nutrientRecycling)
- Can propaganda frames from the propaganda-layer actively LOWER taboo-specific opinion? (antagonists running counter-campaigns against humanure, nuclear, etc.)
- Should there be a "discovered" state before "visible" — where truly radical solutions don't show until the player encounters them through papers or events?
