import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  buildSyncTarget,
  continueSynced,
  createSyncedProject,
  pullSynced,
  pushSynced as pushSyncedReal,
} from '@commands/project/sync/ref-sync';
import { CliError } from '@errors/cli-error';
import { createSyncedFixture } from '@test-support/synced-fixture';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectPauseCommand } from './index';

interface HarnessOptions {
  cwd: string;
  pushStatus?:
    | 'pushed'
    | 'up-to-date'
    | 'rejected'
    | 'conflict'
    | ('pushed' | 'up-to-date' | 'rejected' | 'conflict')[];
  resolveError?: Error;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
  pushSynced: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const pushStatuses = Array.isArray(options.pushStatus)
    ? options.pushStatus
    : [options.pushStatus ?? 'pushed'];
  let pushAttempt = 0;
  const pushSynced = vi.fn(async () => ({
    status:
      pushStatuses[Math.min(pushAttempt++, pushStatuses.length - 1)] ??
      'pushed',
    sha: 'a'.repeat(40),
  }));

  const command = createProjectPauseCommand({
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
    now: () => new Date('2026-02-21T12:00:00.000Z'),
    pushSynced,
    ...(options.resolveError
      ? {
          resolveSyncedTarget: vi.fn(async () => {
            throw options.resolveError;
          }),
        }
      : {}),
  });

  return { capture, command, pushSynced };
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

  await program.parseAsync(
    [...globalArgs, 'project', 'pause', ...commandArgs],
    {
      from: 'user',
    },
  );
}

async function writeProjectState(
  root: string,
  name: string,
  scope: 'shared' | 'local' | 'synced' = 'shared',
): Promise<string> {
  const projectPath = join(root, '.oat', 'projects', scope, name);
  await mkdir(projectPath, { recursive: true });
  const statePath = join(projectPath, 'state.md');
  await writeFile(
    statePath,
    '---\noat_phase: implement\noat_phase_status: in_progress\noat_lifecycle: active\n---\n\n# State\n',
    'utf8',
  );
  return statePath;
}

