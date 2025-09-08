import nodemailer from 'nodemailer';
import { BRANCHES, Branch } from '../geo/branches';
import * as https from 'https';
import * as http from 'http';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type EscalationPayload = {
  kind: 'escalation';
  sessionId: string;
  lastUserMessage?: string;
  at: string;
};

type HandoverPayload = {
  kind: 'handover';
  ticketId: string;
  sessionId: string;
  name?: string;
  phone?: string;
  message?: string;
  at: string;
};

function normalizeGhPhone(msisdn: string): string {
  const digits = (msisdn || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('233') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith('0')) return `+233${digits.slice(1)}`;
  if (digits.startsWith('233') && digits.length > 3) return `+${digits}`;
  if (msisdn.startsWith('+')) return msisdn;
  return msisdn;
}

// Convert to SMSOnlineGH expected formats: either '233XXXXXXXXX' or '0XXXXXXXXX'
function toSmsOnlineGhNumber(msisdn: string): string | null {
  const clean = (msisdn || '').trim();
  if (!clean) return null;
  const digits = clean.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('233') && digits.length === 12) return digits; // international without plus
  if (digits.length === 10 && digits.startsWith('0')) return digits;   // local
  if (clean.startsWith('+233') && digits.length === 12) return digits; // remove plus
  if (digits.startsWith('233') && digits.length > 3) return digits;    // fallback
  return null;
}

export async function sendWebhook(url: string, payload: any): Promise<void> {
  if (!url) return;
  try {
    const resp = await httpPostJson(url, payload);
    if (!resp.ok) {
      console.warn('[notify] webhook post failed', { url, status: resp.status });
    }
  } catch (e) {
    console.warn('[notify] webhook post error', { url, err: (e as any)?.message || e });
  }
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || user || '';
  if (!to || !host || !user || !pass || !from) return;
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transporter.sendMail({ from, to, subject, html }).catch(() => {});
}

export async function sendSMS(toRaw: string, message: string): Promise<void> {
  // SMSOnlineGH-only
  const smsGhKey = process.env.SMSONLINEGH_KEY || '';
  const smsGhSender = process.env.SMSONLINEGH_SENDER || '';
  if (!smsGhKey || !smsGhSender) {
    console.warn('[notify] SMS suppressed: SMSOnlineGH not configured');
    return;
  }
  const num = toSmsOnlineGhNumber(toRaw);
  if (!num) return;
  await sendSmsOnlineGhBulk([num], message).catch(() => {});
}

export async function sendSmsOnlineGhBulk(destinations: string[], text: string): Promise<boolean> {
  const key = process.env.SMSONLINEGH_KEY || '';
  const sender = process.env.SMSONLINEGH_SENDER || '';
  const apiUrl = process.env.SMSONLINEGH_URL || 'https://api.smsonlinegh.com/v5/message/sms/send';
  if (!key || !sender || !destinations?.length) return false;
  const cleaned = destinations
    .map(d => toSmsOnlineGhNumber(d))
    .filter((n): n is string => !!n);
  if (!cleaned.length) return false;
  const body = {
    text,
    type: 0,
    sender,
    destinations: cleaned
  } as any;
  console.log('[notify] SMSOnlineGH bulk send attempt', { count: cleaned.length, sender });
  const resp = await httpPostJson(apiUrl, body, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `key ${key}`
    }
  });
  if (!resp.ok) {
    console.warn('[notify] SMSOnlineGH post failed', { status: resp.status, text: resp.text });
    return false;
  }
  const data: any = resp.json;
  const success = data?.handshake?.id === 0 || data === undefined; // treat missing JSON as success
  console.log('[notify] SMSOnlineGH response', { success, handshake: data?.handshake });
  return success;
}

// Collect branch phone numbers (may contain spaces or +233); filter falsy
function getBranchPhones(): string[] {
  return BRANCHES.map(b => (b.phone || '').trim()).filter(Boolean);
}

