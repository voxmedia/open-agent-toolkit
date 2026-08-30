import { lstat, readdir, readlink } from 'node:fs/promises';
import { join } from 'node:path';

import { compareVersions } from '@commands/init/tools/shared/version';
import { getAgentVersion, getSkillVersion } from '@commands/shared/frontmatter';
import { readOatConfig } from '@config/oat-config';
import {
  type ManagedRootName,
  type ResolvedManagedRoot,
  resolveManagedScopeRoots,
  validateManagedPath,
  validateRealPathWithinScope,
} from '@fs/paths';
import {
  type ConcreteScope,
  USER_SCOPE_MANAGED_AGENT_FILES,
} from '@shared/types';

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
    | 'shared-owner-observation'
    | 'user-agent-unmaterialized';
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
  const versionStatus = compareVersions(installedVersion, bundledVersion);
  const contentMatches =
    versionStatus !== 'current'
      ? null
      : definition.kind === 'skill'
        ? await canonicalDirectoryMatches(installedPath, bundledPath)
        : await canonicalFileMatches(installedPath, bundledPath);
  return {
    definition,
    path: installedPath,
    status:
      versionStatus === 'current' && !contentMatches
        ? 'outdated'
        : versionStatus,
    installedVersion,
    bundledVersion,
  };
}

async function canonicalFileMatches(
  installedPath: string,
  bundledPath: string,
): Promise<boolean> {
  const [installedDigest, bundledDigest] = await Promise.all([
    digestFile(installedPath, 0o644),
    digestFile(bundledPath, 0o644),
  ]);
  return installedDigest === bundledDigest;
}

async function canonicalDirectoryMatches(
  installedRoot: string,
  bundledRoot: string,
): Promise<boolean> {
  const entries = await readdir(bundledRoot, { withFileTypes: true });
  for (const entry of entries) {
    const installedPath = join(installedRoot, entry.name);
    const bundledPath = join(bundledRoot, entry.name);
    if (!(await pathExists(installedPath))) return false;

    const installedMetadata = await lstat(installedPath);
    if (entry.isDirectory()) {
      if (
        !installedMetadata.isDirectory() ||
        !(await canonicalDirectoryMatches(installedPath, bundledPath))
      ) {
        return false;
      }
      continue;
    }
    if (entry.isFile()) {
      if (
        !installedMetadata.isFile() ||
        !(await canonicalFileMatches(installedPath, bundledPath))
      ) {
        return false;
      }
      continue;
    }
    if (entry.isSymbolicLink()) {
      if (
        !installedMetadata.isSymbolicLink() ||
        (await readlink(installedPath)) !== (await readlink(bundledPath))
      ) {
        return false;
      }
      continue;
    }
    throw new Error(
      `Unsupported filesystem entry in pack asset: ${bundledPath}`,
    );
  }
  return true;
}

async function inventoryStaticAsset(
  definition: PackAssetDefinition,
  installedPath: string,
  bundledPath: string,
): Promise<PackAssetInventory> {
  const [installedDigest, bundledDigest] =
    definition.kind === 'directory'
      ? await Promise.all([
          digestDirectory(installedPath),
          digestDirectory(bundledPath),
        ])
      : await Promise.all([
          digestFile(installedPath),
          digestFile(bundledPath, definition.executable ? 0o755 : undefined),
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
    if (definition.generation) {
      if (definition.generation === 'projects-config-default') {
        const config = await readOatConfig(scopeRoot);
        return {
          definition,
          path: installedPath,
          status: config.projects?.root?.trim() ? 'present' : 'outdated',
          installedVersion: null,
          bundledVersion: null,
        };
      }
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
        `Seeded pack asset ${definition.id} has no materialized source`,
      );
    }
    const { realPath: bundledPath } = await validateRealPathWithinScope(
      join(assetsRoot, definition.source),
      assetsRoot,
    );
    const inventory = await inventoryStaticAsset(
      definition,
      realPath,
      bundledPath,
    );
    return {
      ...inventory,
      path: installedPath,
      status: inventory.status === 'current' ? 'current' : 'present',
    };
  }
  if (!definition.source) {
    throw new Error(
      `Managed pack asset ${definition.id} has no materialized source`,
    );
  }
  const { realPath: bundledPath } = await validateRealPathWithinScope(
    join(assetsRoot, definition.source),
    assetsRoot,
  );
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

/**
 * User-scope canonical agents are installed into `~/.agents/agents/` but no
 * provider view is generated for them: `SCOPE_CONTENT_TYPES.user` enumerates
 * skills only, and the sole user-scope agent materialization is the bundled
 * managed role file set (`USER_SCOPE_MANAGED_AGENT_FILES`). Completeness alone
 * therefore reports such a pack as complete while the declared agent surface is
 * unreachable, so the gap is named here instead of staying silent.
 */
function userAgentMaterializationDiagnostics(
  pack: PackName,
  scope: ConcreteScope,
  assets: PackAssetInventory[],
): PackDiagnostic[] {
  if (scope !== 'user') return [];
  const bundledRoleFiles = new Set<string>(USER_SCOPE_MANAGED_AGENT_FILES);
  const unmaterialized = assets.filter(
    ({ definition, status }) =>
      definition.kind === 'agent' &&
      definition.ownership.user === 'managed' &&
      status !== 'missing' &&
      !bundledRoleFiles.has(definition.destination.split('/').at(-1) ?? ''),
  );
  if (unmaterialized.length === 0) return [];
  return [
    {
      code: 'user-agent-unmaterialized',
      message: `Pack ${pack} installs user-scope canonical agents that no provider view materializes; user-scope agent materialization is limited to the bundled managed role files (${USER_SCOPE_MANAGED_AGENT_FILES.join(', ')}). Install this pack at project scope to make these agents available to providers.`,
      paths: unmaterialized.map(({ path }) => path),
    },
  ];
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
  const diagnostics = [
    ...intent.diagnostics.map(intentDiagnostic),
    ...userAgentMaterializationDiagnostics(input.pack, input.scope, assets),
  ];
  return {
    pack: input.pack,
    scope: input.scope,
    intent,
    completeness: completenessForAssets(assets, input.scope),
    assets,
    diagnostics,
  };
}

export function hasScopedPackPlacementEvidence(
  inventory: ScopedPackInventory,
): boolean {
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
  const active = scopes.filter(hasScopedPackPlacementEvidence);
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
    if (shared.length > 0 && !hasScopedPackPlacementEvidence(scoped)) {
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
