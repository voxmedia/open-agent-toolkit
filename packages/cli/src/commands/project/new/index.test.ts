import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { CliError } from '@errors/cli-error';
import { WORKFLOW_MODES } from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectNewCommand } from './index';

type CommitScaffoldStatus =
  | 'committed'
  | 'skipped_disabled'
  | 'skipped_no_worktree'
  | 'skipped_nothing'
  | 'failed';

interface HarnessOptions {
  result?: {
    mode: 'spec-driven' | 'quick' | 'import' | 'lite';
    scope?: 'shared' | 'local' | 'synced';
    ref?: string;
    sha?: string;
    projectPath: string;
    projectsRoot: string;
    createdFiles: string[];
    skippedFiles: string[];
    activePointerUpdated: boolean;
    dashboardRefreshed: boolean;
    committed: boolean;
    commitSha?: string;
    commitStatus: CommitScaffoldStatus;
    commitError?: string;
  };
  throwError?: 'actionable' | 'system';
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  scaffoldProject: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const scaffoldProject = vi.fn(async () => {
    if (options.throwError) {
      throw options.throwError === 'actionable'
        ? new CliError('invalid project name', 1)
        : new Error('filesystem unavailable');
    }
    return (
      options.result ?? {
        mode: 'spec-driven',
        scope: 'shared',
        projectPath: '.oat/projects/shared/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: ['state.md'],
        skippedFiles: [],
        activePointerUpdated: true,
        dashboardRefreshed: true,
        committed: false,
        commitStatus: 'skipped_disabled',
      }
    );
  });

  const command = createProjectNewCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: '/tmp/workspace',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    scaffoldProject,
  });

  return { capture, command, scaffoldProject };
}

async function runCommand(
  command: Command,
  args: string[] = [],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();

  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync([...globalArgs, 'project', 'new', ...args], {
    from: 'user',
  });
}

