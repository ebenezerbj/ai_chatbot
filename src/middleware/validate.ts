import type { Request as ExRequest, Response as ExResponse, NextFunction as ExNextFunction } from 'express';

// schema is a zod schema-like object; use any to avoid typing issues
export const validateBody = (schema: any) => (req: ExRequest, res: ExResponse, next: ExNextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', details: result.error.format() });
  }
  // assign parsed value (bypass readonly) for downstream handlers
  (req as any).body = result.data;
  next();
};
