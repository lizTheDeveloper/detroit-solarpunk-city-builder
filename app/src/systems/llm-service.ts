// ---------------------------------------------------------------------------
// LLM Service Layer — NPC Conversations
// Designed for dependency injection; no direct SDK imports.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InteractionType =
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'proposal_deferred'
  | 'proposal_modified'
  | 'lobbying'
  | 'direct_engagement'
  | 'antagonist_event'
  | 'campaign_speech'
  | 'endorsement';

export interface ConversationExchange {
  role: 'character' | 'player';
  content: string;
  timestamp: number;
}

export interface ConversationContext {
  characterId: string;
  characterName: string;
  interactionType: InteractionType;
  gameContext: {
    turn: number;
    season: string;
    year: number;
    stage: string;
    budget: number;
    communityTrust: number;
    relationshipScore: number;
    recentEvents: string[];
    neighborhoodName?: string;
    projectName?: string;
    burnoutState?: string;
  };
  conversationHistory: ConversationExchange[];
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  temperature: number;
  enabled: boolean;
}

export interface LLMResponse {
  content: string;
  cached: boolean;
  fallback: boolean;
}

export type ChatCompletionFn = (params: {
  model: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens: number;
  temperature: number;
}) => Promise<string>;

export interface CharacterData {
  name: string;
  role: string;
  neighborhood?: string;
  backstory: string;
  speechPattern: string;
  priorities: string[];
  personality: string;
  exampleLines: string[];
}

export interface LRUCache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  size(): number;
  clear(): void;
}

export interface RateLimiter {
  canMakeRequest(): boolean;
  recordRequest(): void;
  getSessionUsage(): number;
  getSessionLimit(): number;
  reset(): void;
}

export interface LLMService {
  generateResponse(context: ConversationContext, characterData: CharacterData): Promise<LLMResponse>;
  isEnabled(): boolean;
  getUsage(): { sessionCalls: number; maxCalls: number };
  clearCache(): void;
}

// ---------------------------------------------------------------------------
// buildSystemPrompt
// ---------------------------------------------------------------------------

