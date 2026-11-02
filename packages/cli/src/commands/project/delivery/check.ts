import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  getFrontmatterBlock,
  parseSkillGateOverrides,
  SKILL_GATE_OVERRIDE_DISABLED,
} from '@commands/shared/frontmatter';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import {
  getProjectState,
  GOAL_RECOVERY_STAGES,
  normalizePhaseId,
  selectPhaseUnits,
  milestonePhaseScope,
  normalizeMilestoneId,
  type GoalDelivery,
  type ProjectState,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import YAML from 'yaml';

import {
  deliveryEvidenceScope,
  evaluateDeliveryExitCarrier,
  evaluateDeliveryReview,
  evaluateGateCarrier,
  evaluateSuccessor,
  gateEvidenceArtifacts,
  latestDeliveryForMilestone,
  reviewRowsFor,
  type CarrierEvaluation,
  type EvidenceScope,
  type ReviewEvaluation,
} from './evidence';

/** The skill whose gate the milestone exit carrier records. */
const EXIT_GATE_SKILL = 'oat-project-implement';

export interface GoalDeliveryProject {
  repoRoot: string;
  projectPath: string;
  projectDir: string;
  statePath: string;
  stateContent: string;
  state: ProjectState;
  /** Whether the project override currently disables the exit gate. */
  exitGateDisabled: boolean;
}

export interface DeliveryProjectDependencies {
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  getProjectState: (projectPath: string) => Promise<ProjectState>;
}

export const DEFAULT_DELIVERY_PROJECT_DEPENDENCIES: DeliveryProjectDependencies =
  {
    resolveProjectRoot,
    readFile: (path, encoding) => readFile(path, encoding),
    getProjectState,
  };

/**
 * Load a goal project for the delivery commands through the control-plane
 * reader, so the registry, carriers, membership and Reviews rows are read
 * exactly as the router reads them. Fails closed for any other mode.
 */
export async function loadGoalDeliveryProject(
  project: string,
  cwd: string,
  dependencies: DeliveryProjectDependencies,
): Promise<GoalDeliveryProject> {
  const repoRoot = await dependencies.resolveProjectRoot(cwd);
  const projectPath = isAbsolute(project) ? project : join(repoRoot, project);
  const statePath = join(projectPath, 'state.md');
  let stateContent: string;
  try {
    stateContent = await dependencies.readFile(statePath, 'utf8');
  } catch {
    throw new CliError(`Project state.md not found: ${statePath}`, 1);
  }
  const state = await dependencies.getProjectState(projectPath);
  if (state.workflowMode !== 'goal') {
    throw new CliError(
      `Delivery evidence applies to goal projects; ${project} is in ${state.workflowMode} mode.`,
      1,
    );
  }
  const overrides = parseSkillGateOverrides(
    getFrontmatterBlock(stateContent) ?? '',
    statePath,
  );
  return {
    repoRoot,
    projectPath,
    projectDir: relative(repoRoot, projectPath).split(sep).join('/'),
    statePath,
    stateContent,
    state,
    exitGateDisabled:
      overrides.overrides[EXIT_GATE_SKILL] === SKILL_GATE_OVERRIDE_DISABLED,
  };
}

/**
 * A delivery's effective scope: its frozen scope plus every predecessor it
 * replaces through `covers_scope_of`. A cycle or missing link stops the
 * walk; the closeout coverage predicate reports those.
 */
export function deliveryEffectiveScope(
  deliveries: readonly GoalDelivery[],
  delivery: GoalDelivery,
): string[] {
  const scope: string[] = [];
  const seen = new Set<string>();
  let current: GoalDelivery | undefined = delivery;
  while (current !== undefined && !seen.has(current.delivery_id)) {
    seen.add(current.delivery_id);
    for (const phaseId of current.scope) {
      if (!scope.includes(phaseId)) scope.push(phaseId);
    }
    const predecessor: string | null = current.covers_scope_of;
    current =
      predecessor === null
        ? undefined
        : deliveries.find((entry) => entry.delivery_id === predecessor);
  }
  return scope;
}

export { reviewRowsFor } from './evidence';

export interface SubjectEvidenceReport {
  subject: string;
  kind: 'milestone' | 'delivery';
  milestone: string | null;
  scope: string[];
  publishedHeads: (string | null)[];
  review: ReviewEvaluation;
  /**
   * `source` names the carrier evaluated: `delivery check` judges the
   * milestone's working carrier (`oat_milestone_gates[mNN].exit`), while the
   * closeout boundary judges the delivery's persisted `exit_gate` binding.
   */
  exit: CarrierEvaluation & { source: ExitCarrierSource };
  /** Passed, fresh integrated review and an allowed, fresh exit carrier. */
  deliverable: boolean;
}

/** Which exit carrier an evaluation judged. */
export type ExitCarrierSource = 'milestone-carrier' | 'delivery-binding';

/** Read the raw record: the control-plane projection normalizes or drops IDs. */
function rawRecovery(content: string): Record<string, unknown> | null {
  const document = YAML.parseDocument(getFrontmatterBlock(content) ?? '', {
    uniqueKeys: true,
  });
  if (document.errors.length > 0) return null;
  const state: unknown = document.toJS();
  if (state === null || typeof state !== 'object' || Array.isArray(state))
    return null;
  const recovery: unknown = (state as Record<string, unknown>)
    .oat_goal_recovery;
  return recovery !== null &&
    typeof recovery === 'object' &&
    !Array.isArray(recovery)
    ? (recovery as Record<string, unknown>)
    : null;
}

async function phaseRecoveryScope(
  project: GoalDeliveryProject,
  milestone: string,
  milestoneScope: readonly string[],
  git: GitRunner,
): Promise<string[]> {
  const recovery = rawRecovery(project.stateContent);
  if (
    recovery === null ||
    recovery.milestone !== milestone ||
    typeof recovery.stage !== 'string' ||
    !GOAL_RECOVERY_STAGES.some((stage) => stage === recovery.stage) ||
    !(
      recovery.review_artifact === null ||
      (typeof recovery.review_artifact === 'string' &&
        recovery.review_artifact.trim() !== '')
    )
  ) {
    throw new CliError(
      'Missing, malformed or mismatched oat_goal_recovery; repair and commit the recovery record for this milestone.',
      1,
    );
  }
  if (recovery.delivery_id !== null) {
    throw new CliError(
      '--recovery requires delivery_id: null; use the ordinary --subject dNN check for a registered delivery recovery.',
      1,
    );
  }
  const phases = recovery.phase_ids;
  if (
    !Array.isArray(phases) ||
    phases.length === 0 ||
    phases.some(
      (id: unknown) =>
        typeof id !== 'string' ||
        normalizePhaseId(id) !== id ||
        !milestoneScope.includes(id),
    ) ||
    new Set(phases).size !== phases.length
  ) {
    throw new CliError(
      'Recovery phase_ids must be a nonempty, unique set of canonical phases owned by this milestone; repair and commit oat_goal_recovery.',
      1,
    );
  }
  const scope = phases as string[];
  const units = selectPhaseUnits(project.state.progress, scope);
  if (
    !isDeepStrictEqual(
      units.map((unit) => unit.phaseId),
      scope,
    )
  ) {
    throw new CliError(
      'Recovery phase_ids must follow plan document order and name existing phase units; repair and commit oat_goal_recovery.',
      1,
    );
  }
  if (
    units.some(
      (unit) =>
        unit.provisional === true ||
        unit.extracted !== undefined ||
        unit.total === 0 ||
        unit.completed !== unit.total,
    )
  ) {
    throw new CliError(
      'Recovery phases are not all accepted; finish the scoped implementation before checking delivery evidence.',
      1,
    );
  }
  const committed = await git.run(
    ['show', `HEAD:${project.projectDir}/state.md`],
    {
      cwd: project.repoRoot,
      allowFailure: true,
    },
  );
  if (
    committed.code !== 0 ||
    !isDeepStrictEqual(rawRecovery(committed.stdout), recovery)
  ) {
    throw new CliError(
      'oat_goal_recovery differs from HEAD or is not committed; commit the recovery record before checking its evidence.',
      1,
    );
  }
  return scope;
}

/**
 * Evaluate the delivery evidence for one subject. A registered delivery is
 * judged against its persisted member observations; a milestone (before
 * registration) against the project branch head.
 */
export async function evaluateSubjectEvidence(
  project: GoalDeliveryProject,
  subject: string,
  git: GitRunner,
  options: { recovery?: boolean } = {},
): Promise<SubjectEvidenceReport> {
  const deliveries = project.state.deliveries ?? [];
  const delivery = deliveries.find((entry) => entry.delivery_id === subject);

  if (delivery && options.recovery) {
    throw new CliError(
      '--recovery requires a milestone subject (mNN); use the ordinary --subject dNN check for a registered delivery.',
      1,
    );
  }

  if (delivery) {
    const milestoneId = delivery.milestone;
    const scope = deliveryEffectiveScope(deliveries, delivery);
    const workingCarrier =
      milestoneId === null
        ? null
        : (project.state.milestoneGates?.[milestoneId]?.exit ?? null);
    const evidence = deliveryEvidenceScope(
      { ...project, evidenceCarrier: workingCarrier },
      deliveries,
      delivery,
    );
    const publishedHeads = delivery.members.map(
      (member) => member.observed_head,
    );
    const review = await evaluateDeliveryReview(git, evidence, delivery, scope);
    const exitEvaluation = await evaluateDeliveryExitCarrier(
      workingCarrier,
      {
        kind: 'code',
        scope,
        match: 'covers',
        overrideDisabled: project.exitGateDisabled,
      },
      { git, scope: evidence, delivery },
    );
    const exit = { ...exitEvaluation, source: 'milestone-carrier' as const };
    return {
      subject,
      kind: 'delivery',
      milestone: milestoneId,
      scope,
      publishedHeads,
      review,
      exit,
      deliverable:
        review.fresh &&
        review.disposition === 'passed' &&
        exit.outcome === 'allowed' &&
        exit.freshness === 'fresh',
    };
  }

  const milestoneId = normalizeMilestoneId(subject);
  if (milestoneId === null) {
    throw new CliError(
      `Unknown delivery subject "${subject}": name a milestone (mNN) or a registered delivery (dNN).`,
      1,
    );
  }
  const membership = project.state.milestoneMembership;
  let scope = membership ? milestonePhaseScope(membership, milestoneId) : null;
  if (scope === null) {
    const [firstError] = membership?.errors ?? [];
    throw new CliError(
      firstError
        ? `Milestone membership is invalid (${firstError.code}: ${firstError.message}); repair it with oat-project-goal.`
        : `No ## Milestones row for ${milestoneId}.`,
      1,
    );
  }

  if (options.recovery) {
    scope = await phaseRecoveryScope(project, milestoneId, scope, git);
  }

  const head = await git.run(['rev-parse', '--verify', 'HEAD'], {
    cwd: project.repoRoot,
    allowFailure: true,
  });
  const publishedHead = head.code === 0 ? head.stdout.trim() : null;
  const rows = reviewRowsFor(project.state.reviews, [milestoneId]);
  const recoveryArtifact = options.recovery
    ? project.state.goalRecovery?.review_artifact
    : null;
  const latestRow = rows.at(-1) ?? null;
  const row =
    options.recovery &&
    (recoveryArtifact == null ||
      // Match source/archive identity only after selecting the governing row.
      latestRow?.artifact.replace(/^reviews\/archived\//, 'reviews/') !==
        recoveryArtifact.replace(/^reviews\/archived\//, 'reviews/'))
      ? null
      : latestRow;
  const milestoneDelivery = options.recovery
    ? undefined
    : latestDeliveryForMilestone(deliveries, milestoneId);
  const workingCarrier =
    project.state.milestoneGates?.[milestoneId]?.exit ?? null;
  const evidence: EvidenceScope =
    milestoneDelivery === undefined
      ? {
          repoRoot: project.repoRoot,
          projectDir: project.projectDir,
          evidenceArtifacts: [
            ...rows
              .map((entry) => entry.artifact)
              .filter((artifact) => artifact !== '' && artifact !== '-'),
            ...gateEvidenceArtifacts(project.state.reviews, workingCarrier),
          ],
        }
      : deliveryEvidenceScope(
          { ...project, evidenceCarrier: workingCarrier },
          deliveries,
          milestoneDelivery,
        );

  let review: ReviewEvaluation;
  if (row === null || row.artifact === '' || row.artifact === '-') {
    review = {
      artifact: null,
      disposition: row?.status ?? null,
      fresh: false,
      reason: `review-missing: no governing ${milestoneId} code review row names a matching artifact`,
      members: [],
    };
  } else {
    const successor = await evaluateSuccessor(
      git,
      evidence,
      row.reviewedHead ?? null,
      publishedHead,
    );
    review = {
      artifact: row.artifact,
      disposition: row.status,
      fresh: successor.fresh,
      reason: successor.fresh ? null : `${successor.code}: ${successor.reason}`,
      members: [],
    };
  }

  const expectedCarrier = {
    kind: 'code' as const,
    scope,
    overrideDisabled: project.exitGateDisabled,
  };
  const exitEvaluation = await evaluateGateCarrier(
    workingCarrier,
    expectedCarrier,
    {
      git,
      scope: evidence,
      publishedHeads: [publishedHead],
    },
  );
  const exit = {
    ...exitEvaluation,
    source: 'milestone-carrier' as const,
  };
  return {
    subject,
    kind: 'milestone',
    milestone: milestoneId,
    scope,
    publishedHeads: [publishedHead],
    review,
    exit,
    deliverable:
      review.fresh &&
      review.disposition?.toLowerCase() === 'passed' &&
      exit.outcome === 'allowed' &&
      exit.freshness === 'fresh',
  };
}

export interface DeliveryCheckDependencies extends DeliveryProjectDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  git: GitRunner;
}

const DEFAULT_CHECK_DEPENDENCIES: DeliveryCheckDependencies = {
  ...DEFAULT_DELIVERY_PROJECT_DEPENDENCIES,
  buildCommandContext,
  git: defaultGitRunner,
};

function formatEvidenceReport(report: SubjectEvidenceReport): string {
  const review = report.review.fresh
    ? `fresh (${report.review.disposition ?? 'no disposition'})`
    : `stale: ${report.review.reason ?? 'unknown'}`;
  const exit =
    report.exit.freshness === 'fresh'
      ? `${report.exit.outcome}, fresh`
      : `${report.exit.outcome}, stale: ${report.exit.reason ?? 'unknown'}`;
  return [
    `Delivery evidence for ${report.subject} (${report.kind}; scope ${report.scope.join(', ')}):`,
    `  integrated review: ${review}`,
    `  exit carrier (${report.exit.source}): ${exit}`,
    `  deliverable: ${report.deliverable ? 'yes' : 'no'}`,
  ].join('\n');
}

export function createProjectDeliveryCheckCommand(
  overrides: Partial<DeliveryCheckDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_CHECK_DEPENDENCIES, ...overrides };
  return new Command('check')
    .description(
      'Report integrated-review and milestone exit-carrier freshness for a goal milestone or delivery under the bookkeeping-successor contract (read-only; status undeliverable and exit 1 when not deliverable)',
    )
    .option(
      '--recovery',
      'Evaluate the committed phase-only recovery for the named milestone',
    )
    .requiredOption('--project <path>', 'Goal project path')
    .requiredOption(
      '--subject <id>',
      'Milestone (mNN) or registered delivery (dNN) to evaluate',
    )
    .action(
      async (
        options: { project: string; subject: string; recovery?: boolean },
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        try {
          const project = await loadGoalDeliveryProject(
            options.project,
            context.cwd,
            dependencies,
          );
          const report = await evaluateSubjectEvidence(
            project,
            options.subject,
            dependencies.git,
            { recovery: options.recovery },
          );
          if (context.json) {
            // `ok` means deliverable; an evaluated but refusing subject is
            // `undeliverable`, with the full report and exit 1.
            context.logger.json({
              status: report.deliverable ? 'ok' : 'undeliverable',
              ...report,
            });
          } else {
            context.logger.info(formatEvidenceReport(report));
          }
          // Fail closed: a caller that ignores the report still stops.
          process.exitCode = report.deliverable ? 0 : 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (context.json) {
            context.logger.json({ status: 'error', message });
          } else {
            context.logger.error(message);
          }
          process.exitCode = error instanceof CliError ? error.exitCode : 1;
        }
      },
    );
}
