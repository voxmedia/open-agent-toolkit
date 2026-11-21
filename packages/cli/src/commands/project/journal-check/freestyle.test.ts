import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  contextFactory,
  createLoggerCapture,
  PROJECT_REL,
  runProjectSubcommand,
} from '@commands/project/closeout-check/__tests__/fixtures';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PLAN, STATE } from './__tests__/fixtures';
import { evaluateFreestyleJournal } from './evaluator';
import { createProjectJournalCommand } from './index';

const FREESTYLE_STATE = [
  '---',
  'oat_workflow_mode: freestyle',
  "oat_project_created: '2026-07-17T09:00:00.000Z'",
  'oat_generated: false',
  '---',
  '',
  '# Project State: demo',
  '',
].join('\n');

/** Two OAT phases, one project-native phase id. */
const FREESTYLE_PLAN = [
  '# Plan',
  '',
  '## Phase p01: First',
  '',
  'Intent.',
  '',
  '## Phase p02: Second',
  '',
  'Intent.',
  '',
  '## Phase P7: Native',
  '',
  'Intent.',
  '',
].join('\n');

/** p01 with a closed record, a native lane phase, and p03 in the journal only. */
const FREESTYLE_JOURNAL = [
  '# Journal',
  '',
  '## Phase p01: First',
  '',
  '**Status:** completed',
  '',
  '### Task p01-t01: Do the thing',
  '',
  '**Status:** completed',
  '**Commit:** abc1234',
  '',
  '## Phase A-1a: Native lane',
  '',
  '### Task p02-t09: Not under its phase, but in a skipped one',
  '',
  '**Status:** completed',
  '',
  '## Phase p03: Journal only',
  '',
  '**Status:** in_progress',
  '',
  '### Task p03-t01: Running',
  '',
  '**Status:** in_progress',
  '',
].join('\n');

type Variant = 'both' | 'neither' | 'plan only' | 'journal only';

const EXPECTED: Record<
  Variant,
  {
    missing: string[];
    recognized: number;
    validated: number;
    skipped: number;
    outcomes: Array<[string, string, string | null]>;
  }
> = {
  both: {
    missing: [],
    recognized: 3,
    validated: 2,
    skipped: 3,
    outcomes: [
      ['p01', 'validated', null],
      ['p02', 'skipped', 'no-journal-section'],
      ['p03', 'validated', null],
      ['P7', 'skipped', 'unrecognized-phase-id'],
      ['A-1a', 'skipped', 'unrecognized-phase-id'],
    ],
  },
  neither: {
    missing: ['plan.md', 'implementation.md'],
    recognized: 0,
    validated: 0,
    skipped: 0,
    outcomes: [],
  },
  'plan only': {
    missing: ['implementation.md'],
    recognized: 2,
    validated: 0,
    skipped: 3,
    outcomes: [
      ['p01', 'skipped', 'journal-missing'],
      ['p02', 'skipped', 'journal-missing'],
      ['P7', 'skipped', 'unrecognized-phase-id'],
    ],
  },
  'journal only': {
    missing: ['plan.md'],
    recognized: 2,
    validated: 2,
    skipped: 1,
    outcomes: [
      ['p01', 'validated', null],
      ['p03', 'validated', null],
      ['A-1a', 'skipped', 'unrecognized-phase-id'],
    ],
  },
};

