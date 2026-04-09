import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { getProjectState, listProjects } from './project';

describe('project state integration', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createDir(prefix: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  it('assembles a full ProjectState for a project directory', async () => {
    const repoRoot = await createDir('oat-control-plane-project-');
    const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await mkdir(projectDir, { recursive: true });

    await Promise.all([
      writeFile(
        join(repoRoot, '.oat', 'config.json'),
        `${JSON.stringify({ version: 1 })}\n`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'state.md'),
        `---
oat_current_task: p02-t01
oat_last_commit: abc1234
oat_blockers: []
oat_hill_checkpoints: ["design"]
oat_hill_completed: []
oat_parallel_execution: false
oat_phase: plan
oat_phase_status: complete
oat_execution_mode: single-thread
oat_lifecycle: paused
oat_pause_timestamp: '2026-04-09T21:00:00Z'
oat_pause_reason: waiting on review
oat_workflow_mode: quick
oat_workflow_origin: native
oat_docs_updated: null
oat_pr_status: null
oat_pr_url: null
oat_project_created: '2026-04-08T17:16:52.421Z'
oat_project_completed: null
oat_project_state_updated: '2026-04-09T22:00:00Z'
oat_generated: false
---
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'discovery.md'),
        `---
oat_status: complete
oat_ready_for: oat-project-plan
oat_template: false
---
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'plan.md'),
        `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_template: false
---

## Phase 1: Control Plane

### Task p01-t01: Scaffold
### Task p01-t02: Parse state

## Reviews

| Scope | Type     | Status | Date       | Artifact              |
| ----- | -------- | ------ | ---------- | --------------------- |
| plan  | artifact | passed | 2026-04-09 | reviews/plan-review.md |
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'implementation.md'),
        `---
oat_current_task_id: p02-t01
---

### Task p01-t01: Scaffold
**Status:** completed

### Task p01-t02: Parse state
**Status:** completed
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'design.md'),
        `---
oat_status: complete
oat_template: false
---
`,
        'utf8',
      ),
      mkdir(join(projectDir, 'reviews'), { recursive: true }),
    ]);

    const projectState = await getProjectState(projectDir);

    expect(projectState.name).toBe(basename(projectDir));
    expect(projectState.path).toBe('.oat/projects/shared/demo');
    expect(projectState.phase).toBe('plan');
    expect(projectState.phaseStatus).toBe('complete');
    expect(projectState.workflowMode).toBe('quick');
    expect(projectState.lifecycle).toBe('paused');
    expect(projectState.pauseTimestamp).toBe('2026-04-09T21:00:00Z');
    expect(projectState.pauseReason).toBe('waiting on review');
    expect(projectState.progress).toEqual({
      total: 2,
      completed: 2,
      currentTaskId: 'p02-t01',
      phases: [
        {
          phaseId: 'p01',
          name: 'Control Plane',
          total: 2,
          completed: 2,
          isRevision: false,
        },
      ],
    });
    expect(projectState.reviews).toEqual([
      {
        scope: 'plan',
        type: 'artifact',
        status: 'passed',
        date: '2026-04-09',
        artifact: 'reviews/plan-review.md',
      },
    ]);
    expect(projectState.recommendation.skill).toBe('oat-project-implement');
  });

  it('lists project summaries sorted by name', async () => {
    const repoRoot = await createDir('oat-control-plane-projects-root-');
    const projectsRoot = join(repoRoot, '.oat', 'projects', 'shared');

    await Promise.all([
      mkdir(join(repoRoot, '.oat'), { recursive: true }),
      mkdir(projectsRoot, { recursive: true }),
      writeFile(
        join(repoRoot, '.oat', 'config.json'),
        `${JSON.stringify({ version: 1 })}\n`,
        'utf8',
      ),
    ]);

    await Promise.all([
      createProject(projectsRoot, 'beta', 'design', 'complete', 'complete'),
      createProject(projectsRoot, 'alpha', 'discovery', 'in_progress'),
      createProject(projectsRoot, 'gamma', 'implement', 'pr_open'),
    ]);

    const projects = await listProjects(projectsRoot);

    expect(projects.map((project) => project.name)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
    expect(projects[0]).toMatchObject({
      path: '.oat/projects/shared/alpha',
      phase: 'discovery',
      phaseStatus: 'in_progress',
      lifecycle: 'active',
    });
    expect(projects[1]).toMatchObject({
      path: '.oat/projects/shared/beta',
      lifecycle: 'complete',
    });
    expect(projects[2]).toMatchObject({
      path: '.oat/projects/shared/gamma',
      phase: 'implement',
      phaseStatus: 'pr_open',
      lifecycle: 'active',
    });
  });
});

async function createProject(
  projectsRoot: string,
  name: string,
  phase: string,
  phaseStatus: string,
  lifecycle = 'active',
): Promise<void> {
  const projectDir = join(projectsRoot, name);
  await mkdir(projectDir, { recursive: true });
  await Promise.all([
    writeFile(
      join(projectDir, 'state.md'),
      `---
oat_current_task: null
oat_last_commit: null
oat_blockers: []
oat_hill_checkpoints: []
oat_hill_completed: []
oat_parallel_execution: false
oat_phase: ${phase}
oat_phase_status: ${phaseStatus}
oat_execution_mode: single-thread
oat_lifecycle: ${lifecycle}
oat_workflow_mode: spec-driven
oat_workflow_origin: native
oat_docs_updated: null
oat_pr_status: null
oat_pr_url: null
oat_project_created: '2026-04-08T17:16:52.421Z'
oat_project_completed: null
oat_project_state_updated: '2026-04-09T22:00:00Z'
oat_generated: false
---
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'plan.md'),
      `---
oat_status: in_progress
oat_template: false
---

## Phase 1: Example

### Task p01-t01: Example
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'implementation.md'),
      `---
oat_current_task_id: p01-t01
---
`,
      'utf8',
    ),
    writeFile(
      join(projectDir, 'discovery.md'),
      `---
oat_status: in_progress
oat_template: false
---
`,
      'utf8',
    ),
  ]);
}
