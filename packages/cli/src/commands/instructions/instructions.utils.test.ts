import {
  lstat as fsLstat,
  readdir as fsReaddir,
  readFile as fsReadFile,
  readlink as fsReadlink,
  realpath as fsRealpath,
  stat as fsStat,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type {
  InstructionActionRecord,
  InstructionEntry,
} from './instructions.types';
import {
  buildInstructionsPayload,
  buildInstructionsSummary,
  EXPECTED_CLAUDE_CONTENT,
  formatInstructionsReport,
  normalizeExcludedPaths,
  resolveInstructionPointerExcludes,
  scanInstructionFiles,
} from './instructions.utils';

describe('instructions utils', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (directory) => {
        await rm(directory, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-instructions-'));
    tempDirs.push(root);
    return root;
  }

  it('scans instruction files and reports ok/missing/content_mismatch/stray statuses', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'packages', 'cli'), { recursive: true });
    await mkdir(join(repoRoot, 'packages', 'docs'), { recursive: true });
    await mkdir(join(repoRoot, 'packages', 'stray'), { recursive: true });

    await writeFile(
      join(repoRoot, 'AGENTS.md'),
      '# root instructions\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'CLAUDE.md'),
      EXPECTED_CLAUDE_CONTENT,
      'utf8',
    );

    await writeFile(
      join(repoRoot, 'packages', 'cli', 'AGENTS.md'),
      '# cli instructions\n',
      'utf8',
    );

    await writeFile(
      join(repoRoot, 'packages', 'docs', 'AGENTS.md'),
      '# docs instructions\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'packages', 'docs', 'CLAUDE.md'),
      'custom content\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'packages', 'stray', 'CLAUDE.md'),
      '# stray claude instructions\n',
      'utf8',
    );

    const entries = await scanInstructionFiles(repoRoot);
    const byPath = Object.fromEntries(
      entries.map((entry) => [
        relative(repoRoot, entry.agentsPath ?? entry.claudePath),
        entry,
      ]),
    );

    expect(entries).toHaveLength(4);
    expect(byPath['AGENTS.md']?.status).toBe('ok');
    expect(byPath['packages/cli/AGENTS.md']?.status).toBe('missing');
    expect(byPath['packages/docs/AGENTS.md']?.status).toBe('content_mismatch');
    expect(byPath['packages/docs/AGENTS.md']?.detail).toContain('expected');
    expect(byPath['packages/stray/CLAUDE.md']).toMatchObject({
      agentsPath: null,
      status: 'stray',
    });
  });

  it('ignores excluded directories and nested node_modules', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, '.git'), { recursive: true });
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await mkdir(join(repoRoot, '.worktrees'), { recursive: true });
    await mkdir(join(repoRoot, 'packages', 'app', 'node_modules', 'foo'), {
      recursive: true,
    });
    await mkdir(join(repoRoot, 'packages', 'app', 'src'), { recursive: true });

    await writeFile(join(repoRoot, '.git', 'AGENTS.md'), '# ignored\n', 'utf8');
    await writeFile(join(repoRoot, '.oat', 'AGENTS.md'), '# ignored\n', 'utf8');
    await writeFile(
      join(repoRoot, '.worktrees', 'AGENTS.md'),
      '# ignored\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'packages', 'app', 'node_modules', 'foo', 'AGENTS.md'),
      '# ignored\n',
      'utf8',
    );

    await writeFile(
      join(repoRoot, 'packages', 'app', 'src', 'AGENTS.md'),
      '# include me\n',
      'utf8',
    );

    const entries = await scanInstructionFiles(repoRoot);

    expect(entries).toHaveLength(1);
    expect(relative(repoRoot, entries[0]?.agentsPath ?? '')).toBe(
      'packages/app/src/AGENTS.md',
    );
  });

  it('carves .oat/repo back into the scan while keeping the rest of .oat excluded', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, '.oat', 'repo', 'pjm'), { recursive: true });
    await mkdir(join(repoRoot, '.oat', 'templates'), { recursive: true });
    await mkdir(join(repoRoot, '.oat', 'projects'), { recursive: true });
    await mkdir(join(repoRoot, '.oat', 'sync'), { recursive: true });

    await writeFile(
      join(repoRoot, '.oat', 'repo', 'AGENTS.md'),
      '# repo instructions\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, '.oat', 'repo', 'pjm', 'AGENTS.md'),
      '# repo pjm instructions\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'AGENTS.md'),
      '# ignored\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, '.oat', 'projects', 'AGENTS.md'),
      '# ignored\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, '.oat', 'sync', 'AGENTS.md'),
      '# ignored\n',
      'utf8',
    );

    const entries = await scanInstructionFiles(repoRoot);
    const paths = entries.map((entry) =>
      relative(repoRoot, entry.agentsPath ?? entry.claudePath),
    );

    expect(entries).toHaveLength(2);
    expect(paths).toContain('.oat/repo/AGENTS.md');
    expect(paths).toContain('.oat/repo/pjm/AGENTS.md');
    expect(paths).not.toContain('.oat/templates/AGENTS.md');
    expect(paths).not.toContain('.oat/projects/AGENTS.md');
    expect(paths).not.toContain('.oat/sync/AGENTS.md');
  });

  it('skips directories under the derived content root', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'apps', 'oat-docs', 'docs', 'guides'), {
      recursive: true,
    });

    await writeFile(
      join(repoRoot, 'apps', 'oat-docs', 'docs', 'AGENTS.md'),
      '# docs page\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'apps', 'oat-docs', 'docs', 'guides', 'AGENTS.md'),
      '# nested docs page\n',
      'utf8',
    );

    const entries = await scanInstructionFiles(repoRoot, {
      excludedPaths: ['apps/oat-docs/docs'],
    });

    expect(entries).toHaveLength(0);
  });

  it('keeps syncing the app-level instruction file when the content root is a docs child', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'apps', 'oat-docs', 'docs'), {
      recursive: true,
    });

    await writeFile(
      join(repoRoot, 'apps', 'oat-docs', 'AGENTS.md'),
      '# docs app instructions\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'apps', 'oat-docs', 'docs', 'AGENTS.md'),
      '# docs page\n',
      'utf8',
    );

    const entries = await scanInstructionFiles(repoRoot, {
      excludedPaths: ['apps/oat-docs/docs'],
    });
    const paths = entries.map((entry) =>
      relative(repoRoot, entry.agentsPath ?? entry.claudePath),
    );

    expect(paths).toEqual(['apps/oat-docs/AGENTS.md']);
    expect(entries[0]?.status).toBe('missing');
  });

  it('excludes the whole root when it has no docs child', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'content', 'guides'), { recursive: true });
    await mkdir(join(repoRoot, 'packages', 'app'), { recursive: true });

    await writeFile(
      join(repoRoot, 'content', 'AGENTS.md'),
      '# content root page\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'content', 'guides', 'AGENTS.md'),
      '# nested content page\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'packages', 'app', 'AGENTS.md'),
      '# app instructions\n',
      'utf8',
    );

    const entries = await scanInstructionFiles(repoRoot, {
      excludedPaths: ['content'],
    });
    const paths = entries.map((entry) =>
      relative(repoRoot, entry.agentsPath ?? entry.claudePath),
    );

    expect(paths).toEqual(['packages/app/AGENTS.md']);
  });

  it('honors an explicit opt-out list, including the app root', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'apps', 'oat-docs', 'docs'), {
      recursive: true,
    });
    await mkdir(join(repoRoot, 'vendor'), { recursive: true });
    await mkdir(join(repoRoot, 'packages', 'app'), { recursive: true });

    await writeFile(
      join(repoRoot, 'apps', 'oat-docs', 'AGENTS.md'),
      '# docs app instructions\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'apps', 'oat-docs', 'docs', 'AGENTS.md'),
      '# docs page\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'vendor', 'AGENTS.md'),
      '# vendored\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, 'packages', 'app', 'AGENTS.md'),
      '# app instructions\n',
      'utf8',
    );

    const entries = await scanInstructionFiles(repoRoot, {
      excludedPaths: ['apps/oat-docs/docs', 'apps/oat-docs', './vendor/'],
    });
    const paths = entries.map((entry) =>
      relative(repoRoot, entry.agentsPath ?? entry.claudePath),
    );

    expect(paths).toEqual(['packages/app/AGENTS.md']);
  });

  it('still scans the .oat/repo carve-in when .oat is excluded', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, '.oat', 'repo', 'pjm'), { recursive: true });
    await mkdir(join(repoRoot, '.oat', 'templates'), { recursive: true });

    await writeFile(
      join(repoRoot, '.oat', 'repo', 'AGENTS.md'),
      '# repo instructions\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, '.oat', 'repo', 'pjm', 'AGENTS.md'),
      '# repo pjm instructions\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'AGENTS.md'),
      '# ignored\n',
      'utf8',
    );

    // The carve-in runs before the exclusion predicate, so naming `.oat` (or
    // `.oat/repo` itself) in the opt-out list must not strand the carve-in.
    const entries = await scanInstructionFiles(repoRoot, {
      excludedPaths: ['.oat', '.oat/repo'],
    });
    const paths = entries.map((entry) =>
      relative(repoRoot, entry.agentsPath ?? entry.claudePath),
    );

    expect(paths).toContain('.oat/repo/AGENTS.md');
    expect(paths).toContain('.oat/repo/pjm/AGENTS.md');
    expect(paths).not.toContain('.oat/templates/AGENTS.md');
  });

  it('matches the excluded directory exactly, not by shared prefix', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'apps', 'docs'), { recursive: true });
    await mkdir(join(repoRoot, 'apps', 'docs-legacy'), { recursive: true });
    await mkdir(join(repoRoot, 'apps', 'docsite'), { recursive: true });

    for (const directory of ['docs', 'docs-legacy', 'docsite']) {
      await writeFile(
        join(repoRoot, 'apps', directory, 'AGENTS.md'),
        `# ${directory}\n`,
        'utf8',
      );
    }

    // A regression to `startsWith` semantics would silently swallow both
    // siblings, and the command harnesses' own mocks use prefix matching, so
    // nothing else in the suite would object.
    const entries = await scanInstructionFiles(repoRoot, {
      excludedPaths: ['apps/docs'],
    });
    const paths = entries
      .map((entry) => relative(repoRoot, entry.agentsPath ?? entry.claudePath))
      .sort();

    expect(paths).toEqual([
      'apps/docs-legacy/AGENTS.md',
      'apps/docsite/AGENTS.md',
    ]);
  });

  it('normalizes dot segments and duplicate separators in exclusion entries', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'apps', 'oat-docs', 'docs'), {
      recursive: true,
    });
    await writeFile(
      join(repoRoot, 'apps', 'oat-docs', 'docs', 'AGENTS.md'),
      '# docs page\n',
      'utf8',
    );

    // The scan compares against an already-normalized relative path, so an
    // un-normalized entry must be canonicalized or it would silently miss.
    for (const entry of [
      'apps/./oat-docs/docs',
      'apps//oat-docs//docs',
      'apps/oat-docs/nested/../docs',
      'apps/oat-docs/docs/',
    ]) {
      const entries = await scanInstructionFiles(repoRoot, {
        excludedPaths: [entry],
      });
      expect(entries, `entry ${entry} should exclude the docs tree`).toEqual(
        [],
      );
    }
  });

  it('ignores absolute and escaping exclusion entries', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'packages', 'app'), { recursive: true });
    await writeFile(
      join(repoRoot, 'packages', 'app', 'AGENTS.md'),
      '# app instructions\n',
      'utf8',
    );

    const rejected = [
      '..',
      '../packages',
      '/packages/app',
      join(repoRoot, 'packages'),
    ];

    // Asserted on the normalizer directly: a retained absolute entry could not
    // match a relative traversal path anyway, so a scan-only assertion would
    // pass whether or not these are actually dropped.
    expect(normalizeExcludedPaths(rejected)).toEqual([]);

    const entries = await scanInstructionFiles(repoRoot, {
      excludedPaths: rejected,
    });
    const paths = entries.map((entry) =>
      relative(repoRoot, entry.agentsPath ?? entry.claudePath),
    );

    expect(paths).toEqual(['packages/app/AGENTS.md']);
  });

  it('never lets an exclusion entry silence the repository root', async () => {
    // Asserted on the normalizer, not only through the scan: the scan compares
    // `relative(repoRoot, <child>)`, which always has at least one segment and
    // so can never equal '.' or ''. A scan-only assertion therefore passes with
    // the guard deleted, leaving the documented guarantee untested.
    expect(normalizeExcludedPaths(['.', '', '   ', './'])).toEqual([]);

    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'packages', 'app'), { recursive: true });
    await writeFile(join(repoRoot, 'AGENTS.md'), '# root\n', 'utf8');
    await writeFile(
      join(repoRoot, 'packages', 'app', 'AGENTS.md'),
      '# app instructions\n',
      'utf8',
    );

    const entries = await scanInstructionFiles(repoRoot, {
      excludedPaths: ['.', '', '   ', './'],
    });
    const paths = entries.map((entry) =>
      relative(repoRoot, entry.agentsPath ?? entry.claudePath),
    );

    expect(paths).toContain('AGENTS.md');
    expect(paths).toContain('packages/app/AGENTS.md');
  });

  it('leaves the scan unchanged when .oat/repo does not exist', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, '.oat', 'templates'), { recursive: true });
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'AGENTS.md'),
      '# ignored\n',
      'utf8',
    );
    await mkdir(join(repoRoot, 'packages', 'app'), { recursive: true });
    await writeFile(
      join(repoRoot, 'packages', 'app', 'AGENTS.md'),
      '# app instructions\n',
      'utf8',
    );

    const entries = await scanInstructionFiles(repoRoot);

    expect(entries).toHaveLength(1);
    expect(relative(repoRoot, entries[0]?.agentsPath ?? '')).toBe(
      'packages/app/AGENTS.md',
    );
  });

  it('accepts CRLF pointer content as ok', async () => {
    const repoRoot = await createRepoRoot();

    await writeFile(join(repoRoot, 'AGENTS.md'), '# instructions\n', 'utf8');
    await writeFile(join(repoRoot, 'CLAUDE.md'), '@AGENTS.md\r\n', 'utf8');

    const entries = await scanInstructionFiles(repoRoot);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe('ok');
  });

  it('validates symlink strategy against CLAUDE.md link targets', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(repoRoot, 'docs', 'AGENTS.md'), '# docs\n', 'utf8');
    await symlink('AGENTS.md', join(repoRoot, 'docs', 'CLAUDE.md'));

    const entries = await scanInstructionFiles(
      repoRoot,
      { strategy: 'symlink' },
      {
        lstat: fsLstat,
        realpath: fsRealpath,
        readlink: fsReadlink,
      },
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      status: 'ok',
      detail: 'symlink valid',
    });
  });

  it('accepts symlink targets that resolve through a canonical root path', async () => {
    const repoRoot = await createRepoRoot();
    const aliasRoot = join(tmpdir(), `oat-instructions-alias-${Date.now()}`);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(repoRoot, 'docs', 'AGENTS.md'), '# docs\n', 'utf8');
    await symlink(
      join(repoRoot, 'docs', 'AGENTS.md'),
      join(repoRoot, 'docs', 'CLAUDE.md'),
    );
    await symlink(repoRoot, aliasRoot);
    tempDirs.push(aliasRoot);

    const entries = await scanInstructionFiles(
      aliasRoot,
      { strategy: 'symlink' },
      {
        lstat: fsLstat,
        realpath: fsRealpath,
        readlink: fsReadlink,
      },
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      status: 'ok',
      detail: 'symlink valid',
    });
  });

  it('treats symlinks as drift when copy strategy is requested', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(repoRoot, 'docs', 'AGENTS.md'), '# docs\n', 'utf8');
    await symlink('AGENTS.md', join(repoRoot, 'docs', 'CLAUDE.md'));

    const entries = await scanInstructionFiles(
      repoRoot,
      { strategy: 'copy' },
      {
        lstat: fsLstat,
        realpath: fsRealpath,
        readlink: fsReadlink,
      },
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      status: 'content_mismatch',
    });
    expect(entries[0]?.detail).toContain('expected hard copy');
  });

  it('reports AGENTS.md read failures separately when validating copy strategy', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await writeFile(join(docsDir, 'AGENTS.md'), '# docs\n', 'utf8');
    await writeFile(join(docsDir, 'CLAUDE.md'), '# docs\n', 'utf8');

    const entries = await scanInstructionFiles(
      repoRoot,
      { strategy: 'copy' },
      {
        lstat: fsLstat,
        realpath: fsRealpath,
        readFile: async (path, encoding) => {
          if (path === join(docsDir, 'AGENTS.md')) {
            throw Object.assign(new Error('gone'), { code: 'ENOENT' });
          }

          return fsReadFile(path, encoding);
        },
      },
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      status: 'content_mismatch',
      detail: 'unable to read AGENTS.md (ENOENT)',
    });
  });

  it('reports CLAUDE symlink target read failures separately', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await writeFile(join(docsDir, 'AGENTS.md'), '# docs\n', 'utf8');
    await symlink('AGENTS.md', join(docsDir, 'CLAUDE.md'));

    const entries = await scanInstructionFiles(
      repoRoot,
      { strategy: 'symlink' },
      {
        lstat: fsLstat,
        realpath: fsRealpath,
        readlink: async () => {
          throw Object.assign(new Error('permission denied'), {
            code: 'EACCES',
          });
        },
      },
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      status: 'content_mismatch',
      detail: 'unable to read CLAUDE.md symlink target (EACCES)',
    });
  });

  it('reports unreadable CLAUDE files as content mismatch', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await writeFile(join(docsDir, 'AGENTS.md'), '# docs\n', 'utf8');
    await writeFile(join(docsDir, 'CLAUDE.md'), '@AGENTS.md\n', 'utf8');

    const entries = await scanInstructionFiles(repoRoot, undefined, {
      readFile: async (path, encoding) => {
        if (path === join(docsDir, 'CLAUDE.md')) {
          throw Object.assign(new Error('permission denied'), {
            code: 'EACCES',
          });
        }

        return fsReadFile(path, encoding);
      },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      status: 'content_mismatch',
      detail: 'unable to read CLAUDE.md (EACCES)',
    });
  });

  it('surfaces broken Claude symlinks without sibling AGENTS.md as drift', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await symlink('missing-AGENTS.md', join(docsDir, 'CLAUDE.md'));

    const entries = await scanInstructionFiles(repoRoot);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      agentsPath: null,
      claudePath: join(docsDir, 'CLAUDE.md'),
      status: 'content_mismatch',
      detail: 'broken CLAUDE.md symlink',
    });
  });

  it('surfaces unreadable Claude-only files as drift instead of stray adoption', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await writeFile(
      join(docsDir, 'CLAUDE.md'),
      '# stray claude instructions\n',
      'utf8',
    );

    const entries = await scanInstructionFiles(repoRoot, undefined, {
      readFile: async (path, encoding) => {
        if (path === join(docsDir, 'CLAUDE.md')) {
          throw Object.assign(new Error('permission denied'), {
            code: 'EACCES',
          });
        }

        return fsReadFile(path, encoding);
      },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      agentsPath: null,
      claudePath: join(docsDir, 'CLAUDE.md'),
      status: 'content_mismatch',
      detail: 'unable to read CLAUDE.md (EACCES)',
    });
  });

  it('surfaces unreadable AGENTS symlink targets as canonical drift', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await symlink('target.md', join(docsDir, 'AGENTS.md'));
    await writeFile(join(docsDir, 'CLAUDE.md'), '@AGENTS.md\n', 'utf8');

    const entries = await scanInstructionFiles(repoRoot, undefined, {
      stat: async (path) => {
        if (path === join(docsDir, 'AGENTS.md')) {
          throw Object.assign(new Error('permission denied'), {
            code: 'EACCES',
          });
        }

        return fsStat(path);
      },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      agentsPath: join(docsDir, 'AGENTS.md'),
      claudePath: join(docsDir, 'CLAUDE.md'),
      status: 'content_mismatch',
      detail: 'unreadable AGENTS.md symlink target (EACCES)',
    });
  });

  it('surfaces unreadable Claude-only symlink targets as drift', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await symlink('target.md', join(docsDir, 'CLAUDE.md'));

    const entries = await scanInstructionFiles(repoRoot, undefined, {
      stat: async (path) => {
        if (path === join(docsDir, 'CLAUDE.md')) {
          throw Object.assign(new Error('permission denied'), {
            code: 'EACCES',
          });
        }

        return fsStat(path);
      },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      agentsPath: null,
      claudePath: join(docsDir, 'CLAUDE.md'),
      status: 'content_mismatch',
      detail: 'unreadable CLAUDE.md symlink target (EACCES)',
    });
  });

  it('surfaces unreadable paired Claude symlink targets as drift for symlink strategy', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await writeFile(join(docsDir, 'AGENTS.md'), '# docs\n', 'utf8');
    await symlink('AGENTS.md', join(docsDir, 'CLAUDE.md'));

    const entries = await scanInstructionFiles(
      repoRoot,
      { strategy: 'symlink' },
      {
        stat: async (path) => {
          if (path === join(docsDir, 'CLAUDE.md')) {
            throw Object.assign(new Error('permission denied'), {
              code: 'EACCES',
            });
          }

          return fsStat(path);
        },
      },
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      agentsPath: join(docsDir, 'AGENTS.md'),
      claudePath: join(docsDir, 'CLAUDE.md'),
      status: 'content_mismatch',
      detail: 'unreadable CLAUDE.md symlink target (EACCES)',
    });
  });

  it('surfaces broken AGENTS symlinks as canonical drift when Claude exists', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await symlink('missing-AGENTS.md', join(docsDir, 'AGENTS.md'));
    await writeFile(join(docsDir, 'CLAUDE.md'), '@AGENTS.md\n', 'utf8');

    const entries = await scanInstructionFiles(repoRoot);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      agentsPath: join(docsDir, 'AGENTS.md'),
      claudePath: join(docsDir, 'CLAUDE.md'),
      status: 'content_mismatch',
      detail: 'broken AGENTS.md symlink',
    });
  });

  it('surfaces broken AGENTS symlinks as canonical drift without Claude siblings', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await symlink('missing-AGENTS.md', join(docsDir, 'AGENTS.md'));

    const entries = await scanInstructionFiles(repoRoot);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      agentsPath: join(docsDir, 'AGENTS.md'),
      claudePath: join(docsDir, 'CLAUDE.md'),
      status: 'content_mismatch',
      detail: 'broken AGENTS.md symlink',
    });
  });

  it('skips directory symlinks during traversal', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'real'), { recursive: true });
    await writeFile(join(repoRoot, 'real', 'AGENTS.md'), '# real\n', 'utf8');

    await symlink(join(repoRoot, 'real'), join(repoRoot, 'real-link'));

    const entries = await scanInstructionFiles(repoRoot);

    expect(entries).toHaveLength(1);
    expect(relative(repoRoot, entries[0]?.agentsPath ?? '')).toBe(
      'real/AGENTS.md',
    );
  });

  it('logs debug messages on scan errors and continues', async () => {
    const repoRoot = await createRepoRoot();
    const debugLogs: string[] = [];

    await mkdir(join(repoRoot, 'good'), { recursive: true });
    await writeFile(
      join(repoRoot, 'good', 'AGENTS.md'),
      '# good instructions\n',
      'utf8',
    );

    await mkdir(join(repoRoot, 'bad-dir'), { recursive: true });
    await symlink(
      join(repoRoot, 'missing-target'),
      join(repoRoot, 'broken-link'),
    );

    const entries = await scanInstructionFiles(
      repoRoot,
      {
        debug: (message) => {
          debugLogs.push(message);
        },
      },
      {
        readdir: async (path, options) => {
          if (path === join(repoRoot, 'bad-dir')) {
            throw Object.assign(new Error('permission denied'), {
              code: 'EACCES',
            });
          }
          return fsReaddir(path, options);
        },
        readFile: fsReadFile,
        stat: async (path) => {
          if (path === join(repoRoot, 'broken-link')) {
            throw Object.assign(new Error('permission denied'), {
              code: 'EACCES',
            });
          }
          return fsStat(path);
        },
      },
    );

    expect(relative(repoRoot, entries[0]?.agentsPath ?? '')).toBe(
      'good/AGENTS.md',
    );
    expect(debugLogs).toContain(
      `Skipping directory scan for ${join(repoRoot, 'bad-dir').replaceAll('\\', '/')} (EACCES)`,
    );
    expect(debugLogs).toContain(
      `Skipping symlink target stat for ${join(repoRoot, 'broken-link').replaceAll('\\', '/')} (EACCES)`,
    );
  });

  describe('resolveInstructionPointerExcludes', () => {
    async function writeConfig(
      repoRoot: string,
      documentation: Record<string, unknown>,
    ): Promise<void> {
      await mkdir(join(repoRoot, '.oat'), { recursive: true });
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({ version: 1, documentation }),
        'utf8',
      );
    }

    it('reports a real content root and explicit opt-out as effective', async () => {
      const repoRoot = await createRepoRoot();
      await mkdir(join(repoRoot, 'apps', 'docsapp', 'docs'), {
        recursive: true,
      });
      await mkdir(join(repoRoot, 'vendor'), { recursive: true });
      await writeConfig(repoRoot, {
        root: 'apps/docsapp',
        instructionPointerExcludes: ['vendor'],
      });

      const exclusions = await resolveInstructionPointerExcludes(repoRoot);

      expect(exclusions.configured).toEqual(['apps/docsapp/docs', 'vendor']);
      expect(exclusions.effective).toEqual(['apps/docsapp/docs', 'vendor']);
      expect(exclusions.warnings).toEqual([]);
    });

    it('warns and withholds effect for an entry naming no directory', async () => {
      const repoRoot = await createRepoRoot();
      await writeConfig(repoRoot, {
        instructionPointerExcludes: ['nonexistent-dir'],
      });

      const exclusions = await resolveInstructionPointerExcludes(repoRoot);

      expect(exclusions.configured).toEqual(['nonexistent-dir']);
      expect(exclusions.effective).toEqual([]);
      expect(exclusions.warnings).toHaveLength(1);
      expect(exclusions.warnings[0]).toContain('nonexistent-dir');
      expect(exclusions.warnings[0]).toContain('excludes nothing');
    });

    it('warns and withholds effect for an entry dropped during normalization', async () => {
      const repoRoot = await createRepoRoot();
      await writeConfig(repoRoot, {
        instructionPointerExcludes: ['/etc', '../outside'],
      });

      const exclusions = await resolveInstructionPointerExcludes(repoRoot);

      expect(exclusions.configured).toEqual([]);
      expect(exclusions.effective).toEqual([]);
      expect(exclusions.warnings).toHaveLength(2);
      expect(exclusions.warnings[0]).toContain('/etc');
      expect(exclusions.warnings[0]).toContain('Ignoring');
    });

    it('warns that an explicit .oat/repo opt-out can never take effect', async () => {
      const repoRoot = await createRepoRoot();
      await mkdir(join(repoRoot, '.oat', 'repo'), { recursive: true });
      await writeConfig(repoRoot, {
        instructionPointerExcludes: ['.oat/repo'],
      });

      const exclusions = await resolveInstructionPointerExcludes(repoRoot);

      expect(exclusions.configured).toEqual(['.oat/repo']);
      expect(exclusions.effective).toEqual([]);
      expect(exclusions.warnings[0]).toContain('always scanned');
    });

    it('treats a case-mismatched content root as ineffective, deterministically', async () => {
      const repoRoot = await createRepoRoot();
      await mkdir(join(repoRoot, 'apps', 'docsapp', 'docs'), {
        recursive: true,
      });
      await writeConfig(repoRoot, { root: 'Apps/Docsapp' });

      // The case-insensitive filesystem is simulated through the injected
      // realpath rather than depending on the host: on a case-sensitive runner
      // the directory would not resolve at all and the test would pass for the
      // wrong reason, leaving the realpath comparison unproven. Here `stat`
      // accepts the mis-cased path (as APFS/NTFS would) while realpath reports
      // the true on-disk casing the scan actually compares against.
      const exclusions = await resolveInstructionPointerExcludes(repoRoot, {
        stat: async (path: string) =>
          fsStat(
            path.replace(
              `${repoRoot}/Apps/Docsapp`,
              `${repoRoot}/apps/docsapp`,
            ),
          ),
        realpath: async (path: string) =>
          fsRealpath(
            path.replace(
              `${repoRoot}/Apps/Docsapp`,
              `${repoRoot}/apps/docsapp`,
            ),
          ),
      });

      expect(exclusions.configured).toEqual(['Apps/Docsapp/docs']);
      expect(exclusions.effective).toEqual([]);
      expect(exclusions.warnings[0]).toContain('case-sensitive');
    });

    it('keeps a carve-in descendant excludable while the carve-in root is not', async () => {
      const repoRoot = await createRepoRoot();
      await mkdir(join(repoRoot, '.oat', 'repo', 'pjm'), { recursive: true });
      await writeConfig(repoRoot, {
        instructionPointerExcludes: ['.oat/repo/pjm'],
      });

      // `.oat/repo` is queued directly by the carve-in and so bypasses the
      // predicate, but its children are reached by ordinary traversal. Marking
      // descendants inert would warn about an exclusion that genuinely works.
      const exclusions = await resolveInstructionPointerExcludes(repoRoot);

      expect(exclusions.effective).toEqual(['.oat/repo/pjm']);
      expect(exclusions.warnings).toEqual([]);
    });

    it('reports an exclusion nested under another as effective', async () => {
      const repoRoot = await createRepoRoot();
      await mkdir(join(repoRoot, 'apps', 'docsapp', 'docs', 'guide'), {
        recursive: true,
      });
      await writeConfig(repoRoot, {
        root: 'apps/docsapp',
        instructionPointerExcludes: ['apps/docsapp/docs/guide'],
      });

      // Shadowed by the content root, so the predicate never fires for it, but
      // the tree is protected and the operator's intent holds. Warning here
      // would be a false alarm.
      const exclusions = await resolveInstructionPointerExcludes(repoRoot);

      expect(exclusions.effective).toEqual([
        'apps/docsapp/docs',
        'apps/docsapp/docs/guide',
      ]);
      expect(exclusions.warnings).toEqual([]);
    });
  });

  it('builds summary and payload counts deterministically', () => {
    const entries: InstructionEntry[] = [
      {
        agentsPath: '/tmp/workspace/b/AGENTS.md',
        claudePath: '/tmp/workspace/b/CLAUDE.md',
        status: 'missing',
        detail: 'CLAUDE.md missing',
      },
      {
        agentsPath: '/tmp/workspace/a/AGENTS.md',
        claudePath: '/tmp/workspace/a/CLAUDE.md',
        status: 'ok',
        detail: 'pointer valid',
      },
      {
        agentsPath: '/tmp/workspace/c/AGENTS.md',
        claudePath: '/tmp/workspace/c/CLAUDE.md',
        status: 'content_mismatch',
        detail: 'content mismatch',
      },
      {
        agentsPath: null,
        claudePath: '/tmp/workspace/d/CLAUDE.md',
        status: 'stray',
        detail: 'CLAUDE.md found without AGENTS.md',
      },
    ];

    const actions: InstructionActionRecord[] = [
      {
        type: 'update',
        target: '/tmp/workspace/c/CLAUDE.md',
        reason: 'force overwrite',
        result: 'planned',
      },
      {
        type: 'skip',
        target: '/tmp/workspace/b/CLAUDE.md',
        reason: 'requires --force',
        result: 'skipped',
      },
      {
        type: 'create',
        target: '/tmp/workspace/a/CLAUDE.md',
        reason: 'missing pointer file',
        result: 'applied',
      },
    ];

    const summary = buildInstructionsSummary(entries, actions);
    expect(summary).toEqual({
      scanned: 4,
      ok: 1,
      missing: 1,
      contentMismatch: 1,
      stray: 1,
      created: 1,
      updated: 1,
      skipped: 1,
    });

    const payload = buildInstructionsPayload({
      mode: 'dry-run',
      entries,
      actions,
    });

    expect(payload.status).toBe('drift');
    expect(payload.summary).toEqual(summary);
    expect(
      payload.entries.map((entry) => entry.agentsPath ?? entry.claudePath),
    ).toEqual([
      '/tmp/workspace/a/AGENTS.md',
      '/tmp/workspace/b/AGENTS.md',
      '/tmp/workspace/c/AGENTS.md',
      '/tmp/workspace/d/CLAUDE.md',
    ]);
  });

  it('formats a readable report', () => {
    const payload = buildInstructionsPayload({
      mode: 'validate',
      entries: [
        {
          agentsPath: null,
          claudePath: '/tmp/workspace/CLAUDE.md',
          status: 'stray',
          detail: 'CLAUDE.md found without AGENTS.md',
        },
      ],
      actions: [],
    });

    const output = formatInstructionsReport(payload, '/tmp/workspace');

    expect(output).toContain('instructions validate');
    expect(output).toContain('status: drift');
    expect(output).toContain('CLAUDE.md');
    expect(output).toContain('stray');
  });
});
