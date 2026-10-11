import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { GhRunner } from '@commands/project/links/refresh';
import { CliError } from '@errors/cli-error';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import {
  bookkeepingChain,
  createGoalRepo,
  goalState,
  PROJECT_REL,
  registryYaml,
  removeRepo,
  type GoalRepo,
} from './__tests__/goal-repo';
import {
  applyObservationWrites,
  createProjectDeliveryRefreshCommand,
} from './refresh';

const MEMBER_URL = 'https://github.com/owner/name/pull/7';

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
      if (observation === 'fail') {
        return Promise.resolve({
          code: 1,
          stdout: '',
          stderr: 'HTTP 502',
        });
      }
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
}

async function refresh(
  repo: GoalRepo,
  gh: GhRunner,
  now = '2026-10-11T12:00:00.000Z',
): Promise<{ payload: Record<string, unknown>; exitCode: number | undefined }> {
  const capture = createLoggerCapture();
  const command = createProjectDeliveryRefreshCommand({
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
    gh,
    now: () => new Date(now),
  });
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  const delivery = new Command('delivery');
  delivery.addCommand(command);
  project.addCommand(delivery);
  program.addCommand(project);
  await program.parseAsync(
    ['--json', 'project', 'delivery', 'refresh', '--project', PROJECT_REL],
    { from: 'user' },
  );
  return {
    payload: capture.jsonPayloads[0] as Record<string, unknown>,
    exitCode: process.exitCode as number | undefined,
  };
}

function frontmatter(content: string): Record<string, unknown> {
  return YAML.parse(content.match(/^---\n([\s\S]*?)\n---/)![1]!) as Record<
    string,
    unknown
  >;
}

function d01(content: string): Record<string, unknown> {
  return (
    frontmatter(content)['oat_deliveries'] as Record<string, unknown>[]
  )[0]!;
}

function member(content: string): Record<string, unknown> {
  return (d01(content)['members'] as Record<string, unknown>[])[0]!;
}

