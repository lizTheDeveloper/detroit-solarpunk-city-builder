/**
 * Deterministic strategy archetypes. Each is a pure heuristic over TurnView
 * (the "random" archetype uses the seeded global Math.random, so it too is
 * reproducible). Together they probe the strategy space the Monte-Carlo maps.
 *
 * Levers used: proposal disposition (accept/modify/reject), policy enactment,
 * calendar actions (with neighborhood targeting for equity), and event choice.
 */

import type { GameAction, GameEvent } from '../../src/state/types.ts';
import type { DecisionAgent } from './agent.ts';
import type { TurnView, ProposalView, PolicyView } from './types.ts';

/** Weight an archetype places on each meter direction (climate is a cost). */
interface Weights {
  trust: number; eco: number; food: number; will: number; budget: number; climate: number;
  /** Penalty multiplier applied to a proposal's gentrification effect. */
  gentrificationAversion: number;
  /** 0..1 baseline willingness to accept a marginal proposal. */
  acceptBias: number;
}

function proposalScore(p: ProposalView, w: Weights): number {
  return (
    p.effects.eco * w.eco +
    p.effects.food * w.food +
    p.effects.trust * w.trust +
    p.effects.annualRevenue * 10 * w.budget -
    Math.max(0, p.effects.gentrification) * w.gentrificationAversion
  );
}

function policyScore(p: PolicyView, w: Weights): number {
  return p.effects.trust * w.trust + p.effects.eco * w.eco + p.effects.food * w.food + p.effects.budget * w.budget;
}

/** Score an event choice by its meter deltas under the archetype's weights. */
function eventChoiceScore(deltas: Array<{ meter: string; amount: number }>, w: Weights): number {
  const map: Record<string, number> = {
    communityTrust: w.trust, ecologicalHealth: w.eco, foodSovereignty: w.food,
    politicalWill: w.will, budget: w.budget, climatePressure: -w.climate,
  };
  return deltas.reduce((s, d) => s + (map[d.meter] ?? 0) * d.amount, 0);
}

/**
 * Build a DecisionAgent from a weight profile. `intensity` controls how many
 * slots of calendar work it does per turn; `rotateTiles` spreads calendar time
 * for equity (vs. always hitting the same neighborhood).
 */
function makeArchetype(
  id: string,
  w: Weights,
  opts: { intensity: number; rotateTiles: boolean; usePolicies: boolean },
): DecisionAgent {
  let tileCursor = 0;
  return {
    id,
    async decide(view: TurnView): Promise<GameAction[]> {
      const actions: GameAction[] = [];

      // Proposals: accept positive-scoring ones, reject strongly negative, leave
      // the rest to expire (no fake defer).
      for (const pv of view.proposals) {
        const score = proposalScore(pv, w);
        const acceptThreshold = (1 - w.acceptBias) * 5; // higher bias → lower bar
        if (score >= acceptThreshold) {
          actions.push({ type: 'RESPOND_PROPOSAL', proposalId: pv.proposal.id, response: 'accept' });
        } else if (score < -3) {
          actions.push({ type: 'RESPOND_PROPOSAL', proposalId: pv.proposal.id, response: 'reject' });
        }
        // else: ignored → expires
      }

      // Policy: enact the best-aligned enactable policy (one per turn).
      if (opts.usePolicies) {
        const best = view.policies
          .filter((p) => p.enactable && policyScore(p, w) > 0)
          .sort((a, b) => policyScore(b, w) - policyScore(a, w))[0];
        if (best) actions.push({ type: 'ENACT_POLICY', policyId: best.id });
      }

      // Calendar: spend up to `intensity` community meetings, targeting the most
      // gentrification-pressured tile (justice) or rotating for equity.
      let slots = view.slotsRemaining;
      const canMeet = view.calendar.find((c) => c.actionType === 'community_meeting');
      for (let n = 0; n < opts.intensity && canMeet && slots >= canMeet.slotCost && view.tiles.length > 0; n++) {
        let tile;
        if (opts.rotateTiles) {
          tile = view.tiles[tileCursor % view.tiles.length];
          tileCursor++;
        } else {
          tile = [...view.tiles].sort((a, b) => b.gentrification - a.gentrification)[0];
        }
        actions.push({ type: 'CALENDAR_ACTION', actionType: 'community_meeting', tileId: tile.id });
        slots -= canMeet.slotCost;
      }

      return actions;
    },
    async chooseEvent(event: GameEvent): Promise<string> {
      if (event.choices.length === 0) return '';
      let best = event.choices[0];
      let bestScore = -Infinity;
      for (const c of event.choices) {
        const s = eventChoiceScore(c.effects.meterDeltas, w);
        if (s > bestScore) { bestScore = s; best = c; }
      }
      return best.id;
    },
  };
}

