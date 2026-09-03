import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type AgentsMdFileSystem,
  removeAgentsMdSection,
  upsertAgentsMdSection,
  upsertAgentsMdSections,
} from './agents-md';

const realFileSystem: AgentsMdFileSystem = {
  lstat,
  readFile,
  readlink,
  realpath,
  writeFile,
};

function withFileSystem(
  overrides: Partial<AgentsMdFileSystem>,
): AgentsMdFileSystem {
  return { ...realFileSystem, ...overrides };
}

describe('manual-only AGENTS.md guidance', () => {
  let root = '';

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  async function setup(existingContent?: string): Promise<string> {
    root = await mkdtemp(join(tmpdir(), 'agents-md-test-'));
    if (existingContent !== undefined) {
      await writeFile(join(root, 'AGENTS.md'), existingContent, 'utf8');
    }
    return root;
  }

  async function readAgentsMd(): Promise<string> {
    return readFile(join(root, 'AGENTS.md'), 'utf8');
  }

  async function expectNoPrivateArtifacts(): Promise<void> {
    expect(await readdir(root)).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\.(?:tmp|recovery)|oat-recovery/i),
      ]),
    );
  }

  it('creates a missing root file once with one exclusive write', async () => {
    await setup();
    const write = vi.fn(realFileSystem.writeFile);

    const first = await upsertAgentsMdSection(
      root,
      'tools',
      '## Tool Packs\n- workflows',
      { fileSystem: withFileSystem({ writeFile: write }) },
    );
    const repeated = await upsertAgentsMdSection(
      root,
      'tools',
      '## Tool Packs\n- workflows',
    );

    expect(first).toEqual({ action: 'created' });
    expect(repeated).toEqual({ action: 'no-change' });
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0]?.[2]).toMatchObject({ flag: 'wx' });
    await expect(readAgentsMd()).resolves.toBe(
      '<!-- OAT tools -->\n## Tool Packs\n- workflows\n<!-- END OAT tools -->\n',
    );
    await expectNoPrivateArtifacts();
  });

  it('applies the process umask to a safely created file', async () => {
    await setup();
    const previousUmask = process.umask(0o077);
    try {
      await upsertAgentsMdSection(root, 'tools', 'Tool guidance');
    } finally {
      process.umask(previousUmask);
    }
    expect((await lstat(join(root, 'AGENTS.md'))).mode & 0o777).toBe(0o600);
  });

  it('preserves a target that appears before exclusive create and replans manually', async () => {
    await setup();
    const agentsPath = join(root, 'AGENTS.md');
    let injected = false;
    const fileSystem = withFileSystem({
      writeFile: vi.fn(async (...args) => {
        if (!injected) {
          injected = true;
          await writeFile(agentsPath, '# Late user file\n', 'utf8');
        }
        return writeFile(...args);
      }) as AgentsMdFileSystem['writeFile'],
    });

    const result = await upsertAgentsMdSection(root, 'tools', 'Tool guidance', {
      fileSystem,
    });

    expect(result).toMatchObject({ action: 'manual-required' });
    await expect(readAgentsMd()).resolves.toBe('# Late user file\n');
    await expectNoPrivateArtifacts();
  });

  it.each(['direct', 'symlink'] as const)(
    'returns the same redacted zero-write patch for an existing %s target',
    async (kind) => {
      await setup();
      const agentsPath = join(root, 'AGENTS.md');
      const targetPath =
        kind === 'direct' ? agentsPath : join(root, 'guidance.md');
      const original = '# Private user instructions\nDo not echo this text.\n';
      await writeFile(targetPath, original, { mode: 0o640 });
      await chmod(targetPath, 0o640);
      if (kind === 'symlink') await symlink('guidance.md', agentsPath);
      const before = await lstat(targetPath);

      const first = await upsertAgentsMdSection(
        root,
        'tools',
        '## Tool Packs\n- workflows',
        { removeSectionKeys: ['workflows'] },
      );
      const repeated = await upsertAgentsMdSection(
        root,
        'tools',
        '## Tool Packs\n- workflows',
        { removeSectionKeys: ['workflows'] },
      );

      expect(first).toEqual(repeated);
      expect(first).toMatchObject({
        action: 'manual-required',
        manualPatch: {
          target: kind === 'direct' ? 'AGENTS.md' : 'guidance.md',
          managedBlock:
            '<!-- OAT tools -->\n## Tool Packs\n- workflows\n<!-- END OAT tools -->',
          legacyBlockAction: 'preserve',
          instructions: expect.any(Array),
        },
      });
      expect(JSON.stringify(first)).not.toContain('Private user instructions');
      expect(JSON.stringify(first)).not.toContain(root);
      await expect(readFile(targetPath, 'utf8')).resolves.toBe(original);
      const after = await lstat(targetPath);
      expect(after.ino).toBe(before.ino);
      expect(after.mode).toBe(before.mode);
      await expectNoPrivateArtifacts();
    },
  );

  it('redacts an absolute contained symlink target as repository-relative', async () => {
    await setup();
    const target = join(root, 'nested', 'guidance.md');
    await mkdir(join(root, 'nested'));
    await writeFile(target, '# Existing\n', 'utf8');
    await symlink(target, join(root, 'AGENTS.md'));

    const result = await upsertAgentsMdSection(root, 'tools', 'Tool guidance');

    expect(result.manualPatch?.target).toBe('nested/guidance.md');
    expect(JSON.stringify(result)).not.toContain(root);
    await expect(readFile(target, 'utf8')).resolves.toBe('# Existing\n');
  });

  it.each(['direct', 'symlink'] as const)(
    'returns no-change for exact existing managed content through a %s target',
    async (kind) => {
      await setup();
      const content =
        '<!-- OAT tools -->\nTool guidance\n<!-- END OAT tools -->\n';
      const target =
        kind === 'direct' ? join(root, 'AGENTS.md') : join(root, 'shared.md');
      await writeFile(target, content, 'utf8');
      if (kind === 'symlink')
        await symlink('shared.md', join(root, 'AGENTS.md'));

      await expect(
        upsertAgentsMdSection(root, 'tools', 'Tool guidance', {
          removeSectionKeys: ['workflows'],
        }),
      ).resolves.toEqual({ action: 'no-change' });
      await expect(readFile(target, 'utf8')).resolves.toBe(content);
    },
  );

  it.each(['direct', 'symlink'] as const)(
    'proposes legacy removal without changing a %s target',
    async (kind) => {
      await setup();
      const original = [
        '# Prefix',
        '<!-- OAT workflows -->',
        'legacy',
        '<!-- END OAT workflows -->',
        '# Suffix',
        '',
      ].join('\n');
      const target =
        kind === 'direct' ? join(root, 'AGENTS.md') : join(root, 'shared.md');
      await writeFile(target, original, 'utf8');
      if (kind === 'symlink')
        await symlink('shared.md', join(root, 'AGENTS.md'));

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
        {
          removeSectionKeys: ['workflows'],
        },
      );

      expect(result).toMatchObject({
        action: 'manual-required',
        manualPatch: { legacyBlockAction: 'remove-manually' },
      });
      expect(result.manualPatch?.instructions.join('\n')).toMatch(
        /remove the legacy OAT workflows/i,
      );
      await expect(readFile(target, 'utf8')).resolves.toBe(original);
    },
  );

  it.each([
    '<!-- OAT tools -->\nunterminated\n',
    '<!-- END OAT tools -->\n',
    '<!-- END OAT tools -->\n<!-- OAT tools -->\n',
    '<!-- OAT tools -->\none\n<!-- OAT tools -->\ntwo\n<!-- END OAT tools -->\n',
    '<!-- OAT tools -->\none\n<!-- END OAT tools -->\n<!-- END OAT tools -->\n',
    '<!-- OAT workflows -->\nunterminated legacy\n',
  ])('returns blocked for malformed or duplicate markers', async (content) => {
    await setup(content);

    const result = await upsertAgentsMdSection(root, 'tools', 'replacement', {
      removeSectionKeys: ['workflows'],
    });

    expect(result).toMatchObject({
      action: 'blocked',
      blocked: {
        code: 'blocked',
        target: 'AGENTS.md',
        reason: expect.stringMatching(/marker pair/),
      },
    });
    expect(JSON.stringify(result)).not.toContain(root);
    await expect(readAgentsMd()).resolves.toBe(content);
  });

  it.each([
    [
      'nested',
      '<!-- OAT tools -->\n<!-- OAT workflows -->\nlegacy\n<!-- END OAT workflows -->\n<!-- END OAT tools -->\n',
    ],
    [
      'reverse nested',
      '<!-- OAT workflows -->\n<!-- OAT tools -->\nold\n<!-- END OAT tools -->\n<!-- END OAT workflows -->\n',
    ],
    [
      'crossed',
      '<!-- OAT tools -->\n<!-- OAT workflows -->\n<!-- END OAT tools -->\n<!-- END OAT workflows -->\n',
    ],
  ])('returns blocked for %s managed ranges', async (_case, content) => {
    await setup(content);

    const result = await upsertAgentsMdSection(root, 'tools', 'replacement', {
      removeSectionKeys: ['workflows'],
    });

    expect(result).toMatchObject({ action: 'blocked' });
    await expect(readAgentsMd()).resolves.toBe(content);
  });

  it.each([
    ['external', async (path: string) => symlink('../outside.md', path)],
    ['broken', async (path: string) => symlink('missing.md', path)],
    ['cyclic', async (path: string) => symlink('AGENTS.md', path)],
    [
      'directory',
      async (path: string) => {
        await mkdir(join(root, 'guidance'));
        await symlink('guidance', path);
      },
    ],
  ])('returns blocked for an unsafe %s target', async (_case, seed) => {
    await setup();
    const outside = join(root, '..', 'outside.md');
    await writeFile(outside, '# Outside\n', 'utf8');
    try {
      await seed(join(root, 'AGENTS.md'));
      const result = await upsertAgentsMdSection(root, 'tools', 'replacement');
      expect(result).toMatchObject({ action: 'blocked' });
      expect(JSON.stringify(result)).not.toContain(root);
      await expect(readFile(outside, 'utf8')).resolves.toBe('# Outside\n');
    } finally {
      await rm(outside, { force: true });
    }
  });

  it.each(['direct', 'symlink'] as const)(
    'blocks a late in-place edit while preserving its bytes for a %s target',
    async (kind) => {
      await setup();
      const target =
        kind === 'direct' ? join(root, 'AGENTS.md') : join(root, 'shared.md');
      await writeFile(target, '# Original\n', 'utf8');
      if (kind === 'symlink')
        await symlink('shared.md', join(root, 'AGENTS.md'));
      let reads = 0;
      const fileSystem = withFileSystem({
        readFile: vi.fn(async (...args) => {
          const value = await readFile(...args);
          reads += 1;
          if (reads === 1)
            await writeFile(target, '# Late user edit\n', 'utf8');
          return value;
        }) as AgentsMdFileSystem['readFile'],
      });

      const result = await upsertAgentsMdSection(root, 'tools', 'replacement', {
        fileSystem,
      });

      expect(result).toMatchObject({ action: 'blocked' });
      await expect(readFile(target, 'utf8')).resolves.toBe(
        '# Late user edit\n',
      );
      await expectNoPrivateArtifacts();
    },
  );

  it('creates all requested sections together for a missing target', async () => {
    await setup();
    const result = await upsertAgentsMdSections(root, [
      { key: 'project-management', body: 'PJM guidance' },
      { key: 'decisions', body: 'Decision guidance' },
    ]);

    expect(result).toEqual({
      'project-management': { action: 'created' },
      decisions: { action: 'created' },
    });
    await expect(readAgentsMd()).resolves.toBe(
      '<!-- OAT project-management -->\nPJM guidance\n<!-- END OAT project-management -->\n\n<!-- OAT decisions -->\nDecision guidance\n<!-- END OAT decisions -->\n',
    );
  });

  it('returns one user-content-free manual patch for requested existing sections', async () => {
    const original = '# Secret prefix\nSecret suffix\n';
    await setup(original);
    const result = await upsertAgentsMdSections(root, [
      { key: 'project-management', body: 'PJM guidance' },
      { key: 'decisions', body: 'Decision guidance' },
    ]);

    expect(result['project-management']).toEqual(result.decisions);
    expect(result['project-management']).toMatchObject({
      action: 'manual-required',
      manualPatch: {
        managedBlock: expect.stringContaining('<!-- OAT decisions -->'),
      },
    });
    expect(JSON.stringify(result)).not.toContain('Secret');
    await expect(readAgentsMd()).resolves.toBe(original);
  });

  it('never removes an existing managed section automatically', async () => {
    const original =
      '# Header\n<!-- OAT workflows -->\nlegacy\n<!-- END OAT workflows -->\n';
    await setup(original);

    await expect(removeAgentsMdSection(root, 'workflows')).resolves.toBe(
      'manual-required',
    );
    await expect(readAgentsMd()).resolves.toBe(original);
  });

  it('returns false when a removed section or file is absent', async () => {
    await setup();
    await expect(removeAgentsMdSection(root, 'workflows')).resolves.toBe(false);
    await writeFile(join(root, 'AGENTS.md'), '# Header\n', 'utf8');
    await expect(removeAgentsMdSection(root, 'workflows')).resolves.toBe(false);
  });
});
