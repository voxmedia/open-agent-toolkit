import { describe, expect, it } from 'vitest';

import { PURPOSE_POLICIES, composePurposePolicies } from './purpose-policy';

describe('composePurposePolicies', () => {
  it.each([
    ['source', ['inbound'], ['annotate', 'transition'], 'propose', 'propose'],
    [
      'planning',
      ['inbound', 'outbound'],
      ['annotate', 'transition'],
      'propose',
      'propose',
    ],
    ['delivery', [], [], 'none', 'provider-automation'],
    ['reference', [], [], 'none', 'none'],
  ] as const)(
    'applies the %s single-purpose defaults',
    (purpose, directions, lifecycle, annotation, transition) => {
      const result = composePurposePolicies([purpose]);

      expect(result.fields).toEqual({
        title: [...directions],
        description: [...directions],
        priority: [...directions],
      });
      expect(result.lifecycle).toEqual([...lifecycle]);
      expect(result.closeout).toEqual({ annotation, transition });
      expect(result.choiceRequired).toBe(false);
    },
  );

  it('intersects multi-purpose field and lifecycle grants instead of unioning them', () => {
    expect(composePurposePolicies(['source', 'planning'])).toEqual({
      purposes: ['source', 'planning'],
      fields: {
        title: ['inbound'],
        description: ['inbound'],
        priority: ['inbound'],
      },
      lifecycle: ['annotate', 'transition'],
      closeout: { annotation: 'propose', transition: 'propose' },
      choiceRequired: false,
      noOp: false,
    });

    const referencePlanning = composePurposePolicies(['planning', 'reference']);
    expect(referencePlanning.fields.title).toEqual([]);
    expect(referencePlanning.lifecycle).toEqual([]);
    expect(referencePlanning.closeout).toEqual({
      annotation: 'none',
      transition: 'none',
    });
    expect(referencePlanning.noOp).toBe(true);
  });

  it('returns choice-required for incompatible closeout transition policies', () => {
    const result = composePurposePolicies(['source', 'delivery']);

    expect(result.fields).toEqual({ title: [], description: [], priority: [] });
    expect(result.lifecycle).toEqual([]);
    expect(result.closeout).toEqual({
      annotation: 'none',
      transition: 'choice-required',
    });
    expect(result.choiceRequired).toBe(true);
    expect(result.noOp).toBe(true);
  });

  it('rejects empty, duplicated, or unknown purposes instead of granting defaults', () => {
    expect(() => composePurposePolicies([])).toThrow(/at least one purpose/i);
    expect(() => composePurposePolicies(['source', 'source'])).toThrow(
      /unique/i,
    );
    expect(() =>
      composePurposePolicies(['source', 'unknown'] as never),
    ).toThrow(/unknown purpose/i);
  });

  it('keeps the exported default matrix immutable to callers', () => {
    expect(Object.isFrozen(PURPOSE_POLICIES)).toBe(true);
    expect(Object.isFrozen(PURPOSE_POLICIES.source.fields.title)).toBe(true);
  });
});
