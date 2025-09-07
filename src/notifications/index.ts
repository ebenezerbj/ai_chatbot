import nodemailer from 'nodemailer';

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
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  } as any).catch(() => {});
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
  // Prefer SMSOnlineGH if configured
  const smsGhKey = process.env.SMSONLINEGH_KEY || '';
  const smsGhSender = process.env.SMSONLINEGH_SENDER || '';
  if (smsGhKey && smsGhSender) {
    const num = toSmsOnlineGhNumber(toRaw);
    if (!num) return;
    await sendSmsOnlineGhBulk([num], message).catch(() => {});
    return;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID || '';
  const token = process.env.TWILIO_AUTH_TOKEN || '';
  const from = process.env.TWILIO_FROM || '';
  if (!sid || !token || !from) return;
  // Lazy import to avoid load if unused
  const twilio = (await import('twilio')).default as any;
  const client = twilio(sid, token);
  const to = normalizeGhPhone(toRaw);
  if (!to) return;
  await client.messages.create({ to, from, body: message }).catch(() => {});
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
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `key ${key}`
    },
    body: JSON.stringify(body)
  } as any);
  if (!resp.ok) return false;
  try {
    const data = await resp.json();
    // Expect handshake.id === 0 and label === 'HSHK_OK'
    return data?.handshake?.id === 0;
  } catch {
    return true; // assume success if cannot parse
  }
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
  const smsTo = process.env.ESCALATION_SMS_TO || '';
  if (smsTo) {
    const numbers: string[] = smsTo.split(',').map((s: string) => s.trim()).filter(Boolean) as string[];
    // Prefer bulk via SMSOnlineGH when available
    if ((process.env.SMSONLINEGH_KEY || '') && (process.env.SMSONLINEGH_SENDER || '')) {
      await sendSmsOnlineGhBulk(numbers, `Chatbot escalation suggested. Session ${opts.sessionId}.`).catch(() => {});
    } else {
      await Promise.all(numbers.map((n: string) => sendSMS(n, `Chatbot escalation suggested. Session ${opts.sessionId}.`)));
    }
  }
}

export async function notifyHandover(opts: { ticketId: string; sessionId: string; name?: string; phone?: string; message?: string }): Promise<void> {
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
  const smsTo = process.env.HANDOVER_SMS_TO || '';
  if (smsTo) {
    const numbers: string[] = smsTo.split(',').map((s: string) => s.trim()).filter(Boolean) as string[];
    const preview = (opts.message || '').slice(0, 120).replace(/\s+/g, ' ');
    const text = `Handover ${opts.ticketId} from ${opts.name || 'N/A'} ${opts.phone || ''}. Msg: ${preview}`;
    if ((process.env.SMSONLINEGH_KEY || '') && (process.env.SMSONLINEGH_SENDER || '')) {
      await sendSmsOnlineGhBulk(numbers, text).catch(() => {});
    } else {
      await Promise.all(numbers.map((n: string) => sendSMS(n, text)));
    }
  }
}
