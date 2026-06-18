import type { ActiveArc, DelayedConsequence, SerializedDependencyWeb } from './crisis-types';

// Re-export crisis types for convenience
export type { ActiveArc, DelayedConsequence, SerializedDependencyWeb, ArcStage, DependencyWeb, ConsequenceEffect, ArcConfig, PipelineArcState } from './crisis-types';

// Byproduct Flow types
export type ByproductId =
  | 'compost' | 'clean_soil' | 'lumber' | 'biomass'
  | 'fabrication_capacity' | 'recycled_materials'
  | 'stormwater_capacity' | 'community_knowledge'
  | 'clean_energy' | 'native_seed_stock' | 'secure_land';

export type ByproductLifetime = 'ongoing' | 'one-shot';
export type ByproductBonusType = 'costReduction' | 'durationReduction' | 'effectBoost';

export interface ByproductOutput {
  byproductId: ByproductId;
  lifetime: ByproductLifetime;
  amount: number;
}

export interface ByproductInput {
  byproductId: ByproductId;
  bonusType: ByproductBonusType;
  bonusValue: number;
  effectField?: keyof ProjectEffects;
}

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export type Stage = 'awakening' | 'transition' | 'restoration' | 'beyond';

export type SpecializationPath = 'ecology' | 'community' | 'policy' | null;

export type TerrainType = 'urban-dense' | 'urban-sparse' | 'vacant' | 'industrial' | 'waterfront' | 'park' | 'water';

export type ExistingUse =
  | 'vacant_lot'
  | 'abandoned_factory'
  | 'occupied_housing'
  | 'small_businesses'
  | 'community_garden'
  | 'church'
  | 'school'
  | 'active_industrial'
  | 'parking_lot'
  | 'brownfield'
  | 'historic_site';

export type VisualStage = 'dystopia' | 'transition' | 'restoration' | 'beyond';

export type ProjectMode = 'player-initiated' | 'community-led' | 'direct-action';

export type ProjectCategory = 'ecology' | 'infrastructure' | 'community' | 'restoration';

export type GrowthCategory = 'growth' | 'de-growth' | 'neither';

export type ProposalResponse = 'accept' | 'modify' | 'reject';

export type PoliticalLeaning = 'progressive' | 'moderate' | 'moderate-conservative' | 'conservative';

export type TurnPhase = 'events' | 'player-actions' | 'resolve';

export type EventCategory = 'climate' | 'political' | 'community' | 'crisis' | 'antagonist';

export type RelationshipLevel =
  | 'partner' | 'champion' | 'advocate' | 'neutral'
  | 'disillusioned' | 'opposition' | 'hostile';

export type DispositionLevel =
  | 'coalition_partner' | 'ally' | 'lean_yes' | 'neutral'
  | 'skeptic' | 'opponent' | 'adversary';

export interface Meters {
  communityTrust: number;
  ecologicalHealth: number;
  foodSovereignty: number;
  politicalWill: number;
  budget: number;
  climatePressure: number;
}

export interface Tile {
  id: string;
  name: string;
  terrain: TerrainType;
  vacancyRate: number;
  ecologicalHealth: number;
  contamination: number;
  gentrificationPressure: number;
  existingUses: ExistingUse[];
  neighborhoodTraits: string[];
  activeProjects: ActiveProject[];
  completedProjects: string[];
  communityPowerTokens: number;
  communityOwned: boolean;
  adjacentTileIds: string[];
  visualStage: VisualStage;
  consumedByproducts: string[];
  vacantLots: number;
  reclaimedLots: number;
}

export interface ProjectDefinition {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  growthCategory: GrowthCategory;
  baseCost: number;
  baseDuration: number;
  maintenanceCost: number;
  effects: ProjectEffects;
  maxContamination: number | null;
  stageRequired: Stage;
  terrainRequired: TerrainType[] | null;
  produces: ByproductOutput[];
  consumes: ByproductInput[];
}

export interface ProjectEffects {
  tileEco: number;
  foodSov: number;
  trust: number;
  annualRevenue: number;
  contaminationReduction: number;
  gentrificationChange: number;
  other: string[];
}

export interface ActiveProject {
  definitionId: string;
  tileId: string;
  mode: ProjectMode;
  progress: number;
  duration: number;
  cost: number;
  blockId?: string;
}

