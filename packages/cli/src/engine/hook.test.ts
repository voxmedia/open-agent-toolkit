import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  HOOK_DRIFT_WARNING,
  HOOK_MARKER_END,
  HOOK_MARKER_START,
  installHook,
  isHookInstalled,
  runHookCheck,
  uninstallHook,
} from './hook';

describe('git hook', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  async function createProjectRoot(prefix: string): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), prefix));
    tempDirs.push(root);
    await mkdir(join(root, '.git', 'hooks'), { recursive: true });
    return root;
  }

  it('installHook creates hook file in .git/hooks/', async () => {
    const root = await createProjectRoot('oat-hook-install-');

    await installHook(root);

    const hookPath = join(root, '.git', 'hooks', 'pre-commit');
    const content = await readFile(hookPath, 'utf8');
    expect(content).toContain(HOOK_MARKER_START);
    expect(content).toContain(HOOK_MARKER_END);
  });

  it('installHook preserves existing hook content', async () => {
    const root = await createProjectRoot('oat-hook-preserve-');
    const hookPath = join(root, '.git', 'hooks', 'pre-commit');
    await writeFile(hookPath, '#!/bin/sh\necho "existing"\n', 'utf8');

    await installHook(root);

    const content = await readFile(hookPath, 'utf8');
    expect(content).toContain('echo "existing"');
    expect(content).toContain(HOOK_MARKER_START);
  });

  it('installHook is idempotent and does not duplicate OAT section', async () => {
    const root = await createProjectRoot('oat-hook-idempotent-');

    await installHook(root);
    await installHook(root);

    const content = await readFile(
      join(root, '.git', 'hooks', 'pre-commit'),
      'utf8',
    );
    const markerCount = content.split(HOOK_MARKER_START).length - 1;
    expect(markerCount).toBe(1);
  });

  it('uninstallHook removes OAT section only', async () => {
    const root = await createProjectRoot('oat-hook-uninstall-');
    const hookPath = join(root, '.git', 'hooks', 'pre-commit');
    await writeFile(hookPath, '#!/bin/sh\necho "existing"\n', 'utf8');
    await installHook(root);

    await uninstallHook(root);

    const content = await readFile(hookPath, 'utf8');
    expect(content).toContain('echo "existing"');
    expect(content).not.toContain(HOOK_MARKER_START);
  });

  it('uninstallHook is no-op when hook not installed', async () => {
    const root = await createProjectRoot('oat-hook-uninstall-noop-');
    const hookPath = join(root, '.git', 'hooks', 'pre-commit');
    await writeFile(hookPath, '#!/bin/sh\necho "existing"\n', 'utf8');

    await uninstallHook(root);

    const content = await readFile(hookPath, 'utf8');
    expect(content).toContain('echo "existing"');
    expect(content).not.toContain(HOOK_MARKER_START);
  });

  it('uninstallHook removes hook file when OAT section is the only content', async () => {
    const root = await createProjectRoot('oat-hook-uninstall-empty-');
    const hookPath = join(root, '.git', 'hooks', 'pre-commit');
    await installHook(root);

    await uninstallHook(root);

    await expect(readFile(hookPath, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('isHookInstalled detects existing OAT hook section', async () => {
    const root = await createProjectRoot('oat-hook-detect-');
    expect(await isHookInstalled(root)).toBe(false);

    await installHook(root);

    expect(await isHookInstalled(root)).toBe(true);
  });

  it('runHookCheck returns drift warnings', async () => {
    const warn = vi.fn();
    const result = await runHookCheck('/tmp/workspace', {
      runStatusCommand: async () => false,
      warn,
    });

    expect(result.inSync).toBe(false);
    expect(warn).toHaveBeenCalledWith(HOOK_DRIFT_WARNING);
  });

  it('runHookCheck does not block when status check fails', async () => {
    const warn = vi.fn();
    const result = await runHookCheck('/tmp/workspace', {
      runStatusCommand: async () => {
        throw new Error('status failed');
      },
      warn,
    });

    expect(result.inSync).toBe(false);
    expect(warn).toHaveBeenCalledWith(HOOK_DRIFT_WARNING);
  });

  it('installHook resolves symlinked .git directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-hook-git-symlink-'));
    tempDirs.push(root);
    const gitStore = join(root, 'git-store');
    await mkdir(join(gitStore, 'hooks'), { recursive: true });
    await symlink(gitStore, join(root, '.git'), 'dir');

    await installHook(root);

    const hookPath = join(gitStore, 'hooks', 'pre-commit');
    const content = await readFile(hookPath, 'utf8');
    expect(content).toContain(HOOK_MARKER_START);
    expect(content).toContain('--scope project');
  });

  describe('core.hooksPath support', () => {
    async function createGitRepoRoot(prefix: string): Promise<string> {
      const root = await mkdtemp(join(tmpdir(), prefix));
      tempDirs.push(root);
      const { execSync } = await import('node:child_process');
      execSync('git init', { cwd: root, stdio: 'ignore' });
      return root;
    }

    it('installHook writes to core.hooksPath directory when set', async () => {
      const root = await createGitRepoRoot('oat-hook-hookspath-');
      const huskyDir = join(root, '.husky');
      await mkdir(huskyDir, { recursive: true });
      const { execSync } = await import('node:child_process');
      execSync('git config core.hooksPath .husky', {
        cwd: root,
        stdio: 'ignore',
      });

      await installHook(root);

      const hookPath = join(huskyDir, 'pre-commit');
      const content = await readFile(hookPath, 'utf8');
      expect(content).toContain(HOOK_MARKER_START);
      // Should NOT have written to .git/hooks/
      await expect(
        readFile(join(root, '.git', 'hooks', 'pre-commit'), 'utf8'),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('isHookInstalled checks core.hooksPath directory', async () => {
      const root = await createGitRepoRoot('oat-hook-hookspath-detect-');
      const huskyDir = join(root, '.husky');
      await mkdir(huskyDir, { recursive: true });
      const { execSync } = await import('node:child_process');
      execSync('git config core.hooksPath .husky', {
        cwd: root,
        stdio: 'ignore',
      });

      expect(await isHookInstalled(root)).toBe(false);
      await installHook(root);
      expect(await isHookInstalled(root)).toBe(true);
    });

    it('uninstallHook removes from core.hooksPath directory', async () => {
      const root = await createGitRepoRoot('oat-hook-hookspath-uninstall-');
      const huskyDir = join(root, '.husky');
      await mkdir(huskyDir, { recursive: true });
      const { execSync } = await import('node:child_process');
      execSync('git config core.hooksPath .husky', {
        cwd: root,
        stdio: 'ignore',
      });
      await writeFile(
        join(huskyDir, 'pre-commit'),
        '#!/bin/sh\nnpx lint-staged\n',
        'utf8',
      );
      await installHook(root);

      await uninstallHook(root);

      const content = await readFile(join(huskyDir, 'pre-commit'), 'utf8');
      expect(content).toContain('npx lint-staged');
      expect(content).not.toContain(HOOK_MARKER_START);
    });
  });

  describe('symlink-safe operations', () => {
    it('uninstallHook preserves symlink when OAT snippet is the only content', async () => {
      const root = await createProjectRoot('oat-hook-symlink-uninstall-');
      const sourceDir = join(root, 'tools', 'hooks');
      await mkdir(sourceDir, { recursive: true });
      const sourcePath = join(sourceDir, 'pre-commit');
      // Simulate: OAT previously wrote its snippet through the symlink
      await writeFile(sourcePath, '', 'utf8');
      const hookPath = join(root, '.git', 'hooks', 'pre-commit');
      await symlink(sourcePath, hookPath);

      await installHook(root);
      await uninstallHook(root);

      // Symlink should still exist
      const stat = await lstat(hookPath);
      expect(stat.isSymbolicLink()).toBe(true);
      // Target content should be empty (not deleted)
      const content = await readFile(sourcePath, 'utf8');
      expect(content).toBe('');
    });

    it('install + uninstall round-trip preserves symlink and original content', async () => {
      const root = await createProjectRoot('oat-hook-symlink-roundtrip-');
      const sourceDir = join(root, 'tools', 'hooks');
      await mkdir(sourceDir, { recursive: true });
      const sourcePath = join(sourceDir, 'pre-commit');
      const originalContent = '#!/bin/sh\npnpm exec lint-staged\n';
      await writeFile(sourcePath, originalContent, 'utf8');
      const hookPath = join(root, '.git', 'hooks', 'pre-commit');
      await symlink(sourcePath, hookPath);

      await installHook(root);

      // OAT snippet was appended through the symlink
      const afterInstall = await readFile(sourcePath, 'utf8');
      expect(afterInstall).toContain('pnpm exec lint-staged');
      expect(afterInstall).toContain(HOOK_MARKER_START);

      await uninstallHook(root);

      // Symlink preserved, original content restored
      const stat = await lstat(hookPath);
      expect(stat.isSymbolicLink()).toBe(true);
      const afterUninstall = await readFile(sourcePath, 'utf8');
      expect(afterUninstall).toContain('pnpm exec lint-staged');
      expect(afterUninstall).not.toContain(HOOK_MARKER_START);
    });
  });
});
