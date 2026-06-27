import type { CommandContext } from '@app/command-context';
import { Command, Option } from 'commander';
import { describe, expect, it, vi } from 'vitest';

import { createInitToolsCoreCommand } from './index';

function makeContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    cwd: '/test/project',
    home: '/test/home',
    interactive: true,
    json: false,
    verbose: false,
    scope: 'all',
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      json: vi.fn(),
    },
    ...overrides,
  };
}

function makeInstallCore() {
  return vi.fn(async () => ({
    copiedSkills: ['oat-docs', 'oat-doctor'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    docsStatus: 'copied' as const,
  }));
}

describe('createInitToolsCoreCommand', () => {
  it('always installs at user scope', async () => {
    const resolveScopeRoot = vi.fn(() => '/test/home');
    const installCore = makeInstallCore();

    const cmd = createInitToolsCoreCommand({
      buildCommandContext: () => makeContext({ scope: 'project' }),
      resolveScopeRoot,
      resolveAssetsRoot: async () => '/assets',
      installCore,
    });

    await cmd.parseAsync(['node', 'core']);

    expect(resolveScopeRoot).toHaveBeenCalledWith(
      'user',
      '/test/project',
      '/test/home',
    );
    expect(installCore).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/test/home' }),
    );
  });

  it('reports success with JSON output', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      json: vi.fn(),
    };

    const cmd = createInitToolsCoreCommand({
      buildCommandContext: () => makeContext({ json: true, logger }),
      resolveScopeRoot: () => '/test/home',
      resolveAssetsRoot: async () => '/assets',
      installCore: makeInstallCore(),
    });

    await cmd.parseAsync(['node', 'core']);

    expect(logger.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        scope: 'user',
        targetRoot: '/test/home',
      }),
    );
  });

  it('reports success with human-readable output', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      json: vi.fn(),
    };

    const cmd = createInitToolsCoreCommand({
      buildCommandContext: () => makeContext({ logger }),
      resolveScopeRoot: () => '/test/home',
      resolveAssetsRoot: async () => '/assets',
      installCore: makeInstallCore(),
    });

    await cmd.parseAsync(['node', 'core']);

    expect(logger.info).toHaveBeenCalledWith('Installed core tool pack.');
    expect(logger.info).toHaveBeenCalledWith('Scope: user');
    expect(logger.info).toHaveBeenCalledWith('Docs: copied');
  });

  it('passes force flag to installer', async () => {
    const installCore = makeInstallCore();

    const cmd = createInitToolsCoreCommand({
      buildCommandContext: () => makeContext(),
      resolveScopeRoot: () => '/test/home',
      resolveAssetsRoot: async () => '/assets',
      installCore,
    });

    await cmd.parseAsync(['node', 'core', '--force']);

    expect(installCore).toHaveBeenCalledWith(
      expect.objectContaining({ force: true }),
    );
  });
});

// Helpers for scope-conflict tests: wrap the core command in a parent that
// has --scope so Commander's getOptionValueSourceWithGlobals can detect
// explicit vs defaulted values.
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

describe('createInitToolsCoreCommand — scope conflict rejection', () => {
  it('rejects explicit --scope project with exit code 1', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      json: vi.fn(),
    };
    const installCore = makeInstallCore();
    const cmd = createInitToolsCoreCommand({
      buildCommandContext: () => makeContext({ logger }),
      resolveScopeRoot: () => '/test/home',
      resolveAssetsRoot: async () => '/assets',
      installCore,
    });
    const parent = wrapWithScopeParent(cmd);

    const exitCode = await runViaParent(parent, ['--scope', 'project', 'core']);

    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('user scope'),
    );
    // Install must not run when scope is rejected
    expect(installCore).not.toHaveBeenCalled();
  });

  it('rejects explicit --scope all with exit code 1', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      json: vi.fn(),
    };
    const installCore = makeInstallCore();
    const cmd = createInitToolsCoreCommand({
      buildCommandContext: () => makeContext({ logger }),
      resolveScopeRoot: () => '/test/home',
      resolveAssetsRoot: async () => '/assets',
      installCore,
    });
    const parent = wrapWithScopeParent(cmd);

    const exitCode = await runViaParent(parent, ['--scope', 'all', 'core']);

    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('user scope'),
    );
    expect(installCore).not.toHaveBeenCalled();
  });

  it('accepts explicit --scope user and proceeds with install', async () => {
    const installCore = makeInstallCore();
    const cmd = createInitToolsCoreCommand({
      buildCommandContext: () => makeContext(),
      resolveScopeRoot: () => '/test/home',
      resolveAssetsRoot: async () => '/assets',
      installCore,
    });
    const parent = wrapWithScopeParent(cmd);

    const exitCode = await runViaParent(parent, ['--scope', 'user', 'core']);

    // Commands set exitCode=0 on success; any non-1 code means no rejection
    expect(exitCode).not.toBe(1);
    expect(installCore).toHaveBeenCalled();
  });

  it('accepts absent --scope (defaulted) and proceeds with install', async () => {
    const installCore = makeInstallCore();
    const cmd = createInitToolsCoreCommand({
      buildCommandContext: () => makeContext(),
      resolveScopeRoot: () => '/test/home',
      resolveAssetsRoot: async () => '/assets',
      installCore,
    });
    const parent = wrapWithScopeParent(cmd);

    // No --scope flag → default value ('all'), source = 'default', not 'cli'
    const exitCode = await runViaParent(parent, ['core']);

    expect(exitCode).not.toBe(1);
    expect(installCore).toHaveBeenCalled();
  });
});
