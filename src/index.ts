import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import { notifyEscalation, notifyHandover, getHandoverRecipientCount, getSmsProvider, previewHandoverRecipients } from './notifications';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { OpenAIProvider } from './providers/openaiProvider';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { MockProvider } from './providers/mockProvider';
import { ChatService } from './services/chatService';
import { loadKBFromFile } from './knowledge/kb';
import { existsSync, readFileSync } from 'fs';
import { execFile } from 'child_process';
import { mkdtemp, readFile as fsReadFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import * as https from 'https';
import { ChatRequestSchema, NearestBranchSchema } from './core/validation';
import { resolvePlusCode, findNearestBranch, mapsUrlFromLatLng } from './geo/branches';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Optional: apply custom CA for outbound HTTPS (e.g., SMS provider behind corporate proxy)
// Looks for CACERT_FILE, NODE_EXTRA_CA_CERTS, or ./cacert.pem in project root
try {
  const caFile = (process.env.CACERT_FILE || process.env.NODE_EXTRA_CA_CERTS || join(process.cwd(), 'cacert.pem')) as string;
  if (caFile && existsSync(caFile)) {
    const ca = readFileSync(caFile, 'utf-8');
    // Apply to undici (global fetch in Node 18+)
    (async () => {
      try {
        const { setGlobalDispatcher, Agent } = await import('undici');
        // Undici Agent accepts TLS options directly under connect
        // See: https://undici.nodejs.org/#/docs/api/Agent?id=parameter-connect
        setGlobalDispatcher(new Agent({ connect: { ca } as any }));
        logger.info({ caFile }, 'Applied custom CA to fetch (undici)');
      } catch (e: any) {
        logger.warn({ err: e?.message || e }, 'Failed to apply custom CA to undici');
      }
    })();
    // Apply to Node https global agent (used by some SDKs like Twilio, nodemailer)
    try {
      (https as any).globalAgent.options.ca = ca;
      logger.info({ caFile }, 'Applied custom CA to https.globalAgent');
    } catch (e: any) {
      logger.warn({ err: e?.message || e }, 'Failed to apply custom CA to https.globalAgent');
    }
  }
} catch (e: any) {
  logger.warn({ err: e?.message || e }, 'Custom CA setup skipped');
}

const app = express();
app.use(express.json());
app.use(cors({ origin: '*'}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
  ...helmet.contentSecurityPolicy.getDefaultDirectives(),
  "script-src": ["'self'", "'unsafe-inline'", "blob:"],
  "script-src-elem": ["'self'", "'unsafe-inline'", "blob:"],
  // Allow fetch/XHR/websocket destinations for both localhost and production
  // Include Render domains, localhost variants, and common third-party services
  "connect-src": [
    "'self'", 
    "http://localhost:3000", 
    "http://localhost:*", 
    "https://*.onrender.com",
    "wss://*.onrender.com",
    "https://www.google-analytics.com", 
    "https://*.reasonlabsapi.com", 
    "ws://localhost:*", 
    "wss://localhost:*"
  ],
  // Allow web workers and blob-based scripts if used by TTS/UI
  "worker-src": ["'self'", "blob:"],
  "media-src": ["'self'", "data:", "blob:"],
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

// Per-endpoint limiter for handover submissions
const handoverLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Number(process.env.HANDOVER_RATE_MAX || 5),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: any, res: any) => res.status(429).json({ error: 'Too many handover requests. Please try again later.' })
});

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
// Optional TTS client (OpenAI)
const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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

// Lightweight diagnostics endpoint to test notifications
// If ADMIN_TOKEN is set, require header x-admin-token to match
app.all('/api/notify-test', async (req: any, res: any) => {
  try {
    const adminToken = process.env.ADMIN_TOKEN || '';
    if (adminToken) {
      const token = req.headers['x-admin-token'];
      if (!token || token !== adminToken) {
        return res.status(401).json({ error: 'unauthorized' });
      }
    }

    const type = (req.method === 'POST' ? req.body?.type : req.query?.type) || 'handover';
    if (String(type).toLowerCase() === 'escalation') {
      const sessionId = (req.method === 'POST' ? req.body?.sessionId : req.query?.sessionId) || `test-session-${Date.now()}`;
      const lastUserMessage = (req.method === 'POST' ? req.body?.message : req.query?.message) || 'Testing escalation notification';
      await notifyEscalation({ sessionId, lastUserMessage });
      return res.json({ ok: true, kind: 'escalation', sessionId });
    } else {
      const sessionId = (req.method === 'POST' ? req.body?.sessionId : req.query?.sessionId) || `test-session-${Date.now()}`;
      const name = (req.method === 'POST' ? req.body?.name : req.query?.name) || 'Test User';
      const phone = (req.method === 'POST' ? req.body?.phone : req.query?.phone) || '0240000000';
      const message = (req.method === 'POST' ? req.body?.message : req.query?.message) || 'Testing handover notification';
      const ticketId = uuidv4();
      await notifyHandover({ ticketId, sessionId, name, phone, message });
      return res.json({ ok: true, kind: 'handover', ticketId, sessionId });
    }
  } catch (e: any) {
    (req as any).log?.error({ err: e }, 'notify-test error');
    return res.status(500).json({ error: 'notify-test error' });
  }
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
  try { (req as any).log?.info({ sessionId, replyLen: result.reply.length, suggestHandover: !!result.suggestHandover }, 'chat:response'); } catch {}
  res.json({ reply: result.reply, suggestHandover: !!result.suggestHandover });
  // Fire-and-forget escalation notification if enabled
  try {
    if (result.suggestHandover) {
      const lastUser = chat.getSession(sessionId)?.history.filter(m => m.role === 'user').slice(-1)[0]?.content;
      notifyEscalation({ sessionId, lastUserMessage: lastUser });
    }
  } catch {}
  } catch (err: any) {
    logger.error({ err }, 'chat error');
    res.status(500).json({ error: 'Internal error' });
  }
});

