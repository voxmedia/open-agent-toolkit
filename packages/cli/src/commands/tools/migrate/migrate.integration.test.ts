import { exec as execCallback } from 'node:child_process';
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

import {
  copyDirWithStatus,
  copyFileWithStatus,
} from '@commands/init/tools/shared/copy-helpers';
import {
  inventoryScopedPack,
  type ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import {
  reconcilePackDependencyLifecycles,
  reconcilePackLifecycle,
} from '@commands/tools/shared/pack-lifecycle';
import {
  resolveSharedOwnerRetentions,
  type PackReconcileOperation,
} from '@commands/tools/shared/pack-reconcile';
import {
  hasScopedPackOwnershipEvidence,
  readScopedPackIntent,
  writeScopedPackIntent,
} from '@commands/tools/shared/scoped-pack-intent';
import type { PackName } from '@commands/tools/shared/types';
import {
  readOatConfig,
  readUserConfig,
  writeOatConfig,
  writeUserConfig,
} from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';
import type { ConcreteScope } from '@shared/types';
import { afterEach, describe, expect, it } from 'vitest';

import {
  completeMigrationSourceRemoval,
  executeMigrationDestination,
  planPackMigration,
  type PackMigrationOutcome,
  type PackMigrationPreview,
  type MigrationSyncInput,
} from './migrate-pack';

const temporaryRoots: string[] = [];
const execShell = promisify(execCallback);

async function temporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    )
      return false;
    throw error;
  }
}

async function writeGenerated(
  scopeRoot: string,
  operation: Extract<PackReconcileOperation, { kind: 'write-generated' }>,
): Promise<void> {
  await mkdir(dirname(operation.destination), { recursive: true });
  switch (operation.generation) {
    case 'projects-root-default':
      await writeFile(operation.destination, '.oat/projects/shared\n', 'utf8');
      return;
    case 'projects-config-default': {
      const config = await readOatConfig(scopeRoot);
      if (config.projects?.root?.trim()) return;
      await writeOatConfig(scopeRoot, {
        ...config,
        projects: { ...config.projects, root: '.oat/projects/shared' },
      });
      return;
    }
    case 'empty-file':
      await writeFile(operation.destination, '', 'utf8');
  }
}

interface MigrationRoots {
  project: string;
  user: string;
  assets: string;
}
interface SyncCall {
  scope: ConcreteScope;
  action: 'install' | 'remove';
  paths: readonly string[];
}

async function inventoryAt(
  pack: PackName,
  scope: ConcreteScope,
  roots: MigrationRoots,
): Promise<ScopedPackInventory> {
  return inventoryScopedPack({
    pack,
    scope,
    scopeRoot: roots[scope],
    assetsRoot: roots.assets,
  });
}

async function previewMigration(
  pack: PackName,
  from: ConcreteScope,
  to: ConcreteScope,
  roots: MigrationRoots,
): Promise<PackMigrationPreview> {
  const [sourceInventory, destinationInventory] = await Promise.all([
    inventoryAt(pack, from, roots),
    inventoryAt(pack, to, roots),
  ]);
  const sourceRetentions = await resolveSharedOwnerRetentions({
    packs: [pack],
    scope: from,
    scopeRoot: roots[from],
    hasOwnershipEvidence: async (owner, scope, scopeRoot) =>
      hasScopedPackOwnershipEvidence({ pack: owner, scope, scopeRoot }),
  });
  return planPackMigration({
    pack,
    from,
    to,
    sourceRoot: roots[from],
    destinationRoot: roots[to],
    assetsRoot: roots.assets,
    sourceInventory,
    destinationInventory,
    sourceRetentions,
  });
}

async function installSource(
  pack: PackName,
  scope: ConcreteScope,
  roots: MigrationRoots,
): Promise<void> {
  await reconcilePackLifecycle({
    pack,
    scope,
    scopeRoot: roots[scope],
    assetsRoot: roots.assets,
    action: 'install',
  });
}

