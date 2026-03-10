import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { copyDirWithStatus } from '@commands/init/tools/shared/copy-helpers';
import { applyGitignore } from '@commands/local/apply';
import { addLocalPaths } from '@commands/local/manage';
import {
  type MultiSelectChoice,
  type PromptContext,
  type SelectChoice,
  selectManyWithAbort,
  selectWithAbort,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  type OatConfig,
  readOatConfig,
  resolveLocalPaths,
} from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import { createInitToolsIdeasCommand } from './ideas';
import {
  installIdeas as defaultInstallIdeas,
  type InstallIdeasOptions,
  type InstallIdeasResult,
} from './ideas/install-ideas';
import { createInitToolsUtilityCommand } from './utility';
import {
  installUtility as defaultInstallUtility,
  type InstallUtilityOptions,
  type InstallUtilityResult,
  UTILITY_SKILLS,
} from './utility/install-utility';
import { createInitToolsWorkflowsCommand } from './workflows';
import {
  installWorkflows as defaultInstallWorkflows,
  type InstallWorkflowsOptions,
  type InstallWorkflowsResult,
} from './workflows/install-workflows';

type InstallScope = 'project' | 'user';
type ToolPack = 'ideas' | 'workflows' | 'utility';

interface InitToolsDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (scope: InstallScope, cwd: string, home: string) => string;
  resolveAssetsRoot: () => Promise<string>;
  selectManyWithAbort: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[] | null>;
  selectWithAbort: <T extends string>(
    message: string,
    choices: SelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T | null>;
  installIdeas: (options: InstallIdeasOptions) => Promise<InstallIdeasResult>;
  installWorkflows: (
    options: InstallWorkflowsOptions,
  ) => Promise<InstallWorkflowsResult>;
  installUtility: (
    options: InstallUtilityOptions,
  ) => Promise<InstallUtilityResult>;
  copyDirWithStatus: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<'copied' | 'updated' | 'skipped'>;
  addLocalPaths: (
    repoRoot: string,
    paths: string[],
  ) => Promise<{ added: string[]; all: string[] }>;
  applyGitignore: (
    repoRoot: string,
    localPaths: string[],
  ) => Promise<{ action: string }>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  resolveLocalPaths: (config: OatConfig) => string[];
}

interface OutdatedSkillRecord {
  name: string;
  installed: string | null;
  bundled: string | null;
  targetRoot: string;
}

function formatVersionForDisplay(version: string | null): string {
  return version ?? '(unversioned)';
}

const PACK_CHOICES: MultiSelectChoice<ToolPack>[] = [
  { label: 'Ideas [project|user]', value: 'ideas', checked: true },
  { label: 'Workflows [project]', value: 'workflows', checked: true },
  { label: 'Utility [project|user]', value: 'utility', checked: true },
];

const DEFAULT_DEPENDENCIES: InitToolsDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  selectManyWithAbort,
  selectWithAbort,
  installIdeas: defaultInstallIdeas,
  installWorkflows: defaultInstallWorkflows,
  installUtility: defaultInstallUtility,
  copyDirWithStatus,
  addLocalPaths,
  applyGitignore,
  readOatConfig,
  resolveLocalPaths,
};

function isUserEligibleSelection(selections: ToolPack[]): boolean {
  return selections.includes('ideas') || selections.includes('utility');
}

async function resolveUserEligibleScope(
  context: CommandContext,
  selections: ToolPack[],
  dependencies: InitToolsDependencies,
): Promise<InstallScope> {
  if (!isUserEligibleSelection(selections)) {
    return 'project';
  }

  if (context.scope === 'project') {
    return 'project';
  }

  if (context.scope === 'user') {
    return 'user';
  }

  if (!context.interactive) {
    return 'project';
  }

  const selected = await dependencies.selectWithAbort(
    'Install user-eligible packs in project scope or user scope?',
    [
      { label: 'Project scope', value: 'project' },
      { label: 'User scope', value: 'user' },
    ],
    { interactive: context.interactive },
  );

  return selected ?? 'project';
}

function reportSuccess(
  context: CommandContext,
  selectedPacks: ToolPack[],
  utilityScope: InstallScope,
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      selectedPacks,
      utilityScope,
    });
    return;
  }

  context.logger.info(`Installed tool packs: ${selectedPacks.join(', ')}`);
  context.logger.info(`User-eligible pack scope: ${utilityScope}`);
  context.logger.info('Run: oat sync --scope project');
  if (utilityScope === 'user') {
    context.logger.info('Also run: oat sync --scope user');
  }
}

function reportOutdatedSkills(
  context: CommandContext,
  outdatedSkills: OutdatedSkillRecord[],
): void {
  if (outdatedSkills.length === 0) {
    return;
  }

  context.logger.info('Outdated skills:');
  for (const skill of outdatedSkills) {
    context.logger.info(
      `  ${skill.name}  ${formatVersionForDisplay(skill.installed)} -> ${formatVersionForDisplay(skill.bundled)}`,
    );
  }
}

async function updateOutdatedSkills(
  outdatedSkills: OutdatedSkillRecord[],
  assetsRoot: string,
  dependencies: InitToolsDependencies,
): Promise<string[]> {
  const updatedNames: string[] = [];

  for (const skill of outdatedSkills) {
    const source = join(assetsRoot, 'skills', skill.name);
    const destination = join(skill.targetRoot, '.agents', 'skills', skill.name);
    await dependencies.copyDirWithStatus(source, destination, true);
    updatedNames.push(skill.name);
  }

  return updatedNames;
}

