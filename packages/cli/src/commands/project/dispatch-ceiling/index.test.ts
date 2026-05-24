import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { resolveEffectiveConfig } from '@config/resolve';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectDispatchCeilingCommand } from './index';

interface HarnessOptions {
  cwd: string;
  home: string;
  activeProjectPath?: string | null;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const activeProjectPath =
    options.activeProjectPath ?? '.oat/projects/shared/demo';

  const command = createProjectDispatchCeilingCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd,
      home: options.home,
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => options.cwd),
    resolveEffectiveConfig,
    resolveActiveProject: vi.fn(async () => ({
      name: activeProjectPath ? 'demo' : null,
      path: activeProjectPath,
      status: activeProjectPath ? 'active' : 'unset',
    })),
    processEnv: {},
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

  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);

  await program.parseAsync(
    [...globalArgs, 'project', 'dispatch-ceiling', 'resolve', ...commandArgs],
    { from: 'user' },
  );
}

async function createRepo(): Promise<{ root: string; home: string }> {
  const root = await mkdtemp(join(tmpdir(), 'oat-dispatch-ceiling-'));
  const home = await mkdtemp(join(tmpdir(), 'oat-dispatch-ceiling-home-'));
  await mkdir(join(root, '.oat', 'projects', 'shared', 'demo'), {
    recursive: true,
  });
  await writeFile(
    join(root, '.oat', 'config.local.json'),
    `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
    'utf8',
  );
  await writeFile(
    join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
    '---\noat_phase: implement\noat_phase_status: in_progress\n---\n\n# State\n',
    'utf8',
  );
  return { root, home };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

describe('oat project dispatch-ceiling resolve', () => {
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

  async function setup(): Promise<{ root: string; home: string }> {
    const repo = await createRepo();
    tempDirs.push(repo.root, repo.home);
    return repo;
  }

  it('resolves repo config before project state', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: { dispatchCeiling: { codex: 'high' } },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_ceiling:',
        '  provider: codex',
        '  value: xhigh',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      value: 'high',
      source: 'repo-config',
      unresolved: false,
      providerDefaultEffort: 'unknown',
    });
    expect(process.exitCode).toBe(0);
  });

  it('falls back to project-state frontmatter and reports Codex provider default', async () => {
    const { root, home } = await setup();
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(
      join(home, '.codex', 'config.toml'),
      'model_reasoning_effort = "high"\n',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_ceiling:',
        '  provider: codex',
        '  value: xhigh',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      value: 'xhigh',
      source: 'project-state',
      unresolved: false,
      providerDefaultEffort: 'high',
    });
    expect(process.exitCode).toBe(0);
  });

  it('blocks unresolved non-interactive preflight', async () => {
    const { root, home } = await setup();

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--preflight',
      '--non-interactive',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      provider: 'codex',
      value: null,
      source: null,
      unresolved: true,
    });
    expect((capture.jsonPayloads[0] as { message?: string }).message).toContain(
      'BLOCKED: Codex dispatch ceiling is unresolved',
    );
    expect(process.exitCode).toBe(1);
  });

  it('prints human-readable Claude resolution', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: { dispatchCeiling: { claude: 'sonnet' } },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'claude']);

    expect(capture.info).toContain('Claude dispatch ceiling: sonnet');
    expect(capture.info).toContain('Source: repo config');
    expect(capture.info).toContain('Effort axis: not-applicable');
    expect(process.exitCode).toBe(0);
  });

  it('rejects invalid providers', async () => {
    const { root, home } = await setup();

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'gemini', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: 'Invalid provider. Expected one of: codex, claude.',
    });
    expect(process.exitCode).toBe(1);
  });

  it('supports explicit project paths without active project lookup', async () => {
    const { root, home } = await setup();
    const explicitProject = join(
      root,
      '.oat',
      'projects',
      'shared',
      'explicit',
    );
    await mkdir(explicitProject, { recursive: true });
    await writeFile(
      join(explicitProject, 'state.md'),
      [
        '---',
        'oat_dispatch_ceiling:',
        '  provider: codex',
        '  value: medium',
        '  source: project-state',
        '---',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({
      cwd: root,
      home,
      activeProjectPath: null,
    });
    await runCommand(command, [
      '--provider',
      'codex',
      '--project-path',
      '.oat/projects/shared/explicit',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      value: 'medium',
      source: 'project-state',
      projectPath: explicitProject,
    });
    expect(process.exitCode).toBe(0);
  });

  it('leaves project state unmodified when only resolving', async () => {
    const { root, home } = await setup();
    const statePath = join(
      root,
      '.oat',
      'projects',
      'shared',
      'demo',
      'state.md',
    );
    const before = await readFile(statePath, 'utf8');

    const { command } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    await expect(readFile(statePath, 'utf8')).resolves.toBe(before);
  });
});