describe('oat project delivery refresh', () => {
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

  async function registered(
    options: { endpoint?: string; exit?: (reviewed: string) => string } = {},
  ) {
    repo = await createGoalRepo();
    const base = repo.baseSha;
    const chain = await bookkeepingChain(repo, {
      register: (reviewed) =>
        `oat_milestone: m01\noat_milestone_status: delivered\noat_goal_recovery: null\n${registryYaml(
          {
            reviewed,
            base,
            ...(options.endpoint ? { endpoint: options.endpoint } : {}),
            ...(options.exit ? { exit: options.exit(reviewed) } : {}),
          },
        )}`,
    });
    return chain;
  }

  it('records observations for an open member and leaves fresh evidence untouched', async () => {
    const chain = await registered();
    const gh = stubGh(() => ({
      state: 'OPEN',
      head: chain.registered,
      base: repo!.baseSha,
    }));

    const { payload, exitCode } = await refresh(repo!, gh);

    expect(exitCode).toBe(0);
    expect(gh.calls).toEqual([
      ['pr', 'view', MEMBER_URL, '--json', 'state,headRefOid,baseRefOid'],
    ]);
    const content = await repo!.read('state.md');
    expect(member(content)).toMatchObject({
      reviewed_head: chain.reviewed,
      base: repo!.baseSha,
      observed_head: chain.registered,
      observed_base: repo!.baseSha,
      status: 'open',
    });
    // `merged` endpoint not yet observed: still open, no attainment.
    expect(d01(content)).toMatchObject({ status: 'open' });
    expect(d01(content)['endpoint_attainment']).toBeUndefined();
    // Fresh under the bookkeeping-successor contract: nothing derived.
    expect(d01(content)['integrated_review']).toMatchObject({
      disposition: 'passed',
    });
    expect(payload).toMatchObject({ status: 'ok', changed: true });
    // Refresh never writes milestone status or recovery.
    expect(frontmatter(content)).toMatchObject({
      oat_milestone_status: 'delivered',
      oat_goal_recovery: null,
    });
  });

  it('records endpoint attainment once and status at_endpoint when the agreed endpoint is observed', async () => {
    const chain = await registered();
    await refresh(
      repo!,
      stubGh(() => ({
        state: 'MERGED',
        head: chain.registered,
        base: repo!.baseSha,
      })),
    );
    const content = await repo!.read('state.md');
    expect(d01(content)).toMatchObject({
      status: 'at_endpoint',
      endpoint_attainment: {
        observed_at: '2026-10-11T12:00:00.000Z',
        members: [
          {
            url: MEMBER_URL,
            head: chain.registered,
            base: repo!.baseSha,
            status: 'merged',
          },
        ],
      },
    });
  });

  it('treats an observed open member as the `open` endpoint', async () => {
    const chain = await registered({ endpoint: 'open' });
    await refresh(
      repo!,
      stubGh(() => ({
        state: 'OPEN',
        head: chain.registered,
        base: repo!.baseSha,
      })),
    );
    expect(d01(await repo!.read('state.md'))).toMatchObject({
      status: 'at_endpoint',
    });
  });

  describe('never-overwrite rule (A4)', () => {
    it('preserves the first endpoint attainment and reviewed revisions while a plain refresh still updates observed_*', async () => {
      const chain = await registered();
      await refresh(
        repo!,
        stubGh(() => ({
          state: 'MERGED',
          head: chain.registered,
          base: repo!.baseSha,
        })),
      );
      const first = d01(await repo!.read('state.md'))['endpoint_attainment'];

      // A later observation of a different head after a bookkeeping commit.
      await repo!.write('project-log.md', '# Log\n\n- merged\n');
      const later = repo!.commitAll('chore(oat): log merge');
      process.exitCode = undefined;
      await refresh(
        repo!,
        stubGh(() => ({ state: 'MERGED', head: later, base: repo!.baseSha })),
        '2026-10-12T09:00:00.000Z',
      );

      const content = await repo!.read('state.md');
      expect(d01(content)['endpoint_attainment']).toEqual(first);
      expect(member(content)).toMatchObject({
        reviewed_head: chain.reviewed,
        base: repo!.baseSha,
        observed_head: later,
      });
      expect(
        (d01(content)['integrated_review'] as Record<string, unknown>)[
          'bound_revisions'
        ],
      ).toEqual([{ member: 0, base: repo!.baseSha, head: chain.reviewed }]);
    });

    it('refuses to let an observation rewrite a reviewed revision or a recorded attainment', () => {
      const reviewed = 'a'.repeat(40);
      const content = goalState(
        `oat_milestone: m01\n${registryYaml({
          reviewed,
          base: 'b'.repeat(40),
          attainment: `    endpoint_attainment:\n      observed_at: '2026-10-01T00:00:00Z'\n      members: []\n`,
        })}`,
      );
      const result = applyObservationWrites(content, [
        {
          path: [
            'oat_deliveries',
            { deliveryId: 'd01' },
            'members',
            0,
            'reviewed_head',
          ],
          value: 'c'.repeat(40),
          mode: 'observe',
        },
        {
          path: [
            'oat_deliveries',
            { deliveryId: 'd01' },
            'endpoint_attainment',
          ],
          value: { observed_at: '2026-10-12T00:00:00Z', members: [] },
          mode: 'observe',
        },
        {
          path: [
            'oat_deliveries',
            { deliveryId: 'd01' },
            'members',
            0,
            'observed_head',
          ],
          value: 'c'.repeat(40),
          mode: 'observe',
        },
      ]);
      expect(member(result.content)).toMatchObject({
        reviewed_head: reviewed,
        observed_head: 'c'.repeat(40),
      });
      expect(d01(result.content)['endpoint_attainment']).toMatchObject({
        observed_at: '2026-10-01T00:00:00Z',
      });
      expect(result.applied).toHaveLength(1);
    });

    it('refuses a status or disposition leaf outside the observation paths', () => {
      const reviewed = 'a'.repeat(40);
      const content = goalState(
        `oat_milestone: m01\n${registryYaml({
          reviewed,
          base: 'b'.repeat(40),
          status: 'at_endpoint',
          memberStatus: 'merged',
        })}`,
      );
      const d01Ref = { deliveryId: 'd01' };
      const m01 = { milestone: 'm01' };
      const result = applyObservationWrites(content, [
        // Carrier outcome fields share the leaf names but are evidence.
        {
          path: ['oat_milestone_gates', m01, 'exit', 'status'],
          value: 'blocked',
          mode: 'observe',
        },
        {
          path: ['oat_milestone_gates', m01, 'exit', 'disposition'],
          value: 'failed',
          mode: 'observe',
        },
        // A delivery past `open` never regresses.
        {
          path: ['oat_deliveries', d01Ref, 'status'],
          value: 'open',
          mode: 'observe',
        },
        // The member observation path still updates.
        {
          path: ['oat_deliveries', d01Ref, 'members', 0, 'status'],
          value: 'closed',
          mode: 'observe',
        },
      ]);
      const parsed = frontmatter(result.content);
      const gates = parsed['oat_milestone_gates'] as Record<
        string,
        Record<string, Record<string, unknown>>
      >;
      expect(gates['m01']!['exit']).toMatchObject({
        status: 'allowed',
        disposition: 'no_gate',
      });
      expect(d01(result.content)).toMatchObject({ status: 'at_endpoint' });
      expect(member(result.content)).toMatchObject({ status: 'closed' });
      expect(result.applied).toHaveLength(1);
    });

    it('refuses to write milestone status or goal recovery', () => {
      const content = goalState(
        'oat_milestone: m01\noat_milestone_status: delivered',
      );
      for (const key of ['oat_milestone_status', 'oat_goal_recovery']) {
        expect(() =>
          applyObservationWrites(content, [
            { path: [key], value: 'reviewing', mode: 'observe' },
          ]),
        ).toThrow(CliError);
      }
    });
  });

  it('marks a substantive successor stale on the review and the exit carrier without touching status or recovery', async () => {
    const chain = await registered({
      exit: (reviewed) => `      status: allowed
      resolution: configured
      disposition: passed
      config_fingerprint: null
      reviewed_head: '${reviewed}'
      subject: { kind: code, scope: [p01, p02] }
      decided_at: '2026-10-11T10:00:00Z'
      freshness: fresh
      freshness_reason: null`,
    });
    await repo!.writeRepo('src/app.ts', 'export const value = 7;\n');
    const substantive = repo!.commitAll('feat: after review');

    const { payload } = await refresh(
      repo!,
      stubGh(() => ({ state: 'OPEN', head: substantive, base: repo!.baseSha })),
    );

    const content = await repo!.read('state.md');
    expect(
      (d01(content)['integrated_review'] as Record<string, unknown>)[
        'disposition'
      ],
    ).toBe('stale');
    const gates = frontmatter(content)['oat_milestone_gates'] as Record<
      string,
      Record<string, Record<string, unknown>>
    >;
    expect(gates['m01']!['exit']).toMatchObject({
      status: 'allowed',
      reviewed_head: chain.reviewed,
      freshness: 'stale',
      freshness_reason: expect.stringContaining(
        'delivery refresh (d01): disallowed-path',
      ),
    });
    expect(member(content)['reviewed_head']).toBe(chain.reviewed);
    expect(frontmatter(content)).toMatchObject({
      oat_milestone_status: 'delivered',
      oat_goal_recovery: null,
    });
    expect(payload).toMatchObject({ status: 'ok' });
  });

  it('marks the review stale when the member base changed', async () => {
    const chain = await registered();
    await refresh(
      repo!,
      stubGh(() => ({
        state: 'OPEN',
        head: chain.reviewed,
        base: chain.headRecording,
      })),
    );
    const content = await repo!.read('state.md');
    expect(member(content)).toMatchObject({
      base: repo!.baseSha,
      observed_base: chain.headRecording,
    });
    expect(
      (d01(content)['integrated_review'] as Record<string, unknown>)[
        'disposition'
      ],
    ).toBe('stale');
  });

  it('writes nothing when a member cannot be observed', async () => {
    await registered();
    const before = await repo!.read('state.md');
    const { payload, exitCode } = await refresh(
      repo!,
      stubGh(() => 'fail'),
    );

    expect(exitCode).toBe(1);
    expect(payload).toMatchObject({ status: 'failed' });
    expect(await repo!.read('state.md')).toBe(before);
    expect(repo!.git(['status', '--porcelain'])).toBe('');
  });

  it('refuses a project that is not in goal mode', async () => {
    repo = await createGoalRepo();
    const statePath = join(repo.projectPath, 'state.md');
    await repo.write(
      'state.md',
      (await readFile(statePath, 'utf8')).replace(
        'oat_workflow_mode: goal',
        'oat_workflow_mode: brief',
      ),
    );
    const { payload, exitCode } = await refresh(
      repo,
      stubGh(() => 'fail'),
    );
    expect(exitCode).toBe(1);
    expect(payload).toMatchObject({
      status: 'error',
      message: expect.stringContaining('goal projects'),
    });
  });
});
