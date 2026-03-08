import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { CliError } from '@errors/cli-error';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCleanupProjectCommand, runCleanupProject } from './project';

async function createRepoRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-cleanup-project-'));
  await mkdir(join(root, '.git'), { recursive: true });
  await mkdir(join(root, '.oat', 'projects', 'shared'), { recursive: true });
  await mkdir(join(root, '.oat', 'projects', 'local'), { recursive: true });
  return root;
}

interface CommandHarnessOptions {
  status?: 'ok' | 'drift';
  runError?: unknown;
  resolveError?: unknown;
}

function createCommandHarness(options: CommandHarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const status = options.status ?? 'ok';
  const command = createCleanupProjectCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'all') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: '/tmp/workspace',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => {
      if (options.resolveError) {
        throw options.resolveError;
      }
      return '/tmp/workspace';
    }),
    runCleanupProject: vi.fn(async () => {
      if (options.runError) {
        throw options.runError;
      }

      return {
        status,
        mode: 'dry-run',
        summary: {
          scanned: 1,
          issuesFound: status === 'drift' ? 1 : 0,
          planned: status === 'drift' ? 1 : 0,
          applied: 0,
          skipped: 0,
          blocked: 0,
        },
        actions:
          status === 'drift'
            ? [
                {
                  type: 'clear',
                  target: '.oat/config.local.json',
                  reason: 'invalid activeProject in .oat/config.local.json',
                  phase: 'project-scan',
                  result: 'planned',
                },
              ]
            : [],
      };
    }),
  });

  return { capture, command };
}

async function runProjectCommand(
  command: Command,
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();
  const cleanupCommand = new Command('cleanup');
  cleanupCommand.addCommand(command);
  program.addCommand(cleanupCommand);
  await program.parseAsync([...globalArgs, 'cleanup', 'project'], {
    from: 'user',
  });
}

