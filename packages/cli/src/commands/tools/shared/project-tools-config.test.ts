import type { OatConfig } from '@config/oat-config';
import { describe, expect, it, vi } from 'vitest';

import {
  type ProjectToolsConfigDependencies,
  reconcileProjectToolsConfig,
} from './project-tools-config';
import type { PackName, ToolInfo } from './types';

function createTool(pack: PackName, scope: 'project' | 'user'): ToolInfo {
  return {
    name: `oat-${pack}`,
    type: 'skill',
    scope,
    version: '1.0.0',
    bundledVersion: '1.0.0',
    pack,
    status: 'current',
  };
}

function createDependencies(options: {
  config?: OatConfig;
  projectTools?: ToolInfo[];
}): ProjectToolsConfigDependencies & {
  scanTools: ReturnType<typeof vi.fn>;
  writeOatConfig: ReturnType<typeof vi.fn>;
} {
  return {
    resolveAssetsRoot: vi.fn(async () => '/assets'),
    scanTools: vi.fn(async () => options.projectTools ?? []),
    readOatConfig: vi.fn(async () => options.config ?? { version: 1 }),
    writeOatConfig: vi.fn(async () => {}),
  };
}

const reconcileOptions = {
  repoRoot: '/repo',
  cwd: '/repo/packages/cli',
  home: '/home/test',
};

describe('reconcileProjectToolsConfig', () => {
  it('does not create default-only config for user-only state', async () => {
    const dependencies = createDependencies({});

    await expect(
      reconcileProjectToolsConfig(reconcileOptions, dependencies),
    ).resolves.toBe('unchanged');

    expect(dependencies.scanTools).toHaveBeenCalledWith({
      scope: 'project',
      scopeRoot: '/repo',
      assetsRoot: '/assets',
    });
    expect(dependencies.writeOatConfig).not.toHaveBeenCalled();
  });

  it('backfills only physically discovered project intent', async () => {
    const dependencies = createDependencies({
      projectTools: [createTool('docs', 'project')],
    });

    await expect(
      reconcileProjectToolsConfig(reconcileOptions, dependencies),
    ).resolves.toBe('written');

    expect(dependencies.writeOatConfig).toHaveBeenCalledWith('/repo', {
      version: 1,
      tools: { docs: true },
    });
  });

  it('does not clear declared intent when physical assets are missing', async () => {
    const dependencies = createDependencies({
      config: {
        version: 1,
        tools: { docs: true },
      },
    });

    await expect(
      reconcileProjectToolsConfig(reconcileOptions, dependencies),
    ).resolves.toBe('unchanged');
    expect(dependencies.writeOatConfig).not.toHaveBeenCalled();
  });

  it('adds inferred legacy intent while preserving declared and unrelated config', async () => {
    const dependencies = createDependencies({
      config: {
        version: 1,
        documentation: { root: 'docs' },
        tools: { workflows: true },
      },
      projectTools: [createTool('docs', 'project')],
    });

    await reconcileProjectToolsConfig(reconcileOptions, dependencies);

    expect(dependencies.writeOatConfig).toHaveBeenCalledWith('/repo', {
      version: 1,
      documentation: { root: 'docs' },
      tools: { workflows: true, docs: true },
    });
  });

  it('replaces a legacy false snapshot only when physical assets exist', async () => {
    const dependencies = createDependencies({
      config: { version: 1, tools: { docs: false, ideas: false } },
      projectTools: [createTool('docs', 'project')],
    });

    await reconcileProjectToolsConfig(reconcileOptions, dependencies);

    expect(dependencies.writeOatConfig).toHaveBeenCalledWith('/repo', {
      version: 1,
      tools: { docs: true, ideas: false },
    });
  });

  it('suppresses an unchanged deterministic tools write', async () => {
    const tools = { docs: true };
    const dependencies = createDependencies({
      config: { version: 1, tools },
      projectTools: [createTool('docs', 'project')],
    });

    await expect(
      reconcileProjectToolsConfig(reconcileOptions, dependencies),
    ).resolves.toBe('unchanged');
    expect(dependencies.writeOatConfig).not.toHaveBeenCalled();
  });
});
