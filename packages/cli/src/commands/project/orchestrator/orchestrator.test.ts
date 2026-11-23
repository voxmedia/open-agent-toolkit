import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { git, initMainRepo, runOat } from '@test-support/run-oat';
import { createSyncedFixture } from '@test-support/synced-fixture';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { setOrchestratorBranch } from './set';

/** A `state.md` written by the m01 build: freestyle, with no branch field. */
const PRE_M02_STATE = `---
oat_workflow_mode: freestyle # OAT structure and records only: no lifecycle phase, gates, checkpoints or routing
oat_project_created: "2026-11-21T00:00:00.000Z" # ISO 8601 UTC timestamp — set once at project creation
oat_project_state_updated: "2026-11-21T00:00:00.000Z" # ISO 8601 UTC timestamp — updated on every state.md mutation
oat_generated: false
---

# Project State: legacy

**Started:** 2026-11-21
`;

function frontmatter(content: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  return YAML.parse(match?.[1] ?? '') as Record<string, unknown>;
}

async function readState(projectDir: string): Promise<string> {
  return readFile(join(projectDir, 'state.md'), 'utf8');
}

describe('freestyle orchestrator branch', () => {
  const tempDirs: string[] = [];
  let previousHome: string | undefined;

  beforeEach(async () => {
    previousHome = process.env.HOME;
    const home = await mkdtemp(join(tmpdir(), 'oat-orchestrator-home-'));
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

  async function sharedRepo(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-orchestrator-'));
    tempDirs.push(root);
    await initMainRepo(root);
    return root;
  }

  async function newFreestyle(
    root: string,
    name: string,
    scope: 'shared' | 'local' | 'synced' = 'shared',
  ): Promise<string> {
    const result = await runOat(root, [
      'project',
      'new',
      name,
      '--mode',
      'freestyle',
      '--scope',
      scope,
      '--no-dashboard',
    ]);
    expect(result.exitCode, result.stderr).toBe(0);
    return join(root, '.oat', 'projects', scope, name);
  }

  describe('oat project new', () => {
    it('records the current branch as the orchestrator branch of a new freestyle project', async () => {
      const root = await sharedRepo();
      const result = await runOat(
        root,
        [
          'project',
          'new',
          'fresh',
          '--mode',
          'freestyle',
          '--scope',
          'shared',
          '--no-dashboard',
        ],
        ['--json'],
      );
      expect(JSON.parse(result.stdout)).toMatchObject({
        orchestratorBranch: 'main',
      });
      const state = await readState(join(root, '.oat/projects/shared/fresh'));
      expect(frontmatter(state).oat_orchestrator_branch).toBe('main');
      // The scaffold commit carries the claimed state.
      expect(
        git(root, ['show', 'HEAD:.oat/projects/shared/fresh/state.md']),
      ).toContain('oat_orchestrator_branch: "main"');

      const text = await runOat(root, [
        'project',
        'new',
        'fresh-text',
        '--mode',
        'freestyle',
        '--scope',
        'local',
        '--no-dashboard',
      ]);
      expect(text.stdout).toContain('Orchestrator branch: main');
    });

    it('records the code checkout branch for a synced project', async () => {
      const fixture = await createSyncedFixture();
      tempDirs.push(fixture.rootDir);
      const dir = await newFreestyle(fixture.cloneA, 'synced-one', 'synced');
      expect(frontmatter(await readState(dir)).oat_orchestrator_branch).toBe(
        'main',
      );
      expect(
        git(fixture.originDir, [
          'show',
          'refs/oat/projects/synced-one:state.md',
        ]),
      ).toContain('oat_orchestrator_branch: "main"');
    });

    it('leaves the project unclaimed on a detached HEAD', async () => {
      const root = await sharedRepo();
      git(root, ['checkout', '-q', '--detach']);
      const result = await runOat(root, [
        'project',
        'new',
        'detached',
        '--mode',
        'freestyle',
        '--scope',
        'local',
        '--no-dashboard',
      ]);
      expect(result.stdout).toContain(
        'Orchestrator branch: unclaimed (the orchestrator claims it with `oat project orchestrator set --project detached`)',
      );
      expect(
        frontmatter(await readState(join(root, '.oat/projects/local/detached')))
          .oat_orchestrator_branch,
      ).toBe('');
    });

    it('writes no orchestrator branch for a quick project', async () => {
      const root = await sharedRepo();
      const result = await runOat(
        root,
        [
          'project',
          'new',
          'quick-control',
          '--mode',
          'quick',
          '--scope',
          'shared',
          '--no-dashboard',
        ],
        ['--json'],
      );
      expect(JSON.parse(result.stdout)).not.toHaveProperty(
        'orchestratorBranch',
      );
      const state = await readState(
        join(root, '.oat/projects/shared/quick-control'),
      );
      expect(state).not.toContain('oat_orchestrator_branch');
    });
  });

  describe('oat project orchestrator set', () => {
    it('claims an unclaimed project with the current branch', async () => {
      const root = await sharedRepo();
      git(root, ['checkout', '-q', '--detach']);
      const dir = await newFreestyle(root, 'unclaimed', 'local');
      git(root, ['checkout', '-q', '-b', 'orchestrator/child']);

      const result = await runOat(
        root,
        ['project', 'orchestrator', 'set', '--project', 'unclaimed'],
        ['--json'],
      );
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: 'ok',
        outcome: 'claimed',
        projectName: 'unclaimed',
        scope: 'local',
        orchestratorBranch: 'orchestrator/child',
        previousBranch: null,
      });
      const state = await readState(dir);
      expect(frontmatter(state).oat_orchestrator_branch).toBe(
        'orchestrator/child',
      );
      // The field's comment survives the rewrite, and the state still passes
      // the strict frontmatter check.
      expect(state).toMatch(
        /^oat_orchestrator_branch: "orchestrator\/child" # /m,
      );
      expect(
        (await runOat(root, ['project', 'check-state', dir])).exitCode,
      ).toBe(0);
    });

    it('claims a project created before the field existed', async () => {
      const root = await sharedRepo();
      const dir = await newFreestyle(root, 'legacy');
      await writeFile(join(dir, 'state.md'), PRE_M02_STATE, 'utf8');

      const status = await runOat(root, [
        'project',
        'status',
        '--project-path',
        '.oat/projects/shared/legacy',
      ]);
      expect(status.stdout).toContain(
        'Orchestrator branch: unclaimed (the orchestrator claims it with `oat project orchestrator set --project .oat/projects/shared/legacy`)',
      );

      const result = await setOrchestratorBranch({
        repoRoot: root,
        project: '.oat/projects/shared/legacy',
        now: new Date('2026-11-22T10:00:00.000Z'),
      });
      expect(result).toMatchObject({ outcome: 'claimed', branch: 'main' });
      const fields = frontmatter(await readState(dir));
      expect(fields.oat_orchestrator_branch).toBe('main');
      expect(fields.oat_project_state_updated).toBe('2026-11-22T10:00:00.000Z');
      expect(fields.oat_workflow_mode).toBe('freestyle');
    });

    it('refuses to replace a different recorded branch without --replace, then replaces with it', async () => {
      const root = await sharedRepo();
      const dir = await newFreestyle(root, 'claimed');
      git(root, ['checkout', '-q', '-b', 'other']);
      const before = await readState(dir);

      const refused = await runOat(root, [
        'project',
        'orchestrator',
        'set',
        '--project',
        'claimed',
      ]);
      expect(refused.exitCode).toBe(1);
      expect(refused.stderr).toContain(
        'Project claimed is already claimed by branch main. Pass --replace to record other instead.',
      );
      expect(await readState(dir)).toBe(before);

      const replaced = await runOat(root, [
        'project',
        'orchestrator',
        'set',
        '--project',
        'claimed',
        '--replace',
      ]);
      expect(replaced.exitCode).toBe(0);
      expect(replaced.stdout).toContain(
        'Replaced the orchestrator branch of claimed: orchestrator branch other (was main)',
      );
      expect(frontmatter(await readState(dir)).oat_orchestrator_branch).toBe(
        'other',
      );
    });

    it('leaves the file untouched when the recorded branch is already the one asked for', async () => {
      const root = await sharedRepo();
      const dir = await newFreestyle(root, 'same');
      const before = await readState(dir);
      const result = await setOrchestratorBranch({
        repoRoot: root,
        project: 'same',
      });
      expect(result.outcome).toBe('unchanged');
      expect(await readState(dir)).toBe(before);
    });

    it('records --branch and refuses a detached HEAD without it', async () => {
      const root = await sharedRepo();
      const dir = await newFreestyle(root, 'explicit');
      await writeFile(join(dir, 'state.md'), PRE_M02_STATE, 'utf8');
      git(root, ['checkout', '-q', '--detach']);

      await expect(
        setOrchestratorBranch({ repoRoot: root, project: 'explicit' }),
      ).rejects.toThrow(
        'This checkout is on a detached HEAD, so there is no current branch to record.',
      );
      const result = await setOrchestratorBranch({
        repoRoot: root,
        project: 'explicit',
        branch: 'integration/x',
      });
      expect(result).toMatchObject({
        outcome: 'claimed',
        branch: 'integration/x',
      });
    });

    it('defaults to the active project', async () => {
      const root = await sharedRepo();
      const dir = await newFreestyle(root, 'active-one');
      await writeFile(join(dir, 'state.md'), PRE_M02_STATE, 'utf8');
      const result = await setOrchestratorBranch({ repoRoot: root });
      expect(result.project.name).toBe('active-one');
      expect(result.outcome).toBe('claimed');
    });

    it('refuses a project that is not freestyle and leaves its state unchanged', async () => {
      const root = await sharedRepo();
      await runOat(root, [
        'project',
        'new',
        'quick-one',
        '--mode',
        'quick',
        '--scope',
        'shared',
        '--no-dashboard',
      ]);
      const dir = join(root, '.oat/projects/shared/quick-one');
      const before = await readState(dir);
      const result = await runOat(root, [
        'project',
        'orchestrator',
        'set',
        '--project',
        'quick-one',
      ]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(
        'Project quick-one is not a freestyle project',
      );
      expect(await readState(dir)).toBe(before);
    });

    it('claims a synced project in its nested worktree and pushes nothing', async () => {
      const fixture = await createSyncedFixture();
      tempDirs.push(fixture.rootDir);
      const dir = await newFreestyle(fixture.cloneA, 'synced-claim', 'synced');
      await writeFile(
        join(dir, 'state.md'),
        PRE_M02_STATE.replace('legacy', 'synced-claim'),
        'utf8',
      );
      const publishedBefore = git(fixture.originDir, [
        'rev-parse',
        'refs/oat/projects/synced-claim',
      ]);
      git(fixture.cloneA, ['checkout', '-q', '-b', 'child-orchestrator']);

      const result = await setOrchestratorBranch({
        repoRoot: fixture.cloneA,
        project: 'synced-claim',
      });
      expect(result).toMatchObject({
        outcome: 'claimed',
        branch: 'child-orchestrator',
        project: { scope: 'synced' },
      });
      expect(frontmatter(await readState(dir)).oat_orchestrator_branch).toBe(
        'child-orchestrator',
      );
      expect(
        git(fixture.originDir, ['rev-parse', 'refs/oat/projects/synced-claim']),
      ).toBe(publishedBefore);

      const status = await runOat(fixture.cloneA, [
        'project',
        'status',
        '--project-path',
        '.oat/projects/synced/synced-claim',
      ]);
      expect(status.stdout).toContain(
        'Orchestrator branch: child-orchestrator',
      );
      expect(status.stdout).toContain(
        'Current branch: child-orchestrator (this checkout is the orchestrator)',
      );
    });
  });

  describe('oat project status', () => {
    it('compares the recorded branch with this checkout on a shared project', async () => {
      const root = await sharedRepo();
      await newFreestyle(root, 'shown');
      const onBranch = await runOat(root, [
        'project',
        'status',
        '--project-path',
        '.oat/projects/shared/shown',
      ]);
      expect(onBranch.stdout).toContain('Orchestrator branch: main');
      expect(onBranch.stdout).toContain(
        'Current branch: main (this checkout is the orchestrator)',
      );

      git(root, ['checkout', '-q', '-b', 'lane/l01']);
      const offBranch = await runOat(
        root,
        ['project', 'status', '--project-path', '.oat/projects/shared/shown'],
        ['--json'],
      );
      expect(JSON.parse(offBranch.stdout)).toMatchObject({
        orchestrator: {
          branch: 'main',
          claimed: true,
          currentBranch: 'lane/l01',
          isOrchestrator: false,
        },
      });
    });
  });
});
