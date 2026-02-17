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
    await writeFile(
      join(templatesDir, name),
      [
        '---',
        'oat_template: true',
        `oat_template_name: ${name.replace('.md', '')}`,
        '---',
        '',
        `# {Project Name} ${name}`,
        'Date: YYYY-MM-DD',
      ].join('\n'),
      'utf8',
    );
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

  it('falls back to .oat/projects-root file when env var missing', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    await writeFile(
      join(repoRoot, '.oat', 'projects-root'),
      '.oat/projects/from-file\n',
      'utf8',
    );

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'my_project',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    expect(result.projectPath).toBe('.oat/projects/from-file/my_project');
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
      mode: 'full',
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
      join(repoRoot, '.oat', 'templates', 'discovery.md'),
      [
        '---',
        'oat_template: true',
        'oat_template_name: discovery',
        'oat_template: true',
        'oat_template_name: duplicate',
        '---',
        '',
        '# {Project Name} discovery.md',
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

    const discovery = await readFile(
      join(
        repoRoot,
        '.oat',
        'projects',
        'shared',
        'multi-marker',
        'discovery.md',
      ),
      'utf8',
    );
    expect(discovery).not.toContain('oat_template: true');
    expect(discovery).not.toContain('oat_template_name:');
  });

  it('does not strip malformed marker keys', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'discovery.md'),
      [
        '---',
        'oat_template : true',
        'oat_template_name : discovery',
        '---',
        '',
        '# {Project Name} discovery.md',
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

    const discovery = await readFile(
      join(
        repoRoot,
        '.oat',
        'projects',
        'shared',
        'malformed-marker',
        'discovery.md',
      ),
      'utf8',
    );
    expect(discovery).toContain('oat_template : true');
    expect(discovery).toContain('oat_template_name : discovery');
  });

  it('creates full mode artifacts and excludes project-index', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);

    await scaffoldProject({
      repoRoot,
      projectName: 'full-mode',
      mode: 'full',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    for (const file of [
      'state.md',
      'discovery.md',
      'spec.md',
      'design.md',
      'plan.md',
      'implementation.md',
    ]) {
      await expect(
        readFile(
          join(repoRoot, '.oat', 'projects', 'shared', 'full-mode', file),
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
          'full-mode',
          'project-index.md',
        ),
        'utf8',
      ),
    ).rejects.toThrow();
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
  });

  it('updates active-project pointer and triggers dashboard refresh callback', async () => {
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

    const pointer = await readFile(
      join(repoRoot, '.oat', 'active-project'),
      'utf8',
    );
    expect(pointer).toBe(`${result.projectPath}\n`);
    expect(refreshDashboard).toHaveBeenCalledWith(repoRoot);
  });
});
