import { describe, expect, it } from 'vitest';

import type { ScanToolsDependencies } from './scan-tools';
import { scanTools } from './scan-tools';

function createMockDeps(
  overrides: Partial<ScanToolsDependencies> = {},
): ScanToolsDependencies {
  return {
    getSkillVersion: async () => null,
    getAgentVersion: async () => null,
    readdir: async () => [],
    readdirFiles: async () => [],
    dirExists: async () => false,
    fileExists: async () => false,
    ...overrides,
  };
}

describe('scanTools', () => {
  it('finds installed skills with version and pack membership', async () => {
    const deps = createMockDeps({
      readdir: async (path: string) => {
        if (path.includes('.agents/skills')) return ['oat-idea-new'];
        return [];
      },
      getSkillVersion: async (dir: string) => {
        if (dir.includes('scope-root')) return '1.0.0';
        if (dir.includes('assets')) return '1.0.0';
        return null;
      },
      dirExists: async (path: string) => {
        if (path.includes('assets/skills/oat-idea-new')) return true;
        return false;
      },
    });

    const result = await scanTools({
      scope: 'project',
      scopeRoot: '/scope-root',
      assetsRoot: '/assets',
      dependencies: deps,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'oat-idea-new',
      type: 'skill',
      scope: 'project',
      version: '1.0.0',
      bundledVersion: '1.0.0',
      pack: 'ideas',
      status: 'current',
    });
  });

  it('finds installed agents in project scope via readdirFiles DI', async () => {
    const deps = createMockDeps({
      dirExists: async (path: string) => {
        if (path.includes('.agents/agents')) return true;
        if (path.includes('assets/agents/oat-reviewer.md')) return true;
        return false;
      },
      readdirFiles: async (path: string) => {
        if (path.includes('.agents/agents'))
          return ['oat-reviewer.md', 'oat-codebase-mapper.md'];
        return [];
      },
      fileExists: async (path: string) => {
        if (path.includes('assets/agents/oat-reviewer.md')) return true;
        if (path.includes('assets/agents/oat-codebase-mapper.md')) return true;
        return false;
      },
      getAgentVersion: async (agentPath: string) => {
        if (agentPath.includes('scope-root')) return '1.0.0';
        if (agentPath.includes('assets')) return '1.0.0';
        return null;
      },
    });

    const result = await scanTools({
      scope: 'project',
      scopeRoot: '/scope-root',
      assetsRoot: '/assets',
      dependencies: deps,
    });

    const agents = result.filter((t) => t.type === 'agent');
    expect(agents).toHaveLength(2);
    expect(agents.find((a) => a.name === 'oat-reviewer')).toEqual({
      name: 'oat-reviewer',
      type: 'agent',
      scope: 'project',
      version: '1.0.0',
      bundledVersion: '1.0.0',
      pack: 'workflows',
      status: 'current',
    });
    expect(agents.find((a) => a.name === 'oat-codebase-mapper')).toEqual({
      name: 'oat-codebase-mapper',
      type: 'agent',
      scope: 'project',
      version: '1.0.0',
      bundledVersion: '1.0.0',
      pack: 'workflows',
      status: 'current',
    });
  });

  it('marks custom skills as pack=custom', async () => {
    const deps = createMockDeps({
      readdir: async (path: string) => {
        if (path.includes('.agents/skills')) return ['my-custom-skill'];
        return [];
      },
      dirExists: async () => false,
    });

    const result = await scanTools({
      scope: 'user',
      scopeRoot: '/home/user',
      assetsRoot: '/assets',
      dependencies: deps,
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.pack).toBe('custom');
    expect(result[0]!.status).toBe('not-bundled');
  });

  it('compares versions and sets correct status', async () => {
    const deps = createMockDeps({
      readdir: async (path: string) => {
        if (path.includes('.agents/skills'))
          return ['oat-idea-new', 'oat-idea-ideate', 'oat-idea-summarize'];
        return [];
      },
      getSkillVersion: async (dir: string) => {
        // outdated: installed 1.0.0, bundled 2.0.0
        if (dir.includes('scope-root') && dir.includes('oat-idea-new'))
          return '1.0.0';
        if (dir.includes('assets') && dir.includes('oat-idea-new'))
          return '2.0.0';
        // current: both 1.0.0
        if (dir.includes('scope-root') && dir.includes('oat-idea-ideate'))
          return '1.0.0';
        if (dir.includes('assets') && dir.includes('oat-idea-ideate'))
          return '1.0.0';
        // newer: installed 3.0.0, bundled 1.0.0
        if (dir.includes('scope-root') && dir.includes('oat-idea-summarize'))
          return '3.0.0';
        if (dir.includes('assets') && dir.includes('oat-idea-summarize'))
          return '1.0.0';
        return null;
      },
      dirExists: async (path: string) => {
        if (path.includes('assets/skills/')) return true;
        return false;
      },
    });

    const result = await scanTools({
      scope: 'project',
      scopeRoot: '/scope-root',
      assetsRoot: '/assets',
      dependencies: deps,
    });

    expect(result).toHaveLength(3);
    expect(result.find((t) => t.name === 'oat-idea-new')!.status).toBe(
      'outdated',
    );
    expect(result.find((t) => t.name === 'oat-idea-ideate')!.status).toBe(
      'current',
    );
    expect(result.find((t) => t.name === 'oat-idea-summarize')!.status).toBe(
      'newer',
    );
  });

  it('skips agents in user scope', async () => {
    const deps = createMockDeps({
      readdir: async () => [],
      dirExists: async () => true,
      getAgentVersion: async () => '1.0.0',
    });

    const result = await scanTools({
      scope: 'user',
      scopeRoot: '/home/user',
      assetsRoot: '/assets',
      dependencies: deps,
    });

    // No agents should appear even though dirExists returns true for all
    expect(result.filter((t) => t.type === 'agent')).toEqual([]);
  });

  it('handles missing bundled asset gracefully (not-bundled)', async () => {
    const deps = createMockDeps({
      readdir: async (path: string) => {
        if (path.includes('.agents/skills')) return ['third-party-skill'];
        return [];
      },
      dirExists: async () => false,
    });

    const result = await scanTools({
      scope: 'project',
      scopeRoot: '/scope-root',
      assetsRoot: '/assets',
      dependencies: deps,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'third-party-skill',
      status: 'not-bundled',
      bundledVersion: null,
      pack: 'custom',
    });
  });

  it('detects workflow skills pack membership', async () => {
    const deps = createMockDeps({
      readdir: async (path: string) => {
        if (path.includes('.agents/skills')) return ['oat-project-new'];
        return [];
      },
      dirExists: async (path: string) => {
        if (path.includes('assets/skills/oat-project-new')) return true;
        return false;
      },
      getSkillVersion: async () => '1.0.0',
    });

    const result = await scanTools({
      scope: 'project',
      scopeRoot: '/scope-root',
      assetsRoot: '/assets',
      dependencies: deps,
    });

    expect(result[0]!.pack).toBe('workflows');
  });

  it('detects utility skills pack membership', async () => {
    const deps = createMockDeps({
      readdir: async (path: string) => {
        if (path.includes('.agents/skills')) return ['oat-docs-analyze'];
        return [];
      },
      dirExists: async (path: string) => {
        if (path.includes('assets/skills/oat-docs-analyze')) return true;
        return false;
      },
      getSkillVersion: async () => '1.0.0',
    });

    const result = await scanTools({
      scope: 'user',
      scopeRoot: '/home/user',
      assetsRoot: '/assets',
      dependencies: deps,
    });

    expect(result[0]!.pack).toBe('utility');
  });

  it('detects research skills pack membership', async () => {
    const deps = createMockDeps({
      readdir: async (path: string) => {
        if (path.includes('.agents/skills')) return ['analyze'];
        return [];
      },
      dirExists: async (path: string) => {
        if (path.includes('assets/skills/analyze')) return true;
        return false;
      },
      getSkillVersion: async () => '1.0.0',
    });

    const result = await scanTools({
      scope: 'user',
      scopeRoot: '/home/user',
      assetsRoot: '/assets',
      dependencies: deps,
    });

    expect(result[0]!.pack).toBe('research');
  });

  it('detects research agents pack membership', async () => {
    const deps = createMockDeps({
      dirExists: async (path: string) => {
        if (path.includes('.agents/agents')) return true;
        if (path.includes('assets/agents/skeptical-evaluator.md')) return true;
        return false;
      },
      readdirFiles: async (path: string) => {
        if (path.includes('.agents/agents')) return ['skeptical-evaluator.md'];
        return [];
      },
      fileExists: async (path: string) => {
        if (path.includes('assets/agents/skeptical-evaluator.md')) return true;
        return false;
      },
      getAgentVersion: async () => '1.0.0',
    });

    const result = await scanTools({
      scope: 'project',
      scopeRoot: '/scope-root',
      assetsRoot: '/assets',
      dependencies: deps,
    });

    const agents = result.filter((t) => t.type === 'agent');
    expect(agents).toHaveLength(1);
    expect(agents[0]!.pack).toBe('research');
  });
});
