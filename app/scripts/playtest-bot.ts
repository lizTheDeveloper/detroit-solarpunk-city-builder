/**
 * AI Playtest Bot — plays through the game headlessly using an LLM for decisions.
 * Run: npx tsx scripts/playtest-bot.ts
 */

import { createNewGame } from '../src/state/create-game.ts';
import { gameReducer } from '../src/state/reducer.ts';
import { generateProposals } from '../src/systems/proposals.ts';
import { generateEvents } from '../src/systems/events.ts';
import { PROJECT_CATALOG } from '../src/data/content/project-catalog.ts';
import { LEADER_DEFINITIONS } from '../src/data/content/leaders.ts';
import { POLICY_CATALOG } from '../src/data/content/policy-catalog.ts';
import { getTensionSummary } from '../src/systems/tensions.ts';
import { predictElectionOutcome, isElectionTurn } from '../src/systems/reelection.ts';
import type { GameState, GameAction, Proposal, NarrativeActionType } from '../src/state/types.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'qwen/qwen3-32b';
const TURNS_TO_PLAY = 20;

interface TurnLog {
  turn: number;
  season: string;
  year: number;
  stage: string;
  meters: Record<string, number>;
  actions: string[];
  events: string[];
  notes: string;
}

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

async function askLLM(system: string, prompt: string): Promise<string> {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return stripThink(data.choices?.[0]?.message?.content ?? '');
}

function summarizeState(state: GameState): string {
  const tiles = Object.values(state.tiles);
  const avgEco = tiles.reduce((s, t) => s + t.ecologicalHealth, 0) / tiles.length;
  const avgGentrif = tiles.reduce((s, t) => s + t.gentrificationPressure, 0) / tiles.length;
  const activeProjects = tiles.reduce((s, t) => s + t.activeProjects.length, 0);
  const completedProjects = tiles.reduce((s, t) => s + t.completedProjects.length, 0);
  const tensions = getTensionSummary(state);

  let summary = `Turn ${state.turn} | ${state.season} Year ${state.year} | Stage: ${state.stage} | Path: ${state.path || 'none'}
Meters: Trust ${state.meters.communityTrust.toFixed(1)}% | Eco ${state.meters.ecologicalHealth.toFixed(1)}% | Food ${state.meters.foodSovereignty.toFixed(1)}% | Will ${state.meters.politicalWill.toFixed(1)}% | Budget $${state.meters.budget.toFixed(2)}M | Climate ${state.meters.climatePressure.toFixed(1)}%
Projects: ${activeProjects} active, ${completedProjects} completed | Max concurrent: ${state.maxConcurrentProjects}
Avg tile eco: ${avgEco.toFixed(1)}% | Avg gentrification: ${avgGentrif.toFixed(1)}%
Policies active: ${state.activePolicies.length} | Coalitions: ${state.coalitions.filter(c => c.active).length}
Tensions: Speed/Justice=${tensions.speedVsJustice.level} | Growth=${tensions.growthVsDegrowth.label} | Governance=${tensions.topDownVsBottomUp.label} | Health=${tensions.overallHealth}
Actions remaining: ${state.narrativeState.actionsRemaining}/${state.narrativeState.actionsPerTurn}`;

  if (isElectionTurn(state.turn + 1) || isElectionTurn(state.turn + 2)) {
    const prediction = predictElectionOutcome(state);
    summary += `\nELECTION APPROACHING: Predicted score ${prediction.predictedScore.toFixed(0)}/50. Risks: ${prediction.risks.join(', ') || 'none'}`;
  }

  return summary;
}

function describeProposals(state: GameState): string {
  if (state.activeProposals.length === 0) return 'No active proposals.';

  return state.activeProposals.map((p, i) => {
    const leader = state.leaders[p.leaderId];
    const def = PROJECT_CATALOG[p.projectDefinitionId];
    const tile = state.tiles[p.tileId];
    const cost = def.baseCost * 0.85;
    return `${i + 1}. ${leader?.name || p.leaderId} proposes "${def?.name}" in ${tile?.name} — Cost: $${cost.toFixed(2)}M, Duration: ${def?.baseDuration} turns`;
  }).join('\n');
}

