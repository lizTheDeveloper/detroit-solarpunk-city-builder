## 1. State & Types Foundation

- [ ] 1.1 Define CalendarState interface in src/state/types.ts (totalSlots, fixedSlots, discretionarySlots, slotsSpent, overscheduleAmount, burnoutBuffer, burnoutState, interactionsThisMonth, monthNumber, delegationTier)
- [ ] 1.2 Define BurnoutState enum: sustainable | overextended | burnout | collapse
- [ ] 1.3 Define SlotCostMap type mapping action types to slot costs (1-3)
- [ ] 1.4 Define StrategicContact interface (id, name, stage, cooldownRemaining, prerequisites, patienceTimer)
- [ ] 1.5 Define MentorCharacter interface (id, name, philosophy, cooldownMonths, lastMetMonth, yieldType, yieldAmount, bufferGain, unlockCondition)
- [ ] 1.6 Add calendarState, strategicContacts, mentors to GameState, mark narrativeState as deprecated
- [ ] 1.7 Add slotTax field to ConsequenceEffectDef union type in crisis arc data types
- [ ] 1.8 Write save migration function: v2 NarrativeState → v3 CalendarState with sensible defaults

## 2. Core Calendar System

- [ ] 2.1 Create src/systems/calendar.ts with initCalendarState(), getAvailableSlots(), canAffordAction(), spendSlots()
- [ ] 2.2 Implement month transition logic: reset slotsSpent, apply crisis taxes, apply delegation reductions, apply overschedule penalties to next month
- [ ] 2.3 Implement overschedule detection: when slotsSpent > discretionarySlots, flag overschedule and deplete buffer
- [ ] 2.4 Implement interaction tracking: record NPC meetings in interactionsThisMonth map, reset each month
- [ ] 2.5 Wire calendar.ts into prepareTurn (src/systems/resolve.ts) replacing narrative action resets
- [ ] 2.6 Update reducer NARRATIVE_ACTION case to deduct calendar slots instead of flat actions
- [ ] 2.7 Add CALENDAR_REST_DAY action type: costs 1 slot, produces nothing, adds 3 to burnout buffer
- [ ] 2.8 Write unit tests for calendar state management, month transitions, overschedule limits

## 3. Diminishing Returns & Resource Yields

- [ ] 3.1 Create src/systems/yields.ts with calculateYield(baseMultiplier, meetingCount, depthFactor) implementing log₁₀(base/count²) × depth
- [ ] 3.2 Define resource yield matrix: [relationshipType][resourceType] → baseMultiplier (values 10-10000)
- [ ] 3.3 Define depth factor lookup: neutral=0.5, supporter=0.7, trusted=0.85, champion=1.0, partner=1.5
- [ ] 3.4 Integrate yield calculation into action resolution so repeated NPC meetings produce diminishing returns
- [ ] 3.5 Create tuning constants file (src/data/balance/calendar-constants.ts) with all formula parameters
- [ ] 3.6 Write unit tests for yield formula edge cases (first meeting, 5th meeting, partner vs neutral)

## 4. Burnout State Machine

- [ ] 4.1 Create src/systems/burnout.ts with burnout state machine transitions
- [ ] 4.2 Implement buffer tracking: sources (rest +3, mentor +3, celebration +2, support +1) and drains (overschedule -N, no rest -2, forgotten -3)
- [ ] 4.3 Implement effectiveness modifiers: sustainable=1.0, overextended=0.8, burnout=0.5, collapse=0.0
- [ ] 4.4 Implement forgotten commitments: when burnout state, randomly fail 1-2 interactions, apply -8 trust
- [ ] 4.5 Implement recovery logic: buffer thresholds for state regression (burnout→overextended→sustainable)
- [ ] 4.6 Wire burnout modifiers into all yield calculations and trust gains
- [ ] 4.7 Write unit tests for state transitions, buffer math, forgotten commitment generation

## 5. Relationship Decay

- [ ] 5.1 Create src/systems/relationship-decay.ts with decay calculation per NPC per month
- [ ] 5.2 Define maintenance frequency thresholds per tier: inner circle (1mo), key allies (2mo), active network (3mo), known contacts (6mo)
- [ ] 5.3 Implement decay rates: inner circle -8/mo past threshold, key allies -5/mo, active network -3/mo, known contacts -2/mo
- [ ] 5.4 Track last-interaction-month per NPC in calendar state
- [ ] 5.5 Wire decay into month transition (resolve.ts prepareTurn)
- [ ] 5.6 Generate decay notification events when NPCs cross threshold
- [ ] 5.7 Write unit tests for decay timing, rate per tier, notification generation

## 6. Crisis Slot Tax Integration

- [ ] 6.1 Add slotTax field to each crisis arc stage definition in src/data/arcs/
- [ ] 6.2 Implement getTotalCrisisSlotTax() in calendar.ts: sum active arc stage taxes
- [ ] 6.3 Apply crisis tax during month transition to reduce available discretionary slots
- [ ] 6.4 Implement cascading squeeze: when tax > 50% discretionary, trigger bandwidth warning
- [ ] 6.5 Implement crisis triage mode: when tax >= discretionary, only allow 1-slot crisis responses
- [ ] 6.6 Calculate prevention ROI per project: expected arc duration × stage taxes
- [ ] 6.7 Write unit tests for single crisis tax, stacking crises, triage mode activation

## 7. Delegation Progression

