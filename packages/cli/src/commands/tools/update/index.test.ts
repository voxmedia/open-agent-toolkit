import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buildCommandContext,
  loggerCapture,
  reconcileProjectToolsConfig,
  updateTools,
} = vi.hoisted(() => {
  const capture = {
    error: [] as string[],
    info: [] as string[],
    jsonPayloads: [] as unknown[],
  };

  return {
    buildCommandContext: vi.fn((options?: { json?: boolean }) => ({
      scope: 'all' as const,
      dryRun: false,
      verbose: false,
      json: options?.json ?? false,
      cwd: '/tmp/project',
      home: '/tmp/home',
      interactive: false,
      logger: {
        debug: vi.fn(),
        info(message: string) {
          capture.info.push(message);
        },
        warn: vi.fn(),
        error(message: string) {
          capture.error.push(message);
        },
        success: vi.fn(),
        json(payload: unknown) {
          capture.jsonPayloads.push(payload);
        },
      },
    })),
    loggerCapture: capture,
    reconcileProjectToolsConfig: vi.fn(async () => ({
      action: 'unchanged' as const,
      adoptedPacks: [],
    })),
    updateTools: vi.fn(),
  };
});

vi.mock('@app/command-context', () => ({
  buildCommandContext,
}));

vi.mock('@commands/tools/shared/project-tools-config', () => ({
  reconcileProjectToolsConfig,
}));

vi.mock('@fs/paths', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@fs/paths')>()),
  resolveProjectRoot: vi.fn(async () => '/tmp/project'),
}));

vi.mock('./update-tools', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./update-tools')>()),
  updateTools,
}));

import {
  buildSyncSubprocessArgs,
  createToolsUpdateCommand,
  formatUpdatedToolMessage,
  shouldBackfillWorkflowGitignore,
  shouldRefreshCoreDocs,
} from './index';
import type {
  UpdateResult,
  UpdateTarget,
  UpdateToolsDependencies,
} from './update-tools';

function createUpdateDependencies(): UpdateToolsDependencies {
  return {
    scanTools: vi.fn(async () => []),
    resolveScopeRoot: vi.fn(async (_scope, cwd) => cwd),
    resolveAssetsRoot: vi.fn(async () => '/assets'),
    copyDirWithStatus: vi.fn(async () => 'updated'),
    copyFileWithStatus: vi.fn(async () => 'updated'),
    fileExists: vi.fn(async () => true),
  };
}

async function runUpdateCommand(
  command: Command,
  args: string[] = [],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();
  const tools = new Command('tools');
  tools.addCommand(command);
  program.addCommand(tools);

  await program.parseAsync([...globalArgs, 'tools', 'update', ...args], {
    from: 'user',
  });
}

describe('createToolsUpdateCommand target validation', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    loggerCapture.error.length = 0;
    loggerCapture.info.length = 0;
    loggerCapture.jsonPayloads.length = 0;
    reconcileProjectToolsConfig.mockResolvedValue({
      action: 'unchanged',
      adoptedPacks: [],
    });
    updateTools.mockReset();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('suggests the exact all-tools command when no target is specified', async () => {
    const dependencies = createUpdateDependencies();

    await runUpdateCommand(createToolsUpdateCommand(dependencies));

    expect(process.exitCode).toBe(1);
    expect(loggerCapture.error).toEqual([
      'Specify a tool name, --pack <pack>, or --all. To update all tools, run: oat tools update --all',
    ]);
    expect(dependencies.scanTools).not.toHaveBeenCalled();
    expect(dependencies.resolveAssetsRoot).not.toHaveBeenCalled();
  });

  it('reports an invalid pack without suggesting an all-tools update', async () => {
    const dependencies = createUpdateDependencies();

    await runUpdateCommand(createToolsUpdateCommand(dependencies), [
      '--pack',
      'invalid',
    ]);

    expect(process.exitCode).toBe(1);
    expect(loggerCapture.error).toEqual([
      "Invalid pack 'invalid'. Expected one of: core, ideas, docs, workflows, utility, project-management, research, brainstorm.",
    ]);
    expect(dependencies.scanTools).not.toHaveBeenCalled();
    expect(dependencies.resolveAssetsRoot).not.toHaveBeenCalled();
  });

  it('reports mutually exclusive targets without suggesting an all-tools update', async () => {
    const dependencies = createUpdateDependencies();

    await runUpdateCommand(createToolsUpdateCommand(dependencies), [
      'oat-docs',
      '--all',
    ]);

    expect(process.exitCode).toBe(1);
    expect(loggerCapture.error).toEqual([
      'Specify exactly one update target: a tool name, --pack <pack>, or --all.',
    ]);
    expect(dependencies.scanTools).not.toHaveBeenCalled();
    expect(dependencies.resolveAssetsRoot).not.toHaveBeenCalled();
  });

  it('adds ordered project adoption to the existing JSON update document', async () => {
    const dependencies = createUpdateDependencies();
    updateTools.mockResolvedValue(
      createResult({
        current: [
          {
            name: 'oat-docs-analyze',
            type: 'skill',
            scope: 'project',
            version: '1.0.0',
            bundledVersion: '1.0.0',
            pack: 'docs',
            status: 'current',
          },
        ],
        plans: [],
      }),
    );
    reconcileProjectToolsConfig.mockResolvedValue({
      action: 'written',
      adoptedPacks: ['docs', 'research'],
    });

    await runUpdateCommand(
      createToolsUpdateCommand(dependencies),
      ['--all', '--no-sync'],
      ['--json'],
    );

    expect(loggerCapture.jsonPayloads).toHaveLength(1);
    expect(loggerCapture.jsonPayloads[0]).toEqual(
      expect.objectContaining({ adoptedPacks: ['docs', 'research'] }),
    );
  });

  it('reports each adopted project pack once in human update output', async () => {
    const dependencies = createUpdateDependencies();
    updateTools.mockResolvedValue(
      createResult({
        current: [
          {
            name: 'oat-docs-analyze',
            type: 'skill',
            scope: 'project',
            version: '1.0.0',
            bundledVersion: '1.0.0',
            pack: 'docs',
            status: 'current',
          },
        ],
        plans: [],
      }),
    );
    reconcileProjectToolsConfig.mockResolvedValue({
      action: 'written',
      adoptedPacks: ['docs'],
    });

    await runUpdateCommand(createToolsUpdateCommand(dependencies), [
      '--all',
      '--no-sync',
    ]);

    expect(loggerCapture.info).toContain('Adopted project tool pack: docs');
    expect(
      loggerCapture.info.filter(
        (line) => line === 'Adopted project tool pack: docs',
      ),
    ).toHaveLength(1);
  });
});

