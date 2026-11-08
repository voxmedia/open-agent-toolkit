import { readFile } from 'node:fs/promises';
import { basename, isAbsolute, join, relative } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  getFrontmatterBlock,
  getFrontmatterField,
} from '@commands/shared/frontmatter';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { readOatLocalConfig, type OatLocalConfig } from '@config/oat-config';
import { normalizeToPosixPath, resolveProjectRoot } from '@fs/paths';
import {
  parseReviewTable,
  type ReviewStatus,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';

import {
  buildReviewLedgerRowReport,
  describeReviewLedgerRow,
  evaluateReviewSupersession,
  reviewEventKey,
  type ReviewLedgerRowReport,
} from './check';

/**
 * `oat review resolve`: bind the review event a gate result names to its one
 * `## Reviews` row and validate it, so `oat-project-review-receive` consumes
 * exactly that event instead of the newest artifact. Read-only. It fails
 * closed: any mismatch, a missing, duplicate, superseded or already-processed
 * row, or a missing artifact exits nonzero with structured diagnostics.
 */

/** The event an `oat gate review` ok or blocked result names. */
export interface ReviewGateEvent {
  /** The result's `artifactPath`: repo-relative or absolute. */
  artifactPath: string;
  /** The result's `scope`. */
  scope: string;
  /** The result's `reviewType`. */
  type: string;
  /** The result's `runId`. */
  runId: string;
  /** The result's `reviewedHead`: the artifact head when present, else the dispatch HEAD. */
  reviewedHead: string;
}

export type ReviewEventDiagnosticCode =
  | 'artifact_not_active'
  | 'artifact_not_found'
  | 'ledger_unavailable'
  | 'row_not_bound'
  | 'duplicate_event_key'
  | 'row_not_received'
  | 'row_superseded'
  | 'scope_missing'
  | 'scope_mismatch'
  | 'type_missing'
  | 'type_mismatch'
  | 'artifact_mismatch'
  | 'reviewed_head_mismatch'
  | 'reviewed_head_invalid'
  | 'gate_run_id_missing'
  | 'gate_run_id_mismatch';

export interface ReviewEventDiagnostic {
  code: ReviewEventDiagnosticCode;
  severity: 'error';
  /** Where the disagreeing value was read. */
  source: 'event' | 'artifact' | 'ledger' | 'row';
  expected: string | null;
  actual: string | null;
  message: string;
  /** For `row_superseded`: the later row that supersedes the bound row. */
  supersededBy?: ReviewLedgerRowReport;
}

type FieldCheck = 'match' | 'mismatch' | 'unavailable';

export interface ReviewEventChecks {
  scope: FieldCheck;
  type: FieldCheck;
  artifact: FieldCheck;
  /**
   * The row's Reviewed Head against the event's `reviewedHead`, by exact
   * equality: `match`, `mismatch` (any other full SHA, an ancestor included,
   * or a cell that is not a full SHA), or `unavailable` when the cell is `-`
   * or the ledger has no Reviewed Head column (accepted).
   */
  reviewedHead: FieldCheck;
  gateRunId: FieldCheck;
  /** The bound row's Status: `match` only for `received`. */
  rowStatus: FieldCheck;
  /**
   * p07 supersession of the bound `received` row: `current`, `superseded`
   * (refused), or `unavailable` when no `received` row is bound.
   */
  supersession: 'current' | 'superseded' | 'unavailable';
}

export interface ReviewEventResolution {
  status: 'ok' | 'refused';
  project: string;
  event: ReviewGateEvent;
  /** The event's artifact, repo-relative: what receive consumes when `ok`. */
  path: string;
  row: ReviewLedgerRowReport | null;
  checks: ReviewEventChecks;
  diagnostics: ReviewEventDiagnostic[];
}

export interface ResolveReviewEventOptions {
  repoRoot: string;
  projectPath: string;
  event: ReviewGateEvent;
  /** Answers head ancestry for p07's descendant-head supersession clause. */
  git?: GitRunner;
}

interface ReviewResolveDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  git: GitRunner;
}

