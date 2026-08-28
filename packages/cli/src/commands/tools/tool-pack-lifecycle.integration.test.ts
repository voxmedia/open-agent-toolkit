import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';
import {
  hasScopedPackPlacementEvidence,
  inventoryPack,
  inventoryScopedPack,
  type ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import {
  reconcilePackLifecycle,
  type PackLifecycleResult,
} from '@commands/tools/shared/pack-lifecycle';
import {
  getPackDefinition,
  PACK_NAMES,
} from '@commands/tools/shared/pack-manifest';
import type { PackName } from '@commands/tools/shared/types';
import { readOatConfig, readUserConfig } from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';
import type { ConcreteScope } from '@shared/types';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const temporaryRoots: string[] = [];

let assetsRoot: string;

beforeAll(async () => {
  assetsRoot = await resolveAssetsRoot();
});

afterEach(async () => {
  await Promise.all(
    temporaryRoots.map((root) => rm(root, { recursive: true, force: true })),
  );
  temporaryRoots.length = 0;
});

interface LifecycleRoots {
  project: string;
  user: string;
}

/**
 * Reusable temp-root fixture. Roots are plain directories with no Git
 * metadata, so every user-scope assertion in this file also proves the
 * lifecycle never depends on a repository.
 */
async function createRoots(
  prefix = 'oat-pack-lifecycle',
): Promise<LifecycleRoots> {
  const [project, user] = await Promise.all([
    mkdtemp(join(tmpdir(), `${prefix}-project-`)),
    mkdtemp(join(tmpdir(), `${prefix}-user-`)),
  ]);
  temporaryRoots.push(project, user);
  return { project, user };
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
    ) {
      return false;
    }
    throw error;
  }
}

async function run(
  pack: PackName,
  scope: ConcreteScope,
  roots: LifecycleRoots,
  action: 'install' | 'update' | 'remove',
  options: { dryRun?: boolean } = {},
): Promise<PackLifecycleResult> {
  return reconcilePackLifecycle(
    { pack, scope, scopeRoot: roots[scope], assetsRoot, action },
    options,
  );
}

async function inventoryAt(
  pack: PackName,
  scope: ConcreteScope,
  roots: LifecycleRoots,
): Promise<ScopedPackInventory> {
  return inventoryScopedPack({
    pack,
    scope,
    scopeRoot: roots[scope],
    assetsRoot,
  });
}

function managedAssets(
  inventory: ScopedPackInventory,
): ScopedPackInventory['assets'] {
  return inventory.assets.filter(
    ({ definition }) => definition.ownership[inventory.scope] === 'managed',
  );
}

async function readIntent(
  pack: PackName,
  scope: ConcreteScope,
  roots: LifecycleRoots,
): Promise<boolean | undefined> {
  const config =
    scope === 'project'
      ? await readOatConfig(roots.project)
      : await readUserConfig(join(roots.user, '.oat'));
  return config.tools?.[pack];
}

interface RunCliOptions {
  /**
   * Exit code for the provider-sync subprocess. `oat tools install`, `remove`,
   * and `migrate` all re-enter the CLI out of process through
   * `process.argv[1]`, which under vitest points at the test runner. Pointing
   * it at a stub keeps every production command path intact while making sync
   * deterministic, and lets a test inject a sync failure without touching the
   * command's own dependencies.
   */
  syncExitCode?: number;
}

async function createSyncStub(exitCode: number): Promise<string> {
  const stubRoot = await mkdtemp(join(tmpdir(), 'oat-pack-lifecycle-sync-'));
  temporaryRoots.push(stubRoot);
  const stub = join(stubRoot, 'sync-stub.cjs');
  await writeFile(stub, `process.exit(${exitCode});\n`, 'utf8');
  return stub;
}

async function runCli(
  cwd: string,
  home: string,
  args: string[],
  options: RunCliOptions = {},
): Promise<number> {
  const program = createProgram();
  registerCommands(program);
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const originalEntryPoint = process.argv[1];
  const previousExitCode = process.exitCode;
  const previousHome = process.env.HOME;
  process.exitCode = undefined;
  process.env.HOME = home;
  process.argv[1] = await createSyncStub(options.syncExitCode ?? 0);
  (process.stdout.write as unknown as (chunk: unknown) => boolean) = () => true;
  (process.stderr.write as unknown as (chunk: unknown) => boolean) = () => true;
  try {
    await program.parseAsync(['--cwd', cwd, ...args], { from: 'user' });
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    process.argv[1] = originalEntryPoint;
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
  }
  const exitCode = process.exitCode ?? 0;
  process.exitCode = previousExitCode;
  return exitCode;
}