export interface CommunityLeader {
  id: string;
  name: string;
  neighborhood: string;
  tileIds: string[];
  backstory: string;
  priorities: string[];
  trust: number;
  advocacyPower: number;
  proposalCooldown: number;
  consecutiveDeferrals: number;
  urgencyWindow?: number;
}

export interface CouncilMember {
  id: string;
  name: string;
  district: string;
  districtNumber: number;
  leaning: PoliticalLeaning;
  priorities: string[];
  disposition: number;
  backstory: string;
  tileIds: string[];
}

/** Frozen outcome of the Marcus arc, set once at the Phase 3→4 transition. */
export type MarcusResolutionType =
  | 'reluctant_ally'
  | 'election_threat'
  | 'cynicism_engine'
  | null;

/**
 * A single recorded player response to a Marcus Webb arc event.
 * This is the canonical log from which the confront/ignore tallies (driving
 * phase transitions and the Phase 4 resolution branch) are derived.
 */
export interface MarcusResponse {
  turn: number;
  eventType: string;
  choiceId: string;
  /** Bucketed interpretation of the choice for ratio math. */
  kind: 'confront' | 'ignore' | 'co_opt' | 'strategic';
  /**
   * Whether the choice's effects were actually applied. A choice whose
   * requirements (min will/budget/trust) were unmet is still logged, but it
   * does NOT count toward the confront/ignore tallies — matching the legacy
   * behavior where blocked choices skipped the arc counters. Defaults to true.
   */
  applied?: boolean;
}

export interface Antagonist {
  id: string;
  name: string;
  role: string;
  activationCondition: string;
  escalationLevel: number;
  escalationInterval: number;
  active: boolean;
  lastEscalationTurn: number;
  tileTargets: string[];
  // --- Marcus Webb arc (flat fields — the single source of truth) ---
  // These are optional/defaulted so other antagonists keep working unchanged.
  // Marcus's definition initializes them; marcus-arc.ts is the state-machine home
  // and events.ts reads/writes them when building and tracking arc events. The
  // confront/ignore/co-opt tallies are DERIVED from responseHistory (see
  // marcus-arc.ts `tallyResponses`), not stored.
  /** Current arc phase: 1 Gadfly, 2 Demagogue, 3 Power Broker, 4 Resolution. */
  arcPhase?: 1 | 2 | 3 | 4;
  /** Chronological log of player responses to Marcus events. */
  responseHistory?: MarcusResponse[];
  /** Number of events fired in the current phase (resets on transition). */
  phaseEventCount?: number;
  /** Whether the Sterling Cross funding motivation has been surfaced. */
  motivationRevealed?: boolean;
  /** Resolution branch, frozen once at the Phase 3→4 transition. */
  resolutionType?: MarcusResolutionType;
}

export interface PolicyDefinition {
  id: string;
  name: string;
  baseThreshold: number;
  enactmentCost: number;
  ongoingDrain: number;
  effects: PolicyEffects;
  requiresCouncilVote: boolean;
}

export interface PolicyEffects {
  trustBonus: number;
  ecoBonus: number;
  foodSovBonus: number;
  budgetBonus: number;
  projectCostModifier: Record<string, number>;
  other: string[];
}

export interface ActivePolicy {
  definitionId: string;
  enactedTurn: number;
}

export interface PublicOpinion {
  foodSovereignty: number;
  waterCommons: number;
  landReform: number;
  ecologicalRestoration: number;
  cooperativeEconomics: number;
  // Taboo-specific topics (gate radical solutions via Overton window)
  nutrientRecycling: number;
  nuclearEnergy: number;
  landExpropriation: number;
  decarceration: number;
  deGrowth: number;
}

// Calendar Slot System types
export type BurnoutState = 'sustainable' | 'overextended' | 'burnout' | 'collapse';

export type CalendarActionType =
  | 'community_meeting'      // 2 slots
  | 'proposal_review'        // 1 slot
  | 'deep_conversation'      // 2 slots
  | 'public_event'           // 3 slots
  | 'quick_check_in'         // 1 slot
  | 'rest_day'               // 1 slot
  | 'delegation_hire'        // 3 slots
  | 'strategic_cultivation'  // 2 slots
  | 'mentor_meeting';        // 1 slot

