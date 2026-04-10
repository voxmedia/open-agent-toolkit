import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createConfigCommand } from './index';

interface HarnessOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();

  const command = createConfigCommand({
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
    processEnv: options.env ?? {},
  });

  return { capture, command };
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

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'config', ...commandArgs], {
    from: 'user',
  });
}

describe('oat config', () => {
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
    const root = await mkdtemp(join(tmpdir(), 'oat-config-command-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    return root;
  }

  it('gets existing local config key values', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['get', 'activeProject']);

    expect(capture.info[0]).toBe('.oat/projects/shared/demo');
    expect(process.exitCode).toBe(0);
  });

  it('gets empty string for missing local config values', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'activeProject']);

    expect(capture.info[0]).toBe('');
    expect(process.exitCode).toBe(0);
  });

  it('returns exit code 1 for unknown get keys', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'unknown.key']);

    expect(capture.error[0]).toContain('Unknown config key: unknown.key');
    expect(process.exitCode).toBe(1);
  });

  it('gets projects.root with env override precedence', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, projects: { root: '.oat/projects/from-config' } })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({
      cwd: root,
      env: { OAT_PROJECTS_ROOT: '.oat/projects/from-env' },
    });
    await runCommand(command, ['get', 'projects.root']);

    expect(capture.info[0]).toBe('.oat/projects/from-env');
    expect(process.exitCode).toBe(0);
  });

  it('sets local config keys in config.local.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, [
      'set',
      'activeProject',
      '.oat/projects/shared/demo',
    ]);

    const raw = await readFile(join(root, '.oat', 'config.local.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      activeProject: '.oat/projects/shared/demo',
    });
    expect(process.exitCode).toBe(0);
  });

  it('sets shared config keys in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'projects.root', '.oat/projects/custom']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      projects: { root: '.oat/projects/custom' },
    });
    expect(process.exitCode).toBe(0);
  });

  it('gets git.defaultBranch from shared config', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, git: { defaultBranch: 'main' } })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['get', 'git.defaultBranch']);

    expect(capture.info[0]).toBe('main');
    expect(process.exitCode).toBe(0);
  });

  it('sets archive.s3Uri in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, [
      'set',
      'archive.s3Uri',
      's3://example-bucket/oat-archive',
    ]);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      archive: { s3Uri: 's3://example-bucket/oat-archive' },
    });
    expect(process.exitCode).toBe(0);
  });

  it('sets archive.s3SyncOnComplete to true in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'archive.s3SyncOnComplete', 'true']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      archive: { s3SyncOnComplete: true },
    });
    expect(process.exitCode).toBe(0);
  });

  it('sets archive.summaryExportPath in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, [
      'set',
      'archive.summaryExportPath',
      '.oat/repo/reference/project-summaries',
    ]);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      archive: {
        summaryExportPath: '.oat/repo/reference/project-summaries',
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('gets tools.project-management default false when not set', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'tools.project-management']);

    expect(capture.info[0]).toBe('false');
    expect(process.exitCode).toBe(0);
  });

  it('sets tools.project-management to true in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'tools.project-management', 'true']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      tools: { 'project-management': true },
    });
    expect(process.exitCode).toBe(0);
  });

  it('gets tools.project-management true after setting it', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, tools: { 'project-management': true } })}\n`,
      'utf8',
    );
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'tools.project-management']);

    expect(capture.info[0]).toBe('true');
    expect(process.exitCode).toBe(0);
  });

  it('sets tools.project-management to false in config.json', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, tools: { 'project-management': true } })}\n`,
      'utf8',
    );
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'tools.project-management', 'false']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      tools: { 'project-management': false },
    });
    expect(process.exitCode).toBe(0);
  });

  it('set creates config.json when missing', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'worktrees.root', '.worktrees/custom']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      worktrees: { root: '.worktrees/custom' },
    });
    expect(process.exitCode).toBe(0);
  });

  it('coerces empty string to null for nullable keys', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'activeProject', '']);

    const raw = await readFile(join(root, '.oat', 'config.local.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      activeProject: null,
    });
    expect(process.exitCode).toBe(0);
  });

  it('list shows merged values with sources', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, worktrees: { root: '.worktrees/from-config' } })}\n`,
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );
    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['list']);

    expect(capture.info[0]).toContain('activeProject');
    expect(capture.info[0]).toContain('config.local.json');
    expect(capture.info[0]).toContain('projects.root');
    expect(capture.info[0]).toContain('.oat/projects/shared');
    expect(capture.info[0]).toContain('worktrees.root');
    expect(capture.info[0]).toContain('config.json');
    expect(process.exitCode).toBe(0);
  });

  it('supports json mode for get, set, and list', async () => {
    const root = await createRepoRoot();

    const getHarness = createHarness({ cwd: root });
    await runCommand(getHarness.command, ['get', 'activeProject'], ['--json']);
    expect(getHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      key: 'activeProject',
      value: null,
    });
    expect(process.exitCode).toBe(0);

    const setHarness = createHarness({ cwd: root });
    await runCommand(
      setHarness.command,
      ['set', 'projects.root', '.oat/projects/custom'],
      ['--json'],
    );
    expect(setHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      key: 'projects.root',
      value: '.oat/projects/custom',
      source: 'config.json',
    });
    expect(process.exitCode).toBe(0);

    const listHarness = createHarness({ cwd: root });
    await runCommand(listHarness.command, ['list'], ['--json']);
    expect(listHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      values: expect.any(Array),
    });
    expect(process.exitCode).toBe(0);
  });

  it('describe without a key prints the grouped config catalog', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe']);

    expect(capture.info[0]).toContain('Shared Repo (.oat/config.json)');
    expect(capture.info[0]).toContain('archive.s3Uri');
    expect(capture.info[0]).toContain('Repo Local (.oat/config.local.json)');
    expect(capture.info[0]).toContain('User (~/.oat/config.json)');
    expect(capture.info[0]).toContain('Sync/Provider (.oat/sync/config.json)');
    expect(capture.info[0]).toContain('sync.providers.<name>.enabled');
    expect(process.exitCode).toBe(0);
  });

  it('describe with a key prints detailed metadata', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe', 'archive.s3Uri']);

    expect(capture.info[0]).toContain('Key: archive.s3Uri');
    expect(capture.info[0]).toContain('Scope: shared repo');
    expect(capture.info[0]).toContain('File: .oat/config.json');
    expect(capture.info[0]).toContain('Type: string');
    expect(capture.info[0]).toContain('Default: unset');
    expect(capture.info[0]).toContain(
      'Owning command: oat config set archive.s3Uri <value>',
    );
    expect(process.exitCode).toBe(0);
  });

  it('describe supports json mode', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe', 'archive.s3Uri'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      key: 'archive.s3Uri',
      entries: [
        expect.objectContaining({
          key: 'archive.s3Uri',
          file: '.oat/config.json',
          scope: 'shared repo',
        }),
      ],
    });
    expect(process.exitCode).toBe(0);
  });

  it('describe resolves wildcard provider keys from concrete names', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe', 'sync.providers.github.enabled']);

    expect(capture.info[0]).toContain('Key: sync.providers.<name>.enabled');
    expect(capture.info[0]).toContain('File: .oat/sync/config.json');
    expect(capture.info[0]).toContain('Owning command: oat providers set');
    expect(process.exitCode).toBe(0);
  });

  it('describe returns exit code 1 for unknown keys', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['describe', 'missing.key']);

    expect(capture.error[0]).toContain('Unknown config key: missing.key');
    expect(process.exitCode).toBe(1);
  });

  it('gets autoReviewAtCheckpoints default false when not set', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'autoReviewAtCheckpoints']);

    expect(capture.info[0]).toBe('false');
    expect(process.exitCode).toBe(0);
  });

  it('sets autoReviewAtCheckpoints to true in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'autoReviewAtCheckpoints', 'true']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    const config = JSON.parse(raw);
    expect(config.autoReviewAtCheckpoints).toBe(true);
    expect(process.exitCode).toBe(0);
  });

  describe('workflow preference catalog', () => {
    it('describe lists all six workflow preference keys under Workflow Preferences group', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe']);

      expect(capture.info[0]).toContain('Workflow Preferences');
      expect(capture.info[0]).toContain('workflow.hillCheckpointDefault');
      expect(capture.info[0]).toContain('workflow.archiveOnComplete');
      expect(capture.info[0]).toContain('workflow.createPrOnComplete');
      expect(capture.info[0]).toContain('workflow.postImplementSequence');
      expect(capture.info[0]).toContain('workflow.reviewExecutionModel');
      expect(capture.info[0]).toContain('workflow.autoNarrowReReviewScope');
      expect(process.exitCode).toBe(0);
    });

    it('describe workflow.hillCheckpointDefault shows enum metadata', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'workflow.hillCheckpointDefault']);

      expect(capture.info[0]).toContain('Key: workflow.hillCheckpointDefault');
      expect(capture.info[0]).toContain('every | final');
      expect(capture.info[0]).toContain('Default: null');
      expect(capture.info[0]).toContain(
        'Owning command: oat config set workflow.hillCheckpointDefault',
      );
      expect(process.exitCode).toBe(0);
    });

    it('describe workflow.archiveOnComplete shows boolean metadata', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'workflow.archiveOnComplete']);

      expect(capture.info[0]).toContain('Key: workflow.archiveOnComplete');
      expect(capture.info[0]).toContain('Type: boolean');
      expect(capture.info[0]).toContain('Default: null');
      expect(process.exitCode).toBe(0);
    });

    it('describe workflow.postImplementSequence shows full enum', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'workflow.postImplementSequence']);

      expect(capture.info[0]).toContain('Key: workflow.postImplementSequence');
      expect(capture.info[0]).toContain('wait | summary | pr | docs-pr');
      expect(process.exitCode).toBe(0);
    });

    it('describe workflow.reviewExecutionModel shows three-tier enum', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(command, ['describe', 'workflow.reviewExecutionModel']);

      expect(capture.info[0]).toContain('Key: workflow.reviewExecutionModel');
      expect(capture.info[0]).toContain('subagent | inline | fresh-session');
      expect(process.exitCode).toBe(0);
    });

    it('describe supports workflow keys via json mode', async () => {
      const root = await createRepoRoot();
      const { command, capture } = createHarness({ cwd: root });

      await runCommand(
        command,
        ['describe', 'workflow.archiveOnComplete'],
        ['--json'],
      );

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        key: 'workflow.archiveOnComplete',
        entries: [
          expect.objectContaining({
            key: 'workflow.archiveOnComplete',
            scope: 'workflow',
            type: 'boolean',
          }),
        ],
      });
      expect(process.exitCode).toBe(0);
    });
  });
});
