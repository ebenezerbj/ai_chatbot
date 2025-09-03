import { describe, it, expect } from 'vitest';
import { retrieveKB } from '../src/knowledge/kb';

describe('Knowledge Base retrieval', () => {
  it('matches checking fees queries', () => {
    const res = retrieveKB('What are your checking account fees?');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].id).toBe('checking-fees');
  });

  it('limits to top 2', () => {
    const res = retrieveKB('fees account savings checking');
    expect(res.length).toBeLessThanOrEqual(2);
  });
});
