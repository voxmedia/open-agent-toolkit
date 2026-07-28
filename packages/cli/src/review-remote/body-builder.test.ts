import { describe, expect, it } from 'vitest';

import { buildReviewBody, mapVerdict, type BuildInput } from './body-builder';
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

  it('round-trips a gate invocation with its exact target', () => {
    const { body } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'p02',
      project: '.oat/projects/shared/remote-review',
      invocation: 'gate',
      gateTarget: 'cursor-fable-5-xhigh',
      summary: 'Gate review.',
      findings: [],
    });

    const parsed = parseMarkerBlock(body);
    expect(parsed?.oat_review_invocation).toBe('gate');
    expect(parsed?.oat_gate_target).toBe('cursor-fable-5-xhigh');
  });

  it.each(['', '   ', ' padded-target '])(
    'rejects a gate invocation with an invalid exact target %j',
    (gateTarget) => {
      expect(() =>
        buildReviewBody({
          headSha: FULL_SHA,
          scope: 'p02',
          project: '.oat/projects/shared/remote-review',
          invocation: 'gate',
          gateTarget,
          summary: 'Invalid gate review.',
          findings: [],
        }),
      ).toThrow('gate invocation requires an exact non-empty gateTarget');
    },
  );

  it('rejects a lifecycle invocation carrying a gate target at runtime', () => {
    const invalid = {
      headSha: FULL_SHA,
      scope: 'p02',
      invocation: 'manual',
      gateTarget: 'cursor-fable-5-xhigh',
      summary: 'Invalid lifecycle review.',
      findings: [],
    } as unknown as BuildInput;

    expect(() => buildReviewBody(invalid)).toThrow(
      'lifecycle invocation must not include gateTarget',
    );
  });

  it('renders a Findings outside the PR diff subsection with file:line and body', () => {
    const { body } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Has an out-of-diff finding.',
      findings: [finding('important')],
      outOfDiffFindings: [
        {
          file: 'packages/cli/src/legacy/untouched.ts',
          line: 42,
          severity: 'important',
          title: 'Legacy guard missing',
          body: 'This guard is required but the line is not in the PR diff.',
        },
      ],
    });

    expect(body).toContain('## Findings outside the PR diff');
    expect(body).toContain('packages/cli/src/legacy/untouched.ts:42');
    expect(body).toContain(
      'This guard is required but the line is not in the PR diff.',
    );
  });

  it('renders a null-line out-of-diff finding without a trailing :line', () => {
    const { body } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'File-level out-of-diff finding.',
      findings: [finding('medium')],
      outOfDiffFindings: [
        {
          file: 'packages/cli/src/legacy/whole-file.ts',
          line: null,
          severity: 'medium',
          body: 'Whole-file concern with no specific line.',
        },
      ],
    });

    expect(body).toContain('## Findings outside the PR diff');
    expect(body).toContain('packages/cli/src/legacy/whole-file.ts');
    expect(body).not.toContain('whole-file.ts:');
    expect(body).toContain('Whole-file concern with no specific line.');
  });

  it('omits the Findings outside the PR diff subsection when none are provided', () => {
    const omitted = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'No out-of-diff findings.',
      findings: [finding('critical')],
    }).body;
    const empty = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'No out-of-diff findings.',
      findings: [finding('critical')],
      outOfDiffFindings: [],
    }).body;

    expect(omitted).not.toContain('## Findings outside the PR diff');
    // Empty array is byte-identical to omitting the field (no empty heading).
    expect(empty).toBe(omitted);
  });

  it('keeps severity counts reflecting ALL findings, including out-of-diff ones', () => {
    // Contract: out-of-diff findings are still passed in `findings` so the
    // counts stay complete. `outOfDiffFindings` only controls body rendering,
    // never the count math — the builder does not re-derive counts from it.
    const { body } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Counts include the downgraded finding.',
      findings: [finding('critical'), finding('important')],
      outOfDiffFindings: [
        {
          file: 'packages/cli/src/legacy/untouched.ts',
          line: 7,
          severity: 'important',
          body: 'Downgraded into the body but still counted.',
        },
      ],
    });

    // The important out-of-diff finding is present in `findings`, so the count
    // is 1 — the out-of-diff section does not add a second tally.
    expect(body).toMatch(/- Critical: 1/);
    expect(body).toMatch(/- Important: 1/);
  });

  it('places the Findings outside the PR diff subsection after Severity Counts', () => {
    const { body } = buildReviewBody({
      headSha: FULL_SHA,
      scope: 'ad-hoc',
      invocation: 'manual',
      summary: 'Ordering check.',
      findings: [finding('minor')],
      outOfDiffFindings: [
        {
          file: 'a/b/c.ts',
          line: 3,
          severity: 'minor',
          body: 'Out-of-diff minor.',
        },
      ],
    });

    const countsIdx = body.indexOf('## Severity Counts');
    const outOfDiffIdx = body.indexOf('## Findings outside the PR diff');
    const notesIdx = body.indexOf('## Notes');
    expect(countsIdx).toBeGreaterThan(-1);
    expect(outOfDiffIdx).toBeGreaterThan(countsIdx);
    expect(notesIdx).toBeGreaterThan(outOfDiffIdx);
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
