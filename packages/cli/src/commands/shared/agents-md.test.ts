import {
  chmod,
  chown,
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
  chmod,
  chown,
  link,
  lstat,
  readFile,
  readdir,
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
    await expect(operation).resolves.toMatchObject({
      action: 'recovery-required',
      recovery: {
        code: 'recovery-required',
        target: expect.any(String),
        identifiers: [expect.stringContaining('oat-recovery-')],
        action: expect.stringMatching(/review and remove.+rerun/i),
      },
    });
  }

  async function expectSafeFailure(
    operation: Promise<unknown>,
    code: string,
  ): Promise<void> {
    const error = await operation.catch((failure: unknown) => failure);
    expect(String(error)).toContain(code);
    expect(String(error)).not.toContain(root);
    expect(String(error)).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
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
    ).rejects.toThrow(/revalidation-failed/);
    await expect(readAgentsMd()).resolves.toBe('# Foreign replacement\n');
  });

  it('redacts temporary creation failures', async () => {
    await setup('# Original\n');
    const fileSystem = withFileSystem({
      writeFile: vi.fn(async () => {
        throw new Error(`EPERM ${root}/.AGENTS.private-uuid.tmp`);
      }) as AgentsMdFileSystem['writeFile'],
    });

    await expectSafeFailure(
      upsertAgentsMdSection(root, 'docs', 'content', { fileSystem }),
      'temp-create-failed',
    );
  });

  it('redacts recovery link failures', async () => {
    await setup('# Original\n');
    const fileSystem = withFileSystem({
      link: vi.fn(async () => {
        throw new Error(`EPERM ${root}/.AGENTS.private-uuid.recovery`);
      }) as AgentsMdFileSystem['link'],
    });

    await expectSafeFailure(
      upsertAgentsMdSection(root, 'docs', 'content', { fileSystem }),
      'recovery-link-failed',
    );
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
    ).rejects.toThrow(/revalidation-failed/);
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
    ).rejects.toThrow(/revalidation-failed/);
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
    ).rejects.toThrow(/revalidation-failed/);
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
        (path.includes('.rollback') ||
          path.includes('.recovery') ||
          path.includes('oat-recovery-'));
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
        ).resolves.toMatchObject({
          action: 'recovery-required',
          recovery: { code: 'recovery-required' },
        });
        expect(missingObserved).toBe(false);

        const recoveryNames = (await readdir(root)).filter(
          (name) =>
            name.includes('.rollback') ||
            name.includes('.recovery') ||
            name.includes('oat-recovery-'),
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

  it.each(['direct', 'symlink'] as const)(
    'keeps unresolved %s recovery actionable until explicit removal',
    async (kind) => {
      await setup();
      const target =
        kind === 'direct' ? join(root, 'AGENTS.md') : join(root, 'shared.md');
      await writeFile(target, '# Existing\n', 'utf8');
      if (kind === 'symlink')
        await symlink('shared.md', join(root, 'AGENTS.md'));

      const first = await upsertAgentsMdSection(root, 'docs', 'content');
      expect(first).toMatchObject({ action: 'recovery-required' });
      const identifier = first.recovery?.identifiers[0];
      expect(identifier).toMatch(/oat-recovery-/);
      await expect(
        upsertAgentsMdSection(root, 'docs', 'content'),
      ).resolves.toEqual(first);

      await rm(join(root, identifier ?? 'missing'));
      await expect(
        upsertAgentsMdSection(root, 'docs', 'content'),
      ).resolves.toEqual({ action: 'no-change' });
    },
  );

  it('skips foreign recovery-name collisions and rediscovers multiple valid recoveries', async () => {
    await setup('# Existing\n');
    let foreignPath: string | undefined;
    let collided = false;
    const fileSystem = withFileSystem({
      link: vi.fn(async (...args) => {
        if (!collided && String(args[1]).includes('oat-recovery-')) {
          collided = true;
          foreignPath = String(args[1]);
          await writeFile(foreignPath, '# Foreign collision\n', 'utf8');
          const error = new Error('collision') as Error & { code: string };
          error.code = 'EEXIST';
          throw error;
        }
        await link(...args);
      }) as AgentsMdFileSystem['link'],
    });

    const first = await upsertAgentsMdSection(root, 'docs', 'content', {
      fileSystem,
    });
    expect(first.recovery?.identifiers[0]).toMatch(/-2$/);
    await expect(readFile(foreignPath ?? '', 'utf8')).resolves.toBe(
      '# Foreign collision\n',
    );

    const validPath = join(root, first.recovery?.identifiers[0] ?? 'missing');
    const secondPath = validPath.replace(/-2$/, '-3');
    await link(validPath, secondPath);
    const repeated = await upsertAgentsMdSection(root, 'docs', 'content');
    expect(repeated.recovery?.identifiers).toHaveLength(2);
  });

  it.each([
    ['direct', 'file'],
    ['direct', 'symlink'],
    ['symlink', 'file'],
    ['symlink', 'symlink'],
  ] as const)(
    'preserves a foreign %s replacement at the %s recovery cleanup boundary',
    async (kind, replacementKind) => {
      await setup();
      const target =
        kind === 'direct' ? join(root, 'AGENTS.md') : join(root, 'shared.md');
      await writeFile(target, '# Existing\n', 'utf8');
      if (kind === 'symlink')
        await symlink('shared.md', join(root, 'AGENTS.md'));
      const foreignTarget = join(root, 'foreign.md');
      await writeFile(foreignTarget, '# Foreign\n', 'utf8');
      let recoveryPath: string | undefined;
      const fileSystem = withFileSystem({
        link: vi.fn(async (...args) => {
          await link(...args);
          if (String(args[1]).includes('oat-recovery-')) {
            recoveryPath = String(args[1]);
            await rm(recoveryPath);
            if (replacementKind === 'file') {
              await writeFile(recoveryPath, '# Foreign replacement\n', 'utf8');
            } else {
              await symlink(foreignTarget, recoveryPath);
            }
          }
        }) as AgentsMdFileSystem['link'],
      });

      await expect(
        upsertAgentsMdSection(root, 'docs', 'content', { fileSystem }),
      ).rejects.toThrow(/cleanup-conflict/);
      await expect(readFile(target, 'utf8')).resolves.toBe('# Existing\n');
      if (replacementKind === 'file') {
        await expect(readFile(recoveryPath ?? '', 'utf8')).resolves.toBe(
          '# Foreign replacement\n',
        );
      } else {
        expect((await lstat(recoveryPath ?? '')).isSymbolicLink()).toBe(true);
      }
    },
  );

  it.each(['direct', 'symlink'] as const)(
    'preserves unrelated bytes and mode for a %s managed update',
    async (kind) => {
      await setup();
      const target =
        kind === 'direct' ? join(root, 'AGENTS.md') : join(root, 'shared.md');
      const original =
        'prefix\n\n\n\n<!-- OAT docs -->\nold\n<!-- END OAT docs -->\n\n\n\nsuffix\n';
      await writeFile(target, original, { mode: 0o666 });
      await chmod(target, 0o666);
      if (kind === 'symlink')
        await symlink('shared.md', join(root, 'AGENTS.md'));

      const previousUmask = process.umask(0o077);
      try {
        await upsertAgentsMdSection(root, 'docs', 'new');
      } finally {
        process.umask(previousUmask);
      }

      await expect(readFile(target, 'utf8')).resolves.toBe(
        original.replace('\nold\n', '\nnew\n'),
      );
      expect((await lstat(target)).mode & 0o777).toBe(0o666);
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
    ).rejects.toThrow(/publish-failed/);
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
