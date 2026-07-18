import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CanonicalEntry } from '@engine/index';
import type {
  MaterializationContext,
  MaterializationExtension,
} from '@providers/shared';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';

import {
  CURSOR_MODEL_PIN_MAPPINGS,
  SUPPORTED_CURSOR_ROLE_TARGETS,
  type CursorModelPinMapping,
} from './catalog';
import {
  applyCursorProjectExtensionPlan,
  computeCursorProjectExtensionPlan,
  cursorMaterializationExtension,
  type CursorExtensionPlan,
  type CursorMaterializationTargetOptions,
} from './sync-extension';

function canonicalAgentFileContent(name: string): string {
  return `---\nname: ${name}\ndescription: ${name} description\nversion: 3\ntools: Read\ncolor: blue\n---\n\n## Role\n${name}`;
}

async function createCanonicalEntries(
  root: string,
  names = ['oat-phase-implementer', 'oat-reviewer'],
): Promise<CanonicalEntry[]> {
  const directory = join(root, '.agents', 'agents');
  await mkdir(directory, { recursive: true });
  return Promise.all(
    names.map(async (name) => {
      const canonicalPath = join(directory, `${name}.md`);
      await writeFile(canonicalPath, canonicalAgentFileContent(name));
      return {
        name: `${name}.md`,
        type: 'agent' as const,
        canonicalPath,
        isFile: true,
      };
    }),
  );
}

function configWithCursorCandidates(candidates: unknown[]): string {
  return JSON.stringify({
    version: 1,
    workflow: {
      dispatchCeiling: {
        providers: {
          cursor: {
            high: { candidates },
          },
        },
      },
    },
  });
}

