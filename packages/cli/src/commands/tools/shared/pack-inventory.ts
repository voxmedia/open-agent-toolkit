import { lstat } from 'node:fs/promises';
import { join } from 'node:path';

import { compareVersions } from '@commands/init/tools/shared/version';
import { getAgentVersion, getSkillVersion } from '@commands/shared/frontmatter';
import {
  type ManagedRootName,
  type ResolvedManagedRoot,
  resolveManagedScopeRoots,
  validateManagedPath,
} from '@fs/paths';
import type { ConcreteScope } from '@shared/types';

import { digestDirectory, digestFile } from './content-digest';
import { getPackDefinition } from './pack-manifest';
import {
  type PackIntentDiagnostic,
  type ScopedPackIntent,
  readScopedPackIntent,
} from './scoped-pack-intent';
import type {
  PackAssetDefinition,
  PackAssetStatus,
  PackCompleteness,
  PackName,
} from './types';

export interface PackAssetInventory {
  definition: PackAssetDefinition;
  path: string;
  status: PackAssetStatus;
  installedVersion: string | null;
  bundledVersion: string | null;
}

export interface PackDiagnostic {
  code:
    | 'legacy-false-conflict'
    | 'duplicate-scope'
    | 'shared-owner-observation';
  message: string;
  paths: string[];
  versions?: Array<string | null>;
}

export interface ScopedPackInventory {
  pack: PackName;
  scope: ConcreteScope;
  intent: ScopedPackIntent;
  completeness: PackCompleteness;
  assets: PackAssetInventory[];
  diagnostics: PackDiagnostic[];
}

export interface PackInventory {
  pack: PackName;
  placement: 'project' | 'user' | 'both' | 'unavailable';
  scopes: ScopedPackInventory[];
  diagnostics: PackDiagnostic[];
}

export interface InventoryScopedPackInput {
  pack: PackName;
  scope: ConcreteScope;
  scopeRoot: string;
  assetsRoot: string;
}

