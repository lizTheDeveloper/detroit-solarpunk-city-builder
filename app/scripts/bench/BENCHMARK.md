# Solarpunk Detroit — Strategy & LLM Benchmark

*A real-reducer benchmark that plays the actual game. Last updated 2026-06-14.*

## What this is

A benchmark in which agents — both deterministic strategy heuristics and LLMs — play full
games of **Solarpunk Detroit** (a Detroit-set solarpunk city-builder where you are the mayor)
through the **real game reducer**, not a mock. Every action goes through the production
`gameReducer`/`resolveTurn`, so the benchmark measures play of the actual shipped game.

It exists to answer two questions:
1. **Is the game well-designed?** Does skilled play beat lazy play? Is it winnable?
2. **How well do LLMs play it?** Can frontier-ish models reason about a multi-system game over
   ~80 turns?

Harness: `app/scripts/bench/`. Entry points: `scripts/monte-carlo.ts` (deterministic archetypes),
`scripts/bench-llm.ts` (LLM models). Full per-turn logs (incl. LLM prompts/responses) are written
to `scripts/bench/results/<ts>/games/*.jsonl` for re-analysis.

## The game, briefly

It is a **calendar game**: each turn you allocate ~22 scarce attention slots across 19
neighborhoods, respond to proposals and events, and enact policies. Re-election (every 16 turns)
depends heavily on **equity** — spreading attention across all neighborhoods. The **victory**
condition is reaching the `beyond` stage: `eco≥75, food≥60, trust≥70, policies≥4, coalitions≥1`.
Coalitions form automatically when 3+ community leaders of the same project-category reach trust 40.

## Methodology

- **Real systems, reproducible.** Each game is seeded; a per-game PRNG is installed so the same
  seed reproduces the same game exactly. LLM models are run on a **shared seed set** (paired
  comparison). Games run sequentially.
- **Metrics:** win/loss/survival + win turn + final stage; the game's own `calculateElectionScore`
  (0–~110) with full term breakdown; all six meters (trajectory, final, volatility); a strategy
  fingerprint (proposal disposition, policies enacted, calendar mix, neighborhood Gini).
- **Honesty:** win rate is reported with a **Wilson 95% interval** and the score mean with a 95%
  CI, so small-N results are not over-claimed.
- **Agents:** archetypes are pure heuristics over a structured `TurnView`; LLMs get a text
  rendering of the same view and decide proposals, policies, calendar, and **events** in one call.

## Results

### Deterministic archetypes (N=100, 96 turns)

| Archetype | Score | Win% | WinTurn | Stage | Will | Policies |
|---|---|---|---|---|---|---|
| eco-first | 88.9 | 100% | 72 | beyond | 90 | 8 |
| overscheduler | 87.1 | 100% | 80 | beyond | 100 | 8 |
| equity-organizer | 85.0 | 100% | 74 | beyond | 87 | 8 |
| justice-first | 76.8 | 99% | 84 | beyond | 22 | 6 |
| trust-builder | 76.5 | 75% | 90 | beyond | 36 | 6 |
| **neglectful** (do nothing) | 62.0 | **0%** | — | transition | 100 | 2 |
| random | 36.3 | 0% | — | — | — | — |

A healthy difficulty curve: engaged, equitable play **wins**; doing nothing only survives (stuck
at `transition`, never reaches victory); random play loses. *(This was not always true — see
"How it got here".)*

### LLM models (N=10, 96 turns, current harness)

| Model | Score (95% CI) | Win rate (Wilson 95%) | Coalitions | Stage |
|---|---|---|---|---|
| groq/gpt-oss-120b | 94.0 [90, 98] | **100%** [72%, 100%] | 1.8 | beyond ×10 |
| claude-haiku-4.5 | 86.7 [84, 89] | **100%** [72%, 100%] | 1.2 | beyond ×10 |
| groq/qwen3-32b | 59.8 [53, 66] | **0%** [0%, 28%] | 0.0 | restoration ×10 |

