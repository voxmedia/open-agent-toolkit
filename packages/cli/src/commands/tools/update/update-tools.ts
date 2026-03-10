import { join } from 'node:path';

import type { CopyStatus } from '@commands/init/tools/shared/copy-helpers';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type { PackName, ToolInfo } from '@commands/tools/shared/types';
import type { ConcreteScope } from '@shared/types';

export type UpdateTarget =
  | { kind: 'name'; name: string }
  | { kind: 'pack'; pack: PackName }
  | { kind: 'all' };

export interface UpdateResult {
  updated: ToolInfo[];
  current: ToolInfo[];
  newer: ToolInfo[];
  notInstalled: string[];
  notBundled: ToolInfo[];
}

export interface UpdateToolsDependencies {
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  resolveScopeRoot: (
    scope: ConcreteScope,
    cwd: string,
    home: string,
  ) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
  copyDirWithStatus: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<CopyStatus>;
  copyFileWithStatus: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<CopyStatus>;
}

export async function updateTools(
  target: UpdateTarget,
  scopes: ConcreteScope[],
  cwd: string,
  home: string,
  dryRun: boolean,
  dependencies: UpdateToolsDependencies,
): Promise<UpdateResult> {
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const result: UpdateResult = {
    updated: [],
    current: [],
    newer: [],
    notInstalled: [],
    notBundled: [],
  };

  const allTools: Array<{ tool: ToolInfo; scopeRoot: string }> = [];

  for (const scope of scopes) {
    const scopeRoot = await dependencies.resolveScopeRoot(scope, cwd, home);
    const tools = await dependencies.scanTools({
      scope,
      scopeRoot,
      assetsRoot,
    });
    for (const tool of tools) {
      allTools.push({ tool, scopeRoot });
    }
  }

  const targets = resolveTargets(
    target,
    allTools.map((t) => t.tool),
  );

  if (target.kind === 'name' && targets.length === 0) {
    result.notInstalled.push(target.name);
    return result;
  }

  for (const targetTool of targets) {
    const entry = allTools.find((t) => t.tool === targetTool);
    if (!entry) continue;

    const { tool, scopeRoot } = entry;

    if (tool.status === 'not-bundled') {
      result.notBundled.push(tool);
      continue;
    }

    if (tool.status === 'current') {
      result.current.push(tool);
      continue;
    }

    if (tool.status === 'newer') {
      result.newer.push(tool);
      continue;
    }

    // outdated — perform update
    if (!dryRun) {
      if (tool.type === 'skill') {
        const source = join(assetsRoot, 'skills', tool.name);
        const destination = join(scopeRoot, '.agents', 'skills', tool.name);
        await dependencies.copyDirWithStatus(source, destination, true);
      } else {
        const filename = `${tool.name}.md`;
        const source = join(assetsRoot, 'agents', filename);
        const destination = join(scopeRoot, '.agents', 'agents', filename);
        await dependencies.copyFileWithStatus(source, destination, true);
      }
    }

    result.updated.push(tool);
  }

  return result;
}

function resolveTargets(target: UpdateTarget, tools: ToolInfo[]): ToolInfo[] {
  switch (target.kind) {
    case 'name':
      return tools.filter((t) => t.name === target.name);
    case 'pack':
      return tools.filter((t) => t.pack === target.pack);
    case 'all':
      return tools;
  }
}
