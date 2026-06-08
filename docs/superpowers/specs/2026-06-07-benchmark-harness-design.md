# Solarpunk Detroit — Benchmark Harness Design

**Date:** 2026-06-07
**Status:** Approved (architecture + archetypes confirmed by user)

## Problem

Two existing playtest/analysis scripts have diverged from the real game and are too narrow:

- `app/src/tests/monte-carlo-budget.test.ts` — hand-mirrors only the budget formula from
  `resolve.ts` Step 8 and analyzes a single meter. It cannot observe win/loss, the other five
  meters, or real dynamics, and silently drifts whenever `resolve.ts` changes.
- `app/scripts/playtest-bot.ts` — a single-model (Groq `qwen/qwen3-32b`) LLM "mayor" bot. No
  multi-model comparison, no structured scoring, no preserved logs.

We want both rewritten to (1) drive the **real reducer**, (2) cover **all meters + win/loss**,
(3) compare **strategy archetypes**, and (4) for the LLM bot, run a **multi-model benchmark**
that produces publishable, re-classifiable data.

## Approach

**Shared engine, two thin entry scripts** (chosen over two fully-independent scripts, which
would re-introduce drift, and over a single `--mode` CLI, which conflates the two concerns).

A single `GameRunner` plays a full game through the real `gameReducer` / `resolve.ts` given a
`DecisionAgent`. Deterministic archetype agents and LLM agents both implement the same interface,
so win/loss detection, scoring, trajectories, and the full decision log are computed once and
shared. The two entry scripts stay separate.

## Components

All new code lives under `app/scripts/bench/` (shared core) with two entry scripts in
`app/scripts/`.

### Shared core — `app/scripts/bench/`

- **`runner.ts`** — `playGame(agent: DecisionAgent, opts): Promise<GameResult>`.
  Owns the canonical loop, mirroring the proven sequence in `playtest-bot.ts` but extracted and
  cleaned:
  1. `createNewGame()` + apply `LEADER_DEFINITIONS` + `generateProposals`.
  2. Per turn: build a `TurnView`, call `agent.decide(view)`, apply each returned action through
     `gameReducer` (skipping no-op actions), auto-defer any unaddressed proposals, generate &
     auto-resolve events, `END_TURN`, regenerate proposals.
  3. Stop on `winCondition`, `lossCondition`, or `maxTurns` (default 48).
  No hand-mirrored math — every state change goes through the real systems.

- **`view.ts`** — builds `TurnView`: a structured (non-text) snapshot of legal actions
  (active proposals with cost/duration/leader/tile, enactable policies with thresholds,
  available narrative/calendar actions, slots remaining) plus the meter summary and election
  outlook. Archetypes consume the structured form directly; LLM agents get a text rendering
  derived from the same view (single source of truth for the action space).

- **`agent.ts`** — `interface DecisionAgent { readonly id: string; decide(view: TurnView): Promise<GameAction[]> }`.

- **`metrics.ts`** — `summarize(result): GameMetrics`:
  - **Outcome:** `win | loss | survived`, loss/win condition string, turns survived.
  - **Composite score:** reuse the game's own `calculateElectionScore(state).score` (0–50) on
    the final state — the canonical in-game mayor-quality metric. Also capture the full
    `breakdown` (baseTrust, displacementPenalty, calendarEquity, antagonistPenalty, …) so the
    benchmark surfaces *why* a run wins/loses, not just the total — the exact blind spot the
    2026-06-07 Gemini playtest hit (100% trust but lost on hidden penalties).
  - **Per-meter trajectories:** read **all meters generically** (`Object.keys(state.meters)`),
    not a hard-coded list — full series + final/min/max/volatility (stddev) per meter. This
    auto-adapts when `meters.discretionary` (the planned budget fix, see Related work) lands.
  - **Strategy fingerprint:** proposal accept/reject/defer/modify counts, policies enacted,
    narrative/calendar action-type histogram, neighborhood equity (Gini of completed projects
    across tiles).

- **`report.ts`** — distribution helpers (mean/median/p5/p25/p75/p95/stddev) and a markdown
  leaderboard writer.

### Script 1 — `app/scripts/monte-carlo.ts` (deterministic)

