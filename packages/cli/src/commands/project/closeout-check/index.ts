import { readFile as defaultReadFile, readdir } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import {
  loadGoalDeliveryProject,
  reviewRowsFor,
} from '@commands/project/delivery/check';
import {
  deliveriesSharingMembers,
  deliveryEvidenceArtifacts,
  evaluateDeliveryReview,
  evaluateGateCarrier,
  type EvidenceScope,
} from '@commands/project/delivery/evidence';
import { observeMember } from '@commands/project/delivery/refresh';
import {
  defaultGhRunner,
  type GhRunner,
} from '@commands/project/links/refresh';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveEffectiveConfig } from '@config/resolve';
import { CliError } from '@errors/cli-error';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import {
  getProjectState,
  parsePhaseMarkers,
  type GoalDelivery,
  type ProjectState,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import YAML from 'yaml';

import {
  evaluateCloseout,
  formatCloseoutRefusal,
  readStateWorkflowMode,
  resolveDeliveryGraph,
  type CloseoutResult,
  type DeliveryEvidenceFact,
  type ExtractedChildFact,
  type GoalCloseoutInputs,
} from './closeout-invariant';

export {
  evaluateCloseout,
  evaluateGoalBoundary,
  evaluateGoalCoverage,
  formatCloseoutRefusal,
  resolveDeliveryGraph,
  type CloseoutResult,
  type DeliveryEvidenceFact,
  type ExtractedChildFact,
  type GoalCloseoutInputs,
} from './closeout-invariant';

export interface CloseoutCheckDependencies {
  buildCommandContext: (
    options: Parameters<typeof buildCommandContext>[0],
  ) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveEffectiveConfig: typeof resolveEffectiveConfig;
  readFile: typeof defaultReadFile;
  dirExists: typeof dirExists;
  fileExists: typeof fileExists;
  /**
   * Environment read for `OAT_AUTONOMOUS`. Injectable so a caller that forgets
   * `--autonomous` under `OAT_AUTONOMOUS=1` still cannot fail open.
   */
  env: NodeJS.ProcessEnv;
  /** Goal only: read-only member observation (`gh pr view`). */
  gh: GhRunner;
  /** Goal only: read-only Git inspection for the shared evidence evaluator. */
  git: GitRunner;
  getProjectState: (projectPath: string) => Promise<ProjectState>;
  listDirectories: (path: string) => Promise<string[]>;
}

async function listDirectories(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export const DEFAULT_CLOSEOUT_CHECK_DEPENDENCIES: CloseoutCheckDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveEffectiveConfig,
  readFile: defaultReadFile,
  dirExists,
  fileExists,
  env: process.env,
  gh: defaultGhRunner,
  git: defaultGitRunner,
  getProjectState,
  listDirectories,
};

/** The dependencies `checkProjectCloseout` reads through. */
export type CloseoutInputDependencies = Pick<
  CloseoutCheckDependencies,
  | 'resolveProjectRoot'
  | 'resolveEffectiveConfig'
  | 'readFile'
  | 'dirExists'
  | 'fileExists'
  | 'env'
  | 'gh'
  | 'git'
  | 'getProjectState'
  | 'listDirectories'
>;

async function readOptional(
  dependencies: Pick<CloseoutInputDependencies, 'readFile'>,
  path: string,
): Promise<string | null> {
  try {
    return await dependencies.readFile(path, 'utf8');
  } catch {
    return null;
  }
}

function frontmatterRecord(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    const parsed: unknown = YAML.parse(match[1] ?? '');
    return parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Find an extracted phase's child project by slug under any scope of the
 * projects root, and read its lifecycle and `oat_extracted_from` backlink.
 */
async function observeChild(
  projectsRoot: string,
  slug: string,
  dependencies: Pick<
    CloseoutInputDependencies,
    'readFile' | 'fileExists' | 'listDirectories'
  >,
): Promise<ExtractedChildFact> {
  const unresolved = (
    status: ExtractedChildFact['status'],
  ): ExtractedChildFact => ({
    slug,
    status,
    lifecycle: null,
    extractedFrom: null,
  });
  let scopes: string[];
  try {
    scopes = await dependencies.listDirectories(projectsRoot);
  } catch {
    return unresolved('unreadable');
  }
  const candidates: string[] = [];
  for (const scope of scopes) {
    const statePath = join(projectsRoot, scope, slug, 'state.md');
    if (await dependencies.fileExists(statePath)) {
      candidates.push(statePath);
    }
  }
  if (candidates.length === 0) return unresolved('missing');
  if (candidates.length > 1) return unresolved('ambiguous');
  const content = await readOptional(dependencies, candidates[0]!);
  const frontmatter = content === null ? null : frontmatterRecord(content);
  if (frontmatter === null) return unresolved('unreadable');
  const read = (key: string) =>
    typeof frontmatter[key] === 'string' ? (frontmatter[key] as string) : null;
  return {
    slug,
    status: 'found',
    lifecycle: read('oat_lifecycle'),
    extractedFrom: read('oat_extracted_from'),
  };
}

/**
 * Load the goal boundary inputs read-only (A3): the brief, the journal, the
 * registry with fresh member observations merged in (never persisted; that is
 * `delivery refresh`'s job), each extracted child's facts, and the shared
 * evaluator's verdict for every terminal delivery's effective scope.
 */
export async function loadGoalCloseoutInputs(
  repoRoot: string,
  targetProjectPath: string,
  dependencies: CloseoutInputDependencies,
): Promise<GoalCloseoutInputs> {
  const planContent = await readOptional(
    dependencies,
    join(targetProjectPath, 'plan.md'),
  );
  const implementationContent = await readOptional(
    dependencies,
    join(targetProjectPath, 'implementation.md'),
  );
  const inputs: GoalCloseoutInputs = {
    goalSlug: basename(targetProjectPath),
    planContent,
    implementationContent,
    deliveries: null,
    observationFailures: [],
    children: [],
    evidence: {},
  };

  if (implementationContent !== null) {
    const projectsRoot = dirname(dirname(targetProjectPath));
    const slugs = new Set<string>();
    for (const markers of parsePhaseMarkers(implementationContent).values()) {
      if (markers.status === 'extracted' && markers.extractedTo !== null) {
        slugs.add(markers.extractedTo);
      }
    }
    for (const slug of slugs) {
      inputs.children.push(
        await observeChild(projectsRoot, slug, dependencies),
      );
    }
  }

  let project: Awaited<ReturnType<typeof loadGoalDeliveryProject>>;
  try {
    project = await loadGoalDeliveryProject(targetProjectPath, repoRoot, {
      resolveProjectRoot: async () => repoRoot,
      readFile: (path, encoding) => dependencies.readFile(path, encoding),
      getProjectState: dependencies.getProjectState,
    });
  } catch {
    return inputs;
  }
  const registered = project.state.deliveries ?? [];

  // Observe every member of every non-superseded delivery read-only.
  const observed: GoalDelivery[] = [];
  for (const delivery of registered) {
    if (delivery.status === 'superseded' || delivery.status === 'registering') {
      observed.push(delivery);
      continue;
    }
    const members = [];
    for (const member of delivery.members) {
      const observation =
        member.url === null
          ? 'a member has no URL to observe'
          : await observeMember(dependencies.gh, member.url);
      if (typeof observation === 'string') {
        inputs.observationFailures.push(
          `${delivery.delivery_id} ${member.url ?? '(no url)'}: ${observation}`,
        );
        members.push(member);
      } else {
        members.push({
          ...member,
          observed_head: observation.head,
          observed_base: observation.base,
          status: observation.status,
        });
      }
    }
    observed.push({ ...delivery, members });
  }
  inputs.deliveries = observed;
  if (inputs.observationFailures.length > 0) {
    return inputs;
  }

  // Evaluate evidence for every terminal delivery over its effective scope.
  const graph = resolveDeliveryGraph(
    observed,
    project.state.progress.phases.map((phase) => phase.phaseId),
  );
  for (const terminal of graph.terminals) {
    const { delivery, effectiveScope } = terminal;
    if (delivery.status === 'registering') continue;
    const sharing = deliveriesSharingMembers(observed, delivery);
    const evidenceScope: EvidenceScope = {
      repoRoot: project.repoRoot,
      projectDir: project.projectDir,
      evidenceArtifacts: deliveryEvidenceArtifacts(
        delivery,
        reviewRowsFor(project.state.reviews, [
          delivery.delivery_id,
          ...(delivery.milestone === null ? [] : [delivery.milestone]),
          ...sharing.map((entry) => entry.delivery_id),
        ]).map((row) => row.artifact),
        sharing,
      ),
    };
    const fact: DeliveryEvidenceFact = {
      scope: effectiveScope,
      review: await evaluateDeliveryReview(
        dependencies.git,
        evidenceScope,
        delivery,
        effectiveScope,
      ),
      // The accepted exit-gate binding persisted with the delivery's evidence,
      // never the milestone's current working carrier.
      exit: await evaluateGateCarrier(
        delivery.exit_gate,
        {
          kind: 'code',
          scope: effectiveScope,
          match: 'covers',
          overrideDisabled: project.exitGateDisabled,
        },
        {
          git: dependencies.git,
          scope: evidenceScope,
          publishedHeads: delivery.members.map(
            (member) => member.observed_head,
          ),
        },
      ),
    };
    inputs.evidence[delivery.delivery_id] = fact;
  }
  return inputs;
}

export interface ProjectCloseoutCheck {
  repoRoot: string;
  targetProjectPath: string;
  statePath: string;
  stateContent: string;
  result: CloseoutResult;
}

/**
 * Resolve a project, read its `state.md` from disk, and evaluate the closeout
 * invariant. Shared by `closeout-check` and `complete-state` so both read the
 * same inputs and print the same refusal.
 */
export async function checkProjectCloseout(
  projectPath: string,
  options: { autonomous: boolean },
  context: CommandContext,
  dependencies: CloseoutInputDependencies,
): Promise<ProjectCloseoutCheck> {
  const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
  const targetProjectPath = isAbsolute(projectPath)
    ? projectPath
    : join(repoRoot, projectPath);

  if (!(await dependencies.dirExists(targetProjectPath))) {
    throw new CliError(`Project not found: ${projectPath}`, 1);
  }
  const statePath = join(targetProjectPath, 'state.md');
  if (!(await dependencies.fileExists(statePath))) {
    throw new CliError(`Project state.md not found: ${statePath}`, 1);
  }

  const stateContent = await dependencies.readFile(statePath, 'utf8');
  const goal =
    readStateWorkflowMode(stateContent) === 'goal'
      ? await loadGoalCloseoutInputs(repoRoot, targetProjectPath, dependencies)
      : undefined;
  const result = await evaluateCloseout({
    stateContent,
    ...(goal === undefined ? {} : { goal }),
    autonomousFlag: options.autonomous,
    env: dependencies.env,
    resolveConfigured: async () => {
      const effective = await dependencies.resolveEffectiveConfig(
        repoRoot,
        join(context.home, '.oat'),
        dependencies.env,
      );
      const value = effective.resolved['workflow.postImplementSequence']?.value;
      return value !== null && value !== undefined;
    },
  });

  return { repoRoot, targetProjectPath, statePath, stateContent, result };
}

async function runCloseoutCheck(
  projectPath: string,
  options: { autonomous?: boolean },
  context: CommandContext,
  dependencies: CloseoutCheckDependencies,
): Promise<void> {
  try {
    const { result } = await checkProjectCloseout(
      projectPath,
      { autonomous: options.autonomous ?? false },
      context,
      dependencies,
    );

    if (result.status === 'incomplete') {
      const message = formatCloseoutRefusal(projectPath, result);
      if (context.json) {
        context.logger.json({
          status: 'incomplete',
          projectPath,
          invariant: result.invariant,
          detail: result.detail,
          route: result.route,
          nextOwner: result.nextOwner,
          inputs: result.inputs,
          message,
        });
      } else {
        context.logger.info(message);
      }
      // Fail closed: a caller that ignores the JSON still stops.
      process.exitCode = 1;
      return;
    }

    if (context.json) {
      context.logger.json({
        status: result.status,
        projectPath,
        invariant: null,
        route: null,
        nextOwner: null,
        inputs: result.inputs,
      });
    } else if (result.status === 'complete') {
      context.logger.info(
        `Closeout invariant satisfied for ${projectPath}: every stored step and the approval are recorded complete.`,
      );
    } else {
      context.logger.info(
        `Closeout invariant not required for ${projectPath}: no snapshot, and the closeout is not configured, autonomous, or lite.`,
      );
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 1;
  }
}

export function createProjectCloseoutCheckCommand(
  overrides: Partial<CloseoutCheckDependencies> = {},
): Command {
  const dependencies = {
    ...DEFAULT_CLOSEOUT_CHECK_DEPENDENCIES,
    ...overrides,
  };

  return new Command('closeout-check')
    .description(
      'Report whether a project closeout snapshot permits terminal completion (read-only)',
    )
    .argument('<project-path>', 'Project path to check')
    .option(
      '--autonomous',
      'Treat the closeout as autonomous (also implied by OAT_AUTONOMOUS=1)',
    )
    .action(
      async (
        projectPath: string,
        options: { autonomous?: boolean },
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runCloseoutCheck(projectPath, options, context, dependencies);
      },
    );
}
