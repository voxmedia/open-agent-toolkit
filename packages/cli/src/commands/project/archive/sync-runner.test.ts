import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { OatConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ARCHIVE_SNAPSHOT_METADATA_FILENAME,
  buildProjectArchiveS3Uri,
  buildRepoArchiveS3Uri,
  resolveLocalArchiveProjectPath,
} from './archive-utils';
import {
  runArchiveSyncCommand,
  type ArchiveSyncOptions,
  type ProjectArchiveCommandDependencies,
} from './sync-runner';

interface HarnessOptions {
  config?: OatConfig;
  cwd?: string;
  json?: boolean;
  listOutput?: string;
  preflightError?: Error;
  primaryRepoRoot?: string;
  projectsRoot?: string;
  processEnv?: NodeJS.ProcessEnv;
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  context: CommandContext;
  dependencies: ProjectArchiveCommandDependencies;
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

  const ensureS3ArchiveAccess = vi.fn(
    async (
      _syncOptions: unknown,
      _dependencies?: { env?: NodeJS.ProcessEnv },
    ) => {
      if (options.preflightError) {
        throw options.preflightError;
      }
      return { ok: true, warnings: [] };
    },
  );

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

  const context: CommandContext = {
    scope: 'project',
    dryRun: false,
    verbose: false,
    json: options.json ?? false,
    cwd,
    home: '/tmp/home',
    interactive: false,
    logger: capture.logger,
  };

  const dependencies: ProjectArchiveCommandDependencies = {
    buildCommandContext: vi.fn(() => context),
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
    processEnv: options.processEnv ?? { PATH: '/usr/bin' },
  };

  return {
    capture,
    context,
    dependencies,
    ensureS3ArchiveAccess,
    execFile,
    removeDirectory,
  };
}

async function runSync(
  harness: ReturnType<typeof createHarness>,
  {
    projectName,
    options = {},
  }: { projectName?: string; options?: ArchiveSyncOptions } = {},
): Promise<void> {
  await runArchiveSyncCommand(
    harness.dependencies,
    projectName,
    options,
    harness.context,
  );
}

