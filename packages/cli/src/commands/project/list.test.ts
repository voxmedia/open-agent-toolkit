import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { ProjectSummary } from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectListCommand } from './list';

interface HarnessOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  projects?: ProjectSummary[];
  projectsRoot?: string;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
  listProjects: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const listProjects = vi.fn(async () => options.projects ?? []);

  const command = createProjectListCommand({
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
    resolveProjectsRoot: vi.fn(
      async () => options.projectsRoot ?? '.oat/projects/shared',
    ),
    listProjects,
    processEnv: options.env ?? {},
  });

  return { capture, command, listProjects };
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

  await program.parseAsync([...globalArgs, 'project', 'list', ...commandArgs], {
    from: 'user',
  });
}

describe('oat project list', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('outputs project summaries as json', async () => {
    const cwd = '/repo';
    const projects: ProjectSummary[] = [
      {
        name: 'alpha',
        path: '.oat/projects/shared/alpha',
        phase: 'plan',
        phaseStatus: 'complete',
        workflowMode: 'quick',
        lifecycle: 'active',
        progress: { completed: 3, total: 3 },
        recommendation: {
          skill: 'oat-project-implement',
          reason: 'Ready to implement.',
        },
      },
      {
        name: 'beta',
        path: '.oat/projects/shared/beta',
        phase: 'implement',
        phaseStatus: 'in_progress',
        workflowMode: 'quick',
        lifecycle: 'active',
        progress: { completed: 2, total: 5 },
        recommendation: {
          skill: 'oat-project-implement',
          reason: 'Continue implementation.',
        },
      },
    ];
    const { command, capture, listProjects } = createHarness({
      cwd,
      projects,
    });

    await runCommand(command, [], ['--json']);

    expect(listProjects).toHaveBeenCalledWith(
      join(cwd, '.oat/projects/shared'),
    );
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      projects,
    });
    expect(process.exitCode).toBe(0);
  });

  it('outputs an empty array when no projects are found', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      projects: [],
    });

    await runCommand(command, [], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      projects: [],
    });
    expect(process.exitCode).toBe(0);
  });

  it('prints a text table without json mode', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      projects: [
        {
          name: 'alpha',
          path: '.oat/projects/shared/alpha',
          phase: 'plan',
          phaseStatus: 'complete',
          workflowMode: 'quick',
          lifecycle: 'active',
          progress: { completed: 3, total: 3 },
          recommendation: {
            skill: 'oat-project-implement',
            reason: 'Ready to implement.',
          },
        },
      ],
    });

    await runCommand(command, []);

    expect(capture.info.join('\n')).toContain('NAME');
    expect(capture.info.join('\n')).toContain('alpha');
    expect(capture.info.join('\n')).toContain('oat-project-implement');
    expect(process.exitCode).toBe(0);
  });
});