export interface CalendarState {
  totalSlots: number;           // 60
  fixedSlots: number;           // 38 base (reduced by delegation)
  discretionarySlots: number;   // derived: total - fixed - crisisTax
  slotsSpent: number;
  overscheduleAmount: number;
  overscheduleLimit: number;    // 5
  burnoutBuffer: number;        // 0-20, starts at 15
  burnoutBufferMax: number;     // 20
  burnoutState: BurnoutState;
  consecutiveRecoveryMonths: number;
  interactionsThisMonth: Record<string, number>; // npcId → count
  lastInteractionMonth: Record<string, number>;  // npcId → last month number
  monthNumber: number;
  delegationTier: number;       // 0-4
  crisisSlotTax: number;        // sum of active arc taxes
  neighborhoodTimeAllocation: Record<string, number[]>; // tileId → slots per month (48 entries)
  leaderTrustGrantedThisMonth: Record<string, boolean>; // leaderId → already gained trust this month
}

export type StrategicContactStage = 'undiscovered' | 'discovery' | 'introduction' | 'cooldown' | 'follow_up' | 'established' | 'deepening' | 'closed';

export interface StrategicContact {
  id: string;
  name: string;
  stage: StrategicContactStage;
  cooldownRemaining: number;
  patienceTimer: number;
  monthsEstablished: number;
  yieldMultiplier: number;
  introducerId: string | null;
}

export interface MentorCharacter {
  id: string;
  name: string;
  philosophy: string;
  cooldownMonths: number;
  lastMetMonth: number;
  yieldType: keyof Meters | 'overton';
  yieldAmount: number;
  bufferGain: number;
  unlocked: boolean;
}

export interface GameEvent {
  id: string;
  type: string;
  category: EventCategory;
  title: string;
  description: string;
  choices: EventChoice[];
  turnGenerated: number;
  cooldownTurns: number;
  targetTileId: string | null;
  targetCharacterId: string | null;
  arcId?: string;
  crisisForkId?: string;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  effects: EventChoiceEffects;
  requirements: EventChoiceRequirements | null;
}

export interface EventChoiceEffects {
  meterDeltas: MeterDelta[];
  relationshipChanges: RelationshipChange[];
  other: string[];
}

export interface EventChoiceRequirements {
  minWill: number | null;
  minBudget: number | null;
  minTrust: number | null;
}

export interface RelationshipChange {
  characterId: string;
  characterType: 'leader' | 'council';
  amount: number;
  source: string;
}

export interface Coalition {
  id: string;
  name: string;
  memberIds: string[];
  topic: string;
  active: boolean;
  formedTurn: number;
}

export interface CouncilVote {
  policyId: string;
  turn: number;
  votes: CouncilMemberVote[];
  passed: boolean;
  margin: number;
}

export interface CouncilMemberVote {
  memberId: string;
  vote: 'yes' | 'no' | 'abstain';
  score: number;
  factors: VoteFactor[];
}

export interface VoteFactor {
  source: string;
  value: number;
}

export interface CounterNarrative {
  type: string;
  willDrain: number;
  otherEffect: string;
  probability: number;
  trigger: string | null;
}

export interface ProposalNegotiation {
  costMultiplier: number;
  leaderContribution: number;
  durationModifier: number;
}

export interface Proposal {
  id: string;
  leaderId: string;
  projectDefinitionId: string;
  tileId: string;
  reason: string;
  turnProposed: number;
  expirationTurn: number;
  pressureLevel: number;
  negotiation?: ProposalNegotiation;
}

export interface MeterDelta {
  meter: keyof Meters;
  amount: number;
  source: string;
}

export interface TurnSummary {
  turn: number;
  season: Season;
  year: number;
  deltas: MeterDelta[];
  completedProjects: string[];
  proposals: Proposal[];
  tileTransformations: Array<{ tileId: string; from: VisualStage; to: VisualStage }>;
  firedConsequences: Array<{ arcId: string; hint: string }>;
  arcTransitions: Array<{ arcId: string; from: string; to: string }>;
}

