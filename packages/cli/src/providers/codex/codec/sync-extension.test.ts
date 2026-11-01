import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import type { CanonicalEntry } from '@engine/index';
import type {
  MaterializationContext,
  MaterializationExtension,
} from '@providers/shared';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';

import { buildCodexMaterializedRoleName } from './materialize';
import {
  isOatManagedCodexRoleFile,
  readOatManagedCodexRoleOwner,
} from './shared';
import {
  applyCodexProjectExtensionPlan,
  codexMaterializationExtension,
  computeCodexProjectExtensionPlan,
  toCodexExtensionOperations,
  type CodexExtensionPlan,
  type CodexMaterializationTargetOptions,
} from './sync-extension';

function canonicalAgentFileContent(name: string): string {
  return `---\nname: ${name}\ndescription: ${name} description\n---\n\n## Role\n${name}`;
}

describe('codex sync extension', () => {
  const tempDirs: string[] = [];

  it('satisfies the provider-neutral extension hook contract', () => {
    expectTypeOf(codexMaterializationExtension).toMatchTypeOf<
      MaterializationExtension<
        CodexExtensionPlan,
        MaterializationContext<CodexMaterializationTargetOptions>
      >
    >();
  });

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
    const firstRoleOperation = firstPlan.operations.find(
      (operation) => operation.roleName === 'oat-reviewer',
    )!;
    expect(
      toCodexExtensionOperations({
        ...firstPlan,
        operations: [firstRoleOperation],
      }),
    ).toEqual([
      {
        action: firstRoleOperation.action,
        target: 'role',
        path: '.codex/agents/oat-reviewer.toml',
        reason: firstRoleOperation.reason,
        roleName: 'oat-reviewer',
      },
    ]);
    expect(firstPlan.operations.some((op) => op.action === 'create')).toBe(
      true,
    );

    const applyResult = await applyCodexProjectExtensionPlan(root, firstPlan);
    expect(applyResult.failed).toBe(0);
    expect(applyResult.applied).toBeGreaterThan(0);
    expect(applyResult.operations).toHaveLength(firstPlan.operations.length);
    expect(applyResult.operations).toEqual(
      firstPlan.operations.map((operation) =>
        expect.objectContaining({
          provider: 'codex',
          target: operation.target,
          action: operation.action,
          status: operation.action === 'skip' ? 'current' : 'changed',
        }),
      ),
    );

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
    expect(configFile).not.toMatch(
      /^[ \t]+(?:\[[^\r\n]+\]|[A-Za-z0-9_-]+\s*=)/mu,
    );

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

  it('keeps an explicit project max depth below the inherited user depth', async () => {
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

    expect(configOperation).toMatchObject({
      action: 'update',
      reason:
        'codex config differs from desired managed state; added features.multi_agent = true',
    });
    expect(configOperation?.content).toContain('max_depth = 2');
    expect(configOperation?.content).not.toContain('max_depth = 4');
  });

  it.each([
    {
      label: 'tables',
      config:
        '[features]\nmulti_agent = false\n\n[agents]\nmax_depth = 1\n\n[agents.custom-agent]\ndescription = "custom-agent description"\nconfig_file = "agents/custom-agent.toml"\n',
    },
    {
      label: 'dotted keys',
      config:
        'features.multi_agent = false\nagents.max_depth = 1\nagents.custom-agent.description = "custom-agent description"\nagents.custom-agent.config_file = "agents/custom-agent.toml"\n',
    },
  ])(
    'reports kept user values even when the config operation is a skip ($label)',
    async ({ config }) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
      tempDirs.push(root);
      const canonicalDir = join(root, '.agents', 'agents');
      await mkdir(canonicalDir, { recursive: true });
      const canonicalPath = join(canonicalDir, 'custom-agent.md');
      await writeFile(canonicalPath, canonicalAgentFileContent('custom-agent'));
      const entries: CanonicalEntry[] = [
        { name: 'custom-agent.md', type: 'agent', canonicalPath, isFile: true },
      ];
      await mkdir(join(root, '.codex'), { recursive: true });
      await writeFile(join(root, '.codex', 'config.toml'), config);
      const first = await computeCodexProjectExtensionPlan(root, entries);
      await applyCodexProjectExtensionPlan(root, first);

      const plan = await computeCodexProjectExtensionPlan(root, entries);

      expect(
        plan.operations.find((operation) => operation.target === 'config'),
      ).toMatchObject({
        action: 'skip',
        reason:
          'codex config already in sync; conflict: kept features.multi_agent = false (OAT-managed Codex roles need true); note: kept agents.max_depth = 1 (this disables only optional nested work)',
      });
      await expect(
        readFile(join(root, '.codex', 'config.toml'), 'utf8'),
      ).resolves.toBe(config);
    },
  );

  it('reports an explicit max_depth = 0 as a conflict', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'config.toml'),
      '[features]\nmulti_agent = true\n\n[agents]\nmax_depth = 0\n',
    );

    const plan = await computeCodexProjectExtensionPlan(root, []);

    const configOperation = plan.operations.find(
      (operation) => operation.target === 'config',
    );
    expect(configOperation).toMatchObject({
      action: 'skip',
      reason:
        'codex config already in sync; conflict: kept agents.max_depth = 0 (default OAT dispatch needs at least 1)',
    });
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
    expect(configOperation?.content).toContain('max_depth = 1');
    expect(configOperation?.content).not.toContain('max_depth = 8');
    expect(configOperation?.reason).toContain(
      'note: kept agents.max_depth = 1 (this disables only optional nested work)',
    );
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
    expect(plan.managedRoles).toHaveLength(34);

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
    expect(first.managedRoles).toHaveLength(72);

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
    expect(plan.managedRoles).toHaveLength(34);
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
    expect(plan.managedRoles).toHaveLength(37);
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
    expect(plan.managedRoles).toHaveLength(34);

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

    expect(pinnedRoles).toHaveLength(66);
    expect(new Set(pinnedRoles)).toHaveLength(66);
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
      ['stale-supported', 'supported-catalogue'],
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

    expect(removed).toEqual(['stale-project', 'stale-supported']);
    expect(plan.operations).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ roleName: 'keep-user', action: 'remove' }),
      ]),
    );
    expect(plan.operations).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          roleName: 'keep-unrelated',
          action: 'remove',
        }),
      ]),
    );
  });

  it.each([
    ['project', 'project-config'],
    ['user', 'user-config'],
  ] as const)(
    'stamps base canonical exports at %s scope with the %s owner',
    async (scope, owner) => {
      const home = await mkdtemp(join(tmpdir(), 'oat-codex-owner-home-'));
      const project = await mkdtemp(join(tmpdir(), 'oat-codex-owner-'));
      tempDirs.push(home, project);
      const root = scope === 'user' ? home : project;
      const canonicalDir = join(root, '.agents', 'agents');
      await mkdir(canonicalDir, { recursive: true });
      const canonicalPath = join(canonicalDir, 'custom-agent.md');
      await writeFile(canonicalPath, canonicalAgentFileContent('custom-agent'));

      const plan = await computeCodexProjectExtensionPlan(
        root,
        [
          {
            name: 'custom-agent.md',
            type: 'agent',
            canonicalPath,
            isFile: true,
          },
        ],
        undefined,
        { userConfigDir: join(home, '.oat') },
      );
      const role = plan.operations.find(
        (operation) => operation.roleName === 'custom-agent',
      );

      expect(role?.content).toMatch(
        new RegExp(
          `^# oat-managed: true\\n# oat-role: custom-agent\\n# oat-owner: ${owner}\\n`,
        ),
      );
      expect(isOatManagedCodexRoleFile(role!.content!, 'custom-agent')).toBe(
        true,
      );
      expect(readOatManagedCodexRoleOwner(role!.content!)).toBe(owner);
    },
  );

  describe('stale canonical-derived roles', () => {
    async function seedSyncedProject(
      agents: Array<string | { file: string; name: string }>,
    ): Promise<{
      root: string;
      entries: CanonicalEntry[];
    }> {
      const root = await mkdtemp(join(tmpdir(), 'oat-codex-stale-'));
      tempDirs.push(root);
      const canonicalDir = join(root, '.agents', 'agents');
      await mkdir(canonicalDir, { recursive: true });
      const entries: CanonicalEntry[] = [];
      for (const agent of agents) {
        const { file, name } =
          typeof agent === 'string' ? { file: agent, name: agent } : agent;
        const canonicalPath = join(canonicalDir, `${file}.md`);
        await writeFile(canonicalPath, canonicalAgentFileContent(name));
        entries.push({
          name: `${file}.md`,
          type: 'agent',
          canonicalPath,
          isFile: true,
        });
      }
      const plan = await computeCodexProjectExtensionPlan(root, entries);
      expect((await applyCodexProjectExtensionPlan(root, plan)).failed).toBe(0);

      // A user-authored table, a variant owned by another scope, and a
      // managed role left by an older CLI without an owner header.
      await writeFile(
        join(root, '.codex', 'agents', 'legacy-agent.toml'),
        '# oat-managed: true\n# oat-role: legacy-agent\ndeveloper_instructions = "old"\n',
      );
      await writeFile(
        join(root, '.codex', 'agents', 'oat-reviewer-gpt-6-sol-high-user.toml'),
        '# oat-managed: true\n# oat-role: oat-reviewer-gpt-6-sol-high-user\n# oat-owner: user-config\ndeveloper_instructions = "user"\n',
      );
      const config = await readFile(
        join(root, '.codex', 'config.toml'),
        'utf8',
      );
      await writeFile(
        join(root, '.codex', 'config.toml'),
        `${config}\n[agents.custom]\ndescription = "mine"\nconfig_file = "agents/custom.toml"\n\n[agents.legacy-agent]\ndescription = "old"\nconfig_file = "agents/legacy-agent.toml"\n\n[agents.oat-reviewer-gpt-6-sol-high-user]\ndescription = "user"\nconfig_file = "agents/oat-reviewer-gpt-6-sol-high-user.toml"\n`,
      );
      return { root, entries };
    }

    async function codexRoleFiles(root: string): Promise<string[]> {
      return (await readdir(join(root, '.codex', 'agents'))).sort();
    }

    async function codexAgentTables(root: string): Promise<string[]> {
      const config = await readFile(
        join(root, '.codex', 'config.toml'),
        'utf8',
      );
      return [...config.matchAll(/^\[agents\.([^\]]+)\]$/gmu)]
        .map((match) => match[1]!)
        .sort();
    }

    function expectUntouchedNeighbours(tables: string[], files: string[]) {
      expect(tables).toEqual(
        expect.arrayContaining([
          'custom',
          'legacy-agent',
          'oat-reviewer-gpt-6-sol-high-user',
        ]),
      );
      expect(files).toEqual(
        expect.arrayContaining([
          'legacy-agent.toml',
          'oat-reviewer-gpt-6-sol-high-user.toml',
        ]),
      );
    }

    it('removes a deleted agent role and table during full sync', async () => {
      const { root, entries } = await seedSyncedProject([
        'agent-one',
        'agent-keep',
      ]);
      await rm(entries[0]!.canonicalPath);

      const plan = await computeCodexProjectExtensionPlan(root, [entries[1]!]);

      expect(
        plan.operations
          .filter((operation) => operation.action === 'remove')
          .map((operation) => operation.path),
      ).toEqual(['.codex/agents/agent-one.toml']);
      expect(
        plan.operations.find((operation) => operation.target === 'config'),
      ).toMatchObject({
        action: 'update',
        reason: expect.stringContaining('agents.agent-one'),
      });
      expect((await applyCodexProjectExtensionPlan(root, plan)).failed).toBe(0);
      const files = await codexRoleFiles(root);
      const tables = await codexAgentTables(root);
      expect(files).not.toContain('agent-one.toml');
      expect(tables).not.toContain('agent-one');
      expect(tables).toContain('agent-keep');
      expectUntouchedNeighbours(tables, files);
    });

    it.each([
      ['some', ['agent-one', 'agent-keep']],
      ['the last', ['agent-one']],
    ] as const)(
      'removes %s removed agent through removedCanonicalPaths',
      async (_label, agentNames) => {
        const { root, entries } = await seedSyncedProject([...agentNames]);
        await rm(entries[0]!.canonicalPath);

        const plan = await computeCodexProjectExtensionPlan(
          root,
          entries.slice(1),
          ['.agents/agents/agent-one.md'],
        );

        expect(
          plan.operations
            .filter((operation) => operation.action === 'remove')
            .map((operation) => operation.path),
        ).toEqual(['.codex/agents/agent-one.toml']);
        expect((await applyCodexProjectExtensionPlan(root, plan)).failed).toBe(
          0,
        );
        const files = await codexRoleFiles(root);
        const tables = await codexAgentTables(root);
        expect(files).not.toContain('agent-one.toml');
        expect(tables).not.toContain('agent-one');
        if (agentNames.length > 1) {
          expect(tables).toContain('agent-keep');
          expect(files).toContain('agent-keep.toml');
        }
        expectUntouchedNeighbours(tables, files);
      },
    );

    it.each(['full', 'removedCanonicalPaths'] as const)(
      'removes every variant of a removed supported base role during %s sync',
      async (mode) => {
        const { root, entries } = await seedSyncedProject([
          'oat-reviewer',
          'oat-reviewer-lite',
        ]);
        // A project-config variant from a custom dispatch target.
        await writeFile(
          join(root, '.codex', 'agents', 'oat-reviewer-custom-high.toml'),
          '# oat-managed: true\n# oat-role: oat-reviewer-custom-high\n# oat-owner: project-config\ndeveloper_instructions = "custom"\n',
        );
        const before = await codexRoleFiles(root);
        const variants = before.filter(
          (file) =>
            file.startsWith('oat-reviewer-') &&
            file !== 'oat-reviewer-lite.toml' &&
            file !== 'oat-reviewer-gpt-6-sol-high-user.toml',
        );
        expect(variants.length).toBeGreaterThan(10);
        await rm(entries[0]!.canonicalPath);

        const plan = await computeCodexProjectExtensionPlan(
          root,
          [entries[1]!],
          mode === 'full' ? undefined : ['.agents/agents/oat-reviewer.md'],
        );
        expect((await applyCodexProjectExtensionPlan(root, plan)).failed).toBe(
          0,
        );

        const files = await codexRoleFiles(root);
        const tables = await codexAgentTables(root);
        expect(files).not.toContain('oat-reviewer.toml');
        expect(tables).not.toContain('oat-reviewer');
        for (const variant of variants) {
          expect(files).not.toContain(variant);
          expect(tables).not.toContain(variant.replace(/\.toml$/, ''));
        }
        expect(files).toContain('oat-reviewer-lite.toml');
        expect(tables).toContain('oat-reviewer-lite');
        expectUntouchedNeighbours(tables, files);
      },
    );

    it('removes the declared role of a removed agent and keeps a present agent role sharing its file name', async () => {
      const { root, entries } = await seedSyncedProject([
        { file: 'gone', name: 'gone-old' },
        { file: 'keep', name: 'gone' },
      ]);
      expect(await codexRoleFiles(root)).toEqual(
        expect.arrayContaining(['gone-old.toml', 'gone.toml']),
      );
      await rm(entries[0]!.canonicalPath);

      const plan = await computeCodexProjectExtensionPlan(
        root,
        entries.slice(1),
        ['.agents/agents/gone.md'],
      );

      expect(
        plan.operations
          .filter((operation) => operation.action === 'remove')
          .map((operation) => operation.path),
      ).toEqual(['.codex/agents/gone-old.toml']);
      expect((await applyCodexProjectExtensionPlan(root, plan)).failed).toBe(0);
      const files = await codexRoleFiles(root);
      const tables = await codexAgentTables(root);
      expect(files).not.toContain('gone-old.toml');
      expect(tables).not.toContain('gone-old');
      expect(files).toContain('gone.toml');
      expect(tables).toContain('gone');
      expectUntouchedNeighbours(tables, files);
    });

    it('removes the declared role of a removed agent whose name differs from its file name', async () => {
      const { root, entries } = await seedSyncedProject([
        { file: 'oat-reviewer', name: 'declared-role' },
        'agent-keep',
      ]);
      expect(await codexRoleFiles(root)).toContain('declared-role.toml');
      await rm(entries[0]!.canonicalPath);

      const plan = await computeCodexProjectExtensionPlan(
        root,
        entries.slice(1),
        ['.agents/agents/oat-reviewer.md'],
      );

      expect(
        plan.operations
          .filter((operation) => operation.action === 'remove')
          .map((operation) => operation.path),
      ).toEqual(['.codex/agents/declared-role.toml']);
      expect((await applyCodexProjectExtensionPlan(root, plan)).failed).toBe(0);
      const files = await codexRoleFiles(root);
      const tables = await codexAgentTables(root);
      expect(files).not.toContain('declared-role.toml');
      expect(tables).not.toContain('declared-role');
      expect(files).toContain('agent-keep.toml');
      expect(tables).toContain('agent-keep');
      expectUntouchedNeighbours(tables, files);
    });

    it('leaves stale roles alone during an install partial sync', async () => {
      const { root, entries } = await seedSyncedProject([
        'agent-one',
        'agent-two',
      ]);
      await rm(entries[1]!.canonicalPath);

      const plan = await computeCodexProjectExtensionPlan(
        root,
        [entries[0]!],
        ['.agents/agents/agent-one.md'],
      );

      expect(
        plan.operations.filter((operation) => operation.action === 'remove'),
      ).toEqual([]);
      expect((await applyCodexProjectExtensionPlan(root, plan)).failed).toBe(0);
      expect(await codexRoleFiles(root)).toContain('agent-two.toml');
      expect(await codexAgentTables(root)).toContain('agent-two');
    });

    it('keeps the variants of a base role a present agent still declares', async () => {
      const { root, entries } = await seedSyncedProject([
        'oat-reviewer',
        { file: 'reviewer-renamed', name: 'oat-reviewer' },
      ]);
      const before = await codexRoleFiles(root);
      const variants = before.filter(
        (file) =>
          file.startsWith('oat-reviewer-') &&
          file !== 'oat-reviewer-gpt-6-sol-high-user.toml',
      );
      expect(variants.length).toBeGreaterThan(10);
      await rm(entries[0]!.canonicalPath);

      const plan = await computeCodexProjectExtensionPlan(
        root,
        entries.slice(1),
        ['.agents/agents/oat-reviewer.md'],
      );

      expect(
        plan.operations.filter((operation) => operation.action === 'remove'),
      ).toEqual([]);
      expect((await applyCodexProjectExtensionPlan(root, plan)).failed).toBe(0);
      const files = await codexRoleFiles(root);
      expect(files).toContain('oat-reviewer.toml');
      for (const variant of variants) {
        expect(files).toContain(variant);
      }
    });
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

  it('materializes user-scope canonical agents under the user provider root only', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-codex-user-'));
    tempDirs.push(home);
    const canonicalDir = join(home, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalFile = join(canonicalDir, 'oat-reviewer.md');
    await writeFile(canonicalFile, canonicalAgentFileContent('oat-reviewer'));
    await mkdir(join(home, '.oat'), { recursive: true });
    await writeFile(
      join(home, '.oat', 'config.json'),
      JSON.stringify({ version: 1 }),
    );

    const plan = await computeCodexProjectExtensionPlan(
      home,
      [
        {
          name: 'oat-reviewer.md',
          type: 'agent',
          canonicalPath: canonicalFile,
          isFile: true,
        },
      ],
      undefined,
      { userConfigDir: join(home, '.oat') },
    );

    expect(toCodexExtensionOperations(plan).map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        '.codex/agents/oat-reviewer.toml',
        '.codex/config.toml',
      ]),
    );

    const applyResult = await applyCodexProjectExtensionPlan(home, plan);
    expect(applyResult.failed).toBe(0);

    await expect(
      readFile(join(home, '.codex', 'agents', 'oat-reviewer.toml'), 'utf8'),
    ).resolves.toContain('developer_instructions');
    await expect(
      readFile(join(home, '.codex', 'config.toml'), 'utf8'),
    ).resolves.toContain('multi_agent = true');
  });

  it('preserves user config comments through a user sync and then skips the config', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-codex-user-comments-'));
    tempDirs.push(home);
    const canonicalDir = join(home, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalFile = join(canonicalDir, 't-agent.md');
    await writeFile(canonicalFile, canonicalAgentFileContent('t-agent'));
    await mkdir(join(home, '.oat'), { recursive: true });
    await writeFile(
      join(home, '.oat', 'config.json'),
      JSON.stringify({ version: 1 }),
    );
    const configPath = join(home, '.codex', 'config.toml');
    const userConfig = [
      '# personal settings',
      'model = "gpt-5.6-sol"',
      '',
      '# BEGIN codex-router-managed',
      '[model_providers.codex-router] # codex-router-provider-managed',
      'name = "codex-router"',
      '# END codex-router-managed',
      '',
    ].join('\n');
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(configPath, userConfig);
    const canonicalEntries: CanonicalEntry[] = [
      {
        name: 't-agent.md',
        type: 'agent',
        canonicalPath: canonicalFile,
        isFile: true,
      },
    ];
    const options = { userConfigDir: join(home, '.oat') };

    const plan = await computeCodexProjectExtensionPlan(
      home,
      canonicalEntries,
      undefined,
      options,
    );
    expect((await applyCodexProjectExtensionPlan(home, plan)).failed).toBe(0);
    const synced = await readFile(configPath, 'utf8');

    expect(synced).toBe(
      `${userConfig}\n[features]\nmulti_agent = true\n\n[agents]\nmax_depth = 2\n\n[agents.t-agent]\ndescription = "t-agent description"\nconfig_file = "agents/t-agent.toml"\n`,
    );

    const secondPlan = await computeCodexProjectExtensionPlan(
      home,
      canonicalEntries,
      undefined,
      options,
    );
    expect(
      secondPlan.operations.find((operation) => operation.target === 'config'),
    ).toMatchObject({ action: 'skip' });
    await applyCodexProjectExtensionPlan(home, secondPlan);
    await expect(readFile(configPath, 'utf8')).resolves.toBe(synced);
  });

  it('keeps project and user materialized codex paths isolated for the same canonical role', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'oat-codex-dup-project-'));
    const userRoot = await mkdtemp(join(tmpdir(), 'oat-codex-dup-user-'));
    tempDirs.push(projectRoot, userRoot);

    const roots = [projectRoot, userRoot];
    for (const root of roots) {
      const canonicalDir = join(root, '.agents', 'agents');
      await mkdir(canonicalDir, { recursive: true });
      await writeFile(
        join(canonicalDir, 'oat-reviewer.md'),
        canonicalAgentFileContent('oat-reviewer'),
      );
    }
    await mkdir(join(userRoot, '.oat'), { recursive: true });
    await writeFile(
      join(userRoot, '.oat', 'config.json'),
      JSON.stringify({ version: 1 }),
    );

    for (const [index, root] of roots.entries()) {
      const plan = await computeCodexProjectExtensionPlan(
        root,
        [
          {
            name: 'oat-reviewer.md',
            type: 'agent',
            canonicalPath: join(root, '.agents', 'agents', 'oat-reviewer.md'),
            isFile: true,
          },
        ],
        undefined,
        index === 1 ? { userConfigDir: join(userRoot, '.oat') } : undefined,
      );
      // Every emitted path stays scope-relative, so neither scope can write
      // into the other's provider root.
      for (const { path } of toCodexExtensionOperations(plan)) {
        expect(relative(root, join(root, path)).startsWith('..')).toBe(false);
      }
      await expect(
        applyCodexProjectExtensionPlan(root, plan),
      ).resolves.toMatchObject({ failed: 0 });
    }

    for (const root of roots) {
      await expect(
        readFile(join(root, '.codex', 'agents', 'oat-reviewer.toml'), 'utf8'),
      ).resolves.toContain('developer_instructions');
    }
  });
});
