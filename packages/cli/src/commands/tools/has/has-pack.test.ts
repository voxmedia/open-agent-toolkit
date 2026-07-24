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
    });
  });
});
