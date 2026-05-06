/**
 * Long-form AI Playtest — single smart player trying to WIN.
 * Monthly turns, crisis arcs active. Goal: reach "beyond the map" stage.
 * Run: npx tsx scripts/playtest-long.ts
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
import type { GameState, GameAction, NarrativeActionType, Stage } from '../src/state/types.ts';
import type { ActiveArc, DelayedConsequence, SerializedDependencyWeb } from '../src/state/crisis-types.ts';
import { allArcTemplates, arcTemplateMap } from '../src/data/arcs/index.ts';
import type { CrisisFork, CrisisForkChoice } from '../src/data/arcs/types.ts';
import { getForeshadowHints } from '../src/systems/delayed-consequences.ts';
import { scheduleConsequence } from '../src/systems/delayed-consequences.ts';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

const STAGE_ORDER: Stage[] = ['awakening', 'transition', 'restoration', 'beyond'];
// No max turns — game runs until natural end (win, loss, or stuck)
const funNotes: Array<{ turn: number; note: string }> = [];

const SYSTEM_PROMPT = `You are an expert strategy player for a Detroit solarpunk city builder. You are playing to WIN. The win conditions are:

STAGE PROGRESSION (you must advance through all stages):
1. AWAKENING → TRANSITION: Need eco ≥ 35 OR food ≥ 25 OR trust ≥ 65
2. TRANSITION → RESTORATION: Need eco ≥ 55 AND food ≥ 40 AND trust ≥ 50 AND 2+ policies
3. RESTORATION → BEYOND: Need eco ≥ 75 AND food ≥ 60 AND trust ≥ 70 AND 4+ policies AND 1+ coalition

WIN CONDITIONS (only checked in "beyond" stage):
- Cooperative win: 2 of 4 continental goals reach 75%
- Survival win: reach turn 240 with ALL meters > 50

LOSS CONDITIONS:
- Lose re-election (every 48 turns, need score ≥ 45)
- Budget hits $0
- Climate pressure hits 100% with fewer than 5 healthy tiles

STRATEGY GUIDANCE:
- Ecology is the hardest meter to grow — it passively decays. Prioritize eco projects early and often.
- Trust gives you more concurrent projects but has scaling decay at high values — don't over-invest.
- Food sovereignty grows through food_forest and community_kitchen projects.
- Political Will regens each turn — spend it on policies when thresholds are met.
- Budget replenishes quarterly — SPEND IT. Hoarding budget is LOSING. Every turn without active projects is a turn eco decays.
- Climate pressure rises every turn and accelerates — eco health reduces climate damage.
- ALWAYS ACCEPT community proposals unless they actively hurt you — they build trust and projects simultaneously.
- If you have budget and project slots available, you should ALWAYS be building. Idle budget = losing.
- Use narrative actions EVERY turn to boost public opinion toward policies you'll need later.
- Reclaim vacant lots for free project capacity when you have trust ≥ 30.

ELECTIONS — YOU WILL LOSE IF YOU IGNORE THIS:
- Elections happen at turn 48, 96, 144, 192. Score must be ≥ 45 or you LOSE.
- Election score = trust*0.6 + councilSupport + leaderAdvocates + coalitionBonus + willBonus - gentrificationPenalty
- At trust 70%, base score is only 42. You NEED bonuses: coalitions (+5 each), leader advocates (+3 per leader at trust≥40), no gentrification penalties.
- WINNING FORMULA: trust ≥ 75% + 1 coalition + low gentrification = safe. Without coalition, need trust ≥ 80%.
- Build community-led projects to earn trust without gentrification. Build land trusts to reduce gentrification.
- By turn 36, trust MUST be above 70% or you will lose the election. If below, spam community proposals and narrative actions.

COALITIONS — DO THIS IMMEDIATELY WHEN AVAILABLE:
- When you see "COALITION AVAILABLE" in the actions list, ALWAYS form one immediately.
- Use "form_coalition: [leader1_id] [leader2_id]" — pick any two leaders with trust ≥ 40.
- Each coalition gives +5 election score. This is often the difference between winning and losing.
- You need at least 1 coalition for Beyond stage. Form it as early as possible.

SYNERGIES & CIRCULAR ECONOMY:
- Completed projects give bonuses to future projects on the same or adjacent tiles.
- Key synergies: soil_remediation → food_forest (faster), maker_space → solar_grid (cheaper+faster), land_trust → anything on same tile (cheaper), rain_garden → wetland_restoration (cheaper), native_planting → wildlife_corridor (cheaper+faster).
- CLUSTER PROJECTS on adjacent tiles to get synergy discounts. Don't scatter randomly.
- Build land_trust early on tiles where you plan to build more — it cuts costs 25-30%.

GENTRIFICATION:
- Player-initiated projects cause 1.5x gentrification pressure. Too many = displacement = LOSE ELECTION.
- Community-led projects cause only 0.5x gentrification and grant community ownership.
- ALWAYS build land_trust projects — they reduce gentrification by -15 on the tile.
- If ANY tile has gentrification > 50, you lose -3 election points per tile. This kills runs.

CRITICAL: You need eco at 75% to reach "beyond" stage. This requires sustained eco investment over many turns since eco decays passively. Start eco projects immediately and never stop.

CRISIS ARCS — REAL-WORLD CRISES THAT ESCALATE:
- Multiple crisis arcs run simultaneously (energy grid, water/PFAS, housing speculation, infrastructure debt, food/phosphorus).
- Arcs progress through stages: dormant → foreshadow → escalation → crisis → reckoning → resolved.
- During ESCALATION, you'll see "CRISIS FORK" events. You MUST respond to them.
- Each crisis fork offers 2-3 choices with immediate meter effects AND delayed consequences that fire later.
- Some choices are TABOO — locked until public opinion reaches a threshold. Use narrative actions to shift opinion.
- Delayed consequences can be CANCELLED if you create the right conditions before they fire.
- Foreshadow hints warn you of approaching consequences — take action to prevent them!
- IGNORING escalating arcs makes them advance to CRISIS stage automatically. Don't ignore them.
- Choices create CONDITIONS in the dependency web. Future events check these conditions.
- The dependency web is cumulative — conditions from early choices unlock or block later options.

CRISIS RESPONSE FORMAT:
  crisis_choice: [fork_id] [choice_id]

Example: "crisis_choice: sewer_overflow_crisis green_infrastructure_approach"

RESPONSE FORMAT:
First, your actions (one per line). Then a blank line, then a line starting with "NOTES:" followed by a brief (1-3 sentence) honest reaction to this turn AS A PLAYER. What felt interesting, boring, frustrating, exciting, confusing, or satisfying? Was this a meaningful decision or autopilot? Be candid — you're playtesting, not performing.

Example response:
start_project: tile_sw rain_garden player-initiated
narrative: demonstration ecology community_solar
NOTES: The crisis fork was a genuine dilemma — I wanted the union jobs but hated the long-term lock-in. Choosing community solar felt risky. Budget is scaring me.`;

async function askLLM(prompt: string): Promise<string> {
  const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${prompt}`;
  const result = execSync(
    `gemini -p ${JSON.stringify(fullPrompt)}`,
    { encoding: 'utf-8', timeout: 90000, maxBuffer: 1024 * 1024 },
  );
  return result.trim();
}

function summarizeState(state: GameState): string {
  const tiles = Object.values(state.tiles);
  const avgEco = tiles.reduce((s, t) => s + t.ecologicalHealth, 0) / tiles.length;
  const avgGentrif = tiles.reduce((s, t) => s + t.gentrificationPressure, 0) / tiles.length;
  const completedProjects = tiles.reduce((s, t) => s + t.completedProjects.length, 0);
  const activeProjects = tiles.reduce((s, t) => s + t.activeProjects.length, 0);
  const tensions = getTensionSummary(state);

  let summary = `Turn ${state.turn} | ${state.season} Year ${state.year} | Stage: ${state.stage}
Meters: Trust ${state.meters.communityTrust.toFixed(1)}% | Eco ${state.meters.ecologicalHealth.toFixed(1)}% | Food ${state.meters.foodSovereignty.toFixed(1)}% | Will ${state.meters.politicalWill.toFixed(1)}% | Budget $${(state.meters.budget * 1000).toFixed(0)}K | Climate ${state.meters.climatePressure.toFixed(1)}%
Projects: ${completedProjects} completed, ${activeProjects} active | Max concurrent: ${state.maxConcurrentProjects}
Avg tile eco: ${avgEco.toFixed(1)}% | Avg gentrification: ${avgGentrif.toFixed(1)}%
Policies active: ${state.activePolicies.length} (${state.activePolicies.map(p => p.definitionId).join(', ') || 'none'})
Coalitions: ${state.coalitions.filter(c => c.active).length} active
Tensions: Speed/Justice=${tensions.speedVsJustice.level} | Health=${tensions.overallHealth}
Actions remaining: ${state.narrativeState.actionsRemaining}/${state.narrativeState.actionsPerTurn}`;

  // Stage progression hints
  const { ecologicalHealth, foodSovereignty, communityTrust } = state.meters;
  if (state.stage === 'awakening') {
    summary += `\nNEXT STAGE (transition): Need eco≥35 OR food≥25 OR trust≥65. Current: eco=${ecologicalHealth.toFixed(0)}, food=${foodSovereignty.toFixed(0)}, trust=${communityTrust.toFixed(0)}`;
  } else if (state.stage === 'transition') {
    summary += `\nNEXT STAGE (restoration): Need eco≥55 AND food≥40 AND trust≥50 AND 2+ policies. Current: eco=${ecologicalHealth.toFixed(0)}, food=${foodSovereignty.toFixed(0)}, trust=${communityTrust.toFixed(0)}, policies=${state.activePolicies.length}`;
  } else if (state.stage === 'restoration') {
    summary += `\nNEXT STAGE (beyond): Need eco≥75 AND food≥60 AND trust≥70 AND 4+ policies AND 1+ coalition. Current: eco=${ecologicalHealth.toFixed(0)}, food=${foodSovereignty.toFixed(0)}, trust=${communityTrust.toFixed(0)}, policies=${state.activePolicies.length}, coalitions=${state.coalitions.filter(c => c.active).length}`;
  } else if (state.stage === 'beyond') {
    summary += `\nWIN CONDITIONS: Continental goals at 75%+ (need 2). OR survive to turn 80 with all meters > 50.`;
  }

  // Show election warning when within 12 turns (1 year before election)
  const turnsToElection = 48 - ((state.turn - 1) % 48);
  if (turnsToElection <= 12) {
    const prediction = predictElectionOutcome(state);
    summary += `\nELECTION in ${turnsToElection} turns: Predicted score ${prediction.predictedScore.toFixed(0)}/45 needed. Risks: ${prediction.risks.join(', ') || 'none'}`;
  }

  // Leader info
  const leaderLines = Object.values(state.leaders).map(l =>
    `  ${l.name} (${l.neighborhood}): trust=${l.trust}, deferrals=${l.consecutiveDeferrals}`
  );
  summary += `\nLeaders:\n${leaderLines.join('\n')}`;

  // Crisis arc state
  if (state.activeArcs && state.activeArcs.length > 0) {
    const arcLines = state.activeArcs
      .filter(a => a.currentStage !== 'resolved')
      .map(a => {
        const template = arcTemplateMap[a.arcId];
        const name = template?.name ?? a.arcId;
        const turnsInStage = state.turn - a.stageEnteredTurn;
        let extra = '';
        if (a.currentStage === 'escalation') {
          const maxTurns = template?.config.maxTurnsAtEscalation ?? 4;
          extra = ` (inaction: ${a.inactionTimer}/${maxTurns} — auto-crisis if ignored)`;
        }
        return `  ${name}: ${a.currentStage}${extra} (${turnsInStage} turns in stage)`;
      });
    if (arcLines.length > 0) {
      summary += `\nCRISIS ARCS:\n${arcLines.join('\n')}`;
    }
  }

  // Dependency web conditions
  if (state.dependencyWeb?.conditions?.length > 0) {
    summary += `\nDependency Web: [${(state.dependencyWeb.conditions as string[]).join(', ')}]`;
  }

  // Foreshadow hints
  if (state.delayedConsequenceQueue && state.delayedConsequenceQueue.length > 0) {
    const web = { conditions: new Set(state.dependencyWeb?.conditions ?? []), capacities: new Map() };
    const hints = getForeshadowHints(state.delayedConsequenceQueue, state.turn, web);
    if (hints.length > 0) {
      summary += `\nFORESHADOW WARNINGS:`;
      for (const hint of hints) {
        summary += `\n  ⚠ ${hint.hint}`;
      }
    }
  }

  // Taboo research hints (near unlock)
  const tabooTopics: Array<{ topic: string; current: number; threshold: number; arcName: string }> = [];
  for (const template of allArcTemplates) {
    for (const fork of template.crisisForks) {
      for (const choice of fork.choices) {
        if (choice.taboo) {
          const current = (state.publicOpinion as any)?.[choice.taboo.opinionTopic] ?? 0;
          if (current >= choice.taboo.unlockThreshold - 10 && current < choice.taboo.unlockThreshold) {
            tabooTopics.push({ topic: choice.taboo.opinionTopic, current, threshold: choice.taboo.unlockThreshold, arcName: template.name });
          }
        }
      }
    }
  }
  if (tabooTopics.length > 0) {
    summary += `\nRESEARCH HINTS (taboo solutions approaching unlock):`;
    for (const t of tabooTopics) {
      summary += `\n  📚 ${t.topic} at ${t.current.toFixed(0)}/${t.threshold} — ${t.arcName} radical option nearly available`;
    }
  }

  return summary;
}

function describeAvailableActions(state: GameState): string {
  const lines: string[] = [];

  // Urgent election warning
  const turnsToElection = 48 - ((state.turn - 1) % 48);
  if (turnsToElection <= 12 && turnsToElection > 0) {
    const prediction = predictElectionOutcome(state);
    if (prediction.predictedScore < 50) {
      lines.push(`!!! ELECTION IN ${turnsToElection} TURNS — SCORE ${prediction.predictedScore.toFixed(0)}/45 — ${prediction.predictedScore < 45 ? 'YOU WILL LOSE' : 'DANGEROUSLY CLOSE'} !!!`);
      lines.push(`  → Accept ALL proposals (builds trust), form coalition if available, use community-led mode`);
    }
  }

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

  // Player-initiated projects
  const totalActive = Object.values(state.tiles).reduce((s, t) => s + t.activeProjects.length, 0);
  if (totalActive < state.maxConcurrentProjects && state.meters.budget > 0.05) {
    lines.push(`START PROJECT (${state.maxConcurrentProjects - totalActive} slots available):`);
    const availableProjects = Object.values(PROJECT_CATALOG).filter(def => {
      const stageOk = STAGE_ORDER.indexOf(state.stage) >= STAGE_ORDER.indexOf(def.stageRequired);
      return stageOk;
    });
    for (const tile of Object.values(state.tiles)) {
      const tileProjects = availableProjects.filter(def => {
        if (def.maxContamination !== null && tile.contamination > def.maxContamination) return false;
        if (def.terrainRequired && !def.terrainRequired.includes(tile.terrain)) return false;
        if (tile.activeProjects.some(p => p.definitionId === def.id)) return false;
        if (tile.completedProjects.includes(def.id)) return false;
        if (def.baseCost > state.meters.budget) return false;
        return true;
      });
      if (tileProjects.length > 0) {
        lines.push(`  ${tile.name} (${tile.id}): ${tileProjects.map(p => `${p.id}($${(p.baseCost*1000).toFixed(0)}K,${p.baseDuration}t,eco+${p.effects.tileEco})`).join(', ')}`);
      }
    }
    lines.push('  Format: start: [project_id] [tile_id]');
  }

  if (state.narrativeState.actionsRemaining > 0) {
    lines.push(`NARRATIVE ACTIONS (${state.narrativeState.actionsRemaining} remaining):`);
    lines.push('  Types: community_meeting, media_campaign, education_program, cultural_event, demonstration, direct_engagement, lobbying');
    lines.push('  Topics (broad): foodSovereignty, waterCommons, landReform, ecologicalRestoration, cooperativeEconomics');
    lines.push('  Topics (taboo-specific): nutrientRecycling, nuclearEnergy, landExpropriation, decarceration, deGrowth');
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

  // Reclaim vacant lots
  if (state.meters.communityTrust >= 30) {
    const reclaimable = Object.values(state.tiles).filter(t => t.vacantLots > 0);
    if (reclaimable.length > 0) {
      lines.push(`RECLAIM LOT (free, +1 project capacity per lot, trust≥30):`);
      reclaimable.forEach(t => {
        const hasLT = t.completedProjects.includes('land_trust') ? ' [land trust protects]' : ' [+2 gentrif risk]';
        lines.push(`  reclaim: ${t.id} (${t.vacantLots} vacant, ${t.reclaimedLots || 0} reclaimed)${hasLT}`);
      });
    }
  }

  // Coalitions available — CRITICAL for Beyond stage
  const highTrustLeaders = Object.values(state.leaders).filter(l => l.trust >= 40);
  if (highTrustLeaders.length >= 2 && state.coalitions.filter(c => c.active).length === 0) {
    lines.push(`*** COALITION AVAILABLE — FORM NOW (REQUIRED for Beyond stage) ***`);
    lines.push(`  Leaders ready: ${highTrustLeaders.map(l => `${l.id}(trust=${l.trust})`).join(', ')}`);
    lines.push(`  form_coalition: ${highTrustLeaders[0].id} ${highTrustLeaders[1].id}`);
  }

  // Crisis forks
  const crisisFork = getActiveCrisisFork(state);
  if (crisisFork) {
    const { arc, fork } = crisisFork;
    const template = arcTemplateMap[arc.arcId];
    lines.push('');
    lines.push(`*** CRISIS FORK: ${fork.title} ***`);
    lines.push(`Arc: ${template?.name ?? arc.arcId} (stage: ${arc.currentStage})`);
    lines.push(`${fork.description}`);
    lines.push('');
    lines.push('CHOICES:');
    for (const choice of fork.choices) {
      const immediateDesc = choice.immediate.map(e => `${e.meter} ${e.amount >= 0 ? '+' : ''}${e.amount}`).join(', ');
      const conditionsDesc = choice.conditionsCreated.length > 0 ? ` | Creates: ${choice.conditionsCreated.join(', ')}` : '';
      let tabooNote = '';
      if (choice.taboo) {
        const currentOpinion = (state.publicOpinion as any)?.[choice.taboo.opinionTopic] ?? 0;
        if (currentOpinion < choice.taboo.unlockThreshold) {
          tabooNote = ` [LOCKED — need ${choice.taboo.opinionTopic} opinion ≥ ${choice.taboo.unlockThreshold}, current: ${currentOpinion}]`;
        } else {
          tabooNote = ` [TABOO UNLOCKED — social cost: ${choice.taboo.baseSocialCost}]`;
        }
      }
      lines.push(`  crisis_choice: ${fork.id} ${choice.id}`);
      lines.push(`    "${choice.label}" — ${choice.appeal}`);
      lines.push(`    Immediate: ${immediateDesc}${conditionsDesc}${tabooNote}`);
      if (choice.delayedConsequences.length > 0) {
        lines.push(`    Delayed: ${choice.delayedConsequences.length} consequence(s) fire in ${choice.delayedConsequences.map(d => d.delay).join('/')} turns`);
      }
    }
    lines.push('');
  }

  lines.push('END_TURN when done.');
  return lines.join('\n');
}

function parseActions(response: string, state: GameState): GameAction[] {
  const actions: GameAction[] = [];
  // Strip everything after NOTES: — that's player commentary, not actions
  const actionText = response.split(/^NOTES:/mi)[0];
  const lines = actionText.split('\n').map(l => l.trim().toLowerCase());

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

    const coalitionMatch = line.match(/form_coalition:\s*(\w+)\s+(\w+)/);
    if (coalitionMatch) {
      actions.push({ type: 'FORM_COALITION', leaderIds: [coalitionMatch[1], coalitionMatch[2]] } as any);
      continue;
    }

    const startMatch = line.match(/start:\s*(\w+)\s+(\w+)(?:\s+(community|direct))?/);
    if (startMatch) {
      const projectId = startMatch[1];
      const tileId = startMatch[2];
      const mode = startMatch[3] === 'community' ? 'community-led'
        : startMatch[3] === 'direct' ? 'direct-action'
        : 'player-initiated';
      if (PROJECT_CATALOG[projectId] && state.tiles[tileId]) {
        actions.push({ type: 'START_PROJECT', tileId, projectId, mode });
      }
      continue;
    }

    const reclaimMatch = line.match(/reclaim:\s*(\w+)/);
    if (reclaimMatch) {
      const tileId = reclaimMatch[1];
      if (state.tiles[tileId]) {
        actions.push({ type: 'RECLAIM_LOT', tileId } as any);
      }
      continue;
    }

    const crisisMatch = line.match(/crisis_choice:\s*([\w-]+)\s+([\w-]+)/);
    if (crisisMatch) {
      actions.push({ type: 'CRISIS_CHOICE', forkId: crisisMatch[1], choiceId: crisisMatch[2] } as any);
      continue;
    }
  }

  return actions;
}

async function playTurn(state: GameState): Promise<{ state: GameState; actions: string[] }> {
  const stateDesc = summarizeState(state);
  const actionsDesc = describeAvailableActions(state);
  const actionsTaken: string[] = [];

  const prompt = `Current game state:\n${stateDesc}\n\nAvailable actions:\n${actionsDesc}\n\nWhat do you do? List actions one per line:\n- "accept 1" / "reject 2" / "defer 1"\n- "start: [project_id] [tile_id]" — directly start a project (player-initiated)
- "start: [project_id] [tile_id] community" — community-led (slower, costlier, less gentrification, more trust)
- "start: [project_id] [tile_id] direct" — direct action (free, fast, zero gentrif, but costs 8 trust, angers council)
- "reclaim: [tile_id]" — reclaim a vacant lot (free, +1 project capacity)
- "narrative: [type] [topic] [neighborhood]"\n- "enact: [policy_id]"\n- "form_coalition: [leader1] [leader2]"\n- "END_TURN"\n\nIMPORTANT: Always start projects if you have budget and slots. Reclaim lots for more capacity. Accept proposals AND start your own projects. Never end a turn with unused budget and empty project slots.`;

  const response = await askLLM(prompt);

  // Extract fun notes from response
  const notesMatch = response.match(/NOTES:\s*(.+)/s);
  const funNote = notesMatch ? notesMatch[1].trim().split('\n')[0] : null;
  if (funNote) {
    funNotes.push({ turn: state.turn, note: funNote });
    console.log(`  💭 ${funNote}`);
  }

  const actions = parseActions(response, state);
  let current = state;

  for (const action of actions) {
    // Handle crisis choices specially (not in game reducer yet)
    if ((action as any).type === 'CRISIS_CHOICE') {
      const { forkId, choiceId } = action as any;
      // Find the fork and choice from arc templates
      for (const template of allArcTemplates) {
        const fork = template.crisisForks.find(f => f.id === forkId);
        if (fork) {
          const choice = fork.choices.find(c => c.id === choiceId);
          if (choice) {
            // Check taboo lock
            if (choice.taboo) {
              const currentOpinion = (current.publicOpinion as any)?.[choice.taboo.opinionTopic] ?? 0;
              if (currentOpinion < choice.taboo.unlockThreshold) {
                actionsTaken.push(`CRISIS_CHOICE_BLOCKED: ${choiceId} (taboo locked, need ${choice.taboo.opinionTopic} ≥ ${choice.taboo.unlockThreshold})`);
                continue;
              }
            }
            current = applyCrisisChoice(current, template.id, forkId, choice);
            actionsTaken.push(`CRISIS_CHOICE: ${forkId} → ${choice.label}`);
          }
          break;
        }
      }
      continue;
    }

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

  // Advance crisis arcs (simulating pipeline-driven transitions)
  current = advanceCrisisArcs(current);

  const afterEnd = gameReducer(current, { type: 'END_TURN' }, PROJECT_CATALOG);
  const proposals = generateProposals(afterEnd);
  return { state: { ...afterEnd, activeProposals: proposals }, actions: actionsTaken };
}

function initializeCrisisArcs(state: GameState): GameState {
  const activeArcs: ActiveArc[] = [
    { arcId: 'energy-grid', currentStage: 'foreshadow', stageEnteredTurn: 1, inactionTimer: 0, lastEventTurn: 0, initializedFromSnapshot: true },
    { arcId: 'water-pfas', currentStage: 'dormant', stageEnteredTurn: 1, inactionTimer: 0, lastEventTurn: 0, initializedFromSnapshot: true },
    { arcId: 'housing-speculation', currentStage: 'foreshadow', stageEnteredTurn: 1, inactionTimer: 0, lastEventTurn: 0, initializedFromSnapshot: true },
    { arcId: 'infrastructure-debt', currentStage: 'dormant', stageEnteredTurn: 1, inactionTimer: 0, lastEventTurn: 0, initializedFromSnapshot: true },
    { arcId: 'phosphorus-food', currentStage: 'dormant', stageEnteredTurn: 1, inactionTimer: 0, lastEventTurn: 0, initializedFromSnapshot: true },
  ];

  const dependencyWeb: SerializedDependencyWeb = { conditions: [], capacities: {} };
  const delayedConsequenceQueue: DelayedConsequence[] = [];
  const resolvedArcs: Array<{ arcId: string; resolvedTurn: number }> = [];

  return { ...state, activeArcs, dependencyWeb, delayedConsequenceQueue, resolvedArcs } as GameState;
}

function getActiveCrisisFork(state: GameState): { arc: ActiveArc; fork: CrisisFork } | null {
  if (!state.activeArcs) return null;
  for (const arc of state.activeArcs) {
    if (arc.currentStage !== 'escalation' && arc.currentStage !== 'crisis') continue;
    if (arc.lastEventTurn >= arc.stageEnteredTurn) continue;
    const template = arcTemplateMap[arc.arcId];
    if (!template) continue;
    const fork = template.crisisForks.find(f => f.stage === arc.currentStage);
    if (fork) return { arc, fork };
  }
  return null;
}

// Simulated pipeline: dormant arcs activate on a schedule
const ARC_ACTIVATION_TURNS: Record<string, number> = {
  'energy-grid': 1,       // starts at foreshadow immediately
  'housing-speculation': 1,
  'water-pfas': 12,       // activates in year 1
  'infrastructure-debt': 20, // activates early year 2
  'phosphorus-food': 30,    // activates mid year 2
};

function advanceCrisisArcs(state: GameState): GameState {
  if (!state.activeArcs) return state;
  let arcs = [...state.activeArcs];
  let changed = false;
  arcs = arcs.map(arc => {
    const template = arcTemplateMap[arc.arcId];
    if (!template) return arc;

    // Simulated pipeline: dormant arcs activate on schedule
    if (arc.currentStage === 'dormant') {
      const activationTurn = ARC_ACTIVATION_TURNS[arc.arcId] ?? 999;
      if (state.turn >= activationTurn) {
        changed = true;
        return { ...arc, currentStage: 'foreshadow' as const, stageEnteredTurn: state.turn, inactionTimer: 0 };
      }
    }

    if (arc.currentStage === 'foreshadow') {
      const turnsInStage = state.turn - arc.stageEnteredTurn;
      const minDuration = template.config.minStageDuration.foreshadow;
      if (turnsInStage >= minDuration) {
        changed = true;
        return { ...arc, currentStage: 'escalation' as const, stageEnteredTurn: state.turn, inactionTimer: 0 };
      }
    }

    if (arc.currentStage === 'escalation') {
      if (arc.inactionTimer >= template.config.maxTurnsAtEscalation) {
        changed = true;
        return { ...arc, currentStage: 'crisis' as const, stageEnteredTurn: state.turn, inactionTimer: 0 };
      }
      const newTimer = arc.inactionTimer + 1;
      if (newTimer !== arc.inactionTimer) {
        changed = true;
        return { ...arc, inactionTimer: newTimer };
      }
    }

    if (arc.currentStage === 'reckoning') {
      const turnsInStage = state.turn - arc.stageEnteredTurn;
      if (turnsInStage >= template.config.reckoningDelay) {
        changed = true;
        return { ...arc, currentStage: 'resolved' as const, stageEnteredTurn: state.turn };
      }
    }

    // Arc recurrence: resolved arcs go back to dormant after cooldown
    if (arc.currentStage === 'resolved') {
      const turnsResolved = state.turn - arc.stageEnteredTurn;
      if (turnsResolved >= template.config.cooldownAfterResolution) {
        changed = true;
        return { ...arc, currentStage: 'dormant' as const, stageEnteredTurn: state.turn, inactionTimer: 0, lastEventTurn: 0 };
      }
    }

    return arc;
  });

  if (!changed) return state;
  return { ...state, activeArcs: arcs };
}

function applyCrisisChoice(state: GameState, arcId: string, forkId: string, choice: CrisisForkChoice): GameState {
  let current = { ...state };

  // Apply immediate meter effects
  for (const effect of choice.immediate) {
    const meterKey = effect.meter as keyof typeof current.meters;
    if (meterKey in current.meters) {
      current = {
        ...current,
        meters: { ...current.meters, [meterKey]: (current.meters[meterKey] as number) + effect.amount },
      };
    }
  }

  // Update dependency web conditions
  const conditions = new Set(current.dependencyWeb?.conditions ?? []);
  for (const cond of choice.conditionsCreated) conditions.add(cond);
  for (const cond of choice.conditionsRemoved) conditions.delete(cond);
  current = { ...current, dependencyWeb: { ...current.dependencyWeb, conditions: Array.from(conditions), capacities: current.dependencyWeb?.capacities ?? {} } };

  // Schedule delayed consequences
  let queue = [...(current.delayedConsequenceQueue ?? [])];
  for (const dc of choice.delayedConsequences) {
    const consequence: DelayedConsequence = {
      id: `${forkId}_${choice.id}_${dc.delay}`,
      arcId,
      triggerTurn: current.turn + dc.delay,
      activationConditions: dc.activationConditions,
      cancelConditions: dc.cancelConditions,
      effects: dc.effects.map(e => {
        if (e.type === 'meterDelta') return { type: 'meterDelta', meter: e.meter, amount: e.amount };
        if (e.type === 'tileDamage') return { type: 'tileDamage', tileId: null, damage: e.damage };
        if (e.type === 'spawnEvent') return { type: 'spawnEvent', eventId: e.eventId };
        return { type: 'conditionChange', condition: e.condition, action: e.action };
      }),
      foreshadowHint: dc.foreshadowHint,
      hintTurnsBeforeTrigger: dc.hintTurnsBeforeTrigger,
    };
    queue = scheduleConsequence(queue, consequence);
  }
  current = { ...current, delayedConsequenceQueue: queue };

  // Mark arc as having received player response
  const arcs = current.activeArcs.map(a =>
    a.arcId === arcId
      ? { ...a, lastEventTurn: current.turn, currentStage: 'reckoning' as const, stageEnteredTurn: current.turn, inactionTimer: 0 }
      : a
  );
  current = { ...current, activeArcs: arcs };

  return current;
}

async function main() {
  console.log('=== Long-Form AI Playtest — Playing to WIN (with Crisis Arcs) ===');
  console.log(`Model: Gemini (via CLI) | Crisis arcs: ${allArcTemplates.length} | Runs until win/loss\n`);

  let state = createNewGame();
  const leaders = { ...state.leaders };
  for (const [id, def] of Object.entries(LEADER_DEFINITIONS)) {
    if (leaders[id]) leaders[id] = { ...leaders[id], ...def, trust: leaders[id].trust };
  }
  state = { ...state, leaders };
  state = initializeCrisisArcs(state);
  state = { ...state, activeProposals: generateProposals(state) };

  const history: Array<{
    turn: number; stage: string; budget: number; trust: number;
    eco: number; food: number; will: number; climate: number;
    projects: number; policies: number; actions: number;
    arcEvents: string[];
  }> = [];
  const crisisLog: string[] = [];

  let stuckCounter = 0;
  let lastStage = state.stage;
  let stuckReason: string | null = null;

  while (true) {
    const term = Math.floor((state.turn - 1) / 48) + 1;
    const arcSummary = state.activeArcs?.filter(a => a.currentStage !== 'dormant' && a.currentStage !== 'resolved').map(a => `${a.arcId.split('-')[0]}:${a.currentStage[0].toUpperCase()}`).join(' ') ?? '';
    console.log(`[T${state.turn} ${state.season} Y${state.year} | Term ${term}] Stage: ${state.stage} | Budget $${(state.meters.budget * 1000).toFixed(0)}K | Trust ${state.meters.communityTrust.toFixed(0)}% | Eco ${state.meters.ecologicalHealth.toFixed(0)}% | Food ${state.meters.foodSovereignty.toFixed(0)}% | Will ${state.meters.politicalWill.toFixed(0)}% | Climate ${state.meters.climatePressure.toFixed(0)}%${arcSummary ? ' | Arcs: ' + arcSummary : ''}`);

    try {
      const result = await playTurn(state);
      const tiles = Object.values(state.tiles);
      const arcEvents = result.actions.filter(a => a.startsWith('CRISIS_CHOICE'));
      if (arcEvents.length > 0) {
        for (const ev of arcEvents) {
          crisisLog.push(`T${state.turn}: ${ev}`);
          console.log(`  ⚡ ${ev}`);
        }
      }
      history.push({
        turn: state.turn,
        stage: state.stage,
        budget: state.meters.budget,
        trust: state.meters.communityTrust,
        eco: state.meters.ecologicalHealth,
        food: state.meters.foodSovereignty,
        will: state.meters.politicalWill,
        climate: state.meters.climatePressure,
        projects: tiles.reduce((s, t) => s + t.completedProjects.length, 0),
        policies: state.activePolicies.length,
        actions: result.actions.length,
        arcEvents,
      });
      state = result.state;
    } catch (err) {
      console.error(`  ERROR: ${(err as Error).message}`);
      const afterEnd = gameReducer(state, { type: 'END_TURN' }, PROJECT_CATALOG);
      state = { ...afterEnd, activeProposals: generateProposals(afterEnd) };
    }

    if (state.lossCondition) {
      console.log(`\n*** GAME OVER: ${state.lossCondition} (Turn ${state.turn}) ***`);
      break;
    }
    if (state.winCondition) {
      console.log(`\n*** WIN: ${state.winCondition} (Turn ${state.turn}) ***`);
      break;
    }

    // Detect "stuck" — stage hasn't advanced in 16 turns
    if (state.stage === lastStage) {
      stuckCounter++;
    } else {
      stuckCounter = 0;
      lastStage = state.stage;
    }

    if (stuckCounter >= 48 && state.stage !== 'beyond') {
      const { ecologicalHealth: eco, foodSovereignty: food, communityTrust: trust } = state.meters;
      const policies = state.activePolicies.length;
      const coalitions = state.coalitions.filter(c => c.active).length;
      const blockers: string[] = [];
      if (state.stage === 'restoration') {
        if (eco < 75) blockers.push(`eco ${eco.toFixed(0)}/75`);
        if (food < 60) blockers.push(`food ${food.toFixed(0)}/60`);
        if (trust < 70) blockers.push(`trust ${trust.toFixed(0)}/70`);
        if (policies < 4) blockers.push(`policies ${policies}/4`);
        if (coalitions < 1) blockers.push(`coalitions ${coalitions}/1`);
      }
      stuckReason = `Stage ${state.stage} for 16 turns. Blockers: ${blockers.join(', ') || 'unknown'}`;
      console.log(`\n*** STUCK: ${stuckReason} (Turn ${state.turn}) ***`);
      break;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // Final report
  const tiles = Object.values(state.tiles);
  const completedTotal = tiles.reduce((s, t) => s + t.completedProjects.length, 0);
  const avgTileEco = tiles.reduce((s, t) => s + t.ecologicalHealth, 0) / tiles.length;

  const stageHistory = history.map(h => h.stage);
  const stageTransitions = stageHistory.reduce((acc, stage, i) => {
    if (i > 0 && stage !== stageHistory[i-1]) acc.push(`T${history[i].turn}: ${stageHistory[i-1]} → ${stage}`);
    return acc;
  }, [] as string[]);

  const report = `# Long-Form AI Playtest Report

Date: ${new Date().toISOString()}
Model: Gemini (via CLI)
Turns played: ${history.length} (${Math.ceil(history.length/48)} terms)

## Result

**${state.winCondition ? 'WIN — ' + state.winCondition : state.lossCondition ? 'LOSS — ' + state.lossCondition : stuckReason ? 'STUCK — ' + stuckReason : 'Ended without clear win/loss'}**

Final Stage: **${state.stage}**
Stage Transitions: ${stageTransitions.length > 0 ? stageTransitions.join(' | ') : 'none'}

## Final Meters

| Meter | Start | End | Delta |
|-------|-------|-----|-------|
| Trust | 50% | ${state.meters.communityTrust.toFixed(1)}% | ${(state.meters.communityTrust - 50).toFixed(1)} |
| Eco | 20% | ${state.meters.ecologicalHealth.toFixed(1)}% | ${(state.meters.ecologicalHealth - 20).toFixed(1)} |
| Food | 12% | ${state.meters.foodSovereignty.toFixed(1)}% | ${(state.meters.foodSovereignty - 12).toFixed(1)} |
| Will | 25% | ${state.meters.politicalWill.toFixed(1)}% | ${(state.meters.politicalWill - 25).toFixed(1)} |
| Budget | $1,500K | $${(state.meters.budget * 1000).toFixed(0)}K | ${((state.meters.budget - 1.5) * 1000).toFixed(0)}K |
| Climate | 30% | ${state.meters.climatePressure.toFixed(1)}% | +${(state.meters.climatePressure - 30).toFixed(1)} |

## Progression

- Projects Completed: ${completedTotal}
- Policies Enacted: ${state.activePolicies.length} (${state.activePolicies.map(p => p.definitionId).join(', ') || 'none'})
- Active Coalitions: ${state.coalitions.filter(c => c.active).length}
- Average Tile Eco: ${avgTileEco.toFixed(1)}%

## Turn-by-Turn Summary

| Turn | Stage | Trust | Eco | Food | Will | Budget | Climate | Projects |
|------|-------|-------|-----|------|------|--------|---------|----------|
${history.map(h => `| ${h.turn} | ${h.stage} | ${h.trust.toFixed(0)}% | ${h.eco.toFixed(0)}% | ${h.food.toFixed(0)}% | ${h.will.toFixed(0)}% | $${(h.budget*1000).toFixed(0)}K | ${h.climate.toFixed(0)}% | ${h.projects} |`).join('\n')}

## Crisis Arc History

${crisisLog.length > 0 ? crisisLog.join('\n') : 'No crisis choices made.'}

### Final Arc States

${state.activeArcs?.map(a => `- **${arcTemplateMap[a.arcId]?.name ?? a.arcId}**: ${a.currentStage}`).join('\n') ?? 'No arcs active'}

### Dependency Web

${state.dependencyWeb?.conditions?.length > 0 ? (state.dependencyWeb.conditions as string[]).map(c => `- ${c}`).join('\n') : 'Empty — no conditions created'}

### Pending Delayed Consequences

${state.delayedConsequenceQueue?.length > 0 ? state.delayedConsequenceQueue.map(c => `- T${c.triggerTurn}: ${c.foreshadowHint} (arc: ${c.arcId})`).join('\n') : 'None'}

## Player Fun Notes (real-time reactions)

${funNotes.length > 0 ? funNotes.map(n => `- **T${n.turn}**: ${n.note}`).join('\n') : 'No notes recorded.'}

## Key Questions

- Did the player reach restoration stage? (needs eco≥55, food≥40, trust≥50, 2+ policies)
- Did eco ever grow, or does it only decay?
- What was the highest eco achieved?
- Did elections create real tension?
- Was budget ever a constraint?
- How far from "beyond" stage (eco≥75, food≥60, trust≥70, 4+ policies, coalition)?
- Did the player engage with crisis forks? Which choices were made?
- Did delayed consequences fire? Were any cancelled by player action?
- Did arc escalation create urgency? Did any arcs auto-advance to crisis from inaction?
`;

  const reportPath = '/Users/annhoward/src/city_builder/app/playtest-long-report.md';
  writeFileSync(reportPath, report);
  console.log(`\nReport saved to: ${reportPath}`);

  // Post-game fun review — ask Gemini to evaluate the experience
  console.log('\n=== Requesting Fun Review from Gemini ===\n');
  try {
    const reviewPrompt = `You just finished playtesting a Detroit solarpunk city builder game. You played ${history.length} turns across ${Math.ceil(history.length/12)} in-game months.

Here's a summary of your experience:

${report}

Now step out of the "playing to win" mindset and give your honest opinion AS A GAME DESIGNER AND PLAYER. Rate and discuss:

1. **Fun Factor (1-10)**: How engaging was the moment-to-moment gameplay? Were you making interesting decisions or just optimizing numbers?

2. **Tension & Drama (1-10)**: Did the crisis arcs create genuine "oh shit" moments? Did you feel the stakes of your choices? Or was it predictable?

3. **Meaningful Choices (1-10)**: Did you face real dilemmas where both options had compelling arguments? Or was there always an obvious best move?

4. **Pacing (1-10)**: Did the game feel too slow, too fast, or just right? Were there dead turns where nothing happened? Were you overwhelmed?

5. **Theme Integration (1-10)**: Did the mechanics feel like they were telling a story about Detroit, community power, and ecological restoration? Or did it feel like a generic city builder with a coat of paint?

6. **What was the single most interesting decision you faced?** Why?

7. **What felt broken, unfun, or tedious?** Be brutally honest.

8. **What would make you want to play again?** What's missing?

9. **One-sentence pitch**: How would you describe this game to a friend?

Be specific. Reference actual turns, choices, and mechanics from your playthrough. Don't be nice — be useful.`;

    const review = execSync(
      `gemini -p ${JSON.stringify(reviewPrompt)}`,
      { encoding: 'utf-8', timeout: 120000, maxBuffer: 1024 * 1024 },
    ).trim();

    const reviewPath = '/Users/annhoward/src/city_builder/app/playtest-fun-review.md';
    writeFileSync(reviewPath, `# Gemini Fun Review\n\nDate: ${new Date().toISOString()}\nPlaytest: ${history.length} turns\n\n${review}\n`);
    console.log(review);
    console.log(`\nReview saved to: ${reviewPath}`);
  } catch (e) {
    console.log('Fun review call failed (timeout or error). Report still saved.');
  }
}

main().catch(console.error);