async function runInitTools(
  context: CommandContext,
  dependencies: InitToolsDependencies,
): Promise<void> {
  try {
    const selectedPacks: ToolPack[] = context.interactive
      ? ((await dependencies.selectManyWithAbort(
          'Select tool packs to install',
          PACK_CHOICES,
          { interactive: context.interactive },
        )) ?? [])
      : ['ideas', 'workflows', 'utility'];

    if (selectedPacks.length === 0) {
      if (!context.json) {
        context.logger.info('No tool packs selected.');
      }
      process.exitCode = 0;
      return;
    }

    const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userRoot = dependencies.resolveScopeRoot(
      'user',
      context.cwd,
      context.home,
    );
    const userEligibleScope = await resolveUserEligibleScope(
      context,
      selectedPacks,
      dependencies,
    );

    const userEligibleRoot =
      userEligibleScope === 'user' ? userRoot : projectRoot;
    const assetsRoot = await dependencies.resolveAssetsRoot();
    const outdatedSkills: OutdatedSkillRecord[] = [];

    if (selectedPacks.includes('ideas')) {
      const ideasResult = await dependencies.installIdeas({
        assetsRoot,
        targetRoot: userEligibleRoot,
      });
      for (const skill of ideasResult.outdatedSkills) {
        outdatedSkills.push({ ...skill, targetRoot: userEligibleRoot });
      }
    }

    if (selectedPacks.includes('workflows')) {
      const workflowsResult = await dependencies.installWorkflows({
        assetsRoot,
        targetRoot: projectRoot,
      });
      for (const skill of workflowsResult.outdatedSkills) {
        outdatedSkills.push({ ...skill, targetRoot: projectRoot });
      }

      const resolvedRoot =
        workflowsResult.resolvedProjectsRoot || '.oat/projects/shared';
      const projectsBase = resolvedRoot.replace(/\/[^/]+$/, '');
      const PR_REVIEW_LOCAL_PATHS = [
        `${projectsBase}/**/pr`,
        `${projectsBase}/**/reviews`,
      ];

      const existingConfig = await dependencies.readOatConfig(projectRoot);
      const existingLocalPaths = new Set(
        dependencies.resolveLocalPaths(existingConfig),
      );
      const alreadyConfigured = PR_REVIEW_LOCAL_PATHS.every((p) =>
        existingLocalPaths.has(p),
      );

      if (!alreadyConfigured) {
        let makeLocal = true;
        if (context.interactive) {
          const selected = await dependencies.selectWithAbort(
            'Should PR and review directories for shared projects be local-only (gitignored) or version-controlled?',
            [
              {
                label: 'Local only (recommended)',
                value: 'local',
                description:
                  'PR and review artifacts stay local, synced via oat local sync',
              },
              {
                label: 'Version controlled',
                value: 'tracked',
                description:
                  'PR and review artifacts are committed to the repo',
              },
            ],
            { interactive: context.interactive },
          );
          makeLocal = selected !== 'tracked';
        }

        if (makeLocal) {
          const addResult = await dependencies.addLocalPaths(
            projectRoot,
            PR_REVIEW_LOCAL_PATHS,
          );
          if (addResult.added.length > 0) {
            const config = await dependencies.readOatConfig(projectRoot);
            const allPaths = dependencies.resolveLocalPaths(config);
            await dependencies.applyGitignore(projectRoot, allPaths);
          }
        }
      }
    }

    if (selectedPacks.includes('utility')) {
      const utilityResult = await dependencies.installUtility({
        assetsRoot,
        targetRoot: userEligibleRoot,
        skills: [...UTILITY_SKILLS],
      });
      for (const skill of utilityResult.outdatedSkills) {
        outdatedSkills.push({ ...skill, targetRoot: userEligibleRoot });
      }
    }

    if (outdatedSkills.length > 0) {
      reportOutdatedSkills(context, outdatedSkills);

      if (context.interactive) {
        const selectedNames =
          (await dependencies.selectManyWithAbort(
            'Update outdated skills?',
            outdatedSkills.map((skill) => ({
              label: `${skill.name} (${skill.installed} -> ${skill.bundled})`,
              value: skill.name,
              checked: true,
            })),
            { interactive: context.interactive },
          )) ?? [];

        const selectedSet = new Set(selectedNames);
        const selectedOutdated = outdatedSkills.filter((skill) =>
          selectedSet.has(skill.name),
        );
        const updatedNames = await updateOutdatedSkills(
          selectedOutdated,
          assetsRoot,
          dependencies,
        );

        if (updatedNames.length > 0) {
          context.logger.info(
            `Updated outdated skills: ${updatedNames.join(', ')}`,
          );
        }
      } else {
        context.logger.info(
          'Non-interactive mode: outdated skills were not updated.',
        );
        context.logger.info('Use --force to update installed skills.');
      }
    }

    reportSuccess(context, selectedPacks, userEligibleScope);
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createInitToolsCommand(
  overrides: Partial<InitToolsDependencies> = {},
): Command {
  const dependencies: InitToolsDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('tools')
    .description('Install OAT tool packs (ideas, workflows, utility)')
    .addCommand(createInitToolsIdeasCommand())
    .addCommand(createInitToolsWorkflowsCommand())
    .addCommand(createInitToolsUtilityCommand())
    .action(async (_options: unknown, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runInitTools(context, dependencies);
    });
}
