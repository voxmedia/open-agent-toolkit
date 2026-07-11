import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  BUILTIN_EXEC_TARGETS,
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
      git: { defaultBranch: 'main' },
      projects: { root: '.oat/projects/custom' },
      worktrees: { root: '.worktrees' },
      archive: {
        s3Uri: 's3://example-bucket/oat-archive',
        s3SyncOnComplete: true,
        summaryExportPath: '.oat/repo/reference/project-summaries',
        wrapUpExportPath: '.oat/repo/reference/wrap-ups',
        awsProfile: 'work-sso',
        awsRegion: 'us-east-1',
      },
    });

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      git: { defaultBranch: 'main' },
      projects: { root: '.oat/projects/custom' },
      worktrees: { root: '.worktrees' },
      archive: {
        s3Uri: 's3://example-bucket/oat-archive',
        s3SyncOnComplete: true,
        summaryExportPath: '.oat/repo/reference/project-summaries',
        wrapUpExportPath: '.oat/repo/reference/wrap-ups',
        awsProfile: 'work-sso',
        awsRegion: 'us-east-1',
      },
    });
  });

  it('accepts trailing commas in shared, local, and user config files', async () => {
    const repoRoot = await createRepoRoot();
    const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
    tempDirs.push(userConfigDir);

    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      `{
  "version": 1,
  "worktrees": { "root": ".worktrees", },
  "localPaths": [".env",],
}
`,
      'utf8',
    );
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `{
  "version": 1,
  "activeIdea": "repo-idea",
  "workflow": { "designMode": "draft", },
}
`,
      'utf8',
    );
    await writeFile(
      join(userConfigDir, 'config.json'),
      `{
  "version": 1,
  "activeIdea": "user-idea",
}
`,
      'utf8',
    );

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      worktrees: { root: '.worktrees' },
      localPaths: ['.env'],
    });
    await expect(readOatLocalConfig(repoRoot)).resolves.toEqual({
      version: 1,
      activeIdea: 'repo-idea',
      workflow: { designMode: 'draft' },
    });
    await expect(readUserConfig(userConfigDir)).resolves.toEqual({
      version: 1,
      activeIdea: 'user-idea',
    });
  });

  it('normalizes archive.awsProfile and archive.awsRegion (trim, drop empty, ignore non-string)', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        archive: {
          s3Uri: 's3://example-bucket/oat-archive',
          awsProfile: '  work-sso  ',
          awsRegion: '  us-east-1  ',
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.archive).toEqual({
      s3Uri: 's3://example-bucket/oat-archive',
      awsProfile: 'work-sso',
      awsRegion: 'us-east-1',
    });
  });

  it('drops empty archive.awsProfile and archive.awsRegion during normalization', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        archive: {
          s3Uri: 's3://example-bucket/oat-archive',
          awsProfile: '   ',
          awsRegion: '',
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.archive).toEqual({
      s3Uri: 's3://example-bucket/oat-archive',
    });
  });

  it('ignores non-string archive.awsProfile and archive.awsRegion values', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        archive: {
          s3Uri: 's3://example-bucket/oat-archive',
          awsProfile: 42,
          awsRegion: true,
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.archive).toEqual({
      s3Uri: 's3://example-bucket/oat-archive',
    });
  });

  it('normalizes archive config values from config.json', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        archive: {
          s3Uri: 's3://example-bucket/oat-archive/',
          s3SyncOnComplete: true,
          summaryExportPath: ' .oat/repo/reference/project-summaries/ ',
          wrapUpExportPath: ' .oat/repo/reference/wrap-ups/ ',
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.archive).toEqual({
      s3Uri: 's3://example-bucket/oat-archive',
      s3SyncOnComplete: true,
      summaryExportPath: '.oat/repo/reference/project-summaries',
      wrapUpExportPath: '.oat/repo/reference/wrap-ups',
    });
  });

  it('drops empty wrapUpExportPath during normalization', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        archive: {
          s3Uri: 's3://example-bucket/oat-archive',
          wrapUpExportPath: '   ',
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.archive).toEqual({
      s3Uri: 's3://example-bucket/oat-archive',
    });
  });

  it('reads and writes tools config round-trip', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatConfig(repoRoot, {
      version: 1,
      tools: {
        'project-management': true,
        workflows: true,
      },
    });

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      tools: {
        'project-management': true,
        workflows: true,
      },
    });
  });

  it('preserves tools.brainstorm through readOatConfig round-trip', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatConfig(repoRoot, {
      version: 1,
      tools: {
        brainstorm: true,
      },
    });

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      tools: {
        brainstorm: true,
      },
    });
  });

  it('drops invalid tools config values during normalization', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        tools: {
          'project-management': 'yes',
          workflows: true,
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.tools).toEqual({
      workflows: true,
    });
  });

  it('omits empty tools objects during normalization', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatConfig(repoRoot, {
      version: 1,
      tools: {},
    });

    const config = await readOatConfig(repoRoot);
    expect(config.tools).toBeUndefined();

    const raw = await readFile(join(repoRoot, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({ version: 1 });
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

  it('resolves relative activeProject paths and rejects repo traversal', async () => {
    const repoRoot = await createRepoRoot();
    const externalProject = await mkdtemp(
      join(tmpdir(), 'oat-external-project-'),
    );
    tempDirs.push(externalProject);
    await writeFile(join(externalProject, 'state.md'), '---\n---\n', 'utf8');
    const externalRelativePath = relative(repoRoot, externalProject);

    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: externalRelativePath })}\n`,
      'utf8',
    );

    await expect(readOatLocalConfig(repoRoot)).resolves.toMatchObject({
      activeProject: null,
    });
    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: null,
      path: null,
      status: 'unset',
    });
    await expect(
      setActiveProject(repoRoot, externalRelativePath),
    ).rejects.toThrow(/inside repo root/i);

    await writeOatLocalConfig(repoRoot, {
      version: 1,
      activeProject: '.oat/projects/shared/../demo',
    });
    await expect(readOatLocalConfig(repoRoot)).resolves.toMatchObject({
      activeProject: '.oat/projects/demo',
    });
  });

  it('rejects an activeProject symlink whose real target escapes the repo', async () => {
    const repoRoot = await createRepoRoot();
    const externalProject = await mkdtemp(
      join(tmpdir(), 'oat-external-project-'),
    );
    tempDirs.push(externalProject);
    await writeFile(join(externalProject, 'state.md'), '---\n---\n', 'utf8');
    const projectsRoot = join(repoRoot, '.oat', 'projects', 'shared');
    const linkedProject = join(projectsRoot, 'external-link');
    await mkdir(projectsRoot, { recursive: true });
    await symlink(externalProject, linkedProject, 'dir');
    const projectPath = '.oat/projects/shared/external-link';
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: projectPath })}\n`,
      'utf8',
    );

    await expect(readOatLocalConfig(repoRoot)).resolves.toMatchObject({
      activeProject: null,
    });
    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: null,
      path: null,
      status: 'unset',
    });
    await expect(setActiveProject(repoRoot, projectPath)).rejects.toThrow(
      /inside repo root/i,
    );
  });

  it('keeps an activeProject symlink whose real target remains inside the repo', async () => {
    const repoRoot = await createRepoRoot();
    const projectsRoot = join(repoRoot, '.oat', 'projects', 'shared');
    const realProject = join(projectsRoot, 'real-project');
    const linkedProject = join(projectsRoot, 'linked-project');
    await mkdir(realProject, { recursive: true });
    await writeFile(join(realProject, 'state.md'), '---\n---\n', 'utf8');
    await symlink('real-project', linkedProject, 'dir');
    const projectPath = '.oat/projects/shared/linked-project';
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: projectPath })}\n`,
      'utf8',
    );

    await expect(readOatLocalConfig(repoRoot)).resolves.toMatchObject({
      activeProject: '.oat/projects/shared/real-project',
    });
    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: 'real-project',
      path: '.oat/projects/shared/real-project',
      status: 'active',
    });
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

  describe('workflow preferences', () => {
    it('reads valid workflow config from .oat/config.json', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            hillCheckpointDefault: 'final',
            archiveOnComplete: true,
            createPrOnComplete: true,
            postImplementSequence: 'pr',
            reviewExecutionModel: 'subagent',
            autoReviewAtHillCheckpoints: true,
            autoNarrowReReviewScope: false,
            autoArtifactReview: {
              plan: true,
              analysis: true,
            },
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({
        hillCheckpointDefault: 'final',
        archiveOnComplete: true,
        createPrOnComplete: true,
        postImplementSequence: 'pr',
        reviewExecutionModel: 'subagent',
        autoReviewAtHillCheckpoints: true,
        autoNarrowReReviewScope: false,
        autoArtifactReview: {
          plan: true,
          analysis: true,
        },
      });
    });

    it('accepts workflow.autoArtifactReview boolean overrides', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            autoArtifactReview: {
              plan: false,
              analysis: true,
            },
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({
        autoArtifactReview: {
          plan: false,
          analysis: true,
        },
      });
    });

    it('drops non-boolean workflow.autoArtifactReview values', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            autoArtifactReview: {
              plan: 'yes',
              analysis: 1,
            },
            archiveOnComplete: true,
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ archiveOnComplete: true });
    });

    it('strips invalid enum values from workflow config', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            hillCheckpointDefault: 'invalid-value',
            postImplementSequence: 'not-an-option',
            reviewExecutionModel: 42,
            archiveOnComplete: true,
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ archiveOnComplete: true });
    });

    it('drops empty workflow object', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({ version: 1, workflow: {} }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toBeUndefined();
    });

    it('reads workflow config from .oat/config.local.json', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.local.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            hillCheckpointDefault: 'every',
            archiveOnComplete: false,
            postImplementSequence: 'docs-pr',
            reviewExecutionModel: 'inline',
            autoReviewAtHillCheckpoints: false,
          },
        }),
        'utf8',
      );

      const localConfig = await readOatLocalConfig(repoRoot);
      expect(localConfig.workflow).toEqual({
        hillCheckpointDefault: 'every',
        archiveOnComplete: false,
        postImplementSequence: 'docs-pr',
        reviewExecutionModel: 'inline',
        autoReviewAtHillCheckpoints: false,
      });
    });

    it('reads workflow config from ~/.oat/config.json (user)', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-wf-'));
      tempDirs.push(userConfigDir);
      await writeFile(
        join(userConfigDir, 'config.json'),
        JSON.stringify({
          version: 1,
          workflow: {
            hillCheckpointDefault: 'final',
            createPrOnComplete: true,
            reviewExecutionModel: 'fresh-session',
            autoReviewAtHillCheckpoints: true,
          },
        }),
        'utf8',
      );

      const userConfig = await readUserConfig(userConfigDir);
      expect(userConfig.workflow).toEqual({
        hillCheckpointDefault: 'final',
        createPrOnComplete: true,
        reviewExecutionModel: 'fresh-session',
        autoReviewAtHillCheckpoints: true,
      });
    });

    it('returns undefined workflow when not set in any surface', async () => {
      const repoRoot = await createRepoRoot();
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-empty-'));
      tempDirs.push(userConfigDir);

      const sharedConfig = await readOatConfig(repoRoot);
      const localConfig = await readOatLocalConfig(repoRoot);
      const userConfig = await readUserConfig(userConfigDir);

      expect(sharedConfig.workflow).toBeUndefined();
      expect(localConfig.workflow).toBeUndefined();
      expect(userConfig.workflow).toBeUndefined();
    });

    it('round-trips workflow config in shared config', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatConfig(repoRoot, {
        version: 1,
        workflow: {
          hillCheckpointDefault: 'final',
          archiveOnComplete: true,
          createPrOnComplete: true,
          postImplementSequence: 'docs-pr',
          reviewExecutionModel: 'subagent',
          autoReviewAtHillCheckpoints: true,
          autoNarrowReReviewScope: true,
        },
      });

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({
        hillCheckpointDefault: 'final',
        archiveOnComplete: true,
        createPrOnComplete: true,
        postImplementSequence: 'docs-pr',
        reviewExecutionModel: 'subagent',
        autoReviewAtHillCheckpoints: true,
        autoNarrowReReviewScope: true,
      });
    });

    it('round-trips workflow config in user config', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-rt-'));
      tempDirs.push(userConfigDir);

      await writeUserConfig(userConfigDir, {
        version: 1,
        workflow: {
          hillCheckpointDefault: 'every',
          createPrOnComplete: true,
        },
      });

      const userConfig = await readUserConfig(userConfigDir);
      expect(userConfig.workflow).toEqual({
        hillCheckpointDefault: 'every',
        createPrOnComplete: true,
      });
    });

    it('normalizes workflow.gates.skills entries and preserves null tombstones', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            gates: {
              skills: {
                'oat-project-implement': {
                  command: 'pnpm test',
                  onFailure: 'block',
                  description: 'Run tests before done',
                  maxAttempts: 3,
                  execPolicy: { avoid: 'none' },
                },
                'oat-project-plan': {
                  command: 'pnpm lint',
                  onFailure: 'prompt',
                },
                'warn-only': {
                  command: 'pnpm type-check',
                  onFailure: 'warn',
                  maxAttempts: 0,
                },
                disabled: null,
                missingCommand: { onFailure: 'block' },
                emptyCommand: { command: '   ', onFailure: 'block' },
                badFailure: { command: 'pnpm build', onFailure: 'stop' },
              },
            },
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow?.gates?.skills).toEqual({
        'oat-project-implement': {
          command: 'pnpm test',
          onFailure: 'block',
          description: 'Run tests before done',
          maxAttempts: 3,
        },
        'oat-project-plan': {
          command: 'pnpm lint',
          onFailure: 'prompt',
          maxAttempts: 2,
        },
        'warn-only': {
          command: 'pnpm type-check',
          onFailure: 'warn',
          maxAttempts: 2,
        },
        disabled: null,
      });
      expect(
        config.workflow?.gates?.skills?.['oat-project-implement'],
      ).not.toHaveProperty('execPolicy');
    });

    it('normalizes workflow.gates.execTargets partial entries and preserves null tombstones', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            gates: {
              execTargets: {
                'codex-custom': {
                  runtime: 'codex',
                  baseCommand: ['codex', 'exec'],
                  invocation: {
                    model: '  gpt-5.6-sol  ',
                    reasoningEffort: '  max  ',
                  },
                  hostDetectionCommand: [
                    'sh',
                    '-c',
                    'test -n "$CODEX_THREAD_ID"',
                  ],
                  availabilityCommand: ['codex', '--version'],
                  priority: 80,
                },
                'codex-default': {
                  priority: 80,
                  invocation: {
                    model: 'provider-default',
                  },
                },
                'partial-command': {
                  baseCommand: ['codex', 'exec', '--model', 'gpt-5.5'],
                },
                'partial-runtime': {
                  runtime: 'custom',
                },
                'complete-without-priority': {
                  runtime: 'custom',
                  baseCommand: ['custom-agent'],
                },
                'invalid-optional-commands': {
                  runtime: 'custom',
                  baseCommand: ['custom-agent'],
                  hostDetectionCommand: ['sh', 1],
                  availabilityCommand: 'custom-agent --version',
                  priority: 10,
                  invocation: {
                    model: '   ',
                    reasoningEffort: 42,
                  },
                },
                disabled: null,
                invalidOnly: {
                  runtime: '   ',
                  baseCommand: [],
                  priority: 'high',
                },
              },
            },
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow?.gates?.execTargets).toEqual({
        'codex-custom': {
          runtime: 'codex',
          baseCommand: ['codex', 'exec'],
          invocation: {
            model: 'gpt-5.6-sol',
            reasoningEffort: 'max',
          },
          hostDetectionCommand: ['sh', '-c', 'test -n "$CODEX_THREAD_ID"'],
          availabilityCommand: ['codex', '--version'],
          priority: 80,
        },
        'codex-default': {
          priority: 80,
          invocation: {
            model: 'provider-default',
          },
        },
        'partial-command': {
          baseCommand: ['codex', 'exec', '--model', 'gpt-5.5'],
        },
        'partial-runtime': {
          runtime: 'custom',
        },
        'complete-without-priority': {
          runtime: 'custom',
          baseCommand: ['custom-agent'],
        },
        'invalid-optional-commands': {
          runtime: 'custom',
          baseCommand: ['custom-agent'],
          priority: 10,
        },
        disabled: null,
      });
    });

    it('exports built-in exec targets with pinned detector shapes', () => {
      expect(BUILTIN_EXEC_TARGETS).toEqual({
        'codex-default': {
          runtime: 'codex',
          baseCommand: ['codex', 'exec'],
          invocation: {
            model: 'provider-default',
            reasoningEffort: 'provider-default',
          },
          hostDetectionCommand: [
            'sh',
            '-c',
            '[ -n "$CODEX_THREAD_ID" ] || [ -n "$CODEX_SESSION_ID" ]',
          ],
          availabilityCommand: ['codex', '--version'],
          priority: 100,
        },
        'claude-default': {
          runtime: 'claude',
          baseCommand: ['claude', '-p'],
          invocation: {
            model: 'provider-default',
            reasoningEffort: 'provider-default',
          },
          hostDetectionCommand: ['sh', '-c', 'test -n "$CLAUDECODE"'],
          availabilityCommand: ['claude', '--version'],
          priority: 100,
        },
        'cursor-default': {
          runtime: 'cursor',
          baseCommand: ['cursor-agent', '-p'],
          invocation: {
            model: 'provider-default',
            reasoningEffort: 'provider-default',
          },
          hostDetectionCommand: ['sh', '-c', 'test -n "$CURSOR_AGENT"'],
          availabilityCommand: [
            'sh',
            '-c',
            'command -v cursor-agent || command -v agent',
          ],
          priority: 70,
        },
      });
      expect(BUILTIN_EXEC_TARGETS['cursor-default'].baseCommand).not.toContain(
        '--force',
      );
      expect(BUILTIN_EXEC_TARGETS['cursor-default'].baseCommand).not.toContain(
        '--model',
      );
    });

    it('accepts workflow.designMode "collaborative"', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: { designMode: 'collaborative' },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ designMode: 'collaborative' });
    });

    it('accepts workflow.designMode "draft"', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: { designMode: 'draft' },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ designMode: 'draft' });
    });

    it('accepts workflow.designMode "selective"', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: { designMode: 'selective' },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ designMode: 'selective' });
    });

    it('drops invalid workflow.designMode values silently', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: { designMode: 'xyz', archiveOnComplete: true },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ archiveOnComplete: true });
    });

    it('leaves workflow.designMode undefined when missing', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: { hillCheckpointDefault: 'final' },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow?.designMode).toBeUndefined();
    });

    it('round-trips workflow.designMode in shared config', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatConfig(repoRoot, {
        version: 1,
        workflow: { designMode: 'draft' },
      });

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ designMode: 'draft' });
    });

    it('round-trips workflow.designMode in local config', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatLocalConfig(repoRoot, {
        version: 1,
        workflow: { designMode: 'collaborative' },
      });

      const config = await readOatLocalConfig(repoRoot);
      expect(config.workflow).toEqual({ designMode: 'collaborative' });
    });

    it('round-trips workflow.designMode in user config', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-dm-'));
      tempDirs.push(userConfigDir);

      await writeUserConfig(userConfigDir, {
        version: 1,
        workflow: { designMode: 'draft' },
      });

      const userConfig = await readUserConfig(userConfigDir);
      expect(userConfig.workflow).toEqual({ designMode: 'draft' });
    });

    describe('normalizeWorkflowConfig dispatchCeiling (new shape)', () => {
      it('accepts preset + providers and preserves both', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                preset: 'balanced',
                providers: { codex: 'high', claude: 'sonnet' },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow).toEqual({
          dispatchCeiling: {
            preset: 'balanced',
            providers: { codex: 'high', claude: 'sonnet' },
          },
        });
      });

      it('accepts providers-only (advanced/manual) with no preset', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: { codex: 'medium' },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.preset).toBeUndefined();
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          codex: 'medium',
        });
      });

      it('preserves dispatch matrix recommendation version stamps', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                recommendationVersion: '2026-07-07.1',
                providers: { cursor: { high: 'composer-2.5' } },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling).toEqual({
          recommendationVersion: '2026-07-07.1',
          providers: {
            cursor: { high: { candidates: ['composer-2.5'] } },
          },
        });

        await writeOatConfig(repoRoot, config);
        const raw = await readFile(configPath, 'utf8');
        expect(JSON.parse(raw).workflow.dispatchCeiling).toMatchObject({
          recommendationVersion: '2026-07-07.1',
        });
      });

      it('accepts cursor dispatch matrix cells under providers', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  cursor: {
                    economy: 'composer-2.5',
                    balanced: [
                      'composer-2.5-fast',
                      {
                        harness: 'cursor',
                        model: 'gpt-5.3-codex-high',
                        effort: 'high',
                        ignored: true,
                      },
                    ],
                    high: [
                      { harness: 'cursor', model: 'glm-5.2-max' },
                      'claude-opus-4-8',
                    ],
                    frontier: 'fable-5',
                    experimental: 'not-a-tier',
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          cursor: {
            economy: { candidates: ['composer-2.5'] },
            balanced: {
              candidates: [
                {
                  route: [
                    'composer-2.5-fast',
                    {
                      harness: 'cursor',
                      model: 'gpt-5.3-codex-high',
                      effort: 'high',
                    },
                  ],
                },
              ],
            },
            high: {
              candidates: [
                {
                  route: [
                    { harness: 'cursor', model: 'glm-5.2-max' },
                    'claude-opus-4-8',
                  ],
                },
              ],
            },
            frontier: { candidates: ['fable-5'] },
          },
        });
      });

      it('accepts bare cursor model slugs as single pinned provider values', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: { cursor: 'composer-2.5' },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          cursor: 'composer-2.5',
        });
      });

      it('accepts per-tier maps for codex and claude while keeping bare enum values valid', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  codex: {
                    economy: 'low',
                    balanced: 'medium',
                    high: 'high',
                    frontier: 'max',
                    stray: 'ignored',
                  },
                  claude: {
                    economy: 'haiku',
                    balanced: 'sonnet',
                    high: 'opus',
                    frontier: 'fable',
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          codex: {
            economy: { candidates: ['low'] },
            balanced: { candidates: ['medium'] },
            high: { candidates: ['high'] },
            frontier: { candidates: ['max'] },
          },
          claude: {
            economy: { candidates: ['haiku'] },
            balanced: { candidates: ['sonnet'] },
            high: { candidates: ['opus'] },
            frontier: { candidates: ['fable'] },
          },
        });
      });

      it('accepts codex materialized route targets with model and effort', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  codex: {
                    high: [
                      {
                        harness: 'codex',
                        model: 'gpt-5.6-terra',
                        effort: 'xhigh',
                      },
                    ],
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          codex: {
            high: {
              candidates: [
                {
                  route: [
                    {
                      harness: 'codex',
                      model: 'gpt-5.6-terra',
                      effort: 'xhigh',
                    },
                  ],
                },
              ],
            },
          },
        });
      });

      it('normalizes ordered provider candidates without conflating fallback routes', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  codex: {
                    high: {
                      candidates: [
                        {
                          harness: 'codex',
                          model: 'gpt-5.6-luna',
                          effort: 'medium',
                          ignored: true,
                        },
                        {
                          route: [
                            {
                              harness: 'codex',
                              model: 'gpt-5.6-terra',
                              effort: 'high',
                            },
                            {
                              harness: 'claude',
                              model: 'opus',
                            },
                          ],
                          ignored: true,
                        },
                        {
                          harness: 'codex',
                          model: 'gpt-5.6-sol',
                          effort: 'high',
                        },
                      ],
                    },
                  },
                  claude: {
                    high: { candidates: ['haiku', 'sonnet', 'opus'] },
                  },
                  cursor: {
                    high: {
                      candidates: [
                        'opaque:model/a',
                        'opaque model value with no capability name',
                      ],
                    },
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          codex: {
            high: {
              candidates: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-luna',
                  effort: 'medium',
                },
                {
                  route: [
                    {
                      harness: 'codex',
                      model: 'gpt-5.6-terra',
                      effort: 'high',
                    },
                    { harness: 'claude', model: 'opus' },
                  ],
                },
                {
                  harness: 'codex',
                  model: 'gpt-5.6-sol',
                  effort: 'high',
                },
              ],
            },
          },
          claude: {
            high: { candidates: ['haiku', 'sonnet', 'opus'] },
          },
          cursor: {
            high: {
              candidates: [
                'opaque:model/a',
                'opaque model value with no capability name',
              ],
            },
          },
        });
      });

      it('normalizes legacy single values and routes as one-candidate ladders', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  claude: { high: 'opus' },
                  cursor: {
                    high: [
                      'opaque-primary',
                      { harness: 'claude', model: 'opaque-fallback' },
                    ],
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          claude: { high: { candidates: ['opus'] } },
          cursor: {
            high: {
              candidates: [
                {
                  route: [
                    'opaque-primary',
                    { harness: 'claude', model: 'opaque-fallback' },
                  ],
                },
              ],
            },
          },
        });
      });

      it('drops invalid dispatch matrix provider shapes silently', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  cursor: {
                    economy: [],
                    balanced: [{ unknown: true }],
                  },
                  codex: 'ultra',
                  claude: {
                    high: 'super-opus',
                  },
                },
              },
              dispatchPolicy: {
                mode: 'managed',
                policy: 'high',
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow).toEqual({
          dispatchPolicy: {
            mode: 'managed',
            policy: 'high',
          },
        });
      });

      it('keeps valid layered candidates while silently dropping malformed siblings', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  cursor: {
                    high: {
                      candidates: [
                        '  opaque-primary  ',
                        null,
                        {},
                        {
                          route: [
                            'opaque-fallback',
                            false,
                            { harness: 'claude', model: 'opus' },
                          ],
                        },
                      ],
                    },
                    unsupported: 'ignored-tier',
                  },
                  codex: {
                    economy: { candidates: ['low', 'invalid-effort'] },
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          cursor: {
            high: {
              candidates: [
                'opaque-primary',
                {
                  route: [
                    'opaque-fallback',
                    { harness: 'claude', model: 'opus' },
                  ],
                },
              ],
            },
          },
          codex: {
            economy: { candidates: ['low'] },
          },
        });
      });

      it('drops invalid preset values silently', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                preset: 'turbo',
                providers: { codex: 'high' },
              },
              archiveOnComplete: true,
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.preset).toBeUndefined();
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          codex: 'high',
        });
      });

      it('drops invalid provider enum values silently', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: { codex: 'ultra', claude: 'high' },
              },
              archiveOnComplete: true,
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling).toBeUndefined();
        expect(config.workflow).toEqual({ archiveOnComplete: true });
      });

      it('round-trips preset + providers in shared config', async () => {
        const repoRoot = await createRepoRoot();

        await writeOatConfig(repoRoot, {
          version: 1,
          workflow: {
            dispatchCeiling: {
              preset: 'maximum',
              providers: { codex: 'xhigh', claude: 'opus' },
            },
          },
        });

        const config = await readOatConfig(repoRoot);
        expect(config.workflow).toEqual({
          dispatchCeiling: {
            preset: 'maximum',
            providers: { codex: 'xhigh', claude: 'opus' },
          },
        });
      });

      it('round-trips providers-only in local config', async () => {
        const repoRoot = await createRepoRoot();

        await writeOatLocalConfig(repoRoot, {
          version: 1,
          workflow: {
            dispatchCeiling: {
              providers: { codex: 'medium' },
            },
          },
        });

        const config = await readOatLocalConfig(repoRoot);
        expect(config.workflow).toEqual({
          dispatchCeiling: {
            providers: { codex: 'medium' },
          },
        });
      });

      it('round-trips dispatchCeiling in user config', async () => {
        const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-ceil-'));
        tempDirs.push(userConfigDir);

        await writeUserConfig(userConfigDir, {
          version: 1,
          workflow: {
            dispatchCeiling: {
              preset: 'cost-conscious',
              providers: { claude: 'sonnet' },
            },
          },
        });

        const userConfig = await readUserConfig(userConfigDir);
        expect(userConfig.workflow).toEqual({
          dispatchCeiling: {
            preset: 'cost-conscious',
            providers: { claude: 'sonnet' },
          },
        });
      });
    });

    describe('normalizeWorkflowConfig dispatchPolicy', () => {
      it('reads managed dispatch policy config from .oat/config.json', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchPolicy: {
                mode: 'managed',
                policy: 'frontier',
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchPolicy).toEqual({
          mode: 'managed',
          policy: 'frontier',
        });
      });

      it('reads inherit dispatch policy config without a managed policy', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchPolicy: {
                mode: 'inherit',
                policy: 'uncapped',
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchPolicy).toEqual({
          mode: 'inherit',
        });
      });

      it('accepts explicit uncapped as a managed dispatch policy', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchPolicy: {
                mode: 'managed',
                policy: 'uncapped',
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchPolicy).toEqual({
          mode: 'managed',
          policy: 'uncapped',
        });
      });

      it('drops invalid dispatch policy values while preserving legacy dispatch ceiling values', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchPolicy: {
                mode: 'auto',
                policy: 'maximum',
              },
              dispatchCeiling: {
                preset: 'balanced',
                providers: { codex: 'high' },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow).toEqual({
          dispatchCeiling: {
            preset: 'balanced',
            providers: { codex: 'high' },
          },
        });
      });
    });
  });
});
