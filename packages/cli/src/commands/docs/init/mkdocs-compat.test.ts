import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { scaffoldDocsApp } from './scaffold';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(THIS_DIR, '..', '..', '..', '..', '..', '..');

async function bundleAssets(): Promise<string> {
  const { execSync } = await import('node:child_process');
  const assetsDir = await mkdtemp(join(tmpdir(), 'oat-assets-mkdocs-compat-'));
  execSync('bash packages/cli/scripts/bundle-assets.sh', {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    env: { ...process.env, OAT_ASSETS_DIR: assetsDir },
  });
  return assetsDir;
}

describe('MkDocs scaffold compatibility (FR8)', () => {
  const createdRoots: string[] = [];
  let assetsRoot: string;

  afterEach(async () => {
    const { rm } = await import('node:fs/promises');
    const toClean = [...createdRoots];
    if (assetsRoot) toClean.push(assetsRoot);
    await Promise.all(
      toClean.map((root) => rm(root, { recursive: true, force: true })),
    );
    createdRoots.length = 0;
  });

  it(
    'scaffolds MkDocs app with correct structure and config',
    { timeout: 30_000 },
    async () => {
      assetsRoot = await bundleAssets();
      const root = await mkdtemp(join(tmpdir(), 'oat-mkdocs-compat-'));
      createdRoots.push(root);

      const result = await scaffoldDocsApp({
        assetsRoot,
        repoRoot: root,
        repoShape: 'single-package',
        framework: 'mkdocs',
        appName: 'docs',
        targetDir: 'docs',
        siteDescription: '',
        lint: 'none',
        format: 'oxfmt',
      });

      // Verify core MkDocs files
      expect(result.createdFiles).toContain('mkdocs.yml');
      expect(result.createdFiles).toContain('package.json');

      // Verify mkdocs.yml content
      const mkdocsYml = await readFile(
        join(result.appRoot, 'mkdocs.yml'),
        'utf8',
      );
      expect(mkdocsYml).toContain('site_name:');
      expect(mkdocsYml).toContain('Docs');

      // Verify documentation config fields
      expect(result.documentationConfig.tooling).toBe('mkdocs');
      expect(result.documentationConfig.root).toBe('docs');
      expect(result.documentationConfig.config).toContain('mkdocs.yml');
      expect(result.documentationConfig.index).toContain('mkdocs.yml');
    },
  );

  it(
    'scaffolds MkDocs app without Fumadocs dependencies',
    { timeout: 30_000 },
    async () => {
      assetsRoot = await bundleAssets();
      const root = await mkdtemp(join(tmpdir(), 'oat-mkdocs-nodeps-'));
      createdRoots.push(root);

      const result = await scaffoldDocsApp({
        assetsRoot,
        repoRoot: root,
        repoShape: 'single-package',
        framework: 'mkdocs',
        appName: 'my-docs',
        targetDir: 'my-docs',
        siteDescription: '',
      });

      // Verify no Fumadocs-specific files
      expect(result.createdFiles).not.toContain('next.config.js');
      expect(result.createdFiles).not.toContain('source.config.ts');
      expect(result.createdFiles).not.toContain(join('lib', 'source.ts'));
      expect(result.createdFiles).not.toContain(
        join('app', '[[...slug]]', 'page.tsx'),
      );

      // Verify package.json doesn't reference OAT packages
      const packageJson = await readFile(
        join(result.appRoot, 'package.json'),
        'utf8',
      );
      expect(packageJson).not.toContain('@voxmedia/oat-docs-config');
      expect(packageJson).not.toContain('@voxmedia/oat-docs-theme');
      expect(packageJson).not.toContain('@voxmedia/oat-docs-transforms');
    },
  );
});
