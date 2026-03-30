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

import type { DetectedDocs, DetectDocsDependencies } from './detect-docs';
import { createInitCommand } from './index';

function createGuidedSetupHarness(options: {
  interactive?: boolean;
  hookInstalled?: boolean;
  oatDirExists?: boolean;
  confirmResponses?: boolean[];
  selectResponses?: Array<string[] | null>;
  selectWithAbortResponses?: Array<string | null>;
  inputWithDefaultResponses?: Array<string | null>;
  providerSelectResponses?: Array<string[] | null>;
  toolPacksResult?: string[];
  detectedDocs?: DetectedDocs | null;
  existingDocsConfig?: { tooling?: string; root?: string; config?: string };
}): {
  capture: LoggerCapture;
  command: Command;
  runToolPacks: ReturnType<typeof vi.fn>;
  addLocalPaths: ReturnType<typeof vi.fn>;
  applyGitignore: ReturnType<typeof vi.fn>;
  runProviderSync: ReturnType<typeof vi.fn>;
  writeOatConfig: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const confirmResponses = [...(options.confirmResponses ?? [])];
  const selectResponses = [...(options.selectResponses ?? [])];
  const selectWithAbortResponses = [
    ...(options.selectWithAbortResponses ?? []),
  ];
  const inputWithDefaultResponses = [
    ...(options.inputWithDefaultResponses ?? []),
  ];
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
  const writeOatConfig = vi.fn(async () => undefined);

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

  const existingDocsConfig = options.existingDocsConfig;

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
    readOatConfig: vi.fn(async () => ({
      version: 1,
      ...(existingDocsConfig
        ? { documentation: existingDocsConfig }
        : undefined),
    })),
    resolveLocalPaths: vi.fn(() => [] as string[]),
    addLocalPaths,
    applyGitignore,
    writeOatConfig,
    detectDefaultBranch: vi.fn(() => 'main'),
    detectExistingDocs: vi.fn(
      async (
        _root: string,
        _deps: DetectDocsDependencies,
      ): Promise<DetectedDocs | null> => options.detectedDocs ?? null,
    ),
    fileExists: vi.fn(async () => false),
    inputWithDefault: vi.fn(
      async () => inputWithDefaultResponses.shift() ?? null,
    ),
    selectWithAbort: vi.fn(
      async () => selectWithAbortResponses.shift() ?? null,
    ),
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
    writeOatConfig,
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
  it('full happy path: fresh init → guided setup → tools → local paths → docs (no detect, decline) → sync → summary', async () => {
    const { command, capture, runToolPacks, addLocalPaths, runProviderSync } =
      createGuidedSetupHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: false,
        providerSelectResponses: [['claude']],
        confirmResponses: [
          true, // guided setup prompt
          false, // "Do you have documentation?" — no
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
    expect(
      capture.info.some(
        (msg) => msg.includes('Documentation') && msg.includes('skipped'),
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
        false, // "Do you have documentation?" — no
        false, // provider sync
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
          false, // "Do you have documentation?" — no
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

  it('docs: auto-detected tooling is stored when user confirms', async () => {
    const { command, capture, writeOatConfig } = createGuidedSetupHarness({
      interactive: true,
      hookInstalled: true,
      oatDirExists: true,
      providerSelectResponses: [['claude']],
      detectedDocs: { tooling: 'mkdocs', root: '.', config: 'mkdocs.yml' },
      confirmResponses: [
        true, // confirm detected docs
        false, // provider sync — skip
      ],
      selectResponses: [[]],
    });

    await runInit(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--setup'],
    });

    expect(writeOatConfig).toHaveBeenCalledWith(
      '/tmp/workspace',
      expect.objectContaining({
        documentation: expect.objectContaining({
          tooling: 'mkdocs',
          root: '.',
          config: 'mkdocs.yml',
        }),
      }),
    );
    expect(
      capture.info.some(
        (msg) => msg.includes('Documentation') && msg.includes('mkdocs at .'),
      ),
    ).toBe(true);
  });

  it('docs: auto-detected tooling is skipped when user declines', async () => {
    const { command, capture, writeOatConfig } = createGuidedSetupHarness({
      interactive: true,
      hookInstalled: true,
      oatDirExists: true,
      providerSelectResponses: [['claude']],
      detectedDocs: { tooling: 'mkdocs', root: '.', config: 'mkdocs.yml' },
      confirmResponses: [
        false, // decline detected docs
        false, // provider sync — skip
      ],
      selectResponses: [[]],
    });

    await runInit(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--setup'],
    });

    expect(writeOatConfig).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ documentation: expect.anything() }),
    );
    expect(
      capture.info.some(
        (msg) => msg.includes('Documentation') && msg.includes('skipped'),
      ),
    ).toBe(true);
  });

  it('docs: declining detected tooling can fall back to manual entry', async () => {
    const { command, writeOatConfig } = createGuidedSetupHarness({
      interactive: true,
      hookInstalled: true,
      oatDirExists: true,
      providerSelectResponses: [['claude']],
      detectedDocs: { tooling: 'mkdocs', root: '.', config: 'mkdocs.yml' },
      confirmResponses: [
        false, // decline detected docs
        true, // enter docs config manually
        false, // provider sync — skip
      ],
      selectResponses: [[]],
      selectWithAbortResponses: ['docusaurus'],
      inputWithDefaultResponses: ['website'],
    });

    await runInit(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--setup'],
    });

    expect(writeOatConfig).toHaveBeenCalledWith(
      '/tmp/workspace',
      expect.objectContaining({
        documentation: expect.objectContaining({
          tooling: 'docusaurus',
          root: 'website',
        }),
      }),
    );
  });

  it('docs: manual entry when nothing detected and user says they have docs', async () => {
    const { command, capture, writeOatConfig } = createGuidedSetupHarness({
      interactive: true,
      hookInstalled: true,
      oatDirExists: true,
      providerSelectResponses: [['claude']],
      detectedDocs: null,
      confirmResponses: [
        true, // "Do you have documentation?" — yes
        false, // provider sync — skip
      ],
      selectResponses: [[]],
      selectWithAbortResponses: ['docusaurus'],
      inputWithDefaultResponses: ['website'],
    });

    await runInit(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--setup'],
    });

    expect(writeOatConfig).toHaveBeenCalledWith(
      '/tmp/workspace',
      expect.objectContaining({
        documentation: expect.objectContaining({
          tooling: 'docusaurus',
          root: 'website',
        }),
      }),
    );
    expect(
      capture.info.some(
        (msg) =>
          msg.includes('Documentation') &&
          msg.includes('docusaurus at website'),
      ),
    ).toBe(true);
  });

  it('docs: manual entry normalizes absolute paths inside the repo', async () => {
    const { command, writeOatConfig } = createGuidedSetupHarness({
      interactive: true,
      hookInstalled: true,
      oatDirExists: true,
      providerSelectResponses: [['claude']],
      detectedDocs: null,
      confirmResponses: [
        true, // "Do you have documentation?" — yes
        false, // provider sync — skip
      ],
      selectResponses: [[]],
      selectWithAbortResponses: ['docusaurus'],
      inputWithDefaultResponses: ['/tmp/workspace/website'],
    });

    await runInit(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--setup'],
    });

    expect(writeOatConfig).toHaveBeenCalledWith(
      '/tmp/workspace',
      expect.objectContaining({
        documentation: expect.objectContaining({
          tooling: 'docusaurus',
          root: 'website',
        }),
      }),
    );
  });

  it('docs: manual entry rejects paths outside the repo and re-prompts', async () => {
    const { command, capture, writeOatConfig } = createGuidedSetupHarness({
      interactive: true,
      hookInstalled: true,
      oatDirExists: true,
      providerSelectResponses: [['claude']],
      detectedDocs: null,
      confirmResponses: [
        true, // "Do you have documentation?" — yes
        false, // provider sync — skip
      ],
      selectResponses: [[]],
      selectWithAbortResponses: ['docusaurus'],
      inputWithDefaultResponses: ['../outside', 'website'],
    });

    await runInit(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--setup'],
    });

    expect(
      capture.info.some((msg) =>
        msg.includes(
          'Docs root must be repo-relative or inside the repository.',
        ),
      ),
    ).toBe(true);
    expect(writeOatConfig).toHaveBeenCalledWith(
      '/tmp/workspace',
      expect.objectContaining({
        documentation: expect.objectContaining({
          tooling: 'docusaurus',
          root: 'website',
        }),
      }),
    );
  });

  it('docs: skips detection when documentation already configured', async () => {
    const { command, capture, writeOatConfig } = createGuidedSetupHarness({
      interactive: true,
      hookInstalled: true,
      oatDirExists: true,
      providerSelectResponses: [['claude']],
      existingDocsConfig: { tooling: 'fumadocs', root: 'apps/docs' },
      confirmResponses: [
        false, // provider sync — skip
      ],
      selectResponses: [[]],
    });

    await runInit(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--setup'],
    });

    // writeOatConfig is called once for git.defaultBranch, but not for docs
    expect(writeOatConfig).toHaveBeenCalledTimes(1);
    expect(writeOatConfig).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ git: { defaultBranch: 'main' } }),
    );
    expect(
      capture.info.some(
        (msg) =>
          msg.includes('Documentation') &&
          msg.includes('fumadocs (already configured)'),
      ),
    ).toBe(true);
  });
});
