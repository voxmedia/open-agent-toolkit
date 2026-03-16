import type { CommandContext } from '@app/command-context';
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
