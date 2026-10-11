import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';

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
  milestonePhaseScope,
  normalizeMilestoneId,
  type GoalDelivery,
  type ProjectState,
  type ReviewStatus,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';

import {
  deliveriesSharingMembers,
  deliveryEvidenceArtifacts,
  evaluateDeliveryReview,
  evaluateGateCarrier,
  evaluateSuccessor,
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

/** Code review rows whose Scope cell names a label (the bare id or `<id>: …`). */
export function reviewRowsFor(
  reviews: readonly ReviewStatus[],
  labels: readonly string[],
): ReviewStatus[] {
  const ids = labels.map((label) => label.toLowerCase());
  return reviews.filter((review) => {
    const cell = review.scope.trim().toLowerCase();
    return (
      review.type === 'code' &&
      ids.some((id) => cell === id || cell.startsWith(`${id}:`))
    );
  });
}

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

/**
 * Evaluate the delivery evidence for one subject. A registered delivery is
 * judged against its persisted member observations; a milestone (before
 * registration) against the project branch head.
 */
export async function evaluateSubjectEvidence(
  project: GoalDeliveryProject,
  subject: string,
  git: GitRunner,
): Promise<SubjectEvidenceReport> {
  const deliveries = project.state.deliveries ?? [];
  const delivery = deliveries.find((entry) => entry.delivery_id === subject);

  if (delivery) {
    const milestoneId = delivery.milestone;
    const scope = deliveryEffectiveScope(deliveries, delivery);
    const sharing = deliveriesSharingMembers(deliveries, delivery);
    const rows = reviewRowsFor(project.state.reviews, [
      delivery.delivery_id,
      ...sharing.map((entry) => entry.delivery_id),
    ]);
    const evidence: EvidenceScope = {
      repoRoot: project.repoRoot,
      projectDir: project.projectDir,
      evidenceArtifacts: deliveryEvidenceArtifacts(
        delivery,
        rows.map((row) => row.artifact),
        sharing,
      ),
    };
    const publishedHeads = delivery.members.map(
      (member) => member.observed_head,
    );
    const review = await evaluateDeliveryReview(git, evidence, delivery, scope);
    const exitEvaluation = await evaluateGateCarrier(
      milestoneId === null
        ? null
        : (project.state.milestoneGates?.[milestoneId]?.exit ?? null),
      {
        kind: 'code',
        scope,
        match: 'covers',
        overrideDisabled: project.exitGateDisabled,
      },
      { git, scope: evidence, publishedHeads },
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
  const scope = membership
    ? milestonePhaseScope(membership, milestoneId)
    : null;
  if (scope === null) {
    const [firstError] = membership?.errors ?? [];
    throw new CliError(
      firstError
        ? `Milestone membership is invalid (${firstError.code}: ${firstError.message}); repair it with oat-project-goal.`
        : `No ## Milestones row for ${milestoneId}.`,
      1,
    );
  }

  const head = await git.run(['rev-parse', '--verify', 'HEAD'], {
    cwd: project.repoRoot,
    allowFailure: true,
  });
  const publishedHead = head.code === 0 ? head.stdout.trim() : null;
  const rows = reviewRowsFor(project.state.reviews, [milestoneId]);
  const row = rows.at(-1) ?? null;
  const evidence: EvidenceScope = {
    repoRoot: project.repoRoot,
    projectDir: project.projectDir,
    evidenceArtifacts: rows
      .map((entry) => entry.artifact)
      .filter((artifact) => artifact !== '' && artifact !== '-'),
  };

  let review: ReviewEvaluation;
  if (row === null || row.artifact === '' || row.artifact === '-') {
    review = {
      artifact: null,
      disposition: row?.status ?? null,
      fresh: false,
      reason: `review-missing: no ${milestoneId} code review row names an artifact`,
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

  const exit = {
    ...(await evaluateGateCarrier(
      project.state.milestoneGates?.[milestoneId]?.exit ?? null,
      { kind: 'code', scope, overrideDisabled: project.exitGateDisabled },
      { git, scope: evidence, publishedHeads: [publishedHead] },
    )),
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
    .requiredOption('--project <path>', 'Goal project path')
    .requiredOption(
      '--subject <id>',
      'Milestone (mNN) or registered delivery (dNN) to evaluate',
    )
    .action(
      async (
        options: { project: string; subject: string },
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
