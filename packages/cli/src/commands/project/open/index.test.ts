import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { defaultGitRunner } from '@commands/project/sync/git';
import {
  buildSyncTarget,
  createSyncedProject,
} from '@commands/project/sync/ref-sync';
import { CliError } from '@errors/cli-error';
import { createSyncedFixture } from '@shared/../__tests__/synced-fixture';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectOpenCommand } from './index';

interface HarnessOptions {
  cwd: string;
  pushStatus?: 'pushed' | 'up-to-date' | 'rejected' | 'conflict';
  materializeOnPull?: boolean;
  remoteOnly?: boolean;
  resolveError?: Error;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
  pushSynced: ReturnType<typeof vi.fn>;
  pullSynced: ReturnType<typeof vi.fn>;
  commitRecordChange: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const pushSynced = vi.fn(async () => ({
    status: options.pushStatus ?? ('pushed' as const),
    sha: 'a'.repeat(40),
  }));
  const pullSynced = vi.fn(async (target: { projectPath: string }) => {
    if (options.materializeOnPull) {
      await mkdir(target.projectPath, { recursive: true });
      await writeFile(
        join(target.projectPath, 'state.md'),
        '---\noat_phase: plan\noat_phase_status: complete\noat_lifecycle: active\n---\n\n# State\n',
        'utf8',
      );
    }
    return {
      status: 'created' as const,
      sha: 'b'.repeat(40),
      adopted: options.remoteOnly ?? false,
      pendingRecordPaths: options.remoteOnly
        ? [join(options.cwd, '.oat/projects/synced/remote.json')]
        : [],
    };
  });
  const commitRecordChange = vi.fn(async () => ({ sha: 'c'.repeat(40) }));

  const command = createProjectOpenCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd,
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => options.cwd),
    pushSynced,
    pullSynced,
    commitRecordChange,
    ...(options.resolveError
      ? {
          resolveSyncedTarget: vi.fn(async () => {
            throw options.resolveError;
          }),
        }
      : options.remoteOnly
        ? {
            resolveSyncedTarget: vi.fn(async () => ({
              repoRoot: options.cwd,
              slug: 'remote',
              projectPath: join(options.cwd, '.oat/projects/synced/remote'),
              ref: 'refs/oat/projects/remote',
              remote: 'origin' as const,
              adopt: true,
            })),
          }
        : {}),
  });

  return {
    capture,
    command,
    pushSynced,
    pullSynced,
    commitRecordChange,
  };
}

async function runCommand(
  command: Command,
  commandArgs: string[],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);

  await program.parseAsync([...globalArgs, 'project', 'open', ...commandArgs], {
    from: 'user',
  });
}

async function writeProjectState(
  root: string,
  name: string,
  lifecycle: 'active' | 'paused' = 'active',
  scope: 'shared' | 'local' | 'synced' = 'shared',
): Promise<string> {
  const projectPath = join(root, '.oat', 'projects', scope, name);
  await mkdir(projectPath, { recursive: true });
  const statePath = join(projectPath, 'state.md');

  const lines = ['oat_phase: plan', 'oat_phase_status: complete'];
  if (lifecycle === 'paused') {
    lines.push('oat_lifecycle: paused');
    lines.push('oat_pause_timestamp: 2026-02-21T00:00:00.000Z');
    lines.push('oat_pause_reason: waiting');
  } else {
    lines.push('oat_lifecycle: active');
  }

  await writeFile(
    statePath,
    `---\n${lines.join('\n')}\n---\n\n# State\n`,
    'utf8',
  );
  return statePath;
}

