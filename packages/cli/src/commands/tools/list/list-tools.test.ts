import type { CommandContext } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { ToolInfo } from '@commands/tools/shared/types';
import { describe, expect, it } from 'vitest';

import { type ListToolsDependencies, runListTools } from './list-tools';

function createContext(
  overrides: Partial<CommandContext> = {},
): CommandContext {
  const capture = createLoggerCapture();
  return {
    scope: 'all',
    dryRun: false,
    verbose: false,
    json: false,
    cwd: '/project',
    home: '/home/user',
    interactive: false,
    logger: capture.logger,
    ...overrides,
  };
}

function createDeps(
  toolsByScope: Record<string, ToolInfo[]> = {},
): ListToolsDependencies & { capture: ReturnType<typeof createLoggerCapture> } {
  const capture = createLoggerCapture();
  return {
    capture,
    scanTools: async (options) => toolsByScope[options.scope] ?? [],
    resolveScopeRoot: async (scope) =>
      scope === 'project' ? '/project' : '/home/user',
    resolveAssetsRoot: async () => '/assets',
    inventoryPack: async ({ pack, projectRoot, userRoot }) => ({
      pack,
      placement: projectRoot ? 'project' : userRoot ? 'user' : 'unavailable',
      scopes: [],
      diagnostics: [],
    }),
  };
}

const sampleTool: ToolInfo = {
  name: 'oat-idea-new',
  type: 'skill',
  scope: 'project',
  version: '1.0.0',
  bundledVersion: '1.0.0',
  pack: 'ideas',
  status: 'current',
};

describe('runListTools', () => {
  it('lists all tools across scopes with version and status', async () => {
    const deps = createDeps({
      project: [sampleTool],
      user: [
        {
          ...sampleTool,
          name: 'oat-docs-analyze',
          scope: 'user',
          pack: 'docs',
        },
      ],
    });
    const capture = createLoggerCapture();
    const context = createContext({ logger: capture.logger });

    const result = await runListTools(context, deps);

    expect(result.tools).toHaveLength(2);
    expect(capture.info.some((line) => line.includes('oat-idea-new'))).toBe(
      true,
    );
    expect(capture.info.some((line) => line.includes('oat-docs-analyze'))).toBe(
      true,
    );
  });

  it('filters by scope when --scope is specified', async () => {
    const deps = createDeps({
      project: [sampleTool],
      user: [{ ...sampleTool, name: 'user-skill', scope: 'user' }],
    });
    const capture = createLoggerCapture();
    const context = createContext({
      scope: 'project',
      logger: capture.logger,
    });

    const result = await runListTools(context, deps);

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]!.name).toBe('oat-idea-new');
  });

  it('outputs JSON when --json is set', async () => {
    const deps = createDeps({ project: [sampleTool] });
    const capture = createLoggerCapture();
    const context = createContext({
      json: true,
      scope: 'project',
      logger: capture.logger,
    });

    await runListTools(context, deps);

    expect(capture.jsonPayloads).toHaveLength(1);
    const payload = capture.jsonPayloads[0] as {
      tools: ToolInfo[];
      packs: unknown[];
    };
    expect(payload.tools).toHaveLength(1);
    expect(payload.tools[0]!.name).toBe('oat-idea-new');
    expect(payload.packs).toHaveLength(8);
  });

  it('shows custom tools with pack=custom', async () => {
    const customTool: ToolInfo = {
      ...sampleTool,
      name: 'my-custom-tool',
      pack: 'custom',
      status: 'not-bundled',
    };
    const deps = createDeps({ project: [customTool] });
    const capture = createLoggerCapture();
    const context = createContext({
      scope: 'project',
      logger: capture.logger,
    });

    const result = await runListTools(context, deps);

    expect(result.tools[0]!.pack).toBe('custom');
    expect(capture.info.some((line) => line.includes('custom'))).toBe(true);
  });

  it('shows empty message when no tools installed', async () => {
    const deps = createDeps({});
    const capture = createLoggerCapture();
    const context = createContext({ logger: capture.logger });

    const result = await runListTools(context, deps);

    expect(result.tools).toHaveLength(0);
    expect(
      capture.info.some((line) => line.includes('No tools installed')),
    ).toBe(true);
  });

  it('reports complete pack placement and diagnostics from shared inventory', async () => {
    const deps = createDeps({ project: [sampleTool] });
    deps.inventoryPack = async ({ pack }) => ({
      pack,
      placement: pack === 'ideas' ? 'both' : 'unavailable',
      scopes:
        pack === 'ideas'
          ? [
              {
                pack,
                scope: 'project' as const,
                intent: {
                  pack,
                  scope: 'project' as const,
                  enabled: true,
                  source: 'declared' as const,
                  configPath: '/project/.oat/config.json',
                  diagnostics: [],
                },
                completeness: 'complete' as const,
                assets: [
                  {
                    definition: {
                      id: 'skill:oat-idea-new',
                      kind: 'skill' as const,
                      source: 'skills/oat-idea-new',
                      destination: '.agents/skills/oat-idea-new',
                      scopes: ['project', 'user'] as const,
                      ownership: {
                        project: 'managed' as const,
                        user: 'managed' as const,
                      },
                    },
                    path: '/project/.agents/skills/oat-idea-new',
                    status: 'current' as const,
                    installedVersion: '1.0.0',
                    bundledVersion: '1.0.0',
                  },
                ],
                diagnostics: [],
              },
            ]
          : [],
      diagnostics:
        pack === 'ideas'
          ? [
              {
                code: 'duplicate-scope',
                message: 'duplicate',
                paths: ['/p', '/u'],
              },
            ]
          : [],
    });
    const result = await runListTools(
      createContext({ logger: deps.capture.logger }),
      deps,
    );
    expect(result.packs.find(({ pack }) => pack === 'ideas')).toMatchObject({
      placement: 'both',
      diagnostics: [{ code: 'duplicate-scope' }],
    });
    expect(deps.capture.info.join('\n')).toContain(
      'skill:oat-idea-new [skill] current',
    );
    expect(deps.capture.info.join('\n')).toContain(
      'diagnostic duplicate-scope',
    );
  });
});
