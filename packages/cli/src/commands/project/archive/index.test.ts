import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { OatConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectArchiveCommand } from './index';

interface HarnessOptions {
  config?: OatConfig;
  cwd?: string;
  json?: boolean;
  listOutput?: string;
  preflightError?: Error;
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

  const ensureS3ArchiveAccess = vi.fn(async () => {
    if (options.preflightError) {
      throw options.preflightError;
    }
    return { ok: true, warnings: [] };
  });

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

  const command = createProjectArchiveCommand({
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
    execFile,
    removeDirectory,
  });

  return {
    capture,
    command,
    ensureS3ArchiveAccess,
    execFile,
    removeDirectory,
  };
}

async function runArchiveSyncCommand(
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

  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);

  await program.parseAsync(
    [...globalArgs, 'project', 'archive', 'sync', ...commandArgs],
    {
      from: 'user',
    },
  );
}

describe('oat project archive sync', () => {
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
    const root = await mkdtemp(join(tmpdir(), 'oat-project-archive-sync-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'projects', 'archived'), {
      recursive: true,
    });
    return root;
  }

  it('syncs all archived projects when no project name is provided', async () => {
    const { command, ensureS3ArchiveAccess, execFile, removeDirectory } =
      createHarness({
        listOutput: [
          '                           PRE 20260301-demo-project/',
          '                           PRE 20260401-demo-project/',
          '                           PRE 20260401-other-project/',
        ].join('\n'),
      });

    await runArchiveSyncCommand(command);

    expect(ensureS3ArchiveAccess).toHaveBeenCalledWith({
      mode: 'sync',
      s3Uri: 's3://example-bucket/oat-archive',
      syncOnComplete: true,
    });
    expect(removeDirectory).toHaveBeenCalledWith(
      join(
        '/tmp/workspace/open-agent-toolkit',
        '.oat/projects/archived/demo-project',
      ),
      { recursive: true, force: true },
    );
    expect(removeDirectory).toHaveBeenCalledWith(
      join(
        '/tmp/workspace/open-agent-toolkit',
        '.oat/projects/archived/other-project',
      ),
      { recursive: true, force: true },
    );
    expect(execFile).toHaveBeenNthCalledWith(
      1,
      'aws',
      ['s3', 'ls', 's3://example-bucket/oat-archive/open-agent-toolkit/'],
      expect.objectContaining({
        cwd: '/tmp/workspace/open-agent-toolkit',
      }),
    );
    expect(execFile).toHaveBeenNthCalledWith(
      2,
      'aws',
      [
        's3',
        'sync',
        's3://example-bucket/oat-archive/open-agent-toolkit/20260401-demo-project',
        '.oat/projects/archived/demo-project',
      ],
      expect.objectContaining({
        cwd: '/tmp/workspace/open-agent-toolkit',
      }),
    );
    expect(execFile).toHaveBeenNthCalledWith(
      3,
      'aws',
      [
        's3',
        'sync',
        's3://example-bucket/oat-archive/open-agent-toolkit/20260401-other-project',
        '.oat/projects/archived/other-project',
      ],
      expect.objectContaining({
        cwd: '/tmp/workspace/open-agent-toolkit',
      }),
    );
    expect(process.exitCode).toBe(0);
  });

  it('normalizes the local archive root when projects.root has a trailing slash', async () => {
    const { command, execFile } = createHarness({
      projectsRoot: '.oat/projects/shared/',
    });

    await runArchiveSyncCommand(command);

    expect(execFile).toHaveBeenNthCalledWith(
      2,
      'aws',
      [
        's3',
        'sync',
        's3://example-bucket/oat-archive/open-agent-toolkit/20260401-demo-project',
        '.oat/projects/archived/demo-project',
      ],
      expect.any(Object),
    );
    expect(process.exitCode).toBe(0);
  });

  it('syncs one archived project when a project name is provided', async () => {
    const { command, execFile, removeDirectory } = createHarness({
      listOutput: [
        '                           PRE 20260301-demo-project/',
        '                           PRE 20260401-demo-project/',
      ].join('\n'),
    });

    await runArchiveSyncCommand(command, { commandArgs: ['demo-project'] });

    expect(removeDirectory).toHaveBeenCalledWith(
      join(
        '/tmp/workspace/open-agent-toolkit',
        '.oat/projects/archived/demo-project',
      ),
      { recursive: true, force: true },
    );
    expect(execFile).toHaveBeenNthCalledWith(
      2,
      'aws',
      [
        's3',
        'sync',
        's3://example-bucket/oat-archive/open-agent-toolkit/20260401-demo-project',
        '.oat/projects/archived/demo-project',
      ],
      expect.objectContaining({
        cwd: '/tmp/workspace/open-agent-toolkit',
      }),
    );
    expect(process.exitCode).toBe(0);
  });

  it('passes through --dry-run to aws s3 sync', async () => {
    const { command, execFile, removeDirectory } = createHarness();

    await runArchiveSyncCommand(command, { commandArgs: ['--dry-run'] });

    expect(removeDirectory).not.toHaveBeenCalled();
    expect(execFile).toHaveBeenNthCalledWith(
      2,
      'aws',
      [
        's3',
        'sync',
        's3://example-bucket/oat-archive/open-agent-toolkit/20260401-demo-project',
        '.oat/projects/archived/demo-project',
        '--dryrun',
      ],
      expect.any(Object),
    );
    expect(process.exitCode).toBe(0);
  });

  it('fails when --force is used without a project name', async () => {
    const { command, capture, execFile, removeDirectory } = createHarness();

    await runArchiveSyncCommand(command, { commandArgs: ['--force'] });

    expect(removeDirectory).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
    expect(capture.error[0]).toBe(
      '`--force` requires a project name for `oat project archive sync`.',
    );
    expect(process.exitCode).toBe(1);
  });

  it('preserves unrelated local-only archives during full sync', async () => {
    const repoRoot = await createRepoRoot();
    await mkdir(join(repoRoot, '.oat', 'projects', 'archived', 'local-only'), {
      recursive: true,
    });
    await writeFile(
      join(repoRoot, '.oat', 'projects', 'archived', 'local-only', 'notes.md'),
      'keep me',
      'utf8',
    );

    const { command, execFile, removeDirectory } = createHarness({
      cwd: repoRoot,
      listOutput: '                           PRE 20260401-remote-project/',
    });

    await runArchiveSyncCommand(command);

    expect(removeDirectory).toHaveBeenCalledWith(
      join(repoRoot, '.oat/projects/archived/remote-project'),
      { recursive: true, force: true },
    );
    expect(execFile).toHaveBeenCalledWith(
      'aws',
      expect.not.arrayContaining(['--delete']),
      expect.any(Object),
    );
    await expect(
      readFile(
        join(
          repoRoot,
          '.oat',
          'projects',
          'archived',
          'local-only',
          'notes.md',
        ),
        'utf8',
      ),
    ).resolves.toBe('keep me');
    expect(process.exitCode).toBe(0);
  });

  it('removes the named local archive before sync when --force is used', async () => {
    const repoRoot = await createRepoRoot();
    await mkdir(
      join(repoRoot, '.oat', 'projects', 'archived', 'demo-project'),
      {
        recursive: true,
      },
    );

    const { command, execFile, removeDirectory } = createHarness({
      cwd: repoRoot,
    });

    await runArchiveSyncCommand(command, {
      commandArgs: ['demo-project', '--force'],
    });

    expect(removeDirectory).toHaveBeenCalledWith(
      join(repoRoot, '.oat', 'projects', 'archived', 'demo-project'),
      { recursive: true, force: true },
    );
    expect(execFile).toHaveBeenNthCalledWith(
      2,
      'aws',
      [
        's3',
        'sync',
        `s3://example-bucket/oat-archive/${repoRoot.split('/').at(-1)}/20260401-demo-project`,
        '.oat/projects/archived/demo-project',
      ],
      expect.objectContaining({ cwd: repoRoot }),
    );
    expect(process.exitCode).toBe(0);
  });

  it('fails when archive.s3Uri is not configured', async () => {
    const { command, capture, ensureS3ArchiveAccess, execFile } = createHarness(
      {
        config: { version: 1 },
      },
    );

    await runArchiveSyncCommand(command);

    expect(ensureS3ArchiveAccess).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
    expect(capture.error[0]).toBe(
      'Archive sync requires `archive.s3Uri` to be configured. Set it with `oat config set archive.s3Uri <s3://...>` and retry.',
    );
    expect(process.exitCode).toBe(1);
  });

  it('supports json mode for archive sync output', async () => {
    const { command, capture } = createHarness({ json: true });

    await runArchiveSyncCommand(command, { commandArgs: ['demo-project'] });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      mode: 'apply',
      projectName: 'demo-project',
      sources: [
        's3://example-bucket/oat-archive/open-agent-toolkit/20260401-demo-project',
      ],
      targets: ['.oat/projects/archived/demo-project'],
      skipped: false,
    });
    expect(process.exitCode).toBe(0);
  });

  it('fails when AWS CLI is missing', async () => {
    const { command, capture, execFile } = createHarness({
      preflightError: new CliError(
        'AWS CLI is required for `oat project archive sync`, but it was not found on PATH. Install `aws` and retry.',
      ),
    });

    await runArchiveSyncCommand(command);

    expect(execFile).not.toHaveBeenCalled();
    expect(capture.error[0]).toBe(
      'AWS CLI is required for `oat project archive sync`, but it was not found on PATH. Install `aws` and retry.',
    );
    expect(process.exitCode).toBe(1);
  });

  it('fails when AWS CLI credentials are unusable', async () => {
    const { command, capture, execFile } = createHarness({
      preflightError: new CliError(
        'AWS CLI is required for `oat project archive sync`, but it is not configured for access to `archive.s3Uri`. Configure AWS credentials or profile settings and retry.',
      ),
    });

    await runArchiveSyncCommand(command);

    expect(execFile).not.toHaveBeenCalled();
    expect(capture.error[0]).toBe(
      'AWS CLI is required for `oat project archive sync`, but it is not configured for access to `archive.s3Uri`. Configure AWS credentials or profile settings and retry.',
    );
    expect(process.exitCode).toBe(1);
  });
});
