import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { generateIndex, type IndexEntry, renderIndex } from './generator';

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

describe('generateIndex exclusions', () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    const { rm } = await import('node:fs/promises');
    await Promise.all(
      createdDirs.map((d) => rm(d, { recursive: true, force: true })),
    );
    createdDirs.length = 0;
  });

  /**
   * A docs root shaped like the W1 app-root layout's authored source tree:
   * pages at the root, a nested section, and non-page Markdown (`CLAUDE.md`)
   * scattered at two depths — the case issue #239 exists for.
   */
  async function createDocsTree(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'oat-index-exclude-'));
    createdDirs.push(dir);

    await writeFile(join(dir, 'index.md'), '---\ntitle: Docs\n---\n', 'utf8');
    await writeFile(
      join(dir, 'CLAUDE.md'),
      '---\ntitle: Root C\n---\n',
      'utf8',
    );
    await mkdir(join(dir, 'api', 'nested'), { recursive: true });
    await writeFile(
      join(dir, 'api', 'auth.md'),
      '---\ntitle: Authentication\n---\n',
      'utf8',
    );
    await writeFile(
      join(dir, 'api', 'CLAUDE.md'),
      '---\ntitle: Api C\n---\n',
      'utf8',
    );
    await writeFile(
      join(dir, 'api', 'nested', 'tokens.md'),
      '---\ntitle: Tokens\n---\n',
      'utf8',
    );
    await mkdir(join(dir, 'drafts'), { recursive: true });
    await writeFile(
      join(dir, 'drafts', 'wip.md'),
      '---\ntitle: Wip\n---\n',
      'utf8',
    );

    return dir;
  }

  /** Flattened docs-root-relative POSIX paths of every leaf entry, in order. */
  function leafPaths(entries: IndexEntry[]): string[] {
    return entries.flatMap((entry) =>
      entry.children
        ? leafPaths(entry.children)
        : [entry.path.split(sep).join('/')],
    );
  }

  /**
   * Which pages survived, independent of ordering. Ordering is a separate
   * contract, asserted once in `preserves entry ordering` and by the existing
   * `generateIndex` cases.
   */
  function survivingPaths(entries: IndexEntry[]): string[] {
    return [...leafPaths(entries)].sort();
  }

  /**
   * The exact bytes the pre-exclusion generator rendered for `createDocsTree`,
   * captured by running the generator from the phase base commit
   * (133cae1e) against this same fixture.
   *
   * Pinning a literal rather than comparing one patched call to another is the
   * point: a self-comparison would still pass if the patch shifted every
   * no-exclusion manifest, which is precisely the regression the plan's
   * "byte-identical default output" criterion forbids.
   */
  const PRE_EXCLUSION_RENDER =
    '- [Docs](index.md)\n' +
    '- Api\n' +
    '  - Nested\n' +
    '    - [Tokens](api/nested/tokens.md)\n' +
    '  - [Authentication](api/auth.md)\n' +
    '  - [Api C](api/CLAUDE.md)\n' +
    '- Drafts\n' +
    '  - [Wip](drafts/wip.md)\n' +
    '- [Root C](CLAUDE.md)\n';

  it('produces byte-identical output when the exclusion list is empty', async () => {
    const dir = await createDocsTree();

    const baseline = await generateIndex(dir);

    expect(renderIndex(baseline)).toBe(PRE_EXCLUSION_RENDER);
    expect(await generateIndex(dir, {})).toEqual(baseline);
    expect(await generateIndex(dir, { excludes: [] })).toEqual(baseline);
    // Whitespace-only entries are ignored rather than compiled into a matcher.
    expect(await generateIndex(dir, { excludes: ['  '] })).toEqual(baseline);
    expect(renderIndex(await generateIndex(dir, { excludes: ['  '] }))).toBe(
      PRE_EXCLUSION_RENDER,
    );
  });

  it('treats `**` inside a segment as a single-segment wildcard', async () => {
    const dir = await createDocsTree();

    // Globstar spans `/` only as a whole segment, so `a**b` cannot reach into
    // `api/`. An unbounded in-segment `.*` here would also let two of them
    // backtrack catastrophically on a long non-match.
    expect(
      survivingPaths(await generateIndex(dir, { excludes: ['**.md'] })),
    ).toEqual([
      'api/CLAUDE.md',
      'api/auth.md',
      'api/nested/tokens.md',
      'drafts/wip.md',
    ]);
  });

  it('matches a pathological globstar pattern in bounded time', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-index-exclude-redos-'));
    createdDirs.push(dir);
    // The filename length is load-bearing: backtracking blowup is exponential
    // in the candidate path, so a short fixture would hide the regression.
    const longName = `${'a'.repeat(34)}.md`;
    await writeFile(join(dir, longName), '---\ntitle: Long\n---\n', 'utf8');

    const start = Date.now();
    const entries = await generateIndex(dir, {
      excludes: [`${'**a'.repeat(12)}X.md`],
    });
    const elapsed = Date.now() - start;

    // Non-matching pattern: the page survives, and the check is fast. Compiling
    // an in-segment `**` to an unbounded `.*` made this same call take seconds.
    expect(survivingPaths(entries)).toEqual([longName]);
    expect(elapsed).toBeLessThan(1_000);
  });

  it('preserves entry ordering across an exclusion', async () => {
    const dir = await createDocsTree();

    const baseline = leafPaths(await generateIndex(dir));
    const entries = await generateIndex(dir, { excludes: ['drafts/'] });

    // Exclusion removes entries; it never reorders the survivors.
    expect(leafPaths(entries)).toEqual(
      baseline.filter((path) => !path.startsWith('drafts/')),
    );
    expect(renderIndex(entries)).toBe(
      renderIndex(await generateIndex(dir))
        .split('\n')
        .filter((line) => !/Drafts|wip\.md/.test(line))
        .join('\n'),
    );
  });

  it('anchors a bare pattern at the docs root', async () => {
    const dir = await createDocsTree();

    const entries = await generateIndex(dir, { excludes: ['CLAUDE.md'] });

    // The root-level file is gone; the same filename at depth survives.
    expect(survivingPaths(entries)).toEqual([
      'api/CLAUDE.md',
      'api/auth.md',
      'api/nested/tokens.md',
      'drafts/wip.md',
      'index.md',
    ]);
  });

  it('excludes a glob match at every depth', async () => {
    const dir = await createDocsTree();

    const entries = await generateIndex(dir, { excludes: ['**/CLAUDE.md'] });

    expect(survivingPaths(entries)).toEqual([
      'api/auth.md',
      'api/nested/tokens.md',
      'drafts/wip.md',
      'index.md',
    ]);
  });

  it('keeps `*` inside a single path segment', async () => {
    const dir = await createDocsTree();

    // `*.md` is root-anchored and single-segment, so only root pages match.
    const entries = await generateIndex(dir, { excludes: ['*.md'] });

    expect(survivingPaths(entries)).toEqual([
      'api/CLAUDE.md',
      'api/auth.md',
      'api/nested/tokens.md',
      'drafts/wip.md',
    ]);
  });

  it('excludes an entire directory with a trailing slash', async () => {
    const dir = await createDocsTree();

    const entries = await generateIndex(dir, { excludes: ['api/'] });

    expect(survivingPaths(entries)).toEqual([
      'CLAUDE.md',
      'drafts/wip.md',
      'index.md',
    ]);
  });

  it('excludes a directory named without a trailing slash', async () => {
    const dir = await createDocsTree();

    const expected = ['CLAUDE.md', 'drafts/wip.md', 'index.md'];

    expect(
      survivingPaths(await generateIndex(dir, { excludes: ['api'] })),
    ).toEqual(expected);
    // `api/**` names the contents rather than the directory; the emptied
    // directory is then pruned, so the visible result is the same.
    expect(
      survivingPaths(await generateIndex(dir, { excludes: ['api/**'] })),
    ).toEqual(expected);
  });

  it('never matches a file with a directory-only pattern', async () => {
    const dir = await createDocsTree();

    const entries = await generateIndex(dir, { excludes: ['CLAUDE.md/'] });

    expect(leafPaths(entries)).toContain('CLAUDE.md');
  });

  it('prunes a directory left empty by exclusion, emitting no heading', async () => {
    const dir = await createDocsTree();

    const entries = await generateIndex(dir, { excludes: ['drafts/wip.md'] });

    expect(entries.map((entry) => entry.title)).not.toContain('Drafts');
    expect(renderIndex(entries)).not.toContain('- Drafts');
    expect(survivingPaths(entries)).toEqual([
      'CLAUDE.md',
      'api/CLAUDE.md',
      'api/auth.md',
      'api/nested/tokens.md',
      'index.md',
    ]);
  });

  it('prunes an ancestor emptied only through a nested exclusion', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-index-exclude-deep-'));
    createdDirs.push(dir);
    await mkdir(join(dir, 'a', 'b', 'c'), { recursive: true });
    await writeFile(join(dir, 'keep.md'), '---\ntitle: Keep\n---\n', 'utf8');
    await writeFile(
      join(dir, 'a', 'b', 'c', 'only.md'),
      '---\ntitle: Only\n---\n',
      'utf8',
    );

    const entries = await generateIndex(dir, { excludes: ['**/only.md'] });

    // The whole `a/b/c` chain disappears, not just the leaf's own directory.
    expect(entries.map((entry) => entry.title)).toEqual(['Keep']);
  });

  it('treats `./` and `/` prefixes as docs-root anchors', async () => {
    const dir = await createDocsTree();

    for (const pattern of ['./drafts/', '/drafts/']) {
      const entries = await generateIndex(dir, { excludes: [pattern] });
      expect(leafPaths(entries)).not.toContain('drafts/wip.md');
    }
  });

  it('applies every pattern in the list', async () => {
    const dir = await createDocsTree();

    const entries = await generateIndex(dir, {
      excludes: ['**/CLAUDE.md', 'drafts/'],
    });

    expect(survivingPaths(entries)).toEqual([
      'api/auth.md',
      'api/nested/tokens.md',
      'index.md',
    ]);
  });

  it('treats glob metacharacters outside `*` as literals', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-index-exclude-literal-'));
    createdDirs.push(dir);
    await writeFile(join(dir, 'a+b.md'), '---\ntitle: Plus\n---\n', 'utf8');
    await writeFile(join(dir, 'aab.md'), '---\ntitle: Decoy\n---\n', 'utf8');

    const entries = await generateIndex(dir, { excludes: ['a+b.md'] });

    // An unescaped `+` would make the pattern a quantifier and swallow the
    // decoy too, so the survivor is what proves the escaping.
    expect(survivingPaths(entries)).toEqual(['aab.md']);
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
