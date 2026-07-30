import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../review-remote/reviewer-dispatch.ts', import.meta.url),
  'utf8',
);

describe('reference dispatch ownership', () => {
  it('does not import coordinator or validation-store authority', () => {
    expect(source).not.toMatch(
      /from ['"]@review\/(?:validation-store|review-lifecycle|coordinator-contract)['"]/,
    );
    expect(source).not.toMatch(
      /from ['"].*\/(?:validation-store|review-lifecycle|coordinator-contract)['"]/,
    );
  });

  it('does not own replacement, retry, or accepted-continuation APIs', () => {
    expect(source).not.toMatch(
      /\b(?:spawnReplacement|replaceReviewer|retryDispatch|retryReview)\b/,
    );
    expect(source).not.toMatch(
      /\b(?:ReviewerContinuation|bindAcceptedHandle|acceptedHandleDigest)\b/,
    );
  });

  it('remains limited to payload building, one spawn wrapper, and pure validation', () => {
    expect(source).toContain('export function buildDispatchPayload');
    expect(source).toContain('validateStructuredFindings(response.findings)');
    expect(source.match(/\bdispatcher\.spawn\(/g)).toHaveLength(1);
    expect(source).not.toMatch(/\b(?:writeFile|mkdir|rm|git|gh)\s*\(/);
  });
});
