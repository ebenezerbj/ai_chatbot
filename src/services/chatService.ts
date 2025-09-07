import { v4 as uuidv4 } from 'uuid';
import { LLMProvider, Message, Session, SessionSchema } from '../core/types';
import { SYSTEM_PERSONA } from '../hci/persona';
import { escalationHint, postProcessAssistant, safetyGuardUserInput } from '../hci/safety';
import { adviceDisclaimer, securityReminder } from '../hci/templates';
import { retrieveKB } from '../knowledge/kb';

export class ChatService {
  private provider: LLMProvider;
  private sessions: Map<string, Session> = new Map();
  private metrics = { totalTurns: 0, lastLatencyMs: 0 };

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  createSession(): Session {
    const session: Session = SessionSchema.parse({
      id: uuidv4(),
      createdAt: Date.now(),
      persona: 'financial_care_pro',
      history: []
    });
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  async sendMessage(sessionId: string, userText: string): Promise<{ reply: string; session: Session; suggestHandover?: boolean }>{
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const guard = safetyGuardUserInput(userText);
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: guard.text,
      timestamp: Date.now()
    };
    session.history.push(userMsg);

  const messages = session.history.map((m: Message) => ({ role: m.role, content: m.content }));

    // Retrieve optional product snippets for grounding
    const snippets = retrieveKB(userText);
    console.log(`[DEBUG] Query: "${userText}", Found ${snippets.length} KB matches:`, snippets.map(s => s.id));
    const kbContext = snippets.length
      ? (
          `\n\nInstitution product info (non-personalized):\n` +
          snippets.map((s, i) => `(${i + 1}) [${s.product}] ${s.answer}`).join('\n') +
          `\n\nIf relevant, cite (1), (2) inline.`
        )
      : '';
    if (kbContext) console.log(`[DEBUG] KB Context: ${kbContext.substring(0, 100)}...`);

  const t0 = Date.now();
  const response = await this.provider.generate({
      systemPrompt: SYSTEM_PERSONA,
      messages: [
        ...messages,
        { role: 'system', content: kbContext }
      ],
      temperature: 0.2,
      maxTokens: 600
    });
  const t1 = Date.now();
  this.metrics.totalTurns += 1;
  this.metrics.lastLatencyMs = t1 - t0;

  const processed = postProcessAssistant(response);

    // Simple unresolved detection: if response is the generic fallback or contains "I couldn't"/"not sure",
    // increment unresolved streak; else reset it. After 2 unresolved turns, suggest handover.
    const genericRe = /I can help with questions about our products, services, branch locations, and hours/i;
    const uncertainRe = /(i\s+(am\s+)?not\s+sure|i\s+couldn'?t|can\'?t\s+help|don'?t\s+have\s+that\s+info)/i;
    const trivialRe = /^(hi|hello|hey|thanks|thank you|ok|okay)$/i;
    // Consider it unresolved if:
    // - Generic fallback text, or
    // - Uncertain language, or
    // - No KB snippets matched for this user input (excluding trivial greetings/thanks)
    const looksUnresolved = (
      genericRe.test(processed.text) ||
      uncertainRe.test(processed.text) ||
      (!trivialRe.test(userText.trim()) && snippets.length === 0)
    );
    console.log(`[DEBUG] Checking unresolved: generic=${genericRe.test(processed.text)}, uncertain=${uncertainRe.test(processed.text)}, noKB=${!trivialRe.test(userText.trim()) && snippets.length === 0}, result=${looksUnresolved}`);
    if (looksUnresolved) {
      session.unresolvedStreak = (session.unresolvedStreak || 0) + 1;
      console.log(`[DEBUG] Unresolved turn detected. Streak now: ${session.unresolvedStreak}`);
    } else {
      session.unresolvedStreak = 0;
      console.log(`[DEBUG] Resolved turn. Streak reset to 0`);
    }
    const suggestHandover = session.unresolvedStreak >= 2 || /human agent|talk to (a )?(human|person)/i.test(userText);
    console.log(`[DEBUG] Suggest handover: ${suggestHandover} (streak: ${session.unresolvedStreak}, keywordMatch: ${/human agent|talk to (a )?(human|person)/i.test(userText)})`);

    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: processed.text,
      timestamp: Date.now()
    };
    session.history.push(assistantMsg);

  const hint = escalationHint(userText);
  // Add light-touch UX cues only when relevant, to keep replies natural
  const extra: string[] = [];
  if (/(invest|loan|mortgage|advice)/i.test(userText)) extra.push(adviceDisclaimer);
  if (/(password|pin|otp|card|security|scam|fraud)/i.test(userText)) extra.push(securityReminder);
  if (hint) extra.push(hint);
  let reply = [processed.text, ...extra].join('\n\n');
  if (suggestHandover) {
    reply += `\n\nWould you like me to connect you to a human agent?`;
  }

  return { reply, session, suggestHandover };
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
