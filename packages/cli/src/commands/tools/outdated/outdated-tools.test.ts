import type { CommandContext } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { ToolInfo } from '@commands/tools/shared/types';
import { describe, expect, it } from 'vitest';
import {
  type OutdatedToolsDependencies,
  runOutdatedTools,
} from './outdated-tools';

function createContext(
  overrides: Partial<CommandContext> = {},
): CommandContext {
  const capture = createLoggerCapture();
  return {
    scope: 'all',
    apply: false,
    verbose: false,
    json: false,
    cwd: '/project',
    home: '/home/user',
    interactive: false,
    logger: capture.logger,
    ...overrides,
  };
}

const currentTool: ToolInfo = {
  name: 'oat-idea-new',
  type: 'skill',
  scope: 'project',
  version: '1.0.0',
  bundledVersion: '1.0.0',
  pack: 'ideas',
  status: 'current',
};

const outdatedTool: ToolInfo = {
  name: 'oat-project-new',
  type: 'skill',
  scope: 'project',
  version: '1.0.0',
  bundledVersion: '2.0.0',
  pack: 'workflows',
  status: 'outdated',
};

function createDeps(
  toolsByScope: Record<string, ToolInfo[]> = {},
): OutdatedToolsDependencies {
  return {
    scanTools: async (options) => toolsByScope[options.scope] ?? [],
    resolveScopeRoot: async (scope) =>
      scope === 'project' ? '/project' : '/home/user',
    resolveAssetsRoot: async () => '/assets',
  };
}

describe('runOutdatedTools', () => {
  it('shows only outdated tools', async () => {
    const deps = createDeps({
      project: [currentTool, outdatedTool],
    });
    const capture = createLoggerCapture();
    const context = createContext({ scope: 'project', logger: capture.logger });

    const result = await runOutdatedTools(context, deps);

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]!.name).toBe('oat-project-new');
    expect(capture.info.some((line) => line.includes('oat-project-new'))).toBe(
      true,
    );
    expect(capture.info.some((line) => line.includes('oat-idea-new'))).toBe(
      false,
    );
  });

  it('shows empty message when all tools are current', async () => {
    const deps = createDeps({ project: [currentTool] });
    const capture = createLoggerCapture();
    const context = createContext({ scope: 'project', logger: capture.logger });

    const result = await runOutdatedTools(context, deps);

    expect(result.tools).toHaveLength(0);
    expect(
      capture.info.some((line) => line.includes('All tools are up to date')),
    ).toBe(true);
  });

  it('outputs JSON when --json is set', async () => {
    const deps = createDeps({ project: [outdatedTool] });
    const capture = createLoggerCapture();
    const context = createContext({
      json: true,
      scope: 'project',
      logger: capture.logger,
    });

    await runOutdatedTools(context, deps);

    expect(capture.jsonPayloads).toHaveLength(1);
    const payload = capture.jsonPayloads[0] as { tools: ToolInfo[] };
    expect(payload.tools).toHaveLength(1);
    expect(payload.tools[0]!.status).toBe('outdated');
  });

  it('respects --scope filter', async () => {
    const deps = createDeps({
      project: [outdatedTool],
      user: [{ ...outdatedTool, name: 'user-outdated', scope: 'user' }],
    });
    const capture = createLoggerCapture();
    const context = createContext({
      scope: 'project',
      logger: capture.logger,
    });

    const result = await runOutdatedTools(context, deps);

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]!.scope).toBe('project');
  });
});
