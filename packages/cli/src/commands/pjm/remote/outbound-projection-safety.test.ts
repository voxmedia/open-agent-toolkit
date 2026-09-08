import { describe, expect, it } from 'vitest';

import {
  assessOutboundProjectionSafety,
  requireCurrentOutboundSafety,
} from './outbound-projection-safety';

const assessedAt = '2026-08-31T12:00:00.000Z';

describe('outbound projection safety', () => {
  it('assesses only the explicit normalized projection and returns digest-bound safe evidence', () => {
    const projection = {
      title: 'Publish a bounded title',
      description: 'Public summary',
      priority: 'high',
    };
    const result = assessOutboundProjectionSafety(projection, { assessedAt });
    expect(result).toMatchObject({ verdict: 'safe', reasons: [] });
    expect(() =>
      requireCurrentOutboundSafety(projection, result),
    ).not.toThrow();
  });

  it.each([
    [{ description: 'token=synthetic_example_value' }, 'sensitive-content'],
    [{ description: 'Copy .oat/projects/private/spec.md' }, 'private-artifact'],
    [{ title: 'Safe', extra: { nested: true } } as never, 'invalid-projection'],
  ])(
    'blocks representative unsafe projection evidence %#',
    (projection, code) => {
      const result = assessOutboundProjectionSafety(projection, { assessedAt });
      expect(result.verdict).toBe('blocked');
      expect(result.reasons).toContainEqual(expect.objectContaining({ code }));
      expect(JSON.stringify(result)).not.toContain('synthetic_example_value');
      expect(() => requireCurrentOutboundSafety(projection, result)).toThrow(
        /blocks execution/,
      );
    },
  );

  it('rejects missing, stale, and tampered evidence', () => {
    const projection = { title: 'Safe title' };
    const result = assessOutboundProjectionSafety(projection, { assessedAt });
    expect(() => requireCurrentOutboundSafety(projection, null)).toThrow(
      /missing/,
    );
    expect(() =>
      requireCurrentOutboundSafety({ title: 'Changed' }, result),
    ).toThrow(/stale|mismatched/);
    expect(() =>
      requireCurrentOutboundSafety(projection, {
        ...result,
        resultDigest: 'sha256:tampered',
      }),
    ).toThrow(/digest is invalid/);
  });
});
