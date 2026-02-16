import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectNewCommand } from './index';

interface HarnessOptions {
  result?: {
    mode: 'full' | 'quick' | 'import';
    projectPath: string;
    projectsRoot: string;
    createdFiles: string[];
    skippedFiles: string[];
    activePointerUpdated: boolean;
    dashboardRefreshed: boolean;
  };
  throwError?: boolean;
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  scaffoldProject: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const scaffoldProject = vi.fn(async () => {
    if (options.throwError) {
      throw new Error('invalid project name');
    }
    return (
      options.result ?? {
        mode: 'full',
        projectPath: '.oat/projects/shared/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: ['state.md'],
        skippedFiles: [],
        activePointerUpdated: true,
        dashboardRefreshed: true,
      }
    );
  });

  const command = createProjectNewCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      apply: false,
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
    .option('--scope <scope>')
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
    ]);

    expect(scaffoldProject).toHaveBeenCalledWith(
      expect.objectContaining({
        repoRoot: '/tmp/workspace',
        projectName: 'demo',
        mode: 'quick',
        force: true,
        setActive: false,
        refreshDashboard: false,
      }),
    );
  });

  it('prints success output for text mode', async () => {
    const { command, capture } = createHarness({
      result: {
        mode: 'full',
        projectPath: '.oat/projects/shared/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: ['state.md'],
        skippedFiles: [],
        activePointerUpdated: true,
        dashboardRefreshed: true,
      },
    });

    await runCommand(command, ['demo']);

    expect(capture.info[0]).toContain('Created/updated OAT project: demo');
    expect(capture.info[1]).toContain(
      'Project path: .oat/projects/shared/demo',
    );
    expect(capture.info[2]).toContain(
      'Active project pointer updated: .oat/active-project',
    );
    expect(process.exitCode).toBe(0);
  });

  it('prints json payload for --json mode', async () => {
    const { command, capture } = createHarness({
      result: {
        mode: 'import',
        projectPath: '.oat/projects/shared/demo',
        projectsRoot: '.oat/projects/shared',
        createdFiles: ['state.md'],
        skippedFiles: ['plan.md'],
        activePointerUpdated: false,
        dashboardRefreshed: false,
      },
    });

    await runCommand(command, ['demo', '--mode', 'import'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      projectName: 'demo',
      mode: 'import',
      projectPath: '.oat/projects/shared/demo',
      activePointerUpdated: false,
      dashboardRefreshed: false,
    });
    expect(process.exitCode).toBe(0);
  });

  it('returns exit code 1 for scaffolding errors', async () => {
    const { command, capture } = createHarness({ throwError: true });

    await runCommand(command, ['demo']);

    expect(capture.error[0]).toContain('invalid project name');
    expect(process.exitCode).toBe(1);
  });
});
