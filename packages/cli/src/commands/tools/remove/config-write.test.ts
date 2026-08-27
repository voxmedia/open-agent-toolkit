import type { ToolInfo } from '@commands/tools/shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  readOatConfig,
  writeOatConfig,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveManagedScopeRoots,
  validateManagedPath,
  scanToolsMock,
} = vi.hoisted(() => ({
  readOatConfig: vi.fn(async () => ({
    version: 1 as const,
    tools: {
      ideas: true,
      'project-management': true,
    },
  })),
  writeOatConfig: vi.fn(async () => {}),
  resolveProjectRoot: vi.fn(async (cwd: string) => cwd),
  resolveScopeRoot: vi.fn(
    (scope: 'project' | 'user', cwd: string, home: string) =>
      scope === 'project' ? cwd : home,
  ),
  resolveManagedScopeRoots: vi.fn(async (scopeRoot: string) => ({
    '.agents': {
      name: '.agents',
      logicalRoot: `${scopeRoot}/.agents`,
      realRoot: `${scopeRoot}/.agents`,
      exists: true,
    },
    '.oat': {
      name: '.oat',
      logicalRoot: `${scopeRoot}/.oat`,
      realRoot: `${scopeRoot}/.oat`,
      exists: true,
    },
  })),
  validateManagedPath: vi.fn(
    async (candidatePath: string, managedRoot: { realRoot: string }) => ({
      realManagedRoot: managedRoot.realRoot,
      realPath: candidatePath,
    }),
  ),
  scanToolsMock: vi.fn(),
}));

vi.mock('@config/oat-config', () => ({
  readOatConfig,
  writeOatConfig,
}));

vi.mock('@fs/paths', () => ({
  resolveProjectRoot,
  resolveScopeRoot,
  resolveManagedScopeRoots,
  validateManagedPath,
}));

import { createToolsRemoveCommand } from './index';
import type { RemoveToolsDependencies } from './remove-tools';

function createTool(overrides: Partial<ToolInfo> = {}): ToolInfo {
  return {
    name: 'oat-pjm-add-backlog-item',
    type: 'skill',
    scope: 'project',
    version: '1.0.0',
    bundledVersion: '1.0.0',
    pack: 'project-management',
    status: 'current',
    ...overrides,
  };
}

async function runCommand(
  command: Command,
  args: string[],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const tools = new Command('tools');
  tools.addCommand(command);
  program.addCommand(tools);

  await program.parseAsync([...globalArgs, 'tools', 'remove', ...args], {
    from: 'user',
  });
}

