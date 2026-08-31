import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { SyncedProjectRecord } from '@commands/project/sync/record';
import type { OatConfig, OatLocalConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assertExactArchiveProjectRoot,
  resolveArchiveProjectTarget,
  type ArchiveProjectTarget,
} from './archive-utils';
import { createProjectArchiveCommand } from './index';
import {
  runArchivePushCommand,
  type ProjectArchivePushCommandDependencies,
} from './push-runner';

interface HarnessOptions {
  archiveResult?: {
    archivePath: string;
    s3Path: string | null;
    summaryExportFile: string | null;
    projectRecapExport?: {
      sourceRunRoot: string;
      exportRoot: string;
      manifest: {
        relativePath: 'manifest.json';
        verifiedArtifactCount: number;
      };
    } | null;
    warnings: string[];
    lifecycleCommit?: string | null;
    recapExportPaths?: string[];
    snapshotId?: string;
    terminalReceipt?: {
      status: 'retired' | 'already-retired';
      state: 'completed-only' | 'matching-aliases';
      activeAliasRetained: boolean;
      activeRef: string;
      completedRef: string;
      verifiedSha: string;
    } | null;
    recordRetired?: boolean;
  };
  archiveTarget?: ArchiveProjectTarget;
  config?: OatConfig;
  cwd?: string;
  json?: boolean;
  localConfig?: OatLocalConfig;
  processEnv?: NodeJS.ProcessEnv;
  projectsRoot?: string;
  timestamp?: string;
  syncedRecord?: SyncedProjectRecord | null;
}

function createHarness(options: HarnessOptions = {}): {
  archiveProjectOnCompletion: ReturnType<typeof vi.fn>;
  verifySelectedProjectRecapForArchive: ReturnType<typeof vi.fn>;
  capture: LoggerCapture;
  command: Command;
  context: CommandContext;
  dependencies: ProjectArchivePushCommandDependencies;
} {
  const capture = createLoggerCapture();
  const cwd = options.cwd ?? '/tmp/workspace/open-agent-toolkit';
  const projectsRoot = options.projectsRoot ?? '.oat/projects/shared';
  const config: OatConfig = options.config ?? {
    version: 1,
    archive: {
      s3Uri: 's3://example-bucket/oat-archive',
      s3SyncOnComplete: true,
      summaryExportPath: '.oat/repo/reference/project-summaries',
      awsProfile: 'work-sso',
      awsRegion: 'us-east-1',
    },
  };
  const localConfig: OatLocalConfig = options.localConfig ?? {
    version: 1,
    activeProject: '.oat/projects/shared/demo-project',
  };
  const processEnv = options.processEnv ?? { PATH: '/usr/bin' };
  const archiveResult = {
    archivePath: join(cwd, '.oat', 'projects', 'archived', 'demo-project'),
    s3Path:
      's3://example-bucket/oat-archive/open-agent-toolkit/projects/20260401-demo-project',
    summaryExportFile: join(
      cwd,
      '.oat',
      'repo',
      'reference',
      'project-summaries',
      '20260401-demo-project.md',
    ),
    projectRecapExport: null,
    warnings: ['Archive completed locally; S3 sync skipped.'],
    lifecycleCommit: null,
    recapExportPaths: [],
    snapshotId: 'demo-project',
    terminalReceipt: null,
    recordRetired: false,
    ...options.archiveResult,
  };
  const archiveTarget: ArchiveProjectTarget = options.archiveTarget ?? {
    archiveProjectPath: '.oat/projects/archived/demo-project',
    archiveRepoRoot: cwd,
    archivePath: join(cwd, '.oat', 'projects', 'archived', 'demo-project'),
    archivePathIsGitignored: false,
    primaryRepoRoot: null,
    primaryRepoRootAvailable: true,
    localOnlyWarning: null,
  };

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
  const archiveProjectOnCompletion = vi.fn(async () => archiveResult);
  const verifySelectedProjectRecapForArchive = vi.fn(async () => undefined);
  const dependencies: ProjectArchivePushCommandDependencies = {
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      ...context,
      dryRun: globalOptions.dryRun ?? context.dryRun,
      json: options.json ?? globalOptions.json ?? context.json,
      verbose: globalOptions.verbose ?? context.verbose,
      cwd: globalOptions.cwd ?? context.cwd,
    }),
    resolveProjectRoot: vi.fn(async () => cwd),
    readOatConfig: vi.fn(async () => config),
    readOatLocalConfig: vi.fn(async () => localConfig),
    resolveProjectsRoot: vi.fn(async () => projectsRoot),
    resolvePrimaryRepoRoot: vi.fn(async () => cwd),
    resolveArchiveProjectTarget: vi.fn(async () => archiveTarget),
    assertExactArchiveProjectRoot,
    readSyncedRecord: vi.fn(async () => options.syncedRecord ?? null),
    verifySelectedProjectRecapForArchive,
    archiveProjectOnCompletion,
    processEnv,
    timestamp: () => options.timestamp ?? '2026-04-01T12:34:56Z',
  };
  const command = createProjectArchiveCommand(dependencies);

  return {
    archiveProjectOnCompletion,
    capture,
    command,
    context,
    dependencies,
    verifySelectedProjectRecapForArchive,
  };
}

