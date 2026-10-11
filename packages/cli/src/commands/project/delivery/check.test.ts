import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  bookkeepingChain,
  createGoalRepo,
  goalPlan,
  PROJECT_REL,
  registryYaml,
  removeRepo,
  type GoalRepo,
} from './__tests__/goal-repo';
import { createProjectDeliveryCheckCommand } from './check';

interface CheckPayload {
  status: string;
  subject?: string;
  kind?: string;
  scope?: string[];
  review?: {
    fresh: boolean;
    disposition: string | null;
    reason: string | null;
  };
  exit?: {
    outcome: string;
    freshness: string;
    reason: string | null;
    source: string;
  };
  deliverable?: boolean;
  message?: string;
}

async function check(
  repo: GoalRepo,
  subject: string,
): Promise<{ payload: CheckPayload; exitCode: number | undefined }> {
  const capture = createLoggerCapture();
  const command = createProjectDeliveryCheckCommand({
    buildCommandContext: (options: GlobalOptions): CommandContext => ({
      scope: 'project',
      dryRun: false,
      verbose: false,
      json: options.json ?? false,
      cwd: repo.root,
      home: repo.root,
      interactive: false,
      logger: capture.logger,
    }),
    resolveProjectRoot: async () => repo.root,
  });
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  const delivery = new Command('delivery');
  delivery.addCommand(command);
  project.addCommand(delivery);
  program.addCommand(project);
  await program.parseAsync(
    [
      '--json',
      'project',
      'delivery',
      'check',
      '--project',
      PROJECT_REL,
      '--subject',
      subject,
    ],
    { from: 'user' },
  );
  return {
    payload: capture.jsonPayloads[0] as CheckPayload,
    exitCode: process.exitCode as number | undefined,
  };
}

/** Every tracked and untracked byte of the repository, for the read-only check. */
function snapshot(repo: GoalRepo): string {
  return [
    repo.git(['rev-parse', 'HEAD']),
    repo.git(['status', '--porcelain', '--untracked-files=all']),
  ].join('\n');
}

describe('oat project delivery check', () => {
  let repo: GoalRepo | undefined;
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode as number | undefined;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await removeRepo(repo);
    repo = undefined;
  });

  /** The milestone before registration: received, exit carrier recorded. */
  async function receivedMilestone() {
    repo = await createGoalRepo();
    const base = repo.baseSha;
    return bookkeepingChain(repo, {
      register: (reviewed) =>
        `oat_milestone: m01\noat_milestone_status: delivering\n${registryYaml({ reviewed, base }).replace(/^oat_deliveries:[\s\S]*?(?=^oat_milestone_gates:)/m, '')}`,
    });
  }

  it('reports a milestone fresh across the bookkeeping chain', async () => {
    const chain = await receivedMilestone();
    const before = snapshot(repo!);

    const { payload, exitCode } = await check(repo!, 'm01');

    expect(payload).toMatchObject({
      status: 'ok',
      subject: 'm01',
      kind: 'milestone',
      scope: ['p01', 'p02'],
      review: { fresh: true, disposition: 'passed', reason: null },
      exit: {
        outcome: 'allowed',
        freshness: 'fresh',
        reason: null,
        source: 'milestone-carrier',
      },
      deliverable: true,
    });
    expect(exitCode).toBe(0);
    expect(snapshot(repo!)).toBe(before);
    expect(chain.registered).toBe(repo!.git(['rev-parse', 'HEAD']));
  });

  it('reports a milestone stale for a substantive successor and writes nothing', async () => {
    await receivedMilestone();
    await repo!.writeRepo('src/app.ts', 'export const value = 9;\n');
    const substantive = repo!.commitAll('feat: after review');
    const state = await repo!.read('state.md');
    const before = snapshot(repo!);

    const { payload, exitCode } = await check(repo!, 'm01');

    expect(payload).toMatchObject({
      status: 'undeliverable',
      review: { fresh: false },
      deliverable: false,
    });
    expect(payload.review?.reason).toContain(`disallowed-path: ${substantive}`);
    // A no_gate carrier binds its subject, not a revision: still fresh.
    expect(payload.exit).toMatchObject({
      outcome: 'allowed',
      freshness: 'fresh',
    });
    expect(exitCode).toBe(1);
    expect(snapshot(repo!)).toBe(before);
    expect(await repo!.read('state.md')).toBe(state);
  });

  it('reports an Outcome change after review as stale', async () => {
    const chain = await receivedMilestone();
    const plan = await repo!.read('plan.md');
    await repo!.write(
      'plan.md',
      plan.replace('Delivery evidence holds', 'Delivery evidence drifts'),
    );
    repo!.commitAll('chore(oat): edit outcome');

    const { payload } = await check(repo!, 'm01');
    expect(payload.review).toMatchObject({ fresh: false });
    expect(payload.review?.reason).toMatch(/^substantive-change/);
    expect(chain.reviewed).not.toBe(repo!.git(['rev-parse', 'HEAD']));
  });

  it('reports a stale exit carrier when its subject no longer matches the milestone', async () => {
    await receivedMilestone();
    const plan = await repo!.read('plan.md');
    await repo!.write(
      'plan.md',
      plan.replace(
        '| m01 | p01, p02 |\n| m02 | p03 |',
        '| m01 | p01, p02, p03 |',
      ),
    );
    repo!.commitAll('chore(oat): move p03 into m01');

    const { payload } = await check(repo!, 'm01');
    expect(payload.exit).toMatchObject({ freshness: 'stale' });
    expect(payload.exit?.reason).toMatch(/^subject-changed/);
    expect(payload.deliverable).toBe(false);
    expect(payload.status).toBe('undeliverable');
  });

  it('evaluates a registered delivery against its observed member revisions', async () => {
    repo = await createGoalRepo();
    const base = repo.baseSha;
    let reviewedSha = '';
    await bookkeepingChain(repo, {
      register: (reviewed) => {
        reviewedSha = reviewed;
        return `oat_milestone: m01\noat_milestone_status: delivered\n${registryYaml(
          { reviewed, base, observedHead: reviewed, observedBase: base },
        )}`;
      },
    });

    const { payload, exitCode } = await check(repo, 'd01');
    expect(payload).toMatchObject({
      status: 'ok',
      kind: 'delivery',
      milestone: 'm01',
      scope: ['p01', 'p02'],
      review: { fresh: true, disposition: 'passed' },
      // A registered delivery is still judged by the milestone working carrier.
      exit: {
        outcome: 'allowed',
        freshness: 'fresh',
        source: 'milestone-carrier',
      },
      deliverable: true,
    });
    expect(exitCode).toBe(0);
    expect(reviewedSha).toHaveLength(40);
  });

  it('refuses an unknown subject and invalid membership', async () => {
    await receivedMilestone();
    const unknown = await check(repo!, 'x9');
    expect(unknown.payload).toMatchObject({
      status: 'error',
      message: expect.stringContaining('Unknown delivery subject'),
    });
    expect(unknown.exitCode).toBe(1);

    await repo!.write(
      'plan.md',
      goalPlan({ milestones: '| m01 | p01, p02, p09 |\n| m02 | p03 |' }),
    );
    process.exitCode = undefined;
    const invalid = await check(repo!, 'm01');
    expect(invalid.payload).toMatchObject({
      status: 'error',
      message: expect.stringContaining('oat-project-goal'),
    });
  });
});
