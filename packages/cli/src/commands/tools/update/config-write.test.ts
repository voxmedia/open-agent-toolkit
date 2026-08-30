import type { ToolInfo } from '@commands/tools/shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  readOatConfig,
  readOatLocalConfig,
  readUserConfig,
  writeOatConfig,
  resolveProjectRoot,
  resolveScopeRoot,
  buildCommandContext,
  loggerCapture,
} = vi.hoisted(() => {
  const capture = {
    info: [] as string[],
    warn: [] as string[],
    error: [] as string[],
    success: [] as string[],
    debug: [] as string[],
    jsonPayloads: [] as unknown[],
  };

  return {
    readOatConfig: vi.fn(async () => ({ version: 1 as const })),
    readOatLocalConfig: vi.fn(async () => ({ version: 1 as const })),
    readUserConfig: vi.fn(async () => ({ version: 1 as const })),
    writeOatConfig: vi.fn(async () => {}),
    resolveProjectRoot: vi.fn(async (cwd: string) => cwd),
    resolveScopeRoot: vi.fn(
      (scope: 'project' | 'user', cwd: string, home: string) =>
        scope === 'project' ? cwd : home,
    ),
    buildCommandContext: vi.fn((options) => ({
      scope: options.scope ?? 'all',
      dryRun: options.dryRun ?? false,
      verbose: options.verbose ?? false,
      json: options.json ?? false,
      cwd: options.cwd ?? process.cwd(),
      home: '/tmp/home',
      interactive: false,
      logger: {
        debug(message: string) {
          capture.debug.push(message);
        },
        info(message: string) {
          capture.info.push(message);
        },
        warn(message: string) {
          capture.warn.push(message);
        },
        error(message: string) {
          capture.error.push(message);
        },
        success(message: string) {
          capture.success.push(message);
        },
        json(payload: unknown) {
          capture.jsonPayloads.push(payload);
        },
      },
    })),
    loggerCapture: capture,
  };
});

vi.mock('@app/command-context', () => ({
  buildCommandContext,
}));

