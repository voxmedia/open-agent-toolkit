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

  it('surfaces broken Claude symlinks without sibling AGENTS.md as stray', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await symlink('missing-AGENTS.md', join(docsDir, 'CLAUDE.md'));

    const entries = await scanInstructionFiles(repoRoot);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      agentsPath: null,
      status: 'stray',
      detail: 'CLAUDE.md found without AGENTS.md',
    });
    expect(relative(repoRoot, entries[0]?.claudePath ?? '')).toBe(
      'docs/CLAUDE.md',
    );
  });

  it('does not treat broken AGENTS symlinks as valid canonical instructions', async () => {
    const repoRoot = await createRepoRoot();
    const docsDir = join(repoRoot, 'docs');

    await mkdir(docsDir, { recursive: true });
    await symlink('missing-AGENTS.md', join(docsDir, 'AGENTS.md'));
    await writeFile(join(docsDir, 'CLAUDE.md'), '@AGENTS.md\n', 'utf8');

    const entries = await scanInstructionFiles(repoRoot);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      agentsPath: null,
      status: 'stray',
      detail: 'CLAUDE.md found without AGENTS.md',
    });
    expect(relative(repoRoot, entries[0]?.claudePath ?? '')).toBe(
      'docs/CLAUDE.md',
    );
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
