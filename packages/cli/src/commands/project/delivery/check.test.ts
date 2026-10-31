import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ARCHIVED_REVIEW_ARTIFACT,
  bookkeepingChain,
  createGoalRepo,
  goalPlan,
  goalState,
  PROJECT_REL,
  registryYaml,
  removeRepo,
  reviewRow,
  type GoalRepo,
} from './__tests__/goal-repo';
import { createProjectDeliveryCheckCommand } from './check';

interface CheckPayload {
  status: string;
  subject?: string;
  kind?: string;
  scope?: string[];
  publishedHeads?: (string | null)[];
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

  async function registeredStack(
    topology: 'linear' | 'misordered' | 'unobserved',
  ) {
    repo = await createGoalRepo();
    let lower: string;
    if (topology === 'misordered') {
      repo.git(['checkout', '-q', '-b', 'lower']);
      await repo.writeRepo('src/lower.ts', 'export const lower = 1;\n');
      lower = repo.commitAll('feat: unrelated lower layer');
      repo.git(['checkout', '-q', 'main']);
    } else {
      await repo.writeRepo('src/app.ts', 'export const value = 2;\n');
      lower = repo.commitAll('feat: lower layer');
    }
    await repo.writeRepo('src/app.ts', 'export const value = 3;\n');
    const middle = repo.commitAll('feat: middle layer');
    await repo.writeRepo('src/app.ts', 'export const value = 4;\n');
    const tip = repo.commitAll('feat: tip layer');
    await repo.write(
      ARCHIVED_REVIEW_ARTIFACT,
      '# d01 stack review\n\nNo findings.\n',
    );
    await repo.write(
      'plan.md',
      goalPlan({
        reviews: reviewRow('passed', ARCHIVED_REVIEW_ARTIFACT, tip, 'd01'),
      }),
    );
    await repo.write(
      'state.md',
      goalState(
        `oat_milestone: m01\noat_milestone_status: delivered\n${registryYaml({
          reviewed: tip,
          base: repo.baseSha,
          kind: 'stack',
          members: [
            {
              url: 'https://github.com/owner/name/pull/1',
              reviewedHead: lower,
              observedHead: topology === 'unobserved' ? null : lower,
              observedBase: repo.baseSha,
            },
            {
              url: 'https://github.com/owner/name/pull/2',
              reviewedHead: middle,
              observedHead: middle,
              observedBase: repo.baseSha,
            },
            {
              url: 'https://github.com/owner/name/pull/3',
              reviewedHead: tip,
              observedHead: tip,
              observedBase: repo.baseSha,
            },
          ],
          exit: `      status: allowed
      resolution: configured
      disposition: passed
      config_fingerprint: null
      reviewed_head: '${tip}'
      subject: { kind: code, scope: [p01, p02] }
      decided_at: '2026-10-11T10:00:00Z'
      freshness: fresh
      freshness_reason: null`,
        })}`,
      ),
    );
    repo.commitAll(`chore(oat): register ${topology} stack`);
    return { lower, middle, tip };
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

  it('treats a summary.md commit as bookkeeping but not an Outcome edit after it (M1)', async () => {
    // p12 review M1: the configured post-implement sequence runs `summary`
    // before `pr`, so oat-project-summary commits summary.md after the
    // reviewed revision; it is derived institutional memory (contract 12.8).
    await receivedMilestone();
    expect((await check(repo!, 'm01')).payload.status).toBe('ok');

    await repo!.write('summary.md', '# Summary\n\nGoal milestone m01.\n');
    repo!.commitAll('chore(oat): generate summary');
    process.exitCode = undefined;
    const afterSummary = await check(repo!, 'm01');
    expect(afterSummary.payload).toMatchObject({
      status: 'ok',
      review: { fresh: true, reason: null },
    });
    expect(afterSummary.exitCode).toBe(0);

    const plan = await repo!.read('plan.md');
    await repo!.write(
      'plan.md',
      plan.replace('Delivery evidence holds', 'Delivery evidence drifts'),
    );
    repo!.commitAll('chore(oat): edit outcome');
    process.exitCode = undefined;
    const afterOutcome = await check(repo!, 'm01');
    expect(afterOutcome.payload.status).toBe('undeliverable');
    expect(afterOutcome.payload.review?.reason).toMatch(/^substantive-change/);
    expect(afterOutcome.exitCode).toBe(1);
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

  it('judges a linear registered stack at its tip while reporting every published head', async () => {
    const heads = await registeredStack('linear');

    const { payload, exitCode } = await check(repo!, 'd01');

    expect(payload).toMatchObject({
      status: 'ok',
      publishedHeads: [heads.lower, heads.middle, heads.tip],
      exit: { freshness: 'fresh', reason: null },
      deliverable: true,
    });
    expect(exitCode).toBe(0);
  });

  it.each([
    ['misordered', /^stack-order/],
    ['unobserved', /^member-unobserved/],
  ] as const)(
    'fails closed for a %s lower stack member',
    async (topology, reason) => {
      await registeredStack(topology);

      const { payload, exitCode } = await check(repo!, 'd01');

      expect(payload.exit).toMatchObject({
        freshness: 'stale',
        reason: expect.stringMatching(reason),
      });
      expect(payload.status).toBe('undeliverable');
      expect(exitCode).toBe(1);
    },
  );

  it('keeps milestone and delivery subjects aligned after a new own review moves a member revision', async () => {
    repo = await createGoalRepo();
    const chain = await bookkeepingChain(repo);
    const second = 'reviews/archived/d01-code-review-2.md';
    await repo.write(second, '# d01 re-review\n\nNo findings.\n');
    await repo.write(
      'plan.md',
      goalPlan({
        reviews: [
          reviewRow('passed', ARCHIVED_REVIEW_ARTIFACT, chain.reviewed, 'm01'),
          reviewRow('passed', second, chain.registered, 'd01'),
        ].join('\n'),
      }),
    );
    await repo.write(
      'state.md',
      (await repo.read('state.md'))
        .replace(`artifact: ${ARCHIVED_REVIEW_ARTIFACT}`, `artifact: ${second}`)
        .replace(
          `head: '${chain.reviewed}' }]`,
          `head: '${chain.registered}' }]`,
        )
        .replace(
          `reviewed_head: '${chain.reviewed}'`,
          `reviewed_head: '${chain.registered}'`,
        )
        .replace('observed_head: null', `observed_head: '${chain.registered}'`)
        .replace('observed_base: null', `observed_base: '${repo.baseSha}'`),
    );
    repo.commitAll('chore(oat): record the d01 re-review');

    const milestone = await check(repo, 'm01');
    process.exitCode = undefined;
    const delivery = await check(repo, 'd01');

    expect(milestone.payload.review).toMatchObject({
      fresh: true,
      reason: null,
    });
    expect(delivery.payload.review).toMatchObject({
      fresh: true,
      reason: null,
    });
    expect(milestone.payload.status).toBe(delivery.payload.status);
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
  it('treats a sibling terminal delivery sharing the member PR as bookkeeping (M2)', async () => {
    // Found by the p12-t02 real-artifact probe: pr-final registers one
    // terminal delivery per milestone, all sharing the head branch's member
    // pull request (brief contract 12.7 "Shared members"). Each delivery
    // records its own review artifact on that shared head, so before the
    // fix each one judged its sibling's artifact a disallowed path.
    repo = await createGoalRepo();
    await repo.writeRepo('src/app.ts', 'export const value = 2;\n');
    const reviewed = repo.commitAll('fix(p02,p03): corrections');
    const reviews: string[] = [];
    for (const [delivery, milestone] of [
      ['d01', 'm01'],
      ['d02', 'm02'],
    ] as const) {
      await repo.write(
        `reviews/archived/${delivery}-review.md`,
        `# ${delivery} review\n\nNo findings.\n`,
      );
      reviews.push(
        `| ${delivery} | code | passed | 2026-10-11 | reviews/archived/${delivery}-review.md | ${reviewed} |`,
      );
      await repo.write('plan.md', goalPlan({ reviews: reviews.join('\n') }));
      repo.commitAll(`chore(oat): record ${delivery} review (${milestone})`);
    }
    const published = repo.git(['rev-parse', 'HEAD']);
    const entry = (delivery: string, milestone: string, scope: string) =>
      registryYaml({
        reviewed,
        base: repo!.baseSha,
        observedHead: published,
        observedBase: repo!.baseSha,
      })
        .replace(/^oat_milestone_gates:[\s\S]*$/m, '')
        .replace('oat_deliveries:\n', '')
        .replaceAll('d01', delivery)
        .replace('milestone: m01', `milestone: ${milestone}`)
        .replaceAll('[p01, p02]', `[${scope}]`)
        .replace(
          'reviews/archived/m01-code-review.md',
          `reviews/archived/${delivery}-review.md`,
        );
    const gates = registryYaml({ reviewed, base: repo.baseSha }).replace(
      /^[\s\S]*?(?=^oat_milestone_gates:)/m,
      '',
    );
    await repo.write(
      'state.md',
      goalState(
        `oat_milestone: m02\noat_milestone_status: delivered\noat_deliveries:\n${entry('d01', 'm01', 'p01, p02')}${entry('d02', 'm02', 'p03')}${gates}`,
      ),
    );
    repo.commitAll('chore(oat): register d01 and d02 on the shared member');

    const { payload, exitCode } = await check(repo, 'd01');
    expect(payload.review).toMatchObject({ fresh: true, reason: null });
    expect(payload.status).toBe('ok');
    expect(exitCode).toBe(0);
  });
});
