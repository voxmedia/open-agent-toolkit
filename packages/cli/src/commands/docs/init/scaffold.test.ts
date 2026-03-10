import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scaffoldDocsApp } from './scaffold';

const MKDOCS_TEMPLATE_FILES: Record<string, string> = {
  '.markdownlint-cli2.jsonc': '{ "config": { "MD013": false } }\n',
  'mkdocs.yml': 'site_name: {{SITE_NAME}}\n',
  'package.json.template': `{
  "name": "{{PACKAGE_NAME}}",
  "scripts": {
    "docs:lint": "{{DOCS_LINT_SCRIPT}}",
    "docs:format": "{{DOCS_FORMAT_SCRIPT}}",
    "docs:format:check": "{{DOCS_FORMAT_CHECK_SCRIPT}}"
  },
  "devDependencies": {
{{DEV_DEPENDENCIES}}
  }
}
`,
  'requirements.txt': 'mkdocs==1.4.2\nmkdocs-material==9.0.14\n',
  'setup-docs.sh': '#!/bin/sh\necho "{{APP_NAME}}"\n',
  'docs/index.md':
    '# {{SITE_NAME}}\n\n## Contents\n\n- [Getting Started](getting-started.md)\n',
  'docs/getting-started.md': '# Getting Started\n',
  'docs/contributing.md':
    '# Contributing\n\n## Installed plugins\n\n### `search`\n\n### `git-revision-date`\n',
};

const FUMA_TEMPLATE_FILES: Record<string, string> = {
  'next.config.js':
    "import { createDocsConfig } from '@oat/docs-config';\nexport default createDocsConfig({ title: '{{SITE_NAME}}', description: '{{SITE_DESCRIPTION}}' });\n",
  'source.config.ts':
    "import { defineConfig } from 'fumadocs-mdx/config';\nexport default defineConfig({});\n",
  'tsconfig.json': '{ "extends": "next/core-js" }\n',
  'package.json.template': `{
  "name": "{{PACKAGE_NAME}}",
  "description": "{{SITE_DESCRIPTION}}",
  "scripts": {
    "predev": "npx oat docs generate-index",
    "dev": "next dev",
    "prebuild": "npx oat docs generate-index",
    "build": "next build",
    "docs:lint": "{{DOCS_LINT_SCRIPT}}",
    "docs:format": "{{DOCS_FORMAT_SCRIPT}}",
    "docs:format:check": "{{DOCS_FORMAT_CHECK_SCRIPT}}"
  },
  "devDependencies": {
    "typescript": "^5.8.3"{{FUMA_DEV_DEPENDENCIES}}
  }
}
`,
  'lib/source.ts': 'export const source = {};\n',
  'app/layout.tsx':
    "import { DocsLayout } from '@oat/docs-theme';\nexport default function Layout({ children }) { return <DocsLayout branding={{ title: '{{SITE_NAME}}', description: '{{SITE_DESCRIPTION}}' }} tree={{}}>{children}</DocsLayout>; }\n",
  'app/[[...slug]]/page.tsx':
    "import { Mermaid } from '@oat/docs-theme';\nexport default function Page() { return <div />; }\n",
  'app/api/search/route.ts':
    "import { createFromSource } from 'fumadocs-core/search/server';\nimport { source } from '@/lib/source';\nconst search = createFromSource(source);\nexport const revalidate = false;\nexport const { staticGET: GET } = search;\n",
  'docs/index.md': '# {{SITE_NAME}}\n\n{{SITE_DESCRIPTION}}\n',
  'docs/getting-started.md': '# Getting Started\n',
  'docs/contributing.md': '# Contributing\n',
};

async function seedAssets(
  root: string,
  templateDir: string,
  files: Record<string, string>,
): Promise<string> {
  const assetsRoot = join(root, 'assets');
  const templateRoot = join(assetsRoot, 'templates', templateDir);

  for (const [relativePath, content] of Object.entries(files)) {
    const target = join(templateRoot, relativePath);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, content, 'utf8');
  }

  return assetsRoot;
}

