import { describe, expect, it } from 'vitest';

import { classifyModelFamily } from './family';

describe('classifyModelFamily', () => {
  it.each([
    ['sonnet-4-thinking', 'claude'],
    ['opus', 'claude'],
    ['fable-5', 'claude'],
    ['Claude 4 Sonnet', 'claude'],
    ['gpt-5.5-high', 'openai'],
    ['composer-2.5-fast', 'composer'],
    ['Composer 2.5 Fast', 'composer'],
    ['glm-5.2', 'glm'],
  ] as const)('classifies %s as %s', (value, expected) => {
    expect(classifyModelFamily({ value })).toBe(expected);
  });

  it('uses structured provider ids before model-value patterns', () => {
    expect(
      classifyModelFamily({
        value: 'not-a-recognized-model',
        providerId: 'openai',
      }),
    ).toBe('openai');
    expect(
      classifyModelFamily({
        value: 'gpt-5.5-high',
        providerId: 'anthropic',
      }),
    ).toBe('claude');
  });

  it('falls back to unknown for unrecognized values', () => {
    expect(classifyModelFamily({ value: 'mystery-model' })).toBe('unknown');
  });

  it('does not throw for blank or malformed runtime values', () => {
    expect(classifyModelFamily({ value: '' })).toBe('unknown');
    expect(classifyModelFamily({ value: undefined as unknown as string })).toBe(
      'unknown',
    );
  });
});
