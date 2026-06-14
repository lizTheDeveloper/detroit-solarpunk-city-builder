# Benchmark Harness — Autonomous Improvement Log

Self-paced improvement rounds (started 2026-06-14 ~01:30, run until ~2026-06-15 evening).
Scope: **harness / benchmark / analysis / tooling only.** Game-balance changes are routed
through Paperclip tickets for Solaris (PM) sign-off — NOT freelanced here.
Each round: pick highest-value item → implement → verify (tests + benchmark) → commit + push.

## Conventions
- Keep `src/tests/bench-harness.test.ts` + `budget-invariants.test.ts` green; typecheck clean.
- LLM runs use Groq (gpt-oss-120b, qwen3-32b) via `app/.env` key. ⚠️ Board directive conflict to
  raise with user: "Claude only for playtesters" vs the existing "cheapest Groq" rule — do not pivot
  unilaterally (Claude API = cost). Adding a Claude adapter (keeping Groq) is fine if a key exists.
- Never remove features; only add/improve.

## Backlog (rough priority)
- [x] R1 — Metrics: track `stageReached` + `winTurn` (diagnostic richness)
- [ ] R2 — LLM event-choice agency (remove fixed-first-choice limitation)
- [x] R3 — Richer reporting: Will + Pol columns (win mechanism legible)
- [ ] R4 — LLM prompt: coach political-will building; re-run to test if gpt-oss can win
- [ ] R5 — Add Claude (Anthropic) adapter per board directive (if key/proxy available); keep Groq
- [ ] R6 — Statistical power: more games, report confidence intervals
- [ ] R7 — Diagnose qwen relationship-conversion failure (writeup)
- [ ] R8 — Publishable benchmark write-up (original north star)
- [ ] T — File balance proposals as tickets (Solaris): antagonist-vs-trust (Option B), MUL-6993 overshoot

## Rounds
(appended per round below)

### R1 — stageReached + winTurn metrics (2026-06-14 ~01:35) ✅
Added `stageReached` + `winTurn` to GameMetrics; report shows a Stage column (top stage + share)
and mean WinTurn. Immediately useful: wins cluster turn ~71–88 (2nd half → why 48-turn games show
0 wins); neglectful is stuck in `transition` 100% (never reaches `beyond`). Tests 9/9, typecheck clean.
Files: types.ts, metrics.ts, report.ts.

### R2 — LLM event-choice agency (2026-06-14 ~02:00) ✅
Folded event decisions into the LLM's single per-turn call (view now carries pending events +
choices + meter deltas; model emits "event: <choiceId>"; chooseEvent honors it; archetypes
unchanged). MILESTONE result: the old fixed first-choice (confront/accept) was draining political
will and CAUSING the policy-gate failure. With agency, gpt-oss-120b: 0%→**100% win** (reaches
beyond), policies 3→7, final will ~32→87. qwen3-32b improved 58→66 (restoration) but still 0 win.
Resolves the earlier "gpt-oss is one lever from winning" — the lever was event handling, not a prompt.
Tests 9/9, typecheck clean. Files: types.ts, view.ts, models.ts.

### R3 — Will + Pol leaderboard columns (2026-06-14 ~03:05) ✅
Added political-will (final) and policies-enacted columns to the leaderboard, right where the win
story lives. At a glance: winners have Will 89–100 + 8 policies; lower-will agents (justice-first
Will 24, trust-builder Will 34) enact fewer policies and win less. Tests 9/9, typecheck clean.
File: report.ts.
