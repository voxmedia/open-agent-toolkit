/**
 * Gate convergence marking (p08, Outcome 5).
 *
 * A sequence is the successive runs of one configured gate on one subject. The
 * gate links the run it just validated to the earlier runs of its sequence
 * through records that already exist: the project's review artifacts (active
 * and archived) for the earlier runs' findings, `plan.md`'s Milestones table
 * for a goal exit run's milestone, and `state.md`'s plan carriers for a goal
 * plan gate's amendment boundary. It writes nothing and never rewrites a
 * reviewer's finding; it only reports how this run's findings relate to the
 * previous run's.
 *
 * Sequence identity is the pair (review type, subject):
 *
 * - goal milestone exit run: a `code` gate run whose scope is `final` or whose
 *   artifact names more than one phase (`oat_review_phase_ids`), when every
 *   named phase belongs to one milestone — the subject is that milestone,
 *   whatever scope token the run used;
 * - goal plan gate run: an `artifact` gate run on scope `plan` — the subject is
 *   the plan amendment open when the run was written, identified by the set of
 *   plan approvals recorded before it. Approvals are read from records that
 *   survive a re-approval: every `**Brief approved:**` and
 *   `**Milestone mNN approved:**` line the brief keeps under
 *   `## Delivery endpoint and authority`, timed by the matching
 *   `oat_milestone_gates.<m>.plan` carrier's `decided_at` when that carrier
 *   still names the approved commit, and otherwise only by the line's date. A
 *   run that falls inside a date-only approval's day cannot be placed; it is
 *   never linked to another run. Runs on different amendments never share a
 *   sequence;
 * - every other run, and every run outside goal mode: the review scope.
 *
 * The gate target is not part of the identity: one configured gate may select
 * a different target on a rerun.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  getFrontmatterBlock,
  parseGeneratedTime,
} from '@commands/shared/frontmatter';
import { normalizeToPosixPath } from '@fs/paths';
import {
  normalizePhaseId,
  readMilestoneMembership,
} from '@open-agent-toolkit/control-plane';
import YAML from 'yaml';

import type {
  ReviewFindingRecord,
  ReviewGateVerdict,
  Severity,
} from './review-verdict';

export type ConvergenceSubjectKind = 'milestone' | 'plan-amendment' | 'scope';

export interface ConvergenceSubject {
  kind: ConvergenceSubjectKind;
  /** The milestone id, `plan`, or the review scope. */
  value: string;
  /**
   * `plan-amendment` only: the commit the latest plan approval before the run
   * approved, or `null` when no plan approval precedes it.
   */
  amendmentAfter?: string | null;
  /**
   * `plan-amendment` only: set when the run falls inside the day of a
   * date-only approval, so its amendment cannot be established. Such a run is
   * never linked to another run.
   */
  undetermined?: true;
}

export interface ConvergencePreviousRun {
  runId: string;
  artifactPath: string;
  generatedAt: string;
}

export interface ConvergenceFindingMark {
  id: string;
  severity: Severity;
  title: string;
  location: string | null;
  key: string;
  mark: 'new' | 'carried_over';
  /** The previous run's finding this one carries over. */
  previous?: { runId: string; id: string; severity: Severity };
}

export interface ConvergenceResolvedFinding {
  id: string;
  severity: Severity;
  title: string;
  location: string | null;
  key: string;
}

export type ConvergenceUnavailableReason =
  | 'previous_artifact_unparsable'
  | 'previous_findings_incomplete'
  | 'findings_incomplete';

export interface GateConvergence {
  sequence: {
    reviewType: ReviewGateVerdict['reviewType'];
    subject: ConvergenceSubject;
    /** 1-based position of this run in its sequence. */
    run: number;
    previousRun: ConvergencePreviousRun | null;
  };
  status: 'compared' | 'unavailable';
  reason?: ConvergenceUnavailableReason;
  counts?: { new: number; carriedOver: number; resolved: number };
  findings?: ConvergenceFindingMark[];
  resolved?: ConvergenceResolvedFinding[];
}

