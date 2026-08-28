import type { CommandContext } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { ToolInfo } from '@commands/tools/shared/types';
import { describe, expect, it, vi } from 'vitest';

import {
  type PackAvailabilityDependencies,
  resolvePackAvailability,
} from './has-pack';

function createContext(): CommandContext {
  return {
    scope: 'all',
    dryRun: false,
    verbose: false,
    json: false,
    cwd: '/project',
    home: '/home/user',
    interactive: false,
    logger: createLoggerCapture().logger,
  };
}

function createTool(
  pack: ToolInfo['pack'],
  scope: 'project' | 'user',
): ToolInfo {
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

function createDependencies(
  toolsByScope: Partial<Record<'project' | 'user', ToolInfo[]>>,
): PackAvailabilityDependencies & {
  scanTools: ReturnType<typeof vi.fn>;
} {
  return {
    resolveAssetsRoot: vi.fn(async () => '/assets'),
    resolveScopeRoot: vi.fn(async (scope) =>
      scope === 'project' ? '/project' : '/home/user',
    ),
    scanTools: vi.fn(async ({ scope }) => toolsByScope[scope] ?? []),
    inventoryScopedPack: vi.fn(async ({ pack, scope }) => {
      const available = (toolsByScope[scope] ?? []).some(
        (tool) => tool.pack === pack,
      );
      return {
        pack,
        scope,
        intent: {
          pack,
          scope,
          enabled: available,
          source: available ? ('inferred-legacy' as const) : ('none' as const),
          configPath: `/${scope}/.oat/config.json`,
          diagnostics: [],
        },
        completeness: available ? ('complete' as const) : ('absent' as const),
        assets: [],
        diagnostics: [],
      };
    }),
  };
}

describe('resolvePackAvailability', () => {
  it('returns the concrete project scope containing the requested pack', async () => {
    const dependencies = createDependencies({
      project: [createTool('docs', 'project')],
      user: [createTool('ideas', 'user')],
    });

    await expect(
      resolvePackAvailability(
        'docs',
        ['project', 'user'],
        createContext(),
        dependencies,
      ),
    ).resolves.toEqual({
      pack: 'docs',
      available: true,
      scopes: ['project'],
      unavailableScopes: [],
      completeness: { project: 'complete', user: 'absent' },
      missing: [],
    });
  });

  it('reports both scopes when the pack is available in both', async () => {
    const dependencies = createDependencies({
      project: [createTool('workflows', 'project')],
      user: [createTool('workflows', 'user')],
    });

    await expect(
      resolvePackAvailability(
        'workflows',
        ['project', 'user'],
        createContext(),
        dependencies,
      ),
    ).resolves.toEqual({
      pack: 'workflows',
      available: true,
      scopes: ['project', 'user'],
      unavailableScopes: [],
      completeness: { project: 'complete', user: 'complete' },
      missing: [],
    });
  });

  it('returns an available false result without treating it as an error', async () => {
    const dependencies = createDependencies({
      project: [createTool('custom', 'project')],
    });

    await expect(
      resolvePackAvailability(
        'research',
        ['project'],
        createContext(),
        dependencies,
      ),
    ).resolves.toEqual({
      pack: 'research',
      available: false,
      scopes: [],
      unavailableScopes: [],
      completeness: { project: 'absent' },
      missing: [],
    });
  });

  it('requires complete inventory rather than any member presence', async () => {
    const dependencies = createDependencies({
      project: [createTool('docs', 'project')],
    });
    dependencies.inventoryScopedPack!.mockResolvedValue({
      pack: 'docs',
      scope: 'project',
      intent: {
        pack: 'docs',
        scope: 'project',
        enabled: true,
        source: 'declared',
        configPath: '/project/.oat/config.json',
        diagnostics: [],
      },
      completeness: 'partial',
      assets: [],
      diagnostics: [],
    });
    const result = await resolvePackAvailability(
      'docs',
      ['project'],
      createContext(),
      dependencies,
    );
    expect(result.available).toBe(false);
    expect(result.completeness).toEqual({ project: 'partial' });
  });

  it('answers from user scope when project scope is unresolvable', async () => {
    const dependencies = createDependencies({
      user: [createTool('docs', 'user')],
    });
    dependencies.resolveScopeRoot = vi.fn(async (scope) => {
      if (scope === 'project')
        throw new Error('Unable to resolve project root');
      return '/home/user';
    });

    await expect(
      resolvePackAvailability(
        'docs',
        ['project', 'user'],
        createContext(),
        dependencies,
      ),
    ).resolves.toEqual({
      pack: 'docs',
      available: true,
      scopes: ['user'],
      unavailableScopes: ['project'],
      completeness: { user: 'complete' },
      missing: [],
    });
  });

  it('still fails when project scope is explicitly requested and unresolvable', async () => {
    const dependencies = createDependencies({
      user: [createTool('docs', 'user')],
    });
    dependencies.resolveScopeRoot = vi.fn(async () => {
      throw new Error('Unable to resolve project root');
    });

    await expect(
      resolvePackAvailability(
        'docs',
        ['project'],
        createContext(),
        dependencies,
      ),
    ).rejects.toThrow('Unable to resolve project root');
  });
});
