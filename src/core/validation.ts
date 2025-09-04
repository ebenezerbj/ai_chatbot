import { z } from 'zod';

export const ChatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(2000)
});

export interface ChatRequest {
  sessionId: string;
  message: string;
}

export const NearestBranchSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  plusCode: z.string().trim().min(3).max(32).optional()
}).refine((o: { lat?: number; lng?: number; plusCode?: string }) => Boolean((o.lat !== undefined && o.lng !== undefined) || o.plusCode), {
  message: 'Provide lat/lng or plusCode'
});

export interface NearestBranchRequest { lat?: number; lng?: number; plusCode?: string }
