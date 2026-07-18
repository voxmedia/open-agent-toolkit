import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { CodexRoleStray } from '@commands/shared/codex-strays';
import { DEFAULT_SYNC_CONFIG, type SyncConfig } from '@config/index';
import type { DriftReport } from '@drift/index';
import {
  scanBundledManagedCodexAgents as scanBundledManagedCodexAgentsFromDisk,
  type CanonicalEntry,
} from '@engine/index';
import { CliError } from '@errors/index';
import type { Manifest, ManifestEntry } from '@manifest/index';
import { buildCodexMaterializedTargetRoleName } from '@providers/codex/codec/shared';
import {
  computeCodexProjectExtensionPlan as computeCodexExtensionPlanFromDisk,
  type CodexExtensionPlan,
} from '@providers/codex/codec/sync-extension';
import type { ProviderAdapter } from '@providers/shared';
import {
  getAdoptionSources,
  getSyncMappings,
} from '@providers/shared/adapter.utils';
import { OAT_VERSION } from '@shared/oat-version';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStatusCommand } from './index';

interface TestHarnessOptions {
  adapters?: ProviderAdapter[];
  manifestEntries?: ManifestEntry[];
  driftReports?: DriftReport[];
  strayReports?: DriftReport[];
  codexRoleStrays?: CodexRoleStray[];
  syncConfigKnownStrays?: string[];
  userKnownStrays?: string[];
  codexExtensionPlan?: CodexExtensionPlan;
  canonicalEntries?: CanonicalEntry[];
  bundledCodexEntries?: CanonicalEntry[];
  cwd?: string;
  home?: string;
  useDiskCodexExtension?: boolean;
  useDiskBundledCodexAgents?: boolean;
  interactive?: boolean;
  selectManyResponses?: Array<string[] | null>;
  singleSelectResponses?: Array<string | null>;
}

const REMEDIATION_TEXT = 'Run "oat init" to adopt stray entries.';

function createManifestEntry(
  overrides: Partial<ManifestEntry> = {},
): ManifestEntry {
  return {
    canonicalPath: '.agents/skills/skill-one',
    providerPath: '.claude/skills/skill-one',
    provider: 'claude',
    contentType: 'skill',
    strategy: 'symlink',
    contentHash: null,
    lastSynced: '2026-02-14T00:00:00.000Z',
    ...overrides,
  };
}

function createCanonicalEntry(name = 'skill-one'): CanonicalEntry {
  return {
    name,
    type: 'skill',
    canonicalPath: `/tmp/workspace/.agents/skills/${name}`,
    isFile: false,
  };
}

function createBundledCodexEntries(): CanonicalEntry[] {
  return ['oat-phase-implementer.md', 'oat-reviewer.md'].map((name) => ({
    name,
    type: 'agent',
    canonicalPath: `/tmp/bundled/agents/${name}`,
    isFile: true,
  }));
}

function createAdapter(): ProviderAdapter {
  return {
    name: 'claude',
    displayName: 'Claude Code',
    defaultStrategy: 'symlink',
    projectMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.claude/skills',
        nativeRead: false,
      },
    ],
    userMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.claude/skills',
        nativeRead: false,
      },
    ],
    detect: async () => true,
  };
}

function createCodexAdapter(): ProviderAdapter {
  return {
    name: 'codex',
    displayName: 'Codex CLI',
    defaultStrategy: 'copy',
    projectMappings: [
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.codex/agents',
        nativeRead: false,
      },
    ],
    userMappings: [],
    detect: async () => true,
  };
}

function createCursorAdapter(): ProviderAdapter {
  const skillMapping = {
    contentType: 'skill' as const,
    canonicalDir: '.agents/skills',
    providerDir: '.agents/skills',
    nativeRead: true,
    adoptionSourceDirs: ['.cursor/skills'],
  };

  return {
    name: 'cursor',
    displayName: 'Cursor',
    defaultStrategy: 'symlink',
    projectMappings: [skillMapping],
    userMappings: [skillMapping],
    detect: async () => true,
  };
}