async function removeViaCli(
  pack: PackName,
  scope: ConcreteScope,
  roots: LifecycleRoots,
): Promise<number> {
  return runCli(roots.project, roots.user, [
    'tools',
    'remove',
    '--pack',
    pack,
    '--scope',
    scope,
    '--no-sync',
  ]);
}

describe('tool pack lifecycle acceptance matrix', () => {
  describe.each(PACK_NAMES)('%s', (pack) => {
    const definition = getPackDefinition(pack);

    it.each(definition.allowedScopes)(
      'installs completely at %s scope from a fresh root',
      async (scope) => {
        const roots = await createRoots();

        const result = await run(pack, scope, roots, 'install');
        expect(result.plan.expectedCompleteness).toBe('complete');

        const inventory = await inventoryAt(pack, scope, roots);
        expect(inventory.completeness).toBe('complete');
        expect(inventory.intent.enabled).toBe(true);
        expect(inventory.intent.source).toBe('declared');
        expect(await readIntent(pack, scope, roots)).toBe(true);

        // Every managed asset the current release declares is present at the
        // manifest-declared destination for this scope.
        for (const asset of managedAssets(inventory)) {
          expect(asset.status).not.toBe('missing');
          expect(
            await pathExists(join(roots[scope], asset.definition.destination)),
          ).toBe(true);
        }
      },
    );

    it('is a no-op when reinstalled at its default scope', async () => {
      const roots = await createRoots();
      const scope = definition.defaultScope;

      await run(pack, scope, roots, 'install');
      const second = await run(pack, scope, roots, 'install');

      // Intent is already declared and every asset is byte-identical, so the
      // only work left is nothing at all.
      expect(
        second.plan.operations.filter(
          (operation) =>
            operation.kind !== 'chmod' && operation.kind !== 'write-intent',
        ),
      ).toEqual([]);
      expect(second.plan.changedCanonicalPaths).toEqual([]);
      expect((await inventoryAt(pack, scope, roots)).completeness).toBe(
        'complete',
      );
    });

    it('repairs a fully missing install from declared intent', async () => {
      const roots = await createRoots();
      const scope = definition.defaultScope;
      await run(pack, scope, roots, 'install');

      const before = await inventoryAt(pack, scope, roots);
      for (const asset of managedAssets(before)) {
        await rm(join(roots[scope], asset.definition.destination), {
          recursive: true,
          force: true,
        });
      }
      const emptied = await inventoryAt(pack, scope, roots);
      expect(emptied.completeness).toBe('absent');
      // Intent survives the missing files, so the pack is repairable.
      expect(emptied.intent.enabled).toBe(true);

      await run(pack, scope, roots, 'update');
      expect((await inventoryAt(pack, scope, roots)).completeness).toBe(
        'complete',
      );
    });

    it('reconciles a partial install to current release membership', async () => {
      const roots = await createRoots();
      const scope = definition.defaultScope;
      await run(pack, scope, roots, 'install');

      const installed = await inventoryAt(pack, scope, roots);
      const dropped = managedAssets(installed).at(-1)!;
      await rm(join(roots[scope], dropped.definition.destination), {
        recursive: true,
        force: true,
      });

      const partial = await inventoryAt(pack, scope, roots);
      expect(partial.completeness).toBe(
        managedAssets(installed).length === 1 ? 'absent' : 'partial',
      );

      await run(pack, scope, roots, 'update');
      const repaired = await inventoryAt(pack, scope, roots);
      expect(repaired.completeness).toBe('complete');
      expect(
        await pathExists(join(roots[scope], dropped.definition.destination)),
      ).toBe(true);
    });

    it('refreshes an installed managed skill whose content is stale', async () => {
      const roots = await createRoots();
      const scope = definition.defaultScope;
      await run(pack, scope, roots, 'install');

      const installed = await inventoryAt(pack, scope, roots);
      // Every pack declares at least one managed skill; a manifest change that
      // broke that would fail here rather than skipping the test silently.
      const skill = managedAssets(installed).find(
        ({ definition: asset }) => asset.kind === 'skill',
      )!;
      expect(skill).toBeDefined();

      // Simulate an installed asset left behind by an older release: same path,
      // older declared version, drifted body. This is the state `update` must
      // reconcile, and it is distinct from the deleted-asset repair case.
      const installedSkillFile = join(
        roots[scope],
        skill.definition.destination,
        'SKILL.md',
      );
      const bundledSkillFile = join(
        assetsRoot,
        skill.definition.source!,
        'SKILL.md',
      );
      const bundled = await readFile(bundledSkillFile, 'utf8');
      await writeFile(
        installedSkillFile,
        `${bundled.replace(/^version:.*$/m, 'version: 0.0.1')}\nstale body\n`,
        'utf8',
      );

      const stale = await inventoryAt(pack, scope, roots);
      expect(
        stale.assets.find(
          ({ definition: asset }) => asset.id === skill.definition.id,
        ),
      ).toMatchObject({ status: 'outdated', installedVersion: '0.0.1' });

      await run(pack, scope, roots, 'update');

      // Content refresh, not just presence: the on-disk file must match the
      // bundled asset byte for byte and the inventory must clear `outdated`.
      await expect(readFile(installedSkillFile, 'utf8')).resolves.toBe(bundled);
      const refreshed = await inventoryAt(pack, scope, roots);
      expect(
        refreshed.assets.find(
          ({ definition: asset }) => asset.id === skill.definition.id,
        ),
      ).toMatchObject({ status: 'current' });
      expect(
        refreshed.assets.filter(({ status }) => status === 'outdated'),
      ).toEqual([]);
    });

    it('removes only manifest-managed assets and deletes scoped intent', async () => {
      const roots = await createRoots();
      const scope = definition.defaultScope;
      await run(pack, scope, roots, 'install');

      const installed = await inventoryAt(pack, scope, roots);
      const seeded = installed.assets.filter(
        ({ definition: asset }) => asset.ownership[scope] === 'seed-if-missing',
      );

      // Removal is driven through the real `oat tools remove` command, which
      // runs `removeTools` plus `writeScopedPackIntent`. The lifecycle
      // reconcile plan is a different code path, used only by migration.
      expect(await removeViaCli(pack, scope, roots)).toBe(0);

      const removed = await inventoryAt(pack, scope, roots);
      expect(removed.completeness).toBe('absent');
      // Intent is deleted, never rewritten as false.
      expect(await readIntent(pack, scope, roots)).toBeUndefined();
      expect(removed.intent.enabled).toBe(false);
      expect(removed.intent.source).toBe('none');

      // Owner-owned seeds and overrides survive removal.
      for (const asset of seeded) {
        expect(
          await pathExists(join(roots[scope], asset.definition.destination)),
        ).toBe(true);
      }
    });
  });

  it('reports duplicate cross-scope installs without inferring precedence', async () => {
    const roots = await createRoots();
    await run('ideas', 'project', roots, 'install');
    await run('ideas', 'user', roots, 'install');

    const inventory = await inventoryPack({
      pack: 'ideas',
      assetsRoot,
      projectRoot: roots.project,
      userRoot: roots.user,
    });

    expect(inventory.placement).toBe('both');
    expect(inventory.scopes.every(hasScopedPackPlacementEvidence)).toBe(true);
    const duplicate = inventory.diagnostics.find(
      ({ code }) => code === 'duplicate-scope',
    );
    expect(duplicate).toBeDefined();
    expect(duplicate!.message).toContain('provider precedence is not inferred');
    expect(
      duplicate!.paths.some((path) => path.startsWith(roots.project)),
    ).toBe(true);
    expect(duplicate!.paths.some((path) => path.startsWith(roots.user))).toBe(
      true,
    );
  });

  /**
   * Migration legs drive the registered `oat tools migrate` command, which owns
   * the FR8 ordering: plan, install and verify the destination, and only then
   * release the source. The lifecycle reconcile helper is deliberately not used
   * here — hand-coding install-then-remove would assert an ordering the test
   * itself performed rather than one production guarantees.
   */
  async function migrateViaCli(
    pack: PackName,
    from: ConcreteScope,
    to: ConcreteScope,
    roots: LifecycleRoots,
    options: RunCliOptions = {},
  ): Promise<number> {
    return runCli(
      roots.project,
      roots.user,
      ['tools', 'migrate', '--pack', pack, '--from', from, '--to', to],
      options,
    );
  }

  async function createMigrationRoots(): Promise<LifecycleRoots> {
    const roots = await createRoots();
    // `--from/--to project` resolves the project root from Git.
    await mkdir(join(roots.project, '.git'), { recursive: true });
    return roots;
  }

  it('verifies the destination and never removes the source non-interactively', async () => {
    const roots = await createMigrationRoots();
    await run('research', 'project', roots, 'install');

    const exitCode = await migrateViaCli('research', 'project', 'user', roots);
    // FR8: source removal requires interactive confirmation, so a
    // non-interactive migration verifies the destination and retains both.
    expect(exitCode).toBe(1);

    const destination = await inventoryAt('research', 'user', roots);
    expect(destination.completeness).toBe('complete');
    expect(destination.intent.source).toBe('declared');
    expect(await readIntent('research', 'user', roots)).toBe(true);

    const source = await inventoryAt('research', 'project', roots);
    expect(source.completeness).toBe('complete');
    expect(await readIntent('research', 'project', roots)).toBe(true);
  });

  it('retains the source when destination provider sync fails', async () => {
    const roots = await createMigrationRoots();
    await run('research', 'project', roots, 'install');

    // Failure injection: the destination sync subprocess exits non-zero, so
    // `executeMigrationDestination` returns `destination-sync-failed` before
    // any source removal is attempted.
    const exitCode = await migrateViaCli('research', 'project', 'user', roots, {
      syncExitCode: 1,
    });
    expect(exitCode).toBe(2);

    const source = await inventoryAt('research', 'project', roots);
    expect(source.completeness).toBe('complete');
    expect(source.intent.source).toBe('declared');
    expect(await readIntent('research', 'project', roots)).toBe(true);
  });

  it('blocks migration on a newer destination asset and leaves the source intact', async () => {
    const roots = await createMigrationRoots();
    await run('research', 'project', roots, 'install');
    await run('research', 'user', roots, 'install');

    // Failure injection: a destination asset ahead of the bundle is a conflict,
    // so the migration is blocked before it mutates anything.
    const conflicted = (
      await inventoryAt('research', 'user', roots)
    ).assets.find(({ definition }) => definition.kind === 'agent')!;
    const conflictPath = join(roots.user, conflicted.definition.destination);
    await writeFile(
      conflictPath,
      '---\nname: skeptical-evaluator\nversion: 999.0.0\n---\n',
      'utf8',
    );

    const exitCode = await migrateViaCli('research', 'project', 'user', roots);
    expect(exitCode).toBe(1);

    const source = await inventoryAt('research', 'project', roots);
    expect(source.completeness).toBe('complete');
    expect(await readIntent('research', 'project', roots)).toBe(true);
    // The blocked run wrote nothing at the destination either.
    await expect(readFile(conflictPath, 'utf8')).resolves.toContain(
      'version: 999.0.0',
    );
  });

  it('preserves PJM owner data across update, removal, and reinstall', async () => {
    const roots = await createRoots();
    // `oat tools remove --scope project` resolves the project root from Git, so
    // this leg needs a repository marker even though nothing reads Git content.
    await mkdir(join(roots.project, '.git'), { recursive: true });
    await run('project-management', 'project', roots, 'install');

    const inventory = await inventoryAt('project-management', 'project', roots);
    const override = inventory.assets.find(
      ({ definition }) => definition.ownership.project === 'seed-if-missing',
    )!;
    const overridePath = join(roots.project, override.definition.destination);
    await writeFile(overridePath, '# repository owned template\n', 'utf8');

    await run('project-management', 'project', roots, 'update');
    await expect(readFile(overridePath, 'utf8')).resolves.toBe(
      '# repository owned template\n',
    );

    // Removal runs through the production command so the owner-data guarantee
    // is asserted against `removeTools`, not the migrate-internal plan.
    expect(await removeViaCli('project-management', 'project', roots)).toBe(0);
    await expect(readFile(overridePath, 'utf8')).resolves.toBe(
      '# repository owned template\n',
    );

    await run('project-management', 'project', roots, 'install');
    await expect(readFile(overridePath, 'utf8')).resolves.toBe(
      '# repository owned template\n',
    );
  });

  it('keeps the managed user default independent of a repository override', async () => {
    const roots = await createRoots();
    await run('project-management', 'project', roots, 'install');
    await run('project-management', 'user', roots, 'install');

    const projectInventory = await inventoryAt(
      'project-management',
      'project',
      roots,
    );
    const override = projectInventory.assets.find(
      ({ definition }) => definition.ownership.project === 'seed-if-missing',
    )!;
    const overridePath = join(roots.project, override.definition.destination);
    await writeFile(overridePath, '# repository owned template\n', 'utf8');

    const userInventory = await inventoryAt(
      'project-management',
      'user',
      roots,
    );
    const managedDefault = userInventory.assets.find(
      ({ definition }) => definition.id === override.definition.id,
    )!;
    expect(managedDefault.definition.ownership.user).toBe('managed');
    expect(managedDefault.status).toBe('current');
    await expect(
      readFile(join(roots.user, managedDefault.definition.destination), 'utf8'),
    ).resolves.not.toBe('# repository owned template\n');
  });

  it('retains a shared script while another installed pack still owns it', async () => {
    const roots = await createRoots();
    await run('docs', 'user', roots, 'install');
    await run('workflows', 'user', roots, 'install');

    const sharedPath = join(
      roots.user,
      '.oat',
      'scripts',
      'resolve-tracking.sh',
    );
    expect(await pathExists(sharedPath)).toBe(true);

    // Shared-owner retention is resolved by the `oat tools remove` command
    // path, so the acceptance check runs the real command.
    expect(
      await runCli(roots.project, roots.user, [
        'tools',
        'remove',
        '--pack',
        'docs',
        '--scope',
        'user',
        '--no-sync',
      ]),
    ).toBe(0);
    expect(await pathExists(sharedPath)).toBe(true);
    expect(await readIntent('docs', 'user', roots)).toBeUndefined();
    expect((await inventoryAt('workflows', 'user', roots)).completeness).toBe(
      'complete',
    );

    expect(
      await runCli(roots.project, roots.user, [
        'tools',
        'remove',
        '--pack',
        'workflows',
        '--scope',
        'user',
        '--no-sync',
      ]),
    ).toBe(0);
    expect(await pathExists(sharedPath)).toBe(false);
    expect(await readIntent('workflows', 'user', roots)).toBeUndefined();
  });

  it('installs at user scope from a directory that is not a Git repository', async () => {
    const roots = await createRoots('oat-pack-lifecycle-nogit');
    expect(await pathExists(join(roots.project, '.git'))).toBe(false);

    const exitCode = await runCli(roots.project, roots.user, [
      'tools',
      'install',
      'ideas',
      '--scope',
      'user',
    ]);
    expect(exitCode).toBe(0);

    const inventory = await inventoryAt('ideas', 'user', roots);
    expect(inventory.completeness).toBe('complete');
    expect(await readIntent('ideas', 'user', roots)).toBe(true);

    // No repository state is written by a user-only install.
    expect(await pathExists(join(roots.project, '.oat', 'config.json'))).toBe(
      false,
    );
    expect(await pathExists(join(roots.project, '.agents'))).toBe(false);
  });

  it('previews a dry-run install without touching the filesystem', async () => {
    const roots = await createRoots();

    const planned = await run('brainstorm', 'user', roots, 'install', {
      dryRun: true,
    });
    expect(planned.apply).toBeNull();
    expect(planned.plan.operations.length).toBeGreaterThan(0);

    const inventory = await inventoryAt('brainstorm', 'user', roots);
    expect(inventory.completeness).toBe('absent');
    expect(await readIntent('brainstorm', 'user', roots)).toBeUndefined();
    expect(await pathExists(join(roots.user, '.agents'))).toBe(false);
  });

  it('rejects a scope the pack does not allow', async () => {
    const roots = await createRoots();
    await mkdir(join(roots.project, '.oat'), { recursive: true });

    await expect(run('core', 'project', roots, 'install')).rejects.toThrow(
      /does not allow project scope/,
    );
  });
});
