import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  type AgentsMdMutationOptions,
  type UpsertSectionResult,
  formatAgentsMdGuidanceResult,
  formatAgentsMdMutationFailure,
  upsertAgentsMdSection,
} from '@commands/shared/agents-md';
import { withScopeOption } from '@commands/shared/scope-option';
import {
  confirmAction,
  type PromptContext,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  canonicalPathsForPack,
  setInstalledCanonicalPaths,
} from '@commands/tools/shared/install-sync-context';
import { getPackDefinition } from '@commands/tools/shared/pack-manifest';
import { scanTools } from '@commands/tools/shared/scan-tools';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type { PackName, ToolInfo } from '@commands/tools/shared/types';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  type AgentsGuidancePlan,
  commandProjectGuidanceChoice,
  planProjectGuidance,
  type ProjectGuidancePack,
  reportableProjectGuidance,
  withProjectGuidanceOptions,
} from '../project-guidance';
import {
  installWorkflows as defaultInstallWorkflows,
  type InstallWorkflowsOptions,
  type InstallWorkflowsResult,
  type InstallWorkflowsScope,
} from './install-workflows';

interface InitToolsWorkflowsOptions {
  force?: boolean;
}

interface InitToolsWorkflowsDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (
    scope: InstallWorkflowsScope,
    cwd: string,
    home: string,
  ) => string;
  resolveAssetsRoot: () => Promise<string>;
  installWorkflows: (
    options: InstallWorkflowsOptions,
  ) => Promise<InstallWorkflowsResult>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  planProjectGuidance: typeof planProjectGuidance;
  upsertAgentsMdSection: (
    repoRoot: string,
    key: string,
    body: string,
    options?: AgentsMdMutationOptions,
  ) => Promise<UpsertSectionResult>;
}

const DEFAULT_DEPENDENCIES: InitToolsWorkflowsDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  installWorkflows: defaultInstallWorkflows,
  confirmAction,
  scanTools,
  planProjectGuidance,
  upsertAgentsMdSection,
};

const ALL_TOOL_PACKS = [
  'core',
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
  'brainstorm',
] as const satisfies readonly PackName[];

function realizedProjectGuidancePacks(
  tools: ToolInfo[],
): ProjectGuidancePack[] {
  return ALL_TOOL_PACKS.flatMap((pack) => {
    const project = tools.some(
      (tool) => tool.pack === pack && tool.scope === 'project',
    );
    const user = tools.some(
      (tool) => tool.pack === pack && tool.scope === 'user',
    );
    if (!project && !user) return [];
    return [
      {
        pack,
        scope: project && user ? 'both' : project ? 'project' : 'user',
      } satisfies ProjectGuidancePack,
    ];
  });
}

async function applyProjectGuidance(
  plan: AgentsGuidancePlan,
  dependencies: InitToolsWorkflowsDependencies,
): Promise<AgentsGuidancePlan> {
  if (plan.action !== 'create' || !plan.repoRoot) return plan;

  try {
    const result = await dependencies.upsertAgentsMdSection(
      plan.repoRoot,
      plan.sectionKey,
      plan.body,
      plan.legacySectionAction === 'remove'
        ? { removeSectionKeys: ['workflows'] }
        : undefined,
    );
    if (result.action === 'manual-required') {
      return {
        ...plan,
        action: 'manual-required',
        reason:
          'Accepted project guidance requires the reported manual AGENTS.md patch. Capability placement and PJM adoption were unchanged.',
        manualPatch: result.manualPatch,
      };
    }
    if (result.action === 'blocked') {
      return {
        ...plan,
        action: 'blocked',
        reason:
          `Accepted project guidance was blocked: ${result.blocked?.reason ?? 'AGENTS.md could not be planned safely.'} ${result.blocked?.action ?? ''}`.trim(),
      };
    }
    return {
      ...plan,
      action: result.action === 'created' ? 'create' : 'no-change',
      reason: `Accepted project guidance ${result.action}. Capability placement and PJM adoption were unchanged.`,
    };
  } catch (error) {
    return {
      ...plan,
      action: 'blocked',
      reason: `Accepted project guidance was blocked: ${formatAgentsMdMutationFailure(error)}`,
    };
  }
}