// Normalize for deduplication to a canonical "233XXXXXXXXX" form when possible
function canonicalizeForDedup(msisdn: string): string | null {
  const raw = (msisdn || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  // If starts with 233 and length >= 12, take first 12
  if (digits.startsWith('233')) {
    const core = digits.slice(0, 12);
    return core.length === 12 ? core : null;
  }
  // If local 0XXXXXXXXX, convert to 233XXXXXXXXX
  if (digits.length === 10 && digits.startsWith('0')) {
    return '233' + digits.slice(1);
  }
  // If looks like international without plus but different spacing
  if (digits.length === 12) return digits;
  return null;
}

// Merge recipients from an env var (comma-separated), optional EXTRA_SMS_RECIPIENTS, and all branch phones; dedupe
function getMergedRecipients(envVar: string): string[] {
  const fromEnv = (process.env[envVar as keyof NodeJS.ProcessEnv] || '') as string;
  const extra = process.env.EXTRA_SMS_RECIPIENTS || '';
  const split = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
  const candidates = [
    ...split(fromEnv),
    ...split(extra),
    ...getBranchPhones()
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    const canon = canonicalizeForDedup(c);
    if (!canon) continue;
    if (seen.has(canon)) continue;
    seen.add(canon);
    // Prefer passing along in 233XXXXXXXXX format; SMSOnlineGH accepts this
    out.push(canon);
  }
  return out;
}

// Get recipients for a specific branch (includes branch phone + global recipients)
function getBranchSpecificRecipients(envVar: string, targetBranch: Branch): string[] {
  const fromEnv = (process.env[envVar as keyof NodeJS.ProcessEnv] || '') as string;
  const extra = process.env.EXTRA_SMS_RECIPIENTS || '';
  const split = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
  
  const candidates = [
    ...split(fromEnv),
    ...split(extra)
  ];
  
  // Add the specific branch phone if it exists
  if (targetBranch.phone) {
    candidates.push(targetBranch.phone);
  }
  
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    const canon = canonicalizeForDedup(c);
    if (!canon) continue;
    if (seen.has(canon)) continue;
    seen.add(canon);
    out.push(canon);
  }
  return out;
}

export async function notifyEscalation(opts: { sessionId: string; lastUserMessage?: string }): Promise<void> {
  const enable = String(process.env.NOTIFY_ON_ESCALATION || '').toLowerCase() === 'true';
  if (!enable) return;
  const payload: EscalationPayload = { kind: 'escalation', sessionId: opts.sessionId, lastUserMessage: opts.lastUserMessage, at: new Date().toISOString() };
  await sendWebhook(process.env.ESCALATION_WEBHOOK_URL || '', payload);
  const emailTo = process.env.ESCALATION_EMAIL_TO || '';
  if (emailTo) {
    const html = `
      <p>Escalation suggested</p>
      <ul>
        <li><b>Session:</b> ${opts.sessionId}</li>
        <li><b>Last user message:</b> ${opts.lastUserMessage || '(n/a)'}</li>
      </ul>
    `;
    await sendEmail(emailTo, `[Chatbot] Escalation suggested for session ${opts.sessionId}`, html);
  }
  const numbers: string[] = getMergedRecipients('ESCALATION_SMS_TO');
  console.log('[notify] escalation: sms recipients', { count: numbers.length });
  if (numbers.length) {
    const text = `Chatbot escalation suggested. Session ${opts.sessionId}.`;
    if ((process.env.SMSONLINEGH_KEY || '') && (process.env.SMSONLINEGH_SENDER || '')) {
      await sendSmsOnlineGhBulk(numbers, text).catch(() => {});
    } else {
      console.warn('[notify] escalation sms suppressed: SMSOnlineGH not configured');
    }
  }
}

