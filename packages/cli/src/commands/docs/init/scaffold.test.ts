import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scaffoldDocsApp } from './scaffold';

const TEMPLATE_FILES = {
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

async function seedAssets(root: string): Promise<string> {
  const assetsRoot = join(root, 'assets');
  const templateRoot = join(assetsRoot, 'templates', 'docs-app');

  for (const [relativePath, content] of Object.entries(TEMPLATE_FILES)) {
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
    const assetsRoot = await seedAssets(root);
    await mkdir(join(root, 'apps'), { recursive: true });

    const result = await scaffoldDocsApp({
      assetsRoot,
      repoRoot: root,
      repoShape: 'monorepo',
      appName: 'oat-docs',
      targetDir: 'apps/oat-docs',
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
  });

  it('scaffolds a docs app in a single-package target without creating a workspace file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-single-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(root);
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'widget-service', private: true }, null, 2),
      'utf8',
    );

    const result = await scaffoldDocsApp({
      assetsRoot,
      repoRoot: root,
      repoShape: 'single-package',
      appName: 'docs',
      targetDir: 'docs',
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
});
