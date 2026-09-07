import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { OAT_VERSION } from '@shared/oat-version';
import { afterEach, describe, expect, it } from 'vitest';

import { PNPM_FALLBACK, scaffoldDocsApp } from './scaffold';

const MKDOCS_TEMPLATE_FILES: Record<string, string> = {
  '.gitignore':
    '# Dependencies\nnode_modules/\n\n# MkDocs build output\nsite/\n\n# Python virtual environment\n.venv/\n',
  'mkdocs.yml': 'site_name: {{SITE_NAME}}\n',
  'package.json.template': `{
  "name": "{{PACKAGE_NAME}}"{{PACKAGE_MANAGER_FIELD}},
  "scripts": {
    "docs:install": "{{INSTALL_CMD}}",
    "docs:dev": "{{DEV_CMD}}",
    "docs:build": "{{BUILD_CMD}}",
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
    "import { createDocsConfig } from '@open-agent-toolkit/docs-config';\nconst basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;\nexport default createDocsConfig(basePath ? { basePath } : {});\n",
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
  "name": "{{PACKAGE_NAME}}"{{PACKAGE_MANAGER_FIELD}},
  "description": "{{SITE_DESCRIPTION}}",
  "scripts": {
    "docs:install": "{{INSTALL_CMD}}",
    "docs:dev": "{{DEV_CMD}}",
    "docs:build": "{{BUILD_CMD}}",
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
    "import { DocsLayout } from '@open-agent-toolkit/docs-theme';\nconst basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';\nexport const metadata = { title: '{{SITE_NAME}}', description: '{{SITE_DESCRIPTION}}' };\nexport default function Layout({ children }) { return <DocsLayout branding={{ title: '{{SITE_NAME}}', description: '{{SITE_DESCRIPTION}}' }} tree={{}} searchApi={`${basePath}/api/search`}>{children}</DocsLayout>; }\n",
  'components/search.tsx':
    "'use client';\nexport default function StaticSearchDialog() { return null; }\n",
  'app/[[...slug]]/page.tsx':
    "import { DocsPage, Mermaid, Tab, Tabs } from '@open-agent-toolkit/docs-theme';\nimport defaultComponents from 'fumadocs-ui/mdx';\nexport async function generateMetadata(props) { const page = { data: { title: '{{SITE_NAME}}', description: '{{SITE_DESCRIPTION}}' } }; return { title: page.data.title, description: page.data.description }; }\nexport default function Page() { return <div />; }\n",
  'app/api/search/route.ts':
    "import { createFromSource } from 'fumadocs-core/search/server';\nimport { source } from '@/lib/source';\nconst search = createFromSource(source);\nexport const revalidate = false;\nexport const { staticGET: GET } = search;\n",
  'docs/index.md': `---
title: '{{SITE_NAME}}'
description: '{{SITE_DESCRIPTION}}'
---

# {{SITE_NAME}}

{{SITE_DESCRIPTION}}

## Contents

- [Getting Started](getting-started.md)
- [Contributing](contributing.md)
`,
  'docs/getting-started.md': `---
title: Getting Started
description: 'Set up the local docs toolchain and preview the site.'
---

# Getting Started

\`\`\`bash
{{INSTALL_CMD}}
\`\`\`

\`\`\`bash
{{DEV_CMD}}
\`\`\`

\`\`\`bash
{{BUILD_CMD}}
\`\`\`
`,
  'docs/contributing.md': `---
title: Contributing
description: 'Authoring conventions and navigation rules.'
---

# Contributing

\`\`\`bash
{{INSTALL_CMD}}
\`\`\`

\`\`\`bash
{{DEV_CMD}}
\`\`\`

Run Markdown {{LINT_PHRASE}} as configured for this docs app.
`,
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
      siteName: 'OAT Docs',
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
      readFile(join(result.appRoot, 'mkdocs.yml'), 'utf8'),
    ).resolves.toBe('site_name: OAT Docs\n');
    await expect(
      readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ).resolves.toContain('oxfmt');
    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts['docs:install']).toBe('pnpm install');
    expect(packageJson.scripts['docs:dev']).toBe('pnpm --filter oat-docs dev');
    expect(packageJson.scripts['docs:build']).toBe(
      'pnpm --filter oat-docs build',
    );
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
      siteName: 'Widget Docs',
      targetDir: 'docs',
      siteDescription: '',
      lint: 'none',
      format: 'oxfmt',
    });

    expect(result.appRoot).toBe(join(root, 'docs'));
    await expect(
      readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ).resolves.toContain('docs lint disabled');
    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts['docs:install']).toBe('cd docs && pnpm install');
    expect(packageJson.scripts['docs:dev']).toBe('cd docs && pnpm dev');
    expect(packageJson.scripts['docs:build']).toBe('cd docs && pnpm build');
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
  });

  it('omits packageManager when an ancestor package.json provides one', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-inherited-pm-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(
      root,
      'docs-app-mkdocs',
      MKDOCS_TEMPLATE_FILES,
    );
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify(
        { name: 'widget-service', packageManager: 'pnpm@8.15.0' },
        null,
        2,
      ),
      'utf8',
    );

    const result = await scaffoldDocsApp(
      {
        assetsRoot,
        repoRoot: root,
        repoShape: 'single-package',
        framework: 'mkdocs',
        appName: 'docs',
        siteName: 'Docs',
        targetDir: 'docs',
        siteDescription: '',
        lint: 'none',
        format: 'none',
      },
      {
        detectPnpmVersion: async () => {
          throw new Error('pnpm version should not be read when inherited');
        },
      },
    );

    const packageJsonSource = await readFile(
      join(result.appRoot, 'package.json'),
      'utf8',
    );
    const packageJson = JSON.parse(packageJsonSource) as {
      packageManager?: string;
      scripts: Record<string, string>;
    };
    expect(packageJsonSource).not.toContain('"packageManager"');
    expect(packageJson.packageManager).toBeUndefined();
    expect(packageJson.scripts['docs:install']).toBe('cd docs && pnpm install');
  });

  it('uses the fallback pnpm version when detection returns no version', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-pm-fallback-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(
      root,
      'docs-app-mkdocs',
      MKDOCS_TEMPLATE_FILES,
    );

    const result = await scaffoldDocsApp(
      {
        assetsRoot,
        repoRoot: root,
        repoShape: 'single-package',
        framework: 'mkdocs',
        appName: 'docs',
        siteName: 'Docs',
        targetDir: 'docs',
        siteDescription: '',
        lint: 'none',
        format: 'none',
      },
      {
        detectPnpmVersion: async () => '',
        hasInheritedPackageManager: async () => false,
      },
    );

    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as { packageManager?: string };
    expect(packageJson.packageManager).toBe(`pnpm@${PNPM_FALLBACK}`);
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

    const result = await scaffoldDocsApp(
      {
        assetsRoot,
        repoRoot: root,
        repoShape: 'monorepo',
        framework: 'fumadocs',
        appName: 'my-docs',
        siteName: 'My Docs',
        targetDir: 'apps/my-docs',
        siteDescription: 'Project documentation site',
        lint: 'none',
        format: 'oxfmt',
      },
      {
        detectPnpmVersion: async () => '9.8.7',
        hasInheritedPackageManager: async () => false,
      },
    );

    expect(result.appRoot).toBe(join(root, 'apps/my-docs'));
    expect(result.createdFiles).toContain('next.config.js');
    expect(result.createdFiles).toContain(join('app', 'layout.tsx'));
    expect(result.createdFiles).toContain(join('docs', 'index.md'));

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

    const layout = await readFile(
      join(result.appRoot, 'app', 'layout.tsx'),
      'utf8',
    );
    expect(layout).toContain('export const metadata = {');
    expect(layout).toContain("title: 'My Docs'");
    expect(layout).toContain("description: 'Project documentation site'");
    expect(layout).toMatch(
      /branding=\{\{[\s\S]*title: 'My Docs'[\s\S]*description: 'Project documentation site'[\s\S]*\}\}/,
    );
    expect(layout).toContain('Project documentation site');
    expect(layout).toContain('NEXT_PUBLIC_BASE_PATH');
    expect(layout).toContain('/api/search');

    const page = await readFile(
      join(result.appRoot, 'app', '[[...slug]]', 'page.tsx'),
      'utf8',
    );
    expect(page).toContain('export async function generateMetadata');
    expect(page).toContain('title: page.data.title');
    expect(page).toContain('description: page.data.description');

    const docsIndex = await readFile(
      join(result.appRoot, 'docs', 'index.md'),
      'utf8',
    );
    expect(docsIndex).not.toContain(
      'AUTOGENERATED by `oat docs generate-index`',
    );
    expect(docsIndex).toContain("title: 'My Docs'");
    expect(docsIndex).toContain("description: 'Project documentation site'");
    expect(docsIndex).toContain('## Contents');
    expect(docsIndex).toContain('[Getting Started](getting-started.md)');
    expect(docsIndex).not.toContain('{{SITE_NAME}}');
    expect(docsIndex).not.toContain('{{SITE_DESCRIPTION}}');

    const gettingStarted = await readFile(
      join(result.appRoot, 'docs', 'getting-started.md'),
      'utf8',
    );
    expect(gettingStarted).toContain(
      "description: 'Set up the local docs toolchain and preview the site.'",
    );
    expect(gettingStarted).toContain('pnpm install');
    expect(gettingStarted).toContain('pnpm --filter my-docs dev');
    expect(gettingStarted).toContain('pnpm --filter my-docs build');

    const contributing = await readFile(
      join(result.appRoot, 'docs', 'contributing.md'),
      'utf8',
    );
    expect(contributing).toContain(
      "description: 'Authoring conventions and navigation rules.'",
    );
    expect(contributing).toContain('pnpm install');
    expect(contributing).toContain('pnpm --filter my-docs dev');
    expect(contributing).toContain(
      'Run Markdown formatting as configured for this docs app.',
    );
    expect(contributing).not.toContain('formatting and linting');

    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as {
      description: string;
      packageManager?: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(packageJson.description).toBe('Project documentation site');
    expect(packageJson.packageManager).toBe('pnpm@9.8.7');
    expect(packageJson.scripts['docs:install']).toBe('pnpm install');
    expect(packageJson.scripts['docs:dev']).toBe('pnpm --filter my-docs dev');
    expect(packageJson.scripts['docs:build']).toBe(
      'pnpm --filter my-docs build',
    );
    expect(packageJson.scripts['predev']).toContain('docs generate-index');
    expect(packageJson.scripts['prebuild']).toContain('docs generate-index');
    expect(packageJson.devDependencies['@open-agent-toolkit/cli']).toBe(
      `^${OAT_VERSION}`,
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

    // The Fumadocs seed names the generated app-root manifest that
    // `oat docs generate-index` writes, not the authored source page under
    // `docs/`, so a fresh scaffold is correct before the first build.
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
      siteName: 'Docs',
      targetDir: 'docs',
      siteDescription: '',
      lint: 'none',
      format: 'none',
    });

    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as { devDependencies: Record<string, string> };
    expect(packageJson.devDependencies['@open-agent-toolkit/cli']).toBe(
      `^${OAT_VERSION}`,
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
      siteName: 'Docs',
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

    // Should use oat CLI directly with paths relative to docs app — no || true suppression
    expect(packageJson.scripts['predev']).toBe(
      'fumadocs-mdx && oat docs generate-index --docs-dir docs --output index.md',
    );
    expect(packageJson.scripts['prebuild']).toBe(
      'fumadocs-mdx && oat docs generate-index --docs-dir docs --output index.md',
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
      siteName: 'Docs',
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

  it('uses workspace:* for locally found OAT packages and published versions for the rest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-partial-'));
    createdRoots.push(root);
    const assetsRoot = await seedAssets(
      root,
      'docs-app-fuma',
      FUMA_TEMPLATE_FILES,
    );

    // Seed only docs-config and docs-theme locally (not cli or docs-transforms)
    for (const pkg of ['docs-config', 'docs-theme']) {
      const pkgDir = join(root, 'packages', pkg);
      await mkdir(pkgDir, { recursive: true });
      await writeFile(
        join(pkgDir, 'package.json'),
        JSON.stringify({
          name: `@open-agent-toolkit/${pkg}`,
          version: '0.0.16',
        }),
        'utf8',
      );
    }

    const result = await scaffoldDocsApp({
      assetsRoot,
      repoRoot: root,
      repoShape: 'single-package',
      framework: 'fumadocs',
      appName: 'docs',
      siteName: 'Docs',
      targetDir: 'docs',
      siteDescription: 'Partial local packages',
      lint: 'none',
      format: 'none',
    });

    const packageJson = JSON.parse(
      await readFile(join(result.appRoot, 'package.json'), 'utf8'),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    // Local packages should use workspace:*
    expect(packageJson.dependencies['@open-agent-toolkit/docs-config']).toBe(
      'workspace:*',
    );
    expect(packageJson.dependencies['@open-agent-toolkit/docs-theme']).toBe(
      'workspace:*',
    );
    // Non-local packages should use published versions
    expect(
      packageJson.dependencies['@open-agent-toolkit/docs-transforms'],
    ).toMatch(/^\^/);
    expect(packageJson.devDependencies['@open-agent-toolkit/cli']).toMatch(
      /^\^/,
    );
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
          version: OAT_VERSION,
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
      siteName: 'OAT Docs',
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

    // Should use the source CLI with full paths from workspace root
    expect(packageJson.scripts['predev']).toBe(
      'fumadocs-mdx && pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md',
    );
    expect(packageJson.scripts['prebuild']).toBe(
      'fumadocs-mdx && pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md',
    );
  });
});
