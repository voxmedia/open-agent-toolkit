import type { CommandContext } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { ToolInfo } from '@commands/tools/shared/types';
import { describe, expect, it } from 'vitest';

import {
  type InfoToolDependencies,
  runInfoTool,
  type ToolDetail,
} from './info-tool';

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

const sampleSkill: ToolInfo = {
  name: 'oat-idea-new',
  type: 'skill',
  scope: 'project',
  version: '1.0.0',
  bundledVersion: '1.0.0',
  pack: 'ideas',
  status: 'current',
};

const sampleAgent: ToolInfo = {
  name: 'oat-reviewer',
  type: 'agent',
  scope: 'project',
  version: '1.0.0',
  bundledVersion: '1.0.0',
  pack: 'workflows',
  status: 'current',
};

const defaultDetail: Omit<ToolDetail, keyof ToolInfo> = {
  description: 'A test skill',
  argumentHint: 'some-arg',
  allowedTools: 'Read, Write',
  userInvocable: true,
};

function createDeps(
  toolsByScope: Record<string, ToolInfo[]> = {},
  detail: Omit<ToolDetail, keyof ToolInfo> = defaultDetail,
): InfoToolDependencies {
  return {
    scanTools: async (options) => toolsByScope[options.scope] ?? [],
    resolveScopeRoot: async (scope) =>
      scope === 'project' ? '/project' : '/home/user',
    resolveAssetsRoot: async () => '/assets',
    getToolDetail: async () => detail,
  };
}

describe('runInfoTool', () => {
  it('displays full details for an installed skill', async () => {
    const deps = createDeps({ project: [sampleSkill] });
    const capture = createLoggerCapture();
    const context = createContext({ logger: capture.logger });

    const result = await runInfoTool(context, 'oat-idea-new', deps);

    expect(result.found).toBe(true);
    expect(result.tool!.name).toBe('oat-idea-new');
    expect(capture.info.some((l) => l.includes('oat-idea-new'))).toBe(true);
    expect(capture.info.some((l) => l.includes('A test skill'))).toBe(true);
    expect(capture.info.some((l) => l.includes('Invocable'))).toBe(true);
  });

  it('displays full details for an installed agent', async () => {
    const agentDetail = {
      description: 'A review agent',
      argumentHint: null,
      allowedTools: null,
      userInvocable: false,
    };
    const deps = createDeps({ project: [sampleAgent] }, agentDetail);
    const capture = createLoggerCapture();
    const context = createContext({ logger: capture.logger });

    const result = await runInfoTool(context, 'oat-reviewer', deps);

    expect(result.found).toBe(true);
    expect(result.tool!.type).toBe('agent');
    expect(capture.info.some((l) => l.includes('A review agent'))).toBe(true);
    // Agents should not show Invocable line
    expect(capture.info.some((l) => l.includes('Invocable'))).toBe(false);
  });

  it('shows update available when outdated', async () => {
    const outdatedSkill: ToolInfo = {
      ...sampleSkill,
      version: '1.0.0',
      bundledVersion: '2.0.0',
      status: 'outdated',
    };
    const deps = createDeps({ project: [outdatedSkill] });
    const capture = createLoggerCapture();
    const context = createContext({ logger: capture.logger });

    const result = await runInfoTool(context, 'oat-idea-new', deps);

    expect(result.found).toBe(true);
    expect(capture.warn.some((l) => l.includes('Update available'))).toBe(true);
  });

  it('reports error when tool not found', async () => {
    const deps = createDeps({});
    const capture = createLoggerCapture();
    const context = createContext({ logger: capture.logger });

    const result = await runInfoTool(context, 'nonexistent', deps);

    expect(result.found).toBe(false);
    expect(result.tool).toBeNull();
    expect(capture.error.some((l) => l.includes('not found'))).toBe(true);
  });

  it('outputs JSON when --json is set', async () => {
    const deps = createDeps({ project: [sampleSkill] });
    const capture = createLoggerCapture();
    const context = createContext({
      json: true,
      logger: capture.logger,
    });

    await runInfoTool(context, 'oat-idea-new', deps);

    expect(capture.jsonPayloads).toHaveLength(1);
    const payload = capture.jsonPayloads[0] as { tool: ToolDetail };
    expect(payload.tool.name).toBe('oat-idea-new');
    expect(payload.tool.description).toBe('A test skill');
  });

  it('searches across scopes when --scope is all', async () => {
    const deps = createDeps({
      project: [],
      user: [{ ...sampleSkill, scope: 'user' }],
    });
    const capture = createLoggerCapture();
    const context = createContext({ scope: 'all', logger: capture.logger });

    const result = await runInfoTool(context, 'oat-idea-new', deps);

    expect(result.found).toBe(true);
    expect(result.tool!.scope).toBe('user');
  });
});