describe('oat project pause', () => {
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
    const root = await mkdtemp(join(tmpdir(), 'oat-project-pause-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'projects', 'shared'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'projects-root'),
      '.oat/projects/shared\n',
      'utf8',
    );
    return root;
  }

  it('pauses active project and clears active pointer with lastPausedProject', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'demo');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );

    const { command } = createHarness({ cwd: root });
    await runCommand(command, []);

    const localConfig = JSON.parse(
      await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBeNull();
    expect(localConfig.lastPausedProject).toBe('.oat/projects/shared/demo');

    const state = await readFile(statePath, 'utf8');
    expect(state).toContain('oat_lifecycle: paused');
    expect(state).toContain('oat_pause_timestamp: 2026-02-21T12:00:00.000Z');
    expect(process.exitCode).toBe(0);
  });

  it('rejects pause writes that would preserve invalid decomposition state', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'demo');
    const state = await readFile(statePath, 'utf8');
    await writeFile(
      statePath,
      state.replace('oat_phase: implement', 'oat_phase: decomposition'),
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, []);

    expect(capture.error[0]).toContain(
      'oat_phase: decomposition requires oat_kind: coordination',
    );
    expect(process.exitCode).toBe(1);
  });

  it('pauses named project without clearing pointer when different project is active', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'alpha');
    await writeProjectState(root, 'beta');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/alpha' })}\n`,
      'utf8',
    );

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['beta']);

    const localConfig = JSON.parse(
      await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBe('.oat/projects/shared/alpha');
    expect(localConfig.lastPausedProject ?? null).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('pauses a uniquely named local project across scope roots', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'local-demo', 'local');

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['local-demo']);

    expect(await readFile(statePath, 'utf8')).toContain(
      'oat_lifecycle: paused',
    );
    expect(process.exitCode).toBe(0);
  });

  it('requires an explicit path when a name exists in multiple scopes', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'duplicate');
    await writeProjectState(root, 'duplicate', 'local');

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['duplicate']);

    expect(capture.error[0]).toContain('ambiguous across scopes');
    expect(process.exitCode).toBe(1);
  });

  it.each(['rejected'] as const)(
    'retains a clean retryable pause after a %s publication',
    async (pushStatus) => {
      const root = await createRepoRoot();
      const statePath = await writeProjectState(root, 'synced-demo', 'synced');
      const originalState = await readFile(statePath, 'utf8');
      await writeFile(
        join(root, '.oat', 'config.local.json'),
        `${JSON.stringify({ version: 1, activeProject: '.oat/projects/synced/synced-demo' })}\n`,
        'utf8',
      );
      const { capture, command, pushSynced } = createHarness({
        cwd: root,
        pushStatus,
      });

      await runCommand(command, []);

      expect(pushSynced).toHaveBeenCalledOnce();
      expect(await readFile(statePath, 'utf8')).not.toBe(originalState);
      expect(await readFile(statePath, 'utf8')).toContain(
        'oat_lifecycle: paused',
      );
      expect(capture.error.join('\n')).toContain(
        're-run oat project pause synced-demo to retry publication',
      );
      const localConfig = JSON.parse(
        await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
      );
      expect(localConfig.activeProject).toBe(
        '.oat/projects/synced/synced-demo',
      );
      expect(process.exitCode).toBe(1);
    },
  );

  it('preserves a conflicted synced state and prints targeted recovery guidance', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'synced-demo', 'synced');
    const originalState = await readFile(statePath, 'utf8');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/synced/synced-demo' })}\n`,
      'utf8',
    );
    const { command, capture } = createHarness({
      cwd: root,
      pushStatus: 'conflict',
    });

    await runCommand(command, []);

    expect(await readFile(statePath, 'utf8')).not.toBe(originalState);
    expect(await readFile(statePath, 'utf8')).toContain(
      'oat_lifecycle: paused',
    );
    expect(capture.error.join('\n')).toContain(
      'oat project pull synced-demo --continue',
    );
    expect(capture.error.join('\n')).toContain(
      're-run oat project pause synced-demo to finish and clear the active pointer',
    );
    expect(capture.error.join('\n')).toContain(
      'oat project pull synced-demo --abort',
    );
    expect(process.exitCode).toBe(1);
  });

  it('preserves the remote edit through real two-clone pause conflict recovery', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    tempDirs.push(fixture.rootDir);
    const slug = 'pause-conflict';
    const targetA = buildSyncTarget(
      fixture.cloneA,
      '.oat/projects/shared',
      slug,
    );
    await createSyncedProject(targetA, defaultGitRunner);
    await writeFile(
      join(targetA.projectPath, 'state.md'),
      '---\noat_phase: implement\noat_phase_status: in_progress\noat_lifecycle: active\n---\n\n# State\n',
    );
    await pushSyncedReal(targetA, defaultGitRunner, {
      message: 'seed pause state',
    });
    const targetB = buildSyncTarget(
      fixture.cloneB!,
      '.oat/projects/shared',
      slug,
    );
    await pullSynced(targetB, defaultGitRunner);
    await writeFile(
      join(targetA.projectPath, 'state.md'),
      '---\noat_phase: implement\noat_phase_status: in_progress\noat_lifecycle: active\nremote_note: survives\n---\n\n# State\n',
    );
    const remoteAdvance = await pushSyncedReal(targetA, defaultGitRunner, {
      message: 'advance remote pause state',
    });
    await writeFile(
      join(fixture.cloneB!, '.oat/config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: `.oat/projects/synced/${slug}` })}\n`,
    );
    const capture = createLoggerCapture();
    const command = createProjectPauseCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: options.json ?? false,
        cwd: fixture.cloneB!,
        home: '/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => fixture.cloneB!,
      now: () => new Date('2026-08-29T01:00:00Z'),
    });

    await runCommand(command, []);

    expect(process.exitCode).toBe(1);
    const conflicted = await readFile(
      join(targetB.projectPath, 'state.md'),
      'utf8',
    );
    expect(conflicted).toContain('<<<<<<<');
    expect(conflicted).toContain('remote_note: survives');
    expect(capture.error.join('\n')).toContain(`pull ${slug} --continue`);
    expect(
      execFileSync('git', ['show', `${targetA.ref}:state.md`], {
        cwd: fixture.originDir,
        encoding: 'utf8',
      }),
    ).not.toContain('oat_lifecycle: paused');
    expect(
      execFileSync('git', ['rev-parse', targetA.ref], {
        cwd: fixture.originDir,
        encoding: 'utf8',
      }).trim(),
    ).toBe(remoteAdvance.sha);

    await writeFile(
      join(targetB.projectPath, 'state.md'),
      '---\noat_phase: implement\noat_phase_status: in_progress\noat_lifecycle: paused\nremote_note: survives\noat_pause_timestamp: 2026-08-29T01:00:00.000Z\noat_project_state_updated: 2026-08-29T01:00:00.000Z\n---\n\n# State\n',
    );
    execFileSync('git', ['add', 'state.md'], { cwd: targetB.projectPath });
    await expect(
      continueSynced(targetB, defaultGitRunner),
    ).resolves.toMatchObject({ status: 'updated' });
    await expect(
      pushSyncedReal(targetB, defaultGitRunner, {
        message: 'publish recovered pause',
      }),
    ).resolves.toMatchObject({ status: 'pushed' });
    const published = execFileSync('git', ['show', `${targetA.ref}:state.md`], {
      cwd: fixture.originDir,
      encoding: 'utf8',
    });
    expect(published).toContain('remote_note: survives');
    expect(published).toContain('oat_lifecycle: paused');

    process.exitCode = undefined;
    await runCommand(command, []);
    expect(process.exitCode).toBe(0);
    const finalizedConfig = JSON.parse(
      await readFile(join(fixture.cloneB!, '.oat/config.local.json'), 'utf8'),
    );
    expect(finalizedConfig.activeProject).toBeNull();
  });

  it('publishes a synced pause before clearing the active pointer', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'synced-demo', 'synced');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/synced/synced-demo' })}\n`,
      'utf8',
    );
    const { command, pushSynced } = createHarness({
      cwd: root,
      pushStatus: 'pushed',
    });

    await runCommand(command, []);

    expect(pushSynced).toHaveBeenCalledOnce();
    expect(await readFile(statePath, 'utf8')).toContain(
      'oat_lifecycle: paused',
    );
    const localConfig = JSON.parse(
      await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('retries a retained rejected synced pause', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'synced-demo', 'synced');
    const originalState = await readFile(statePath, 'utf8');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/synced/synced-demo' })}\n`,
      'utf8',
    );
    const { command, pushSynced } = createHarness({
      cwd: root,
      pushStatus: ['rejected', 'pushed'],
    });

    await runCommand(command, []);
    expect(await readFile(statePath, 'utf8')).not.toBe(originalState);
    expect(await readFile(statePath, 'utf8')).toContain(
      'oat_lifecycle: paused',
    );
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    await runCommand(command, []);

    expect(pushSynced).toHaveBeenCalledTimes(2);
    expect(await readFile(statePath, 'utf8')).toContain(
      'oat_lifecycle: paused',
    );
    const localConfig = JSON.parse(
      await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('retains a clean pause commit after a real remote decline', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    tempDirs.push(fixture.rootDir);
    const slug = 'pause-decline';
    const targetA = buildSyncTarget(
      fixture.cloneA,
      '.oat/projects/shared',
      slug,
    );
    await createSyncedProject(targetA, defaultGitRunner);
    await writeFile(
      join(targetA.projectPath, 'state.md'),
      '---\noat_phase: implement\noat_phase_status: in_progress\noat_lifecycle: active\n---\n\n# State\n',
    );
    await pushSyncedReal(targetA, defaultGitRunner, {
      message: 'seed pause decline',
    });
    const targetB = buildSyncTarget(
      fixture.cloneB!,
      '.oat/projects/shared',
      slug,
    );
    await pullSynced(targetB, defaultGitRunner);
    await writeFile(
      join(fixture.cloneB!, '.oat/config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: `.oat/projects/synced/${slug}` })}\n`,
    );

    let remoteAdvanceSha = '';
    const decliningGitRunner: GitRunner = {
      run: async (args, options) => {
        if (
          remoteAdvanceSha === '' &&
          args.includes('push') &&
          args.includes(targetB.projectPath)
        ) {
          await writeFile(
            join(targetA.projectPath, 'remote-note.md'),
            'advanced during pause publication\n',
          );
          remoteAdvanceSha = (
            await pushSyncedReal(targetA, defaultGitRunner, {
              message: 'advance during pause publication',
            })
          ).sha;
        }
        return defaultGitRunner.run(args, options);
      },
    };
    const capture = createLoggerCapture();
    const command = createProjectPauseCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: options.json ?? false,
        cwd: fixture.cloneB!,
        home: '/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => fixture.cloneB!,
      now: () => new Date('2026-08-29T01:30:00Z'),
      gitRunner: decliningGitRunner,
    });

    await runCommand(command, []);

    expect(process.exitCode).toBe(1);
    expect(capture.error.join('\n')).toContain(
      `re-run oat project pause ${slug} to retry publication`,
    );
    expect(
      await readFile(join(targetB.projectPath, 'state.md'), 'utf8'),
    ).toContain('oat_lifecycle: paused');
    expect(
      execFileSync('git', ['status', '--porcelain'], {
        cwd: targetB.projectPath,
        encoding: 'utf8',
      }),
    ).toBe('');
    expect(
      execFileSync('git', ['rev-parse', targetA.ref], {
        cwd: fixture.originDir,
        encoding: 'utf8',
      }).trim(),
    ).toBe(remoteAdvanceSha);
    const localConfig = JSON.parse(
      await readFile(join(fixture.cloneB!, '.oat/config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBe(`.oat/projects/synced/${slug}`);
  });

  it('persists pause reason when provided', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'demo');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['--reason', 'waiting on review']);

    const state = await readFile(statePath, 'utf8');
    expect(state).toContain('oat_pause_reason: waiting on review');
    expect(process.exitCode).toBe(0);
  });

  it('errors when project does not exist', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['missing']);

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('Project not found');
  });

  it('errors when no active project and no name provided', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, []);

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain(
      'No project specified and no active project',
    );
  });

  it('supports json output mode', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'demo');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['--reason', 'break time'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      projectName: 'demo',
      projectPath: '.oat/projects/shared/demo',
      pointerCleared: true,
      reason: 'break time',
    });
    expect(process.exitCode).toBe(0);
  });

  it.each([
    { globals: [], message: 'origin DNS failed' },
    { globals: ['--json'], message: 'origin DNS failed' },
  ])(
    'preserves synced system failures in human and JSON output',
    async ({ globals, message }) => {
      const root = await createRepoRoot();
      await writeProjectState(root, 'synced-demo', 'synced');
      const { command, capture } = createHarness({
        cwd: root,
        resolveError: new CliError(message, 2),
      });

      await runCommand(command, ['synced-demo'], globals);

      const output = globals.includes('--json')
        ? JSON.stringify(capture.jsonPayloads[0])
        : capture.error.join('\n');
      expect(output).toContain(message);
      expect(process.exitCode).toBe(2);
    },
  );

  it('classifies an unknown synced pause exception as exit 2', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'synced-demo', 'synced');
    const { command, capture } = createHarness({
      cwd: root,
      resolveError: new Error('unexpected filesystem failure'),
    });

    await runCommand(command, ['synced-demo'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: 'unexpected filesystem failure',
    });
    expect(process.exitCode).toBe(2);
  });
});
