import { readFile, rm, writeFile } from 'node:fs/promises';

import { createProjectCompleteStateCommand } from '@commands/project/complete-state/index';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import {
  buildState,
  contextFactory,
  createLoggerCapture,
  createProjectFixture,
  PROJECT_REL,
  runProjectSubcommand,
  type ProjectFixture,
} from './__tests__/fixtures';
import { createProjectCloseoutCheckCommand } from './index';

/**
 * Disk-backed transition trace for BL-260806-fail-closed-when-configured.
 *
 * Starts from a configured, snapshot-absent project and drives `state.md`
 * through the writes `completion-and-closeout.md` Step 15 prescribes. After
 * every write the state is reopened from disk and both commands run in a fresh
 * invocation (a new command instance; nothing is carried in memory). The
 * stored order is deliberately noncanonical (document, summary, pr), so a
 * remembered default order cannot pass.
 */

async function rewriteFrontmatter(
  statePath: string,
  mutate: (frontmatter: Record<string, unknown>) => void,
): Promise<void> {
  const content = await readFile(statePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error('fixture state.md lost its frontmatter');
  const frontmatter = YAML.parse(match[1]!) as Record<string, unknown>;
  mutate(frontmatter);
  const rendered = YAML.stringify(frontmatter).trimEnd();
  await writeFile(
    statePath,
    `---\n${rendered}\n---\n${content.slice(match[0].length)}`,
    'utf8',
  );
}

async function updateSnapshot(
  statePath: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await rewriteFrontmatter(statePath, (frontmatter) => {
    const snapshot = frontmatter.oat_post_implement_sequence as Record<
      string,
      unknown
    >;
    Object.assign(snapshot, fields);
  });
}

interface CheckOutcome {
  status: string;
  invariant: string | null;
  nextOwner: { kind: string; step?: string; skill?: string } | null;
}

async function freshCheck(fixture: ProjectFixture): Promise<CheckOutcome> {
  const capture = createLoggerCapture();
  const command = createProjectCloseoutCheckCommand({
    buildCommandContext: contextFactory(fixture, capture),
    resolveProjectRoot: async () => fixture.root,
    env: {},
  });
  process.exitCode = undefined;
  await runProjectSubcommand(
    command,
    'closeout-check',
    [PROJECT_REL],
    ['--json'],
  );
  return capture.jsonPayloads[0] as CheckOutcome;
}

async function freshCompleteState(
  fixture: ProjectFixture,
): Promise<{ exitCode: number | undefined; error: string | undefined }> {
  const capture = createLoggerCapture();
  const command = createProjectCompleteStateCommand({
    buildCommandContext: contextFactory(fixture, capture),
    resolveProjectRoot: async () => fixture.root,
    env: {},
    now: () => new Date('2026-10-01T12:00:00.000Z'),
  });
  process.exitCode = undefined;
  await runProjectSubcommand(command, 'complete-state', [PROJECT_REL]);
  return {
    exitCode: process.exitCode as number | undefined,
    error: capture.error[0],
  };
}

async function expectRefusedUnchanged(fixture: ProjectFixture): Promise<void> {
  const before = await readFile(fixture.statePath, 'utf8');
  const result = await freshCompleteState(fixture);
  expect(result.exitCode).toBe(1);
  expect(result.error).toContain('Closeout invariant not satisfied');
  expect(await readFile(fixture.statePath, 'utf8')).toBe(before);
}

describe('closeout transition trace (state on disk)', () => {
  const tempDirs: string[] = [];
  const originalExitCode = process.exitCode;

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('fails closed from configured-plus-absent through terminal completion', async () => {
    const fixture = await createProjectFixture(tempDirs, {
      configured: {
        preApproval: ['document', 'summary', 'pr'],
        postApproval: [],
      },
      state: buildState({ workflowMode: 'spec-driven' }),
    });

    // 0. Configured, snapshot absent: the missing snapshot is named.
    let check = await freshCheck(fixture);
    expect(check).toMatchObject({
      status: 'incomplete',
      invariant: 'snapshot_missing',
      nextOwner: { kind: 'snapshot', skill: 'oat-project-implement' },
    });
    await expectRefusedUnchanged(fixture);

    // 1. Step 15 persists the immutable snapshot before any child dispatch.
    await rewriteFrontmatter(fixture.statePath, (frontmatter) => {
      frontmatter.oat_post_implement_sequence = {
        status: 'pre_approval',
        source: 'configured',
        final_phase: 'p01',
        pre_approval: ['document', 'summary', 'pr'],
        pre_approval_completed: [],
        approval: 'pending',
        approval_source: null,
        post_approval: [],
        post_approval_completed: [],
        failure: null,
      };
    });
    check = await freshCheck(fixture);
    expect(check).toMatchObject({
      invariant: 'pre_approval_step_pending',
      nextOwner: { step: 'document', skill: 'oat-project-document' },
    });
    await expectRefusedUnchanged(fixture);

    // 2. document recorded complete: the next stored step is summary.
    await updateSnapshot(fixture.statePath, {
      pre_approval_completed: ['document'],
    });
    check = await freshCheck(fixture);
    expect(check.nextOwner).toMatchObject({ step: 'summary' });
    await expectRefusedUnchanged(fixture);

    // 3. Interrupted: the snapshot has no per-step in_progress state, so an
    //    interrupted summary dispatch persists a failed boundary. Reopened, the
    //    check still names summary, the step to resume.
    await updateSnapshot(fixture.statePath, {
      status: 'failed',
      failure: { boundary: 'pre_approval', step: 'summary' },
    });
    check = await freshCheck(fixture);
    expect(check).toMatchObject({
      invariant: 'sequence_failed',
      nextOwner: { step: 'summary' },
    });
    await expectRefusedUnchanged(fixture);

    // 4. Resumed and recorded: summary complete, the next stored step is pr.
    await updateSnapshot(fixture.statePath, {
      status: 'pre_approval',
      failure: null,
      pre_approval_completed: ['document', 'summary'],
    });
    check = await freshCheck(fixture);
    expect(check.nextOwner).toMatchObject({
      step: 'pr',
      skill: 'oat-project-pr-final',
    });
    await expectRefusedUnchanged(fixture);

    // 5. Every pre-approval step complete: the check stops at approval.
    await updateSnapshot(fixture.statePath, {
      pre_approval_completed: ['document', 'summary', 'pr'],
    });
    check = await freshCheck(fixture);
    expect(check).toMatchObject({
      invariant: 'approval_pending',
      nextOwner: { kind: 'approval' },
    });
    await expectRefusedUnchanged(fixture);

    await updateSnapshot(fixture.statePath, { status: 'awaiting_approval' });
    check = await freshCheck(fixture);
    expect(check.invariant).toBe('approval_pending');
    await expectRefusedUnchanged(fixture);

    // 6. Approval recorded; no post-approval steps; terminal status not yet set.
    await updateSnapshot(fixture.statePath, {
      approval: 'approved',
      approval_source: 'user',
      status: 'post_approval',
    });
    check = await freshCheck(fixture);
    expect(check.invariant).toBe('sequence_not_complete');
    await expectRefusedUnchanged(fixture);

    // 7. Step 15's terminal write: status complete. Only now does it pass.
    await updateSnapshot(fixture.statePath, { status: 'complete' });
    check = await freshCheck(fixture);
    expect(check).toMatchObject({ status: 'complete', invariant: null });
    const completed = await freshCompleteState(fixture);
    expect(completed.exitCode).toBe(0);
    const finalState = await readFile(fixture.statePath, 'utf8');
    expect(finalState).toContain('oat_lifecycle: complete');
    expect(finalState).toContain('status: complete');
  });
});
