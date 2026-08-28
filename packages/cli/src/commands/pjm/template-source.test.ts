import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolvePjmTemplate } from './template-source';

// On POSIX, the real `os.homedir()` reads `$HOME` first, so only a mocked
// `homedir()` can prove which source the resolver actually consults.
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return { ...actual, homedir: vi.fn(actual.homedir) };
});

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

  it('resolves the user tier from injected home when process.env.HOME is unset', async () => {
    const roots = await createRoots();
    const user = join(roots.home, '.oat', 'templates', 'decision.md');
    const bundle = join(roots.assetsRoot, 'templates', 'decision.md');
    await seed(user, 'user');
    await seed(bundle, 'bundle');

    const previousHome = process.env.HOME;
    delete process.env.HOME;
    try {
      await expect(
        resolvePjmTemplate({
          assetsRoot: roots.assetsRoot,
          home: roots.home,
          name: 'decision.md',
        }),
      ).resolves.toEqual({ content: 'user', path: user, tier: 'user' });
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it('falls back to os.homedir() rather than process.env.HOME', async () => {
    const roots = await createRoots();
    const envHome = join(roots.home, '..', 'env-home');
    await seed(join(roots.assetsRoot, 'templates', 'decision.md'), 'bundle');
    // The installer writes managed defaults under homedir(); a diverging HOME
    // (Windows leaves it unset and derives homedir() from USERPROFILE) must
    // not be what the read path consults.
    await seed(join(roots.home, '.oat', 'templates', 'decision.md'), 'user');
    await seed(
      join(envHome, '.oat', 'templates', 'decision.md'),
      'stale-env-home',
    );

    const previousHome = process.env.HOME;
    process.env.HOME = envHome;
    vi.mocked(homedir).mockReturnValue(roots.home);
    try {
      await expect(
        resolvePjmTemplate({
          assetsRoot: roots.assetsRoot,
          name: 'decision.md',
        }),
      ).resolves.toEqual({
        content: 'user',
        path: join(roots.home, '.oat', 'templates', 'decision.md'),
        tier: 'user',
      });
    } finally {
      vi.mocked(homedir).mockRestore();
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it('reports all searched tiers when a template is missing', async () => {
    const roots = await createRoots();

    await expect(
      resolvePjmTemplate({ ...roots, name: 'missing.md' }),
    ).rejects.toThrow(/repository, user, or bundled/);
  });
});
