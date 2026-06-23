import { describe, expect, it } from 'vitest';

import { generateBacklogId } from './generate-id';

describe('generateBacklogId', () => {
  it('returns a date slug backlog id', () => {
    expect(
      generateBacklogId('Streaming Cache Layer', '2026-06-22T10:00:00Z'),
    ).toBe('bl-260622-streaming-cache-layer');
  });

  it('uses UTC for the date prefix', () => {
    expect(generateBacklogId('Night Work', '2026-06-22T23:30:00-05:00')).toBe(
      'bl-260623-night-work',
    );
  });

  it('is idempotent for clean slug input', () => {
    expect(
      generateBacklogId('streaming-cache-layer', '2026-06-22T10:00:00Z'),
    ).toBe('bl-260622-streaming-cache-layer');
  });

  it('is deterministic for identical arguments', () => {
    const first = generateBacklogId(
      'Streaming Cache Layer',
      '2026-06-22T10:00:00Z',
    );
    const second = generateBacklogId(
      'Streaming Cache Layer',
      '2026-06-22T10:00:00Z',
    );

    expect(second).toBe(first);
  });
});
