import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import { describe, expect, it } from 'vitest';

import { assessGitHubPublicationSafety } from './github-publication-safety';

const assessedAt = '2026-09-02T12:00:00.000Z';
const safeProjection = { title: 'Public-safe summary' };
const safeUniversal = assessOutboundProjectionSafety(safeProjection, {
  assessedAt,
});

describe('GitHub publication safety', () => {
  it.each(['private', 'public'] as const)(
    'accepts an exact universally-safe projection for a %s repository',
    (visibility) => {
      const result = assessGitHubPublicationSafety({
        visibility,
        visibilityEvidenceDigest: 'sha256:visibility',
        projection: safeProjection,
        outboundSafety: safeUniversal,
        assessedAt,
      });
      expect(result).toMatchObject({ verdict: 'safe', reasons: [] });
      expect(result.preview).toEqual({
        visibility,
        projectionDigest: safeUniversal.projectionDigest,
        universalSafetyResultDigest: safeUniversal.resultDigest,
        verdict: 'safe',
        reasonCodes: [],
      });
      expect(result.preview).not.toHaveProperty('projection');
    },
  );

  it('fails closed when repository visibility is unavailable', () => {
    expect(
      assessGitHubPublicationSafety({
        visibility: 'unavailable',
        visibilityEvidenceDigest: null,
        projection: safeProjection,
        outboundSafety: safeUniversal,
        assessedAt,
      }),
    ).toMatchObject({
      verdict: 'blocked',
      reasons: ['visibility-unavailable'],
    });
  });

  it('blocks prohibited private artifact content on a public target', () => {
    const projection = {
      title: 'Implementation details',
      description: 'Copied from .oat/projects/private/implementation.md',
    };
    const result = assessGitHubPublicationSafety({
      visibility: 'public',
      visibilityEvidenceDigest: 'sha256:visibility',
      projection,
      outboundSafety: assessOutboundProjectionSafety(projection, {
        assessedAt,
      }),
      assessedAt,
    });
    expect(result.verdict).toBe('blocked');
    expect(result.reasons).toContain('prohibited-private-artifact');
    expect(JSON.stringify(result.preview)).not.toContain(
      '.oat/projects/private',
    );
  });

  it('blocks stale universal safety evidence instead of rescanning external state', () => {
    expect(
      assessGitHubPublicationSafety({
        visibility: 'public',
        visibilityEvidenceDigest: 'sha256:visibility',
        projection: { title: 'Changed projection' },
        outboundSafety: safeUniversal,
        assessedAt,
      }),
    ).toMatchObject({
      verdict: 'blocked',
      reasons: ['universal-safety-invalid'],
    });
  });
});
