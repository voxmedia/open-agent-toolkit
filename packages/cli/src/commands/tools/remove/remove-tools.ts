import { join } from 'node:path';

import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type {
  PackAssetDefinition,
  PackName,
  ToolInfo,
} from '@commands/tools/shared/types';
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

async function removeManagedPackAssets(
  packs: readonly PackName[],
  scope: ConcreteScope,
  scopeRoot: string,
  dryRun: boolean,
  deps: RemoveToolsDependencies,
): Promise<void> {
  if (dryRun) {
    return;
  }

  const retainedPaths = new Set<string>();
  const removedPaths = new Set<string>();
  for (const { asset } of selectedManagedAssets(packs, scope)) {
    const path = join(scopeRoot, asset.destination);
    if (removedPaths.has(path) || retainedPaths.has(path)) continue;
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

    removedPaths.add(path);
    if (isDirectoryAsset(asset)) {
      await deps.removeDirectory(path);
    } else {
      await deps.removeFile(path);
    }
  }

  const remaining = (
    await Promise.all(
      [...removedPaths].map(async (path) =>
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

  for (const scope of scopes) {
    const scopeRoot = await deps.resolveScopeRoot(scope, cwd, home);
    const tools = await deps.scanTools({ scope, scopeRoot, assetsRoot });
    const matched = tools.filter((t) => matchesTarget(t, target));

    for (const tool of matched) {
      if (
        target.kind === 'name' ||
        (target.kind === 'all' && tool.pack === 'custom')
      ) {
        await removeTool(tool, scopeRoot, dryRun, deps);
      }
      removed.push({ name: tool.name, type: tool.type, scope: tool.scope });
    }

    if (target.kind !== 'name') {
      await removeManagedPackAssets(
        selectedPacks(target),
        scope,
        scopeRoot,
        dryRun,
        deps,
      );
    }
  }

  const notInstalled: string[] = [];
  if (target.kind === 'name' && removed.length === 0) {
    notInstalled.push(target.name);
  }

  return { removed, notInstalled };
}
