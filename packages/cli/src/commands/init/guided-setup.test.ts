import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { DEFAULT_SYNC_CONFIG, type SyncConfig } from '@config/index';
import { createEmptyManifest } from '@manifest/index';
import type { ProviderAdapter } from '@providers/shared';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';

import { createInitCommand } from './index';

function createGuidedSetupHarness(options: {
  interactive?: boolean;
  hookInstalled?: boolean;
  oatDirExists?: boolean;
  confirmResponses?: boolean[];
  selectResponses?: Array<string[] | null>;
  providerSelectResponses?: Array<string[] | null>;
  toolPacksResult?: string[];
}): {
  capture: LoggerCapture;
  command: Command;
  runToolPacks: ReturnType<typeof vi.fn>;
  addLocalPaths: ReturnType<typeof vi.fn>;
  applyGitignore: ReturnType<typeof vi.fn>;
  runProviderSync: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const confirmResponses = [...(options.confirmResponses ?? [])];
  const selectResponses = [...(options.selectResponses ?? [])];
  const providerSelectResponses = [...(options.providerSelectResponses ?? [])];

  const toolPacksResult = [
    ...(options.toolPacksResult ?? ['ideas', 'workflows', 'utility']),
  ];
  const runToolPacks = vi.fn(async () => toolPacksResult);
  const addLocalPaths = vi.fn(
    async (_root: string, paths: string[]) =>
      ({ added: paths, all: paths }) as { added: string[]; all: string[] },
  );
  const applyGitignore = vi.fn(async () => ({ action: 'updated' }));
  const runProviderSync = vi.fn(async () => undefined);

  const adapters: ProviderAdapter[] = [
    {
      name: 'claude',
      displayName: 'Claude Code',
      defaultStrategy: 'symlink',
      projectMappings: [],
      userMappings: [],
      detect: async () => true,
    },
  ];

  const command = createInitCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as Scope,
      dryRun: false,
      verbose: false,
      json: false,
      cwd: '/tmp/workspace',
      home: '/tmp/home',
      interactive: options.interactive ?? true,
      logger: capture.logger,
    }),
    resolveScopeRoot: vi.fn(async (scope: 'project' | 'user') =>
      scope === 'project' ? '/tmp/workspace' : '/tmp/home',
    ),
    ensureCanonicalDirs: vi.fn(async () => undefined),
    loadManifest: vi.fn(async () => createEmptyManifest()),
    saveManifest: vi.fn(async () => undefined),
    scanCanonical: vi.fn(async () => []),
    collectStrays: vi.fn(async () => []),
    confirmAction: vi.fn(async () => confirmResponses.shift() ?? false),
    selectManyWithAbort: vi.fn(async () => selectResponses.shift() ?? []),
    selectProvidersWithAbort: vi.fn(
      async () => providerSelectResponses.shift() ?? [],
    ),
    adoptStray: vi.fn(async (_r, _s, manifest) => manifest),
    isHookInstalled: vi.fn(async () => options.hookInstalled ?? true),
    installHook: vi.fn(async () => undefined),
    uninstallHook: vi.fn(async () => undefined),
    getAdapters: () => adapters,
    loadSyncConfig: vi.fn(async () => DEFAULT_SYNC_CONFIG),
    saveSyncConfig: vi.fn(async (_path: string, config: SyncConfig) => config),
    getConfigAwareAdapters: vi.fn(async () => ({
      activeAdapters: adapters,
      detectedUnset: ['claude'],
      detectedDisabled: [],
    })),
    applyOatCoreGitignore: vi.fn(async () => ({
      action: 'no-change' as const,
      entries: [],
    })),
    dirExists: vi.fn(async () => options.oatDirExists ?? true),
    readOatConfig: vi.fn(async () => ({ version: 1 })),
    resolveLocalPaths: vi.fn(() => [] as string[]),
    addLocalPaths,
    applyGitignore,
    runToolPacks,
    runProviderSync,
  });

  return {
    capture,
    command,
    runToolPacks,
    addLocalPaths,
    applyGitignore,
    runProviderSync,
  };
}

async function runInit(
  command: Command,
  {
    globalArgs = [],
    commandArgs = [],
  }: { globalArgs?: string[]; commandArgs?: string[] } = {},
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'init', ...commandArgs], {
    from: 'user',
  });
}