async function writeLegacyFalse(
  pack: PackName,
  scope: ConcreteScope,
  roots: MigrationRoots,
): Promise<void> {
  if (scope === 'project') {
    const config = await readOatConfig(roots.project);
    await writeOatConfig(roots.project, {
      ...config,
      tools: { ...config.tools, [pack]: false },
    });
    return;
  }
  const configDir = join(roots.user, '.oat');
  const config = await readUserConfig(configDir);
  await writeUserConfig(configDir, {
    ...config,
    tools: { ...config.tools, [pack]: false },
  });
}

function quotePosixArgument(argument: string): string {
  if (/^[a-zA-Z0-9_@+=:,./-]+$/.test(argument)) return argument;
  return `'${argument.replaceAll("'", `'"'"'`)}'`;
}

async function prepareRecoveryCommandRuntime(
  projectRoot: string,
): Promise<{ outsideRoot: string; env: NodeJS.ProcessEnv }> {
  const binRoot = await temporaryRoot('oat-migrate-recovery-bin-');
  const outsideRoot = await temporaryRoot('oat-migrate-outside-');
  const repositoryRoot = resolve(process.cwd(), '../..');
  const oatShim = join(binRoot, 'oat');
  await writeFile(
    oatShim,
    `#!/bin/sh\nexec pnpm --dir ${quotePosixArgument(repositoryRoot)} cli:source -- "$@"\n`,
    'utf8',
  );
  await chmod(oatShim, 0o755);
  await mkdir(join(projectRoot, '.claude', 'skills'), { recursive: true });
  await mkdir(join(projectRoot, '.oat', 'sync'), { recursive: true });
  await writeFile(
    join(projectRoot, '.oat', 'sync', 'config.json'),
    JSON.stringify({
      version: 1,
      defaultStrategy: 'copy',
      providers: { claude: { enabled: true, strategy: 'copy' } },
    }),
    'utf8',
  );
  return {
    outsideRoot,
    env: {
      ...process.env,
      PATH: `${binRoot}:${process.env.PATH ?? ''}`,
    },
  };
}

async function executeRecoveryCommand(
  command: string,
  runtime: { outsideRoot: string; env: NodeJS.ProcessEnv },
): Promise<void> {
  await execShell(command, { cwd: runtime.outsideRoot, env: runtime.env });
}

async function installDestination(
  preview: PackMigrationPreview,
  roots: MigrationRoots,
  syncCalls: SyncCall[],
  overrides: {
    copyDirectory?: (
      source: string,
      destination: string,
      force: boolean,
    ) => Promise<unknown>;
    sync?: (input: MigrationSyncInput) => Promise<void>;
  } = {},
): Promise<PackMigrationOutcome> {
  const destinationRoot = roots[preview.to];
  return executeMigrationDestination(preview, destinationRoot, {
    acquireDependencies: async () =>
      reconcilePackDependencyLifecycles({
        pack: preview.pack,
        scope: preview.to,
        scopeRoot: destinationRoot,
        assetsRoot: roots.assets,
        action: 'migrate-destination',
      }),
    applyDependencies: {
      copyDirectory: overrides.copyDirectory ?? copyDirWithStatus,
      copyFile: copyFileWithStatus,
      chmodPath: chmod,
      writeGenerated: async (operation) =>
        writeGenerated(destinationRoot, operation),
      writeIntent: async (operation) =>
        writeScopedPackIntent({
          pack: operation.pack,
          scope: operation.scope,
          scopeRoot: destinationRoot,
          enabled: operation.enabled,
        }),
      inventory: async () => inventoryAt(preview.pack, preview.to, roots),
    },
    sync:
      overrides.sync ??
      (async ({ scope, action, canonicalPaths }) => {
        syncCalls.push({ scope, action, paths: canonicalPaths });
      }),
  });
}

