/**
 * Deterministic strategy archetypes. THIS GAME IS A CALENDAR GAME: the core
 * decision each turn is how to allocate ~22 scarce discretionary slots across
 * 19 neighborhoods over time, while managing a burnout buffer. Archetypes that
 * leave slots unspent aren't playing it — so every active archetype here runs a
 * real calendar planner (greedy spread to the least-served neighborhoods),
 * differing in how much they invest (meetings vs cheap check-ins), where
 * (eco / gentrification / pure equity), and how they manage burnout.
 *
 * The "random" archetype uses the seeded global Math.random, so it too is
 * reproducible.
 */

import type { GameAction, GameEvent } from '../../src/state/types.ts';
import type { DecisionAgent } from './agent.ts';
import type { TurnView } from './types.ts';

// ── Proposal policy ─────────────────────────────────────────────────────────

interface AcceptConfig {
  ecoW: number; foodW: number; trustW: number; revW: number;
  gentrificationAversion: number;
  acceptThreshold: number; // score ≥ → accept
}

function proposalActions(view: TurnView, c: AcceptConfig): GameAction[] {
  const out: GameAction[] = [];
  for (const pv of view.proposals) {
    const score =
      pv.effects.eco * c.ecoW + pv.effects.food * c.foodW + pv.effects.trust * c.trustW +
      pv.effects.annualRevenue * 10 * c.revW - Math.max(0, pv.effects.gentrification) * c.gentrificationAversion;
    if (score >= c.acceptThreshold) out.push({ type: 'RESPOND_PROPOSAL', proposalId: pv.proposal.id, response: 'accept' });
    else if (score < -3) out.push({ type: 'RESPOND_PROPOSAL', proposalId: pv.proposal.id, response: 'reject' });
  }
  return out;
}

// ── Calendar planner (the heart of play) ────────────────────────────────────

interface CalProfile {
  intensity: number;        // fraction of available slots to use (>1 overschedules → burnout)
  restThreshold: number;    // rest when burnout buffer fraction < this
  meetingBias: number;      // 0..1 chance to use community_meeting (2 slots, +trust/+eco) vs quick_check_in (1 slot)
  publicEventEvery: number; // emit a public_event every N turns (0 = never)
  priority: 'equity' | 'eco' | 'gentrification';
}

/**
 * Allocate the turn's slots. Always serves the least-served neighborhood first
 * (cumulative-time equity), so coverage equalizes over the game; invests costlier
 * community_meetings on tiles matching the archetype's priority.
 */
function planCalendar(view: TurnView, p: CalProfile, turn: number): GameAction[] {
  const actions: GameAction[] = [];
  if (view.tiles.length === 0 || p.intensity <= 0) return actions;

  const meetingCost = view.slotCosts['community_meeting'] ?? 2;
  const checkinCost = view.slotCosts['quick_check_in'] ?? 1;
  const eventCost = view.slotCosts['public_event'] ?? 3;

  let budget = Math.round(view.slotsRemaining * p.intensity);

  // Burnout management: rest when the buffer is low (skipped by intensity-heavy
  // archetypes with restThreshold 0).
  const burnoutFrac = view.burnout.max > 0 ? view.burnout.buffer / view.burnout.max : 1;
  if (burnoutFrac < p.restThreshold && budget >= 1) {
    actions.push({ type: 'CALENDAR_REST_DAY' });
    budget -= 1;
  }

  // Local running tally of cumulative time per tile, so we keep spreading within
  // the turn, not just across turns.
  const localAlloc = new Map<string, number>();
  for (const t of view.tiles) localAlloc.set(t.id, t.timeAllocated);

  // Occasional public event (trust + will) on the least-served tile.
  if (p.publicEventEvery > 0 && turn % p.publicEventEvery === 0 && budget >= eventCost) {
    const tile = leastServed(view, localAlloc, p);
    actions.push({ type: 'CALENDAR_ACTION', actionType: 'public_event', tileId: tile.id });
    localAlloc.set(tile.id, (localAlloc.get(tile.id) ?? 0) + eventCost);
    budget -= eventCost;
  }

  // Spread remaining slots, least-served first.
  while (budget >= checkinCost) {
    const tile = leastServed(view, localAlloc, p);
    const matchesPriority =
      p.priority === 'eco' ? tile.eco < 40 :
      p.priority === 'gentrification' ? tile.gentrification > 30 : true;
    const useMeeting = budget >= meetingCost && matchesPriority && Math.random() < p.meetingBias;
    const actionType = useMeeting ? 'community_meeting' : 'quick_check_in';
    const cost = useMeeting ? meetingCost : checkinCost;
    actions.push({ type: 'CALENDAR_ACTION', actionType, tileId: tile.id });
    localAlloc.set(tile.id, (localAlloc.get(tile.id) ?? 0) + cost);
    budget -= cost;
  }

  return actions;

  function leastServed(v: TurnView, alloc: Map<string, number>, prof: CalProfile) {
    return [...v.tiles].sort((a, b) => {
      const da = alloc.get(a.id) ?? 0, db = alloc.get(b.id) ?? 0;
      if (da !== db) return da - db; // equity first — least-served wins
      if (prof.priority === 'eco') return a.eco - b.eco;
      if (prof.priority === 'gentrification') return b.gentrification - a.gentrification;
      return 0;
    })[0];
  }
}