async function runProjectArchiveCommand(
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
    [...globalArgs, 'project', 'archive', ...commandArgs],
    {
      from: 'user',
    },
  );
}

describe('oat project archive push', () => {
  let originalExitCode: number | undefined;
  const tempDirs: string[] = [];

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('archives the explicit project path with archive config fields', async () => {
    const { archiveProjectOnCompletion, capture, context, dependencies } =
      createHarness();

    await runArchivePushCommand(
      dependencies,
      '.oat/projects/shared/demo-project',
      {},
      context,
    );

    expect(archiveProjectOnCompletion).toHaveBeenCalledWith({
      repoRoot: '/tmp/workspace/open-agent-toolkit',
      projectPath: join(
        '/tmp/workspace/open-agent-toolkit',
        '.oat',
        'projects',
        'shared',
        'demo-project',
      ),
      projectName: 'demo-project',
      projectsRoot: '.oat/projects/shared',
      s3Uri: 's3://example-bucket/oat-archive',
      s3SyncOnComplete: true,
      summaryExportPath: '.oat/repo/reference/project-summaries',
      awsProfile: 'work-sso',
      awsRegion: 'us-east-1',
    });
    expect(capture.warn).toEqual([
      'Archive completed locally; S3 sync skipped.',
    ]);
    expect(capture.info[0]).toBe(
      'Archived project `demo-project` to `/tmp/workspace/open-agent-toolkit/.oat/projects/archived/demo-project`.',
    );
    expect(capture.info[1]).toBe(
      'S3 archive: s3://example-bucket/oat-archive/open-agent-toolkit/projects/20260401-demo-project',
    );
    expect(capture.info[2]).toBe(
      'Summary export: /tmp/workspace/open-agent-toolkit/.oat/repo/reference/project-summaries/20260401-demo-project.md',
    );
    expect(process.exitCode).toBe(0);
  });

  it('falls back to activeProject when no project path is provided', async () => {
    const { archiveProjectOnCompletion, context, dependencies } =
      createHarness();

    await runArchivePushCommand(dependencies, undefined, {}, context);

    expect(archiveProjectOnCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        projectPath: join(
          '/tmp/workspace/open-agent-toolkit',
          '.oat',
          'projects',
          'shared',
          'demo-project',
        ),
        projectName: 'demo-project',
      }),
    );
    expect(process.exitCode).toBe(0);
  });

  it('forwards only the selected project recap run to archival', async () => {
    const {
      archiveProjectOnCompletion,
      context,
      dependencies,
      verifySelectedProjectRecapForArchive,
    } = createHarness();

    await runArchivePushCommand(
      dependencies,
      undefined,
      { projectRecapRun: 'explainers/project-recap/run-20260401' },
      context,
    );

    expect(archiveProjectOnCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        projectRecapRun: 'explainers/project-recap/run-20260401',
      }),
    );
    expect(verifySelectedProjectRecapForArchive).toHaveBeenCalledWith(
      '/tmp/workspace/open-agent-toolkit/.oat/projects/shared/demo-project',
      'explainers/project-recap/run-20260401',
    );
    expect(
      verifySelectedProjectRecapForArchive.mock.invocationCallOrder[0],
    ).toBeLessThan(archiveProjectOnCompletion.mock.invocationCallOrder[0]);
    expect(process.exitCode).toBe(0);
  });

  it('rejects a blocked recap before archive mutation, including dry-run', async () => {
    for (const dryRun of [false, true]) {
      const { archiveProjectOnCompletion, capture, context, dependencies } =
        createHarness();
      dependencies.verifySelectedProjectRecapForArchive = vi.fn(async () => {
        throw new Error(
          'Selected project recap is built-needs-review and requires a passing visual review before archival.',
        );
      });

      await runArchivePushCommand(
        dependencies,
        undefined,
        {
          dryRun,
          projectRecapRun: 'explainers/project-recap/blocked',
        },
        context,
      );

      expect(archiveProjectOnCompletion).not.toHaveBeenCalled();
      expect(capture.error.at(-1)).toMatch(
        /built-needs-review.*visual review/i,
      );
      expect(process.exitCode).toBe(1);
    }
  });

  it('skips S3 push when archive.s3SyncOnComplete is false', async () => {
    const { archiveProjectOnCompletion, context, dependencies } = createHarness(
      {
        config: {
          version: 1,
          archive: {
            s3Uri: 's3://example-bucket/oat-archive',
            s3SyncOnComplete: false,
          },
        },
        archiveResult: {
          archivePath:
            '/tmp/workspace/open-agent-toolkit/.oat/projects/archived/demo-project',
          s3Path: null,
          summaryExportFile: null,
          warnings: [],
        },
      },
    );

    await runArchivePushCommand(dependencies, undefined, {}, context);

    expect(archiveProjectOnCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        s3Uri: 's3://example-bucket/oat-archive',
        s3SyncOnComplete: false,
      }),
    );
    expect(process.exitCode).toBe(0);
  });

  it('does not call the mutating archive helper during --dry-run', async () => {
    const { archiveProjectOnCompletion, capture, context, dependencies } =
      createHarness();

    await runArchivePushCommand(
      dependencies,
      undefined,
      { dryRun: true },
      context,
    );

    expect(archiveProjectOnCompletion).not.toHaveBeenCalled();
    expect(capture.info).toEqual([
      'Dry-run: would archive project `demo-project` from `/tmp/workspace/open-agent-toolkit/.oat/projects/shared/demo-project` to `/tmp/workspace/open-agent-toolkit/.oat/projects/archived/demo-project`.',
      'S3 archive: s3://example-bucket/oat-archive/open-agent-toolkit/projects/20260401-demo-project',
      'Summary export path: .oat/repo/reference/project-summaries',
    ]);
    expect(process.exitCode).toBe(0);
  });

  it.each([
    '.oat/projects/shared/parent/demo-project',
    '.oat/projects/local/parent/demo-project',
    '.oat/projects/synced/container/demo-project',
  ])(
    'rejects descendant dry-run target %s before target resolution',
    async (projectPath) => {
      const { archiveProjectOnCompletion, capture, context, dependencies } =
        createHarness();

      await runArchivePushCommand(
        dependencies,
        projectPath,
        { dryRun: true },
        context,
      );

      expect(capture.error[0]).toContain('exact direct child');
      expect(dependencies.resolveArchiveProjectTarget).not.toHaveBeenCalled();
      expect(archiveProjectOnCompletion).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    },
  );

  it('accepts a direct child through a confined symlinked absolute custom root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-archive-symlink-root-'));
    tempDirs.push(root);
    const repoRoot = join(root, 'repo');
    const repoAlias = join(root, 'repo-alias');
    const sharedRoot = join(repoRoot, '.oat', 'custom', 'shared');
    await mkdir(join(sharedRoot, 'demo-project'), { recursive: true });
    await symlink(repoRoot, repoAlias, 'dir');
    const projectsRoot = join(repoAlias, '.oat', 'custom', 'shared');
    const { archiveProjectOnCompletion, capture, context, dependencies } =
      createHarness({
        cwd: repoRoot,
        projectsRoot,
        localConfig: {
          version: 1,
          activeProject: join(projectsRoot, 'demo-project'),
        },
      });

    await runArchivePushCommand(
      dependencies,
      undefined,
      { dryRun: true },
      context,
    );

    expect(capture.error).toEqual([]);
    expect(dependencies.resolveArchiveProjectTarget).toHaveBeenCalledOnce();
    expect(archiveProjectOnCompletion).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('previews the resolved primary-checkout archive target during --dry-run', async () => {
    const { archiveProjectOnCompletion, capture, context, dependencies } =
      createHarness({
        cwd: '/tmp/worktrees/sc-pinned-cryostat-af7a',
        archiveTarget: {
          archiveProjectPath: '.oat/projects/archived/demo-project',
          archiveRepoRoot: '/tmp/workspace/open-agent-toolkit',
          archivePath:
            '/tmp/workspace/open-agent-toolkit/.oat/projects/archived/demo-project-20260401123456',
          archivePathIsGitignored: true,
          primaryRepoRoot: '/tmp/workspace/open-agent-toolkit',
          primaryRepoRootAvailable: true,
          localOnlyWarning: null,
        },
      });

    await runArchivePushCommand(
      dependencies,
      undefined,
      { dryRun: true },
      context,
    );

    expect(dependencies.resolveArchiveProjectTarget).toHaveBeenCalledWith(
      {
        repoRoot: '/tmp/worktrees/sc-pinned-cryostat-af7a',
        projectsRoot: '.oat/projects/shared',
        projectName: 'demo-project',
      },
      expect.objectContaining({
        env: { PATH: '/usr/bin' },
      }),
    );
    expect(archiveProjectOnCompletion).not.toHaveBeenCalled();
    expect(capture.info[0]).toBe(
      'Dry-run: would archive project `demo-project` from `/tmp/worktrees/sc-pinned-cryostat-af7a/.oat/projects/shared/demo-project` to `/tmp/workspace/open-agent-toolkit/.oat/projects/archived/demo-project-20260401123456`.',
    );
    expect(process.exitCode).toBe(0);
  });

  it('keeps first-attempt and persisted-retry synced dry-run identities equal', async () => {
    const cwd = '/tmp/workspace/open-agent-toolkit';
    const archiveSnapshot = '20260401-demo-project';
    const baseRecord: SyncedProjectRecord = {
      schemaVersion: 1,
      slug: 'demo-project',
      scope: 'synced',
      ref: 'refs/oat/projects/demo-project',
      remote: 'origin',
      status: 'complete',
      createdAt: '2026-03-01T00:00:00.000Z',
      completedAt: '2026-03-15T00:00:00.000Z',
    };
    const first = createHarness({
      cwd,
      json: true,
      localConfig: {
        version: 1,
        activeProject: '.oat/projects/synced/demo-project',
      },
      syncedRecord: baseRecord,
    });
    const retry = createHarness({
      cwd,
      json: true,
      localConfig: {
        version: 1,
        activeProject: '.oat/projects/synced/demo-project',
      },
      syncedRecord: { ...baseRecord, archiveSnapshot },
      timestamp: '2026-04-02T12:34:56Z',
    });

    await runArchivePushCommand(
      first.dependencies,
      undefined,
      { dryRun: true },
      first.context,
    );
    await runArchivePushCommand(
      retry.dependencies,
      undefined,
      { dryRun: true },
      retry.context,
    );

    expect(first.dependencies.resolveArchiveProjectTarget).toHaveBeenCalledWith(
      {
        repoRoot: cwd,
        projectsRoot: '.oat/projects/shared',
        projectName: 'demo-project',
      },
      expect.anything(),
    );
    expect(retry.dependencies.resolveArchiveProjectTarget).toHaveBeenCalledWith(
      {
        repoRoot: cwd,
        projectsRoot: '.oat/projects/shared',
        projectName: 'demo-project',
        archiveSnapshot,
        archiveScope: 'synced',
      },
      expect.anything(),
    );
    expect(first.archiveProjectOnCompletion).not.toHaveBeenCalled();
    expect(retry.archiveProjectOnCompletion).not.toHaveBeenCalled();
    const expectedIdentity = {
      mode: 'dry-run',
      snapshotId: archiveSnapshot,
      s3Path: `s3://example-bucket/oat-archive/open-agent-toolkit/projects/${archiveSnapshot}`,
      summaryExportFile: join(
        cwd,
        '.oat',
        'repo',
        'reference',
        'project-summaries',
        `${archiveSnapshot}.md`,
      ),
    };
    expect(first.capture.jsonPayloads[0]).toMatchObject(expectedIdentity);
    expect(retry.capture.jsonPayloads[0]).toMatchObject(expectedIdentity);
    expect(process.exitCode).toBe(0);
  });

  it('previews an absolute OAT_PROJECTS_ROOT archive target without duplicating the repo root', async () => {
    const cwd = '/tmp/workspace/open-agent-toolkit';
    const projectsRoot = join(cwd, '.oat', 'projects', 'shared');
    const { archiveProjectOnCompletion, capture, context, dependencies } =
      createHarness({
        cwd,
        projectsRoot,
        processEnv: {
          PATH: '/usr/bin',
          OAT_PROJECTS_ROOT: projectsRoot,
        },
      });
    dependencies.resolveProjectsRoot = vi.fn(async (_repoRoot, env) => {
      return env.OAT_PROJECTS_ROOT ?? '.oat/projects/shared';
    });
    dependencies.resolveArchiveProjectTarget = vi.fn(
      async (options, targetDependencies) => {
        return resolveArchiveProjectTarget(options, {
          ...targetDependencies,
          gitExecFile: async () => {
            const error = new Error('not ignored') as NodeJS.ErrnoException;
            error.code = 1;
            throw error;
          },
        });
      },
    );

    await runArchivePushCommand(
      dependencies,
      undefined,
      { dryRun: true },
      context,
    );

    expect(dependencies.resolveProjectsRoot).toHaveBeenCalledWith(
      cwd,
      expect.objectContaining({
        OAT_PROJECTS_ROOT: projectsRoot,
      }),
    );
    expect(archiveProjectOnCompletion).not.toHaveBeenCalled();
    expect(capture.info[0]).toBe(
      'Dry-run: would archive project `demo-project` from `/tmp/workspace/open-agent-toolkit/.oat/projects/shared/demo-project` to `/tmp/workspace/open-agent-toolkit/.oat/projects/archived/demo-project`.',
    );
    expect(process.exitCode).toBe(0);
  });

  it('fails before mutation when the resolved archive target would be local-only', async () => {
    const localOnlyWarning =
      'Refusing to archive project `demo-project` because `.oat/projects/archived/demo-project` is gitignored in this worktree and the primary checkout `/tmp/workspace/open-agent-toolkit` is unavailable. Run `oat project archive` from the primary checkout or restore that checkout before retrying.';
    const { archiveProjectOnCompletion, capture, context, dependencies } =
      createHarness({
        cwd: '/tmp/worktrees/sc-pinned-cryostat-af7a',
        archiveTarget: {
          archiveProjectPath: '.oat/projects/archived/demo-project',
          archiveRepoRoot: '/tmp/worktrees/sc-pinned-cryostat-af7a',
          archivePath:
            '/tmp/worktrees/sc-pinned-cryostat-af7a/.oat/projects/archived/demo-project',
          archivePathIsGitignored: true,
          primaryRepoRoot: '/tmp/workspace/open-agent-toolkit',
          primaryRepoRootAvailable: false,
          localOnlyWarning,
        },
      });

    await runArchivePushCommand(dependencies, undefined, {}, context);

    expect(archiveProjectOnCompletion).not.toHaveBeenCalled();
    expect(capture.error[0]).toBe(localOnlyWarning);
    expect(process.exitCode).toBe(1);
  });

  it('emits the JSON contract for archive push results', async () => {
    const recapExport = {
      sourceRunRoot:
        '/tmp/workspace/open-agent-toolkit/.oat/projects/shared/demo-project/explainers/project-recap/run-20260401',
      exportRoot:
        '/tmp/workspace/open-agent-toolkit/.oat/repo/reference/project-recaps/20260401-demo-project',
      manifest: {
        relativePath: 'manifest.json' as const,
        verifiedArtifactCount: 5,
      },
    };
    const { capture, context, dependencies } = createHarness({
      json: true,
      archiveResult: {
        archivePath:
          '/tmp/workspace/open-agent-toolkit/.oat/projects/archived/demo-project',
        s3Path:
          's3://example-bucket/oat-archive/open-agent-toolkit/projects/20260401-demo-project',
        summaryExportFile:
          '/tmp/workspace/open-agent-toolkit/.oat/repo/reference/project-summaries/20260401-demo-project.md',
        projectRecapExport: recapExport,
        warnings: ['Archive completed locally; S3 sync skipped.'],
      },
    });

    await runArchivePushCommand(dependencies, undefined, {}, context);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'ok',
      mode: 'apply',
      projectName: 'demo-project',
      projectPath:
        '/tmp/workspace/open-agent-toolkit/.oat/projects/shared/demo-project',
      archivePath:
        '/tmp/workspace/open-agent-toolkit/.oat/projects/archived/demo-project',
      s3Path:
        's3://example-bucket/oat-archive/open-agent-toolkit/projects/20260401-demo-project',
      summaryExportFile:
        '/tmp/workspace/open-agent-toolkit/.oat/repo/reference/project-summaries/20260401-demo-project.md',
      projectRecapExport: recapExport,
      lifecycleCommit: null,
      recapExportPaths: [],
      snapshotId: 'demo-project',
      completedRef: null,
      verifiedSourceSha: null,
      activeAliasDisposition: null,
      recordRetired: false,
      warnings: ['Archive completed locally; S3 sync skipped.'],
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports a recordless synced terminal retry with its authoritative receipt', async () => {
    const verifiedSha = 'a'.repeat(40);
    const { archiveProjectOnCompletion, capture, context, dependencies } =
      createHarness({
        json: true,
        localConfig: {
          version: 1,
          activeProject: '.oat/projects/synced/demo-project',
        },
        syncedRecord: null,
        archiveResult: {
          archivePath:
            '/tmp/workspace/open-agent-toolkit/.oat/projects/archived/demo-project',
          s3Path:
            's3://example-bucket/oat-archive/open-agent-toolkit/projects/20260401-demo-project',
          summaryExportFile:
            '/tmp/workspace/open-agent-toolkit/.oat/repo/reference/project-summaries/20260401-demo-project.md',
          warnings: [],
          lifecycleCommit: 'b'.repeat(40),
          snapshotId: '20260401-demo-project',
          recordRetired: true,
          terminalReceipt: {
            status: 'already-retired',
            state: 'matching-aliases',
            activeAliasRetained: true,
            activeRef: 'refs/oat/projects/demo-project',
            completedRef: 'refs/oat/completed/demo-project',
            verifiedSha,
          },
        },
      });

    await runArchivePushCommand(dependencies, undefined, {}, context);

    expect(archiveProjectOnCompletion).toHaveBeenCalledOnce();
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      mode: 'apply',
      snapshotId: '20260401-demo-project',
      completedRef: 'refs/oat/completed/demo-project',
      verifiedSourceSha: verifiedSha,
      activeAliasDisposition: 'retained',
      recordRetired: true,
      lifecycleCommit: 'b'.repeat(40),
    });
    expect(process.exitCode).toBe(0);
  });

  it('returns a precise non-success result when configured archive durability fails', async () => {
    const { capture, context, dependencies } = createHarness({ json: true });
    dependencies.archiveProjectOnCompletion = vi.fn(async () => {
      throw new CliError(
        'Synced archive durability for demo-project requires the configured S3 upload to succeed before terminal cleanup.',
        1,
      );
    });

    await runArchivePushCommand(dependencies, undefined, {}, context);

    expect(capture.jsonPayloads).toEqual([
      {
        status: 'error',
        message:
          'Synced archive durability for demo-project requires the configured S3 upload to succeed before terminal cleanup.',
      },
    ]);
    expect(process.exitCode).toBe(1);
  });

  it('reports an actionable error when no project path or activeProject exists', async () => {
    const { archiveProjectOnCompletion, capture, context, dependencies } =
      createHarness({
        localConfig: { version: 1, activeProject: null },
      });

    await runArchivePushCommand(dependencies, undefined, {}, context);

    expect(archiveProjectOnCompletion).not.toHaveBeenCalled();
    expect(capture.error[0]).toBe(
      'No project path provided and no active project is configured. Pass a project path or set `activeProject`.',
    );
    expect(process.exitCode).toBe(1);
  });

  it('wires the bare archive command action', async () => {
    const { archiveProjectOnCompletion, command } = createHarness();

    await runProjectArchiveCommand(command, {
      commandArgs: ['.oat/projects/shared/demo-project'],
    });

    expect(archiveProjectOnCompletion).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(0);
  });

  it('wires --no-commit into synced archive options', async () => {
    const { archiveProjectOnCompletion, command } = createHarness();

    await runProjectArchiveCommand(command, {
      commandArgs: ['.oat/projects/synced/demo-project', '--no-commit'],
    });

    expect(archiveProjectOnCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ commit: false }),
    );
    expect(process.exitCode).toBe(0);
  });
});
