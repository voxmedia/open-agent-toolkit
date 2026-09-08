import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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

// Fields migrated skills read via jq. Any removal or rename must be a
// deliberate breaking change, not an accident.
const MIGRATED_FIELDS = [
  'project.name',
  'project.path',
  'project.phase',
  'project.phaseStatus',
  'project.workflowMode',
  'project.docsUpdated',
  'project.lastCommit',
  'project.prStatus',
  'project.prUrl',
] as const;

function hasPath(payload: unknown, path: string): boolean {
  const parts = path.split('.');
  let cursor: unknown = payload;
  for (const part of parts) {
    if (cursor === null || typeof cursor !== 'object') {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(cursor, part)) {
      return false;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return true;
}

interface HarnessOptions {
  cwd: string;
  activeProjectStatus?: 'active' | 'missing' | 'unset';
  activeProjectPath?: string | null;
  projectState?: ProjectState;
  resolveProjectRoot?: () => Promise<string>;
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
    activeReviewArtifacts: [],
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
  resolveActiveProject: ReturnType<typeof vi.fn>;
  resolveProjectRoot: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const activeProjectPath =
    options.activeProjectPath ?? '.oat/projects/shared/demo';
  const projectState =
    options.projectState ?? makeProjectState(activeProjectPath);
  const getProjectState = vi.fn(async () => projectState);
  const resolveActiveProject = vi.fn(async () => ({
    name:
      activeProjectPath && options.activeProjectStatus !== 'unset'
        ? 'demo'
        : null,
    path: options.activeProjectStatus === 'unset' ? null : activeProjectPath,
    status: options.activeProjectStatus ?? 'active',
  }));
  const resolveProjectRoot = vi.fn(
    options.resolveProjectRoot ?? (async () => options.cwd),
  );

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
    resolveProjectRoot,
    resolveActiveProject,
    getProjectState,
  });

  return {
    capture,
    command,
    getProjectState,
    resolveActiveProject,
    resolveProjectRoot,
  };
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

  it('prints completed decomposition coordination status as inert', async () => {
    const projectPath = '.oat/projects/shared/platform-split';
    const projectState = makeProjectState(projectPath);
    projectState.name = 'platform-split';
    projectState.phase = 'decomposition';
    projectState.phaseStatus = 'complete';
    projectState.recommendation = {
      skill: 'none',
      reason:
        'Coordination decomposition is complete; continue one of the child implementation projects',
    };
    const { command, capture } = createHarness({
      cwd: '/repo',
      activeProjectPath: projectPath,
      projectState,
    });

    await runCommand(command, []);

    const output = capture.info.join('\n');
    expect(output).toContain('Phase: decomposition (complete)');
    expect(output).toContain('Recommendation: none');
    expect(output).toContain(
      'continue one of the child implementation projects',
    );
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

  it('prints a scalar field by arbitrary dot path', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      activeProjectPath: '.oat/projects/shared/demo',
    });

    await runCommand(command, ['--field', 'project.workflowMode']);

    expect(capture.info).toEqual(['quick']);
    expect(process.exitCode).toBe(0);
  });

  it('prints a field from an explicit relative project path without active-project lookup', async () => {
    const cwd = '/repo';
    const projectPath = '.oat/projects/shared/other';
    const { command, capture, getProjectState, resolveActiveProject } =
      createHarness({
        cwd,
        activeProjectStatus: 'unset',
        projectState: makeProjectState(projectPath),
      });

    await runCommand(command, [
      '--project-path',
      projectPath,
      '--field',
      'project.path',
    ]);

    expect(resolveActiveProject).not.toHaveBeenCalled();
    expect(getProjectState).toHaveBeenCalledWith(join(cwd, projectPath));
    expect(capture.info).toEqual([projectPath]);
    expect(process.exitCode).toBe(0);
  });

  it('prints shell assignments from an explicit absolute project path', async () => {
    const projectPath = '/other-worktree/.oat/projects/shared/demo';
    const { command, capture, getProjectState, resolveActiveProject } =
      createHarness({
        cwd: '/repo',
        activeProjectPath: '.oat/projects/shared/active',
        projectState: makeProjectState(projectPath),
      });

    await runCommand(command, [
      '--project-path',
      projectPath,
      '--shell',
      'WORKFLOW_MODE=project.workflowMode',
    ]);

    expect(resolveActiveProject).not.toHaveBeenCalled();
    expect(getProjectState).toHaveBeenCalledWith(projectPath);
    expect(capture.info).toEqual(["WORKFLOW_MODE='quick'"]);
    expect(process.exitCode).toBe(0);
  });

  it('reads an absolute --project-path from a cwd outside any git checkout', async () => {
    const projectPath = '/other-worktree/.oat/projects/shared/demo';
    const {
      command,
      capture,
      getProjectState,
      resolveActiveProject,
      resolveProjectRoot,
    } = createHarness({
      cwd: tmpdir(),
      activeProjectPath: '.oat/projects/shared/active',
      projectState: makeProjectState(projectPath),
      resolveProjectRoot: async () => {
        throw new Error('not inside a git checkout');
      },
    });

    await runCommand(command, [
      '--project-path',
      projectPath,
      '--field',
      'project.path',
    ]);

    expect(resolveProjectRoot).not.toHaveBeenCalled();
    expect(resolveActiveProject).not.toHaveBeenCalled();
    expect(getProjectState).toHaveBeenCalledWith(projectPath);
    expect(capture.info).toEqual([projectPath]);
    expect(process.exitCode).toBe(0);
  });

  it('prints a nested field by arbitrary dot path', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      activeProjectPath: '.oat/projects/shared/demo',
    });

    await runCommand(command, ['--field', 'project.timestamps.stateUpdated']);

    expect(capture.info).toEqual(['2026-04-09T22:32:12Z']);
    expect(process.exitCode).toBe(0);
  });

  it('prints null for null or missing fields', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      activeProjectPath: '.oat/projects/shared/demo',
    });

    await runCommand(command, ['--field', 'project.prUrl']);
    await runCommand(command, ['--field', 'project.doesNotExist']);

    expect(capture.info).toEqual(['null', 'null']);
    expect(process.exitCode).toBe(0);
  });

  it('prints object fields as compact json', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      activeProjectPath: '.oat/projects/shared/demo',
    });

    await runCommand(command, ['--field', 'project.recommendation']);

    expect(capture.info).toEqual([
      '{"skill":"oat-project-implement","reason":"Continue executing the current implementation plan."}',
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('prints shell-safe assignments from one project status read', async () => {
    const projectState = makeProjectState('.oat/projects/shared/demo');
    projectState.recommendation.reason = "Don't hand-parse state";
    const { command, capture, getProjectState } = createHarness({
      cwd: '/repo',
      activeProjectPath: '.oat/projects/shared/demo',
      projectState,
    });

    await runCommand(command, [
      '--shell',
      'WORKFLOW_MODE=project.workflowMode',
      'PR_URL=project.prUrl',
      'REASON=project.recommendation.reason',
    ]);

    expect(getProjectState).toHaveBeenCalledTimes(1);
    expect(capture.info).toEqual([
      "WORKFLOW_MODE='quick'",
      "PR_URL='null'",
      "REASON='Don'\\''t hand-parse state'",
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('rejects invalid shell assignment variable names', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      activeProjectPath: '.oat/projects/shared/demo',
    });

    await runCommand(command, ['--shell', 'bad-name=project.workflowMode']);

    expect(capture.error[0]).toContain('Invalid shell assignment');
    expect(process.exitCode).toBe(1);
  });

  it('rejects combining --field and --shell', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      activeProjectPath: '.oat/projects/shared/demo',
    });

    await runCommand(command, [
      '--field',
      'project.workflowMode',
      '--shell',
      'WORKFLOW_MODE=project.workflowMode',
    ]);

    expect(capture.info).toEqual([]);
    expect(capture.error[0]).toContain('--field');
    expect(capture.error[0]).toContain('--shell');
    expect(capture.error[0]).toContain('mutually exclusive');
    expect(process.exitCode).toBe(1);
  });

  it('emits every JSON field migrated skills depend on when status is ok', async () => {
    const cwd = '/repo';
    const projectPath = '.oat/projects/shared/demo';
    const { command, capture } = createHarness({
      cwd,
      activeProjectPath: projectPath,
    });

    await runCommand(command, [], ['--json']);

    const payload = capture.jsonPayloads[0];
    expect(payload).toMatchObject({ status: 'ok' });

    for (const path of MIGRATED_FIELDS) {
      expect(
        hasPath(payload, path),
        `expected JSON payload to expose "${path}" (value may be null)`,
      ).toBe(true);
    }
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

// Public controls for the quick-plan readiness route. These run the real
// control-plane reader and recommender through the real command against real
// files, because the defect they pin was invisible to a stubbed
// `getProjectState`: `oat project status` recommended implementation for a
// plan that all four lifecycle skills reject.
describe('oat project status quick plan readiness route', () => {
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

  const QUICK_STATE = `---
oat_project_name: demo
oat_workflow_mode: quick
oat_phase: plan
oat_phase_status: complete
oat_lifecycle: active
oat_current_task: null
oat_project_created: "2026-09-07T00:00:00Z"
oat_project_state_updated: "2026-09-07T00:00:00Z"
---

# Project State: demo
`;

  const READY_FRONTMATTER = `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_phase_status: complete
oat_template: false
---
`;

  const SUBSTANTIVE_PHASE = `
## Phase 1: Foundation

### Task p01-t01: Add the readiness predicate

**Status:** pending
`;

  const RECORDED_DISPOSITION = `
## Reviews

| Scope | Type     | Status | Date       | Artifact |
| ----- | -------- | ------ | ---------- | -------- |
| plan  | artifact | passed | 2026-09-07 | -        |
`;

  const PENDING_DISPOSITION = `
## Reviews

| Scope | Type     | Status  | Date | Artifact |
| ----- | -------- | ------- | ---- | -------- |
| plan  | artifact | pending | -    | -        |
`;

  async function createProject(
    plan: string,
    state: string = QUICK_STATE,
  ): Promise<string> {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-status-quick-'));
    tempDirs.push(projectPath);
    await writeFile(join(projectPath, 'state.md'), state, 'utf8');
    await writeFile(join(projectPath, 'plan.md'), plan, 'utf8');
    return projectPath;
  }

  /**
   * The real command with the real `getProjectState`; only the logger is
   * captured.
   */
  function createRealHarness(cwd: string): {
    capture: LoggerCapture;
    command: Command;
  } {
    const capture = createLoggerCapture();
    const command = createProjectStatusCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
        dryRun: false,
        verbose: globalOptions.verbose ?? false,
        json: globalOptions.json ?? false,
        cwd: globalOptions.cwd ?? cwd,
        home: '/tmp/home',
        interactive: !(globalOptions.json ?? false),
        logger: capture.logger,
      }),
    });

    return { capture, command };
  }

  async function recommendationFor(
    projectPath: string,
  ): Promise<{ skill: string; reason: string }> {
    const { capture, command } = createRealHarness(projectPath);
    await runCommand(command, ['--project-path', projectPath], ['--json']);

    const payload = capture.jsonPayloads[0] as {
      status: string;
      project: { recommendation: { skill: string; reason: string } };
    };
    expect(payload.status).toBe('ok');
    expect(process.exitCode).toBe(0);
    return payload.project.recommendation;
  }

  it('recommends quick-start for a substantive quick plan with no review disposition', async () => {
    const projectPath = await createProject(
      `---
oat_status: in_progress
oat_ready_for: null
oat_phase_status: in_progress
oat_template: false
---

# Plan: demo
${SUBSTANTIVE_PHASE}${PENDING_DISPOSITION}`,
      QUICK_STATE.replace(
        'oat_phase_status: complete',
        'oat_phase_status: in_progress',
      ),
    );

    expect(await recommendationFor(projectPath)).toEqual({
      skill: 'oat-project-quick-start',
      reason:
        'Quick plan is not implementation-ready (frontmatter is not the recorded plan-complete state); resume the quick workflow in place',
    });
  });

  it('recommends quick-start for ready frontmatter with no substantive task', async () => {
    const projectPath = await createProject(
      `${READY_FRONTMATTER}
# Plan: demo

## Phase 1: Foundation

### Task p01-t01: {Task title}
${RECORDED_DISPOSITION}`,
    );

    expect(await recommendationFor(projectPath)).toEqual({
      skill: 'oat-project-quick-start',
      reason:
        'Quick plan is not implementation-ready (no phase carries a substantive task); resume the quick workflow in place',
    });
  });

  it('recommends quick-start for ready frontmatter with no review disposition', async () => {
    const projectPath = await createProject(
      `${READY_FRONTMATTER}
# Plan: demo
${SUBSTANTIVE_PHASE}${PENDING_DISPOSITION}`,
    );

    expect(await recommendationFor(projectPath)).toEqual({
      skill: 'oat-project-quick-start',
      reason:
        'Quick plan is not implementation-ready (the Reviews section records no plan review disposition); resume the quick workflow in place',
    });
  });

  it('recommends implement once frontmatter, disposition, and task are all recorded', async () => {
    const projectPath = await createProject(
      `${READY_FRONTMATTER}
# Plan: demo
${SUBSTANTIVE_PHASE}${RECORDED_DISPOSITION}`,
    );

    expect(await recommendationFor(projectPath)).toEqual({
      skill: 'oat-project-implement',
      reason:
        'Current artifact is complete and explicitly points to the next skill',
    });
  });

  it('leaves the lite route for the same not-ready plan unchanged', async () => {
    const notReadyPlan = `---
oat_status: in_progress
oat_ready_for: null
oat_phase_status: in_progress
oat_template: false
---

# Plan: demo
${SUBSTANTIVE_PHASE}${PENDING_DISPOSITION}`;
    const liteState = QUICK_STATE.replace(
      'oat_workflow_mode: quick',
      'oat_workflow_mode: lite',
    ).replace('oat_phase_status: complete', 'oat_phase_status: in_progress');

    const projectPath = await createProject(notReadyPlan, liteState);

    expect(await recommendationFor(projectPath)).toEqual({
      skill: 'oat-project-implement',
      reason: 'Route lite plan work based on boundary tier',
    });
  });
});