function reportSuccess(
  context: CommandContext,
  scope: InstallWorkflowsScope,
  targetRoot: string,
  assetsRoot: string,
  result: InstallWorkflowsResult,
  projectGuidance: AgentsGuidancePlan,
): void {
  if (context.json) {
    if (
      projectGuidance.action === 'blocked' ||
      projectGuidance.action === 'manual-required'
    ) {
      context.logger.json({
        status: 'partial',
        scope,
        capability: {
          status: 'complete',
          skills: result.copiedSkills.length + result.updatedSkills.length,
          agents: result.copiedAgents.length + result.updatedAgents.length,
          templates:
            result.copiedTemplates.length + result.updatedTemplates.length,
          scripts: result.copiedScripts.length + result.updatedScripts.length,
        },
        projectGuidance: reportableProjectGuidance(projectGuidance),
      });
      return;
    }
    context.logger.json({
      status: 'ok',
      scope,
      targetRoot,
      assetsRoot,
      result,
      projectGuidance: reportableProjectGuidance(projectGuidance),
    });
    return;
  }

  context.logger.info('Installed workflows tool pack.');
  context.logger.info(`Scope: ${scope}`);
  if (
    projectGuidance.action !== 'blocked' &&
    projectGuidance.action !== 'manual-required'
  ) {
    context.logger.info(`Target root: ${targetRoot}`);
  }
  context.logger.info(
    `Skills: copied=${result.copiedSkills.length}, updated=${result.updatedSkills.length}, skipped=${result.skippedSkills.length}`,
  );
  context.logger.info(
    `Agents: copied=${result.copiedAgents.length}, updated=${result.updatedAgents.length}, skipped=${result.skippedAgents.length}`,
  );
  context.logger.info(
    `Templates: copied=${result.copiedTemplates.length}, updated=${result.updatedTemplates.length}, skipped=${result.skippedTemplates.length}`,
  );
  context.logger.info(
    `Scripts: copied=${result.copiedScripts.length}, updated=${result.updatedScripts.length}, skipped=${result.skippedScripts.length}`,
  );
  context.logger.info(
    `Projects root initialized: ${result.projectsRootInitialized ? 'yes' : 'no'}`,
  );
  const guidanceMessage = `Project guidance: ${projectGuidance.action} — ${projectGuidance.reason}`;
  if (
    projectGuidance.action === 'blocked' ||
    projectGuidance.action === 'manual-required'
  ) {
    context.logger.warn(guidanceMessage);
    if (projectGuidance.manualPatch) {
      for (const line of formatAgentsMdGuidanceResult({
        action: 'manual-required',
        manualPatch: projectGuidance.manualPatch,
      })) {
        context.logger.info(line);
      }
    }
  } else {
    context.logger.info(guidanceMessage);
  }
  context.logger.info(`Run: oat sync --scope ${scope}`);
}

async function planAndApplyProjectGuidance(
  context: CommandContext,
  scope: InstallWorkflowsScope,
  targetRoot: string,
  assetsRoot: string,
  explicitChoice: boolean | undefined,
  dependencies: InitToolsWorkflowsDependencies,
): Promise<AgentsGuidancePlan> {
  const projectTarget = scope === 'project' ? targetRoot : null;
  const initialPlan = await dependencies.planProjectGuidance({
    repoRoot: projectTarget,
    packs: [],
    explicitChoice,
    interactive: context.interactive,
    confirmAction: dependencies.confirmAction,
  });
  if (initialPlan.choice.choice !== 'accepted') return initialPlan;

  try {
    let repoRoot = projectTarget;
    if (!repoRoot) {
      repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    }

    const userRoot = dependencies.resolveScopeRoot(
      'user',
      context.cwd,
      context.home,
    );
    const [projectTools, userTools] = await Promise.all([
      dependencies.scanTools({
        scope: 'project',
        scopeRoot: repoRoot,
        assetsRoot,
      }),
      dependencies.scanTools({
        scope: 'user',
        scopeRoot: userRoot,
        assetsRoot,
      }),
    ]);
    const completePlan = await dependencies.planProjectGuidance({
      repoRoot,
      packs: realizedProjectGuidancePacks([...projectTools, ...userTools]),
      explicitChoice: true,
      interactive: false,
      confirmAction: dependencies.confirmAction,
    });
    return applyProjectGuidance(completePlan, dependencies);
  } catch (error) {
    return {
      ...initialPlan,
      action: 'blocked',
      reason: `Accepted project guidance was blocked: ${formatAgentsMdMutationFailure(error)}`,
    };
  }
}

async function runInitToolsWorkflows(
  context: CommandContext,
  options: InitToolsWorkflowsOptions,
  dependencies: InitToolsWorkflowsDependencies,
  explicitProjectGuidance: boolean | undefined,
): Promise<boolean> {
  try {
    const scope: InstallWorkflowsScope =
      context.scope === 'project' || context.scope === 'user'
        ? context.scope
        : getPackDefinition('workflows').defaultScope;
    const targetRoot =
      scope === 'user'
        ? dependencies.resolveScopeRoot('user', context.cwd, context.home)
        : await dependencies.resolveProjectRoot(context.cwd);

    if (options.force && context.interactive) {
      const confirmed = await dependencies.confirmAction(
        `Force overwrite existing workflows assets in ${scope} scope?`,
        { interactive: context.interactive },
      );
      if (!confirmed) {
        if (!context.json) {
          context.logger.info('Cancelled: no files were overwritten.');
        }
        process.exitCode = 0;
        return false;
      }
    }

    const assetsRoot = await dependencies.resolveAssetsRoot();
    const result = await dependencies.installWorkflows({
      assetsRoot,
      targetRoot,
      scope,
      force: options.force,
    });
    const projectGuidance = await planAndApplyProjectGuidance(
      context,
      scope,
      targetRoot,
      assetsRoot,
      explicitProjectGuidance,
      dependencies,
    );

    reportSuccess(
      context,
      scope,
      targetRoot,
      assetsRoot,
      result,
      projectGuidance,
    );
    process.exitCode =
      projectGuidance.action === 'blocked' ||
      projectGuidance.action === 'manual-required'
        ? 1
        : 0;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
    return false;
  }
}

export function createInitToolsWorkflowsCommand(
  overrides: Partial<InitToolsWorkflowsDependencies> = {},
): Command {
  const dependencies: InitToolsWorkflowsDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return withProjectGuidanceOptions(withScopeOption(new Command('workflows')))
    .description('Install OAT workflows skills, agents, templates, and scripts')
    .option('--force', 'Overwrite existing files where applicable')
    .action(async (options: InitToolsWorkflowsOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const didInstall = await runInitToolsWorkflows(
        context,
        options,
        dependencies,
        commandProjectGuidanceChoice(command),
      );
      if (didInstall) {
        setInstalledCanonicalPaths(command, canonicalPathsForPack('workflows'));
      }
    });
}
