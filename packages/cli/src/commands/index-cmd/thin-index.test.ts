import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { type GitOperations, generateThinIndex } from './thin-index';

async function createTestRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-thin-'));
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'my-test-repo',
      scripts: { test: 'vitest', build: 'tsc', lint: 'biome check' },
    }),
    'utf8',
  );
  await writeFile(join(root, 'pnpm-lock.yaml'), '', 'utf8');
  await writeFile(join(root, 'tsconfig.json'), '{}', 'utf8');
  await writeFile(join(root, 'biome.json'), '{}', 'utf8');
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src', 'index.ts'), '', 'utf8');
  await writeFile(join(root, 'src', 'app.ts'), '', 'utf8');
  return root;
}

const noopGit: GitOperations = {
  resolveHead: () => 'abc123',
  resolveMergeBase: () => 'def456',
};

describe('generateThinIndex', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('provided SHAs appear in frontmatter', async () => {
    const root = await createTestRepo();
    tempDirs.push(root);

    await generateThinIndex({
      repoRoot: root,
      headSha: 'provided-head',
      mergeBaseSha: 'provided-base',
      today: '2026-02-17',
      git: noopGit,
    });

    const content = await readFile(
      join(root, '.oat', 'repo', 'knowledge', 'project-index.md'),
      'utf8',
    );
    expect(content).toContain('oat_source_head_sha: provided-head');
    expect(content).toContain('oat_source_main_merge_base_sha: provided-base');
  });

  it('reads repo name from package.json', async () => {
    const root = await createTestRepo();
    tempDirs.push(root);

    const result = await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    expect(result.repoName).toBe('my-test-repo');
    const content = await readFile(result.outputPath, 'utf8');
    expect(content).toContain('# my-test-repo');
  });

  it('falls back to directory basename when no package.json', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-thin-'));
    tempDirs.push(root);

    const result = await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    expect(result.repoName).toContain('oat-thin-');
  });

  it('detects pnpm package manager', async () => {
    const root = await createTestRepo();
    tempDirs.push(root);

    const result = await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    expect(result.packageManager).toBe('pnpm');
    const content = await readFile(result.outputPath, 'utf8');
    expect(content).toContain('**Package Manager:** pnpm');
  });

  it('detects npm package manager', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-thin-'));
    tempDirs.push(root);
    await writeFile(join(root, 'package-lock.json'), '{}', 'utf8');

    const result = await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    expect(result.packageManager).toBe('npm');
  });

  it('returns unknown package manager when no lockfile present', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-thin-'));
    tempDirs.push(root);

    const result = await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    expect(result.packageManager).toBe('unknown');
  });

  it('finds entry points in src directory', async () => {
    const root = await createTestRepo();
    tempDirs.push(root);

    const result = await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    expect(result.entryPointCount).toBe(2);
    const content = await readFile(result.outputPath, 'utf8');
    expect(content).toContain('`src/app.ts`');
    expect(content).toContain('`src/index.ts`');
  });

  it('caps directory tree at 200 entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-thin-'));
    tempDirs.push(root);
    // Create 250 files at depth 1
    for (let i = 0; i < 250; i++) {
      await writeFile(
        join(root, `file-${String(i).padStart(3, '0')}.txt`),
        '',
        'utf8',
      );
    }

    await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    const content = await readFile(
      join(root, '.oat', 'repo', 'knowledge', 'project-index.md'),
      'utf8',
    );
    const treeBlock = content.match(/```\n([\s\S]*?)```/);
    expect(treeBlock).toBeTruthy();
    const lines = treeBlock![1]!.trim().split('\n');
    expect(lines.length).toBeLessThanOrEqual(200);
  });

  it('excludes noise directories from tree', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-thin-'));
    tempDirs.push(root);
    await mkdir(join(root, 'node_modules', 'foo'), { recursive: true });
    await mkdir(join(root, 'dist'), { recursive: true });
    await mkdir(join(root, '.git'), { recursive: true });
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'main.ts'), '', 'utf8');

    await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    const content = await readFile(
      join(root, '.oat', 'repo', 'knowledge', 'project-index.md'),
      'utf8',
    );
    expect(content).not.toContain('node_modules');
    expect(content).not.toContain('  dist');
    expect(content).not.toContain('.git');
    expect(content).toContain('src');
  });

  it('detects config files', async () => {
    const root = await createTestRepo();
    tempDirs.push(root);

    await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    const content = await readFile(
      join(root, '.oat', 'repo', 'knowledge', 'project-index.md'),
      'utf8',
    );
    expect(content).toContain('`package.json`');
    expect(content).toContain('`tsconfig.json`');
    expect(content).toContain('`biome.json`');
    expect(content).toContain('`pnpm-lock.yaml`');
  });

  it('extracts test command from package.json', async () => {
    const root = await createTestRepo();
    tempDirs.push(root);

    await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    const content = await readFile(
      join(root, '.oat', 'repo', 'knowledge', 'project-index.md'),
      'utf8',
    );
    expect(content).toContain('**Test Command:** `vitest`');
  });

  it('auto-creates output directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-thin-'));
    tempDirs.push(root);

    const result = await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    expect(result.outputPath).toBe(
      join(root, '.oat', 'repo', 'knowledge', 'project-index.md'),
    );
    const content = await readFile(result.outputPath, 'utf8');
    expect(content).toContain('oat_generated: true');
  });

  it('generates valid markdown structure', async () => {
    const root = await createTestRepo();
    tempDirs.push(root);

    await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    const content = await readFile(
      join(root, '.oat', 'repo', 'knowledge', 'project-index.md'),
      'utf8',
    );
    expect(content).toContain('## Quick Orientation');
    expect(content).toContain('## Project Structure (Top-Level)');
    expect(content).toContain('## Configuration Files');
    expect(content).toContain('## Testing');
    expect(content).toContain('## Next Steps');
    expect(content).toContain('oat_generated_at: 2026-02-17');
  });

  it('still generates with throwing git mock', async () => {
    const root = await createTestRepo();
    tempDirs.push(root);

    const throwingGit: GitOperations = {
      resolveHead: () => {
        throw new Error('git not found');
      },
      resolveMergeBase: () => {
        throw new Error('git not found');
      },
    };

    const result = await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: throwingGit,
    });

    expect(result.repoName).toBe('my-test-repo');
    const content = await readFile(result.outputPath, 'utf8');
    expect(content).toContain('oat_source_head_sha: unknown');
    expect(content).toContain('oat_source_main_merge_base_sha: unknown');
  });

  it('uses git.resolveHead when headSha not provided', async () => {
    const root = await createTestRepo();
    tempDirs.push(root);

    await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    const content = await readFile(
      join(root, '.oat', 'repo', 'knowledge', 'project-index.md'),
      'utf8',
    );
    expect(content).toContain('oat_source_head_sha: abc123');
    expect(content).toContain('oat_source_main_merge_base_sha: def456');
  });

  it('extracts scripts from package.json', async () => {
    const root = await createTestRepo();
    tempDirs.push(root);

    await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    const content = await readFile(
      join(root, '.oat', 'repo', 'knowledge', 'project-index.md'),
      'utf8',
    );
    expect(content).toContain('test, build, lint');
  });

  it('shows Makefile test fallback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-thin-'));
    tempDirs.push(root);
    await writeFile(
      join(root, 'Makefile'),
      'test:\n\techo run tests\n',
      'utf8',
    );

    await generateThinIndex({
      repoRoot: root,
      today: '2026-02-17',
      git: noopGit,
    });

    const content = await readFile(
      join(root, '.oat', 'repo', 'knowledge', 'project-index.md'),
      'utf8',
    );
    expect(content).toContain('**Test Command:** `make test`');
  });
});