export interface GameState {
  version: 2;
  turn: number;
  month: number; // 1-12
  season: Season;
  year: number;
  phase: TurnPhase;
  stage: Stage;
  path: SpecializationPath;
  meters: Meters;
  tiles: Record<string, Tile>;
  leaders: Record<string, CommunityLeader>;
  councilMembers: Record<string, CouncilMember>;
  antagonists: Record<string, Antagonist>;
  activeProposals: Proposal[];
  pendingProposals: Proposal[];
  activePolicies: ActivePolicy[];
  publicOpinion: PublicOpinion;
  coalitions: Coalition[];
  eventQueue: GameEvent[];
  eventCooldowns: Record<string, number>;
  councilVoteHistory: CouncilVote[];
  turnSummary: TurnSummary | null;
  turnHistory: TurnSummary[];
  maxConcurrentProjects: number;
  regionalCities: Record<string, RegionalCity>;
  activeTransfers: ResourceTransfer[];
  regionalProjects: RegionalProject[];
  continentalGoals: ContinentalGoal[];
  winCondition: WinCondition;
  lossCondition: LossCondition;
  sandbox: boolean;
  // Crisis Arc Engine state
  dependencyWeb: SerializedDependencyWeb;
  delayedConsequenceQueue: DelayedConsequence[];
  activeArcs: ActiveArc[];
  resolvedArcs: Array<{ arcId: string; resolvedTurn: number }>;
  // Tutorial / NUX progression
  tutorialState: TutorialState;
  // Advisor prompts state
  advisorState: AdvisorState;
  // Calendar Slot System
  calendarState: CalendarState;
  strategicContacts: StrategicContact[];
  mentors: MentorCharacter[];
  // Map integration
  mapState: {
    selectedBlockId: string | null;
    viewState: { longitude: number; latitude: number; zoom: number };
  };
  // Block-level data keyed by blockId (populated from CityPackage)
  blockDataMap: Record<string, import('../map/block-layer').BlockData>;
}

export type GameAction =
  | { type: 'START_PROJECT'; tileId: string; projectId: string; mode: ProjectMode; blockId?: string }
  | { type: 'RESPOND_PROPOSAL'; proposalId: string; response: ProposalResponse }
  | { type: 'ENACT_POLICY'; policyId: string }
  | { type: 'RESPOND_EVENT'; eventId: string; choiceId: string }
  | { type: 'LOBBY_COUNCIL'; memberId: string; policyId: string; argumentAlignment: 'high' | 'medium' | 'low' }
  | { type: 'FORM_COALITION'; name: string; memberIds: string[]; topic: string }
  | { type: 'CAMPAIGN_ACTION'; actionType: 'rally' | 'promise' | 'coalition_building' }
  | { type: 'RECLAIM_LOT'; tileId: string }
  | { type: 'CONVERSATION_OUTCOME'; characterId: string; trustDelta: number }
  | { type: 'NEGOTIATE_PROPOSAL'; proposalId: string; negotiation: ProposalNegotiation }
  | { type: 'END_TURN' }
  | { type: 'PREPARE_TURN' }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'CALENDAR_ACTION'; actionType: CalendarActionType; targetId?: string; tileId?: string }
  | { type: 'CALENDAR_REST_DAY' }
  | { type: 'DELEGATION_HIRE'; tier: number }
  | { type: 'STRATEGIC_CONTACT_ADVANCE'; contactId: string }
  | { type: 'MENTOR_MEETING'; mentorId: string }
  | { type: 'MAP_SELECT_BLOCK'; blockId: string; neighborhoodId: string }
  | { type: 'MAP_SET_VIEW'; viewState: { longitude: number; latitude: number; zoom: number } };

// Beyond the Map types
export type CityRelationship = 'neutral' | 'cooperative' | 'allied';

export interface RegionalCity {
  id: string;
  name: string;
  population: number;
  stage: Stage;
  meters: {
    ecologicalHealth: number;
    foodSovereignty: number;
    communityTrust: number;
  };
  relationship: CityRelationship;
  transfersReceived: number;
  templatesReceived: string[];
  regionalProjectsCompleted: number;
  meterImprovementSinceUnlock: number;
}

export interface ResourceTransfer {
  type: 'budget' | 'template' | 'expertise';
  targetCityId: string;
  amount?: number; // for budget
  projectId?: string; // for template
  turnsRemaining?: number; // for expertise
}

export interface RegionalProject {
  id: string;
  name: string;
  requiredCities: number;
  costPerCity: number;
  duration: number;
  continentalGoal: string;
  goalProgress: number;
  participatingCities: string[];
  turnsRemaining: number;
  active: boolean;
}

export interface ContinentalGoal {
  id: string;
  name: string;
  progress: number; // 0-100
  description: string;
}

export interface TutorialState {
  active: boolean;
  completedSteps: string[];
  dismissedTooltips: string[];
}

export interface AdvisorState {
  dismissedConditions: string[];
  cooldowns: Record<string, number>; // conditionId → turn when cooldown expires
}

export type WinCondition = 'cooperative' | 'survival' | null;
export type LossCondition = 'reelection' | 'budget_collapse' | 'climate_catastrophe' | null;
