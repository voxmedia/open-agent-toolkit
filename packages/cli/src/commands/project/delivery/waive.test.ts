import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { GhRunner } from '@commands/project/links/refresh';
import { getProjectState } from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

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
  sharedMemberScenario,
  type GoalRepo,
} from './__tests__/goal-repo';
import { createProjectDeliveryCheckCommand } from './check';
import { createProjectDeliveryRefreshCommand } from './refresh';
import { createProjectDeliveryWaiveCommand } from './waive';

/**
 * `oat project delivery waive` end to end (brief Outcome 2): a real scratch
 * Git repository, the real project reader, the shared evaluator and a stubbed
 * `gh`. Each refusal writes nothing.
 */

const MEMBER_URL = 'https://github.com/owner/name/pull/7';
const NOW = '2026-11-09T12:00:00.000Z';

interface Observation {
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  head: string;
  base: string;
}

function stubGh(observe: () => Observation | 'fail'): GhRunner & {
  calls: string[][];
} {
  const calls: string[][] = [];
  return {
    calls,
    run: (args) => {
      calls.push(args);
      const observation = observe();
      return Promise.resolve(
        observation === 'fail'
          ? { code: 1, stdout: '', stderr: 'HTTP 502' }
          : {
              code: 0,
              stdout: JSON.stringify({
                state: observation.state,
                headRefOid: observation.head,
                baseRefOid: observation.base,
              }),
              stderr: '',
            },
      );
    },
  };
}

function context(
  repo: GoalRepo,
  capture: ReturnType<typeof createLoggerCapture>,
) {
  return (options: GlobalOptions): CommandContext => ({
    scope: 'project',
    dryRun: false,
    verbose: false,
    json: options.json ?? false,
    cwd: repo.root,
    home: repo.root,
    interactive: false,
    logger: capture.logger,
  });
}

async function runCapturing(
  command: Command,
  args: string[],
  capture: ReturnType<typeof createLoggerCapture> | undefined,
): Promise<{ payload: Record<string, unknown>; exitCode: number | undefined }> {
  process.exitCode = undefined;
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  const delivery = new Command('delivery');
  delivery.addCommand(command);
  project.addCommand(delivery);
  program.addCommand(project);
  await program.parseAsync(['--json', 'project', 'delivery', ...args], {
    from: 'user',
  });
  return {
    payload: (capture?.jsonPayloads[0] ?? {}) as Record<string, unknown>,
    exitCode: process.exitCode as number | undefined,
  };
}

function frontmatter(content: string): Record<string, unknown> {
  return YAML.parse(content.match(/^---\n([\s\S]*?)\n---/)![1]!) as Record<
    string,
    unknown
  >;
}

function deliveryRecord(content: string, id = 'd01'): Record<string, unknown> {
  return (
    frontmatter(content)['oat_deliveries'] as Record<string, unknown>[]
  ).find((entry) => entry['delivery_id'] === id)!;
}

/** A configured exit carrier reviewed at `reviewed` (YAML under its key). */
function configuredCarrier(reviewed: string, status = 'allowed'): string {
  return `      status: ${status}
      resolution: configured
      disposition: passed
      config_fingerprint: null
      reviewed_head: '${reviewed}'
      subject: { kind: code, scope: [p01, p02] }
      decided_at: '2026-10-11T10:00:00Z'
      freshness: fresh
      freshness_reason: null`;
}

/** An unreviewed `no_gate` exit carrier (YAML under its key). */
const NO_GATE_CARRIER = `      status: allowed
      resolution: no_gate
      disposition: no_gate
      config_fingerprint: null
      reviewed_head: null
      subject: { kind: code, scope: [p01, p02] }
      decided_at: '2026-10-11T10:00:00Z'
      freshness: fresh
      freshness_reason: null`;

/** `.oat/config.json` configuring the exit gate (`oat-project-implement`). */
function exitGateConfig(command: string): string {
  return `${JSON.stringify({
    version: 1,
    workflow: {
      gates: {
        skills: { 'oat-project-implement': { command, onFailure: 'block' } },
      },
    },
  })}\n`;
}

