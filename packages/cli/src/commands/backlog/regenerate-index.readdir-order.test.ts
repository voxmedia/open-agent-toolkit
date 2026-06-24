import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const readdirMode = vi.hoisted(() => ({ reverseItemsDir: false }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();

  return {
    ...actual,
    readdir: async (...args: any[]) => {
      const result = await actual.readdir(...(args as [any, any]));
      const [target] = args;

      if (
        readdirMode.reverseItemsDir &&
        typeof target === 'string' &&
        target.endsWith('/items') &&
        Array.isArray(result)
      ) {
        return [...result].reverse();
      }

      return result;
    },
  };
});

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';

import { initializeBacklog } from './init';
import { regenerateBacklogIndex } from './regenerate-index';

async function writeBacklogItem(
  itemsDir: string,
  fileName: string,
  frontmatter: Record<string, string>,
): Promise<void> {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  await writeFile(
    join(itemsDir, fileName),
    `---\n${yaml}\n---\n\n## Description\n\nDemo\n`,
    'utf8',
  );
}

describe('regenerateBacklogIndex directory ordering', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    readdirMode.reverseItemsDir = false;
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('is byte-identical when readdir returns entries in a different order', async () => {
    const backlogRoot = await mkdtemp(join(tmpdir(), 'oat-backlog-readdir-'));
    tempDirs.push(backlogRoot);
    await initializeBacklog(backlogRoot);
    const itemsDir = join(backlogRoot, 'items');
    await mkdir(itemsDir, { recursive: true });

    await writeBacklogItem(itemsDir, 'zeta.md', {
      id: 'BL-260622-zeta',
      title: '"Zeta"',
      status: 'open',
      priority: 'medium',
      scope: 'task',
      scope_estimate: 'S',
    });
    await writeBacklogItem(itemsDir, 'alpha.md', {
      id: 'BL-260622-alpha',
      title: '"Alpha"',
      status: 'open',
      priority: 'medium',
      scope: 'task',
      scope_estimate: 'S',
    });

    await regenerateBacklogIndex(backlogRoot);
    const normal = await readFile(join(backlogRoot, 'index.md'), 'utf8');

    readdirMode.reverseItemsDir = true;
    await regenerateBacklogIndex(backlogRoot);
    const reversed = await readFile(join(backlogRoot, 'index.md'), 'utf8');

    expect(reversed).toBe(normal);
  });
});
