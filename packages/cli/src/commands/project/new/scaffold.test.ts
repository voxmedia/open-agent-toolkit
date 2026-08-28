import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { instantiateProjectLogTemplate } from '@commands/project/log/append';
import { createProjectOpenCommand } from '@commands/project/open/index';
import { createSyncedProject } from '@commands/project/sync/ref-sync';
import { createSyncedFixture } from '@test-support/synced-fixture';
import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';
import YAML from 'yaml';

import {
  scaffoldProject as scaffoldProjectImpl,
  type ScaffoldProjectOptions,
  type ScaffoldProjectResult,
} from './scaffold';

const REPO_ROOT = join(process.cwd(), '..', '..');
const PROJECT_TEMPLATE_NAMES = [
  'state.md',
  'discovery.md',
  'spec.md',
  'design.md',
  'plan.md',
  'implementation.md',
  'project-log.md',
] as const;
const SINGLE_BRACE_OAT_PLACEHOLDER = /(?<!\{)\{\s*OAT_[A-Z0-9_]+\s*\}(?!\})/g;

function scaffoldProject(
  options: ScaffoldProjectOptions,
): Promise<ScaffoldProjectResult> {
  return scaffoldProjectImpl(
    {
      home: join(options.repoRoot, '.test-home'),
      ...options,
    },
    { resolveDefaultScope: async () => 'shared' },
  );
}

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
    'project-log.md',
  ];

  for (const name of templateNames) {
    const content =
      name === 'state.md' || name === 'project-log.md'
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

async function installSyncedWorktreeRejectingHooks(
  repoRoot: string,
  hookNames: string[],
): Promise<void> {
  const hooksDir = execFileSync(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-path', 'hooks'],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();
  await mkdir(hooksDir, { recursive: true });
  const hook = [
    '#!/bin/sh',
    'case "$(git rev-parse --show-toplevel)" in',
    '  */.oat/projects/synced/*) exit 97 ;;',
    'esac',
    'exit 0',
    '',
  ].join('\n');
  await Promise.all(
    hookNames.map((hookName) =>
      writeFile(join(hooksDir, hookName), hook, { mode: 0o755 }),
    ),
  );
}

async function setProjectLogConfig(
  repoRoot: string,
  projectLog: true | false | 'auto',
): Promise<void> {
  await writeFile(
    join(repoRoot, '.oat', 'config.json'),
    `${JSON.stringify({ workflow: { projectLog } })}\n`,
    'utf8',
  );
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

async function writeMarkerTemplate(
  templateRoot: string,
  name: string,
  marker: string,
): Promise<void> {
  await mkdir(templateRoot, { recursive: true });
  await writeFile(
    join(templateRoot, name),
    [
      '---',
      'oat_template: true',
      `oat_template_name: ${name.replace('.md', '')}`,
      '---',
      '',
      `# {Project Name} ${marker}`,
      'Date: YYYY-MM-DD',
    ].join('\n'),
    'utf8',
  );
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

  it('scaffolds local projects without creating a branch commit', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    initGitRepo(repoRoot);
    await writeFile(join(repoRoot, 'README.md'), '# fixture\n', 'utf8');
    execFileSync('git', ['add', 'README.md'], { cwd: repoRoot });
    execFileSync('git', ['commit', '-q', '-m', 'initial'], { cwd: repoRoot });
    const before = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();

    const result = await scaffoldProjectImpl({
      repoRoot,
      projectName: 'local-project',
      scope: 'local',
      commit: true,
      refreshDashboard: false,
      setActive: false,
    });

    expect(result.scope).toBe('local');
    expect(result.projectPath).toBe('.oat/projects/local/local-project');
    expect(result.committed).toBe(false);
    expect(
      execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: repoRoot,
        encoding: 'utf8',
      }).trim(),
    ).toBe(before);
  });

  it('publishes a synced scaffold without running inherited synced-worktree hooks', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    await installSyncedWorktreeRejectingHooks(fixture.cloneA, [
      'post-checkout',
      'pre-commit',
      'pre-push',
    ]);

    const result = await scaffoldProjectImpl({
      repoRoot: fixture.cloneA,
      projectName: 'synced-project',
      scope: 'synced',
      commit: true,
      refreshDashboard: false,
      setActive: true,
      nowUtc: '2026-08-27T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      scope: 'synced',
      projectPath: '.oat/projects/synced/synced-project',
      ref: 'refs/oat/projects/synced-project',
      committed: true,
      commitStatus: 'committed',
    });
    expect(result.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(
      execFileSync(
        'git',
        [
          'ls-tree',
          '--name-only',
          'HEAD',
          '.oat/projects/synced/synced-project.json',
        ],
        { cwd: fixture.cloneA, encoding: 'utf8' },
      ).trim(),
    ).toBe('.oat/projects/synced/synced-project.json');
    expect(
      execFileSync('git', ['status', '--porcelain'], {
        cwd: fixture.cloneA,
        encoding: 'utf8',
      }).trim(),
    ).toBe('');
    expect(
      execFileSync(
        'git',
        ['show', 'refs/oat/projects/synced-project:state.md'],
        { cwd: fixture.originDir, encoding: 'utf8' },
      ),
    ).toContain('oat_workflow_mode: spec-driven');
  });

  it('uses canonical filesystem paths with an absolute in-repo projects root in every scope', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    const absoluteSharedRoot = join(
      fixture.cloneA,
      '.oat',
      'absolute-projects',
      'shared',
    );
    const env = { OAT_PROJECTS_ROOT: absoluteSharedRoot };
    const gitignorePath = join(fixture.cloneA, '.gitignore');
    await writeFile(
      gitignorePath,
      `${await readFile(gitignorePath, 'utf8')}/.oat/absolute-projects/local/**\n/.oat/absolute-projects/synced/*/\n`,
      'utf8',
    );
    execFileSync('git', ['add', '.gitignore'], { cwd: fixture.cloneA });
    execFileSync('git', ['commit', '-q', '-m', 'configure absolute roots'], {
      cwd: fixture.cloneA,
    });

    const shared = await scaffoldProjectImpl({
      repoRoot: fixture.cloneA,
      projectName: 'absolute-shared',
      scope: 'shared',
      env,
      commit: true,
      refreshDashboard: false,
      setActive: false,
    });
    const local = await scaffoldProjectImpl({
      repoRoot: fixture.cloneA,
      projectName: 'absolute-local',
      scope: 'local',
      env,
      commit: true,
      refreshDashboard: false,
      setActive: false,
    });
    const synced = await scaffoldProjectImpl({
      repoRoot: fixture.cloneA,
      projectName: 'absolute-synced',
      scope: 'synced',
      env,
      commit: true,
      refreshDashboard: false,
      setActive: false,
    });

    expect(shared.projectPath).toBe(
      '.oat/absolute-projects/shared/absolute-shared',
    );
    expect(local.projectPath).toBe(
      '.oat/absolute-projects/local/absolute-local',
    );
    expect(synced.projectPath).toBe(
      '.oat/absolute-projects/synced/absolute-synced',
    );
    for (const path of [
      shared.projectPath,
      local.projectPath,
      synced.projectPath,
    ]) {
      await expect(
        readFile(join(fixture.cloneA, path, 'state.md'), 'utf8'),
      ).resolves.toContain('oat_workflow_mode: spec-driven');
      expect(
        (await stat(join(fixture.cloneA, path, 'reviews'))).isDirectory(),
      ).toBe(true);
      expect((await stat(join(fixture.cloneA, path, 'pr'))).isDirectory()).toBe(
        true,
      );
    }
    const remoteFiles = execFileSync(
      'git',
      ['ls-tree', '-r', '--name-only', 'refs/oat/projects/absolute-synced'],
      { cwd: fixture.originDir, encoding: 'utf8' },
    ).trim();
    expect(remoteFiles).toContain('state.md');
    expect(remoteFiles).toContain('implementation.md');
    expect(
      execFileSync(
        'git',
        ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'],
        { cwd: fixture.cloneA, encoding: 'utf8' },
      ).trim(),
    ).toBe('.oat/absolute-projects/synced/absolute-synced.json');
    expect(
      execFileSync('git', ['status', '--porcelain'], {
        cwd: fixture.cloneA,
        encoding: 'utf8',
      }).trim(),
    ).toBe('');
  });

  it('rolls back invocation-owned worktree/ref and a self-healed gitignore on render failure', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    execFileSync('git', ['rm', '-q', '.gitignore'], { cwd: fixture.cloneA });
    execFileSync('git', ['commit', '-q', '-m', 'remove gitignore'], {
      cwd: fixture.cloneA,
    });
    const home = await mkdtemp(join(tmpdir(), 'oat-bad-template-'));
    tempDirs.push(home);
    await writeMarkerTemplate(
      join(home, '.oat', 'templates'),
      'state.md',
      '{OAT_UNRESOLVED}',
    );

    await expect(
      scaffoldProjectImpl({
        repoRoot: fixture.cloneA,
        projectName: 'render-failure',
        scope: 'synced',
        home,
        refreshDashboard: false,
        setActive: false,
      }),
    ).rejects.toThrow(/unresolved OAT placeholder/i);

    await expect(
      readFile(join(fixture.cloneA, '.gitignore'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(() =>
      execFileSync(
        'git',
        ['show-ref', '--verify', '--quiet', 'refs/oat/projects/render-failure'],
        { cwd: fixture.cloneA, stdio: 'ignore' },
      ),
    ).toThrow();
    expect(
      execFileSync('git', ['worktree', 'list', '--porcelain'], {
        cwd: fixture.cloneA,
        encoding: 'utf8',
      }),
    ).not.toContain('render-failure');
    expect(
      execFileSync('git', ['status', '--porcelain'], {
        cwd: fixture.cloneA,
        encoding: 'utf8',
      }).trim(),
    ).toBe('');
  });

  it('rolls back an invocation-owned worktree/ref after a template write failure', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);

    await expect(
      scaffoldProjectImpl(
        {
          repoRoot: fixture.cloneA,
          projectName: 'write-failure',
          scope: 'synced',
          refreshDashboard: false,
          setActive: false,
        },
        {
          createSyncedProject: async (target, runner) => {
            await createSyncedProject(target, runner);
            await mkdir(join(target.projectPath, 'state.md'));
          },
        },
      ),
    ).rejects.toThrow();

    expect(() =>
      execFileSync(
        'git',
        ['show-ref', '--verify', '--quiet', 'refs/oat/projects/write-failure'],
        { cwd: fixture.cloneA, stdio: 'ignore' },
      ),
    ).toThrow();
  });

  it('rolls back invocation-owned local resources when the first push is rejected', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);

    await expect(
      scaffoldProjectImpl(
        {
          repoRoot: fixture.cloneA,
          projectName: 'push-failure',
          scope: 'synced',
          refreshDashboard: false,
          setActive: false,
        },
        {
          pushSynced: async () => ({
            status: 'rejected',
            sha: 'a'.repeat(40),
          }),
        },
      ),
    ).rejects.toThrow(/rejected/);

    expect(() =>
      execFileSync(
        'git',
        ['show-ref', '--verify', '--quiet', 'refs/oat/projects/push-failure'],
        { cwd: fixture.cloneA, stdio: 'ignore' },
      ),
    ).toThrow();
  });

  it('preserves a published checkout and gives pull-based recovery when record write fails', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);

    await expect(
      scaffoldProjectImpl(
        {
          repoRoot: fixture.cloneA,
          projectName: 'record-write-failure',
          scope: 'synced',
          refreshDashboard: false,
          setActive: false,
        },
        {
          writeSyncedRecord: async () => {
            throw new Error('record disk failure');
          },
        },
      ),
    ).rejects.toThrow(
      /oat project pull 'record-write-failure'.*do not rerun project creation/i,
    );

    expect(
      execFileSync(
        'git',
        ['rev-parse', 'refs/oat/projects/record-write-failure'],
        { cwd: fixture.originDir, encoding: 'utf8' },
      ).trim(),
    ).toMatch(/^[0-9a-f]{40}$/);
    expect(
      execFileSync('git', ['worktree', 'list', '--porcelain'], {
        cwd: fixture.cloneA,
        encoding: 'utf8',
      }),
    ).toContain('record-write-failure');
  });

  it('preserves published state and gives exact parent commit recovery when record commit fails', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);

    await expect(
      scaffoldProjectImpl(
        {
          repoRoot: fixture.cloneA,
          projectName: 'record-commit-failure',
          scope: 'synced',
          commit: true,
          refreshDashboard: false,
          setActive: false,
        },
        {
          commitRecordChange: async () => {
            throw new Error('parent commit failure');
          },
        },
      ),
    ).rejects.toThrow(
      /git add -- '.oat\/projects\/synced\/record-commit-failure.json'.*do not rerun project creation/i,
    );

    await expect(
      readFile(
        join(fixture.cloneA, '.oat/projects/synced/record-commit-failure.json'),
        'utf8',
      ),
    ).resolves.toContain('record-commit-failure');
    expect(
      execFileSync('git', ['worktree', 'list', '--porcelain'], {
        cwd: fixture.cloneA,
        encoding: 'utf8',
      }),
    ).toContain('record-commit-failure');
  });

  it('preserves published state and recovers an active-pointer failure through project open', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    const duplicateSharedRoot = join(
      fixture.cloneA,
      '.oat/projects/shared/pointer-failure',
    );
    await mkdir(duplicateSharedRoot, { recursive: true });
    await writeFile(
      join(duplicateSharedRoot, 'state.md'),
      '---\noat_phase: plan\noat_phase_status: complete\noat_lifecycle: active\n---\n',
      'utf8',
    );

    await expect(
      scaffoldProjectImpl(
        {
          repoRoot: fixture.cloneA,
          projectName: 'pointer-failure',
          scope: 'synced',
          refreshDashboard: false,
          setActive: true,
        },
        {
          setActiveProject: async () => {
            throw new Error('pointer disk failure');
          },
        },
      ),
    ).rejects.toThrow(
      /oat project open '\.oat\/projects\/synced\/pointer-failure'.*do not rerun project creation/i,
    );

    expect(
      execFileSync('git', ['rev-parse', 'refs/oat/projects/pointer-failure'], {
        cwd: fixture.originDir,
        encoding: 'utf8',
      }).trim(),
    ).toMatch(/^[0-9a-f]{40}$/);
    await expect(
      readFile(
        join(fixture.cloneA, '.oat/projects/synced/pointer-failure.json'),
        'utf8',
      ),
    ).resolves.toContain('pointer-failure');

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const capture = createLoggerCapture();
    const open = createProjectOpenCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: options.json ?? false,
        cwd: fixture.cloneA,
        home: '/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => fixture.cloneA,
      generateStateDashboard: async () => ({
        dashboardPath: join(fixture.cloneA, '.oat/state.md'),
        projectName: 'pointer-failure',
        projectStatus: 'active',
        stalenessStatus: 'fresh',
        recommendedStep: '',
        recommendedReason: '',
      }),
    });
    const program = new Command().name('oat').exitOverride();
    const project = new Command('project');
    project.addCommand(open);
    program.addCommand(project);

    await program.parseAsync(
      ['project', 'open', '.oat/projects/synced/pointer-failure'],
      { from: 'user' },
    );

    const config = JSON.parse(
      await readFile(join(fixture.cloneA, '.oat/config.local.json'), 'utf8'),
    ) as { activeProject: string };
    expect(config.activeProject).toBe('.oat/projects/synced/pointer-failure');
    expect(process.exitCode).toBe(0);
    process.exitCode = previousExitCode;
  });

  it('rejects synced scaffolding without origin before creating state', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    initGitRepo(repoRoot);

    await expect(
      scaffoldProjectImpl({
        repoRoot,
        projectName: 'no-origin',
        scope: 'synced',
        refreshDashboard: false,
      }),
    ).rejects.toThrow('--scope local');
    await expect(
      readFile(
        join(repoRoot, '.oat', 'projects', 'synced', 'no-origin', 'state.md'),
        'utf8',
      ),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('uses a user template before a differing repo template', async () => {
    const repoRoot = await createRepoRoot();
    const home = await mkdtemp(join(tmpdir(), 'oat-scaffold-home-'));
    tempDirs.push(repoRoot, home);
    await writeMarkerTemplate(
      join(repoRoot, '.oat', 'templates'),
      'plan.md',
      'REPO-TEMPLATE',
    );
    await writeMarkerTemplate(
      join(home, '.oat', 'templates'),
      'plan.md',
      'USER-TEMPLATE',
    );

    await scaffoldProject({
      repoRoot,
      projectName: 'user-first',
      mode: 'quick',
      home,
      refreshDashboard: false,
      setActive: false,
      today: '2026-07-13',
    });

    const plan = await readFile(
      join(repoRoot, '.oat', 'projects', 'shared', 'user-first', 'plan.md'),
      'utf8',
    );
    expect(plan).toContain('USER-TEMPLATE');
    expect(plan).not.toContain('REPO-TEMPLATE');
  });

  it('uses the repo template when no user template is installed', async () => {
    const repoRoot = await createRepoRoot();
    const home = await mkdtemp(join(tmpdir(), 'oat-scaffold-home-'));
    tempDirs.push(repoRoot, home);
    await writeMarkerTemplate(
      join(repoRoot, '.oat', 'templates'),
      'plan.md',
      'REPO-TEMPLATE',
    );

    await scaffoldProject({
      repoRoot,
      projectName: 'repo-fallback',
      mode: 'quick',
      home,
      refreshDashboard: false,
      setActive: false,
      today: '2026-07-13',
    });

    await expect(
      readFile(
        join(
          repoRoot,
          '.oat',
          'projects',
          'shared',
          'repo-fallback',
          'plan.md',
        ),
        'utf8',
      ),
    ).resolves.toContain('REPO-TEMPLATE');
  });

  it('uses bundled templates when neither installed tier exists', async () => {
    const repoRoot = await createRepoRoot();
    const home = await mkdtemp(join(tmpdir(), 'oat-scaffold-home-'));
    tempDirs.push(repoRoot, home);
    await rm(join(repoRoot, '.oat', 'templates'), {
      recursive: true,
      force: true,
    });

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'bundled-floor',
      mode: 'quick',
      home,
      refreshDashboard: false,
      setActive: false,
      today: '2026-07-13',
    });

    expect(result.projectPath).toBe('.oat/projects/shared/bundled-floor');
    await expect(
      readFile(join(repoRoot, result.projectPath, 'plan.md'), 'utf8'),
    ).resolves.toContain('# Implementation Plan: bundled-floor');
  });

  it('resolves partial template tiers independently for every file', async () => {
    const repoRoot = await createRepoRoot();
    const home = await mkdtemp(join(tmpdir(), 'oat-scaffold-home-'));
    tempDirs.push(repoRoot, home);
    const repoTemplates = join(repoRoot, '.oat', 'templates');
    await writeMarkerTemplate(repoTemplates, 'plan.md', 'REPO-PLAN');
    await writeMarkerTemplate(repoTemplates, 'discovery.md', 'REPO-DISCOVERY');
    await writeMarkerTemplate(
      join(home, '.oat', 'templates'),
      'plan.md',
      'USER-PLAN',
    );
    await rm(join(repoTemplates, 'state.md'), { force: true });
    await rm(join(repoTemplates, 'implementation.md'), { force: true });

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'partial-tiers',
      mode: 'quick',
      home,
      refreshDashboard: false,
      setActive: false,
      today: '2026-07-13',
    });
    const projectRoot = join(repoRoot, result.projectPath);

    await expect(
      readFile(join(projectRoot, 'plan.md'), 'utf8'),
    ).resolves.toContain('USER-PLAN');
    await expect(
      readFile(join(projectRoot, 'discovery.md'), 'utf8'),
    ).resolves.toContain('REPO-DISCOVERY');
    await expect(
      readFile(join(projectRoot, 'state.md'), 'utf8'),
    ).resolves.toContain('# Project State: partial-tiers');
    await expect(
      readFile(join(projectRoot, 'implementation.md'), 'utf8'),
    ).resolves.toContain('# Implementation: partial-tiers');
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

  it('creates project-log.md from the real repo template when forced on', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    await setProjectLogConfig(repoRoot, false);

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'forced-log',
      mode: 'quick',
      projectLog: true,
      refreshDashboard: false,
      setActive: false,
      today: '2026-07-17',
    });

    const actual = await readFile(
      join(repoRoot, result.projectPath, 'project-log.md'),
      'utf8',
    );
    const realTemplate = await readFile(
      join(REPO_ROOT, '.oat', 'templates', 'project-log.md'),
      'utf8',
    );
    expect(actual).toBe(
      instantiateProjectLogTemplate(realTemplate, 'forced-log', '2026-07-17'),
    );
    expect(result.createdFiles).toContain('project-log.md');
  });

  it('suppresses project-log.md when forced off', async () => {
    const repoRoot = await createRepoRoot();
    tempDirs.push(repoRoot);
    await setProjectLogConfig(repoRoot, true);

    const result = await scaffoldProject({
      repoRoot,
      projectName: 'suppressed-log',
      mode: 'quick',
      projectLog: false,
      refreshDashboard: false,
      setActive: false,
      today: '2026-07-17',
    });

    await expect(
      readFile(join(repoRoot, result.projectPath, 'project-log.md'), 'utf8'),
    ).rejects.toThrow();
    expect(result.createdFiles).not.toContain('project-log.md');
  });

  it.each([
    { projectLog: true as const, createsLog: true },
    { projectLog: 'auto' as const, createsLog: false },
    { projectLog: false as const, createsLog: false },
  ])(
    'uses workflow.projectLog=$projectLog for default scaffold behavior',
    async ({ projectLog, createsLog }) => {
      const repoRoot = await createRepoRoot();
      tempDirs.push(repoRoot);
      await setProjectLogConfig(repoRoot, projectLog);

      const result = await scaffoldProject({
        repoRoot,
        projectName: `config-${String(projectLog)}`,
        mode: 'quick',
        refreshDashboard: false,
        setActive: false,
        today: '2026-07-17',
      });
      const logPath = join(repoRoot, result.projectPath, 'project-log.md');

      if (createsLog) {
        await expect(readFile(logPath, 'utf8')).resolves.toContain(
          `# Project Log: config-${String(projectLog)}`,
        );
        expect(result.createdFiles).toContain('project-log.md');
      } else {
        await expect(readFile(logPath, 'utf8')).rejects.toThrow();
        expect(result.createdFiles).not.toContain('project-log.md');
      }
    },
  );

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

  it('permits non-TDD task bodies while preserving plan invariants', async () => {
    const planTemplate = await readFile(
      join(REPO_ROOT, '.oat', 'templates', 'plan.md'),
      'utf8',
    );

    expect(planTemplate).toMatch(
      /RED\/GREEN\/Refactor[\s\S]*recommended default[\s\S]*not a validator requirement/i,
    );
    expect(planTemplate).toMatch(
      /other task-body shapes[\s\S]*allowed when appropriate/i,
    );
    expect(planTemplate).toMatch(/non-TDD shapes/i);
    expect(planTemplate).toContain('stable `pNN-tNN` IDs');
    expect(planTemplate).toContain('per-task verification');
    expect(planTemplate).toContain('atomic commits');
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
