## 1. Core Calendar System

- [ ] 1.1 Add `month: number` (1-12) and `startMonth: number` to GameState in types.ts
- [ ] 1.2 Implement `getSeason(month)` and `isSeasonTransition(prevMonth, currentMonth)` utility functions
- [ ] 1.3 Change season in GameState to be computed from month (remove as independent stored field or make it derived)
- [ ] 1.4 Update turn advancement in resolve.ts: increment month, wrap at 12→1 with year++
- [ ] 1.5 Update create-game.ts: initialize month from current real-world date (new Date().getMonth() + 1)

## 2. Rate Scaling (÷3)

- [ ] 2.1 Scale meters.ts: trust decay base rate ÷3, food→trust bonus ÷3, eco contribution ÷3
- [ ] 2.2 Scale meters.ts: high-trust penalty ÷3, climate pressure growth ÷3
- [ ] 2.3 Scale projects.ts: revenue cap ÷3 (0.10 → 0.033)
- [ ] 2.4 Scale proposals.ts: accept trust gain, modify trust gain (keep absolute values? or ÷3?)
- [ ] 2.5 Scale narrative.ts: will gain, trust gain per action (÷3 or keep? — actions are per-turn)
- [ ] 2.6 Scale reclamation.ts and mesh-network.ts passive effects ÷3

## 3. Project Duration Scaling (×3)

- [ ] 3.1 Multiply all baseDuration values in project-catalog.ts by 3
- [ ] 3.2 Verify time-bank credit system still works (credits per turn should still be 1)
- [ ] 3.3 Update any hardcoded duration references in tests

## 4. Seasonal Effects Gating

- [ ] 4.1 Gate climate.ts applySeasonalEffects to only fire on season transitions
- [ ] 4.2 Gate generateClimateEvent to only roll on season transitions
- [ ] 4.3 Update resolve.ts to check isSeasonTransition before calling seasonal systems
- [ ] 4.4 Winter heating costs: fire once per winter start (month 1), not 3× per winter

## 5. Election Timing

- [ ] 5.1 Update election trigger from turn 16 to turn 48
- [ ] 5.2 Update election warning from turn 10 to turn 36
- [ ] 5.3 Update playtest script election prediction timing

## 6. Test Updates

- [ ] 6.1 Update meters.test.ts expected values (÷3 scaling)
- [ ] 6.2 Update projects.test.ts expected durations (×3)
- [ ] 6.3 Update proposals.test.ts if values changed
- [ ] 6.4 Update resolve.test.ts integration test expectations
- [ ] 6.5 Update e2e-scenarios.test.ts turn counts and meter expectations
- [ ] 6.6 Add monthly-calendar unit tests (season derivation, transition detection, year wrap)

## 7. Playtest Script Update

- [ ] 7.1 Update playtest-long.ts max turns (was 32 quarterly = 8 years, now ~96 monthly for same duration)
- [ ] 7.2 Update stuck detection thresholds for monthly cadence
- [ ] 7.3 Update election math in strategy prompt (T48 not T16)
- [ ] 7.4 Adjust AI budget/project pacing guidance for monthly decision-making