function describeAvailableActions(state: GameState): string {
  const lines: string[] = [];

  // Proposals
  if (state.activeProposals.length > 0) {
    lines.push('PROPOSALS (respond with accept/reject/defer/modify + number):');
    lines.push(describeProposals(state));
  }

  // Narrative actions
  if (state.narrativeState.actionsRemaining > 0) {
    lines.push(`\nNARRATIVE ACTIONS (${state.narrativeState.actionsRemaining} remaining):`);
    lines.push('Types: community_meeting, media_campaign, education_program, cultural_event, demonstration, direct_engagement, lobbying');
    lines.push('Topics: foodSovereignty, waterCommons, landReform, ecologicalRestoration, cooperativeEconomics');
    lines.push('Targets: ' + Object.values(state.tiles).map(t => t.name).join(', '));
  }

  // Policies
  const enactable = Object.entries(POLICY_CATALOG).filter(([id]) =>
    !state.activePolicies.some(ap => ap.definitionId === id)
  );
  if (enactable.length > 0) {
    lines.push(`\nPOLICIES AVAILABLE TO ENACT: ${enactable.map(([id, p]) => `${p.name} (needs ${(p.threshold * 100).toFixed(0)}% Will)`).join(', ')}`);
  }

  // Start projects directly
  const tilesWithCapacity = Object.values(state.tiles).filter(t =>
    t.activeProjects.length === 0
  );
  if (tilesWithCapacity.length > 0 && state.meters.budget > 0.3) {
    lines.push(`\nDIRECT PROJECTS: Can start projects in: ${tilesWithCapacity.map(t => t.name).join(', ')}`);
  }

  lines.push('\nEND_TURN: End the turn when done with actions.');

  return lines.join('\n');
}