describe('scaffoldDocsApp', () => {
  const createdRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      createdRoots.map(async (root) => {
        const { rm } = await import('node:fs/promises');
        await rm(root, { recursive: true, force: true });
      }),
    );
    createdRoots.length = 0;
  });

  it('scaffolds a docs app in a monorepo-style target', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-monorepo-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(
      root,
      'docs-app-mkdocs',
      MKDOCS_TEMPLATE_FILES,
    );
    await mkdir(join(root, 'apps'), { recursive: true });

    const result = await scaffoldDocsApp({
      assetsRoot,
      repoRoot: root,
      repoShape: 'monorepo',
      framework: 'mkdocs',
      appName: 'oat-docs',
      targetDir: 'apps/oat-docs',
      siteDescription: '',
      lint: 'markdownlint',
      format: 'prettier',
    });

    expect(result.appRoot).toBe(join(root, 'apps/oat-docs'));
    expect(result.createdFiles).toContain('mkdocs.yml');
    await expect(
      readFile(join(result.appRoot, 'docs', 'contributing.md'), 'utf8'),
    ).resolves.toContain('Installed plugins');
    await expect(
      readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ).resolves.toContain('markdownlint-cli2');
    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts['docs:lint']).toBe(
      "markdownlint-cli2 'docs/**/*.md'",
    );
    expect(result.documentationConfig).toEqual({
      root: 'apps/oat-docs',
      tooling: 'mkdocs',
      config: join('apps/oat-docs', 'mkdocs.yml'),
      index: join('apps/oat-docs', 'mkdocs.yml'),
    });
  });

  it('scaffolds a docs app in a single-package target without creating a workspace file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-single-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(
      root,
      'docs-app-mkdocs',
      MKDOCS_TEMPLATE_FILES,
    );
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'widget-service', private: true }, null, 2),
      'utf8',
    );

    const result = await scaffoldDocsApp({
      assetsRoot,
      repoRoot: root,
      repoShape: 'single-package',
      framework: 'mkdocs',
      appName: 'docs',
      targetDir: 'docs',
      siteDescription: '',
      lint: 'none',
      format: 'prettier',
    });

    expect(result.appRoot).toBe(join(root, 'docs'));
    await expect(
      readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ).resolves.toContain('docs lint disabled');
    await expect(
      readFile(join(result.appRoot, 'package.json'), 'utf8').then((content) =>
        JSON.parse(content),
      ),
    ).resolves.toBeTruthy();
    await expect(
      readFile(join(root, 'pnpm-workspace.yaml'), 'utf8'),
    ).rejects.toThrow();
  });

  it('scaffolds a Fumadocs app with token replacements', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-fuma-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(
      root,
      'docs-app-fuma',
      FUMA_TEMPLATE_FILES,
    );
    await mkdir(join(root, 'apps'), { recursive: true });

    const result = await scaffoldDocsApp({
      assetsRoot,
      repoRoot: root,
      repoShape: 'monorepo',
      framework: 'fumadocs',
      appName: 'my-docs',
      targetDir: 'apps/my-docs',
      siteDescription: 'Project documentation site',
      lint: 'markdownlint',
      format: 'prettier',
    });

    expect(result.appRoot).toBe(join(root, 'apps/my-docs'));
    expect(result.createdFiles).toContain('next.config.js');
    expect(result.createdFiles).toContain(join('app', 'layout.tsx'));
    expect(result.createdFiles).toContain(join('docs', 'index.md'));

    const nextConfig = await readFile(
      join(result.appRoot, 'next.config.js'),
      'utf8',
    );
    expect(nextConfig).toContain('My Docs Documentation');
    expect(nextConfig).toContain('Project documentation site');

    const layout = await readFile(
      join(result.appRoot, 'app', 'layout.tsx'),
      'utf8',
    );
    expect(layout).toContain('Project documentation site');

    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as {
      description: string;
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(packageJson.description).toBe('Project documentation site');
    expect(packageJson.scripts['predev']).toContain('oat docs generate-index');
    expect(packageJson.scripts['prebuild']).toContain(
      'oat docs generate-index',
    );
    expect(packageJson.devDependencies['markdownlint-cli2']).toBeDefined();
    expect(packageJson.devDependencies['prettier']).toBeDefined();

    const searchRoute = await readFile(
      join(result.appRoot, 'app', 'api', 'search', 'route.ts'),
      'utf8',
    );
    expect(searchRoute).toContain('createFromSource');
    expect(searchRoute).toContain('staticGET');
    expect(searchRoute).toContain('revalidate = false');

    expect(result.createdFiles).toContain(
      join('app', 'api', 'search', 'route.ts'),
    );
    expect(result.documentationConfig).toEqual({
      root: 'apps/my-docs',
      tooling: 'fumadocs',
      index: join('apps/my-docs', 'index.md'),
    });
  });

  it('scaffolds a Fumadocs app without optional lint/format deps', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-fuma-nodeps-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(
      root,
      'docs-app-fuma',
      FUMA_TEMPLATE_FILES,
    );

    const result = await scaffoldDocsApp({
      assetsRoot,
      repoRoot: root,
      repoShape: 'single-package',
      framework: 'fumadocs',
      appName: 'docs',
      targetDir: 'docs',
      siteDescription: '',
      lint: 'none',
      format: 'none',
    });

    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as { devDependencies: Record<string, string> };
    expect(packageJson.devDependencies['markdownlint-cli2']).toBeUndefined();
    expect(packageJson.devDependencies['prettier']).toBeUndefined();
  });
});
