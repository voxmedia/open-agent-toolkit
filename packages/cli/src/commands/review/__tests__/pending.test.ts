import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createReviewPendingCommand, listPendingReviews } from '../pending';

const PROJECT = '.oat/projects/shared/demo';
const HEAD = 'a'.repeat(40);
const SKIP_LINE =
  'Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)';

const WIDE_HEADER = [
  '| Scope | Type | Status | Date | Artifact | Reviewed Head | Invocation | Gate Target |',
  '| ----- | ---- | ------ | ---- | -------- | ------------- | ---------- | ----------- |',
];

const tempDirs: string[] = [];

afterEach(async () => {
  process.exitCode = undefined;
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

function row(scope: string, type: string, status: string): string {
  const recorded = status !== 'pending';
  return `| ${scope} | ${type} | ${status} | ${recorded ? '2026-11-03' : '-'} | ${recorded ? `reviews/archived/${scope}-review.md` : '-'} | ${recorded ? HEAD : '-'} | ${recorded ? 'manual' : '-'} | - |`;
}

interface PlanParts {
  phases: string[];
  rows: string[];
  milestones?: string[];
  reviewsNote?: string[];
  /** Phases declared `**Provisional:** yes`. */
  provisional?: string[];
}

/** A goal-shaped brief: phase blocks, an optional Milestones table, a ledger. */
function plan({
  phases,
  rows,
  milestones,
  reviewsNote = [],
  provisional = [],
}: PlanParts): string {
  return [
    '# Project Brief: demo',
    '',
    ...(milestones
      ? [
          '## Milestones',
          '',
          '| Milestone | Phases |',
          '| --------- | ------ |',
          ...milestones,
          '',
        ]
      : []),
    ...phases.flatMap((phase) => [
      `## Phase ${phase}: Work ${phase}`,
      '',
      '**Intent:** do it',
      '**Exit evidence:** it is done',
      `**Provisional:** ${provisional.includes(phase) ? 'yes' : 'no'}`,
      '',
    ]),
    '## Reviews',
    '',
    ...WIDE_HEADER,
    ...rows,
    '',
    ...reviewsNote,
    '',
    '## References',
    '',
  ].join('\n');
}

function journal(reviewsAndGates: string[], extra: string[] = []): string {
  return [
    '# Implementation: demo',
    '',
    ...extra,
    '## Reviews and Gates',
    '',
    '<!-- Receipts and one terminal line per gate run. -->',
    '',
    '### Review Received: plan',
    '',
    '**Outcome:** passed',
    '',
    ...reviewsAndGates,
    '',
    '## Deferred Findings',
    '',
    '## References',
    '',
  ].join('\n');
}

async function createProject(
  planContent: string,
  implementationContent?: string,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-review-pending-'));
  tempDirs.push(root);
  await mkdir(join(root, PROJECT), { recursive: true });
  await writeFile(join(root, PROJECT, 'plan.md'), planContent, 'utf8');
  if (implementationContent !== undefined) {
    await writeFile(
      join(root, PROJECT, 'implementation.md'),
      implementationContent,
      'utf8',
    );
  }
  return root;
}

async function list(root: string, scope: string) {
  return listPendingReviews({ repoRoot: root, projectPath: PROJECT, scope });
}

const keys = (entries: { scope: string; type: string }[]): string[] =>
  entries.map((entry) => `${entry.scope} ${entry.type}`);

const WAIVER_P02 =
  '**Review waived:** p02 code · **Waived by:** tstang · **Date:** 2026-11-03 · **Reason:** docs-only phase, reviewed in the final review';

describe('listPendingReviews', () => {
  it('lists pending phase rows and the pending plan row for a project scope', async () => {
    const root = await createProject(
      plan({
        phases: ['p01', 'p02', 'p03'],
        rows: [
          row('p01', 'code', 'passed'),
          row('p02', 'code', 'pending'),
          row('p03', 'code', 'fixes_completed'),
          row('plan', 'artifact', 'pending'),
        ],
      }),
    );

    const result = await list(root, 'project');

    expect(keys(result.pending)).toEqual(['p02 code', 'plan artifact']);
    expect(result.pending[0]).toMatchObject({ status: 'pending', row: 2 });
    expect(result.waived).toEqual([]);
    expect(keys(result.required)).toEqual([
      'p01 code',
      'p02 code',
      'p03 code',
      'plan artifact',
    ]);
  });

  it('lists nothing for a fully reviewed project', async () => {
    const root = await createProject(
      plan({
        phases: ['p01', 'p02'],
        rows: [
          row('p01', 'code', 'pending'),
          row('p02', 'code', 'pending'),
          row('plan', 'artifact', 'pending'),
          row('p01', 'code', 'passed'),
          row('p02', 'code', 'passed'),
          row('plan', 'artifact', 'passed'),
        ],
      }),
    );

    expect((await list(root, 'project')).pending).toEqual([]);
  });

  it('never lists spec, design, final, milestone rows, a skip-lined plan row or a phase the plan does not declare', async () => {
    const root = await createProject(
      plan({
        phases: ['p01'],
        rows: [
          row('p01', 'code', 'passed'),
          row('p02', 'code', 'pending'),
          row('spec', 'artifact', 'pending'),
          row('design', 'artifact', 'pending'),
          row('final', 'code', 'pending'),
          row('m01', 'code', 'pending'),
          row('plan', 'artifact', 'pending'),
        ],
        reviewsNote: [SKIP_LINE],
      }),
    );

    const project = await list(root, 'project');
    expect(project.pending).toEqual([]);
    expect(project.scope.plan).toBe('skipped');
    expect(keys(project.required)).toEqual(['p01 code']);

    const phases = await list(root, 'p01,p02');
    expect(phases.pending).toEqual([]);
    expect(phases.scope).toMatchObject({ phases: ['p01'], ignored: ['p02'] });
  });

  it('reads the latest row per Scope + Type, so a later pending placeholder is pending again', async () => {
    const root = await createProject(
      plan({
        phases: ['p01'],
        rows: [row('p01', 'code', 'passed'), row('p01', 'code', 'pending')],
      }),
    );

    expect(keys((await list(root, 'p01')).pending)).toEqual(['p01 code']);
  });

  it('expands an mNN scope through the Milestones table and excludes the plan row', async () => {
    const root = await createProject(
      plan({
        phases: ['p01', 'p02', 'p03'],
        milestones: ['| m01 | p01, p03 |', '| m02 | p02 |'],
        rows: [
          row('p01', 'code', 'pending'),
          row('p02', 'code', 'pending'),
          row('p03', 'code', 'pending'),
          row('plan', 'artifact', 'pending'),
        ],
      }),
    );

    const m01 = await list(root, 'm01');
    expect(m01.scope).toMatchObject({
      kind: 'milestone',
      phases: ['p01', 'p03'],
      plan: 'not-in-scope',
    });
    expect(keys(m01.pending)).toEqual(['p01 code', 'p03 code']);
    expect(keys((await list(root, 'm2')).pending)).toEqual(['p02 code']);
  });

  it('refuses a milestone the Milestones table cannot resolve and a malformed scope', async () => {
    const root = await createProject(
      plan({
        phases: ['p01'],
        milestones: ['| m01 | p01 |'],
        rows: [row('p01', 'code', 'pending')],
      }),
    );

    await expect(list(root, 'm09')).rejects.toThrow(/m09 does not resolve/);
    await expect(list(root, 'p01,final')).rejects.toThrow(/--scope must be/);
  });

  it('moves a waived required row from pending to waived while the row stays pending', async () => {
    const planContent = plan({
      phases: ['p01', 'p02'],
      rows: [row('p01', 'code', 'pending'), row('p02', 'code', 'pending')],
    });
    const root = await createProject(planContent, journal([WAIVER_P02]));

    const result = await list(root, 'p01,p02');

    expect(keys(result.pending)).toEqual(['p01 code']);
    expect(result.waived).toEqual([
      {
        scope: 'p02',
        type: 'code',
        status: 'pending',
        row: 2,
        waiver: {
          line: expect.any(Number),
          waivedBy: 'tstang',
          date: '2026-11-03',
          reason: 'docs-only phase, reviewed in the final review',
        },
      },
    ]);
    expect(result.waivers).toMatchObject([
      { scope: 'p02', type: 'code', applied: true, unapplied: null },
    ]);
    // A second run sees the same state: the waiver still applies.
    expect(keys((await list(root, 'p01,p02')).pending)).toEqual(['p01 code']);
    // The listing never writes: the ledger row is still pending.
    await expect(
      readFile(join(root, PROJECT, 'plan.md'), 'utf8'),
    ).resolves.toBe(planContent);
  });

  it('reads a waiver reformatted as a list item with backticked scope and type', async () => {
    const root = await createProject(
      plan({ phases: ['p02'], rows: [row('p02', 'code', 'pending')] }),
      journal([
        '- **Review waived:** `p2` `code` · **Waived by:** tstang · **Date:** 2026-11-03 · **Reason:** covered elsewhere · see the final review',
      ]),
    );

    const result = await list(root, 'p02');

    expect(result.pending).toEqual([]);
    expect(result.waived[0]?.waiver.reason).toBe(
      'covered elsewhere · see the final review',
    );
  });

  it('lists a concrete phase with no Reviews row as missing, and a provisional phase with no row nowhere', async () => {
    const root = await createProject(
      plan({
        phases: ['p01', 'p02', 'p03', 'p04'],
        provisional: ['p04'],
        rows: [row('p01', 'code', 'pending'), row('p02', 'code', 'passed')],
      }),
    );

    const result = await list(root, 'project');

    expect(keys(result.pending)).toEqual(['p01 code']);
    expect(result.missing).toEqual([
      { scope: 'p03', type: 'code', status: null, row: null },
    ]);
    expect(keys(result.required)).toEqual([
      'p01 code',
      'p02 code',
      'p03 code',
      'p04 code',
      'plan artifact',
    ]);
    // The plan row has no phase: without a row it is not listed as missing.
    expect(result.required.at(-1)).toMatchObject({ status: null });
    expect(result.waived).toEqual([]);
  });

  it('moves a waived missing key to waived and leaves a provisional phase waiver unapplied', async () => {
    const root = await createProject(
      plan({
        phases: ['p02', 'p03'],
        provisional: ['p03'],
        rows: [],
      }),
      journal([
        WAIVER_P02,
        '**Review waived:** p03 code · **Waived by:** tstang · **Date:** 2026-11-03 · **Reason:** not concrete yet',
      ]),
    );

    const result = await list(root, 'p02,p03');

    expect(result.missing).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.waived).toMatchObject([
      {
        scope: 'p02',
        type: 'code',
        status: null,
        row: null,
        waiver: { reason: 'docs-only phase, reviewed in the final review' },
      },
    ]);
    expect(
      result.waivers.map((waiver) => [waiver.scope, waiver.unapplied]),
    ).toEqual([
      ['p02', null],
      ['p03', 'no-row'],
    ]);
  });

  it('keeps a missing key listed when its waiver has no reason', async () => {
    const root = await createProject(
      plan({ phases: ['p02'], rows: [] }),
      journal([
        '**Review waived:** p02 code · **Waived by:** tstang · **Date:** 2026-11-03',
      ]),
    );

    const result = await list(root, 'p02');

    expect(keys(result.missing)).toEqual(['p02 code']);
    expect(result.waivers).toMatchObject([{ unapplied: 'missing-reason' }]);
  });

  it('leaves a waiver unapplied for a non-required key, a recorded review, a provisional phase with no row or a missing reason', async () => {
    const root = await createProject(
      plan({
        phases: ['p01', 'p02', 'p03', 'p04'],
        provisional: ['p02'],
        rows: [
          row('p01', 'code', 'pending'),
          row('p01', 'code', 'passed'),
          row('p03', 'code', 'pending'),
          row('p04', 'code', 'pending'),
          row('final', 'code', 'pending'),
        ],
      }),
      journal([
        '**Review waived:** final code · **Waived by:** tstang · **Date:** 2026-11-03 · **Reason:** not needed',
        '**Review waived:** p01 code · **Waived by:** tstang · **Date:** 2026-11-03 · **Reason:** stale',
        '**Review waived:** p02 code · **Waived by:** tstang · **Date:** 2026-11-03 · **Reason:** none yet',
        '**Review waived:** p03 code · **Waived by:** tstang · **Date:** 2026-11-03',
        '**Review waived:** p04 code · **Waived by:** tstang · **Date:** 2026-11-03 · **Reason:** out of scope here',
      ]),
    );

    const result = await list(root, 'p01,p02,p03');

    expect(keys(result.pending)).toEqual(['p03 code']);
    expect(result.missing).toEqual([]);
    expect(result.waived).toEqual([]);
    expect(
      result.waivers.map((waiver) => [waiver.scope, waiver.unapplied]),
    ).toEqual([
      ['final', 'not-required'],
      ['p01', 'review-recorded'],
      ['p02', 'no-row'],
      ['p03', 'missing-reason'],
      ['p04', 'not-required'],
    ]);
  });

  describe('a waiver covers only the pending row it was written for', () => {
    // Rows 1 to 3 of the m02 exit gate rerun's M1 reproduction: the waived
    // pending row, a later recorded review, then a new pending row.
    const REVIEWED_THEN_PENDING = [
      row('p01', 'code', 'pending'),
      row('p01', 'code', 'passed'),
      row('p01', 'code', 'pending'),
    ];
    const waiver = (fields: string): string =>
      `**Review waived:** p01 code · ${fields}**Waived by:** operator · **Date:** 2026-11-03 · **Reason:** covered elsewhere`;

    async function listP01(rows: string[], waivers: string[]) {
      const root = await createProject(
        plan({ phases: ['p01'], rows }),
        journal(waivers),
      );
      return list(root, 'p01');
    }

    it('keeps a new pending row pending after a recorded review retired the waiver (gate M1 reproduction)', async () => {
      const result = await listP01(REVIEWED_THEN_PENDING, [
        '**Review waived:** p01 code · **Waived by:** operator · **Date:** 2026-11-01 · **Reason:** prior scope covered elsewhere',
      ]);

      expect(result.pending).toMatchObject([
        { scope: 'p01', type: 'code', status: 'pending', row: 3 },
      ]);
      expect(result.waived).toEqual([]);
      expect(result.waivers).toMatchObject([
        { row: null, applied: false, unapplied: 'review-recorded' },
      ]);
    });

    it('applies a waiver naming the pending row it covers', async () => {
      const result = await listP01(
        [row('p01', 'code', 'pending')],
        [waiver('**Row:** 1 · ')],
      );

      expect(result.pending).toEqual([]);
      expect(result.waived).toMatchObject([{ scope: 'p01', row: 1 }]);
      expect(result.waivers).toMatchObject([
        { row: '1', applied: true, unapplied: null },
      ]);
    });

    it('leaves a waiver inert once its row records a review and no later row exists', async () => {
      const result = await listP01(
        [row('p01', 'code', 'pending'), row('p01', 'code', 'passed')],
        [waiver('**Row:** 2 · '), waiver('**Row:** 1 · ')],
      );

      expect(result.pending).toEqual([]);
      expect(result.waived).toEqual([]);
      expect(result.waivers.map((entry) => entry.unapplied)).toEqual([
        'review-recorded',
        'row-mismatch',
      ]);
    });

    it('applies a fresh waiver naming the new pending row while the retired one stays inert', async () => {
      const result = await listP01(REVIEWED_THEN_PENDING, [
        waiver('**Row:** 1 · '),
        waiver('**Row:** 3 · '),
      ]);

      expect(result.pending).toEqual([]);
      expect(result.waived).toMatchObject([
        { row: 3, waiver: { line: result.waivers[1]?.line } },
      ]);
      expect(result.waivers.map((entry) => entry.unapplied)).toEqual([
        'row-mismatch',
        null,
      ]);
    });

    it('fails closed for a waiver it cannot bind to the latest pending row', async () => {
      // A rowless line written after a recorded review cannot be ordered
      // against it; a named row that a later placeholder replaced, a
      // malformed row and a row named for a key with no row do not bind.
      const reviewed = await listP01(REVIEWED_THEN_PENDING, [
        waiver(''),
        waiver('**Row:** 03 · '),
      ]);
      expect(keys(reviewed.pending)).toEqual(['p01 code']);
      expect(reviewed.waivers.map((entry) => entry.unapplied)).toEqual([
        'review-recorded',
        'row-mismatch',
      ]);

      const replaced = await listP01(
        [row('p01', 'code', 'pending'), row('p01', 'code', 'pending')],
        [waiver('**Row:** 1 · ')],
      );
      expect(keys(replaced.pending)).toEqual(['p01 code']);
      expect(replaced.waivers).toMatchObject([{ unapplied: 'row-mismatch' }]);

      const missing = await listP01([], [waiver('**Row:** 1 · ')]);
      expect(keys(missing.missing)).toEqual(['p01 code']);
      expect(missing.waivers).toMatchObject([{ unapplied: 'row-mismatch' }]);
    });

    it('reads `**Row:** -` as naming no row and never reads a row from the reason', async () => {
      const missing = await listP01([], [waiver('**Row:** - · ')]);
      expect(missing.missing).toEqual([]);
      expect(missing.waived).toMatchObject([{ scope: 'p01', row: null }]);
      expect(missing.waivers).toMatchObject([{ row: null, applied: true }]);

      const result = await listP01(REVIEWED_THEN_PENDING, [
        '**Review waived:** p01 code · **Waived by:** operator · **Date:** 2026-11-03 · **Reason:** see **Row:** 3',
      ]);
      expect(keys(result.pending)).toEqual(['p01 code']);
      expect(result.waivers).toMatchObject([
        { row: null, unapplied: 'review-recorded' },
      ]);
    });
  });

  it('applies only waiver lines recorded under ## Reviews and Gates', async () => {
    const root = await createProject(
      plan({ phases: ['p02'], rows: [row('p02', 'code', 'pending')] }),
      journal(
        ['```markdown', WAIVER_P02, '```'],
        ['## Phase p02: Work p02', '', WAIVER_P02, ''],
      ),
    );

    const result = await list(root, 'p02');

    expect(keys(result.pending)).toEqual(['p02 code']);
    expect(result.waivers).toEqual([]);
  });
});

describe('oat review pending', () => {
  async function run(
    root: string,
    args: string[],
  ): Promise<ReturnType<typeof createLoggerCapture>> {
    const capture = createLoggerCapture();
    const command = createReviewPendingCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: options.json ?? false,
        cwd: root,
        home: root,
        interactive: false,
        logger: capture.logger,
      }),
      resolveProjectRoot: vi.fn(async () => root),
      readOatLocalConfig: vi.fn(async () => ({
        version: 1,
        activeProject: PROJECT,
      })),
    });
    const program = new Command().option('--json').exitOverride();
    program.addCommand(new Command('review').addCommand(command));
    await program.parseAsync(['--json', 'review', 'pending', ...args], {
      from: 'user',
    });
    return capture;
  }

  it('exits 0 with the listing whether or not anything is pending', async () => {
    const root = await createProject(
      plan({ phases: ['p01'], rows: [row('p01', 'code', 'pending')] }),
    );

    const capture = await run(root, ['--scope', 'p01']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      project: PROJECT,
      pending: [{ scope: 'p01', type: 'code', status: 'pending' }],
      missing: [],
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports a concrete phase with no row in the JSON missing list', async () => {
    const root = await createProject(
      plan({
        phases: ['p01', 'p02', 'p03'],
        provisional: ['p02'],
        rows: [row('p01', 'code', 'passed')],
      }),
    );

    const capture = await run(root, ['--scope', 'p01,p02,p03']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      pending: [],
      missing: [{ scope: 'p03', type: 'code', status: null, row: null }],
    });
    expect(process.exitCode).toBe(0);
  });

  it('exits 1 without a scope, with an unresolvable scope or without a plan', async () => {
    const root = await createProject(
      plan({ phases: ['p01'], rows: [row('p01', 'code', 'pending')] }),
    );

    const missing = await run(root, []);
    expect(missing.jsonPayloads[0]).toMatchObject({ status: 'error' });
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    await run(root, ['--scope', 'm01']);
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    await rm(join(root, PROJECT, 'plan.md'));
    await run(root, ['--scope', 'project']);
    expect(process.exitCode).toBe(1);
  });
});