function createResult(overrides: Partial<UpdateResult> = {}): UpdateResult {
  return {
    updated: [],
    current: [],
    newer: [],
    notInstalled: [],
    notBundled: [],
    assetRefreshes: [],
    plans: [],
    ...overrides,
  };
}

describe('shouldRefreshCoreDocs', () => {
  it('refreshes for an explicit core-pack update', () => {
    const target: UpdateTarget = { kind: 'pack', pack: 'core' };

    expect(shouldRefreshCoreDocs(target, createResult())).toBe(true);
  });

  it('refreshes for --all when the core pack is present in the update result', () => {
    const target: UpdateTarget = { kind: 'all' };
    const result = createResult({
      current: [
        {
          name: 'oat-docs',
          type: 'skill',
          scope: 'user',
          version: '1.0.0',
          bundledVersion: '1.0.0',
          pack: 'core',
          status: 'current',
        },
      ],
    });

    expect(shouldRefreshCoreDocs(target, result)).toBe(true);
  });

  it('does not refresh for --all when the core pack is absent', () => {
    const target: UpdateTarget = { kind: 'all' };
    const result = createResult({
      updated: [
        {
          name: 'oat-idea-new',
          type: 'skill',
          scope: 'project',
          version: '1.0.0',
          bundledVersion: '2.0.0',
          pack: 'ideas',
          status: 'outdated',
        },
      ],
    });

    expect(shouldRefreshCoreDocs(target, result)).toBe(false);
  });
});

describe('shouldBackfillWorkflowGitignore', () => {
  it('backfills when project-scoped workflow tools are installed', () => {
    expect(
      shouldBackfillWorkflowGitignore(
        createResult({
          current: [
            {
              name: 'oat-project-new',
              type: 'skill',
              scope: 'project',
              version: '1.0.0',
              bundledVersion: '1.0.0',
              pack: 'workflows',
              status: 'current',
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('does not backfill for non-workflow packs', () => {
    expect(
      shouldBackfillWorkflowGitignore(
        createResult({
          updated: [
            {
              name: 'oat-docs',
              type: 'skill',
              scope: 'user',
              version: '1.0.0',
              bundledVersion: '2.0.0',
              pack: 'core',
              status: 'outdated',
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it('does not backfill for user-scoped workflow-pack skills', () => {
    expect(
      shouldBackfillWorkflowGitignore(
        createResult({
          newer: [
            {
              name: 'oat-project-progress',
              type: 'skill',
              scope: 'user',
              version: '2.0.0',
              bundledVersion: '1.0.0',
              pack: 'workflows',
              status: 'newer',
            },
          ],
        }),
      ),
    ).toBe(false);
  });
});

describe('formatUpdatedToolMessage', () => {
  it('reports synthesized pack members as installs', () => {
    expect(
      formatUpdatedToolMessage(
        {
          name: 'oat-idea-ideate',
          type: 'skill',
          scope: 'project',
          version: null,
          bundledVersion: null,
          pack: 'ideas',
          status: 'outdated',
        },
        false,
      ),
    ).toBe('Installed: oat-idea-ideate');
  });

  it('reports ordinary bundled updates with versions', () => {
    expect(
      formatUpdatedToolMessage(
        {
          name: 'oat-idea-new',
          type: 'skill',
          scope: 'project',
          version: '1.0.0',
          bundledVersion: '2.0.0',
          pack: 'ideas',
          status: 'outdated',
        },
        false,
      ),
    ).toBe('Updated: oat-idea-new (1.0.0 -> 2.0.0)');
  });
});

describe('buildSyncSubprocessArgs', () => {
  it('passes the target project through --cwd and places --scope after the sync subcommand', () => {
    // `--scope` is a per-command option on `sync`, so it must follow the
    // subcommand token; `--cwd` stays a global flag before it.
    expect(
      buildSyncSubprocessArgs(
        '/repo/packages/cli/src/index.ts',
        ['--import', 'tsx/loader'],
        {
          cwd: '/tmp/project',
          scope: 'project',
        },
      ),
    ).toEqual([
      '--import',
      'tsx/loader',
      '/repo/packages/cli/src/index.ts',
      '--cwd',
      '/tmp/project',
      'sync',
      '--scope',
      'project',
    ]);
  });
});
