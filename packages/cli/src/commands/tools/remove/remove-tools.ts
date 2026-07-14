import { join } from 'node:path';

import {
  WORKFLOW_AGENTS,
  WORKFLOW_SCRIPTS,
  WORKFLOW_TEMPLATES,
} from '@commands/init/tools/shared/skill-manifest';
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
  scope: ConcreteScope,
  scopeRoot: string,
  dryRun: boolean,
  deps: RemoveToolsDependencies,
): Promise<void> {
  if (dryRun || pack !== 'workflows' || scope !== 'user') {
    return;
  }

  for (const agent of WORKFLOW_AGENTS) {
    await deps.removeFile(join(scopeRoot, '.agents', 'agents', agent));
  }

  for (const template of WORKFLOW_TEMPLATES) {
    await deps.removeFile(join(scopeRoot, '.oat', 'templates', template));
  }
  for (const script of WORKFLOW_SCRIPTS) {
    await deps.removeFile(join(scopeRoot, '.oat', 'scripts', script));
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
      await removeTool(tool, scopeRoot, dryRun, deps);
      removed.push({ name: tool.name, type: tool.type, scope: tool.scope });
    }

    if (target.kind !== 'name') {
      const matchedPacks = new Set(
        matched
          .map((tool) => tool.pack)
          .filter((pack): pack is PackName => pack !== 'custom'),
      );
      for (const pack of matchedPacks) {
        await removePackCompanionAssets(pack, scope, scopeRoot, dryRun, deps);
      }
    }
  }

  const notInstalled: string[] = [];
  if (target.kind === 'name' && removed.length === 0) {
    notInstalled.push(target.name);
  }

  return { removed, notInstalled };
}
