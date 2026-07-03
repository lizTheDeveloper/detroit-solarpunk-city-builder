# Solarpunk Detroit — Gemini Playtest Report

**Run date:** 2026-06-07 (48 turns, full game)
**Driver:** `scripts/playtest-gemini.ts` (Gemini CLI as the mayor)
**Outcome:** ❌ **LOSS — reelection** (turn 48 / spring Year 5)

> ⚠️ **Note on provenance.** Gemini's *own* end-of-run report call timed out
> (`spawnSync /bin/sh ETIMEDOUT`), so the narrative below is **synthesized from the
> captured run log + game-code analysis**, not authored by Gemini. Sections are
> labeled **[verified]** (from the run log) vs **[inferred]** (from reading the
> game systems). 6 of 48 turn-decisions also hit the same Gemini timeout and fell
> back to `END_TURN`, so the play is somewhat noisier than a clean run.

---

## Headline finding

**The mayor maxed the only visible meter (trust → 100% by turn 13, held for 35
turns) and kept a healthy budget — and still lost reelection.** The meters the
player watches are decoupled from the conditions that actually end the game.

## What happened [verified — from run log]

- **Trust:** 50% → 100% by **turn 13**, pinned at ~100% for the rest of the game.
- **Budget:** $1,576M → $1,656M over 48 turns: **+$80M (+5.1%) across 4 years**,
  monthly surplus ≈ $0 every turn. The budget never created a decision.
- **Stage:** `awakening` → `transition` by turn 4, then **stuck in `transition`
  for all 44 remaining turns** — never reached `restoration` or `beyond`.
- **Actions:** bimodal — 22 turns took 12 actions (proposal-accept sprees), 23
  turns took 2 (defer-only). 16 turns generated events.
- **Final:** lost the turn-48 reelection (survived the turn-16 and turn-32 ones).

## Why it lost [inferred — from `reelection.ts`]

Election threshold is **45**. With 100% trust, `baseTrust = 100 × 0.6 = 60` — clears
45 on its own. To still lose, the **negative** terms must have summed below −15:

- `displacementPenalty`: **−3 per tile** with gentrificationPressure > 50
- `calendarEquity`: **−3 per neighborhood** given < 5% of the mayor's time
- `antagonistPenalty`: **−4 per antagonist** at escalationLevel ≥ 3

The bot rarely spent calendar/narrative actions on neighborhood equity, so over 4
years gentrification and antagonist escalation almost certainly accumulated enough
penalty to sink a 60-point trust base. **None of these drivers appear in the
trust or budget readouts** — the player has no meter-level warning they're losing.

## Why it never advanced past "transition" [inferred — from `progression.ts`]

`transition → restoration` requires **eco ≥ 55 AND food ≥ 40 AND trust ≥ 50 AND
policies ≥ 2**. Trust was 100%, so the block was eco, food, or policy count. The
mayor optimized the loud meter (trust) while the **gating meters (eco, food,
policies) stayed below threshold** — same decoupling as the loss.

## Balance takeaways

1. **Trust is a non-constraint.** It saturates at 100% in ~13 turns and stays. It
   should be far harder to hold, or it shouldn't be 60% of the election score.
2. **Budget is inert.** +5% over 4 years with ~$0 monthly surplus — confirms the
   existing Monte-Carlo finding that project spending barely dents a $1,576M
   budget. Either projects need city-scale cost, or budget shouldn't read as a
   primary meter.
3. **The lose/advance conditions are hidden.** Gentrification, calendar equity,
   antagonist escalation, eco, food, and policy count all decide the game but none
   are surfaced as prominently as trust/budget. Surface them, or the player
   optimizes the wrong thing and loses without warning.
4. **Stage progression stalls silently.** Being stuck in `transition` for 44 turns
   with no signal about *what's* gating advancement is a dead-zone.

## Data gap → motivates the rewrite

This run only logged **budget + trust** per turn. Eco, food, political will,
climate, and gentrification — the meters that actually decided both the loss and
the stage stall — were **never recorded**, so the diagnosis above is partly
inferred. The benchmark-harness rewrite
(`docs/superpowers/specs/2026-06-07-benchmark-harness-design.md`) fixes exactly
this: all six meters + win/loss + the full election-score breakdown + per-turn
JSONL logs, across archetypes and multiple models.

## Raw trajectory (budget / trust)

See the auto-saved table appended by the run; budget climbed monotonically
$1,576M → $1,656M, trust hit 100% at T13 and held.
