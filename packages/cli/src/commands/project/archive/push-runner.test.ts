import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { OatConfig, OatLocalConfig } from '@config/oat-config';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    warnings: string[];
  };
  config?: OatConfig;
  cwd?: string;
  json?: boolean;
  localConfig?: OatLocalConfig;
  processEnv?: NodeJS.ProcessEnv;
  projectsRoot?: string;
  timestamp?: string;
}

function createHarness(options: HarnessOptions = {}): {
  archiveProjectOnCompletion: ReturnType<typeof vi.fn>;
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
  const archiveResult = options.archiveResult ?? {
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
    warnings: ['Archive completed locally; S3 sync skipped.'],
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

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('archives the explicit project path with archive config fields', async () => {
    const { archiveProjectOnCompletion, capture, context, dependencies } =
      createHarness();

    await runArchivePushCommand(
      dependencies,
      '.oat/projects/custom/demo-project',
      {},
      context,
    );

    expect(archiveProjectOnCompletion).toHaveBeenCalledWith({
      repoRoot: '/tmp/workspace/open-agent-toolkit',
      projectPath: join(
        '/tmp/workspace/open-agent-toolkit',
        '.oat',
        'projects',
        'custom',
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

  it('emits the JSON contract for archive push results', async () => {
    const { capture, context, dependencies } = createHarness({ json: true });

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
      warnings: ['Archive completed locally; S3 sync skipped.'],
    });
    expect(process.exitCode).toBe(0);
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
});
