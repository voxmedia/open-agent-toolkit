import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { SyncedProjectRecord } from '@commands/project/sync/record';
import type { SyncedTerminalRefProbe } from '@commands/project/sync/resolve-target';
import { CliError } from '@errors/cli-error';
import type { ProjectSummary } from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectListCommand } from './list';

interface HarnessOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  projects?: ProjectSummary[];
  projectsRoot?: string;
  projectMetadata?: Record<
    string,
    { kind: string; phase: string; phaseStatus: string }
  >;
  remoteOutput?: string;
  syncedRecords?: SyncedProjectRecord[];
  terminalProbes?: Record<string, SyncedTerminalRefProbe>;
  resolveError?: Error;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
  listProjects: ReturnType<typeof vi.fn>;
  gitRunner: { run: ReturnType<typeof vi.fn> };
} {
  const capture = createLoggerCapture();
  const listProjects = vi.fn(async (root: string) =>
    root.endsWith('/shared') ? (options.projects ?? []) : [],
  );

  const gitRunner = {
    run: vi.fn(async () => ({
      code: 0,
      stdout: options.remoteOutput ?? '',
      stderr: '',
    })),
  };
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
    resolveProjectRoot: vi.fn(async () => {
      if (options.resolveError) throw options.resolveError;
      return options.cwd;
    }),
    resolveProjectsRoot: vi.fn(
      async () => options.projectsRoot ?? '.oat/projects/shared',
    ),
    listProjects,
    listSyncedRecords: vi.fn(async () => options.syncedRecords ?? []),
    probeSyncedTerminalRefs: vi.fn(async (target) => {
      const probe = options.terminalProbes?.[target.slug];
      if (!probe) throw new Error(`missing terminal probe for ${target.slug}`);
      return probe;
    }),
    directoryExists: vi.fn(async (path: string) => path.endsWith('/shared')),
    readProjectMetadata: vi.fn(async (projectPath: string) => {
      const projectName = projectPath.split('/').at(-1) ?? projectPath;
      return (
        options.projectMetadata?.[projectName] ?? {
          kind: 'implementation',
          phase: 'discovery',
          phaseStatus: 'in_progress',
        }
      );
    }),
    gitRunner,
    processEnv: options.env ?? {},
  });

  return { capture, command, listProjects, gitRunner };
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
    expect(capture.info.join('\n')).toContain('SCOPE');
    expect(capture.info.join('\n')).toContain('shared');
    expect(capture.info.join('\n')).toContain('alpha');
    expect(capture.info.join('\n')).toContain('oat-project-implement');
    expect(process.exitCode).toBe(0);
  });

  it('hides coordination parents in decomposition+complete state by default', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      projects: [
        projectSummary('coordination-parent'),
        projectSummary('child-project'),
      ],
      projectMetadata: {
        'coordination-parent': {
          kind: 'coordination',
          phase: 'decomposition',
          phaseStatus: 'complete',
        },
        'child-project': {
          kind: 'implementation',
          phase: 'plan',
          phaseStatus: 'complete',
        },
      },
    });

    await runCommand(command, []);

    const output = capture.info.join('\n');
    expect(output).not.toContain('coordination-parent');
    expect(output).toContain('child-project');
    expect(process.exitCode).toBe(0);
  });

  it('shows coordination parents when --include-coordination is passed', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      projects: [
        {
          ...projectSummary('coordination-parent'),
          phase: 'decomposition',
          phaseStatus: 'complete',
          recommendation: {
            skill: 'none',
            reason:
              'Coordination decomposition is complete; continue one of the child implementation projects',
          },
        },
      ],
      projectMetadata: {
        'coordination-parent': {
          kind: 'coordination',
          phase: 'decomposition',
          phaseStatus: 'complete',
        },
      },
    });

    await runCommand(command, ['--include-coordination']);

    const output = capture.info.join('\n');
    expect(output).toContain('coordination-parent');
    expect(output).toContain('decomposition (complete)');
    expect(output).toContain('none');
    expect(process.exitCode).toBe(0);
  });

  it('shows coordination parents still in decomposition+in_progress state by default', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      projects: [projectSummary('coordination-parent')],
      projectMetadata: {
        'coordination-parent': {
          kind: 'coordination',
          phase: 'decomposition',
          phaseStatus: 'in_progress',
        },
      },
    });

    await runCommand(command, []);

    expect(capture.info.join('\n')).toContain('coordination-parent');
    expect(process.exitCode).toBe(0);
  });

  it.each([
    { scope: 'shared', queriesRemote: false },
    { scope: 'local', queriesRemote: false },
    { scope: 'synced', queriesRemote: true },
  ] as const)(
    'respects --scope $scope when combined with --remote',
    async ({ scope, queriesRemote }) => {
      const { command, capture, gitRunner } = createHarness({
        cwd: '/repo',
        remoteOutput:
          '1234567890123456789012345678901234567890\trefs/oat/projects/remote-only',
      });

      await runCommand(command, ['--scope', scope, '--remote'], ['--json']);

      expect(gitRunner.run).toHaveBeenCalledTimes(queriesRemote ? 1 : 0);
      const projects = (
        capture.jsonPayloads[0] as { projects: Array<{ scope: string }> }
      ).projects;
      expect(projects.every((row) => row.scope === scope)).toBe(true);
      expect(projects.some((row) => row.scope === 'synced')).toBe(
        scope === 'synced',
      );
      expect(process.exitCode).toBe(0);
    },
  );

  it('warns and preserves local rows when origin is unreachable', async () => {
    const capture = createLoggerCapture();
    const command = createProjectListCommand({
      buildCommandContext: (): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: true,
        cwd: '/repo',
        home: '/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => '/repo',
      resolveProjectsRoot: async () => '.oat/projects/shared',
      listProjects: async () => [projectSummary('local-row')],
      listSyncedRecords: async () => [],
      probeSyncedTerminalRefs: vi.fn(),
      directoryExists: async (path) => path.endsWith('/shared'),
      readProjectMetadata: async () => ({
        kind: 'implementation',
        phase: 'plan',
        phaseStatus: 'complete',
      }),
      gitRunner: {
        run: async () => ({ code: 2, stdout: '', stderr: 'offline' }),
      },
      processEnv: {},
    });
    await runCommand(command, ['--remote']);
    expect(capture.warn[0]).toContain('offline');
    expect(capture.jsonPayloads[0]).toMatchObject({
      projects: [expect.objectContaining({ name: 'local-row' })],
    });
    expect(process.exitCode).toBe(0);
  });

  it('classifies legacy completion without recommending pull', async () => {
    const record = completedRecord('legacy-complete');
    const { command, capture } = createHarness({
      cwd: '/repo',
      syncedRecords: [record],
      terminalProbes: {
        'legacy-complete': terminalProbe('legacy-complete', 'both'),
      },
    });

    await runCommand(command, [], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      projects: [
        {
          kind: 'recorded-terminal',
          name: 'legacy-complete',
          terminalState: 'legacy-completion',
          recommendation: {
            skill: 'none',
            reason: expect.stringContaining('legacy terminal cleanup'),
          },
        },
      ],
    });
  });

  it('distinguishes incomplete archive metadata from retirement cleanup', async () => {
    const record = {
      ...completedRecord('missing-archive'),
      archiveSnapshot: undefined,
      archiveSourceRefSha: undefined,
    };
    const { command, capture } = createHarness({
      cwd: '/repo',
      syncedRecords: [record],
    });

    await runCommand(command, [], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      projects: [
        {
          kind: 'recorded-terminal',
          archiveSnapshot: null,
          recommendation: {
            skill: 'none',
            reason: expect.stringContaining('archive snapshot is incomplete'),
          },
        },
      ],
    });
  });

  it('surfaces differing terminal ref SHAs as invalid recovery', async () => {
    const record = completedRecord('mismatch');
    const probe = terminalProbe('mismatch', 'wrong-sha');
    probe.completedSha = 'b'.repeat(40);
    const { command, capture } = createHarness({
      cwd: '/repo',
      syncedRecords: [record],
      terminalProbes: { mismatch: probe },
    });

    await runCommand(command, [], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      projects: [
        {
          kind: 'terminal-invalid',
          terminalState: 'ref-sha-mismatch',
          activeSha: 'a'.repeat(40),
          completedSha: 'b'.repeat(40),
          recommendation: {
            skill: 'none',
            reason: expect.stringContaining('repair the ref mismatch'),
          },
        },
      ],
    });
  });

  it('omits completed-only and matching aliases from remote discovery', async () => {
    const sameSha = 'a'.repeat(40);
    const otherSha = 'b'.repeat(40);
    const { command, capture } = createHarness({
      cwd: '/repo',
      remoteOutput: [
        `${sameSha}\trefs/oat/projects/matching`,
        `${sameSha}\trefs/oat/completed/matching`,
        `${sameSha}\trefs/oat/completed/completed-only`,
        `${sameSha}\trefs/oat/projects/active-only`,
        `${sameSha}\trefs/oat/projects/mismatch`,
        `${otherSha}\trefs/oat/completed/mismatch`,
      ].join('\n'),
    });

    await runCommand(command, ['--remote'], ['--json']);

    const projects = (
      capture.jsonPayloads[0] as {
        projects: Array<{ name: string; kind: string }>;
      }
    ).projects;
    expect(projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'active-only', kind: 'remote' }),
        expect.objectContaining({ name: 'mismatch', kind: 'terminal-invalid' }),
      ]),
    );
    expect(projects.map((row) => row.name)).not.toContain('matching');
    expect(projects.map((row) => row.name)).not.toContain('completed-only');
  });

  it.each([
    {
      name: 'preserves an actionable CliError exit code',
      error: new CliError('invalid project scope state', 1),
      expectedExitCode: 1,
    },
    {
      name: 'classifies an unknown exception as a system error',
      error: new Error('filesystem unavailable'),
      expectedExitCode: 2,
    },
  ])('$name', async ({ error, expectedExitCode }) => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      resolveError: error,
    });

    await runCommand(command, [], ['--json']);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'error',
      message: error.message,
    });
    expect(process.exitCode).toBe(expectedExitCode);
  });
});

