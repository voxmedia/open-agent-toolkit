import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearActiveProject,
  readOatConfig,
  readOatLocalConfig,
  resolveActiveProject,
  setActiveProject,
  writeOatConfig,
  writeOatLocalConfig,
} from './oat-config';

describe('oat-config', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-local-config-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    return root;
  }

  it('returns defaults when config files are missing', async () => {
    const repoRoot = await createRepoRoot();

    await expect(readOatConfig(repoRoot)).resolves.toEqual({ version: 1 });
    await expect(readOatLocalConfig(repoRoot)).resolves.toEqual({ version: 1 });
  });

  it('reads and writes .oat/config.json round-trip', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatConfig(repoRoot, {
      version: 99,
      projects: { root: '.oat/projects/custom' },
      worktrees: { root: '.worktrees' },
    });

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      projects: { root: '.oat/projects/custom' },
      worktrees: { root: '.worktrees' },
    });
  });

  it('reads and writes .oat/config.local.json round-trip', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatLocalConfig(repoRoot, {
      version: 7,
      activeProject: '.oat/projects/shared/demo',
      lastPausedProject: null,
    });

    await expect(readOatLocalConfig(repoRoot)).resolves.toEqual({
      version: 1,
      activeProject: '.oat/projects/shared/demo',
      lastPausedProject: null,
    });
  });

  it('normalizes legacy absolute activeProject paths to repo-relative', async () => {
    const repoRoot = await createRepoRoot();
    const absoluteProjectPath = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      'demo',
    );
    await mkdir(absoluteProjectPath, { recursive: true });
    await writeFile(
      join(absoluteProjectPath, 'state.md'),
      '---\n---\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: absoluteProjectPath })}\n`,
      'utf8',
    );

    const localConfig = await readOatLocalConfig(repoRoot);
    expect(localConfig.activeProject).toBe('.oat/projects/shared/demo');
  });

  it('resolveActiveProject reports active for valid config-local project paths', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '---\n---\n', 'utf8');
    await writeOatLocalConfig(repoRoot, {
      version: 1,
      activeProject: '.oat/projects/shared/demo',
    });

    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: 'demo',
      path: '.oat/projects/shared/demo',
      status: 'active',
    });
  });

  it('resolveActiveProject reports missing when configured path does not exist', async () => {
    const repoRoot = await createRepoRoot();
    await writeOatLocalConfig(repoRoot, {
      version: 1,
      activeProject: '.oat/projects/shared/missing-project',
    });

    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: 'missing-project',
      path: '.oat/projects/shared/missing-project',
      status: 'missing',
    });
  });

  it('resolveActiveProject reports unset when activeProject is missing', async () => {
    const repoRoot = await createRepoRoot();

    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: null,
      path: null,
      status: 'unset',
    });
  });

  it('setActiveProject stores repo-relative path and clearActiveProject stores lastPausedProject', async () => {
    const repoRoot = await createRepoRoot();
    const absoluteProjectPath = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      'demo',
    );
    await mkdir(absoluteProjectPath, { recursive: true });

    await setActiveProject(repoRoot, absoluteProjectPath);
    let localConfig = await readOatLocalConfig(repoRoot);
    expect(localConfig.activeProject).toBe('.oat/projects/shared/demo');

    await clearActiveProject(repoRoot, {
      lastPaused: '.oat/projects/shared/demo',
    });
    localConfig = await readOatLocalConfig(repoRoot);

    expect(localConfig.activeProject).toBeNull();
    expect(localConfig.lastPausedProject).toBe('.oat/projects/shared/demo');

    const raw = await readFile(
      join(repoRoot, '.oat', 'config.local.json'),
      'utf8',
    );
    expect(raw.endsWith('\n')).toBe(true);
  });
});
