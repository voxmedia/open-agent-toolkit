import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { PROVIDER_CONFIG_REMEDIATION } from '@commands/shared/messages';
import { DEFAULT_SYNC_CONFIG, type SyncConfig } from '@config/index';
import type { CanonicalEntry } from '@engine/index';
import { createEmptyManifest, type Manifest } from '@manifest/index';
import type { ProviderAdapter } from '@providers/shared';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitCommand, type InitStrayCandidate } from './index';

interface HarnessOptions {
  interactive?: boolean;
  scopeRootByScope?: Partial<Record<'project' | 'user', string>>;
  strays?: InitStrayCandidate[];
  confirmResponses?: boolean[];
  selectResponses?: Array<string[] | null>;
  providerSelectResponses?: Array<string[] | null>;
  hookInstalled?: boolean;
  useDefaultAdopt?: boolean;
  adapters?: ProviderAdapter[];
  loadedSyncConfig?: SyncConfig;
}

interface RunInitArgs {
  globalArgs?: string[];
  commandArgs?: string[];
}

const ADOPT_REMEDIATION =
  'Run "oat init" interactively to adopt stray entries.';
const HOOK_GUIDANCE =
  'Run "oat init --hook" to install optional pre-commit hook.';

function createStray(
  providerPath = '.claude/skills/stray-skill',
  provider = 'claude',
  providerDir = '.claude/skills',
): InitStrayCandidate {
  return {
    provider,
    report: {
      canonical: null,
      provider,
      providerPath,
      state: { status: 'stray' },
    },
    mapping: {
      contentType: 'skill',
      canonicalDir: '.agents/skills',
      providerDir,
      nativeRead: false,
    },
  };
}

function createCanonicalEntries(): CanonicalEntry[] {
  return [];
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  resolveScopeRoot: ReturnType<typeof vi.fn>;
  ensureCanonicalDirs: ReturnType<typeof vi.fn>;
  saveManifest: ReturnType<typeof vi.fn>;
  collectStrays: ReturnType<typeof vi.fn>;
  confirmAction: ReturnType<typeof vi.fn>;
  selectManyWithAbort: ReturnType<typeof vi.fn>;
  selectProvidersWithAbort: ReturnType<typeof vi.fn>;
  loadSyncConfig: ReturnType<typeof vi.fn>;
  saveSyncConfig: ReturnType<typeof vi.fn>;
  adoptStray: ReturnType<typeof vi.fn>;
  installHook: ReturnType<typeof vi.fn>;
  uninstallHook: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const scopeRoots = {
    project: '/tmp/workspace',
    user: '/tmp/home',
    ...(options.scopeRootByScope ?? {}),
  };
  const confirmResponses = [...(options.confirmResponses ?? [])];
  const selectResponses = [...(options.selectResponses ?? [])];
  const providerSelectResponses = [...(options.providerSelectResponses ?? [])];
  const confirmAction = vi.fn(async () => confirmResponses.shift() ?? false);
  const selectManyWithAbort = vi.fn(async () => selectResponses.shift() ?? []);
  const selectProvidersWithAbort = vi.fn(
    async () => providerSelectResponses.shift() ?? [],
  );
  const resolveScopeRoot = vi.fn(
    async (scope: 'project' | 'user') => scopeRoots[scope],
  );
  const ensureCanonicalDirs = vi.fn(async () => undefined);
  const saveManifest = vi.fn(async () => undefined);
  const collectStrays = vi.fn(async () => options.strays ?? []);
  const adoptStray = vi.fn(
    async (_scopeRoot: string, _stray, manifest: Manifest) => {
      return manifest;
    },
  );
  const installHook = vi.fn(async () => undefined);
  const uninstallHook = vi.fn(async () => undefined);
  const saveSyncConfig = vi.fn(async (_path: string, config: SyncConfig) => {
    return config;
  });
  const loadSyncConfig = vi.fn(
    async () => options.loadedSyncConfig ?? DEFAULT_SYNC_CONFIG,
  );
  const adapters =
    options.adapters ??
    ([
      {
        name: 'claude',
        displayName: 'Claude Code',
        defaultStrategy: 'symlink',
        projectMappings: [],
        userMappings: [],
        detect: async () => true,
      },
      {
        name: 'cursor',
        displayName: 'Cursor',
        defaultStrategy: 'symlink',
        projectMappings: [],
        userMappings: [],
        detect: async () => false,
      },
      {
        name: 'codex',
        displayName: 'Codex CLI',
        defaultStrategy: 'auto',
        projectMappings: [],
        userMappings: [],
        detect: async () => false,
      },
    ] satisfies ProviderAdapter[]);
  const dependencyOverrides = {
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as Scope,
      apply: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: '/tmp/home',
      interactive: options.interactive ?? true,
      logger: capture.logger,
    }),
    resolveScopeRoot,
    ensureCanonicalDirs,
    loadManifest: vi.fn(async () => createEmptyManifest()),
    saveManifest,
    scanCanonical: vi.fn(async () => createCanonicalEntries()),
    collectStrays,
    confirmAction,
    selectManyWithAbort,
    selectProvidersWithAbort,
    getAdapters: () => adapters,
    loadSyncConfig,
    saveSyncConfig,
    getConfigAwareAdapters: vi.fn(async () => ({
      activeAdapters: adapters.filter((adapter) => adapter.name === 'claude'),
      detectedUnset: ['claude'],
      detectedDisabled: [],
    })),
    isHookInstalled: vi.fn(async () => options.hookInstalled ?? true),
    installHook,
    uninstallHook,
  };

  if (!options.useDefaultAdopt) {
    dependencyOverrides.adoptStray = adoptStray;
  }

  const command = createInitCommand(dependencyOverrides);

  return {
    capture,
    command,
    resolveScopeRoot,
    ensureCanonicalDirs,
    saveManifest,
    collectStrays,
    confirmAction,
    selectManyWithAbort,
    selectProvidersWithAbort,
    loadSyncConfig,
    saveSyncConfig,
    adoptStray,
    installHook,
    uninstallHook,
  };
}

