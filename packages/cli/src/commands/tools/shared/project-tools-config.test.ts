import type { OatConfig } from '@config/oat-config';
import { describe, expect, it, vi } from 'vitest';

import {
  type ProjectToolsConfigDependencies,
  reconcileProjectToolsConfig,
} from './project-tools-config';
import type { PackName, ToolInfo } from './types';

const ALL_PACKS: PackName[] = [
  'core',
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
  'brainstorm',
];

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

  it.each([
    ['project-only', [createTool('docs', 'project')]],
    [
      'both-scope effective state',
      [createTool('docs', 'project'), createTool('docs', 'user')],
    ],
  ])('writes deterministic project state for %s', async (_name, tools) => {
    const dependencies = createDependencies({ projectTools: tools });

    await expect(
      reconcileProjectToolsConfig(reconcileOptions, dependencies),
    ).resolves.toBe('written');

    expect(dependencies.writeOatConfig).toHaveBeenCalledWith('/repo', {
      version: 1,
      tools: Object.fromEntries(
        ALL_PACKS.map((pack) => [pack, pack === 'docs']),
      ),
    });
  });

  it('removes the final project pack even when a user copy remains', async () => {
    const dependencies = createDependencies({
      config: {
        version: 1,
        tools: Object.fromEntries(
          ALL_PACKS.map((pack) => [pack, pack === 'docs']),
        ),
      },
    });

    await expect(
      reconcileProjectToolsConfig(reconcileOptions, dependencies),
    ).resolves.toBe('written');

    expect(dependencies.writeOatConfig).toHaveBeenCalledWith('/repo', {
      version: 1,
    });
  });

  it('clears stale union flags while preserving unrelated shared config', async () => {
    const dependencies = createDependencies({
      config: {
        version: 1,
        documentation: { root: 'docs' },
        tools: { docs: true, workflows: true },
      },
      projectTools: [createTool('workflows', 'project')],
    });

    await reconcileProjectToolsConfig(reconcileOptions, dependencies);

    expect(dependencies.writeOatConfig).toHaveBeenCalledWith('/repo', {
      version: 1,
      documentation: { root: 'docs' },
      tools: Object.fromEntries(
        ALL_PACKS.map((pack) => [pack, pack === 'workflows']),
      ),
    });
  });

  it('suppresses an unchanged deterministic tools write', async () => {
    const tools = Object.fromEntries(
      ALL_PACKS.map((pack) => [pack, pack === 'docs']),
    );
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
