import OpenAI from 'openai';
import { LLMProvider, LLMResponse } from '../core/types';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: any;
  private model: string;

  constructor(apiKey: string | undefined, model = process.env.OPENAI_MODEL || 'gpt-4o-mini') {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generate(opts: {
    systemPrompt: string;
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse> {
    const { systemPrompt, messages, temperature = 0.2, maxTokens = 500 } = opts;

  const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ];

    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: chatMessages,
      temperature,
      max_tokens: maxTokens
    });

    const text = res.choices[0]?.message?.content ?? '';

    return { text };
  }
}
