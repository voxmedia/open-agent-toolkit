import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { resolveAssetsRoot } from '@fs/assets';
import { OAT_VERSION } from '@shared/oat-version';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { createDocsInitCommand } from './index';
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
            version: OAT_VERSION,
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
        siteName: 'Test Docs',
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

      // Verify next.config keeps only runtime docs-config options
      const nextConfig = await readFile(
        join(result.appRoot, 'next.config.js'),
        'utf8',
      );
      expect(nextConfig).toContain(
        'createDocsConfig(basePath ? { basePath } : {})',
      );
      expect(nextConfig).not.toContain('title:');
      expect(nextConfig).not.toContain('description:');
      expect(nextConfig).toContain('NEXT_PUBLIC_BASE_PATH');

      // Verify layout has Next metadata and branding
      const layout = await readFile(
        join(result.appRoot, 'app', 'layout.tsx'),
        'utf8',
      );
      expect(layout).toContain('export const metadata = {');
      expect(layout).toContain("title: 'Test Docs'");
      expect(layout).toContain("description: 'Integration test documentation'");
      expect(layout).toContain('Test Docs');
      expect(layout).toContain('Integration test documentation');
      // Search is wired via a custom static SearchDialog component (fumadocs
      // 16.10+ moved static search off DefaultSearchDialog); the layout no
      // longer carries the search api directly.
      expect(layout).toContain('SearchDialog');
      expect(layout).not.toContain('/api/search');

      const searchDialog = await readFile(
        join(result.appRoot, 'components', 'search.tsx'),
        'utf8',
      );
      expect(searchDialog).toContain("type: 'static'");
      expect(searchDialog).toContain('NEXT_PUBLIC_BASE_PATH');
      expect(searchDialog).toContain('/api/search');

      const page = await readFile(
        join(result.appRoot, 'app', '[[...slug]]', 'page.tsx'),
        'utf8',
      );
      expect(page).toContain('export async function generateMetadata');
      expect(page).toContain('title: page.data.title');
      expect(page).toContain('description: page.data.description');

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
      expect(docsIndex).not.toContain(
        'AUTOGENERATED by `oat docs generate-index`',
      );
      expect(docsIndex).toContain("title: 'Test Docs'");
      expect(docsIndex).toContain(
        "description: 'Integration test documentation'",
      );
      expect(docsIndex).toContain('## Contents');
      expect(docsIndex).toContain('[Getting Started](getting-started.md)');

      const gettingStarted = await readFile(
        join(result.appRoot, 'docs', 'getting-started.md'),
        'utf8',
      );
      expect(gettingStarted).toContain(
        "description: 'Set up the local docs toolchain and preview the site.'",
      );
      expect(gettingStarted).toContain('pnpm install');
      expect(gettingStarted).toContain('pnpm --filter test-docs dev');
      expect(gettingStarted).toContain('pnpm --filter test-docs build');

      const contributing = await readFile(
        join(result.appRoot, 'docs', 'contributing.md'),
        'utf8',
      );
      expect(contributing).toContain(
        "description: 'Authoring conventions and navigation rules.'",
      );
      expect(contributing).toContain('pnpm install');
      expect(contributing).toContain('pnpm --filter test-docs dev');
      expect(contributing).toContain(
        'Run Markdown formatting as configured for this docs app.',
      );
      expect(contributing).not.toContain('formatting and linting');

      // Verify package.json is valid JSON with OAT workspace deps
      const packageJson = JSON.parse(
        await readFile(join(result.appRoot, 'package.json'), 'utf8'),
      ) as {
        name: string;
        description: string;
        packageManager?: string;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      };
      expect(packageJson.name).toBe('test-docs');
      expect(packageJson.description).toBe('Integration test documentation');
      expect(packageJson.packageManager).toMatch(/^pnpm@/);
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
        siteName: 'Docs',
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
        packageManager?: string;
        scripts: Record<string, string>;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      };
      expect(packageJson.packageManager).toMatch(/^pnpm@/);
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
        siteName: 'Docs',
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
      const packageJson = JSON.parse(
        await readFile(join(result.appRoot, 'package.json'), 'utf8'),
      ) as { packageManager?: string };
      expect(packageJson.packageManager).toMatch(/^pnpm@/);
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
        siteName: 'Docs',
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

      const contributing = await readFile(
        join(result.appRoot, 'docs', 'contributing.md'),
        'utf8',
      );
      expect(contributing).toContain(
        'Run Markdown formatting and linting as configured for this docs app.',
      );
    },
  );
});

