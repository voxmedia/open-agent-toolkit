import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { git, initMainRepo, runOat } from '@test-support/run-oat';
import {
  addLinkedWorktree,
  createSyncedFixture,
} from '@test-support/synced-fixture';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parseLaneLedger } from './ledger';

type Scope = 'shared' | 'synced';

function projectDir(root: string, scope: Scope, name = 'demo'): string {
  return join(root, '.oat', 'projects', scope, name);
}

async function ledgerOf(root: string, scope: Scope = 'shared') {
  return parseLaneLedger(
    await readFile(join(projectDir(root, scope), 'lanes.md'), 'utf8'),
  );
}

describe('oat project lane set', () => {
  const tempDirs: string[] = [];
  let previousHome: string | undefined;

  beforeEach(async () => {
    previousHome = process.env.HOME;
    const home = await mkdtemp(join(tmpdir(), 'oat-lane-home-'));
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
    const root = await mkdtemp(join(tmpdir(), 'oat-lane-'));
    tempDirs.push(root);
    await initMainRepo(root);
    return root;
  }

  async function syncedRepo(): Promise<string> {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    return fixture.cloneA;
  }

  async function newProject(
    root: string,
    scope: Scope | 'local' = 'shared',
    mode = 'freestyle',
  ): Promise<void> {
    const result = await runOat(root, [
      'project',
      'new',
      'demo',
      '--mode',
      mode,
      '--scope',
      scope,
      '--no-dashboard',
    ]);
    expect(result.exitCode, result.stderr).toBe(0);
  }

  function laneSet(root: string, args: string[], json = false) {
    return runOat(
      root,
      ['project', 'lane', 'set', ...args],
      json ? ['--json'] : [],
    );
  }

  it('creates a lane in lanes.md, derives its placement and commits nothing', async () => {
    const root = await sharedRepo();
    await newProject(root);
    const head = git(root, ['rev-parse', 'HEAD']);
    const worktree = await addLinkedWorktree(root, 'lane/l01');

    const created = await laneSet(
      root,
      [
        'l01',
        '--task',
        'task-123',
        '--thread',
        'thread-abc',
        '--worktree',
        worktree,
        '--branch',
        'lane/l01',
        '--base',
        head,
        '--next',
        'wait for the lane to report',
        '--owner',
        'lane',
        '--provider',
        'claude',
        '--model',
        'opus',
        '--effort',
        'high',
      ],
      true,
    );
    expect(created.exitCode, created.stderr).toBe(0);
    expect(JSON.parse(created.stdout)).toMatchObject({
      status: 'ok',
      ledgerPath: '.oat/projects/shared/demo/lanes.md',
      lane: 'l01',
      updateId: 'u001',
      created: true,
      dispatch: { id: 'd01', status: 'open' },
    });

    const ledger = await ledgerOf(root);
    expect(ledger.title).toBe('Lanes: demo');
    expect(ledger.active[0]?.fields).toMatchObject({
      state: 'dispatched',
      dispatch: 'd01 open',
      task: 'task-123',
      thread: 'thread-abc',
      worktree,
      placement: 'own-worktree',
      branch: 'lane/l01',
      base: head,
      next: 'wait for the lane to report',
      owner: 'lane',
      provider: 'claude',
      model: 'opus',
      effort: 'high',
    });
    expect(git(root, ['rev-parse', 'HEAD'])).toBe(head);
    expect(git(root, ['status', '--porcelain', '--', '.oat/projects'])).toBe(
      '?? .oat/projects/shared/demo/lanes.md',
    );

    // A subagent lane in the orchestrator's own checkout shares its worktree.
    const shared = await laneSet(root, [
      'l02',
      '--worktree',
      '.',
      '--paths',
      'docs/a.md, docs/b.md ,',
      '--next',
      'edit the two docs pages',
      '--owner',
      'orchestrator',
    ]);
    expect(shared.exitCode, shared.stderr).toBe(0);
    expect(shared.stdout).toContain(
      'Created lane l02 (u002, dispatch d01 open): created; d01 opened;',
    );
    expect(shared.stdout).toContain(
      'Wrote .oat/projects/shared/demo/lanes.md. Nothing was committed or pushed',
    );
    expect((await ledgerOf(root)).active[1]?.fields).toMatchObject({
      worktree: git(root, ['rev-parse', '--show-toplevel']),
      placement: 'shared-worktree',
      paths: 'docs/a.md, docs/b.md',
    });
  });

  it('files a returned report verbatim and points the ledger at the copy', async () => {
    const root = await sharedRepo();
    await newProject(root);
    expect(
      (await laneSet(root, ['l01', '--branch', 'lane/l01'])).exitCode,
    ).toBe(0);

    // Trailing spaces, no final newline and non-ASCII survive byte for byte.
    const returned = '# Lane report: l01-d01\n\n## Summary  \n\nDone — café.\t';
    const saved = join(root, '..', `report-${Date.now()}.md`);
    tempDirs.push(saved);
    await writeFile(saved, returned, 'utf8');

    const filed = await laneSet(
      root,
      ['l01', '--report', saved, '--head', 'abc123'],
      true,
    );
    expect(filed.exitCode, filed.stderr).toBe(0);
    expect(JSON.parse(filed.stdout)).toMatchObject({
      reportPath: 'lane-reports/l01-d01.md',
      dispatch: { id: 'd01', status: 'reported' },
      fields: {
        report: 'lane-reports/l01-d01.md',
        head: 'abc123',
        state: 'turn-finished',
      },
    });
    const pointer = (await ledgerOf(root)).active[0]?.fields.report as string;
    expect(
      await readFile(join(projectDir(root, 'shared'), pointer), 'utf8'),
    ).toBe(returned);

    // The next dispatch's report path is taken by a different file: refused,
    // and neither the file nor the ledger changes.
    expect((await laneSet(root, ['l01', '--dispatch'])).exitCode).toBe(0);
    const reports = join(projectDir(root, 'shared'), 'lane-reports');
    await writeFile(join(reports, 'l01-d02.md'), 'someone else\n', 'utf8');
    const ledgerBefore = await readFile(
      join(projectDir(root, 'shared'), 'lanes.md'),
      'utf8',
    );
    const clash = await laneSet(root, ['l01', '--report', saved]);
    expect(clash.exitCode).toBe(1);
    expect(clash.stderr).toContain(
      'lane-reports/l01-d02.md already exists with different content; a filed report is never edited.',
    );
    expect(await readFile(join(reports, 'l01-d02.md'), 'utf8')).toBe(
      'someone else\n',
    );
    expect(
      await readFile(join(projectDir(root, 'shared'), 'lanes.md'), 'utf8'),
    ).toBe(ledgerBefore);

    // The same bytes again (a retry after a failed ledger write) are accepted.
    await writeFile(join(reports, 'l01-d02.md'), returned, 'utf8');
    const retry = await laneSet(root, ['l01', '--report', saved]);
    expect(retry.exitCode, retry.stderr).toBe(0);
    expect((await ledgerOf(root)).active[0]?.fields.report).toBe(
      'lane-reports/l01-d02.md',
    );
  });

  it('closes an interrupted turn with --no-report and records steers on the open dispatch', async () => {
    const root = await sharedRepo();
    await newProject(root);
    expect((await laneSet(root, ['l01', '--state', 'running'])).exitCode).toBe(
      0,
    );
    const steer = await laneSet(root, ['l01', '--steer', 'also cover CSV']);
    expect(steer.exitCode, steer.stderr).toBe(0);
    const stopped = await laneSet(root, ['l01', '--no-report']);
    expect(stopped.exitCode, stopped.stderr).toBe(0);
    const ledger = await ledgerOf(root);
    expect(ledger.active[0]?.fields).toMatchObject({
      dispatch: 'd01 no-report',
      state: 'turn-finished',
    });
    expect(ledger.active[0]?.fields.report).toBeUndefined();
    expect(
      ledger.history.map((line) => line.text.split(' · ').slice(1)),
    ).toEqual([
      ['l01 d01', 'created; d01 opened; state running'],
      ['l01 d01', 'steer: also cover CSV'],
      ['l01 d01', 'd01 closed with no report; state running → turn-finished'],
    ]);
  });

  describe.each<Scope>(['shared', 'synced'])(
    'the orchestrator-branch guard (%s project)',
    (scope) => {
      async function claimedRepo(): Promise<string> {
        const root =
          scope === 'shared' ? await sharedRepo() : await syncedRepo();
        await newProject(root, scope);
        expect((await laneSet(root, ['l01'])).exitCode).toBe(0);
        return root;
      }

      it('refuses lane set off the orchestrator branch and leaves the ledger byte-identical', async () => {
        const root = await claimedRepo();
        const before = await readFile(
          join(projectDir(root, scope), 'lanes.md'),
          'utf8',
        );
        git(root, ['switch', '-q', '-c', 'lane/l09']);
        const refused = await laneSet(root, ['l01', '--state', 'running']);
        expect(refused.exitCode).toBe(1);
        expect(refused.stderr).toContain(
          "Cannot update lane l01: this checkout is on branch lane/l09, but project demo's orchestrator branch is main.",
        );
        expect(
          await readFile(join(projectDir(root, scope), 'lanes.md'), 'utf8'),
        ).toBe(before);
      });

      it('refuses lane set on a detached HEAD', async () => {
        const root = await claimedRepo();
        git(root, ['switch', '-q', '--detach']);
        const refused = await laneSet(root, ['l02']);
        expect(refused.exitCode).toBe(1);
        expect(refused.stderr).toContain(
          'Cannot update lane l02: this checkout is on a detached HEAD',
        );
        expect((await ledgerOf(root, scope)).active.map((b) => b.id)).toEqual([
          'l01',
        ]);
      });

      it('refuses lane set while the project is unclaimed and writes no ledger', async () => {
        const root =
          scope === 'shared' ? await sharedRepo() : await syncedRepo();
        await newProject(root, scope);
        const statePath = join(projectDir(root, scope), 'state.md');
        await writeFile(
          statePath,
          (await readFile(statePath, 'utf8')).replace(
            /^oat_orchestrator_branch: .*$/m,
            "oat_orchestrator_branch: ''",
          ),
          'utf8',
        );
        const refused = await laneSet(root, ['l01']);
        expect(refused.exitCode).toBe(1);
        expect(refused.stderr).toContain(
          'Cannot update lane l01: project demo is unclaimed',
        );
        expect(existsSync(join(projectDir(root, scope), 'lanes.md'))).toBe(
          false,
        );
      });
    },
  );

  describe('the head-ahead check', () => {
    async function laneWithReport(): Promise<{
      root: string;
      worktree: string;
      reported: string;
    }> {
      const root = await sharedRepo();
      await newProject(root);
      const worktree = await addLinkedWorktree(root, 'lane/l01');
      await writeFile(join(worktree, 'work.txt'), 'one\n', 'utf8');
      git(worktree, ['add', 'work.txt']);
      git(worktree, ['commit', '-q', '-m', 'lane work']);
      const reported = git(worktree, ['rev-parse', 'HEAD']);
      const saved = join(worktree, '..', 'l01-d01.txt');
      await writeFile(saved, '# Lane report: l01-d01\n', 'utf8');
      const created = await laneSet(root, [
        'l01',
        '--worktree',
        worktree,
        '--branch',
        'lane/l01',
      ]);
      expect(created.exitCode, created.stderr).toBe(0);
      const filed = await laneSet(root, [
        'l01',
        '--report',
        saved,
        '--head',
        reported,
      ]);
      expect(filed.exitCode, filed.stderr).toBe(0);
      expect(filed.stderr).not.toContain('Lane head ahead');
      return { root, worktree, reported };
    }

    async function statusOf(cwd: string) {
      const text = await runOat(cwd, [
        'project',
        'status',
        '--project-path',
        projectDir(cwd, 'shared'),
      ]);
      expect(text.exitCode, text.stderr).toBe(0);
      return text.stdout;
    }

    it('says nothing while the branch head is the reported head', async () => {
      const { root } = await laneWithReport();
      expect(await statusOf(root)).not.toContain('Lane head ahead');
      const json = await laneSet(root, ['l01'], true);
      expect(JSON.parse(json.stdout).headCheck).toMatchObject({
        status: 'current',
        commits: 0,
      });
    });

    it('flags a branch head past the last report in lane set and status', async () => {
      const { root, worktree, reported } = await laneWithReport();
      for (const n of [2, 3]) {
        await writeFile(join(worktree, 'work.txt'), `${n}\n`, 'utf8');
        git(worktree, ['commit', '-q', '-am', `unreported ${n}`]);
      }
      const expected = `Lane head ahead of its report: l01 (branch lane/l01) is 2 commits past the last report's head ${reported}; do not merge unreported commits unreviewed.`;

      const set = await laneSet(root, ['l01', '--state', 'work-settled']);
      expect(set.exitCode, set.stderr).toBe(0);
      expect(set.stderr).toContain(`Warning: ${expected}`);
      expect(await statusOf(root)).toContain(expected);

      const json = await runOat(
        root,
        ['project', 'status', '--project-path', projectDir(root, 'shared')],
        ['--json'],
      );
      expect(JSON.parse(json.stdout)).toMatchObject({
        lanes: {
          headAhead: [
            {
              lane: 'l01',
              branch: 'lane/l01',
              reportedHead: reported,
              status: 'ahead',
              branchHead: git(worktree, ['rev-parse', 'HEAD']),
              commits: 2,
            },
          ],
        },
      });

      // Filing the next report at the new head clears the flag.
      expect((await laneSet(root, ['l01', '--dispatch'])).exitCode).toBe(0);
      const saved = join(worktree, '..', 'l01-d02.txt');
      await writeFile(saved, '# Lane report: l01-d02\n', 'utf8');
      const filed = await laneSet(root, [
        'l01',
        '--report',
        saved,
        '--head',
        git(worktree, ['rev-parse', 'HEAD']),
      ]);
      expect(filed.stderr).not.toContain('Lane head ahead');
      expect(await statusOf(root)).not.toContain('Lane head ahead');
    });

    it('flags a branch that no longer contains the reported head', async () => {
      const { root, worktree, reported } = await laneWithReport();
      git(worktree, ['reset', '-q', '--hard', 'HEAD~1']);
      await writeFile(join(worktree, 'other.txt'), 'x\n', 'utf8');
      git(worktree, ['add', 'other.txt']);
      git(worktree, ['commit', '-q', '-m', 'rewritten']);
      expect(await statusOf(root)).toContain(
        `Lane head ahead of its report: l01 (branch lane/l01) has moved off the last report's head ${reported} (1 commit not in it); do not merge unreported commits unreviewed.`,
      );
    });

    it('does not apply to a lane in the orchestrator checkout, and cannot compare a branch this clone lacks', async () => {
      const root = await sharedRepo();
      await newProject(root);
      const head = git(root, ['rev-parse', 'HEAD']);
      const shared = await laneSet(
        root,
        ['l02', '--worktree', '.', '--branch', 'main', '--head', head],
        true,
      );
      // The orchestrator keeps committing on its branch; that is not unreported lane work.
      await writeFile(join(root, 'orchestrator.txt'), 'x\n', 'utf8');
      git(root, ['add', 'orchestrator.txt']);
      git(root, ['commit', '-q', '-m', 'orchestrator work']);
      expect(JSON.parse(shared.stdout).headCheck).toBeNull();
      expect(await statusOf(root)).not.toContain('Lane head ahead');

      const remote = await laneSet(
        root,
        ['l03', '--branch', 'delegate/l03', '--head', head],
        true,
      );
      expect(JSON.parse(remote.stdout).headCheck).toMatchObject({
        status: 'unknown',
        reason: 'branch delegate/l03 is not in this clone',
      });
      expect(await statusOf(root)).not.toContain('Lane head ahead');
    });
  });

  it('names the lane in status run from a branch lanes.md lists', async () => {
    const root = await sharedRepo();
    await newProject(root);
    const worktree = await addLinkedWorktree(root, 'lane/l04');
    expect(
      (
        await laneSet(root, [
          'l04',
          '--worktree',
          worktree,
          '--branch',
          'lane/l04',
        ])
      ).exitCode,
    ).toBe(0);
    const fromLane = await runOat(worktree, [
      'project',
      'status',
      '--project-path',
      projectDir(root, 'shared'),
    ]);
    expect(fromLane.exitCode, fromLane.stderr).toBe(0);
    expect(fromLane.stdout).toContain(
      'Current branch: lane/l04 (not the orchestrator branch: this checkout is lane l04 in lanes.md)',
    );
    const fromOrchestrator = await runOat(root, [
      'project',
      'status',
      '--project-path',
      projectDir(root, 'shared'),
    ]);
    expect(fromOrchestrator.stdout).toContain(
      'Current branch: main (this checkout is the orchestrator)',
    );
  });

  it('refuses a project that is not freestyle (existing-mode control)', async () => {
    const root = await sharedRepo();
    await newProject(root, 'shared', 'quick');
    const refused = await laneSet(root, ['l01']);
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr).toContain(
      'Project demo is not a freestyle project; only a freestyle project keeps a lane ledger.',
    );
    expect(existsSync(join(projectDir(root, 'shared'), 'lanes.md'))).toBe(
      false,
    );
  });

  it('refuses an unreadable ledger without overwriting it', async () => {
    const root = await sharedRepo();
    await newProject(root);
    const path = join(projectDir(root, 'shared'), 'lanes.md');
    await mkdir(projectDir(root, 'shared'), { recursive: true });
    await writeFile(path, '# Lanes: demo\n\nhand-written notes\n', 'utf8');
    const refused = await laneSet(root, ['l01']);
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr).toContain('lanes.md has no `## Active` section');
    expect(await readFile(path, 'utf8')).toBe(
      '# Lanes: demo\n\nhand-written notes\n',
    );
  });
});
