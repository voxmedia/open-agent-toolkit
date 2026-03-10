import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  type GitOperations,
  generateStateDashboard,
  phaseInHillList,
} from './generate';

const mockGit: GitOperations = {
  isGitRepo: () => true,
  diffFileCount: () => 0,
};

async function createTempRepo(): Promise<string> {
  const dir = join(
    tmpdir(),
    `oat-state-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await mkdir(join(dir, '.oat'), { recursive: true });
  return dir;
}

async function writeStateFile(
  repoRoot: string,
  projectPath: string,
  frontmatter: Record<string, string>,
): Promise<void> {
  const fullPath = join(repoRoot, projectPath, 'state.md');
  await mkdir(join(repoRoot, projectPath), { recursive: true });
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  await writeFile(fullPath, `---\n${fm}\n---\n# State\n`, 'utf8');
}

async function writeLocalConfig(
  repoRoot: string,
  config: Record<string, unknown>,
): Promise<void> {
  await writeFile(
    join(repoRoot, '.oat', 'config.local.json'),
    `${JSON.stringify({ version: 1, ...config })}\n`,
    'utf8',
  );
}

describe('generateStateDashboard', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('generates dashboard with no projects and recommends oat-project-new', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-17',
      git: mockGit,
    });

    expect(result.projectName).toBeNull();
    expect(result.projectStatus).toBe('not set');
    expect(result.recommendedStep).toBe('oat-project-new');
    expect(result.recommendedReason).toContain('Create a new project');

    const dashboard = await readFile(result.dashboardPath, 'utf8');
    expect(dashboard).toContain('*(not set)*');
  });

  it('generates dashboard with existing projects but no active project', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    await writeStateFile(root, '.oat/projects/shared/my-project', {
      oat_phase: 'discovery',
      oat_phase_status: 'in_progress',
    });

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-17',
      git: mockGit,
    });

    expect(result.recommendedStep).toBe('oat-project-open');
    expect(result.recommendedReason).toContain('Select an existing project');

    const dashboard = await readFile(result.dashboardPath, 'utf8');
    expect(dashboard).toContain('**my-project**');
  });

  it('generates dashboard with active project and frontmatter fields', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    await writeStateFile(root, '.oat/projects/shared/test-proj', {
      oat_phase: 'implement',
      oat_phase_status: 'in_progress',
      oat_current_task: 'p02-t03',
      oat_workflow_mode: 'spec-driven',
      oat_hill_checkpoints: '[]',
      oat_hill_completed: '[]',
    });

    await writeLocalConfig(root, {
      activeProject: '.oat/projects/shared/test-proj',
    });

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-17',
      git: mockGit,
    });

    expect(result.projectName).toBe('test-proj');
    expect(result.projectStatus).toBe('active');
    expect(result.recommendedStep).toBe('oat-project-implement');

    const dashboard = await readFile(result.dashboardPath, 'utf8');
    expect(dashboard).toContain('| Phase | implement |');
    expect(dashboard).toContain('| Current Task | p02-t03 |');
    expect(dashboard).toContain('| Mode | spec-driven |');
  });

  it('handles missing active project gracefully', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-17',
      git: mockGit,
    });

    expect(result.projectStatus).toBe('not set');
    expect(result.projectName).toBeNull();
  });

  it('handles config-local activeProject pointing to non-existent dir', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    await writeLocalConfig(root, {
      activeProject: '.oat/projects/shared/missing-proj',
    });

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-17',
      git: mockGit,
    });

    expect(result.projectStatus).toBe('directory missing');
    expect(result.recommendedStep).toBe('oat-project-open');

    const dashboard = await readFile(result.dashboardPath, 'utf8');
    expect(dashboard).toContain('**Warning:** directory missing');
  });

  it('calculates staleness thresholds from knowledge index', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    const knowledgePath = join(root, '.oat', 'repo', 'knowledge');
    await mkdir(knowledgePath, { recursive: true });
    await writeFile(
      join(knowledgePath, 'project-index.md'),
      '---\noat_generated_at: 2026-02-10\noat_source_main_merge_base_sha: abc123\n---\n# Index\n',
    );

    const staleGit: GitOperations = {
      isGitRepo: () => true,
      diffFileCount: () => 25,
    };

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-17',
      git: staleGit,
    });

    expect(result.stalenessStatus).toBe('stale');

    const dashboard = await readFile(result.dashboardPath, 'utf8');
    expect(dashboard).toContain('| Status | stale |');
  });

  it('calculates aging staleness', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    const knowledgePath = join(root, '.oat', 'repo', 'knowledge');
    await mkdir(knowledgePath, { recursive: true });
    await writeFile(
      join(knowledgePath, 'project-index.md'),
      '---\noat_generated_at: 2026-02-13\noat_source_main_merge_base_sha: abc123\n---\n# Index\n',
    );

    const agingGit: GitOperations = {
      isGitRepo: () => true,
      diffFileCount: () => 8,
    };

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-17',
      git: agingGit,
    });

    expect(result.stalenessStatus).toBe('aging');
  });

  it('routes computeNextStep correctly for spec-driven/quick/import modes with HiLL gating', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    // Test HiLL gating: phase complete + in HiLL checkpoints + not in completed
    await writeStateFile(root, '.oat/projects/shared/hill-proj', {
      oat_phase: 'design',
      oat_phase_status: 'complete',
      oat_workflow_mode: 'spec-driven',
      oat_hill_checkpoints: '["design"]',
      oat_hill_completed: '[]',
    });

    await writeLocalConfig(root, {
      activeProject: '.oat/projects/shared/hill-proj',
    });

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-17',
      git: mockGit,
    });

    expect(result.recommendedStep).toBe('oat-project-design');
    expect(result.recommendedReason).toContain('HiLL approval');
  });

  it('lists multiple available projects', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    await writeStateFile(root, '.oat/projects/shared/proj-a', {
      oat_phase: 'discovery',
    });
    await writeStateFile(root, '.oat/projects/shared/proj-b', {
      oat_phase: 'implement',
    });

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-17',
      git: mockGit,
    });

    const dashboard = await readFile(result.dashboardPath, 'utf8');
    expect(dashboard).toContain('**proj-a** - discovery');
    expect(dashboard).toContain('**proj-b** - implement');
  });

  it('keeps active project when another project is paused', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    await writeStateFile(root, '.oat/projects/shared/active-a', {
      oat_phase: 'implement',
      oat_phase_status: 'in_progress',
      oat_current_task: 'p02-t01',
      oat_workflow_mode: 'full',
      oat_hill_checkpoints: '[]',
      oat_hill_completed: '[]',
      oat_lifecycle: 'active',
    });
    await writeStateFile(root, '.oat/projects/shared/paused-b', {
      oat_phase: 'plan',
      oat_phase_status: 'complete',
      oat_workflow_mode: 'import',
      oat_lifecycle: 'paused',
      oat_pause_timestamp: '2026-02-20T12:00:00.000Z',
      oat_pause_reason: 'waiting',
    });
    await writeLocalConfig(root, {
      activeProject: '.oat/projects/shared/active-a',
    });

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-21',
      git: mockGit,
    });

    expect(result.projectName).toBe('active-a');
    expect(result.recommendedStep).toBe('oat-project-implement');
  });

  it('shows resume guidance when no active project and lastPausedProject exists', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    await writeStateFile(root, '.oat/projects/shared/paused-demo', {
      oat_phase: 'implement',
      oat_phase_status: 'in_progress',
      oat_workflow_mode: 'full',
      oat_lifecycle: 'paused',
      oat_pause_timestamp: '2026-02-20T12:00:00.000Z',
      oat_pause_reason: 'waiting',
    });
    await writeLocalConfig(root, {
      activeProject: null,
      lastPausedProject: '.oat/projects/shared/paused-demo',
    });

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-21',
      git: mockGit,
    });

    expect(result.recommendedStep).toBe('oat project open paused-demo');
    expect(result.recommendedReason).toContain('Resume paused project');

    const dashboard = await readFile(result.dashboardPath, 'utf8');
    expect(dashboard).toContain('## Last Paused Project');
    expect(dashboard).toContain('**paused-demo**');
  });

  it('computeNextStep resumes when active project lifecycle is paused', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    await writeStateFile(root, '.oat/projects/shared/paused-active', {
      oat_phase: 'implement',
      oat_phase_status: 'in_progress',
      oat_current_task: 'p03-t01',
      oat_workflow_mode: 'full',
      oat_hill_checkpoints: '[]',
      oat_hill_completed: '[]',
      oat_lifecycle: 'paused',
      oat_pause_timestamp: '2026-02-20T12:00:00.000Z',
      oat_pause_reason: 'qa hold',
    });
    await writeLocalConfig(root, {
      activeProject: '.oat/projects/shared/paused-active',
    });

    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-21',
      git: mockGit,
    });

    expect(result.recommendedStep).toBe('oat project open paused-active');
    expect(result.recommendedReason).toContain('paused');

    const dashboard = await readFile(result.dashboardPath, 'utf8');
    expect(dashboard).toContain('| Lifecycle | paused |');
    expect(dashboard).toContain(
      '| Pause Timestamp | 2026-02-20T12:00:00.000Z |',
    );
    expect(dashboard).toContain('| Pause Reason | qa hold |');
  });

  it('generates valid dashboard with throwing git mock (degraded output)', async () => {
    const root = await createTempRepo();
    tempDirs.push(root);

    const throwingGit: GitOperations = {
      isGitRepo: () => {
        throw new Error('git not available');
      },
      diffFileCount: () => {
        throw new Error('git not available');
      },
    };

    const knowledgePath = join(root, '.oat', 'repo', 'knowledge');
    await mkdir(knowledgePath, { recursive: true });
    await writeFile(
      join(knowledgePath, 'project-index.md'),
      '---\noat_generated_at: 2026-02-10\noat_source_main_merge_base_sha: abc123\n---\n# Index\n',
    );

    // Should not throw — degraded but valid output
    const result = await generateStateDashboard({
      repoRoot: root,
      today: '2026-02-17',
      git: throwingGit,
    });

    expect(result.dashboardPath).toBeTruthy();
    const dashboard = await readFile(result.dashboardPath, 'utf8');
    expect(dashboard).toContain('# OAT Repo State Dashboard');
  });
});

describe('phaseInHillList', () => {
  it('returns true when phase is in list', () => {
    expect(phaseInHillList('design', '["design", "plan"]')).toBe(true);
  });

  it('returns false when phase is not in list', () => {
    expect(phaseInHillList('implement', '["design", "plan"]')).toBe(false);
  });

  it('returns false for empty list', () => {
    expect(phaseInHillList('design', '[]')).toBe(false);
  });
});
