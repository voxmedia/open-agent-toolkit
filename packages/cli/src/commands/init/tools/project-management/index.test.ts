import type { CommandContext } from '@app/command-context';
import { Command, Option } from 'commander';
import { describe, expect, it, vi } from 'vitest';

import { createInitToolsProjectManagementCommand } from './index';

function makeLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    json: vi.fn(),
  };
}

function makeContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    cwd: '/test/project',
    home: '/test/home',
    interactive: false,
    json: false,
    verbose: false,
    scope: 'all',
    logger: makeLogger(),
    ...overrides,
  };
}

function makeInstallProjectManagement() {
  return vi.fn(async () => ({
    copiedSkills: ['oat-pjm-backlog'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedTemplates: [],
    updatedTemplates: [],
    skippedTemplates: [],
  }));
}

// Wrap the project-management command in a parent that has --scope so
// Commander's getOptionValueSourceWithGlobals can detect explicit vs defaulted.
function wrapWithScopeParent(cmd: Command): Command {
  const parent = new Command('parent').addOption(
    new Option('--scope <scope>')
      .choices(['project', 'user', 'all'])
      .default('all'),
  );
  parent.addCommand(cmd);
  return parent;
}

async function runViaParent(
  parent: Command,
  extraArgs: string[],
): Promise<number | undefined> {
  const prev = process.exitCode;
  process.exitCode = undefined;
  // { from: 'user' } means args are passed without a leading script name.
  await parent.parseAsync(extraArgs, { from: 'user' });
  const result = process.exitCode as number | undefined;
  process.exitCode = prev;
  return result;
}

describe('createInitToolsProjectManagementCommand — scope conflict rejection', () => {
  it('rejects explicit --scope user with exit code 1', async () => {
    const logger = makeLogger();
    const installProjectManagement = makeInstallProjectManagement();
    const cmd = createInitToolsProjectManagementCommand({
      buildCommandContext: () => makeContext({ logger }),
      resolveProjectRoot: async () => '/test/project',
      resolveAssetsRoot: async () => '/assets',
      installProjectManagement,
    });
    const parent = wrapWithScopeParent(cmd);

    const exitCode = await runViaParent(parent, [
      '--scope',
      'user',
      'project-management',
    ]);

    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('project scope'),
    );
    // Install must not run when scope is rejected
    expect(installProjectManagement).not.toHaveBeenCalled();
  });

  it('rejects explicit --scope all with exit code 1', async () => {
    const logger = makeLogger();
    const installProjectManagement = makeInstallProjectManagement();
    const cmd = createInitToolsProjectManagementCommand({
      buildCommandContext: () => makeContext({ logger }),
      resolveProjectRoot: async () => '/test/project',
      resolveAssetsRoot: async () => '/assets',
      installProjectManagement,
    });
    const parent = wrapWithScopeParent(cmd);

    const exitCode = await runViaParent(parent, [
      '--scope',
      'all',
      'project-management',
    ]);

    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('project scope'),
    );
    expect(installProjectManagement).not.toHaveBeenCalled();
  });

  it('accepts explicit --scope project and proceeds with install', async () => {
    const installProjectManagement = makeInstallProjectManagement();
    const cmd = createInitToolsProjectManagementCommand({
      buildCommandContext: () => makeContext(),
      resolveProjectRoot: async () => '/test/project',
      resolveAssetsRoot: async () => '/assets',
      installProjectManagement,
    });
    const parent = wrapWithScopeParent(cmd);

    const exitCode = await runViaParent(parent, [
      '--scope',
      'project',
      'project-management',
    ]);

    // Commands set exitCode=0 on success; any non-1 code means no rejection
    expect(exitCode).not.toBe(1);
    expect(installProjectManagement).toHaveBeenCalled();
  });

  it('accepts absent --scope (defaulted) and proceeds with install', async () => {
    const installProjectManagement = makeInstallProjectManagement();
    const cmd = createInitToolsProjectManagementCommand({
      buildCommandContext: () => makeContext(),
      resolveProjectRoot: async () => '/test/project',
      resolveAssetsRoot: async () => '/assets',
      installProjectManagement,
    });
    const parent = wrapWithScopeParent(cmd);

    // No --scope flag → default value ('all'), source = 'default', not 'cli'
    const exitCode = await runViaParent(parent, ['project-management']);

    expect(exitCode).not.toBe(1);
    expect(installProjectManagement).toHaveBeenCalled();
  });
});
