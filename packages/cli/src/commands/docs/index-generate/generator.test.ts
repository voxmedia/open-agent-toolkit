import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { generateIndex, renderIndex } from './generator';

describe('generateIndex', () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    const { rm } = await import('node:fs/promises');
    await Promise.all(
      createdDirs.map((d) => rm(d, { recursive: true, force: true })),
    );
    createdDirs.length = 0;
  });

  it('generates entries from flat directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-index-flat-'));
    createdDirs.push(dir);
    await writeFile(
      join(dir, 'index.md'),
      '---\ntitle: Home\ndescription: Welcome\n---\n# Home\n',
      'utf8',
    );
    await writeFile(
      join(dir, 'getting-started.md'),
      '---\ntitle: Getting Started\n---\n# Getting Started\n',
      'utf8',
    );
    await writeFile(
      join(dir, 'faq.md'),
      '# Frequently Asked Questions\n\nContent.\n',
      'utf8',
    );

    const entries = await generateIndex(dir);
    expect(entries).toHaveLength(3);
    expect(entries[0]!.title).toBe('Home');
    expect(entries[0]!.description).toBe('Welcome');
    expect(entries[0]!.path).toBe('index.md');
    // index.md should always be first
    expect(entries[1]!.path).toBe('faq.md');
    expect(entries[1]!.title).toBe('Frequently Asked Questions');
    expect(entries[2]!.path).toBe('getting-started.md');
  });

  it('generates entries from nested directories', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-index-nested-'));
    createdDirs.push(dir);
    await writeFile(join(dir, 'index.md'), '---\ntitle: Docs\n---\n', 'utf8');
    await mkdir(join(dir, 'api', 'nested'), { recursive: true });
    await writeFile(
      join(dir, 'api', 'auth.md'),
      '---\ntitle: Authentication\ndescription: Auth API\n---\n',
      'utf8',
    );
    await writeFile(
      join(dir, 'api', 'nested', 'index.md'),
      '---\ntitle: Nested API\n---\n',
      'utf8',
    );
    await writeFile(
      join(dir, 'api', 'nested', 'tokens.md'),
      '---\ntitle: Tokens\n---\n',
      'utf8',
    );

    const entries = await generateIndex(dir);
    expect(entries).toHaveLength(2);
    expect(entries[1]!.title).toBe('Api');
    expect(entries[1]!.children).toHaveLength(2);
    const authEntry = entries[1]!.children!.find(
      (child) => child.title === 'Authentication',
    );
    expect(authEntry).toBeDefined();
    expect(authEntry!.path).toBe(join('api', 'auth.md'));
    const nestedEntry = entries[1]!.children!.find(
      (child) => child.title === 'Nested',
    );
    expect(nestedEntry).toBeDefined();
    expect(nestedEntry!.path).toBe(join('api', 'nested'));
    expect(nestedEntry!.children).toHaveLength(2);
    expect(nestedEntry!.children![0]!.path).toBe(
      join('api', 'nested', 'index.md'),
    );
    expect(nestedEntry!.children![1]!.path).toBe(
      join('api', 'nested', 'tokens.md'),
    );
  });

  it('falls back to heading then filename for title', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-index-fallback-'));
    createdDirs.push(dir);
    await writeFile(
      join(dir, 'no-frontmatter.md'),
      '# My Page\n\nContent.\n',
      'utf8',
    );
    await writeFile(join(dir, 'no-heading.md'), 'Just content.\n', 'utf8');

    const entries = await generateIndex(dir);
    expect(entries).toHaveLength(2);
    const page1 = entries.find((e) => e.path === 'no-frontmatter.md');
    expect(page1!.title).toBe('My Page');
    const page2 = entries.find((e) => e.path === 'no-heading.md');
    expect(page2!.title).toBe('No Heading');
  });

  it('handles empty directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-index-empty-'));
    createdDirs.push(dir);

    const entries = await generateIndex(dir);
    expect(entries).toHaveLength(0);
  });
});

describe('renderIndex', () => {
  it('renders entries as markdown list', () => {
    const output = renderIndex([
      { title: 'Home', description: 'Welcome', path: 'index.md' },
      { title: 'Getting Started', path: 'getting-started.md' },
    ]);
    expect(output).toContain('- [Home](index.md) — Welcome');
    expect(output).toContain('- [Getting Started](getting-started.md)');
  });

  it('renders nested entries with indentation', () => {
    const output = renderIndex([
      {
        title: 'API',
        path: 'api',
        children: [
          { title: 'Auth', description: 'Auth API', path: 'api/auth.md' },
        ],
      },
    ]);
    expect(output).toContain('- API');
    expect(output).toContain('  - [Auth](api/auth.md) — Auth API');
  });

  it('returns empty string for no entries', () => {
    const output = renderIndex([]);
    expect(output).toBe('');
  });
});
