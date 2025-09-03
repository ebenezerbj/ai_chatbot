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

  async sendMessage(sessionId: string, userText: string): Promise<{ reply: string; session: Session }>{
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

    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: processed.text,
      timestamp: Date.now()
    };
    session.history.push(assistantMsg);

    const hint = escalationHint(userText);
  // Add light-touch UX cues for security/advice as needed
  const extra: string[] = [];
  if (/invest|loan|mortgage|advice/i.test(userText)) extra.push(adviceDisclaimer);
  extra.push(securityReminder);
  if (hint) extra.push(hint);
  const reply = [processed.text, ...extra].join('\n\n');

    return { reply, session };
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
