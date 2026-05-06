import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildSystemPrompt,
  buildUserMessage,
  createLRUCache,
  hashContext,
  createRateLimiter,
  createLLMService,
  getStaticFallback,
} from './llm-service';
import type {
  CharacterData,
  ConversationContext,
  LLMConfig,
  ChatCompletionFn,
} from './llm-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCharacterData(overrides: Partial<CharacterData> = {}): CharacterData {
  return {
    name: 'Grace Okafor-Williams',
    role: 'community leader',
    neighborhood: 'Brightmoor',
    backstory: 'An urban farmer in her 60s who has been growing food on vacant lots since 2008.',
    speechPattern: 'Warm, direct, uses gardening metaphors.',
    priorities: ['food_forest', 'community_kitchen', 'soil_remediation'],
    personality: 'Patient, determined, nurturing but firm when crossed.',
    exampleLines: [
      'You plant seeds in trust, and you harvest together.',
      'This soil remembers what was here before. So do I.',
    ],
    ...overrides,
  };
}

function makeContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
  return {
    characterId: 'grace',
    characterName: 'Grace Okafor-Williams',
    interactionType: 'proposal_accepted',
    gameContext: {
      turn: 5,
      season: 'summer',
      year: 2030,
      stage: 'awakening',
      budget: 3.5,
      communityTrust: 42,
      relationshipScore: 30,
      recentEvents: ['Food forest completed in Brightmoor', 'Community meeting held'],
      neighborhoodName: 'Brightmoor',
      projectName: 'Food Forest',
    },
    conversationHistory: [],
    ...overrides,
  };
}

