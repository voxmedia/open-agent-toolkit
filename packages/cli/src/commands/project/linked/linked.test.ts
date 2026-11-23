import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseProjectLogEntries } from '@commands/project/log/check';
import { git, runOat } from '@test-support/run-oat';
import { createSyncedFixture } from '@test-support/synced-fixture';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { parseLinkedProjects } from './ledger';

type Scope = 'shared' | 'local' | 'synced';

function frontmatter(content: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  return YAML.parse(match?.[1] ?? '') as Record<string, unknown>;
}

function projectDir(root: string, scope: Scope, name: string): string {
  return join(root, '.oat', 'projects', scope, name);
}

async function ledgerOf(root: string, scope: Scope, name: string) {
  return parseLinkedProjects(
    await readFile(
      join(projectDir(root, scope, name), 'linked-projects.md'),
      'utf8',
    ),
  );
}

describe('freestyle linked projects', () => {
  const tempDirs: string[] = [];
  let previousHome: string | undefined;

  beforeEach(async () => {
    previousHome = process.env.HOME;
    const home = await mkdtemp(join(tmpdir(), 'oat-linked-home-'));
    tempDirs.push(home);
    process.env.HOME = home;
  });

  afterEach(async () => {
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  /** A repository with an origin, so every scope can be created. */
  async function repo(): Promise<{ root: string; originDir: string }> {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    return { root: fixture.cloneA, originDir: fixture.originDir };
  }

  async function newProject(
    root: string,
    name: string,
    scope: Scope,
    extra: string[] = [],
  ) {
    return runOat(root, [
      'project',
      'new',
      name,
      '--mode',
      'freestyle',
      '--scope',
      scope,
      '--no-dashboard',
      ...extra,
    ]);
  }

  async function newParent(
    root: string,
    scope: Scope,
    extra: string[] = [],
  ): Promise<string> {
    const result = await newProject(root, 'parent', scope, extra);
    expect(result.exitCode, result.stderr).toBe(0);
    return projectDir(root, scope, 'parent');
  }

  async function disableProjectLog(root: string): Promise<void> {
    const path = join(root, '.oat', 'config.local.json');
    const config = JSON.parse(await readFile(path, 'utf8')) as Record<
      string,
      unknown
    >;
    await writeFile(
      path,
      `${JSON.stringify({ ...config, workflow: { projectLog: false } })}\n`,
      'utf8',
    );
  }

  describe.each<Scope>(['shared', 'local', 'synced'])(
    'with the parent in %s scope',
    (parentScope) => {
      it('creates a linked child, flags the open row in status until linked ack, and commits nothing for the parent', async () => {
        const { root, originDir } = await repo();
        await newParent(root, parentScope);
        const parentPath = `.oat/projects/${parentScope}/parent`;
        // The parent has decided something; its child still starts empty.
        const parentDecisions = join(
          projectDir(root, parentScope, 'parent'),
          'decisions.md',
        );
        const parentDecided = (await readFile(parentDecisions, 'utf8')).replace(
          '## Live\n\n_None yet._',
          '## Live\n\n### dr01 · Import CSV before JSON\n\n- Date: 2026-11-22\n- Source: the user',
        );
        await writeFile(parentDecisions, parentDecided, 'utf8');
        const headBefore = git(root, ['rev-parse', 'HEAD']);
        const publishedBefore =
          parentScope === 'synced'
            ? git(originDir, ['rev-parse', 'refs/oat/projects/parent'])
            : undefined;

        const created = await runOat(
          root,
          [
            'project',
            'new',
            'child',
            '--mode',
            'freestyle',
            '--scope',
            'shared',
            '--no-dashboard',
            '--link-to',
            'parent',
            '--purpose',
            'Build the importer',
          ],
          ['--json'],
        );
        expect(created.exitCode, created.stderr).toBe(0);
        expect(JSON.parse(created.stdout)).toMatchObject({
          status: 'ok',
          orchestratorBranch: null,
          linkedTo: {
            project: 'parent',
            projectPath: parentPath,
            ledgerPath: `${parentPath}/linked-projects.md`,
          },
        });

        // The parent's checkout keeps the parent as its active project.
        expect(
          JSON.parse(
            await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
          ).activeProject,
        ).toBe(parentPath);

        const childState = frontmatter(
          await readFile(
            join(projectDir(root, 'shared', 'child'), 'state.md'),
            'utf8',
          ),
        );
        expect(childState).toMatchObject({
          oat_workflow_mode: 'freestyle',
          oat_orchestrator_branch: '',
          oat_linked_from: 'parent',
        });

        // The child's decisions and memories start as the empty templates.
        for (const file of ['decisions.md', 'memories.md']) {
          expect(
            await readFile(
              join(projectDir(root, 'shared', 'child'), file),
              'utf8',
            ),
            file,
          ).toBe(
            await readFile(
              join(process.cwd(), '..', '..', '.oat', 'templates', file),
              'utf8',
            ),
          );
        }
        expect(await readFile(parentDecisions, 'utf8')).toBe(parentDecided);

        const ledger = await ledgerOf(root, parentScope, 'parent');
        expect(ledger.open).toEqual([
          {
            name: 'child',
            path: '.oat/projects/shared/child',
            scope: 'shared',
            purpose: 'Build the importer',
            linked: new Date().toISOString().slice(0, 10),
          },
        ]);
        expect(ledger.closed).toEqual([]);

        // Only the child's own scaffold is committed; the parent's row waits
        // for the parent's orchestrator to save it.
        expect(
          git(root, ['show', '--name-only', '--format=', 'HEAD'])
            .split('\n')
            .sort(),
        ).toEqual(
          [
            'AGENTS.md',
            'decisions.md',
            'memories.md',
            'shape.md',
            'state.md',
          ].map((file) => `.oat/projects/shared/child/${file}`),
        );
        expect(git(root, ['rev-list', '--count', `${headBefore}..HEAD`])).toBe(
          '1',
        );
        if (parentScope === 'shared') {
          expect(
            git(root, ['status', '--porcelain', '--', parentPath]),
          ).toContain('linked-projects.md');
        }
        if (parentScope === 'synced') {
          expect(
            git(originDir, ['rev-parse', 'refs/oat/projects/parent']),
          ).toBe(publishedBefore);
        }

        const flagged = await runOat(root, [
          'project',
          'status',
          '--project-path',
          parentPath,
        ]);
        expect(flagged.stdout).toContain(
          `Open linked project: child (shared, .oat/projects/shared/child): Build the importer; after reading its records, acknowledge with \`oat project linked ack child --project ${parentPath}\``,
        );

        const acked = await runOat(
          root,
          ['project', 'linked', 'ack', 'child', '--project', 'parent'],
          ['--json'],
        );
        expect(acked.exitCode, acked.stderr).toBe(0);
        expect(JSON.parse(acked.stdout)).toMatchObject({
          status: 'ok',
          parent: 'parent',
          row: { name: 'child', acknowledged: expect.any(String) },
        });
        const after = await ledgerOf(root, parentScope, 'parent');
        expect(after.open).toEqual([]);
        expect(after.closed.map((row) => row.name)).toEqual(['child']);

        const cleared = await runOat(
          root,
          ['project', 'status', '--project-path', parentPath],
          ['--json'],
        );
        expect(JSON.parse(cleared.stdout)).toMatchObject({
          linkedProjects: { open: [] },
        });
      });

      it('links an existing freestyle project with linked add, writing only the parent row', async () => {
        const { root } = await repo();
        await newParent(root, parentScope);
        expect((await newProject(root, 'existing', 'local')).exitCode).toBe(0);
        const existingState = await readFile(
          join(projectDir(root, 'local', 'existing'), 'state.md'),
          'utf8',
        );

        const added = await runOat(root, [
          'project',
          'linked',
          'add',
          'existing',
          '--project',
          `.oat/projects/${parentScope}/parent`,
          '--purpose',
          'Spun-off migration',
        ]);
        expect(added.exitCode, added.stderr).toBe(0);
        expect(added.stdout).toContain(
          'Linked existing (local, .oat/projects/local/existing) to parent',
        );
        expect((await ledgerOf(root, parentScope, 'parent')).open).toEqual([
          expect.objectContaining({
            name: 'existing',
            path: '.oat/projects/local/existing',
            scope: 'local',
            purpose: 'Spun-off migration',
          }),
        ]);
        expect(
          await readFile(
            join(projectDir(root, 'local', 'existing'), 'state.md'),
            'utf8',
          ),
        ).toBe(existingState);

        const again = await runOat(root, [
          'project',
          'linked',
          'add',
          'existing',
          '--project',
          'parent',
          '--purpose',
          'twice',
        ]);
        expect(again.exitCode).toBe(1);
        expect(again.stderr).toContain(
          'Project parent already has an open link to existing.',
        );
      });

      it('writes a structural log entry naming the child as source project when the log exists', async () => {
        const { root } = await repo();
        const parentDir = await newParent(root, parentScope, [
          '--with-project-log',
        ]);
        expect((await newProject(root, 'child', 'shared')).exitCode).toBe(0);
        await runOat(root, [
          'project',
          'linked',
          'add',
          'child',
          '--project',
          'parent',
          '--purpose',
          'Importer',
        ]);

        const acked = await runOat(root, [
          'project',
          'linked',
          'ack',
          'child',
          '--project',
          'parent',
        ]);
        expect(acked.exitCode, acked.stderr).toBe(0);
        expect(acked.stdout).toMatch(
          /Project log: appended \(### \d{4}-\d{2}-\d{2} · structural · oat-project-linked · child\)/,
        );
        const entries = parseProjectLogEntries(
          await readFile(join(parentDir, 'project-log.md'), 'utf8'),
        ).entries;
        expect(entries.at(-1)).toMatchObject({
          class: 'structural',
          producer: 'oat-project-linked',
          ref: 'child',
          sourceProject: 'child',
          time: expect.stringMatching(/^\d{2}:\d{2}:\d{2}Z$/),
        });
      });

      it('closes the row and leaves the log absent with workflow.projectLog false and no log file', async () => {
        const { root } = await repo();
        const parentDir = await newParent(root, parentScope, [
          '--no-project-log',
        ]);
        expect((await newProject(root, 'child', 'shared')).exitCode).toBe(0);
        await runOat(root, [
          'project',
          'linked',
          'add',
          'child',
          '--project',
          'parent',
          '--purpose',
          'Importer',
        ]);
        await disableProjectLog(root);

        const acked = await runOat(
          root,
          ['project', 'linked', 'ack', 'child', '--project', 'parent'],
          ['--json'],
        );
        expect(acked.exitCode, acked.stderr).toBe(0);
        expect(JSON.parse(acked.stdout)).toMatchObject({
          log: { status: 'skipped', reason: 'projectLog=false' },
        });
        expect((await ledgerOf(root, parentScope, 'parent')).open).toEqual([]);
        expect(existsSync(join(parentDir, 'project-log.md'))).toBe(false);
      });
    },
  );

  describe.each<Scope>(['shared', 'synced'])(
    'the orchestrator-branch guard on a %s parent',
    (parentScope) => {
      async function guardedCommands(root: string) {
        return {
          create: await newProject(root, 'guarded-child', 'shared', [
            '--link-to',
            'parent',
            '--purpose',
            'Guarded',
          ]),
          add: await runOat(root, [
            'project',
            'linked',
            'add',
            'existing',
            '--project',
            'parent',
            '--purpose',
            'Guarded',
          ]),
          ack: await runOat(root, [
            'project',
            'linked',
            'ack',
            'acked',
            '--project',
            'parent',
          ]),
        };
      }

      async function seed(root: string): Promise<string> {
        const parentDir = await newParent(root, parentScope);
        expect((await newProject(root, 'existing', 'shared')).exitCode).toBe(0);
        expect((await newProject(root, 'acked', 'shared')).exitCode).toBe(0);
        const added = await runOat(root, [
          'project',
          'linked',
          'add',
          'acked',
          '--project',
          'parent',
          '--purpose',
          'To acknowledge',
        ]);
        expect(added.exitCode, added.stderr).toBe(0);
        return parentDir;
      }

      it('refuses every guarded command off the recorded branch, writing nothing', async () => {
        const { root } = await repo();
        const parentDir = await seed(root);
        const ledgerBefore = await readFile(
          join(parentDir, 'linked-projects.md'),
          'utf8',
        );
        git(root, ['checkout', '-q', '-b', 'lane/l01']);

        const { create, add, ack } = await guardedCommands(root);
        for (const [name, result] of Object.entries({ create, add, ack })) {
          expect(result.exitCode, name).toBe(1);
          expect(result.stderr, name).toContain(
            "this checkout is on branch lane/l01, but project parent's orchestrator branch is main. Only its orchestrator writes its records",
          );
        }
        expect(existsSync(projectDir(root, 'shared', 'guarded-child'))).toBe(
          false,
        );
        expect(
          await readFile(join(parentDir, 'linked-projects.md'), 'utf8'),
        ).toBe(ledgerBefore);
      });

      it('refuses on a detached HEAD', async () => {
        const { root } = await repo();
        await seed(root);
        git(root, ['checkout', '-q', '--detach']);
        const { create, add, ack } = await guardedCommands(root);
        for (const result of [create, add, ack]) {
          expect(result.exitCode).toBe(1);
          expect(result.stderr).toContain(
            'this checkout is on a detached HEAD',
          );
        }
      });

      it('refuses every guarded command while the parent is unclaimed', async () => {
        const { root } = await repo();
        const parentDir = await seed(root);
        const statePath = join(parentDir, 'state.md');
        await writeFile(
          statePath,
          (await readFile(statePath, 'utf8')).replace(
            /^oat_orchestrator_branch: .*$/m,
            "oat_orchestrator_branch: ''",
          ),
          'utf8',
        );
        const ledgerBefore = await readFile(
          join(parentDir, 'linked-projects.md'),
          'utf8',
        );

        const { create, add, ack } = await guardedCommands(root);
        for (const [name, result] of Object.entries({ create, add, ack })) {
          expect(result.exitCode, name).toBe(1);
          expect(result.stderr, name).toContain(
            `project parent is unclaimed (oat_orchestrator_branch is empty or absent). The session designated as its orchestrator runs \`oat project orchestrator set --project .oat/projects/${parentScope}/parent\` first.`,
          );
        }
        expect(existsSync(projectDir(root, 'shared', 'guarded-child'))).toBe(
          false,
        );
        expect(
          await readFile(join(parentDir, 'linked-projects.md'), 'utf8'),
        ).toBe(ledgerBefore);
      });

      it('runs every guarded command on the recorded branch', async () => {
        const { root } = await repo();
        await seed(root);
        const { create, add, ack } = await guardedCommands(root);
        for (const [name, result] of Object.entries({ create, add, ack })) {
          expect(result.exitCode, `${name}: ${result.stderr}`).toBe(0);
        }
      });
    },
  );

  describe('other modes', () => {
    it('refuses --link-to without --mode freestyle before any write', async () => {
      const { root } = await repo();
      await newParent(root, 'shared');
      const result = await runOat(root, [
        'project',
        'new',
        'quick-child',
        '--mode',
        'quick',
        '--scope',
        'shared',
        '--no-dashboard',
        '--link-to',
        'parent',
        '--purpose',
        'x',
      ]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--link-to creates a freestyle child');
      expect(existsSync(projectDir(root, 'shared', 'quick-child'))).toBe(false);
    });

    it('refuses a quick parent and a quick child, and leaves a plain new unchanged', async () => {
      const { root } = await repo();
      await newParent(root, 'shared');
      const quick = await runOat(root, [
        'project',
        'new',
        'quick-one',
        '--mode',
        'quick',
        '--scope',
        'shared',
        '--no-dashboard',
      ]);
      expect(quick.exitCode).toBe(0);
      expect(
        existsSync(
          join(projectDir(root, 'shared', 'quick-one'), 'linked-projects.md'),
        ),
      ).toBe(false);

      const quickChild = await runOat(root, [
        'project',
        'linked',
        'add',
        'quick-one',
        '--project',
        'parent',
        '--purpose',
        'x',
      ]);
      expect(quickChild.exitCode).toBe(1);
      expect(quickChild.stderr).toContain(
        'Project quick-one is not a freestyle project',
      );

      const quickParent = await runOat(root, [
        'project',
        'new',
        'orphan',
        '--mode',
        'freestyle',
        '--scope',
        'shared',
        '--no-dashboard',
        '--link-to',
        'quick-one',
        '--purpose',
        'x',
      ]);
      expect(quickParent.exitCode).toBe(1);
      expect(quickParent.stderr).toContain(
        'Project quick-one is not a freestyle project',
      );
      expect(existsSync(projectDir(root, 'shared', 'orphan'))).toBe(false);
    });

    it('refuses --purpose without --link-to', async () => {
      const { root } = await repo();
      const result = await newProject(root, 'lonely', 'shared', [
        '--purpose',
        'x',
      ]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--purpose is only used with --link-to.');
    });
  });

  it('refuses new --link-to for a name that is already a project, naming linked add, before any write', async () => {
    const { root } = await repo();
    const parentDir = await newParent(root, 'shared');
    expect((await newProject(root, 'existing', 'shared')).exitCode).toBe(0);
    const ledgerPath = join(parentDir, 'linked-projects.md');
    const ledgerBefore = existsSync(ledgerPath)
      ? await readFile(ledgerPath, 'utf8')
      : null;
    const statePath = join(projectDir(root, 'shared', 'existing'), 'state.md');
    const stateBefore = await readFile(statePath, 'utf8');

    const result = await runOat(root, [
      'project',
      'new',
      'existing',
      '--mode',
      'freestyle',
      '--scope',
      'shared',
      '--no-dashboard',
      '--link-to',
      'parent',
      '--purpose',
      'Spun-off migration',
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      'Project existing already exists in shared scope',
    );
    expect(result.stderr).toContain(
      'oat project linked add existing --project .oat/projects/shared/parent --purpose <text>',
    );
    expect(
      existsSync(ledgerPath) ? await readFile(ledgerPath, 'utf8') : null,
    ).toBe(ledgerBefore);
    expect(await readFile(statePath, 'utf8')).toBe(stateBefore);
  });

  it('creates a linked child over a folder that holds only preparatory notes, keeping the notes', async () => {
    const { root } = await repo();
    await newParent(root, 'shared');
    const notesDir = join(projectDir(root, 'shared', 'noted'), 'references');
    await mkdir(notesDir, { recursive: true });
    await writeFile(join(notesDir, 'lane-brief.md'), '# Brief\n', 'utf8');

    const result = await newProject(root, 'noted', 'shared', [
      '--link-to',
      'parent',
      '--purpose',
      'Pick up the brief',
    ]);
    expect(result.exitCode, result.stderr).toBe(0);
    expect(
      existsSync(join(projectDir(root, 'shared', 'noted'), 'state.md')),
    ).toBe(true);
    expect(await readFile(join(notesDir, 'lane-brief.md'), 'utf8')).toBe(
      '# Brief\n',
    );
  });

  it('hands off a linked child with a claim command that names the child, which claims it from the parent checkout', async () => {
    const { root } = await repo();
    const parentDir = await newParent(root, 'shared');
    const parentState = await readFile(join(parentDir, 'state.md'), 'utf8');
    const created = await runOat(root, [
      'project',
      'new',
      'child',
      '--mode',
      'freestyle',
      '--scope',
      'local',
      '--no-dashboard',
      '--link-to',
      'parent',
      '--purpose',
      'Build the importer',
    ]);
    expect(created.exitCode, created.stderr).toBe(0);
    const handoff = /claims it with `oat (project orchestrator set[^`]*)`/.exec(
      created.stdout.split('\n').find((line) => line.startsWith('Next:')) ?? '',
    );
    expect(handoff?.[1]).toBe(
      'project orchestrator set --project .oat/projects/local/child',
    );

    // The parent stays the active project in this checkout, so only the
    // named child is claimed.
    const claimed = await runOat(root, handoff?.[1]?.split(' ') ?? []);
    expect(claimed.exitCode, claimed.stderr).toBe(0);
    expect(
      frontmatter(
        await readFile(
          join(projectDir(root, 'local', 'child'), 'state.md'),
          'utf8',
        ),
      ).oat_orchestrator_branch,
    ).toBe(git(root, ['branch', '--show-current']));
    expect(await readFile(join(parentDir, 'state.md'), 'utf8')).toBe(
      parentState,
    );
  });

  it('prints an ack command that closes the inspected parent row, not the active parent row', async () => {
    const { root } = await repo();
    expect((await newProject(root, 'child', 'shared')).exitCode).toBe(0);
    expect((await newProject(root, 'alpha', 'shared')).exitCode).toBe(0);
    // Created last, so beta is the active project.
    expect((await newProject(root, 'beta', 'shared')).exitCode).toBe(0);
    for (const parent of ['alpha', 'beta']) {
      const added = await runOat(root, [
        'project',
        'linked',
        'add',
        'child',
        '--project',
        parent,
        '--purpose',
        `Linked from ${parent}`,
      ]);
      expect(added.exitCode, added.stderr).toBe(0);
    }

    const status = await runOat(root, [
      'project',
      'status',
      '--project-path',
      '.oat/projects/shared/alpha',
    ]);
    const printed = /acknowledge with `oat (project linked ack [^`]+)`/.exec(
      status.stdout,
    );
    expect(printed?.[1]).toBe(
      'project linked ack child --project .oat/projects/shared/alpha',
    );

    const acked = await runOat(root, printed?.[1]?.split(' ') ?? []);
    expect(acked.exitCode, acked.stderr).toBe(0);
    expect((await ledgerOf(root, 'shared', 'alpha')).open).toEqual([]);
    expect(
      (await ledgerOf(root, 'shared', 'beta')).open.map((row) => row.name),
    ).toEqual(['child']);
  });

  it('says when the ledger cannot be read instead of showing no open links', async () => {
    const { root } = await repo();
    const parentDir = await newParent(root, 'shared');
    await writeFile(
      join(parentDir, 'linked-projects.md'),
      '# Linked projects\n\nhand-edited, sections removed\n',
      'utf8',
    );
    const status = await runOat(root, [
      'project',
      'status',
      '--project-path',
      '.oat/projects/shared/parent',
    ]);
    expect(status.stdout).toContain(
      'Linked projects: unreadable (linked-projects.md has no `## Open` section; restore it before linking.)',
    );
    expect((await newProject(root, 'sibling', 'shared')).exitCode).toBe(0);
    const add = await runOat(root, [
      'project',
      'linked',
      'add',
      'sibling',
      '--project',
      'parent',
      '--purpose',
      'x',
    ]);
    expect(add.exitCode).toBe(1);
    expect(add.stderr).toContain('has no `## Open` section');
  });

  it('refuses a parent that is synced but not pulled here, with the pull instruction', async () => {
    const { root } = await repo();
    await newParent(root, 'synced');
    // Remove the nested worktree; the tracked pointer remains.
    git(root, ['worktree', 'remove', '--force', '.oat/projects/synced/parent']);
    const result = await runOat(root, [
      'project',
      'linked',
      'ack',
      'child',
      '--project',
      'parent',
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      'Project parent is a synced project that is not pulled into this checkout. Run `oat project pull parent` first.',
    );
  });
});