describe('createProjectNewCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('forwards flags and mode to scaffold core', async () => {
    const { command, scaffoldProject } = createHarness();

    await runCommand(command, [
      'demo',
      '--mode',
      'quick',
      '--force',
      '--no-set-active',
      '--no-dashboard',
      '--with-project-log',
      '--scope',
      'local',
    ]);

    expect(scaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({
        repoRoot: '/tmp/workspace',
        projectName: 'demo',
        mode: 'quick',
        force: true,
        setActive: false,
        refreshDashboard: false,
        commit: true,
        projectLog: true,
        scope: 'local',
      }),
    );
  });

  it('forwards lite mode and derives choices from WORKFLOW_MODES', async () => {
    const { command, scaffoldProject } = createHarness();

    await runCommand(command, ['demo', '--mode', 'lite']);

    expect(scaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'lite' }),
    );
    expect(
      command.options.find((option) => option.long === '--mode')?.argChoices,
    ).toEqual(WORKFLOW_MODES);
  });

  it('forwards an omitted scope as undefined for scaffold defaulting', async () => {
    const { command, scaffoldProject } = createHarness();

    await runCommand(command, ['demo']);

    expect(scaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({ scope: undefined }),
    );
  });

  it('forwards projectLog: false when --no-project-log is passed', async () => {
    const { command, scaffoldProject } = createHarness();

    await runCommand(command, ['demo', '--no-project-log']);

    expect(scaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: 'demo',
        projectLog: false,
      }),
    );
  });

  it('documents both project-log scaffold overrides in help', () => {
    const { command } = createHarness();

    const help = command.helpInformation();

    expect(help).toContain('--with-project-log');
    expect(help).toContain('--no-project-log');
  });

  it('forwards commit: false when --no-commit is passed', async () => {
    const { command, scaffoldProject } = createHarness();

    await runCommand(command, ['demo', '--no-commit']);

    expect(scaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: 'demo',
        commit: false,
      }),
    );
  });

  it('prints success output for text mode', async () => {
    const { command, capture } = createHarness({
      result: {
        mode: 'spec-driven',
        scope: 'shared',
        projectPath: '.oat/projects/shared/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: ['state.md'],
        skippedFiles: [],
        activePointerUpdated: true,
        dashboardRefreshed: true,
        committed: true,
        commitSha: 'abcdef1234567890',
        commitStatus: 'committed',
      },
    });

    await runCommand(command, ['demo']);

    expect(capture.info[0]).toContain('Created/updated OAT project: demo');
    expect(capture.info[1]).toContain(
      'Project path: .oat/projects/shared/demo',
    );
    expect(capture.info[2]).toBe('Scope: shared');
    expect(capture.info[3]).toContain(
      'Active project updated in local config: .oat/config.local.json',
    );
    expect(capture.info[4]).toContain('Scaffold commit: abcdef1');
    expect(process.exitCode).toBe(0);
  });

  it('reports skipped commit when --no-commit is passed', async () => {
    const { command, capture } = createHarness({
      result: {
        mode: 'spec-driven',
        projectPath: '.oat/projects/shared/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: ['state.md'],
        skippedFiles: [],
        activePointerUpdated: true,
        dashboardRefreshed: true,
        committed: false,
        commitStatus: 'skipped_disabled',
      },
    });

    await runCommand(command, ['demo', '--no-commit']);

    expect(
      capture.info.some((line) =>
        line.includes('Scaffold commit: skipped (--no-commit)'),
      ),
    ).toBe(true);
    expect(process.exitCode).toBe(0);
  });

  it('reports a distinct message when the work tree is missing', async () => {
    const { command, capture } = createHarness({
      result: {
        mode: 'quick',
        projectPath: '.oat/projects/shared/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: ['state.md'],
        skippedFiles: [],
        activePointerUpdated: true,
        dashboardRefreshed: true,
        committed: false,
        commitStatus: 'skipped_no_worktree',
      },
    });

    await runCommand(command, ['demo']);

    expect(
      capture.info.some((line) =>
        line.includes('Scaffold commit: skipped (not a git work tree)'),
      ),
    ).toBe(true);
    expect(process.exitCode).toBe(0);
  });

  it('reports a distinct message when there is nothing to commit', async () => {
    const { command, capture } = createHarness({
      result: {
        mode: 'quick',
        projectPath: '.oat/projects/shared/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: [],
        skippedFiles: ['state.md'],
        activePointerUpdated: true,
        dashboardRefreshed: true,
        committed: false,
        commitStatus: 'skipped_nothing',
      },
    });

    await runCommand(command, ['demo']);

    expect(
      capture.info.some((line) =>
        line.includes('Scaffold commit: skipped (nothing to commit)'),
      ),
    ).toBe(true);
    expect(process.exitCode).toBe(0);
  });

  it('warns on commit failure without changing the exit code', async () => {
    const { command, capture } = createHarness({
      result: {
        mode: 'quick',
        projectPath: '.oat/projects/shared/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: ['state.md'],
        skippedFiles: [],
        activePointerUpdated: true,
        dashboardRefreshed: true,
        committed: false,
        commitStatus: 'failed',
        commitError: 'fatal: empty ident name not allowed',
      },
    });

    await runCommand(command, ['demo']);

    expect(
      capture.warn.some(
        (line) =>
          line.includes('scaffold commit failed') &&
          line.includes('fatal: empty ident name not allowed') &&
          line.includes('NOT committed'),
      ),
    ).toBe(true);
    // The scaffold succeeded, so a commit failure must not fail the command.
    expect(process.exitCode).toBe(0);
  });

  it('prints json payload for --json mode', async () => {
    const { command, capture } = createHarness({
      result: {
        mode: 'import',
        scope: 'synced',
        ref: 'refs/oat/projects/demo',
        sha: '1234567890123456789012345678901234567890',
        projectPath: '.oat/projects/shared/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: ['state.md'],
        skippedFiles: ['plan.md'],
        activePointerUpdated: false,
        dashboardRefreshed: false,
        committed: false,
        commitStatus: 'skipped_no_worktree',
      },
    });

    await runCommand(command, ['demo', '--mode', 'import'], ['--json']);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'ok',
      projectName: 'demo',
      mode: 'import',
      scope: 'synced',
      ref: 'refs/oat/projects/demo',
      sha: '1234567890123456789012345678901234567890',
      projectPath: '.oat/projects/shared/demo',
      projectsRoot: '.oat/projects/shared',
      createdFiles: ['state.md'],
      skippedFiles: ['plan.md'],
      activePointerUpdated: false,
      dashboardRefreshed: false,
      committed: false,
      scaffoldCommit: undefined,
      commitSha: undefined,
      commitStatus: 'skipped_no_worktree',
      commitError: undefined,
    });
    expect(process.exitCode).toBe(0);
  });

  it('prints synced scope and ref in human output', async () => {
    const { command, capture } = createHarness({
      result: {
        mode: 'quick',
        scope: 'synced',
        ref: 'refs/oat/projects/demo',
        sha: '1234567890123456789012345678901234567890',
        projectPath: '.oat/projects/synced/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: ['state.md'],
        skippedFiles: [],
        activePointerUpdated: true,
        dashboardRefreshed: true,
        committed: true,
        commitSha: 'abcdef1234567890',
        commitStatus: 'committed',
      },
    });

    await runCommand(command, ['demo', '--scope', 'synced']);

    expect(capture.info).toContain('Scope: synced');
    expect(capture.info).toContain('Ref: refs/oat/projects/demo');
  });

  it('includes commitStatus and commitError in json on commit failure', async () => {
    const { command, capture } = createHarness({
      result: {
        mode: 'quick',
        projectPath: '.oat/projects/shared/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: ['state.md'],
        skippedFiles: [],
        activePointerUpdated: true,
        dashboardRefreshed: true,
        committed: false,
        commitStatus: 'failed',
        commitError: 'fatal: empty ident name not allowed',
      },
    });

    await runCommand(command, ['demo'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      committed: false,
      commitStatus: 'failed',
      commitError: 'fatal: empty ident name not allowed',
    });
    expect(process.exitCode).toBe(0);
  });

  it('returns exit code 1 for scaffolding errors', async () => {
    const { command, capture } = createHarness({ throwError: 'actionable' });

    await runCommand(command, ['demo']);

    expect(capture.error[0]).toContain('invalid project name');
    expect(process.exitCode).toBe(1);
  });

  it('classifies unknown scaffold exceptions as system errors', async () => {
    const { command, capture } = createHarness({ throwError: 'system' });

    await runCommand(command, ['demo'], ['--json']);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'error',
      message: 'filesystem unavailable',
    });
    expect(process.exitCode).toBe(2);
  });

  it('shows help instead of scaffolding when name starts with a dash', async () => {
    const { command, scaffoldProject } = createHarness();

    await expect(runCommand(command, ['--help'])).rejects.toThrow(
      /process\.exit/i,
    );

    expect(scaffoldProject).not.toHaveBeenCalled();
  });
});
