import type { ChatCompletionFn } from './llm-service';

export function createGroqChatFn(): ChatCompletionFn {
  return async ({ model, system, messages, temperature }) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          ...messages,
        ],
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Chat API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.content ?? '';
  };
}
