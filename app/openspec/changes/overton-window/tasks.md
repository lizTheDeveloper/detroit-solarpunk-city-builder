## 1. Opinion System Extension

- [ ] 1.1 Add taboo-specific opinion topics to PublicOpinion type: nutrientRecycling, nuclearEnergy, landExpropriation, decarceration, deGrowth
- [ ] 1.2 Set floor values for new topics in opinion drift system (5-15 depending on topic radicality)
- [ ] 1.3 Add new topics to opinion drift logic (same decay rate as existing topics)
- [ ] 1.4 Extend education_program narrative action to accept taboo-specific topic targets
- [ ] 1.5 Initialize new topics in create-game.ts for new game state

## 2. Taboo Solution Mechanics

- [ ] 2.1 Define TabooConfig type: opinionTopic, unlockThreshold, baseSocialCost, justificationPapers[], tabooLabel
- [ ] 2.2 Add `taboo?: TabooConfig` field to crisis fork choice type
- [ ] 2.3 Implement `isTabooUnlocked(choice, publicOpinion)` check function
- [ ] 2.4 Implement `calculateSocialCost(choice, publicOpinion)` formula: baseCost * max(0, 1 - (opinion - threshold) / 35)
- [ ] 2.5 Wire social cost into choice resolution as trust delta

## 3. Gating Integration

- [ ] 3.1 Implement opinion gate check in crisis fork event presentation (lock/unlock taboo choices)
- [ ] 3.2 Implement near-threshold detection (opinion within 10 of threshold → trigger paper surfacing)
- [ ] 3.3 Wire paper surfacing to research-corpus API (GET /api/papers with solution's DOI list)
- [ ] 3.4 Implement choice permanence (chosen taboo solution persists regardless of later drift)
- [ ] 3.5 Implement re-locking (future offers of same solution respect current opinion, not past choice)

## 4. Taboo Solution Authoring

- [ ] 4.1 Define humanure composting solution: nutrientRecycling threshold 50, cost 5, link Cordell 2009 + Rich Earth Institute papers
- [ ] 4.2 Define community-scale nuclear solution: nuclearEnergy threshold 55, cost 6, link SMR feasibility studies
- [ ] 4.3 Define eminent domain for land trust: landExpropriation threshold 45, cost 4, link housing justice papers
- [ ] 4.4 Define planned de-growth: deGrowth threshold 60, cost 7, link Hickel/Kallis papers
- [ ] 4.5 Define biosolids-to-fertilizer: nutrientRecycling threshold 35, cost 3, link EPA biosolids studies
- [ ] 4.6 Integrate taboo solutions into corresponding arc templates as crisis fork choices

## 5. UI & Feedback

- [ ] 5.1 Design locked taboo solution display (grayed out, progress bar, threshold indicator)
- [ ] 5.2 Display social cost on available taboo solutions before selection
- [ ] 5.3 Display "normalized" state when cost reaches 0
- [ ] 5.4 Surface research papers in near-threshold notification panel
- [ ] 5.5 Add opinion progress to narrative action feedback ("nutrientRecycling: 38/50")

## 6. Testing

- [ ] 6.1 Unit tests for social cost formula (at threshold, above, normalized)
- [ ] 6.2 Unit tests for opinion gating (locked, unlocked, re-locked after drift)
- [ ] 6.3 Unit tests for targeted education (taboo topic vs broad topic)
- [ ] 6.4 Integration test: full unlock flow (educate → unlock → choose → permanent)
- [ ] 6.5 Integration test: drift re-locks future availability but not past choices
- [ ] 6.6 Playtest: verify AI player can discover and pursue taboo solution paths