export function buildSystemPrompt(_characterId: string, characterData: CharacterData): string {
  const lines: string[] = [];

  lines.push(`You are ${characterData.name}, a ${characterData.role} in Detroit.`);

  if (characterData.neighborhood) {
    lines.push(`You live and work in ${characterData.neighborhood}.`);
  }

  lines.push('');
  lines.push(`BACKSTORY: ${characterData.backstory}`);
  lines.push('');
  lines.push(`PERSONALITY: ${characterData.personality}`);
  lines.push('');
  lines.push(`SPEECH PATTERN: ${characterData.speechPattern}`);
  lines.push('');
  lines.push('PRIORITIES:');
  for (const priority of characterData.priorities) {
    lines.push(`- ${priority}`);
  }

  lines.push('');
  lines.push('EXAMPLE DIALOGUE:');
  for (const example of characterData.exampleLines) {
    lines.push(`"${example}"`);
  }

  lines.push('');
  lines.push('CONSTRAINTS:');
  lines.push('- Never break character.');
  lines.push('- Keep responses under 3 sentences.');
  lines.push('- Reference specific game events when mentioned in context.');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// buildUserMessage
// ---------------------------------------------------------------------------

const INTERACTION_DESCRIPTIONS: Record<InteractionType, string> = {
  proposal_accepted: 'The player just accepted your proposal',
  proposal_rejected: 'The player just rejected your proposal',
  proposal_deferred: 'The player just deferred your proposal to a later time',
  proposal_modified: 'The player modified your proposal before accepting it',
  lobbying: 'The player is lobbying you on a policy issue',
  direct_engagement: 'The player is engaging you in conversation',
  antagonist_event: 'You are confronting the player about recent events',
  campaign_speech: 'You are giving a campaign speech to rally support',
  endorsement: 'You are endorsing the player publicly',
};

export function buildUserMessage(context: ConversationContext): string {
  const gc = context.gameContext;
  const lines: string[] = [];

  lines.push('[GAME CONTEXT]');
  lines.push(`Turn: ${gc.turn} | Season: ${gc.season} | Year: ${gc.year} | Stage: ${gc.stage}`);
  lines.push(`Budget: ${gc.budget} | Community Trust: ${gc.communityTrust} | Relationship Score: ${gc.relationshipScore}`);

  if (gc.neighborhoodName) {
    lines.push(`Neighborhood: ${gc.neighborhoodName}`);
  }
  if (gc.projectName) {
    lines.push(`Project: ${gc.projectName}`);
  }

  if (gc.recentEvents.length > 0) {
    lines.push(`Recent events: ${gc.recentEvents.join('; ')}`);
  }

  // Burnout context (if calendar state available)
  if (gc.burnoutState) {
    lines.push('');
    switch (gc.burnoutState) {
      case 'overextended':
        lines.push('[MAYOR STATUS: The mayor seems tired and rushed. They have been overcommitting their schedule.]');
        lines.push('[NPC BEHAVIOR: You may comment on the mayor looking tired. Be slightly less patient.]');
        break;
      case 'burnout':
        lines.push('[MAYOR STATUS: The mayor is visibly burned out — forgetting commitments, struggling to focus, exhausted.]');
        lines.push('[NPC BEHAVIOR: Express concern or frustration depending on your relationship. The mayor is not at their best — their arguments lack conviction.]');
        break;
      case 'collapse':
        lines.push('[MAYOR STATUS: The mayor has collapsed from overwork. They should not be here.]');
        lines.push('[NPC BEHAVIOR: Insist they rest. Refuse to conduct business. Show genuine alarm.]');
        break;
      default:
        // sustainable — no special context
        break;
    }
  }

  lines.push('');
  lines.push('[INTERACTION]');
  lines.push(INTERACTION_DESCRIPTIONS[context.interactionType] || 'The player is interacting with you.');

  if (context.conversationHistory.length > 0) {
    lines.push('');
    lines.push('[CONVERSATION SO FAR]');
    for (const exchange of context.conversationHistory) {
      const speaker = exchange.role === 'player' ? 'Player' : context.characterName;
      lines.push(`${speaker}: ${exchange.content}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// createLRUCache
// ---------------------------------------------------------------------------

export function createLRUCache(maxSize: number): LRUCache {
  const map = new Map<string, string>();

  return {
    get(key: string): string | undefined {
      const value = map.get(key);
      if (value !== undefined) {
        // Move to end (most recently used)
        map.delete(key);
        map.set(key, value);
      }
      return value;
    },

    set(key: string, value: string): void {
      if (map.has(key)) {
        map.delete(key);
      } else if (map.size >= maxSize) {
        // Evict least recently used (first entry)
        const firstKey = map.keys().next().value;
        if (firstKey !== undefined) {
          map.delete(firstKey);
        }
      }
      map.set(key, value);
    },

    size(): number {
      return map.size;
    },

    clear(): void {
      map.clear();
    },
  };
}

// ---------------------------------------------------------------------------
// hashContext
// ---------------------------------------------------------------------------

export function hashContext(context: ConversationContext): string {
  const gc = context.gameContext;
  const lastMsg = context.conversationHistory.length > 0
    ? context.conversationHistory[context.conversationHistory.length - 1].content.slice(0, 80)
    : '';
  return [
    context.characterId,
    context.interactionType,
    gc.turn,
    gc.communityTrust,
    gc.relationshipScore,
    gc.budget,
    gc.stage,
    context.conversationHistory.length,
    lastMsg,
  ].join('|');
}

// ---------------------------------------------------------------------------
// createRateLimiter
// ---------------------------------------------------------------------------

export function createRateLimiter(maxPerMinute: number, maxPerSession: number): RateLimiter {
  let timestamps: number[] = [];
  let sessionTotal = 0;

  return {
    canMakeRequest(): boolean {
      if (sessionTotal >= maxPerSession) return false;

      const now = Date.now();
      const oneMinuteAgo = now - 60_000;
      timestamps = timestamps.filter((t) => t > oneMinuteAgo);

      return timestamps.length < maxPerMinute;
    },

    recordRequest(): void {
      timestamps.push(Date.now());
      sessionTotal++;
    },

    getSessionUsage(): number {
      return sessionTotal;
    },

    getSessionLimit(): number {
      return maxPerSession;
    },

    reset(): void {
      timestamps = [];
      sessionTotal = 0;
    },
  };
}

// ---------------------------------------------------------------------------
// getStaticFallback
// ---------------------------------------------------------------------------

const FALLBACK_TEMPLATES: Record<InteractionType, string> = {
  proposal_accepted: '[Name] nods approvingly.',
  proposal_rejected: '[Name] looks disappointed.',
  proposal_deferred: '[Name] waits patiently.',
  proposal_modified: '[Name] considers the changes.',
  lobbying: '[Name] considers your argument.',
  direct_engagement: '[Name] listens carefully.',
  antagonist_event: '[Name] regards you coolly.',
  campaign_speech: '[Name] addresses the crowd.',
  endorsement: '[Name] speaks on your behalf.',
};

export function getStaticFallback(characterId: string, interactionType: InteractionType): string {
  const template = FALLBACK_TEMPLATES[interactionType] || '[Name] regards you.';
  // Use characterId as a readable fallback name (capitalize first letter)
  const name = characterId.charAt(0).toUpperCase() + characterId.slice(1);
  return template.replace('[Name]', name);
}

// ---------------------------------------------------------------------------
// createLLMService
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 15000;
const CACHE_SIZE = 50;
const MAX_PER_MINUTE = 10;
const MAX_PER_SESSION = 100;

export function createLLMService(config: LLMConfig, chatFn: ChatCompletionFn): LLMService {
  const cache = createLRUCache(CACHE_SIZE);
  const rateLimiter = createRateLimiter(MAX_PER_MINUTE, MAX_PER_SESSION);

  return {
    async generateResponse(context: ConversationContext, characterData: CharacterData): Promise<LLMResponse> {
      // 1. If not enabled, return fallback immediately
      if (!config.enabled) {
        return {
          content: getStaticFallback(context.characterId, context.interactionType),
          cached: false,
          fallback: true,
        };
      }

      // 2. Check rate limiter
      if (!rateLimiter.canMakeRequest()) {
        return {
          content: getStaticFallback(context.characterId, context.interactionType),
          cached: false,
          fallback: true,
        };
      }

      // 3. Check cache (skip for multi-turn conversations)
      const cacheKey = hashContext(context);
      if (context.conversationHistory.length === 0) {
        const cachedContent = cache.get(cacheKey);
        if (cachedContent !== undefined) {
          return {
            content: cachedContent,
            cached: true,
            fallback: false,
          };
        }
      }

      // 4. Build prompts
      const systemPrompt = buildSystemPrompt(context.characterId, characterData);
      const userMessage = buildUserMessage(context);

      // 5. Convert conversation history to messages array
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      for (const exchange of context.conversationHistory) {
        messages.push({
          role: exchange.role === 'player' ? 'user' : 'assistant',
          content: exchange.content,
        });
      }
      // Add the current user message
      messages.push({ role: 'user', content: userMessage });

      // 6. Call chatFn with timeout
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('LLM request timed out')), TIMEOUT_MS);
        });

        const responsePromise = chatFn({
          model: config.model,
          system: systemPrompt,
          messages,
          maxTokens: config.maxOutputTokens,
          temperature: config.temperature,
        });

        const content = await Promise.race([responsePromise, timeoutPromise]);

        // Success: cache and record
        cache.set(cacheKey, content);
        rateLimiter.recordRequest();

        return {
          content,
          cached: false,
          fallback: false,
        };
      } catch {
        // On failure/timeout: return fallback
        return {
          content: getStaticFallback(context.characterId, context.interactionType),
          cached: false,
          fallback: true,
        };
      }
    },

    isEnabled(): boolean {
      return config.enabled;
    },

    getUsage(): { sessionCalls: number; maxCalls: number } {
      return {
        sessionCalls: rateLimiter.getSessionUsage(),
        maxCalls: rateLimiter.getSessionLimit(),
      };
    },

    clearCache(): void {
      cache.clear();
    },
  };
}