describe('guided setup integration', () => {
  it('full happy path: fresh init → guided setup → tools → local paths → sync → summary', async () => {
    const { command, capture, runToolPacks, addLocalPaths, runProviderSync } =
      createGuidedSetupHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: false,
        providerSelectResponses: [['claude']],
        confirmResponses: [
          true, // guided setup prompt
          true, // provider sync
        ],
        selectResponses: [
          [
            '.oat/**/analysis',
            '.oat/**/pr',
            '.oat/**/reviews/archived',
            '.oat/ideas',
          ],
        ],
      });

    await runInit(command, { globalArgs: ['--scope', 'project'] });

    expect(runToolPacks).toHaveBeenCalledTimes(1);
    expect(addLocalPaths).toHaveBeenCalledWith('/tmp/workspace', [
      '.oat/**/analysis',
      '.oat/**/pr',
      '.oat/**/reviews/archived',
      '.oat/ideas',
    ]);
    expect(runProviderSync).toHaveBeenCalledTimes(1);
    expect(
      capture.info.some((msg) => msg.includes('Guided setup complete')),
    ).toBe(true);
    expect(
      capture.info.some(
        (msg) => msg.includes('Providers') && msg.includes('Claude Code'),
      ),
    ).toBe(true);
    expect(
      capture.info.some(
        (msg) => msg.includes('Tool packs') && msg.includes('installed'),
      ),
    ).toBe(true);
    expect(
      capture.info.some(
        (msg) =>
          msg.includes('Local paths') && msg.includes('4 added, 0 existing'),
      ),
    ).toBe(true);
    expect(
      capture.info.some(
        (msg) => msg.includes('Provider sync') && msg.includes('done'),
      ),
    ).toBe(true);
  });

  it('--setup on existing repo: skips fresh-init prompt, enters guided directly', async () => {
    const { command, capture, runToolPacks } = createGuidedSetupHarness({
      interactive: true,
      hookInstalled: true,
      oatDirExists: true,
      providerSelectResponses: [['claude']],
      confirmResponses: [
        false, // provider sync (no guided setup prompt because --setup)
      ],
      selectResponses: [['.oat/**/analysis']],
    });

    await runInit(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--setup'],
    });

    expect(runToolPacks).toHaveBeenCalledTimes(1);
    expect(
      capture.info.some((msg) => msg.includes('Guided setup complete')),
    ).toBe(true);
  });

  it('partial flow: user skips tools but configures local paths', async () => {
    const { command, runToolPacks, addLocalPaths, runProviderSync, capture } =
      createGuidedSetupHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        providerSelectResponses: [['claude']],
        toolPacksResult: [], // no packs selected
        confirmResponses: [
          false, // provider sync — skip
        ],
        selectResponses: [['.oat/**/reviews/archived']],
      });

    await runInit(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--setup'],
    });

    expect(runToolPacks).toHaveBeenCalledTimes(1);
    expect(addLocalPaths).toHaveBeenCalledWith('/tmp/workspace', [
      '.oat/**/reviews/archived',
    ]);
    expect(runProviderSync).not.toHaveBeenCalled();
    expect(
      capture.info.some(
        (msg) => msg.includes('Providers') && msg.includes('Claude Code'),
      ),
    ).toBe(true);
    expect(
      capture.info.some(
        (msg) => msg.includes('Tool packs') && msg.includes('skipped'),
      ),
    ).toBe(true);
    expect(
      capture.info.some(
        (msg) =>
          msg.includes('Local paths') && msg.includes('1 added, 0 existing'),
      ),
    ).toBe(true);
    expect(
      capture.info.some(
        (msg) => msg.includes('Provider sync') && msg.includes('skipped'),
      ),
    ).toBe(true);
  });

  it('non-interactive: guided setup is never triggered', async () => {
    const { command, runToolPacks, capture } = createGuidedSetupHarness({
      interactive: false,
      hookInstalled: true,
      oatDirExists: false,
    });

    await runInit(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--setup'],
    });

    expect(runToolPacks).not.toHaveBeenCalled();
    expect(capture.info.every((msg) => !msg.includes('Guided setup'))).toBe(
      true,
    );
  });
});
