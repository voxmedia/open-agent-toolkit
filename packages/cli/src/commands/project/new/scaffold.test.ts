import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { scaffoldProject } from './scaffold';

async function seedTemplates(repoRoot: string): Promise<void> {
  const templatesDir = join(repoRoot, '.oat', 'templates');
  await mkdir(templatesDir, { recursive: true });

  const templateNames = [
    'state.md',
    'discovery.md',
    'spec.md',
    'design.md',
    'plan.md',
    'implementation.md',
    'project-index.md',
  ];

  for (const name of templateNames) {
    const content =
      name === 'state.md'
        ? [
            '---',
            'oat_template: true',
            'oat_template_name: state',
            'oat_hill_checkpoints: {OAT_HILL_CHECKPOINTS}',
            'oat_phase: {OAT_PHASE}',
            'oat_phase_status: in_progress',
            'oat_workflow_mode: {OAT_WORKFLOW_MODE}',
            'oat_pr_status: null',
            'oat_pr_url: null',
            'oat_project_created: null',
            'oat_project_completed: null',
            'oat_project_state_updated: null',
            '---',
            '',
            '# Project State: {Project Name}',
            '',
            '**Status:** {OAT_STATUS}',
            '**Started:** YYYY-MM-DD',
            '**Last Updated:** YYYY-MM-DD',
            '',
            '## Current Phase',
            '',
            '{OAT_CURRENT_PHASE}',
            '',
            '## Artifacts',
            '',
            '{OAT_ARTIFACTS}',
            '',
            '## Progress',
            '',
            '{OAT_PROGRESS}',
            '',
            '## Next Milestone',
            '',
            '{OAT_NEXT_MILESTONE}',
          ].join('\n')
        : [
            '---',
            'oat_template: true',
            `oat_template_name: ${name.replace('.md', '')}`,
            '---',
            '',
            `# {Project Name} ${name}`,
            'Date: YYYY-MM-DD',
          ].join('\n');
    await writeFile(join(templatesDir, name), content, 'utf8');
  }
}

async function createRepoRoot(): Promise<string> {
  const repoRoot = await mkdtemp(join(tmpdir(), 'oat-scaffold-'));
  await seedTemplates(repoRoot);
  return repoRoot;
}

