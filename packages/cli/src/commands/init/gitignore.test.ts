import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { applyOatCoreGitignore } from './gitignore';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-gitignore-'));
  tempDirs.push(dir);
  return dir;
}

describe('applyOatCoreGitignore', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('creates .gitignore with core section when none exists', async () => {
    const root = await makeTempDir();

    const result = await applyOatCoreGitignore(root);

    expect(result.action).toBe('created');
    expect(result.entries).toContain('.oat/config.local.json');
    const content = await readFile(join(root, '.gitignore'), 'utf8');
    expect(content).toContain('# OAT core');
    expect(content).toContain('.oat/config.local.json');
    expect(content).toContain('!.oat/projects/local/.gitkeep');
    expect(content).toContain('# END OAT core');
  });

  it('appends core section to existing .gitignore', async () => {
    const root = await makeTempDir();
    await writeFile(join(root, '.gitignore'), 'node_modules\n', 'utf8');

    const result = await applyOatCoreGitignore(root);

    expect(result.action).toBe('updated');
    const content = await readFile(join(root, '.gitignore'), 'utf8');
    expect(content).toContain('node_modules');
    expect(content).toContain('# OAT core');
    expect(content).toContain('.oat/state.md');
  });

  it('returns no-change on idempotent re-run', async () => {
    const root = await makeTempDir();

    await applyOatCoreGitignore(root);
    const result = await applyOatCoreGitignore(root);

    expect(result.action).toBe('no-change');
  });

  it('updates existing section when entries differ', async () => {
    const root = await makeTempDir();
    await writeFile(
      join(root, '.gitignore'),
      '# OAT core\n.oat/config.local.json\n# END OAT core\n',
      'utf8',
    );

    const result = await applyOatCoreGitignore(root);

    expect(result.action).toBe('updated');
    const content = await readFile(join(root, '.gitignore'), 'utf8');
    expect(content).toContain('.oat/state.md');
    expect(content).toContain('.oat/projects/local/**');
  });

  it('coexists with OAT local paths section', async () => {
    const root = await makeTempDir();
    const existing = [
      'node_modules',
      '',
      '# OAT local paths',
      '.oat/ideas/',
      '.oat/projects/**/pr/',
      '# END OAT local paths',
      '',
    ].join('\n');
    await writeFile(join(root, '.gitignore'), existing, 'utf8');

    const result = await applyOatCoreGitignore(root);

    expect(result.action).toBe('updated');
    const content = await readFile(join(root, '.gitignore'), 'utf8');
    expect(content).toContain('# OAT core');
    expect(content).toContain('# OAT local paths');
    expect(content).toContain('.oat/ideas/');
  });
});
