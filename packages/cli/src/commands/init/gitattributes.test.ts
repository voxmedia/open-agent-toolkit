import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { applyOatCoreGitattributes } from './gitattributes';

describe('applyOatCoreGitattributes', () => {
  const roots: string[] = [];
  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  async function createRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-gitattributes-'));
    roots.push(root);
    return root;
  }

  it('creates the managed generated-artifact block', async () => {
    const root = await createRoot();
    await expect(applyOatCoreGitattributes(root)).resolves.toMatchObject({
      action: 'created',
    });
    await expect(readFile(join(root, '.gitattributes'), 'utf8')).resolves.toBe(
      '# OAT core\n.oat/projects/shared/** linguist-generated=true\n# END OAT core\n',
    );
  });

  it('preserves unrelated attributes and is idempotent', async () => {
    const root = await createRoot();
    await writeFile(join(root, '.gitattributes'), '*.md text\n', 'utf8');
    await expect(applyOatCoreGitattributes(root)).resolves.toMatchObject({
      action: 'updated',
    });
    await expect(applyOatCoreGitattributes(root)).resolves.toMatchObject({
      action: 'no-change',
    });
    expect(await readFile(join(root, '.gitattributes'), 'utf8')).toContain(
      '*.md text',
    );
  });

  it('replaces a stale managed block', async () => {
    const root = await createRoot();
    await writeFile(
      join(root, '.gitattributes'),
      '# OAT core\nold/** generated\n# END OAT core\n',
      'utf8',
    );
    await expect(applyOatCoreGitattributes(root)).resolves.toMatchObject({
      action: 'updated',
    });
    const content = await readFile(join(root, '.gitattributes'), 'utf8');
    expect(content).not.toContain('old/**');
    expect(content).toContain(
      '.oat/projects/shared/** linguist-generated=true',
    );
  });
});
