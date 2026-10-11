import { describe, expect, it } from 'vitest';

import {
  extractPhaseIds,
  resolvePlanProfile,
  validateLitePlan,
  validatePlanForProfile,
  type PlanProfile,
  type ValidationContext,
} from './profiles';

function ctx(profile: PlanProfile): ValidationContext {
  return {
    profile,
    workflowMode:
      profile === 'task' ? 'quick' : profile === 'goal' ? null : profile,
    stateFrontmatter: null,
  };
}

function phaseBlock(
  id: string,
  options: {
    intent?: string | null;
    exit?: string | null;
    provisional?: string | null;
    extra?: string[];
  } = {},
): string[] {
  const intent = options.intent === undefined ? 'Do the work.' : options.intent;
  const exit =
    options.exit === undefined ? 'Tests pass in `pnpm test`.' : options.exit;
  return [
    `## Phase ${id}: Phase ${id}`,
    '',
    ...(intent === null ? [] : [`**Intent:** ${intent}`]),
    ...(exit === null ? [] : [`**Exit evidence:** ${exit}`]),
    ...(options.provisional == null
      ? []
      : [`**Provisional:** ${options.provisional}`]),
    '',
    ...(options.extra ?? []),
  ];
}

function briefPlan(blocks: string[][], groups = '[]'): string {
  return [
    '---',
    'oat_plan_source: brief',
    `oat_plan_parallel_groups: ${groups}`,
    '---',
    '',
    '# Project Brief',
    '',
    '## Phases',
    '',
    ...blocks.flat(),
    '## Parallelism',
    '',
    'Sequential.',
    '',
  ].join('\n');
}

function codes(content: string, profile: PlanProfile = 'brief'): string[] {
  return validatePlanForProfile(content, ctx(profile)).map(
    (issue) => issue.code,
  );
}

describe('resolvePlanProfile', () => {
  it('maps workflow modes to profiles', () => {
    expect(resolvePlanProfile('lite')).toBe('lite');
    expect(resolvePlanProfile('brief')).toBe('brief');
    expect(resolvePlanProfile('quick')).toBe('task');
    expect(resolvePlanProfile('spec-driven')).toBe('task');
    expect(resolvePlanProfile('import')).toBe('task');
    expect(resolvePlanProfile(null)).toBe('task');
  });
});

describe('extractPhaseIds', () => {
  it('keeps sorted unique task-heading extraction for task and lite profiles', () => {
    const plan = [
      '## Phase 2: Second',
      '### Task p02-t01: B',
      '## Phase 1: First',
      '### Task p01-t01: A',
      '### Task p01-t02: A2',
    ].join('\n');
    expect(extractPhaseIds(plan, 'task')).toEqual(['p01', 'p02']);
    expect(extractPhaseIds(plan, 'lite')).toEqual(['p01', 'p02']);
  });

  it('a quick plan with taskless phases yields no task-profile phase ids', () => {
    expect(extractPhaseIds(briefPlan([phaseBlock('p01')]), 'task')).toEqual([]);
  });

  it('returns normalized phase heading ids in document order for brief plans, including p-revN', () => {
    const plan = briefPlan([
      phaseBlock('p02'),
      phaseBlock('1'),
      phaseBlock('p-rev1'),
      phaseBlock('p03'),
    ]);
    expect(extractPhaseIds(plan, 'brief')).toEqual([
      'p02',
      'p01',
      'p-rev1',
      'p03',
    ]);
    expect(extractPhaseIds(plan, 'goal')).toEqual([
      'p02',
      'p01',
      'p-rev1',
      'p03',
    ]);
  });

  it('ignores a fenced example phase heading', () => {
    const plan = briefPlan([
      phaseBlock('p01', {
        extra: ['```markdown', '## Phase p09: Example', '```', ''],
      }),
    ]);
    expect(extractPhaseIds(plan, 'brief')).toEqual(['p01']);
  });
});

