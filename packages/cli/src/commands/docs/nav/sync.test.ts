import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLoggerCapture } from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { buildDocsNavTree, parseIndexContents } from './contents';
import { createDocsNavSyncCommand, syncDocsNavigation } from './sync';

async function writeTree(
  root: string,
  files: Record<string, string>,
): Promise<void> {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(root, relativePath);
    await mkdir(join(filePath, '..'), { recursive: true });
    await writeFile(filePath, content, 'utf8');
  }
}

function indexPage(heading: string, links: string[], title?: string): string {
  return [
    ...(title ? ['---', `title: ${title}`, '---', ''] : []),
    `# ${heading}`,
    '',
    '## Contents',
    '',
    ...links.map((link) => `- ${link} - entry`),
    '',
  ].join('\n');
}

/**
 * Nested Fumadocs fixture: a root, a two-level `guides/advanced` tree, a
 * sibling `reference` folder, cross-folder Contents links in both directions,
 * an unlisted page at two depths, and an orphan folder no Contents map lists.
 */
async function createFumadocsFixture(root: string): Promise<string> {
  const appRoot = join(root, 'apps', 'docs');
  await writeTree(appRoot, {
    'source.config.ts': 'export default {};\n',
    'docs/index.md': indexPage(
      'Docs Home',
      [
        '[Getting Started](getting-started.md)',
        '[Guides](guides/index.md)',
        '[Reference](reference/index.md)',
        '[Advanced Topic](guides/advanced/deep.md)',
      ],
      'Fixture Docs',
    ),
    'docs/getting-started.md': '# Getting Started\n',
    'docs/stray.md': '# Stray\n',
    'docs/guides/index.md': indexPage('Guides Overview', [
      '[Install](install.md)',
      '[Advanced](advanced/index.md)',
      '[API Reference](../reference/api.md)',
    ]),
    'docs/guides/install.md': '# Install\n',
    'docs/guides/advanced/index.md': indexPage(
      'Advanced Heading',
      ['[Deep Dive](deep.md)', '[Back to Reference](../../reference/index.md)'],
      'Advanced Guides',
    ),
    'docs/guides/advanced/deep.md': '# Deep Dive\n',
    'docs/guides/advanced/hidden.md': '# Hidden\n',
    'docs/reference/index.md': indexPage(
      'Reference Heading',
      ['[API](api.md)'],
      "'Reference: API'",
    ),
    'docs/reference/api.md': '# API\n',
    'docs/orphan/index.md': indexPage('Orphan', ['[Lost](lost.md)']),
    'docs/orphan/lost.md': '# Lost\n',
  });
  return appRoot;
}

