import {
  readdir as fsReaddir,
  readFile as fsReadFile,
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

  it('scans AGENTS.md files and reports ok/missing/content_mismatch statuses', async () => {
    const repoRoot = await createRepoRoot();

    await mkdir(join(repoRoot, 'packages', 'cli'), { recursive: true });
    await mkdir(join(repoRoot, 'packages', 'docs'), { recursive: true });

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

    const entries = await scanInstructionFiles(repoRoot);
    const byAgents = Object.fromEntries(
      entries.map((entry) => [relative(repoRoot, entry.agentsPath), entry]),
    );

    expect(entries).toHaveLength(3);
    expect(byAgents['AGENTS.md']?.status).toBe('ok');
    expect(byAgents['packages/cli/AGENTS.md']?.status).toBe('missing');
    expect(byAgents['packages/docs/AGENTS.md']?.status).toBe(
      'content_mismatch',
    );
    expect(byAgents['packages/docs/AGENTS.md']?.detail).toContain('expected');
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

    const entries = await scanInstructionFiles(repoRoot, {
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
      debug: (message) => {
        debugLogs.push(message);
      },
    });

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
      scanned: 3,
      ok: 1,
      missing: 1,
      contentMismatch: 1,
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
    expect(payload.entries.map((entry) => entry.agentsPath)).toEqual([
      '/tmp/workspace/a/AGENTS.md',
      '/tmp/workspace/b/AGENTS.md',
      '/tmp/workspace/c/AGENTS.md',
    ]);
  });

  it('formats a readable report', () => {
    const payload = buildInstructionsPayload({
      mode: 'validate',
      entries: [
        {
          agentsPath: '/tmp/workspace/AGENTS.md',
          claudePath: '/tmp/workspace/CLAUDE.md',
          status: 'missing',
          detail: 'CLAUDE.md missing',
        },
      ],
      actions: [],
    });

    const output = formatInstructionsReport(payload, '/tmp/workspace');

    expect(output).toContain('instructions validate');
    expect(output).toContain('status: drift');
    expect(output).toContain('AGENTS.md');
    expect(output).toContain('missing');
  });
});