// ---------------------------------------------------------------------------
// Stable finding key

const BOOKKEEPING_MARK = /\(bookkeeping\)/gi;

/**
 * The location part of the key: the reviewer's location with a trailing line
 * reference removed (`:430`, `:534-544`, `:12:3`, `#L10-L20`), lower-cased.
 */
export function findingLocationKey(location: string | null): string | null {
  if (location === null) {
    return null;
  }
  const normalized = location
    .trim()
    .replace(/#L\d+(?:-L?\d+)?$/i, '')
    .replace(/(?::\d+(?:[-–]\d+)?)+$/, '')
    .trim()
    .toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * The title part of the key: the reviewer's title without the advisory
 * `(bookkeeping)` mark, NFKC-normalized, lower-cased, with every run of
 * characters that are not letters or digits collapsed to one space.
 */
export function findingTitleKey(title: string): string {
  return title
    .replace(BOOKKEEPING_MARK, ' ')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * The documented stable finding key: `<location key or ->::<title key>`. IDs
 * and severities are not part of it, because a reviewer renumbers findings on
 * every run and may regrade a carried-over one.
 */
export function stableFindingKey(
  finding: Pick<ReviewFindingRecord, 'title' | 'location'>,
): string {
  return `${findingLocationKey(finding.location) ?? '-'}::${findingTitleKey(finding.title)}`;
}

/** The first line number of a location's trailing line reference. */
export function findingLocationLine(location: string | null): number | null {
  const match =
    location === null
      ? null
      : (/#L(\d+)(?:-L?\d+)?$/i.exec(location.trim()) ??
        /:(\d+)(?:[-–]\d+)?(?::\d+)?$/.exec(location.trim()));
  return match ? Number(match[1]) : null;
}

const TITLE_STOP_WORDS = new Set([
  'about',
  'after',
  'all',
  'also',
  'and',
  'any',
  'are',
  'but',
  'can',
  'does',
  'for',
  'from',
  'has',
  'have',
  'into',
  'its',
  'not',
  'only',
  'still',
  'than',
  'that',
  'the',
  'then',
  'this',
  'when',
  'with',
]);

/**
 * Title words that can corroborate a reworded finding: title-key words of
 * three or more characters, outside the common words above and without a
 * digit. A token with a digit is an ID or a number (`p08`, `t04`, `m03`, `12`):
 * findings about one phase or one record share it whether or not they are the
 * same finding, so it never corroborates.
 */
function significantTitleWords(title: string): Set<string> {
  return new Set(
    findingTitleKey(title)
      .split(' ')
      .filter(
        (word) =>
          word.length >= 3 &&
          !/\p{N}/u.test(word) &&
          !TITLE_STOP_WORDS.has(word),
      ),
  );
}

/** Shared significant title words a reworded finding must keep. */
export const REWORDED_MIN_SHARED_TITLE_WORDS = 2;
/** How far a reworded finding's line may move, when both runs give one. */
export const REWORDED_MAX_LINE_DISTANCE = 20;

/**
 * Whether two findings that share a file and a severity are one reworded
 * finding rather than two findings that happen to sit in one file: their
 * titles share at least two significant words (`significantTitleWords`) and,
 * when both locations give a line, the lines are at most 20 apart.
 */
function corroboratesRewording(
  current: ReviewFindingRecord,
  previous: ReviewFindingRecord,
): boolean {
  const previousWords = significantTitleWords(previous.title);
  let shared = 0;
  for (const word of significantTitleWords(current.title)) {
    if (previousWords.has(word)) {
      shared += 1;
    }
  }
  if (shared < REWORDED_MIN_SHARED_TITLE_WORDS) {
    return false;
  }
  const currentLine = findingLocationLine(current.location);
  const previousLine = findingLocationLine(previous.location);
  return (
    currentLine === null ||
    previousLine === null ||
    Math.abs(currentLine - previousLine) <= REWORDED_MAX_LINE_DISTANCE
  );
}

function uniqueIndexes<T>(
  items: readonly T[],
  candidates: readonly number[],
  keyOf: (item: T) => string | null,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const index of candidates) {
    const key = keyOf(items[index]!);
    if (key !== null) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const unique = new Map<string, number>();
  for (const index of candidates) {
    const key = keyOf(items[index]!);
    if (key !== null && counts.get(key) === 1) {
      unique.set(key, index);
    }
  }
  return unique;
}

/**
 * Mark each current finding new or carried over against the previous run's
 * findings, deterministically and without merging:
 *
 * 1. Exact pass: a current and a previous finding with the same stable key
 *    match, when that key occurs exactly once among the unmatched findings of
 *    each run.
 * 2. Location pass (a reworded finding): among the findings still unmatched, a
 *    current and a previous finding with the same location key and the same
 *    severity match, when that pair of values occurs exactly once on each side
 *    and the rewording is corroborated (`corroboratesRewording`): sharing a
 *    file is not enough. A finding without a location never matches in this
 *    pass.
 * 3. Everything else: an unmatched current finding is `new`; an unmatched
 *    previous finding is `resolved`.
 *
 * A key shared by two findings of one run is ambiguous and never matched, so
 * no two findings are ever merged into one.
 */
export function markFindings(
  current: readonly ReviewFindingRecord[],
  previous: readonly ReviewFindingRecord[],
  previousRunId: string,
): {
  findings: ConvergenceFindingMark[];
  resolved: ConvergenceResolvedFinding[];
  counts: { new: number; carriedOver: number; resolved: number };
} {
  const matchOf = new Map<number, number>();
  const unmatchedCurrent = () =>
    current.map((_, index) => index).filter((index) => !matchOf.has(index));
  const unmatchedPrevious = () => {
    const taken = new Set(matchOf.values());
    return previous
      .map((_, index) => index)
      .filter((index) => !taken.has(index));
  };

  const passes: {
    keyOf: (finding: ReviewFindingRecord) => string | null;
    accepts: (
      current: ReviewFindingRecord,
      previous: ReviewFindingRecord,
    ) => boolean;
  }[] = [
    { keyOf: (finding) => stableFindingKey(finding), accepts: () => true },
    {
      keyOf: (finding) => {
        const location = findingLocationKey(finding.location);
        return location === null ? null : `${finding.severity}::${location}`;
      },
      accepts: corroboratesRewording,
    },
  ];
  for (const { keyOf, accepts } of passes) {
    const currentKeys = uniqueIndexes(current, unmatchedCurrent(), keyOf);
    const previousKeys = uniqueIndexes(previous, unmatchedPrevious(), keyOf);
    for (const [key, currentIndex] of currentKeys) {
      const previousIndex = previousKeys.get(key);
      if (
        previousIndex !== undefined &&
        accepts(current[currentIndex]!, previous[previousIndex]!)
      ) {
        matchOf.set(currentIndex, previousIndex);
      }
    }
  }

  const findings = current.map((finding, index): ConvergenceFindingMark => {
    const previousIndex = matchOf.get(index);
    const base = {
      id: finding.id,
      severity: finding.severity,
      title: finding.title,
      location: finding.location,
      key: stableFindingKey(finding),
    };
    if (previousIndex === undefined) {
      return { ...base, mark: 'new' };
    }
    const carried = previous[previousIndex]!;
    return {
      ...base,
      mark: 'carried_over',
      previous: {
        runId: previousRunId,
        id: carried.id,
        severity: carried.severity,
      },
    };
  });
  const resolved = unmatchedPrevious().map((index) => {
    const finding = previous[index]!;
    return {
      id: finding.id,
      severity: finding.severity,
      title: finding.title,
      location: finding.location,
      key: stableFindingKey(finding),
    };
  });
  const carriedOver = findings.filter(
    (finding) => finding.mark === 'carried_over',
  ).length;
  return {
    findings,
    resolved,
    counts: {
      new: findings.length - carriedOver,
      carriedOver,
      resolved: resolved.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Sequence subject

/**
 * One recorded plan approval. `start` and `end` bound when it happened, in
 * epoch milliseconds: equal for an approval timed by its carrier's
 * `decided_at`, and the whole calendar day in any time zone for one known only
 * by the date on its approval line.
 */
export interface PlanApproval {
  /** The approved commit, or `carrier:<milestone>` when none is recorded. */
  id: string;
  start: number;
  end: number;
}

export interface SequenceProjectRecords {
  goal: boolean;
  /** Phase id to milestone id, from a Milestones table with no errors. */
  phaseMilestones: ReadonlyMap<string, string>;
  /** Every recorded plan approval. */
  planApprovals: readonly PlanApproval[];
}

export interface SequenceRun {
  reviewType: ReviewGateVerdict['reviewType'];
  scope: string;
  phaseIds: readonly string[];
  generatedTime: number;
}

/**
 * The plan approvals recorded before `time`, latest last, or `null` when an
 * approval known only by its date may fall on either side of `time`.
 */
function approvalsBefore(
  approvals: readonly PlanApproval[],
  time: number,
): PlanApproval[] | null {
  const before: PlanApproval[] = [];
  for (const approval of approvals) {
    if (approval.end < time) {
      before.push(approval);
    } else if (approval.start < time) {
      return null;
    }
  }
  return before.sort(
    (left, right) => left.end - right.end || left.id.localeCompare(right.id),
  );
}

/** The subject a run belongs to, as the module comment defines it. */
export function sequenceSubject(
  run: SequenceRun,
  records: SequenceProjectRecords,
): ConvergenceSubject {
  const scope = run.scope.trim();
  if (records.goal && run.reviewType === 'code') {
    const milestones = new Set(
      run.phaseIds.map((phaseId) => records.phaseMilestones.get(phaseId)),
    );
    const [milestone] = [...milestones];
    if (
      (scope.toLowerCase() === 'final' || run.phaseIds.length > 1) &&
      run.phaseIds.length > 0 &&
      milestones.size === 1 &&
      milestone !== undefined
    ) {
      return { kind: 'milestone', value: milestone };
    }
  }
  if (
    records.goal &&
    run.reviewType === 'artifact' &&
    scope.toLowerCase() === 'plan'
  ) {
    const before = approvalsBefore(records.planApprovals, run.generatedTime);
    if (before === null) {
      return {
        kind: 'plan-amendment',
        value: 'plan',
        amendmentAfter: null,
        undetermined: true,
      };
    }
    // The latest approval identifies the whole set: approvals before a later
    // run include every approval before an earlier one, and any approval
    // between the two runs ends after all of the earlier run's approvals.
    return {
      kind: 'plan-amendment',
      value: 'plan',
      amendmentAfter: before.at(-1)?.id ?? null,
    };
  }
  return { kind: 'scope', value: scope };
}

/** The sequence identity, or `null` for a run that is never linked. */
function subjectKey(
  reviewType: ReviewGateVerdict['reviewType'],
  subject: ConvergenceSubject,
): string | null {
  if (subject.undetermined) {
    return null;
  }
  return [
    reviewType,
    subject.kind,
    subject.value,
    subject.amendmentAfter ?? '',
  ].join('\0');
}

// ---------------------------------------------------------------------------
// Project records and earlier runs

function plainRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readFrontmatter(content: string): Record<string, unknown> {
  const block = getFrontmatterBlock(content);
  if (!block) {
    return {};
  }
  try {
    return plainRecord(YAML.parse(block)) ?? {};
  } catch {
    return {};
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function timeValue(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  const text = stringValue(value);
  return text === null ? Number.NaN : parseGeneratedTime(text);
}

/** `oat_review_phase_ids` as normalized phase ids (a list or a comma string). */
export function readPhaseIds(value: unknown): string[] {
  const tokens = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.replace(/^\[|\]$/g, '').split(',')
      : [];
  return tokens
    .map((token) => (typeof token === 'string' ? token.trim() : ''))
    .map((token) => normalizePhaseId(token.replace(/^`|`$/g, '')))
    .filter((token): token is string => token !== null);
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const APPROVAL_LINE =
  /^- \*\*(?:Brief|Milestone m\d+) approved:\*\* (\d{4}-\d{2}-\d{2}) by .+ at `?([0-9a-f]{7,40})`?\s*$/i;

/** The approval lines under the brief's `## Delivery endpoint and authority`. */
function readApprovalLines(plan: string): { date: string; commit: string }[] {
  const lines: { date: string; commit: string }[] = [];
  let inSection = false;
  for (const line of plan.split(/\r?\n/)) {
    if (/^##\s/.test(line)) {
      inSection = /^##\s+Delivery endpoint and authority\s*$/i.test(line);
      continue;
    }
    const match = inSection ? APPROVAL_LINE.exec(line.trim()) : null;
    if (match) {
      lines.push({ date: match[1]!, commit: match[2]!.toLowerCase() });
    }
  }
  return lines;
}

function sameCommit(left: string, right: string): boolean {
  return left.startsWith(right) || right.startsWith(left);
}

/**
 * Every recorded plan approval. An approval line is timed by the plan carrier
 * that still names its commit; a re-approval of the same milestone overwrites
 * that carrier, so an earlier line keeps only its date, widened to cover the
 * day in any time zone (UTC-12 to UTC+14). A carrier no line names is still an
 * approval, timed by its `decided_at`. Only an approved carrier
 * (`status: allowed`) is approval evidence; a blocked carrier is never one.
 */
function readPlanApprovals(
  state: Record<string, unknown>,
  plan: string,
): PlanApproval[] {
  const carriers: { milestone: string; commit: string | null; at: number }[] =
    [];
  for (const [milestone, gates] of Object.entries(
    plainRecord(state['oat_milestone_gates']) ?? {},
  )) {
    const carrier = plainRecord(plainRecord(gates)?.['plan']);
    const at = timeValue(carrier?.['decided_at']);
    if (
      !carrier ||
      !Number.isFinite(at) ||
      stringValue(carrier['status']) !== 'allowed'
    ) {
      continue;
    }
    const commit =
      stringValue(plainRecord(carrier['subject'])?.['ref']) ??
      stringValue(carrier['reviewed_head']);
    carriers.push({ milestone, commit: commit?.toLowerCase() ?? null, at });
  }

  const approvals: PlanApproval[] = [];
  const timedCarriers = new Set<number>();
  for (const line of readApprovalLines(plan)) {
    const carrierIndex = carriers.findIndex(
      (carrier) =>
        carrier.commit !== null && sameCommit(carrier.commit, line.commit),
    );
    if (carrierIndex >= 0) {
      timedCarriers.add(carrierIndex);
      const at = carriers[carrierIndex]!.at;
      approvals.push({ id: line.commit, start: at, end: at });
      continue;
    }
    const day = Date.parse(`${line.date}T00:00:00Z`);
    if (Number.isFinite(day)) {
      approvals.push({
        id: line.commit,
        start: day - 14 * HOUR_MS,
        end: day + DAY_MS + 12 * HOUR_MS,
      });
    }
  }
  carriers.forEach((carrier, index) => {
    if (!timedCarriers.has(index)) {
      approvals.push({
        id: carrier.commit ?? `carrier:${carrier.milestone}`,
        start: carrier.at,
        end: carrier.at,
      });
    }
  });
  return approvals;
}

export async function readSequenceProjectRecords(
  projectDir: string,
): Promise<SequenceProjectRecords> {
  const state = readFrontmatter(
    (await readOptional(join(projectDir, 'state.md'))) ?? '',
  );
  const goal = stringValue(state['oat_workflow_mode']) === 'goal';
  const phaseMilestones = new Map<string, string>();
  if (!goal) {
    return { goal, phaseMilestones, planApprovals: [] };
  }

  const plan = await readOptional(join(projectDir, 'plan.md'));
  const planApprovals = readPlanApprovals(state, plan ?? '');
  if (plan !== null) {
    const implementation =
      (await readOptional(join(projectDir, 'implementation.md'))) ?? '';
    const membership = readMilestoneMembership(plan, implementation);
    if (membership.present && membership.errors.length === 0) {
      for (const row of membership.milestones) {
        for (const phaseId of row.phaseIds) {
          phaseMilestones.set(phaseId, row.milestoneId);
        }
      }
    }
  }
  return { goal, phaseMilestones, planApprovals };
}

export interface GateRunArtifact {
  /** Repository-relative path. */
  path: string;
  content: string;
  runId: string;
  generatedAt: string;
  generatedTime: number;
  reviewType: ReviewGateVerdict['reviewType'];
  scope: string;
  phaseIds: string[];
}

function reviewTypeValue(value: unknown): ReviewGateVerdict['reviewType'] {
  return value === 'code' || value === 'artifact' ? value : 'unknown';
}

/**
 * Every gate-run review artifact of the project, active (`reviews/`) and
 * archived (`reviews/archived/`). A file without a gate run id, the gate
 * invocation marker or a valid `oat_generated_at` is not a gate run.
 */
export async function listGateRunArtifacts(
  repoRoot: string,
  projectPath: string,
): Promise<GateRunArtifact[]> {
  const runs: GateRunArtifact[] = [];
  for (const directory of ['reviews', 'reviews/archived']) {
    const relativeDir = normalizeToPosixPath(join(projectPath, directory));
    let names: string[];
    try {
      names = (
        await readdir(join(repoRoot, relativeDir), { withFileTypes: true })
      )
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => entry.name)
        .sort();
    } catch {
      continue;
    }
    for (const name of names) {
      const path = `${relativeDir}/${name}`;
      const content = await readOptional(join(repoRoot, path));
      if (content === null) {
        continue;
      }
      const frontmatter = readFrontmatter(content);
      const runId = stringValue(frontmatter['oat_gate_run_id']);
      const generatedAt = stringValue(frontmatter['oat_generated_at']);
      const generatedTime = timeValue(frontmatter['oat_generated_at']);
      if (
        runId === null ||
        generatedAt === null ||
        !Number.isFinite(generatedTime) ||
        stringValue(frontmatter['oat_review_invocation']) !== 'gate'
      ) {
        continue;
      }
      runs.push({
        path,
        content,
        runId,
        generatedAt,
        generatedTime,
        reviewType: reviewTypeValue(frontmatter['oat_review_type']),
        scope: stringValue(frontmatter['oat_review_scope']) ?? '',
        phaseIds: readPhaseIds(frontmatter['oat_review_phase_ids']),
      });
    }
  }
  return runs;
}

// ---------------------------------------------------------------------------
// The gate entry point

export interface CurrentGateRun {
  /** Repository-relative artifact path. */
  artifactPath: string;
  content: string;
  runId: string;
  generatedTime: number;
  verdict: Pick<
    ReviewGateVerdict,
    'reviewType' | 'scope' | 'findings' | 'findingsComplete'
  >;
}

export type ParsePreviousRun = (
  run: GateRunArtifact,
) => Promise<Pick<ReviewGateVerdict, 'findings' | 'findingsComplete'>>;

/**
 * Convergence for the run the gate just validated, or `null` when it is the
 * first run of its sequence (the gate result then carries no convergence
 * fields). Earlier runs of the sequence are those written before this one; the
 * previous run is the latest of them, and it is the only run compared.
 */
export async function computeGateConvergence(options: {
  repoRoot: string;
  projectPath: string;
  current: CurrentGateRun;
  parsePrevious: ParsePreviousRun;
}): Promise<GateConvergence | null> {
  const { current } = options;
  const records = await readSequenceProjectRecords(
    join(options.repoRoot, options.projectPath),
  );
  const currentRun: SequenceRun = {
    reviewType: current.verdict.reviewType,
    scope: current.verdict.scope ?? '',
    phaseIds: readPhaseIds(
      readFrontmatter(current.content)['oat_review_phase_ids'],
    ),
    generatedTime: current.generatedTime,
  };
  const subject = sequenceSubject(currentRun, records);
  const key = subjectKey(currentRun.reviewType, subject);
  if (key === null) {
    return null;
  }

  const earlier = (
    await listGateRunArtifacts(options.repoRoot, options.projectPath)
  )
    .filter(
      (run) =>
        run.runId !== current.runId &&
        run.path !== current.artifactPath &&
        (run.generatedTime < current.generatedTime ||
          (run.generatedTime === current.generatedTime &&
            run.path < current.artifactPath)),
    )
    // Each earlier run's subject is derived from its own records and time. For
    // a plan run that means the latest approval before *it*: equal to this
    // run's only when no plan approval was recorded between the two runs.
    .filter(
      (run) =>
        subjectKey(run.reviewType, sequenceSubject(run, records)) === key,
    )
    .sort(
      (left, right) =>
        left.generatedTime - right.generatedTime ||
        left.path.localeCompare(right.path),
    );
  const previous = earlier.at(-1);
  if (!previous) {
    return null;
  }

  const sequence: GateConvergence['sequence'] = {
    reviewType: currentRun.reviewType,
    subject,
    run: earlier.length + 1,
    previousRun: {
      runId: previous.runId,
      artifactPath: previous.path,
      generatedAt: previous.generatedAt,
    },
  };

  let previousVerdict: Awaited<ReturnType<ParsePreviousRun>>;
  try {
    previousVerdict = await options.parsePrevious(previous);
  } catch {
    return {
      sequence,
      status: 'unavailable',
      reason: 'previous_artifact_unparsable',
    };
  }
  if (!previousVerdict.findingsComplete) {
    return {
      sequence,
      status: 'unavailable',
      reason: 'previous_findings_incomplete',
    };
  }
  if (!current.verdict.findingsComplete) {
    return { sequence, status: 'unavailable', reason: 'findings_incomplete' };
  }

  const marked = markFindings(
    current.verdict.findings,
    previousVerdict.findings,
    previous.runId,
  );
  return {
    sequence,
    status: 'compared',
    counts: marked.counts,
    findings: marked.findings,
    resolved: marked.resolved,
  };
}

/**
 * The tokens the gate appends to its one-line project-log record of the run
 * (`oat gate review` structural entry). A first run adds none. The previous
 * run is named by its 8-character prefix: the log's idempotency scan matches
 * any word that contains a full run id, so a full id here would read as that
 * earlier run's entry.
 */
export function convergenceLogTokens(convergence: GateConvergence): string {
  const subject = `${convergence.sequence.subject.kind}:${convergence.sequence.subject.value}`;
  const result =
    convergence.status === 'compared' && convergence.counts
      ? `new:${convergence.counts.new},carried:${convergence.counts.carriedOver},resolved:${convergence.counts.resolved}`
      : `unavailable:${convergence.reason ?? 'unknown'}`;
  const previous = convergence.sequence.previousRun?.runId.slice(0, 8) ?? '-';
  return ` convergence=${result} sequence=${subject} sequence_run=${convergence.sequence.run} previous_run=${previous}`;
}
