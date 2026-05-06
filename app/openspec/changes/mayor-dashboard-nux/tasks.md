## 1. Projections Engine

- [ ] 1.1 Create `src/systems/projections.ts` with `calculateProjections(state): ProjectionResult` — simplified forward simulation (meter regen + project completions + known drains) for 12 turns
- [ ] 1.2 Define `ProjectionResult` type: `{ turns: number[]; meters: Record<keyof Meters, number[]>; events: Array<{ turn: number; label: string; type: string }> }`
- [ ] 1.3 Include delayed consequence effects in projection (only foreshadowed ones)
- [ ] 1.4 Include project completion effects (look up `ProjectDefinition.effects` for each active project at its completion turn)
- [ ] 1.5 Write tests: verify projection accuracy for regen, project completion, consequence drains, and budget forecasting

## 2. Timeline View Component

- [ ] 2.1 Create `src/ui/components/Timeline.tsx` — horizontal swimlane component with 12-turn axis
- [ ] 2.2 Render active projects as progress bars (filled portion = progress/duration, positioned at start→completion turn)
- [ ] 2.3 Render election marker as vertical line at T48 (emphasized when <8 turns away)
- [ ] 2.4 Render foreshadow windows as shaded regions (triggerTurn - hintTurns → triggerTurn)
- [ ] 2.5 Render active arc stages (escalation+ only) with inaction timer progress
- [ ] 2.6 Color-code by category: ecology=green, infrastructure=blue, community=orange, crisis=red, election=purple
- [ ] 2.7 Add CSS for timeline layout (grid-based, responsive width)

## 3. Dashboard Panel

- [ ] 3.1 Create `src/ui/components/Dashboard.tsx` — persistent tab showing timeline + projections + status
- [ ] 3.2 Add meter sparklines using projection data (12-turn mini charts with current value dot)
- [ ] 3.3 Add stage threshold reference lines on sparklines (e.g., "eco 55% for restoration")
- [ ] 3.4 Add trend arrows to the existing MeterBar component (up/down/flat based on 6-turn projection delta)
- [ ] 3.5 Add "Mayor's Briefing" summary section: upcoming completions, threats, opportunities (1-3 bullet points derived from projections)
- [ ] 3.6 Register Dashboard as a tab in the content area alongside tiles/characters/policies

## 4. Tutorial Progression System

- [ ] 4.1 Define `TutorialState` type and add to GameState: `{ active: boolean; completedSteps: string[]; dismissedTooltips: string[] }`
- [ ] 4.2 Define tutorial step sequence with trigger conditions as predicates on GameState
- [ ] 4.3 Create `src/systems/tutorial.ts` — `checkTutorialTriggers(state): TutorialEvent | null`, `completeStep(state, stepId): GameState`
- [ ] 4.4 Add tutorial state initialization in `create-game.ts`
- [ ] 4.5 Create `src/ui/components/TutorialTooltip.tsx` — positioned overlay with message, dismiss, and "Skip Tutorial" button
- [ ] 4.6 Integrate tutorial checks in App.tsx — run `checkTutorialTriggers` after each state update, show tooltip when triggered
- [ ] 4.7 Implement panel de-emphasis: narrative/policy panels collapsed/grayed until their tutorial step completes
- [ ] 4.8 Implement auto-completion: if player performs an action before its tutorial step, mark it completed
- [ ] 4.9 Write tests: step triggering, auto-completion, skip behavior, state persistence

## 5. Advisor Prompts

- [ ] 5.1 Define advisor condition registry: `Array<{ id: string; priority: number; characterId: string; condition: (state) => boolean; message: (state) => string }>`
- [ ] 5.2 Create `src/systems/advisors.ts` — `getAdvisorPrompt(state): AdvisorPrompt | null` (checks conditions, respects cooldowns/dismissals, returns highest priority)
- [ ] 5.3 Add advisor state to GameState: `{ dismissedConditions: string[]; cooldowns: Record<string, number> }`
- [ ] 5.4 Write 8-10 advisor conditions: no-eco-projects, budget-critical, election-risk, trust-dropping, will-at-zero, arc-escalating, no-narrative-actions-used, food-stagnant
- [ ] 5.5 Create `src/ui/components/AdvisorToast.tsx` — non-blocking toast with character name, message, "Don't remind me" button
- [ ] 5.6 Implement 10-second auto-hide and 8-turn cooldown logic
- [ ] 5.7 Integrate in App.tsx — check advisor after END_TURN, show toast if returned
- [ ] 5.8 Write tests: priority ordering, cooldown enforcement, dismissal persistence

## 6. Integration & Polish

- [ ] 6.1 Add Dashboard tab icon and keyboard shortcut (D)
- [ ] 6.2 Ensure projections update immediately on player action (not just on END_TURN)
- [ ] 6.3 Add tutorial step for the dashboard itself ("Your briefing is always available here")
- [ ] 6.4 Verify timeline renders correctly with 0, 1, 3, and 5 active projects
- [ ] 6.5 Verify advisor prompts don't overlap with crisis fork modals or turn summary
- [ ] 6.6 Performance check: projections calculation should complete in <5ms for typical game state