function projectSummary(name: string): ProjectSummary {
  return {
    name,
    path: `.oat/projects/shared/${name}`,
    phase: 'discovery',
    phaseStatus: 'in_progress',
    workflowMode: 'quick',
    lifecycle: 'active',
    progress: { completed: 0, total: 0 },
    recommendation: {
      skill: 'oat-project-progress',
      reason: 'Check current progress.',
    },
  };
}

function completedRecord(slug: string): SyncedProjectRecord {
  return {
    schemaVersion: 1,
    slug,
    scope: 'synced',
    ref: `refs/oat/projects/${slug}`,
    remote: 'origin',
    status: 'complete',
    createdAt: '2026-08-30T00:00:00.000Z',
    completedAt: '2026-08-31T00:00:00.000Z',
    archiveSnapshot: slug,
    archiveSourceRefSha: 'a'.repeat(40),
  };
}

function terminalProbe(
  slug: string,
  state: SyncedTerminalRefProbe['state'],
): SyncedTerminalRefProbe {
  const sha = 'a'.repeat(40);
  return {
    state,
    activeRef: `refs/oat/projects/${slug}`,
    completedRef: `refs/oat/completed/${slug}`,
    expectedSha: sha,
    activeSha: state === 'completed-only' ? null : sha,
    completedSha: state === 'active-only' || state === 'absent' ? null : sha,
  };
}
