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
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext, GlobalOptions } from '../../app/command-context';
import type { CanonicalEntry } from '../../engine';
import { createEmptyManifest, type Manifest } from '../../manifest';
import type { Scope } from '../../shared/types';
import { createLoggerCapture, type LoggerCapture } from '../__tests__/helpers';
import { createInitCommand, type InitStrayCandidate } from './index';

interface HarnessOptions {
  interactive?: boolean;
  scopeRootByScope?: Partial<Record<'project' | 'user', string>>;
  strays?: InitStrayCandidate[];
  confirmResponses?: boolean[];
  selectResponses?: Array<string[] | null>;
  hookInstalled?: boolean;
  useDefaultAdopt?: boolean;
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
): InitStrayCandidate {
  return {
    provider: 'claude',
    report: {
      canonical: null,
      provider: 'claude',
      providerPath,
      state: { status: 'stray' },
    },
    mapping: {
      contentType: 'skill',
      canonicalDir: '.agents/skills',
      providerDir: '.claude/skills',
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
  confirmAction: ReturnType<typeof vi.fn>;
  selectManyWithAbort: ReturnType<typeof vi.fn>;
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
  const confirmAction = vi.fn(async () => confirmResponses.shift() ?? false);
  const selectManyWithAbort = vi.fn(async () => selectResponses.shift() ?? []);
  const resolveScopeRoot = vi.fn(
    async (scope: 'project' | 'user') => scopeRoots[scope],
  );
  const ensureCanonicalDirs = vi.fn(async () => undefined);
  const saveManifest = vi.fn(async () => undefined);
  const adoptStray = vi.fn(
    async (_scopeRoot: string, _stray, manifest: Manifest) => {
      return manifest;
    },
  );
  const installHook = vi.fn(async () => undefined);
  const uninstallHook = vi.fn(async () => undefined);
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
    collectStrays: vi.fn(async () => options.strays ?? []),
    confirmAction,
    selectManyWithAbort,
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
    confirmAction,
    selectManyWithAbort,
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
    }>;
    expect(choices[0]?.label).toContain('[user] ~/.claude/skills/user-stray');
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
