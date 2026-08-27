import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { ScopedPackInventory } from '@commands/tools/shared/pack-inventory';
import {
  getPackDefinition,
  PACK_NAMES,
} from '@commands/tools/shared/pack-manifest';
import type { ConcreteScope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createToolsMigrateCommand,
  type MigrationCommandDependencies,
} from './index';
import {
  planPackMigration,
  type PackMigrationOutcome,
  type PackMigrationPreview,
} from './migrate-pack';

function plannerInventory(
  scope: ConcreteScope,
  source: 'declared' | 'none',
  conflictAssetId?: string,
): ScopedPackInventory {
  const definition = getPackDefinition('ideas');
  const assets: ScopedPackInventory['assets'] = definition.assets
    .filter(({ scopes }) => scopes.includes(scope))
    .map((asset) => ({
      definition: asset,
      path: join(`/${scope}`, asset.destination),
      status:
        asset.id === conflictAssetId
          ? 'newer'
          : source === 'none'
            ? 'missing'
            : asset.ownership[scope] === 'managed'
              ? 'current'
              : 'present',
      installedVersion: null,
      bundledVersion: null,
    }));
  const managed = assets.filter(
    ({ definition: asset }) => asset.ownership[scope] === 'managed',
  );
  const present = managed.filter(({ status }) => status !== 'missing').length;
  return {
    pack: 'ideas',
    scope,
    intent: {
      pack: 'ideas',
      scope,
      enabled: source === 'declared',
      source,
      configPath: join(`/${scope}`, '.oat/config.json'),
      diagnostics: [],
    },
    completeness:
      present === 0
        ? 'absent'
        : present === managed.length
          ? 'complete'
          : 'partial',
    assets,
    diagnostics: [],
  };
}

function blockedPlannerPreview(): PackMigrationPreview {
  return planPackMigration({
    pack: 'ideas',
    from: 'project',
    to: 'user',
    sourceRoot: '/project',
    destinationRoot: '/user',
    assetsRoot: '/assets',
    sourceInventory: plannerInventory('project', 'declared'),
    destinationInventory: plannerInventory(
      'user',
      'none',
      'skill:oat-idea-new',
    ),
  });
}

function scopedInventory(scope: ConcreteScope): ScopedPackInventory {
  return {
    pack: 'ideas',
    scope,
    intent: {
      pack: 'ideas',
      scope,
      enabled: true,
      source: 'declared',
      configPath: `/${scope}/.oat/config.json`,
      diagnostics: [],
    },
    completeness: 'complete',
    assets: [],
    diagnostics: [],
  };
}

function preview(): PackMigrationPreview {
  return {
    pack: 'ideas',
    from: 'project',
    to: 'user',
    projectRoot: '/project',
    sourceIntent: 'declared',
    status: 'ready',
    additions: [
      {
        assetId: 'skill:oat-idea-new',
        kind: 'skill',
        scope: 'user',
        path: '/user/.agents/skills/oat-idea-new',
        status: 'missing',
        reason: 'destination-reconcile',
      },
    ],
    duplicates: [],
    conflicts: [],
    removals: [
      {
        assetId: 'skill:oat-idea-new',
        kind: 'skill',
        scope: 'project',
        path: '/project/.agents/skills/oat-idea-new',
        status: 'current',
        reason: 'source-managed',
      },
    ],
    retained: [],
    diagnostics: [],
    destinationPlan: {
      pack: 'ideas',
      scope: 'user',
      action: 'migrate-destination',
      operations: [],
      expectedCompleteness: 'complete',
      changedCanonicalPaths: ['.agents/skills/oat-idea-new'],
      retainedAssets: [],
    },
  };
}

