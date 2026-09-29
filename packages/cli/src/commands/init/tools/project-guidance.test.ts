import { describe, expect, it, vi } from 'vitest';

import { loadRealizedGuidanceState } from './index';
import {
  buildToolPacksSectionBody,
  parseProjectGuidanceFlags,
  planProjectGuidance,
} from './project-guidance';

const realizedPacks = [
  { pack: 'docs' as const, scope: 'project' as const },
  { pack: 'workflows' as const, scope: 'user' as const },
  { pack: 'utility' as const, scope: 'both' as const },
];

describe('parseProjectGuidanceFlags', () => {
  it('distinguishes explicit acceptance, decline, and no choice', () => {
    expect(parseProjectGuidanceFlags(['--project-guidance'])).toBe(true);
    expect(parseProjectGuidanceFlags(['--no-project-guidance'])).toBe(false);
    expect(parseProjectGuidanceFlags([])).toBeUndefined();
  });

  it('rejects conflicting explicit flags', () => {
    expect(() =>
      parseProjectGuidanceFlags([
        '--project-guidance',
        '--no-project-guidance',
      ]),
    ).toThrow('cannot be used together');
  });
});

describe('planProjectGuidance', () => {
  it('plans explicit accepted guidance from complete realized pack evidence', async () => {
    const confirmAction = vi.fn(async () => false);

    const plan = await planProjectGuidance({
      repoRoot: '/repo',
      packs: realizedPacks,
      explicitChoice: true,
      interactive: false,
      confirmAction,
    });

    expect(plan).toMatchObject({
      repoRoot: '/repo',
      target: '/repo/AGENTS.md',
      action: 'create',
      sectionKey: 'tools',
      legacySectionAction: 'remove',
      choice: { choice: 'accepted', source: 'flag' },
    });
    expect(plan.body).toContain('**docs**');
    expect(plan.body).toContain('**workflows**');
    expect(plan.body).toContain('**utility**');
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it('plans an explicit decline without a mutation', async () => {
    const plan = await planProjectGuidance({
      repoRoot: '/repo',
      packs: realizedPacks,
      explicitChoice: false,
      interactive: true,
      confirmAction: vi.fn(async () => true),
    });

    expect(plan.action).toBe('declined');
    expect(plan.legacySectionAction).toBe('preserve');
    expect(plan.choice).toEqual({ choice: 'declined', source: 'flag' });
  });

  it('prompts exactly once and defaults to decline', async () => {
    const confirmAction = vi.fn(async () => false);

    const plan = await planProjectGuidance({
      repoRoot: '/repo',
      packs: realizedPacks,
      interactive: true,
      confirmAction,
    });

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(confirmAction.mock.calls[0]?.[0]).toContain('AGENTS.md');
    expect(plan.action).toBe('declined');
    expect(plan.choice).toEqual({ choice: 'declined', source: 'prompt' });
  });

  it('defaults non-interactive use to no write with an actionable notice', async () => {
    const confirmAction = vi.fn(async () => true);

    const plan = await planProjectGuidance({
      repoRoot: '/repo',
      packs: realizedPacks,
      interactive: false,
      confirmAction,
    });

    expect(plan.action).toBe('not-requested');
    expect(plan.choice).toEqual({
      choice: 'not-requested',
      source: 'non-interactive-default',
    });
    expect(plan.reason).toContain('--project-guidance');
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it('blocks explicit acceptance outside a repository', async () => {
    const plan = await planProjectGuidance({
      repoRoot: null,
      packs: realizedPacks,
      explicitChoice: true,
      interactive: false,
      confirmAction: vi.fn(async () => false),
    });

    expect(plan.action).toBe('blocked');
    expect(plan.reason).toContain('repository root');
  });
});

describe('buildToolPacksSectionBody', () => {
  it('keeps tool guidance independent of PJM adoption', () => {
    const body = buildToolPacksSectionBody(realizedPacks);

    expect(body).toContain('## Tool Packs');
    expect(body).toContain('Workflow Execution Continuation');
    expect(body).not.toContain('PJM');
    expect(body).not.toContain('project-management -->');
    expect(body).not.toContain('oat pjm init');
  });
});

describe('buildToolPacksSectionBody skills directories', () => {
  function directoryLines(body: string): string[] {
    return body.split('\n').filter((line) => line.includes('.agents/skills/'));
  }

  it('names only ~/.agents/skills/ when every pack is at user scope', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'core', scope: 'user' },
      { pack: 'workflows', scope: 'user' },
    ]);

    expect(body).toContain(
      '- **User skills directory:** `~/.agents/skills/` (core, workflows packs installed at user scope)',
    );
    expect(body).toContain('scan `~/.agents/skills/*/SKILL.md`');
    expect(body).not.toContain('`.agents/skills/');
    for (const line of directoryLines(body)) {
      expect(line).toContain('~/.agents/skills/');
    }
  });

  it('names only .agents/skills/ when every pack is at project scope', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'docs', scope: 'project' },
      { pack: 'workflows', scope: 'project' },
    ]);

    expect(body).toContain(
      '- **Project skills directory:** `.agents/skills/` (docs, workflows packs installed at project scope)',
    );
    expect(body).toContain('scan `.agents/skills/*/SKILL.md`');
    expect(body).not.toContain('~/.agents/skills/');
  });

  it('names both directories for mixed placement, each with its own packs', () => {
    const body = buildToolPacksSectionBody([
      { pack: 'core', scope: 'user' },
      { pack: 'docs', scope: 'project' },
      { pack: 'utility', scope: 'both' },
    ]);

    expect(body).toContain(
      '- **Project skills directory:** `.agents/skills/` (docs, utility packs installed at project scope)',
    );
    expect(body).toContain(
      '- **User skills directory:** `~/.agents/skills/` (core, utility packs installed at user scope)',
    );
    expect(body).toContain(
      'scan `.agents/skills/*/SKILL.md` and `~/.agents/skills/*/SKILL.md`',
    );
  });

  it('describes unrelated project skills separately from user-scope packs', () => {
    const body = buildToolPacksSectionBody(
      [
        { pack: 'core', scope: 'user' },
        { pack: 'workflows', scope: 'user' },
      ],
      { otherProjectSkills: ['team-release-notes'] },
    );

    expect(body).toContain(
      '- **User skills directory:** `~/.agents/skills/` (core, workflows packs installed at user scope)',
    );
    expect(body).not.toContain('Project skills directory');
    expect(body).toContain(
      '- **Other project skills:** `.agents/skills/` also holds repository skills that belong to no OAT pack; they are not OAT pack skills.',
    );
    expect(body).not.toContain('team-release-notes');
    const installedPacks = body.slice(body.indexOf('### Installed Packs'));
    expect(installedPacks).not.toContain('.agents/skills/');
  });

  it('names no skills directory when no pack is installed and no project skill exists', () => {
    const body = buildToolPacksSectionBody([]);

    expect(body).not.toContain('.agents/skills/');
    expect(body).toContain('`oat tools update`');
  });
});

