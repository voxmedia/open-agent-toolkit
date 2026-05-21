import { describe, expect, it } from 'vitest';

import { evaluateSignals, type Signal } from '../signals';

describe('evaluateSignals', () => {
  it('returns confidence "below" with zero signals fired', () => {
    expect(evaluateSignals({ fired: [] }).confidence).toBe('below');
  });

  it('returns confidence "high" when both load-bearing signals fire', () => {
    expect(
      evaluateSignals({
        fired: ['independently-shippable', 'no-shared-design-surface'],
      }).confidence,
    ).toBe('high');
  });

  it('returns confidence "soft" when 2+ fire without both load-bearing', () => {
    expect(
      evaluateSignals({
        fired: ['expect-separate-prs', 'distinct-subsystems'],
      }).confidence,
    ).toBe('soft');
  });

  it('triggered === (fired.length >= 2)', () => {
    const cases: Signal[][] = [
      [],
      ['independently-shippable'],
      ['independently-shippable', 'expect-separate-prs'],
      [
        'independently-shippable',
        'no-shared-design-surface',
        'distinct-subsystems',
      ],
    ];

    for (const fired of cases) {
      expect(evaluateSignals({ fired }).triggered).toBe(fired.length >= 2);
    }
  });
});
