import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { buildDocsNavTree, parseIndexContents } from './contents';
import { syncDocsNavigation } from './sync';

describe('parseIndexContents', () => {
  it('parses machine-readable links from the reserved contents section only', () => {
    const markdown = `# Docs

Intro paragraph.

## Contents

- [Getting Started](getting-started.md) - setup guide
- [Reference](reference/index.md)

## Notes

- [Ignored](ignored.md)
`;

    expect(parseIndexContents(markdown, 'docs/index.md')).toEqual([
      { title: 'Getting Started', href: 'getting-started.md' },
      { title: 'Reference', href: 'reference/index.md' },
    ]);
  });

  it('throws when the reserved contents section is missing', () => {
    expect(() => parseIndexContents('# Docs\n', 'docs/index.md')).toThrow(
      'Missing required ## Contents section in docs/index.md',
    );
  });

  it('throws when the contents section has no machine-readable links', () => {
    expect(() =>
      parseIndexContents(
        '# Docs\n\n## Contents\n\nNo links here.\n',
        'docs/index.md',
      ),
    ).toThrow('No machine-readable links found under ## Contents');
  });
});

describe('syncDocsNavigation', () => {
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

  it('builds nested navigation and preserves prose outside the contents section', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-nav-'));
    createdRoots.push(root);
    const appRoot = join(root, 'apps', 'oat-docs');
    const docsRoot = join(appRoot, 'docs');
    const apiRoot = join(docsRoot, 'api');
    await mkdir(apiRoot, { recursive: true });

    const indexSource = `# Docs Home

This prose should remain unchanged after nav sync.

## Contents

- [Getting Started](getting-started.md) - setup
- [API](api/index.md) - API tree

## Notes

Keep this section untouched.
`;

    await writeFile(
      join(appRoot, 'mkdocs.yml'),
      [
        'site_name: OAT Docs',
        'markdown_extensions:',
        '  - pymdownx.superfences:',
        '      custom_fences:',
        '        - name: mermaid',
        '          class: mermaid',
        '          format: !!python/name:pymdownx.superfences.fence_code_format',
        'nav:',
        '  - Legacy: legacy.md',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(join(docsRoot, 'index.md'), indexSource, 'utf8');
    await writeFile(
      join(docsRoot, 'getting-started.md'),
      '# Getting Started\n',
      'utf8',
    );
    await writeFile(
      join(apiRoot, 'index.md'),
      [
        '# API',
        '',
        '## Contents',
        '',
        '- [Reference](reference.md) - API details',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(join(apiRoot, 'reference.md'), '# Reference\n', 'utf8');

    const result = await syncDocsNavigation({ appRoot });
    expect(result.nav).toEqual([
      { Home: 'index.md' },
      { 'Getting Started': 'getting-started.md' },
      {
        API: ['api/index.md', { Reference: 'api/reference.md' }],
      },
    ]);

    const mkdocsConfig = YAML.parse(
      await readFile(join(appRoot, 'mkdocs.yml'), 'utf8'),
    ) as { nav: unknown };
    expect(mkdocsConfig.nav).toEqual(result.nav);
    await expect(
      readFile(join(appRoot, 'mkdocs.yml'), 'utf8'),
    ).resolves.toContain(
      'format: !!python/name:pymdownx.superfences.fence_code_format',
    );

    await expect(readFile(join(docsRoot, 'index.md'), 'utf8')).resolves.toBe(
      indexSource,
    );
  });

  it('rejects malformed or missing contents sections during nav sync', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-nav-error-'));
    createdRoots.push(root);
    const appRoot = join(root, 'apps', 'oat-docs');
    const docsRoot = join(appRoot, 'docs');
    await mkdir(docsRoot, { recursive: true });

    await writeFile(
      join(appRoot, 'mkdocs.yml'),
      'site_name: Broken Docs\n',
      'utf8',
    );
    await writeFile(
      join(docsRoot, 'index.md'),
      '# Broken Docs\n\n## Contents\n\nNot a machine-readable list.\n',
      'utf8',
    );

    await expect(syncDocsNavigation({ appRoot })).rejects.toThrow(
      'No machine-readable links found under ## Contents',
    );
  });

  it('builds nav trees directly from the docs indexes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-tree-'));
    createdRoots.push(root);
    const docsRoot = join(root, 'docs');
    await mkdir(join(docsRoot, 'guides'), { recursive: true });

    await writeFile(
      join(docsRoot, 'index.md'),
      ['# Home', '', '## Contents', '', '- [Guides](guides/index.md)', ''].join(
        '\n',
      ),
      'utf8',
    );
    await writeFile(
      join(docsRoot, 'guides', 'index.md'),
      ['# Guides', '', '## Contents', '', '- [Install](install.md)', ''].join(
        '\n',
      ),
      'utf8',
    );
    await writeFile(
      join(docsRoot, 'guides', 'install.md'),
      '# Install\n',
      'utf8',
    );

    await expect(buildDocsNavTree({ docsRoot })).resolves.toEqual([
      { Home: 'index.md' },
      { Guides: ['guides/index.md', { Install: 'guides/install.md' }] },
    ]);
  });
});
