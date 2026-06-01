import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import {
  buildProjectArchiveS3Uri,
  buildRepoArchiveS3Uri,
  resolveLocalArchiveProjectPath,
} from '@commands/project/archive/archive-utils';
import type { ProjectArchiveCommandDependencies } from '@commands/project/archive/sync-runner';
import type { OatConfig } from '@config/oat-config';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRepoArchiveCommand } from './index';

interface HarnessOptions {
  config?: OatConfig;
  cwd?: string;
  json?: boolean;
  listOutput?: string;
  primaryRepoRoot?: string;
  processEnv?: NodeJS.ProcessEnv;
  projectsRoot?: string;
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  ensureS3ArchiveAccess: ReturnType<typeof vi.fn>;
  execFile: ReturnType<typeof vi.fn>;
  removeDirectory: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const cwd = options.cwd ?? '/tmp/workspace/open-agent-toolkit';
  const projectsRoot = options.projectsRoot ?? '.oat/projects/shared';
  const config: OatConfig = options.config ?? {
    version: 1,
    archive: {
      s3Uri: 's3://example-bucket/oat-archive',
      s3SyncOnComplete: true,
    },
  };
  const processEnv = options.processEnv ?? { PATH: '/usr/bin' };

  const ensureS3ArchiveAccess = vi.fn(async () => ({
    ok: true,
    warnings: [],
  }));
  const listOutput =
    options.listOutput ??
    ['                           PRE 20260401-demo-project/'].join('\n');
  const execFile = vi.fn(async (_file: string, args: string[]) => {
    if (args[0] === 's3' && args[1] === 'ls') {
      return { stdout: `${listOutput}\n`, stderr: '' };
    }
    return { stdout: '', stderr: '' };
  });
  const removeDirectory = vi.fn(async () => undefined);

  const dependencies: Partial<ProjectArchiveCommandDependencies> = {
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: globalOptions.dryRun ?? false,
      verbose: globalOptions.verbose ?? false,
      json: options.json ?? globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? cwd,
      home: '/tmp/home',
      interactive: false,
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => cwd),
    readOatConfig: vi.fn(async () => config),
    resolveProjectsRoot: vi.fn(async () => projectsRoot),
    ensureS3ArchiveAccess,
    buildRepoArchiveS3Uri,
    buildProjectArchiveS3Uri,
    resolveLocalArchiveProjectPath,
    resolvePrimaryRepoRoot: vi.fn(async () => options.primaryRepoRoot ?? cwd),
    execFile,
    removeDirectory,
    processEnv,
  };

  const command = createRepoArchiveCommand(dependencies);

  return {
    capture,
    command,
    ensureS3ArchiveAccess,
    execFile,
    removeDirectory,
  };
}

async function runRepoArchiveSyncCommand(
  command: Command,
  {
    globalArgs = [],
    commandArgs = [],
  }: { globalArgs?: string[]; commandArgs?: string[] } = {},
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const repo = new Command('repo');
  repo.addCommand(command);
  program.addCommand(repo);

  await program.parseAsync(
    [...globalArgs, 'repo', 'archive', 'sync', ...commandArgs],
    {
      from: 'user',
    },
  );
}

describe('oat repo archive sync', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('syncs an archived project through the shared archive sync runner', async () => {
    const { command, ensureS3ArchiveAccess, execFile, removeDirectory } =
      createHarness({
        config: {
          version: 1,
          archive: {
            s3Uri: 's3://example-bucket/oat-archive',
            s3SyncOnComplete: true,
            awsProfile: 'config-profile',
            awsRegion: 'config-region',
          },
        },
      });

    await runRepoArchiveSyncCommand(command, {
      commandArgs: [
        'demo-project',
        '--dry-run',
        '--profile',
        'flag-profile',
        '--region',
        'flag-region',
      ],
    });

    expect(ensureS3ArchiveAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'sync',
        s3Uri: 's3://example-bucket/oat-archive',
        awsProfile: 'flag-profile',
        awsRegion: 'flag-region',
      }),
      expect.any(Object),
    );
    expect(removeDirectory).not.toHaveBeenCalled();
    expect(execFile).toHaveBeenNthCalledWith(
      2,
      'aws',
      [
        's3',
        'sync',
        's3://example-bucket/oat-archive/open-agent-toolkit/projects/20260401-demo-project',
        '.oat/projects/archived/demo-project',
        '--exclude',
        'reviews/*',
        '--exclude',
        'pr/*',
        '--dryrun',
      ],
      expect.objectContaining({
        cwd: '/tmp/workspace/open-agent-toolkit',
        env: expect.objectContaining({
          AWS_PROFILE: 'flag-profile',
          AWS_REGION: 'flag-region',
        }),
      }),
    );
    expect(process.exitCode).toBe(0);
  });

  it('emits the same JSON contract as the project archive sync runner', async () => {
    const { command, capture } = createHarness({ json: true });

    await runRepoArchiveSyncCommand(command, {
      globalArgs: ['--json'],
      commandArgs: ['demo-project'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      mode: 'apply',
      projectName: 'demo-project',
      sources: [
        's3://example-bucket/oat-archive/open-agent-toolkit/projects/20260401-demo-project',
      ],
      targets: ['.oat/projects/archived/demo-project'],
      skipped: false,
      force: false,
    });
    expect(process.exitCode).toBe(0);
  });

  it('enforces that --force requires a project name', async () => {
    const { command, capture, execFile, removeDirectory } = createHarness();

    await runRepoArchiveSyncCommand(command, { commandArgs: ['--force'] });

    expect(removeDirectory).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
    expect(capture.error[0]).toBe(
      '`--force` requires a project name for `oat repo archive sync`.',
    );
    expect(process.exitCode).toBe(1);
  });
});
