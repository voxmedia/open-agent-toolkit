import { join } from 'node:path';

import {
  WORKFLOW_AGENTS,
  WORKFLOW_TEMPLATES,
} from '@commands/init/tools/shared/skill-manifest';
import {
  getPackAssets,
  PACK_MANIFEST,
} from '@commands/tools/shared/pack-manifest';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type { PackName, ToolInfo } from '@commands/tools/shared/types';
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
  isPackIntended?: (
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

async function removePackCompanionAssets(
  pack: PackName,
  target: RemoveTarget,
  scope: ConcreteScope,
  scopeRoot: string,
  dryRun: boolean,
  removedFiles: Set<string>,
  deps: RemoveToolsDependencies,
): Promise<void> {
  if (dryRun) {
    return;
  }

  if (pack === 'workflows' && scope === 'user') {
    for (const agent of WORKFLOW_AGENTS) {
      const path = join(scopeRoot, '.agents', 'agents', agent);
      if (!removedFiles.has(path)) {
        removedFiles.add(path);
        await deps.removeFile(path);
      }
    }

    for (const template of WORKFLOW_TEMPLATES) {
      const path = join(scopeRoot, '.oat', 'templates', template);
      if (!removedFiles.has(path)) {
        removedFiles.add(path);
        await deps.removeFile(path);
      }
    }
  }

  for (const asset of getPackAssets(pack, 'script')) {
    if (!asset.scopes.includes(scope) || asset.ownership[scope] !== 'managed') {
      continue;
    }

    if (asset.sharedOwner) {
      const otherOwners = PACK_MANIFEST.filter(
        ({ name, assets }) =>
          name !== pack &&
          assets.some(
            (candidate) =>
              candidate.sharedOwner === asset.sharedOwner &&
              candidate.destination === asset.destination &&
              candidate.scopes.includes(scope),
          ),
      );
      const retainedByAnotherPack = await Promise.all(
        otherOwners.map(async ({ name }) => {
          const selectedForRemoval =
            target.kind === 'all' ||
            (target.kind === 'pack' && target.pack === name);
          return (
            !selectedForRemoval &&
            (await deps.isPackIntended?.(name, scope, scopeRoot)) === true
          );
        }),
      );
      if (retainedByAnotherPack.some(Boolean)) {
        continue;
      }
    }

    const path = join(scopeRoot, asset.destination);
    if (!removedFiles.has(path)) {
      removedFiles.add(path);
      await deps.removeFile(path);
    }
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
  const removedCompanionFiles = new Set<string>();
  const assetsRoot = await deps.resolveAssetsRoot();

  for (const scope of scopes) {
    const scopeRoot = await deps.resolveScopeRoot(scope, cwd, home);
    const tools = await deps.scanTools({ scope, scopeRoot, assetsRoot });
    const matched = tools.filter((t) => matchesTarget(t, target));

    for (const tool of matched) {
      await removeTool(tool, scopeRoot, dryRun, deps);
      removed.push({ name: tool.name, type: tool.type, scope: tool.scope });
    }

    if (target.kind !== 'name') {
      const selectedPacks =
        target.kind === 'pack'
          ? [target.pack]
          : PACK_MANIFEST.map(({ name }) => name);
      for (const pack of selectedPacks) {
        await removePackCompanionAssets(
          pack,
          target,
          scope,
          scopeRoot,
          dryRun,
          removedCompanionFiles,
          deps,
        );
      }
    }
  }

  const notInstalled: string[] = [];
  if (target.kind === 'name' && removed.length === 0) {
    notInstalled.push(target.name);
  }

  return { removed, notInstalled };
}
