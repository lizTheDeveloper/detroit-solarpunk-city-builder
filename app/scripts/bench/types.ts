/**
 * Shared types for the benchmark harness. Kept separate from game types so the
 * harness has one clear data contract that both entry scripts and the reporting
 * layer depend on.
 */

import type { GameState, GameAction, Proposal, Meters } from '../../src/state/types.ts';

/** A structured, decision-ready snapshot of one turn handed to an agent. */
export interface TurnView {
  turn: number;
  season: string;
  year: number;
  stage: string;
  meters: Meters;
  /** Active proposals annotated with their project's effects + cost. */
  proposals: ProposalView[];
  /** Policies not yet active, annotated with whether will currently allows enacting. */
  policies: PolicyView[];
  /** Calendar actions currently affordable given remaining discretionary slots. */
  calendar: CalendarOption[];
  slotsRemaining: number;
  /** Neighborhoods, for calendar targeting and equity. */
  tiles: Array<{ id: string; name: string; gentrification: number; eco: number }>;
  /** True when the next 1-2 turns are an election (decision pressure). */
  electionSoon: boolean;
}

export interface ProposalView {
  proposal: Proposal;
  projectName: string;
  cost: number;
  durationTurns: number;
  /** Net effect tags from the project definition, for archetype heuristics. */
  effects: {
    eco: number;
    food: number;
    trust: number;
    gentrification: number;
    annualRevenue: number;
  };
  tileName: string;
}

export interface PolicyView {
  id: string;
  name: string;
  willThresholdPct: number; // baseThreshold * 100
  enactable: boolean;
  effects: { trust: number; eco: number; food: number; budget: number };
}

export interface CalendarOption {
  actionType: string;
  slotCost: number;
}

/** One turn's record in the full preserved log. */
export interface TurnRecord {
  turn: number;
  metersBefore: Meters;
  metersAfter: Meters;
  /** Actions the agent returned that actually changed state. */
  appliedActions: GameAction[];
  /** Proposal ids the agent accepted / modified / rejected / left to expire. */
  proposalDisposition: ProposalDisposition;
  events: Array<{ id: string; title: string; choiceId: string }>;
  /** LLM-only: the prompt sent and the raw response (omitted for archetypes). */
  prompt?: string;
  rawResponse?: string;
}

export interface ProposalDisposition {
  accept: number;
  modify: number;
  reject: number;
  /** Proposals that were active but never addressed before regeneration. */
  ignoredExpired: number;
}

/** The complete outcome of one game, including the full per-turn log. */
export interface GameResult {
  agentId: string;
  seed: number;
  turnsPlayed: number;
  finalState: GameState;
  turns: TurnRecord[];
}

/** Derived analysis of a GameResult (the benchmark unit). */
export interface GameMetrics {
  agentId: string;
  seed: number;
  outcome: 'win' | 'loss' | 'survived';
  condition: string | null; // win/loss condition string
  turnsPlayed: number;
  /** Canonical in-game mayor-quality score (calculateElectionScore), 0-50ish. */
  electionScore: number;
  electionBreakdown: Record<string, number>;
  /** Per-meter summary, keyed generically so new meters appear automatically. */
  meters: Record<string, MeterSummary>;
  fingerprint: Fingerprint;
}

export interface MeterSummary {
  final: number;
  min: number;
  max: number;
  volatility: number; // stddev of the turn-by-turn series
}

export interface Fingerprint {
  proposals: ProposalDisposition;
  policiesEnacted: number;
  calendarActions: Record<string, number>;
  eventChoices: Record<string, number>;
  /** Gini of completed projects across tiles (0 = perfectly equal, 1 = all in one). */
  neighborhoodGini: number;
}

export interface RunOptions {
  maxTurns?: number; // default 48
}