// These cases exercise the command with real config, scaffold and guidance writers.
describe('Markdown docs init public boundary', () => {
  const roots: string[] = [];
  const originalExit = process.exitCode;
  afterEach(async () => {
    await Promise.all(
      roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
    );
    process.exitCode = originalExit;
  });

  async function temporaryRepo(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-markdown-init-'));
    roots.push(root);
    return root;
  }

  async function runMarkdown(
    root: string,
    args: string[] = [],
    dryRun = false,
    json = true,
  ) {
    const capture = createLoggerCapture();
    const command = createDocsInitCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        cwd: root,
        home: root,
        interactive: false,
        dryRun: options.dryRun ?? false,
        json: options.json ?? false,
        verbose: false,
        logger: capture.logger,
      }),
      resolveAssetsRoot,
    });
    const program = new Command()
      .option('--json')
      .option('--dry-run')
      .addCommand(new Command('docs').addCommand(command));
    process.exitCode = undefined;
    await program.parseAsync(
      [
        ...(json ? ['--json'] : []),
        ...(dryRun ? ['--dry-run'] : []),
        'docs',
        'init',
        '--framework',
        'markdown',
        '--yes',
        ...args,
      ],
      { from: 'user' },
    );
    return { ...capture, exit: process.exitCode };
  }

  it.each(['docs', 'handbook/team'])(
    'creates authored docs at %s without changing app/package files',
    async (target) => {
      const root = await temporaryRepo();
      const packageBytes =
        '{"name":"service","scripts":{"build":"turbo run build"}}\n';
      const turboBytes = '{"tasks":{"build":{"dependsOn":["^build"]}}}\n';
      await writeFile(join(root, 'package.json'), packageBytes);
      await writeFile(join(root, 'turbo.json'), turboBytes);
      await writeFile(
        join(root, 'pnpm-workspace.yaml'),
        'packages:\n  - packages/*\n',
      );
      await mkdir(join(root, '.oat'));
      await writeFile(
        join(root, '.oat', 'config.json'),
        '{"version":1,"documentation":{"excludes":["drafts/**"],"requireForProjectCompletion":true}}\n',
      );
      const result = await runMarkdown(root, [
        '--target-dir',
        target,
        '--site-name',
        'Operators\' Handbook: "Service"',
        '--description',
        'Runtime: operations and ownership',
        '--app-name',
        'ignored-app',
        '--no-root-patch',
        '--lint',
        'markdownlint-cli2',
        '--format',
        'oxfmt',
      ]);
      expect(result.exit).toBe(0);
      expect(result.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        targetDir: target,
        createdFiles: ['index.md', 'contributing.md'],
        inapplicableOptions: ['--app-name', '--no-root-patch'],
      });
      expect(await readdir(join(root, target))).toEqual([
        'contributing.md',
        'index.md',
      ]);
      const index = await readFile(join(root, target, 'index.md'), 'utf8');
      expect(parseYaml(index.split('---')[1]!)).toMatchObject({
        title: 'Operators\' Handbook: "Service"',
        description: 'Runtime: operations and ownership',
      });
      expect(index).toContain('[Contributing](contributing.md)');
      const guidance = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(guidance).toContain(`**Authored index:** \`${target}/index.md\``);
      expect(guidance).toContain(
        `**Contributing:** \`${target}/contributing.md\``,
      );
      expect(guidance).not.toContain(`${target}/docs/index.md`);
      const config = JSON.parse(
        await readFile(join(root, '.oat', 'config.json'), 'utf8'),
      );
      expect(config.documentation).toEqual({
        root: target,
        tooling: 'markdown',
        index: `${target}/index.md`,
        excludes: ['drafts/**'],
        requireForProjectCompletion: true,
      });
      expect(await readFile(join(root, 'package.json'), 'utf8')).toBe(
        packageBytes,
      );
      expect(await readFile(join(root, 'turbo.json'), 'utf8')).toBe(turboBytes);
    },
  );

  it('defaults to literal docs even in a monorepo and emits file-level next steps', async () => {
    const root = await temporaryRepo();
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      'packages:\n  - packages/*\n',
    );
    const result = await runMarkdown(root, [], false, false);
    expect(result.exit).toBe(0);
    expect(await readdir(join(root, 'docs'))).toEqual([
      'contributing.md',
      'index.md',
    ]);
    expect(result.info.join('\n')).toContain('Read docs/index.md');
    expect(result.info.join('\n')).not.toContain('pnpm install');
    expect(result.info.join('\n')).not.toContain('pnpm build');
  });

  it.each(['.', '../escaped'])(
    'refuses unsafe target %s before writes',
    async (target) => {
      const root = await temporaryRepo();
      await writeFile(join(root, 'README.md'), '# Existing service\n');
      const result = await runMarkdown(root, ['--target-dir', target]);
      expect(result.exit).toBe(1);
      expect(result.jsonPayloads[0]).toMatchObject({ status: 'error' });
      expect(await readdir(root)).toEqual(['README.md']);
    },
  );

  it('refuses an escaping symlink ancestor before creating a child', async () => {
    const root = await temporaryRepo();
    const outside = await temporaryRepo();
    await symlink(outside, join(root, 'alias'));
    const result = await runMarkdown(root, ['--target-dir', 'alias/docs']);
    expect(result.exit).toBe(1);
    expect(await readdir(root)).toEqual(['alias']);
    expect(await readdir(outside)).toEqual([]);
  });

  it('refuses populated content with --yes and preserves meaningful docs and instructions', async () => {
    const root = await temporaryRepo();
    await mkdir(join(root, 'docs'));
    const index = '# Operator handbook\n\nKeep escalation ownership here.\n';
    const agents =
      '# Local guidance\n\nConsult the team before changing runbooks.\n';
    await writeFile(join(root, 'docs', 'index.md'), index);
    await writeFile(join(root, 'AGENTS.md'), agents);
    const result = await runMarkdown(root);
    expect(result.exit).toBe(1);
    expect(result.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('Use --adopt'),
    });
    expect(await readFile(join(root, 'docs', 'index.md'), 'utf8')).toBe(index);
    expect(await readFile(join(root, 'AGENTS.md'), 'utf8')).toBe(agents);
    expect(await readdir(root)).toEqual(['AGENTS.md', 'docs']);
    expect(await readdir(join(root, 'docs'))).toEqual(['index.md']);
  });

  it('keeps explicitly authorized framework initialization over configured Markdown', async () => {
    const root = await temporaryRepo();
    await mkdir(join(root, '.oat'));
    await mkdir(join(root, 'docs'));
    const index =
      '# Existing handbook\n\nRetain the incident response context.\n';
    await writeFile(join(root, 'docs', 'index.md'), index);
    await writeFile(
      join(root, '.oat', 'config.json'),
      '{"version":1,"documentation":{"tooling":"markdown","root":"docs","index":"docs/index.md"}}',
    );
    const result = await runMarkdown(root, [
      '--framework',
      'fumadocs',
      '--target-dir',
      'site',
    ]);
    expect(result.exit).toBe(0);
    expect(result.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      framework: 'fumadocs',
    });
    const config = JSON.parse(
      await readFile(join(root, '.oat', 'config.json'), 'utf8'),
    );
    expect(config.documentation).toMatchObject({
      tooling: 'fumadocs',
      root: 'site',
      index: 'site/index.md',
    });
    expect(await readFile(join(root, 'docs', 'index.md'), 'utf8')).toBe(index);
    expect(
      await readFile(join(root, 'site', 'next.config.js'), 'utf8'),
    ).toContain('createDocsConfig');
  });

  it('rejects --adopt for app frameworks before writes', async () => {
    const root = await temporaryRepo();
    const result = await runMarkdown(root, [
      '--framework',
      'mkdocs',
      '--adopt',
    ]);
    expect(result.exit).toBe(1);
    expect(result.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: '--adopt applies only to --framework markdown.',
    });
    expect(await readdir(root)).toEqual([]);
  });

  it.each([
    { tooling: 'fumadocs', root: 'apps/docs', index: 'apps/docs/index.md' },
    { tooling: 'custom-engine', root: 'docs' },
    { tooling: 'markdown', root: 'handbook', index: 'handbook/index.md' },
    { tooling: 'markdown', root: 'docs', index: 'docs/other.md' },
  ])(
    'refuses incompatible declared config %j before writes',
    async (documentation) => {
      const root = await temporaryRepo();
      await mkdir(join(root, '.oat'));
      const bytes = JSON.stringify({ version: 1, documentation });
      await writeFile(join(root, '.oat', 'config.json'), bytes);
      const result = await runMarkdown(root);
      expect(result.exit).toBe(1);
      expect(result.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining('incompatible'),
      });
      expect(await readFile(join(root, '.oat', 'config.json'), 'utf8')).toBe(
        bytes,
      );
      expect(await readdir(root)).toEqual(['.oat']);
    },
  );
});
