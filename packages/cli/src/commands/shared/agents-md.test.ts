import { execFileSync } from 'node:child_process';
import { constants } from 'node:fs';
import {
  appendFile,
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type AgentsMdFileSystem,
  removeAgentsMdSection,
  upsertAgentsMdSection,
  upsertAgentsMdSections,
} from './agents-md';

const realFileSystem: AgentsMdFileSystem = {
  lstat,
  open,
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

const TOOLS_BLOCK =
  '<!-- OAT tools -->\n## Tool Packs\n- workflows\n<!-- END OAT tools -->';
const STALE_TOOLS_BLOCK =
  '<!-- OAT tools -->\n## Tool Packs\n- stale\n<!-- END OAT tools -->\n';

describe('append-only AGENTS.md guidance', () => {
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

  it('preserves a target that appears before exclusive create and replans to an append', async () => {
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

    expect(result).toEqual({ action: 'appended' });
    await expect(readAgentsMd()).resolves.toBe(
      '# Late user file\n\n<!-- OAT tools -->\nTool guidance\n<!-- END OAT tools -->\n',
    );
    await expectNoPrivateArtifacts();
  });

  it.each(['direct', 'symlink'] as const)(
    'returns the same redacted zero-write patch for a different block in an existing %s target',
    async (kind) => {
      await setup();
      const agentsPath = join(root, 'AGENTS.md');
      const targetPath =
        kind === 'direct' ? agentsPath : join(root, 'guidance.md');
      const original = `# Private user instructions\nDo not echo this text.\n${STALE_TOOLS_BLOCK}`;
      await writeFile(targetPath, original, { mode: 0o640 });
      await chmod(targetPath, 0o640);
      if (kind === 'symlink') await symlink('guidance.md', agentsPath);
      const before = await lstat(targetPath);
      const openSpy = vi.fn(realFileSystem.open);

      const first = await upsertAgentsMdSection(
        root,
        'tools',
        '## Tool Packs\n- workflows',
        {
          removeSectionKeys: ['workflows'],
          fileSystem: withFileSystem({ open: openSpy }),
        },
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
          managedBlock: TOOLS_BLOCK,
          legacyBlockAction: 'preserve',
          instructions: expect.any(Array),
        },
      });
      expect(openSpy).not.toHaveBeenCalled();
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
    const original = `# Existing\n${STALE_TOOLS_BLOCK}`;
    await writeFile(target, original, 'utf8');
    await symlink(target, join(root, 'AGENTS.md'));

    const result = await upsertAgentsMdSection(root, 'tools', 'Tool guidance');

    expect(result.manualPatch?.target).toBe('nested/guidance.md');
    expect(JSON.stringify(result)).not.toContain(root);
    await expect(readFile(target, 'utf8')).resolves.toBe(original);
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

      const openSpy = vi.fn(realFileSystem.open);
      await expect(
        upsertAgentsMdSection(root, 'tools', 'Tool guidance', {
          removeSectionKeys: ['workflows'],
          fileSystem: withFileSystem({ open: openSpy }),
        }),
      ).resolves.toEqual({ action: 'no-change' });
      expect(openSpy).not.toHaveBeenCalled();
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
    [
      'external',
      async (path: string, outside: string) =>
        symlink(relative(root, outside), path),
    ],
    ['broken', async (path: string) => symlink('missing.md', path)],
    ['cyclic', async (path: string) => symlink('AGENTS.md', path)],
    [
      'directory',
      async (path: string) => {
        await mkdir(join(root, 'guidance'));
        await symlink('guidance', path);
      },
    ],
  ] as const)(
    'returns blocked for an unsafe %s target',
    async (_case, seed) => {
      await setup();
      // Each variant owns a private sibling directory for the outside target, so
      // concurrent variants and test processes never share one outside file.
      const outsideDir = await mkdtemp(join(tmpdir(), 'agents-md-outside-'));
      const outside = join(outsideDir, 'outside.md');
      await writeFile(outside, '# Outside\n', 'utf8');
      try {
        await seed(join(root, 'AGENTS.md'), outside);
        const result = await upsertAgentsMdSection(
          root,
          'tools',
          'replacement',
        );
        expect(result).toMatchObject({ action: 'blocked' });
        expect(JSON.stringify(result)).not.toContain(root);
        await expect(readFile(outside, 'utf8')).resolves.toBe('# Outside\n');
      } finally {
        await rm(outsideDir, { recursive: true, force: true });
      }
    },
  );

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

  it('returns one user-content-free manual patch for requested different sections', async () => {
    const original = [
      '# Secret prefix',
      '<!-- OAT project-management -->',
      'old PJM',
      '<!-- END OAT project-management -->',
      '<!-- OAT decisions -->',
      'old decisions',
      '<!-- END OAT decisions -->',
      'Secret suffix',
      '',
    ].join('\n');
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

  describe('append path for absent managed blocks', () => {
    it.each(['direct', 'symlink'] as const)(
      'appends an absent block to an existing %s target with the real file system',
      async (kind) => {
        await setup();
        const target =
          kind === 'direct' ? join(root, 'AGENTS.md') : join(root, 'shared.md');
        const original = '# Existing user guidance\nKeep this.\n';
        await writeFile(target, original, 'utf8');
        if (kind === 'symlink')
          await symlink('shared.md', join(root, 'AGENTS.md'));
        const before = await lstat(target);

        const first = await upsertAgentsMdSection(
          root,
          'tools',
          '## Tool Packs\n- workflows',
        );
        const repeated = await upsertAgentsMdSection(
          root,
          'tools',
          '## Tool Packs\n- workflows',
        );

        expect(first).toEqual({ action: 'appended' });
        expect(repeated).toEqual({ action: 'no-change' });
        await expect(readFile(target, 'utf8')).resolves.toBe(
          `${original}\n${TOOLS_BLOCK}\n`,
        );
        const after = await lstat(target);
        expect(after.ino).toBe(before.ino);
        expect(after.mode).toBe(before.mode);
        if (kind === 'symlink') {
          expect((await lstat(join(root, 'AGENTS.md'))).isSymbolicLink()).toBe(
            true,
          );
        }
        await expectNoPrivateArtifacts();
      },
    );

    it('opens the existing target write-only, append-only, no-follow, and non-blocking', async () => {
      await setup('# Existing\n');
      const openSpy = vi.fn(realFileSystem.open);
      const write = vi.fn(realFileSystem.writeFile);

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
        {
          fileSystem: withFileSystem({ open: openSpy, writeFile: write }),
        },
      );

      expect(result).toEqual({ action: 'appended' });
      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(openSpy.mock.calls[0]?.[0]).toBe(
        join(await realpath(root), 'AGENTS.md'),
      );
      expect(openSpy.mock.calls[0]?.[1]).toBe(
        constants.O_WRONLY |
          constants.O_APPEND |
          constants.O_NOFOLLOW |
          constants.O_NONBLOCK,
      );
      expect(write).not.toHaveBeenCalled();
    });

    it('negative control (a): an absent block no longer yields the pre-fix manual patch', async () => {
      // Pre-fix behavior: existing file + absent block -> manual-required with
      // zero writes and a non-zero exit. The append contract replaces it.
      const original = '# No trailing newline';
      await setup(original);

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
      );

      expect(result).toEqual({ action: 'appended' });
      expect(result.manualPatch).toBeUndefined();
      await expect(readAgentsMd()).resolves.toBe(
        `${original}\n<!-- OAT tools -->\nTool guidance\n<!-- END OAT tools -->\n`,
      );
    });

    it('negative control (b): appends every absent block after the original bytes', async () => {
      const original = '# Secret prefix\nSecret suffix\n';
      await setup(original);

      const result = await upsertAgentsMdSections(root, [
        { key: 'project-management', body: 'PJM guidance' },
        { key: 'decisions', body: 'Decision guidance' },
      ]);

      expect(result).toEqual({
        'project-management': { action: 'appended' },
        decisions: { action: 'appended' },
      });
      expect(JSON.stringify(result)).not.toContain('Secret');
      await expect(readAgentsMd()).resolves.toBe(
        `${original}\n<!-- OAT project-management -->\nPJM guidance\n<!-- END OAT project-management -->\n\n<!-- OAT decisions -->\nDecision guidance\n<!-- END OAT decisions -->\n`,
      );
    });

    it('negative control (c): a concurrent append survives with the original prefix unchanged', async () => {
      const original = '# Original prefix\nuser line\n';
      await setup(original);
      const agentsPath = join(root, 'AGENTS.md');
      const concurrent = 'Concurrent user note.\n';
      const fileSystem = withFileSystem({
        open: vi.fn(async (...args: Parameters<typeof open>) => {
          await appendFile(agentsPath, concurrent, 'utf8');
          return open(...args);
        }) as AgentsMdFileSystem['open'],
      });

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
        {
          fileSystem,
        },
      );

      expect(result).toEqual({ action: 'appended' });
      const content = await readAgentsMd();
      expect(content.startsWith(original)).toBe(true);
      expect(content).toBe(
        `${original}${concurrent}\n<!-- OAT tools -->\nTool guidance\n<!-- END OAT tools -->\n`,
      );
    });

    it('negative control (d): a concurrent append without a trailing newline keeps the marker on its own line', async () => {
      const original = '# Original prefix\n';
      await setup(original);
      const agentsPath = join(root, 'AGENTS.md');
      const concurrent = 'unterminated concurrent tail';
      const fileSystem = withFileSystem({
        open: vi.fn(async (...args: Parameters<typeof open>) => {
          await appendFile(agentsPath, concurrent, 'utf8');
          return open(...args);
        }) as AgentsMdFileSystem['open'],
      });

      const first = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
        {
          fileSystem,
        },
      );
      const repeated = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
      );

      expect(first).toEqual({ action: 'appended' });
      expect(repeated).toEqual({ action: 'no-change' });
      const content = await readAgentsMd();
      expect(content.startsWith(`${original}${concurrent}`)).toBe(true);
      expect(content.split('\n')).toContain('<!-- OAT tools -->');
      expect(content.match(/<!-- OAT tools -->/g)).toHaveLength(1);
      expect(content.match(/<!-- END OAT tools -->/g)).toHaveLength(1);
    });

    it('negative control (e): refuses a hard-linked outside target swapped in before the open', async () => {
      await setup('# Repository guidance\n');
      const agentsPath = join(root, 'AGENTS.md');
      const outsideDir = await mkdtemp(join(tmpdir(), 'agents-md-swap-'));
      const outside = join(outsideDir, 'outside.md');
      const outsideContent = '# Outside the repository\n';
      await writeFile(outside, outsideContent, 'utf8');
      try {
        const fileSystem = withFileSystem({
          open: vi.fn(async (...args: Parameters<typeof open>) => {
            const staged = join(root, 'swap.tmp');
            await link(outside, staged);
            await rename(staged, agentsPath);
            return open(...args);
          }) as AgentsMdFileSystem['open'],
        });

        const result = await upsertAgentsMdSection(
          root,
          'tools',
          'Tool guidance',
          { fileSystem },
        );

        expect(result).toMatchObject({
          action: 'blocked',
          blocked: {
            reason: 'Repository or AGENTS.md identity changed during planning.',
          },
        });
        await expect(readFile(outside, 'utf8')).resolves.toBe(outsideContent);
        await expect(readAgentsMd()).resolves.toBe(outsideContent);
      } finally {
        await rm(outsideDir, { recursive: true, force: true });
      }
    });

    it('negative control (f): an absent block beside a legacy block stays zero-write', async () => {
      const original =
        '# Header\n<!-- OAT workflows -->\nlegacy\n<!-- END OAT workflows -->\n';
      await setup(original);
      const openSpy = vi.fn(realFileSystem.open);

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
        {
          removeSectionKeys: ['workflows'],
          fileSystem: withFileSystem({ open: openSpy }),
        },
      );

      expect(result).toMatchObject({
        action: 'manual-required',
        manualPatch: { legacyBlockAction: 'remove-manually' },
      });
      expect(openSpy).not.toHaveBeenCalled();
      await expect(readAgentsMd()).resolves.toBe(original);
    });

    it('negative control (f): appends the absent block and patches only the different block', async () => {
      const original = [
        '# Header',
        '<!-- OAT decisions -->',
        'old decisions',
        '<!-- END OAT decisions -->',
        '',
      ].join('\n');
      await setup(original);

      const result = await upsertAgentsMdSections(root, [
        { key: 'project-management', body: 'PJM guidance' },
        { key: 'decisions', body: 'Decision guidance' },
      ]);

      expect(result['project-management']).toEqual({ action: 'appended' });
      expect(result.decisions).toMatchObject({
        action: 'manual-required',
        manualPatch: {
          managedBlock:
            '<!-- OAT decisions -->\nDecision guidance\n<!-- END OAT decisions -->',
          legacyBlockAction: 'preserve',
        },
      });
      await expect(readAgentsMd()).resolves.toBe(
        `${original}\n<!-- OAT project-management -->\nPJM guidance\n<!-- END OAT project-management -->\n`,
      );
    });
  });

  describe('append refusals and failures (p01 review)', () => {
    const tempDirs: string[] = [];

    afterEach(async () => {
      await Promise.all(
        tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
      );
      tempDirs.length = 0;
    });

    async function outsideFile(content: string): Promise<string> {
      const dir = await mkdtemp(join(tmpdir(), 'agents-md-outside-link-'));
      tempDirs.push(dir);
      const path = join(dir, 'outside.md');
      await writeFile(path, content, 'utf8');
      return path;
    }

    it('negative control (g): a hard link to an outside file present at planning gets the zero-write manual patch', async () => {
      await setup();
      const outsideContent = '# Outside the repository\n';
      const outside = await outsideFile(outsideContent);
      await link(outside, join(root, 'AGENTS.md'));
      const openSpy = vi.fn(realFileSystem.open);

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
        { fileSystem: withFileSystem({ open: openSpy }) },
      );

      expect(result).toMatchObject({
        action: 'manual-required',
        manualPatch: {
          target: 'AGENTS.md',
          managedBlock:
            '<!-- OAT tools -->\nTool guidance\n<!-- END OAT tools -->',
        },
      });
      expect(result.manualPatch?.instructions.join('\n')).toMatch(
        /more than one hard link/,
      );
      expect(openSpy).not.toHaveBeenCalled();
      await expect(readFile(outside, 'utf8')).resolves.toBe(outsideContent);
      expect(JSON.stringify(result)).not.toContain(outside);
    });

    it('gives an in-repository hard link the same zero-write manual patch', async () => {
      await setup('# Shared\n');
      await link(join(root, 'AGENTS.md'), join(root, 'CLAUDE.md'));

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
      );

      expect(result.action).toBe('manual-required');
      await expect(readAgentsMd()).resolves.toBe('# Shared\n');
    });

    it('refuses without writing when a hard link appears between planning and the open', async () => {
      await setup('# Original\n');
      const agentsPath = join(root, 'AGENTS.md');
      const dir = await mkdtemp(join(tmpdir(), 'agents-md-late-link-'));
      tempDirs.push(dir);
      const fileSystem = withFileSystem({
        open: vi.fn(async (...args: Parameters<typeof open>) => {
          await link(agentsPath, join(dir, 'late.md'));
          return open(...args);
        }) as AgentsMdFileSystem['open'],
      });

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
        { fileSystem },
      );

      expect(result.action).toBe('manual-required');
      await expect(readAgentsMd()).resolves.toBe('# Original\n');
    });

    it('reports a read-only AGENTS.md as permission denied with the manual patch', async () => {
      await setup('# Read only\n');
      await chmod(join(root, 'AGENTS.md'), 0o444);

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
      );

      expect(result).toMatchObject({
        action: 'manual-required',
        manualPatch: {
          managedBlock: expect.stringContaining('<!-- OAT tools -->'),
        },
      });
      const instructions = result.manualPatch?.instructions.join('\n') ?? '';
      expect(instructions).toMatch(/permission denied/);
      expect(instructions).not.toMatch(/identity changed/);
      await expect(readAgentsMd()).resolves.toBe('# Read only\n');
    });

    function failingHandle(
      writePlan: (
        real: Awaited<ReturnType<typeof open>>,
        buffer: Buffer,
        offset: number,
        length: number,
      ) => Promise<{ bytesWritten: number }>,
      closeError?: Error,
    ): AgentsMdFileSystem['open'] {
      return (async (...args: Parameters<typeof open>) => {
        const real = await open(...args);
        return {
          stat: () => real.stat(),
          write: (buffer: Buffer, offset: number, length: number) =>
            writePlan(real, buffer, offset, length),
          close: async () => {
            await real.close();
            if (closeError) throw closeError;
          },
        };
      }) as unknown as AgentsMdFileSystem['open'];
    }

    function errno(code: string): NodeJS.ErrnoException {
      return Object.assign(new Error(code), { code });
    }

    it('falls back to the manual patch when the first write fails with nothing written', async () => {
      await setup('# Original\n');

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
        {
          fileSystem: withFileSystem({
            open: failingHandle(async () => {
              throw errno('ENOSPC');
            }),
          }),
        },
      );

      expect(result.action).toBe('manual-required');
      expect(result.manualPatch?.instructions.join('\n')).toMatch(
        /no space left on device/,
      );
      await expect(readAgentsMd()).resolves.toBe('# Original\n');
    });

    it('reports a partial append as blocked with a repair reason', async () => {
      await setup('# Original\n');
      let calls = 0;

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
        {
          fileSystem: withFileSystem({
            open: failingHandle(async (real, buffer, offset) => {
              calls += 1;
              if (calls > 1) throw errno('ENOSPC');
              return real.write(buffer, offset, 5);
            }),
          }),
        },
      );

      expect(result).toMatchObject({
        action: 'blocked',
        blocked: { reason: expect.stringMatching(/partial OAT block/) },
      });
      expect(result.blocked?.reason).not.toMatch(/identity changed/);
    });

    it('keeps appended when close fails after the full payload was written', async () => {
      await setup('# Original\n');

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
        {
          fileSystem: withFileSystem({
            open: failingHandle(
              (real, buffer, offset, length) =>
                real.write(buffer, offset, length),
              errno('EIO'),
            ),
          }),
        },
      );

      expect(result).toEqual({ action: 'appended' });
      await expect(readAgentsMd()).resolves.toBe(
        '# Original\n\n<!-- OAT tools -->\nTool guidance\n<!-- END OAT tools -->\n',
      );
    });

    it('fails fast instead of hanging on a FIFO swapped in before the open', async () => {
      await setup('# Original\n');
      const agentsPath = join(root, 'AGENTS.md');
      const fileSystem = withFileSystem({
        open: vi.fn(async (...args: Parameters<typeof open>) => {
          await rm(agentsPath);
          execFileSync('mkfifo', [agentsPath]);
          return open(...args);
        }) as AgentsMdFileSystem['open'],
      });

      const result = await upsertAgentsMdSection(
        root,
        'tools',
        'Tool guidance',
        { fileSystem },
      );

      expect(result.action).toBe('blocked');
    }, 5000);
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
