import { describe, expect, it } from 'vitest';

import { yymmdd } from './date-id';

describe('yymmdd', () => {
  it('formats an ISO timestamp as YYMMDD in UTC', () => {
    expect(yymmdd('2026-06-22T10:00:00Z')).toBe('260622');
  });

  it('uses UTC rather than local time', () => {
    expect(yymmdd('2026-06-22T23:30:00-05:00')).toBe('260623');
  });

  it('accepts Date instances', () => {
    expect(yymmdd(new Date('2026-06-23T04:30:00Z'))).toBe('260623');
  });

  it('throws for invalid dates', () => {
    expect(() => yymmdd('not-a-date')).toThrow(
      'Invalid date for OAT identifier: not-a-date',
    );
  });
});
