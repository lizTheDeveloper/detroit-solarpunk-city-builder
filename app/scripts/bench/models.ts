/**
 * LLM model adapters + the LlmAgent that turns any adapter into a DecisionAgent.
 * Adding a model later = one ModelAdapter + one registry entry.
 *
 * v1 event policy: LLM agents pick the first event choice (documented limitation,
 * to avoid one extra slow/timeout-prone model call per event per turn).
 */

import './env.ts'; // load app/.env (overrides stale shell vars) before reading keys
import { execSync } from 'child_process';
import type { GameAction, GameEvent } from '../../src/state/types.ts';
import type { DecisionAgent } from './agent.ts';
import { firstChoice } from './agent.ts';
import type { TurnView } from './types.ts';

export interface ModelAdapter {
  name: string;
  complete(system: string, prompt: string): Promise<string>;
}

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// ── Gemini CLI (OAuth, no key) ──────────────────────────────────────────────
export const geminiAdapter: ModelAdapter = {
  name: 'gemini-cli',
  async complete(system, prompt) {
    const full = `${system}\n\n${prompt}`;
    const escaped = full.replace(/'/g, "'\\''");
    const out = execSync(`gemini -p '${escaped}'`, {
      timeout: 120_000, maxBuffer: 1024 * 1024, encoding: 'utf-8',
    });
    return out.trim();
  },
};

// ── Groq (OpenAI-compatible) ────────────────────────────────────────────────
function groqAdapter(name: string, modelId: string): ModelAdapter {
  return {
    name,
    async complete(system, prompt) {
      const key = process.env.GROQ_API_KEY;
      if (!key) throw new Error('GROQ_API_KEY not set');
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
          temperature: 0.6,
        }),
      });
      if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      return stripThink(data.choices?.[0]?.message?.content ?? '');
    },
  };
}

export const MODEL_REGISTRY: Record<string, ModelAdapter> = {
  'gemini-cli': geminiAdapter,
  'groq-gpt-oss-120b': groqAdapter('groq-gpt-oss-120b', 'openai/gpt-oss-120b'),
  'groq-qwen3-32b': groqAdapter('groq-qwen3-32b', 'qwen/qwen3-32b'),
};

// ── Prompt rendering + parsing ──────────────────────────────────────────────

const SYSTEM = `You are the mayor in a Detroit solarpunk city-builder. Play strategically:
build community trust, ecological health, and food sovereignty; watch gentrification
and the re-election every 16 turns. Respond ONLY with actions, one per line. No prose.`;

function renderPrompt(view: TurnView): string {
  const m = view.meters;
  const lines: string[] = [];
  lines.push(`Turn ${view.turn} | ${view.season} Y${view.year} | Stage: ${view.stage}`);
  lines.push(`Trust ${m.communityTrust.toFixed(0)}% Eco ${m.ecologicalHealth.toFixed(0)}% Food ${m.foodSovereignty.toFixed(0)}% Will ${m.politicalWill.toFixed(0)}% Climate ${m.climatePressure.toFixed(0)}% Budget $${m.budget.toFixed(0)}M`);
  if (view.electionSoon) lines.push('ELECTION in 1-2 turns — equity & low gentrification matter.');

  if (view.proposals.length > 0) {
    lines.push('\nPROPOSALS (respond "accept N" / "reject N"):');
    view.proposals.forEach((p, i) => {
      lines.push(`${i + 1}. "${p.projectName}" in ${p.tileName} — $${p.cost.toFixed(2)}M; eco+${p.effects.eco} food+${p.effects.food} trust+${p.effects.trust} gentrify+${p.effects.gentrification}`);
    });
  }
  const enactable = view.policies.filter((p) => p.enactable);
  if (enactable.length > 0) {
    lines.push(`\nPOLICIES (enact: <id>): ${enactable.map((p) => p.id).join(', ')}`);
  }
  if (view.calendar.some((c) => c.actionType === 'community_meeting') && view.tiles.length > 0) {
    lines.push(`\nCALENDAR (${view.slotsRemaining} slots): "calendar: community_meeting <neighborhood>"`);
    lines.push('Neighborhoods: ' + view.tiles.map((t) => t.id).join(', '));
  }
  lines.push('\nList your actions, then END_TURN.');
  return lines.join('\n');
}

function parseActions(response: string, view: TurnView): GameAction[] {
  const actions: GameAction[] = [];
  for (const raw of response.split('\n')) {
    const line = raw.trim().toLowerCase();

    const prop = line.match(/(accept|reject|modify)\s*#?\s*(\d+)/);
    if (prop) {
      const idx = parseInt(prop[2], 10) - 1;
      const pv = view.proposals[idx];
      if (pv) actions.push({ type: 'RESPOND_PROPOSAL', proposalId: pv.proposal.id, response: prop[1] as 'accept' | 'reject' | 'modify' });
      continue;
    }
    const cal = line.match(/calendar:\s*community_meeting\s+(\w+)/);
    if (cal) {
      const tile = view.tiles.find((t) => t.id.includes(cal[1]) || t.name.toLowerCase().includes(cal[1]));
      if (tile) actions.push({ type: 'CALENDAR_ACTION', actionType: 'community_meeting', tileId: tile.id });
      continue;
    }
    const pol = line.match(/^enact:?\s+([\w-]+)/);
    if (pol) {
      const policy = view.policies.find((p) => p.id === pol[1]);
      if (policy) actions.push({ type: 'ENACT_POLICY', policyId: policy.id });
      continue;
    }
  }
  return actions;
}

/** Wrap a ModelAdapter as a DecisionAgent. Exposes lastPrompt/lastResponse so
 *  the runner can preserve them in the full JSONL log. */
export function llmAgent(adapter: ModelAdapter): DecisionAgent & { lastPrompt?: string; lastResponse?: string } {
  const agent: DecisionAgent & { lastPrompt?: string; lastResponse?: string } = {
    id: adapter.name,
    async decide(view: TurnView): Promise<GameAction[]> {
      const prompt = renderPrompt(view);
      agent.lastPrompt = prompt;
      let response = '';
      try {
        response = await adapter.complete(SYSTEM, prompt);
      } catch (err) {
        response = `__ERROR__ ${(err as Error).message.slice(0, 120)}`;
      }
      agent.lastResponse = response;
      return parseActions(response, view);
    },
    async chooseEvent(event: GameEvent): Promise<string> {
      return firstChoice(event); // v1 documented limitation
    },
  };
  return agent;
}
