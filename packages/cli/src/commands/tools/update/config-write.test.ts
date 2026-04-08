import type { ToolInfo } from '@commands/tools/shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readOatConfig, writeOatConfig, resolveProjectRoot, resolveScopeRoot } =
  vi.hoisted(() => ({
    readOatConfig: vi.fn(async () => ({ version: 1 as const })),
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

import { createToolsUpdateCommand } from './index';
import type { UpdateToolsDependencies } from './update-tools';

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

  await program.parseAsync([...globalArgs, 'tools', 'update', ...args], {
    from: 'user',
  });
}

describe('createToolsUpdateCommand config writes', () => {
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

  it('reconciles tools config from installed packs after --all', async () => {
    const toolsByScope: Record<string, ToolInfo[]> = {
      project: [
        createTool(),
        createTool({
          name: 'oat-project-new',
          pack: 'workflows',
        }),
      ],
    };

    const dependencies: UpdateToolsDependencies = {
      scanTools: vi.fn(async (options) => toolsByScope[options.scope] ?? []),
      resolveScopeRoot: vi.fn(async (scope, cwd, home) =>
        scope === 'project' ? cwd : home,
      ),
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      copyDirWithStatus: vi.fn(async () => 'updated' as const),
      copyFileWithStatus: vi.fn(async () => 'updated' as const),
    };

    const command = createToolsUpdateCommand(dependencies, {
      runSync: vi.fn(async () => {}),
    });

    await runCommand(
      command,
      ['--all', '--no-sync'],
      ['--scope', 'all', '--cwd', '/tmp/workspace'],
    );

    expect(writeOatConfig).toHaveBeenCalledWith('/tmp/workspace', {
      version: 1,
      tools: {
        core: false,
        ideas: false,
        docs: false,
        workflows: true,
        utility: false,
        'project-management': true,
        research: false,
      },
    });
    expect(process.exitCode).toBeUndefined();
  });
});
