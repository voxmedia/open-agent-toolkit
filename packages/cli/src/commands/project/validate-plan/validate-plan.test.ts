import { describe, expect, it } from 'vitest';

import { createProjectValidatePlanCommand } from './index';
import {
  extractPhaseIdsFromPlan,
  parseFrontmatterFromContent,
  validateLitePlan,
  validateParallelGroups,
} from './validate-plan';

function litePlan(
  options: {
    phases?: number;
    groups?: string;
    criteria?: string[];
  } = {},
): string {
  const phases = options.phases ?? 1;
  const groups = options.groups ?? '[]';
  const criteria = options.criteria ?? [
    '- [ ] Focused behavior passes — Check: `pnpm test`',
    '- manual: inspect the generated project state',
  ];
  return [
    '---',
    `oat_plan_parallel_groups: ${groups}`,
    '---',
    '',
    '# Lite Plan',
    '',
    '## Validation Criteria',
    '',
    ...criteria,
    '',
    ...Array.from({ length: phases }, (_, index) => [
      `## Phase ${index + 1}: Phase ${index + 1}`,
      '',
      `### Task p${String(index + 1).padStart(2, '0')}-t01: Task`,
      '',
    ]).flat(),
  ].join('\n');
}

describe('validateLitePlan', () => {
  it('returns lite-multi-phase when a lite plan has two phase headings', () => {
    expect(validateLitePlan(litePlan({ phases: 2 }), 'lite')).toEqual({
      ok: false,
      code: 'lite-multi-phase',
      message: expect.stringContaining('exactly one phase'),
    });
  });

  it('returns lite-parallel-groups for non-empty lite parallel groups', () => {
    expect(validateLitePlan(litePlan({ groups: '[[p01]]' }), 'lite')).toEqual({
      ok: false,
      code: 'lite-parallel-groups',
      message: expect.stringContaining('no parallel groups'),
    });
  });

  it('returns lite-criterion-without-command for a commandless criterion', () => {
    expect(
      validateLitePlan(
        litePlan({ criteria: ['- [ ] The feature works correctly'] }),
        'lite',
      ),
    ).toEqual({
      ok: false,
      code: 'lite-criterion-without-command',
      message: expect.stringContaining('command'),
    });
  });

  it('accepts a single-phase lite plan when every criterion names a command or manual check', () => {
    expect(validateLitePlan(litePlan(), 'lite')).toEqual({ ok: true });
  });

  it('does not apply lite invariants to quick plans', () => {
    expect(validateLitePlan(litePlan({ phases: 2 }), 'quick')).toEqual({
      ok: true,
    });
  });
});

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
      expect(result.errors[0]).toMatch(/run a solo lane as an ungrouped phase/);
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

describe('validate-plan help', () => {
  it('states the singleton-group rule and ungrouped alternative', () => {
    const help = createProjectValidatePlanCommand().helpInformation();

    expect(help).toMatch(/singleton\s+groups are not allowed/i);
    expect(help).toMatch(/run a solo lane as an ungrouped\s+phase/i);
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
