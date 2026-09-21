import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CanonicalEntry } from '@engine/index';
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyClaudeProjectExtensionPlan,
  computeClaudeProjectExtensionPlan,
} from './sync-extension';

async function canonicalEntries(root: string): Promise<CanonicalEntry[]> {
  const directory = join(root, '.agents', 'agents');
  await mkdir(directory, { recursive: true });
  return Promise.all(
    ['oat-phase-implementer', 'oat-reviewer'].map(async (name) => {
      const canonicalPath = join(directory, `${name}.md`);
      await writeFile(
        canonicalPath,
        `---\nname: ${name}\ndescription: ${name} description\ntools: Read\n---\n\n## Role\n${name}`,
      );
      return {
        name: `${name}.md`,
        type: 'agent' as const,
        canonicalPath,
        isFile: true,
      };
    }),
  );
}

function config(candidates: unknown[]): string {
  return JSON.stringify({
    version: 1,
    workflow: {
      dispatchCeiling: { providers: { claude: { high: { candidates } } } },
    },
  });
}

describe('Claude effort sync extension', () => {
  const roots: string[] = [];
  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
    roots.length = 0;
  });

  it('materializes both configured roles and becomes idempotent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-claude-extension-'));
    roots.push(root);
    const entries = await canonicalEntries(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.json'),
      config([{ harness: 'claude', model: 'opus', effort: 'high' }]),
    );

    const first = await computeClaudeProjectExtensionPlan(root, entries);
    expect(first.managedEntries).toEqual([
      'oat-phase-implementer-claude-opus-high',
      'oat-reviewer-claude-opus-high',
    ]);
    expect(first.operations.every(({ action }) => action === 'create')).toBe(
      true,
    );
    await expect(
      readFile(
        join(root, '.claude', 'agents', 'oat-reviewer-claude-opus-high.md'),
        'utf8',
      ),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      applyClaudeProjectExtensionPlan(root, first),
    ).resolves.toMatchObject({
      applied: 2,
      failed: 0,
    });
    const second = await computeClaudeProjectExtensionPlan(root, entries);
    expect(second.operations.every(({ action }) => action === 'skip')).toBe(
      true,
    );
    expect(second.aggregateHash).toBe(first.aggregateHash);
  });

  it('removes only managed variants owned by a filtered removed base role', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-claude-extension-'));
    roots.push(root);
    const entries = await canonicalEntries(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.json'),
      config([{ harness: 'claude', model: 'opus', effort: 'high' }]),
    );
    const initial = await computeClaudeProjectExtensionPlan(root, entries);
    await applyClaudeProjectExtensionPlan(root, initial);

    const plan = await computeClaudeProjectExtensionPlan(
      root,
      entries.filter(({ name }) => name !== 'oat-reviewer.md'),
      ['.agents/agents/oat-reviewer.md'],
    );

    expect(plan.operations).toEqual([
      expect.objectContaining({
        action: 'remove',
        roleName: 'oat-reviewer-claude-opus-high',
      }),
    ]);
    await expect(
      applyClaudeProjectExtensionPlan(root, plan),
    ).resolves.toMatchObject({ applied: 1, failed: 0 });
    await expect(
      readFile(
        join(
          root,
          '.claude',
          'agents',
          'oat-phase-implementer-claude-opus-high.md',
        ),
        'utf8',
      ),
    ).resolves.toContain('oat-phase-implementer-claude-opus-high');
    await expect(
      readFile(
        join(root, '.claude', 'agents', 'oat-reviewer-claude-opus-high.md'),
        'utf8',
      ),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('uses only injected user config and removes stale managed user variants', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-claude-home-'));
    roots.push(home);
    const entries = await canonicalEntries(home);
    await mkdir(join(home, '.oat'), { recursive: true });
    await writeFile(
      join(home, '.oat', 'config.json'),
      config([{ harness: 'claude', model: 'sonnet', effort: 'medium' }]),
    );
    const directory = join(home, '.claude', 'agents');
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, 'stale.md'),
      '---\n# oat-managed: true\n# oat-role: stale\n# oat-owner: user-config\n# oat-provider: claude\nname: stale\ndescription: stale\nmodel: opus\neffort: high\n---\n',
    );

    const plan = await computeClaudeProjectExtensionPlan(
      home,
      entries,
      undefined,
      {
        userConfigDir: join(home, '.oat'),
      },
    );
    expect(plan.managedEntries).toContain('oat-reviewer-claude-sonnet-medium');
    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'remove', roleName: 'stale' }),
      ]),
    );
  });

  it('preserves unmanaged collisions and reports apply failures', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-claude-extension-'));
    roots.push(root);
    const entries = await canonicalEntries(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.json'),
      config([{ harness: 'claude', model: 'opus', effort: 'high' }]),
    );
    const path = join(root, '.claude', 'agents');
    await mkdir(path, { recursive: true });
    const collision = join(path, 'oat-reviewer-claude-opus-high.md');
    await writeFile(
      collision,
      '---\nname: unmanaged\ndescription: keep\n---\n',
    );

    await expect(
      computeClaudeProjectExtensionPlan(root, entries),
    ).rejects.toThrow(/unmanaged|not the matching/i);
    await expect(readFile(collision, 'utf8')).resolves.toContain('keep');

    await expect(
      applyClaudeProjectExtensionPlan(root, {
        provider: 'claude',
        operations: [
          {
            provider: 'claude',
            action: 'create',
            target: 'role',
            path: '../escape.md',
            reason: 'failure probe',
            content: 'unsafe',
          },
        ],
        managedEntries: [],
        aggregateHash: '',
        metadata: { cleanupOwners: ['project-config'], isPartialSync: false },
      }),
    ).resolves.toMatchObject({ failed: 1, applied: 0 });
  });
});