function makeConfig(overrides: Partial<LLMConfig> = {}): LLMConfig {
  return {
    apiKey: 'test-key',
    model: 'test-model',
    maxInputTokens: 4096,
    maxOutputTokens: 256,
    temperature: 0.7,
    enabled: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildSystemPrompt
// ---------------------------------------------------------------------------

describe('buildSystemPrompt', () => {
  it('includes character name and role', () => {
    const data = makeCharacterData();
    const prompt = buildSystemPrompt('grace', data);
    expect(prompt).toContain('Grace Okafor-Williams');
    expect(prompt).toContain('community leader');
  });

  it('includes neighborhood when provided', () => {
    const data = makeCharacterData({ neighborhood: 'Brightmoor' });
    const prompt = buildSystemPrompt('grace', data);
    expect(prompt).toContain('Brightmoor');
  });

  it('includes personality description', () => {
    const data = makeCharacterData({ personality: 'Patient and determined' });
    const prompt = buildSystemPrompt('grace', data);
    expect(prompt).toContain('Patient and determined');
  });

  it('includes speech pattern', () => {
    const data = makeCharacterData({ speechPattern: 'Uses gardening metaphors' });
    const prompt = buildSystemPrompt('grace', data);
    expect(prompt).toContain('Uses gardening metaphors');
  });

  it('includes example dialogue lines', () => {
    const data = makeCharacterData({
      exampleLines: ['This soil remembers.', 'Seeds need trust.'],
    });
    const prompt = buildSystemPrompt('grace', data);
    expect(prompt).toContain('This soil remembers.');
    expect(prompt).toContain('Seeds need trust.');
  });

  it('includes constraints about staying in character', () => {
    const data = makeCharacterData();
    const prompt = buildSystemPrompt('grace', data);
    expect(prompt).toContain('Never break character');
    expect(prompt).toContain('Keep responses under 3 sentences');
    expect(prompt).toContain('Reference specific game events when mentioned in context');
  });

  it('includes priorities', () => {
    const data = makeCharacterData({ priorities: ['food_forest', 'soil_remediation'] });
    const prompt = buildSystemPrompt('grace', data);
    expect(prompt).toContain('food_forest');
    expect(prompt).toContain('soil_remediation');
  });
});

// ---------------------------------------------------------------------------
// buildUserMessage
// ---------------------------------------------------------------------------

describe('buildUserMessage', () => {
  it('includes turn, season, year, and stage', () => {
    const context = makeContext();
    const msg = buildUserMessage(context);
    expect(msg).toContain('Turn: 5');
    expect(msg).toContain('Season: summer');
    expect(msg).toContain('Year: 2030');
    expect(msg).toContain('Stage: awakening');
  });

  it('includes budget and community trust', () => {
    const context = makeContext();
    const msg = buildUserMessage(context);
    expect(msg).toContain('Budget: 3.5');
    expect(msg).toContain('Community Trust: 42');
  });

  it('includes relationship score', () => {
    const context = makeContext();
    const msg = buildUserMessage(context);
    expect(msg).toContain('Relationship Score: 30');
  });

  it('includes interaction description for proposal_accepted', () => {
    const context = makeContext({ interactionType: 'proposal_accepted' });
    const msg = buildUserMessage(context);
    expect(msg).toContain('The player just accepted your proposal');
  });

  it('includes interaction description for lobbying', () => {
    const context = makeContext({ interactionType: 'lobbying' });
    const msg = buildUserMessage(context);
    expect(msg).toContain('The player is lobbying you on a policy issue');
  });

  it('includes recent events', () => {
    const context = makeContext();
    const msg = buildUserMessage(context);
    expect(msg).toContain('Food forest completed in Brightmoor');
    expect(msg).toContain('Community meeting held');
  });

  it('includes neighborhood name when provided', () => {
    const context = makeContext();
    const msg = buildUserMessage(context);
    expect(msg).toContain('Neighborhood: Brightmoor');
  });

  it('includes project name when provided', () => {
    const context = makeContext();
    const msg = buildUserMessage(context);
    expect(msg).toContain('Project: Food Forest');
  });

  it('includes conversation history when present', () => {
    const context = makeContext({
      conversationHistory: [
        { role: 'player', content: 'I like your proposal.', timestamp: 1000 },
        { role: 'character', content: 'Thank you for listening.', timestamp: 1001 },
      ],
    });
    const msg = buildUserMessage(context);
    expect(msg).toContain('Player: I like your proposal.');
    expect(msg).toContain('Grace Okafor-Williams: Thank you for listening.');
  });
});

// ---------------------------------------------------------------------------
// createLRUCache
// ---------------------------------------------------------------------------

describe('createLRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = createLRUCache(3);
    cache.set('a', 'alpha');
    expect(cache.get('a')).toBe('alpha');
  });

  it('returns undefined for missing keys', () => {
    const cache = createLRUCache(3);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts least recently used when at max size', () => {
    const cache = createLRUCache(2);
    cache.set('a', 'alpha');
    cache.set('b', 'beta');
    cache.set('c', 'gamma'); // evicts 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('beta');
    expect(cache.get('c')).toBe('gamma');
  });

  it('accessing a key makes it most recently used', () => {
    const cache = createLRUCache(2);
    cache.set('a', 'alpha');
    cache.set('b', 'beta');
    cache.get('a'); // access 'a' — now 'b' is LRU
    cache.set('c', 'gamma'); // evicts 'b'
    expect(cache.get('a')).toBe('alpha');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe('gamma');
  });

  it('tracks size correctly', () => {
    const cache = createLRUCache(5);
    expect(cache.size()).toBe(0);
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size()).toBe(2);
  });

  it('clear empties the cache', () => {
    const cache = createLRUCache(5);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('overwriting a key does not increase size', () => {
    const cache = createLRUCache(3);
    cache.set('a', 'alpha');
    cache.set('a', 'ALPHA');
    expect(cache.size()).toBe(1);
    expect(cache.get('a')).toBe('ALPHA');
  });
});

// ---------------------------------------------------------------------------
// hashContext
// ---------------------------------------------------------------------------

describe('hashContext', () => {
  it('produces the same hash for identical inputs', () => {
    const ctx1 = makeContext();
    const ctx2 = makeContext();
    expect(hashContext(ctx1)).toBe(hashContext(ctx2));
  });

  it('produces different hashes for different characterIds', () => {
    const ctx1 = makeContext({ characterId: 'grace' });
    const ctx2 = makeContext({ characterId: 'kez' });
    expect(hashContext(ctx1)).not.toBe(hashContext(ctx2));
  });

  it('produces different hashes for different interactionTypes', () => {
    const ctx1 = makeContext({ interactionType: 'proposal_accepted' });
    const ctx2 = makeContext({ interactionType: 'proposal_rejected' });
    expect(hashContext(ctx1)).not.toBe(hashContext(ctx2));
  });

  it('produces different hashes for different turns', () => {
    const ctx1 = makeContext({ gameContext: { ...makeContext().gameContext, turn: 1 } });
    const ctx2 = makeContext({ gameContext: { ...makeContext().gameContext, turn: 2 } });
    expect(hashContext(ctx1)).not.toBe(hashContext(ctx2));
  });

  it('produces different hashes for different relationship scores', () => {
    const ctx1 = makeContext({ gameContext: { ...makeContext().gameContext, relationshipScore: 10 } });
    const ctx2 = makeContext({ gameContext: { ...makeContext().gameContext, relationshipScore: 50 } });
    expect(hashContext(ctx1)).not.toBe(hashContext(ctx2));
  });
});

