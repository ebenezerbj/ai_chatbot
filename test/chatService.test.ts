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

  it('returns only the specific branch manager for Yeji', async () => {
    const service = new ChatService(new MockProvider());
    const s = service.createSession();
    const result = await service.sendMessage(s.id, 'Who is the branch manager at Yeji?');
    expect(result.reply).toMatch(/Yeji branch manager:/i);
    expect(result.reply).toMatch(/BENJAMIN AYISI/i);
    // Should not include the aggregate list header
    expect(result.reply).not.toMatch(/Branch Managers by location:/i);
  });

  it('returns precise coordinates and map link for Kejetia location queries', async () => {
    const service = new ChatService(new MockProvider());
    const s = service.createSession();
    const result = await service.sendMessage(s.id, 'Where can I locate Kejetia branch?');
    expect(result.reply).toMatch(/Kejetia/i);
    expect(result.reply).toMatch(/Directions: https:\/\/www\.google\.com\/maps\?q=/i);
    expect(result.reply).toMatch(/6\.699913|6\.6999130/);
  });
});