function createHarness(
  options: {
    interactive?: boolean;
    confirmed?: boolean;
    completionStatus?: PackMigrationOutcome['status'];
    planError?: Error;
    preview?: PackMigrationPreview;
    destinationStatus?: PackMigrationOutcome['status'];
  } = {},
) {
  const capture = createLoggerCapture();
  const migrationPreview = options.preview ?? preview();
  const destination: PackMigrationOutcome = {
    preview: migrationPreview,
    status: options.destinationStatus ?? 'destination-verified',
    destinationInventory: scopedInventory('user'),
  };
  const completionStatus = options.completionStatus ?? 'migrated';
  const completion: PackMigrationOutcome = {
    ...destination,
    status: completionStatus,
    sourceInventory: scopedInventory('project'),
    recovery:
      completionStatus === 'source-removal-failed'
        ? [
            'Re-run interactively: oat --cwd /project tools migrate --pack ideas --from project --to user',
          ]
        : undefined,
  };
  const executeDestination = vi.fn(async () => destination);
  const completeSourceRemoval = vi.fn(async () => completion);
  const confirmAction = vi.fn(async () => options.confirmed ?? true);
  const dependencies: MigrationCommandDependencies = {
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: 'all',
      dryRun: false,
      verbose: false,
      json: globalOptions.json ?? false,
      cwd: '/project',
      home: '/user',
      interactive: options.interactive ?? !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: async () => '/project',
    resolveScopeRoot: (_scope, _cwd, home) => home,
    resolveAssetsRoot: async () => '/assets',
    inventory: async ({ scope }) => scopedInventory(scope),
    resolveSharedRetentions: async () => [],
    plan: () => {
      if (options.planError) throw options.planError;
      return migrationPreview;
    },
    executeDestination,
    completeSourceRemoval,
    confirmAction,
  };
  return {
    capture,
    command: createToolsMigrateCommand(dependencies),
    executeDestination,
    completeSourceRemoval,
    confirmAction,
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
    .option('--cwd <path>')
    .exitOverride();
  const tools = new Command('tools');
  tools.addCommand(command);
  program.addCommand(tools);
  await program.parseAsync([...globalArgs, 'tools', 'migrate', ...args], {
    from: 'user',
  });
}

const requiredArgs = ['--pack', 'ideas', '--from', 'project', '--to', 'user'];

describe('createToolsMigrateCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('exposes required scope options, dry-run, and no force bypass', () => {
    const { command } = createHarness();
    expect(
      command.options.find(({ long }) => long === '--pack')?.mandatory,
    ).toBe(true);
    expect(
      command.options.find(({ long }) => long === '--from')?.mandatory,
    ).toBe(true);
    expect(command.options.find(({ long }) => long === '--to')?.mandatory).toBe(
      true,
    );
    expect(command.options.map(({ long }) => long)).toContain('--dry-run');
    expect(command.options.map(({ long }) => long)).not.toEqual(
      expect.arrayContaining(['--force', '--yes']),
    );
    expect(
      command.options.find(({ long }) => long === '--pack')?.argChoices,
    ).toEqual(PACK_NAMES);
  });

  it('renders a preview and applies nothing during a human dry-run', async () => {
    const harness = createHarness();
    await runCommand(harness.command, [...requiredArgs, '--dry-run']);

    expect(harness.capture.info.join('\n')).toMatch(/migration preview/i);
    expect(harness.capture.info.join('\n')).toMatch(/additions: 1/i);
    expect(harness.capture.info.join('\n')).toContain(
      'skill:oat-idea-new [skill] project current: /project/.agents/skills/oat-idea-new',
    );
    expect(harness.executeDestination).not.toHaveBeenCalled();
    expect(harness.completeSourceRemoval).not.toHaveBeenCalled();
    expect(harness.confirmAction).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('returns an inspectable typed blocked preview without mutating', async () => {
    const blocked = blockedPlannerPreview();
    const harness = createHarness({ preview: blocked });
    await runCommand(harness.command, requiredArgs, ['--json']);

    expect(harness.capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      preview: {
        conflicts: [
          {
            assetId: 'skill:oat-idea-new',
            path: '/user/.agents/skills/oat-idea-new',
            status: 'newer',
          },
        ],
      },
    });
    const payload = harness.capture.jsonPayloads[0] as {
      preview: PackMigrationPreview;
    };
    expect(payload.preview.additions).not.toContainEqual(
      expect.objectContaining({ assetId: 'skill:oat-idea-new' }),
    );
    expect(payload.preview.additions.length).toBeGreaterThan(0);
    expect(payload.preview.destinationPlan.operations).not.toContainEqual(
      expect.objectContaining({ assetId: 'skill:oat-idea-new' }),
    );
    expect(payload.preview.destinationPlan.changedCanonicalPaths).not.toContain(
      '.agents/skills/oat-idea-new',
    );
    expect(harness.executeDestination).not.toHaveBeenCalled();
    expect(harness.confirmAction).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    const human = createHarness({ preview: blocked });
    await runCommand(human.command, requiredArgs);
    const rendered = human.capture.info.join('\n');
    expect(rendered).toMatch(
      new RegExp(`additions: ${blocked.additions.length}`, 'i'),
    );
    const conflictLine = rendered
      .split('\n')
      .find((line) => line.includes('skill:oat-idea-new [skill] user newer'));
    expect(conflictLine).toContain('/user/.agents/skills/oat-idea-new');
    expect(conflictLine).not.toContain('destination-reconcile');
  });

  it('stops before source confirmation when destination provider sync fails', async () => {
    const harness = createHarness({
      destinationStatus: 'destination-sync-failed',
    });
    await runCommand(harness.command, requiredArgs, ['--json']);

    expect(harness.confirmAction).not.toHaveBeenCalled();
    expect(harness.completeSourceRemoval).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(2);
  });

  it('emits one stable JSON preview document in dry-run mode', async () => {
    const harness = createHarness();
    await runCommand(
      harness.command,
      [...requiredArgs, '--dry-run'],
      ['--json'],
    );

    expect(harness.capture.jsonPayloads).toEqual([
      expect.objectContaining({
        status: 'previewed',
        operation: 'migrate',
        dryRun: true,
        preview: expect.objectContaining({ pack: 'ideas' }),
      }),
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('shows the preview before confirmation and completes an interactive move', async () => {
    const harness = createHarness({ interactive: true, confirmed: true });
    await runCommand(harness.command, requiredArgs);

    expect(harness.executeDestination).toHaveBeenCalledOnce();
    expect(harness.confirmAction).toHaveBeenCalledWith(
      expect.stringMatching(/remove.*project/i),
      expect.objectContaining({ interactive: true }),
    );
    expect(harness.completeSourceRemoval).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'destination-verified' }),
      expect.objectContaining({ confirmation: 'confirmed' }),
      expect.anything(),
    );
    expect(harness.capture.success.join('\n')).toMatch(/migrated/i);
    expect(process.exitCode).toBe(0);
  });

  it('declining removal retains both scopes successfully', async () => {
    const harness = createHarness({
      interactive: true,
      confirmed: false,
      completionStatus: 'retained-both',
    });
    await runCommand(harness.command, requiredArgs);

    expect(harness.completeSourceRemoval).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ confirmation: 'declined' }),
      expect.anything(),
    );
    expect(process.exitCode).toBe(0);
  });

  it('stops non-interactively after destination verification with an actionable exit', async () => {
    const harness = createHarness({
      interactive: false,
      completionStatus: 'retained-both',
    });
    await runCommand(harness.command, requiredArgs, ['--json']);

    expect(harness.confirmAction).not.toHaveBeenCalled();
    expect(harness.completeSourceRemoval).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ confirmation: 'non-interactive' }),
      expect.anything(),
    );
    expect(harness.capture.jsonPayloads[0]).toMatchObject({
      status: 'retained-both',
      operation: 'migrate',
    });
    expect(process.exitCode).toBe(1);
  });

  it('uses stable user and system exit codes for planning and removal failures', async () => {
    const invalid = createHarness({ planError: new Error('same scope') });
    await runCommand(invalid.command, requiredArgs);
    expect(invalid.capture.error[0]).toMatch(/same scope/i);
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    const failed = createHarness({
      completionStatus: 'source-removal-failed',
    });
    await runCommand(failed.command, requiredArgs);
    expect(process.exitCode).toBe(2);
  });
});
