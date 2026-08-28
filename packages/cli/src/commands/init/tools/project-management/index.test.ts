import type { CommandContext } from '@app/command-context';
import { getInstalledCanonicalPaths } from '@commands/tools/shared/install-sync-context';
import { Command, Option } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitToolsProjectManagementCommand } from './index';

const { upsertAgentsMdSection } = vi.hoisted(() => ({
  upsertAgentsMdSection: vi.fn(async () => ({
    action: 'updated' as const,
  })),
}));

vi.mock('@commands/shared/agents-md', () => ({
  upsertAgentsMdSection,
}));

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
  return vi.fn(
    async (options: { scope?: 'project' | 'user'; targetRoot: string }) => ({
      scope: options.scope ?? 'user',
      targetRoot: options.targetRoot,
      copiedSkills: ['oat-pjm-backlog'],
      updatedSkills: [],
      skippedSkills: [],
      outdatedSkills: [],
      copiedTemplates: [],
      updatedTemplates: [],
      skippedTemplates: [],
    }),
  );
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

describe('createInitToolsProjectManagementCommand — universal scope', () => {
  beforeEach(() => {
    upsertAgentsMdSection.mockClear();
  });

  it('accepts explicit --scope user without repository guidance writes', async () => {
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

    expect(exitCode).toBe(0);
    expect(installProjectManagement).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/test/home' }),
    );
    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
  });

  it('uses the manifest user default for --scope all', async () => {
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

    expect(exitCode).toBe(0);
    expect(installProjectManagement).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/test/home' }),
    );
  });

  it('emits scope, roots, and unchanged adoption provenance in JSON', async () => {
    const logger = makeLogger();
    const installProjectManagement = makeInstallProjectManagement();
    const cmd = createInitToolsProjectManagementCommand({
      buildCommandContext: () => makeContext({ logger, json: true }),
      resolveProjectRoot: async () => '/test/project',
      resolveAssetsRoot: async () => '/assets',
      installProjectManagement,
    });
    const parent = wrapWithScopeParent(cmd);

    await runViaParent(parent, ['--scope', 'user', 'project-management']);

    expect(logger.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        scope: 'user',
        targetRoot: '/test/home',
        assetsRoot: '/assets',
        adoption: {
          owner: 'repository',
          action: 'oat pjm init',
          changed: false,
        },
        result: expect.objectContaining({
          scope: 'user',
          targetRoot: '/test/home',
        }),
      }),
    );
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

  it('defaults absent --scope to user and proceeds with install', async () => {
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
    expect(installProjectManagement).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/test/home' }),
    );
  });

  it('does not treat project-scope capability placement as repository adoption', async () => {
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

    expect(exitCode).not.toBe(1);
    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
    expect(installProjectManagement).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'project' }),
    );
  });

  it('reports adoption-owned next steps after project capability placement', async () => {
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
      'project',
      'project-management',
    ]);

    expect(exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalledWith(
      'Installed project-management tool pack.',
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('pjm init'),
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(getInstalledCanonicalPaths(cmd)).not.toHaveLength(0);
  });
});