vi.mock('@config/oat-config', () => ({
  readOatConfig,
  readOatLocalConfig,
  readUserConfig,
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
    buildCommandContext.mockClear();
    loggerCapture.info.length = 0;
    loggerCapture.warn.length = 0;
    loggerCapture.error.length = 0;
    loggerCapture.success.length = 0;
    loggerCapture.debug.length = 0;
    loggerCapture.jsonPayloads.length = 0;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('records only packs installed in project scope after project update', async () => {
    const toolsByScope: Record<string, ToolInfo[]> = {
      project: [
        createTool(),
        createTool({
          name: 'oat-project-new',
          pack: 'workflows',
        }),
      ],
      user: [
        createTool({
          name: 'oat-docs',
          scope: 'user',
          pack: 'docs',
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
      fileExists: vi.fn(async () => true),
      chmod: vi.fn(async () => {}),
      applyOatCoreGitignore: vi.fn(async () => ({
        action: 'updated' as const,
        entries: ['.oat/state.md'],
        stateDashboardIndexAction: 'not-tracked' as const,
      })),
    };

    const command = createToolsUpdateCommand(dependencies, {
      runSync: vi.fn(async () => {}),
    });

    await runCommand(
      command,
      ['--all', '--no-sync'],
      ['--scope', 'project', '--cwd', '/tmp/workspace'],
    );

    expect(writeOatConfig).toHaveBeenCalledWith('/tmp/workspace', {
      version: 1,
      tools: {
        workflows: true,
        'project-management': true,
      },
    });
    expect(process.exitCode).toBeUndefined();
  });

  it('backfills project gitignore when workflows pack is installed', async () => {
    const applyOatCoreGitignore = vi.fn(async () => ({
      action: 'updated' as const,
      entries: ['.oat/state.md'],
      stateDashboardIndexAction: 'untracked' as const,
    }));
    const applyOatCoreGitattributes = vi.fn(async () => ({
      action: 'updated' as const,
      entries: ['.oat/projects/shared/** linguist-generated=true'],
    }));
    const dependencies: UpdateToolsDependencies = {
      scanTools: vi.fn(async (options) =>
        options.scope === 'project'
          ? [
              createTool({
                name: 'oat-project-new',
                pack: 'workflows',
              }),
            ]
          : [],
      ),
      resolveScopeRoot: vi.fn(async (scope, cwd, home) =>
        scope === 'project' ? cwd : home,
      ),
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      copyDirWithStatus: vi.fn(async () => 'updated' as const),
      copyFileWithStatus: vi.fn(async () => 'updated' as const),
      fileExists: vi.fn(async () => true),
      chmod: vi.fn(async () => {}),
      applyOatCoreGitignore,
      applyOatCoreGitattributes,
    };

    const command = createToolsUpdateCommand(dependencies, {
      runSync: vi.fn(async () => {}),
    });

    await runCommand(
      command,
      ['--pack', 'workflows', '--no-sync'],
      ['--scope', 'project', '--cwd', '/tmp/workspace'],
    );

    expect(applyOatCoreGitignore).toHaveBeenCalledWith('/tmp/workspace');
    expect(applyOatCoreGitattributes).toHaveBeenCalledWith('/tmp/workspace');
    expect(loggerCapture.info).toContain(
      'Updated .gitignore OAT core section (1 entries).',
    );
    expect(loggerCapture.info).toContain(
      'Untracked generated dashboard from git index: .oat/state.md.',
    );
    expect(loggerCapture.info).toContain(
      'Updated .gitattributes OAT core section (1 entries).',
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('repairs managed Git files for a current project workflows reconcile plan with no content operations', async () => {
    const applyOatCoreGitignore = vi.fn(async () => ({
      action: 'updated' as const,
      entries: ['.oat/projects/synced/*/'],
      stateDashboardIndexAction: 'not-tracked' as const,
    }));
    const applyOatCoreGitattributes = vi.fn(async () => ({
      action: 'updated' as const,
      entries: ['.oat/projects/shared/** linguist-generated=true'],
    }));
    const inventory = {
      pack: 'workflows' as const,
      scope: 'project' as const,
      intent: {
        pack: 'workflows' as const,
        scope: 'project' as const,
        enabled: true,
        source: 'declared' as const,
        configPath: '/tmp/workspace/.oat/config.json',
        diagnostics: [],
      },
      completeness: 'complete' as const,
      assets: [],
      diagnostics: [],
    };
    const dependencies: UpdateToolsDependencies = {
      scanTools: vi.fn(async () => []),
      resolveScopeRoot: vi.fn(async () => '/tmp/workspace'),
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      copyDirWithStatus: vi.fn(async () => 'no-change' as const),
      copyFileWithStatus: vi.fn(async () => 'no-change' as const),
      fileExists: vi.fn(async () => true),
      chmod: vi.fn(async () => {}),
      applyOatCoreGitignore,
      applyOatCoreGitattributes,
      inventoryScopedPack: vi.fn(async () => inventory),
      reconcilePacks: vi.fn(async (requests) =>
        requests.map((request) => ({
          request,
          before: inventory,
          plan: {
            pack: 'workflows' as const,
            scope: 'project' as const,
            action: 'update' as const,
            operations: [],
            expectedCompleteness: 'complete' as const,
            changedCanonicalPaths: [],
            retainedAssets: [],
          },
          apply: {
            applied: [],
            skipped: [],
          },
        })),
      ),
    };
    const command = createToolsUpdateCommand(dependencies, {
      runSync: vi.fn(async () => {}),
    });

    await runCommand(
      command,
      ['--pack', 'workflows', '--no-sync'],
      ['--scope', 'project', '--cwd', '/tmp/workspace'],
    );

    expect(applyOatCoreGitignore).toHaveBeenCalledWith('/tmp/workspace');
    expect(applyOatCoreGitattributes).toHaveBeenCalledWith('/tmp/workspace');
    expect(process.exitCode).toBeUndefined();
  });

  it('still checks tracking when the OAT core section is already current', async () => {
    const applyOatCoreGitignore = vi.fn(async () => ({
      action: 'no-change' as const,
      entries: ['.oat/state.md'],
      stateDashboardIndexAction: 'not-tracked' as const,
    }));
    const dependencies: UpdateToolsDependencies = {
      scanTools: vi.fn(async (options) =>
        options.scope === 'project'
          ? [
              createTool({
                name: 'oat-project-new',
                pack: 'workflows',
              }),
            ]
          : [],
      ),
      resolveScopeRoot: vi.fn(async (scope, cwd, home) =>
        scope === 'project' ? cwd : home,
      ),
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      copyDirWithStatus: vi.fn(async () => 'updated' as const),
      copyFileWithStatus: vi.fn(async () => 'updated' as const),
      fileExists: vi.fn(async () => true),
      chmod: vi.fn(async () => {}),
      applyOatCoreGitignore,
    };

    const command = createToolsUpdateCommand(dependencies, {
      runSync: vi.fn(async () => {}),
    });

    await runCommand(
      command,
      ['--pack', 'workflows', '--no-sync'],
      ['--scope', 'project', '--cwd', '/tmp/workspace'],
    );

    expect(applyOatCoreGitignore).toHaveBeenCalledWith('/tmp/workspace');
    expect(loggerCapture.info).not.toContain(
      'Updated .gitignore OAT core section (1 entries).',
    );
    expect(loggerCapture.info).not.toContain(
      'Untracked generated dashboard from git index: .oat/state.md.',
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('does not backfill project gitignore for non-workflow updates', async () => {
    const applyOatCoreGitignore = vi.fn(async () => ({
      action: 'updated' as const,
      entries: ['.oat/state.md'],
      stateDashboardIndexAction: 'untracked' as const,
    }));
    const dependencies: UpdateToolsDependencies = {
      scanTools: vi.fn(async (options) =>
        options.scope === 'project'
          ? [
              createTool({
                name: 'oat-pjm-add-backlog-item',
                pack: 'project-management',
              }),
            ]
          : [],
      ),
      resolveScopeRoot: vi.fn(async (scope, cwd, home) =>
        scope === 'project' ? cwd : home,
      ),
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      copyDirWithStatus: vi.fn(async () => 'updated' as const),
      copyFileWithStatus: vi.fn(async () => 'updated' as const),
      fileExists: vi.fn(async () => true),
      chmod: vi.fn(async () => {}),
      applyOatCoreGitignore,
    };

    const command = createToolsUpdateCommand(dependencies, {
      runSync: vi.fn(async () => {}),
    });

    await runCommand(
      command,
      ['--pack', 'project-management', '--no-sync'],
      ['--scope', 'project', '--cwd', '/tmp/workspace'],
    );

    expect(applyOatCoreGitignore).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });
});