export async function notifyHandover(opts: { 
  ticketId: string; 
  sessionId: string; 
  name?: string; 
  phone?: string; 
  message?: string;
  targetBranch?: any;
}): Promise<void> {
  const payload: HandoverPayload = { kind: 'handover', ticketId: opts.ticketId, sessionId: opts.sessionId, name: opts.name, phone: opts.phone, message: opts.message, at: new Date().toISOString() };
  await sendWebhook(process.env.HANDOVER_WEBHOOK_URL || '', payload);
  // Ticketing webhook (generic)
  await sendWebhook(process.env.TICKETING_WEBHOOK_URL || '', { ticketId: opts.ticketId, sessionId: opts.sessionId, name: opts.name, phone: opts.phone, message: opts.message });
  const emailTo = process.env.HANDOVER_EMAIL_TO || '';
  if (emailTo) {
    const html = `
      <p>New human handover request</p>
      <ul>
        <li><b>Ticket:</b> ${opts.ticketId}</li>
        <li><b>Session:</b> ${opts.sessionId}</li>
        <li><b>Name:</b> ${opts.name || '(n/a)'}</li>
        <li><b>Phone:</b> ${opts.phone || '(n/a)'}</li>
        <li><b>Message:</b> ${opts.message || '(n/a)'}</li>
      </ul>
    `;
    await sendEmail(emailTo, `[Chatbot] Handover request ${opts.ticketId}`, html);
  }
  const numbers: string[] = opts.targetBranch 
    ? getBranchSpecificRecipients('HANDOVER_SMS_TO', opts.targetBranch)
    : getMergedRecipients('HANDOVER_SMS_TO');
    
  const routingInfo = opts.targetBranch 
    ? `${opts.targetBranch.name} branch (${opts.targetBranch.phone || 'no phone'})`
    : 'global routing';
    
  console.log(`[notify] handover: ${routingInfo}, sms recipients`, { count: numbers.length });
  
  if (numbers.length) {
    const preview = (opts.message || '').slice(0, 120).replace(/\s+/g, ' ');
    const branchInfo = opts.targetBranch ? ` [${opts.targetBranch.name}]` : '';
    const text = `Handover${branchInfo} ${opts.ticketId} from ${opts.name || 'N/A'} ${opts.phone || ''}. Msg: ${preview}`;
    if ((process.env.SMSONLINEGH_KEY || '') && (process.env.SMSONLINEGH_SENDER || '')) {
      const ok = await sendSmsOnlineGhBulk(numbers, text).catch((e) => {
        console.warn('[notify] handover sms bulk error', { err: (e as any)?.message || e });
        return false;
      });
      if (!ok) console.warn('[notify] handover sms bulk not sent');
    } else {
      console.warn('[notify] handover sms suppressed: SMSOnlineGH not configured');
    }
  }
}

// --- Internal: HTTP(S) helper with custom CA support ---
type PostOpts = { headers?: Record<string, string>; timeoutMs?: number };

// Lightweight helpers to introspect recipient configuration without exposing numbers
export function getHandoverRecipientCount(): number {
  try {
    return getMergedRecipients('HANDOVER_SMS_TO').length;
  } catch {
    return 0;
  }
}

export function getEscalationRecipientCount(): number {
  try {
    return getMergedRecipients('ESCALATION_SMS_TO').length;
  } catch {
    return 0;
  }
}

export function getSmsProvider(): 'smsonlinegh' | 'none' {
  const hasGh = !!(process.env.SMSONLINEGH_KEY && process.env.SMSONLINEGH_SENDER);
  if (hasGh) return 'smsonlinegh';
  return 'none';
}

export function previewHandoverRecipients(): string[] {
  try {
    return getMergedRecipients('HANDOVER_SMS_TO');
  } catch {
    return [];
  }
}

function getCustomCA(): string | undefined {
  try {
    const caFile = (process.env.CACERT_FILE || process.env.NODE_EXTRA_CA_CERTS || join(process.cwd(), 'cacert.pem')) as string;
    if (caFile && existsSync(caFile)) {
      return readFileSync(caFile, 'utf-8');
    }
  } catch {}
  return undefined;
}

async function httpPostJson(urlStr: string, payload: any, opts: PostOpts = {}): Promise<{ ok: boolean; status: number; text?: string; json?: any }> {
  const u = new URL(urlStr);
  const data = Buffer.from(JSON.stringify(payload));
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Content-Length': String(data.length),
    ...opts.headers,
  };
  const ca = getCustomCA();
  const isHttps = u.protocol === 'https:';
  const requestFn = isHttps ? https.request : http.request;
  const agent = isHttps ? new https.Agent({ ca, rejectUnauthorized: true }) : undefined;

  const reqOptions: https.RequestOptions = {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port ? Number(u.port) : (isHttps ? 443 : 80),
    path: `${u.pathname}${u.search}`,
    method: 'POST',
    headers,
    agent,
    timeout: opts.timeoutMs ?? 15000,
  };

  return await new Promise((resolve) => {
    const req = requestFn(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf-8');
        let json: any;
        try { json = text ? JSON.parse(text) : undefined; } catch {}
        resolve({ ok: res.statusCode! >= 200 && res.statusCode! < 300, status: res.statusCode || 0, text, json });
      });
    });
    req.on('error', (e) => {
      console.warn('[notify] httpPostJson request error', { host: reqOptions.hostname, path: reqOptions.path, err: (e as any)?.message || e });
      resolve({ ok: false, status: 0 });
    });
    req.write(data);
    req.end();
  });
}
