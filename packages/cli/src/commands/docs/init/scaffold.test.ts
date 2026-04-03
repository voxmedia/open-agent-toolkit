import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { scaffoldDocsApp } from './scaffold';

const MKDOCS_TEMPLATE_FILES: Record<string, string> = {
  '.gitignore':
    '# Dependencies\nnode_modules/\n\n# MkDocs build output\nsite/\n\n# Python virtual environment\n.venv/\n',
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
  '.gitignore':
    '# Dependencies\nnode_modules/\n\n# Next.js build output\n.next/\nout/\n\n# fumadocs-mdx generated source\n.source/\n\n# Next.js generated types\nnext-env.d.ts\n',
  'next.config.js':
    "import { createDocsConfig } from '@open-agent-toolkit/docs-config';\nexport default createDocsConfig({ title: '{{SITE_NAME}}', description: '{{SITE_DESCRIPTION}}' });\n",
  'postcss.config.mjs':
    "const config = {\n  plugins: {\n    '@tailwindcss/postcss': {},\n  },\n};\n\nexport default config;\n",
  'source.config.ts':
    "import { defineConfig } from 'fumadocs-mdx/config';\nexport default defineConfig({});\n",
  'tsconfig.json': `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "fumadocs-mdx:collections/*": [".source/*"]
    }
  }
}
`,
  'package.json.template': `{
  "name": "{{PACKAGE_NAME}}",
  "description": "{{SITE_DESCRIPTION}}",
  "scripts": {
    "predev": "fumadocs-mdx && {{GENERATE_INDEX_CMD}}",
    "dev": "next dev",
    "prebuild": "fumadocs-mdx && {{GENERATE_INDEX_CMD}}",
    "build": "next build",
    "docs:lint": "{{DOCS_LINT_SCRIPT}}",
    "docs:format": "{{DOCS_FORMAT_SCRIPT}}",
    "docs:format:check": "{{DOCS_FORMAT_CHECK_SCRIPT}}"
  },
  "dependencies": {
    "@open-agent-toolkit/docs-config": "{{OAT_DOCS_CONFIG_DEP}}",
    "@open-agent-toolkit/docs-theme": "{{OAT_DOCS_THEME_DEP}}",
    "@open-agent-toolkit/docs-transforms": "{{OAT_DOCS_TRANSFORMS_DEP}}"
  },
  "devDependencies": {
    "@open-agent-toolkit/cli": "{{OAT_CLI_DEP}}",
    "@types/node": "^22.10.0",
    "typescript": "^5.8.3"{{FUMA_DEV_DEPENDENCIES}}
  }
}
`,
  'lib/source.ts': 'export const source = {};\n',
  'app/globals.css':
    "@import 'tailwindcss';\n@import 'fumadocs-ui/css/black.css';\n@import 'fumadocs-ui/css/preset.css';\n\n@source '../node_modules/fumadocs-ui/dist/**/*.js';\n",
  'app/layout.tsx':
    "import { DocsLayout } from '@open-agent-toolkit/docs-theme';\nexport default function Layout({ children }) { return <DocsLayout branding={{ title: '{{SITE_NAME}}', description: '{{SITE_DESCRIPTION}}' }} tree={{}}>{children}</DocsLayout>; }\n",
  'app/[[...slug]]/page.tsx':
    "import { DocsPage, Mermaid, Tab, Tabs } from '@open-agent-toolkit/docs-theme';\nimport defaultComponents from 'fumadocs-ui/mdx';\nexport default function Page() { return <div />; }\n",
  'app/api/search/route.ts':
    "import { createFromSource } from 'fumadocs-core/search/server';\nimport { source } from '@/lib/source';\nconst search = createFromSource(source);\nexport const revalidate = false;\nexport const { staticGET: GET } = search;\n",
  'docs/index.md': `---
title: '{{SITE_NAME}}'
description: '{{SITE_DESCRIPTION}}'
---

# {{SITE_NAME}}

{{SITE_DESCRIPTION}}
`,
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
      lint: 'none',
      format: 'oxfmt',
    });

    expect(result.appRoot).toBe(join(root, 'apps/oat-docs'));
    expect(result.createdFiles).toContain('mkdocs.yml');
    await expect(
      readFile(join(result.appRoot, 'docs', 'contributing.md'), 'utf8'),
    ).resolves.toContain('Installed plugins');
    await expect(
      readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ).resolves.toContain('oxfmt');
    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts['docs:format']).toBe("oxfmt 'docs/**/*.md'");
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
      format: 'oxfmt',
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

  it('scaffolds markdownlint-cli2 when lint mode is enabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-lint-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(
      root,
      'docs-app-mkdocs',
      MKDOCS_TEMPLATE_FILES,
    );

    const result = await scaffoldDocsApp({
      assetsRoot,
      repoRoot: root,
      repoShape: 'single-package',
      framework: 'mkdocs',
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
      lint: 'none',
      format: 'oxfmt',
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

    const docsIndex = await readFile(
      join(result.appRoot, 'docs', 'index.md'),
      'utf8',
    );
    expect(docsIndex).toContain("title: 'My Docs Documentation'");
    expect(docsIndex).toContain("description: 'Project documentation site'");
    expect(docsIndex).not.toContain('{{SITE_NAME}}');
    expect(docsIndex).not.toContain('{{SITE_DESCRIPTION}}');

    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as {
      description: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(packageJson.description).toBe('Project documentation site');
    expect(packageJson.scripts['predev']).toContain('docs generate-index');
    expect(packageJson.scripts['prebuild']).toContain('docs generate-index');
    expect(packageJson.devDependencies['@open-agent-toolkit/cli']).toBe(
      '^0.0.8',
    );
    expect(packageJson.devDependencies['@types/node']).toBe('^22.10.0');
    expect(packageJson.devDependencies['markdownlint-cli2']).toBeUndefined();
    expect(packageJson.devDependencies['prettier']).toBeUndefined();

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
    expect(packageJson.devDependencies['@open-agent-toolkit/cli']).toBe(
      '^0.0.8',
    );
    expect(packageJson.devDependencies['@types/node']).toBe('^22.10.0');
    expect(packageJson.devDependencies['markdownlint-cli2']).toBeUndefined();
    expect(packageJson.devDependencies['prettier']).toBeUndefined();
  });

  it('uses bundled package versions for consuming repos', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-consuming-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(
      root,
      'docs-app-fuma',
      FUMA_TEMPLATE_FILES,
    );
    await writeFile(
      join(assetsRoot, 'public-package-versions.json'),
      JSON.stringify(
        {
          'docs-config': '1.2.3',
          'docs-theme': '2.3.4',
          'docs-transforms': '3.4.5',
        },
        null,
        2,
      ),
      'utf8',
    );

    // Seed a mismatched CLI package.json to verify the manifest takes precedence.
    await writeFile(
      join(root, 'package.json'),
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
      siteDescription: 'My project docs',
      lint: 'none',
      format: 'none',
    });

    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    // Should use versioned deps, not workspace:*
    expect(packageJson.dependencies['@open-agent-toolkit/docs-config']).toBe(
      '^1.2.3',
    );
    expect(packageJson.dependencies['@open-agent-toolkit/docs-theme']).toBe(
      '^2.3.4',
    );
    expect(
      packageJson.dependencies['@open-agent-toolkit/docs-transforms'],
    ).toBe('^3.4.5');
    expect(packageJson.devDependencies['@open-agent-toolkit/cli']).toBe(
      '^9.9.9',
    );
    expect(packageJson.devDependencies['@types/node']).toBe('^22.10.0');

    // Should use oat CLI directly with paths relative to docs app
    expect(packageJson.scripts['predev']).toBe(
      'fumadocs-mdx && (oat docs generate-index --docs-dir docs --output index.md || true)',
    );
    expect(packageJson.scripts['prebuild']).toBe(
      'fumadocs-mdx && (oat docs generate-index --docs-dir docs --output index.md || true)',
    );
  });

  it('falls back to the CLI version when bundled package versions are missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-consuming-fallback-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(
      root,
      'docs-app-fuma',
      FUMA_TEMPLATE_FILES,
    );

    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: '@open-agent-toolkit/cli', version: '1.2.3' }),
      'utf8',
    );

    const result = await scaffoldDocsApp({
      assetsRoot,
      repoRoot: root,
      repoShape: 'single-package',
      framework: 'fumadocs',
      appName: 'docs',
      targetDir: 'docs',
      siteDescription: 'My project docs',
      lint: 'none',
      format: 'none',
    });

    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(packageJson.dependencies['@open-agent-toolkit/docs-config']).toBe(
      '^1.2.3',
    );
    expect(packageJson.dependencies['@open-agent-toolkit/docs-theme']).toBe(
      '^1.2.3',
    );
    expect(
      packageJson.dependencies['@open-agent-toolkit/docs-transforms'],
    ).toBe('^1.2.3');
    expect(packageJson.devDependencies['@open-agent-toolkit/cli']).toBe(
      '^1.2.3',
    );
    expect(packageJson.devDependencies['@types/node']).toBe('^22.10.0');
  });

  it('uses workspace:* deps and pnpm -w run cli for OAT repo', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-oatrepo-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(
      root,
      'docs-app-fuma',
      FUMA_TEMPLATE_FILES,
    );

    // Seed the OAT package directories so detectIsOatRepo returns true
    for (const pkg of ['cli', 'docs-config', 'docs-theme', 'docs-transforms']) {
      const pkgDir = join(root, 'packages', pkg);
      await mkdir(pkgDir, { recursive: true });
      await writeFile(
        join(pkgDir, 'package.json'),
        JSON.stringify({
          name: `@open-agent-toolkit/${pkg}`,
          version: '0.0.5',
        }),
        'utf8',
      );
    }
    await mkdir(join(root, 'apps'), { recursive: true });

    const result = await scaffoldDocsApp({
      assetsRoot,
      repoRoot: root,
      repoShape: 'monorepo',
      framework: 'fumadocs',
      appName: 'oat-docs',
      targetDir: 'apps/oat-docs',
      siteDescription: 'OAT documentation',
      lint: 'none',
      format: 'none',
    });

    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    // Should use workspace:* for OAT packages
    expect(packageJson.dependencies['@open-agent-toolkit/docs-config']).toBe(
      'workspace:*',
    );
    expect(packageJson.dependencies['@open-agent-toolkit/docs-theme']).toBe(
      'workspace:*',
    );
    expect(
      packageJson.dependencies['@open-agent-toolkit/docs-transforms'],
    ).toBe('workspace:*');
    expect(packageJson.devDependencies['@open-agent-toolkit/cli']).toBe(
      'workspace:*',
    );
    expect(packageJson.devDependencies['@types/node']).toBe('^22.10.0');

    // Should use pnpm -w run cli with full paths from workspace root
    expect(packageJson.scripts['predev']).toBe(
      'fumadocs-mdx && pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md',
    );
    expect(packageJson.scripts['prebuild']).toBe(
      'fumadocs-mdx && pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md',
    );
  });
});
