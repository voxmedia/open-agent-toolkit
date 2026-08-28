import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  buildSyncTarget,
  createSyncedProject,
  pushSynced,
  removeSyncedCheckout,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import { createSyncedFixture } from '@test-support/synced-fixture';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { computeLinksInput } from './compute';
import { createProjectLinksCommand } from './index';

const target: SyncTarget = {
  repoRoot: '/repo',
  syncedRoot: '/repo/.oat/projects/synced',
  projectPath: '/repo/.oat/projects/synced/demo',
  slug: 'demo',
  ref: 'refs/oat/projects/demo',
  remote: 'origin',
};

describe('computeLinksInput', () => {
  it('fetches and computes the input entirely from the ref', async () => {
    const gitRun = vi.fn(async (args: string[]) => {
      if (args[0] === 'rev-parse') {
        return { code: 0, stdout: 'a'.repeat(40), stderr: '' };
      }
      if (args[0] === 'ls-tree') {
        return {
          code: 0,
          stdout: 'state.md\nsummary.md\ndesign.md\nplan.md',
          stderr: '',
        };
      }
      if (args[0] === 'remote') {
        return {
          code: 0,
          stdout: 'git@github.com:open-agent-toolkit/oat.git',
          stderr: '',
        };
      }
      return { code: 0, stdout: '', stderr: '' };
    });
    const input = await computeLinksInput(
      target,
      { run: gitRun } as GitRunner,
      {
        durableSummaryPath: 'docs/demo.md',
        now: new Date('2026-08-27T12:00:00Z'),
      },
    );
    expect(input).toEqual({
      slug: 'demo',
      sha: 'a'.repeat(40),
      ref: target.ref,
      originUrl: 'git@github.com:open-agent-toolkit/oat.git',
      present: ['design.md', 'summary.md'],
      durableSummaryPath: 'docs/demo.md',
      pinnedAt: '2026-08-27',
    });
    expect(gitRun).toHaveBeenCalledWith(
      ['fetch', 'origin', `+${target.ref}:${target.ref}`],
      { cwd: '/repo' },
    );
    expect(gitRun).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cwd: target.projectPath }),
    );
  });

  it('works after the project checkout has been removed', async () => {
    const fixture = await createSyncedFixture();
    try {
      const realTarget = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'links-after-complete',
      );
      await createSyncedProject(realTarget, defaultGitRunner);
      await writeFile(
        join(realTarget.projectPath, 'summary.md'),
        '# Summary\n',
        'utf8',
      );
      await pushSynced(realTarget, defaultGitRunner, {});
      await removeSyncedCheckout(realTarget, defaultGitRunner);

      await expect(
        computeLinksInput(realTarget, defaultGitRunner, {
          now: new Date('2026-08-27T12:00:00Z'),
        }),
      ).resolves.toMatchObject({
        slug: 'links-after-complete',
        present: ['summary.md'],
      });
    } finally {
      await fixture.cleanup();
    }
  });
});

function harness() {
  const capture = createLoggerCapture();
  const resolveSyncedTarget = vi.fn(async () => ({ ...target, adopt: false }));
  const compute = vi.fn(async () => ({
    slug: 'demo',
    sha: 'a'.repeat(40),
    ref: target.ref,
    originUrl: 'git@github.com:o/r.git',
    present: ['summary.md'] as const,
    pinnedAt: '2026-08-27',
  }));
  return {
    capture,
    resolveSyncedTarget,
    compute,
    command: createProjectLinksCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: options.json ?? false,
        cwd: '/repo',
        home: '/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => '/repo',
      resolveSyncedTarget,
      computeLinksInput: compute,
      gitRunner: { run: vi.fn() },
      processEnv: {},
      now: () => new Date('2026-08-27T12:00:00Z'),
    }),
  };
}

async function run(
  command: Command,
  args: string[],
  globals: string[] = [],
): Promise<void> {
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync([...globals, 'project', 'links', ...args], {
    from: 'user',
  });
}

describe('createProjectLinksCommand', () => {
  let previousExitCode: number | undefined;
  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
  });
  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it('prints markdown and forwards the durable summary option', async () => {
    const setup = harness();
    await run(setup.command, [
      'demo',
      '--durable-summary',
      'docs/project-summaries/demo.md',
    ]);
    expect(setup.capture.info[0]).toContain('<!-- oat:project-links:start -->');
    expect(setup.compute).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'demo' }),
      expect.anything(),
      expect.objectContaining({
        durableSummaryPath: 'docs/project-summaries/demo.md',
      }),
    );
    expect(process.exitCode).toBe(0);
  });

  it('returns the input and markdown as json', async () => {
    const setup = harness();
    await run(setup.command, ['demo', '--format', 'json']);
    expect(setup.capture.jsonPayloads[0]).toMatchObject({
      slug: 'demo',
      ref: target.ref,
      markdown: expect.stringContaining('<!-- oat:project-links:start -->'),
    });
  });
});
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
