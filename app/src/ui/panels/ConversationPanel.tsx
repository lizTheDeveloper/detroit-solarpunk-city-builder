import { useState, useRef, useEffect, useMemo } from 'react';
import { useGame } from '@/state/store';
import { CHARACTER_PROMPTS } from '@/data/content/character-prompts';
import { getRelationshipLevel } from '@/systems/relationships';
import { createLLMService, type ConversationContext, type ConversationExchange, type InteractionType, type LLMConfig } from '@/systems/llm-service';
import { createGroqChatFn } from '@/systems/groq-adapter';
import '@/ui/styles/conversation.css';

interface ConversationMessage {
  id: string;
  sender: 'character' | 'player';
  text: string;
  trustDelta?: number;
}

interface ConversationPanelProps {
  characterId: string;
  interactionType: string;
  onDismiss: () => void;
  initialMessage?: string;
  proposalId?: string;
}

function getCharacterName(characterId: string): string {
  const promptData = CHARACTER_PROMPTS[characterId];
  if (promptData) return promptData.name;
  return characterId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRelationshipLabel(characterId: string, state: ReturnType<typeof useGame>['state']): string {
  const leader = state.leaders[characterId];
  if (leader) {
    return getRelationshipLevel(leader.trust);
  }
  const council = state.councilMembers[characterId];
  if (council) {
    if (council.disposition >= 40) return 'ally';
    if (council.disposition >= 0) return 'neutral';
    return 'skeptic';
  }
  return 'neutral';
}

function getLLMSettings(): { model: string; enabled: boolean } {
  try {
    const raw = localStorage.getItem('detroit_solarpunk_llm_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        model: parsed.model || 'qwen/qwen3-32b',
        enabled: parsed.enabled ?? true,
      };
    }
  } catch { /* ignore */ }
  return { model: 'qwen/qwen3-32b', enabled: true };
}

interface ParsedResponse {
  cleanText: string;
  trustDelta: number;
  costMultiplier?: number;
  leaderContribution?: number;
  durationModifier?: number;
}

function parseResponse(text: string): ParsedResponse {
  let cleanText = text;
  let trustDelta = 0;
  let costMultiplier: number | undefined;
  let leaderContribution: number | undefined;
  let durationModifier: number | undefined;

  const trustMatch = cleanText.match(/\[TRUST:\s*([+-]?\d+)\]/i);
  if (trustMatch) {
    trustDelta = Math.max(-10, Math.min(10, parseInt(trustMatch[1], 10)));
    cleanText = cleanText.replace(/\[TRUST:\s*[+-]?\d+\]/gi, '');
  }

  const costMatch = cleanText.match(/\[COST:\s*([0-9.]+)\]/i);
  if (costMatch) {
    costMultiplier = Math.max(0.3, Math.min(1.0, parseFloat(costMatch[1])));
    cleanText = cleanText.replace(/\[COST:\s*[0-9.]+\]/gi, '');
  }

  const contribMatch = cleanText.match(/\[CONTRIBUTE:\s*([0-9.]+)\]/i);
  if (contribMatch) {
    leaderContribution = Math.max(0, parseFloat(contribMatch[1]));
    cleanText = cleanText.replace(/\[CONTRIBUTE:\s*[0-9.]+\]/gi, '');
  }

  const durMatch = cleanText.match(/\[DURATION:\s*([+-]?\d+)\]/i);
  if (durMatch) {
    durationModifier = Math.max(-4, Math.min(6, parseInt(durMatch[1], 10)));
    cleanText = cleanText.replace(/\[DURATION:\s*[+-]?\d+\]/gi, '');
  }

  return { cleanText: cleanText.trim(), trustDelta, costMultiplier, leaderContribution, durationModifier };
}

const TRUST_INSTRUCTION = `

After your dialogue, on a new line, output a trust tag: [TRUST: N]
N is an integer from -5 to +5 reflecting how this exchange affects your trust in the mayor:
- +3 to +5: they said something that deeply resonates with your priorities or shows real understanding
- +1 to +2: respectful, shows they're listening, makes reasonable points
- 0: neutral exchange, small talk, neither good nor bad
- -1 to -2: dismissive, generic politician talk, ignoring your concerns
- -3 to -5: insulting, threatening, making promises you know are empty, ignoring your community

Be honest. Don't be easily flattered. You've heard politicians talk before.`;

