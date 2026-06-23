import { describe, expect, it } from 'vitest';

import { generateDecisionId } from './generate-id';

describe('generateDecisionId', () => {
  it('generates a date slug decision id from a title', () => {
    expect(
      generateDecisionId('Adopt PJM Reference Split', '2026-06-22T10:30:00Z'),
    ).toBe('dr-260622-adopt-pjm-reference-split');
  });

  it('uses UTC date parts for timestamp inputs', () => {
    expect(
      generateDecisionId(
        'Late Night Decision',
        '2026-06-23T01:30:00.000+05:00',
      ),
    ).toBe('dr-260622-late-night-decision');
  });

  it('normalizes punctuation and empty titles through the shared slug helper', () => {
    expect(generateDecisionId('  Déjà vu / API!!  ', '2026-06-22')).toBe(
      'dr-260622-deja-vu-api',
    );
    expect(generateDecisionId('!!!', '2026-06-22')).toBe('dr-260622-untitled');
  });
});
