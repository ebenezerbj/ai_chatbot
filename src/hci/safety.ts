import { LLMResponse, Message } from '../core/types';

const SENSITIVE_PATTERNS: RegExp[] = [
  /\b\d{13,19}\b/, // possible card numbers
  /(password|passcode|pin)\s*[:=]/i,
  /ssn|social security|national id/i
];

export function redactSensitive(text: string): string {
  let redacted = text;
  for (const re of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(re, '[REDACTED]');
  }
  return redacted;
}

export function safetyGuardUserInput(text: string): {
  text: string;
  flagged: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let flagged = false;

  for (const re of SENSITIVE_PATTERNS) {
    if (re.test(text)) {
      flagged = true;
      reasons.push('potential sensitive info');
    }
  }
  if (/advice|invest|loan|mortgage/i.test(text)) {
    reasons.push('financial advice request: respond with general info and disclaimers');
  }
  if (/pwd|password|login.*help/i.test(text)) {
    reasons.push('auth help: do not ask for passwords, direct to secure reset process');
  }
  return { text: redactSensitive(text), flagged, reasons };
}

export function postProcessAssistant(resp: LLMResponse): LLMResponse {
  const text = resp.text
    .replace(/(?<!\.)\n{3,}/g, '\n\n')
    .trim();
  return { ...resp, text };
}

export function escalationHint(userMessage: string): string | null {
  if (/complaint|escalate|human agent|supervisor/i.test(userMessage)) {
    return 'Would you like me to connect you with a human support agent?';
  }
  return null;
}
