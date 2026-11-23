import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  resolveProjectOrActive,
  type NamedProject,
} from '@commands/project/resolve-named-project';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  freestyleStateLineEndings,
  getFrontmatterBlock,
  isFreestyleState,
} from '@commands/shared/frontmatter';
import {
  replaceFrontmatter,
  upsertFrontmatterField,
} from '@commands/shared/frontmatter-write';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { assertValidProjectStateContent } from '@validation/project-state';
import { Command } from 'commander';

import {
  ORCHESTRATOR_BRANCH_FIELD,
  parseOrchestratorBranch,
  readCurrentBranch,
} from './branch';

interface OrchestratorSetOptions {
  project?: string;
  branch?: string;
  replace?: boolean;
}

export type OrchestratorSetOutcome = 'claimed' | 'replaced' | 'unchanged';

export interface OrchestratorSetResult {
  outcome: OrchestratorSetOutcome;
  project: NamedProject;
  branch: string;
  previousBranch: string | null;
}

interface OrchestratorSetDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  gitRunner: GitRunner;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: OrchestratorSetDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  gitRunner: defaultGitRunner,
  now: () => new Date(),
};

/**
 * Record the orchestrator's branch in a freestyle project's `state.md`. An
 * empty or absent value is claimed; an existing different value is replaced
 * only with `replace`. Writes `state.md` and nothing else: freestyle has no
 * automatic commits or pushes.
 */
export async function setOrchestratorBranch(options: {
  repoRoot: string;
  project?: string;
  branch?: string;
  replace?: boolean;
  git?: GitRunner;
  now?: Date;
}): Promise<OrchestratorSetResult> {
  const project = await resolveProjectOrActive(
    options.repoRoot,
    options.project,
  );
  const statePath = join(project.absolutePath, 'state.md');
  const raw = await readFile(statePath, 'utf8');
  if (!isFreestyleState(raw)) {
    throw new CliError(
      `Project ${project.name} is not a freestyle project; only a freestyle project records an orchestrator branch.`,
      1,
    );
  }

  const requested = options.branch?.trim();
  if (options.branch !== undefined && !requested) {
    throw new CliError('--branch needs a branch name.', 1);
  }
  const branch =
    requested ||
    (await readCurrentBranch(
      options.repoRoot,
      options.git ?? defaultGitRunner,
    ));
  if (!branch) {
    throw new CliError(
      'This checkout is on a detached HEAD, so there is no current branch to record. Check out the orchestrator branch, or pass --branch <name>.',
      1,
    );
  }

  const previousBranch = parseOrchestratorBranch(raw);
  if (previousBranch === branch) {
    return { outcome: 'unchanged', project, branch, previousBranch };
  }
  if (previousBranch !== null && !options.replace) {
    throw new CliError(
      `Project ${project.name} is already claimed by branch ${previousBranch}. Pass --replace to record ${branch} instead.`,
      1,
    );
  }

  const { content, restore } = freestyleStateLineEndings(raw);
  const block = getFrontmatterBlock(content);
  if (block === null) {
    throw new CliError(`${statePath} has no frontmatter block.`, 1);
  }
  const stamp = JSON.stringify((options.now ?? new Date()).toISOString());
  const withBranch = upsertFrontmatterField(
    block,
    ORCHESTRATOR_BRANCH_FIELD,
    JSON.stringify(branch),
    true,
  ).nextBlock;
  const nextBlock = upsertFrontmatterField(
    withBranch,
    'oat_project_state_updated',
    stamp,
    true,
  ).nextBlock;
  const next = replaceFrontmatter(content, nextBlock);
  assertValidProjectStateContent(next, { filePath: statePath });
  await writeFile(statePath, restore(next), 'utf8');

  return {
    outcome: previousBranch === null ? 'claimed' : 'replaced',
    project,
    branch,
    previousBranch,
  };
}

const OUTCOME_TEXT: Record<OrchestratorSetOutcome, string> = {
  claimed: 'Claimed',
  replaced: 'Replaced the orchestrator branch of',
  unchanged: 'Already claimed:',
};

async function runOrchestratorSet(
  context: CommandContext,
  options: OrchestratorSetOptions,
  dependencies: OrchestratorSetDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const result = await setOrchestratorBranch({
      repoRoot,
      project: options.project,
      branch: options.branch,
      replace: options.replace,
      git: dependencies.gitRunner,
      now: dependencies.now(),
    });
    if (context.json) {
      context.logger.json({
        status: 'ok',
        outcome: result.outcome,
        projectName: result.project.name,
        projectPath: result.project.projectPath,
        scope: result.project.scope,
        orchestratorBranch: result.branch,
        previousBranch: result.previousBranch,
      });
    } else {
      context.logger.info(
        `${OUTCOME_TEXT[result.outcome]} ${result.project.name}: orchestrator branch ${result.branch}${result.previousBranch && result.outcome === 'replaced' ? ` (was ${result.previousBranch})` : ''}`,
      );
      if (result.outcome !== 'unchanged') {
        context.logger.info(
          `Wrote ${result.project.projectPath}/state.md; nothing was committed or pushed. Save it by the records rule for the project's scope in its AGENTS.md.`,
        );
      }
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 2;
  }
}

export function createProjectOrchestratorSetCommand(
  overrides: Partial<OrchestratorSetDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('set')
    .description(
      "Record the orchestrator's branch of a freestyle project (claims an unclaimed project)",
    )
    .option(
      '--project <name-or-path>',
      'Project name or path; defaults to the active project',
    )
    .option(
      '--branch <branch>',
      'Branch to record; defaults to the current branch',
    )
    .option('--replace', 'Replace a different recorded branch')
    .action(async (options: OrchestratorSetOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runOrchestratorSet(context, options, dependencies);
    });
}
