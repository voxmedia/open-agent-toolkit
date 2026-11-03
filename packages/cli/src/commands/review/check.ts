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
  findSupersededReviews,
  parseReviewTable,
  reviewSupersessionHeadPairs,
  type ReviewStatus,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';

import { resolveGitReviewHeadAncestry } from './head-ancestry';

/**
 * `oat review check`: a read-only, advisory check of a project's `## Reviews`
 * ledger. It reports `received` rows that a later recorded round supersedes
 * and Scope + Type + Artifact-filename keys that more than one row claims. It
 * keys events from ledger cells alone; an artifact's `oat_review_head_sha`
 * and `oat_gate_run_id` only corroborate. It never edits the ledger and its
 * diagnostics block no lifecycle step.
 */

/** Corroboration of one row by its artifact file, never a key input. */
export interface ReviewRowCorroboration {
  /** `present` when the Artifact cell names a readable file. */
  artifact: 'present' | 'unavailable';
  /**
   * `match` or `mismatch` against the artifact's `oat_review_head_sha`;
   * `unavailable` when the file, its head or the row's head is absent.
   */
  reviewedHead: 'match' | 'mismatch' | 'unavailable';
  /** The artifact's `oat_gate_run_id`, or `null` when unavailable. */
  gateRunId: string | null;
}

export interface ReviewLedgerRowReport {
  /** 1-based position among the parsed ledger rows. */
  row: number;
  scope: string;
  type: string;
  status: string;
  artifact: string;
  reviewedHead: string | null;
  invocation: string | null;
  gateTarget: string | null;
  corroboration: ReviewRowCorroboration;
}

export interface SupersededRowDiagnostic {
  code: 'superseded_received_row';
  severity: 'advisory';
  message: string;
  row: ReviewLedgerRowReport;
  supersededBy: ReviewLedgerRowReport;
  relation: 'same-head' | 'descendant-head';
}

export interface DuplicateEventKeyDiagnostic {
  code: 'duplicate_event_key';
  severity: 'advisory';
  message: string;
  key: { scope: string; type: string; artifactFilename: string };
  rows: ReviewLedgerRowReport[];
}

export type ReviewLedgerDiagnostic =
  | SupersededRowDiagnostic
  | DuplicateEventKeyDiagnostic;

export interface ReviewLedgerCheckResult {
  status: 'ok';
  advisory: true;
  project: string;
  rows: number;
  diagnostics: ReviewLedgerDiagnostic[];
  headAncestry: { asked: number; unresolved: number };
}

export interface CheckReviewLedgerOptions {
  repoRoot: string;
  projectPath: string;
  git?: GitRunner;
}

interface ReviewCheckDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  git: GitRunner;
}

const DEFAULT_DEPENDENCIES: ReviewCheckDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readOatLocalConfig,
  git: defaultGitRunner,
};

function cellOrNull(value: string | undefined): string | null {
  return value && value !== '-' ? value : null;
}

async function readArtifactFrontmatter(
  absoluteProjectPath: string,
  artifact: string,
): Promise<string | null> {
  if (artifact === '-' || artifact.trim() === '') {
    return null;
  }
  try {
    const content = await readFile(join(absoluteProjectPath, artifact), 'utf8');
    return getFrontmatterBlock(content) ?? '';
  } catch {
    return null;
  }
}

async function corroborate(
  absoluteProjectPath: string,
  row: ReviewStatus,
): Promise<ReviewRowCorroboration> {
  const frontmatter = await readArtifactFrontmatter(
    absoluteProjectPath,
    row.artifact,
  );
  if (frontmatter === null) {
    return {
      artifact: 'unavailable',
      reviewedHead: 'unavailable',
      gateRunId: null,
    };
  }
  const artifactHead = getFrontmatterField(frontmatter, 'oat_review_head_sha');
  const gateRunId = getFrontmatterField(frontmatter, 'oat_gate_run_id');
  const reviewedHead =
    !row.reviewedHead || !artifactHead || !/^[0-9a-f]{40}$/i.test(artifactHead)
      ? 'unavailable'
      : artifactHead.toLowerCase() === row.reviewedHead.toLowerCase()
        ? 'match'
        : 'mismatch';
  return {
    artifact: 'present',
    reviewedHead,
    gateRunId: cellOrNull(gateRunId ?? undefined),
  };
}

/**
 * The p07 event key: Scope + Type + Artifact filename, from ledger cells
 * alone. A row whose Artifact is `-` (a placeholder or a structured review that
 * writes no artifact) has no key and never forms a duplicate.
 */
export function reviewEventKey(
  scope: string,
  type: string,
  artifact: string,
): string | null {
  if (artifact === '-' || artifact.trim() === '') {
    return null;
  }
  return [
    scope.trim().toLowerCase(),
    type.trim().toLowerCase(),
    basename(normalizeToPosixPath(artifact.trim())),
  ].join('\u0000');
}

