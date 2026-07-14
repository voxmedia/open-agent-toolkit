import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';
import YAML from 'yaml';

import { scaffoldProject } from './scaffold';

const REPO_ROOT = join(process.cwd(), '..', '..');
const PROJECT_TEMPLATE_NAMES = [
  'state.md',
  'discovery.md',
  'spec.md',
  'design.md',
  'plan.md',
  'implementation.md',
] as const;
const SINGLE_BRACE_OAT_PLACEHOLDER = /(?<!\{)\{\s*OAT_[A-Z0-9_]+\s*\}(?!\})/g;

function initGitRepo(root: string): void {
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'scaffold@example.com'], {
    cwd: root,
  });
  execFileSync('git', ['config', 'user.name', 'scaffolder'], { cwd: root });
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: root });
}

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
        ? await readFile(join(REPO_ROOT, '.oat', 'templates', name), 'utf8')
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

async function createRepoRootWithRealTemplates(): Promise<string> {
  const repoRoot = await mkdtemp(join(tmpdir(), 'oat-scaffold-real-'));
  const templatesDir = join(repoRoot, '.oat', 'templates');
  await mkdir(templatesDir, { recursive: true });
  await Promise.all(
    PROJECT_TEMPLATE_NAMES.map(async (name) => {
      const content = await readFile(
        join(REPO_ROOT, '.oat', 'templates', name),
        'utf8',
      );
      await writeFile(join(templatesDir, name), content, 'utf8');
    }),
  );
  return repoRoot;
}

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) {
    throw new Error('Expected scaffolded artifact to contain frontmatter');
  }
  return YAML.parse(match[1]) as Record<string, unknown>;
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

  it.each([
    {
      mode: 'spec-driven' as const,
      hillCheckpoints: ['discovery', 'design'],
      phase: 'discovery',
    },
    { mode: 'quick' as const, hillCheckpoints: [], phase: 'discovery' },
    { mode: 'import' as const, hillCheckpoints: [], phase: 'plan' },
  ])(
    'renders every real $mode scaffold artifact without unresolved OAT placeholders',
    async ({ mode, hillCheckpoints, phase }) => {
      const repoRoot = await createRepoRootWithRealTemplates();
      tempDirs.push(repoRoot);
      const projectName = `real-${mode}`;

      const result = await scaffoldProject({
        repoRoot,
        projectName,
        mode,
        refreshDashboard: false,
        setActive: false,
        today: '2026-02-16',
        nowUtc: '2026-02-16T12:00:00.000Z',
      });

      const state = await readFile(
        join(repoRoot, result.projectPath, 'state.md'),
        'utf8',
      );
      const frontmatter = parseFrontmatter(state);
      expect(frontmatter.oat_hill_checkpoints).toEqual(hillCheckpoints);
      expect(frontmatter.oat_phase).toBe(phase);
      expect(frontmatter.oat_workflow_mode).toBe(mode);

      for (const file of result.createdFiles) {
        const rendered = await readFile(
          join(repoRoot, result.projectPath, file),
          'utf8',
        );
        expect(rendered.match(SINGLE_BRACE_OAT_PLACEHOLDER)).toBeNull();
      }
    },
  );

  it('rejects an unresolved single-brace OAT placeholder before writing the artifact', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'plan.md'),
      '# {Project Name}\n\n{ OAT_UNKNOWN }\n',
      'utf8',
    );

    await expect(
      scaffoldProject({
        repoRoot,
        projectName: 'unknown-token',
        mode: 'quick',
        refreshDashboard: false,
        setActive: false,
        today: '2026-02-16',
      }),
    ).rejects.toThrow(/unresolved OAT placeholder.*OAT_UNKNOWN/i);

    await expect(
      readFile(
        join(
          repoRoot,
          '.oat',
          'projects',
          'shared',
          'unknown-token',
          'plan.md',
        ),
        'utf8',
      ),
    ).rejects.toThrow();
  });

  it('allows prose placeholders and double-brace docs dependency tokens', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'plan.md'),
      '# {Project Name}\n\nKeep {ordinary_placeholder} and {{OAT_CLI_DEP}}.\n',
      'utf8',
    );

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'allowed-placeholders',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });
    const plan = await readFile(
      join(repoRoot, result.projectPath, 'plan.md'),
      'utf8',
    );

    expect(plan).toContain('{ordinary_placeholder}');
    expect(plan).toContain('{{OAT_CLI_DEP}}');
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
      '- **Spec:** `spec.md` (scaffolded template — authored inline by `oat-project-design`)',
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

  it('rejects a scaffolded state that uses decomposition without coordination kind', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'state.md'),
      [
        '---',
        'oat_phase: decomposition',
        'oat_phase_status: complete',
        'oat_workflow_mode: {OAT_WORKFLOW_MODE}',
        '---',
        '',
        '# {Project Name} state.md',
      ].join('\n'),
      'utf8',
    );

    await expect(
      scaffoldProject({
        repoRoot,
        projectName: 'invalid-decomposition',
        mode: 'quick',
        refreshDashboard: false,
        setActive: false,
        today: '2026-02-16',
      }),
    ).rejects.toThrow(
      /oat_phase: decomposition requires oat_kind: coordination/,
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
    const discoveryTemplate = await readFile(
      join(REPO_ROOT, '.oat', 'templates', 'discovery.md'),
      'utf8',
    );

    expect(discoveryTemplate).not.toContain(
      'Ready for the `oat-project-spec` skill to create formal specification',
    );
    expect(discoveryTemplate).toMatch(/quick mode|plan\.md/i);
    expect(discoveryTemplate).toMatch(
      /design\.md[\s\S]*optional|optional[\s\S]*design\.md/i,
    );
  });

  it('keeps the repo state template ready for explicit PR tracking', async () => {
    const stateTemplate = await readFile(
      join(REPO_ROOT, '.oat', 'templates', 'state.md'),
      'utf8',
    );

    expect(stateTemplate).toContain('oat_pr_status: null');
    expect(stateTemplate).toContain('oat_pr_url: null');
  });

  it('does not commit by default', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    initGitRepo(repoRoot);

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'no-commit-default',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      today: '2026-02-16',
    });

    expect(result.committed).toBe(false);
    expect(result.commitSha).toBeUndefined();
    expect(result.commitStatus).toBe('skipped_disabled');

    // No commit was created, so HEAD does not resolve. Capture stderr so the
    // expected `git fatal:` probe output does not leak to the test terminal.
    expect(() =>
      execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    ).toThrow();
  });

  it('commits only the scaffolded directory when commit:true (scoped staging)', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    initGitRepo(repoRoot);

    // An unrelated untracked file elsewhere in the repo must remain untracked.
    await writeFile(join(repoRoot, 'unrelated.txt'), 'do not stage me', 'utf8');

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'commit-demo',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      commit: true,
      today: '2026-02-16',
    });

    expect(result.committed).toBe(true);
    expect(result.commitStatus).toBe('committed');
    expect(result.commitSha).toMatch(/^[0-9a-f]{40}$/);

    // The scaffolded artifacts are tracked at HEAD.
    const tracked = execFileSync(
      'git',
      ['ls-tree', '-r', '--name-only', 'HEAD'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    expect(tracked).toContain('.oat/projects/shared/commit-demo/state.md');
    expect(tracked).toContain('.oat/projects/shared/commit-demo/plan.md');

    // The unrelated file was NOT swept into the scaffold commit.
    expect(tracked).not.toContain('unrelated.txt');
    const status = execFileSync(
      'git',
      ['status', '--porcelain', '--', 'unrelated.txt'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    expect(status).toContain('?? unrelated.txt');
  }, 15_000);

  it('skips commit safely when not inside a git work tree', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'no-git',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      commit: true,
      today: '2026-02-16',
    });

    expect(result.committed).toBe(false);
    expect(result.commitStatus).toBe('skipped_no_worktree');
    expect(result.commitSha).toBeUndefined();

    // Files were still scaffolded despite the skipped commit.
    await expect(
      readFile(
        join(repoRoot, '.oat', 'projects', 'shared', 'no-git', 'state.md'),
        'utf8',
      ),
    ).resolves.toContain('# Project State: no-git');
  });

  it('skips committing without error when there is nothing new to create', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    initGitRepo(repoRoot);

    // First run scaffolds and commits the project.
    await scaffoldProject({
      repoRoot,
      projectName: 'idempotent-demo',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      commit: true,
      today: '2026-02-16',
    });

    // A second run creates nothing (all files already exist), so there is
    // nothing for the scoped commit to do.
    const second = await scaffoldProject({
      repoRoot,
      projectName: 'idempotent-demo',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      commit: true,
      today: '2026-02-16',
    });

    expect(second.createdFiles).toHaveLength(0);
    expect(second.committed).toBe(false);
    expect(second.commitStatus).toBe('skipped_nothing');
    expect(second.commitSha).toBeUndefined();
  });

  it('classifies a genuine commit failure and captures git stderr without leaking it', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    // Init a work tree but deliberately omit user identity so `git commit`
    // fails with a fatal error. The helper must classify this as `failed` and
    // capture the stderr instead of letting `git fatal:` leak to the terminal.
    execFileSync('git', ['init', '-q'], { cwd: repoRoot });
    execFileSync('git', ['config', 'commit.gpgsign', 'false'], {
      cwd: repoRoot,
    });
    execFileSync('git', ['config', 'user.email', ''], { cwd: repoRoot });
    execFileSync('git', ['config', 'user.name', ''], { cwd: repoRoot });

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'commit-fail',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      commit: true,
      env: {
        // Strip any ambient git identity so the commit truly cannot resolve one.
        GIT_AUTHOR_NAME: '',
        GIT_AUTHOR_EMAIL: '',
        GIT_COMMITTER_NAME: '',
        GIT_COMMITTER_EMAIL: '',
      },
      today: '2026-02-16',
    });

    expect(result.committed).toBe(false);
    expect(result.commitStatus).toBe('failed');
    expect(result.commitError).toBeTruthy();

    // The scaffold itself still succeeded.
    await expect(
      readFile(
        join(repoRoot, '.oat', 'projects', 'shared', 'commit-fail', 'state.md'),
        'utf8',
      ),
    ).resolves.toContain('# Project State: commit-fail');
  });

  it('does not sweep pre-existing dirty edits inside the project dir on a re-run', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    initGitRepo(repoRoot);

    // First run scaffolds and commits the project baseline.
    const first = await scaffoldProject({
      repoRoot,
      projectName: 'dirty-rerun',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      commit: true,
      today: '2026-02-16',
    });
    expect(first.committed).toBe(true);

    const projectDir = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      'dirty-rerun',
    );

    // Introduce unrelated working-tree changes INSIDE the project directory:
    // (a) a dirty edit to an already-committed file, and
    // (b) a brand-new untracked file this re-run will NOT create.
    const planPath = join(projectDir, 'plan.md');
    await writeFile(planPath, 'manual unrelated edit to plan', 'utf8');
    const notesPath = join(projectDir, 'unrelated-notes.md');
    await writeFile(notesPath, 'untracked notes do not commit me', 'utf8');

    // Re-run with commit:true. Since every template already exists, this run
    // creates nothing, so the scoped commit must touch nothing.
    const second = await scaffoldProject({
      repoRoot,
      projectName: 'dirty-rerun',
      mode: 'quick',
      refreshDashboard: false,
      setActive: false,
      commit: true,
      today: '2026-02-16',
    });

    expect(second.createdFiles).toHaveLength(0);
    expect(second.committed).toBe(false);
    expect(second.commitStatus).toBe('skipped_nothing');

    // The unrelated edits remain in the working tree, uncommitted.
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(status).toContain('.oat/projects/shared/dirty-rerun/plan.md');
    expect(status).toContain(
      '?? .oat/projects/shared/dirty-rerun/unrelated-notes.md',
    );

    // And they were NOT included in HEAD.
    const headFiles = execFileSync(
      'git',
      ['ls-tree', '-r', '--name-only', 'HEAD'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    expect(headFiles).not.toContain(
      '.oat/projects/shared/dirty-rerun/unrelated-notes.md',
    );
    // plan.md is tracked (committed by the first run), but HEAD must still hold
    // the original scaffolded content, not the manual edit.
    const headPlan = execFileSync(
      'git',
      ['show', 'HEAD:.oat/projects/shared/dirty-rerun/plan.md'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    expect(headPlan).not.toContain('manual unrelated edit to plan');
  });
});
