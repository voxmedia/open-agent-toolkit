import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  BUILTIN_EXEC_TARGETS,
  readUserConfig,
  type ExecTarget,
  type GateConfig,
  type OatConfig,
  type OatLocalConfig,
  type UserConfig,
} from '@config/oat-config';
import { afterEach, describe, expect, it } from 'vitest';

import {
  resolveEffectiveConfig,
  resolveExecTargets,
  resolveGate,
  type ResolvedConfig,
} from './resolve';

function createResolvedConfig(
  config: Partial<ResolvedConfig> = {},
): ResolvedConfig {
  return {
    shared: { version: 1 },
    local: { version: 1 },
    user: { version: 1 },
    resolved: {},
    ...config,
  };
}

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

  it('preserves partial built-in exec target overrides loaded from config files', async () => {
    const repoRoot = await createRepoRoot();
    const userConfigDir = await createUserConfigDir();

    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'codex-default': { priority: 80 },
            },
          },
        },
      })}\n`,
      'utf8',
    );

    const effective = await resolveEffectiveConfig(repoRoot, userConfigDir, {});

    expect(
      effective.shared.workflow?.gates?.execTargets?.['codex-default'],
    ).toEqual({ priority: 80 });
    expect(resolveExecTargets(effective)['codex-default']).toEqual({
      ...BUILTIN_EXEC_TARGETS['codex-default'],
      priority: 80,
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

  it('normalizes user-level known strays from config.json', async () => {
    const userConfigDir = await createUserConfigDir();
    await writeFile(
      join(userConfigDir, 'config.json'),
      `${JSON.stringify({
        version: 1,
        knownStrays: [
          ' .cursor\\skills\\cloud-environment-setup ',
          './.cursor/skills/cloud-environment-setup',
          '',
          42,
          '.cursor/skills/local-only/',
        ],
      })}\n`,
      'utf8',
    );

    const config = await readUserConfig(userConfigDir);

    expect(config.knownStrays).toEqual([
      '.cursor/skills/cloud-environment-setup',
      '.cursor/skills/local-only',
    ]);
  });

  it('resolves user-level known strays with source attribution', async () => {
    const result = await resolveEffectiveConfig(
      '/repo',
      '/tmp/user',
      {},
      {
        readOatConfig: async () => ({ version: 1 }) satisfies OatConfig,
        readOatLocalConfig: async () =>
          ({ version: 1 }) satisfies OatLocalConfig,
        readUserConfig: async () =>
          ({
            version: 1,
            knownStrays: ['.cursor/skills/cloud-environment-setup'],
          }) satisfies UserConfig,
      },
    );

    expect(result.resolved['knownStrays']).toEqual({
      value: ['.cursor/skills/cloud-environment-setup'],
      source: 'user',
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

  describe('workflow preferences', () => {
    it('exposes workflow keys with source default when nothing set', async () => {
      const repoRoot = await createRepoRoot();
      const userConfigDir = await createUserConfigDir();

      const result = await resolveEffectiveConfig(repoRoot, userConfigDir, {});

      expect(result.resolved['workflow.hillCheckpointDefault']).toEqual({
        value: null,
        source: 'default',
      });
      expect(result.resolved['workflow.archiveOnComplete']).toEqual({
        value: null,
        source: 'default',
      });
      expect(result.resolved['workflow.createPrOnComplete']).toEqual({
        value: null,
        source: 'default',
      });
      expect(result.resolved['workflow.postImplementSequence']).toEqual({
        value: null,
        source: 'default',
      });
      expect(result.resolved['workflow.reviewExecutionModel']).toEqual({
        value: null,
        source: 'default',
      });
      expect(result.resolved['workflow.autoReviewAtHillCheckpoints']).toEqual({
        value: null,
        source: 'default',
      });
      expect(result.resolved['workflow.autoNarrowReReviewScope']).toEqual({
        value: null,
        source: 'default',
      });
      expect(result.resolved['workflow.autoArtifactReview.plan']).toEqual({
        value: true,
        source: 'default',
      });
      expect(result.resolved['workflow.autoArtifactReview.analysis']).toEqual({
        value: true,
        source: 'default',
      });
      expect(result.resolved['workflow.designMode']).toEqual({
        value: null,
        source: 'default',
      });
      expect(result.resolved['workflow.dispatchCeiling.preset']).toEqual({
        value: null,
        source: 'default',
      });
      expect(
        result.resolved['workflow.dispatchCeiling.providers.codex'],
      ).toEqual({
        value: null,
        source: 'default',
      });
      expect(
        result.resolved['workflow.dispatchCeiling.providers.claude'],
      ).toEqual({
        value: null,
        source: 'default',
      });
    });

    it('resolves workflow key from user when set only at user level', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () => ({ version: 1 }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({ version: 1 }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: {
                hillCheckpointDefault: 'final',
                archiveOnComplete: true,
                autoReviewAtHillCheckpoints: true,
                autoArtifactReview: { plan: false },
              },
            }) satisfies UserConfig,
        },
      );

      expect(result.resolved['workflow.hillCheckpointDefault']).toEqual({
        value: 'final',
        source: 'user',
      });
      expect(result.resolved['workflow.archiveOnComplete']).toEqual({
        value: true,
        source: 'user',
      });
      expect(result.resolved['workflow.autoReviewAtHillCheckpoints']).toEqual({
        value: true,
        source: 'user',
      });
      expect(result.resolved['workflow.autoArtifactReview.plan']).toEqual({
        value: false,
        source: 'user',
      });
      expect(result.resolved['workflow.autoArtifactReview.analysis']).toEqual({
        value: true,
        source: 'default',
      });
    });

    it('shared overrides user for workflow keys', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              workflow: { hillCheckpointDefault: 'every' },
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({ version: 1 }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: { hillCheckpointDefault: 'final' },
            }) satisfies UserConfig,
        },
      );

      expect(result.resolved['workflow.hillCheckpointDefault']).toEqual({
        value: 'every',
        source: 'shared',
      });
    });

    it('local overrides shared and user for workflow keys', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              workflow: {
                hillCheckpointDefault: 'every',
                archiveOnComplete: false,
              },
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({
              version: 1,
              workflow: { hillCheckpointDefault: 'final' },
            }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: { hillCheckpointDefault: 'every' },
            }) satisfies UserConfig,
        },
      );

      expect(result.resolved['workflow.hillCheckpointDefault']).toEqual({
        value: 'final',
        source: 'local',
      });
      // archiveOnComplete only set in shared → still resolves from shared
      expect(result.resolved['workflow.archiveOnComplete']).toEqual({
        value: false,
        source: 'shared',
      });
    });

    it('uses legacy shared autoReviewAtCheckpoints as fallback for workflow.autoReviewAtHillCheckpoints', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              autoReviewAtCheckpoints: true,
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({ version: 1 }) satisfies OatLocalConfig,
          readUserConfig: async () => ({ version: 1 }) satisfies UserConfig,
        },
      );

      expect(result.resolved['workflow.autoReviewAtHillCheckpoints']).toEqual({
        value: true,
        source: 'shared',
      });
    });

    it('workflow.autoReviewAtHillCheckpoints overrides legacy autoReviewAtCheckpoints', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              autoReviewAtCheckpoints: true,
              workflow: { autoReviewAtHillCheckpoints: false },
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({ version: 1 }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: { autoReviewAtHillCheckpoints: true },
            }) satisfies UserConfig,
        },
      );

      expect(result.resolved['workflow.autoReviewAtHillCheckpoints']).toEqual({
        value: false,
        source: 'shared',
      });
    });

    it('resolves workflow.designMode with local > shared > user precedence', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              workflow: { designMode: 'collaborative' },
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({
              version: 1,
              workflow: { designMode: 'draft' },
            }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: { designMode: 'collaborative' },
            }) satisfies UserConfig,
        },
      );

      expect(result.resolved['workflow.designMode']).toEqual({
        value: 'draft',
        source: 'local',
      });
    });

    it('resolves workflow.designMode from shared when local unset', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              workflow: { designMode: 'draft' },
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({ version: 1 }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: { designMode: 'collaborative' },
            }) satisfies UserConfig,
        },
      );

      expect(result.resolved['workflow.designMode']).toEqual({
        value: 'draft',
        source: 'shared',
      });
    });

    it('resolves workflow.designMode from user when no other surface set', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () => ({ version: 1 }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({ version: 1 }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: { designMode: 'collaborative' },
            }) satisfies UserConfig,
        },
      );

      expect(result.resolved['workflow.designMode']).toEqual({
        value: 'collaborative',
        source: 'user',
      });
    });

    it('resolves workflow.designMode when set to selective', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              workflow: { designMode: 'selective' },
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({ version: 1 }) satisfies OatLocalConfig,
          readUserConfig: async () => ({ version: 1 }) satisfies UserConfig,
        },
      );

      expect(result.resolved['workflow.designMode']).toEqual({
        value: 'selective',
        source: 'shared',
      });
    });

    it('resolves workflow.dispatchCeiling.providers.codex with local > shared > user precedence', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { providers: { codex: 'high' } },
              },
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { providers: { codex: 'medium' } },
              },
            }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { providers: { codex: 'xhigh' } },
              },
            }) satisfies UserConfig,
        },
      );

      expect(
        result.resolved['workflow.dispatchCeiling.providers.codex'],
      ).toEqual({
        value: 'medium',
        source: 'local',
      });
    });

    it('resolves workflow.dispatchCeiling.providers.claude with local > shared > user precedence', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { providers: { claude: 'opus' } },
              },
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { providers: { claude: 'sonnet' } },
              },
            }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { providers: { claude: 'haiku' } },
              },
            }) satisfies UserConfig,
        },
      );

      expect(
        result.resolved['workflow.dispatchCeiling.providers.claude'],
      ).toEqual({
        value: 'sonnet',
        source: 'local',
      });
    });

    it('resolves workflow.dispatchCeiling.providers.codex from shared when local unset', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { providers: { codex: 'high' } },
              },
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({ version: 1 }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { providers: { codex: 'low' } },
              },
            }) satisfies UserConfig,
        },
      );

      expect(
        result.resolved['workflow.dispatchCeiling.providers.codex'],
      ).toEqual({
        value: 'high',
        source: 'shared',
      });
    });

    it('resolves workflow.dispatchCeiling.providers.claude from user when no other surface set', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () => ({ version: 1 }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({ version: 1 }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { providers: { claude: 'sonnet' } },
              },
            }) satisfies UserConfig,
        },
      );

      expect(
        result.resolved['workflow.dispatchCeiling.providers.claude'],
      ).toEqual({
        value: 'sonnet',
        source: 'user',
      });
    });

    it('resolves workflow.dispatchCeiling.preset with local > shared > user precedence', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { preset: 'maximum' },
              },
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { preset: 'balanced' },
              },
            }) satisfies OatLocalConfig,
          readUserConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: { preset: 'cost-conscious' },
              },
            }) satisfies UserConfig,
        },
      );

      expect(result.resolved['workflow.dispatchCeiling.preset']).toEqual({
        value: 'balanced',
        source: 'local',
      });
    });

    it('flattens dispatchCeiling.providers.* and resolves local > shared > user', async () => {
      const result = await resolveEffectiveConfig(
        '/repo',
        '/tmp/user',
        {},
        {
          readOatConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: {
                  preset: 'balanced',
                  providers: { codex: 'high', claude: 'sonnet' },
                },
              },
            }) satisfies OatConfig,
          readOatLocalConfig: async () =>
            ({
              version: 1,
              workflow: {
                dispatchCeiling: {
                  providers: { codex: 'medium' },
                },
              },
            }) satisfies OatLocalConfig,
          readUserConfig: async () => ({ version: 1 }) satisfies UserConfig,
        },
      );

      // local providers.codex wins over shared
      expect(
        result.resolved['workflow.dispatchCeiling.providers.codex'],
      ).toEqual({ value: 'medium', source: 'local' });
      // shared providers.claude wins when local unset
      expect(
        result.resolved['workflow.dispatchCeiling.providers.claude'],
      ).toEqual({ value: 'sonnet', source: 'shared' });
      // shared preset available
      expect(result.resolved['workflow.dispatchCeiling.preset']).toEqual({
        value: 'balanced',
        source: 'shared',
      });
    });
  });

  it('surfaces archive.wrapUpExportPath with source default when unset', async () => {
    const result = await resolveEffectiveConfig(
      '/repo',
      '/tmp/user',
      {},
      {
        readOatConfig: async () => ({ version: 1 }) satisfies OatConfig,
        readOatLocalConfig: async () =>
          ({ version: 1 }) satisfies OatLocalConfig,
        readUserConfig: async () => ({ version: 1 }) satisfies UserConfig,
      },
    );

    expect(result.resolved['archive.wrapUpExportPath']).toEqual({
      value: null,
      source: 'default',
    });
  });

  it('surfaces archive.wrapUpExportPath from shared config when set', async () => {
    const result = await resolveEffectiveConfig(
      '/repo',
      '/tmp/user',
      {},
      {
        readOatConfig: async () =>
          ({
            version: 1,
            archive: { wrapUpExportPath: '.oat/repo/reference/wrap-ups' },
          }) satisfies OatConfig,
        readOatLocalConfig: async () =>
          ({ version: 1 }) satisfies OatLocalConfig,
        readUserConfig: async () => ({ version: 1 }) satisfies UserConfig,
      },
    );

    expect(result.resolved['archive.wrapUpExportPath']).toEqual({
      value: '.oat/repo/reference/wrap-ups',
      source: 'shared',
    });
  });

  it('surfaces archive.awsProfile and archive.awsRegion with source default when unset', async () => {
    const result = await resolveEffectiveConfig(
      '/repo',
      '/tmp/user',
      {},
      {
        readOatConfig: async () => ({ version: 1 }) satisfies OatConfig,
        readOatLocalConfig: async () =>
          ({ version: 1 }) satisfies OatLocalConfig,
        readUserConfig: async () => ({ version: 1 }) satisfies UserConfig,
      },
    );

    expect(result.resolved['archive.awsProfile']).toEqual({
      value: null,
      source: 'default',
    });
    expect(result.resolved['archive.awsRegion']).toEqual({
      value: null,
      source: 'default',
    });
  });

  it('surfaces archive.awsProfile and archive.awsRegion from shared config when set', async () => {
    const result = await resolveEffectiveConfig(
      '/repo',
      '/tmp/user',
      {},
      {
        readOatConfig: async () =>
          ({
            version: 1,
            archive: {
              awsProfile: 'work-sso',
              awsRegion: 'us-east-1',
            },
          }) satisfies OatConfig,
        readOatLocalConfig: async () =>
          ({ version: 1 }) satisfies OatLocalConfig,
        readUserConfig: async () => ({ version: 1 }) satisfies UserConfig,
      },
    );

    expect(result.resolved['archive.awsProfile']).toEqual({
      value: 'work-sso',
      source: 'shared',
    });
    expect(result.resolved['archive.awsRegion']).toEqual({
      value: 'us-east-1',
      source: 'shared',
    });
  });
});

describe('resolveGate', () => {
  const userGate: GateConfig = {
    command: 'pnpm test',
    onFailure: 'block',
    description: 'User-level gate',
    maxAttempts: 4,
  };
  const sharedGate: GateConfig = {
    command: 'pnpm lint',
    onFailure: 'prompt',
  };
  const localGate: GateConfig = {
    command: 'pnpm type-check',
    onFailure: 'warn',
  };

  it('uses local over shared over user with a wholesale gate winner', () => {
    const effective = createResolvedConfig({
      shared: {
        version: 1,
        workflow: { gates: { skills: { 'oat-project-plan': sharedGate } } },
      },
      local: {
        version: 1,
        workflow: { gates: { skills: { 'oat-project-plan': localGate } } },
      },
      user: {
        version: 1,
        workflow: { gates: { skills: { 'oat-project-plan': userGate } } },
      },
    });

    expect(resolveGate(effective, 'oat-project-plan')).toEqual(localGate);
  });

  it('treats a null higher-layer gate as disabled and does not fall through', () => {
    const effective = createResolvedConfig({
      shared: {
        version: 1,
        workflow: { gates: { skills: { 'oat-project-plan': sharedGate } } },
      },
      local: {
        version: 1,
        workflow: { gates: { skills: { 'oat-project-plan': null } } },
      },
      user: {
        version: 1,
        workflow: { gates: { skills: { 'oat-project-plan': userGate } } },
      },
    });

    expect(resolveGate(effective, 'oat-project-plan')).toBeNull();
  });

  it('falls through to lower layers when higher layers do not mention the skill', () => {
    const effective = createResolvedConfig({
      shared: {
        version: 1,
        workflow: { gates: { skills: { 'oat-project-plan': sharedGate } } },
      },
      local: {
        version: 1,
        workflow: { gates: { skills: { 'oat-project-implement': localGate } } },
      },
      user: {
        version: 1,
        workflow: { gates: { skills: { 'oat-project-plan': userGate } } },
      },
    });

    expect(resolveGate(effective, 'oat-project-plan')).toEqual(sharedGate);
  });

  it('reads raw layers without merging sibling fields from flattened resolution', () => {
    const effective = createResolvedConfig({
      shared: {
        version: 1,
        workflow: { gates: { skills: { 'oat-project-plan': sharedGate } } },
      },
      user: {
        version: 1,
        workflow: { gates: { skills: { 'oat-project-plan': userGate } } },
      },
      resolved: {
        'workflow.gates.skills.oat-project-plan.command': {
          value: sharedGate.command,
          source: 'shared',
        },
        'workflow.gates.skills.oat-project-plan.onFailure': {
          value: sharedGate.onFailure,
          source: 'shared',
        },
        'workflow.gates.skills.oat-project-plan.description': {
          value: userGate.description,
          source: 'user',
        },
        'workflow.gates.skills.oat-project-plan.maxAttempts': {
          value: userGate.maxAttempts,
          source: 'user',
        },
      },
    });

    expect(resolveGate(effective, 'oat-project-plan')).toEqual(sharedGate);
  });

  it('returns null when no raw layer defines the skill gate', () => {
    expect(
      resolveGate(createResolvedConfig(), 'oat-project-implement'),
    ).toBeNull();
  });
});

describe('resolveExecTargets', () => {
  it('includes built-in exec targets by default', () => {
    expect(resolveExecTargets(createResolvedConfig())).toEqual(
      BUILTIN_EXEC_TARGETS,
    );
  });

  it('applies keyed partial target merges from user to shared to local', () => {
    const customTarget: ExecTarget = {
      runtime: 'custom',
      baseCommand: ['custom-agent', '-p'],
      hostDetectionCommand: ['sh', '-c', 'test -n "$CUSTOM_AGENT"'],
      availabilityCommand: ['custom-agent', '--version'],
      priority: 10,
    };
    const effective = createResolvedConfig({
      shared: {
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'codex-default': {
                availabilityCommand: ['codex', 'doctor'],
                priority: 120,
              },
              'custom-target': {
                priority: 50,
              },
            },
          },
        },
      },
      local: {
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'codex-default': {
                baseCommand: ['codex', 'exec', '--model', 'gpt-5.5'],
              },
            },
          },
        },
      },
      user: {
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'codex-default': { priority: 80 },
              'custom-target': customTarget,
            },
          },
        },
      },
    });

    expect(resolveExecTargets(effective)['codex-default']).toEqual({
      ...BUILTIN_EXEC_TARGETS['codex-default'],
      baseCommand: ['codex', 'exec', '--model', 'gpt-5.5'],
      availabilityCommand: ['codex', 'doctor'],
      priority: 120,
    });
    expect(resolveExecTargets(effective)['custom-target']).toEqual({
      ...customTarget,
      priority: 50,
    });
  });

  it('lets higher-layer null entries delete built-ins and lower-layer custom targets', () => {
    const effective = createResolvedConfig({
      local: {
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'claude-default': null,
              'custom-target': null,
            },
          },
        },
      },
      user: {
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'custom-target': {
                runtime: 'custom',
                baseCommand: ['custom-agent'],
                priority: 5,
              },
            },
          },
        },
      },
    });

    const targets = resolveExecTargets(effective);
    expect(targets['claude-default']).toBeUndefined();
    expect(targets['custom-target']).toBeUndefined();
  });

  it('adds new complete targets from any layer', () => {
    const effective = createResolvedConfig({
      shared: {
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'team-reviewer': {
                runtime: 'team',
                baseCommand: ['team-agent', 'review'],
                priority: 90,
              },
              'default-priority-reviewer': {
                runtime: 'team',
                baseCommand: ['team-agent'],
              },
            },
          },
        },
      },
    });

    expect(resolveExecTargets(effective)['team-reviewer']).toEqual({
      runtime: 'team',
      baseCommand: ['team-agent', 'review'],
      priority: 90,
    });
    expect(resolveExecTargets(effective)['default-priority-reviewer']).toEqual({
      runtime: 'team',
      baseCommand: ['team-agent'],
      priority: 0,
    });
  });
});
