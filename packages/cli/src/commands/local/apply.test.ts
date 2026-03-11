import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { applyGitignore } from './apply';

describe('oat local apply', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-local-apply-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    return root;
  }

  it('should create managed section in .gitignore when none exists', async () => {
    const repoRoot = await createRepoRoot();
    await writeFile(join(repoRoot, '.gitignore'), 'node_modules/\n', 'utf8');

    const result = await applyGitignore(repoRoot, [
      '.oat/ideas',
      '.oat/projects/local',
    ]);

    expect(result.action).toBe('updated');
    const content = await readFile(join(repoRoot, '.gitignore'), 'utf8');
    expect(content).toContain('# OAT local paths');
    expect(content).toContain('.oat/ideas/');
    expect(content).toContain('.oat/projects/local/');
    expect(content).toContain('# END OAT local paths');
    // Original content preserved
    expect(content).toContain('node_modules/');
  });

  it('should replace managed section on re-run', async () => {
    const repoRoot = await createRepoRoot();
    const existing = [
      'node_modules/',
      '',
      '# OAT local paths',
      '.oat/old-path/',
      '# END OAT local paths',
      '',
    ].join('\n');
    await writeFile(join(repoRoot, '.gitignore'), existing, 'utf8');

    const result = await applyGitignore(repoRoot, ['.oat/ideas']);

    expect(result.action).toBe('updated');
    const content = await readFile(join(repoRoot, '.gitignore'), 'utf8');
    expect(content).toContain('.oat/ideas/');
    expect(content).not.toContain('.oat/old-path/');
    expect(content).toContain('node_modules/');
  });

  it('should remove managed section when localPaths is empty', async () => {
    const repoRoot = await createRepoRoot();
    const existing = [
      'node_modules/',
      '',
      '# OAT local paths',
      '.oat/ideas/',
      '# END OAT local paths',
      '',
    ].join('\n');
    await writeFile(join(repoRoot, '.gitignore'), existing, 'utf8');

    const result = await applyGitignore(repoRoot, []);

    expect(result.action).toBe('updated');
    const content = await readFile(join(repoRoot, '.gitignore'), 'utf8');
    expect(content).not.toContain('# OAT local paths');
    expect(content).not.toContain('.oat/ideas/');
    expect(content).toContain('node_modules/');
  });

  it('should normalize paths with trailing slash', async () => {
    const repoRoot = await createRepoRoot();
    await writeFile(join(repoRoot, '.gitignore'), '', 'utf8');

    await applyGitignore(repoRoot, [
      '.oat/ideas/',
      '.oat/projects/**/reviews/archived',
    ]);

    const content = await readFile(join(repoRoot, '.gitignore'), 'utf8');
    // Both should have trailing slash, no duplicates
    expect(content).toContain('.oat/ideas/');
    expect(content).toContain('.oat/projects/**/reviews/archived/');
    expect(content.split('\n')).not.toContain('.oat/projects/**/reviews/');
  });

  it('should create .gitignore if it does not exist', async () => {
    const repoRoot = await createRepoRoot();

    const result = await applyGitignore(repoRoot, ['.oat/ideas']);

    expect(result.action).toBe('created');
    const content = await readFile(join(repoRoot, '.gitignore'), 'utf8');
    expect(content).toContain('# OAT local paths');
    expect(content).toContain('.oat/ideas/');
  });

  it('should return no-change when section already matches', async () => {
    const repoRoot = await createRepoRoot();
    const existing = [
      'node_modules/',
      '',
      '# OAT local paths',
      '.oat/ideas/',
      '# END OAT local paths',
      '',
    ].join('\n');
    await writeFile(join(repoRoot, '.gitignore'), existing, 'utf8');

    const result = await applyGitignore(repoRoot, ['.oat/ideas']);

    expect(result.action).toBe('no-change');
  });
});
