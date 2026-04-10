import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { OatConfig, OatLocalConfig, UserConfig } from '@config/oat-config';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveEffectiveConfig } from './resolve';

describe('resolveEffectiveConfig', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-config-resolve-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    return root;
  }

  async function createUserConfigDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
    tempDirs.push(dir);
    return dir;
  }

  it('returns raw shared, local, user, and resolved sections', async () => {
    const repoRoot = await createRepoRoot();
    const userConfigDir = await createUserConfigDir();

    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        projects: { root: '.oat/projects/custom' },
        documentation: { tooling: 'fumadocs' },
      })}\n`,
      'utf8',
    );
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({
        version: 1,
        activeProject: '.oat/projects/custom/demo',
      })}\n`,
      'utf8',
    );
    await writeFile(
      join(userConfigDir, 'config.json'),
      `${JSON.stringify({
        version: 1,
        activeIdea: '.oat/ideas/user-idea',
      })}\n`,
      'utf8',
    );

    const result = await resolveEffectiveConfig(repoRoot, userConfigDir, {});

    expect(result.shared.projects?.root).toBe('.oat/projects/custom');
    expect(result.local.activeProject).toBe('.oat/projects/custom/demo');
    expect(result.user.activeIdea).toBe('.oat/ideas/user-idea');
    expect(result.resolved['projects.root']).toEqual({
      value: '.oat/projects/custom',
      source: 'shared',
    });
    expect(result.resolved['activeProject']).toEqual({
      value: '.oat/projects/custom/demo',
      source: 'local',
    });
    expect(result.resolved['activeIdea']).toEqual({
      value: '.oat/ideas/user-idea',
      source: 'user',
    });
  });

  it('applies local over shared precedence and user fallback for uncovered keys', async () => {
    const repoRoot = await createRepoRoot();
    const userConfigDir = await createUserConfigDir();

    const result = await resolveEffectiveConfig(
      repoRoot,
      userConfigDir,
      {},
      {
        readOatConfig: async () =>
          ({
            version: 1,
            projects: { root: '.oat/projects/shared-root' },
            documentation: { tooling: 'mkdocs' },
          }) satisfies OatConfig,
        readOatLocalConfig: async () =>
          ({
            version: 1,
            activeIdea: null,
            activeProject: '.oat/projects/shared-root/demo',
          }) satisfies OatLocalConfig,
        readUserConfig: async () =>
          ({
            version: 1,
            activeIdea: '.oat/ideas/user-idea',
          }) satisfies UserConfig,
      },
    );

    expect(result.resolved['projects.root']).toEqual({
      value: '.oat/projects/shared-root',
      source: 'shared',
    });
    expect(result.resolved['activeProject']).toEqual({
      value: '.oat/projects/shared-root/demo',
      source: 'local',
    });
    expect(result.resolved['activeIdea']).toEqual({
      value: '.oat/ideas/user-idea',
      source: 'user',
    });
    expect(result.resolved['documentation.tooling']).toEqual({
      value: 'mkdocs',
      source: 'shared',
    });
  });

  it('applies env overrides with source attribution', async () => {
    const result = await resolveEffectiveConfig(
      '/repo',
      '/tmp/user',
      {
        OAT_PROJECTS_ROOT: '/env/projects/',
        OAT_WORKTREES_ROOT: '/env/worktrees/',
      },
      {
        readOatConfig: async () =>
          ({
            version: 1,
            projects: { root: '.oat/projects/configured' },
            worktrees: { root: '.worktrees/configured' },
          }) satisfies OatConfig,
        readOatLocalConfig: async () =>
          ({ version: 1 }) satisfies OatLocalConfig,
        readUserConfig: async () => ({ version: 1 }) satisfies UserConfig,
      },
    );

    expect(result.resolved['projects.root']).toEqual({
      value: '/env/projects',
      source: 'env',
    });
    expect(result.resolved['worktrees.root']).toEqual({
      value: '/env/worktrees',
      source: 'env',
    });
  });

  it('uses framework defaults when config files are missing', async () => {
    const repoRoot = await createRepoRoot();
    const userConfigDir = await createUserConfigDir();

    const result = await resolveEffectiveConfig(repoRoot, userConfigDir, {});

    expect(result.resolved['projects.root']).toEqual({
      value: '.oat/projects/shared',
      source: 'default',
    });
    expect(result.resolved['worktrees.root']).toEqual({
      value: '.worktrees',
      source: 'default',
    });
    expect(result.resolved['autoReviewAtCheckpoints']).toEqual({
      value: false,
      source: 'default',
    });
  });

  it('walks generic nested keys without hardcoding them', async () => {
    const result = await resolveEffectiveConfig(
      '/repo',
      '/tmp/user',
      {},
      {
        readOatConfig: async () =>
          ({
            version: 1,
            workflow: {
              checkpoints: 'final-only',
            },
          }) as OatConfig,
        readOatLocalConfig: async () =>
          ({ version: 1 }) satisfies OatLocalConfig,
        readUserConfig: async () => ({ version: 1 }) satisfies UserConfig,
      },
    );

    expect(result.resolved['workflow.checkpoints']).toEqual({
      value: 'final-only',
      source: 'shared',
    });
  });

  it('flattens nested keys into dot notation', async () => {
    const result = await resolveEffectiveConfig(
      '/repo',
      '/tmp/user',
      {},
      {
        readOatConfig: async () =>
          ({
            version: 1,
            projects: { root: '.oat/projects/custom' },
            documentation: { tooling: 'fumadocs' },
            archive: { s3Uri: 's3://bucket/archive' },
          }) satisfies OatConfig,
        readOatLocalConfig: async () =>
          ({ version: 1 }) satisfies OatLocalConfig,
        readUserConfig: async () => ({ version: 1 }) satisfies UserConfig,
      },
    );

    expect(result.resolved['projects.root']).toEqual({
      value: '.oat/projects/custom',
      source: 'shared',
    });
    expect(result.resolved['documentation.tooling']).toEqual({
      value: 'fumadocs',
      source: 'shared',
    });
    expect(result.resolved['archive.s3Uri']).toEqual({
      value: 's3://bucket/archive',
      source: 'shared',
    });
  });
});