describe('validatePlanForProfile: brief', () => {
  it('accepts two taskless phases with intent and exit evidence', () => {
    expect(
      validatePlanForProfile(
        briefPlan([
          phaseBlock('p01'),
          phaseBlock('p02', { provisional: 'no' }),
        ]),
        ctx('brief'),
      ),
    ).toEqual([]);
  });

  it('accepts a later provisional phase and a multi-line intent', () => {
    const plan = briefPlan([
      [
        '## Phase p01: First',
        '',
        '**Intent:**',
        'Spread over a second line.',
        '**Exit evidence:** Tests pass.',
        '',
      ],
      phaseBlock('p02', { provisional: 'yes' }),
    ]);
    expect(codes(plan)).toEqual([]);
  });

  it('reports brief-no-phases when the plan declares no phase block', () => {
    expect(codes(briefPlan([]))).toEqual(['brief-no-phases']);
  });

  it('reports brief-no-phases when the only phase block is fenced', () => {
    const plan = briefPlan([['```markdown', ...phaseBlock('p01'), '```', '']]);
    expect(codes(plan)).toEqual(['brief-no-phases']);
  });

  it('reports brief-duplicate-phase once per repeated normalized id', () => {
    const plan = briefPlan([
      phaseBlock('p01'),
      phaseBlock('1'),
      phaseBlock('p01'),
    ]);
    expect(codes(plan)).toEqual(['brief-duplicate-phase']);
  });

  it('reports brief-phase-missing-intent for an absent or empty intent', () => {
    expect(
      codes(
        briefPlan([phaseBlock('p01'), phaseBlock('p02', { intent: null })]),
      ),
    ).toEqual(['brief-phase-missing-intent']);
    expect(codes(briefPlan([phaseBlock('p01', { intent: '' })]))).toEqual([
      'brief-phase-missing-intent',
    ]);
  });

  it('reports brief-phase-missing-exit-evidence for an absent exit evidence line', () => {
    expect(codes(briefPlan([phaseBlock('p01', { exit: null })]))).toEqual([
      'brief-phase-missing-exit-evidence',
    ]);
  });

  it('does not read a marker owned by a following subheading', () => {
    const plan = briefPlan([
      phaseBlock('p01', {
        exit: null,
        extra: ['### Notes', '', '**Exit evidence:** owned by Notes', ''],
      }),
    ]);
    expect(codes(plan)).toContain('brief-phase-missing-exit-evidence');
  });

  it('reports brief-provisional-invalid for a value other than yes or no', () => {
    expect(
      codes(
        briefPlan([
          phaseBlock('p01'),
          phaseBlock('p02', { provisional: 'maybe' }),
        ]),
      ),
    ).toEqual(['brief-provisional-invalid']);
    expect(
      codes(
        briefPlan([
          phaseBlock('p01'),
          phaseBlock('p02', { provisional: 'Yes' }),
        ]),
      ),
    ).toEqual(['brief-provisional-invalid']);
  });

  it('reports brief-provisional-invalid for a marker without the space the progress parser requires', () => {
    const plan = briefPlan([
      phaseBlock('p01'),
      [
        '## Phase p02: Later',
        '',
        '**Intent:** x',
        '**Exit evidence:** y',
        '**Provisional:**yes',
        '',
      ],
    ]);
    expect(codes(plan)).toEqual(['brief-provisional-invalid']);
  });

  it('reports brief-first-phase-provisional', () => {
    expect(
      codes(
        briefPlan([
          phaseBlock('p01', { provisional: 'yes' }),
          phaseBlock('p02'),
        ]),
      ),
    ).toEqual(['brief-first-phase-provisional']);
  });

  it('reports brief-malformed-phase-heading for an unparseable phase heading', () => {
    const plan = briefPlan([
      phaseBlock('p01'),
      [
        '## Phase two: Spelled out',
        '',
        '**Intent:** x',
        '**Exit evidence:** y',
        '',
      ],
      ['## Phase p03 Missing colon', ''],
    ]);
    expect(codes(plan)).toEqual([
      'brief-malformed-phase-heading',
      'brief-malformed-phase-heading',
    ]);
  });

  it('does not treat the ## Phases section heading as a phase', () => {
    expect(codes(briefPlan([phaseBlock('p01')]))).toEqual([]);
  });

  it('warns brief-task-headings-ignored for a task heading under a brief phase', () => {
    const issues = validatePlanForProfile(
      briefPlan([
        phaseBlock('p01', { extra: ['### Task p01-t01: Authored task', ''] }),
      ]),
      ctx('brief'),
    );
    expect(issues).toEqual([
      {
        severity: 'warning',
        code: 'brief-task-headings-ignored',
        message: expect.stringContaining('p01'),
      },
    ]);
  });

  it('ignores a fenced example task heading', () => {
    expect(
      codes(
        briefPlan([
          phaseBlock('p01', {
            extra: ['```markdown', '### Task p01-t01: Example', '```', ''],
          }),
        ]),
      ),
    ).toEqual([]);
  });

  it('validates the goal profile with the brief rules', () => {
    expect(codes(briefPlan([]), 'goal')).toEqual(['brief-no-phases']);
  });
});

function litePlan(
  options: { phases?: number; groups?: string; criteria?: string[] } = {},
): string {
  const phases = options.phases ?? 1;
  const criteria = options.criteria ?? [
    '- [ ] Focused behavior passes — Check: `pnpm test`',
    '- manual: inspect the generated project state',
  ];
  return [
    '---',
    `oat_plan_parallel_groups: ${options.groups ?? '[]'}`,
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

describe('validatePlanForProfile: lite', () => {
  it.each([
    ['multi-phase', litePlan({ phases: 2 }), 'lite-multi-phase'],
    [
      'parallel groups',
      litePlan({ groups: '[[p01]]' }),
      'lite-parallel-groups',
    ],
    [
      'commandless criterion',
      litePlan({ criteria: ['- [ ] The feature works correctly'] }),
      'lite-criterion-without-command',
    ],
  ])(
    'reports the %s rule exactly as validateLitePlan does',
    (_, plan, code) => {
      const lite = validateLitePlan(plan, 'lite');
      expect(lite.ok).toBe(false);
      expect(validatePlanForProfile(plan, ctx('lite'))).toEqual([
        {
          severity: 'error',
          code,
          message: lite.ok ? '' : lite.message,
        },
      ]);
    },
  );

  it('accepts a valid single-phase lite plan', () => {
    expect(validatePlanForProfile(litePlan(), ctx('lite'))).toEqual([]);
  });

  it('applies no profile rules to task plans', () => {
    expect(
      validatePlanForProfile(litePlan({ phases: 2 }), ctx('task')),
    ).toEqual([]);
  });
});
