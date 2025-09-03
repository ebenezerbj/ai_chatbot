import { describe, it, expect } from 'vitest';
import { ChatService } from '../src/services/chatService';
import { MockProvider } from '../src/providers/mockProvider';
import * as kb from '../src/knowledge/kb';

// Spy on provider to verify KB injection appears in messages passed to the model.
class InspectingProvider extends MockProvider {
  public lastMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
  async generate(opts: any) {
    this.lastMessages = opts.messages;
    return super.generate(opts);
  }
}

describe('KB injection', () => {
  it('adds KB context when a query matches', async () => {
    const p = new InspectingProvider();
    const svc = new ChatService(p as any);
    const s = svc.createSession();

    await svc.sendMessage(s.id, 'What are your checking account fees?');

    const sysMsgs = p.lastMessages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    expect(sysMsgs).toMatch(/Institution product info/);
    expect(sysMsgs).toMatch(/\(1\).*Checking/);
  });

  it('does not add KB context when no match', async () => {
    const p = new InspectingProvider();
    const svc = new ChatService(p as any);
    const s = svc.createSession();

    await svc.sendMessage(s.id, 'Tell me a joke about space travel');

    const sysMsgs = p.lastMessages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    expect(sysMsgs).not.toMatch(/Institution product info/);
  });
});
