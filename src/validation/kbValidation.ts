import { z } from 'zod';

export const KBCreateSchema = z.object({
  product: z.string().min(1),
  questionPatterns: z.array(z.string()).min(1),
  answer: z.string().min(1),
  tags: z.array(z.string()).optional()
});

export const KBUpdateSchema = KBCreateSchema.partial();