function parseActions(response: string, state: GameState): GameAction[] {
  const actions: GameAction[] = [];
  const lines = response.split('\n').map(l => l.trim().toLowerCase());

  for (const line of lines) {
    // Proposal responses
    const proposalMatch = line.match(/(accept|reject|defer|modify)\s*(?:#?\s*)?(\d+)/);
    if (proposalMatch) {
      const responseType = proposalMatch[1] as 'accept' | 'reject' | 'defer' | 'modify';
      const idx = parseInt(proposalMatch[2]) - 1;
      if (state.activeProposals[idx]) {
        actions.push({
          type: 'RESPOND_PROPOSAL',
          proposalId: state.activeProposals[idx].id,
          response: responseType,
        });
      }
      continue;
    }

    // Narrative actions
    const narrativeMatch = line.match(/narrative:\s*(community_meeting|media_campaign|education_program|cultural_event|demonstration|direct_engagement|lobbying)\s+(\w+)\s+(\w+)/);
    if (narrativeMatch && state.narrativeState.actionsRemaining > 0) {
      const actionType = narrativeMatch[1] as NarrativeActionType;
      const topic = narrativeMatch[2] as any;
      const targetName = narrativeMatch[3];
      const tile = Object.values(state.tiles).find(t =>
        t.name.toLowerCase().includes(targetName) || t.id.includes(targetName)
      );
      if (tile) {
        actions.push({
          type: 'NARRATIVE_ACTION',
          actionType,
          topic,
          target: tile.id,
        });
      }
      continue;
    }

    // Policy enactment
    const policyMatch = line.match(/enact:\s*(\w+)/);
    if (policyMatch) {
      actions.push({
        type: 'ENACT_POLICY',
        policyId: policyMatch[1],
        fullStrength: true,
      } as any);
      continue;
    }
  }

  return actions;
}

async function playTurn(state: GameState, turnLog: TurnLog): Promise<GameState> {
  const stateDesc = summarizeState(state);
  const actionsDesc = describeAvailableActions(state);

  const prompt = `Current game state:
${stateDesc}

Available actions:
${actionsDesc}

What do you do this turn? List your actions one per line. Format:
- For proposals: "accept 1" or "reject 2" or "defer 1"
- For narrative: "narrative: [type] [topic] [target_neighborhood]"
- For policies: "enact: [policy_id]"
- When done: "END_TURN"

Be strategic. Consider budget, upcoming elections, and tensions. Prioritize community trust and ecological health early game.`;

  const system = `You are a playtest bot for a Detroit solarpunk city builder game. You play strategically as the mayor, making decisions each turn. You want to:
1. Accept proposals that are affordable and high-impact
2. Use narrative actions to build political will and community trust
3. Balance speed of transformation against gentrification risk
4. Prepare for re-elections (every 16 turns)
5. Eventually reach the Beyond the Map stage

Respond ONLY with your actions, one per line. No explanations.`;

  const response = await askLLM(system, prompt);
  turnLog.notes = response;

  // Parse and execute actions
  const actions = parseActions(response, state);
  let current = state;

  for (const action of actions) {
    const next = gameReducer(current, action, PROJECT_CATALOG);
    if (next !== current) {
      turnLog.actions.push(`${action.type}: ${JSON.stringify(action).substring(0, 100)}`);
      current = next;
    }
  }

  // Handle any remaining proposals (auto-defer if not addressed)
  for (const proposal of current.activeProposals) {
    current = gameReducer(current, {
      type: 'RESPOND_PROPOSAL',
      proposalId: proposal.id,
      response: 'defer',
    }, PROJECT_CATALOG);
    turnLog.actions.push(`AUTO-DEFER: ${proposal.id}`);
  }

  // End turn
  const events = generateEvents(current, Math.random);
  if (events.length > 0) {
    current = { ...current, eventQueue: [...current.eventQueue, ...events] };
    turnLog.events = events.map(e => e.title);
  }

  // Resolve any events (auto-pick first choice)
  for (const event of current.eventQueue) {
    if (event.choices.length > 0) {
      current = gameReducer(current, {
        type: 'RESPOND_EVENT',
        eventId: event.id,
        choiceId: event.choices[0].id,
      }, PROJECT_CATALOG);
    }
  }

  const afterEnd = gameReducer(current, { type: 'END_TURN' }, PROJECT_CATALOG);
  const proposals = generateProposals(afterEnd);
  return { ...afterEnd, activeProposals: proposals };
}

async function runPlaytest(): Promise<void> {
  console.log('=== Detroit Solarpunk City Builder — AI Playtest ===\n');
  console.log(`Model: ${MODEL} | Turns: ${TURNS_TO_PLAY}\n`);

  // Initialize game
  let state = createNewGame();
  const leaders = { ...state.leaders };
  for (const [id, def] of Object.entries(LEADER_DEFINITIONS)) {
    if (leaders[id]) {
      leaders[id] = { ...leaders[id], ...def, trust: leaders[id].trust };
    }
  }
  state = { ...state, leaders };
  const proposals = generateProposals(state);
  state = { ...state, activeProposals: proposals };

  const turnLogs: TurnLog[] = [];

  for (let i = 0; i < TURNS_TO_PLAY; i++) {
    const log: TurnLog = {
      turn: state.turn,
      season: state.season,
      year: state.year,
      stage: state.stage,
      meters: { ...state.meters },
      actions: [],
      events: [],
      notes: '',
    };

    console.log(`--- Turn ${state.turn} (${state.season} Year ${state.year}) ---`);
    console.log(`  Budget: $${state.meters.budget.toFixed(2)}M | Trust: ${state.meters.communityTrust.toFixed(1)}% | Eco: ${state.meters.ecologicalHealth.toFixed(1)}%`);

    try {
      state = await playTurn(state, log);
      console.log(`  Actions taken: ${log.actions.length}`);
      if (log.events.length > 0) console.log(`  Events: ${log.events.join(', ')}`);
    } catch (err) {
      console.error(`  ERROR: ${(err as Error).message}`);
      // Fallback: just end the turn
      const afterEnd = gameReducer(state, { type: 'END_TURN' }, PROJECT_CATALOG);
      const fallbackProposals = generateProposals(afterEnd);
      state = { ...afterEnd, activeProposals: fallbackProposals };
    }

    turnLogs.push(log);

    if (state.lossCondition) {
      console.log(`\n!!! GAME OVER: ${state.lossCondition} !!!`);
      break;
    }
    if (state.winCondition) {
      console.log(`\n*** WIN: ${state.winCondition} ***`);
      break;
    }

    // Rate limit: ~1 request per 2 seconds
    await new Promise(r => setTimeout(r, 1500));
  }

  // Generate report
  console.log('\n\n=== Generating Playtest Report ===\n');

  const finalState = summarizeState(state);
  const tensions = getTensionSummary(state);
  const tiles = Object.values(state.tiles);
  const completedTotal = tiles.reduce((s, t) => s + t.completedProjects.length, 0);

  const reportPrompt = `You just played ${turnLogs.length} turns of a Detroit solarpunk city builder. Write a playtest report.

FINAL STATE:
${finalState}

TURN-BY-TURN METER HISTORY:
${turnLogs.map(l => `T${l.turn} ${l.season} Y${l.year}: Trust=${(l.meters as any).communityTrust?.toFixed(1)}% Eco=${(l.meters as any).ecologicalHealth?.toFixed(1)}% Food=${(l.meters as any).foodSovereignty?.toFixed(1)}% Will=${(l.meters as any).politicalWill?.toFixed(1)}% Budget=$${(l.meters as any).budget?.toFixed(2)}M Climate=${(l.meters as any).climatePressure?.toFixed(1)}%`).join('\n')}

ACTIONS TAKEN PER TURN:
${turnLogs.map(l => `T${l.turn}: ${l.actions.length} actions — ${l.actions.slice(0, 3).join('; ')}${l.actions.length > 3 ? '...' : ''}`).join('\n')}

PROJECTS COMPLETED: ${completedTotal}
POLICIES ENACTED: ${state.activePolicies.length}
STAGE REACHED: ${state.stage}
GAME ENDED: ${state.lossCondition ? 'LOSS - ' + state.lossCondition : state.winCondition ? 'WIN - ' + state.winCondition : 'Ongoing after ' + turnLogs.length + ' turns'}

Write a report covering:
1. BALANCE: Was the economy too easy/hard? Were there meaningful budget decisions?
2. PACING: Did the game feel like it progressed at a good rate? Stage transitions?
3. DOMINANT STRATEGY: Was there an obvious "always do this" approach? Could you ignore any systems?
4. TENSION: Did the speed/justice tension feel real? Any gentrification pressure?
5. CHARACTER INTERACTIONS: Were proposals meaningful? Did trust matter?
6. CLIMATE: Was climate pressure noticeable? Did it create urgency?
7. BUGS/ODDITIES: Anything that seemed broken, missing, or counter-intuitive?
8. RECOMMENDATIONS: Top 3-5 balance changes you'd suggest.

Be specific with numbers. This report will be used to tune the game before launch.`;

  const report = await askLLM(
    'You are a game designer writing a detailed playtest report. Be specific, critical, and constructive. Reference actual numbers from the playthrough.',
    reportPrompt
  );

  console.log(report);

  // Save report to file
  const reportPath = '/Users/annhoward/src/city_builder/app/playtest-report.md';
  const { writeFileSync } = await import('fs');
  writeFileSync(reportPath, `# AI Playtest Report\n\nModel: ${MODEL} | Turns: ${turnLogs.length} | Date: ${new Date().toISOString()}\n\n${report}\n`);
  console.log(`\n\nReport saved to: ${reportPath}`);
}

runPlaytest().catch(console.error);
