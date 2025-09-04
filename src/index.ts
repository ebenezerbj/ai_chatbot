import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { OpenAIProvider } from './providers/openaiProvider';
import { MockProvider } from './providers/mockProvider';
import { ChatService } from './services/chatService';
import { loadKBFromFile } from './knowledge/kb';
import { existsSync } from 'fs';
import { ChatRequestSchema, NearestBranchSchema } from './core/validation';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
app.use(express.json());
app.use(cors({ origin: '*'}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
      "media-src": ["'self'", "data:"],
      "img-src": ["'self'", "data:", "blob:"],
    },
  },
}));
app.use(pinoHttp({
  logger,
  genReqId: (req: any) => (req.headers['x-request-id'] as string) || undefined,
  customLogLevel: (_req: any, res: any, err: any) => (err || res.statusCode >= 500 ? 'error' : 'info'),
  customSuccessMessage: (req: any, res: any) => `${req.method} ${req.url} ${res.statusCode}`
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60
});
app.use(limiter);

// Choose provider
let provider;
if (process.env.OPENAI_API_KEY) {
  provider = new OpenAIProvider(process.env.OPENAI_API_KEY);
  logger.info('Using OpenAI provider');
} else {
  provider = new MockProvider();
  logger.warn('OPENAI_API_KEY not set, using Mock provider');
}

const chat = new ChatService(provider);

// Optional: load KB from JSON at startup if provided
(async () => {
  try {
    const kbFile = process.env.KB_FILE || 'data/kb.json';
    if (existsSync(kbFile)) {
      await loadKBFromFile(kbFile);
      logger.info({ kbFile }, 'Loaded KB from file');
    }
  } catch (e: any) {
    logger.warn({ err: e }, 'KB auto-load skipped');
  }
})();

app.get('/api/health', (_req: Request, res: any) => {
  res.json({ status: 'ok', provider: provider.name });
});

// Silence favicon 404s; if public/favicon.ico exists, express.static will serve it instead
app.get('/favicon.ico', (_req: Request, res: any) => {
  res.status(204).end();
});

app.post('/api/session', (req: Request, res: any) => {
  const s = chat.createSession();
  res.json({ sessionId: s.id });
});

app.post('/api/chat', async (req: Request, res: any) => {
  try {
    const parsed = ChatRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    const { sessionId, message } = parsed.data;
  // Basic structured logging
  try { (req as any).log?.info({ sessionId, msgLen: message.length }, 'chat:request'); } catch {}
    const result = await chat.sendMessage(sessionId, message);
  try { (req as any).log?.info({ sessionId, replyLen: result.reply.length }, 'chat:response'); } catch {}
  res.json({ reply: result.reply });
  } catch (err: any) {
    logger.error({ err }, 'chat error');
    res.status(500).json({ error: 'Internal error' });
  }
});

// Nearest branch: accepts { lat, lng } or { plusCode }
app.post('/api/nearest-branch', (req: Request, res: any) => {
  try {
    const parsed = NearestBranchSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
    const { lat, lng, plusCode } = parsed.data as any;
    if (lat !== undefined && lng !== undefined) {
      return res.json({ text: `Location received (lat: ${lat.toFixed(5)}, lng: ${lng.toFixed(5)}). I'll locate the closest branch and provide directions soon.` });
    }
    if (plusCode) {
      return res.json({ text: `Plus code received: ${plusCode}. I'll locate the closest branch and provide directions soon.` });
    }
    return res.json({ text: 'Location received. I\'ll locate the closest branch and provide directions soon.' });
  } catch (e) {
    (req as any).log?.error({ err: e }, 'nearest-branch error');
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Metrics endpoint
app.get('/api/metrics', (_req: Request, res: any) => {
  res.json({
    ...chat.getMetrics()
  });
});

// Admin: reload KB from JSON file
// Body: { filePath: string }
// Security: simple bearer token via ADMIN_TOKEN env
app.post('/api/admin/reload-kb', async (req: Request, res: any) => {
  const reqAny = req as any;
  const auth = (reqAny.headers?.authorization as string) || '';
  const token = (process.env.ADMIN_TOKEN as string) || '';
  if (!token || !auth.startsWith('Bearer ') || auth.slice(7) !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const filePath = reqAny.body?.filePath as string | undefined;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  try {
    await loadKBFromFile(filePath);
    res.json({ ok: true });
  } catch (e: any) {
    (req as any).log?.error({ err: e }, 'reload-kb failed');
    res.status(500).json({ error: 'Failed to reload KB' });
  }
});

app.use(express.static('public'));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  logger.info(`Server listening on http://localhost:${port}`);
});
