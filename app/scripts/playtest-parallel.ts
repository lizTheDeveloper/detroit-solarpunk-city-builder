/**
 * Parallel AI Playtest — runs 3 playtests simultaneously with different
 * models/strategies for balance comparison.
 * Run: npx tsx scripts/playtest-parallel.ts
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
import type { GameState, GameAction, NarrativeActionType } from '../src/state/types.ts';
import { writeFileSync } from 'fs';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const TURNS_TO_PLAY = 20;

interface PlaytestConfig {
  name: string;
  model: string;
  systemPrompt: string;
  temperature: number;
}

const CONFIGS: PlaytestConfig[] = [
  {
    name: 'eco-focused',
    model: 'qwen/qwen3-32b',
    temperature: 0.5,
    systemPrompt: `You are an ECO-FOCUSED playtest bot for a Detroit solarpunk city builder. Your priority is ecological health above all else. Strategy:
1. Prioritize ecology projects (rain gardens, food forests, native plantings) over everything
2. Enact green infrastructure policies as soon as possible
3. Accept proposals only if they boost eco metrics
4. Use narrative actions for ecologicalRestoration topic
5. Reject or defer proposals that increase gentrification
6. You care about food sovereignty second, trust third

Respond ONLY with your actions, one per line. No explanations.`,
  },
  {
    name: 'political-operator',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    systemPrompt: `You are a POLITICAL OPERATOR playtest bot for a Detroit solarpunk city builder. You play to maximize trust and win re-election decisively. Strategy:
1. Accept EVERY proposal to maximize leader trust (even expensive ones)
2. Enact policies that give trust bonuses (participatory budgeting, right to counsel)
3. Use narrative actions for community_meeting and direct_engagement
4. Focus on foodSovereignty topic (biggest trust bonus per food sov improvement)
5. Never reject proposals — always accept or defer
6. Ignore ecology unless it threatens re-election

Respond ONLY with your actions, one per line. No explanations.`,
  },
  {
    name: 'budget-hawk',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature: 0.4,
    systemPrompt: `You are a BUDGET HAWK playtest bot for a Detroit solarpunk city builder. You optimize for economic sustainability and revenue generation. Strategy:
1. Only accept proposals that cost less than $100K or generate revenue
2. Prioritize projects with annualRevenue (solar grids, maker spaces, regional collabs)
3. Enact cooperative tax incentives ASAP (budget bonus)
4. Defer expensive proposals, reject ones over $200K
5. Use narrative actions for cooperativeEconomics and lobbying
6. Let ecology and food take care of themselves — focus on not going broke

Respond ONLY with your actions, one per line. No explanations.`,
  },
];

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

async function askLLM(config: PlaytestConfig, prompt: string): Promise<string> {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: config.temperature,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${config.model} error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return stripThink(data.choices?.[0]?.message?.content ?? '');
}

function summarizeState(state: GameState): string {
  const tiles = Object.values(state.tiles);
  const avgEco = tiles.reduce((s, t) => s + t.ecologicalHealth, 0) / tiles.length;
  const avgGentrif = tiles.reduce((s, t) => s + t.gentrificationPressure, 0) / tiles.length;
  const completedProjects = tiles.reduce((s, t) => s + t.completedProjects.length, 0);
  const tensions = getTensionSummary(state);

  let summary = `Turn ${state.turn} | ${state.season} Year ${state.year} | Stage: ${state.stage}
Meters: Trust ${state.meters.communityTrust.toFixed(1)}% | Eco ${state.meters.ecologicalHealth.toFixed(1)}% | Food ${state.meters.foodSovereignty.toFixed(1)}% | Will ${state.meters.politicalWill.toFixed(1)}% | Budget $${(state.meters.budget * 1000).toFixed(0)}K | Climate ${state.meters.climatePressure.toFixed(1)}%
Projects completed: ${completedProjects} | Avg gentrification: ${avgGentrif.toFixed(1)}%
Policies active: ${state.activePolicies.length} | Coalitions: ${state.coalitions.filter(c => c.active).length}
Tensions: Speed/Justice=${tensions.speedVsJustice.level} | Health=${tensions.overallHealth}
Actions remaining: ${state.narrativeState.actionsRemaining}/${state.narrativeState.actionsPerTurn}`;

  if (isElectionTurn(state.turn + 1) || isElectionTurn(state.turn + 2)) {
    const prediction = predictElectionOutcome(state);
    summary += `\nELECTION APPROACHING: Score ${prediction.predictedScore.toFixed(0)}/45 needed. Risks: ${prediction.risks.join(', ') || 'none'}`;
  }

  return summary;
}

function describeAvailableActions(state: GameState): string {
  const lines: string[] = [];

  if (state.activeProposals.length > 0) {
    lines.push('PROPOSALS:');
    state.activeProposals.forEach((p, i) => {
      const leader = state.leaders[p.leaderId];
      const def = PROJECT_CATALOG[p.projectDefinitionId];
      const tile = state.tiles[p.tileId];
      const cost = def.baseCost * 0.85;
      lines.push(`  ${i + 1}. ${leader?.name || p.leaderId}: "${def?.name}" in ${tile?.name} — $${(cost * 1000).toFixed(0)}K, ${def?.baseDuration} turns, Eco+${def?.effects.tileEco} Food+${def?.effects.foodSov} Trust+${def?.effects.trust}`);
    });
  }

  if (state.narrativeState.actionsRemaining > 0) {
    lines.push(`NARRATIVE ACTIONS (${state.narrativeState.actionsRemaining} remaining):`);
    lines.push('  Types: community_meeting, media_campaign, education_program, cultural_event, demonstration, direct_engagement, lobbying');
    lines.push('  Topics: foodSovereignty, waterCommons, landReform, ecologicalRestoration, cooperativeEconomics');
    lines.push('  Targets: ' + Object.values(state.tiles).map(t => t.name).join(', '));
  }

  const enactable = Object.entries(POLICY_CATALOG).filter(([id]) =>
    !state.activePolicies.some(ap => ap.definitionId === id)
  );
  if (enactable.length > 0) {
    lines.push(`POLICIES (need Will% >= threshold+cost):`);
    enactable.forEach(([id, p]) => {
      const needed = ((p.baseThreshold + p.enactmentCost) * 100).toFixed(0);
      lines.push(`  enact: ${id} (needs ${needed}% Will) — ${p.effects.other[0] || ''}`);
    });
  }

  lines.push('END_TURN when done.');
  return lines.join('\n');
}

function parseActions(response: string, state: GameState): GameAction[] {
  const actions: GameAction[] = [];
  const lines = response.split('\n').map(l => l.trim().toLowerCase());

  for (const line of lines) {
    const proposalMatch = line.match(/(accept|reject|defer|modify)\s*(?:#?\s*)?(\d+)/);
    if (proposalMatch) {
      const responseType = proposalMatch[1] as 'accept' | 'reject' | 'defer' | 'modify';
      const idx = parseInt(proposalMatch[2]) - 1;
      if (state.activeProposals[idx]) {
        actions.push({ type: 'RESPOND_PROPOSAL', proposalId: state.activeProposals[idx].id, response: responseType });
      }
      continue;
    }

    const narrativeMatch = line.match(/narrative:\s*(community_meeting|media_campaign|education_program|cultural_event|demonstration|direct_engagement|lobbying)\s+(\w+)\s+(\w+)/);
    if (narrativeMatch && state.narrativeState.actionsRemaining > 0) {
      const actionType = narrativeMatch[1] as NarrativeActionType;
      const topic = narrativeMatch[2] as any;
      const targetName = narrativeMatch[3];
      const tile = Object.values(state.tiles).find(t =>
        t.name.toLowerCase().includes(targetName) || t.id.includes(targetName)
      );
      if (tile) {
        actions.push({ type: 'NARRATIVE_ACTION', actionType, topic, target: tile.id });
      }
      continue;
    }

    const policyMatch = line.match(/enact:\s*(\w+)/);
    if (policyMatch) {
      actions.push({ type: 'ENACT_POLICY', policyId: policyMatch[1], fullStrength: true } as any);
      continue;
    }
  }

  return actions;
}

async function playTurn(state: GameState, config: PlaytestConfig): Promise<{ state: GameState; actions: string[] }> {
  const stateDesc = summarizeState(state);
  const actionsDesc = describeAvailableActions(state);
  const actionsTaken: string[] = [];

  const prompt = `Current game state:\n${stateDesc}\n\nAvailable actions:\n${actionsDesc}\n\nWhat do you do? List actions one per line:\n- "accept 1" / "reject 2" / "defer 1"\n- "narrative: [type] [topic] [neighborhood]"\n- "enact: [policy_id]"\n- "END_TURN"`;

  const response = await askLLM(config, prompt);

  const actions = parseActions(response, state);
  let current = state;

  for (const action of actions) {
    const next = gameReducer(current, action, PROJECT_CATALOG);
    if (next !== current) {
      actionsTaken.push(`${action.type}: ${JSON.stringify(action).substring(0, 80)}`);
      current = next;
    }
  }

  // Auto-defer remaining proposals
  for (const proposal of current.activeProposals) {
    current = gameReducer(current, { type: 'RESPOND_PROPOSAL', proposalId: proposal.id, response: 'defer' }, PROJECT_CATALOG);
    actionsTaken.push(`AUTO-DEFER: ${proposal.id}`);
  }

  // Events
  const events = generateEvents(current, Math.random);
  if (events.length > 0) {
    current = { ...current, eventQueue: [...current.eventQueue, ...events] };
  }

  for (const event of current.eventQueue) {
    if (event.choices.length > 0) {
      current = gameReducer(current, { type: 'RESPOND_EVENT', eventId: event.id, choiceId: event.choices[0].id }, PROJECT_CATALOG);
    }
  }

  const afterEnd = gameReducer(current, { type: 'END_TURN' }, PROJECT_CATALOG);
  const proposals = generateProposals(afterEnd);
  return { state: { ...afterEnd, activeProposals: proposals }, actions: actionsTaken };
}

async function runSinglePlaytest(config: PlaytestConfig): Promise<string> {
  console.log(`[${config.name}] Starting with model ${config.model}...`);

  let state = createNewGame();
  const leaders = { ...state.leaders };
  for (const [id, def] of Object.entries(LEADER_DEFINITIONS)) {
    if (leaders[id]) leaders[id] = { ...leaders[id], ...def, trust: leaders[id].trust };
  }
  state = { ...state, leaders };
  state = { ...state, activeProposals: generateProposals(state) };

  const history: Array<{ turn: number; budget: number; trust: number; eco: number; food: number; will: number; climate: number; actions: number }> = [];

  for (let i = 0; i < TURNS_TO_PLAY; i++) {
    console.log(`[${config.name}] Turn ${state.turn} — Budget $${(state.meters.budget * 1000).toFixed(0)}K | Trust ${state.meters.communityTrust.toFixed(0)}% | Eco ${state.meters.ecologicalHealth.toFixed(0)}%`);

    try {
      const result = await playTurn(state, config);
      history.push({
        turn: state.turn,
        budget: state.meters.budget,
        trust: state.meters.communityTrust,
        eco: state.meters.ecologicalHealth,
        food: state.meters.foodSovereignty,
        will: state.meters.politicalWill,
        climate: state.meters.climatePressure,
        actions: result.actions.length,
      });
      state = result.state;
    } catch (err) {
      console.error(`[${config.name}] Turn ${state.turn} ERROR: ${(err as Error).message}`);
      const afterEnd = gameReducer(state, { type: 'END_TURN' }, PROJECT_CATALOG);
      state = { ...afterEnd, activeProposals: generateProposals(afterEnd) };
    }

    if (state.lossCondition) {
      console.log(`[${config.name}] GAME OVER: ${state.lossCondition}`);
      break;
    }
    if (state.winCondition) {
      console.log(`[${config.name}] WIN: ${state.winCondition}`);
      break;
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  const tiles = Object.values(state.tiles);
  const completedTotal = tiles.reduce((s, t) => s + t.completedProjects.length, 0);

  return `## ${config.name.toUpperCase()} (${config.model})

**Result:** ${state.lossCondition ? 'LOSS — ' + state.lossCondition : state.winCondition ? 'WIN — ' + state.winCondition : 'Survived ' + TURNS_TO_PLAY + ' turns'}
**Final Stage:** ${state.stage}
**Projects Completed:** ${completedTotal}
**Policies Enacted:** ${state.activePolicies.length} (${state.activePolicies.map(p => p.definitionId).join(', ') || 'none'})

| Meter | Start | End | Delta |
|-------|-------|-----|-------|
| Trust | 50% | ${state.meters.communityTrust.toFixed(1)}% | ${(state.meters.communityTrust - 50).toFixed(1)} |
| Eco | 20% | ${state.meters.ecologicalHealth.toFixed(1)}% | ${(state.meters.ecologicalHealth - 20).toFixed(1)} |
| Food | 12% | ${state.meters.foodSovereignty.toFixed(1)}% | ${(state.meters.foodSovereignty - 12).toFixed(1)} |
| Will | 25% | ${state.meters.politicalWill.toFixed(1)}% | ${(state.meters.politicalWill - 25).toFixed(1)} |
| Budget | $1,500K | $${(state.meters.budget * 1000).toFixed(0)}K | ${((state.meters.budget - 1.5) * 1000).toFixed(0)}K |
| Climate | 30% | ${state.meters.climatePressure.toFixed(1)}% | +${(state.meters.climatePressure - 30).toFixed(1)} |

**Turn-by-turn budget:** ${history.map(h => `T${h.turn}:$${(h.budget * 1000).toFixed(0)}K`).join(' → ')}
`;
}

async function main() {
  console.log('=== Parallel AI Playtest — 3 Strategies ===\n');

  const results = await Promise.all(CONFIGS.map(runSinglePlaytest));

  const report = `# Parallel AI Playtest Report

Date: ${new Date().toISOString()}
Turns: ${TURNS_TO_PLAY} | Models: ${CONFIGS.map(c => c.model).join(', ')}

${results.join('\n---\n\n')}

## Balance Analysis

Compare the three strategies above. Key questions:
- Does any strategy trivially dominate?
- Does budget crash for any strategy?
- Is eco achievable or does it always decay?
- Are policies ever enacted?
- Does climate pressure create meaningful decisions?
`;

  const reportPath = '/Users/annhoward/src/city_builder/app/playtest-report.md';
  writeFileSync(reportPath, report);
  console.log(`\n\nReport saved to: ${reportPath}`);
}

main().catch(console.error);
