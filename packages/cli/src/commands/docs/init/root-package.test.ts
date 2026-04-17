import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { patchRootPackageJson } from './root-package';

describe('patchRootPackageJson', () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    const { rm } = await import('node:fs/promises');
    await Promise.all(
      createdDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    createdDirs.length = 0;
  });

  async function createRepo(
    packageJson: Record<string, unknown>,
  ): Promise<string> {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-root-package-'));
    createdDirs.push(repoRoot);
    await writeFile(
      join(repoRoot, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf8',
    );
    return repoRoot;
  }

  it('patches Turbo root build scripts and adds build:docs', async () => {
    const repoRoot = await createRepo({
      name: 'consumer-repo',
      private: true,
      scripts: {
        build: 'turbo run build --cache-dir=.turbo',
      },
    });

    const result = await patchRootPackageJson({
      repoRoot,
      appName: 'consumer-docs',
      dryRun: false,
      enabled: true,
    });

    expect(result.status).toBe('applied');
    expect(result.diff).toContain("--filter='!consumer-docs'");
    expect(result.diff).toContain('--filter=consumer-docs...');

    const packageJson = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts.build).toBe(
      "turbo run build --cache-dir=.turbo --filter='!consumer-docs'",
    );
    expect(packageJson.scripts['build:docs']).toBe(
      'turbo run build --cache-dir=.turbo --filter=consumer-docs...',
    );
  });

  it('accepts the Turbo shorthand build form', async () => {
    const repoRoot = await createRepo({
      name: 'consumer-repo',
      private: true,
      scripts: {
        build: 'turbo build --cache-dir=.turbo',
      },
    });

    const result = await patchRootPackageJson({
      repoRoot,
      appName: 'consumer-docs',
      dryRun: false,
      enabled: true,
    });

    expect(result.status).toBe('applied');

    const packageJson = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts.build).toBe(
      "turbo build --cache-dir=.turbo --filter='!consumer-docs'",
    );
    expect(packageJson.scripts['build:docs']).toBe(
      'turbo build --cache-dir=.turbo --filter=consumer-docs...',
    );
  });

  it('skips with a warning when scripts.build is missing', async () => {
    const repoRoot = await createRepo({
      name: 'consumer-repo',
      private: true,
      scripts: {
        test: 'vitest run',
      },
    });

    const result = await patchRootPackageJson({
      repoRoot,
      appName: 'consumer-docs',
      dryRun: false,
      enabled: true,
    });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('no-build-script');
    expect(result.manualSnippet).toContain(
      '"build:docs": "turbo run build --filter=consumer-docs..."',
    );

    const packageJson = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts.build).toBeUndefined();
    expect(packageJson.scripts['build:docs']).toBeUndefined();
  });

  it('skips with a warning when scripts.build does not run Turbo', async () => {
    const repoRoot = await createRepo({
      name: 'consumer-repo',
      private: true,
      scripts: {
        build: 'next build',
      },
    });

    const result = await patchRootPackageJson({
      repoRoot,
      appName: 'consumer-docs',
      dryRun: false,
      enabled: true,
    });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('non-turbo-build-script');
    expect(result.warnings[0]).toContain('does not run a Turbo build command');

    const packageJson = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts.build).toBe('next build');
    expect(packageJson.scripts['build:docs']).toBeUndefined();
  });

  it('keeps an existing build:docs script and surfaces the warning reason', async () => {
    const repoRoot = await createRepo({
      name: 'consumer-repo',
      private: true,
      scripts: {
        build: 'turbo run build --cache-dir=.turbo',
        'build:docs': 'pnpm --filter consumer-docs build',
      },
    });

    const result = await patchRootPackageJson({
      repoRoot,
      appName: 'consumer-docs',
      dryRun: false,
      enabled: true,
    });

    expect(result.status).toBe('applied');
    expect(result.reason).toBe('existing-build-docs-script');
    expect(result.warnings[0]).toContain(
      'Left scripts["build:docs"] unchanged',
    );
    expect(result.manualSnippet).toContain(
      '"build:docs": "turbo run build --cache-dir=.turbo --filter=consumer-docs..."',
    );

    const packageJson = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts.build).toBe(
      "turbo run build --cache-dir=.turbo --filter='!consumer-docs'",
    );
    expect(packageJson.scripts['build:docs']).toBe(
      'pnpm --filter consumer-docs build',
    );
  });

  it('skips when scripts.build already includes user-authored Turbo filters', async () => {
    const repoRoot = await createRepo({
      name: 'consumer-repo',
      private: true,
      scripts: {
        build: 'turbo run build --filter=@scope/app --cache-dir=.turbo',
      },
    });

    const result = await patchRootPackageJson({
      repoRoot,
      appName: 'consumer-docs',
      dryRun: false,
      enabled: true,
    });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('existing-filter-flags');
    expect(result.manualSnippet).toContain(
      `"build": "turbo run build --cache-dir=.turbo --filter='!consumer-docs'"`,
    );
    expect(result.manualSnippet).toContain(
      '"build:docs": "turbo run build --cache-dir=.turbo --filter=consumer-docs..."',
    );
    expect(result.warnings[0]).toContain('already uses `--filter`');

    const packageJson = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts.build).toBe(
      'turbo run build --filter=@scope/app --cache-dir=.turbo',
    );
    expect(packageJson.scripts['build:docs']).toBeUndefined();
  });

  it('shows the diff without mutating on dry-run', async () => {
    const repoRoot = await createRepo({
      name: 'consumer-repo',
      private: true,
      scripts: {
        build: 'turbo run build',
      },
    });

    const original = await readFile(join(repoRoot, 'package.json'), 'utf8');

    const result = await patchRootPackageJson({
      repoRoot,
      appName: 'consumer-docs',
      dryRun: true,
      enabled: true,
    });

    expect(result.status).toBe('dry-run');
    expect(result.diff).toContain('--- package.json');

    await expect(
      readFile(join(repoRoot, 'package.json'), 'utf8'),
    ).resolves.toBe(original);
  });
});
