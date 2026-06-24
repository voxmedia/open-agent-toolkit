import { describe, expect, it } from 'vitest';

import { generateBacklogId } from './generate-id';

describe('generateBacklogId', () => {
  it('returns an uppercase-prefixed date slug backlog id', () => {
    expect(
      generateBacklogId('Streaming Cache Layer', '2026-06-22T10:00:00Z'),
    ).toBe('BL-260622-streaming-cache-layer');
  });

  it('uses UTC for the date prefix', () => {
    expect(generateBacklogId('Night Work', '2026-06-22T23:30:00-05:00')).toBe(
      'BL-260623-night-work',
    );
  });

  it('is idempotent for clean slug input', () => {
    expect(
      generateBacklogId('streaming-cache-layer', '2026-06-22T10:00:00Z'),
    ).toBe('BL-260622-streaming-cache-layer');
  });

  it('caps the slug at 30 characters on a word boundary', () => {
    expect(
      generateBacklogId(
        'Streaming cache layer rollout for users',
        '2026-06-22T10:00:00Z',
      ),
    ).toBe('BL-260622-streaming-cache-layer-rollout');
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
