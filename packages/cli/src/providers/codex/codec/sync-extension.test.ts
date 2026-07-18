import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import type { CanonicalEntry } from '@engine/index';
import { afterEach, describe, expect, it } from 'vitest';

import { buildCodexMaterializedRoleName } from './materialize';
import {
  applyCodexProjectExtensionPlan,
  computeCodexProjectExtensionPlan,
} from './sync-extension';

function canonicalAgentFileContent(name: string): string {
  return `---\nname: ${name}\ndescription: ${name} description\n---\n\n## Role\n${name}`;
}

describe('codex sync extension', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('plans and applies codex role/config creation and then becomes idempotent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalFile = join(canonicalDir, 'oat-reviewer.md');
    await writeFile(canonicalFile, canonicalAgentFileContent('oat-reviewer'));

    const canonicalEntries: CanonicalEntry[] = [
      {
        name: 'oat-reviewer.md',
        type: 'agent',
        canonicalPath: canonicalFile,
        isFile: true,
      },
    ];

    const firstPlan = await computeCodexProjectExtensionPlan(
      root,
      canonicalEntries,
    );
    expect(firstPlan).toMatchObject({
      provider: 'codex',
      managedEntries: firstPlan.managedRoles,
      aggregateHash: firstPlan.aggregateConfigHash,
      metadata: {
        managedRoles: firstPlan.managedRoles,
        aggregateConfigHash: firstPlan.aggregateConfigHash,
      },
    });
    expect(
      firstPlan.operations.every((operation) => operation.provider === 'codex'),
    ).toBe(true);
    expect(firstPlan.operations.some((op) => op.action === 'create')).toBe(
      true,
    );

    const applyResult = await applyCodexProjectExtensionPlan(root, firstPlan);
    expect(applyResult.failed).toBe(0);
    expect(applyResult.applied).toBeGreaterThan(0);

    const roleFile = await readFile(
      join(root, '.codex', 'agents', 'oat-reviewer.toml'),
      'utf8',
    );
    const configFile = await readFile(
      join(root, '.codex', 'config.toml'),
      'utf8',
    );
    expect(roleFile).toContain('developer_instructions');
    expect(configFile).toContain('multi_agent = true');

    const secondPlan = await computeCodexProjectExtensionPlan(
      root,
      canonicalEntries,
    );
    expect(secondPlan.operations.every((op) => op.action === 'skip')).toBe(
      true,
    );
  });

  it('inherits a higher user max depth into project config without mutating user config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    const home = await mkdtemp(join(tmpdir(), 'oat-codex-home-'));
    tempDirs.push(root, home);

    await mkdir(join(home, '.codex'), { recursive: true });
    const userConfigPath = join(home, '.codex', 'config.toml');
    const userConfig = '[agents]\nmax_depth = 5\n';
    await writeFile(userConfigPath, userConfig);

    const firstPlan = await computeCodexProjectExtensionPlan(
      root,
      [],
      undefined,
      { userConfigDir: join(home, '.oat') },
    );
    const firstConfigOperation = firstPlan.operations.find(
      (operation) => operation.target === 'config',
    );

    expect(firstConfigOperation).toMatchObject({
      action: 'create',
      path: '.codex/config.toml',
    });
    expect(firstConfigOperation?.content).toContain('max_depth = 5');
    await expect(
      readFile(join(root, '.codex', 'config.toml'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(userConfigPath, 'utf8')).resolves.toBe(userConfig);

    await applyCodexProjectExtensionPlan(root, firstPlan);
    await expect(readFile(userConfigPath, 'utf8')).resolves.toBe(userConfig);

    const secondPlan = await computeCodexProjectExtensionPlan(
      root,
      [],
      undefined,
      { userConfigDir: join(home, '.oat') },
    );
    expect(
      secondPlan.operations.find((operation) => operation.target === 'config'),
    ).toMatchObject({ action: 'skip' });
    expect(secondPlan.aggregateConfigHash).toBe(firstPlan.aggregateConfigHash);
  });

  it('updates project config to the higher inherited user max depth', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    const home = await mkdtemp(join(tmpdir(), 'oat-codex-home-'));
    tempDirs.push(root, home);

    await mkdir(join(root, '.codex'), { recursive: true });
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'config.toml'),
      '[agents]\nmax_depth = 2\n',
    );
    await writeFile(
      join(home, '.codex', 'config.toml'),
      '[agents]\nmax_depth = 4\n',
    );

    const plan = await computeCodexProjectExtensionPlan(root, [], undefined, {
      userConfigDir: join(home, '.oat'),
    });
    const configOperation = plan.operations.find(
      (operation) => operation.target === 'config',
    );

    expect(configOperation).toMatchObject({ action: 'update' });
    expect(configOperation?.content).toContain('max_depth = 4');
  });

  it.each([
    ['missing', null],
    ['lower', '[agents]\nmax_depth = 1\n'],
  ])(
    'ignores %s inherited user depth when project config already meets the floor',
    async (_label, userConfig) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
      const home = await mkdtemp(join(tmpdir(), 'oat-codex-home-'));
      tempDirs.push(root, home);

      await mkdir(join(root, '.codex'), { recursive: true });
      await writeFile(
        join(root, '.codex', 'config.toml'),
        '[features]\nmulti_agent = true\n\n[agents]\nmax_depth = 2\n',
      );
      if (userConfig !== null) {
        await mkdir(join(home, '.codex'), { recursive: true });
        await writeFile(join(home, '.codex', 'config.toml'), userConfig);
      }

      const plan = await computeCodexProjectExtensionPlan(root, [], undefined, {
        userConfigDir: join(home, '.oat'),
      });

      expect(
        plan.operations.find((operation) => operation.target === 'config'),
      ).toMatchObject({ action: 'skip' });
    },
  );

  it('keeps user-scope depth isolated from project config', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-codex-home-'));
    const project = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(home, project);

    await mkdir(join(home, '.codex'), { recursive: true });
    await mkdir(join(project, '.codex'), { recursive: true });
    await writeFile(
      join(home, '.codex', 'config.toml'),
      '[agents]\nmax_depth = 1\n',
    );
    const projectConfig = '[agents]\nmax_depth = 8\n';
    const projectConfigPath = join(project, '.codex', 'config.toml');
    await writeFile(projectConfigPath, projectConfig);

    const plan = await computeCodexProjectExtensionPlan(home, [], undefined, {
      userConfigDir: join(home, '.oat'),
    });
    const configOperation = plan.operations.find(
      (operation) => operation.target === 'config',
    );

    expect(configOperation).toMatchObject({ action: 'update' });
    expect(configOperation?.content).toContain('max_depth = 2');
    expect(configOperation?.content).not.toContain('max_depth = 8');
    await applyCodexProjectExtensionPlan(home, plan);
    await expect(readFile(projectConfigPath, 'utf8')).resolves.toBe(
      projectConfig,
    );
  });

  it('generates materialized codex roles from matrix targets for oat-phase-implementer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-terra',
                    effort: 'xhigh',
                  },
                ],
              },
            },
          },
        },
      }),
      'utf8',
    );

    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalFile = join(canonicalDir, 'oat-phase-implementer.md');
    await writeFile(
      canonicalFile,
      canonicalAgentFileContent('oat-phase-implementer'),
    );

    const canonicalEntries: CanonicalEntry[] = [
      {
        name: 'oat-phase-implementer.md',
        type: 'agent',
        canonicalPath: canonicalFile,
        isFile: true,
      },
    ];

    const plan = await computeCodexProjectExtensionPlan(root, canonicalEntries);
    const rolePaths = plan.operations
      .filter((op) => op.target === 'role')
      .map((op) => op.path);
    const roleName = 'oat-phase-implementer-gpt-5-6-terra-xhigh';

    expect(rolePaths).toContain('.codex/agents/oat-phase-implementer.toml');
    expect(rolePaths).toContain(`.codex/agents/${roleName}.toml`);
    expect(rolePaths).not.toContain(
      '.codex/agents/oat-phase-implementer-high.toml',
    );
    expect(plan.managedRoles).toEqual(
      expect.arrayContaining(['oat-phase-implementer', roleName]),
    );
    expect(plan.managedRoles).toHaveLength(14);

    const applyResult = await applyCodexProjectExtensionPlan(root, plan);
    expect(applyResult.failed).toBe(0);

    const materializedRole = await readFile(
      join(root, '.codex', 'agents', `${roleName}.toml`),
      'utf8',
    );
    const configFile = await readFile(
      join(root, '.codex', 'config.toml'),
      'utf8',
    );

    expect(materializedRole).toContain(`# oat-role: ${roleName}`);
    expect(materializedRole).toContain('model = "gpt-5.6-terra"');
    expect(materializedRole).toContain('model_reasoning_effort = "xhigh"');
    expect(configFile).toContain(`[agents.${roleName}]`);
  });

  it('materializes every project ladder candidate for both roles idempotently', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: {
                  candidates: [
                    {
                      harness: 'codex',
                      model: 'custom-lower-model',
                      effort: 'medium',
                    },
                    {
                      harness: 'codex',
                      model: 'custom-ceiling-model',
                      effort: 'high',
                    },
                  ],
                },
              },
            },
          },
        },
      }),
      'utf8',
    );

    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalEntries = await Promise.all(
      ['oat-phase-implementer', 'oat-reviewer'].map(async (role) => {
        const canonicalPath = join(canonicalDir, `${role}.md`);
        await writeFile(canonicalPath, canonicalAgentFileContent(role));
        return {
          name: `${role}.md`,
          type: 'agent' as const,
          canonicalPath,
          isFile: true,
        };
      }),
    );

    const first = await computeCodexProjectExtensionPlan(
      root,
      canonicalEntries,
    );
    const rolePaths = first.operations
      .filter((op) => op.target === 'role')
      .map((op) => op.path);
    const customRoles = ['oat-phase-implementer', 'oat-reviewer'].flatMap(
      (agentName) =>
        [
          ['custom-lower-model', 'medium'],
          ['custom-ceiling-model', 'high'],
        ].map(([model, effort]) =>
          buildCodexMaterializedRoleName({ agentName, model, effort }),
        ),
    );

    for (const role of customRoles) {
      expect(rolePaths).toContain(`.codex/agents/${role}.toml`);
      expect(
        first.operations.find((operation) => operation.roleName === role)
          ?.content,
      ).toContain('# oat-owner: project-config');
    }
    expect(first.managedRoles).toHaveLength(32);

    const applied = await applyCodexProjectExtensionPlan(root, first);
    expect(applied.failed).toBe(0);
    const trackedFiles = [
      join(root, '.codex', 'config.toml'),
      ...customRoles.map((role) =>
        join(root, '.codex', 'agents', `${role}.toml`),
      ),
    ];
    const firstBytes = await Promise.all(
      trackedFiles.map((path) => readFile(path, 'utf8')),
    );
    const second = await computeCodexProjectExtensionPlan(
      root,
      canonicalEntries,
    );
    expect(
      second.operations.every((operation) => operation.action === 'skip'),
    ).toBe(true);
    const secondBytes = await Promise.all(
      trackedFiles.map((path) => readFile(path, 'utf8')),
    );
    expect(secondBytes).toEqual(firstBytes);
  });

  it('generates materialized codex roles from local config matrix targets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      JSON.stringify({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-luna',
                    effort: 'high',
                  },
                ],
              },
            },
          },
        },
      }),
      'utf8',
    );

    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalFile = join(canonicalDir, 'oat-reviewer.md');
    await writeFile(canonicalFile, canonicalAgentFileContent('oat-reviewer'));

    const plan = await computeCodexProjectExtensionPlan(root, [
      {
        name: 'oat-reviewer.md',
        type: 'agent',
        canonicalPath: canonicalFile,
        isFile: true,
      },
    ]);

    expect(plan.managedRoles).toEqual(
      expect.arrayContaining([
        'oat-reviewer',
        'oat-reviewer-gpt-5-6-luna-high',
      ]),
    );
    expect(plan.managedRoles).toHaveLength(14);
  });

  it('generates materialized codex roles from active project state matrix targets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    await mkdir(join(root, '.oat', 'projects', 'shared', 'demo'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      JSON.stringify({
        version: 1,
        activeProject: '.oat/projects/shared/demo',
      }),
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  matrix:',
        '    codex:',
        '      high:',
        '        candidates:',
        '          - harness: codex',
        '            model: state-lower-model',
        '            effort: medium',
        '          - route:',
        '              - harness: claude',
        '                model: claude-sonnet',
        '              - harness: codex',
        '                model: state-route-model',
        '                effort: high',
        '          - harness: codex',
        '            model: state-ceiling-model',
        '            effort: xhigh',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalFile = join(canonicalDir, 'oat-phase-implementer.md');
    await writeFile(
      canonicalFile,
      canonicalAgentFileContent('oat-phase-implementer'),
    );

    const plan = await computeCodexProjectExtensionPlan(root, [
      {
        name: 'oat-phase-implementer.md',
        type: 'agent',
        canonicalPath: canonicalFile,
        isFile: true,
      },
    ]);

    const stateRoles = [
      ['state-lower-model', 'medium'],
      ['state-route-model', 'high'],
      ['state-ceiling-model', 'xhigh'],
    ].map(([model, effort]) =>
      buildCodexMaterializedRoleName({
        agentName: 'oat-phase-implementer',
        model,
        effort,
      }),
    );
    expect(plan.managedRoles).toEqual(
      expect.arrayContaining(['oat-phase-implementer', ...stateRoles]),
    );
    expect(plan.managedRoles).toHaveLength(17);
    expect(
      plan.operations.some((operation) =>
        operation.roleName?.includes('claude-sonnet'),
      ),
    ).toBe(false);
  });

  it('does not materialize targets from an external active project', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    const externalProject = await mkdtemp(
      join(tmpdir(), 'oat-external-project-'),
    );
    tempDirs.push(root, externalProject);
    await mkdir(join(root, '.oat'), { recursive: true });
    const externalRelativePath = relative(root, externalProject);
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      JSON.stringify({
        version: 1,
        activeProject: externalRelativePath,
      }),
      'utf8',
    );
    await writeFile(
      join(externalProject, 'state.md'),
      [
        '---',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  matrix:',
        '    codex:',
        '      high:',
        '        - harness: codex',
        '          model: gpt-5.9-external-state',
        '          effort: high',
        '---',
        '',
      ].join('\n'),
      'utf8',
    );
    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalPath = join(canonicalDir, 'oat-reviewer.md');
    await writeFile(canonicalPath, canonicalAgentFileContent('oat-reviewer'));
    const externalRole = buildCodexMaterializedRoleName({
      agentName: 'oat-reviewer',
      model: 'gpt-5.9-external-state',
      effort: 'high',
    });

    const plan = await computeCodexProjectExtensionPlan(root, [
      {
        name: 'oat-reviewer.md',
        type: 'agent',
        canonicalPath,
        isFile: true,
      },
    ]);

    expect(plan.managedRoles).not.toContain(externalRole);
    expect(
      plan.operations.some((operation) =>
        operation.content?.includes('gpt-5.9-external-state'),
      ),
    ).toBe(false);
    await expect(
      applyCodexProjectExtensionPlan(root, plan),
    ).resolves.toMatchObject({ failed: 0 });
    await expect(
      readFile(join(root, '.codex', 'config.toml'), 'utf8'),
    ).resolves.not.toContain(externalRole);
  });

  it('does not materialize targets through an active-project symlink outside the sync root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    const externalProject = await mkdtemp(
      join(tmpdir(), 'oat-external-project-'),
    );
    tempDirs.push(root, externalProject);
    const projectsRoot = join(root, '.oat', 'projects', 'shared');
    const linkedProject = join(projectsRoot, 'external-link');
    await mkdir(projectsRoot, { recursive: true });
    await symlink(externalProject, linkedProject, 'dir');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      JSON.stringify({
        version: 1,
        activeProject: '.oat/projects/shared/external-link',
      }),
      'utf8',
    );
    await writeFile(
      join(externalProject, 'state.md'),
      [
        '---',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  matrix:',
        '    codex:',
        '      high:',
        '        - harness: codex',
        '          model: gpt-5.9-symlink-state',
        '          effort: high',
        '---',
        '',
      ].join('\n'),
      'utf8',
    );
    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalPath = join(canonicalDir, 'oat-reviewer.md');
    await writeFile(canonicalPath, canonicalAgentFileContent('oat-reviewer'));
    const externalRole = buildCodexMaterializedRoleName({
      agentName: 'oat-reviewer',
      model: 'gpt-5.9-symlink-state',
      effort: 'high',
    });

    const plan = await computeCodexProjectExtensionPlan(root, [
      {
        name: 'oat-reviewer.md',
        type: 'agent',
        canonicalPath,
        isFile: true,
      },
    ]);

    expect(plan.managedRoles).not.toContain(externalRole);
    expect(
      plan.operations.some((operation) =>
        operation.content?.includes('gpt-5.9-symlink-state'),
      ),
    ).toBe(false);
  });

  it.each([
    ['relative', (root: string, external: string) => relative(root, external)],
    ['absolute', (_root: string, external: string) => external],
  ])(
    'rejects an explicit %s project path outside the sync root',
    async (_label, projectPath) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
      const externalProject = await mkdtemp(
        join(tmpdir(), 'oat-external-project-'),
      );
      tempDirs.push(root, externalProject);
      await writeFile(
        join(externalProject, 'state.md'),
        '---\noat_dispatch_policy: {}\n---\n',
        'utf8',
      );

      await expect(
        computeCodexProjectExtensionPlan(root, [], undefined, {
          projectPath: projectPath(root, externalProject),
        }),
      ).rejects.toThrow(/inside repo root/i);
    },
  );

  it('rejects an explicit project symlink whose real target escapes the sync root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    const externalProject = await mkdtemp(
      join(tmpdir(), 'oat-external-project-'),
    );
    tempDirs.push(root, externalProject);
    const projectsRoot = join(root, '.oat', 'projects', 'shared');
    const linkedProject = join(projectsRoot, 'external-link');
    await mkdir(projectsRoot, { recursive: true });
    await symlink(externalProject, linkedProject, 'dir');
    await writeFile(
      join(externalProject, 'state.md'),
      '---\noat_dispatch_policy: {}\n---\n',
      'utf8',
    );

    await expect(
      computeCodexProjectExtensionPlan(root, [], undefined, {
        projectPath: '.oat/projects/shared/external-link',
      }),
    ).rejects.toThrow(/inside repo root/i);
  });

  it('accepts an explicit project symlink whose real target stays inside the sync root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);
    const projectsRoot = join(root, '.oat', 'projects', 'shared');
    const realProject = join(projectsRoot, 'real-project');
    const linkedProject = join(projectsRoot, 'linked-project');
    await mkdir(realProject, { recursive: true });
    await symlink('real-project', linkedProject, 'dir');
    await writeFile(
      join(realProject, 'state.md'),
      '---\noat_dispatch_policy: {}\n---\n',
      'utf8',
    );

    await expect(
      computeCodexProjectExtensionPlan(root, [], undefined, {
        projectPath: '.oat/projects/shared/linked-project',
      }),
    ).resolves.toMatchObject({ managedRoles: [] });
  });

  it('generates materialized codex roles from matrix targets for oat-reviewer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-terra',
                    effort: 'xhigh',
                  },
                ],
              },
            },
          },
        },
      }),
      'utf8',
    );

    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalFile = join(canonicalDir, 'oat-reviewer.md');
    await writeFile(canonicalFile, canonicalAgentFileContent('oat-reviewer'));

    const canonicalEntries: CanonicalEntry[] = [
      {
        name: 'oat-reviewer.md',
        type: 'agent',
        canonicalPath: canonicalFile,
        isFile: true,
      },
    ];

    const plan = await computeCodexProjectExtensionPlan(root, canonicalEntries);
    const rolePaths = plan.operations
      .filter((op) => op.target === 'role')
      .map((op) => op.path);
    const roleName = 'oat-reviewer-gpt-5-6-terra-xhigh';

    expect(rolePaths).toContain('.codex/agents/oat-reviewer.toml');
    expect(rolePaths).toContain(`.codex/agents/${roleName}.toml`);
    expect(rolePaths).not.toContain('.codex/agents/oat-reviewer-high.toml');
    expect(plan.managedRoles).toEqual(
      expect.arrayContaining(['oat-reviewer', roleName]),
    );
    expect(plan.managedRoles).toHaveLength(14);

    const applyResult = await applyCodexProjectExtensionPlan(root, plan);
    expect(applyResult.failed).toBe(0);

    const materializedRole = await readFile(
      join(root, '.codex', 'agents', `${roleName}.toml`),
      'utf8',
    );
    const configFile = await readFile(
      join(root, '.codex', 'config.toml'),
      'utf8',
    );

    expect(materializedRole).toContain(`# oat-role: ${roleName}`);
    expect(materializedRole).toContain('model = "gpt-5.6-terra"');
    expect(materializedRole).toContain('model_reasoning_effort = "xhigh"');
    expect(configFile).toContain(`[agents.${roleName}]`);

    const secondPlan = await computeCodexProjectExtensionPlan(
      root,
      canonicalEntries,
    );
    expect(secondPlan.operations.every((op) => op.action === 'skip')).toBe(
      true,
    );
  });

  it('removes stale managed effort-only roles during full sync', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalFile = join(canonicalDir, 'oat-reviewer.md');
    await writeFile(canonicalFile, canonicalAgentFileContent('oat-reviewer'));
    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'agents', 'oat-reviewer-high.toml'),
      '# oat-managed: true\n# oat-role: oat-reviewer-high\ndeveloper_instructions = "review"\n',
      'utf8',
    );
    await writeFile(
      join(root, '.codex', 'config.toml'),
      '[agents.oat-reviewer-high]\ndescription = "stale"\nconfig_file = "agents/oat-reviewer-high.toml"\n\n[features]\nmulti_agent = true\n',
      'utf8',
    );

    const plan = await computeCodexProjectExtensionPlan(root, [
      {
        name: 'oat-reviewer.md',
        type: 'agent',
        canonicalPath: canonicalFile,
        isFile: true,
      },
    ]);

    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'remove',
          target: 'role',
          roleName: 'oat-reviewer-high',
        }),
      ]),
    );
  });

  it('does not remove unrelated managed roles during partial install-triggered sync', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalFile = join(canonicalDir, 'skeptical-evaluator.md');
    await writeFile(
      canonicalFile,
      canonicalAgentFileContent('skeptical-evaluator'),
    );

    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'agents', 'skeptical-evaluator.toml'),
      '# OAT managed role: skeptical-evaluator\ndeveloper_instructions = "review"\n',
      'utf8',
    );
    await writeFile(
      join(root, '.codex', 'config.toml'),
      '[agents.skeptical-evaluator]\ndescription = "skeptical-evaluator description"\nconfig_file = "agents/skeptical-evaluator.toml"\n\n[features]\nmulti_agent = true\n',
      'utf8',
    );

    const partialPlan = await computeCodexProjectExtensionPlan(
      root,
      [
        {
          name: 'skeptical-evaluator.md',
          type: 'agent',
          canonicalPath: canonicalFile,
          isFile: true,
        },
      ],
      ['.agents/skills/oat-docs-analyze'],
    );

    expect(partialPlan.operations.some((op) => op.action === 'remove')).toBe(
      false,
    );
    expect(partialPlan.operations).toEqual([]);
  });

  it('is a no-op for partial sync scopes with no codex-managed agent content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    const partialPlan = await computeCodexProjectExtensionPlan(
      root,
      [],
      ['.agents/skills/oat-docs-analyze'],
    );

    expect(partialPlan.operations).toEqual([]);
    expect(partialPlan.managedRoles).toEqual([]);
  });

  it('ignores malformed user codex config during zero-role partial sync', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    const home = await mkdtemp(join(tmpdir(), 'oat-codex-home-'));
    tempDirs.push(root, home);

    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(
      join(home, '.codex', 'config.toml'),
      '[agents\nmax_depth = 5\n',
    );

    const partialPlan = await computeCodexProjectExtensionPlan(
      root,
      [],
      ['.agents/skills/oat-docs-analyze'],
      { userConfigDir: join(home, '.oat') },
    );

    expect(partialPlan.operations).toEqual([]);
    expect(partialPlan.managedRoles).toEqual([]);
  });

  it('does not update an existing user codex config during zero-role partial sync', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(join(root, '.codex', 'config.toml'), 'model = "gpt-5"\n');

    const partialPlan = await computeCodexProjectExtensionPlan(
      root,
      [],
      ['.agents/skills/oat-docs-analyze'],
    );

    expect(partialPlan.operations).toEqual([]);
    expect(partialPlan.managedRoles).toEqual([]);
  });

  it('generates the complete supported project catalogue for both managed base roles', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);
    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });

    const canonicalEntries: CanonicalEntry[] = [];
    for (const name of ['oat-phase-implementer', 'oat-reviewer']) {
      const canonicalPath = join(canonicalDir, `${name}.md`);
      await writeFile(canonicalPath, canonicalAgentFileContent(name));
      canonicalEntries.push({
        name: `${name}.md`,
        type: 'agent',
        canonicalPath,
        isFile: true,
      });
    }

    const plan = await computeCodexProjectExtensionPlan(root, canonicalEntries);
    const pinnedRoles = plan.managedRoles.filter(
      (role) =>
        role.startsWith('oat-phase-implementer-gpt-') ||
        role.startsWith('oat-reviewer-gpt-'),
    );

    expect(pinnedRoles).toHaveLength(26);
    expect(new Set(pinnedRoles)).toHaveLength(26);
    expect(pinnedRoles).toContain('oat-phase-implementer-gpt-5-6-sol-max');
    expect(pinnedRoles).toContain('oat-reviewer-gpt-5-6-sol-max');

    const supportedRole = plan.operations.find(
      (operation) => operation.roleName === 'oat-reviewer-gpt-5-6-sol-max',
    );
    expect(supportedRole?.content).toContain(
      '# oat-owner: supported-catalogue',
    );
  });

  it('materializes project-config custom targets only in the project view', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    const home = await mkdtemp(join(tmpdir(), 'oat-codex-home-'));
    tempDirs.push(root, home);

    await mkdir(join(root, '.oat'), { recursive: true });
    await mkdir(join(home, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      JSON.stringify({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.7-project-custom',
                    effort: 'high',
                  },
                ],
              },
            },
          },
        },
      }),
      'utf8',
    );
    await writeFile(
      join(home, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.7-user-custom',
                    effort: 'high',
                  },
                ],
              },
            },
          },
        },
      }),
      'utf8',
    );

    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalPath = join(canonicalDir, 'oat-reviewer.md');
    await writeFile(canonicalPath, canonicalAgentFileContent('oat-reviewer'));
    const plan = await computeCodexProjectExtensionPlan(
      root,
      [
        {
          name: 'oat-reviewer.md',
          type: 'agent',
          canonicalPath,
          isFile: true,
        },
      ],
      undefined,
      { userConfigDir: join(home, '.oat') },
    );

    const projectRole = buildCodexMaterializedRoleName({
      agentName: 'oat-reviewer',
      model: 'gpt-5.7-project-custom',
      effort: 'high',
    });
    const userRole = buildCodexMaterializedRoleName({
      agentName: 'oat-reviewer',
      model: 'gpt-5.7-user-custom',
      effort: 'high',
    });
    expect(plan.managedRoles).toContain(projectRole);
    expect(plan.managedRoles).not.toContain(userRole);
    expect(
      plan.operations.find((operation) => operation.roleName === projectRole)
        ?.content,
    ).toContain('# oat-owner: project-config');
  });

  it('writes distinct deterministic roles for punctuation-equivalent custom targets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      JSON.stringify({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'vendor/model.x',
                    effort: 'high',
                  },
                  {
                    harness: 'codex',
                    model: 'vendor.model.x',
                    effort: 'high',
                  },
                ],
              },
            },
          },
        },
      }),
      'utf8',
    );
    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalPath = join(canonicalDir, 'oat-reviewer.md');
    await writeFile(canonicalPath, canonicalAgentFileContent('oat-reviewer'));
    const canonicalEntries: CanonicalEntry[] = [
      {
        name: 'oat-reviewer.md',
        type: 'agent',
        canonicalPath,
        isFile: true,
      },
    ];

    const first = await computeCodexProjectExtensionPlan(
      root,
      canonicalEntries,
    );
    const customRoles = first.managedRoles.filter((role) =>
      role.startsWith('oat-reviewer-vendor-model-x'),
    );
    expect(customRoles).toHaveLength(2);
    expect(new Set(customRoles).size).toBe(2);
    const customWrites = first.operations.filter(
      (operation) =>
        operation.target === 'role' &&
        customRoles.includes(operation.roleName ?? ''),
    );
    expect(customWrites).toHaveLength(2);
    expect(customWrites.map((operation) => operation.content)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('model = "vendor/model.x"'),
        expect.stringContaining('model = "vendor.model.x"'),
      ]),
    );

    await applyCodexProjectExtensionPlan(root, first);
    const second = await computeCodexProjectExtensionPlan(
      root,
      canonicalEntries,
    );
    expect(second.managedRoles).toEqual(first.managedRoles);
    expect(
      second.operations.every((operation) => operation.action === 'skip'),
    ).toBe(true);
  });

  it('materializes user-config custom targets only in the user view', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-codex-home-'));
    tempDirs.push(home);
    await mkdir(join(home, '.oat'), { recursive: true });
    await writeFile(
      join(home, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.7-user-custom',
                    effort: 'high',
                  },
                ],
              },
            },
          },
        },
      }),
      'utf8',
    );
    const canonicalDir = join(home, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalEntries = await Promise.all(
      ['oat-phase-implementer', 'oat-reviewer'].map(async (role) => {
        const canonicalPath = join(canonicalDir, `${role}.md`);
        await writeFile(canonicalPath, canonicalAgentFileContent(role));
        return {
          name: `${role}.md`,
          type: 'agent' as const,
          canonicalPath,
          isFile: true,
        };
      }),
    );

    const plan = await computeCodexProjectExtensionPlan(
      home,
      canonicalEntries,
      undefined,
      { userConfigDir: join(home, '.oat') },
    );

    const userRole = buildCodexMaterializedRoleName({
      agentName: 'oat-reviewer',
      model: 'gpt-5.7-user-custom',
      effort: 'high',
    });
    expect(plan.managedRoles).toContain(userRole);
    expect(
      plan.managedRoles.some((role) => role.includes('gpt-5-6-sol-max')),
    ).toBe(false);
    expect(
      plan.operations.find((operation) => operation.roleName === userRole)
        ?.content,
    ).toContain('# oat-owner: user-config');
  });

  it('fails closed before stale user-role cleanup when managed base definitions are unavailable', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-codex-home-'));
    tempDirs.push(home);
    await mkdir(join(home, '.oat'), { recursive: true });
    await mkdir(join(home, '.codex', 'agents'), { recursive: true });
    await writeFile(
      join(home, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.7-user-custom',
                    effort: 'high',
                  },
                ],
              },
            },
          },
        },
      }),
      'utf8',
    );
    const roleName = 'oat-reviewer-gpt-5-7-user-custom-high';
    await writeFile(
      join(home, '.codex', 'agents', `${roleName}.toml`),
      [
        '# oat-managed: true',
        `# oat-role: ${roleName}`,
        '# oat-owner: user-config',
        'developer_instructions = "review"',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(home, '.codex', 'config.toml'),
      `[agents.${roleName}]\ndescription = "review"\nconfig_file = "agents/${roleName}.toml"\n`,
      'utf8',
    );

    await expect(
      computeCodexProjectExtensionPlan(home, [], undefined, {
        userConfigDir: join(home, '.oat'),
      }),
    ).rejects.toThrow(/managed Codex role definitions.*unavailable/i);
    await expect(
      readFile(join(home, '.codex', 'agents', `${roleName}.toml`), 'utf8'),
    ).resolves.toContain('# oat-owner: user-config');
  });

  it('removes only stale roles owned by the current configuration scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);
    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalPath = join(canonicalDir, 'custom-agent.md');
    await writeFile(canonicalPath, canonicalAgentFileContent('custom-agent'));
    await mkdir(join(root, '.codex', 'agents'), { recursive: true });

    const roles = [
      ['stale-project', 'project-config'],
      ['keep-user', 'user-config'],
      ['keep-supported', 'supported-catalogue'],
      ['keep-unrelated', null],
    ] as const;
    for (const [role, owner] of roles) {
      await writeFile(
        join(root, '.codex', 'agents', `${role}.toml`),
        [
          '# oat-managed: true',
          `# oat-role: ${role}`,
          ...(owner ? [`# oat-owner: ${owner}`] : []),
          'developer_instructions = "role"',
          '',
        ].join('\n'),
        'utf8',
      );
    }
    await writeFile(
      join(root, '.codex', 'config.toml'),
      roles
        .map(
          ([role]) =>
            `[agents.${role}]\ndescription = "${role}"\nconfig_file = "agents/${role}.toml"\n`,
        )
        .join('\n'),
      'utf8',
    );

    const plan = await computeCodexProjectExtensionPlan(root, [
      {
        name: 'custom-agent.md',
        type: 'agent',
        canonicalPath,
        isFile: true,
      },
    ]);
    const removed = plan.operations
      .filter((operation) => operation.action === 'remove')
      .map((operation) => operation.roleName);

    expect(removed).toEqual(['stale-project']);
    expect(plan.operations).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ roleName: 'keep-user', action: 'remove' }),
        expect.objectContaining({
          roleName: 'keep-supported',
          action: 'remove',
        }),
        expect.objectContaining({
          roleName: 'keep-unrelated',
          action: 'remove',
        }),
      ]),
    );
  });

  it('preserves stale files whose ownership appears only in body text or malformed headers', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);
    await mkdir(join(root, '.codex', 'agents'), { recursive: true });

    const roles = ['body-spoof', 'duplicate-owner'] as const;
    await writeFile(
      join(root, '.codex', 'agents', 'body-spoof.toml'),
      [
        'developer_instructions = """',
        '# oat-managed: true',
        '# oat-role: body-spoof',
        '# oat-owner: project-config',
        '"""',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(root, '.codex', 'agents', 'duplicate-owner.toml'),
      [
        '# oat-managed: true',
        '# oat-role: duplicate-owner',
        '# oat-owner: project-config',
        '# oat-owner: project-config',
        'developer_instructions = "role"',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(root, '.codex', 'config.toml'),
      roles
        .map(
          (role) =>
            `[agents.${role}]\ndescription = "${role}"\nconfig_file = "agents/${role}.toml"\n`,
        )
        .join('\n'),
      'utf8',
    );

    const plan = await computeCodexProjectExtensionPlan(root, []);

    expect(plan.operations).not.toEqual(
      expect.arrayContaining(
        roles.map((roleName) =>
          expect.objectContaining({ action: 'remove', roleName }),
        ),
      ),
    );
  });
});
