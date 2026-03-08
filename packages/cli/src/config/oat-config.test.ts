import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearActiveIdea,
  clearActiveProject,
  readOatConfig,
  readOatLocalConfig,
  readUserConfig,
  resolveActiveIdea,
  resolveActiveProject,
  resolveLocalPaths,
  setActiveIdea,
  setActiveProject,
  writeOatConfig,
  writeOatLocalConfig,
  writeUserConfig,
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

  describe('localPaths normalization', () => {
    it('should deduplicate and sort localPaths', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatConfig(repoRoot, {
        version: 1,
        localPaths: [
          '.oat/projects',
          '.oat/config.local.json',
          '.oat/projects',
          '.oat/ideas',
        ],
      });

      const config = await readOatConfig(repoRoot);
      expect(config.localPaths).toEqual([
        '.oat/config.local.json',
        '.oat/ideas',
        '.oat/projects',
      ]);
    });

    it('should default to undefined when omitted', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatConfig(repoRoot, { version: 1 });

      const config = await readOatConfig(repoRoot);
      expect(config.localPaths).toBeUndefined();
    });

    it('should filter out non-string values', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          localPaths: ['.oat/projects', 42, null, '', '.oat/ideas'],
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.localPaths).toEqual(['.oat/ideas', '.oat/projects']);
    });

    it('resolveLocalPaths returns empty array when localPaths is undefined', () => {
      expect(resolveLocalPaths({ version: 1 })).toEqual([]);
    });

    it('resolveLocalPaths returns the localPaths array when defined', () => {
      expect(
        resolveLocalPaths({ version: 1, localPaths: ['.oat/projects'] }),
      ).toEqual(['.oat/projects']);
    });
  });

  describe('activeIdea config', () => {
    it('should normalize activeIdea in local config', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatLocalConfig(repoRoot, {
        version: 1,
        activeIdea: '.oat/ideas/my-idea',
      });

      const config = await readOatLocalConfig(repoRoot);
      expect(config.activeIdea).toBe('.oat/ideas/my-idea');
    });

    it('should resolve activeIdea with repo > user precedence', async () => {
      const repoRoot = await createRepoRoot();
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
      tempDirs.push(userConfigDir);

      // Set user-level idea
      await writeUserConfig(userConfigDir, {
        version: 1,
        activeIdea: '.oat/ideas/user-idea',
      });

      // No repo-level idea set
      const result1 = await resolveActiveIdea(repoRoot, userConfigDir);
      expect(result1).toBe('.oat/ideas/user-idea');

      // Set repo-level idea (should take precedence)
      await writeOatLocalConfig(repoRoot, {
        version: 1,
        activeIdea: '.oat/ideas/repo-idea',
      });

      const result2 = await resolveActiveIdea(repoRoot, userConfigDir);
      expect(result2).toBe('.oat/ideas/repo-idea');
    });

    it('should read/write user-level config at ~/.oat/config.json', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
      tempDirs.push(userConfigDir);

      await writeUserConfig(userConfigDir, {
        version: 1,
        activeIdea: '.oat/ideas/test',
      });

      const config = await readUserConfig(userConfigDir);
      expect(config.activeIdea).toBe('.oat/ideas/test');
    });

    it('setActiveIdea writes to local config', async () => {
      const repoRoot = await createRepoRoot();

      await setActiveIdea(repoRoot, '.oat/ideas/new-idea');

      const config = await readOatLocalConfig(repoRoot);
      expect(config.activeIdea).toBe('.oat/ideas/new-idea');
    });

    it('clearActiveIdea removes from local config', async () => {
      const repoRoot = await createRepoRoot();

      await setActiveIdea(repoRoot, '.oat/ideas/new-idea');
      await clearActiveIdea(repoRoot);

      const config = await readOatLocalConfig(repoRoot);
      expect(config.activeIdea).toBeNull();
    });

    it('returns null when no activeIdea is set anywhere', async () => {
      const repoRoot = await createRepoRoot();
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
      tempDirs.push(userConfigDir);

      const result = await resolveActiveIdea(repoRoot, userConfigDir);
      expect(result).toBeNull();
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
