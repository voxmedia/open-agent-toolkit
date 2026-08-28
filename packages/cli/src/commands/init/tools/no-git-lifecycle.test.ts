import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { inventoryScopedPack } from '@commands/tools/shared/pack-inventory';
import { reconcilePackLifecycles } from '@commands/tools/shared/pack-lifecycle';
import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import { readScopedPackIntent } from '@commands/tools/shared/scoped-pack-intent';
import { resolveAssetsRoot } from '@fs/assets';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitToolsCommand } from './index';

const roots: string[] = [];

async function temporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

async function runNoGitCommand(
  userRoot: string,
  args: string[],
): Promise<{
  capture: ReturnType<typeof createLoggerCapture>;
  resolveProjectRoot: ReturnType<typeof vi.fn>;
  postLifecycleProjectRootCalls: () => number;
}> {
  const capture = createLoggerCapture();
  let lifecycleComplete = false;
  let postLifecycleCalls = 0;
  const resolveProjectRoot = vi.fn(async () => {
    if (lifecycleComplete) postLifecycleCalls += 1;
    throw new Error('not a repository');
  });
  const command = createInitToolsCommand({
    buildCommandContext: (options: GlobalOptions): CommandContext => ({
      scope: (options.scope ?? 'all') as Scope,
      dryRun: false,
      verbose: options.verbose ?? false,
      json: true,
      cwd: userRoot,
      home: userRoot,
      interactive: false,
      logger: capture.logger,
    }),
    resolveProjectRoot,
    resolveScopeRoot: () => userRoot,
    resolveAssetsRoot,
    reconcilePacks: async (requests, options) => {
      const results = await reconcilePackLifecycles(requests, options);
      lifecycleComplete = true;
      return results;
    },
  });
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();
  const init = new Command('init');
  init.addCommand(command);
  program.addCommand(init);

  await program.parseAsync(
    ['--json', '--cwd', userRoot, 'init', 'tools', ...args],
    { from: 'user' },
  );
  return {
    capture,
    resolveProjectRoot,
    postLifecycleProjectRootCalls: () => postLifecycleCalls,
  };
}

describe('no-Git production pack commands', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
    roots.length = 0;
  });

  it('completes a direct omitted-scope install with one final JSON value', async () => {
    const userRoot = await temporaryRoot('oat-direct-no-git-');
    const result = await runNoGitCommand(userRoot, ['docs']);

    expect(process.exitCode).toBe(0);
    expect(result.capture.jsonPayloads).toHaveLength(1);
    expect(() =>
      JSON.parse(JSON.stringify(result.capture.jsonPayloads[0])),
    ).not.toThrow();
    // A direct install resolves the project root exactly once, before the
    // lifecycle runs, to see whether the pack already lives at project scope.
    // Outside a repository that lookup fails and is absorbed, so the install
    // still completes at user scope and no project post-hook runs.
    expect(result.resolveProjectRoot).toHaveBeenCalledTimes(1);
    expect(result.postLifecycleProjectRootCalls()).toBe(0);
    const payload = result.capture.jsonPayloads[0] as {
      results: Array<{ apply: { inventory: { intent: { source: string } } } }>;
    };
    expect(payload.results[0]!.apply.inventory.intent.source).toBe('declared');

    const assetsRoot = await resolveAssetsRoot();
    await expect(
      inventoryScopedPack({
        pack: 'docs',
        scope: 'user',
        scopeRoot: userRoot,
        assetsRoot,
      }),
    ).resolves.toMatchObject({
      completeness: 'complete',
      intent: { enabled: true, source: 'declared' },
    });
  });

  it('completes aggregate omitted-scope install without a project post-hook', async () => {
    const userRoot = await temporaryRoot('oat-aggregate-no-git-');
    const result = await runNoGitCommand(userRoot, []);

    expect(process.exitCode).toBe(0);
    expect(result.capture.jsonPayloads).toHaveLength(1);
    expect(() =>
      JSON.parse(JSON.stringify(result.capture.jsonPayloads[0])),
    ).not.toThrow();
    expect(result.resolveProjectRoot).toHaveBeenCalledTimes(1);
    expect(result.postLifecycleProjectRootCalls()).toBe(0);

    const assetsRoot = await resolveAssetsRoot();
    for (const { name: pack } of PACK_MANIFEST) {
      await expect(
        inventoryScopedPack({
          pack,
          scope: 'user',
          scopeRoot: userRoot,
          assetsRoot,
        }),
      ).resolves.toMatchObject({
        completeness: 'complete',
        intent: { enabled: true, source: 'declared' },
      });
      await expect(
        readScopedPackIntent({ pack, scope: 'user', scopeRoot: userRoot }),
      ).resolves.toMatchObject({ enabled: true, source: 'declared' });
    }
  });
});
