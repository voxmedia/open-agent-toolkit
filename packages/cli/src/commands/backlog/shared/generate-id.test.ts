import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  generateBacklogId,
  generateUniqueBacklogId,
  readExistingBacklogIds,
} from './generate-id';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map(async (dir) => {
      const { rm } = await import('node:fs/promises');
      await rm(dir, { recursive: true, force: true });
    }),
  );
  tempDirs.length = 0;
});

describe('generateBacklogId', () => {
  it('returns a backlog id with the expected prefix and hash length', () => {
    const id = generateBacklogId(
      'oat-project-capture-skill',
      '2026-03-15T22:30:00Z',
    );

    expect(id).toMatch(/^bl-[a-f0-9]{4}$/);
  });

  it('returns the same id for the same filename and timestamp', () => {
    const createdAt = '2026-03-15T22:30:00Z';

    expect(generateBacklogId('demo-item', createdAt)).toBe(
      generateBacklogId('demo-item', createdAt),
    );
  });

  it('allows callers to reproduce a known id when the original timestamp is provided', () => {
    const createdAt = '2026-03-15T22:30:00Z';
    const knownId = generateBacklogId('demo-item', createdAt);

    expect(generateBacklogId('demo-item', createdAt)).toBe(knownId);
    expect(generateBacklogId('demo-item', '2026-03-15T22:31:00Z')).not.toBe(
      knownId,
    );
  });

  it('returns different ids for different inputs', () => {
    const createdAt = '2026-03-15T22:30:00Z';

    expect(generateBacklogId('demo-item-a', createdAt)).not.toBe(
      generateBacklogId('demo-item-b', createdAt),
    );
    expect(generateBacklogId('demo-item-a', createdAt)).not.toBe(
      generateBacklogId('demo-item-a', '2026-03-15T22:31:00Z'),
    );
  });

  it('keeps the original candidate when no collision exists', () => {
    const createdAt = '2026-03-15T22:30:00Z';

    expect(generateUniqueBacklogId('demo-item', createdAt, [])).toBe(
      generateBacklogId('demo-item', createdAt),
    );
  });

  it('re-hashes with a nonce when the initial candidate collides', () => {
    const createdAt = '2026-03-15T22:30:00Z';
    const first = generateBacklogId('demo-item', createdAt);
    const second = generateBacklogId('demo-item', createdAt, 1);
    const unique = generateUniqueBacklogId('demo-item', createdAt, [first]);

    expect(unique).toBe(second);
    expect(unique).not.toBe(first);
  });

  it('skips multiple occupied candidates until it finds an unused id', () => {
    const createdAt = '2026-03-15T22:30:00Z';
    const occupied = [
      generateBacklogId('demo-item', createdAt, 0),
      generateBacklogId('demo-item', createdAt, 1),
      generateBacklogId('demo-item', createdAt, 2),
    ];

    expect(generateUniqueBacklogId('demo-item', createdAt, occupied)).toBe(
      generateBacklogId('demo-item', createdAt, 3),
    );
  });

  it('includes archived backlog item ids in the uniqueness scan', async () => {
    const backlogRoot = await mkdtemp(join(tmpdir(), 'oat-backlog-ids-'));
    tempDirs.push(backlogRoot);

    await mkdir(join(backlogRoot, 'items'), { recursive: true });
    await mkdir(join(backlogRoot, 'archived'), { recursive: true });

    const createdAt = '2026-03-15T22:30:00Z';
    const archivedId = generateBacklogId('demo-item', createdAt);
    await writeFile(
      join(backlogRoot, 'archived', 'demo-item.md'),
      `---\nid: ${archivedId}\ntitle: Demo Item\n---\n`,
      'utf8',
    );

    const ids = await readExistingBacklogIds(backlogRoot);

    expect(ids).toContain(archivedId);
    expect(generateUniqueBacklogId('demo-item', createdAt, ids)).not.toBe(
      archivedId,
    );
  });
});