export interface InventoryPackInput {
  pack: PackName;
  assetsRoot: string;
  projectRoot?: string;
  userRoot?: string;
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

async function inventoryVersionedAsset(
  definition: PackAssetDefinition,
  installedPath: string,
  bundledPath: string,
): Promise<PackAssetInventory> {
  const readVersion =
    definition.kind === 'skill' ? getSkillVersion : getAgentVersion;
  const [installedVersion, bundledVersion] = await Promise.all([
    readVersion(installedPath),
    readVersion(bundledPath),
  ]);
  return {
    definition,
    path: installedPath,
    status: compareVersions(installedVersion, bundledVersion),
    installedVersion,
    bundledVersion,
  };
}

async function inventoryStaticAsset(
  definition: PackAssetDefinition,
  installedPath: string,
  bundledPath: string,
): Promise<PackAssetInventory> {
  const digest = definition.kind === 'directory' ? digestDirectory : digestFile;
  const [installedDigest, bundledDigest] = await Promise.all([
    digest(installedPath),
    digest(bundledPath),
  ]);
  return {
    definition,
    path: installedPath,
    status: installedDigest === bundledDigest ? 'current' : 'outdated',
    installedVersion: null,
    bundledVersion: null,
  };
}

async function inventoryAsset(
  definition: PackAssetDefinition,
  scope: ConcreteScope,
  scopeRoot: string,
  assetsRoot: string,
  managedRoots: Record<ManagedRootName, ResolvedManagedRoot>,
): Promise<PackAssetInventory> {
  const installedPath = join(scopeRoot, definition.destination);
  const managedRootName = definition.destination.split('/')[0];
  if (managedRootName !== '.agents' && managedRootName !== '.oat') {
    throw new Error(
      `Pack asset ${definition.id} has unsupported managed root: ${definition.destination}`,
    );
  }
  const { realPath } = await validateManagedPath(
    installedPath,
    managedRoots[managedRootName],
  );
  if (!(await pathExists(realPath))) {
    return {
      definition,
      path: installedPath,
      status: 'missing',
      installedVersion: null,
      bundledVersion: null,
    };
  }

  if (definition.ownership[scope] === 'seed-if-missing') {
    return {
      definition,
      path: installedPath,
      status: 'present',
      installedVersion: null,
      bundledVersion: null,
    };
  }
  if (!definition.source) {
    throw new Error(
      `Managed pack asset ${definition.id} has no materialized source`,
    );
  }
  const bundledPath = join(assetsRoot, definition.source);
  if (definition.kind === 'skill' || definition.kind === 'agent') {
    const inventory = await inventoryVersionedAsset(
      definition,
      realPath,
      bundledPath,
    );
    return { ...inventory, path: installedPath };
  }
  const inventory = await inventoryStaticAsset(
    definition,
    realPath,
    bundledPath,
  );
  return { ...inventory, path: installedPath };
}

function completenessForAssets(
  assets: PackAssetInventory[],
  scope: ConcreteScope,
): PackCompleteness {
  const managed = assets.filter(
    ({ definition }) => definition.ownership[scope] === 'managed',
  );
  const present = managed.filter(({ status }) => status !== 'missing').length;
  if (present === 0) return 'absent';
  return present === managed.length ? 'complete' : 'partial';
}

function intentDiagnostic(diagnostic: PackIntentDiagnostic): PackDiagnostic {
  return { ...diagnostic };
}

export async function inventoryScopedPack(
  input: InventoryScopedPackInput,
): Promise<ScopedPackInventory> {
  const definition = getPackDefinition(input.pack);
  if (!definition.allowedScopes.includes(input.scope)) {
    throw new Error(`Pack ${input.pack} does not allow ${input.scope} scope`);
  }
  const applicableAssets = definition.assets.filter(({ scopes }) =>
    scopes.includes(input.scope),
  );
  const managedRoots = await resolveManagedScopeRoots(input.scopeRoot);
  const [intent, assets] = await Promise.all([
    readScopedPackIntent(input),
    Promise.all(
      applicableAssets.map((asset) =>
        inventoryAsset(
          asset,
          input.scope,
          input.scopeRoot,
          input.assetsRoot,
          managedRoots,
        ),
      ),
    ),
  ]);
  const diagnostics = intent.diagnostics.map(intentDiagnostic);
  return {
    pack: input.pack,
    scope: input.scope,
    intent,
    completeness: completenessForAssets(assets, input.scope),
    assets,
    diagnostics,
  };
}

function scopeHasPlacement(inventory: ScopedPackInventory): boolean {
  return (
    inventory.intent.enabled ||
    inventory.assets.some(
      ({ definition, status }) =>
        definition.sharedOwner === undefined &&
        definition.ownership[inventory.scope] === 'managed' &&
        status !== 'missing',
    )
  );
}

export async function inventoryPack(
  input: InventoryPackInput,
): Promise<PackInventory> {
  const definition = getPackDefinition(input.pack);
  const roots: Partial<Record<ConcreteScope, string>> = {
    project: input.projectRoot,
    user: input.userRoot,
  };
  const scopes = await Promise.all(
    definition.allowedScopes.flatMap((scope) => {
      const scopeRoot = roots[scope];
      return scopeRoot
        ? [
            inventoryScopedPack({
              pack: input.pack,
              scope,
              scopeRoot,
              assetsRoot: input.assetsRoot,
            }),
          ]
        : [];
    }),
  );
  const active = scopes.filter(scopeHasPlacement);
  const placement =
    active.length === 2
      ? 'both'
      : active[0]?.scope === 'project'
        ? 'project'
        : active[0]?.scope === 'user'
          ? 'user'
          : 'unavailable';
  const diagnostics = scopes.flatMap(({ diagnostics: values }) => values);
  for (const scoped of scopes) {
    const shared = scoped.assets.filter(
      ({ definition: asset, status }) =>
        asset.sharedOwner !== undefined && status !== 'missing',
    );
    if (shared.length > 0 && !scopeHasPlacement(scoped)) {
      diagnostics.push({
        code: 'shared-owner-observation',
        message: `Pack ${input.pack} has shared managed assets at ${scoped.scope} scope without pack ownership evidence`,
        paths: shared.map(({ path }) => path),
      });
    }
  }

  if (placement === 'both') {
    const assets = active.flatMap(({ assets: values }) =>
      values.filter(({ status }) => status !== 'missing'),
    );
    diagnostics.push({
      code: 'duplicate-scope',
      message: `Pack ${input.pack} has canonical assets at project and user scope; provider precedence is not inferred`,
      paths: assets.map(({ path }) => path),
      versions: assets.map(({ installedVersion }) => installedVersion),
    });
  }

  return { pack: input.pack, placement, scopes, diagnostics };
}
