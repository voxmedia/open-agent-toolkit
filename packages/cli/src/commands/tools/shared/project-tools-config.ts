import {
  type OatConfig,
  type OatToolsConfig,
  readOatConfig,
  writeOatConfig,
} from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';

import { PACK_NAMES } from './pack-manifest';
import { scanTools, type ScanToolsOptions } from './scan-tools';
import type { PackName, ToolInfo } from './types';

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

export interface ReconcileProjectToolsResult {
  action: 'written' | 'unchanged';
  adoptedPacks: PackName[];
}

const defaultDependencies: ProjectToolsConfigDependencies = {
  resolveAssetsRoot,
  scanTools,
  readOatConfig,
  writeOatConfig,
};

export async function reconcileProjectToolsConfig(
  options: ReconcileProjectToolsOptions,
  dependencies: ProjectToolsConfigDependencies = defaultDependencies,
): Promise<ReconcileProjectToolsResult> {
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const projectTools = await dependencies.scanTools({
    scope: 'project',
    scopeRoot: options.repoRoot,
    assetsRoot,
  });
  const config = await dependencies.readOatConfig(options.repoRoot);
  const tools: OatToolsConfig = { ...config.tools };
  const adopted = new Set<PackName>();
  for (const tool of projectTools) {
    if (
      tool.scope === 'project' &&
      tool.pack !== 'custom' &&
      tools[tool.pack] !== true
    ) {
      tools[tool.pack] = true;
      adopted.add(tool.pack);
    }
  }

  const adoptedPacks = PACK_NAMES.filter((pack) => adopted.has(pack));

  if (adoptedPacks.length === 0) {
    return { action: 'unchanged', adoptedPacks };
  }

  await dependencies.writeOatConfig(options.repoRoot, { ...config, tools });
  return { action: 'written', adoptedPacks };
}
