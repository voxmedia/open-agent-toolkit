import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  buildSyncedRecord,
  writeSyncedRecord,
} from '@commands/project/sync/record';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkSyncedProjects } from './synced-projects';

describe('checkSyncedProjects', () => {
  const roots: string[] = [];
  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  async function createRoot(): Promise<string> {
    const value = await mkdtemp(join(tmpdir(), 'oat-doctor-synced-'));
    roots.push(value);
    return value;
  }

  function gitRunner(
    overrides: Partial<
      Record<string, { code: number; stdout: string; stderr: string }>
    > = {},
  ): GitRunner {
    return {
      run: vi.fn(async (args) => {
        const key = args.slice(0, 2).join(' ');
        return overrides[key] ?? { code: 0, stdout: '', stderr: '' };
      }),
    };
  }

  it('returns one pass when no synced projects exist', async () => {
    const repoRoot = await createRoot();
    await expect(
      checkSyncedProjects(repoRoot, { git: gitRunner() }),
    ).resolves.toEqual([
      expect.objectContaining({
        status: 'pass',
        name: 'project:synced_projects',
      }),
    ]);
  });

  it('warns when a record exists but its checkout is absent', async () => {
    const repoRoot = await createRoot();
    const syncedRoot = join(repoRoot, '.oat/projects/synced');
    await writeSyncedRecord(
      join(syncedRoot, 'demo.json'),
      buildSyncedRecord('demo', new Date('2026-08-27T00:00:00Z')),
    );
    const checks = await checkSyncedProjects(repoRoot, { git: gitRunner() });
    expect(checks).toContainEqual(
      expect.objectContaining({
        status: 'warn',
        message: expect.stringContaining('checkout is absent'),
        fix: expect.stringContaining('oat project pull demo'),
      }),
    );
  });

  it('fails unknown record schemas and branch-tracked synced artifacts', async () => {
    const repoRoot = await createRoot();
    const syncedRoot = join(repoRoot, '.oat/projects/synced');
    await mkdir(syncedRoot, { recursive: true });
    await writeFile(
      join(syncedRoot, 'future.json'),
      JSON.stringify({ schemaVersion: 2, slug: 'future' }),
      'utf8',
    );
    const checks = await checkSyncedProjects(repoRoot, {
      git: gitRunner({
        'ls-files --': {
          code: 0,
          stdout: '.oat/projects/synced/future/state.md',
          stderr: '',
        },
      }),
    });
    expect(checks.filter((check) => check.status === 'fail')).toHaveLength(2);
    expect(checks.map((check) => check.fix).join('\n')).toContain('Upgrade');
    expect(checks.map((check) => check.fix).join('\n')).toContain(
      'git rm --cached',
    );
  });

  it('detects a real branch-tracked file below the synced root', async () => {
    const repoRoot = await createRoot();
    execFileSync('git', ['init', '-q', '--initial-branch=main'], {
      cwd: repoRoot,
    });
    execFileSync('git', ['config', 'user.email', 'doctor@example.com'], {
      cwd: repoRoot,
    });
    execFileSync('git', ['config', 'user.name', 'Doctor Fixture'], {
      cwd: repoRoot,
    });
    const leakedPath = '.oat/projects/synced/leaked/state.md';
    await mkdir(join(repoRoot, '.oat/projects/synced/leaked'), {
      recursive: true,
    });
    await writeFile(join(repoRoot, leakedPath), '# leaked\n', 'utf8');
    execFileSync('git', ['add', '-f', leakedPath], { cwd: repoRoot });
    execFileSync('git', ['commit', '-q', '-m', 'test: leak synced artifact'], {
      cwd: repoRoot,
    });

    const checks = await checkSyncedProjects(repoRoot, {
      git: defaultGitRunner,
      resolveProjectsRoot: async () => '.oat/projects/shared',
    });

    expect(checks).toContainEqual(
      expect.objectContaining({
        name: 'project:synced_tracked_artifacts',
        status: 'fail',
        message: expect.stringContaining(leakedPath),
      }),
    );
  });

  it('reports unexpected git ls-files failures explicitly', async () => {
    const repoRoot = await createRoot();
    await mkdir(join(repoRoot, '.oat/projects/synced'), { recursive: true });
    const checks = await checkSyncedProjects(repoRoot, {
      git: gitRunner({
        'ls-files --': {
          code: 128,
          stdout: '',
          stderr: 'fatal: not a git repository',
        },
      }),
    });

    expect(checks).toContainEqual(
      expect.objectContaining({
        name: 'project:synced_tracked_artifacts',
        status: 'fail',
        message: expect.stringContaining('fatal: not a git repository'),
      }),
    );
  });

  it('warns for dirty and divergent checkouts but treats offline remote checks as notes', async () => {
    const repoRoot = await createRoot();
    const syncedRoot = join(repoRoot, '.oat/projects/synced');
    const record = buildSyncedRecord('demo', new Date('2026-08-27T00:00:00Z'));
    await writeSyncedRecord(join(syncedRoot, 'demo.json'), record);
    await mkdir(join(syncedRoot, 'demo'), { recursive: true });
    const divergent = await checkSyncedProjects(repoRoot, {
      git: gitRunner({
        'status --porcelain': { code: 0, stdout: ' M state.md', stderr: '' },
        'show-ref --hash': { code: 0, stdout: 'a'.repeat(40), stderr: '' },
        'ls-remote origin': {
          code: 0,
          stdout: `${'b'.repeat(40)}\t${record.ref}`,
          stderr: '',
        },
      }),
    });
    expect(divergent.filter((check) => check.status === 'warn')).toHaveLength(
      2,
    );

    const offline = await checkSyncedProjects(repoRoot, {
      git: gitRunner({
        'show-ref --hash': { code: 0, stdout: 'a'.repeat(40), stderr: '' },
        'ls-remote origin': { code: 128, stdout: '', stderr: 'offline' },
      }),
    });
    expect(offline.some((check) => check.message.includes('offline'))).toBe(
      true,
    );
    expect(
      offline.find((check) => check.message.includes('offline'))?.status,
    ).toBe('pass');
  });
});