async function removeSource(
  destination: PackMigrationOutcome,
  roots: MigrationRoots,
  syncCalls: SyncCall[],
  confirmation: 'confirmed' | 'declined' | 'non-interactive',
  removePath?: (path: string, directory: boolean) => Promise<void>,
  syncOverride?: (input: MigrationSyncInput) => Promise<void>,
): Promise<PackMigrationOutcome> {
  const preview = destination.preview;
  const sourceRoot = roots[preview.from];
  return completeMigrationSourceRemoval(
    destination,
    { confirmation, sourceRoot, assetsRoot: roots.assets },
    {
      releaseDependencies: async () =>
        reconcilePackDependencyLifecycles({
          pack: preview.pack,
          scope: preview.from,
          scopeRoot: sourceRoot,
          assetsRoot: roots.assets,
          action: 'remove',
        }),
      inventory: async () => inventoryAt(preview.pack, preview.from, roots),
      applyDependencies: {
        removePath,
        writeGenerated: async (operation) =>
          writeGenerated(sourceRoot, operation),
        writeIntent: async (operation) =>
          writeScopedPackIntent({
            pack: operation.pack,
            scope: operation.scope,
            scopeRoot: sourceRoot,
            enabled: operation.enabled,
          }),
      },
      resolveSourceRetentions: async () =>
        resolveSharedOwnerRetentions({
          packs: [preview.pack],
          scope: preview.from,
          scopeRoot: sourceRoot,
          hasOwnershipEvidence: async (owner, scope, scopeRoot) =>
            hasScopedPackOwnershipEvidence({ pack: owner, scope, scopeRoot }),
        }),
      sync:
        syncOverride ??
        (async ({ scope, action, canonicalPaths }) => {
          syncCalls.push({ scope, action, paths: canonicalPaths });
        }),
    },
  );
}

async function createRoots(
  projectPrefix = 'oat-migrate-project-',
): Promise<MigrationRoots> {
  const project = await temporaryRoot(projectPrefix);
  const user = await temporaryRoot('oat-migrate-user-');
  await mkdir(join(project, '.git'), { recursive: true });
  return { project, user, assets: await resolveAssetsRoot() };
}

