import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { readOatLocalConfig, type OatLocalConfig } from '@config/oat-config';
import { normalizeToPosixPath, resolveProjectRoot } from '@fs/paths';
import {
  hasPlanReviewSkipLine,
  milestonePhaseScope,
  normalizeMilestoneId,
  normalizePhaseId,
  parseProvisionalPhaseIds,
  parseReviewTable,
  readJournalRecords,
  readMilestoneMembership,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';

/**
 * `oat review pending`: list the required reviews of a PR scope whose latest
 * `## Reviews` row is still `pending`, the required phase reviews that have no
 * row at all, and the ones a recorded waiver covers.
 * Read-only and decision-free: it exits 0 whatever it lists, and the PR skills
 * decide what to do with the list.
 *
 * Required keys: the `code` row of every scope phase that exists in the plan
 * (`mNN` expands through the Milestones table, `project` covers every phase),
 * plus `plan | artifact` for a `project` scope unless the plan-review skip
 * line is recorded. `spec`, `design`, `final` and `mNN` rows are never
 * required here: `final` stays with pr-final Step 2, `mNN` with `oat project
 * delivery check`.
 *
 * A required phase key with no `## Reviews` row is `missing` when its phase is
 * concrete, and unlisted while the phase is `**Provisional:** yes`. The
 * `plan | artifact` key has no phase and is listed only from its row.
 *
 * A waiver is one line under the journal's `## Reviews and Gates`:
 * `**Review waived:** <scope> <type> · **Waived by:** <user> · **Date:** <date>
 * · **Reason:** <text>`. It moves a required key whose latest row is
 * `pending` from `pending` to `waived`, or a `missing` key from `missing` to
 * `waived`; the ledger itself is unchanged, and no other reader treats the
 * line as a review.
 */

export interface RequiredReviewEntry {
  scope: string;
  type: string;
  /** Status of the key's latest `## Reviews` row, or `null` with no row. */
  status: string | null;
  /** 1-based position of that row among the parsed ledger rows. */
  row: number | null;
}

export type WaiverUnappliedReason =
  | 'not-required'
  | 'review-recorded'
  | 'no-row'
  | 'missing-reason';

export interface ReviewWaiverRecord {
  /** 1-based line in `implementation.md`. */
  line: number;
  scope: string;
  type: string;
  waivedBy: string | null;
  date: string | null;
  reason: string | null;
  applied: boolean;
  /** Why the waiver does not apply in this scope, or `null` when applied. */
  unapplied: WaiverUnappliedReason | null;
}

export interface WaivedReviewEntry extends RequiredReviewEntry {
  waiver: Pick<ReviewWaiverRecord, 'line' | 'waivedBy' | 'date' | 'reason'>;
}

export interface PendingReviewScope {
  requested: string;
  kind: 'phases' | 'milestone' | 'project';
  /** Scope phases that exist in the plan, in plan order. */
  phases: string[];
  /** Requested phase ids the plan does not declare; they are never listed. */
  ignored: string[];
  /** Whether `plan | artifact` is required. */
  plan: 'required' | 'skipped' | 'not-in-scope';
}

export interface PendingReviewsResult {
  status: 'ok';
  project: string;
  scope: PendingReviewScope;
  required: RequiredReviewEntry[];
  pending: RequiredReviewEntry[];
  /** Required keys of concrete phases with no `## Reviews` row. */
  missing: RequiredReviewEntry[];
  waived: WaivedReviewEntry[];
  waivers: ReviewWaiverRecord[];
}

export interface ListPendingReviewsOptions {
  repoRoot: string;
  projectPath: string;
  scope: string;
}

interface ReviewPendingDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
}

const DEFAULT_DEPENDENCIES: ReviewPendingDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readOatLocalConfig,
};

