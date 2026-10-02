import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { parseIndexContents } from './contents';
import { syncDocsNavigation } from './sync';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-fumadocs-nav-'));
  roots.push(root);
  await page(
    root,
    'index.md',
    'Home',
    '## Contents\n\n- [Skills](skills/index.md)\n- [Workflows](workflows/index.md)',
  );
  await page(
    root,
    'skills/index.md',
    'Skills',
    '## Contents\n\n- [Research](research.md)\n- [Projects](../workflows/index.md#contents)',
  );
  await page(
    root,
    'skills/research.md',
    'Research',
    '# Research\n\n## Repeated\n\n## Repeated',
  );
  await page(
    root,
    'workflows/index.md',
    'Workflows',
    '## Contents\n\n- [Workflows](index.md)\n- [Projects](projects.md)',
  );
  await page(root, 'workflows/projects.md', 'Projects', '# Projects');
  return root;
}

async function page(
  root: string,
  path: string,
  title: string,
  body: string,
): Promise<void> {
  const target = join(root, 'docs', path);
  await mkdir(resolve(target, '..'), { recursive: true });
  await writeFile(target, `---\ntitle: ${title}\n---\n\n${body}\n`);
}

async function sync(
  root: string,
  options: { check?: boolean; validateOnly?: boolean } = {},
) {
  return syncDocsNavigation({
    appRoot: root,
    framework: 'fumadocs',
    ...options,
  });
}