describe('realized guidance state', () => {
  function inventoryFor(placements: Record<string, 'project' | 'user'>) {
    return vi.fn(
      async ({
        pack,
        projectRoot,
        userRoot,
      }: {
        pack: string;
        projectRoot?: string;
        userRoot?: string;
      }) => {
        const scopes = (['project', 'user'] as const).flatMap((scope) => {
          if (scope === 'project' && !projectRoot) return [];
          if (scope === 'user' && !userRoot) return [];
          const realized = placements[pack] === scope;
          return [
            {
              pack,
              scope,
              intent: {
                pack,
                scope,
                enabled: realized,
                source: realized ? ('declared' as const) : ('none' as const),
                configPath: `/${scope}/.oat/config.json`,
                diagnostics: [],
              },
              completeness: realized
                ? ('complete' as const)
                : ('absent' as const),
              assets: realized
                ? [
                    {
                      definition: {
                        id: `${pack}-fixture`,
                        kind: 'skill' as const,
                        destination: `.agents/skills/${pack}-fixture`,
                        scopes: [scope],
                        ownership: { [scope]: 'managed' as const },
                      },
                      path: `/${scope}/.agents/skills/${pack}-fixture`,
                      status: 'current' as const,
                      installedVersion: '1.0.0',
                      bundledVersion: '1.0.0',
                    },
                  ]
                : [],
              diagnostics: [],
            },
          ];
        });
        return {
          pack,
          placement: placements[pack] ?? ('unavailable' as const),
          scopes,
          diagnostics: [],
        };
      },
    );
  }

  function projectSkill(name: string, pack: string) {
    return {
      name,
      type: 'skill' as const,
      scope: 'project' as const,
      version: '1.0.0',
      bundledVersion: pack === 'custom' ? null : '1.0.0',
      pack,
      status: pack === 'custom' ? 'not-bundled' : 'current',
    };
  }

  const context = {
    scope: 'all',
    dryRun: false,
    verbose: false,
    json: true,
    cwd: '/repo',
    home: '/home',
    interactive: false,
    logger: {} as never,
  } as never;

  it('decides by pack membership, not by skills directory existence', async () => {
    const scanTools = vi.fn(async ({ scope }: { scope: string }) =>
      scope === 'project'
        ? [
            // A pack member left in the project directory while its pack is
            // installed at user scope is neither a project pack nor unrelated.
            projectSkill('oat-docs-analyze', 'docs'),
            projectSkill('team-release-notes', 'custom'),
          ]
        : [],
    );

    const state = await loadRealizedGuidanceState(context, '/repo', {
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      resolveScopeRoot: vi.fn(() => '/home'),
      reconcilePacks: vi.fn(),
      inventoryPack: inventoryFor({
        core: 'user',
        docs: 'user',
      }) as never,
      scanTools: scanTools as never,
    });

    expect(state.packs).toEqual([
      { pack: 'core', scope: 'user' },
      { pack: 'docs', scope: 'user' },
    ]);
    expect(state.otherProjectSkills).toEqual(['team-release-notes']);
  });

  it('reports no unrelated project skills for an empty project skills directory', async () => {
    const state = await loadRealizedGuidanceState(context, '/repo', {
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      resolveScopeRoot: vi.fn(() => '/home'),
      reconcilePacks: vi.fn(),
      inventoryPack: inventoryFor({ core: 'user' }) as never,
      scanTools: vi.fn(async () => []) as never,
    });

    expect(state.otherProjectSkills).toEqual([]);
    expect(buildToolPacksSectionBody(state.packs, state)).not.toContain(
      '`.agents/skills/',
    );
  });

  it('does not scan project skills outside a repository', async () => {
    const scanTools = vi.fn(async () => []);

    const state = await loadRealizedGuidanceState(context, null, {
      resolveAssetsRoot: vi.fn(async () => '/assets'),
      resolveScopeRoot: vi.fn(() => '/home'),
      reconcilePacks: vi.fn(),
      inventoryPack: inventoryFor({ core: 'user' }) as never,
      scanTools: scanTools as never,
    });

    expect(state.otherProjectSkills).toEqual([]);
    expect(scanTools).not.toHaveBeenCalled();
  });
});