const REVIEWS_AND_GATES = 'Reviews and Gates';
/** The waiver label, optionally as a list item (tolerates formatter output). */
const WAIVER_LINE = /^[ \t]*(?:[-*+][ \t]+)?\*\*Review waived:\*\*[ \t]*(.*)$/;
const WAIVER_KEY = /^`?([^\s`·]+)`?[ \t]+`?([^\s`·]+)`?/;

function labelValue(body: string, label: string): string | null {
  const match = new RegExp(
    `\\*\\*${label}:\\*\\*[ \\t]*([^·]*?)[ \\t]*(?:·|$)`,
  ).exec(body);
  const value = match?.[1]?.trim();
  return value ? value : null;
}

function reasonValue(body: string): string | null {
  const value = /\*\*Reason:\*\*[ \t]*(.*)$/.exec(body)?.[1]?.trim();
  return value ? value : null;
}

function normalizeScope(scope: string): string {
  const trimmed = scope.trim().replaceAll('`', '');
  return normalizePhaseId(trimmed.toLowerCase()) ?? trimmed.toLowerCase();
}

function keyOf(scope: string, type: string): string {
  return `${normalizeScope(scope)}\u0000${type.trim().toLowerCase()}`;
}

/** Every `## Phase` heading the plan declares, in document order. */
function planPhaseIds(planContent: string): string[] {
  const ids: string[] = [];
  for (const section of readJournalRecords(planContent).sections) {
    const id = section.phase?.declaredPhaseId;
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

function resolveScope(
  requested: string,
  planContent: string,
  implementationContent: string,
): PendingReviewScope {
  const trimmed = requested.trim();
  const planPhases = planPhaseIds(planContent);

  if (trimmed.toLowerCase() === 'project') {
    return {
      requested: trimmed,
      kind: 'project',
      phases: planPhases,
      ignored: [],
      plan: hasPlanReviewSkipLine(planContent) ? 'skipped' : 'required',
    };
  }

  if (/^m\d+$/i.test(trimmed)) {
    const milestoneId = normalizeMilestoneId(trimmed.toLowerCase());
    const membership = readMilestoneMembership(
      planContent,
      implementationContent,
    );
    const phases = milestonePhaseScope(membership, milestoneId);
    if (phases === null) {
      const detail = membership.errors.map((error) => error.message);
      throw new Error(
        `Scope ${trimmed} does not resolve through the Milestones table${detail.length > 0 ? `: ${detail.join(' ')}` : '.'}`,
      );
    }
    return {
      requested: trimmed,
      kind: 'milestone',
      phases: planPhases.filter((id) => phases.includes(id)),
      ignored: [],
      plan: 'not-in-scope',
    };
  }

  const tokens = trimmed
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token !== '');
  const ids: string[] = [];
  for (const token of tokens) {
    const id = normalizePhaseId(token.toLowerCase());
    if (id === null) {
      throw new Error(
        `--scope must be project, one milestone (mNN) or a comma list of phase ids (pNN), not ${requested}.`,
      );
    }
    ids.push(id);
  }
  if (ids.length === 0) {
    throw new Error(
      '--scope must be project, one milestone (mNN) or a comma list of phase ids (pNN).',
    );
  }
  return {
    requested: trimmed,
    kind: 'phases',
    phases: planPhases.filter((id) => ids.includes(id)),
    ignored: [...new Set(ids.filter((id) => !planPhases.includes(id)))],
    plan: 'not-in-scope',
  };
}

interface ParsedWaiverLine {
  line: number;
  scope: string;
  type: string;
  waivedBy: string | null;
  date: string | null;
  reason: string | null;
}

/** Waiver lines anywhere in the journal's `## Reviews and Gates` section. */
function readWaiverLines(implementationContent: string): ParsedWaiverLine[] {
  const records = readJournalRecords(implementationContent);
  const waivers: ParsedWaiverLine[] = [];
  for (const section of records.sections) {
    if (section.text !== REVIEWS_AND_GATES) {
      continue;
    }
    for (let line = section.line + 1; line <= section.endLine; line += 1) {
      if (!records.recordMask[line - 1]) {
        continue;
      }
      const body = WAIVER_LINE.exec(records.lines[line - 1] ?? '')?.[1];
      const key = body === undefined ? null : WAIVER_KEY.exec(body);
      if (body === undefined || !key?.[1] || !key[2]) {
        continue;
      }
      waivers.push({
        line,
        scope: normalizeScope(key[1]),
        type: key[2].trim().toLowerCase(),
        waivedBy: labelValue(body, 'Waived by'),
        date: labelValue(body, 'Date'),
        reason: reasonValue(body),
      });
    }
  }
  return waivers;
}

/**
 * Compute the pending and waived required reviews of one scope. Read-only.
 * Throws only when the plan cannot be read or the scope does not resolve.
 */
export async function listPendingReviews(
  options: ListPendingReviewsOptions,
): Promise<PendingReviewsResult> {
  const absoluteProjectPath = isAbsolute(options.projectPath)
    ? options.projectPath
    : join(options.repoRoot, options.projectPath);
  const planContent = await readFile(
    join(absoluteProjectPath, 'plan.md'),
    'utf8',
  );
  let implementationContent = '';
  try {
    implementationContent = await readFile(
      join(absoluteProjectPath, 'implementation.md'),
      'utf8',
    );
  } catch {
    implementationContent = '';
  }

  const scope = resolveScope(options.scope, planContent, implementationContent);

  const latest = new Map<string, { status: string; row: number }>();
  parseReviewTable(planContent).forEach((row, index) => {
    latest.set(keyOf(row.scope, row.type), {
      status: row.status.trim(),
      row: index + 1,
    });
  });

  const requiredKeys = [
    ...scope.phases.map((phase) => ({ scope: phase, type: 'code' })),
    ...(scope.plan === 'required' ? [{ scope: 'plan', type: 'artifact' }] : []),
  ];
  const required: RequiredReviewEntry[] = requiredKeys.map((key) => {
    const row = latest.get(keyOf(key.scope, key.type));
    return {
      scope: key.scope,
      type: key.type,
      status: row?.status ?? null,
      row: row?.row ?? null,
    };
  });
  const requiredByKey = new Map(
    required.map((entry) => [keyOf(entry.scope, entry.type), entry]),
  );
  const provisional = parseProvisionalPhaseIds(planContent);
  /** A key with no row the listing reports: a concrete phase's review. */
  const isMissing = (entry: RequiredReviewEntry): boolean =>
    entry.status === null &&
    entry.type === 'code' &&
    !provisional.has(normalizeScope(entry.scope));

  const waivers: ReviewWaiverRecord[] = readWaiverLines(
    implementationContent,
  ).map((waiver) => {
    const entry = requiredByKey.get(keyOf(waiver.scope, waiver.type));
    const unapplied: WaiverUnappliedReason | null =
      entry === undefined
        ? 'not-required'
        : entry.status === null && !isMissing(entry)
          ? 'no-row'
          : entry.status !== null && entry.status !== 'pending'
            ? 'review-recorded'
            : waiver.reason === null
              ? 'missing-reason'
              : null;
    return { ...waiver, applied: unapplied === null, unapplied };
  });

  const pending: RequiredReviewEntry[] = [];
  const missing: RequiredReviewEntry[] = [];
  const waived: WaivedReviewEntry[] = [];
  for (const entry of required) {
    const listed =
      entry.status === 'pending' ? pending : isMissing(entry) ? missing : null;
    if (listed === null) {
      continue;
    }
    const waiver = waivers.find(
      (candidate) =>
        candidate.applied &&
        keyOf(candidate.scope, candidate.type) ===
          keyOf(entry.scope, entry.type),
    );
    if (waiver === undefined) {
      listed.push(entry);
    } else {
      waived.push({
        ...entry,
        waiver: {
          line: waiver.line,
          waivedBy: waiver.waivedBy,
          date: waiver.date,
          reason: waiver.reason,
        },
      });
    }
  }

  return {
    status: 'ok',
    project: normalizeToPosixPath(
      isAbsolute(options.projectPath)
        ? relative(options.repoRoot, options.projectPath)
        : options.projectPath,
    ),
    scope,
    required,
    pending,
    missing,
    waived,
    waivers,
  };
}

async function runReviewPending(
  context: CommandContext,
  options: { project?: string; scope?: string },
  dependencies: ReviewPendingDependencies,
): Promise<void> {
  try {
    if (!options.scope?.trim()) {
      throw new Error(
        'Pass --scope project, --scope <mNN> or --scope <pNN[,pNN…]>.',
      );
    }
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectPath =
      options.project ??
      (await dependencies.readOatLocalConfig(repoRoot)).activeProject ??
      null;
    if (!projectPath) {
      throw new Error(
        'No project to list: pass --project <path> or set an active project.',
      );
    }
    const result = await listPendingReviews({
      repoRoot,
      projectPath,
      scope: options.scope,
    });

    if (context.json) {
      context.logger.json(result);
    } else {
      const label = (entry: RequiredReviewEntry): string =>
        entry.row === null
          ? `${entry.scope} ${entry.type} (no row)`
          : `${entry.scope} ${entry.type} (row ${entry.row})`;
      if (result.pending.length === 0 && result.missing.length === 0) {
        context.logger.info(
          `No required review is pending for scope ${result.scope.requested}.`,
        );
      }
      if (result.pending.length > 0) {
        context.logger.info(
          `Pending required reviews for scope ${result.scope.requested}: ${result.pending.map(label).join(', ')}.`,
        );
      }
      if (result.missing.length > 0) {
        context.logger.info(
          `Required reviews with no Reviews row for scope ${result.scope.requested}: ${result.missing.map(label).join(', ')}.`,
        );
      }
      for (const entry of result.waived) {
        context.logger.info(
          `Waived: ${label(entry)} by ${entry.waiver.waivedBy ?? 'unknown'}: ${entry.waiver.reason}`,
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
    process.exitCode = 1;
  }
}

export function createReviewPendingCommand(
  overrides: Partial<ReviewPendingDependencies> = {},
): Command {
  const dependencies: ReviewPendingDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('pending')
    .description(
      'List required reviews still pending for a PR scope (read-only)',
    )
    .option('--project <path>', 'Project path (defaults to the active project)')
    .option(
      '--scope <scope>',
      'project, one milestone (mNN), or a comma list of phase ids (pNN)',
    )
    .action(
      async (
        options: { project?: string; scope?: string },
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runReviewPending(context, options, dependencies);
      },
    );
}