async function runInitCommand(
  command: Command,
  { globalArgs = [], commandArgs = [] }: RunInitArgs = {},
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

describe('createInitCommand', () => {
  let originalExitCode: number | undefined;
  const tempDirs: string[] = [];

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('creates canonical directories and manifest', async () => {
    const { command, ensureCanonicalDirs, saveManifest } = createHarness({
      interactive: false,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(ensureCanonicalDirs).toHaveBeenCalledWith(
      '/tmp/workspace',
      'project',
    );
    expect(saveManifest).toHaveBeenCalledWith(
      '/tmp/workspace/.oat/sync/manifest.json',
      expect.any(Object),
    );
  });

  it('bare oat init still works (regression)', async () => {
    const { command, ensureCanonicalDirs } = createHarness({
      interactive: false,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(ensureCanonicalDirs).toHaveBeenCalledWith(
      '/tmp/workspace',
      'project',
    );
    expect(process.exitCode).toBe(0);
  });

  it('oat init tools is a registered subcommand', () => {
    const { command } = createHarness({ interactive: false });
    expect(command.commands.map((subcommand) => subcommand.name())).toContain(
      'tools',
    );
  });

  it('prompts for supported project providers in interactive mode', async () => {
    const { command, selectProvidersWithAbort } = createHarness({
      interactive: true,
      hookInstalled: true,
      providerSelectResponses: [['claude', 'cursor']],
      loadedSyncConfig: {
        ...DEFAULT_SYNC_CONFIG,
        providers: {
          cursor: { enabled: true },
        },
      },
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectProvidersWithAbort).toHaveBeenCalledTimes(1);
    expect(selectProvidersWithAbort.mock.calls[0]?.[0]).toContain(
      'Select supported project providers',
    );
    const choices = selectProvidersWithAbort.mock.calls[0]?.[1] as Array<{
      value: string;
      checked?: boolean;
    }>;
    expect(choices.find((choice) => choice.value === 'claude')?.checked).toBe(
      true,
    );
    expect(choices.find((choice) => choice.value === 'cursor')?.checked).toBe(
      true,
    );
    expect(choices.find((choice) => choice.value === 'codex')?.checked).toBe(
      false,
    );
  });

  it('persists explicit enabled flags for all known providers after prompt', async () => {
    const { command, saveSyncConfig } = createHarness({
      interactive: true,
      hookInstalled: true,
      providerSelectResponses: [['cursor']],
      loadedSyncConfig: {
        ...DEFAULT_SYNC_CONFIG,
        providers: {
          claude: { strategy: 'copy', enabled: true },
        },
      },
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(saveSyncConfig).toHaveBeenCalledWith(
      '/tmp/workspace/.oat/sync/config.json',
      expect.objectContaining({
        providers: expect.objectContaining({
          claude: { strategy: 'copy', enabled: false },
          cursor: { enabled: true },
          codex: { enabled: false },
        }),
      }),
    );
  });

  it('non-interactive mode does not mutate provider config and shows guidance', async () => {
    const { command, capture, selectProvidersWithAbort, saveSyncConfig } =
      createHarness({
        interactive: false,
        hookInstalled: true,
      });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectProvidersWithAbort).not.toHaveBeenCalled();
    expect(saveSyncConfig).not.toHaveBeenCalled();
    expect(capture.info).toContain(PROVIDER_CONFIG_REMEDIATION);
  });

  it('scope all applies provider config prompt only for project scope', async () => {
    const {
      command,
      selectProvidersWithAbort,
      saveSyncConfig,
      ensureCanonicalDirs,
    } = createHarness({
      interactive: true,
      hookInstalled: true,
      providerSelectResponses: [['claude']],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'all'] });

    expect(selectProvidersWithAbort).toHaveBeenCalledTimes(1);
    expect(saveSyncConfig).toHaveBeenCalledTimes(1);
    expect(saveSyncConfig.mock.calls[0]?.[0]).toBe(
      '/tmp/workspace/.oat/sync/config.json',
    );
    expect(ensureCanonicalDirs).toHaveBeenCalledWith(
      '/tmp/workspace',
      'project',
    );
    expect(ensureCanonicalDirs).toHaveBeenCalledWith('/tmp/home', 'user');
  });

  it('uses config-aware active adapters for project stray scanning', async () => {
    const { command, collectStrays } = createHarness({
      interactive: false,
      hookInstalled: true,
      adapters: [
        {
          name: 'claude',
          displayName: 'Claude Code',
          defaultStrategy: 'symlink',
          projectMappings: [],
          userMappings: [],
          detect: async () => true,
        },
        {
          name: 'cursor',
          displayName: 'Cursor',
          defaultStrategy: 'symlink',
          projectMappings: [],
          userMappings: [],
          detect: async () => true,
        },
      ],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(collectStrays).toHaveBeenCalledTimes(1);
    const activeAdapters = collectStrays.mock
      .calls[0]?.[4] as ProviderAdapter[];
    expect(activeAdapters.map((adapter) => adapter.name)).toEqual(['claude']);
  });

  it('detects strays and prompts for adoption in interactive mode', async () => {
    const { command, selectManyWithAbort, confirmAction } = createHarness({
      interactive: true,
      strays: [createStray()],
      hookInstalled: true,
      selectResponses: [[]],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(confirmAction).not.toHaveBeenCalled();
    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(selectManyWithAbort.mock.calls[0]?.[0]).toContain(
      'Select stray entries to adopt',
    );
  });

  it('supports skip-all by leaving checklist empty', async () => {
    const { command, selectManyWithAbort, adoptStray } = createHarness({
      interactive: true,
      strays: [
        createStray('.claude/skills/one'),
        createStray('.claude/skills/two'),
        createStray('.claude/skills/three'),
      ],
      hookInstalled: true,
      selectResponses: [[]],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(adoptStray).not.toHaveBeenCalled();
  });

  it('skips adoption in non-interactive mode with guidance text', async () => {
    const { command, capture, selectManyWithAbort } = createHarness({
      interactive: false,
      strays: [createStray()],
      hookInstalled: true,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(capture.warn).toContain(ADOPT_REMEDIATION);
  });

  it('outputs json summary when --json is set', async () => {
    const { command, capture } = createHarness({
      interactive: false,
      strays: [createStray()],
      hookInstalled: true,
    });

    await runInitCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
    });

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.jsonPayloads[0]).toMatchObject({
      scope: 'project',
      directoriesCreated: 1,
      straysFound: 1,
      straysAdopted: 0,
      hookInstalled: true,
      scopes: [
        {
          scope: 'project',
          straysFound: 1,
          straysAdopted: 0,
        },
      ],
    });
  });

  it('adoption moves provider content into .agents and links provider path back', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-command-'));
    tempDirs.push(root);

    const providerPath = join(root, '.claude', 'skills', 'stray-skill');
    await mkdir(providerPath, { recursive: true });
    await writeFile(join(providerPath, 'SKILL.md'), 'stray content', 'utf8');

    const { command } = createHarness({
      interactive: true,
      useDefaultAdopt: true,
      scopeRootByScope: { project: root },
      strays: [createStray('.claude/skills/stray-skill')],
      hookInstalled: true,
      selectResponses: [['0']],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    const canonicalPath = join(root, '.agents', 'skills', 'stray-skill');
    const providerStat = await lstat(providerPath);
    const canonicalStat = await lstat(canonicalPath);

    expect(providerStat.isSymbolicLink()).toBe(true);
    expect(canonicalStat.isDirectory()).toBe(true);
  });

  it('adopts same-name strays from multiple providers without ENOTEMPTY collisions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-command-'));
    tempDirs.push(root);

    const skillName = 'work-chronicler-detect-projects';
    const claudeProviderPath = join(root, '.claude', 'skills', skillName);
    const cursorProviderPath = join(root, '.cursor', 'skills', skillName);
    await mkdir(claudeProviderPath, { recursive: true });
    await mkdir(cursorProviderPath, { recursive: true });
    await writeFile(
      join(claudeProviderPath, 'SKILL.md'),
      'shared stray content',
      'utf8',
    );
    await writeFile(
      join(cursorProviderPath, 'SKILL.md'),
      'shared stray content',
      'utf8',
    );

    const { command } = createHarness({
      interactive: true,
      useDefaultAdopt: true,
      scopeRootByScope: { project: root },
      strays: [
        createStray(`.claude/skills/${skillName}`, 'claude', '.claude/skills'),
        createStray(`.cursor/skills/${skillName}`, 'cursor', '.cursor/skills'),
      ],
      hookInstalled: true,
      selectResponses: [['0', '1']],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    const canonicalPath = join(root, '.agents', 'skills', skillName);
    const claudeStat = await lstat(claudeProviderPath);
    const cursorStat = await lstat(cursorProviderPath);
    const canonicalStat = await lstat(canonicalPath);

    expect(canonicalStat.isDirectory()).toBe(true);
    expect(claudeStat.isSymbolicLink()).toBe(true);
    expect(cursorStat.isSymbolicLink()).toBe(true);
  });

  it('is idempotent when re-run on an initialized scope', async () => {
    const { command, adoptStray } = createHarness({
      interactive: false,
      strays: [],
      hookInstalled: true,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });
    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(adoptStray).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('supports --scope flag', async () => {
    const { command, resolveScopeRoot } = createHarness({
      interactive: false,
      hookInstalled: true,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'user'] });

    expect(resolveScopeRoot).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({ scope: 'user' }),
    );
  });

  it('shows [user] and ~/.claude path for user-scope strays', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: true,
      strays: [createStray('.claude/skills/user-stray')],
      hookInstalled: true,
      selectResponses: [[]],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'user'] });

    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      value: string;
      description?: string;
    }>;
    expect(choices[0]?.label).toContain('[user] user-stray (claude)');
    expect(choices[0]?.description).toContain('~/.claude/skills/user-stray');
  });

  it('prompts for git hook consent in interactive mode', async () => {
    const { command, confirmAction } = createHarness({
      interactive: true,
      hookInstalled: false,
      confirmResponses: [true],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(confirmAction.mock.calls[0]?.[0]).toContain(
      'Install optional pre-commit hook',
    );
  });

  it('installs hook when user consents', async () => {
    const { command, installHook } = createHarness({
      interactive: true,
      hookInstalled: false,
      confirmResponses: [true],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(installHook).toHaveBeenCalledWith('/tmp/workspace');
  });

  it('installs executable hook script with shebang when creating a new hook file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-hook-'));
    tempDirs.push(root);

    const capture = createLoggerCapture();
    const command = createInitCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'project') as Scope,
        apply: false,
        verbose: false,
        json: false,
        cwd: root,
        home: '/tmp/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveScopeRoot: vi.fn(async () => root),
      ensureCanonicalDirs: vi.fn(async () => undefined),
      loadManifest: vi.fn(async () => createEmptyManifest()),
      saveManifest: vi.fn(async () => undefined),
      scanCanonical: vi.fn(async () => []),
      collectStrays: vi.fn(async () => []),
      confirmAction: vi.fn(async () => false),
      adoptStray: vi.fn(async (_scopeRoot, _stray, manifest) => manifest),
    });

    await runInitCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--hook'],
    });

    const hookPath = join(root, '.git', 'hooks', 'pre-commit');
    const hookContents = await readFile(hookPath, 'utf8');
    const hookStat = await lstat(hookPath);

    expect(hookContents.startsWith('#!/bin/sh\n')).toBe(true);
    expect(hookContents).toContain('oat pre-commit hook');
    expect(hookStat.mode & 0o111).not.toBe(0);
  });

  it('installs hook snippet with non-blocking drift remediation warning', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-hook-warning-'));
    tempDirs.push(root);

    const capture = createLoggerCapture();
    const command = createInitCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'project') as Scope,
        apply: false,
        verbose: false,
        json: false,
        cwd: root,
        home: '/tmp/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveScopeRoot: vi.fn(async () => root),
      ensureCanonicalDirs: vi.fn(async () => undefined),
      loadManifest: vi.fn(async () => createEmptyManifest()),
      saveManifest: vi.fn(async () => undefined),
      scanCanonical: vi.fn(async () => []),
      collectStrays: vi.fn(async () => []),
      confirmAction: vi.fn(async () => false),
      adoptStray: vi.fn(async (_scopeRoot, _stray, manifest) => manifest),
    });

    await runInitCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--hook'],
    });

    const hookPath = join(root, '.git', 'hooks', 'pre-commit');
    const hookContents = await readFile(hookPath, 'utf8');

    expect(hookContents).toContain(
      'if ! oat status --scope project >/dev/null 2>&1; then',
    );
    expect(hookContents).toContain(
      "oat: project provider views are out of sync - run 'oat status --scope project' or 'oat sync --apply --scope project'",
    );
  });

  it('installs hook when .git/hooks is a symlinked directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-hook-symlink-'));
    tempDirs.push(root);
    await mkdir(join(root, '.git'), { recursive: true });
    const hooksTarget = join(root, 'hooks-target');
    await mkdir(hooksTarget, { recursive: true });
    await symlink(hooksTarget, join(root, '.git', 'hooks'));

    const capture = createLoggerCapture();
    const command = createInitCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'project') as Scope,
        apply: false,
        verbose: false,
        json: false,
        cwd: root,
        home: '/tmp/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveScopeRoot: vi.fn(async () => root),
      ensureCanonicalDirs: vi.fn(async () => undefined),
      loadManifest: vi.fn(async () => createEmptyManifest()),
      saveManifest: vi.fn(async () => undefined),
      scanCanonical: vi.fn(async () => []),
      collectStrays: vi.fn(async () => []),
      confirmAction: vi.fn(async () => false),
      adoptStray: vi.fn(async (_scopeRoot, _stray, manifest) => manifest),
    });

    await runInitCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--hook'],
    });

    const hookContents = await readFile(
      join(hooksTarget, 'pre-commit'),
      'utf8',
    );
    expect(hookContents).toContain('oat pre-commit hook');
  });

  it('skips hook in non-interactive mode with guidance', async () => {
    const { command, capture, installHook } = createHarness({
      interactive: false,
      hookInstalled: false,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(installHook).not.toHaveBeenCalled();
    expect(capture.info).toContain(HOOK_GUIDANCE);
  });

  it('does not re-prompt for hook when already installed', async () => {
    const { command, confirmAction, installHook } = createHarness({
      interactive: true,
      hookInstalled: true,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(confirmAction).not.toHaveBeenCalled();
    expect(installHook).not.toHaveBeenCalled();
  });

  it('respects --hook and --no-hook flags', async () => {
    const withHook = createHarness({
      interactive: false,
      hookInstalled: false,
    });
    await runInitCommand(withHook.command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--hook'],
    });
    expect(withHook.installHook).toHaveBeenCalledWith('/tmp/workspace');

    const noHook = createHarness({
      interactive: true,
      hookInstalled: true,
      confirmResponses: [true],
    });
    await runInitCommand(noHook.command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--no-hook'],
    });
    expect(noHook.confirmAction).not.toHaveBeenCalled();
    expect(noHook.installHook).not.toHaveBeenCalled();
    expect(noHook.uninstallHook).toHaveBeenCalledWith('/tmp/workspace');
  });
});
