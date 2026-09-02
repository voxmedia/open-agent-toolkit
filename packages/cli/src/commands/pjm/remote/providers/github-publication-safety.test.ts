import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import { describe, expect, it } from 'vitest';

import {
  assessGitHubPublicationSafety,
  observeGitHubRepositoryVisibility,
  requireCurrentGitHubPublicationSafety,
} from './github-publication-safety';

const assessedAt = '2026-09-02T12:00:00.000Z';
const safeProjection = { title: 'Public-safe summary' };
const safeUniversal = assessOutboundProjectionSafety(safeProjection, {
  assessedAt,
});
const context = {
  host: 'github.example',
  accountId: 'account_123',
  repositoryId: 'repo_123',
  owner: 'acme',
  name: 'widgets',
};

function visibility(value: 'private' | 'public' | 'unavailable') {
  return observeGitHubRepositoryVisibility({
    context,
    visibility: value,
    capabilityEvidenceDigest: 'sha256:capability',
    observedAt: assessedAt,
  });
}

describe('GitHub publication safety', () => {
  it.each(['private', 'public'] as const)(
    'accepts an exact universally-safe projection for a %s repository',
    (repositoryVisibility) => {
      const result = assessGitHubPublicationSafety({
        visibilityObservation: visibility(repositoryVisibility),
        projection: safeProjection,
        outboundSafety: safeUniversal,
        assessedAt,
      });
      expect(result).toMatchObject({ verdict: 'safe', reasons: [] });
      expect(result.preview).toEqual({
        visibility: repositoryVisibility,
        contextDigest: expect.stringMatching(/^sha256:/),
        capabilityEvidenceDigest: 'sha256:capability',
        visibilityEvidenceDigest: expect.stringMatching(/^sha256:/),
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
        visibilityObservation: visibility('unavailable'),
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
      visibilityObservation: visibility('public'),
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
        visibilityObservation: visibility('public'),
        projection: { title: 'Changed projection' },
        outboundSafety: safeUniversal,
        assessedAt,
      }),
    ).toMatchObject({
      verdict: 'blocked',
      reasons: ['universal-safety-invalid'],
    });
  });

  it('requires current visibility, capability, context, projection, and result evidence', () => {
    const result = assessGitHubPublicationSafety({
      visibilityObservation: visibility('public'),
      projection: safeProjection,
      outboundSafety: safeUniversal,
      assessedAt,
    });
    expect(() =>
      requireCurrentGitHubPublicationSafety({
        context,
        capabilityEvidenceDigest: 'sha256:capability',
        projection: safeProjection,
        outboundSafety: safeUniversal,
        result,
      }),
    ).not.toThrow();
    expect(() =>
      requireCurrentGitHubPublicationSafety({
        context: { ...context, repositoryId: 'repo_other' },
        capabilityEvidenceDigest: 'sha256:capability',
        projection: safeProjection,
        outboundSafety: safeUniversal,
        result,
      }),
    ).toThrow('context');
    expect(() =>
      requireCurrentGitHubPublicationSafety({
        context,
        capabilityEvidenceDigest: 'sha256:other-capability',
        projection: safeProjection,
        outboundSafety: safeUniversal,
        result,
      }),
    ).toThrow('capability');
  });

  it('rejects stale or forged visibility observations', () => {
    const stale = observeGitHubRepositoryVisibility({
      context,
      visibility: 'public',
      capabilityEvidenceDigest: 'sha256:capability',
      observedAt: '2026-09-02T11:00:00.000Z',
    });
    expect(
      assessGitHubPublicationSafety({
        visibilityObservation: stale,
        projection: safeProjection,
        outboundSafety: safeUniversal,
        assessedAt,
      }),
    ).toMatchObject({ verdict: 'blocked', reasons: ['visibility-stale'] });
    expect(() =>
      assessGitHubPublicationSafety({
        visibilityObservation: {
          ...visibility('public'),
          evidenceDigest: 'sha256:forged',
        },
        projection: safeProjection,
        outboundSafety: safeUniversal,
        assessedAt,
      }),
    ).toThrow('visibility evidence digest');
  });
});
