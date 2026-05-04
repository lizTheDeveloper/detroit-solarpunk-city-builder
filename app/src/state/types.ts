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

export type ProjectMode = 'player-initiated' | 'community-led';

export type ProjectCategory = 'ecology' | 'infrastructure' | 'community' | 'restoration';

export type GrowthCategory = 'growth' | 'de-growth' | 'neither';

export type ProposalResponse = 'accept' | 'modify' | 'defer' | 'reject';

export type PoliticalLeaning = 'progressive' | 'moderate' | 'moderate-conservative' | 'conservative';

export type TurnPhase = 'events' | 'player-actions' | 'resolve';

export type EventCategory = 'climate' | 'political' | 'community' | 'crisis' | 'antagonist';

export type NarrativeActionType =
  | 'community_meeting'
  | 'media_campaign'
  | 'education_program'
  | 'cultural_event'
  | 'demonstration'
  | 'direct_engagement'
  | 'lobbying';

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
}

export interface ProjectDefinition {
  id: string;
  name: string;
  category: ProjectCategory;
  growthCategory: GrowthCategory;
  baseCost: number;
  baseDuration: number;
  effects: ProjectEffects;
  maxContamination: number | null;
  stageRequired: Stage;
  terrainRequired: TerrainType[] | null;
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
}

export interface NarrativeState {
  actionsRemaining: number;
  actionsPerTurn: number;
  consecutiveTurns: Record<string, number>;
  counterNarrativeCooldowns: Record<string, number>;
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

export interface Proposal {
  id: string;
  leaderId: string;
  projectDefinitionId: string;
  tileId: string;
  reason: string;
  turnProposed: number;
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
}

export interface GameState {
  version: 2;
  turn: number;
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
  narrativeState: NarrativeState;
  coalitions: Coalition[];
  eventQueue: GameEvent[];
  eventCooldowns: Record<string, number>;
  councilVoteHistory: CouncilVote[];
  turnSummary: TurnSummary | null;
  turnHistory: TurnSummary[];
  maxConcurrentProjects: number;
}

export type GameAction =
  | { type: 'START_PROJECT'; tileId: string; projectId: string; mode: ProjectMode }
  | { type: 'RESPOND_PROPOSAL'; proposalId: string; response: ProposalResponse }
  | { type: 'ENACT_POLICY'; policyId: string }
  | { type: 'NARRATIVE_ACTION'; actionType: NarrativeActionType; target: string; topic: string }
  | { type: 'RESPOND_EVENT'; eventId: string; choiceId: string }
  | { type: 'LOBBY_COUNCIL'; memberId: string; policyId: string; argumentAlignment: 'high' | 'medium' | 'low' }
  | { type: 'FORM_COALITION'; name: string; memberIds: string[]; topic: string }
  | { type: 'CAMPAIGN_ACTION'; actionType: 'rally' | 'promise' | 'coalition_building' }
  | { type: 'END_TURN' }
  | { type: 'PREPARE_TURN' }
  | { type: 'ADVANCE_PHASE' };
