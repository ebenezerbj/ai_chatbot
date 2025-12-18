import { describe, it, expect } from 'vitest';
import { defaultKBPath, loadKBFromFile, retrieveKB } from '../src/knowledge/kb';

describe('Knowledge Base retrieval', () => {
  it('returns a branch list response for branch queries', () => {
    const entries = loadKBFromFile(defaultKBPath());
    expect(entries.length).toBeGreaterThan(0);

    const res = retrieveKB('Please list all branches', entries);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0]).toMatch(/Branch locations/i);
  });

  it('returns empty array when no match', () => {
    const entries = loadKBFromFile(defaultKBPath());
    const res = retrieveKB('tell me a joke about space travel', entries);
    expect(res).toEqual([]);
  });
});