const DEFAULT_DEPENDENCIES: ReviewResolveDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readOatLocalConfig,
  git: defaultGitRunner,
};

const FULL_SHA = /^[0-9a-f]{40}$/i;
const REVIEW_TYPES = new Set(['code', 'artifact']);

function sameCell(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

function diagnostic(
  code: ReviewEventDiagnosticCode,
  source: ReviewEventDiagnostic['source'],
  expected: string | null,
  actual: string | null,
  message: string,
): ReviewEventDiagnostic {
  return { code, severity: 'error', source, expected, actual, message };
}

/**
 * Resolve one gate event against a project's `## Reviews` ledger and the
 * artifact it names. Read-only. The row's Reviewed Head must equal the event's
 * `reviewedHead` exactly; only a `-` cell (or a ledger with no Reviewed Head
 * column) is accepted as unavailable, and a cell that is not a full SHA is
 * refused, never read as `-`. The
 * bound row must be `received` and not superseded under p07's rule.
 */
export async function resolveReviewEvent(
  options: ResolveReviewEventOptions,
): Promise<ReviewEventResolution> {
  const { event } = options;
  const absoluteProjectPath = isAbsolute(options.projectPath)
    ? options.projectPath
    : join(options.repoRoot, options.projectPath);
  const absoluteArtifactPath = isAbsolute(event.artifactPath)
    ? event.artifactPath
    : join(options.repoRoot, event.artifactPath);
  const projectRelativeArtifact = normalizeToPosixPath(
    relative(absoluteProjectPath, absoluteArtifactPath),
  );
  const repoRelativeArtifact = normalizeToPosixPath(
    relative(options.repoRoot, absoluteArtifactPath),
  );
  const artifactFilename = basename(projectRelativeArtifact);
  const diagnostics: ReviewEventDiagnostic[] = [];
  const checks: ReviewEventChecks = {
    scope: 'unavailable',
    type: 'unavailable',
    artifact: 'unavailable',
    reviewedHead: 'unavailable',
    gateRunId: 'unavailable',
    rowStatus: 'unavailable',
    supersession: 'unavailable',
  };

  // The event names an active artifact: a top-level file of the project's
  // `reviews/` directory. An archived or foreign path was already consumed or
  // belongs to another project.
  const isActive = /^reviews\/[^/]+\.md$/.test(projectRelativeArtifact);
  if (!isActive) {
    diagnostics.push(
      diagnostic(
        'artifact_not_active',
        'event',
        'reviews/<file>.md',
        projectRelativeArtifact,
        `The event artifact ${repoRelativeArtifact} is not an active top-level review of this project.`,
      ),
    );
  }

  const artifactContent = await readOptional(absoluteArtifactPath);
  const frontmatter =
    artifactContent === null
      ? null
      : (getFrontmatterBlock(artifactContent) ?? '');
  if (artifactContent === null) {
    diagnostics.push(
      diagnostic(
        'artifact_not_found',
        'artifact',
        repoRelativeArtifact,
        null,
        `The event artifact ${repoRelativeArtifact} does not exist.`,
      ),
    );
  }

  let artifactScopeAgrees = true;
  let artifactTypeAgrees = true;
  if (frontmatter !== null) {
    const artifactScope = getFrontmatterField(frontmatter, 'oat_review_scope');
    const artifactType = getFrontmatterField(frontmatter, 'oat_review_type');
    const runId = getFrontmatterField(frontmatter, 'oat_gate_run_id');
    // Every gate review artifact carries both fields (the reviewer's
    // frontmatter contract writes them), so an absent one fails closed like
    // an absent run ID rather than skipping the comparison.
    if (!artifactScope) {
      artifactScopeAgrees = false;
      diagnostics.push(
        diagnostic(
          'scope_missing',
          'artifact',
          event.scope,
          null,
          `The artifact carries no oat_review_scope, so it cannot be the event of scope ${event.scope}.`,
        ),
      );
    } else if (!sameCell(artifactScope, event.scope)) {
      artifactScopeAgrees = false;
      diagnostics.push(
        diagnostic(
          'scope_mismatch',
          'artifact',
          event.scope,
          artifactScope,
          `The artifact's oat_review_scope ${artifactScope} is not the event scope ${event.scope}.`,
        ),
      );
    }
    if (!artifactType) {
      artifactTypeAgrees = false;
      diagnostics.push(
        diagnostic(
          'type_missing',
          'artifact',
          event.type,
          null,
          `The artifact carries no oat_review_type, so it cannot be the event of type ${event.type}.`,
        ),
      );
    } else if (!sameCell(artifactType, event.type)) {
      artifactTypeAgrees = false;
      diagnostics.push(
        diagnostic(
          'type_mismatch',
          'artifact',
          event.type,
          artifactType,
          `The artifact's oat_review_type ${artifactType} is not the event type ${event.type}.`,
        ),
      );
    }
    if (!runId) {
      checks.gateRunId = 'mismatch';
      diagnostics.push(
        diagnostic(
          'gate_run_id_missing',
          'artifact',
          event.runId,
          null,
          `The artifact carries no oat_gate_run_id, so it cannot be the event of gate run ${event.runId}.`,
        ),
      );
    } else if (runId !== event.runId) {
      checks.gateRunId = 'mismatch';
      diagnostics.push(
        diagnostic(
          'gate_run_id_mismatch',
          'artifact',
          event.runId,
          runId,
          `The artifact's oat_gate_run_id ${runId} is not the event run ${event.runId}.`,
        ),
      );
    } else {
      checks.gateRunId = 'match';
    }
  }

  const planContent = await readOptional(join(absoluteProjectPath, 'plan.md'));
  let row: ReviewLedgerRowReport | null = null;
  if (planContent === null) {
    diagnostics.push(
      diagnostic(
        'ledger_unavailable',
        'ledger',
        'plan.md',
        null,
        'The project has no readable plan.md, so no Reviews row can be bound to the event.',
      ),
    );
  } else {
    // The raw Reviewed Head cell: the parser's `reviewedHead` omits a `-`
    // placeholder and an abbreviated or malformed head alike.
    const rows = parseReviewTable(planContent, {
      rawReviewedHead: true,
      dataLine: true,
    });
    const eventKey = reviewEventKey(
      event.scope,
      event.type,
      projectRelativeArtifact,
    );
    const bound: Array<{ row: ReviewStatus; index: number }> = [];
    const sameFilename: Array<{ row: ReviewStatus; index: number }> = [];
    rows.forEach((candidate, index) => {
      if (
        eventKey !== null &&
        reviewEventKey(candidate.scope, candidate.type, candidate.artifact) ===
          eventKey
      ) {
        bound.push({ row: candidate, index });
      }
      if (
        candidate.artifact !== '-' &&
        basename(normalizeToPosixPath(candidate.artifact.trim())) ===
          artifactFilename
      ) {
        sameFilename.push({ row: candidate, index });
      }
    });

    // Bind by the event key. When nothing binds, a single row that claims the
    // same artifact filename is the event's row under another Scope or Type:
    // report that disagreement rather than only "no row".
    const target =
      bound.length === 1
        ? bound[0]
        : bound.length === 0 && sameFilename.length === 1
          ? sameFilename[0]
          : undefined;
    if (bound.length > 1) {
      diagnostics.push(
        diagnostic(
          'duplicate_event_key',
          'ledger',
          '1 row',
          `${bound.length} rows (${bound.map((entry) => entry.row.dataLine ?? entry.index + 1).join(', ')})`,
          `${bound.length} Reviews rows claim the event key ${event.scope}/${event.type}/${artifactFilename}; one event must have one row.`,
        ),
      );
    } else if (!target) {
      diagnostics.push(
        diagnostic(
          'row_not_bound',
          'ledger',
          `${event.scope}/${event.type}/${artifactFilename}`,
          null,
          `No Reviews row is bound to the event key ${event.scope}/${event.type}/${artifactFilename}.`,
        ),
      );
    }

    if (target) {
      row = await buildReviewLedgerRowReport(
        absoluteProjectPath,
        target.row,
        target.index,
      );
      const rowNumber = row.row;
      const rowScopeAgrees = sameCell(target.row.scope, event.scope);
      const rowTypeAgrees = sameCell(target.row.type, event.type);
      if (!rowScopeAgrees) {
        diagnostics.push(
          diagnostic(
            'scope_mismatch',
            'row',
            event.scope,
            target.row.scope,
            `Reviews row ${rowNumber} records Scope ${target.row.scope}, not the event scope ${event.scope}.`,
          ),
        );
      }
      if (!rowTypeAgrees) {
        diagnostics.push(
          diagnostic(
            'type_mismatch',
            'row',
            event.type,
            target.row.type,
            `Reviews row ${rowNumber} records Type ${target.row.type}, not the event type ${event.type}.`,
          ),
        );
      }
      checks.scope =
        rowScopeAgrees && artifactScopeAgrees ? 'match' : 'mismatch';
      checks.type = rowTypeAgrees && artifactTypeAgrees ? 'match' : 'mismatch';

      const rowArtifact = normalizeToPosixPath(target.row.artifact.trim());
      if (rowArtifact === projectRelativeArtifact) {
        checks.artifact = 'match';
      } else {
        checks.artifact = 'mismatch';
        diagnostics.push(
          diagnostic(
            'artifact_mismatch',
            'row',
            projectRelativeArtifact,
            rowArtifact,
            `Reviews row ${rowNumber} names ${rowArtifact}, not the event artifact ${projectRelativeArtifact}.`,
          ),
        );
      }

      const rowHeadCell = target.row.reviewedHeadCell;
      const rowHead = rowHeadCell?.toLowerCase();
      const eventHead = event.reviewedHead.toLowerCase();
      if (rowHead === undefined || rowHead === '-') {
        checks.reviewedHead = 'unavailable';
      } else if (!FULL_SHA.test(rowHead)) {
        checks.reviewedHead = 'mismatch';
        diagnostics.push(
          diagnostic(
            'reviewed_head_invalid',
            'row',
            eventHead,
            rowHeadCell ?? null,
            `Reviews row ${rowNumber}'s Reviewed Head "${rowHeadCell}" is neither a full 40-character commit SHA nor \`-\`, so it cannot equal the event's reviewed head ${eventHead}.`,
          ),
        );
      } else if (rowHead === eventHead) {
        checks.reviewedHead = 'match';
      } else {
        checks.reviewedHead = 'mismatch';
        diagnostics.push(
          diagnostic(
            'reviewed_head_mismatch',
            'row',
            eventHead,
            rowHead,
            `Reviews row ${rowNumber}'s Reviewed Head ${rowHead} is not the event's reviewed head ${eventHead}.`,
          ),
        );
      }

      // Review-provide Step 9 records the event as `received`; any other
      // status means it was already processed (or never recorded), and a
      // superseded `received` row is one every other reader ignores (p07).
      if (target.row.status.trim().toLowerCase() !== 'received') {
        checks.rowStatus = 'mismatch';
        diagnostics.push(
          diagnostic(
            'row_not_received',
            'row',
            'received',
            target.row.status,
            `Reviews row ${rowNumber} is ${target.row.status}, not received: the event was already processed or never recorded.`,
          ),
        );
      } else {
        checks.rowStatus = 'match';
        const evaluation = await evaluateReviewSupersession(
          options.git ?? defaultGitRunner,
          options.repoRoot,
          rows,
        );
        const entry = evaluation.supersessions.find(
          (candidate) => candidate.row === target.index,
        );
        if (!entry) {
          checks.supersession = 'current';
        } else {
          checks.supersession = 'superseded';
          const supersededBy = await buildReviewLedgerRowReport(
            absoluteProjectPath,
            rows[entry.supersededBy] as ReviewStatus,
            entry.supersededBy,
          );
          diagnostics.push({
            ...diagnostic(
              'row_superseded',
              'row',
              'current',
              `row ${supersededBy.row}`,
              `Reviews row ${rowNumber} is superseded by ${describeReviewLedgerRow(supersededBy)} at ${entry.relation === 'same-head' ? 'the same' : 'a descendant'} head; readers ignore it, so receive must not consume this event.`,
            ),
            supersededBy,
          });
        }
      }
    }
  }

  return {
    status: diagnostics.length === 0 ? 'ok' : 'refused',
    project: normalizeToPosixPath(
      relative(options.repoRoot, absoluteProjectPath),
    ),
    event,
    path: repoRelativeArtifact,
    row,
    checks,
    diagnostics,
  };
}

interface ResolveCommandOptions {
  project?: string;
  artifact?: string;
  scope?: string;
  type?: string;
  runId?: string;
  reviewedHead?: string;
}

function requireEvent(options: ResolveCommandOptions): ReviewGateEvent {
  const missing = (
    [
      ['--artifact', options.artifact],
      ['--scope', options.scope],
      ['--type', options.type],
      ['--run-id', options.runId],
      ['--reviewed-head', options.reviewedHead],
    ] as const
  )
    .filter(([, value]) => !value?.trim())
    .map(([flag]) => flag);
  if (missing.length > 0) {
    throw new Error(
      `A gate event needs ${missing.join(', ')} (from the gate result's artifactPath, scope, reviewType, runId and reviewedHead).`,
    );
  }
  const type = (options.type as string).trim();
  if (!REVIEW_TYPES.has(type)) {
    throw new Error(`--type must be code or artifact, not ${type}.`);
  }
  const reviewedHead = (options.reviewedHead as string).trim();
  if (!FULL_SHA.test(reviewedHead)) {
    throw new Error(
      `--reviewed-head must be a full 40-character commit SHA, not ${reviewedHead}.`,
    );
  }
  return {
    artifactPath: (options.artifact as string).trim(),
    scope: (options.scope as string).trim(),
    type,
    runId: (options.runId as string).trim(),
    reviewedHead: reviewedHead.toLowerCase(),
  };
}

async function runReviewResolve(
  context: CommandContext,
  options: ResolveCommandOptions,
  dependencies: ReviewResolveDependencies,
): Promise<void> {
  try {
    const event = requireEvent(options);
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectPath =
      options.project ??
      (await dependencies.readOatLocalConfig(repoRoot)).activeProject ??
      null;
    if (!projectPath) {
      throw new Error(
        'No project to resolve against: pass --project <path> or set an active project.',
      );
    }
    const result = await resolveReviewEvent({
      repoRoot,
      projectPath,
      event,
      git: dependencies.git,
    });

    if (context.json) {
      context.logger.json(result);
    } else if (result.status === 'ok') {
      context.logger.info(
        `Gate event resolved: ${result.path} (row ${result.row?.row}, reviewed head ${result.checks.reviewedHead}).`,
      );
    } else {
      for (const entry of result.diagnostics) {
        context.logger.error(`[${entry.code}] ${entry.message}`);
      }
      context.logger.error(
        'Refused: receive must not consume this event. Rerun the gate or repair the named record, then resolve again.',
      );
    }
    process.exitCode = result.status === 'ok' ? 0 : 1;
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

export function createReviewResolveCommand(
  overrides: Partial<ReviewResolveDependencies> = {},
): Command {
  const dependencies: ReviewResolveDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('resolve')
    .description(
      'Bind a gate result event to its Reviews row and validate it (fails closed)',
    )
    .option('--project <path>', 'Project path (defaults to the active project)')
    .option('--artifact <path>', "The gate result's artifactPath")
    .option('--scope <scope>', "The gate result's scope")
    .option('--type <type>', "The gate result's reviewType (code or artifact)")
    .option('--run-id <id>', "The gate result's runId")
    .option(
      '--reviewed-head <sha>',
      "The gate result's reviewedHead (full SHA)",
    )
    .action(async (options: ResolveCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runReviewResolve(context, options, dependencies);
    });
}
