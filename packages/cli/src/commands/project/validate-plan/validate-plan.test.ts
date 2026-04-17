import { describe, expect, it } from 'vitest';

import {
  extractPhaseIdsFromPlan,
  parseFrontmatterFromContent,
  validateParallelGroups,
} from './validate-plan';

describe('validateParallelGroups', () => {
  const phaseIds = ['p01', 'p02', 'p03', 'p04', 'p05'] as const;

  it('accepts undefined groups (no parallelism declared)', () => {
    expect(validateParallelGroups(undefined, phaseIds)).toEqual({
      valid: true,
    });
  });

  it('accepts empty array', () => {
    expect(validateParallelGroups([], phaseIds)).toEqual({ valid: true });
  });

  it('accepts a valid single group', () => {
    expect(validateParallelGroups([['p02', 'p03']], phaseIds)).toEqual({
      valid: true,
    });
  });

  it('accepts multiple valid groups', () => {
    expect(
      validateParallelGroups(
        [
          ['p02', 'p03'],
          ['p04', 'p05'],
        ],
        phaseIds,
      ),
    ).toEqual({ valid: true });
  });

  it('rejects non-array top-level value', () => {
    const result = validateParallelGroups('p02', phaseIds);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toMatch(/must be an array/i);
    }
  });

  it('rejects unknown phase ID', () => {
    const result = validateParallelGroups([['p02', 'p99']], phaseIds);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('p99'))).toBe(true);
    }
  });

  it('rejects singleton groups', () => {
    const result = validateParallelGroups([['p02']], phaseIds);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => /singleton|at least 2/i.test(e))).toBe(
        true,
      );
    }
  });

  it('rejects duplicate phase across groups', () => {
    const result = validateParallelGroups(
      [
        ['p02', 'p03'],
        ['p03', 'p04'],
      ],
      phaseIds,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.errors.some((e) => e.includes('p03') && e.includes('multiple')),
      ).toBe(true);
    }
  });

  it('rejects non-string phase ID inside group', () => {
    const result = validateParallelGroups([['p02', 42]], phaseIds);
    expect(result.valid).toBe(false);
  });

  it('rejects non-array group', () => {
    const result = validateParallelGroups(['p02'], phaseIds);
    expect(result.valid).toBe(false);
  });
});

describe('parseFrontmatterFromContent', () => {
  it('returns no-frontmatter for content with no frontmatter block', () => {
    const result = parseFrontmatterFromContent('# Plan\n\nSome content.');
    expect(result.kind).toBe('no-frontmatter');
    if (result.kind === 'no-frontmatter') {
      expect(result.data).toEqual({});
    }
  });

  it('returns ok for valid YAML frontmatter', () => {
    const content = '---\noat_plan_parallel_groups: [[p01, p02]]\n---\n# Plan';
    const result = parseFrontmatterFromContent(content);
    expect(result.kind).toBe('ok');
  });

  it('returns invalid for malformed YAML (unterminated array)', () => {
    const content = '---\noat_plan_parallel_groups: [  \n---\n# Plan';
    const result = parseFrontmatterFromContent(content);
    expect(result.kind).toBe('invalid');
    if (result.kind === 'invalid') {
      expect(result.message).toMatch(/malformed yaml/i);
    }
  });

  it('returns invalid when frontmatter parses to a non-object (e.g. array)', () => {
    const content = '---\n- item1\n- item2\n---\n# Plan';
    const result = parseFrontmatterFromContent(content);
    expect(result.kind).toBe('invalid');
  });
});

describe('extractPhaseIdsFromPlan', () => {
  it('extracts unique phase IDs from a plan', () => {
    const plan = `
### Task p01-t01: First
### Task p01-t02: Second
### Task p02-t01: Third
### Task p03-t01: Fourth
`;
    expect(extractPhaseIdsFromPlan(plan)).toEqual(['p01', 'p02', 'p03']);
  });

  it('returns empty array for a plan with no tasks', () => {
    expect(extractPhaseIdsFromPlan('just some text')).toEqual([]);
  });
});
