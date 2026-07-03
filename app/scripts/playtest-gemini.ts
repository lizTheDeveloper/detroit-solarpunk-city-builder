/**
 * Gemini-powered AI Playtest — plays through the game headlessly using
 * Gemini CLI for decisions.
 * Run: npx tsx scripts/playtest-gemini.ts
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
import { totalAnnualExpenses, totalAnnualRevenue } from '../src/data/content/budget-lines.ts';
import type { GameState, GameAction } from '../src/state/types.ts';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const TURNS_TO_PLAY = 48;

function askGemini(prompt: string): string {
  const escaped = prompt.replace(/'/g, "'\\''");
  const result = execSync(
    `gemini -p '${escaped}'`,
    { timeout: 120_000, maxBuffer: 1024 * 1024, encoding: 'utf-8' },
  );
  return result.trim();
}

interface TurnLog {
  turn: number;
  season: string;
  year: number;
  stage: string;
  meters: Record<string, number>;
  budget: number;
  surplus: number;
  actions: string[];
  events: string[];
  notes: string;
}

function summarizeState(state: GameState): string {
  const tiles = Object.values(state.tiles);
  const avgEco = tiles.reduce((s, t) => s + t.ecologicalHealth, 0) / tiles.length;
  const avgGentrif = tiles.reduce((s, t) => s + t.gentrificationPressure, 0) / tiles.length;
  const activeProjects = tiles.reduce((s, t) => s + t.activeProjects.length, 0);
  const completedProjects = tiles.reduce((s, t) => s + t.completedProjects.length, 0);
  const tensions = getTensionSummary(state);

  const monthlyRev = totalAnnualRevenue() / 12;
  const monthlyExp = totalAnnualExpenses() / 12;
  const projectCosts = tiles
    .flatMap(t => t.activeProjects)
    .reduce((sum, p) => sum + (p.cost / p.duration), 0);
  const surplus = monthlyRev - monthlyExp - projectCosts;

  let summary = `Turn ${state.turn} | ${state.season} Year ${state.year} | Stage: ${state.stage}
Budget: $${state.meters.budget.toFixed(1)}M | Monthly surplus: ${surplus >= 0 ? '+' : ''}$${surplus.toFixed(1)}M/mo
Trust: ${state.meters.communityTrust.toFixed(1)}% | Eco: ${state.meters.ecologicalHealth.toFixed(1)}% | Food: ${state.meters.foodSovereignty.toFixed(1)}%
Will: ${state.meters.politicalWill.toFixed(1)}% | Climate: ${state.meters.climatePressure.toFixed(1)}%
Projects: ${activeProjects} active, ${completedProjects} completed | Max: ${state.maxConcurrentProjects}
Avg tile eco: ${avgEco.toFixed(1)}% | Avg gentrification: ${avgGentrif.toFixed(1)}%
Policies: ${state.activePolicies.length} | Coalitions: ${state.coalitions.filter(c => c.active).length}
Tensions: Speed/Justice=${tensions.speedVsJustice.level} | Growth=${tensions.growthVsDegrowth.label}
Calendar: ${state.calendarState.discretionarySlots - state.calendarState.slotsSpent}/${state.calendarState.discretionarySlots} slots remaining`;

  if (isElectionTurn(state.turn + 1) || isElectionTurn(state.turn + 2)) {
    const prediction = predictElectionOutcome(state);
    summary += `\nELECTION APPROACHING: Score ${prediction.predictedScore.toFixed(0)}/50. Risks: ${prediction.risks.join(', ') || 'none'}`;
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
    return `${i + 1}. ${leader?.name || p.leaderId} proposes "${def?.name}" in ${tile?.name} — $${cost.toFixed(2)}M, ${def?.baseDuration} turns`;
  }).join('\n');
}

function describeAvailableActions(state: GameState): string {
  const lines: string[] = [];

  if (state.activeProposals.length > 0) {
    lines.push('PROPOSALS:');
    lines.push(describeProposals(state));
  }

  const slotsLeft = state.calendarState.discretionarySlots - state.calendarState.slotsSpent;
  if (slotsLeft > 0) {
    lines.push(`\nCALENDAR ACTIONS (${slotsLeft} slots remaining):`);
    lines.push('Use: "calendar: community_meeting [target_neighborhood]" (2 slots)');
    lines.push('Use: "calendar: quick_check_in [target_neighborhood]" (1 slot)');
    lines.push('Use: "calendar: rest_day" (2 slots, recovers burnout)');
    lines.push('Neighborhoods: ' + Object.values(state.tiles).map(t => t.id).join(', '));
  }

  const enactable = Object.entries(POLICY_CATALOG).filter(([id]) =>
    !state.activePolicies.some(ap => ap.definitionId === id)
  );
  if (enactable.length > 0) {
    lines.push(`\nPOLICIES: ${enactable.map(([id, p]) => `${id}: ${p.name} (needs ${(p.threshold * 100).toFixed(0)}% Will)`).join(', ')}`);
  }

  lines.push('\nRespond with actions, one per line. END_TURN when done.');
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
        actions.push({
          type: 'RESPOND_PROPOSAL',
          proposalId: state.activeProposals[idx].id,
          response: responseType,
        });
      }
      continue;
    }

    const calendarMatch = line.match(/calendar:\s*(community_meeting|quick_check_in|deep_conversation|rest_day)(?:\s+(\w+))?/);
    if (calendarMatch) {
      const actionType = calendarMatch[1] as any;
      if (actionType === 'rest_day') {
        actions.push({ type: 'CALENDAR_REST_DAY' });
      } else {
        const targetName = calendarMatch[2] ?? '';
        const tile = Object.values(state.tiles).find(t =>
          t.name.toLowerCase().includes(targetName) || t.id.includes(targetName)
        );
        actions.push({ type: 'CALENDAR_ACTION', actionType, tileId: tile?.id });
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

async function playTurn(state: GameState, turnLog: TurnLog): Promise<GameState> {
  const stateDesc = summarizeState(state);
  const actionsDesc = describeAvailableActions(state);

  const prompt = `You are playtesting a Detroit solarpunk city builder as the mayor. Budget is real Detroit scale ($1,576M/yr general fund).

CURRENT STATE:
${stateDesc}

AVAILABLE ACTIONS:
${actionsDesc}

Format per line:
- "accept 1" / "reject 2" / "defer 1"
- "narrative: community_meeting ecologicalRestoration brightmoor"
- "enact: policy_id"
- "END_TURN"

Be strategic. Budget is nearly balanced — projects are marginal costs. Focus on trust, eco, food. Respond ONLY with actions.`;

  let response: string;
  try {
    response = askGemini(prompt);
  } catch (err) {
    console.error(`  Gemini error: ${(err as Error).message.slice(0, 100)}`);
    response = 'END_TURN';
  }
  turnLog.notes = response;

  const actions = parseActions(response, state);
  let current = state;

  for (const action of actions) {
    const next = gameReducer(current, action, PROJECT_CATALOG);
    if (next !== current) {
      turnLog.actions.push(`${action.type}: ${JSON.stringify(action).substring(0, 100)}`);
      current = next;
    }
  }

  for (const proposal of current.activeProposals) {
    current = gameReducer(current, {
      type: 'RESPOND_PROPOSAL',
      proposalId: proposal.id,
      response: 'defer',
    }, PROJECT_CATALOG);
    turnLog.actions.push(`AUTO-DEFER: ${proposal.id}`);
  }

  const events = generateEvents(current, Math.random);
  if (events.length > 0) {
    current = { ...current, eventQueue: [...current.eventQueue, ...events] };
    turnLog.events = events.map(e => e.title);
  }

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
  console.log('=== Detroit Solarpunk City Builder — Gemini Playtest ===\n');
  console.log(`Model: Gemini CLI | Turns: ${TURNS_TO_PLAY} | Budget: $1,576M\n`);

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
    const monthlyRev = totalAnnualRevenue() / 12;
    const monthlyExp = totalAnnualExpenses() / 12;
    const projectCosts = Object.values(state.tiles)
      .flatMap(t => t.activeProjects)
      .reduce((sum, p) => sum + (p.cost / p.duration), 0);

    const log: TurnLog = {
      turn: state.turn,
      season: state.season,
      year: state.year,
      stage: state.stage,
      meters: { ...state.meters },
      budget: state.meters.budget,
      surplus: monthlyRev - monthlyExp - projectCosts,
      actions: [],
      events: [],
      notes: '',
    };

    console.log(`--- Turn ${state.turn} (${state.season} Year ${state.year}) ---`);
    console.log(`  Budget: $${state.meters.budget.toFixed(1)}M | Surplus: ${log.surplus >= 0 ? '+' : ''}$${log.surplus.toFixed(1)}M/mo | Trust: ${state.meters.communityTrust.toFixed(1)}%`);

    state = await playTurn(state, log);
    console.log(`  Actions: ${log.actions.length} | Events: ${log.events.length}`);

    turnLogs.push(log);

    if (state.lossCondition) {
      console.log(`\n!!! GAME OVER: ${state.lossCondition} !!!`);
      break;
    }
    if (state.winCondition) {
      console.log(`\n*** WIN: ${state.winCondition} ***`);
      break;
    }
  }

  // Report
  console.log('\n=== Generating Report ===\n');

  const reportPrompt = `Write a playtest report for a Detroit solarpunk city builder. ${turnLogs.length} turns played. Real $1,576M city budget.

METER HISTORY:
${turnLogs.map(l => `T${l.turn} ${l.season} Y${l.year} [${l.stage}]: Budget=$${l.budget.toFixed(0)}M Surplus=${l.surplus >= 0 ? '+' : ''}$${l.surplus.toFixed(1)}M/mo Trust=${(l.meters as any).communityTrust?.toFixed(1)}% Eco=${(l.meters as any).ecologicalHealth?.toFixed(1)}% Food=${(l.meters as any).foodSovereignty?.toFixed(1)}% Will=${(l.meters as any).politicalWill?.toFixed(1)}%`).join('\n')}

ACTIONS PER TURN:
${turnLogs.map(l => `T${l.turn}: ${l.actions.length} actions`).join('\n')}

FINAL: Stage=${state.stage} Budget=$${state.meters.budget.toFixed(0)}M Trust=${state.meters.communityTrust.toFixed(1)}% Eco=${state.meters.ecologicalHealth.toFixed(1)}%
Result: ${state.lossCondition ? 'LOSS - ' + state.lossCondition : state.winCondition ? 'WIN - ' + state.winCondition : 'Ongoing'}

Report on: BALANCE (is $1,576M budget meaningful?), PACING, DOMINANT STRATEGY, PROJECT COST SCALE ($0.08-$1.5M projects vs $1,576M budget — does spending feel impactful?), TENSIONS, and TOP 5 BALANCE CHANGES. Be specific with numbers.`;

  let report: string;
  try {
    report = askGemini(reportPrompt);
  } catch {
    report = 'Report generation failed.';
  }

  console.log(report);

  const path = '/Users/annhoward/src/city_builder/app/playtest-gemini-report.md';
  writeFileSync(path, `# Gemini Playtest Report\n\nTurns: ${turnLogs.length} | Date: ${new Date().toISOString()}\n\n${report}\n\n## Raw Data\n\n${turnLogs.map(l => `T${l.turn}: Budget=$${l.budget.toFixed(0)}M Surplus=$${l.surplus.toFixed(1)}M Trust=${(l.meters as any).communityTrust?.toFixed(1)}% Stage=${l.stage}`).join('\n')}\n`);
  console.log(`\nReport saved to: ${path}`);
}

runPlaytest().catch(console.error);