function createManifest(entries: ManifestEntry[]): Manifest {
  return {
    version: 1,
    oatVersion: OAT_VERSION,
    entries,
    lastUpdated: '2026-02-14T00:00:00.000Z',
  };
}

function formatReports(reports: DriftReport[]): string {
  if (reports.length === 0) {
    return 'No managed entries found.';
  }

  return reports
    .map((report) => {
      const label =
        report.state.status === 'drifted'
          ? `drifted:${report.state.reason}`
          : report.state.status;
      return `${report.provider}:${label}:${report.providerPath}`;
    })
    .join('\n');
}

function createHarness(options: TestHarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  selectManyWithAbort: ReturnType<typeof vi.fn>;
  selectWithAbort: ReturnType<typeof vi.fn>;
  confirmAction: ReturnType<typeof vi.fn>;
  adoptStray: ReturnType<typeof vi.fn>;
  applyCursorSkillDisposition: ReturnType<typeof vi.fn>;
  saveManifest: ReturnType<typeof vi.fn>;
  scanCanonical: ReturnType<typeof vi.fn>;
  scanBundledManagedCodexAgents: ReturnType<typeof vi.fn>;
  computeCodexProjectExtensionPlan: ReturnType<typeof vi.fn>;
  detectStrays: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const adapters = options.adapters ?? [createAdapter()];
  const fallbackManifestEntries =
    options.driftReports && options.driftReports.length === 0
      ? []
      : [createManifestEntry()];
  const manifestEntries = options.manifestEntries ?? fallbackManifestEntries;
  const driftReports =
    options.driftReports ??
    (manifestEntries.length > 0
      ? [
          {
            canonical:
              manifestEntries[0]?.canonicalPath ?? '.agents/skills/skill-one',
            provider: 'claude',
            providerPath:
              manifestEntries[0]?.providerPath ?? '.claude/skills/skill-one',
            state: { status: 'in_sync' as const },
          },
        ]
      : []);
  const strayReports = options.strayReports ?? [];
  const canonicalEntries = options.canonicalEntries ?? [];
  const interactive = options.interactive ?? true;
  const selectManyResponses = [...(options.selectManyResponses ?? [])];
  const singleSelectResponses = [...(options.singleSelectResponses ?? [])];
  const selectManyWithAbort = vi.fn(
    async () => selectManyResponses.shift() ?? [],
  );
  const selectWithAbort = vi.fn(
    async () => singleSelectResponses.shift() ?? null,
  );
  const confirmAction = vi.fn(async () => false);
  const adoptStray = vi.fn(async (_scopeRoot, _stray, manifest: Manifest) => {
    return manifest;
  });
  const applyCursorSkillDisposition = vi.fn(
    async (_scopeRoot, _stray, manifest: Manifest) => manifest,
  );
  const saveManifest = vi.fn(async () => undefined);
  const syncConfig: SyncConfig = {
    ...DEFAULT_SYNC_CONFIG,
    knownStrays: options.syncConfigKnownStrays ?? [],
  };
  const userSyncConfig: SyncConfig = {
    ...DEFAULT_SYNC_CONFIG,
    knownStrays: options.userKnownStrays ?? [],
  };
  const detectCodexRoleStrays = vi.fn(
    async () => options.codexRoleStrays ?? [],
  );
  const computeCodexProjectExtensionPlan = options.useDiskCodexExtension
    ? vi.fn(computeCodexExtensionPlanFromDisk)
    : vi.fn(async () => {
        return (
          options.codexExtensionPlan ?? {
            operations: [],
            managedRoles: [],
            aggregateConfigHash: 'hash',
          }
        );
      });
  const scanCanonical = vi.fn(async () => canonicalEntries);
  const scanBundledManagedCodexAgents = options.useDiskBundledCodexAgents
    ? vi.fn(scanBundledManagedCodexAgentsFromDisk)
    : vi.fn(
        async () => options.bundledCodexEntries ?? createBundledCodexEntries(),
      );
  const applyCodexProjectExtensionPlan = vi.fn(async () => ({
    applied: 0,
    failed: 0,
    skipped: 0,
  }));
  const detectStrays = vi.fn(async () => strayReports);
  let driftIndex = 0;

  const command = createStatusCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd ?? '/tmp/workspace',
      home: options.home ?? '/tmp/home',
      interactive: interactive && !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveScopeRoot: vi.fn(async (scope) =>
      scope === 'user'
        ? (options.home ?? '/tmp/home')
        : (options.cwd ?? '/tmp/workspace'),
    ),
    loadManifest: vi.fn(async () => createManifest(manifestEntries)),
    loadSyncConfig: vi.fn(async () => syncConfig),
    resolveUserSyncConfig: vi.fn(async () => userSyncConfig),
    saveManifest,
    scanCanonical,
    scanBundledManagedCodexAgents,
    getAdapters: () => adapters,
    getActiveAdapters: vi.fn(async (adapters: ProviderAdapter[]) => adapters),
    getSyncMappings: vi.fn(getSyncMappings),
    getAdoptionSources: vi.fn(getAdoptionSources),
    detectDrift: vi.fn(async () => {
      const report = driftReports[driftIndex] ?? driftReports.at(-1);
      driftIndex += 1;
      return report ?? driftReports[0]!;
    }),
    detectStrays,
    detectCodexRoleStrays,
    computeCodexProjectExtensionPlan,
    applyCodexProjectExtensionPlan,
    selectManyWithAbort,
    selectWithAbort,
    confirmAction,
    adoptStray,
    applyCursorSkillDisposition,
    formatStatusTable: formatReports,
  });

  return {
    capture,
    command,
    selectManyWithAbort,
    selectWithAbort,
    confirmAction,
    adoptStray,
    applyCursorSkillDisposition,
    saveManifest,
    scanCanonical,
    scanBundledManagedCodexAgents,
    computeCodexProjectExtensionPlan,
    detectStrays,
  };
}