const BALANCED: Weights = { trust: 1, eco: 1, food: 1, will: 0.5, budget: 1, climate: 1, gentrificationAversion: 1, acceptBias: 0.5 };

export const ARCHETYPES: DecisionAgent[] = [
  makeArchetype('balanced', BALANCED, { intensity: 1, rotateTiles: true, usePolicies: true }),
  makeArchetype('aggressive-growth',
    { trust: 0.5, eco: 1, food: 0.5, will: 0.5, budget: 2, climate: 0.2, gentrificationAversion: 0, acceptBias: 0.9 },
    { intensity: 1, rotateTiles: false, usePolicies: true }),
  makeArchetype('justice-first',
    { trust: 1.5, eco: 1, food: 1, will: 0.5, budget: 0.3, climate: 1, gentrificationAversion: 4, acceptBias: 0.4 },
    { intensity: 2, rotateTiles: true, usePolicies: true }),
  makeArchetype('eco-first',
    { trust: 0.7, eco: 2.5, food: 2, will: 0.3, budget: 0.3, climate: 2, gentrificationAversion: 1, acceptBias: 0.6 },
    { intensity: 1, rotateTiles: true, usePolicies: true }),
  makeArchetype('neglectful',
    { trust: 0, eco: 0, food: 0, will: 0, budget: 0, climate: 0, gentrificationAversion: 0, acceptBias: 0 },
    { intensity: 0, rotateTiles: false, usePolicies: false }),
  randomArchetype('random'),
];

/** Random archetype — uses the seeded global Math.random, so it's reproducible. */
function randomArchetype(id: string): DecisionAgent {
  return {
    id,
    async decide(view: TurnView): Promise<GameAction[]> {
      const actions: GameAction[] = [];
      for (const pv of view.proposals) {
        const r = Math.random();
        if (r < 0.4) actions.push({ type: 'RESPOND_PROPOSAL', proposalId: pv.proposal.id, response: 'accept' });
        else if (r < 0.6) actions.push({ type: 'RESPOND_PROPOSAL', proposalId: pv.proposal.id, response: 'reject' });
      }
      if (view.policies.length > 0 && Math.random() < 0.3) {
        const enactable = view.policies.filter((p) => p.enactable);
        if (enactable.length > 0) {
          actions.push({ type: 'ENACT_POLICY', policyId: enactable[Math.floor(Math.random() * enactable.length)].id });
        }
      }
      const meet = view.calendar.find((c) => c.actionType === 'community_meeting');
      if (meet && view.tiles.length > 0 && view.slotsRemaining >= meet.slotCost && Math.random() < 0.5) {
        const tile = view.tiles[Math.floor(Math.random() * view.tiles.length)];
        actions.push({ type: 'CALENDAR_ACTION', actionType: 'community_meeting', tileId: tile.id });
      }
      return actions;
    },
    async chooseEvent(event: GameEvent): Promise<string> {
      if (event.choices.length === 0) return '';
      return event.choices[Math.floor(Math.random() * event.choices.length)].id;
    },
  };
}