describe('oat project journal check on a freestyle project', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode as number | undefined;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  async function project(files: {
    state?: string;
    plan?: string | null;
    journal?: string | null;
  }) {
    const root = await mkdtemp(join(tmpdir(), 'oat-journal-freestyle-'));
    tempDirs.push(root);
    const projectPath = join(root, PROJECT_REL);
    await mkdir(projectPath, { recursive: true });
    await writeFile(
      join(projectPath, 'state.md'),
      files.state ?? FREESTYLE_STATE,
    );
    if (files.plan != null) {
      await writeFile(join(projectPath, 'plan.md'), files.plan);
    }
    if (files.journal != null) {
      await writeFile(join(projectPath, 'implementation.md'), files.journal);
    }
    return { root, home: root, projectPath };
  }

  function variantFiles(variant: Variant) {
    return {
      plan:
        variant === 'both' || variant === 'plan only' ? FREESTYLE_PLAN : null,
      journal:
        variant === 'both' || variant === 'journal only'
          ? FREESTYLE_JOURNAL
          : null,
    };
  }

  async function run(
    fixture: { root: string; home: string },
    args: string[],
    json = true,
  ) {
    const capture = createLoggerCapture();
    process.exitCode = undefined;
    await runProjectSubcommand(
      createProjectJournalCommand({
        resolveProjectRoot: async () => fixture.root,
        // No active project: the freestyle check must resolve by path.
        resolveActiveProject: async () => ({ status: 'unset' }) as never,
        buildCommandContext: contextFactory(fixture, capture),
      }),
      'journal',
      ['check', ...args],
      json ? ['--json'] : [],
    );
    return { capture, exitCode: process.exitCode as number | undefined };
  }

  it.each(
    (['both', 'neither', 'plan only', 'journal only'] as const).flatMap(
      (variant) =>
        (['implement-preflight', 'completion'] as const).map(
          (boundary) => [variant, boundary] as const,
        ),
    ),
  )(
    'reports coverage with %s of plan.md and implementation.md at %s and exits 0',
    async (variant, boundary) => {
      const fixture = await project(variantFiles(variant));
      const before = (await readdir(fixture.projectPath)).sort();
      const { capture, exitCode } = await run(fixture, [
        '--project',
        PROJECT_REL,
        '--at',
        boundary,
      ]);
      const expected = EXPECTED[variant];
      expect(exitCode).toBe(0);
      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        boundary,
        workflowMode: 'freestyle',
        reasons: [],
        coverage: {
          missing: expected.missing,
          recognized: expected.recognized,
          validated: expected.validated,
          skipped: expected.skipped,
        },
      });
      const payload = capture.jsonPayloads[0] as {
        coverage: {
          phases: Array<{ id: string; outcome: string; reason: string | null }>;
        };
      };
      expect(
        payload.coverage.phases.map((phase) => [
          phase.id,
          phase.outcome,
          phase.reason,
        ]),
      ).toEqual(expected.outcomes);
      // Read-only: nothing is created for the missing documents.
      expect((await readdir(fixture.projectPath)).sort()).toEqual(before);
    },
  );

  it('names the sources and the skip reason of each phase', async () => {
    const fixture = await project(variantFiles('both'));
    const { capture } = await run(fixture, [
      '--at',
      'completion',
      '--project',
      PROJECT_REL,
    ]);
    const { coverage } = capture.jsonPayloads[0] as {
      coverage: { phases: Array<Record<string, unknown>> };
    };
    expect(coverage.phases[0]).toEqual({
      id: 'p01',
      heading: 'Phase p01: First',
      outcome: 'validated',
      reason: null,
      message: null,
      sources: [
        { path: 'plan.md', line: 3 },
        { path: 'implementation.md', line: 3 },
      ],
    });
    expect(coverage.phases[3]).toEqual({
      id: 'P7',
      heading: 'Phase P7: Native',
      outcome: 'skipped',
      reason: 'unrecognized-phase-id',
      message:
        'P7 is not an OAT phase id (pNN or p-revN), so no record rule applies to it and its records are not validated.',
      sources: [{ path: 'plan.md', line: 11 }],
    });
  });

  it('prints the coverage report and the missing inputs as text', async () => {
    const fixture = await project(variantFiles('plan only'));
    const { capture, exitCode } = await run(
      fixture,
      ['--project', PROJECT_REL, '--at', 'completion'],
      false,
    );
    expect(exitCode).toBe(0);
    expect(capture.info).toEqual([
      'Journal coverage (freestyle) at completion: 2 phases recognized, 0 validated, 3 skipped.',
      'Missing: implementation.md (reported, not an error).',
      'No phase records were validated.',
      '- p01 skipped, journal-missing (plan.md:3): implementation.md is absent, so phase p01 has no records to validate.',
      '- p02 skipped, journal-missing (plan.md:7): implementation.md is absent, so phase p02 has no records to validate.',
      '- P7 skipped, unrecognized-phase-id (plan.md:11): P7 is not an OAT phase id (pNN or p-revN), so no record rule applies to it and its records are not validated.',
    ]);
  });

  it('reports zero recognized phases on a project with neither document as text', async () => {
    const fixture = await project(variantFiles('neither'));
    const { capture, exitCode } = await run(
      fixture,
      ['--project', PROJECT_REL, '--at', 'implement-preflight'],
      false,
    );
    expect(exitCode).toBe(0);
    expect(capture.info).toEqual([
      'Journal coverage (freestyle) at implement-preflight: 0 phases recognized, 0 validated, 0 skipped.',
      'Missing: plan.md, implementation.md (reported, not an error).',
      'No phase records were validated.',
    ]);
  });

  it('limits validation to --scope at review and skips the rest as out-of-scope', async () => {
    const fixture = await project(variantFiles('both'));
    const { capture, exitCode } = await run(fixture, [
      '--project',
      PROJECT_REL,
      '--at',
      'review',
      '--scope',
      'p1',
    ]);
    expect(exitCode).toBe(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      scope: ['p01'],
      coverage: { recognized: 3, validated: 1, skipped: 4 },
    });
    const { coverage } = capture.jsonPayloads[0] as {
      coverage: { phases: Array<{ id: string; reason: string | null }> };
    };
    expect(coverage.phases.find((phase) => phase.id === 'p03')?.reason).toBe(
      'out-of-scope',
    );
  });

  it('refuses a --scope that names no phase in either document', async () => {
    const fixture = await project(variantFiles('journal only'));
    const { capture, exitCode } = await run(fixture, [
      '--project',
      PROJECT_REL,
      '--at',
      'review',
      '--scope',
      'p02',
    ]);
    expect(exitCode).toBe(1);
    expect(capture.jsonPayloads[0]).toEqual({
      status: 'error',
      message: '--scope p02 names no phase in plan.md or implementation.md.',
    });
  });

  it.each([
    [
      'a second section for a validated phase',
      `${FREESTYLE_JOURNAL}\n## Phase p01: First again\n`,
      'phase-duplicate-section',
    ],
    [
      'a completed record with no commit',
      FREESTYLE_JOURNAL.replace('**Commit:** abc1234\n', ''),
      'task-commit-missing',
    ],
    [
      'two statuses on one record',
      FREESTYLE_JOURNAL.replace(
        '**Commit:** abc1234\n',
        '**Commit:** abc1234\n**Status:** failed\n',
      ),
      'task-status-ambiguous',
    ],
    [
      'a record outside its own phase',
      FREESTYLE_JOURNAL.replace(
        '### Task p03-t01: Running',
        '### Task p01-t02: Misfiled',
      ),
      'task-misplaced',
    ],
  ])(
    'refuses %s, owned by shape.md, and still reports coverage',
    async (_label, journal, code) => {
      const fixture = await project({ plan: FREESTYLE_PLAN, journal });
      const { capture, exitCode } = await run(fixture, [
        '--project',
        PROJECT_REL,
        '--at',
        'completion',
      ]);
      expect(exitCode).toBe(1);
      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'refused',
        reasons: [{ code, path: 'implementation.md', owner: 'shape.md' }],
        coverage: { recognized: 3 },
      });
    },
  );

  it('applies no record rule to a phase it skipped', () => {
    // p02-t09 is completed with no commit, but it sits under the native A-1a
    // section and p02 has no journal section, so p02 is skipped, not checked.
    const result = evaluateFreestyleJournal({
      boundary: 'completion',
      planContent: FREESTYLE_PLAN,
      journalContent: FREESTYLE_JOURNAL,
      stateContent: FREESTYLE_STATE,
    });
    expect(result.status).toBe('ok');
    expect(result.reasons).toEqual([]);
  });

  describe('existing-mode controls on the same command path', () => {
    it('still refuses a spec-driven project without plan.md as a command error', async () => {
      const fixture = await project({
        state: STATE,
        plan: null,
        journal: FREESTYLE_JOURNAL,
      });
      const { capture, exitCode } = await run(fixture, [
        '--project',
        PROJECT_REL,
        '--at',
        'completion',
      ]);
      expect(exitCode).toBe(1);
      expect(capture.jsonPayloads[0]).toEqual({
        status: 'error',
        message: `Project plan.md not found: ${join(fixture.projectPath, 'plan.md')}`,
      });
    });

    it('still refuses a spec-driven project without implementation.md', async () => {
      const fixture = await project({
        state: STATE,
        plan: PLAN,
        journal: null,
      });
      const { capture, exitCode } = await run(fixture, [
        '--project',
        PROJECT_REL,
        '--at',
        'completion',
      ]);
      expect(exitCode).toBe(1);
      expect(capture.jsonPayloads[0]).toEqual({
        status: 'error',
        message: `Project implementation.md not found: ${join(fixture.projectPath, 'implementation.md')}`,
      });
    });

    it('returns no coverage for a lifecycle mode', async () => {
      const fixture = await project({
        state: STATE,
        plan: PLAN,
        journal: '# Implementation\n',
      });
      const { capture, exitCode } = await run(fixture, [
        '--project',
        PROJECT_REL,
        '--at',
        'completion',
      ]);
      expect(exitCode).toBe(1);
      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'refused' });
      expect(capture.jsonPayloads[0]).not.toHaveProperty('coverage');
      expect(
        await readFile(join(fixture.projectPath, 'state.md'), 'utf8'),
      ).toBe(STATE);
    });
  });
});
