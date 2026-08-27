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

import {
  hasScopedPackOwnershipEvidence,
  readScopedPackIntent,
  writeScopedPackIntent,
} from '@commands/tools/shared/scoped-pack-intent';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

import { createToolsRemoveCommand } from './index';
import type { RemoveToolsDependencies } from './remove-tools';

const tempDirs: string[] = [];

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

async function makeRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

function filesystemDeps(scopeRoot: string): RemoveToolsDependencies {
  return {
    scanTools: async () => [],
    resolveScopeRoot: async () => scopeRoot,
    resolveAssetsRoot: async () => '/assets',
    removeDirectory: async (path) => rm(path, { recursive: true, force: true }),
    removeFile: async (path) => rm(path, { force: true }),
    pathExists,
    hasPackOwnershipEvidence: async (pack, scope, root) =>
      hasScopedPackOwnershipEvidence({ pack, scope, scopeRoot: root }),
  };
}

async function runRemoveCommand(
  scopeRoot: string,
  args: string[],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();
  const tools = new Command('tools');
  tools.addCommand(
    createToolsRemoveCommand(filesystemDeps(scopeRoot), {
      runSync: async () => {},
    }),
  );
  program.addCommand(tools);

  await program.parseAsync(
    ['--scope', 'user', '--cwd', scopeRoot, 'tools', 'remove', ...args],
    { from: 'user' },
  );
}

describe('manifest removal containment', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('rejects a linked managed target before any removal or intent clear', async () => {
    const scopeRoot = await makeRoot('oat-remove-contained-');
    const outsideRoot = await makeRoot('oat-remove-outside-');
    const earlierTarget = join(
      scopeRoot,
      '.agents',
      'skills',
      'oat-project-implement',
    );
    const escapingParent = join(scopeRoot, '.oat', 'templates');
    const laterTarget = join(
      scopeRoot,
      '.oat',
      'scripts',
      'generate-oat-state.sh',
    );
    const outsideSentinel = join(outsideRoot, 'state.md');
    await mkdir(earlierTarget, { recursive: true });
    await writeFile(join(earlierTarget, 'sentinel.txt'), 'earlier-safe\n');
    await mkdir(join(scopeRoot, '.oat', 'scripts'), { recursive: true });
    await writeFile(laterTarget, 'later-safe\n');
    await writeFile(outsideSentinel, 'outside-safe\n');
    await symlink(outsideRoot, escapingParent, 'dir');
    await writeScopedPackIntent({
      pack: 'workflows',
      scope: 'user',
      scopeRoot,
      enabled: true,
    });

    await expect(
      runRemoveCommand(scopeRoot, ['--pack', 'workflows', '--no-sync']),
    ).rejects.toThrow(/managed path.*escapes resolved root/i);

    await expect(
      readFile(join(earlierTarget, 'sentinel.txt'), 'utf8'),
    ).resolves.toBe('earlier-safe\n');
    await expect(readFile(outsideSentinel, 'utf8')).resolves.toBe(
      'outside-safe\n',
    );
    await expect(readFile(laterTarget, 'utf8')).resolves.toBe('later-safe\n');
    await expect(
      readScopedPackIntent({
        pack: 'workflows',
        scope: 'user',
        scopeRoot,
      }),
    ).resolves.toMatchObject({ enabled: true, source: 'declared' });
  });
});
