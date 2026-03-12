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
  type UpsertSectionResult,
  removeAgentsMdSection,
  upsertAgentsMdSection,
} from '@commands/shared/agents-md';
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
export type ToolPack = 'ideas' | 'workflows' | 'utility';

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
  upsertAgentsMdSection: (
    repoRoot: string,
    key: string,
    body: string,
  ) => Promise<UpsertSectionResult>;
  removeAgentsMdSection: (repoRoot: string, key: string) => Promise<boolean>;
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
  upsertAgentsMdSection,
  removeAgentsMdSection,
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

const PACK_DESCRIPTIONS: Record<ToolPack, string> = {
  workflows:
    'Project lifecycle (create, discover, plan, implement, review, complete)',
  ideas: 'Idea capture and refinement',
  utility: 'Standalone utilities (reviews, docs analysis, agent instructions)',
};

interface PackScopeInfo {
  pack: ToolPack;
  scope: InstallScope;
}

export function buildToolPacksSectionBody(packs: PackScopeInfo[]): string {
  const userPacks = packs.filter((p) => p.scope === 'user');

  const lines = [
    '## Tool Packs',
    '',
    '- **Skills directory:** `.agents/skills/`',
    '- **Discover available skills:** scan `.agents/skills/*/SKILL.md`',
    '- **Refresh provider views:** `oat sync --scope all`',
  ];

  if (userPacks.length > 0) {
    lines.push(
      '- **User-scoped skills:** `~/.agents/skills/` (ideas and utility packs installed at user scope)',
    );
  }

  lines.push('', '### Installed Packs', '');

  for (const { pack, scope } of packs) {
    const suffix = scope === 'user' ? ' _(user scope)_' : '';
    lines.push(`- **${pack}** — ${PACK_DESCRIPTIONS[pack]}${suffix}`);
  }

  return lines.join('\n');
}

export async function runInitTools(
  context: CommandContext,
  dependencies: InitToolsDependencies,
): Promise<ToolPack[]> {
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
      return [];
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
      const PR_ARCHIVE_LOCAL_PATHS = [
        `${projectsBase}/**/pr`,
        `${projectsBase}/**/reviews/archived`,
      ];

      const existingConfig = await dependencies.readOatConfig(projectRoot);
      const existingLocalPaths = new Set(
        dependencies.resolveLocalPaths(existingConfig),
      );
      const alreadyConfigured = PR_ARCHIVE_LOCAL_PATHS.every((p) =>
        existingLocalPaths.has(p),
      );

      if (!alreadyConfigured) {
        let makeLocal = true;
        if (context.interactive) {
          const selected = await dependencies.selectWithAbort(
            'Should shared-project PR directories and archived review history be local-only (gitignored) or version-controlled?',
            [
              {
                label: 'Local only (recommended)',
                value: 'local',
                description:
                  'PR artifacts and archived reviews stay local; active reviews remain tracked until received',
              },
              {
                label: 'Version controlled',
                value: 'tracked',
                description:
                  'PR artifacts and archived reviews are committed to the repo too',
              },
            ],
            { interactive: context.interactive },
          );
          makeLocal = selected !== 'tracked';
        }

        if (makeLocal) {
          const addResult = await dependencies.addLocalPaths(
            projectRoot,
            PR_ARCHIVE_LOCAL_PATHS,
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

    const packScopeInfo: PackScopeInfo[] = selectedPacks.map((pack) => ({
      pack,
      scope: pack === 'workflows' ? 'project' : userEligibleScope,
    }));
    const sectionBody = buildToolPacksSectionBody(packScopeInfo);
    const sectionResult = await dependencies.upsertAgentsMdSection(
      projectRoot,
      'tools',
      sectionBody,
    );
    // Migrate: remove legacy <!-- OAT workflows --> section if present
    await dependencies.removeAgentsMdSection(projectRoot, 'workflows');

    if (!context.json && sectionResult.action !== 'no-change') {
      context.logger.info(
        `AGENTS.md tool packs section ${sectionResult.action}.`,
      );
    }

    reportSuccess(context, selectedPacks, userEligibleScope);
    process.exitCode = 0;
    return selectedPacks;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
    return [];
  }
}

export async function runInitToolsWithDefaults(
  context: CommandContext,
): Promise<ToolPack[]> {
  return runInitTools(context, { ...DEFAULT_DEPENDENCIES });
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