describe('scaffoldProject', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('resolves projects root from OAT_PROJECTS_ROOT first', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'my_project',
      env: { OAT_PROJECTS_ROOT: '.oat/projects/custom-root' },
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    expect(result.projectPath).toBe('.oat/projects/custom-root/my_project');
  });

  it('uses config.json projects root when env var missing', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, projects: { root: '.oat/projects/from-config' } })}\n`,
      'utf8',
    );

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'my_project',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    expect(result.projectPath).toBe('.oat/projects/from-config/my_project');
  });

  it('uses .oat/projects/shared when env and projects-root are missing', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'my_project',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    expect(result.projectPath).toBe('.oat/projects/shared/my_project');
  });

  it('rejects invalid project names', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);

    await expect(
      scaffoldProject({
        repoRoot,
        projectName: 'bad name',
        refreshDashboard: false,
        setActive: false,
        today: '2026-02-16',
      }),
    ).rejects.toThrow(/Invalid project name/);
  });

  it('rejects project names starting with a dash', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);

    await expect(
      scaffoldProject({
        repoRoot,
        projectName: '--help',
        refreshDashboard: false,
        setActive: false,
        today: '2026-02-16',
      }),
    ).rejects.toThrow(/must not start with a dash/);
  });

  it('cleans template markers and does not overwrite existing files', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    const existingPath = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      'demo',
      'state.md',
    );
    await mkdir(join(existingPath, '..'), { recursive: true });
    await writeFile(existingPath, 'existing state', 'utf8');

    await scaffoldProject({
      repoRoot,
      projectName: 'demo',
      mode: 'spec-driven',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    const state = await readFile(existingPath, 'utf8');
    expect(state).toBe('existing state');

    const discovery = await readFile(
      join(repoRoot, '.oat', 'projects', 'shared', 'demo', 'discovery.md'),
      'utf8',
    );
    expect(discovery).not.toContain('oat_template');
    expect(discovery).toContain('Date: 2026-02-16');
  });

  it('removes multiple template marker occurrences', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'plan.md'),
      [
        '---',
        'oat_template: true',
        'oat_template_name: plan',
        'oat_template: true',
        'oat_template_name: duplicate',
        '---',
        '',
        '# {Project Name} plan.md',
        'Date: YYYY-MM-DD',
      ].join('\n'),
      'utf8',
    );

    await scaffoldProject({
      repoRoot,
      projectName: 'multi-marker',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    const plan = await readFile(
      join(repoRoot, '.oat', 'projects', 'shared', 'multi-marker', 'plan.md'),
      'utf8',
    );
    expect(plan).not.toContain('oat_template: true');
    expect(plan).not.toContain('oat_template_name:');
  });

  it('does not strip malformed marker keys', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'plan.md'),
      [
        '---',
        'oat_template : true',
        'oat_template_name : plan',
        '---',
        '',
        '# {Project Name} plan.md',
        'Date: YYYY-MM-DD',
      ].join('\n'),
      'utf8',
    );

    await scaffoldProject({
      repoRoot,
      projectName: 'malformed-marker',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    const plan = await readFile(
      join(
        repoRoot,
        '.oat',
        'projects',
        'shared',
        'malformed-marker',
        'plan.md',
      ),
      'utf8',
    );
    expect(plan).toContain('oat_template : true');
    expect(plan).toContain('oat_template_name : plan');
  });

  it('creates spec-driven mode artifacts and excludes project-index', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);

    await scaffoldProject({
      repoRoot,
      projectName: 'spec-driven-mode',
      mode: 'spec-driven',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    for (const file of [
      'discovery.md',
      'spec.md',
      'design.md',
      'plan.md',
      'implementation.md',
    ]) {
      await expect(
        readFile(
          join(
            repoRoot,
            '.oat',
            'projects',
            'shared',
            'spec-driven-mode',
            file,
          ),
          'utf8',
        ),
      ).resolves.toContain(file);
    }

    await expect(
      readFile(
        join(
          repoRoot,
          '.oat',
          'projects',
          'shared',
          'spec-driven-mode',
          'state.md',
        ),
        'utf8',
      ),
    ).resolves.toContain('# Project State: spec-driven-mode');

    await expect(
      readFile(
        join(
          repoRoot,
          '.oat',
          'projects',
          'shared',
          'spec-driven-mode',
          'project-index.md',
        ),
        'utf8',
      ),
    ).rejects.toThrow();

    const state = await readFile(
      join(
        repoRoot,
        '.oat',
        'projects',
        'shared',
        'spec-driven-mode',
        'state.md',
      ),
      'utf8',
    );
    expect(state).toContain('oat_workflow_mode: spec-driven');
    expect(state).toContain('oat_phase: discovery');
    expect(state).toContain(
      '- **Spec:** `spec.md` (scaffolded template — not started)',
    );
    expect(state).toContain(
      '- **Implementation:** `implementation.md` (scaffolded template — not started)',
    );
  });

  it('creates quick mode artifacts only', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);

    await scaffoldProject({
      repoRoot,
      projectName: 'quick-mode',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    for (const file of [
      'state.md',
      'discovery.md',
      'plan.md',
      'implementation.md',
    ]) {
      await expect(
        readFile(
          join(repoRoot, '.oat', 'projects', 'shared', 'quick-mode', file),
          'utf8',
        ),
      ).resolves.toBeDefined();
    }

    for (const file of ['spec.md', 'design.md', 'project-index.md']) {
      await expect(
        readFile(
          join(repoRoot, '.oat', 'projects', 'shared', 'quick-mode', file),
          'utf8',
        ),
      ).rejects.toThrow();
    }

    const state = await readFile(
      join(repoRoot, '.oat', 'projects', 'shared', 'quick-mode', 'state.md'),
      'utf8',
    );
    expect(state).toContain('oat_workflow_mode: quick');
    expect(state).toContain('oat_hill_checkpoints: []');
    expect(state).toContain('**Status:** Discovery');
    expect(state).toContain('- **Spec:** N/A (quick mode)');
    expect(state).toContain(
      '- **Design:** N/A (quick mode unless lightweight design is needed)',
    );
    expect(state).toContain(
      'Complete discovery and generate a quick implementation plan',
    );
  });

  it('creates import mode artifacts only and sets references dir', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);

    await scaffoldProject({
      repoRoot,
      projectName: 'import-mode',
      mode: 'import',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    for (const file of ['state.md', 'plan.md', 'implementation.md']) {
      await expect(
        readFile(
          join(repoRoot, '.oat', 'projects', 'shared', 'import-mode', file),
          'utf8',
        ),
      ).resolves.toBeDefined();
    }

    for (const file of ['discovery.md', 'spec.md', 'design.md']) {
      await expect(
        readFile(
          join(repoRoot, '.oat', 'projects', 'shared', 'import-mode', file),
          'utf8',
        ),
      ).rejects.toThrow();
    }

    await expect(
      readFile(
        join(
          repoRoot,
          '.oat',
          'projects',
          'shared',
          'import-mode',
          'references',
          '.gitkeep',
        ),
        'utf8',
      ),
    ).resolves.toBe('');

    const state = await readFile(
      join(repoRoot, '.oat', 'projects', 'shared', 'import-mode', 'state.md'),
      'utf8',
    );
    expect(state).toContain('oat_pr_status: null');
    expect(state).toContain('oat_pr_url: null');
    expect(state).toContain('oat_workflow_mode: import');
    expect(state).toContain('oat_hill_checkpoints: []');
    expect(state).toContain('oat_phase: plan');
    expect(state).toContain('**Status:** Plan Import');
    expect(state).toContain('- **Discovery:** N/A (import mode)');
    expect(state).toContain(
      '- **Plan:** `plan.md` (scaffolded template — awaiting imported content)',
    );
    expect(state).toContain(
      'Run `oat-project-import-plan` to normalize the external plan',
    );
  });

  it('does not reject when refreshDashboardCallback throws', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'throw-demo',
      refreshDashboard: true,
      refreshDashboardCallback: () => {
        throw new Error('dashboard kaboom');
      },
      today: '2026-02-16',
    });

    expect(result.dashboardRefreshed).toBe(false);
    expect(result.projectPath).toContain('throw-demo');
  });

  it('updates config.local activeProject and triggers dashboard refresh callback', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    const refreshDashboard = vi.fn();

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'active-demo',
      refreshDashboard: true,
      refreshDashboardCallback: refreshDashboard,
      today: '2026-02-16',
    });

    const localConfig = JSON.parse(
      await readFile(join(repoRoot, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBe(result.projectPath);
    expect(refreshDashboard).toHaveBeenCalledWith(repoRoot);
  });

  it('sets oat_project_created and oat_project_state_updated timestamps on scaffolded state.md', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);

    // Overwrite state.md template with timestamp fields
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'state.md'),
      [
        '---',
        'oat_template: true',
        'oat_template_name: state',
        'oat_project_created: null',
        'oat_project_completed: null',
        'oat_project_state_updated: null',
        '---',
        '',
        '# {Project Name} state.md',
        'Date: YYYY-MM-DD',
      ].join('\n'),
      'utf8',
    );

    await scaffoldProject({
      repoRoot,
      projectName: 'ts-demo',
      refreshDashboard: false,
      setActive: false,
      today: '2026-03-10',
      nowUtc: '2026-03-10T12:00:00.000Z',
    });

    const state = await readFile(
      join(repoRoot, '.oat', 'projects', 'shared', 'ts-demo', 'state.md'),
      'utf8',
    );
    expect(state).toContain('oat_project_created: "2026-03-10T12:00:00.000Z"');
    expect(state).toContain(
      'oat_project_state_updated: "2026-03-10T12:00:00.000Z"',
    );
    expect(state).toContain('oat_project_completed: null');
    expect(state).not.toContain('oat_template');
  });

  it('keeps the repo discovery template workflow-safe for quick projects', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const discoveryTemplate = await readFile(
      join(repoRoot, '.oat', 'templates', 'discovery.md'),
      'utf8',
    );

    expect(discoveryTemplate).not.toContain(
      'Ready for the `oat-project-spec` skill to create formal specification',
    );
    expect(discoveryTemplate).toMatch(/quick mode|plan\.md/i);
    expect(discoveryTemplate).toMatch(
      /design\.md.*optional|optional.*design\.md/i,
    );
  });

  it('keeps the repo state template ready for explicit PR tracking', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const stateTemplate = await readFile(
      join(repoRoot, '.oat', 'templates', 'state.md'),
      'utf8',
    );

    expect(stateTemplate).toContain('oat_pr_status: null');
    expect(stateTemplate).toContain('oat_pr_url: null');
  });
});