describe('cleanup project drift scanning', () => {
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

  it('detects invalid active project in config.local.json', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/missing' })}\n`,
      'utf8',
    );

    const payload = await runCleanupProject({ repoRoot: root, dryRun: true });

    expect(payload.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'clear',
          target: '.oat/config.local.json',
        }),
      ]),
    );
  });

  it('detects missing state.md when lifecycle artifacts exist', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    const projectDir = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectDir, { recursive: true });
    await writeFile(join(projectDir, 'plan.md'), '# plan\n', 'utf8');

    const payload = await runCleanupProject({ repoRoot: root, dryRun: true });

    expect(payload.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'create',
          target: '.oat/projects/shared/demo/state.md',
        }),
      ]),
    );
  });

  it('detects completed project missing oat_lifecycle: complete', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    const projectDir = join(root, '.oat', 'projects', 'shared', 'done-project');
    await mkdir(projectDir, { recursive: true });
    await writeFile(
      join(projectDir, 'plan.md'),
      [
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        '|-------|------|--------|------|----------|',
        '| final | code | passed | 2026-02-18 | reviews/final.md |',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(projectDir, 'state.md'),
      ['---', 'oat_phase: implement', 'oat_phase_status: complete', '---'].join(
        '\n',
      ),
      'utf8',
    );

    const payload = await runCleanupProject({ repoRoot: root, dryRun: true });

    expect(payload.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'update',
          target: '.oat/projects/shared/done-project/state.md',
        }),
      ]),
    );
  });

  it('apply clears invalid active project pointer', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/missing' })}\n`,
      'utf8',
    );

    let refreshCalls = 0;
    await runCleanupProject(
      {
        repoRoot: root,
        dryRun: false,
      },
      {
        refreshDashboard: async () => {
          refreshCalls += 1;
        },
      },
    );

    await expect(
      readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    ).resolves.toContain('"activeProject": null');
    expect(refreshCalls).toBe(1);
  });

  it('apply recreates missing state.md from template', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'templates'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'templates', 'state.md'),
      [
        '---',
        'oat_template: true',
        'oat_template_name: state',
        '---',
        '',
        '# Project State: {Project Name}',
        '',
        '**Started:** YYYY-MM-DD',
      ].join('\n'),
      'utf8',
    );
    const projectDir = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectDir, { recursive: true });
    await writeFile(join(projectDir, 'plan.md'), '# plan\n', 'utf8');

    await runCleanupProject(
      { repoRoot: root, dryRun: false, today: '2026-02-18' },
      { refreshDashboard: async () => undefined },
    );

    const stateContent = await readFile(join(projectDir, 'state.md'), 'utf8');
    expect(stateContent).toContain('Project State: demo');
    expect(stateContent).toContain('2026-02-18');
    expect(stateContent).not.toContain('oat_template: true');
  });

  it('apply updates lifecycle metadata and triggers dashboard regeneration', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    const projectDir = join(root, '.oat', 'projects', 'shared', 'done-project');
    await mkdir(projectDir, { recursive: true });
    await writeFile(
      join(projectDir, 'plan.md'),
      [
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        '|-------|------|--------|------|----------|',
        '| final | code | passed | 2026-02-18 | reviews/final.md |',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(projectDir, 'state.md'),
      ['---', 'oat_phase: implement', 'oat_phase_status: complete', '---'].join(
        '\n',
      ),
      'utf8',
    );

    let refreshCalls = 0;
    await runCleanupProject(
      {
        repoRoot: root,
        dryRun: false,
      },
      {
        refreshDashboard: async () => {
          refreshCalls += 1;
        },
      },
    );

    const stateContent = await readFile(join(projectDir, 'state.md'), 'utf8');
    expect(stateContent).toContain('oat_lifecycle: complete');
    expect(refreshCalls).toBe(1);
  });

  it('returns stable dry-run JSON payload contract', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/missing' })}\n`,
      'utf8',
    );
    const projectDir = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectDir, { recursive: true });
    await writeFile(join(projectDir, 'plan.md'), '# plan\n', 'utf8');

    const payload = await runCleanupProject({ repoRoot: root, dryRun: true });

    expect(payload.status).toBe('drift');
    expect(payload.mode).toBe('dry-run');
    expect(payload.summary).toEqual({
      scanned: 1,
      issuesFound: 2,
      planned: 2,
      applied: 0,
      skipped: 0,
      blocked: 0,
    });
    expect(payload.actions).toHaveLength(2);
    for (const action of payload.actions) {
      expect(action).toEqual({
        type: expect.any(String),
        target: expect.any(String),
        reason: expect.any(String),
        phase: expect.any(String),
        result: expect.any(String),
      });
    }
  });

  it('returns stable apply JSON payload contract', async () => {
    const root = await createRepoRoot();
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'templates'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'templates', 'state.md'),
      ['---', 'oat_template: true', '---', '', '# {Project Name}'].join('\n'),
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/missing' })}\n`,
      'utf8',
    );
    const projectDir = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectDir, { recursive: true });
    await writeFile(join(projectDir, 'plan.md'), '# plan\n', 'utf8');

    const payload = await runCleanupProject(
      { repoRoot: root, dryRun: false },
      { refreshDashboard: async () => undefined },
    );

    expect(payload.status).toBe('ok');
    expect(payload.mode).toBe('apply');
    expect(payload.summary).toEqual({
      scanned: 1,
      issuesFound: 2,
      planned: 0,
      applied: 3,
      skipped: 0,
      blocked: 0,
    });
    expect(payload.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'clear', result: 'applied' }),
        expect.objectContaining({ type: 'create', result: 'applied' }),
        expect.objectContaining({ type: 'regenerate', result: 'applied' }),
      ]),
    );
  });

  it('sets exit code to 1 when dry-run reports drift', async () => {
    const { command } = createCommandHarness({ status: 'drift' });

    await runProjectCommand(command);

    expect(process.exitCode).toBe(1);
  });

  it('sets exit code to 0 when dry-run reports no drift', async () => {
    const { command } = createCommandHarness({ status: 'ok' });

    await runProjectCommand(command);

    expect(process.exitCode).toBe(0);
  });

  it('includes skipped and blocked counts in text summary output', async () => {
    const { command, capture } = createCommandHarness({ status: 'drift' });

    await runProjectCommand(command);

    expect(capture.info[0]).toContain('skipped=0');
    expect(capture.info[0]).toContain('blocked=0');
  });

  it('handles actionable command errors with exit code 1', async () => {
    const { command, capture } = createCommandHarness({
      runError: new CliError('cleanup command precondition failed', 1),
    });

    await runProjectCommand(command);

    expect(capture.error[0]).toContain('cleanup command precondition failed');
    expect(process.exitCode).toBe(1);
  });

  it('handles unexpected command errors with exit code 2', async () => {
    const { command, capture } = createCommandHarness({
      runError: new Error('unexpected cleanup failure'),
    });

    await runProjectCommand(command, ['--json']);

    expect(capture.jsonPayloads[0]).toEqual(
      expect.objectContaining({
        status: 'error',
        message: 'unexpected cleanup failure',
      }),
    );
    expect(process.exitCode).toBe(2);
  });
});
