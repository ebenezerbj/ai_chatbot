// Core data shapes and contracts
import { z } from 'zod';

export const MessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  timestamp: z.number().int().positive()
});

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export const SessionSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.number().int().positive(),
  persona: z.string().default('financial_care_pro'),
  history: z.array(MessageSchema).default([]),
  // Lightweight session metadata for UX/handover
  unresolvedStreak: z.number().int().nonnegative().default(0)
});

export interface Session {
  id: string;
  createdAt: number;
  persona: string;
  history: Message[];
  unresolvedStreak: number;
}

export type LLMResponse = {
  text: string;
  citations?: Array<{ title?: string; url?: string }>;
  safety?: {
    flagged: boolean;
    categories?: string[];
    reason?: string;
  };
};

export interface LLMProvider {
  name: string;
  generate(opts: {
    systemPrompt: string;
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse>;
}

export class ChatbotError extends Error {
  code: string;
  details?: unknown;
  constructor(message: string, code = 'UNKNOWN', details?: unknown) {
    super(message);
    this.name = 'ChatbotError';
    this.code = code;
    this.details = details;
  }
}
