import { describe, it, expect } from 'vitest';
import { ChatService } from '../src/services/chatService';
import { MockProvider } from '../src/providers/mockProvider';

describe('ChatService', () => {
  it('creates a session and replies', async () => {
    const service = new ChatService(new MockProvider());
    const s = service.createSession();
    const result = await service.sendMessage(s.id, 'Tell me about checking fees');
    expect(result.reply).toMatch(/Thanks for reaching out|checking/i);
  });
});
