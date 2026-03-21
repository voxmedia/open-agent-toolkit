import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { initializeBacklog } from './init';

describe('initializeBacklog', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('creates the backlog directories and starter markdown files', async () => {
    const backlogRoot = await mkdtemp(join(tmpdir(), 'oat-backlog-init-'));
    tempDirs.push(backlogRoot);

    await initializeBacklog(backlogRoot);

    await expect(access(join(backlogRoot, 'items'))).resolves.toBeUndefined();
    await expect(
      access(join(backlogRoot, 'archived')),
    ).resolves.toBeUndefined();
    await expect(
      access(join(backlogRoot, 'items', '.gitkeep')),
    ).resolves.toBeUndefined();
    await expect(
      access(join(backlogRoot, 'archived', '.gitkeep')),
    ).resolves.toBeUndefined();

    const index = await readFile(join(backlogRoot, 'index.md'), 'utf8');
    expect(index).toContain('# OAT Backlog Index');
    expect(index).toContain('## Curated Overview');
    expect(index).toContain('<!-- OAT BACKLOG-INDEX -->');
    expect(index).toContain('<!-- END OAT BACKLOG-INDEX -->');
    expect(index).toContain('## Notes');

    const completed = await readFile(join(backlogRoot, 'completed.md'), 'utf8');
    expect(completed).toContain('# OAT Backlog Completed');
    expect(completed).toContain('## Entry Format');
    expect(completed).toContain('## Completed Items');
  });

  it('does not overwrite existing backlog markdown files on rerun', async () => {
    const backlogRoot = await mkdtemp(join(tmpdir(), 'oat-backlog-init-'));
    tempDirs.push(backlogRoot);

    await initializeBacklog(backlogRoot);

    const indexPath = join(backlogRoot, 'index.md');
    const completedPath = join(backlogRoot, 'completed.md');
    const customIndex = '# Custom Backlog Index\n';
    const customCompleted = '# Custom Completed\n';

    await writeFile(indexPath, customIndex, 'utf8');
    await writeFile(completedPath, customCompleted, 'utf8');

    await initializeBacklog(backlogRoot);

    await expect(readFile(indexPath, 'utf8')).resolves.toBe(customIndex);
    await expect(readFile(completedPath, 'utf8')).resolves.toBe(
      customCompleted,
    );
  });

  it('preserves curated overview edits when the scaffold runs again', async () => {
    const backlogRoot = await mkdtemp(join(tmpdir(), 'oat-backlog-init-'));
    tempDirs.push(backlogRoot);

    await initializeBacklog(backlogRoot);

    const indexPath = join(backlogRoot, 'index.md');
    const index = await readFile(indexPath, 'utf8');
    const updatedIndex = index.replace(
      '- Add brief narrative summaries here as backlog items are created and reprioritized.',
      '- Keep this curated summary.',
    );
    await writeFile(indexPath, updatedIndex, 'utf8');

    await initializeBacklog(backlogRoot);

    await expect(readFile(indexPath, 'utf8')).resolves.toContain(
      '- Keep this curated summary.',
    );
  });

  it('does not overwrite existing directory placeholders on rerun', async () => {
    const backlogRoot = await mkdtemp(join(tmpdir(), 'oat-backlog-init-'));
    tempDirs.push(backlogRoot);

    await initializeBacklog(backlogRoot);

    const itemsPlaceholder = join(backlogRoot, 'items', '.gitkeep');
    await writeFile(itemsPlaceholder, 'keep me\n', 'utf8');

    await initializeBacklog(backlogRoot);

    await expect(readFile(itemsPlaceholder, 'utf8')).resolves.toBe('keep me\n');
  });
});
