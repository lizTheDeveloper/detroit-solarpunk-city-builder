## 1. Type System Extensions

- [ ] 1.1 Add `arcPhase`, `responseHistory`, `phaseEventCount`, and `motivationRevealed` fields to the `Antagonist` type in `types.ts`
- [ ] 1.2 Add `expirationTurn`, `pressureLevel`, and `urgencyWindow` fields to the `Proposal` type in `types.ts`
- [ ] 1.3 Add `urgencyWindow` field to the `Leader` type in `types.ts`
- [ ] 1.4 Remove `ProposalResponse` value `'defer'` from the type union

## 2. Neighborhood Expansion (Data)

- [ ] 2.1 Add ~10 new neighborhood tile definitions in `create-game.ts` with terrain, starting metrics, existing uses, traits, and adjacency links
- [ ] 2.2 Wire adjacency links between new and existing tiles to form a connected graph
- [ ] 2.3 Add 5-7 new community leader definitions in `leaders.ts` (Midtown academic/activist, Delray environmental justice organizer, Grandmont-Rosedale neighborhood association leader, Palmer Park arts/culture organizer, Bagley/UDistrict student-community bridge, Livernois-McNichols small business coalition leader)
- [ ] 2.4 Expand existing leaders' territory: Lucia → Mexicantown, Elder → West Village, Tamika → Fitzgerald, Mike → Rouge Park
- [ ] 2.5 Add character prompts for new leaders in `character-prompts.ts`

## 3. Neighborhood Expansion (Map + UI)

- [ ] 3.1 Replace bounding-box GeoJSON in `MapPanel.tsx` with simplified polygon boundaries for all 16-18 neighborhoods
- [ ] 3.2 Add sidebar neighborhood grouping by geographic cluster (Northwest, Northeast, Central, Southwest, Southeast) with expand/collapse in the neighborhood list component
- [ ] 3.3 Verify map renders all new neighborhoods with distinguishable fills and boundary lines

## 4. Marcus Webb Arc (Data + Events)

- [ ] 4.1 Rewrite Marcus Webb's antagonist definition: set `arcPhase: 1`, remove `escalationInterval: 0`, add phase transition thresholds
- [ ] 4.2 Create Phase 1 event pool (3-5 events): generic media pot-shots with game-state interpolation and 3+ response options per event
- [ ] 4.3 Create Phase 2 event pool (3-5 events): targeted attacks naming neighborhoods/leaders, weaponizing ignored proposals, wedge-driving
- [ ] 4.4 Create Phase 3 event pool (3-5 events): council run announcement, rally events, co-option opportunity
- [ ] 4.5 Create Phase 4 resolution events: reluctant ally, election threat, and cynicism engine endings
- [ ] 4.6 Add Marcus motivation layer: childhood neighborhood reference, Sterling Cross funding reveal event

## 5. Marcus Webb Arc (State Machine)

- [ ] 5.1 Implement `evaluateMarcusPhaseTransition()` in a new `marcus-arc.ts` system file — checks turn thresholds, response history, ignored proposals, neighborhood neglect, Sterling Cross co-activation
- [ ] 5.2 Implement `selectMarcusEvent()` that picks from the current phase's event pool based on game state (recent projects, neglected neighborhoods, high-pressure proposals)
- [ ] 5.3 Integrate Marcus phase transitions into the resolve pipeline (`resolve.ts`) — run after proposal expiration so he can reference newly expired proposals
- [ ] 5.4 Track player response to Marcus events in `responseHistory` on the antagonist object via reducer

## 6. Proposal Expiration System

- [ ] 6.1 Update `generateProposals()` in `proposals.ts` to set `expirationTurn` and `pressureLevel: 0` on new proposals
- [ ] 6.2 Implement `tickProposalPressure()` — increment pressure level on all active unacted-on proposals during turn resolution
- [ ] 6.3 Implement `processProposalExpiration()` — remove expired proposals, calculate trust penalties scaled by leader trust level and pressure level, generate narrative events
- [ ] 6.4 Implement pressure event generation at thresholds: level 1 notification, level 2 rally event, level 3 press/Marcus event
- [ ] 6.5 Integrate proposal expiration into the resolve pipeline (`resolve.ts`): tick pressure → fire threshold events → expire proposals → generate narratives

## 7. Proposal UI Changes

- [ ] 7.1 Remove the Defer button from `TileProposalCard` in `TileDetailPanel.tsx`
- [ ] 7.2 Add expiration timer display to proposal cards: "Funds needed by Month X" with color-coded timer bar (green/yellow/orange/red by pressure level)
- [ ] 7.3 Remove the End Turn gate on pending proposals in `reducer.ts` — change the message from blocking to informational ("3 proposals pending, 1 expiring soon")
- [ ] 7.4 Add proposal expiration animation/narrative display when a proposal card is removed from a tile

## 8. Interconnection Wiring

- [ ] 8.1 Wire level 3 pressure proposals to Marcus Phase 2+ event selection — `selectMarcusEvent()` checks for recent level-3/expired proposals
- [ ] 8.2 Wire `neighborhoodTimeAllocation` neglect (0 allocation for 3+ months) to Marcus Phase 2 transition trigger
- [ ] 8.3 Implement trust bonus scaling for early vs. late funding (full trust at pressure 0, -50% at pressure 3)

## 9. Tests

- [ ] 9.1 Unit tests for `evaluateMarcusPhaseTransition()`: all 4 phase transitions, early Phase 2 via Sterling Cross, response history tracking
- [ ] 9.2 Unit tests for `selectMarcusEvent()`: event variety within phase, game-state interpolation, proposal weaponization
- [ ] 9.3 Unit tests for `tickProposalPressure()` and `processProposalExpiration()`: pressure increments, expiration trust penalties, narrative generation
- [ ] 9.4 Unit tests for pressure event thresholds: level 1/2/3 events fire correctly, Marcus integration at level 3
- [ ] 9.5 Integration test: full resolve pipeline with proposal expiration + Marcus phase transitions
- [ ] 9.6 Update existing reducer tests to remove defer-button expectations and proposal-gating assertions
- [ ] 9.7 Update playtest simulation to exercise Marcus arc across a 48-turn game