describe('archive sync runner', () => {
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
    const root = await mkdtemp(join(tmpdir(), 'oat-archive-sync-runner-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'projects', 'archived'), {
      recursive: true,
    });
    return root;
  }

  it('selects the latest snapshot for each project when no project name is provided', async () => {
    const harness = createHarness({
      listOutput: [
        '                           PRE 20260301-demo-project/',
        '                           PRE 20260401-demo-project/',
        '                           PRE 20260401-other-project/',
      ].join('\n'),
    });

    await runSync(harness);

    expect(harness.ensureS3ArchiveAccess).toHaveBeenCalledWith(
      {
        mode: 'sync',
        s3Uri: 's3://example-bucket/oat-archive',
        syncOnComplete: true,
        awsProfile: undefined,
        awsRegion: undefined,
      },
      expect.any(Object),
    );
    expect(harness.removeDirectory).toHaveBeenCalledWith(
      join(
        '/tmp/workspace/open-agent-toolkit',
        '.oat/projects/archived/demo-project',
      ),
      { recursive: true, force: true },
    );
    expect(harness.removeDirectory).toHaveBeenCalledWith(
      join(
        '/tmp/workspace/open-agent-toolkit',
        '.oat/projects/archived/other-project',
      ),
      { recursive: true, force: true },
    );
    expect(harness.execFile).toHaveBeenNthCalledWith(
      1,
      'aws',
      [
        's3',
        'ls',
        's3://example-bucket/oat-archive/open-agent-toolkit/projects/',
      ],
      expect.objectContaining({
        cwd: '/tmp/workspace/open-agent-toolkit',
      }),
    );
    expect(harness.execFile).toHaveBeenNthCalledWith(
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
        '--exclude',
        '.git/*',
      ],
      expect.objectContaining({
        cwd: '/tmp/workspace/open-agent-toolkit',
      }),
    );
    expect(harness.execFile).toHaveBeenNthCalledWith(
      3,
      'aws',
      [
        's3',
        'sync',
        's3://example-bucket/oat-archive/open-agent-toolkit/projects/20260401-other-project',
        '.oat/projects/archived/other-project',
        '--exclude',
        'reviews/*',
        '--exclude',
        'pr/*',
        '--exclude',
        '.git/*',
      ],
      expect.objectContaining({
        cwd: '/tmp/workspace/open-agent-toolkit',
      }),
    );
    expect(process.exitCode).toBe(0);
  });

  it('resolves archive generations when syncing by project name', async () => {
    const listOutput = [
      '                           PRE 20261011-demo/',
      '                           PRE 20261012-demo-g2/',
    ].join('\n');
    const prefix =
      's3://example-bucket/oat-archive/open-agent-toolkit/projects';
    const syncCalls = (harness: ReturnType<typeof createHarness>) =>
      harness.execFile.mock.calls
        .map(([, args]) => args as string[])
        .filter((args) => args[1] === 'sync')
        .map((args) => [args[2], args[3]]);

    // By base name: the latest generation, into its own directory.
    const byName = createHarness({ listOutput });
    await runSync(byName, { projectName: 'demo' });
    expect(syncCalls(byName)).toEqual([
      [`${prefix}/20261012-demo-g2`, '.oat/projects/archived/demo-g2'],
    ]);

    // A full generation name and an exact snapshot name still match exactly.
    const byFullName = createHarness({ listOutput });
    await runSync(byFullName, { projectName: 'demo-g2' });
    expect(syncCalls(byFullName)).toEqual([
      [`${prefix}/20261012-demo-g2`, '.oat/projects/archived/demo-g2'],
    ]);
    const bySnapshot = createHarness({ listOutput });
    await runSync(bySnapshot, { projectName: '20261011-demo' });
    expect(syncCalls(bySnapshot)).toEqual([
      [`${prefix}/20261011-demo`, '.oat/projects/archived/demo'],
    ]);

    // An unnamed sync hydrates every generation into its own directory.
    const unnamed = createHarness({ listOutput });
    await runSync(unnamed);
    expect(syncCalls(unnamed)).toEqual([
      [`${prefix}/20261011-demo`, '.oat/projects/archived/demo'],
      [`${prefix}/20261012-demo-g2`, '.oat/projects/archived/demo-g2'],
    ]);

    // A later generation outranks a later-dated earlier generation.
    const reordered = createHarness({
      listOutput: [
        '                           PRE 20261012-demo-g2/',
        '                           PRE 20261020-demo/',
      ].join('\n'),
    });
    await runSync(reordered, { projectName: 'demo' });
    expect(syncCalls(reordered)).toEqual([
      [`${prefix}/20261012-demo-g2`, '.oat/projects/archived/demo-g2'],
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('resolves scope-qualified generation families by name', async () => {
    const listOutput = [
      '                           PRE 20261011-demo/',
      '                           PRE 20261011-demo-local/',
      '                           PRE 20261012-demo-g2/',
      '                           PRE 20261013-demo-g2-local/',
      '                           PRE 20261014-my-g2-project/',
    ].join('\n');
    const prefix =
      's3://example-bucket/oat-archive/open-agent-toolkit/projects';
    const syncCalls = (harness: ReturnType<typeof createHarness>) =>
      harness.execFile.mock.calls
        .map(([, args]) => args as string[])
        .filter((args) => args[1] === 'sync')
        .map((args) => [args[2], args[3]]);
    const run = async (projectName?: string) => {
      const harness = createHarness({ listOutput });
      await runSync(harness, projectName ? { projectName } : {});
      return syncCalls(harness);
    };

    // A scope family restores its latest generation.
    expect(await run('demo-local')).toEqual([
      [
        `${prefix}/20261013-demo-g2-local`,
        '.oat/projects/archived/demo-g2-local',
      ],
    ]);
    // The base project restores every family at its latest generation.
    expect(await run('demo')).toEqual([
      [`${prefix}/20261012-demo-g2`, '.oat/projects/archived/demo-g2'],
      [
        `${prefix}/20261013-demo-g2-local`,
        '.oat/projects/archived/demo-g2-local',
      ],
    ]);
    // Exact snapshot and full generation names keep precedence.
    expect(await run('20261011-demo-local')).toEqual([
      [`${prefix}/20261011-demo-local`, '.oat/projects/archived/demo-local'],
    ]);
    expect(await run('demo-g2-local')).toEqual([
      [
        `${prefix}/20261013-demo-g2-local`,
        '.oat/projects/archived/demo-g2-local',
      ],
    ]);
    // A literal project name containing `-gN` stays its own project.
    expect(await run('my-g2-project')).toEqual([
      [
        `${prefix}/20261014-my-g2-project`,
        '.oat/projects/archived/my-g2-project',
      ],
    ]);
    // Unnamed sync is unchanged: every local archive name, latest date.
    expect((await run()).map(([, target]) => target)).toEqual([
      '.oat/projects/archived/demo',
      '.oat/projects/archived/demo-local',
      '.oat/projects/archived/demo-g2',
      '.oat/projects/archived/demo-g2-local',
      '.oat/projects/archived/my-g2-project',
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('passes through dry-run mode without removing local archive directories', async () => {
    const harness = createHarness();

    await runSync(harness, { options: { dryRun: true } });

    expect(harness.removeDirectory).not.toHaveBeenCalled();
    expect(harness.execFile).toHaveBeenNthCalledWith(
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
        '--exclude',
        '.git/*',
        '--dryrun',
      ],
      expect.any(Object),
    );
    expect(harness.capture.info[0]).toBe(
      'Dry-run: would sync archived projects from s3://example-bucket/oat-archive/open-agent-toolkit/projects/20260401-demo-project to .oat/projects/archived/demo-project.',
    );
    expect(process.exitCode).toBe(0);
  });

  it('skips a snapshot that is already current locally', async () => {
    const repoRoot = await createRepoRoot();
    await mkdir(
      join(repoRoot, '.oat', 'projects', 'archived', 'demo-project'),
      {
        recursive: true,
      },
    );
    await writeFile(
      join(
        repoRoot,
        '.oat',
        'projects',
        'archived',
        'demo-project',
        ARCHIVE_SNAPSHOT_METADATA_FILENAME,
      ),
      JSON.stringify({ snapshotName: '20260401-demo-project' }),
      'utf8',
    );
    const harness = createHarness({ cwd: repoRoot });

    await runSync(harness);

    expect(harness.removeDirectory).not.toHaveBeenCalled();
    expect(harness.execFile).toHaveBeenCalledTimes(1);
    expect(harness.capture.info[0]).toBe(
      'Skipped archived projects; local archive is already using the latest remote snapshot.',
    );
    expect(process.exitCode).toBe(0);
  });

  it('restores a recordless terminal snapshot without recreating active state', async () => {
    const repoRoot = await createRepoRoot();
    const slug = 'retired-project';
    const snapshotName = `20260831-${slug}`;
    const harness = createHarness({
      cwd: repoRoot,
      listOutput: `                           PRE ${snapshotName}/`,
    });
    harness.execFile.mockImplementation(
      async (_file: string, args: readonly string[]) => {
        if (args[0] === 's3' && args[1] === 'ls') {
          return {
            stdout: `                           PRE ${snapshotName}/\n`,
            stderr: '',
          };
        }
        if (args[0] === 's3' && args[1] === 'sync') {
          const archivePath = join(repoRoot, String(args[3]));
          await mkdir(archivePath, { recursive: true });
          await writeFile(
            join(archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
            `${JSON.stringify({
              projectName: slug,
              snapshotName,
              scope: 'synced',
              sourceRefSha: 'a'.repeat(40),
            })}\n`,
            'utf8',
          );
        }
        return { stdout: '', stderr: '' };
      },
    );

    await runSync(harness, { projectName: slug });

    await expect(
      readFile(
        join(
          repoRoot,
          '.oat',
          'projects',
          'archived',
          slug,
          ARCHIVE_SNAPSHOT_METADATA_FILENAME,
        ),
        'utf8',
      ),
    ).resolves.toContain(`"snapshotName":"${snapshotName}"`);
    await expect(
      readFile(
        join(repoRoot, '.oat', 'projects', 'synced', `${slug}.json`),
        'utf8',
      ),
    ).rejects.toThrow();
    await expect(
      readFile(
        join(repoRoot, '.oat', 'projects', 'synced', slug, 'state.md'),
        'utf8',
      ),
    ).rejects.toThrow();
    expect(process.exitCode).toBe(0);
  });

  it('requires a project name when force is enabled', async () => {
    const harness = createHarness();

    await runSync(harness, { options: { force: true } });

    expect(harness.removeDirectory).not.toHaveBeenCalled();
    expect(harness.execFile).not.toHaveBeenCalled();
    expect(harness.capture.error[0]).toBe(
      '`--force` requires a project name for `oat repo archive sync`.',
    );
    expect(process.exitCode).toBe(1);
  });

  it('fails when archive.s3Uri is not configured', async () => {
    const harness = createHarness({
      config: { version: 1 },
    });

    await runSync(harness);

    expect(harness.ensureS3ArchiveAccess).not.toHaveBeenCalled();
    expect(harness.execFile).not.toHaveBeenCalled();
    expect(harness.capture.error[0]).toBe(
      'Archive sync requires `archive.s3Uri` to be configured. Set it with `oat config set archive.s3Uri <s3://...>` and retry.',
    );
    expect(process.exitCode).toBe(1);
  });

  it('emits the archive sync JSON contract', async () => {
    const harness = createHarness({ json: true });

    await runSync(harness, { projectName: 'demo-project' });

    expect(harness.capture.jsonPayloads[0]).toMatchObject({
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

  it('sets an error exit code when the AWS preflight fails', async () => {
    const harness = createHarness({
      preflightError: new CliError(
        'AWS CLI is required for `oat repo archive sync`, but it was not found on PATH. Install `aws` and retry.',
      ),
    });

    await runSync(harness);

    expect(harness.execFile).not.toHaveBeenCalled();
    expect(harness.capture.error[0]).toBe(
      'AWS CLI is required for `oat repo archive sync`, but it was not found on PATH. Install `aws` and retry.',
    );
    expect(process.exitCode).toBe(1);
  });
});
