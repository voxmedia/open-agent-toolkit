import { join } from 'node:path';

import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type {
  PackAssetDefinition,
  PackName,
  ToolInfo,
} from '@commands/tools/shared/types';
import {
  type ManagedRootName,
  resolveManagedScopeRoots,
  validateManagedPath,
} from '@fs/paths';
import type { ConcreteScope } from '@shared/types';

export type RemoveTarget =
  | { kind: 'name'; name: string }
  | { kind: 'pack'; pack: PackName }
  | { kind: 'all' };

export interface RemoveToolsDependencies {
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  resolveScopeRoot: (
    scope: ConcreteScope,
    cwd: string,
    home: string,
  ) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
  removeDirectory: (path: string) => Promise<void>;
  removeFile: (path: string) => Promise<void>;
  pathExists: (path: string) => Promise<boolean>;
  hasPackOwnershipEvidence: (
    pack: PackName,
    scope: ConcreteScope,
    scopeRoot: string,
  ) => Promise<boolean>;
}

interface RemovedTool {
  name: string;
  type: 'skill' | 'agent';
  scope: ConcreteScope;
}

export interface RemoveResult {
  removed: RemovedTool[];
  notInstalled: string[];
}

function matchesTarget(tool: ToolInfo, target: RemoveTarget): boolean {
  switch (target.kind) {
    case 'name':
      return tool.name === target.name;
    case 'pack':
      return tool.pack === target.pack;
    case 'all':
      return true;
  }
}

async function removeTool(
  tool: ToolInfo,
  scopeRoot: string,
  dryRun: boolean,
  deps: RemoveToolsDependencies,
): Promise<void> {
  if (dryRun) return;

  if (tool.type === 'agent') {
    const agentPath = join(scopeRoot, '.agents', 'agents', `${tool.name}.md`);
    await deps.removeFile(agentPath);
  } else {
    const skillPath = join(scopeRoot, '.agents', 'skills', tool.name);
    await deps.removeDirectory(skillPath);
  }
}

function isDirectoryAsset(asset: PackAssetDefinition): boolean {
  return asset.kind === 'skill' || asset.kind === 'directory';
}

interface ManagedRemovalTarget {
  path: string;
  isDirectory: boolean;
}

interface ScopeRemovalPlan {
  scopeRoot: string;
  matched: ToolInfo[];
  managedTargets: ManagedRemovalTarget[];
}

function selectedPacks(target: Exclude<RemoveTarget, { kind: 'name' }>) {
  return target.kind === 'pack'
    ? [target.pack]
    : PACK_MANIFEST.map(({ name }) => name);
}

function selectedManagedAssets(
  packs: readonly PackName[],
  scope: ConcreteScope,
): Array<{ pack: PackName; asset: PackAssetDefinition }> {
  return PACK_MANIFEST.filter(({ name }) => packs.includes(name)).flatMap(
    ({ name, assets }) =>
      assets
        .filter(
          (asset) =>
            asset.scopes.includes(scope) &&
            asset.ownership[scope] === 'managed',
        )
        .map((asset) => ({ pack: name, asset })),
  );
}

function managedRootName(asset: PackAssetDefinition): ManagedRootName {
  const name = asset.destination.split('/')[0];
  if (name !== '.agents' && name !== '.oat') {
    throw new Error(
      `Pack asset ${asset.id} has unsupported managed root: ${asset.destination}`,
    );
  }
  return name;
}