describe('oat project delivery waive', () => {
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

  async function refresh(target: GoalRepo, gh: GhRunner) {
    const capture = createLoggerCapture();
    return runCapturing(
      createProjectDeliveryRefreshCommand({
        buildCommandContext: context(target, capture),
        resolveProjectRoot: async () => target.root,
        gh,
        now: () => new Date('2026-11-08T12:00:00.000Z'),
      }),
      ['refresh', '--project', PROJECT_REL],
      capture,
    );
  }

  async function check(target: GoalRepo, subject = 'd01') {
    const capture = createLoggerCapture();
    return runCapturing(
      createProjectDeliveryCheckCommand({
        buildCommandContext: context(target, capture),
        resolveProjectRoot: async () => target.root,
      }),
      ['check', '--project', PROJECT_REL, '--subject', subject],
      capture,
    );
  }

  async function waive(
    target: GoalRepo,
    gh: GhRunner,
    options: {
      env?: NodeJS.ProcessEnv;
      delivery?: string;
      /** `null` omits `--by`. */
      by?: string | null;
    } = {},
  ) {
    const capture = createLoggerCapture();
    return runCapturing(
      createProjectDeliveryWaiveCommand({
        buildCommandContext: context(target, capture),
        resolveProjectRoot: async () => target.root,
        gh,
        env: options.env ?? {},
        now: () => new Date(NOW),
      }),
      [
        'waive',
        '--project',
        PROJECT_REL,
        '--delivery',
        options.delivery ?? 'd01',
        '--reason',
        'post-gate fix squash-merged with the PR',
        ...(options.by === null ? [] : ['--by', options.by ?? 'Operator']),
      ],
      capture,
    );
  }

  interface StaleOptions {
    /** Register a later m01 delivery d02, so d01 is not the latest. */
    laterDelivery?: boolean;
    bindingStatus?: string;
    prState?: Observation['state'];
    /** Leave the delivery unmoved (observed head = reviewed revision). */
    unmoved?: boolean;
    /** Record `no_gate` carriers in a repository that configures no gate. */
    noGate?: boolean;
    /** The post-gate fix rewrites `.oat/config.json` to this content. */
    gateConfigChange?: string;
    /** Record the member with no `reviewed_head` (its bound revision stays R). */
    unrecordedMemberHead?: boolean;
  }

  /**
   * d01 reviewed at R and registered with a configured working carrier and
   * exit_gate bound to R (the repository configures that gate); a substantive
   * post-gate fix F then lands on the member PR, refresh records the
   * staleness, and pr-progress routes d01 to recovery (stage exit_gate) and
   * commits. `noGate` records `no_gate` carriers with no gate configured.
   */
  async function staleDelivery(target: GoalRepo, options: StaleOptions = {}) {
    await target.writeRepo(
      '.oat/config.json',
      options.noGate ? '{ "version": 1 }\n' : exitGateConfig('true'),
    );
    target.commitAll('chore: configure the workflow gates');
    const chain = await bookkeepingChain(target, {
      register: (reviewed) => {
        const registry = registryYaml({
          reviewed,
          base: target.baseSha,
          deliveryExitGate: options.noGate
            ? NO_GATE_CARRIER
            : configuredCarrier(reviewed, options.bindingStatus ?? 'allowed'),
          exit: options.noGate ? NO_GATE_CARRIER : configuredCarrier(reviewed),
        });
        const recorded = options.unrecordedMemberHead
          ? registry.replace(
              `        reviewed_head: '${reviewed}'`,
              '        reviewed_head: null',
            )
          : registry;
        return `oat_milestone: m01\noat_milestone_status: delivered\n${
          options.laterDelivery
            ? recorded.replace(
                'oat_milestone_gates:',
                `  - delivery_id: d02
    milestone: m01
    scope: [p02]
    endpoint: merged
    kind: pr
    status: open
    corrects_delivery_id: d01
    members:
      - url: https://github.com/owner/name/pull/8
        base: '${target.baseSha}'
        reviewed_head: '${reviewed}'
        observed_head: null
        observed_base: null
        status: open
oat_milestone_gates:`,
              )
            : recorded
        }`;
      },
    });
    let fix = chain.reviewed;
    if (!options.unmoved) {
      if (options.gateConfigChange === undefined) {
        await target.writeRepo('src/app.ts', 'export const value = 3;\n');
      } else {
        await target.writeRepo('.oat/config.json', options.gateConfigChange);
      }
      fix = target.commitAll('fix: post-gate change on the member PR');
    }
    const gh = stubGh(() => ({
      state: options.prState ?? 'MERGED',
      head: fix,
      base: target.baseSha,
    }));
    expect((await refresh(target, gh)).exitCode).toBe(0);
    if (!options.unmoved) {
      await target.write(
        'state.md',
        (await target.read('state.md')).replace(
          'oat_milestone_status: delivered',
          `oat_milestone_status: reviewing
oat_goal_recovery:
  milestone: m01
  delivery_id: d01
  phase_ids: [p01, p02]
  stage: exit_gate
  review_artifact: null`,
        ),
      );
    }
    target.commitAll('chore(oat): route d01 to recovery');
    return { reviewed: chain.reviewed, fix, gh };
  }

  it('waives a head-moved delivery, restores the record, and clears check and the router', async () => {
    repo = await createGoalRepo();
    const { fix, gh } = await staleDelivery(repo);
    const before = await repo.read('state.md');
    expect(deliveryRecord(before)['integrated_review']).toMatchObject({
      disposition: 'stale',
    });
    expect((await check(repo)).payload).toMatchObject({
      status: 'undeliverable',
    });
    const routedBefore = (await getProjectState(repo.projectPath))
      .recommendation;
    expect(routedBefore).toMatchObject({
      skill: 'oat-project-implement',
      context: expect.stringContaining('closeout m01/d01'),
    });

    const waived = await waive(repo, gh);
    expect(waived.exitCode).toBe(0);
    expect(waived.payload).toMatchObject({
      status: 'waived',
      deliveryId: 'd01',
      waiver: {
        waived_by: 'Operator',
        reason: 'post-gate fix squash-merged with the PR',
        waived_at: NOW,
        members: [{ url: MEMBER_URL, waived_head: fix }],
      },
      restoredWorkingCarrier: true,
      clearedRecovery: true,
      restoredMilestoneStatus: 'delivered',
    });

    const after = await repo.read('state.md');
    const record = deliveryRecord(after);
    const state = frontmatter(after);
    expect(record['freshness_waivers']).toEqual([
      {
        waived_by: 'Operator',
        reason: 'post-gate fix squash-merged with the PR',
        waived_at: NOW,
        members: [{ url: MEMBER_URL, waived_head: fix }],
      },
    ]);
    expect(record['integrated_review']).toMatchObject({
      disposition: 'passed',
    });
    // The set-once exit_gate and the reviewed revisions are untouched.
    expect(record['exit_gate']).toEqual(deliveryRecord(before)['exit_gate']);
    expect(record['members']).toEqual(deliveryRecord(before)['members']);
    expect(record['integrated_review']).toEqual({
      ...(deliveryRecord(before)['integrated_review'] as object),
      disposition: 'passed',
    });
    expect(state['oat_milestone_gates']).toMatchObject({
      m01: { exit: { freshness: 'fresh', freshness_reason: null } },
    });
    expect(state['oat_goal_recovery']).toBeNull();
    expect(state['oat_milestone_status']).toBe('delivered');

    // With no further change: check is ok and the router leaves recovery.
    expect(await check(repo)).toMatchObject({
      payload: { status: 'ok' },
      exitCode: 0,
    });
    expect((await getProjectState(repo.projectPath)).recommendation).toEqual(
      expect.objectContaining({
        skill: 'oat-project-goal',
        context: 'realign m01',
      }),
    );

    // Committing the waiver keeps it fresh, and a refresh does not undo it.
    repo.commitAll('chore(oat): waive d01');
    expect((await refresh(repo, gh)).exitCode).toBe(0);
    expect(
      deliveryRecord(await repo.read('state.md'))['integrated_review'],
    ).toMatchObject({ disposition: 'passed' });
    expect((await check(repo)).payload).toMatchObject({ status: 'ok' });
  });

  it('stales a waived open delivery again on a later substantive push, but not on the waiver commit', async () => {
    repo = await createGoalRepo();
    const { gh } = await staleDelivery(repo, { prState: 'OPEN' });
    expect((await waive(repo, gh)).exitCode).toBe(0);
    const waiverCommit = repo.commitAll('chore(oat): waive d01');

    // The waiver commit itself, pushed to the open member, is bookkeeping.
    const pushed = stubGh(() => ({
      state: 'OPEN',
      head: waiverCommit,
      base: repo!.baseSha,
    }));
    expect((await refresh(repo, pushed)).exitCode).toBe(0);
    expect((await check(repo)).payload).toMatchObject({ status: 'ok' });
    repo.commitAll('chore(oat): observe the waiver commit');

    await repo.writeRepo('src/app.ts', 'export const value = 9;\n');
    const later = repo.commitAll('feat: substantive push after the waiver');
    const moved = stubGh(() => ({
      state: 'OPEN',
      head: later,
      base: repo!.baseSha,
    }));
    expect((await refresh(repo, moved)).exitCode).toBe(0);
    expect(
      deliveryRecord(await repo.read('state.md'))['integrated_review'],
    ).toMatchObject({ disposition: 'stale' });
    const stale = await check(repo);
    expect(stale.exitCode).toBe(1);
    expect(JSON.stringify(stale.payload)).toMatch(
      /disallowed-path[^"]*src\/app\.ts/,
    );
  });

  describe('refusals write nothing and carry a stable code', () => {
    async function expectRefused(
      target: GoalRepo,
      result: Awaited<ReturnType<typeof waive>>,
      code: string,
      before: string,
    ) {
      expect(result.exitCode).toBe(1);
      expect(result.payload).toMatchObject({ status: 'refused', code });
      expect(await target.read('state.md')).toBe(before);
    }

    it('refuses an autonomous run before observing anything', async () => {
      repo = await createGoalRepo();
      const { gh } = await staleDelivery(repo);
      const before = await repo.read('state.md');
      const calls = gh.calls.length;
      await expectRefused(
        repo,
        await waive(repo, gh, { env: { OAT_AUTONOMOUS: '1' } }),
        'autonomous',
        before,
      );
      expect(gh.calls.length).toBe(calls);
    });

    it('refuses when live observation fails', async () => {
      repo = await createGoalRepo();
      await staleDelivery(repo);
      const before = await repo.read('state.md');
      const result = await waive(
        repo,
        stubGh(() => 'fail'),
      );
      await expectRefused(repo, result, 'observation-failed', before);
      expect(result.payload['failures']).toEqual([
        expect.stringContaining('HTTP 502'),
      ]);
    });

    it('refuses a member head missing locally with a fetch hint', async () => {
      repo = await createGoalRepo();
      await staleDelivery(repo);
      const before = await repo.read('state.md');
      const result = await waive(
        repo,
        stubGh(() => ({
          state: 'MERGED',
          head: 'a'.repeat(40),
          base: repo!.baseSha,
        })),
      );
      await expectRefused(repo, result, 'missing-object', before);
      expect(String(result.payload['message'])).toContain(
        'git fetch origin pull/7/head',
      );
    });

    it('refuses a delivery that is already fresh', async () => {
      repo = await createGoalRepo();
      const { gh } = await staleDelivery(repo, { unmoved: true });
      const before = await repo.read('state.md');
      await expectRefused(repo, await waive(repo, gh), 'already-fresh', before);
    });

    it('names the review recovery when the stored disposition is stale but live evidence reads fresh', async () => {
      repo = await createGoalRepo();
      const { gh } = await staleDelivery(repo, { unmoved: true });
      // A record staled earlier (for example while the PR head had moved)
      // whose live evidence reads fresh again.
      const state = await repo.read('state.md');
      const record = deliveryRecord(state);
      expect(record['integrated_review']).toMatchObject({
        disposition: 'passed',
      });
      const staled = state.replace(
        /(integrated_review:\n(?: {6}.*\n)*? {6}disposition: )passed/,
        '$1stale',
      );
      expect(deliveryRecord(staled)['integrated_review']).toMatchObject({
        disposition: 'stale',
      });
      await repo.write('state.md', staled);
      repo.commitAll('chore(oat): record a stale disposition');
      expect((await check(repo)).payload).toMatchObject({
        status: 'undeliverable',
      });
      const before = await repo.read('state.md');
      const result = await waive(repo, gh);
      await expectRefused(repo, result, 'already-fresh', before);
      const message = String(result.payload['message']);
      expect(message).toContain(
        'recorded integrated_review.disposition is stale',
      );
      expect(message).toContain(
        'oat-project-review-provide, then oat-project-review-receive',
      );
      expect(message).not.toContain('nothing to waive');
    });

    it('refuses when the governing review row has fixes queued', async () => {
      repo = await createGoalRepo();
      const { reviewed, gh } = await staleDelivery(repo);
      // Receive queued fixes on the recorded artifact itself.
      await repo.write(
        'plan.md',
        goalPlan({
          reviews: reviewRow('fixes_added', ARCHIVED_REVIEW_ARTIFACT, reviewed),
        }),
      );
      repo.commitAll('chore(oat): receive a review that queues fixes');
      const before = await repo.read('state.md');
      const result = await waive(repo, gh);
      await expectRefused(repo, result, 'review-not-passed', before);
      expect(String(result.payload['message'])).toContain('status fixes_added');
    });

    it('refuses when a newer passed review names a different artifact than the record', async () => {
      repo = await createGoalRepo();
      const { reviewed, gh } = await staleDelivery(repo);
      await repo.write(
        'plan.md',
        goalPlan({
          reviews: [
            reviewRow('passed', ARCHIVED_REVIEW_ARTIFACT, reviewed),
            reviewRow('passed', 'reviews/m01-code-review-r2.md', reviewed),
          ].join('\n'),
        }),
      );
      repo.commitAll('chore(oat): record a newer, unreceived review');
      const before = await repo.read('state.md');
      await expectRefused(
        repo,
        await waive(repo, gh),
        'review-not-passed',
        before,
      );
    });

    it('refuses a blocked delivery exit_gate', async () => {
      repo = await createGoalRepo();
      const { gh } = await staleDelivery(repo, { bindingStatus: 'blocked' });
      const before = await repo.read('state.md');
      const result = await waive(repo, gh);
      await expectRefused(repo, result, 'carrier-not-allowed', before);
      expect(String(result.payload['message'])).toContain('delivery exit_gate');
    });

    it('refuses a base change, which a waiver never covers', async () => {
      repo = await createGoalRepo();
      const { reviewed, fix } = await staleDelivery(repo);
      const before = await repo.read('state.md');
      const result = await waive(
        repo,
        stubGh(() => ({ state: 'MERGED', head: fix, base: reviewed })),
      );
      await expectRefused(repo, result, 'not-head-movement', before);
      expect(String(result.payload['message'])).toMatch(/base-changed/);
    });

    it('refuses a no_gate carrier after a later commit configures the gate', async () => {
      // The final exit gate's H1 probe: the unwaived delivery is stale, and
      // the waiver would also skip the commit that configured a blocking gate
      // that never ran.
      repo = await createGoalRepo();
      const { gh } = await staleDelivery(repo, {
        noGate: true,
        gateConfigChange: exitGateConfig('false'),
      });
      const before = await repo.read('state.md');
      expect((await check(repo)).payload).toMatchObject({
        status: 'undeliverable',
      });
      const result = await waive(repo, gh);
      await expectRefused(repo, result, 'configuration-changed', before);
      expect(String(result.payload['message'])).toContain(
        'the gate now resolves as configured, not no_gate',
      );
      expect((await check(repo)).payload).toMatchObject({
        status: 'undeliverable',
      });
    });

    it('refuses a configured carrier after a later commit changes the gate command', async () => {
      repo = await createGoalRepo();
      const { gh } = await staleDelivery(repo, {
        gateConfigChange: exitGateConfig('false'),
      });
      const before = await repo.read('state.md');
      const result = await waive(repo, gh);
      await expectRefused(repo, result, 'configuration-changed', before);
      expect(String(result.payload['message'])).toContain(
        '.oat/config.json changed between',
      );
    });

    it('refuses a delivery that is not open or at its endpoint', async () => {
      repo = await createGoalRepo();
      const { gh } = await staleDelivery(repo);
      const state = await repo.read('state.md');
      const superseded = state.replace(
        /^ {4}status: (?:open|at_endpoint)$/m,
        '    status: superseded',
      );
      expect(deliveryRecord(superseded)['status']).toBe('superseded');
      await repo.write('state.md', superseded);
      repo.commitAll('chore(oat): supersede d01');
      const before = await repo.read('state.md');
      await expectRefused(
        repo,
        await waive(repo, gh),
        'delivery-not-observable',
        before,
      );
    });

    it('refuses no_gate carriers when an untracked local config now configures the gate', async () => {
      // The tracked-file comparison cannot see `.oat/config.local.json`; the
      // resolution check must.
      repo = await createGoalRepo();
      const { gh } = await staleDelivery(repo, { noGate: true });
      await repo.writeRepo('.oat/config.local.json', exitGateConfig('false'));
      const before = await repo.read('state.md');
      const result = await waive(repo, gh);
      await expectRefused(repo, result, 'configuration-changed', before);
      const message = String(result.payload['message']);
      expect(message).toContain(
        'the gate now resolves as configured, not no_gate',
      );
    });

    it('refuses a config change after the bound revision of a member with no recorded reviewed_head', async () => {
      // No carrier pair exists (`no_gate`) and the gate still resolves as
      // `no_gate`, so only the member's bound-revision anchor spans the change.
      repo = await createGoalRepo();
      const { gh } = await staleDelivery(repo, {
        noGate: true,
        unrecordedMemberHead: true,
        gateConfigChange: '{ "version": 1, "unrelated": true }\n',
      });
      const before = await repo.read('state.md');
      const record = deliveryRecord(before);
      const [member] = record['members'] as Record<string, unknown>[];
      expect(member!['reviewed_head']).toBeNull();
      const review = record['integrated_review'] as {
        bound_revisions: { head: string | null }[];
      };
      expect(review.bound_revisions[0]!.head).not.toBeNull();
      const result = await waive(repo, gh);
      await expectRefused(repo, result, 'configuration-changed', before);
      expect(String(result.payload['message'])).toContain(
        '.oat/config.json changed between',
      );
    });

    it('refuses an unknown delivery', async () => {
      repo = await createGoalRepo();
      const { gh } = await staleDelivery(repo);
      const before = await repo.read('state.md');
      await expectRefused(
        repo,
        await waive(repo, gh, { delivery: 'd09' }),
        'unknown-delivery',
        before,
      );
    });
  });

  it('waives head movement over no_gate carriers while no gate is configured', async () => {
    // The accepted control for the configuration refusals.
    repo = await createGoalRepo();
    const { fix, gh } = await staleDelivery(repo, { noGate: true });
    const waived = await waive(repo, gh);
    expect(waived).toMatchObject({
      exitCode: 0,
      payload: {
        status: 'waived',
        waiver: { members: [{ url: MEMBER_URL, waived_head: fix }] },
      },
    });
    repo.commitAll('chore(oat): record the d01 freshness waiver');
    expect((await check(repo)).payload).toMatchObject({ status: 'ok' });
  });

  /**
   * A two-member stack: the lower layer L (no gate configured), then the
   * upper layer configures the `oat-project-implement` gate and is reviewed
   * at U with configured carriers bound to U; refresh observes L unchanged
   * and the tip at a later fix F that changes `tipChange` only.
   */
  async function staleStack(target: GoalRepo, tipChange: [string, string]) {
    await target.writeRepo('.oat/config.json', '{ "version": 1 }\n');
    await target.writeRepo('src/lower.ts', 'export const lower = 1;\n');
    const lower = target.commitAll('feat: lower layer');
    await target.writeRepo('.oat/config.json', exitGateConfig('true'));
    target.commitAll('chore: configure the exit gate in the upper layer');
    const lowerUrl = 'https://github.com/owner/name/pull/6';
    const chain = await bookkeepingChain(target, {
      register: (reviewed) =>
        `oat_milestone: m01\noat_milestone_status: delivered\n${registryYaml({
          reviewed,
          base: target.baseSha,
          kind: 'stack',
          members: [
            {
              url: lowerUrl,
              base: target.baseSha,
              reviewedHead: lower,
              observedHead: lower,
              observedBase: target.baseSha,
            },
            {
              url: MEMBER_URL,
              base: lower,
              reviewedHead: reviewed,
              observedHead: reviewed,
              observedBase: lower,
            },
          ],
          deliveryExitGate: configuredCarrier(reviewed),
          exit: configuredCarrier(reviewed),
        })}`,
    });
    await target.writeRepo(...tipChange);
    const fix = target.commitAll('fix: post-gate change on the tip layer');
    const observed: Record<string, Observation> = {
      [lowerUrl]: { state: 'OPEN', head: lower, base: target.baseSha },
      [MEMBER_URL]: { state: 'OPEN', head: fix, base: lower },
    };
    const gh: GhRunner = {
      run: (args) => {
        const observation = observed[args.find((arg) => arg in observed)!]!;
        return Promise.resolve({
          code: 0,
          stdout: JSON.stringify({
            state: observation.state,
            headRefOid: observation.head,
            baseRefOid: observation.base,
          }),
          stderr: '',
        });
      },
    };
    expect((await refresh(target, gh)).exitCode).toBe(0);
    target.commitAll('chore(oat): record the stack observations');
    return { reviewed: chain.reviewed, lower, fix, gh };
  }

  it('waives tip-only movement of a stack whose upper layer configured the gate', async () => {
    // Accepted control: the tip carrier's configuration is compared with the
    // tip only, never with the unchanged lower layer's older tree.
    repo = await createGoalRepo();
    const { lower, fix, gh } = await staleStack(repo, [
      'src/app.ts',
      'export const value = 3;\n',
    ]);
    expect((await check(repo)).payload).toMatchObject({
      status: 'undeliverable',
    });
    const waived = await waive(repo, gh);
    expect(waived).toMatchObject({
      exitCode: 0,
      payload: {
        status: 'waived',
        waiver: {
          members: [
            { waived_head: lower },
            { url: MEMBER_URL, waived_head: fix },
          ],
        },
      },
    });
    repo.commitAll('chore(oat): record the d01 freshness waiver');
    expect((await check(repo)).payload).toMatchObject({ status: 'ok' });
  });

  it('refuses a stack whose tip changes the gate configuration after the carrier reviewed it', async () => {
    repo = await createGoalRepo();
    const { gh } = await staleStack(repo, [
      '.oat/config.json',
      exitGateConfig('false'),
    ]);
    const before = await repo.read('state.md');
    const result = await waive(repo, gh);
    expect(result.exitCode).toBe(1);
    expect(result.payload).toMatchObject({
      status: 'refused',
      code: 'configuration-changed',
    });
    expect(String(result.payload['message'])).toContain(
      '.oat/config.json changed between',
    );
    expect(await repo.read('state.md')).toBe(before);
  });

  /**
   * Carriers bound to an earlier head C, `.oat/config.json` changed in C..R,
   * the integrated review (and each member's `reviewed_head`) at R, then a
   * source-only move to F. Only the carrier's own C..F walk spans the change.
   */
  async function carrierBeforeReconfiguration(
    target: GoalRepo,
    kind: 'pr' | 'stack',
  ) {
    await target.writeRepo('.oat/config.json', exitGateConfig('true'));
    let lower: string | null = null;
    if (kind === 'stack') {
      await target.writeRepo('src/lower.ts', 'export const lower = 1;\n');
      lower = target.commitAll('feat: lower layer');
    }
    await target.writeRepo('src/gated.ts', 'export const gated = 1;\n');
    const carrierHead = target.commitAll(
      'feat: the change the exit gate ran on',
    );
    await target.writeRepo('.oat/config.json', exitGateConfig('false'));
    target.commitAll('chore: reconfigure the exit gate before the review');
    const lowerUrl = 'https://github.com/owner/name/pull/6';
    await bookkeepingChain(target, {
      register: (reviewed) =>
        `oat_milestone: m01\noat_milestone_status: delivered\n${registryYaml({
          reviewed,
          base: target.baseSha,
          kind,
          ...(lower === null
            ? {}
            : {
                members: [
                  {
                    url: lowerUrl,
                    base: target.baseSha,
                    reviewedHead: lower,
                    observedHead: lower,
                    observedBase: target.baseSha,
                  },
                  {
                    url: MEMBER_URL,
                    base: lower,
                    reviewedHead: reviewed,
                    observedHead: reviewed,
                    observedBase: lower,
                  },
                ],
              }),
          deliveryExitGate: configuredCarrier(carrierHead),
          exit: configuredCarrier(carrierHead),
        })}`,
    });
    await target.writeRepo('src/app.ts', 'export const value = 3;\n');
    const fix = target.commitAll('fix: post-review change');
    const observed: Record<string, Observation> = {
      [MEMBER_URL]: {
        state: 'OPEN',
        head: fix,
        base: lower ?? target.baseSha,
      },
      ...(lower === null
        ? {}
        : {
            [lowerUrl]: {
              state: 'OPEN' as const,
              head: lower,
              base: target.baseSha,
            },
          }),
    };
    const gh: GhRunner = {
      run: (args) => {
        const observation = observed[args.find((arg) => arg in observed)!]!;
        return Promise.resolve({
          code: 0,
          stdout: JSON.stringify({
            state: observation.state,
            headRefOid: observation.head,
            baseRefOid: observation.base,
          }),
          stderr: '',
        });
      },
    };
    expect((await refresh(target, gh)).exitCode).toBe(0);
    target.commitAll('chore(oat): record the observations');
    return { carrierHead, gh };
  }

  for (const kind of ['pr', 'stack'] as const) {
    it(`refuses a ${kind} whose carrier walk alone spans a gate reconfiguration`, async () => {
      repo = await createGoalRepo();
      const { carrierHead, gh } = await carrierBeforeReconfiguration(
        repo,
        kind,
      );
      const before = await repo.read('state.md');
      const result = await waive(repo, gh);
      expect(result.exitCode).toBe(1);
      expect(result.payload).toMatchObject({
        status: 'refused',
        code: 'configuration-changed',
      });
      expect(String(result.payload['message'])).toContain(
        `.oat/config.json changed between ${carrierHead}`,
      );
      expect(await repo.read('state.md')).toBe(before);
    });
  }

  it('waives only the named delivery on a shared member PR, never its sibling', async () => {
    repo = await createGoalRepo();
    const shared = await sharedMemberScenario(repo);
    await repo.write(
      'state.md',
      goalState(
        `oat_milestone: m02\noat_milestone_status: delivered\n${shared.registry()}`,
      ),
    );
    repo.commitAll('chore(oat): register d01 and d02');
    await repo.writeRepo('src/app.ts', 'export const value = 7;\n');
    const fix = repo.commitAll('fix: post-gate change on the shared PR');
    const gh = stubGh(() => ({
      state: 'MERGED',
      head: fix,
      base: repo!.baseSha,
    }));
    expect((await refresh(repo, gh)).exitCode).toBe(0);
    repo.commitAll('chore(oat): refresh');
    const d01Before = deliveryRecord(await repo.read('state.md'), 'd01');

    expect((await waive(repo, gh, { delivery: 'd02' })).exitCode).toBe(0);
    const after = await repo.read('state.md');
    expect(deliveryRecord(after, 'd01')).toEqual(d01Before);
    expect(deliveryRecord(after, 'd02')['freshness_waivers']).toHaveLength(1);
    expect((await check(repo, 'd02')).payload).toMatchObject({ status: 'ok' });
    expect((await check(repo, 'd01')).payload).toMatchObject({
      status: 'undeliverable',
    });
  });

  it('appends a second waiver after the first and keeps the first intact', async () => {
    repo = await createGoalRepo();
    const { gh } = await staleDelivery(repo, { prState: 'OPEN' });
    expect((await waive(repo, gh)).exitCode).toBe(0);
    repo.commitAll('chore(oat): waive d01');
    const first = deliveryRecord(await repo.read('state.md'))[
      'freshness_waivers'
    ] as unknown[];

    await repo.writeRepo('src/app.ts', 'export const value = 11;\n');
    const later = repo.commitAll('fix: second post-gate change');
    const moved = stubGh(() => ({
      state: 'OPEN',
      head: later,
      base: repo!.baseSha,
    }));
    expect((await waive(repo, moved)).exitCode).toBe(0);
    const waivers = deliveryRecord(await repo.read('state.md'))[
      'freshness_waivers'
    ] as Record<string, unknown>[];
    expect(waivers).toHaveLength(2);
    expect(waivers[0]).toEqual(first[0]);
    expect(waivers[1]).toMatchObject({
      members: [{ url: MEMBER_URL, waived_head: later }],
    });
    expect((await check(repo)).payload).toMatchObject({ status: 'ok' });
  });

  it('records the first endpoint attainment itself when the member merged after refresh last saw it open', async () => {
    repo = await createGoalRepo();
    const { fix } = await staleDelivery(repo, { prState: 'OPEN' });
    const before = deliveryRecord(await repo.read('state.md'));
    expect(before['status']).toBe('open');
    expect(before['endpoint_attainment'] ?? null).toBeNull();

    const merged = stubGh(() => ({
      state: 'MERGED',
      head: fix,
      base: repo!.baseSha,
    }));
    expect((await waive(repo, merged)).exitCode).toBe(0);
    const attained = {
      status: 'at_endpoint',
      endpoint_attainment: {
        observed_at: NOW,
        members: [
          {
            url: MEMBER_URL,
            head: fix,
            base: repo.baseSha,
            status: 'merged',
          },
        ],
      },
    };
    expect(deliveryRecord(await repo.read('state.md'))).toMatchObject(attained);

    // A later refresh never rewrites the attainment waive recorded first.
    repo.commitAll('chore(oat): waive d01');
    expect((await refresh(repo, merged)).exitCode).toBe(0);
    expect(deliveryRecord(await repo.read('state.md'))).toMatchObject(attained);
  });

  it('restores the working carrier only for the milestone latest delivery', async () => {
    repo = await createGoalRepo();
    const { gh } = await staleDelivery(repo, { laterDelivery: true });
    const waived = await waive(repo, gh);
    expect(waived.payload).toMatchObject({
      status: 'waived',
      restoredWorkingCarrier: false,
    });
    const state = frontmatter(await repo.read('state.md'));
    expect(state['oat_milestone_gates']).toMatchObject({
      m01: { exit: { freshness: 'stale' } },
    });
    expect(
      deliveryRecord(await repo.read('state.md'))['integrated_review'],
    ).toMatchObject({ disposition: 'passed' });
    // `delivery check` judges the working carrier live, so d01 is ok.
    expect((await check(repo)).payload).toMatchObject({ status: 'ok' });
  });

  it('defaults --by to git user.name', async () => {
    repo = await createGoalRepo();
    const { gh } = await staleDelivery(repo);
    const result = await waive(repo, gh, { by: null });
    expect(result.payload).toMatchObject({
      status: 'waived',
      waiver: { waived_by: 'Delivery Test' },
    });
  });

  it('prints the waiver and the next step without --json', async () => {
    repo = await createGoalRepo();
    const { fix, gh } = await staleDelivery(repo);
    const capture = createLoggerCapture();
    process.exitCode = undefined;
    const program = new Command().name('oat').exitOverride();
    const project = new Command('project');
    const delivery = new Command('delivery');
    delivery.addCommand(
      createProjectDeliveryWaiveCommand({
        buildCommandContext: context(repo, capture),
        resolveProjectRoot: async () => repo!.root,
        gh,
        env: {},
        now: () => new Date(NOW),
      }),
    );
    project.addCommand(delivery);
    program.addCommand(project);
    await program.parseAsync(
      [
        'project',
        'delivery',
        'waive',
        '--project',
        PROJECT_REL,
        '--delivery',
        'd01',
        '--reason',
        'accepted',
        '--by',
        'Operator',
      ],
      { from: 'user' },
    );
    expect(process.exitCode).toBe(0);
    const text = capture.info.join('\n');
    expect(text).toContain(`Waived d01 at ${fix}`);
    expect(text).toContain('was stale: integrated review');
    expect(text).toContain('next: commit');
  });
});
