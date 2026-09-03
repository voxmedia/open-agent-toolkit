import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  readOatConfig,
  writeOatConfig,
  type OatConfig,
} from '@config/oat-config';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
    ).resolves.toEqual({ action: 'unchanged', adoptedPacks: [] });

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
    ).resolves.toEqual({ action: 'written', adoptedPacks: ['docs'] });

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
    ).resolves.toEqual({ action: 'unchanged', adoptedPacks: [] });
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

    await expect(
      reconcileProjectToolsConfig(reconcileOptions, dependencies),
    ).resolves.toEqual({ action: 'written', adoptedPacks: ['docs'] });

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

    await expect(
      reconcileProjectToolsConfig(reconcileOptions, dependencies),
    ).resolves.toEqual({ action: 'written', adoptedPacks: ['docs'] });

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
    ).resolves.toEqual({ action: 'unchanged', adoptedPacks: [] });
    expect(dependencies.writeOatConfig).not.toHaveBeenCalled();
  });

  it('returns several newly adopted packs once in canonical order', async () => {
    const dependencies = createDependencies({
      config: { version: 1, tools: { workflows: true } },
      projectTools: [
        createTool('research', 'project'),
        createTool('docs', 'project'),
        createTool('docs', 'project'),
        createTool('workflows', 'project'),
      ],
    });

    await expect(
      reconcileProjectToolsConfig(reconcileOptions, dependencies),
    ).resolves.toEqual({
      action: 'written',
      adoptedPacks: ['docs', 'research'],
    });
    expect(dependencies.writeOatConfig).toHaveBeenCalledTimes(1);
  });

  it('ignores custom tools and is idempotent after adopting project packs', async () => {
    let config: OatConfig = { version: 1 };
    const dependencies = createDependencies({
      projectTools: [
        createTool('docs', 'project'),
        createTool('custom', 'project'),
      ],
    });
    dependencies.readOatConfig = vi.fn(async () => config);
    dependencies.writeOatConfig.mockImplementation(
      async (_repoRoot: string, nextConfig: OatConfig) => {
        config = nextConfig;
      },
    );

    await expect(
      reconcileProjectToolsConfig(reconcileOptions, dependencies),
    ).resolves.toEqual({ action: 'written', adoptedPacks: ['docs'] });
    await expect(
      reconcileProjectToolsConfig(reconcileOptions, dependencies),
    ).resolves.toEqual({ action: 'unchanged', adoptedPacks: [] });
    expect(dependencies.writeOatConfig).toHaveBeenCalledTimes(1);
  });
});

describe('FR10 project config sibling preservation', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      roots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
    );
  });

  it('preserves unknown projects siblings through a real read-write cycle', async () => {
    // Real readOatConfig and writeOatConfig against a real file. The previous
    // coverage mocked readOatConfig to return a sibling that production
    // readOatConfig can never return, so it asserted the mock, not the code.
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-fr10-'));
    roots.push(repoRoot);
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    const futureSibling = {
      mode: 'future',
      enabled: true,
      nested: { list: [1, 'two', null], deep: { kept: 'byte-for-byte' } },
    };
    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      `${JSON.stringify(
        {
          version: 1,
          projects: {
            root: '.custom/projects',
            defaultScope: 'synced',
            futureSibling,
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await reconcileProjectToolsConfig(
      { repoRoot },
      {
        resolveAssetsRoot: async () => '/assets',
        scanTools: async () => [createTool('docs', 'project')],
        // The two functions under test are the production ones.
        readOatConfig,
        writeOatConfig,
      },
    );

    const after = JSON.parse(
      await readFile(join(repoRoot, '.oat', 'config.json'), 'utf8'),
    ) as {
      projects?: Record<string, unknown>;
      tools?: Record<string, unknown>;
    };
    expect(after.projects?.futureSibling).toEqual(futureSibling);
    expect(after.projects?.root).toBe('.custom/projects');
    expect(after.projects?.defaultScope).toBe('synced');
    // The write actually happened, so this is not a vacuous pass.
    expect(after.tools?.docs).toBe(true);
  });

  it('preserves siblings even when no known projects key is set', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-fr10-'));
    roots.push(repoRoot);
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, projects: { futureOnly: 'kept' } }, null, 2)}\n`,
      'utf8',
    );

    await reconcileProjectToolsConfig(
      { repoRoot },
      {
        resolveAssetsRoot: async () => '/assets',
        scanTools: async () => [createTool('docs', 'project')],
        readOatConfig,
        writeOatConfig,
      },
    );

    const after = JSON.parse(
      await readFile(join(repoRoot, '.oat', 'config.json'), 'utf8'),
    ) as { projects?: Record<string, unknown> };
    expect(after.projects?.futureOnly).toBe('kept');
  });
});
