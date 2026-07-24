import {
  type OatConfig,
  type OatToolsConfig,
  readOatConfig,
  writeOatConfig,
} from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';

import { scanTools, type ScanToolsOptions } from './scan-tools';
import type { PackName, ToolInfo } from './types';

const ALL_PACKS = [
  'core',
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
  'brainstorm',
] as const satisfies readonly PackName[];

export interface ReconcileProjectToolsOptions {
  repoRoot: string;
  cwd: string;
  home: string;
}

export interface ProjectToolsConfigDependencies {
  resolveAssetsRoot: () => Promise<string>;
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  writeOatConfig: (repoRoot: string, config: OatConfig) => Promise<void>;
}

const defaultDependencies: ProjectToolsConfigDependencies = {
  resolveAssetsRoot,
  scanTools,
  readOatConfig,
  writeOatConfig,
};

function buildProjectToolsConfig(
  tools: ToolInfo[],
): OatToolsConfig | undefined {
  const installedPacks = new Set(
    tools
      .filter(
        (tool): tool is ToolInfo & { pack: PackName } =>
          tool.scope === 'project' && tool.pack !== 'custom',
      )
      .map((tool) => tool.pack),
  );

  if (installedPacks.size === 0) {
    return undefined;
  }

  return Object.fromEntries(
    ALL_PACKS.map((pack) => [pack, installedPacks.has(pack)]),
  );
}

function toolsConfigEquals(
  left: OatToolsConfig | undefined,
  right: OatToolsConfig | undefined,
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    ALL_PACKS.every((pack) => left[pack] === right[pack])
  );
}

export async function reconcileProjectToolsConfig(
  options: ReconcileProjectToolsOptions,
  dependencies: ProjectToolsConfigDependencies = defaultDependencies,
): Promise<'written' | 'unchanged'> {
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const projectTools = await dependencies.scanTools({
    scope: 'project',
    scopeRoot: options.repoRoot,
    assetsRoot,
  });
  const config = await dependencies.readOatConfig(options.repoRoot);
  const tools = buildProjectToolsConfig(projectTools);

  if (toolsConfigEquals(config.tools, tools)) {
    return 'unchanged';
  }

  const nextConfig: OatConfig = { ...config };
  if (tools === undefined) {
    delete nextConfig.tools;
  } else {
    nextConfig.tools = tools;
  }

  await dependencies.writeOatConfig(options.repoRoot, nextConfig);
  return 'written';
}
