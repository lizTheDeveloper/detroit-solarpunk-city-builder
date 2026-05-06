## Context

The live-news-pipeline classifies headlines by arc and severity. The crisis-arc-engine defines antagonist factions per arc. This layer bridges them: it takes classified headlines and generates the interpretive spin that each faction would put on those facts. The game then shows players not just "what happened" but "how it's being talked about" — which is how people actually experience news.

Memeorandum already clusters coverage from multiple outlets around the same story. This natural clustering provides ground truth for how different outlets frame the same event. The LLM uses these clusters as few-shot examples of real framing patterns.

## Goals / Non-Goals

**Goals:**
- Pre-generate 2-3 interpretation frames per headline in the hourly batch job
- Ground frames in real coverage patterns (memeorandum clusters, real PR language)
- Select which frame surfaces based on game state (what threatens the active antagonist)
- Make antagonist arguments genuinely compelling (not straw men)
- Frames reference real institutions, real dollar amounts, real stakeholders

**Non-Goals:**
- Runtime LLM calls (all frames pre-generated in batch)
- Generating fake headlines or fabricating events (framing real events, not inventing)
- Player-generated content moderation (players don't create frames)
- Balancing frames for "fairness" (the game IS the critical lens — community frame is the player's home base)

## Decisions

### 1. Three frame archetypes per headline

Every classified headline gets three frames generated:

- **Establishment**: How the incumbent power structure presents this (DTE PR, city government press release, industry trade group language). Emphasizes stability, jobs, investment, risk of change.
- **Community**: How grassroots organizations frame it (Soulardarity language, mutual aid framing, sovereignty framing). Emphasizes justice, self-determination, historical context of harm.
- **Market**: How financial/business press covers it (Crain's Detroit style, investor language, cost-benefit framing). Emphasizes efficiency, ROI, market signals, property values.

Not all three are always relevant. The LLM can return `null` for a frame that doesn't apply (e.g., a hyper-local community garden story probably doesn't have a market frame worth generating).

### 2. Frame generation prompt structure

```
System: You generate propaganda frames for a Detroit-focused city building game.
Given a real headline, generate how different factions would interpret/spin it.
Ground your frames in real institutional language — these should sound like
actual press releases, editorials, and public statements.

The frames should be 1-2 sentences each. They are NOT neutral summaries —
they are opinionated interpretations that serve the faction's interests.

Antagonist context for this arc: {antagonist_config}
Memeorandum cluster (related coverage): {cluster_links}
```

The prompt includes the antagonist definition from the arc template so frames are arc-aware. DTE's energy frame is different from a developer's housing frame.

### 3. Frame selection at game runtime (no LLM)

The game client receives all pre-generated frames via the headline API. Selection logic runs client-side:

```typescript
function selectFrame(headline: ProcessedHeadline, gameState: GameState): Frame {
  const activeArcs = getActiveArcs(gameState);
  const antagonists = activeArcs.flatMap(a => a.antagonists);
  
  // If an antagonist is active for this headline's arc, show establishment frame
  if (antagonists.some(a => headline.arcs.includes(a.arcId))) {
    // But ADAPT: if player has already countered this antagonist,
    // show the market frame (they shift strategy)
    if (gameState.dependencyWeb.hasCondition(`countered_${antagonist.id}`)) {
      return headline.frames.market;
    }
    return headline.frames.establishment;
  }
  
  // Default: community frame (player's home base perspective)
  return headline.frames.community;
}
```

This means the same headline shows up differently for players at different game states. A player who accepted DTE's grid plan sees community push-back framing. A player who rejected it sees DTE's escalated PR response. No runtime LLM needed — just picking from pre-generated options.

### 4. Antagonist voice profiles as prompt context

Each antagonist in the arc template config includes a `voiceProfile`:

```yaml
antagonists:
  dte_energy:
    name: "DTE Energy"
    voice_profile: |
      Tone: Corporate responsibility, measured concern, future-focused.
      Key phrases: "grid modernization", "reliable service", "rate base investment",
      "customer choice", "clean energy transition".
      References: quarterly earnings language, PSC filings, union partnership.
      Real example: "DTE's $9B grid investment plan will create 2,000 jobs
      while improving reliability for 2.2M customers."
    genuine_argument: "11,000 employees depend on this company. 2.2M ratepayers
      need reliable power. The grid is genuinely aging. Someone has to pay for upgrades."
    who_depends_on_them: "Union workers (IBEW Local 17), ratepayers on fixed incomes,
      municipal bond holders, pension funds"
```

This profile is injected into the frame generation prompt so the establishment frame sounds like DTE actually sounds — not a cartoon villain.

### 5. Memeorandum clusters as grounding data

When a headline has related memeorandum cluster links, those are included in the generation prompt as examples of real framing. The LLM sees "here's how Fox Business covered this, here's how Detroit Free Press covered this" and generates frames that pattern-match to those real editorial stances.

If no cluster is available (headline came from theblue.report with no memeorandum match), the LLM falls back to the voice profile alone.

## Risks / Trade-offs

- **Frame quality variance** → LLM might generate weak or off-brand frames. Mitigation: voice profiles with specific example language; confidence scoring in output; discard low-confidence frames and use static fallback.
- **LLM cost multiplication** → 3 frames per headline is 3x the classification cost. Mitigation: only generate frames for severity 2+ headlines (severity 1 background items just show raw headline). Estimated additional cost: $1-3/day.
- **Antagonist framing too sympathetic** → If frames are too good, players might side with antagonists. This is actually the GOAL — both sides should be genuinely appealing. The game's mechanics (dependency web consequences) reveal the structural truth over time.
- **Stale frames** → Pre-generated frames don't adapt to player's specific situation in real-time. Mitigation: frame selection logic handles the adaptation; 3 pre-generated options covers the main game states.
- **Propaganda term may confuse players** → Some might think the GAME is propagandizing them. Mitigation: in-game framing as "what people are saying" or "how it's being reported" — the mechanic is transparent about showing multiple interpretations.

## Open Questions

- Should frames include fake attribution ("— DTE spokesperson") or just be presented as faction perspective without pretending to quote a specific person?
- Should the community frame always be available or only when the player has community trust above a threshold?
- How do frames interact with the Overton window mechanic? (Does seeing the establishment frame repeatedly shift opinion toward establishment positions?)
