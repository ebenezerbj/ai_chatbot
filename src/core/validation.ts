import { z } from 'zod';

export const ChatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(2000)
});

export interface ChatRequest {
  sessionId: string;
  message: string;
}