- [ ] 7.1 Create src/systems/delegation.ts with tier definitions, unlock checks, and slot math
- [ ] 7.2 Define tier unlock conditions: T1 (turn 8+, $50K, will>40), T2 (turn 16+, champion NPC, will>55), T3 (3 community tiles, trust>70), T4 (beyond stage)
- [ ] 7.3 Implement delegation hire action: costs 3 slots, takes effect next month, deducts budget
- [ ] 7.4 Implement fixed obligation reduction per tier and management cost deduction
- [ ] 7.5 Implement deputy autonomous decisions (T2+): 20% conflict chance, narrative events
- [ ] 7.6 Implement firing: revert slot benefits, trigger political fallout event
- [ ] 7.7 Write unit tests for tier unlocks, slot math, deputy decisions

## 8. Strategic Contacts

- [ ] 8.1 Create src/systems/strategic-contacts.ts with pipeline stage management
- [ ] 8.2 Define 3-5 strategic contact NPCs with prerequisites, patience timers, and yield profiles
- [ ] 8.3 Implement stage transitions: discovery → introduction (2 slots + introducer) → cooldown (2mo) → follow-up (2 slots + conditions) → established
- [ ] 8.4 Implement door-close mechanic: patience timer expiry permanently closes the contact
- [ ] 8.5 Implement deepening: maintained established contacts gain +0.25 yield per 3 months
- [ ] 8.6 Wire prerequisite checks into game state evaluation
- [ ] 8.7 Write unit tests for pipeline stages, cooldown enforcement, door-close timing

## 9. Mentor Characters

- [ ] 9.1 Create src/data/characters/mentors.ts with Grace Lee Boggs definition and data
- [ ] 9.2 Implement mentor availability check: cooldownMonths since last meeting
- [ ] 9.3 Implement mentor meeting action: spend 1 slot, produce yieldAmount to yieldType, add bufferGain
- [ ] 9.4 Implement Grace's unlock condition: any Overton topic > 30% OR community trust > 65 by month 24
- [ ] 9.5 Create mentor LLM system prompt template with philosophy, game state context, burnout awareness
- [ ] 9.6 Write unit tests for mentor availability, yield application, unlock conditions

## 10. LLM Integration

- [ ] 10.1 Add burnout state to LLM system prompt builder in src/systems/llm-service.ts
- [ ] 10.2 Define burnout context strings per state (sustainable/overextended/burnout)
- [ ] 10.3 Apply burnout effectiveness modifier to parsed [TRUST: N] outcomes
- [ ] 10.4 Add charm reduction prompt modifiers for burnout state NPCs
- [ ] 10.5 Write integration tests for prompt generation with burnout context

## 11. UI - Inline Actions & Stamina Bar

- [ ] 11.1 Create CalendarBar.tsx component (stamina bar with color states and crisis tax indicator)
- [ ] 11.2 Add inline action buttons to TileDetailPanel with slot costs displayed
- [ ] 11.3 Add inline interaction buttons to character cards with slot costs and yield preview
- [ ] 11.4 Add overschedule warning to action buttons when slots would push past budget
- [ ] 11.5 Add burnout state indicator near stamina bar (icon + tooltip with current state)
- [ ] 11.6 Remove NarrativePanel.tsx and its tab from the UI
- [ ] 11.7 Add "Rest Day" button to calendar bar (costs 1 slot, +3 buffer, political cost warning)
- [ ] 11.8 Style all new components in index.css

## 12. UI - Calendar Grid & Year View

- [ ] 12.1 Create CalendarGrid.tsx (expandable monthly view showing all 60 slots as cells)
- [ ] 12.2 Implement cell states: fixed (gray), spent (colored by action type), available (open), taxed (crisis indicator)
- [ ] 12.3 Add spent-slot detail on hover/tap (action type + NPC name)
- [ ] 12.4 Create CalendarYear.tsx (48-month heatmap by neighborhood)
- [ ] 12.5 Implement neighborhood color coding and time-allocation intensity
- [ ] 12.6 Wire year view into election event UI
- [ ] 12.7 Add calendar portrait narrative generation for election summary
- [ ] 12.8 Style calendar grid and year heatmap in index.css

## 13. Election Integration

- [ ] 13.1 Track per-neighborhood slot allocation across all 48 months in calendar state
- [ ] 13.2 Implement election calendar weight: 30% of voter evaluation from time allocation
- [ ] 13.3 Implement equitable distribution bonus (+5% when no neighborhood < 10% of average)
- [ ] 13.4 Implement neglect penalty (-15% per neighborhood < 5% total time)
- [ ] 13.5 Generate opponent attack events from calendar data (neglected neighborhoods, burnout history)
- [ ] 13.6 Write unit tests for election scoring with calendar data

## 14. Data & Balance

- [ ] 14.1 Assign slotTax values to all existing crisis arc stages in src/data/arcs/
- [ ] 14.2 Define slot costs per action type in balance constants
- [ ] 14.3 Define resource yield base multipliers matrix (relationship type × resource type)
- [ ] 14.4 Calculate prevention ROI for each preventative project and add to project-catalog
- [ ] 14.5 Add decay thresholds and rates to NPC tier definitions
- [ ] 14.6 Create balance sandbox mode flag for testing parameter changes

## 15. Feature Flag & Migration

- [ ] 15.1 Add useCalendarSlots feature flag to game state
- [ ] 15.2 Wire conditional logic: when flag true use calendar system, when false use legacy narrative
- [ ] 15.3 Implement save version detection and automatic migration on load
- [ ] 15.4 Test migration with existing save states
- [ ] 15.5 Once stable: remove feature flag, delete narrative.ts and NarrativePanel, clean up conditional paths