async function planManagedPackRemoval(
  packs: readonly PackName[],
  scope: ConcreteScope,
  scopeRoot: string,
  dryRun: boolean,
  deps: RemoveToolsDependencies,
): Promise<ManagedRemovalTarget[]> {
  const retainedPaths = new Set<string>();
  const targets = new Map<
    string,
    { asset: PackAssetDefinition; isDirectory: boolean }
  >();
  for (const { asset } of selectedManagedAssets(packs, scope)) {
    const path = join(scopeRoot, asset.destination);
    if (targets.has(path) || retainedPaths.has(path)) continue;
    if (asset.sharedOwner) {
      const otherOwners = PACK_MANIFEST.filter(
        ({ name, assets }) =>
          !packs.includes(name) &&
          assets.some(
            (candidate) =>
              candidate.sharedOwner === asset.sharedOwner &&
              candidate.destination === asset.destination &&
              candidate.scopes.includes(scope),
          ),
      );
      const retainedByAnotherPack = await Promise.all(
        otherOwners.map(({ name }) =>
          deps.hasPackOwnershipEvidence(name, scope, scopeRoot),
        ),
      );
      if (retainedByAnotherPack.some(Boolean)) {
        retainedPaths.add(path);
        continue;
      }
    }

    targets.set(path, { asset, isDirectory: isDirectoryAsset(asset) });
  }

  if (dryRun) {
    return [...targets.entries()].map(([path, { isDirectory }]) => ({
      path,
      isDirectory,
    }));
  }

  const roots = await resolveManagedScopeRoots(scopeRoot);
  return Promise.all(
    [...targets.entries()].map(
      async ([path, { asset, isDirectory }]): Promise<ManagedRemovalTarget> => {
        await validateManagedPath(path, roots[managedRootName(asset)]);
        return { path, isDirectory };
      },
    ),
  );
}

async function executeManagedPackRemoval(
  targets: ManagedRemovalTarget[],
  deps: RemoveToolsDependencies,
): Promise<void> {
  for (const target of targets) {
    if (target.isDirectory) {
      await deps.removeDirectory(target.path);
    } else {
      await deps.removeFile(target.path);
    }
  }

  const remaining = (
    await Promise.all(
      targets.map(async ({ path }) =>
        (await deps.pathExists(path)) ? path : null,
      ),
    )
  ).filter((path): path is string => path !== null);
  if (remaining.length > 0) {
    throw new Error(
      `Managed pack removal incomplete; assets remain: ${remaining.join(', ')}`,
    );
  }
}

export async function removeTools(
  target: RemoveTarget,
  scopes: ConcreteScope[],
  cwd: string,
  home: string,
  dryRun: boolean,
  deps: RemoveToolsDependencies,
): Promise<RemoveResult> {
  const removed: RemovedTool[] = [];
  const assetsRoot = await deps.resolveAssetsRoot();

  if (target.kind === 'name') {
    for (const scope of scopes) {
      const scopeRoot = await deps.resolveScopeRoot(scope, cwd, home);
      const tools = await deps.scanTools({ scope, scopeRoot, assetsRoot });
      const matched = tools.filter((tool) => matchesTarget(tool, target));
      for (const tool of matched) {
        await removeTool(tool, scopeRoot, dryRun, deps);
        removed.push({ name: tool.name, type: tool.type, scope: tool.scope });
      }
    }

    return {
      removed,
      notInstalled: removed.length === 0 ? [target.name] : [],
    };
  }

  const plans: ScopeRemovalPlan[] = [];
  for (const scope of scopes) {
    const scopeRoot = await deps.resolveScopeRoot(scope, cwd, home);
    const tools = await deps.scanTools({ scope, scopeRoot, assetsRoot });
    const matched = tools.filter((tool) => matchesTarget(tool, target));
    plans.push({
      scopeRoot,
      matched,
      managedTargets: await planManagedPackRemoval(
        selectedPacks(target),
        scope,
        scopeRoot,
        dryRun,
        deps,
      ),
    });
  }

  for (const plan of plans) {
    if (target.kind === 'all') {
      for (const tool of plan.matched.filter(({ pack }) => pack === 'custom')) {
        await removeTool(tool, plan.scopeRoot, dryRun, deps);
      }
    }
    if (!dryRun) {
      await executeManagedPackRemoval(plan.managedTargets, deps);
    }
    removed.push(
      ...plan.matched.map(({ name, type, scope }) => ({ name, type, scope })),
    );
  }

  return { removed, notInstalled: [] };
}