// ---------------------------------------------------------------------------
// createRateLimiter
// ---------------------------------------------------------------------------

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = createRateLimiter(5, 100);
    expect(limiter.canMakeRequest()).toBe(true);
  });

  it('blocks after per-minute limit is exceeded', () => {
    const limiter = createRateLimiter(2, 100);
    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(false);
  });

  it('allows requests again after one minute passes', () => {
    const limiter = createRateLimiter(2, 100);
    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(limiter.canMakeRequest()).toBe(true);
  });

  it('blocks after session limit is exceeded', () => {
    const limiter = createRateLimiter(100, 3);
    limiter.recordRequest();
    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(false);
  });

  it('tracks session usage correctly', () => {
    const limiter = createRateLimiter(10, 100);
    expect(limiter.getSessionUsage()).toBe(0);
    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.getSessionUsage()).toBe(2);
  });

  it('returns session limit', () => {
    const limiter = createRateLimiter(10, 50);
    expect(limiter.getSessionLimit()).toBe(50);
  });

  it('reset clears all state', () => {
    const limiter = createRateLimiter(2, 100);
    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(false);
    limiter.reset();
    expect(limiter.canMakeRequest()).toBe(true);
    expect(limiter.getSessionUsage()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getStaticFallback
// ---------------------------------------------------------------------------

describe('getStaticFallback', () => {
  it('returns approval text for proposal_accepted', () => {
    const result = getStaticFallback('grace', 'proposal_accepted');
    expect(result).toBe('Grace nods approvingly.');
  });

  it('returns disappointment text for proposal_rejected', () => {
    const result = getStaticFallback('grace', 'proposal_rejected');
    expect(result).toBe('Grace looks disappointed.');
  });

  it('returns patience text for proposal_deferred', () => {
    const result = getStaticFallback('grace', 'proposal_deferred');
    expect(result).toBe('Grace waits patiently.');
  });

  it('returns argument text for lobbying', () => {
    const result = getStaticFallback('kez', 'lobbying');
    expect(result).toBe('Kez considers your argument.');
  });

  it('returns listening text for direct_engagement', () => {
    const result = getStaticFallback('darius', 'direct_engagement');
    expect(result).toBe('Darius listens carefully.');
  });

  it('returns cool regard text for antagonist_event', () => {
    const result = getStaticFallback('sterling_cross', 'antagonist_event');
    expect(result).toBe('Sterling_cross regards you coolly.');
  });

  it('returns crowd text for campaign_speech', () => {
    const result = getStaticFallback('grace', 'campaign_speech');
    expect(result).toBe('Grace addresses the crowd.');
  });

  it('returns endorsement text', () => {
    const result = getStaticFallback('grace', 'endorsement');
    expect(result).toBe('Grace speaks on your behalf.');
  });
});

// ---------------------------------------------------------------------------
// createLLMService
// ---------------------------------------------------------------------------

describe('createLLMService', () => {
  let mockChatFn: ReturnType<typeof vi.fn> & ChatCompletionFn;

  beforeEach(() => {
    vi.useRealTimers();
    mockChatFn = vi.fn().mockResolvedValue('Hello, I appreciate your support.');
  });

  it('returns a response when enabled and API succeeds', async () => {
    const service = createLLMService(makeConfig(), mockChatFn);
    const result = await service.generateResponse(makeContext(), makeCharacterData());

    expect(result.content).toBe('Hello, I appreciate your support.');
    expect(result.cached).toBe(false);
    expect(result.fallback).toBe(false);
    expect(mockChatFn).toHaveBeenCalledOnce();
  });

  it('returns cached response on cache hit without calling chatFn again', async () => {
    const service = createLLMService(makeConfig(), mockChatFn);
    const context = makeContext();
    const charData = makeCharacterData();

    await service.generateResponse(context, charData);
    mockChatFn.mockClear();

    const result = await service.generateResponse(context, charData);
    expect(result.content).toBe('Hello, I appreciate your support.');
    expect(result.cached).toBe(true);
    expect(result.fallback).toBe(false);
    expect(mockChatFn).not.toHaveBeenCalled();
  });

  it('returns fallback when disabled', async () => {
    const service = createLLMService(makeConfig({ enabled: false }), mockChatFn);
    const result = await service.generateResponse(makeContext(), makeCharacterData());

    expect(result.fallback).toBe(true);
    expect(result.content).toContain('nods approvingly');
    expect(mockChatFn).not.toHaveBeenCalled();
  });

  it('returns fallback when rate limited', async () => {
    const service = createLLMService(makeConfig(), mockChatFn);

    // Exhaust the per-minute rate limit (default 10)
    for (let i = 0; i < 10; i++) {
      const ctx = makeContext({
        gameContext: { ...makeContext().gameContext, turn: i },
      });
      await service.generateResponse(ctx, makeCharacterData());
    }

    // Next call should be rate limited
    const ctx = makeContext({
      gameContext: { ...makeContext().gameContext, turn: 99 },
    });
    const result = await service.generateResponse(ctx, makeCharacterData());
    expect(result.fallback).toBe(true);
  });

  it('returns fallback on API error', async () => {
    mockChatFn.mockRejectedValue(new Error('API error'));
    const service = createLLMService(makeConfig(), mockChatFn);
    const result = await service.generateResponse(makeContext(), makeCharacterData());

    expect(result.fallback).toBe(true);
    expect(result.content).toContain('nods approvingly');
  });

  it('returns fallback on timeout', async () => {
    vi.useFakeTimers();
    // chatFn that never resolves
    const slowChatFn = vi.fn().mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => resolve('too late'), 20_000);
      }),
    ) as ReturnType<typeof vi.fn> & ChatCompletionFn;

    const service = createLLMService(makeConfig(), slowChatFn);
    const responsePromise = service.generateResponse(makeContext(), makeCharacterData());

    // Advance past the 15-second timeout
    vi.advanceTimersByTime(16000);

    const result = await responsePromise;
    expect(result.fallback).toBe(true);
    expect(result.content).toContain('nods approvingly');
    vi.useRealTimers();
  });

  it('isEnabled returns config enabled state', () => {
    const enabledService = createLLMService(makeConfig({ enabled: true }), mockChatFn);
    expect(enabledService.isEnabled()).toBe(true);

    const disabledService = createLLMService(makeConfig({ enabled: false }), mockChatFn);
    expect(disabledService.isEnabled()).toBe(false);
  });

  it('getUsage tracks session calls', async () => {
    const service = createLLMService(makeConfig(), mockChatFn);
    expect(service.getUsage().sessionCalls).toBe(0);

    await service.generateResponse(makeContext(), makeCharacterData());
    expect(service.getUsage().sessionCalls).toBe(1);
  });

  it('getUsage reports max calls', () => {
    const service = createLLMService(makeConfig(), mockChatFn);
    expect(service.getUsage().maxCalls).toBe(100);
  });

  it('clearCache empties the cache', async () => {
    const service = createLLMService(makeConfig(), mockChatFn);
    const context = makeContext();
    const charData = makeCharacterData();

    await service.generateResponse(context, charData);
    service.clearCache();
    mockChatFn.mockClear();

    const result = await service.generateResponse(context, charData);
    expect(result.cached).toBe(false);
    expect(mockChatFn).toHaveBeenCalledOnce();
  });

  it('passes correct parameters to chatFn', async () => {
    const config = makeConfig({ model: 'my-model', maxOutputTokens: 128, temperature: 0.5 });
    const service = createLLMService(config, mockChatFn);
    await service.generateResponse(makeContext(), makeCharacterData());

    expect(mockChatFn).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'my-model',
        maxTokens: 128,
        temperature: 0.5,
      }),
    );
  });
});
