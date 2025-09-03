import { describe, it, expect } from 'vitest';
import { redactSensitive, safetyGuardUserInput } from '../src/hci/safety';

describe('Safety filters', () => {
  it('redacts long digit sequences', () => {
    const t = redactSensitive('My card is 4111111111111111');
    expect(t).not.toMatch(/4111\d{12}/);
    expect(t).toContain('[REDACTED]');
  });

  it('flags sensitive keywords', () => {
    const r = safetyGuardUserInput('password: 1234');
    expect(r.flagged).toBe(true);
  });
});
