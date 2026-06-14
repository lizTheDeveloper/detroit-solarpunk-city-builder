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

// ── Anthropic (Messages API) — per the board's "Claude for playtesters" directive ──
function anthropicAdapter(name: string, modelId: string): ModelAdapter {
  return {
    name,
    async complete(system, prompt) {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error('ANTHROPIC_API_KEY not set');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 1024,
          system,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      return (data.content?.[0]?.text ?? '').trim();
    },
  };
}

export const MODEL_REGISTRY: Record<string, ModelAdapter> = {
  'gemini-cli': geminiAdapter,
  'groq-gpt-oss-120b': groqAdapter('groq-gpt-oss-120b', 'openai/gpt-oss-120b'),
  'groq-qwen3-32b': groqAdapter('groq-qwen3-32b', 'qwen/qwen3-32b'),
  'claude-haiku-4.5': anthropicAdapter('claude-haiku-4.5', 'claude-haiku-4-5-20251001'),
  'claude-sonnet-4.6': anthropicAdapter('claude-sonnet-4.6', 'claude-sonnet-4-6'),
};

// ── Prompt rendering + parsing ──────────────────────────────────────────────

const SYSTEM = `You are the mayor in a Detroit solarpunk city-builder. THIS IS A CALENDAR GAME:
each turn you have a limited number of discretionary slots to spend on your neighborhoods,
and your re-election depends heavily on spreading your time EQUITABLY across ALL of them —
neighborhoods you neglect cost you. Spend most of your slots each turn (don't leave them idle),
cover under-served neighborhoods, and don't overschedule into burnout. Also build trust, eco,
and food sovereignty and watch gentrification. Respond ONLY with actions, one per line. No prose.`;

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
  if (view.events.length > 0) {
    lines.push('\nEVENTS — for EACH, pick one choice with a line "event: <choiceId>" (mind the will/trust deltas):');
    view.events.forEach((e) => {
      lines.push(`- "${e.title}": ${e.choices.map((c) => `${c.id} [${c.deltas || 'no meter change'}]`).join(' | ')}`);
    });
  }
  if (view.tiles.length > 0) {
    lines.push(`\nCALENDAR — ${view.slotsRemaining} slots this turn | burnout buffer ${view.burnout.buffer.toFixed(0)}/${view.burnout.max} (${view.burnout.state})`);
    lines.push('Actions: "calendar: community_meeting <hood>" (2 slots, +trust/+eco) | "calendar: quick_check_in <hood>" (1 slot) | "calendar: public_event <hood>" (3 slots, +trust/+will) | "calendar: rest_day" (1 slot, recover burnout)');
    // Show neighborhoods sorted by least cumulative time first (the ones to cover).
    const sorted = [...view.tiles].sort((a, b) => a.timeAllocated - b.timeAllocated);
    lines.push('Neighborhoods (least-visited first → cover these): ' + sorted.map((t) => `${t.id}[t=${t.timeAllocated}]`).join(', '));
  }
  lines.push('\nDecide each EVENT, spend your slots, then END_TURN.');
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
    if (/calendar:\s*rest_day/.test(line)) {
      actions.push({ type: 'CALENDAR_REST_DAY' });
      continue;
    }
    const cal = line.match(/calendar:\s*(community_meeting|quick_check_in|public_event)\s+([\w-]+)/);
    if (cal) {
      const actionType = cal[1] as 'community_meeting' | 'quick_check_in' | 'public_event';
      const tile = view.tiles.find((t) => t.id.includes(cal[2]) || t.name.toLowerCase().includes(cal[2]));
      if (tile) actions.push({ type: 'CALENDAR_ACTION', actionType, tileId: tile.id });
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

/** Parse the model's event decisions ("event: <choiceId>") into a set of chosen
 *  choice ids, so chooseEvent can honor them (folded into the one per-turn call). */
function parseEventChoices(response: string): Set<string> {
  const chosen = new Set<string>();
  for (const raw of response.split('\n')) {
    const m = raw.trim().toLowerCase().match(/^event:?\s+([\w-]+)/);
    if (m) chosen.add(m[1]);
  }
  return chosen;
}

/** Wrap a ModelAdapter as a DecisionAgent. Exposes lastPrompt/lastResponse so
 *  the runner can preserve them in the full JSONL log. Event choices are decided
 *  in the same per-turn call (no extra latency) and honored by chooseEvent. */
export function llmAgent(adapter: ModelAdapter): DecisionAgent & { lastPrompt?: string; lastResponse?: string } {
  let eventChoices = new Set<string>();
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
      eventChoices = parseEventChoices(response);
      return parseActions(response, view);
    },
    async chooseEvent(event: GameEvent): Promise<string> {
      // Honor the model's decision from this turn's call; fall back to first choice.
      const picked = event.choices.find((c) => eventChoices.has(c.id.toLowerCase()));
      return picked?.id ?? firstChoice(event);
    },
  };
  return agent;
}
