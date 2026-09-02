import {
  lstat,
  link,
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
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type AgentsMdFileSystem,
  removeAgentsMdSection,
  upsertAgentsMdSection,
} from './agents-md';

const realFileSystem: AgentsMdFileSystem = {
  link,
  lstat,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  writeFile,
};

function withFileSystem(
  overrides: Partial<AgentsMdFileSystem>,
): AgentsMdFileSystem {
  return { ...realFileSystem, ...overrides };
}

describe('upsertAgentsMdSection', () => {
  let root: string;

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
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

  async function expectRecoveryRequired(operation: Promise<unknown>) {
    await expect(operation).resolves.toEqual({ action: 'recovery-required' });
  }

  it('creates AGENTS.md with the section when file does not exist', async () => {
    await setup();

    const result = await upsertAgentsMdSection(
      root,
      'docs',
      '## Docs\nPath: docs/',
    );

    expect(result.action).toBe('created');
    const content = await readAgentsMd();
    expect(content).toBe(
      '<!-- OAT docs -->\n## Docs\nPath: docs/\n<!-- END OAT docs -->\n',
    );
  });

  it('appends section to existing AGENTS.md without markers', async () => {
    await setup('# My Project\n\nSome content.\n');

    await expectRecoveryRequired(
      upsertAgentsMdSection(root, 'docs', '## Docs\nPath: docs/'),
    );

    const content = await readAgentsMd();
    expect(content).toBe(
      '# My Project\n\nSome content.\n\n<!-- OAT docs -->\n## Docs\nPath: docs/\n<!-- END OAT docs -->\n',
    );
  });

  it('replaces existing section content when markers are present', async () => {
    await setup(
      '# Header\n\n<!-- OAT docs -->\nold content\n<!-- END OAT docs -->\n\n# Footer\n',
    );

    await expectRecoveryRequired(
      upsertAgentsMdSection(root, 'docs', 'new content'),
    );

    const content = await readAgentsMd();
    expect(content).toBe(
      '# Header\n\n<!-- OAT docs -->\nnew content\n<!-- END OAT docs -->\n\n# Footer\n',
    );
  });

  it('returns no-change when content is identical', async () => {
    await setup(
      '# Header\n\n<!-- OAT docs -->\nsame content\n<!-- END OAT docs -->\n',
    );

    const result = await upsertAgentsMdSection(root, 'docs', 'same content');

    expect(result.action).toBe('no-change');
  });

  it('handles different section keys independently', async () => {
    await setup('<!-- OAT docs -->\ndocs section\n<!-- END OAT docs -->\n');

    await expectRecoveryRequired(
      upsertAgentsMdSection(root, 'workflows', 'workflows section'),
    );

    const content = await readAgentsMd();
    expect(content).toContain('<!-- OAT docs -->');
    expect(content).toContain('<!-- OAT workflows -->');
    expect(content).toContain('docs section');
    expect(content).toContain('workflows section');
  });

  it('appends with double newline when file does not end with newline', async () => {
    await setup('# Header');

    await expectRecoveryRequired(
      upsertAgentsMdSection(root, 'docs', 'content'),
    );

    const content = await readAgentsMd();
    expect(content).toBe(
      '# Header\n\n<!-- OAT docs -->\ncontent\n<!-- END OAT docs -->\n',
    );
  });

  it.each([
    ['relative', 'guidance/AGENTS.shared.md'],
    ['absolute', 'absolute'],
  ])('updates a contained %s symlink target', async (_kind, targetValue) => {
    await setup();
    await mkdir(join(root, 'guidance'));
    const target = join(root, 'guidance', 'AGENTS.shared.md');
    await writeFile(target, '# Shared guidance\n', 'utf8');
    await symlink(
      targetValue === 'absolute' ? target : targetValue,
      join(root, 'AGENTS.md'),
    );

    await expectRecoveryRequired(
      upsertAgentsMdSection(root, 'docs', 'new content'),
    );

    await expect(readFile(target, 'utf8')).resolves.toContain(
      '<!-- OAT docs -->\nnew content\n<!-- END OAT docs -->',
    );
    expect((await lstat(join(root, 'AGENTS.md'))).isSymbolicLink()).toBe(true);
  });

  it.each([
    [
      'external',
      async (agentsPath: string) => symlink('../outside.md', agentsPath),
    ],
    ['broken', async (agentsPath: string) => symlink('missing.md', agentsPath)],
    [
      'cyclic',
      async (agentsPath: string) => {
        await symlink('AGENTS.md', agentsPath);
      },
    ],
    [
      'directory',
      async (agentsPath: string) => {
        await mkdir(join(root, 'guidance'));
        await symlink('guidance', agentsPath);
      },
    ],
  ])('rejects a %s AGENTS.md symlink without mutation', async (_kind, seed) => {
    await setup();
    const agentsPath = join(root, 'AGENTS.md');
    const outside = join(root, '..', 'outside.md');
    await writeFile(outside, 'outside sentinel\n', 'utf8');
    try {
      await seed(agentsPath);

      await expect(
        upsertAgentsMdSection(root, 'docs', 'unsafe content'),
      ).rejects.toThrow(/AGENTS\.md/);
      await expect(readFile(outside, 'utf8')).resolves.toBe(
        'outside sentinel\n',
      );
    } finally {
      await rm(outside, { force: true });
    }
  });

  it.each([
    '<!-- OAT docs -->\nunterminated\n',
    '<!-- END OAT docs -->\n',
    '<!-- END OAT docs -->\n<!-- OAT docs -->\n',
    '<!-- OAT docs -->\none\n<!-- OAT docs -->\ntwo\n<!-- END OAT docs -->\n',
    '<!-- OAT docs -->\none\n<!-- END OAT docs -->\n<!-- END OAT docs -->\n',
    '<!-- OAT docs -->\none\n<!-- END OAT docs -->\n<!-- OAT docs -->\ntwo\n<!-- END OAT docs -->\n',
  ])('rejects malformed or duplicate managed markers', async (content) => {
    await setup(content);

    await expect(
      upsertAgentsMdSection(root, 'docs', 'replacement'),
    ).rejects.toThrow(/exactly one ordered marker pair/);
    await expect(readAgentsMd()).resolves.toBe(content);
  });

  it('fails closed when the direct file identity changes before commit', async () => {
    await setup('# Original\n');
    const agentsPath = join(root, 'AGENTS.md');
    let swapped = false;
    const fileSystem = withFileSystem({
      writeFile: vi.fn(async (...args) => {
        await writeFile(...args);
        if (!swapped) {
          swapped = true;
          await rm(agentsPath);
          await writeFile(agentsPath, '# Foreign replacement\n', 'utf8');
        }
      }) as AgentsMdFileSystem['writeFile'],
    });

    await expect(
      upsertAgentsMdSection(root, 'docs', 'new content', { fileSystem }),
    ).rejects.toThrow(/identity changed/);
    await expect(readAgentsMd()).resolves.toBe('# Foreign replacement\n');
  });

  it('fails closed and preserves a same-inode direct-file edit before publication', async () => {
    await setup('# Original\n');
    const agentsPath = join(root, 'AGENTS.md');
    let edited = false;
    const fileSystem = withFileSystem({
      writeFile: vi.fn(async (...args) => {
        await writeFile(...args);
        if (!edited) {
          edited = true;
          await writeFile(agentsPath, '# Late user edit\n', 'utf8');
        }
      }) as AgentsMdFileSystem['writeFile'],
    });

    await expect(
      upsertAgentsMdSection(root, 'docs', 'new content', { fileSystem }),
    ).rejects.toThrow(/content changed/);
    await expect(readAgentsMd()).resolves.toBe('# Late user edit\n');
  });

  it('fails closed when a contained symlink changes before commit', async () => {
    await setup();
    const originalTarget = join(root, 'original.md');
    const foreignTarget = join(root, 'foreign.md');
    const agentsPath = join(root, 'AGENTS.md');
    await writeFile(originalTarget, '# Original\n', 'utf8');
    await writeFile(foreignTarget, '# Foreign\n', 'utf8');
    await symlink('original.md', agentsPath);
    let swapped = false;
    const fileSystem = withFileSystem({
      writeFile: vi.fn(async (...args) => {
        await writeFile(...args);
        if (!swapped) {
          swapped = true;
          await rm(agentsPath);
          await symlink('foreign.md', agentsPath);
        }
      }) as AgentsMdFileSystem['writeFile'],
    });

    await expect(
      upsertAgentsMdSection(root, 'docs', 'new content', { fileSystem }),
    ).rejects.toThrow(/identity changed/);
    await expect(readFile(originalTarget, 'utf8')).resolves.toBe(
      '# Original\n',
    );
    await expect(readFile(foreignTarget, 'utf8')).resolves.toBe('# Foreign\n');
  });

  it('fails closed and preserves a same-inode contained-symlink target edit before publication', async () => {
    await setup();
    const target = join(root, 'shared.md');
    await writeFile(target, '# Original\n', 'utf8');
    await symlink('shared.md', join(root, 'AGENTS.md'));
    let edited = false;
    const fileSystem = withFileSystem({
      writeFile: vi.fn(async (...args) => {
        await writeFile(...args);
        if (!edited) {
          edited = true;
          await writeFile(target, '# Late user edit\n', 'utf8');
        }
      }) as AgentsMdFileSystem['writeFile'],
    });

    await expect(
      upsertAgentsMdSection(root, 'docs', 'new content', { fileSystem }),
    ).rejects.toThrow(/content changed/);
    await expect(readFile(target, 'utf8')).resolves.toBe('# Late user edit\n');
    expect((await lstat(join(root, 'AGENTS.md'))).isSymbolicLink()).toBe(true);
  });

  it.each([
    ['direct', 'publish'],
    ['direct', 'validation'],
    ['direct', 'cleanup'],
    ['symlink', 'publish'],
    ['symlink', 'validation'],
    ['symlink', 'cleanup'],
  ] as const)(
    'preserves open-inode edits at the %s %s boundary without public-path absence',
    async (kind, boundary) => {
      await setup();
      const agentsPath = join(root, 'AGENTS.md');
      const targetPath =
        kind === 'direct' ? agentsPath : join(root, 'shared-agents.md');
      await writeFile(targetPath, '# Original\n', 'utf8');
      if (kind === 'symlink') await symlink('shared-agents.md', agentsPath);
      const plannedTargetPath = await realpath(targetPath);
      const originalHandle = await open(targetPath, 'r+');
      const lateBytes = `# Late ${boundary} edit\n`;
      let published = false;
      let injected = false;
      let missingObserved = false;
      let recoveryCleanupAttempted = false;

      const writeLateBytes = async () => {
        if (injected) return;
        injected = true;
        await originalHandle.truncate(0);
        await originalHandle.writeFile(lateBytes, 'utf8');
        await originalHandle.sync();
      };
      const observePublicPath = async () => {
        try {
          await readFile(agentsPath, 'utf8');
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ENOENT'
          ) {
            missingObserved = true;
          }
        }
      };
      const isRecoveryPath = (path: unknown) =>
        typeof path === 'string' &&
        (path.includes('.rollback') || path.includes('.recovery'));
      const fileSystem = withFileSystem({
        link: vi.fn(async (...args) => {
          await link(...args);
          if (String(args[1]) === plannedTargetPath) {
            published = true;
            if (boundary === 'publish') await writeLateBytes();
          }
          await observePublicPath();
        }) as AgentsMdFileSystem['link'],
        rename: vi.fn(async (...args) => {
          await rename(...args);
          if (String(args[1]) === plannedTargetPath) {
            published = true;
            if (boundary === 'publish') await writeLateBytes();
          }
          await observePublicPath();
        }) as AgentsMdFileSystem['rename'],
        readFile: vi.fn(async (...args) => {
          const value = await readFile(...args);
          if (
            boundary === 'validation' &&
            published &&
            String(args[0]) === plannedTargetPath
          ) {
            await writeLateBytes();
          }
          return value;
        }) as AgentsMdFileSystem['readFile'],
        rm: vi.fn(async (...args) => {
          if (published && isRecoveryPath(args[0])) {
            recoveryCleanupAttempted = true;
            if (boundary === 'cleanup') await writeLateBytes();
          }
          await rm(...args);
          await observePublicPath();
        }) as AgentsMdFileSystem['rm'],
      });

      try {
        await expect(
          upsertAgentsMdSection(root, 'docs', 'new content', { fileSystem }),
        ).resolves.toEqual({ action: 'recovery-required' });
        expect(missingObserved).toBe(false);

        const recoveryNames = (await readdir(root)).filter(
          (name) => name.includes('.rollback') || name.includes('.recovery'),
        );
        if (boundary === 'cleanup' && !recoveryCleanupAttempted) {
          await writeLateBytes();
        }
        const survivingContents = await Promise.all([
          readFile(targetPath, 'utf8'),
          ...recoveryNames.map((name) => readFile(join(root, name), 'utf8')),
        ]);
        expect(survivingContents).toContain(lateBytes);
      } finally {
        await originalHandle.close();
      }
    },
  );

  it.each([
    '<!-- OAT workflows -->\nunterminated legacy\n',
    '<!-- OAT workflows -->\none\n<!-- END OAT workflows -->\n<!-- OAT workflows -->\ntwo\n<!-- END OAT workflows -->\n',
  ])(
    'preflights malformed legacy markers before an atomic section migration',
    async (content) => {
      await setup(content);

      await expect(
        upsertAgentsMdSection(root, 'tools', 'replacement', {
          removeSectionKeys: ['workflows'],
        }),
      ).rejects.toThrow(/exactly one ordered marker pair/);
      await expect(readAgentsMd()).resolves.toBe(content);
    },
  );

  it.each([
    [
      'tools containing workflows',
      [
        '# Prefix user text',
        '<!-- OAT tools -->',
        'old tools',
        '<!-- OAT workflows -->',
        'legacy',
        '<!-- END OAT workflows -->',
        'interstitial user text',
        '<!-- END OAT tools -->',
        '# Suffix user text',
        '',
      ].join('\n'),
    ],
    [
      'workflows containing tools',
      [
        '# Prefix user text',
        '<!-- OAT workflows -->',
        'legacy',
        '<!-- OAT tools -->',
        'old tools',
        '<!-- END OAT tools -->',
        'interstitial user text',
        '<!-- END OAT workflows -->',
        '# Suffix user text',
        '',
      ].join('\n'),
    ],
    [
      'crossed tools and workflows',
      [
        '# Prefix user text',
        '<!-- OAT tools -->',
        'old tools',
        '<!-- OAT workflows -->',
        'interstitial user text',
        '<!-- END OAT tools -->',
        '# Suffix user text',
        '<!-- END OAT workflows -->',
        '',
      ].join('\n'),
    ],
  ])(
    'rejects %s marker ranges without changing any bytes',
    async (_case, content) => {
      await setup(content);

      await expect(
        upsertAgentsMdSection(root, 'tools', 'replacement', {
          removeSectionKeys: ['workflows'],
        }),
      ).rejects.toThrow(/overlap|cross|disjoint/i);
      await expect(readAgentsMd()).resolves.toBe(content);
    },
  );

  it('publishes a valid legacy migration with an explicit recovery result', async () => {
    await setup(
      '# User guidance\n\n<!-- OAT workflows -->\nlegacy\n<!-- END OAT workflows -->\n',
    );

    await expectRecoveryRequired(
      upsertAgentsMdSection(root, 'tools', 'replacement', {
        removeSectionKeys: ['workflows'],
      }),
    );

    await expect(readAgentsMd()).resolves.toBe(
      '# User guidance\n\n<!-- OAT tools -->\nreplacement\n<!-- END OAT tools -->\n',
    );
  });

  it('preserves the original file when the atomic rename fails', async () => {
    await setup('# Original\n');
    const fileSystem = withFileSystem({
      rename: vi.fn(async () => {
        throw new Error('injected rename failure');
      }),
    });

    await expect(
      upsertAgentsMdSection(root, 'docs', 'new content', { fileSystem }),
    ).rejects.toThrow('injected rename failure');
    await expect(readAgentsMd()).resolves.toBe('# Original\n');
  });

  it('preserves unrelated, PJM, and decision sections', async () => {
    const original = [
      '# User guidance',
      '',
      '<!-- OAT project-management -->',
      'PJM guidance',
      '<!-- END OAT project-management -->',
      '',
      '<!-- OAT decisions -->',
      'Decision guidance',
      '<!-- END OAT decisions -->',
      '',
    ].join('\n');
    await setup(original);

    await expectRecoveryRequired(
      upsertAgentsMdSection(root, 'tools', 'Tool guidance'),
    );

    const content = await readAgentsMd();
    expect(content).toContain('# User guidance');
    expect(content).toContain('PJM guidance');
    expect(content).toContain('Decision guidance');
    expect(content).toContain('<!-- OAT tools -->\nTool guidance');
  });
});

