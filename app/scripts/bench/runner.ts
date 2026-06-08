/**
 * playGame — plays one full game through the REAL gameReducer / resolveTurn,
 * driven by a DecisionAgent. No hand-mirrored math: every state change goes
 * through production systems. Reproducible from a single integer seed (see rng.ts).
 *
 * Games MUST run sequentially (the seed installs a global Math.random).
 */

import { createNewGame } from '../../src/state/create-game.ts';
import { gameReducer } from '../../src/state/reducer.ts';
import { generateProposals } from '../../src/systems/proposals.ts';
import { generateEvents } from '../../src/systems/events.ts';
import { PROJECT_CATALOG } from '../../src/data/content/project-catalog.ts';
import { LEADER_DEFINITIONS } from '../../src/data/content/leaders.ts';
import type { GameState } from '../../src/state/types.ts';
import type { DecisionAgent } from './agent.ts';
import { buildView } from './view.ts';
import { withSeededRandom } from './rng.ts';
import type { GameResult, RunOptions, TurnRecord, ProposalDisposition } from './types.ts';

function initGame(): GameState {
  let state = createNewGame();
  const leaders = { ...state.leaders };
  for (const [id, def] of Object.entries(LEADER_DEFINITIONS)) {
    if (leaders[id]) {
      leaders[id] = { ...leaders[id], ...def, trust: leaders[id].trust };
    }
  }
  state = { ...state, leaders };
  return { ...state, activeProposals: generateProposals(state) };
}

export async function playGame(
  agent: DecisionAgent,
  seed: number,
  opts: RunOptions = {},
): Promise<GameResult> {
  const maxTurns = opts.maxTurns ?? 48;

  return withSeededRandom(seed, async (rng) => {
    let state = initGame();
    const turns: TurnRecord[] = [];

    for (let i = 0; i < maxTurns; i++) {
      const view = buildView(state);
      const metersBefore = { ...state.meters };
      const proposalIdsAtStart = new Set(state.activeProposals.map((p) => p.id));

      const disposition: ProposalDisposition = {
        accept: 0, modify: 0, reject: 0, ignoredExpired: 0,
      };
      const respondedProposalIds = new Set<string>();

      const actions = await agent.decide(view);
      const appliedActions = [];
      let current = state;

      for (const action of actions) {
        const next = gameReducer(current, action, PROJECT_CATALOG);
        if (next === current) continue; // no-op (e.g. unaffordable policy) — skip
        appliedActions.push(action);
        if (action.type === 'RESPOND_PROPOSAL') {
          respondedProposalIds.add(action.proposalId);
          if (action.response === 'accept') disposition.accept++;
          else if (action.response === 'modify') disposition.modify++;
          else if (action.response === 'reject') disposition.reject++;
        }
        current = next;
      }

      // Proposals active at turn start that were never addressed get dropped when
      // proposals regenerate below — count them honestly as ignored/expired.
      for (const id of proposalIdsAtStart) {
        if (!respondedProposalIds.has(id)) disposition.ignoredExpired++;
      }

      // Events: generate with the seeded rng, let the agent choose each response.
      const events = generateEvents(current, rng);
      if (events.length > 0) {
        current = { ...current, eventQueue: [...current.eventQueue, ...events] };
      }
      const eventRecords: TurnRecord['events'] = [];
      for (const event of current.eventQueue) {
        if (event.choices.length === 0) continue;
        const choiceId = await agent.chooseEvent(event, view);
        const next = gameReducer(current, { type: 'RESPOND_EVENT', eventId: event.id, choiceId }, PROJECT_CATALOG);
        eventRecords.push({ id: event.id, title: event.title, choiceId });
        current = next;
      }

      // End the turn through the real resolver, then regenerate proposals.
      const afterEnd = gameReducer(current, { type: 'END_TURN' }, PROJECT_CATALOG);
      state = { ...afterEnd, activeProposals: generateProposals(afterEnd) };

      turns.push({
        turn: view.turn,
        metersBefore,
        metersAfter: { ...afterEnd.meters },
        appliedActions,
        proposalDisposition: disposition,
        events: eventRecords,
        prompt: (agent as { lastPrompt?: string }).lastPrompt,
        rawResponse: (agent as { lastResponse?: string }).lastResponse,
      });

      if (state.lossCondition || state.winCondition) break;
    }

    return {
      agentId: agent.id,
      seed,
      turnsPlayed: turns.length,
      finalState: state,
      turns,
    };
  });
}
