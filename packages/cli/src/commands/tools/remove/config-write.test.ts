import type { ToolInfo } from '@commands/tools/shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readOatConfig, writeOatConfig, resolveProjectRoot, resolveScopeRoot } =
  vi.hoisted(() => ({
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
  }));

vi.mock('@config/oat-config', () => ({
  readOatConfig,
  writeOatConfig,
}));

vi.mock('@fs/paths', () => ({
  resolveProjectRoot,
  resolveScopeRoot,
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
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('sets the removed pack to false after --pack removal', async () => {
    const dependencies: RemoveToolsDependencies = {
      scanTools: vi.fn(async () => [createTool()]),
      resolveScopeRoot: vi.fn(async (scope, cwd, home) =>
        scope === 'project' ? cwd : home,
      ),
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      removeDirectory: vi.fn(async () => {}),
      removeFile: vi.fn(async () => {}),
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
      tools: {
        ideas: true,
        'project-management': false,
      },
    });
    expect(process.exitCode).toBeUndefined();
  });
});
