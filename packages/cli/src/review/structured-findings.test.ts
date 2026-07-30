import { describe, expect, it } from 'vitest';

import {
  StructuredFindingsError,
  validateStructuredFindings,
} from './structured-findings';

function valid() {
  return {
    summary: 'One issue found.',
    findings: [
      {
        id: 'I1',
        severity: 'important',
        title: 'Missing error handling',
        file: 'src/review.ts',
        line: 42,
        body: 'The error is discarded.',
        fix_guidance: 'Propagate the error.',
      },
      {
        id: 'm1',
        severity: 'minor',
        title: 'Stale comment',
        file: null,
        line: null,
        body: 'The comment names the old API.',
        fix_guidance: null,
      },
    ],
    verification_commands: ['pnpm test'],
  };
}

describe('structured findings validator', () => {
  it('returns every valid current structured-findings case unchanged', () => {
    const populated = valid();
    expect(validateStructuredFindings(populated)).toEqual(populated);
    expect(
      validateStructuredFindings({
        summary: 'No issues found.',
        findings: [],
        verification_commands: [],
      }),
    ).toEqual({
      summary: 'No issues found.',
      findings: [],
      verification_commands: [],
    });
  });

  it.each([
    ['non-object', 'not-an-object'],
    ['missing summary', { findings: [], verification_commands: [] }],
    [
      'non-array findings',
      { summary: '', findings: {}, verification_commands: [] },
    ],
    [
      'non-array commands',
      { summary: '', findings: [], verification_commands: 'test' },
    ],
    [
      'empty finding id',
      { ...valid(), findings: [{ ...valid().findings[0], id: '' }] },
    ],
    [
      'invalid severity',
      {
        ...valid(),
        findings: [{ ...valid().findings[0], severity: 'blocker' }],
      },
    ],
    [
      'invalid title',
      { ...valid(), findings: [{ ...valid().findings[0], title: 1 }] },
    ],
    [
      'invalid body',
      { ...valid(), findings: [{ ...valid().findings[0], body: null }] },
    ],
    [
      'unpaired file',
      { ...valid(), findings: [{ ...valid().findings[0], line: null }] },
    ],
    [
      'unpaired line',
      { ...valid(), findings: [{ ...valid().findings[0], file: null }] },
    ],
    [
      'invalid file',
      { ...valid(), findings: [{ ...valid().findings[0], file: 1 }] },
    ],
    [
      'invalid line',
      { ...valid(), findings: [{ ...valid().findings[0], line: '42' }] },
    ],
    [
      'invalid fix guidance',
      { ...valid(), findings: [{ ...valid().findings[0], fix_guidance: 1 }] },
    ],
  ])('rejects malformed case: %s', (_name, value) => {
    expect(() => validateStructuredFindings(value)).toThrow(
      StructuredFindingsError,
    );
  });
});
