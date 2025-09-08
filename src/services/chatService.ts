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
  let response;
  try {
    response = await this.provider.generate({
      systemPrompt: SYSTEM_PERSONA,
      messages: [
        ...messages,
        { role: 'system', content: kbContext }
      ],
      temperature: 0.2,
      maxTokens: 600
    });
  } catch (error: any) {
    console.log('[ChatService] Provider error, triggering handover:', error?.message || error);
    // If the AI provider fails, immediately suggest handover
    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: "I'm having some technical difficulties right now. Let me connect you with one of our human agents who can help you immediately.",
      timestamp: Date.now()
    };
    session.history.push(assistantMsg);
    
    return { 
      reply: assistantMsg.content, 
      session, 
      suggestHandover: true 
    };
  }
  const t1 = Date.now();
  this.metrics.totalTurns += 1;
  this.metrics.lastLatencyMs = t1 - t0;

  const processed = postProcessAssistant(response);

    // Simple unresolved detection: if response is the generic fallback or contains "I couldn't"/"not sure",
    // increment unresolved streak; else reset it. After 2 unresolved turns, suggest handover.
    const genericRe = /I can help with questions about our products, services, branch locations, and hours/i;
    const uncertainRe = /(i\s+(am\s+)?not\s+sure|i\s+couldn'?t|can\'?t\s+help|don'?t\s+have\s+that\s+info)/i;
    const trivialRe = /^(hi|hello|hey|thanks|thank you|ok|okay)$/i;
    const handoverQuestionRe = /Would you like me to facilitate a connection with a customer representative/i;
    
    // Consider it unresolved if:
    // - Generic fallback text, or
    // - Uncertain language, or
    // - No KB snippets matched for this user input (excluding trivial greetings/thanks)
    // BUT NOT if the response contains a handover question (to prevent loops)
    const looksUnresolved = (
      (genericRe.test(processed.text) ||
      uncertainRe.test(processed.text) ||
      (!trivialRe.test(userText.trim()) && snippets.length === 0)) &&
      !handoverQuestionRe.test(processed.text)
    );
    console.log(`[DEBUG] Checking unresolved: generic=${genericRe.test(processed.text)}, uncertain=${uncertainRe.test(processed.text)}, noKB=${!trivialRe.test(userText.trim()) && snippets.length === 0}, handoverQuestion=${handoverQuestionRe.test(processed.text)}, result=${looksUnresolved}`);
    
    // Reset unresolved streak if we're about to suggest handover to prevent loops
    const shouldSuggestHandover = looksUnresolved || /human agent|talk to (a )?(human|person)/i.test(userText);
    if (shouldSuggestHandover) {
      session.unresolvedStreak = 0; // Reset to prevent handover suggestions from being detected as unresolved
      console.log(`[DEBUG] Suggesting handover immediately for unresolved query`);
    } else {
      session.unresolvedStreak = 0; // Always reset since we're doing immediate handover
      console.log(`[DEBUG] Query resolved successfully`);
    }
    const suggestHandover = shouldSuggestHandover;
    
    // Check if user is responding "yes" to a previous handover suggestion
    const lastAssistantMsg = session.history.slice().reverse().find(m => m.role === 'assistant');
    const isRespondingYesToHandover = lastAssistantMsg && 
      /Would you like me to facilitate a connection with a customer representative/i.test(lastAssistantMsg.content) &&
      /^(yes|yeah|yep|sure|ok|okay|y|please|connect me|help me)$/i.test(userText.trim());
    
    // Check if we've already asked the handover question recently to prevent loops
    const recentMessages = session.history.slice(-6); // Check last 6 messages for broader context
    const alreadyAskedHandover = recentMessages.some(m => 
      m.role === 'assistant' && /Would you like me to facilitate a connection with a customer representative/i.test(m.content)
    );
    
    // Additional check: if the last assistant message was a handover question, don't ask again
    const lastAssistantMessage = session.history.slice().reverse().find(m => m.role === 'assistant');
    const lastWasHandover = lastAssistantMessage && 
      /Would you like me to facilitate a connection with a customer representative/i.test(lastAssistantMessage.content);
    
    const finalSuggestHandover = suggestHandover || isRespondingYesToHandover;
    
    console.log(`[DEBUG] Suggest handover: ${finalSuggestHandover} (streak: ${session.unresolvedStreak}, keywordMatch: ${/human agent|talk to (a )?(human|person)/i.test(userText)}, yesToHandover: ${!!isRespondingYesToHandover}, alreadyAsked: ${alreadyAskedHandover}, lastWasHandover: ${!!lastWasHandover})`);

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
  
  let reply;
  if (isRespondingYesToHandover) {
    // User said yes to handover - just acknowledge and let frontend handle it
    reply = "Perfect! I'll connect you with a customer representative right away.";
  } else if (suggestHandover && !alreadyAskedHandover && !lastWasHandover) {
    // Suggest handover for unresolved queries
    reply = `I appreciate your inquiry; however, this matter lies outside of my expertise. Would you like me to facilitate a connection with a customer representative who can provide the necessary assistance?`;
  } else {
    // Normal response - use original text with any extras
    reply = [processed.text, ...extra].join('\n\n');
  }

  return { reply, session, suggestHandover: finalSuggestHandover };
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