describe('pack migration integration', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryRoots.map((root) => rm(root, { recursive: true, force: true })),
    );
    temporaryRoots.length = 0;
  });

  it('moves project to user from the release manifest, including a member absent at source', async () => {
    const roots = await createRoots();
    const syncCalls: SyncCall[] = [];
    await installSource('ideas', 'project', roots);
    const releaseMember = join(
      roots.project,
      '.agents',
      'skills',
      'oat-idea-scratchpad',
    );
    await rm(releaseMember, { recursive: true, force: true });

    const preview = await previewMigration('ideas', 'project', 'user', roots);
    expect(preview.additions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assetId: 'skill:oat-idea-scratchpad' }),
      ]),
    );
    const destination = await installDestination(preview, roots, syncCalls);
    const result = await removeSource(
      destination,
      roots,
      syncCalls,
      'confirmed',
    );

    expect(result.status).toBe('migrated');
    await expect(pathExists(releaseMember)).resolves.toBe(false);
    await expect(
      pathExists(join(roots.user, '.agents', 'skills', 'oat-idea-scratchpad')),
    ).resolves.toBe(true);
    await expect(inventoryAt('ideas', 'user', roots)).resolves.toMatchObject({
      completeness: 'complete',
      intent: { enabled: true, source: 'declared' },
    });
    await expect(inventoryAt('ideas', 'project', roots)).resolves.toMatchObject(
      { completeness: 'absent', intent: { enabled: false } },
    );
    expect(syncCalls).toEqual([
      expect.objectContaining({ scope: 'user', action: 'install' }),
      expect.objectContaining({ scope: 'project', action: 'remove' }),
    ]);
    expect(syncCalls.flatMap(({ paths }) => paths)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^\.oat\/templates/)]),
    );
  });

  it('preserves defaultScope while migration backfills the destination projects root', async () => {
    const roots = await createRoots();
    const syncCalls: SyncCall[] = [];
    await installSource('workflows', 'user', roots);
    await writeOatConfig(roots.project, {
      version: 1,
      projects: { defaultScope: 'local' },
    });

    const preview = await previewMigration(
      'workflows',
      'user',
      'project',
      roots,
    );
    expect(preview.destinationPlan.operations).toContainEqual(
      expect.objectContaining({
        kind: 'write-generated',
        generation: 'projects-config-default',
      }),
    );
    await installDestination(preview, roots, syncCalls);

    await expect(readOatConfig(roots.project)).resolves.toMatchObject({
      projects: {
        root: '.oat/projects/shared',
        defaultScope: 'local',
      },
    });
  });

  it('moves user to project and a declined removal retains a valid combined install', async () => {
    const roots = await createRoots();
    const syncCalls: SyncCall[] = [];
    await installSource('research', 'user', roots);
    let preview = await previewMigration('research', 'user', 'project', roots);
    let destination = await installDestination(preview, roots, syncCalls);
    const retained = await removeSource(
      destination,
      roots,
      syncCalls,
      'declined',
    );

    expect(retained.status).toBe('retained-both');
    await expect(inventoryAt('research', 'user', roots)).resolves.toMatchObject(
      { completeness: 'complete', intent: { enabled: true } },
    );
    await expect(
      inventoryAt('research', 'project', roots),
    ).resolves.toMatchObject({
      completeness: 'complete',
      intent: { enabled: true },
    });

    preview = await previewMigration('research', 'user', 'project', roots);
    destination = await installDestination(preview, roots, syncCalls);
    const completed = await removeSource(
      destination,
      roots,
      syncCalls,
      'confirmed',
    );
    expect(completed.status).toBe('migrated');
    await expect(inventoryAt('research', 'user', roots)).resolves.toMatchObject(
      { completeness: 'absent', intent: { enabled: false } },
    );
  });

  it('preserves repository-owned PJM template data while moving capability to user scope', async () => {
    const roots = await createRoots();
    const syncCalls: SyncCall[] = [];
    const ownerTemplate = join(
      roots.project,
      '.oat',
      'templates',
      'roadmap.md',
    );
    await mkdir(dirname(ownerTemplate), { recursive: true });
    await writeFile(ownerTemplate, 'repository-owned roadmap\n', 'utf8');
    await installSource('project-management', 'project', roots);

    const preview = await previewMigration(
      'project-management',
      'project',
      'user',
      roots,
    );
    expect(preview.retained).toContainEqual(
      expect.objectContaining({ path: ownerTemplate }),
    );
    const destination = await installDestination(preview, roots, syncCalls);
    const result = await removeSource(
      destination,
      roots,
      syncCalls,
      'confirmed',
    );

    expect(result.status).toBe('migrated');
    await expect(readFile(ownerTemplate, 'utf8')).resolves.toBe(
      'repository-owned roadmap\n',
    );
    await expect(
      readFile(join(roots.user, '.oat', 'templates', 'roadmap.md'), 'utf8'),
    ).resolves.not.toBe('repository-owned roadmap\n');
  });

  it.each([
    ['project', 'user', 'docs', 'workflows', 'declared'],
    ['project', 'user', 'workflows', 'docs', 'inferred-legacy'],
    ['user', 'project', 'docs', 'workflows', 'inferred-legacy'],
    ['user', 'project', 'workflows', 'docs', 'declared'],
  ] as const)(
    'moves %s to %s for %s while retaining %s shared ownership from %s evidence',
    async (from, to, selected, owner, evidence) => {
      const roots = await createRoots();
      const syncCalls: SyncCall[] = [];
      await installSource(selected, from, roots);
      await installSource(owner, from, roots);
      if (evidence === 'inferred-legacy') {
        await writeScopedPackIntent({
          pack: owner,
          scope: from,
          scopeRoot: roots[from],
          enabled: false,
        });
      }
      const sharedPath = join(
        roots[from],
        '.oat',
        'scripts',
        'resolve-tracking.sh',
      );
      const preview = await previewMigration(selected, from, to, roots);
      expect(preview.retained).toContainEqual(
        expect.objectContaining({
          assetId: 'script:resolve-tracking.sh',
          path: sharedPath,
          scope: from,
        }),
      );
      const destination = await installDestination(preview, roots, syncCalls);
      const result = await removeSource(
        destination,
        roots,
        syncCalls,
        'confirmed',
      );

      expect(result.status).toBe('migrated');
      await expect(pathExists(sharedPath)).resolves.toBe(true);
      await expect(inventoryAt(selected, from, roots)).resolves.toMatchObject({
        completeness: 'partial',
        intent: { enabled: false },
      });
      await expect(inventoryAt(owner, from, roots)).resolves.toMatchObject({
        completeness: 'complete',
        intent: { source: evidence },
      });
      await expect(inventoryAt(selected, to, roots)).resolves.toMatchObject({
        completeness: 'complete',
        intent: { enabled: true, source: 'declared' },
      });
    },
  );

  it.each([
    ['project', 'user'],
    ['user', 'project'],
  ] as const)(
    'adopts a physically complete legacy-false destination from %s to %s only after verification',
    async (from, to) => {
      const roots = await createRoots();
      const syncCalls: SyncCall[] = [];
      await installSource('ideas', from, roots);
      await installSource('ideas', to, roots);
      await writeLegacyFalse('ideas', to, roots);
      const preview = await previewMigration('ideas', from, to, roots);
      expect(preview).toMatchObject({
        status: 'ready',
        diagnostics: [
          expect.objectContaining({ code: 'legacy-false-conflict' }),
        ],
      });
      const destination = await installDestination(preview, roots, syncCalls);
      expect(destination.status).toBe('destination-verified');
      await expect(inventoryAt('ideas', to, roots)).resolves.toMatchObject({
        completeness: 'complete',
        intent: { enabled: true, source: 'declared' },
      });
      await expect(inventoryAt('ideas', from, roots)).resolves.toMatchObject({
        completeness: 'complete',
        intent: { enabled: true },
      });
    },
  );

  it('executes destination sync recovery from an unrelated cwd using the resolved project root', async () => {
    const roots = await createRoots("oat migrate project's destination-");
    const runtime = await prepareRecoveryCommandRuntime(roots.project);
    const syncCalls: SyncCall[] = [];
    await installSource('ideas', 'user', roots);
    const preview = await previewMigration('ideas', 'user', 'project', roots);
    const failed = await installDestination(preview, roots, syncCalls, {
      sync: async () => {
        throw new Error('injected destination provider sync failure');
      },
    });

    expect(failed).toMatchObject({
      status: 'destination-sync-failed',
      pendingSync: {
        scope: 'project',
        action: 'install',
        projectRoot: roots.project,
      },
    });
    expect(failed.pendingSync?.command).toMatch(/^oat --cwd '/);
    expect(failed.recovery).toContainEqual(
      expect.stringContaining(
        'tools migrate --pack ideas --from user --to project',
      ),
    );
    await executeRecoveryCommand(failed.pendingSync!.command, runtime);

    await expect(
      pathExists(
        join(roots.project, '.claude', 'skills', 'oat-idea-new', 'SKILL.md'),
      ),
    ).resolves.toBe(true);
    await expect(inventoryAt('ideas', 'user', roots)).resolves.toMatchObject({
      completeness: 'complete',
      intent: { enabled: true },
    });
  }, 20_000);

  it('executes source sync recovery from an unrelated cwd without repeating canonical removal', async () => {
    const roots = await createRoots("oat migrate project's source-");
    const runtime = await prepareRecoveryCommandRuntime(roots.project);
    const syncCalls: SyncCall[] = [];
    await installSource('ideas', 'project', roots);
    await executeRecoveryCommand(
      `oat --cwd ${quotePosixArgument(roots.project)} sync --scope project --install-canonical .agents/skills/oat-idea-new`,
      runtime,
    );
    const providerSkill = join(
      roots.project,
      '.claude',
      'skills',
      'oat-idea-new',
    );
    await expect(pathExists(providerSkill)).resolves.toBe(true);

    const preview = await previewMigration('ideas', 'project', 'user', roots);
    const destination = await installDestination(preview, roots, syncCalls);
    let removalCount = 0;
    const failed = await removeSource(
      destination,
      roots,
      syncCalls,
      'confirmed',
      async (path, directory) => {
        removalCount += 1;
        await rm(path, { recursive: directory, force: true });
      },
      async () => {
        throw new Error('injected source provider sync failure');
      },
    );
    const removalsBeforeRecovery = removalCount;

    expect(failed).toMatchObject({
      status: 'source-sync-failed',
      pendingSync: {
        scope: 'project',
        action: 'remove',
        projectRoot: roots.project,
      },
    });
    expect(failed.pendingSync?.command).toMatch(/^oat --cwd '/);
    await expect(pathExists(providerSkill)).resolves.toBe(true);
    await executeRecoveryCommand(failed.pendingSync!.command, runtime);

    await expect(pathExists(providerSkill)).resolves.toBe(false);
    expect(removalCount).toBe(removalsBeforeRecovery);
    await expect(inventoryAt('ideas', 'project', roots)).resolves.toMatchObject(
      { completeness: 'absent', intent: { enabled: false } },
    );
  }, 20_000);

  it('keeps source authoritative across destination failure and recovers partial source removal on rerun', async () => {
    const roots = await createRoots();
    const syncCalls: SyncCall[] = [];
    await installSource('ideas', 'project', roots);
    const sourceSkill = join(
      roots.project,
      '.agents',
      'skills',
      'oat-idea-new',
      'SKILL.md',
    );
    const sourceBefore = await readFile(sourceSkill, 'utf8');
    const preview = await previewMigration('ideas', 'project', 'user', roots);

    await expect(
      installDestination(preview, roots, syncCalls, {
        copyDirectory: async () => {
          throw new Error('injected destination copy failure');
        },
      }),
    ).rejects.toThrow(/destination copy failure/);
    await expect(readFile(sourceSkill, 'utf8')).resolves.toBe(sourceBefore);
    await expect(
      readScopedPackIntent({
        pack: 'ideas',
        scope: 'project',
        scopeRoot: roots.project,
      }),
    ).resolves.toMatchObject({ enabled: true, source: 'declared' });

    const freshPreview = await previewMigration(
      'ideas',
      'project',
      'user',
      roots,
    );
    const destination = await installDestination(
      freshPreview,
      roots,
      syncCalls,
    );
    let removalCount = 0;
    const failed = await removeSource(
      destination,
      roots,
      syncCalls,
      'confirmed',
      async (path, directory) => {
        removalCount += 1;
        if (removalCount === 2)
          throw new Error('injected partial removal failure');
        await rm(path, { recursive: directory, force: true });
      },
    );
    expect(failed).toMatchObject({
      status: 'source-removal-failed',
      destinationInventory: { completeness: 'complete' },
      sourceInventory: {
        completeness: 'partial',
        intent: { enabled: true, source: 'declared' },
      },
    });

    const retried = await removeSource(failed, roots, syncCalls, 'confirmed');
    expect(retried.status).toBe('migrated');
    await expect(inventoryAt('ideas', 'project', roots)).resolves.toMatchObject(
      { completeness: 'absent', intent: { enabled: false } },
    );
    await expect(inventoryAt('ideas', 'user', roots)).resolves.toMatchObject({
      completeness: 'complete',
      intent: { enabled: true },
    });
  });

  it('cleans released dependency provider paths before retrying a failed source root apply', async () => {
    const roots = await createRoots();
    const syncCalls: SyncCall[] = [];
    await installSource('research', 'project', roots);
    const preview = await previewMigration(
      'research',
      'project',
      'user',
      roots,
    );
    const destination = await installDestination(preview, roots, syncCalls);
    const failed = await removeSource(
      destination,
      roots,
      syncCalls,
      'confirmed',
      async () => {
        throw new Error('injected source root apply failure');
      },
    );

    expect(failed).toMatchObject({
      status: 'source-removal-failed',
      sourceInventory: {
        completeness: 'complete',
        intent: { direct: true },
      },
    });
    expect(failed.recovery).toContainEqual(
      expect.stringContaining(
        'tools migrate --pack research --from project --to user',
      ),
    );
    const dependencyPaths = [
      '.agents/skills/oat-dispatch-subagents',
      '.agents/skills/subagent-orchestration',
    ];
    expect(
      syncCalls
        .filter(
          ({ scope, action }) => scope === 'project' && action === 'remove',
        )
        .flatMap(({ paths }) => paths),
    ).toEqual(expect.arrayContaining(dependencyPaths));

    const recovered = await removeSource(failed, roots, syncCalls, 'confirmed');
    expect(recovered.status).toBe('migrated');
    expect(
      syncCalls
        .filter(
          ({ scope, action }) => scope === 'project' && action === 'remove',
        )
        .at(-1)?.paths,
    ).toEqual(expect.arrayContaining(dependencyPaths));
    await expect(
      inventoryAt('research', 'project', roots),
    ).resolves.toMatchObject({
      completeness: 'absent',
      intent: { direct: false },
    });
  });
});
