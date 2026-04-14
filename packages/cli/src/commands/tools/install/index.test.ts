import { setInstalledCanonicalPaths } from '@commands/tools/shared/install-sync-context';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createToolsInstallCommand } from './index';

describe('createToolsInstallCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('passes installed canonical paths from the action command into auto-sync', async () => {
    const runSync = vi.fn(async () => {});
    const command = createToolsInstallCommand({ runSync }, () =>
      new Command('tools').addCommand(
        new Command('docs').action(async (_options, actionCommand: Command) => {
          setInstalledCanonicalPaths(actionCommand, [
            '.agents/skills/oat-docs-analyze',
          ]);
          process.exitCode = 0;
        }),
      ),
    );

    const program = new Command()
      .name('oat')
      .option('--scope <scope>')
      .option('--cwd <path>')
      .exitOverride();
    program.addCommand(new Command('tools').addCommand(command));

    await program.parseAsync(
      ['--scope', 'project', 'tools', 'install', 'docs'],
      { from: 'user' },
    );

    expect(runSync).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'project',
        installedCanonicalPaths: ['.agents/skills/oat-docs-analyze'],
      }),
    );
  });
});
