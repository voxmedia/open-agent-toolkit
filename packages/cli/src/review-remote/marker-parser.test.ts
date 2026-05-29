import { describe, expect, it } from 'vitest';

import { parseMarkerBlock } from './marker-parser';

const FULL_SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);

function body(
  markers: string,
  prose = '\n\n## Summary\n\nSome review prose.',
): string {
  return `<!-- oat-review-metadata\n${markers}\n-->${prose}`;
}

describe('parseMarkerBlock', () => {
  it('parses a well-formed ad-hoc marker block into a typed object', () => {
    const parsed = parseMarkerBlock(
      body(
        [
          'oat_provide_remote: true',
          `oat_review_head_sha: ${FULL_SHA}`,
          'oat_review_scope: ad-hoc',
          'oat_review_invocation: manual',
        ].join('\n'),
      ),
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.oat_provide_remote).toBe(true);
    expect(parsed?.oat_review_head_sha).toBe(FULL_SHA);
    expect(parsed?.oat_review_scope).toBe('ad-hoc');
    expect(parsed?.oat_review_invocation).toBe('manual');
    // ad-hoc rail: project key omitted entirely.
    expect(parsed?.oat_project).toBeUndefined();
  });

  it('parses a project-rail marker block including oat_project', () => {
    const parsed = parseMarkerBlock(
      body(
        [
          'oat_provide_remote: true',
          `oat_review_head_sha: ${FULL_SHA}`,
          'oat_review_scope: p02',
          'oat_project: .oat/projects/shared/remote-review',
          'oat_review_invocation: auto',
        ].join('\n'),
      ),
    );

    expect(parsed?.oat_project).toBe('.oat/projects/shared/remote-review');
    expect(parsed?.oat_review_scope).toBe('p02');
    expect(parsed?.oat_review_invocation).toBe('auto');
  });

  it('returns null when no marker block is present (non-OAT review)', () => {
    expect(
      parseMarkerBlock('## Summary\n\nA human review with no OAT markers.'),
    ).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseMarkerBlock('')).toBeNull();
  });

  it('tolerates extra whitespace and mixed-case marker keys', () => {
    const parsed = parseMarkerBlock(
      body(
        [
          '   OAT_Provide_Remote :   true   ',
          `  oat_review_head_SHA:   ${FULL_SHA}  `,
          '  Oat_Review_Scope:  ad-hoc',
          'oat_review_invocation: manual',
        ].join('\n'),
      ),
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.oat_provide_remote).toBe(true);
    expect(parsed?.oat_review_head_sha).toBe(FULL_SHA);
    expect(parsed?.oat_review_scope).toBe('ad-hoc');
  });

  it('tolerates unknown extra keys (forward-compat)', () => {
    const parsed = parseMarkerBlock(
      body(
        [
          'oat_provide_remote: true',
          `oat_review_head_sha: ${FULL_SHA}`,
          'oat_review_scope: ad-hoc',
          'oat_review_invocation: manual',
          'oat_future_field: some-value',
        ].join('\n'),
      ),
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.oat_review_scope).toBe('ad-hoc');
    // Unknown keys are preserved on the extras bag, not dropped.
    expect(parsed?.extras?.oat_future_field).toBe('some-value');
  });

  // Contract choice (documented): an OAT marker block whose head SHA is not a
  // valid 40-char hex SHA is treated as a malformed OAT review and yields null.
  // Re-review narrowing cannot trust a non-SHA value, and returning null lets
  // the caller fall through to full-scope review rather than narrowing against
  // garbage.
  it('returns null when oat_review_head_sha is not a 40-char hex SHA', () => {
    expect(
      parseMarkerBlock(
        body(
          [
            'oat_provide_remote: true',
            'oat_review_head_sha: abc123',
            'oat_review_scope: ad-hoc',
            'oat_review_invocation: manual',
          ].join('\n'),
        ),
      ),
    ).toBeNull();
  });

  it('returns null when oat_review_head_sha contains non-hex characters', () => {
    expect(
      parseMarkerBlock(
        body(
          [
            'oat_provide_remote: true',
            `oat_review_head_sha: ${'z'.repeat(40)}`,
            'oat_review_scope: ad-hoc',
            'oat_review_invocation: manual',
          ].join('\n'),
        ),
      ),
    ).toBeNull();
  });

  it('returns null when oat_provide_remote is not true', () => {
    // A marker block that is not an oat_provide_remote review is not ours.
    expect(
      parseMarkerBlock(
        body(
          [
            'oat_provide_remote: false',
            `oat_review_head_sha: ${FULL_SHA}`,
            'oat_review_scope: ad-hoc',
          ].join('\n'),
        ),
      ),
    ).toBeNull();
  });

  it('discriminates project rail vs ad-hoc via key existence, not null', () => {
    const adhoc = parseMarkerBlock(
      body(
        [
          'oat_provide_remote: true',
          `oat_review_head_sha: ${FULL_SHA}`,
          'oat_review_scope: ad-hoc',
        ].join('\n'),
      ),
    );
    const project = parseMarkerBlock(
      body(
        [
          'oat_provide_remote: true',
          `oat_review_head_sha: ${OTHER_SHA}`,
          'oat_review_scope: p02',
          'oat_project: .oat/projects/shared/remote-review',
        ].join('\n'),
      ),
    );

    expect('oat_project' in (adhoc ?? {})).toBe(false);
    expect(project?.oat_project).toBe('.oat/projects/shared/remote-review');
  });

  it('reads only the first marker block when prose contains a later comment', () => {
    const text = `${body(
      [
        'oat_provide_remote: true',
        `oat_review_head_sha: ${FULL_SHA}`,
        'oat_review_scope: ad-hoc',
      ].join('\n'),
    )}\n\n<!-- oat-review-metadata\noat_review_scope: should-not-win\n-->`;

    expect(parseMarkerBlock(text)?.oat_review_scope).toBe('ad-hoc');
  });

  it('defaults oat_review_invocation to manual when omitted', () => {
    const parsed = parseMarkerBlock(
      body(
        [
          'oat_provide_remote: true',
          `oat_review_head_sha: ${FULL_SHA}`,
          'oat_review_scope: ad-hoc',
        ].join('\n'),
      ),
    );

    expect(parsed?.oat_review_invocation).toBe('manual');
  });
});
