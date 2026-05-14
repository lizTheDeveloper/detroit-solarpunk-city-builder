// ---------------------------------------------------------------------------
// Crisis Arc Engine Types
// ---------------------------------------------------------------------------

/**
 * Arc lifecycle stages. Each arc progresses through these stages
 * driven by headline data and player action/inaction.
 */
export type ArcStage =
  | 'dormant'
  | 'foreshadow'
  | 'escalation'
  | 'crisis'
  | 'reckoning'
  | 'resolved';

/**
 * The dependency web tracks boolean conditions and numeric capacities
 * created by player choices. Future event availability checks these.
 */
export interface DependencyWeb {
  conditions: Set<string>;
  capacities: Map<string, number>;
}

/**
 * Effect types that a delayed consequence can apply when it fires.
 */
export type ConsequenceEffect =
  | { type: 'meterDelta'; meter: string; amount: number }
  | { type: 'tileDamage'; tileId: string | null; damage: number }
  | { type: 'spawnEvent'; eventId: string }
  | { type: 'conditionChange'; condition: string; action: 'add' | 'remove' }
  | { type: 'slotTax'; slots: number; reason: string };

/**
 * A consequence scheduled to fire at a future turn. Can be cancelled
 * if the player takes action between scheduling and triggering.
 */
export interface DelayedConsequence {
  id: string;
  arcId: string;
  triggerTurn: number;
  activationConditions: string[];
  cancelConditions: string[];
  effects: ConsequenceEffect[];
  foreshadowHint: string;
  hintTurnsBeforeTrigger: number;
}

/**
 * An arc that is currently tracked in the game. May be at any stage
 * from dormant to resolved.
 */
export interface ActiveArc {
  arcId: string;
  currentStage: ArcStage;
  stageEnteredTurn: number;
  inactionTimer: number;
  lastEventTurn: number;
  initializedFromSnapshot: boolean;
}

/**
 * Configuration for an arc's transition thresholds and timing.
 * Read from arc template data.
 */
export interface ArcConfig {
  arcId: string;
  escalationThreshold: number;
  maxTurnsAtEscalation: number;
  minStageDuration: Record<ArcStage, number>;
  preventionConditions: string[];
  reckoningDelay: number;
  cooldownAfterResolution: number;
}

/**
 * Arc state data received from the live-news-pipeline API.
 * Represents the real-world state of an arc at a point in time.
 */
export interface PipelineArcState {
  arcId: string;
  stage: ArcStage;
  weeklyHits: number;
  maxSeverity: number;
  lastHeadlineTimestamp: string | null;
}

/**
 * Serializable version of DependencyWeb for save/load.
 */
export interface SerializedDependencyWeb {
  conditions: string[];
  capacities: Record<string, number>;
}