- **`bench/archetypes.ts`** — six pure-heuristic agents over `TurnView`, each driven by a seeded
  RNG (no LLM): `balanced`, `aggressive-growth`, `justice-first`, `eco-first`, `neglectful`,
  `random`.
- Runs N seeded games per archetype (default 500). Fast (pure TS). Output: per-archetype
  distributions across **all** metrics + win/loss/survival rates.

### Script 2 — `app/scripts/bench-llm.ts` (multi-model)

- **`bench/models.ts`** — `interface ModelAdapter { name: string; complete(system, prompt): Promise<string> }`
  and a registry. Initial adapters:
  - **Gemini CLI** — `gemini -p` via `execSync` (OAuth, no key).
  - **Groq gpt-oss-120b** — `openai/gpt-oss-120b` via `GROQ_API_KEY` (OpenAI-compatible).
  - **Groq qwen3-32b** — `qwen/qwen3-32b` via `GROQ_API_KEY`.
  Adding a model later = one adapter + one registry entry.
- **`LlmAgent`** wraps a `ModelAdapter`, renders the `TurnView` to text, calls the model, and
  parses the response into `GameAction[]` (reusing/borrowing the existing parser logic).
- Runs K games per model (default 3). Gemini CLI is serial (~30 s/turn), so K is intentionally
  small; Groq models may run with light concurrency.

## Outputs

Written to `app/scripts/bench/results/<timestamp>/`:

- **`summary.json`** — every run's full `GameMetrics` (machine-readable, all models/archetypes).
- **`leaderboard.md`** — human-readable ranking by composite score, with win rate, survival,
  final meters, and fingerprint highlights.
- **`games/<agentId>-<seed-or-run>.jsonl`** — one line per turn: `{ turn, meterSummary, view,
  prompt?, rawResponse?, parsedActions, metersAfter }`. Preserves full decision logs (including
  LLM prompts/responses) so other classification can be run later. Archetype runs omit
  `prompt`/`rawResponse`.

Flat files only — no DB, no live dashboard.

## Disposition of old code

- **`monte-carlo-budget.test.ts`** — retire the hand-mirrored full simulation. Preserve its cheap
  **content-invariant** assertions (annual revenue == expenses, avg project cost as % of budget,
  trust/eco modifier ranges) into a slim `app/src/tests/budget-invariants.test.ts` so CI still
  catches budget-config regressions. These check data, not dynamics, so they cannot drift.
- **`playtest-bot.ts`** — superseded by `bench-llm.ts`. Remove after the new harness is verified
  to run end-to-end. `playtest-gemini.ts`, `playtest-parallel.ts`, `playtest-long.ts` are out of
  scope for this change.

## Related work — the budget problem

The 2026-06-07 Gemini playtest confirmed the budget meter is inert (+5% over 48 turns) and that
trust saturates while hidden penalties decide the game. The planned fix already has a spec:
**`2026-05-14-discretionary-budget-design.md`** (Discretionary Capital Fund + developer/grant
proposals with hidden terms). As of 2026-06-08 its **money side is unimplemented** — `Meters` has
no `discretionary` field and `Proposal` has none of the hidden-term machinery; only the
attention/calendar-slots half shipped. This benchmark is the measurement instrument for that fix:
because it reads meters generically and captures the election-score breakdown, it will quantify
the budget problem now and the improvement once the discretionary fund lands. Building or tuning
that fund is **out of scope here** — this change is measurement only.

## Non-goals (YAGNI)

- No parallelization beyond simple concurrency for Groq calls.
- No database, web dashboard, or CI gating on benchmark scores (the benchmark is an analysis tool,
  not a pass/fail gate; only the slim budget-invariants test stays in CI).
- No new game-design tuning in this change — measurement only.

## Testing

- Unit: `metrics.ts` (score/fingerprint/Gini on a hand-built finished state), `view.ts`
  (legal-action extraction), archetype determinism (same seed → same game).
- Smoke: `monte-carlo.ts` with N=2 per archetype completes and writes outputs; `bench-llm.ts`
  with one cheap model (Groq gpt-oss) and K=1 completes and writes a JSONL log.
- Keep `budget-invariants.test.ts` green.
