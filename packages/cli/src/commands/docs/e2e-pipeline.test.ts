import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { generateIndex, renderIndex } from './index-generate/generator';
import { convertAdmonitions } from './migrate/codemod';
import { injectFrontmatter } from './migrate/frontmatter';

describe('docs pipeline e2e', () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    const { rm } = await import('node:fs/promises');
    await Promise.all(
      createdDirs.map((d) => rm(d, { recursive: true, force: true })),
    );
    createdDirs.length = 0;
  });

  it('migrates MkDocs content and generates index end-to-end', async () => {
    const docsDir = await mkdtemp(join(tmpdir(), 'oat-e2e-pipeline-'));
    createdDirs.push(docsDir);

    // Create a realistic MkDocs docs structure
    await mkdir(join(docsDir, 'guides'), { recursive: true });
    await mkdir(join(docsDir, 'api'), { recursive: true });

    await writeFile(
      join(docsDir, 'index.md'),
      '---\ntitle: Home\ndescription: Welcome to the docs\n---\n\n# Welcome\n\nStart here.\n',
      'utf8',
    );

    await writeFile(
      join(docsDir, 'guides', 'getting-started.md'),
      [
        '# Getting Started',
        '',
        '!!! note "Prerequisites"',
        '    You need Node.js 20+ installed.',
        '',
        '## Installation',
        '',
        '```bash',
        'npm install @voxmedia/oat-cli',
        '```',
        '',
        '!!! tip',
        '    Run `oat init` to get started quickly.',
        '',
        '```mermaid',
        'graph LR',
        '    A[Install] --> B[Init] --> C[Build]',
        '```',
        '',
      ].join('\n'),
      'utf8',
    );

    await writeFile(
      join(docsDir, 'guides', 'configuration.md'),
      [
        '---',
        'title: Configuration',
        '---',
        '',
        '# Configuration Guide',
        '',
        '!!! warning',
        '    Back up your config before making changes.',
        '',
        'Edit `.oat/config.json` to configure your project.',
        '',
      ].join('\n'),
      'utf8',
    );

    await writeFile(
      join(docsDir, 'api', 'auth.md'),
      [
        '# Authentication',
        '',
        '!!! danger "Security"',
        '    Never commit tokens to version control.',
        '',
        '```typescript',
        'const token = process.env.OAT_TOKEN;',
        '```',
        '',
      ].join('\n'),
      'utf8',
    );

    // Step 1: Migrate — apply codemod + frontmatter to each file
    const filesToMigrate = [
      {
        path: join(docsDir, 'guides', 'getting-started.md'),
        name: 'getting-started.md',
      },
      {
        path: join(docsDir, 'guides', 'configuration.md'),
        name: 'configuration.md',
      },
      { path: join(docsDir, 'api', 'auth.md'), name: 'auth.md' },
    ];

    for (const file of filesToMigrate) {
      const content = await readFile(file.path, 'utf8');
      const codemodResult = convertAdmonitions(content);
      const fmResult = injectFrontmatter(codemodResult.content, {
        fileName: file.name,
      });
      await writeFile(file.path, fmResult.content, 'utf8');
    }

    // Verify admonitions converted
    const migratedGuide = await readFile(
      join(docsDir, 'guides', 'getting-started.md'),
      'utf8',
    );
    expect(migratedGuide).toContain('> [!NOTE] Prerequisites');
    expect(migratedGuide).toContain('> [!TIP]');
    expect(migratedGuide).not.toContain('!!! note');
    expect(migratedGuide).not.toContain('!!! tip');
    // Mermaid block preserved
    expect(migratedGuide).toContain('```mermaid');
    expect(migratedGuide).toContain('graph LR');

    // Verify frontmatter injected
    expect(migratedGuide).toContain('title: Getting Started');
    expect(migratedGuide).toContain('description: ""');

    const migratedConfig = await readFile(
      join(docsDir, 'guides', 'configuration.md'),
      'utf8',
    );
    expect(migratedConfig).toContain('> [!WARNING]');
    expect(migratedConfig).not.toContain('!!! warning');

    const migratedAuth = await readFile(
      join(docsDir, 'api', 'auth.md'),
      'utf8',
    );
    expect(migratedAuth).toContain('> [!CAUTION] Security');
    expect(migratedAuth).toContain('title: Authentication');

    // Step 2: Generate index
    const entries = await generateIndex(docsDir);
    const index = renderIndex(entries);

    // Verify index structure
    expect(entries.length).toBeGreaterThan(0);

    // index.md should be first
    expect(entries[0]!.title).toBe('Home');
    expect(entries[0]!.description).toBe('Welcome to the docs');
    expect(entries[0]!.path).toBe('index.md');

    // Directories should have children
    const apiSection = entries.find((e) => e.path === 'api');
    expect(apiSection).toBeDefined();
    expect(apiSection!.children).toHaveLength(1);
    expect(apiSection!.children![0]!.title).toBe('Authentication');

    const guidesSection = entries.find((e) => e.path === 'guides');
    expect(guidesSection).toBeDefined();
    expect(guidesSection!.children).toHaveLength(2);

    // Rendered index contains links
    expect(index).toContain('[Home](index.md)');
    expect(index).toContain('[Authentication](api/auth.md)');
    expect(index).toContain('[Getting Started](guides/getting-started.md)');
    expect(index).toContain('[Configuration](guides/configuration.md)');
  });
});
