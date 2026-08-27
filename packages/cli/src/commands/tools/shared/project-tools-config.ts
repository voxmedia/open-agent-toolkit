import {
  type OatConfig,
  type OatToolsConfig,
  readOatConfig,
  writeOatConfig,
} from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';

import { scanTools, type ScanToolsOptions } from './scan-tools';
import type { ToolInfo } from './types';

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
  const tools: OatToolsConfig = { ...config.tools };
  let changed = false;
  for (const tool of projectTools) {
    if (
      tool.scope === 'project' &&
      tool.pack !== 'custom' &&
      tools[tool.pack] !== true
    ) {
      tools[tool.pack] = true;
      changed = true;
    }
  }

  if (!changed) {
    return 'unchanged';
  }

  await dependencies.writeOatConfig(options.repoRoot, { ...config, tools });
  return 'written';
}
