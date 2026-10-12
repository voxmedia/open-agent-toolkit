import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  buildState,
  contextFactory,
  createLoggerCapture,
  createProjectFixture,
  PROJECT_REL,
  runProjectSubcommand,
  snapshotYaml,
  type ProjectFixture,
} from '@commands/project/closeout-check/__tests__/fixtures';
import { createProjectCloseoutCheckCommand } from '@commands/project/closeout-check/index';
import {
  commitGap,
  journal,
  NEGATIVE_VARIANTS,
  overviewCountingFencedExample,
  PLAN,
  PLAN_WITH_FENCED_EXAMPLE,
  realRunLine,
  withDeviation,
} from '@commands/project/journal-check/__tests__/fixtures';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createProjectCompleteStateCommand } from './index';

/**
 * The journal evaluator through the public `complete-state` boundary. Each
 * negative control is accepted by the closeout invariant `complete-state`
 * enforced before this change (`closeout-check`, unchanged), and refused by
 * `complete-state` now for the named journal reason before any state write:
 * `state.md` stays byte-identical.
 */

let VALID = '';
let RUNNING_LINE = '';

beforeAll(async () => {
  VALID = journal(await realRunLine());
  RUNNING_LINE = await realRunLine({
    request_id: 'demo-p02-implementation',
    scope: 'p02',
    child_outcome: 'running',
  });
});

const OVERRIDE =
  '**Override:** evidence-lost · **Authorized by:** DR-261012-lost-sha · **Scope:** p01-t01 · the commit was squashed away';

describe('complete-state evaluates the final journal before its write', () => {
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

  async function project(
    journalContent: string,
    state = buildState(),
    plan = PLAN,
  ): Promise<ProjectFixture> {
    const fixture = await createProjectFixture(tempDirs, { state });
    await writeFile(join(fixture.projectPath, 'plan.md'), plan, 'utf8');
    await writeFile(
      join(fixture.projectPath, 'implementation.md'),
      journalContent,
      'utf8',
    );
    return fixture;
  }

  async function closeoutCheck(fixture: ProjectFixture) {
    const capture = createLoggerCapture();
    process.exitCode = undefined;
    await runProjectSubcommand(
      createProjectCloseoutCheckCommand({
        resolveProjectRoot: async () => fixture.root,
        env: {},
        buildCommandContext: contextFactory(fixture, capture),
      }),
      'closeout-check',
      [PROJECT_REL],
      ['--json'],
    );
    return {
      payload: capture.jsonPayloads[0] as Record<string, unknown>,
      exitCode: process.exitCode as number | undefined,
    };
  }

  async function completeState(fixture: ProjectFixture) {
    const capture = createLoggerCapture();
    process.exitCode = undefined;
    await runProjectSubcommand(
      createProjectCompleteStateCommand({
        resolveProjectRoot: async () => fixture.root,
        env: {},
        buildCommandContext: contextFactory(fixture, capture),
        now: () => new Date('2026-10-12T12:00:00Z'),
      }),
      'complete-state',
      [PROJECT_REL],
      ['--json'],
    );
    return {
      payload: capture.jsonPayloads[0] as Record<string, unknown>,
      exitCode: process.exitCode as number | undefined,
    };
  }

  async function expectRefusedWithoutWrite(
    fixture: ProjectFixture,
    code: string,
  ): Promise<void> {
    const before = await readFile(fixture.statePath, 'utf8');
    const completed = await completeState(fixture);
    expect(completed.exitCode).toBe(1);
    expect(completed.payload).toMatchObject({ status: 'error' });
    expect(String(completed.payload['message'])).toContain(code);
    expect(await readFile(fixture.statePath, 'utf8')).toBe(before);
  }

  it('completes the accepted neighbor and writes the completed state', async () => {
    const fixture = await project(VALID);
    const completed = await completeState(fixture);
    expect(completed).toMatchObject({
      exitCode: 0,
      payload: { status: 'ok' },
    });
    expect(await readFile(fixture.statePath, 'utf8')).toContain(
      'oat_lifecycle: complete',
    );
  });

  it('completes a truthful journal whose plan holds a fenced example task heading', async () => {
    const fixture = await project(
      VALID,
      buildState(),
      PLAN_WITH_FENCED_EXAMPLE,
    );
    expect(await completeState(fixture)).toMatchObject({
      exitCode: 0,
      payload: { status: 'ok' },
    });
  });

  it('refuses an overview that counts the fenced example, state byte-identical', async () => {
    const fixture = await project(
      overviewCountingFencedExample(VALID),
      buildState(),
      PLAN_WITH_FENCED_EXAMPLE,
    );
    await expectRefusedWithoutWrite(fixture, 'overview-total-mismatch');
  });

  for (const variant of NEGATIVE_VARIANTS) {
    it(`baseline accepts and complete-state refuses: ${variant.name}`, async () => {
      const fixture = await project(variant.apply(VALID, RUNNING_LINE));
      const baseline = await closeoutCheck(fixture);
      expect(baseline.exitCode).toBe(0);
      expect(baseline.payload).toMatchObject({ status: 'not_required' });
      await expectRefusedWithoutWrite(fixture, variant.code);
    });
  }

  describe('override triple', () => {
    it('refuses the gap without an override, state byte-identical', async () => {
      const fixture = await project(commitGap(VALID));
      expect((await closeoutCheck(fixture)).exitCode).toBe(0);
      await expectRefusedWithoutWrite(fixture, 'task-commit-missing');
    });

    it('completes with the matching override, idempotent on code + scope + decision id', async () => {
      for (const deviation of [OVERRIDE, `${OVERRIDE}\n${OVERRIDE}`]) {
        const fixture = await project(
          withDeviation(commitGap(VALID), deviation),
        );
        const completed = await completeState(fixture);
        expect(completed.exitCode).toBe(0);
        expect(completed.payload).toMatchObject({ status: 'ok' });
      }
    });

    it('refuses the wrong-scope override, state byte-identical', async () => {
      const fixture = await project(
        withDeviation(
          commitGap(VALID),
          OVERRIDE.replace('**Scope:** p01-t01', '**Scope:** p01-t02'),
        ),
      );
      await expectRefusedWithoutWrite(fixture, 'task-commit-missing');
    });

    it('refuses the matching override paired with an invalid sequence, without writes', async () => {
      const fixture = await project(
        withDeviation(commitGap(VALID), OVERRIDE),
        buildState({
          snapshotLines: snapshotYaml({
            status: 'pre_approval',
            preApprovalCompleted: ['summary'],
          }),
        }),
      );
      const before = await readFile(fixture.statePath, 'utf8');
      const completed = await completeState(fixture);
      expect(completed.exitCode).toBe(1);
      expect(String(completed.payload['message'])).toContain(
        'Closeout invariant not satisfied',
      );
      expect(String(completed.payload['message'])).toContain(
        'pre_approval_step_pending',
      );
      expect(await readFile(fixture.statePath, 'utf8')).toBe(before);
    });
  });

  it('keeps completing a plan-less project with no journal (the invariant alone applies)', async () => {
    const fixture = await createProjectFixture(tempDirs);
    const completed = await completeState(fixture);
    expect(completed.exitCode).toBe(0);
  });

  it('refuses a planned project with no journal, state byte-identical', async () => {
    const fixture = await createProjectFixture(tempDirs);
    await writeFile(join(fixture.projectPath, 'plan.md'), PLAN, 'utf8');
    await expectRefusedWithoutWrite(fixture, 'journal-missing');
  });
});