/** One ledger row as `oat review check` and `oat review resolve` report it. */
export async function buildReviewLedgerRowReport(
  absoluteProjectPath: string,
  row: ReviewStatus,
  index: number,
): Promise<ReviewLedgerRowReport> {
  return {
    row: index + 1,
    scope: row.scope,
    type: row.type,
    status: row.status,
    artifact: row.artifact,
    reviewedHead: row.reviewedHead ?? null,
    invocation: cellOrNull(row.invocation),
    gateTarget: cellOrNull(row.gateTarget),
    corroboration: await corroborate(absoluteProjectPath, row),
  };
}

function describeRow(report: ReviewLedgerRowReport): string {
  const lane = report.invocation
    ? `${report.invocation}${report.gateTarget ? `:${report.gateTarget}` : ''}`
    : '-';
  return `row ${report.row} (${report.scope}/${report.type} ${report.status}, ${report.artifact}, ${lane})`;
}

/**
 * Check one project's `## Reviews` ledger. Read-only: git is used only to
 * answer head ancestry (`git merge-base --is-ancestor`).
 */
export async function checkReviewLedger(
  options: CheckReviewLedgerOptions,
): Promise<ReviewLedgerCheckResult> {
  const git = options.git ?? defaultGitRunner;
  const absoluteProjectPath = isAbsolute(options.projectPath)
    ? options.projectPath
    : join(options.repoRoot, options.projectPath);
  const planContent = await readFile(
    join(absoluteProjectPath, 'plan.md'),
    'utf8',
  );
  const rows = parseReviewTable(planContent);

  const reports = await Promise.all(
    rows.map((row, index) =>
      buildReviewLedgerRowReport(absoluteProjectPath, row, index),
    ),
  );

  const pairs = reviewSupersessionHeadPairs(rows);
  const { ancestry, unresolved } = await resolveGitReviewHeadAncestry(
    git,
    options.repoRoot,
    pairs,
  );

  const diagnostics: ReviewLedgerDiagnostic[] = [];
  for (const entry of findSupersededReviews(rows, ancestry)) {
    const row = reports[entry.row] as ReviewLedgerRowReport;
    const supersededBy = reports[entry.supersededBy] as ReviewLedgerRowReport;
    diagnostics.push({
      code: 'superseded_received_row',
      severity: 'advisory',
      message: `${describeRow(row)} is superseded by ${describeRow(supersededBy)} at the ${entry.relation === 'same-head' ? 'same' : 'a descendant'} head; readers ignore it and the ledger is unchanged.`,
      row,
      supersededBy,
      relation: entry.relation,
    });
  }

  const byKey = new Map<string, ReviewLedgerRowReport[]>();
  for (const report of reports) {
    const key = reviewEventKey(report.scope, report.type, report.artifact);
    if (key === null) {
      continue;
    }
    byKey.set(key, [...(byKey.get(key) ?? []), report]);
  }
  for (const group of byKey.values()) {
    if (group.length < 2) {
      continue;
    }
    const first = group[0] as ReviewLedgerRowReport;
    const artifactFilename = basename(normalizeToPosixPath(first.artifact));
    diagnostics.push({
      code: 'duplicate_event_key',
      severity: 'advisory',
      message: `${group.length} rows (${group.map((report) => report.row).join(', ')}) claim the event key ${first.scope}/${first.type}/${artifactFilename}; one review event should have one row.`,
      key: { scope: first.scope, type: first.type, artifactFilename },
      rows: group,
    });
  }

  return {
    status: 'ok',
    advisory: true,
    project: normalizeToPosixPath(
      isAbsolute(options.projectPath)
        ? relative(options.repoRoot, options.projectPath)
        : options.projectPath,
    ),
    rows: rows.length,
    diagnostics,
    headAncestry: { asked: pairs.length, unresolved: unresolved.length },
  };
}

async function runReviewCheck(
  context: CommandContext,
  options: { project?: string },
  dependencies: ReviewCheckDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectPath =
      options.project ??
      (await dependencies.readOatLocalConfig(repoRoot)).activeProject ??
      null;
    if (!projectPath) {
      throw new Error(
        'No project to check: pass --project <path> or set an active project.',
      );
    }
    const result = await checkReviewLedger({
      repoRoot,
      projectPath,
      git: dependencies.git,
    });

    if (context.json) {
      context.logger.json(result);
    } else if (result.diagnostics.length === 0) {
      context.logger.info(
        `No review ledger diagnostics (${result.rows} rows checked).`,
      );
    } else {
      for (const diagnostic of result.diagnostics) {
        context.logger.info(`[${diagnostic.code}] ${diagnostic.message}`);
      }
      context.logger.info(
        'Advisory only: the ledger is unchanged and no lifecycle step is blocked.',
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
    process.exitCode = 1;
  }
}

export function createReviewCheckCommand(
  overrides: Partial<ReviewCheckDependencies> = {},
): Command {
  const dependencies: ReviewCheckDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('check')
    .description(
      'Report superseded and duplicate Reviews ledger rows (advisory)',
    )
    .option(
      '--project <path>',
      'Project path to check (defaults to the active project)',
    )
    .action(async (options: { project?: string }, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runReviewCheck(context, options, dependencies);
    });
}
