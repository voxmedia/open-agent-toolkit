import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getPackDefinition } from '@commands/tools/shared/pack-manifest';
import { USER_SCOPE_MANAGED_AGENT_FILES } from '@shared/types';
import { afterEach, describe, expect, it } from 'vitest';

import { scanBundledManagedAgents, scanCanonical } from './scanner';

describe('scanCanonical', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('discovers skills under .agents/skills/', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'project');

    expect(
      entries.some(
        (entry) => entry.type === 'skill' && entry.name === 'skill-one',
      ),
    ).toBe(true);
  });

  it('discovers agents under .agents/agents/ for project scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'agents', 'agent-one'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'project');

    expect(
      entries.some(
        (entry) => entry.type === 'agent' && entry.name === 'agent-one',
      ),
    ).toBe(true);
  });

  it('keeps generic user scope limited to skills', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });
    await mkdir(join(root, '.agents', 'agents', 'agent-one'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'user');

    expect(entries.some((entry) => entry.type === 'skill')).toBe(true);
    expect(entries.some((entry) => entry.type === 'agent')).toBe(false);
  });

  it('loads the two bundled base roles shared by materialization extensions', async () => {
    const entries = await scanBundledManagedAgents();

    expect(entries.map((entry) => entry.name)).toEqual([
      'oat-phase-implementer.md',
      'oat-reviewer.md',
    ]);
    expect(entries.every((entry) => entry.type === 'agent')).toBe(true);
  });

  it('adds only installed manifest-declared user-materializable pack agents', async () => {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-scan-user-'));
    const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-scan-assets-'));
    tempDirs.push(scopeRoot, assetsRoot);
    await mkdir(join(assetsRoot, 'agents'), { recursive: true });
    for (const name of [
      'oat-phase-implementer.md',
      'oat-reviewer.md',
      'eligible-pack-agent.md',
      'undeclared-agent.md',
    ]) {
      await writeFile(join(assetsRoot, 'agents', name), `# ${name}\n`, 'utf8');
    }
    const eligible = {
      id: 'agent:eligible-pack-agent.md',
      kind: 'agent' as const,
      source: 'agents/eligible-pack-agent.md',
      destination: '.agents/agents/eligible-pack-agent.md',
      scopes: ['project', 'user'] as const,
      ownership: { project: 'managed' as const, user: 'managed' as const },
      userMaterializable: true,
    };
    const research = {
      ...getPackDefinition('research'),
      assets: [...getPackDefinition('research').assets, eligible],
    };

    const entries = await scanBundledManagedAgents({
      scopeRoot,
      assetsRoot,
      manifest: [research],
      inventoryPack: async () => ({
        pack: 'research',
        scope: 'user',
        intent: {
          pack: 'research',
          scope: 'user',
          enabled: true,
          direct: true,
          requiredBy: [],
          state: 'direct',
          source: 'declared',
          configPath: join(scopeRoot, '.oat', 'config.json'),
          diagnostics: [],
        },
        completeness: 'partial',
        assets: [
          {
            definition: eligible,
            path: join(scopeRoot, eligible.destination),
            status: 'current',
            installedVersion: null,
            bundledVersion: null,
          },
        ],
        diagnostics: [],
      }),
    });

    expect(entries.map(({ name }) => name)).toEqual([
      'oat-phase-implementer.md',
      'oat-reviewer.md',
      'eligible-pack-agent.md',
    ]);
    expect(entries.map(({ name }) => name)).not.toContain(
      'undeclared-agent.md',
    );

    const absent = await scanBundledManagedAgents({
      scopeRoot,
      assetsRoot,
      manifest: [research],
      inventoryPack: async () => ({
        pack: 'research',
        scope: 'user',
        intent: {
          pack: 'research',
          scope: 'user',
          enabled: true,
          direct: true,
          requiredBy: [],
          state: 'direct',
          source: 'declared',
          configPath: join(scopeRoot, '.oat', 'config.json'),
          diagnostics: [],
        },
        completeness: 'absent',
        assets: [
          {
            definition: eligible,
            path: join(scopeRoot, eligible.destination),
            status: 'missing',
            installedVersion: null,
            bundledVersion: null,
          },
        ],
        diagnostics: [],
      }),
    });
    expect(absent.map(({ name }) => name)).toEqual([
      'oat-phase-implementer.md',
      'oat-reviewer.md',
    ]);
  });

  it('rejects an installed user-materializable agent without its bundled source', async () => {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-scan-user-'));
    const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-scan-assets-'));
    tempDirs.push(scopeRoot, assetsRoot);
    await mkdir(join(assetsRoot, 'agents'), { recursive: true });
    for (const name of USER_SCOPE_MANAGED_AGENT_FILES) {
      await writeFile(join(assetsRoot, 'agents', name), `# ${name}\n`, 'utf8');
    }
    const eligible = {
      id: 'agent:missing-pack-agent.md',
      kind: 'agent' as const,
      source: 'agents/missing-pack-agent.md',
      destination: '.agents/agents/missing-pack-agent.md',
      scopes: ['project', 'user'] as const,
      ownership: { project: 'managed' as const, user: 'managed' as const },
      userMaterializable: true,
    };
    const research = {
      ...getPackDefinition('research'),
      assets: [...getPackDefinition('research').assets, eligible],
    };

    await expect(
      scanBundledManagedAgents({
        scopeRoot,
        assetsRoot,
        manifest: [research],
        inventoryPack: async () => ({
          pack: 'research',
          scope: 'user',
          intent: {
            pack: 'research',
            scope: 'user',
            enabled: true,
            direct: true,
            requiredBy: [],
            state: 'direct',
            source: 'declared',
            configPath: join(scopeRoot, '.oat', 'config.json'),
            diagnostics: [],
          },
          completeness: 'complete',
          assets: [
            {
              definition: eligible,
              path: join(scopeRoot, eligible.destination),
              status: 'current',
              installedVersion: null,
              bundledVersion: null,
            },
          ],
          diagnostics: [],
        }),
      }),
    ).rejects.toThrow('Bundled user-materializable agent definition');
  });

  it('returns empty array when .agents/ does not exist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);

    const entries = await scanCanonical(root, 'project');

    expect(entries).toEqual([]);
  });

  it('ignores non-.md files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'README.txt'),
      'ignore me',
      'utf8',
    );

    const entries = await scanCanonical(root, 'project');

    expect(entries).toEqual([]);
  });

  it('ignores .md files under skills (file-based discovery is agents-only)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'skills', 'my-skill.md'),
      '# some skill\n',
      'utf8',
    );

    const entries = await scanCanonical(root, 'project');

    expect(entries).toEqual([]);
  });

  it('discovers .md file agents with isFile: true', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'oat-reviewer.md'),
      '# Reviewer agent\n',
      'utf8',
    );

    const entries = await scanCanonical(root, 'project');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: 'oat-reviewer.md',
      type: 'agent',
      isFile: true,
      canonicalPath: join(root, '.agents', 'agents', 'oat-reviewer.md'),
    });
  });

  it('discovers .md rule files with isFile: true for project scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'rules', 'react-components.md'),
      '# React Components\n',
      'utf8',
    );

    const entries = await scanCanonical(root, 'project');

    expect(entries).toContainEqual({
      name: 'react-components.md',
      type: 'rule',
      isFile: true,
      canonicalPath: join(root, '.agents', 'rules', 'react-components.md'),
    });
  });

  it('skips rules for user scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'rules', 'react-components.md'),
      '# React Components\n',
      'utf8',
    );

    const entries = await scanCanonical(root, 'user');

    expect(entries.some((entry) => entry.type === 'rule')).toBe(false);
  });

  it('returns mixed directory and file entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'agents', 'agent-dir'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.agents', 'agents', 'agent-file.md'),
      '# File agent\n',
      'utf8',
    );

    const entries = await scanCanonical(root, 'project');

    const dirEntry = entries.find((e) => e.name === 'agent-dir');
    const fileEntry = entries.find((e) => e.name === 'agent-file.md');
    expect(dirEntry).toMatchObject({ isFile: false, type: 'agent' });
    expect(fileEntry).toMatchObject({ isFile: true, type: 'agent' });
  });

  it('directory entries have isFile: false', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'project');

    expect(entries[0]?.isFile).toBe(false);
  });

  it('treats a directory named with .md extension as isFile: false', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'agents', 'tricky-name.md'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'project');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: 'tricky-name.md',
      type: 'agent',
      isFile: false,
    });
  });

  it('populates canonicalPath as absolute path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scan-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });

    const entries = await scanCanonical(root, 'project');
    const skill = entries.find((entry) => entry.name === 'skill-one');

    expect(skill).toBeDefined();
    expect(skill?.canonicalPath).toBe(
      join(root, '.agents', 'skills', 'skill-one'),
    );
  });

  it('requires concrete scope values at compile time', () => {
    const root = '/tmp/oat-scan';
    // @ts-expect-error scanner intentionally rejects all-scope orchestration.
    scanCanonical(root, 'all');
    expect(true).toBe(true);
  });
});