describe('removeAgentsMdSection', () => {
  let root: string;

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  });

  async function setup(existingContent?: string): Promise<string> {
    root = await mkdtemp(join(tmpdir(), 'agents-md-rm-test-'));
    if (existingContent !== undefined) {
      await writeFile(join(root, 'AGENTS.md'), existingContent, 'utf8');
    }
    return root;
  }

  async function readAgentsMd(): Promise<string> {
    return readFile(join(root, 'AGENTS.md'), 'utf8');
  }

  async function expectRecoveryRequired(operation: Promise<unknown>) {
    await expect(operation).resolves.toBe('recovery-required');
  }

  it('returns false when file does not exist', async () => {
    await setup();
    expect(await removeAgentsMdSection(root, 'workflows')).toBe(false);
  });

  it('returns false when section markers are not present', async () => {
    await setup('# Header\n\nSome content.\n');
    expect(await removeAgentsMdSection(root, 'workflows')).toBe(false);
  });

  it('removes section and collapses extra blank lines', async () => {
    await setup(
      '# Header\n\n<!-- OAT workflows -->\nold content\n<!-- END OAT workflows -->\n\n# Footer\n',
    );

    await expectRecoveryRequired(removeAgentsMdSection(root, 'workflows'));

    const content = await readAgentsMd();
    expect(content).not.toContain('OAT workflows');
    expect(content).not.toContain('old content');
    expect(content).toContain('# Header');
    expect(content).toContain('# Footer');
  });

  it('preserves other sections when removing one', async () => {
    await setup(
      '<!-- OAT tools -->\nnew content\n<!-- END OAT tools -->\n\n<!-- OAT workflows -->\nlegacy\n<!-- END OAT workflows -->\n',
    );

    await expectRecoveryRequired(removeAgentsMdSection(root, 'workflows'));

    const content = await readAgentsMd();
    expect(content).toContain('<!-- OAT tools -->');
    expect(content).toContain('new content');
    expect(content).not.toContain('<!-- OAT workflows -->');
  });

  it('rejects malformed markers instead of removing unrelated content', async () => {
    const content = [
      '# User guidance',
      '<!-- OAT workflows -->',
      'legacy',
      '<!-- OAT decisions -->',
      'decision guidance',
      '<!-- END OAT decisions -->',
      '',
    ].join('\n');
    await setup(content);

    await expect(removeAgentsMdSection(root, 'workflows')).rejects.toThrow(
      /exactly one ordered marker pair/,
    );
    await expect(readAgentsMd()).resolves.toBe(content);
  });
});