describe('createToolsRemoveCommand config writes', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    readOatConfig.mockClear();
    writeOatConfig.mockClear();
    resolveProjectRoot.mockClear();
    resolveScopeRoot.mockClear();
    scanToolsMock.mockReset();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('clears project state when the removed pack remains only in user scope', async () => {
    scanToolsMock.mockImplementation(async ({ scope }: { scope: string }) => {
      if (scope === 'project') {
        if (scanToolsMock.mock.calls.length === 1) {
          return [createTool()];
        }
        return [];
      }

      return [
        createTool({
          name: 'oat-project-summary',
          scope: 'user',
        }),
      ];
    });

    const removeDirectory = vi.fn(async () => {});
    const dependencies: RemoveToolsDependencies = {
      scanTools: scanToolsMock,
      resolveScopeRoot: vi.fn(async (scope, cwd, home) =>
        scope === 'project' ? cwd : home,
      ),
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      removeDirectory,
      removeFile: vi.fn(async () => {}),
      pathExists: vi.fn(async () => false),
      hasPackOwnershipEvidence: vi.fn(async () => false),
    };

    const command = createToolsRemoveCommand(dependencies, {
      runSync: vi.fn(async () => {}),
    });

    await runCommand(
      command,
      ['--pack', 'project-management', '--no-sync'],
      ['--scope', 'project', '--cwd', '/tmp/workspace'],
    );

    expect(writeOatConfig).toHaveBeenCalledWith('/tmp/workspace', {
      version: 1,
      tools: { ideas: true },
    });
    expect(removeDirectory.mock.invocationCallOrder[0]).toBeLessThan(
      writeOatConfig.mock.invocationCallOrder[0]!,
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('clears intent for a pack whose managed assets were present on disk', async () => {
    scanToolsMock.mockResolvedValue([]);

    const sampled = new Set<string>();
    const dependencies: RemoveToolsDependencies = {
      scanTools: scanToolsMock,
      resolveScopeRoot: vi.fn(async (scope, cwd, home) =>
        scope === 'project' ? cwd : home,
      ),
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      removeDirectory: vi.fn(async () => {}),
      removeFile: vi.fn(async () => {}),
      // Present before removal, gone after it: the pre-removal presence sample
      // is the first call for each path, the post-removal verification the
      // second.
      pathExists: vi.fn(async (path: string) => {
        const first = !sampled.has(path);
        sampled.add(path);
        return first;
      }),
      hasPackOwnershipEvidence: vi.fn(async () => false),
    };

    const command = createToolsRemoveCommand(dependencies, {
      runSync: vi.fn(async () => {}),
    });

    await runCommand(
      command,
      ['--pack', 'project-management', '--no-sync'],
      ['--scope', 'project', '--cwd', '/tmp/workspace'],
    );

    expect(writeOatConfig).toHaveBeenCalledWith('/tmp/workspace', {
      version: 1,
      tools: { ideas: true },
    });
    expect(process.exitCode).toBeUndefined();
  });

  it('preserves durable intent when the removal removed nothing', async () => {
    scanToolsMock.mockResolvedValue([]);

    const dependencies: RemoveToolsDependencies = {
      scanTools: scanToolsMock,
      resolveScopeRoot: vi.fn(async (scope, cwd, home) =>
        scope === 'project' ? cwd : home,
      ),
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      removeDirectory: vi.fn(async () => {}),
      removeFile: vi.fn(async () => {}),
      pathExists: vi.fn(async () => false),
      hasPackOwnershipEvidence: vi.fn(async () => false),
    };

    const command = createToolsRemoveCommand(dependencies, {
      runSync: vi.fn(async () => {}),
    });

    await runCommand(
      command,
      ['--pack', 'project-management', '--no-sync'],
      ['--scope', 'project', '--cwd', '/tmp/workspace'],
    );

    // Nothing was on disk, so nothing was removed and the command reports as
    // much. Rewriting a tracked config file anyway would delete the intent
    // `oat tools update` restores a fully-missing pack from.
    expect(writeOatConfig).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it('preserves every pack intent when --all removes nothing', async () => {
    scanToolsMock.mockResolvedValue([]);

    const dependencies: RemoveToolsDependencies = {
      scanTools: scanToolsMock,
      resolveScopeRoot: vi.fn(async (scope, cwd, home) =>
        scope === 'project' ? cwd : home,
      ),
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      removeDirectory: vi.fn(async () => {}),
      removeFile: vi.fn(async () => {}),
      pathExists: vi.fn(async () => false),
      hasPackOwnershipEvidence: vi.fn(async () => false),
    };

    const command = createToolsRemoveCommand(dependencies, {
      runSync: vi.fn(async () => {}),
    });

    await runCommand(
      command,
      ['--all', '--no-sync'],
      ['--scope', 'project', '--cwd', '/tmp/workspace'],
    );

    expect(writeOatConfig).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it('does not clear intent when a managed asset remains after removal', async () => {
    scanToolsMock.mockResolvedValue([]);
    const dependencies: RemoveToolsDependencies = {
      scanTools: scanToolsMock,
      resolveScopeRoot: vi.fn(async (scope, cwd, home) =>
        scope === 'project' ? cwd : home,
      ),
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      removeDirectory: vi.fn(async () => {}),
      removeFile: vi.fn(async () => {}),
      pathExists: vi.fn(async () => true),
      hasPackOwnershipEvidence: vi.fn(async () => false),
    };
    const command = createToolsRemoveCommand(dependencies, {
      runSync: vi.fn(async () => {}),
    });

    await expect(
      runCommand(
        command,
        ['--pack', 'project-management', '--no-sync'],
        ['--scope', 'project', '--cwd', '/tmp/workspace'],
      ),
    ).rejects.toThrow('Managed pack removal incomplete');

    expect(writeOatConfig).not.toHaveBeenCalled();
  });
});
