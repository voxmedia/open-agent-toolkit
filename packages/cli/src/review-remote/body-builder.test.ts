import { describe, expect, it } from 'vitest';

import { buildReviewBody, mapVerdict } from './body-builder';
import { parseMarkerBlock } from './marker-parser';

const FULL_SHA = 'c'.repeat(40);

interface TestFinding {
  severity: 'critical' | 'important' | 'medium' | 'minor';
}

const finding = (severity: TestFinding['severity']): TestFinding => ({
  severity,
});

describe('mapVerdict', () => {
  it('returns REQUEST_CHANGES when any critical finding is present', () => {
    expect(mapVerdict([finding('critical'), finding('minor')])).toBe(
      'REQUEST_CHANGES',
    );
  });

  it('returns REQUEST_CHANGES when any important finding is present', () => {
    expect(mapVerdict([finding('medium'), finding('important')])).toBe(
      'REQUEST_CHANGES',
    );
  });

  it('returns COMMENT when only medium and minor findings are present', () => {
    expect(mapVerdict([finding('medium'), finding('minor')])).toBe('COMMENT');
  });

  it('returns COMMENT for zero findings', () => {
    expect(mapVerdict([])).toBe('COMMENT');
  });
});

describe('buildReviewBody', () => {
  it('produces an ad-hoc body with no oat_project key', () => {
    const { body, verdict } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'A short review summary.',
      findings: [finding('minor')],
    });

    expect(verdict).toBe('COMMENT');
    expect(body).not.toContain('oat_project');
    expect(body).toContain('oat_review_scope: ad-hoc');
    // round-trips through the parser
    const parsed = parseMarkerBlock(body);
    expect(parsed?.oat_review_scope).toBe('ad-hoc');
    expect(parsed?.oat_project).toBeUndefined();
    expect(parsed?.oat_review_head_sha).toBe(FULL_SHA);
  });

  it('produces a project-rail body with oat_project and oat_review_scope', () => {
    const { body } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'p02',
      project: '.oat/projects/shared/remote-review',
      invocation: 'auto',
      summary: 'Project review.',
      findings: [finding('important')],
    });

    const parsed = parseMarkerBlock(body);
    expect(parsed?.oat_project).toBe('.oat/projects/shared/remote-review');
    expect(parsed?.oat_review_scope).toBe('p02');
    expect(parsed?.oat_review_invocation).toBe('auto');
  });

  it('reports severity counts matching the input findings', () => {
    const { body } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Mixed.',
      findings: [
        finding('critical'),
        finding('critical'),
        finding('important'),
        finding('medium'),
        finding('minor'),
        finding('minor'),
        finding('minor'),
      ],
    });

    expect(body).toMatch(/- Critical: 2/);
    expect(body).toMatch(/- Important: 1/);
    expect(body).toMatch(/- Medium: 1/);
    expect(body).toMatch(/- Minor: 3/);
  });

  it('includes the minor-fix Notes nudge when minor findings are present', () => {
    const { body } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Has minors.',
      findings: [finding('minor')],
    });

    expect(body).toContain('## Notes');
    expect(body).toMatch(/recommend fixing minors/i);
  });

  it('omits the Notes subsection when all severity counts are zero', () => {
    const { body, verdict } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'All clear.',
      findings: [],
    });

    expect(verdict).toBe('COMMENT');
    expect(body).not.toContain('## Notes');
  });

  it('omits the Notes subsection when only non-minor findings exist', () => {
    const { body } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'No minors.',
      findings: [finding('critical')],
    });

    expect(body).not.toContain('## Notes');
  });

  it('places the marker block as the first content in the body', () => {
    const { body } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'First.',
      findings: [],
    });

    expect(body.trimStart().startsWith('<!-- oat-review-metadata')).toBe(true);
    // marker block precedes any prose heading
    const markerEnd = body.indexOf('-->');
    const firstHeading = body.indexOf('## ');
    expect(markerEnd).toBeGreaterThan(-1);
    expect(firstHeading).toBeGreaterThan(markerEnd);
  });

  it('emits an oat_review_invocation value the parser round-trips', () => {
    const { body } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'final',
      project: '.oat/projects/shared/remote-review',
      invocation: 'manual',
      summary: 'Final review.',
      findings: [finding('medium')],
    });

    const parsed = parseMarkerBlock(body);
    expect(parsed).not.toBeNull();
    expect(parsed?.oat_review_invocation).toBe('manual');
    expect(parsed?.oat_review_scope).toBe('final');
    expect(parsed?.oat_provide_remote).toBe(true);
  });

  it('includes a Verification section only when verification commands are provided', () => {
    const withCommands = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Has fixes.',
      findings: [finding('important')],
      verificationCommands: ['pnpm test'],
    }).body;
    const withoutCommands = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'No fixes.',
      findings: [],
    }).body;

    expect(withCommands).toContain('## Verification');
    expect(withCommands).toContain('pnpm test');
    expect(withoutCommands).not.toContain('## Verification');
  });
});