async function runStatusCommand(
  command: Command,
  argv: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);

  // Subcommand-specific flags (e.g. `--hook`) must follow the `status`
  // subcommand name. Split `argv` into parent-level globals and subcommand
  // flags so both are routed to the right parser.
  const subcommandOnlyFlags = new Set(['--hook']);
  const parentArgs: string[] = [];
  const subArgs: string[] = [];
  for (const arg of argv) {
    if (subcommandOnlyFlags.has(arg)) {
      subArgs.push(arg);
    } else {
      parentArgs.push(arg);
    }
  }

  await program.parseAsync([...parentArgs, 'status', ...subArgs], {
    from: 'user',
  });
}

describe('createStatusCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('reports all in_sync when no drift', async () => {
    const { capture, command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'in_sync' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('in_sync');
  });

  it('reports drifted entries with reasons', async () => {
    const { capture, command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'drifted', reason: 'modified' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('drifted:modified');
  });

  it('reports missing entries', async () => {
    const { capture, command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'missing' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('missing');
  });

  it('reports missing entries for canonical content not yet synced', async () => {
    const { capture, command } = createHarness({
      manifestEntries: [],
      driftReports: [],
      canonicalEntries: [createCanonicalEntry('unsynced-skill')],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('missing');
    expect(process.exitCode).toBe(1);
  });

  it('scans Cursor adoption sources without reporting native-read skills as missing views', async () => {
    const { capture, command, detectStrays } = createHarness({
      adapters: [createCursorAdapter()],
      interactive: false,
      manifestEntries: [],
      driftReports: [],
      canonicalEntries: [createCanonicalEntry('cursor-skill')],
      strayReports: [
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/cursor-local',
          state: { status: 'stray' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(detectStrays).toHaveBeenCalledWith(
      'cursor',
      join('/tmp/workspace', '.cursor/skills'),
      expect.any(Object),
      expect.any(Array),
      expect.objectContaining({
        providerDir: '.agents/skills',
        nativeRead: true,
      }),
    );
    expect(capture.info[0]).toContain('cursor:stray');
    expect(capture.info[0]).not.toContain('missing');
  });

  it('reports strays with remediation text', async () => {
    const { capture, command } = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/stray-skill',
          state: { status: 'stray' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.warn).toContain(REMEDIATION_TEXT);
  });

  it('prompts with one checklist and adopts only selected entries', async () => {
    const { command, selectManyWithAbort, adoptStray, saveManifest } =
      createHarness({
        interactive: true,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-one',
            state: { status: 'stray' },
          },
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-two',
            state: { status: 'stray' },
          },
        ],
        selectManyResponses: [['0']],
      });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(selectManyWithAbort.mock.calls[0]?.[0]).toContain(
      'Select stray entries to adopt [project]',
    );
    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      value: string;
      description?: string;
    }>;
    expect(choices[0]?.label).toContain('[project] stray-one (claude)');
    expect(choices[0]?.description).toContain('.claude/skills/stray-one');
    expect(choices[1]?.label).toContain('[project] stray-two (claude)');
    expect(choices[1]?.description).toContain('.claude/skills/stray-two');
    expect(adoptStray).toHaveBeenCalledTimes(1);
    expect(saveManifest).toHaveBeenCalledTimes(1);
  });

  it('prompts for each Cursor skill with only adopt and keep choices', async () => {
    const {
      command,
      selectWithAbort,
      selectManyWithAbort,
      applyCursorSkillDisposition,
    } = createHarness({
      adapters: [createCursorAdapter()],
      interactive: true,
      manifestEntries: [],
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/adopt-me',
          state: { status: 'stray' },
        },
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/keep-me',
          state: { status: 'stray' },
        },
      ],
      singleSelectResponses: ['adopt', 'keep'],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectWithAbort).toHaveBeenCalledTimes(2);
    for (const call of selectWithAbort.mock.calls) {
      expect(call[1]).toEqual([
        expect.objectContaining({
          label: 'Adopt into canonical',
          value: 'adopt',
        }),
        expect.objectContaining({
          label: 'Keep Cursor-only',
          value: 'keep',
        }),
      ]);
      expect(call[1]).toHaveLength(2);
    }
    expect(
      applyCursorSkillDisposition.mock.calls.map((call) => call[3]),
    ).toEqual(['adopt', 'keep']);
    expect(applyCursorSkillDisposition.mock.calls[1]?.[4]).toBe(
      '/tmp/workspace/.oat/sync/config.json',
    );
    expect(selectManyWithAbort).not.toHaveBeenCalled();
  });

  it('stops current and remaining status migration processing on abort', async () => {
    const {
      command,
      selectWithAbort,
      selectManyWithAbort,
      applyCursorSkillDisposition,
    } = createHarness({
      adapters: [createCursorAdapter()],
      interactive: true,
      manifestEntries: [],
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/answered',
          state: { status: 'stray' },
        },
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/aborted',
          state: { status: 'stray' },
        },
      ],
      singleSelectResponses: ['keep', null],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectWithAbort).toHaveBeenCalledTimes(2);
    expect(applyCursorSkillDisposition).toHaveBeenCalledTimes(1);
    expect(selectManyWithAbort).not.toHaveBeenCalled();
  });

  it('uses project and user sync config paths for scope-all dispositions', async () => {
    const { command, applyCursorSkillDisposition } = createHarness({
      adapters: [createCursorAdapter()],
      interactive: true,
      manifestEntries: [],
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/local-only',
          state: { status: 'stray' },
        },
      ],
      singleSelectResponses: ['keep', 'keep'],
    });

    await runStatusCommand(command, ['--scope', 'all']);

    expect(
      applyCursorSkillDisposition.mock.calls.map((call) => call[4]),
    ).toEqual([
      '/tmp/workspace/.oat/sync/config.json',
      '/tmp/home/.oat/sync/config.json',
    ]);
  });

  it('reports keep-local name collisions without recording the choice', async () => {
    const { command, capture, applyCursorSkillDisposition } = createHarness({
      adapters: [createCursorAdapter()],
      interactive: true,
      manifestEntries: [],
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/local-only',
          state: { status: 'stray' },
        },
      ],
      singleSelectResponses: ['keep'],
    });
    applyCursorSkillDisposition.mockRejectedValueOnce(
      new CliError(
        'Cannot keep .cursor/skills/local-only Cursor-only because canonical skill .agents/skills/local-only has the same name. Rename one skill, then run the command again.',
      ),
    );

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.warn.join('\n')).toContain('Rename one skill');
    expect(applyCursorSkillDisposition).toHaveBeenCalledTimes(1);
  });

  it('outputs JSON when --json flag set', async () => {
    const { capture, command } = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/stray-skill',
          state: { status: 'stray' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project', '--json']);

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.info).toHaveLength(0);
    expect(capture.warn).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      scope: 'project',
      remediation: REMEDIATION_TEXT,
      summary: {
        stray: 1,
      },
    });
  });

  it('suppresses project-level known strays from text and JSON status', async () => {
    const knownStray: DriftReport = {
      canonical: null,
      provider: 'claude',
      providerPath: '.claude/skills/local-only',
      state: { status: 'stray' },
    };
    const { capture, command, selectManyWithAbort } = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [knownStray],
      syncConfigKnownStrays: ['.claude/skills/local-only'],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).not.toContain('.claude/skills/local-only');
    expect(capture.warn).not.toContain(REMEDIATION_TEXT);
    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);

    const jsonHarness = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [knownStray],
      syncConfigKnownStrays: ['.claude/skills/local-only'],
    });

    await runStatusCommand(jsonHarness.command, [
      '--scope',
      'project',
      '--json',
    ]);

    expect(jsonHarness.capture.jsonPayloads[0]).toMatchObject({
      summary: {
        total: 0,
        stray: 0,
      },
      reports: [],
    });
    expect(jsonHarness.capture.jsonPayloads[0]).not.toHaveProperty(
      'remediation',
    );
  });

  it('suppresses user-level known strays from prompts', async () => {
    const { capture, command, selectManyWithAbort } = createHarness({
      interactive: true,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/user-local',
          state: { status: 'stray' },
        },
      ],
      userKnownStrays: ['.claude/skills/user-local'],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).not.toContain('.claude/skills/user-local');
    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('keeps unconfigured strays reportable and adoptable', async () => {
    const { capture, command, selectManyWithAbort, adoptStray } = createHarness(
      {
        interactive: true,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/local-only',
            state: { status: 'stray' },
          },
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/actionable',
            state: { status: 'stray' },
          },
        ],
        syncConfigKnownStrays: ['.claude/skills/local-only'],
        selectManyResponses: [['0']],
      },
    );

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).not.toContain('.claude/skills/local-only');
    expect(capture.info[0]).toContain('.claude/skills/actionable');
    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      description?: string;
    }>;
    expect(choices).toHaveLength(1);
    expect(choices[0]?.label).toContain('actionable');
    expect(choices[0]?.description).toContain('.claude/skills/actionable');
    expect(adoptStray.mock.calls[0]?.[1].report.providerPath).toBe(
      '.claude/skills/actionable',
    );
  });

  it('suppresses configured Codex role strays', async () => {
    const { capture, command, selectManyWithAbort } = createHarness({
      adapters: [createCodexAdapter()],
      interactive: true,
      manifestEntries: [],
      driftReports: [],
      codexRoleStrays: [
        {
          roleName: 'reviewer',
          providerPath: '.codex/agents/reviewer.toml',
          description: 'Reviewer role',
        },
      ],
      syncConfigKnownStrays: ['.codex/agents/reviewer.toml'],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).not.toContain('.codex/agents/reviewer.toml');
    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('does not prompt in non-interactive mode', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/stray-skill',
          state: { status: 'stray' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectManyWithAbort).not.toHaveBeenCalled();
  });

  it('non-interactive mode skips adoption attempts even when strays exist', async () => {
    const { command, selectManyWithAbort, confirmAction, adoptStray, capture } =
      createHarness({
        interactive: false,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-skill',
            state: { status: 'stray' },
          },
        ],
      });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(confirmAction).not.toHaveBeenCalled();
    expect(adoptStray).not.toHaveBeenCalled();
    expect(capture.warn).toContain(REMEDIATION_TEXT);
    expect(process.exitCode).toBe(1);
  });

  it('reports codex extension drift operations for project scope', async () => {
    const { capture, command } = createHarness({
      adapters: [createCodexAdapter()],
      manifestEntries: [],
      driftReports: [],
      canonicalEntries: [],
      codexExtensionPlan: {
        operations: [
          {
            action: 'create',
            target: 'role',
            path: '.codex/agents/reviewer.toml',
            reason: 'missing role',
            roleName: 'reviewer',
            content: 'role content',
          },
          {
            action: 'update',
            target: 'config',
            path: '.codex/config.toml',
            reason: 'config drifted',
            content: 'config content',
          },
        ],
        managedRoles: ['reviewer'],
        aggregateConfigHash: 'abc123',
      },
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('codex:missing');
    expect(capture.info[0]).toContain('codex:drifted:modified');
    expect(process.exitCode).toBe(1);
  });

  it('reports Codex extension drift for user scope', async () => {
    const {
      command,
      scanCanonical,
      scanBundledManagedCodexAgents,
      computeCodexProjectExtensionPlan,
    } = createHarness({
      adapters: [createCodexAdapter()],
      manifestEntries: [],
      driftReports: [],
      canonicalEntries: [],
    });

    await runStatusCommand(command, ['--scope', 'user']);

    expect(scanCanonical).toHaveBeenCalledWith('/tmp/home', 'user');
    expect(scanBundledManagedCodexAgents).toHaveBeenCalledTimes(1);
    expect(computeCodexProjectExtensionPlan).toHaveBeenCalledWith(
      '/tmp/home',
      expect.arrayContaining([
        expect.objectContaining({
          name: 'oat-phase-implementer.md',
          type: 'agent',
        }),
        expect.objectContaining({ name: 'oat-reviewer.md', type: 'agent' }),
      ]),
      undefined,
      { userConfigDir: '/tmp/home/.oat' },
    );
  });

  it('reports real custom user Codex drift in both managed base roles', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-status-user-home-'));
    const project = await mkdtemp(join(tmpdir(), 'oat-status-project-'));

    try {
      await mkdir(join(home, '.oat'), { recursive: true });
      await mkdir(join(home, '.codex', 'agents'), { recursive: true });
      await writeFile(
        join(home, '.oat', 'config.json'),
        JSON.stringify({
          version: 1,
          workflow: {
            dispatchCeiling: {
              providers: {
                codex: {
                  high: [
                    {
                      harness: 'codex',
                      model: 'gpt-5.7-user-status',
                      effort: 'high',
                    },
                  ],
                },
              },
            },
          },
        }),
        'utf8',
      );

      const roleNames = ['oat-phase-implementer', 'oat-reviewer'].map(
        (agentName) =>
          buildCodexMaterializedTargetRoleName({
            agentName,
            model: 'gpt-5.7-user-status',
            effort: 'high',
          }),
      );
      for (const roleName of roleNames) {
        await writeFile(
          join(home, '.codex', 'agents', `${roleName}.toml`),
          [
            '# oat-managed: true',
            `# oat-role: ${roleName}`,
            '# oat-owner: user-config',
            'developer_instructions = "drifted role"',
            '',
          ].join('\n'),
          'utf8',
        );
      }

      const { capture, command, computeCodexProjectExtensionPlan } =
        createHarness({
          adapters: [createCodexAdapter()],
          manifestEntries: [],
          driftReports: [],
          canonicalEntries: [],
          cwd: project,
          home,
          useDiskCodexExtension: true,
          useDiskBundledCodexAgents: true,
          interactive: false,
        });

      await runStatusCommand(command, ['--scope', 'user', '--json']);

      expect(computeCodexProjectExtensionPlan).toHaveBeenCalledWith(
        home,
        expect.arrayContaining([
          expect.objectContaining({
            name: 'oat-phase-implementer.md',
            type: 'agent',
          }),
          expect.objectContaining({ name: 'oat-reviewer.md', type: 'agent' }),
        ]),
        undefined,
        { userConfigDir: join(home, '.oat') },
      );
      const payload = capture.jsonPayloads[0] as {
        scope: Scope;
        reports: DriftReport[];
        summary: { drifted: number };
      };
      expect(payload).toMatchObject({
        scope: 'user',
        summary: { drifted: 3 },
      });
      expect(payload.reports).toEqual(
        expect.arrayContaining(
          roleNames.map((roleName) =>
            expect.objectContaining({
              provider: 'codex',
              providerPath: `.codex/agents/${roleName}.toml`,
              state: { status: 'drifted', reason: 'modified' },
            }),
          ),
        ),
      );
      expect(process.exitCode).toBe(1);
    } finally {
      await Promise.all([
        rm(home, { recursive: true, force: true }),
        rm(project, { recursive: true, force: true }),
      ]);
    }
  });

  it.each([
    ['project', createCodexAdapter()],
    ['user', createAdapter()],
  ] as const)(
    'does not compose bundled Codex inputs for %s status without user Codex planning',
    async (scope, adapter) => {
      const {
        command,
        scanBundledManagedCodexAgents,
        computeCodexProjectExtensionPlan,
      } = createHarness({
        adapters: [adapter],
        manifestEntries: [],
        driftReports: [],
        canonicalEntries: [],
      });

      await runStatusCommand(command, ['--scope', scope]);

      expect(scanBundledManagedCodexAgents).not.toHaveBeenCalled();
      if (scope === 'project') {
        expect(computeCodexProjectExtensionPlan).toHaveBeenCalledWith(
          '/tmp/workspace',
          [],
          undefined,
          { userConfigDir: '/tmp/home/.oat' },
        );
      } else {
        expect(computeCodexProjectExtensionPlan).not.toHaveBeenCalled();
      }
    },
  );

  it('reports codex role strays discovered from codex detector', async () => {
    const { capture, command } = createHarness({
      adapters: [createCodexAdapter()],
      interactive: false,
      manifestEntries: [],
      driftReports: [],
      strayReports: [],
      codexRoleStrays: [
        {
          roleName: 'reviewer',
          providerPath: '.codex/agents/reviewer.toml',
          description: 'Reviewer role',
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('codex:stray');
    expect(capture.warn).toContain(REMEDIATION_TEXT);
    expect(process.exitCode).toBe(1);
  });

  it('prompts for replacement on adoption conflict and skips when declined', async () => {
    const { command, selectManyWithAbort, confirmAction, adoptStray } =
      createHarness({
        interactive: true,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-skill',
            state: { status: 'stray' },
          },
        ],
        selectManyResponses: [['0']],
      });

    adoptStray.mockRejectedValueOnce(
      new CliError(
        'Cannot adopt .claude/skills/stray-skill because canonical file already exists.',
      ),
    );
    confirmAction.mockResolvedValue(false);

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(adoptStray).toHaveBeenCalledTimes(1);
  });

  it('retries adoption with replaceCanonical when conflict replacement is confirmed', async () => {
    const { command, selectManyWithAbort, confirmAction, adoptStray } =
      createHarness({
        interactive: true,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-skill',
            state: { status: 'stray' },
          },
        ],
        selectManyResponses: [['0']],
      });

    adoptStray
      .mockRejectedValueOnce(
        new CliError(
          'Cannot adopt .claude/skills/stray-skill because canonical file already exists.',
        ),
      )
      .mockResolvedValueOnce(
        createManifest([
          createManifestEntry({ providerPath: '.claude/skills/stray-skill' }),
        ]),
      );
    confirmAction.mockResolvedValue(true);

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(adoptStray).toHaveBeenCalledTimes(2);
    expect(adoptStray.mock.calls[1]?.[3]).toEqual({ replaceCanonical: true });
  });

  it('renders user-scope stray labels as [user] ~/.<provider path>', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: true,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/user-stray',
          state: { status: 'stray' },
        },
      ],
      selectManyResponses: [[]],
    });

    await runStatusCommand(command, ['--scope', 'user']);

    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      value: string;
      description?: string;
    }>;
    expect(choices[0]?.label).toContain('[user] user-stray (claude)');
    expect(choices[0]?.description).toContain('~/.claude/skills/user-stray');
  });

  it('exits 0 when all in sync', async () => {
    const { command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'in_sync' },
        },
      ],
      strayReports: [],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(process.exitCode).toBe(0);
  });

  it('exits 1 when drift or strays detected', async () => {
    const { command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'drifted', reason: 'replaced' },
        },
      ],
      strayReports: [],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(process.exitCode).toBe(1);
  });

  describe('--hook mode', () => {
    const DRIFT_WARNING =
      "oat: managed provider views are out of sync - run 'oat sync --scope project'";
    const STRAY_INFO =
      "oat: unmanaged provider files detected - run 'oat status --scope project' to review";

    it('is silent and exits 0 when all in sync', async () => {
      const { capture, command } = createHarness({
        driftReports: [
          {
            canonical: '.agents/skills/skill-one',
            provider: 'claude',
            providerPath: '.claude/skills/skill-one',
            state: { status: 'in_sync' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.info).toHaveLength(0);
      expect(capture.warn).toHaveLength(0);
      expect(process.exitCode).toBe(0);
    });

    it('warns and exits 1 on managed drift', async () => {
      const { capture, command } = createHarness({
        driftReports: [
          {
            canonical: '.agents/skills/skill-one',
            provider: 'claude',
            providerPath: '.claude/skills/skill-one',
            state: { status: 'drifted', reason: 'modified' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.warn).toContain(DRIFT_WARNING);
      expect(capture.info).toHaveLength(0);
      expect(process.exitCode).toBe(1);
    });

    it('warns and exits 1 on missing managed entry', async () => {
      const { capture, command } = createHarness({
        driftReports: [
          {
            canonical: '.agents/skills/skill-one',
            provider: 'claude',
            providerPath: '.claude/skills/skill-one',
            state: { status: 'missing' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.warn).toContain(DRIFT_WARNING);
      expect(process.exitCode).toBe(1);
    });

    it('emits info and exits 0 when only strays exist', async () => {
      const { capture, command } = createHarness({
        interactive: false,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-skill',
            state: { status: 'stray' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.info).toContain(STRAY_INFO);
      expect(capture.warn).toHaveLength(0);
      expect(process.exitCode).toBe(0);
    });

    it('does not emit stray info when only known strays exist', async () => {
      const { capture, command } = createHarness({
        interactive: false,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/local-only',
            state: { status: 'stray' },
          },
        ],
        syncConfigKnownStrays: ['.claude/skills/local-only'],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.info).toHaveLength(0);
      expect(capture.warn).toHaveLength(0);
      expect(process.exitCode).toBe(0);
    });

    it('prefers drift warning when both drift and strays exist', async () => {
      const { capture, command } = createHarness({
        interactive: false,
        driftReports: [
          {
            canonical: '.agents/skills/skill-one',
            provider: 'claude',
            providerPath: '.claude/skills/skill-one',
            state: { status: 'drifted', reason: 'modified' },
          },
        ],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-skill',
            state: { status: 'stray' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.warn).toContain(DRIFT_WARNING);
      expect(capture.info).not.toContain(STRAY_INFO);
      expect(process.exitCode).toBe(1);
    });

    it('suppresses the status table and adoption prompts', async () => {
      const { capture, command, selectManyWithAbort } = createHarness({
        interactive: true,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-one',
            state: { status: 'stray' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      // Status table goes via logger.info. In --hook mode we emit exactly
      // the stray info line — no table, no remediation prompt.
      expect(capture.info).toEqual([STRAY_INFO]);
      expect(selectManyWithAbort).not.toHaveBeenCalled();
    });
  });
});