async function readMeta(docsRoot: string, folder: string): Promise<unknown> {
  return JSON.parse(
    await readFile(join(docsRoot, folder, 'meta.json'), 'utf8'),
  );
}

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

  it('writes strict Fumadocs meta.json files from nested Contents maps', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-fuma-'));
    createdRoots.push(root);
    const appRoot = await createFumadocsFixture(root);
    const docsRoot = join(appRoot, 'docs');

    const result = await syncDocsNavigation({ appRoot });

    expect(result.framework).toBe('fumadocs');
    await expect(readMeta(docsRoot, '.')).resolves.toEqual({
      title: 'Fixture Docs',
      pages: [
        'index',
        'getting-started',
        'guides',
        'reference',
        '[Advanced Topic](/guides/advanced/deep)',
      ],
    });
    await expect(readMeta(docsRoot, 'guides')).resolves.toEqual({
      title: 'Guides Overview',
      pages: ['install', 'advanced', '[API Reference](/reference/api)'],
    });
    await expect(readMeta(docsRoot, 'guides/advanced')).resolves.toEqual({
      title: 'Advanced Guides',
      pages: ['deep', '[Back to Reference](/reference)'],
    });
    await expect(readMeta(docsRoot, 'reference')).resolves.toEqual({
      title: 'Reference: API',
      pages: ['api'],
    });
    await expect(readMeta(docsRoot, 'orphan')).resolves.toEqual({
      title: 'Orphan',
      pages: ['lost'],
    });

    const allPages = JSON.stringify(
      await Promise.all(
        ['.', 'guides', 'guides/advanced', 'reference', 'orphan'].map((dir) =>
          readMeta(docsRoot, dir),
        ),
      ),
    );
    expect(allPages).not.toContain('"..."');
    expect(allPages).not.toContain('z...a');

    if (result.framework !== 'fumadocs') throw new Error('unreachable');
    expect(result.unlisted).toEqual([
      'guides/advanced/hidden.md',
      'orphan/',
      'stray.md',
    ]);
    expect(result.written).toEqual([
      'guides/advanced/meta.json',
      'guides/meta.json',
      'meta.json',
      'orphan/meta.json',
      'reference/meta.json',
    ]);
    expect(
      await readFile(join(docsRoot, 'reference', 'meta.json'), 'utf8'),
    ).toBe(
      `${JSON.stringify({ title: 'Reference: API', pages: ['api'] }, null, 2)}\n`,
    );
  });

  it('falls back to the first H1 outside code fences for the folder title', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-fuma-title-'));
    createdRoots.push(root);
    const appRoot = join(root, 'docs-app');
    await writeTree(appRoot, {
      'source.config.ts': 'export default {};\n',
      'docs/index.md': [
        '---',
        'description: no title here',
        '---',
        '',
        '```md',
        '# Not The Title',
        '```',
        '',
        '# Real Title',
        '',
        '## Contents',
        '',
        '- [Page](page.md)',
        '',
      ].join('\n'),
      'docs/page.md': '# Page\n',
    });

    await syncDocsNavigation({ appRoot });

    await expect(readMeta(join(appRoot, 'docs'), '.')).resolves.toEqual({
      title: 'Real Title',
      pages: ['index', 'page'],
    });
  });

  it('writes nothing on a second run, even after the files are reformatted', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-fuma-rerun-'));
    createdRoots.push(root);
    const appRoot = await createFumadocsFixture(root);
    const docsRoot = join(appRoot, 'docs');

    await syncDocsNavigation({ appRoot });

    // Reformat every written file the way a formatter might: different
    // whitespace, key order, and no trailing newline. Meaning is unchanged.
    const folders = ['.', 'guides', 'guides/advanced', 'reference', 'orphan'];
    const reformatted = new Map<string, string>();
    for (const folder of folders) {
      const metaPath = join(docsRoot, folder, 'meta.json');
      const meta = JSON.parse(await readFile(metaPath, 'utf8')) as {
        title: string;
        pages: string[];
      };
      const text = `{\t"pages": ${JSON.stringify(meta.pages)},\t"title": ${JSON.stringify(meta.title)} }`;
      await writeFile(metaPath, text, 'utf8');
      reformatted.set(metaPath, text);
    }

    const second = await syncDocsNavigation({ appRoot });

    if (second.framework !== 'fumadocs') throw new Error('unreachable');
    expect(second.written).toEqual([]);
    for (const [metaPath, text] of reformatted) {
      await expect(readFile(metaPath, 'utf8')).resolves.toBe(text);
    }
  });

  it('keeps keys it does not own and rewrites stale pages', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-fuma-merge-'));
    createdRoots.push(root);
    const appRoot = await createFumadocsFixture(root);
    const docsRoot = join(appRoot, 'docs');
    await writeFile(
      join(docsRoot, 'reference', 'meta.json'),
      JSON.stringify({ icon: 'Book', pages: ['...'], title: 'Old' }),
      'utf8',
    );

    const result = await syncDocsNavigation({ appRoot });

    if (result.framework !== 'fumadocs') throw new Error('unreachable');
    expect(result.written).toContain('reference/meta.json');
    await expect(readMeta(docsRoot, 'reference')).resolves.toEqual({
      icon: 'Book',
      title: 'Reference: API',
      pages: ['api'],
    });
  });

  it('keeps the MkDocs path when the app has mkdocs.yml', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-mkdocs-path-'));
    createdRoots.push(root);
    const appRoot = join(root, 'site');
    const mkdocsSource = 'site_name: Site\nnav:\n  - Old: old.md\n';
    await writeTree(appRoot, {
      'mkdocs.yml': mkdocsSource,
      'docs/index.md': indexPage('Home', ['[Page](page.md)']),
      'docs/page.md': '# Page\n',
    });

    const result = await syncDocsNavigation({ appRoot });

    expect(result.framework).toBe('mkdocs');
    await expect(readFile(join(appRoot, 'mkdocs.yml'), 'utf8')).resolves.toBe(
      'site_name: Site\nnav:\n  - Home: index.md\n  - Page: page.md\n',
    );
    await expect(
      readFile(join(appRoot, 'docs', 'meta.json'), 'utf8'),
    ).rejects.toThrow();
  });

  it('fails when no docs framework marker is present', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-unknown-'));
    createdRoots.push(root);
    const appRoot = join(root, 'site');
    await writeTree(appRoot, {
      'docs/index.md': indexPage('Home', ['[Page](page.md)']),
      'docs/page.md': '# Page\n',
    });

    await expect(syncDocsNavigation({ appRoot })).rejects.toThrow(
      /Could not detect the docs framework/,
    );
  });
});

describe('docs nav sync command (Fumadocs)', () => {
  const createdRoots: string[] = [];
  let originalExitCode: typeof process.exitCode;

  afterEach(async () => {
    process.exitCode = originalExitCode;
    const { rm } = await import('node:fs/promises');
    await Promise.all(
      createdRoots.map((root) => rm(root, { recursive: true, force: true })),
    );
    createdRoots.length = 0;
  });

  async function run(appRoot: string, json: boolean) {
    originalExitCode = process.exitCode;
    const capture = createLoggerCapture();
    const command = createDocsNavSyncCommand({
      buildCommandContext: () => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json,
        cwd: appRoot,
        home: appRoot,
        interactive: false,
        logger: capture.logger,
      }),
    });
    const program = new Command().name('oat').exitOverride();
    program.addCommand(command);
    await program.parseAsync(['sync', '--target-dir', '.'], { from: 'user' });
    return capture;
  }

  it('reports unlisted pages and written files in --json output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-fuma-json-'));
    createdRoots.push(root);
    const appRoot = await createFumadocsFixture(root);

    const capture = await run(appRoot, true);

    expect(process.exitCode).toBe(0);
    expect(capture.jsonPayloads).toEqual([
      expect.objectContaining({
        status: 'ok',
        framework: 'fumadocs',
        written: expect.arrayContaining(['meta.json', 'guides/meta.json']),
        unlisted: ['guides/advanced/hidden.md', 'orphan/', 'stray.md'],
      }),
    ]);
  });

  it('reports unlisted pages by path and no changes on a rerun in human output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-docs-fuma-human-'));
    createdRoots.push(root);
    const appRoot = await createFumadocsFixture(root);

    await run(appRoot, false);
    const capture = await run(appRoot, false);

    const output = [...capture.info, ...capture.warn].join('\n');
    expect(output).toContain('No meta.json changes');
    expect(output).toContain('guides/advanced/hidden.md');
    expect(output).toContain('orphan/');
    expect(output).toContain('stray.md');
  });
});
