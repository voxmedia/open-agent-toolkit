import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolvePjmTemplate } from './template-source';

describe('resolvePjmTemplate', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRoots(): Promise<{
    assetsRoot: string;
    home: string;
    templatesRoot: string;
  }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-template-'));
    tempDirs.push(root);
    return {
      assetsRoot: join(root, 'assets'),
      home: join(root, 'home'),
      templatesRoot: join(root, 'repo', '.oat', 'templates'),
    };
  }

  async function seed(path: string, content: string): Promise<void> {
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, content, 'utf8');
  }

  it('uses repository, user, then bundled precedence with provenance', async () => {
    const roots = await createRoots();
    const repository = join(roots.templatesRoot, 'decision.md');
    const user = join(roots.home, '.oat', 'templates', 'decision.md');
    const bundle = join(roots.assetsRoot, 'templates', 'decision.md');
    await seed(repository, 'repository');
    await seed(user, 'user');
    await seed(bundle, 'bundle');

    await expect(
      resolvePjmTemplate({ ...roots, name: 'decision.md' }),
    ).resolves.toEqual({
      content: 'repository',
      path: repository,
      tier: 'repository',
    });

    await rm(repository);
    await expect(
      resolvePjmTemplate({ ...roots, name: 'decision.md' }),
    ).resolves.toEqual({ content: 'user', path: user, tier: 'user' });

    await rm(user);
    await expect(
      resolvePjmTemplate({ ...roots, name: 'decision.md' }),
    ).resolves.toEqual({ content: 'bundle', path: bundle, tier: 'bundle' });
  });

  it('reports all searched tiers when a template is missing', async () => {
    const roots = await createRoots();

    await expect(
      resolvePjmTemplate({ ...roots, name: 'missing.md' }),
    ).rejects.toThrow(/repository, user, or bundled/);
  });
});