function enactBestPolicy(view: TurnView, ecoW: number, foodW: number, trustW: number): GameAction[] {
  const best = view.policies
    .filter((p) => p.enactable)
    .map((p) => ({ p, s: p.effects.eco * ecoW + p.effects.food * foodW + p.effects.trust * trustW + p.effects.budget }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)[0];
  return best ? [{ type: 'ENACT_POLICY', policyId: best.p.id }] : [];
}

// ── Build an archetype ──────────────────────────────────────────────────────

function archetype(
  id: string,
  accept: AcceptConfig,
  cal: CalProfile,
  eventWeights: { trust: number; eco: number; food: number; will: number; budget: number; climate: number },
): DecisionAgent {
  let turn = 0;
  return {
    id,
    async decide(view: TurnView): Promise<GameAction[]> {
      turn++;
      return [
        ...proposalActions(view, accept),
        ...enactBestPolicy(view, accept.ecoW, accept.foodW, accept.trustW),
        ...planCalendar(view, cal, turn),
      ];
    },
    async chooseEvent(event: GameEvent): Promise<string> {
      if (event.choices.length === 0) return '';
      const w = eventWeights;
      const map: Record<string, number> = {
        communityTrust: w.trust, ecologicalHealth: w.eco, foodSovereignty: w.food,
        politicalWill: w.will, budget: w.budget, climatePressure: -w.climate,
      };
      let best = event.choices[0], bestScore = -Infinity;
      for (const c of event.choices) {
        const s = c.effects.meterDeltas.reduce((acc, d) => acc + (map[d.meter] ?? 0) * d.amount, 0);
        if (s > bestScore) { bestScore = s; best = c; }
      }
      return best.id;
    },
  };
}

const EVENT_BALANCED = { trust: 1, eco: 1, food: 1, will: 0.5, budget: 0.5, climate: 1 };

export const ARCHETYPES: DecisionAgent[] = [
  // Pure attention-equity organizer: cover EVERY neighborhood every turn with
  // cheap 1-slot check-ins (max breadth) — the theoretical equity-optimal play.
  archetype('equity-organizer',
    { ecoW: 1, foodW: 1, trustW: 1, revW: 0.3, gentrificationAversion: 1, acceptThreshold: 2 },
    { intensity: 1.0, restThreshold: 0.25, meetingBias: 0, publicEventEvery: 0, priority: 'equity' },
    EVENT_BALANCED),
  // Trust-builder: public events + meetings, still spreads for equity.
  archetype('trust-builder',
    { ecoW: 0.7, foodW: 0.7, trustW: 1.5, revW: 0.5, gentrificationAversion: 1, acceptThreshold: 2 },
    { intensity: 1.0, restThreshold: 0.25, meetingBias: 0.7, publicEventEvery: 4, priority: 'equity' },
    { ...EVENT_BALANCED, trust: 2 }),
  // Eco-first: meetings on low-eco neighborhoods (meetings raise tile eco).
  archetype('eco-first',
    { ecoW: 2.5, foodW: 2, trustW: 0.7, revW: 0.3, gentrificationAversion: 1, acceptThreshold: 2 },
    { intensity: 0.95, restThreshold: 0.3, meetingBias: 0.8, publicEventEvery: 0, priority: 'eco' },
    { ...EVENT_BALANCED, eco: 2.5, food: 2 }),
  // Justice-first: focus gentrifying neighborhoods, reject displacing proposals.
  archetype('justice-first',
    { ecoW: 1, foodW: 1, trustW: 1.5, revW: 0.2, gentrificationAversion: 4, acceptThreshold: 3 },
    { intensity: 1.0, restThreshold: 0.25, meetingBias: 0.6, publicEventEvery: 0, priority: 'gentrification' },
    { ...EVENT_BALANCED, trust: 1.5 }),
  // Overscheduler: does everything, never rests → measures the burnout downside.
  archetype('overscheduler',
    { ecoW: 1, foodW: 1, trustW: 1, revW: 0.5, gentrificationAversion: 0.5, acceptThreshold: 1 },
    { intensity: 1.4, restThreshold: 0, meetingBias: 0.8, publicEventEvery: 3, priority: 'equity' },
    EVENT_BALANCED),
  // Neglectful baseline: does nothing.
  archetype('neglectful',
    { ecoW: 0, foodW: 0, trustW: 0, revW: 0, gentrificationAversion: 0, acceptThreshold: 999 },
    { intensity: 0, restThreshold: 0, meetingBias: 0, publicEventEvery: 0, priority: 'equity' },
    EVENT_BALANCED),
  randomArchetype('random'),
];

// ── Random archetype (seeded global Math.random) ─────────────────────────────

function randomArchetype(id: string): DecisionAgent {
  return {
    id,
    async decide(view: TurnView): Promise<GameAction[]> {
      const actions: GameAction[] = [];
      for (const pv of view.proposals) {
        const r = Math.random();
        if (r < 0.4) actions.push({ type: 'RESPOND_PROPOSAL', proposalId: pv.proposal.id, response: 'accept' });
        else if (r < 0.55) actions.push({ type: 'RESPOND_PROPOSAL', proposalId: pv.proposal.id, response: 'reject' });
      }
      // Spend slots randomly across random tiles.
      let budget = view.slotsRemaining;
      const checkin = view.slotCosts['quick_check_in'] ?? 1;
      const meeting = view.slotCosts['community_meeting'] ?? 2;
      while (budget >= checkin && view.tiles.length > 0 && Math.random() < 0.85) {
        const tile = view.tiles[Math.floor(Math.random() * view.tiles.length)];
        const useMeeting = budget >= meeting && Math.random() < 0.5;
        actions.push({ type: 'CALENDAR_ACTION', actionType: useMeeting ? 'community_meeting' : 'quick_check_in', tileId: tile.id });
        budget -= useMeeting ? meeting : checkin;
      }
      return actions;
    },
    async chooseEvent(event: GameEvent): Promise<string> {
      if (event.choices.length === 0) return '';
      return event.choices[Math.floor(Math.random() * event.choices.length)].id;
    },
  };
}
