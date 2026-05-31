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

function parseTrustDelta(text: string): { cleanText: string; trustDelta: number } {
  const match = text.match(/\[TRUST:\s*([+-]?\d+)\]/i);
  if (match) {
    const delta = parseInt(match[1], 10);
    const cleanText = text.replace(/\[TRUST:\s*[+-]?\d+\]/gi, '').trim();
    return { cleanText, trustDelta: Math.max(-10, Math.min(10, delta)) };
  }
  return { cleanText: text, trustDelta: 0 };
}

const TRUST_INSTRUCTION = `

After your dialogue, on a new line, output a trust tag: [TRUST: N]
N is an integer from -5 to +5 reflecting how this exchange affects your trust in the mayor:
- +3 to +5: they said something that deeply resonates with your priorities or shows real understanding
- +1 to +2: respectful, shows they're listening, makes reasonable points
- 0: neutral exchange, small talk, neither good nor bad
- -1 to -2: dismissive, generic politician talk, ignoring your concerns
- -3 to -5: insulting, threatening, making promises you know are empty, ignoring your community

Be honest. Don't be easily flattered. You've heard politicians talk before.
If they're trying to negotiate a project you proposed, you can be flexible on details but firm on principles.
If they ask you to change your proposal, consider it genuinely — but push back if it compromises your community's needs.`;

export default function ConversationPanel({
  characterId,
  interactionType,
  onDismiss,
  initialMessage,
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
      const { cleanText } = parseTrustDelta(response.content);
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

    const augmentedCharData = {
      ...characterData,
      exampleLines: [...characterData.exampleLines],
      personality: characterData.personality + TRUST_INSTRUCTION,
    };

    try {
      const response = await llmService.generateResponse(context, augmentedCharData);
      const { cleanText, trustDelta } = parseTrustDelta(response.content);

      if (trustDelta !== 0) {
        dispatch({ type: 'CONVERSATION_OUTCOME', characterId, trustDelta });
        setTotalTrustChange((prev) => prev + trustDelta);
      }

      setMessages((prev) => [...prev, {
        id: `msg-${prev.length}`,
        sender: 'character',
        text: cleanText,
        trustDelta,
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