const NEGOTIATION_INSTRUCTION = `

You proposed a project. The mayor wants to discuss terms. You can negotiate.
If you agree to change terms, output these tags on a new line after your dialogue (only the ones that change):
- [COST: X] where X is a multiplier (0.5 = half price, 0.8 = 20% discount). Only offer discounts if the mayor makes a compelling case or offers something in return.
- [CONTRIBUTE: X] where X is the budget amount (in game units, e.g. 0.1 = $100K) your community can contribute. Your community has limited funds — only offer this for projects you deeply care about or if the mayor agrees to your priorities elsewhere.
- [DURATION: +N or -N] where N is turns added or removed. Cheaper projects take longer. Rushing costs more.

Don't offer everything at once. Make the mayor work for it. Push back on unreasonable asks. If they're dismissive, refuse to negotiate further.
You care about your community first. A bad deal is worse than no deal.`;

export default function ConversationPanel({
  characterId,
  interactionType,
  onDismiss,
  initialMessage,
  proposalId,
}: ConversationPanelProps) {
  const { state, dispatch } = useGame();
  const [messages, setMessages] = useState<ConversationMessage[]>(() => {
    const initial: ConversationMessage[] = [];
    if (initialMessage) {
      initial.push({ id: 'msg-0', sender: 'character', text: initialMessage });
    }
    return initial;
  });
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [totalTrustChange, setTotalTrustChange] = useState(0);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const characterName = getCharacterName(characterId);
  const relationship = getRelationshipLabel(characterId, state);
  const leader = state.leaders[characterId];
  const trustValue = leader ? Math.round(leader.trust) : null;

  const llmService = useMemo(() => {
    const settings = getLLMSettings();
    if (!settings.enabled) return null;
    const config: LLMConfig = {
      apiKey: 'server-side',
      model: settings.model,
      maxInputTokens: 600,
      maxOutputTokens: 0,
      temperature: 0.7,
      enabled: true,
    };
    const chatFn = createGroqChatFn();
    return createLLMService(config, chatFn);
  }, []);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  useEffect(() => {
    if (!isThinking && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isThinking]);

  useEffect(() => {
    if (initialMessage || !llmService) return;
    const characterData = CHARACTER_PROMPTS[characterId];
    if (!characterData) return;

    let cancelled = false;
    setIsThinking(true);
    const relationshipScore = leader ? leader.trust : (state.councilMembers[characterId]?.disposition ?? 0);

    const context: ConversationContext = {
      characterId,
      characterName,
      interactionType: interactionType as InteractionType,
      gameContext: {
        turn: state.turn,
        season: state.season,
        year: state.year,
        stage: state.stage,
        budget: state.meters.budget,
        communityTrust: state.meters.communityTrust,
        relationshipScore,
        recentEvents: [],
        neighborhoodName: leader?.neighborhood,
      },
      conversationHistory: [],
    };

    llmService.generateResponse(context, {
      ...characterData,
      exampleLines: [...characterData.exampleLines],
    }).then((response) => {
      if (cancelled) return;
      const { cleanText } = parseResponse(response.content);
      setMessages((prev) => {
        if (prev.length > 0) return prev;
        return [{ id: 'msg-0', sender: 'character', text: cleanText }];
      });
      setIsThinking(false);
    });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isThinking) return;

    const playerMsg: ConversationMessage = {
      id: `msg-${messages.length}`,
      sender: 'player',
      text,
    };
    setMessages((prev) => [...prev, playerMsg]);
    setInputText('');
    setIsThinking(true);

    const characterData = CHARACTER_PROMPTS[characterId];
    if (!llmService || !characterData) {
      setMessages((prev) => [...prev, {
        id: `msg-${prev.length}`,
        sender: 'character',
        text: `${characterName} considers what you said.`,
      }]);
      setIsThinking(false);
      return;
    }

    const history: ConversationExchange[] = [...messages, playerMsg].map((m) => ({
      role: m.sender === 'player' ? 'player' as const : 'character' as const,
      content: m.text,
      timestamp: Date.now(),
    }));

    const relationshipScore = leader ? leader.trust : (state.councilMembers[characterId]?.disposition ?? 0);

    const context: ConversationContext = {
      characterId,
      characterName,
      interactionType: interactionType as InteractionType,
      gameContext: {
        turn: state.turn,
        season: state.season,
        year: state.year,
        stage: state.stage,
        budget: state.meters.budget,
        communityTrust: state.meters.communityTrust,
        relationshipScore,
        recentEvents: [],
        neighborhoodName: leader?.neighborhood,
      },
      conversationHistory: history,
    };

    const proposal = proposalId ? state.activeProposals.find((p) => p.id === proposalId) : undefined;
    const PROJECT_CATALOG_IMPORT = await import('@/data/content/project-catalog').then((m) => m.PROJECT_CATALOG);
    const projectDef = proposal ? PROJECT_CATALOG_IMPORT[proposal.projectDefinitionId] : undefined;

    let extraInstructions = TRUST_INSTRUCTION;
    if (proposal && projectDef) {
      context.gameContext.projectName = projectDef.name;
      extraInstructions += NEGOTIATION_INSTRUCTION;
      extraInstructions += `\n\nYour proposed project: "${projectDef.name}" costs $${(projectDef.baseCost * 1000).toFixed(0)}K, takes ${projectDef.baseDuration} turns.`;
      context.gameContext.recentEvents = [
        `NEGOTIATION CONTEXT: You proposed "${projectDef.name}" (base cost $${(projectDef.baseCost * 1000).toFixed(0)}K, ${projectDef.baseDuration} turns). Remember to output [TRUST: N] and any negotiation tags [COST: X] [CONTRIBUTE: X] [DURATION: +/-N] after your dialogue.`,
      ];
    }

    const augmentedCharData = {
      ...characterData,
      exampleLines: [...characterData.exampleLines],
      personality: characterData.personality + extraInstructions,
    };

    try {
      const response = await llmService.generateResponse(context, augmentedCharData);
      const parsed = parseResponse(response.content);

      if (parsed.trustDelta !== 0) {
        dispatch({ type: 'CONVERSATION_OUTCOME', characterId, trustDelta: parsed.trustDelta });
        setTotalTrustChange((prev) => prev + parsed.trustDelta);
      }

      if (proposalId && (parsed.costMultiplier != null || parsed.leaderContribution != null || parsed.durationModifier != null)) {
        const existing = proposal?.negotiation;
        dispatch({
          type: 'NEGOTIATE_PROPOSAL',
          proposalId,
          negotiation: {
            costMultiplier: parsed.costMultiplier ?? existing?.costMultiplier ?? 0.85,
            leaderContribution: parsed.leaderContribution ?? existing?.leaderContribution ?? 0,
            durationModifier: parsed.durationModifier ?? existing?.durationModifier ?? 0,
          },
        });
      }

      setMessages((prev) => [...prev, {
        id: `msg-${prev.length}`,
        sender: 'character',
        text: parsed.cleanText,
        trustDelta: parsed.trustDelta,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `msg-${prev.length}`,
        sender: 'character',
        text: `${characterName} pauses, considering.`,
      }]);
    }
    setIsThinking(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="convo-panel">
      <div className="convo-header">
        <div className="convo-header__info">
          <span className="convo-header__name">{characterName}</span>
          <span className={`convo-header__rel convo-header__rel--${relationship}`}>{relationship}</span>
          {trustValue != null && (
            <span className="convo-header__trust">
              Trust: {trustValue > 0 ? '+' : ''}{trustValue}
              {totalTrustChange !== 0 && (
                <span className={`convo-header__delta ${totalTrustChange > 0 ? 'convo-header__delta--up' : 'convo-header__delta--down'}`}>
                  ({totalTrustChange > 0 ? '+' : ''}{totalTrustChange})
                </span>
              )}
            </span>
          )}
        </div>
        <button type="button" onClick={onDismiss} className="convo-header__close" aria-label="Close conversation">
          &times;
        </button>
      </div>

      <div className="convo-thread" ref={threadRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`convo-msg convo-msg--${msg.sender}`}>
            {msg.sender === 'character' && (
              <span className="convo-msg__sender">{characterName}</span>
            )}
            <p className="convo-msg__text">{msg.text}</p>
            {msg.trustDelta != null && msg.trustDelta !== 0 && (
              <span className={`convo-msg__trust ${msg.trustDelta > 0 ? 'convo-msg__trust--up' : 'convo-msg__trust--down'}`}>
                {msg.trustDelta > 0 ? '+' : ''}{msg.trustDelta} trust
              </span>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="convo-typing">
            <span className="convo-typing__dot" />
            <span className="convo-typing__dot" />
            <span className="convo-typing__dot" />
          </div>
        )}
      </div>

      <div className="convo-input">
        <textarea
          ref={inputRef}
          className="convo-input__field"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Speak to ${characterName}...`}
          disabled={isThinking}
          rows={2}
        />
        <button
          type="button"
          className="convo-input__send"
          onClick={handleSend}
          disabled={isThinking || !inputText.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
