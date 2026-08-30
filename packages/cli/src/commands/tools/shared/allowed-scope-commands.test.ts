import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createToolsHasCommand } from '@commands/tools/has';
import { createToolsOutdatedCommand } from '@commands/tools/outdated';
import { resolveAssetsRoot } from '@fs/assets';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

const roots: string[] = [];

async function makeRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function programWith(command: Command): Command {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();
  const tools = new Command('tools');
  tools.addCommand(command);
  program.addCommand(tools);
  return program;
}

describe('allowed-scope command paths', () => {
  afterEach(async () => {
    process.exitCode = undefined;
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
    roots.length = 0;
  });

  it('runs default all-scope has core through real inventory without inspecting project', async () => {
    const projectRoot = await makeRoot('oat-has-project-');
    const userRoot = await makeRoot('oat-has-user-');
    const command = createToolsHasCommand({
      scanTools: async () => [],
      resolveScopeRoot: async (scope) =>
        scope === 'project' ? projectRoot : userRoot,
      resolveAssetsRoot,
    });

    await expect(
      programWith(command).parseAsync(['tools', 'has', 'core'], {
        from: 'user',
      }),
    ).resolves.toBeDefined();
    expect(process.exitCode).toBe(0);
  });

  it('runs default all-scope outdated through real allowed-scope inventory', async () => {
    const projectRoot = await makeRoot('oat-outdated-project-');
    const userRoot = await makeRoot('oat-outdated-user-');
    const command = createToolsOutdatedCommand({
      scanTools: async () => [],
      resolveScopeRoot: async (scope) =>
        scope === 'project' ? projectRoot : userRoot,
      resolveAssetsRoot,
    });

    await expect(
      programWith(command).parseAsync(['tools', 'outdated'], { from: 'user' }),
    ).resolves.toBeDefined();
  });
});
