import { describe, it, expect } from 'vitest';
import { defaultKBPath, loadKBFromFile, retrieveKB } from '../src/knowledge/kb';

describe('KB matching behavior', () => {
  it('matches known branch queries from kb.json', () => {
    const entries = loadKBFromFile(defaultKBPath());
    const res = retrieveKB('Where is the Amantin branch located?', entries);
    expect(res.length).toBeGreaterThan(0);
    expect(res.join('\n')).toMatch(/Amantin/i);
  });

  it('does not match unrelated queries', () => {
    const entries = loadKBFromFile(defaultKBPath());
    const res = retrieveKB('tell me a joke about penguins', entries);
    expect(res).toEqual([]);
  });
});
