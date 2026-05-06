## 1. State & Types

- [ ] 1.1 Add `DependencyWeb` type to `src/state/types.ts`: conditions (Set<string>), capacities (Map<string, number>)
- [ ] 1.2 Add `DelayedConsequence` type: id, arcId, triggerTurn, activationConditions, cancelConditions, effects, foreshadowHint, hintTurnsBeforeTrigger
- [ ] 1.3 Add `ActiveArc` type: arcId, currentStage, stageEnteredTurn, inactionTimer, lastEventTurn
- [ ] 1.4 Extend `GameState` with: dependencyWeb, delayedConsequenceQueue, activeArcs, resolvedArcs
- [ ] 1.5 Add `ConsequenceEffect` union type: meterDelta | tileDamage | spawnEvent | conditionChange

## 2. Arc Template Configuration

- [ ] 2.1 Design arc template YAML schema with all required fields (thresholds, forks, antagonists, prevention conditions)
- [ ] 2.2 Author `energy-grid` arc template with 2 crisis forks, DTE antagonist, 4+ choices with delayed consequences
- [ ] 2.3 Author `water-pfas` arc template with DWSD/3M antagonists
- [ ] 2.4 Author `phosphorus-food` arc template with Mosaic Corp/Farm Bureau antagonists
- [ ] 2.5 Author `housing-speculation` arc template with developer/bank antagonists
- [ ] 2.6 Author `infrastructure-debt` arc template with state legislature antagonist
- [ ] 2.7 Implement arc template loader (read YAML, validate required fields, return typed config)

## 3. Arc Progression Engine

- [ ] 3.1 Implement `ArcStateMachine` with transition logic for each stage boundary
- [ ] 3.2 Implement headline-driven transition checks (reads from live-news-pipeline arc-state API)
- [ ] 3.3 Implement minimum stage duration enforcement (prevent stage-skipping)
- [ ] 3.4 Implement inaction timer (counts turns without player intervention per arc)
- [ ] 3.5 Implement prevention condition checking (player action resets inaction timer)
- [ ] 3.6 Implement 3-arc simultaneous limit with activation queue
- [ ] 3.7 Implement arc re-triggering with cooldown after resolution

## 4. Dependency Web

- [ ] 4.1 Implement `DependencyWeb` class: addCondition, removeCondition, hasCondition, getCapacity, modifyCapacity
- [ ] 4.2 Wire condition creation/removal into choice resolution (when player picks a crisis fork choice)
- [ ] 4.3 Wire project completion into capacity accumulation (projects contribute to named capacities)
- [ ] 4.4 Implement condition-gated choice availability check (lock/unlock choices based on web state)
- [ ] 4.5 Add dependency web serialization for game save/load

## 5. Delayed Consequences

- [ ] 5.1 Implement consequence queue (priority queue sorted by triggerTurn)
- [ ] 5.2 Implement consequence scheduling (choice resolution adds to queue)
- [ ] 5.3 Implement consequence processing in turn resolution (pop triggered, check conditions, apply effects)
- [ ] 5.4 Implement consequence cancellation (cancel conditions checked before firing)
- [ ] 5.5 Implement foreshadow hint system (surface hints N turns before trigger)
- [ ] 5.6 Implement effect application: meter deltas, tile damage, event spawning, condition changes

## 6. Crisis Fork Event Generation

- [ ] 6.1 Implement `generateCrisisFork(arcId, arcTemplate, gameState)` → GameEvent
- [ ] 6.2 Wire arc escalation/crisis transitions to event generation
- [ ] 6.3 Implement arc-level cooldown tracking (prevent event spam from single arc)
- [ ] 6.4 Implement choice locking UI hints (show locked choices with prerequisite text)
- [ ] 6.5 Implement choice resolution: apply immediate effects + schedule consequences + update dependency web

## 7. Integration with resolve.ts

- [ ] 7.1 Add delayed consequence processing step to turn resolution (between existing steps)
- [ ] 7.2 Add arc state checking step (query live-news-pipeline, update arc progressions)
- [ ] 7.3 Add crisis fork event generation step (for arcs at escalation/crisis)
- [ ] 7.4 Ensure arc-generated events coexist with existing climate events in eventQueue
- [ ] 7.5 Add foreshadow hint output to turn summary

## 8. Game Initialization ("Always Begins Today")

- [ ] 8.1 Implement arc-state snapshot fetch at game creation time (GET /api/arc-state → initial arc states)
- [ ] 8.2 Wire snapshot into create-game.ts (new games inherit current real-world arc stages)
- [ ] 8.3 Implement immediate crisis fork queueing for arcs starting at escalation/crisis
- [ ] 8.4 Store creation timestamp and arc snapshot in game state for reference
- [ ] 8.5 Handle offline/unavailable pipeline gracefully (fall back to all-dormant if API unreachable)

## 9. Testing

- [ ] 9.1 Unit tests for arc state machine transitions (all stage boundaries)
- [ ] 9.2 Unit tests for dependency web (conditions + capacities, cross-arc sharing)
- [ ] 9.3 Unit tests for delayed consequence queue (scheduling, firing, cancellation, hints)
- [ ] 9.4 Integration test: full arc lifecycle from foreshadow through reckoning
- [ ] 9.5 Integration test: cross-arc dependency interaction (energy choice affects water arc options)
- [ ] 9.6 Integration test: "begins today" initialization from live arc-state snapshot
- [ ] 9.7 Playtest: verify AI player can navigate crisis forks with delayed consequences