describe('cursor sync extension', () => {
  const tempDirs: string[] = [];

  it('satisfies the provider-neutral extension hook contract', () => {
    expectTypeOf(cursorMaterializationExtension).toMatchTypeOf<
      MaterializationExtension<
        CursorExtensionPlan,
        MaterializationContext<CursorMaterializationTargetOptions>
      >
    >();
  });

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    );
    tempDirs.length = 0;
  });

  it('seeds the supported project catalogue, applies it, and becomes idempotent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-extension-'));
    tempDirs.push(root);
    const canonicalEntries = await createCanonicalEntries(root);

    const first = await computeCursorProjectExtensionPlan(
      root,
      canonicalEntries,
    );

    expect(first.provider).toBe('cursor');
    expect(first.managedEntries).toHaveLength(
      SUPPORTED_CURSOR_ROLE_TARGETS.length * 2,
    );
    expect(
      first.operations.every(({ provider }) => provider === 'cursor'),
    ).toBe(true);
    expect(
      first.operations.find(
        ({ roleName }) => roleName === 'oat-reviewer-gpt-5-6-sol-high',
      )?.content,
    ).toContain('# oat-owner: supported-catalogue');

    await expect(
      applyCursorProjectExtensionPlan(root, first),
    ).resolves.toMatchObject({
      applied: SUPPORTED_CURSOR_ROLE_TARGETS.length * 2,
      failed: 0,
    });
    const second = await computeCursorProjectExtensionPlan(
      root,
      canonicalEntries,
    );
    expect(second.operations.every(({ action }) => action === 'skip')).toBe(
      true,
    );
    expect(second.aggregateHash).toBe(first.aggregateHash);
  });

  it('materializes approved configuration-only ids with project ownership precedence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-extension-'));
    tempDirs.push(root);
    const canonicalEntries = await createCanonicalEntries(root, [
      'oat-reviewer',
    ]);
    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      configWithCursorCandidates([
        'composer-2.5',
        'composer-2.5-fast',
        {
          route: [
            { harness: 'claude', model: 'claude-sonnet' },
            { harness: 'cursor', model: 'cursor-grok-4.5-high-fast' },
          ],
        },
      ]),
    );

    const plan = await computeCursorProjectExtensionPlan(
      root,
      canonicalEntries,
    );

    for (const roleName of [
      'oat-reviewer-composer-2-5',
      'oat-reviewer-composer-2-5-fast',
      'oat-reviewer-cursor-grok-4-5-high-fast',
    ]) {
      expect(
        plan.operations.find((operation) => operation.roleName === roleName)
          ?.content,
      ).toContain('# oat-owner: project-config');
    }
  });

  it('uses only effective user config targets in the user view', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-cursor-home-'));
    tempDirs.push(home);
    const canonicalEntries = await createCanonicalEntries(home);
    await mkdir(join(home, '.oat'), { recursive: true });
    await writeFile(
      join(home, '.oat', 'config.json'),
      configWithCursorCandidates(['claude-fable-5-xhigh']),
    );

    const plan = await computeCursorProjectExtensionPlan(
      home,
      canonicalEntries,
      undefined,
      { userConfigDir: join(home, '.oat') },
    );

    expect(plan.managedEntries).toHaveLength(2);
    expect(plan.managedEntries).toEqual(
      expect.arrayContaining([
        'oat-reviewer-claude-fable-5-xhigh',
        'oat-phase-implementer-claude-fable-5-xhigh',
      ]),
    );
    expect(
      plan.operations.every(
        ({ content }) =>
          !content || content.includes('# oat-owner: user-config'),
      ),
    ).toBe(true);
  });

  it('fails closed before full user cleanup when canonical base definitions are unavailable', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-cursor-home-'));
    tempDirs.push(home);
    await mkdir(join(home, '.oat'), { recursive: true });
    await writeFile(
      join(home, '.oat', 'config.json'),
      configWithCursorCandidates(['claude-fable-5-xhigh']),
    );
    const agentsDir = join(home, '.cursor', 'agents');
    await mkdir(agentsDir, { recursive: true });
    const stalePath = join(agentsDir, 'stale-user.md');
    await writeFile(
      stalePath,
      '---\n# oat-managed: true\n# oat-role: stale-user\n# oat-owner: user-config\nname: stale-user\ndescription: stale\nmodel: composer-2.5[fast=true]\n---\n',
    );

    await expect(
      computeCursorProjectExtensionPlan(home, [], undefined, {
        userConfigDir: join(home, '.oat'),
      }),
    ).rejects.toThrow(
      /managed Cursor role definitions.*unavailable.*oat-phase-implementer.*oat-reviewer.*Refusing stale user-role cleanup/i,
    );
    await expect(readFile(stalePath, 'utf8')).resolves.toContain(
      '# oat-owner: user-config',
    );
  });

  it('collects an active project-state candidate', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-extension-'));
    tempDirs.push(root);
    const canonicalEntries = await createCanonicalEntries(root, [
      'oat-reviewer',
    ]);
    const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(
      join(projectPath, 'state.md'),
      [
        '---',
        'oat_dispatch_policy:',
        '  matrix:',
        '    cursor:',
        '      high:',
        '        candidates:',
        '          - claude-fable-5-xhigh',
        '---',
        '',
      ].join('\n'),
    );

    const plan = await computeCursorProjectExtensionPlan(
      root,
      canonicalEntries,
      undefined,
      { projectPath: '.oat/projects/shared/demo' },
    );
    expect(plan.managedEntries).toContain('oat-reviewer-claude-fable-5-xhigh');
  });

  it('fails closed on an unknown mapping with its config source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-extension-'));
    tempDirs.push(root);
    const canonicalEntries = await createCanonicalEntries(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      configWithCursorCandidates(['unknown-cursor-model']),
    );

    await expect(
      computeCursorProjectExtensionPlan(root, canonicalEntries),
    ).rejects.toThrow(
      /unknown-cursor-model.*local-config.*workflow\.dispatchCeiling\.providers\.cursor\.high/i,
    );
  });

  it('rejects registry mappings without mapping-specific g01 approval', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-extension-'));
    tempDirs.push(root);
    const canonicalEntries = await createCanonicalEntries(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      configWithCursorCandidates(['unapproved-model']),
    );
    const unapproved = {
      ladderModelId: 'unapproved-model',
      frontmatterModel: 'unapproved[effort=high]',
      syntaxFamily: 'claude-effort',
      catalogue: false,
      gateEvidence: {
        gate: 'g01',
        probeName: '',
        disposition: 'approved',
      },
    } as CursorModelPinMapping;

    await expect(
      computeCursorProjectExtensionPlan(root, canonicalEntries, undefined, {
        modelMappings: [...CURSOR_MODEL_PIN_MAPPINGS, unapproved],
      }),
    ).rejects.toThrow(/mapping-specific gate g01 approval/i);
  });

  it('removes only stale roles for applicable owners on full sync', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-extension-'));
    tempDirs.push(root);
    const agentsDir = join(root, '.cursor', 'agents');
    await mkdir(agentsDir, { recursive: true });
    for (const [name, owner] of [
      ['stale-project', 'project-config'],
      ['stale-supported', 'supported-catalogue'],
      ['keep-user', 'user-config'],
    ] as const) {
      await writeFile(
        join(agentsDir, `${name}.md`),
        `---\n# oat-managed: true\n# oat-role: ${name}\n# oat-owner: ${owner}\nname: ${name}\ndescription: stale\nmodel: composer-2.5[fast=true]\n---\n`,
      );
    }

    const plan = await computeCursorProjectExtensionPlan(root, []);
    const removed = plan.operations
      .filter(({ action }) => action === 'remove')
      .map(({ roleName }) => roleName);
    expect(removed).toEqual(['stale-project', 'stale-supported']);
    expect(removed).not.toContain('keep-user');
  });

  it('does not clean stale roles during a partial sync or while disabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-extension-'));
    tempDirs.push(root);
    const agentsDir = join(root, '.cursor', 'agents');
    await mkdir(agentsDir, { recursive: true });
    await writeFile(
      join(agentsDir, 'stale-project.md'),
      '---\n# oat-managed: true\n# oat-role: stale-project\n# oat-owner: project-config\nname: stale-project\ndescription: stale\nmodel: composer-2.5[fast=true]\n---\n',
    );

    const partial = await computeCursorProjectExtensionPlan(
      root,
      [],
      ['.agents/skills/example'],
    );
    const disabled = await computeCursorProjectExtensionPlan(
      root,
      [],
      undefined,
      { enabled: false },
    );

    expect(partial.operations).toEqual([]);
    expect(disabled.operations).toEqual([]);
    await expect(
      readFile(join(agentsDir, 'stale-project.md'), 'utf8'),
    ).resolves.toContain('# oat-owner: project-config');
  });

  it('fails before writes on a symlinked unmanaged collision', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-extension-'));
    const external = await mkdtemp(join(tmpdir(), 'oat-cursor-external-'));
    tempDirs.push(root, external);
    const canonicalEntries = await createCanonicalEntries(root, [
      'oat-reviewer',
    ]);
    await mkdir(join(root, '.claude', 'agents'), { recursive: true });
    await writeFile(join(external, 'collision.md'), 'unmanaged');
    await symlink(
      join(external, 'collision.md'),
      join(root, '.claude', 'agents', 'oat-reviewer-gpt-5-6-sol-high.md'),
    );

    await expect(
      computeCursorProjectExtensionPlan(root, canonicalEntries),
    ).rejects.toThrow(/symbolic link.*\.claude\/agents/i);
    await expect(
      readFile(
        join(root, '.cursor', 'agents', 'oat-reviewer-gpt-5-6-sol-high.md'),
      ),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects a managed definition symlink whose target escapes the scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-extension-'));
    const external = await mkdtemp(join(tmpdir(), 'oat-cursor-external-'));
    tempDirs.push(root, external);
    const canonicalEntries = await createCanonicalEntries(root, [
      'oat-reviewer',
    ]);
    const roleName = 'oat-reviewer-gpt-5-6-sol-high';
    await mkdir(join(root, '.cursor', 'agents'), { recursive: true });
    const externalRole = join(external, `${roleName}.md`);
    await writeFile(
      externalRole,
      `---\n# oat-managed: true\n# oat-role: ${roleName}\n# oat-owner: supported-catalogue\nname: ${roleName}\ndescription: stale\nmodel: gpt-5.6-sol[reasoning=high]\n---\n\nstale`,
    );
    await symlink(
      externalRole,
      join(root, '.cursor', 'agents', `${roleName}.md`),
    );

    await expect(
      computeCursorProjectExtensionPlan(root, canonicalEntries),
    ).rejects.toThrow(/symbolic link.*\.cursor\/agents/i);
    await expect(readFile(externalRole, 'utf8')).resolves.toContain('\nstale');
  });

  it('refuses apply when the Cursor agent directory becomes an external symlink', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-extension-'));
    const external = await mkdtemp(join(tmpdir(), 'oat-cursor-external-'));
    tempDirs.push(root, external);
    const canonicalEntries = await createCanonicalEntries(root, [
      'oat-reviewer',
    ]);
    const target = SUPPORTED_CURSOR_ROLE_TARGETS.find(
      ({ ladderModelId }) => ladderModelId === 'gpt-5.6-sol-high',
    )!;
    const plan = await computeCursorProjectExtensionPlan(
      root,
      canonicalEntries,
      undefined,
      { supportedTargets: [target] },
    );
    await mkdir(join(root, '.cursor'), { recursive: true });
    await symlink(external, join(root, '.cursor', 'agents'), 'dir');

    await expect(applyCursorProjectExtensionPlan(root, plan)).resolves.toEqual({
      applied: 0,
      failed: 1,
      skipped: 0,
    });
    await expect(
      readFile(join(external, 'oat-reviewer-gpt-5-6-sol-high.md'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