**gpt-oss-120b and claude-haiku-4.5 win every game**; **qwen3-32b never reaches victory**,
plateauing one stage short. At N=10 the separation is statistically clear: the winners' win-rate
CI `[72%, 100%]` does not overlap qwen's `[0%, 28%]`. (5/10 would still be ~[24%,76%] — the
"100%" is strong but, honestly, a true rate as low as 72% is not excluded.) `claude-sonnet-4.6`
and `gemini-cli` are supported but not in this run (Sonnet pending cost sign-off; Gemini CLI has
timeout issues).

### The win-path

Across both archetypes and LLMs, victory follows one causal chain:

> **broad calendar coverage → political will + leader trust → policies (≥4) + a coalition →
> `beyond` stage → win.**

The discriminator between winners and the qwen plateau is the **coalition**: winners build enough
broad leader trust (5–12 advocates) that 3+ same-category leaders cross trust 40 and a coalition
forms *for free*; qwen reaches too few advocates (coalitions ≈ 0.0 at N=10) and stalls at `restoration`.

## Key findings

1. **Event handling is the LLM's decisive lever.** With events defaulted to their first choice,
   gpt-oss-120b *never won* (0%). The default first choice was systematically a will-draining
   "confront/accept" option; that low will gated policy enactment, which blocked victory. Giving
   the LLM **agency over event choices** (folded into its single per-turn call) flipped it to
   **100% win** (policies 3→8, final will ~32→~90). A frontier-ish model went from "can't win" to
   "wins every game" via one harness change.
2. **Capability ranking is real and legible.** gpt-oss-120b ≈ claude-haiku-4.5 (both 100%) ≫
   qwen3-32b (0% at N=10). The gap is specifically **relationship depth** — converting calendar visits
   into enough leader-advocates to form a coalition.
3. **Two win-paths are in tension.** Coalitions reward *concentrating* attention on a few leaders;
   re-election rewards *spreading* it (equity). The strong models resolve this by building broad
   trust (which yields coalitions as a by-product). Naively coaching a model to *concentrate* for a
   coalition **backfired** — it broke equity and lost re-election. (This coalition-vs-equity tension
   is flagged to design as a possible sharpening point.)
4. **Harness validity is load-bearing.** Several early conclusions were artifacts of harness bugs,
   each caught and fixed: a missing `prepareTurn()` call meant calendar slots never reset (agents
   "played" only turn 1); the view over-reported which policies were enactable (agents wasted
   no-op attempts). A benchmark of the *real* reducer is only as good as its fidelity to it.

## How it got here (the arc)

The benchmark started by reporting that **doing nothing beat every strategy and the game was
un-winnable**. That was partly a harness bug and partly real balance: the budget meter was inert,
and a `calendarEquity` penalty plus antagonist/will dynamics rewarded disengagement. Fixes (by the
project team, with design sign-off) made calendar visits build leader trust and made ecology trend
upward over a term — turning a game where *doing nothing won* into one where *skilled, equitable,
relationship-building play wins* and laziness merely survives. The LLM story tracked the same arc:
once the game was winnable and the harness honest, the models' true skill (and its ceiling)
became measurable.

## Limitations

- **Modest N for LLMs (10).** Win-rate CIs remain non-trivial (winners ~[72%,100%]); the ranking
  is statistically clear but exact win rates aren't pinned. Larger N would tighten it.
- **One game configuration** (default new game, 96 turns). No difficulty/scenario sweep.
- **Event choice is the only fully-agentic sub-decision added**; some calendar/relationship micro
  -decisions are heuristic in framing.
- **Model coverage** is gpt-oss-120b, qwen3-32b, claude-haiku-4.5. Sonnet and Gemini are wired but
  not run here.

## Reproduce

```
cd app
npx tsx scripts/monte-carlo.ts --runs 100 --turns 96            # archetypes
npx tsx scripts/bench-llm.ts --models groq-gpt-oss-120b,groq-qwen3-32b,claude-haiku-4.5 --games 10 --turns 96
```
Outputs (leaderboard.md, summary.json, per-game JSONL) land in `scripts/bench/results/<ts>/`.
GROQ/ANTHROPIC keys load from the gitignored `app/.env`. See `scripts/bench/IMPROVEMENT_LOG.md`
for the full change history.
