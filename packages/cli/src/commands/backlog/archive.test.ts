import { execFileSync } from 'node:child_process';
import {
  chmod,
  link,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { archiveBacklogItem, BacklogArchiveError } from './archive';
import { initializeBacklog } from './init';
import { regenerateBacklogIndex } from './regenerate-index';

const FIXED_NOW = new Date('2026-07-05T12:00:00Z');

async function seedItem(
  backlogRoot: string,
  id: string,
  overrides: Record<string, string> = {},
): Promise<void> {
  const frontmatter: Record<string, string> = {
    id,
    title: "'Demo Item'",
    status: 'open # open | in_progress | closed | wont_do',
    priority: 'high',
    scope: 'task',
    scope_estimate: 'S',
    created: "'2026-07-01T00:00:00Z'",
    updated: "'2026-07-01T00:00:00Z'",
    ...overrides,
  };
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  await writeFile(
    join(backlogRoot, 'items', `${id}.md`),
    `---\n${yaml}\n---\n\n## Description\n\nDemo body.\n`,
    'utf8',
  );
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe('archiveBacklogItem', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function freshBacklog(prefix = 'oat-archive-'): Promise<string> {
    const backlogRoot = await mkdtemp(join(tmpdir(), prefix));
    tempDirs.push(backlogRoot);
    await initializeBacklog(backlogRoot);
    return backlogRoot;
  }

  it('closes an item: flips status, bumps updated, writes entry, moves file, regenerates index', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);

    const result = await archiveBacklogItem(backlogRoot, id, {
      summary: 'Shipped it',
      now: FIXED_NOW,
    });

    expect(result.result).toBe('archived');
    expect(result.status).toBe('closed');
    expect(result.completedEntry).toBe('written');
    expect(result.indexRegenerated).toBe(true);
    expect(result.movedTo).toBe(join(backlogRoot, 'archived', `${id}.md`));

    // File moved out of items/ into archived/
    expect(await fileExists(join(backlogRoot, 'items', `${id}.md`))).toBe(
      false,
    );
    const archived = await readFile(
      join(backlogRoot, 'archived', `${id}.md`),
      'utf8',
    );
    expect(archived).toContain('status: closed');
    expect(archived).toContain("updated: '2026-07-05T12:00:00Z'");

    // Completed entry
    const completed = await readFile(join(backlogRoot, 'completed.md'), 'utf8');
    expect(completed).toContain(
      `- 2026-07-05 — ${id} — Demo Item — Shipped it`,
    );

    // Index no longer lists the archived item
    const index = await readFile(join(backlogRoot, 'index.md'), 'utf8');
    expect(index).not.toContain(id);
  });

  it('trims a padded summary before writing the completed entry', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-padded-summary';
    await seedItem(backlogRoot, id);

    await archiveBacklogItem(backlogRoot, id, {
      summary: '  Shipped it  ',
      now: FIXED_NOW,
    });

    const completed = await readFile(join(backlogRoot, 'completed.md'), 'utf8');
    const completedEntry = completed
      .split('\n')
      .find((line) => line.includes(id));
    expect(completedEntry).toBe(
      `- 2026-07-05 — ${id} — Demo Item — Shipped it`,
    );
    expect(completed).not.toContain('  Shipped it  ');
  });

  it('preserves a "#"-bearing title verbatim in the completed entry', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-hash';
    await seedItem(backlogRoot, id, { title: "'Fix #123 crash'" });

    await archiveBacklogItem(backlogRoot, id, {
      summary: 'Patched',
      now: FIXED_NOW,
    });

    const completed = await readFile(join(backlogRoot, 'completed.md'), 'utf8');
    expect(completed).toContain(
      `- 2026-07-05 — ${id} — Fix #123 crash — Patched`,
    );
  });

  it('inserts the completed entry newest-first above existing entries', async () => {
    const backlogRoot = await freshBacklog();
    const completedPath = join(backlogRoot, 'completed.md');
    const original = await readFile(completedPath, 'utf8');
    await writeFile(
      completedPath,
      original.replace(
        '## Completed Items\n',
        '## Completed Items\n\n- 2026-01-01 — BL-old — Old Item — earlier work\n',
      ),
      'utf8',
    );
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);

    await archiveBacklogItem(backlogRoot, id, {
      summary: 'Newer work',
      now: FIXED_NOW,
    });

    const completed = await readFile(completedPath, 'utf8');
    expect(completed.indexOf('Newer work')).toBeLessThan(
      completed.indexOf('earlier work'),
    );
  });

  it('preserves the inline enum comment on the status line after rewrite', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);

    await archiveBacklogItem(backlogRoot, id, {
      summary: 'done',
      now: FIXED_NOW,
    });

    const archived = await readFile(
      join(backlogRoot, 'archived', `${id}.md`),
      'utf8',
    );
    expect(archived).toContain(
      'status: closed # open | in_progress | closed | wont_do',
    );
  });

  it.each([undefined, '   '])(
    'rejects closing without a non-empty summary before any mutation',
    async (summary) => {
      const backlogRoot = await freshBacklog();
      const id = 'BL-260705-demo';
      await seedItem(backlogRoot, id);
      const itemsPath = join(backlogRoot, 'items', `${id}.md`);
      const archivedPath = join(backlogRoot, 'archived', `${id}.md`);
      const completedPath = join(backlogRoot, 'completed.md');
      const indexPath = join(backlogRoot, 'index.md');
      const [itemBefore, completedBefore, indexBefore] = await Promise.all([
        readFile(itemsPath, 'utf8'),
        readFile(completedPath, 'utf8'),
        readFile(indexPath, 'utf8'),
      ]);

      let caught: unknown;
      try {
        await archiveBacklogItem(backlogRoot, id, {
          summary,
          now: FIXED_NOW,
        });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(BacklogArchiveError);
      expect((caught as BacklogArchiveError).message).toContain(
        'rerun with `--summary "<outcome>"`',
      );

      expect(await readFile(itemsPath, 'utf8')).toBe(itemBefore);
      expect(await readFile(completedPath, 'utf8')).toBe(completedBefore);
      expect(await fileExists(archivedPath)).toBe(false);
      expect(await readFile(indexPath, 'utf8')).toBe(indexBefore);
    },
  );

  it('marks --wont-do with a summary and writes an entry', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);

    const result = await archiveBacklogItem(backlogRoot, id, {
      wontDo: true,
      summary: 'Not pursuing',
      now: FIXED_NOW,
    });

    expect(result.status).toBe('wont_do');
    expect(result.completedEntry).toBe('written');
    const archived = await readFile(
      join(backlogRoot, 'archived', `${id}.md`),
      'utf8',
    );
    expect(archived).toContain('status: wont_do');
    const completed = await readFile(join(backlogRoot, 'completed.md'), 'utf8');
    expect(completed).toContain('Not pursuing');
  });

  it('marks --wont-do without a summary and writes no entry', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);
    const completedBefore = await readFile(
      join(backlogRoot, 'completed.md'),
      'utf8',
    );

    const result = await archiveBacklogItem(backlogRoot, id, {
      wontDo: true,
      now: FIXED_NOW,
    });

    expect(result.status).toBe('wont_do');
    expect(result.completedEntry).toBe('skipped');
    const completedAfter = await readFile(
      join(backlogRoot, 'completed.md'),
      'utf8',
    );
    expect(completedAfter).toBe(completedBefore);
    // File is still moved even without an entry
    expect(await fileExists(join(backlogRoot, 'archived', `${id}.md`))).toBe(
      true,
    );
  });

  it('rejects an out-of-enum current status with a fix hint (exit 1)', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id, { status: 'done' });

    let caught: unknown;
    try {
      await archiveBacklogItem(backlogRoot, id, { now: FIXED_NOW });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BacklogArchiveError);
    const err = caught as BacklogArchiveError;
    expect(err.exitCode).toBe(1);
    expect(err.message).toContain(join(backlogRoot, 'items', `${id}.md`));
    expect(err.message).toContain('done');
    expect(err.message).toContain('open, in_progress, closed, wont_do');
    expect(err.message).toContain(id);
    // No writes / move on rejection
    expect(await fileExists(join(backlogRoot, 'items', `${id}.md`))).toBe(true);
    expect(await fileExists(join(backlogRoot, 'archived', `${id}.md`))).toBe(
      false,
    );
  });

  it('rejects an unknown id (exit 1)', async () => {
    const backlogRoot = await freshBacklog();

    let caught: unknown;
    try {
      await archiveBacklogItem(backlogRoot, 'BL-260705-missing', {
        now: FIXED_NOW,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BacklogArchiveError);
    expect((caught as BacklogArchiveError).exitCode).toBe(1);
  });

  it('is an idempotent no-op when the item is already archived (exit 0, no writes)', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-demo';
    // Place the item directly into archived/
    await writeFile(
      join(backlogRoot, 'archived', `${id}.md`),
      `---\nid: ${id}\ntitle: 'Demo Item'\nstatus: closed\n---\n`,
      'utf8',
    );
    const completedBefore = await readFile(
      join(backlogRoot, 'completed.md'),
      'utf8',
    );

    const result = await archiveBacklogItem(backlogRoot, id, {
      now: FIXED_NOW,
    });

    expect(result.result).toBe('noop');
    expect(result.warnings.some((w) => w.includes('already archived'))).toBe(
      true,
    );
    const completedAfter = await readFile(
      join(backlogRoot, 'completed.md'),
      'utf8',
    );
    expect(completedAfter).toBe(completedBefore);
  });

  it('rejects a duplicate id present in both items/ and archived/ without modifying either file (exit 1)', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);
    const itemsPath = join(backlogRoot, 'items', `${id}.md`);
    const archivedPath = join(backlogRoot, 'archived', `${id}.md`);
    await writeFile(
      archivedPath,
      `---\nid: ${id}\ntitle: 'Demo Item'\nstatus: closed\n---\n`,
      'utf8',
    );
    const itemsBefore = await readFile(itemsPath, 'utf8');
    const archivedBefore = await readFile(archivedPath, 'utf8');

    let caught: unknown;
    try {
      await archiveBacklogItem(backlogRoot, id, { now: FIXED_NOW });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BacklogArchiveError);
    const err = caught as BacklogArchiveError;
    expect(err.exitCode).toBe(1);
    expect(err.message).toContain(itemsPath);
    expect(err.message).toContain(archivedPath);
    // Neither file is touched — no clobber of the archived record and the live
    // items/ copy is left in place for manual reconciliation.
    expect(await readFile(itemsPath, 'utf8')).toBe(itemsBefore);
    expect(await readFile(archivedPath, 'utf8')).toBe(archivedBefore);
  });

  it('still returns a noop when only the archived copy exists (no items/ duplicate)', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-demo';
    // Only the archived copy exists — the clean idempotent no-op path.
    await writeFile(
      join(backlogRoot, 'archived', `${id}.md`),
      `---\nid: ${id}\ntitle: 'Demo Item'\nstatus: closed\n---\n`,
      'utf8',
    );

    const result = await archiveBacklogItem(backlogRoot, id, {
      now: FIXED_NOW,
    });

    expect(result.result).toBe('noop');
    expect(await fileExists(join(backlogRoot, 'items', `${id}.md`))).toBe(
      false,
    );
  });

  it('creates completed.md from a scaffold when it is missing', async () => {
    const backlogRoot = await freshBacklog();
    await rm(join(backlogRoot, 'completed.md'));
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);

    const result = await archiveBacklogItem(backlogRoot, id, {
      summary: 'Fresh completed log',
      now: FIXED_NOW,
    });

    expect(result.completedEntry).toBe('scaffolded');
    const completed = await readFile(join(backlogRoot, 'completed.md'), 'utf8');
    expect(completed).toContain('## Completed Items');
    expect(completed).toContain('Fresh completed log');
  });

  it('warns and scaffolds the section when the Completed Items heading is missing', async () => {
    const backlogRoot = await freshBacklog();
    await writeFile(
      join(backlogRoot, 'completed.md'),
      '# OAT Backlog Completed\n\nNo managed heading here.\n',
      'utf8',
    );
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);

    const result = await archiveBacklogItem(backlogRoot, id, {
      summary: 'Recovered',
      now: FIXED_NOW,
    });

    expect(result.completedEntry).toBe('scaffolded');
    expect(result.warnings.some((w) => w.includes('Completed Items'))).toBe(
      true,
    );
    const completed = await readFile(join(backlogRoot, 'completed.md'), 'utf8');
    expect(completed).toContain('## Completed Items');
    expect(completed).toContain('Recovered');
  });

  it('leaves the real index and unrelated staged/unstaged bytes unchanged through archive and retry', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'oat-archive-git-'));
    tempDirs.push(tempRoot);
    const backlogRoot = join(tempRoot, '.oat', 'repo', 'pjm', 'backlog');
    await initializeBacklog(backlogRoot);
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);
    await regenerateBacklogIndex(backlogRoot);
    const reference = join(tempRoot, '.oat/repo/reference/plan.md');
    await mkdir(dirname(reference), { recursive: true });
    await writeFile(
      reference,
      `Work: [item](../pjm/backlog/items/${id}.md).\n`,
    );
    await writeFile(join(tempRoot, 'user.txt'), 'committed user bytes\n');
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: tempRoot, encoding: 'utf8' });
    git('init', '-q');
    git('config', 'user.email', 'a@b.co');
    git('config', 'user.name', 'tester');
    git('add', '.');
    git('commit', '-qm', 'seed');
    await writeFile(join(tempRoot, 'user.txt'), 'staged user bytes\n');
    git('add', 'user.txt');
    await writeFile(join(tempRoot, 'user.txt'), 'unstaged user bytes\n');
    const indexBefore = await readFile(join(tempRoot, '.git/index'));
    const cachedBefore = git('diff', '--cached', '--raw');
    const oldPath = join(backlogRoot, 'items', `${id}.md`);
    const newPath = join(backlogRoot, 'archived', `${id}.md`);
    const expectedPaths = [
      oldPath,
      newPath,
      join(backlogRoot, 'completed.md'),
      join(backlogRoot, 'index.md'),
      reference,
    ].sort();

    const result = await archiveBacklogItem(backlogRoot, id, {
      summary: 'Filesystem archive',
      now: FIXED_NOW,
    });
    expect(await readFile(join(tempRoot, '.git/index'))).toEqual(indexBefore);
    expect(git('diff', '--cached', '--raw')).toBe(cachedBefore);
    expect(git('show', ':user.txt')).toBe('staged user bytes\n');
    expect(await readFile(join(tempRoot, 'user.txt'), 'utf8')).toBe(
      'unstaged user bytes\n',
    );
    expect(await fileExists(oldPath)).toBe(false);
    expect(await readFile(newPath, 'utf8')).toContain('status: closed');
    expect(result.affectedPaths.slice().sort()).toEqual(expectedPaths);

    // A late reference exercises the real retry tail without staging any path.
    await writeFile(
      reference,
      `Work: [item](../pjm/backlog/items/${id}.md).\n`,
    );
    const retry = await archiveBacklogItem(backlogRoot, id);
    expect(retry.result).toBe('noop');
    expect(retry.affectedPaths.slice().sort()).toEqual(expectedPaths);
    expect(await readFile(reference, 'utf8')).toContain(`archived/${id}.md`);
    const settled = await archiveBacklogItem(backlogRoot, id);
    expect(settled.rewrittenReferences).toEqual([]);
    expect(settled.affectedPaths.slice().sort()).toEqual(expectedPaths);
    expect(await readFile(join(tempRoot, '.git/index'))).toEqual(indexBefore);
    expect(git('diff', '--cached', '--raw')).toBe(cachedBefore);
    expect(await readFile(join(tempRoot, 'user.txt'), 'utf8')).toBe(
      'unstaged user bytes\n',
    );
  });

  it('does not claim unrelated edits in settled archived items, ledgers, indexes or references on noop', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-archive-settled-'));
    tempDirs.push(root);
    const backlogRoot = join(root, '.oat/repo/pjm/backlog');
    await initializeBacklog(backlogRoot);
    const id = 'BL-260705-settled';
    await seedItem(backlogRoot, id);
    const ref = join(root, '.oat/repo/reference/prior.md');
    await mkdir(dirname(ref), { recursive: true });
    await writeFile(ref, `Work: [item](../pjm/backlog/items/${id}.md).\n`);
    await archiveBacklogItem(backlogRoot, id, {
      summary: 'Prior work',
      now: FIXED_NOW,
    });
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: root, encoding: 'utf8' });
    git('init', '-q');
    git('config', 'user.email', 'a@b.co');
    git('config', 'user.name', 'tester');
    git('add', '.');
    git('commit', '-qm', 'settled archive');
    const paths = [
      join(backlogRoot, 'archived', `${id}.md`),
      join(backlogRoot, 'completed.md'),
      join(backlogRoot, 'index.md'),
      ref,
    ];
    const bytes: string[] = [];
    for (const path of paths) {
      const edited = `${await readFile(path, 'utf8')}\nUNRELATED USER EDIT.\n`;
      await writeFile(path, edited);
      bytes.push(edited);
    }
    git('add', '--', ref);
    await writeFile(ref, `${bytes[3]}UNSTAGED USER EDIT.\n`);
    bytes[3] += 'UNSTAGED USER EDIT.\n';
    const before = await readFile(join(root, '.git/index'));
    const result = await archiveBacklogItem(backlogRoot, id);
    expect(result.result).toBe('noop');
    expect(result.rewrittenReferences).toEqual([]);
    expect(result.affectedPaths).toEqual([]);
    expect(await readFile(join(root, '.git/index'))).toEqual(before);
    for (const [i, path] of paths.entries()) {
      expect(await readFile(path, 'utf8')).toBe(bytes[i]);
    }
  });

  it('uses a filesystem rename outside a git work tree', async () => {
    const backlogRoot = await freshBacklog('oat-archive-nogit-');
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);

    const result = await archiveBacklogItem(backlogRoot, id, {
      summary: 'plain rename',
      now: FIXED_NOW,
    });

    expect(result.movedTo).toBe(join(backlogRoot, 'archived', `${id}.md`));
    expect(await fileExists(join(backlogRoot, 'archived', `${id}.md`))).toBe(
      true,
    );
    expect(await fileExists(join(backlogRoot, 'items', `${id}.md`))).toBe(
      false,
    );
  });

  it('returns a structured payload for archived results', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);

    const result = await archiveBacklogItem(backlogRoot, id, {
      summary: 'payload check',
      now: FIXED_NOW,
    });

    expect(result).toMatchObject({
      id,
      result: 'archived',
      status: 'closed',
      completedEntry: 'written',
      movedTo: join(backlogRoot, 'archived', `${id}.md`),
      indexRegenerated: true,
    });
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  describe('inbound reference rewriting', () => {
    const id = 'BL-260705-linked';
    const otherId = 'BL-260705-other';
    const IGNORED = `[ignored](../pjm/backlog/items/${id}.md)\n`;
    const LINKED_TARGET = `[through a symlink](../pjm/backlog/items/${id}.md)\n`;
    const NOTES = [
      `Prose mention of ${id}.md stays.`,
      `Broken wrong/items/${id}.md form.`,
      `Remote https://example.com/backlog/items/${id}.md stays.`,
      `Unrelated ../../elsewhere/backlog/items/${id}.md stays.`,
      '',
    ].join('\n');
    // Recorded commands keep their meaning: code is never rewritten.
    const CODE_ONLY = [
      `Run \`git mv .oat/repo/pjm/backlog/items/${id}.md elsewhere.md\` once.`,
      '',
      '```bash',
      `cat ../../pjm/backlog/items/${id}.md`,
      '```',
      '',
      `Double \`\` span with pjm/backlog/items/${id}.md inside \`\`.`,
      '',
    ].join('\n');

    async function writeRepoFile(
      root: string,
      relativePath: string,
      content: string,
    ): Promise<void> {
      const path = join(root, relativePath);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, 'utf8');
    }

    async function linkedRepository(
      options: { git: boolean } = { git: true },
    ): Promise<{ root: string; backlogRoot: string }> {
      const root = await mkdtemp(join(tmpdir(), 'oat-archive-links-'));
      tempDirs.push(root);
      const backlogRoot = join(root, '.oat', 'repo', 'pjm', 'backlog');
      await initializeBacklog(backlogRoot);
      await seedItem(backlogRoot, otherId);
      await writeFile(
        join(backlogRoot, 'items', `${id}.md`),
        [
          '---',
          `id: ${id}`,
          "title: 'Linked Item'",
          'status: open',
          "updated: '2026-07-01T00:00:00Z'",
          '---',
          '',
          `See [sibling](./${otherId}.md), [self](./${id}.md), and [index](../index.md).`,
          `Angle [angle](<./${otherId}.md#notes>) link.`,
          '',
          `[ref]: ./${otherId}.md`,
          '[top]: <../index.md>',
          '',
        ].join('\n'),
        'utf8',
      );
      await writeRepoFile(
        root,
        '.oat/repo/reference/external-plans/2026-07-01-plan.md',
        [
          '---',
          'oat_external_plan_sources:',
          `  - .oat/repo/pjm/backlog/items/${id}.md`,
          '---',
          '',
          `| Source | [${id}](../../pjm/backlog/items/${id}.md#acceptance-criteria) |`,
          '',
        ].join('\n'),
      );
      await writeRepoFile(
        root,
        '.oat/repo/reference/decisions/DR-260705-demo.md',
        `Tracked by [the item](../../pjm/backlog/items/${id}.md).\n`,
      );
      await writeRepoFile(
        root,
        `.oat/repo/pjm/backlog/items/${otherId}.md`,
        `${await readFile(join(backlogRoot, 'items', `${otherId}.md`), 'utf8')}\nDepends on [linked](./${id}.md) and [bare](${id}.md).\n`,
      );
      await writeRepoFile(root, '.oat/repo/reference/notes.md', NOTES);
      // A tracked symlink inside .oat/repo whose target lives outside it: the
      // scan must never read or write through it.
      await writeRepoFile(root, 'docs/linked-target.md', LINKED_TARGET);
      await symlink(
        '../../../docs/linked-target.md',
        join(root, '.oat/repo/reference/linked.md'),
      );
      await writeRepoFile(
        root,
        '.oat/repo/reference/a/b/c/deep.md',
        `[deep](../../../../pjm/backlog/items/${id}.md)\n`,
      );
      await writeRepoFile(
        root,
        '.oat/repo/top.md',
        `[top](pjm/backlog/items/${id}.md)\n`,
      );
      await writeRepoFile(root, '.oat/repo/reference/commands.md', CODE_ONLY);
      await writeRepoFile(
        root,
        'docs/outside.md',
        `[out of scope](../.oat/repo/pjm/backlog/items/${id}.md)\n`,
      );
      if (options.git) {
        execFileSync('git', ['init', '-q'], { cwd: root });
        execFileSync('git', ['config', 'user.email', 'a@b.co'], { cwd: root });
        execFileSync('git', ['config', 'user.name', 'tester'], { cwd: root });
        await writeFile(join(root, '.gitignore'), '.oat/repo/analysis/\n');
        execFileSync('git', ['add', '.'], { cwd: root });
        execFileSync('git', ['commit', '-qm', 'seed'], { cwd: root });
        // Created after the seed commit: one untracked-but-not-ignored file
        // (scanned through `--others`) and one ignored file
        // (skipped through `--exclude-standard`).
        await writeRepoFile(
          root,
          '.oat/repo/reference/untracked.md',
          `[untracked](../pjm/backlog/items/${id}.md)\n`,
        );
        await writeRepoFile(root, '.oat/repo/analysis/ignored.md', IGNORED);
      }
      return { root, backlogRoot };
    }

    it.each([{ git: true }, { git: false }])(
      'rewrites every resolvable .oat/repo reference to the archived path (git: $git)',
      async (options) => {
        const { root, backlogRoot } = await linkedRepository(options);

        const result = await archiveBacklogItem(backlogRoot, id, {
          summary: 'Linked work shipped',
          now: FIXED_NOW,
        });

        const read = (relativePath: string) =>
          readFile(join(root, relativePath), 'utf8');

        const plan = await read(
          '.oat/repo/reference/external-plans/2026-07-01-plan.md',
        );
        expect(plan).toContain(`  - .oat/repo/pjm/backlog/archived/${id}.md`);
        expect(plan).toContain(
          `[${id}](../../pjm/backlog/archived/${id}.md#acceptance-criteria)`,
        );
        expect(
          await read('.oat/repo/reference/decisions/DR-260705-demo.md'),
        ).toBe(`Tracked by [the item](../../pjm/backlog/archived/${id}.md).\n`);
        const other = await read(`.oat/repo/pjm/backlog/items/${otherId}.md`);
        expect(other).toContain(
          `Depends on [linked](../archived/${id}.md) and [bare](../archived/${id}.md).`,
        );

        // The moved item's own relative links still resolve from archived/.
        const archived = await read(`.oat/repo/pjm/backlog/archived/${id}.md`);
        expect(archived).toContain(
          `See [sibling](../items/${otherId}.md), [self](./${id}.md), and [index](../index.md).`,
        );
        expect(archived).toContain(`[ref]: ../items/${otherId}.md`);
        expect(archived).toContain('[top]: <../index.md>');
        expect(archived).toContain(
          `Angle [angle](<../items/${otherId}.md#notes>) link.`,
        );

        // Nothing is read or written through a symlink out of .oat/repo.
        expect(await read('docs/linked-target.md')).toBe(LINKED_TARGET);

        // Other depths resolve against the referencing file's own directory.
        expect(await read('.oat/repo/reference/a/b/c/deep.md')).toBe(
          `[deep](../../../../pjm/backlog/archived/${id}.md)\n`,
        );
        expect(await read('.oat/repo/top.md')).toBe(
          `[top](pjm/backlog/archived/${id}.md)\n`,
        );

        // Inline code spans and fenced code are left exactly as written.
        expect(await read('.oat/repo/reference/commands.md')).toBe(CODE_ONLY);

        // Prose and out-of-scope files are untouched; the unresolvable form warns.
        // Only tokens resolving to the old items/ path change: URLs and
        // unrelated backlog/items paths are left alone.
        expect(await read('.oat/repo/reference/notes.md')).toBe(NOTES);
        expect(
          result.warnings.some((warning) =>
            warning.includes(`../../elsewhere/backlog/items/${id}.md`),
          ),
        ).toBe(true);
        expect(
          result.warnings.some((warning) =>
            warning.includes('https://example.com'),
          ),
        ).toBe(false);
        expect(await read('docs/outside.md')).toContain(
          `pjm/backlog/items/${id}.md`,
        );
        expect(
          result.warnings.some(
            (warning) =>
              warning.includes('.oat/repo/reference/notes.md') &&
              warning.includes(`wrong/items/${id}.md`),
          ),
        ).toBe(true);

        if (options.git) {
          expect(await read('.oat/repo/reference/untracked.md')).toBe(
            `[untracked](../pjm/backlog/archived/${id}.md)\n`,
          );
          expect(await read('.oat/repo/analysis/ignored.md')).toBe(IGNORED);
        }

        expect([...result.rewrittenReferences].sort()).toEqual(
          [
            `.oat/repo/pjm/backlog/archived/${id}.md`,
            `.oat/repo/pjm/backlog/items/${otherId}.md`,
            '.oat/repo/reference/a/b/c/deep.md',
            '.oat/repo/reference/decisions/DR-260705-demo.md',
            '.oat/repo/reference/external-plans/2026-07-01-plan.md',
            '.oat/repo/top.md',
            ...(options.git ? ['.oat/repo/reference/untracked.md'] : []),
          ].sort(),
        );

        // Acceptance criterion: nothing under .oat/repo still links items/<id>.md.
        const scanned = await Promise.all(
          [
            '.oat/repo/reference/external-plans/2026-07-01-plan.md',
            '.oat/repo/reference/decisions/DR-260705-demo.md',
            `.oat/repo/pjm/backlog/items/${otherId}.md`,
            `.oat/repo/pjm/backlog/archived/${id}.md`,
            '.oat/repo/pjm/backlog/completed.md',
            '.oat/repo/pjm/backlog/index.md',
          ].map(read),
        );
        for (const content of scanned) {
          expect(content).not.toContain(`pjm/backlog/items/${id}.md`);
        }
      },
    );

    async function archiveWith(
      files: Record<string, string>,
      movedItemLines: string[] = [],
    ): Promise<{
      root: string;
      result: Awaited<ReturnType<typeof archiveBacklogItem>>;
      read: (relativePath: string) => Promise<string>;
    }> {
      const { root, backlogRoot } = await linkedRepository({ git: false });
      for (const [relativePath, content] of Object.entries(files)) {
        await writeRepoFile(root, relativePath, content);
      }
      if (movedItemLines.length > 0) {
        const itemPath = join(backlogRoot, 'items', `${id}.md`);
        await writeFile(
          itemPath,
          `${await readFile(itemPath, 'utf8')}${movedItemLines.join('\n')}\n`,
          'utf8',
        );
      }
      const result = await archiveBacklogItem(backlogRoot, id, {
        summary: 'Linked work shipped',
        now: FIXED_NOW,
      });
      return {
        root,
        result,
        read: (relativePath) => readFile(join(root, relativePath), 'utf8'),
      };
    }

    it('rewrites the external-plan template citation span and warns on code it leaves', async () => {
      // Mirrors .agents/skills/oat-repo-improve/references/plan-template.md
      // ("- Source artifact or scope: `<repo-relative path or scope>`").
      const plan = [
        '## Source and live evidence',
        '',
        `- Source artifact or scope: \`.oat/repo/pjm/backlog/items/${id}.md\``,
        '- Source artifact or scope:',
        `  \`.oat/repo/pjm/backlog/items/${id}.md\``,
        `- Criteria: \` .oat/repo/pjm/backlog/items/${id}.md#acceptance-criteria \``,
        `- Relative: \`../../pjm/backlog/items/${id}.md\``,
        `- Line: \`.oat/repo/pjm/backlog/items/${id}.md:12\``,
        '',
      ].join('\n');
      const { result, read } = await archiveWith({
        '.oat/repo/reference/external-plans/2026-07-02-cited.md': plan,
      });

      expect(
        await read('.oat/repo/reference/external-plans/2026-07-02-cited.md'),
      ).toBe(
        plan
          .replaceAll('/items/', '/archived/')
          .replace(`archived/${id}.md:12`, `items/${id}.md:12`),
      );
      // A span that is not a bare path (here `path:line`) is kept and reported.
      expect(
        result.warnings.filter((warning) =>
          warning.includes('2026-07-02-cited.md'),
        ),
      ).toHaveLength(1);
      // Commands and fenced code stay as written, but are never silent.
      expect(await read('.oat/repo/reference/commands.md')).toBe(CODE_ONLY);
      expect(
        result.warnings.filter((warning) =>
          warning.includes('.oat/repo/reference/commands.md'),
        ),
      ).toHaveLength(3);
    });

    it('never rewrites a link that already resolves to a different existing file', async () => {
      const readme = [
        `[snap](pjm/backlog/items/${id}.md)`,
        `[root](.oat/repo/pjm/backlog/items/${id}.md)`,
        '',
      ].join('\n');
      const { result, read } = await archiveWith({
        [`.oat/repo/reference/snapshot/pjm/backlog/items/${id}.md`]: 'copy\n',
        [`.oat/repo/reference/snapshot/.oat/repo/pjm/backlog/items/${id}.md`]:
          'copy\n',
        '.oat/repo/reference/snapshot/readme.md': readme,
      });

      expect(await read('.oat/repo/reference/snapshot/readme.md')).toBe(readme);
      expect(result.rewrittenReferences).not.toContain(
        '.oat/repo/reference/snapshot/readme.md',
      );
    });

    it('rebases only real reference definitions and every title form in the moved item', async () => {
      const { read } = await archiveWith({}, [
        '[^1]: See the discussion in standup.',
        '[^note]: first word of a footnote.',
        '[Note]: This matters here.',
        `[titled]: ./${otherId}.md "Sibling"`,
        `[single](./${otherId}.md 'T') and [paren](./${otherId}.md (T)).`,
      ]);

      const archived = await read(`.oat/repo/pjm/backlog/archived/${id}.md`);
      expect(archived).toContain('[^1]: See the discussion in standup.\n');
      expect(archived).toContain('[^note]: first word of a footnote.\n');
      expect(archived).toContain('[Note]: This matters here.\n');
      expect(archived).toContain(`[titled]: ../items/${otherId}.md "Sibling"`);
      expect(archived).toContain(
        `[single](../items/${otherId}.md 'T') and [paren](../items/${otherId}.md (T)).`,
      );
    });

    it('leaves a multiline code span in the moved item exactly as written', async () => {
      const span = ['Example: `', `[ref]: ./${otherId}.md`, '`.'];
      const { read } = await archiveWith({}, span);

      expect(await read(`.oat/repo/pjm/backlog/archived/${id}.md`)).toContain(
        `${span.join('\n')}\n`,
      );
    });

    it('rebases moved-item links that carry a query string', async () => {
      const { read } = await archiveWith({}, [
        `Raw [raw](./${otherId}.md?raw=1#notes) view.`,
        `[query]: ./${otherId}.md?raw=1`,
      ]);

      const archived = await read(`.oat/repo/pjm/backlog/archived/${id}.md`);
      expect(archived).toContain(
        `Raw [raw](../items/${otherId}.md?raw=1#notes) view.`,
      );
      expect(archived).toContain(`[query]: ../items/${otherId}.md?raw=1\n`);
    });

    it('replaces a rewritten file atomically so a hard-linked alias is never written', async () => {
      const { root, backlogRoot } = await linkedRepository({ git: false });
      const before = `[hl](../pjm/backlog/items/${id}.md)\n`;
      const outside = join(root, 'docs', 'hardlink-alias.md');
      const inTree = join(root, '.oat/repo/reference/hardlinked.md');
      await writeRepoFile(root, 'docs/hardlink-alias.md', before);
      await chmod(outside, 0o640);
      await link(outside, inTree);

      await archiveBacklogItem(backlogRoot, id, {
        summary: 'Linked work shipped',
        now: FIXED_NOW,
      });

      expect(await readFile(inTree, 'utf8')).toBe(
        `[hl](../pjm/backlog/archived/${id}.md)\n`,
      );
      // The outside alias keeps the old inode and its bytes.
      expect(await readFile(outside, 'utf8')).toBe(before);
      expect((await stat(inTree)).ino).not.toBe((await stat(outside)).ino);
      // The replacement keeps the original file mode.
      expect((await stat(inTree)).mode & 0o777).toBe(0o640);
      // No temporary file is left behind.
      expect(
        (await readdir(join(root, '.oat/repo/reference'))).filter((name) =>
          name.includes('.oat-rewrite-'),
        ),
      ).toEqual([]);
    });

    it('does not let a stray backtick hide links in later paragraphs', async () => {
      const { read } = await archiveWith({
        '.oat/repo/reference/stray.md': [
          'Press the ` key to open the console.',
          '',
          `See [stray](../pjm/backlog/items/${id}.md).`,
          '',
          'Then run `oat status`.',
          '',
        ].join('\n'),
      });

      expect(await read('.oat/repo/reference/stray.md')).toContain(
        `See [stray](../pjm/backlog/archived/${id}.md).`,
      );
    });

    it('retries a failed reference rewrite and index regeneration on re-run', async () => {
      const { root, backlogRoot } = await linkedRepository({ git: true });
      await regenerateBacklogIndex(backlogRoot);
      const indexPath = join(backlogRoot, 'index.md');
      expect(await readFile(indexPath, 'utf8')).toContain(id);
      const blocked = join(
        root,
        '.oat/repo/reference/decisions/DR-260705-demo.md',
      );
      const repairedEarly = join(root, '.oat/repo/pjm/early.md');
      await writeFile(repairedEarly, `Work: [item](backlog/items/${id}.md).\n`);
      execFileSync('git', ['add', '.'], { cwd: root });
      execFileSync('git', ['commit', '-qm', 'pending archive baseline'], {
        cwd: root,
      });
      await chmod(blocked, 0o000);

      try {
        await expect(
          archiveBacklogItem(backlogRoot, id, {
            summary: 'Linked work shipped',
            now: FIXED_NOW,
          }),
        ).rejects.toThrow();
      } finally {
        await chmod(blocked, 0o644);
      }
      expect(await readFile(repairedEarly, 'utf8')).toContain(
        `backlog/archived/${id}.md`,
      );
      // The move landed but the index and the blocked link did not.
      expect(await fileExists(join(backlogRoot, 'archived', `${id}.md`))).toBe(
        true,
      );
      expect(await readFile(indexPath, 'utf8')).toContain(id);
      const archivedBefore = await readFile(
        join(backlogRoot, 'archived', `${id}.md`),
        'utf8',
      );

      const retry = await archiveBacklogItem(backlogRoot, id, {
        summary: 'Linked work shipped',
        now: FIXED_NOW,
      });

      expect(retry.result).toBe('noop');
      expect(retry.indexRegenerated).toBe(true);
      expect(retry.rewrittenReferences).toContain(
        '.oat/repo/reference/decisions/DR-260705-demo.md',
      );
      // Earlier repaired files remain operation-owned after partial failure.
      expect(retry.affectedPaths).toContain(
        join(root, '.oat/repo/pjm/backlog/archived', `${id}.md`),
      );
      expect(retry.affectedPaths).toContain(blocked);
      expect(retry.affectedPaths).toContain(repairedEarly);
      expect(retry.rewrittenReferences).not.toContain('.oat/repo/pjm/early.md');
      expect(await readFile(blocked, 'utf8')).toBe(
        `Tracked by [the item](../../pjm/backlog/archived/${id}.md).\n`,
      );
      expect(await readFile(indexPath, 'utf8')).not.toContain(id);
      // The moved item was rebased by the first run and is not rebased again.
      expect(
        await readFile(join(backlogRoot, 'archived', `${id}.md`), 'utf8'),
      ).toBe(archivedBefore);
    });

    it('reports no rewrites when nothing links the item', async () => {
      const backlogRoot = await freshBacklog();
      const lonely = 'BL-260705-lonely';
      await seedItem(backlogRoot, lonely);

      const result = await archiveBacklogItem(backlogRoot, lonely, {
        summary: 'done',
        now: FIXED_NOW,
      });

      expect(result.rewrittenReferences).toEqual([]);
    });
  });
});