describe('Fumadocs navigation compiler', () => {
  it('parses real authored Contents without treating fenced examples as links', async () => {
    const source = await readFile(
      resolve('..', '..', 'apps/oat-docs/docs/index.md'),
      'utf8',
    );
    expect(parseIndexContents(source).map((entry) => entry.href)).toEqual([
      'quickstart.md',
      'guide/index.md',
      'provider-sync/index.md',
      'workflows/index.md',
      'docs-tooling/index.md',
      'cli-utilities/index.md',
      'contributing/index.md',
      'reference/index.md',
    ]);
    expect(
      parseIndexContents(
        '```md\n## Contents\n- [Wrong](wrong.md)\n```\n## Contents\n- [Real](real.md)\n~~~~md\n## End\n- [Wrong](wrong.md)\n~~~~\n- [Next](next.md)',
      ),
    ).toEqual([
      { title: 'Real', href: 'real.md' },
      { title: 'Next', href: 'next.md' },
    ]);
  });

  it('keeps native ownership and landings once, validating cross-links without duplicating sidebar traversal', async () => {
    const root = await fixture();
    await sync(root);
    expect(
      JSON.parse(await readFile(join(root, 'docs/meta.json'), 'utf8')),
    ).toEqual({ title: 'Home', pages: ['index', 'skills', 'workflows'] });
    expect(
      JSON.parse(await readFile(join(root, 'docs/skills/meta.json'), 'utf8')),
    ).toEqual({
      title: 'Skills',
      pages: ['research'],
    });
    expect(
      JSON.parse(
        await readFile(join(root, 'docs/workflows/meta.json'), 'utf8'),
      ),
    ).toEqual({ title: 'Workflows', pages: ['projects'] });
    const manifest = await readFile(
      join(root, '.oat-fumadocs-nav.json'),
      'utf8',
    );
    await sync(root);
    expect(await readFile(join(root, '.oat-fumadocs-nav.json'), 'utf8')).toBe(
      manifest,
    );
    await expect(sync(root, { check: true })).resolves.toBeDefined();
  });

  it('refuses authored metadata and preserves its bytes before any other writes', async () => {
    const root = await fixture();
    const authored = '{"title":"Authored"}\n';
    await writeFile(join(root, 'docs/workflows/meta.json'), authored);
    await expect(sync(root)).rejects.toThrow(
      'Refusing unowned or externally edited',
    );
    expect(await readFile(join(root, 'docs/workflows/meta.json'), 'utf8')).toBe(
      authored,
    );
    expect(await readdir(join(root, 'docs'))).not.toContain('meta.json');
    expect(await readdir(root)).not.toContain('.oat-fumadocs-nav.json');
  });

  it('refuses externally edited owned metadata and preserves it', async () => {
    const root = await fixture();
    await sync(root);
    const changed = '{"pages":["authored"]}\n';
    await writeFile(join(root, 'docs/meta.json'), changed);
    await expect(sync(root)).rejects.toThrow(
      'Refusing unowned or externally edited',
    );
    expect(await readFile(join(root, 'docs/meta.json'), 'utf8')).toBe(changed);
  });

  it('validates sources with absent or unsafe output without reading or writing it', async () => {
    const root = await fixture();
    await sync(root, { validateOnly: true });
    expect(await readdir(root)).toEqual(['docs']);
    await writeFile(join(root, '.oat-fumadocs-nav.json'), 'not json');
    await symlink('/nonexistent', join(root, 'docs/meta.json'));
    await expect(sync(root, { validateOnly: true })).resolves.toBeDefined();
    expect(await readFile(join(root, '.oat-fumadocs-nav.json'), 'utf8')).toBe(
      'not json',
    );
  });

  it('checks absent and different output without mutation', async () => {
    const root = await fixture();
    await expect(sync(root, { check: true })).rejects.toThrow(
      'Missing or different',
    );
    expect(await readdir(root)).toEqual(['docs']);
    await sync(root);
    await page(
      root,
      'index.md',
      'Home',
      '## Contents\n- [Workflows](workflows/index.md)\n- [Skills](skills/index.md)',
    );
    const before = await readFile(join(root, 'docs/meta.json'), 'utf8');
    await expect(sync(root, { check: true })).rejects.toThrow(
      'Missing or different',
    );
    expect(await readFile(join(root, 'docs/meta.json'), 'utf8')).toBe(before);
  });

  it('reports stale output read-only and removes only hash-owned stale metadata on generation', async () => {
    const root = await fixture();
    await sync(root);
    const staleContent = '{"title":"Stale"}\n';
    await mkdir(join(root, 'docs/stale'));
    await writeFile(join(root, 'docs/stale/meta.json'), staleContent);
    const sidecarPath = join(root, '.oat-fumadocs-nav.json');
    const staleManifest = JSON.parse(await readFile(sidecarPath, 'utf8'));
    staleManifest.files.push({
      path: 'stale/meta.json',
      hash: createHash('sha256').update(staleContent).digest('hex'),
    });
    const staleSource = JSON.stringify(staleManifest);
    await writeFile(sidecarPath, staleSource);
    await expect(sync(root, { check: true })).rejects.toThrow(
      'Stale generated metadata stale/meta.json',
    );
    expect(await readFile(join(root, 'docs/stale/meta.json'), 'utf8')).toBe(
      staleContent,
    );
    expect(await readFile(sidecarPath, 'utf8')).toBe(staleSource);
    await rm(join(root, 'docs/skills/index.md'));
    await rm(join(root, 'docs/skills/research.md'));
    await page(
      root,
      'index.md',
      'Home',
      '## Contents\n- [Workflows](workflows/index.md)',
    );
    await sync(root);
    expect(await readdir(join(root, 'docs/skills'))).not.toContain('meta.json');
    const manifest = JSON.parse(
      await readFile(join(root, '.oat-fumadocs-nav.json'), 'utf8'),
    );
    expect(
      manifest.files.map((file: { path: string }) => file.path),
    ).not.toContain('skills/meta.json');
  });

  it.each([
    [
      'label mismatch',
      '- [Wrong](skills/index.md)\n- [Workflows](workflows/index.md)',
      'does not match frontmatter',
    ],
    [
      'duplicate ownership',
      '- [Skills](skills/index.md)\n- [Skills](skills/index.md)\n- [Workflows](workflows/index.md)',
      'Duplicate ownership',
    ],
    [
      'orphan section',
      '- [Workflows](workflows/index.md)',
      'Missing physical-parent',
    ],
    ['missing target', '- [Missing](missing.md)', 'does not resolve'],
    [
      'missing fragment',
      '- [Skills](skills/index.md#missing)',
      'Missing fragment',
    ],
    ['query', '- [Skills](skills/index.md?query)', 'Unsupported Contents link'],
    [
      'external',
      '- [Skills](https://example.com)',
      'Unsupported Contents link',
    ],
    ['traversal', '- [Escape](../outside.md)', 'escapes'],
  ])(
    'prevalidates %s before any writes',
    async (_name, contents, diagnostic) => {
      const root = await fixture();
      await page(root, 'index.md', 'Home', `## Contents\n${contents}`);
      await expect(sync(root)).rejects.toThrow(diagnostic);
      expect(await readdir(root)).toEqual(['docs']);
      expect(await readdir(join(root, 'docs'))).not.toContain('meta.json');
    },
  );

  it('rejects orphan leaves and duplicate self landings', async () => {
    const root = await fixture();
    await page(root, 'orphan.md', 'Orphan', '# Orphan');
    await expect(sync(root)).rejects.toThrow(
      'Missing physical-parent ownership',
    );
    await rm(join(root, 'docs/orphan.md'));
    await page(
      root,
      'index.md',
      'Home',
      '## Contents\n- [Home](index.md)\n- [Home](index.md)',
    );
    await expect(sync(root)).rejects.toThrow('Duplicate landing');
  });

  it('rejects duplicate/traversing manifest paths and symlink metadata/source escapes', async () => {
    const root = await fixture();
    await sync(root);
    const manifestPath = join(root, '.oat-fumadocs-nav.json');
    const source = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(source);
    manifest.files.push(manifest.files[0]);
    await writeFile(manifestPath, JSON.stringify(manifest));
    await expect(sync(root)).rejects.toThrow('Unsafe or duplicate ownership');
    manifest.files.pop();
    manifest.files[0].path = '../meta.json';
    await writeFile(manifestPath, JSON.stringify(manifest));
    await expect(sync(root)).rejects.toThrow('Unsafe or duplicate ownership');
    await writeFile(manifestPath, source);
    await rm(join(root, 'docs/meta.json'));
    await symlink(
      join(root, 'docs/skills/meta.json'),
      join(root, 'docs/meta.json'),
    );
    await expect(sync(root)).rejects.toThrow('Symlink metadata path');
    await rm(join(root, 'docs/meta.json'));
    await symlink(tmpdir(), join(root, 'docs/escape'));
    await expect(sync(root)).rejects.toThrow('Symlink docs source');
  });

  it('checks duplicate heading fragments and rejects invalid mode combinations', async () => {
    const root = await fixture();
    await page(
      root,
      'skills/index.md',
      'Skills',
      '## Contents\n- [Research](research.md)\n- [Again](research.md#repeated-1)',
    );
    await expect(sync(root)).resolves.toBeDefined();
    await expect(
      sync(root, { check: true, validateOnly: true }),
    ).rejects.toThrow('mutually exclusive');
    await expect(
      syncDocsNavigation({ appRoot: root, validateOnly: true }),
    ).rejects.toThrow('requires --framework fumadocs');
  });
});
import { createHash } from 'node:crypto';