// Nearest branch: accepts { lat, lng } or { plusCode }
// Note: Frontend map-pin (plus code entry) is hidden, but backend plus-code support is intentionally kept
// for future use and programmatic clients. When provided, we resolve known GhanaPost Plus Codes to lat/lng.
app.post('/api/nearest-branch', (req: Request, res: any) => {
  try {
    const parsed = NearestBranchSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
    let { lat, lng, plusCode } = parsed.data as any;

    // If we only have a plus code, try to resolve to coordinates
    if ((lat === undefined || lng === undefined) && plusCode) {
      const resolved = resolvePlusCode(plusCode);
      if (resolved) {
        lat = resolved.lat;
        lng = resolved.lng;
      }
    }

    if (lat !== undefined && lng !== undefined) {
      const { branch, distanceKm } = findNearestBranch(lat, lng);
      const km = Math.max(0, distanceKm);
      const url = mapsUrlFromLatLng(branch.lat, branch.lng);
      const approx = km < 0.05 ? '' : ` (~${km.toFixed(1)} km)`;
      const phone = branch.phone ? ` Phone: ${branch.phone}.` : '';
      const text = `Closest branch: ${branch.name}${approx}. Directions: ${url}.${phone}`;
      return res.json({ text });
    }
    if (plusCode) {
      // Unknown plus code
      return res.json({ text: `I couldn't recognize that plus code yet. Please share your phone location or try a nearby landmark.` });
    }
    return res.json({ text: 'Please share your phone location or a GhanaPost plus code (e.g., QQJG+P27) to find the nearest branch.' });
  } catch (e) {
    (req as any).log?.error({ err: e }, 'nearest-branch error');
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Text-to-Speech endpoint
// Body: { text: string, lang?: string, voice?: string }
// Returns: audio/mpeg (MP3)
app.post('/api/tts', async (req: Request, res: any) => {
  try {
    const text = String((req as any).body?.text || '').trim();
    const lang = String((req as any).body?.lang || '').trim();
    const reqVoice = String((req as any).body?.voice || '').trim();
    if (!text) return res.status(400).json({ error: 'text required' });
    if (text.length > 4000) return res.status(413).json({ error: 'text too long' });

    const AZURE_KEY = process.env.AZURE_SPEECH_KEY || '';
    const AZURE_REGION = process.env.AZURE_SPEECH_REGION || '';
  const AZURE_VOICE = reqVoice || process.env.AZURE_SPEECH_VOICE || '';
  const AZURE_ENDPOINT = process.env.AZURE_SPEECH_ENDPOINT || '';

    // Prefer Azure if configured
    if (AZURE_KEY && (AZURE_REGION || AZURE_ENDPOINT)) {
      const endpoint = AZURE_ENDPOINT || `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
      const voiceName = AZURE_VOICE || 'en-GH-AkuaNeural'; // configurable; ensure to set a valid Twi/Akan voice if available
      const ssml = `<?xml version="1.0" encoding="utf-8"?>\n<speak version="1.0" xml:lang="en-US"><voice name="${voiceName}">${escapeForSSML(text)}</voice></speak>`;
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'ai-chatbot'
        },
        body: ssml
      } as any);
      if (!r.ok) {
        (req as any).log?.warn({ status: r.status }, 'azure tts http error');
      } else {
        const arrayBuffer = await r.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', String(buf.length));
        res.setHeader('Cache-Control', 'no-store');
        return res.send(buf);
      }
      // If Azure failed, fall back to OpenAI if available
    }

    if (openaiClient) {
      const voice = 'alloy';
      const result = await openaiClient.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice,
        input: text,
        format: 'mp3'
      } as any);
      const arrayBuffer = await (result as any).arrayBuffer?.() ?? await (result as any).data?.arrayBuffer?.();
      if (!arrayBuffer) return res.status(500).json({ error: 'TTS failed' });
      const buf = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', String(buf.length));
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buf);
    }

    // Try local keyless TTS fallback (espeak-ng)
    const wav = await tryEspeakTTS(text, lang || undefined);
    if (wav) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', String(wav.length));
      res.setHeader('Cache-Control', 'no-store');
      return res.send(wav);
    }

    return res.status(503).json({ error: 'TTS provider unavailable' });
  } catch (err: any) {
    (req as any).log?.error({ err }, 'tts error');
    return res.status(500).json({ error: 'TTS error' });
  }
});

// Human handover: accept a request to connect with a human agent
// Body: { sessionId: string, name?: string, phone?: string, message?: string }
app.post('/api/handover', handoverLimiter, async (req: Request, res: any) => {
  try {
    const body: any = (req as any).body || {};
    const sessionId = String(body.sessionId || '').trim();
    const name = (body.name ? String(body.name) : '').trim();
    const phone = (body.phone ? String(body.phone) : '').trim();
    const message = (body.message ? String(body.message) : '').trim();
    
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const s = chat.getSession(sessionId);
    if (!s) return res.status(404).json({ error: 'session not found' });

    // Server-side basic phone validation (optional)
    const phoneRaw = (phone || '').replace(/[^\d+]/g, '');
    if (phoneRaw) {
      let ok = false;
      if (phoneRaw.startsWith('+233')) {
        const digits = phoneRaw.replace(/\D/g, '');
        ok = digits.length === 12; // 233 + 9 digits
      } else if (phoneRaw.startsWith('233')) {
        ok = phoneRaw.replace(/\D/g, '').length === 12;
      } else if (phoneRaw.startsWith('0')) {
        const digits = phoneRaw.replace(/\D/g, '');
        ok = digits.length === 10; // 0 + 9 digits
      }
      if (!ok) return res.status(400).json({ error: 'Invalid phone format' });
    }

    const ticketId = uuidv4();
    // Basic structured log; in a real setup, forward to a ticketing system/email/webhook
    (req as any).log?.info({
      ticketId,
      sessionId,
      name,
      phone,
      message,
      recentHistory: s.history.slice(-6)
    }, 'handover:request');

  // Unified notifications (webhook/email/SMS) if configured
  try { 
    await notifyHandover({ ticketId, sessionId, name, phone, message }); 
  } catch (notifyError) {
    console.error('[handover] notification failed:', notifyError);
  }

  // Include diagnostics: count, provider, and a limited preview when admin header present
  const recipientCount = getHandoverRecipientCount();
  const provider = getSmsProvider();
  const isAdmin = ((req as any).headers?.['x-admin-token'] || '') === (process.env.ADMIN_TOKEN || '');
  const preview = isAdmin ? (previewHandoverRecipients().slice(0, 5)) : undefined;
  
  return res.json({ ok: true, ticketId, status: 'queued', recipientCount, provider, preview });
  } catch (err: any) {
    (req as any).log?.error({ err }, 'handover error');
    return res.status(500).json({ error: 'handover error' });
  }
});

function escapeForSSML(s: string): string {
  return s.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[ch]);
}

// Try local keyless TTS with espeak-ng / espeak (WAV output)
async function tryEspeakTTS(text: string, langHint?: string): Promise<Buffer | null> {
  const hint = (langHint || '').toLowerCase();
  // Build a list of likely voices based on hint, with safe fallbacks
  // eSpeak NG Windows builds often lack 'ak' (Akan/Twi), so we include English fallbacks.
  const voiceCandidates: string[] = (() => {
    if (hint === 'twi' || hint.startsWith('ak') || hint.startsWith('tw')) {
      return ['ak', 'twi', 'aka', 'en-gb', 'en'];
    }
    if (hint.startsWith('en')) {
      return ['en-gb', 'en'];
    }
    return ['en-gb', 'en'];
  })();

  // Candidate binaries; include common Windows install paths
  const binCandidates: string[] = ['espeak-ng', 'espeak'];
  if (process.platform === 'win32') {
    binCandidates.unshift(
      'C\\\\Program Files\\\\eSpeak NG\\\\espeak-ng.exe',
      'C:\\Program Files\\eSpeak NG\\espeak-ng.exe',
      'C:\\Program Files (x86)\\eSpeak NG\\espeak-ng.exe',
      'C:\\Program Files\\eSpeak\\command_line\\espeak.exe'
    );
  }

  const tmp = await mkdtemp(join(tmpdir(), 'tts-'));
  const wavPath = join(tmp, 'out.wav');

  for (const bin of binCandidates) {
    for (const voice of voiceCandidates) {
      const args = ['-v', voice, '-s', '175', '-w', wavPath, text];
      try {
        await new Promise<void>((resolve, reject) => {
          execFile(bin, args, { windowsHide: true }, (err) => (err ? reject(err) : resolve()));
        });
        const buf = await fsReadFile(wavPath);
        try { await unlink(wavPath); } catch {}
        return buf;
      } catch (_e) {
        // try next voice or binary
      }
    }
  }
  try { await unlink(wavPath); } catch {}
  return null;
}

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
