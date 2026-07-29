/**
 * Ad-hoc rail round-trip integration test (p02-t03).
 *
 * Exercises the full marker round-trip the `oat-review-provide-remote` skill
 * relies on: build a posted-review body for a known finding set via the
 * body-builder, parse it back via the marker-parser, and assert the markers,
 * the verdict, and the minor-fix "Notes" presence all match the design rules
 * (design.md → Data Models → Posted-review-body; Posted-review-body builder).
 */

import { describe, expect, it } from 'vitest';

import { buildReviewBody, type BuilderFinding } from '../../body-builder';
import { parseMarkerBlock } from '../../marker-parser';
import {
  pickNarrowingTarget,
  priorReviewFromMarker,
  type GitInvoker,
} from '../../narrowing';

const HEAD_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const PRIOR_SHA = '1111111111111111111111111111111111111111';

const reachableGit: GitInvoker = {
  objectExists: async () => true,
  isAncestor: async () => true,
  fetchRef: async () => true,
  changedFiles: async () => ['src/app.ts'],
};

describe('ad-hoc provide-remote round-trip', () => {
  it('round-trips ad-hoc markers through builder → parser', () => {
    const { body } = buildReviewBody({
      headSha: HEAD_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Reviewed the auth callback changes.',
      findings: [{ severity: 'minor' }],
    });

    const markers = parseMarkerBlock(body);
    expect(markers).not.toBeNull();
    expect(markers?.oat_provide_remote).toBe(true);
    expect(markers?.oat_review_head_sha).toBe(HEAD_SHA);
    expect(markers?.oat_review_scope).toBe('ad-hoc');
    expect(markers?.oat_review_invocation).toBe('manual');
    // Ad-hoc rail omits the project key entirely (key-existence discriminator).
    expect(markers?.oat_project).toBeUndefined();
  });

  it('maps verdict to REQUEST_CHANGES when a critical or important finding exists', () => {
    const findings: BuilderFinding[] = [
      { severity: 'important' },
      { severity: 'minor' },
    ];
    const { body, verdict } = buildReviewBody({
      headSha: HEAD_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Found a robustness gap.',
      findings,
    });
    expect(verdict).toBe('REQUEST_CHANGES');
    // Markers still round-trip on a request-changes review.
    expect(parseMarkerBlock(body)?.oat_review_scope).toBe('ad-hoc');
  });

  it('maps verdict to COMMENT when no critical or important findings exist (incl. clean)', () => {
    const minorOnly = buildReviewBody({
      headSha: HEAD_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Only cosmetics.',
      findings: [{ severity: 'minor' }, { severity: 'medium' }],
    });
    expect(minorOnly.verdict).toBe('COMMENT');

    const clean = buildReviewBody({
      headSha: HEAD_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'No issues found.',
      findings: [],
    });
    expect(clean.verdict).toBe('COMMENT');
  });

  it('includes the minor-fix Notes subsection only when minor findings are present', () => {
    const withMinor = buildReviewBody({
      headSha: HEAD_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'One nit.',
      findings: [{ severity: 'minor' }],
    });
    expect(withMinor.body).toContain('## Notes');

    const noMinor = buildReviewBody({
      headSha: HEAD_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'A blocking issue, no nits.',
      findings: [{ severity: 'critical' }],
    });
    expect(noMinor.body).not.toContain('## Notes');

    const clean = buildReviewBody({
      headSha: HEAD_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Clean.',
      findings: [],
    });
    expect(clean.body).not.toContain('## Notes');
  });

  it('keeps the marker block as the first content of the body', () => {
    const { body } = buildReviewBody({
      headSha: HEAD_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Marker ordering check.',
      findings: [{ severity: 'medium' }],
    });
    expect(body.startsWith('<!-- oat-review-metadata')).toBe(true);
  });

  it('keeps an invocation-less legacy marker ineligible for ad-hoc narrowing', async () => {
    const marker = parseMarkerBlock(`<!-- oat-review-metadata
oat_provide_remote: true
oat_review_head_sha: ${PRIOR_SHA}
oat_review_scope: ad-hoc
-->`);
    if (marker === null) {
      throw new Error(
        'legacy ad-hoc marker must preserve non-lineage metadata',
      );
    }

    const result = await pickNarrowingTarget({
      reviews: [priorReviewFromMarker(marker, '2026-05-29T10:00:00Z')],
      rail: 'ad-hoc',
      project: null,
      scope: 'ad-hoc',
      lineage: { kind: 'lifecycle' },
      headSha: HEAD_SHA,
      git: reachableGit,
    });

    expect(marker.oat_review_invocation).toBeUndefined();
    expect(result).toMatchObject({
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    });
  });
});
