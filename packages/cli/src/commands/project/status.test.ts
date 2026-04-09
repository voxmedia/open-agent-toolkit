import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { ProjectState } from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectStatusCommand } from './status';

interface HarnessOptions {
  cwd: string;
  activeProjectStatus?: 'active' | 'missing' | 'unset';
  activeProjectPath?: string | null;
  projectState?: ProjectState;
}

function makeProjectState(path: string): ProjectState {
  return {
    name: 'demo',
    path,
    phase: 'implement',
    phaseStatus: 'in_progress',
    workflowMode: 'quick',
    executionMode: 'single-thread',
    lifecycle: 'active',
    pauseTimestamp: null,
    pauseReason: null,
    progress: {
      total: 12,
      completed: 8,
      currentTaskId: 'p04-t02',
      phases: [],
    },
    artifacts: [],
    reviews: [],
    blockers: [],
    hillCheckpoints: [],
    hillCompleted: [],
    prStatus: null,
    prUrl: null,
    docsUpdated: null,
    lastCommit: 'cf14af3',
    timestamps: {
      created: '2026-04-08T17:16:52.421Z',
      completed: null,
      stateUpdated: '2026-04-09T22:32:12Z',
    },
    recommendation: {
      skill: 'oat-project-implement',
      reason: 'Continue executing the current implementation plan.',
    },
  };
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
  getProjectState: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const activeProjectPath =
    options.activeProjectPath ?? '.oat/projects/shared/demo';
  const projectState =
    options.projectState ?? makeProjectState(activeProjectPath);
  const getProjectState = vi.fn(async () => projectState);

  const command = createProjectStatusCommand({
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
    resolveActiveProject: vi.fn(async () => ({
      name:
        activeProjectPath && options.activeProjectStatus !== 'unset'
          ? 'demo'
          : null,
      path: options.activeProjectStatus === 'unset' ? null : activeProjectPath,
      status: options.activeProjectStatus ?? 'active',
    })),
    getProjectState,
  });

  return { capture, command, getProjectState };
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
    [...globalArgs, 'project', 'status', ...commandArgs],
    {
      from: 'user',
    },
  );
}

describe('oat project status', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('outputs full project state as json for the active project', async () => {
    const cwd = '/repo';
    const projectPath = '.oat/projects/shared/demo';
    const { command, capture, getProjectState } = createHarness({
      cwd,
      activeProjectPath: projectPath,
    });

    await runCommand(command, [], ['--json']);

    expect(getProjectState).toHaveBeenCalledWith(join(cwd, projectPath));
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      project: {
        name: 'demo',
        path: projectPath,
        recommendation: {
          skill: 'oat-project-implement',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports unset status when no active project is configured', async () => {
    const { command, capture, getProjectState } = createHarness({
      cwd: '/repo',
      activeProjectStatus: 'unset',
    });

    await runCommand(command, [], ['--json']);

    expect(getProjectState).not.toHaveBeenCalled();
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'unset',
    });
    expect(process.exitCode).toBe(1);
  });

  it('prints a text summary without json mode', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      activeProjectPath: '.oat/projects/shared/demo',
    });

    await runCommand(command, []);

    expect(capture.info.join('\n')).toContain('Phase: implement (in_progress)');
    expect(capture.info.join('\n')).toContain('Progress: 8/12');
    expect(capture.info.join('\n')).toContain(
      'Recommendation: oat-project-implement',
    );
    expect(process.exitCode).toBe(0);
  });
});
