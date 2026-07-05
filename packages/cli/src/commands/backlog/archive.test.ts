import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { archiveBacklogItem, BacklogArchiveError } from './archive';
import { initializeBacklog } from './init';

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

  it('scaffolds a TODO summary when closing without --summary', async () => {
    const backlogRoot = await freshBacklog();
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);

    const result = await archiveBacklogItem(backlogRoot, id, {
      now: FIXED_NOW,
    });

    expect(result.completedEntry).toBe('written');
    const completed = await readFile(join(backlogRoot, 'completed.md'), 'utf8');
    expect(completed).toContain('TODO: summarize outcome');
  });

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

  it('uses git mv inside a git work tree so the move is a staged rename', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'oat-archive-git-'));
    tempDirs.push(tempRoot);
    const backlogRoot = join(tempRoot, '.oat', 'repo', 'pjm', 'backlog');
    await initializeBacklog(backlogRoot);
    const id = 'BL-260705-demo';
    await seedItem(backlogRoot, id);

    execFileSync('git', ['init', '-q'], { cwd: tempRoot });
    execFileSync('git', ['config', 'user.email', 'a@b.co'], { cwd: tempRoot });
    execFileSync('git', ['config', 'user.name', 'tester'], { cwd: tempRoot });
    execFileSync('git', ['add', '.'], { cwd: tempRoot });
    execFileSync('git', ['commit', '-qm', 'seed'], { cwd: tempRoot });

    await archiveBacklogItem(backlogRoot, id, {
      summary: 'via git mv',
      now: FIXED_NOW,
    });

    expect(await fileExists(join(backlogRoot, 'archived', `${id}.md`))).toBe(
      true,
    );
    expect(await fileExists(join(backlogRoot, 'items', `${id}.md`))).toBe(
      false,
    );
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd: tempRoot,
      encoding: 'utf8',
    });
    // A staged rename (R) — not an untracked (??) plain-filesystem move.
    expect(status).toMatch(/^R/m);
    expect(status).not.toMatch(/^\?\?.*archived/m);
  });

  it('falls back to a filesystem rename outside a git work tree', async () => {
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
});