describe('oat project open', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-open-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'projects', 'shared'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'projects-root'),
      '.oat/projects/shared\n',
      'utf8',
    );
    return root;
  }

  it('opens project when no prior active project exists', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'demo');

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['demo']);

    const localConfig = JSON.parse(
      await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBe('.oat/projects/shared/demo');
    expect(process.exitCode).toBe(0);
  });

  it('shows switching message when a different project is active', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'alpha');
    await writeProjectState(root, 'beta');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/alpha' })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['beta']);

    expect(capture.info.join('\n')).toContain('Switching from alpha to beta.');
    expect(process.exitCode).toBe(0);
  });

  it('opens paused project and clears pause metadata', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'paused-demo', 'paused');

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['paused-demo']);

    const state = await readFile(statePath, 'utf8');
    expect(state).toContain('oat_lifecycle: active');
    expect(state).not.toContain('oat_pause_timestamp:');
    expect(state).not.toContain('oat_pause_reason:');
    expect(process.exitCode).toBe(0);
  });

  it('opens a uniquely named local project across scope roots', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'local-demo', 'active', 'local');

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['local-demo']);

    const localConfig = JSON.parse(
      await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBe('.oat/projects/local/local-demo');
    expect(process.exitCode).toBe(0);
  });

  it('requires an explicit path when a name exists in multiple scopes', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'duplicate');
    await writeProjectState(root, 'duplicate', 'active', 'local');

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['duplicate']);

    expect(capture.error[0]).toContain('ambiguous across scopes');
    expect(process.exitCode).toBe(1);
  });

  it('materializes a recorded absent synced project before opening it', async () => {
    const root = await createRepoRoot();
    await mkdir(join(root, '.oat/projects/synced'), { recursive: true });
    await writeFile(
      join(root, '.oat/projects/synced/recorded.json'),
      `${JSON.stringify({
        schemaVersion: 1,
        slug: 'recorded',
        scope: 'synced',
        ref: 'refs/oat/projects/recorded',
        remote: 'origin',
        status: 'active',
        createdAt: '2026-08-27T00:00:00.000Z',
        completedAt: null,
      })}\n`,
      'utf8',
    );

    const { command, pullSynced } = createHarness({
      cwd: root,
      materializeOnPull: true,
    });
    await runCommand(command, ['recorded']);

    expect(pullSynced).toHaveBeenCalledOnce();
    const localConfig = JSON.parse(
      await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBe('.oat/projects/synced/recorded');
    expect(process.exitCode).toBe(0);
  });

  it('adopts an origin-only synced project before opening it', async () => {
    const root = await createRepoRoot();
    const { command, pullSynced, commitRecordChange } = createHarness({
      cwd: root,
      materializeOnPull: true,
      remoteOnly: true,
    });

    await runCommand(command, ['remote']);

    expect(pullSynced).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'remote', adopt: true }),
      expect.anything(),
      { adopt: true },
    );
    expect(commitRecordChange).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(0);
  });

  it('publishes a synced resume before changing the active pointer', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'alpha');
    await writeProjectState(root, 'paused-sync', 'paused', 'synced');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/alpha' })}\n`,
      'utf8',
    );
    const { command, pushSynced } = createHarness({
      cwd: root,
      pushStatus: 'rejected',
    });

    await runCommand(command, ['paused-sync']);

    expect(pushSynced).toHaveBeenCalledOnce();
    const localConfig = JSON.parse(
      await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBe('.oat/projects/shared/alpha');
    expect(process.exitCode).toBe(1);
  });

  it('rejects resume writes that would preserve invalid decomposition state', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'paused-demo', 'paused');
    const state = await readFile(statePath, 'utf8');
    await writeFile(
      statePath,
      state.replace('oat_phase: plan', 'oat_phase: decomposition'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['paused-demo']);

    expect(capture.error[0]).toContain(
      'oat_phase: decomposition requires oat_kind: coordination',
    );
    expect(process.exitCode).toBe(1);
  });

  it('errors when project does not exist', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({
      cwd: root,
      resolveError: new CliError('No synced project named missing.', 1),
    });

    await runCommand(command, ['missing']);

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('Project not found');
  });

  it.each([
    { globals: [], expected: 'origin authentication failed' },
    { globals: ['--json'], expected: 'origin authentication failed' },
  ])(
    'preserves a synced transport failure in human and JSON output',
    async ({ globals, expected }) => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({
        cwd: root,
        resolveError: new CliError(expected, 2),
      });

      await runCommand(command, ['remote'], globals);

      const output = globals.includes('--json')
        ? JSON.stringify(capture.jsonPayloads[0])
        : capture.error.join('\n');
      expect(output).toContain(expected);
      expect(output).not.toContain('Project not found');
      expect(process.exitCode).toBe(2);
    },
  );

  it('classifies an unknown lookup exception as a system error', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({
      cwd: root,
      resolveError: new Error('filesystem unavailable'),
    });

    await runCommand(command, ['remote'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: 'filesystem unavailable',
    });
    expect(process.exitCode).toBe(2);
  });

  it('does not mutate a sibling when an explicit synced descendant is rejected', async () => {
    const root = await createRepoRoot();
    await mkdir(join(root, '.oat/projects/synced/demo/reviews'), {
      recursive: true,
    });
    await writeProjectState(root, 'reviews', 'active', 'synced');
    const { command, pullSynced, pushSynced } = createHarness({
      cwd: root,
      resolveError: new CliError(
        'Project path must identify exactly one direct child of the synced project root',
        1,
      ),
    });

    await runCommand(command, ['.oat/projects/synced/demo/reviews']);

    expect(pullSynced).not.toHaveBeenCalled();
    expect(pushSynced).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('rejects a bare-slug real-worktree alias before opening its sibling', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    const sibling = buildSyncTarget(
      fixture.cloneA,
      '.oat/projects/shared',
      'reviews',
    );
    await createSyncedProject(sibling, defaultGitRunner);
    const siblingState =
      '---\noat_phase: plan\noat_phase_status: complete\noat_lifecycle: active\n---\n\n# Reviews\n';
    await writeFile(
      join(sibling.projectPath, 'state.md'),
      siblingState,
      'utf8',
    );
    await symlink(
      sibling.projectPath,
      join(fixture.cloneA, '.oat/projects/synced/demo'),
      'dir',
    );
    const { command, capture, pullSynced, pushSynced } = createHarness({
      cwd: fixture.cloneA,
    });

    await runCommand(command, ['demo']);

    expect(capture.error.join('\n')).toContain('canonical direct child');
    expect(pullSynced).not.toHaveBeenCalled();
    expect(pushSynced).not.toHaveBeenCalled();
    expect(await readFile(join(sibling.projectPath, 'state.md'), 'utf8')).toBe(
      siblingState,
    );
    expect(process.exitCode).toBe(1);
  });

  it('errors when project state.md is missing', async () => {
    const root = await createRepoRoot();
    await mkdir(join(root, '.oat', 'projects', 'shared', 'demo'), {
      recursive: true,
    });
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['demo']);

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('state.md not found');
  });

  it('supports json output mode', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'demo');

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['demo', '--reason', 'resume work'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      projectName: 'demo',
      projectPath: '.oat/projects/shared/demo',
      previousActiveProject: null,
      reason: 'resume work',
    });
    expect(process.exitCode).toBe(0);
  });
});
