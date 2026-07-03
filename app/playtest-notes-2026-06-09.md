# Solarpunk Detroit — Playtest Notes (2026-06-09)

Run on the **corrected** harness (MUL-6994: `prepareTurn` slot-reset fix) **with** the
balance change (MUL-6993: calendar visits build leader trust). Benchmark instrument:
`scripts/monte-carlo.ts` + `scripts/bench-llm.ts`.

> ⚠️ Supersedes the 2026-06-08 notes. Those were computed on a buggy harness where calendar
> slots never reset after turn 1, so agents only acted on turn 1. All "LLMs under-spread the
> calendar / nothing beats do-nothing" conclusions from that run were **artifacts** and are
> corrected below.

## Headline: the game now rewards engagement

Monte-Carlo, 200 runs × 48 turns:

| Rank | Archetype | Score | leaderAdvocates | Eco | Food |
|---|---|---|---|---|---|
| 1 | eco-first | 76.1 | 16.6 | 40 | 85 |
| 2 | equity-organizer | 74.4 | 15.1 | 28 | 85 |
| 3 | overscheduler | 68.2 | — | 27 | 82 |
| 4 | justice-first | 64.9 | — | 20 | 85 |
| 5 | trust-builder | 62.6 | — | 13 | 85 |
| 6 | **neglectful** | **62.0** | **0** | 0 | 20 |
| 7 | random | ~37 | — | 0 | 30 |

Doing nothing fell from #1 to #6. The lever is the now-live **leaderAdvocates** channel:
calendar visits build leader trust → leaders cross trust 40 → +3 election pts each.

## LLM benchmark (Groq, 3 games × 48 turns)

| Model | Score (was, buggy) | Survival | leaderAdvocates | Notes |
|---|---|---|---|---|
| groq-gpt-oss-120b | **65.0** (was 42.8) | 100% | 8.0 | **Beats the do-nothing baseline (62).** Converts ~2.7 leaders into advocates. |
| groq-qwen3-32b | 56.8 (was 39.7) | 100% | **0.0** | Spreads the calendar (+4 equity) but never concentrates visits enough to convert any leader. The real capability gap. |

Both models survive 100% (was 67% loss — an artifact). gpt-oss now plays the calendar game
competently; qwen's weakness is specifically *relationship conversion*, not slot usage.

## Standing issues (real, on the corrected harness)

1. **Nobody ever wins.** 0% win rate across all archetypes and both LLMs at **48 and 96 turns**.
   Every engaged strategy *survives* but the victory condition (reach the `beyond` stage:
   eco≥75, food≥60, trust≥70, policies≥4, coalitions≥1) is never reached. Food and trust max
   out, but **eco never gets there** (see #2). The game is currently un-winnable by reasonable play.

2. **Eco collapses over the long game.** At 96 turns eco *falls* relative to 48 (eco-first
   40→17, equity-organizer 28→1) even for eco-focused play — climate pressure outpaces
   restoration. Food sovereignty, by contrast, trivially maxes (85→93–100). Eco is the binding
   constraint on victory and current play can't hold it.

3. **MUL-6993 overshoot confirmed.** The engaged-vs-neglectful gap is ~12 pts at T48 (within
   the 5–15 band) but **~25 pts at T96** (overscheduler 88.5 / eco-first 87.0 vs neglectful 62.0)
   — leader trust accumulates ~linearly while neglectful stays flat. **Decision for Solaris:** if
   the acceptance band must hold past the first term, Option A alone overshoots → needs Option B
   (antagonist escalation responds to trust) or a cap/decay on the advocate channel.

4. **Antagonist penalty still punishes engagement** (−16 engaged vs −12 idle), unchanged by
   Option A — now overwhelmed by the leaderAdvocates gain, but still a latent inversion.

## Suggested follow-ups
- Make eco reachable over a full term (rebalance climate vs. restoration) so the game is winnable.
- Resolve the MUL-6993 T96 overshoot per Solaris's call (likely Option B or an advocate cap).
- Optional: investigate why qwen3-32b fails to build leader advocates (visit-concentration prompt).

---

## Update — 96-turn run on the now-winnable game (post MUL-7078)

Archetypes win decisively at 96 turns (equity-organizer / eco-first / justice-first / overscheduler 100% win; trust-builder 60%; neglectful survives-never-wins; random loses). LLMs re-run at 96 turns:

| Model | Score | Eco | Food | leaderAdvocates | coalitions | policies | Win% |
|---|---|---|---|---|---|---|---|
| groq-gpt-oss-120b | 105.6 | 99 | 100 | 38 (~12) | 2 | **2–3** | 0% |
| groq-qwen3-32b | 58.7 | 100 | 100 | **0** | 0 | 3–4 | 0% |

**gpt-oss is one lever from winning:** it maxes meters + builds coalitions + scores 105 (above the ~87 winning archetypes) but enacts only 2–3 of the **≥4 policies** the `beyond` victory needs. Winning archetypes enact 8. This is a *prompt* gap (model under-enacts affordable policies), not a balance gap.

**qwen3-32b plateaus at ~59:** never converts calendar visits into leader trust → 0 advocates, 0 coalitions. Consistent relationship-conversion weakness across every run.

**Tested: the policy gate is NOT prompt-fixable (2026-06-12).** Added a prompt nudge ("enact every
affordable policy; victory needs ≥4") and re-ran 96 turns. Result: gpt-oss now *tries* to enact on
24/96 turns but still only **3 stick**, still 0 wins. Reverted the nudge. Diagnosis:
- The real gate is **political will**, not enactment behavior. At the LLM's will (~32%), only **3 of
  the 8 policies** are actually enactable — the reducer requires `will ≥ effectiveThreshold +
  enactmentCost` (+ a public-opinion adjustment). The win needs ≥4. Winning archetypes reach higher
  will and enact all 8. gpt-oss never builds will (it doesn't use `public_event`, the +1-will action).
- **Harness bug found:** `buildView` marks a policy `enactable` on `will ≥ baseThreshold` alone,
  ignoring `enactmentCost` and topic opinion — so the view **over-reports** the action space and the
  model wasted ~21 enact attempts on policies it couldn't actually enact. Worth fixing for benchmark
  honesty (won't change the win outcome — the will gate remains).
