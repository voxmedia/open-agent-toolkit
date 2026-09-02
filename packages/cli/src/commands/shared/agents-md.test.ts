import {
  lstat,
  link,
  mkdir,
  mkdtemp,
  readFile,
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

    const result = await upsertAgentsMdSection(
      root,
      'docs',
      '## Docs\nPath: docs/',
    );

    expect(result.action).toBe('updated');
    const content = await readAgentsMd();
    expect(content).toBe(
      '# My Project\n\nSome content.\n\n<!-- OAT docs -->\n## Docs\nPath: docs/\n<!-- END OAT docs -->\n',
    );
  });

  it('replaces existing section content when markers are present', async () => {
    await setup(
      '# Header\n\n<!-- OAT docs -->\nold content\n<!-- END OAT docs -->\n\n# Footer\n',
    );

    const result = await upsertAgentsMdSection(root, 'docs', 'new content');

    expect(result.action).toBe('updated');
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

    const result = await upsertAgentsMdSection(
      root,
      'workflows',
      'workflows section',
    );

    expect(result.action).toBe('updated');
    const content = await readAgentsMd();
    expect(content).toContain('<!-- OAT docs -->');
    expect(content).toContain('<!-- OAT workflows -->');
    expect(content).toContain('docs section');
    expect(content).toContain('workflows section');
  });

  it('appends with double newline when file does not end with newline', async () => {
    await setup('# Header');

    const result = await upsertAgentsMdSection(root, 'docs', 'content');

    expect(result.action).toBe('updated');
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

    await upsertAgentsMdSection(root, 'docs', 'new content');

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

    await upsertAgentsMdSection(root, 'tools', 'Tool guidance');

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

    const removed = await removeAgentsMdSection(root, 'workflows');

    expect(removed).toBe(true);
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

    await removeAgentsMdSection(root, 'workflows');

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
