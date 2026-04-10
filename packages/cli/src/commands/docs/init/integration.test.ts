import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { scaffoldDocsApp } from './scaffold';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(THIS_DIR, '..', '..', '..', '..', '..', '..');

async function bundleAssets(): Promise<string> {
  const { execSync } = await import('node:child_process');
  const assetsDir = await mkdtemp(join(tmpdir(), 'oat-assets-integration-'));
  execSync('bash packages/cli/scripts/bundle-assets.sh', {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    env: { ...process.env, OAT_ASSETS_DIR: assetsDir },
  });
  return assetsDir;
}

async function collectFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(fullPath)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

describe('scaffold integration', () => {
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
    'scaffolds a Fumadocs app from real templates with full token replacement',
    { timeout: 30_000 },
    async () => {
      assetsRoot = await bundleAssets();
      const root = await mkdtemp(join(tmpdir(), 'oat-integration-fuma-'));
      createdRoots.push(root);
      await mkdir(join(root, 'apps'), { recursive: true });

      // Seed OAT package dirs so detectIsOatRepo returns true
      for (const pkg of [
        'cli',
        'docs-config',
        'docs-theme',
        'docs-transforms',
      ]) {
        const pkgDir = join(root, 'packages', pkg);
        await mkdir(pkgDir, { recursive: true });
        await writeFile(
          join(pkgDir, 'package.json'),
          JSON.stringify({
            name: `@open-agent-toolkit/${pkg}`,
            version: '0.0.24',
          }),
          'utf8',
        );
      }

      const result = await scaffoldDocsApp({
        assetsRoot,
        repoRoot: root,
        repoShape: 'monorepo',
        framework: 'fumadocs',
        appName: 'test-docs',
        targetDir: 'apps/test-docs',
        siteDescription: 'Integration test documentation',
        lint: 'none',
        format: 'oxfmt',
      });

      // Verify expected files created
      expect(result.createdFiles).toContain('next.config.js');
      expect(result.createdFiles).toContain('source.config.ts');
      expect(result.createdFiles).toContain('tsconfig.json');
      expect(result.createdFiles).toContain('package.json');
      expect(result.createdFiles).toContain(join('lib', 'source.ts'));
      expect(result.createdFiles).toContain(join('app', 'layout.tsx'));
      expect(result.createdFiles).toContain(
        join('app', '[[...slug]]', 'page.tsx'),
      );
      expect(result.createdFiles).toContain(join('docs', 'index.md'));

      // Verify no unresolved template tokens in any file
      const allFiles = await collectFiles(result.appRoot);
      for (const file of allFiles) {
        const content = await readFile(file, 'utf8');
        const unresolvedTokens = content.match(/\{\{[A-Z_]+\}\}/g);
        expect(
          unresolvedTokens,
          `Unresolved tokens in ${file}: ${unresolvedTokens?.join(', ')}`,
        ).toBeNull();
      }

      // Verify site name interpolation
      const nextConfig = await readFile(
        join(result.appRoot, 'next.config.js'),
        'utf8',
      );
      expect(nextConfig).toContain('Test Docs Documentation');
      expect(nextConfig).toContain('Integration test documentation');

      // Verify layout has branding
      const layout = await readFile(
        join(result.appRoot, 'app', 'layout.tsx'),
        'utf8',
      );
      expect(layout).toContain('Test Docs Documentation');
      expect(layout).toContain('Integration test documentation');

      const tsconfig = JSON.parse(
        await readFile(join(result.appRoot, 'tsconfig.json'), 'utf8'),
      ) as {
        compilerOptions?: {
          baseUrl?: string;
          paths?: Record<string, string[]>;
        };
      };
      expect(tsconfig.compilerOptions?.baseUrl).toBe('.');
      expect(tsconfig.compilerOptions?.paths?.['@/*']).toEqual(['./*']);

      const docsIndex = await readFile(
        join(result.appRoot, 'docs', 'index.md'),
        'utf8',
      );
      expect(docsIndex).toContain("title: 'Test Docs Documentation'");
      expect(docsIndex).toContain(
        "description: 'Integration test documentation'",
      );

      // Verify package.json is valid JSON with OAT workspace deps
      const packageJson = JSON.parse(
        await readFile(join(result.appRoot, 'package.json'), 'utf8'),
      ) as {
        name: string;
        description: string;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      };
      expect(packageJson.name).toBe('test-docs');
      expect(packageJson.description).toBe('Integration test documentation');
      expect(packageJson.dependencies['@open-agent-toolkit/docs-config']).toBe(
        'workspace:*',
      );
      expect(packageJson.dependencies['@open-agent-toolkit/docs-theme']).toBe(
        'workspace:*',
      );
      expect(
        packageJson.dependencies['@open-agent-toolkit/docs-transforms'],
      ).toBe('workspace:*');
      expect(packageJson.devDependencies['@types/node']).toBe('^22.10.0');
      expect(packageJson.devDependencies['markdownlint-cli2']).toBeUndefined();
      expect(packageJson.devDependencies['prettier']).toBeUndefined();
      expect(packageJson.devDependencies['oxfmt']).toBeDefined();

      // Verify documentation config
      expect(result.documentationConfig.tooling).toBe('fumadocs');
      expect(result.documentationConfig.root).toBe('apps/test-docs');
    },
  );

  it(
    'scaffolds a Fumadocs app with versioned deps for consuming repos',
    { timeout: 30_000 },
    async () => {
      assetsRoot = await bundleAssets();
      const root = await mkdtemp(join(tmpdir(), 'oat-integration-consuming-'));
      createdRoots.push(root);

      await writeFile(
        join(assetsRoot, 'public-package-versions.json'),
        JSON.stringify(
          {
            'docs-config': '2.0.0',
            'docs-theme': '2.1.0',
            'docs-transforms': '2.2.0',
          },
          null,
          2,
        ),
        'utf8',
      );

      // Seed a CLI package.json adjacent to assetsRoot to verify it is ignored
      // when bundled public package versions are available.
      await writeFile(
        join(dirname(assetsRoot), 'package.json'),
        JSON.stringify({ name: '@open-agent-toolkit/cli', version: '9.9.9' }),
        'utf8',
      );

      const result = await scaffoldDocsApp({
        assetsRoot,
        repoRoot: root,
        repoShape: 'single-package',
        framework: 'fumadocs',
        appName: 'docs',
        targetDir: 'docs',
        siteDescription: 'Consuming repo docs',
        lint: 'none',
        format: 'none',
      });

      // Verify no unresolved template tokens
      const allFiles = await collectFiles(result.appRoot);
      for (const file of allFiles) {
        const content = await readFile(file, 'utf8');
        const unresolvedTokens = content.match(/\{\{[A-Z_]+\}\}/g);
        expect(
          unresolvedTokens,
          `Unresolved tokens in ${file}: ${unresolvedTokens?.join(', ')}`,
        ).toBeNull();
      }

      // Verify versioned deps (not workspace:*)
      const packageJson = JSON.parse(
        await readFile(join(result.appRoot, 'package.json'), 'utf8'),
      ) as {
        scripts: Record<string, string>;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      };
      expect(packageJson.dependencies['@open-agent-toolkit/docs-config']).toBe(
        '^2.0.0',
      );
      expect(packageJson.dependencies['@open-agent-toolkit/docs-theme']).toBe(
        '^2.1.0',
      );
      expect(
        packageJson.dependencies['@open-agent-toolkit/docs-transforms'],
      ).toBe('^2.2.0');
      expect(packageJson.devDependencies['@types/node']).toBe('^22.10.0');
      expect(packageJson.devDependencies['@open-agent-toolkit/cli']).toBe(
        '^9.9.9',
      );

      // Verify oat CLI with app-relative paths — no || true suppression
      expect(packageJson.scripts['predev']).toBe(
        'fumadocs-mdx && oat docs generate-index --docs-dir docs --output index.md',
      );
      expect(packageJson.scripts['prebuild']).toBe(
        'fumadocs-mdx && oat docs generate-index --docs-dir docs --output index.md',
      );
    },
  );

  it(
    'scaffolds an MkDocs app from real templates',
    { timeout: 30_000 },
    async () => {
      assetsRoot = await bundleAssets();
      const root = await mkdtemp(join(tmpdir(), 'oat-integration-mkdocs-'));
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

      expect(result.createdFiles).toContain('mkdocs.yml');
      expect(result.createdFiles).toContain('package.json');

      // Verify no unresolved tokens
      const allFiles = await collectFiles(result.appRoot);
      for (const file of allFiles) {
        const content = await readFile(file, 'utf8');
        const unresolvedTokens = content.match(/\{\{[A-Z_]+\}\}/g);
        expect(
          unresolvedTokens,
          `Unresolved tokens in ${file}: ${unresolvedTokens?.join(', ')}`,
        ).toBeNull();
      }

      expect(result.documentationConfig.tooling).toBe('mkdocs');
    },
  );

  it(
    'scaffolds markdownlint-cli2 when requested',
    { timeout: 30_000 },
    async () => {
      assetsRoot = await bundleAssets();
      const root = await mkdtemp(join(tmpdir(), 'oat-integration-lint-'));
      createdRoots.push(root);

      const result = await scaffoldDocsApp({
        assetsRoot,
        repoRoot: root,
        repoShape: 'single-package',
        framework: 'fumadocs',
        appName: 'docs',
        targetDir: 'docs',
        siteDescription: '',
        lint: 'markdownlint-cli2',
        format: 'none',
      });

      const packageJson = JSON.parse(
        await readFile(join(result.appRoot, 'package.json'), 'utf8'),
      ) as {
        scripts: Record<string, string>;
        devDependencies: Record<string, string>;
      };

      expect(packageJson.scripts['docs:lint']).toBe(
        "markdownlint-cli2 'docs/**/*.md'",
      );
      expect(packageJson.devDependencies['markdownlint-cli2']).toBe('^0.13.0');
    },
  );
});
