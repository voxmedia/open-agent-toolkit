import { posix } from 'node:path';

import { SYNTHESIS_HEADING_PREFIX } from '@commands/project/log/append';
import type { GitRunner } from '@commands/project/sync/git';
import {
  recordLineMask,
  type GoalDelivery,
  type MilestoneGateCarrier,
} from '@open-agent-toolkit/control-plane';
import YAML from 'yaml';

/**
 * The shared delivery-evidence evaluator (design "Delivery registry and
 * closeout boundary", bookkeeping-successor freshness, A2). `delivery
 * refresh`, `delivery check` and the closeout boundary all derive freshness
 * here; nothing else compares revisions.
 *
 * Evidence keeps the revision actually reviewed. Evidence reviewed at R covers
 * a published head H when R = H, or when R is an ancestor of H and every
 * intervening commit — merge-introduced changes included — changes only
 * permitted bookkeeping. Each commit is inspected on its own, so a substantive
 * change followed by its revert is never a bookkeeping successor. Missing
 * objects, failed inspection, unknown paths and disallowed edits fail closed.
 */

/** Where the evidence lives: the project and the review artifacts it records. */
export interface EvidenceScope {
  /** Absolute repository root; every Git command runs here. */
  repoRoot: string;
  /** Repository-relative POSIX path of the project directory. */
  projectDir: string;
  /**
   * Project-relative review artifacts belonging to the evidence being
   * recorded or archived (`reviews/…`). Each also permits its archived
   * counterpart (`reviews/archived/<name>`), so receive's archival move is
   * bookkeeping.
   */
  evidenceArtifacts: readonly string[];
}

export type FreshnessFailureCode =
  | 'missing-revision'
  | 'missing-object'
  | 'not-ancestor'
  | 'inspection-failed'
  | 'disallowed-path'
  | 'substantive-change'
  | 'base-changed';

export type SuccessorResult =
  | {
      fresh: true;
      code: 'identical' | 'bookkeeping-successor';
      reason: string;
      /** Every commit inspected between the reviewed and published heads. */
      inspected: string[];
    }
  | {
      fresh: false;
      code: FreshnessFailureCode;
      reason: string;
      commit?: string;
      path?: string;
    };

type Verdict = { ok: true } | { ok: false; reason: string };

const OK: Verdict = { ok: true };

function refuse(reason: string): Verdict {
  return { ok: false, reason };
}

// ---------------------------------------------------------------------------
// Git inspection
// ---------------------------------------------------------------------------

async function resolveCommit(
  git: GitRunner,
  repoRoot: string,
  revision: string,
): Promise<string | null> {
  const result = await git.run(
    ['rev-parse', '--verify', '--quiet', `${revision}^{commit}`],
    { cwd: repoRoot, allowFailure: true },
  );
  const sha = result.stdout.trim();
  return result.code === 0 && /^[0-9a-f]{40}$/.test(sha) ? sha : null;
}

async function readBlob(
  git: GitRunner,
  repoRoot: string,
  commit: string,
  path: string,
): Promise<string | null> {
  const result = await git.run(['show', `${commit}:${path}`], {
    cwd: repoRoot,
    allowFailure: true,
  });
  return result.code === 0 ? result.stdout : null;
}

/**
 * Whether `published` covers evidence reviewed at `reviewed` under the
 * bookkeeping-successor contract.
 */
export async function evaluateSuccessor(
  git: GitRunner,
  scope: EvidenceScope,
  reviewed: string | null | undefined,
  published: string | null | undefined,
): Promise<SuccessorResult> {
  if (!reviewed || !published) {
    return {
      fresh: false,
      code: 'missing-revision',
      reason: !reviewed
        ? 'no reviewed revision is recorded'
        : 'no published head is observed',
    };
  }

  let reviewedSha: string | null;
  let publishedSha: string | null;
  try {
    reviewedSha = await resolveCommit(git, scope.repoRoot, reviewed);
    publishedSha = await resolveCommit(git, scope.repoRoot, published);
  } catch (error) {
    return inspectionFailed(error);
  }
  if (reviewedSha === null || publishedSha === null) {
    return {
      fresh: false,
      code: 'missing-object',
      reason: `commit ${reviewedSha === null ? reviewed : published} is not available locally`,
    };
  }
  if (reviewedSha === publishedSha) {
    return {
      fresh: true,
      code: 'identical',
      reason: 'the published head is the reviewed revision',
      inspected: [],
    };
  }

  try {
    const ancestry = await git.run(
      ['merge-base', '--is-ancestor', reviewedSha, publishedSha],
      { cwd: scope.repoRoot, allowFailure: true },
    );
    if (ancestry.code === 1) {
      return {
        fresh: false,
        code: 'not-ancestor',
        reason: `reviewed revision ${reviewedSha} is not an ancestor of ${publishedSha}`,
      };
    }
    if (ancestry.code !== 0) {
      return {
        fresh: false,
        code: 'inspection-failed',
        reason: `ancestry inspection failed: ${ancestry.stderr || `git exited ${ancestry.code}`}`,
      };
    }

    const listed = await git.run(
      [
        'rev-list',
        '--reverse',
        '--topo-order',
        '--parents',
        `${reviewedSha}..${publishedSha}`,
      ],
      { cwd: scope.repoRoot, allowFailure: true },
    );
    if (listed.code !== 0) {
      return {
        fresh: false,
        code: 'inspection-failed',
        reason: `commit listing failed: ${listed.stderr || `git exited ${listed.code}`}`,
      };
    }

    const inspected: string[] = [];
    for (const line of listed.stdout.split('\n')) {
      const [commit, firstParent] = line.trim().split(/\s+/);
      if (!commit) continue;
      if (!firstParent) {
        return {
          fresh: false,
          code: 'inspection-failed',
          reason: `commit ${commit} has no parent to compare against`,
          commit,
        };
      }
      const failure = await inspectCommit(git, scope, firstParent, commit);
      if (failure !== null) {
        return failure;
      }
      inspected.push(commit);
    }

    return {
      fresh: true,
      code: 'bookkeeping-successor',
      reason: `every commit after the reviewed revision is permitted bookkeeping (${inspected.length} inspected)`,
      inspected,
    };
  } catch (error) {
    return inspectionFailed(error);
  }
}

function inspectionFailed(error: unknown): SuccessorResult {
  return {
    fresh: false,
    code: 'inspection-failed',
    reason: `inspection failed: ${error instanceof Error ? error.message : String(error)}`,
  };
}

/**
 * Inspect one commit against its first parent. For a merge commit this is
 * the change the merge introduces into the line being published, which
 * covers both the merged side and any change made in the merge itself.
 */
async function inspectCommit(
  git: GitRunner,
  scope: EvidenceScope,
  parent: string,
  commit: string,
): Promise<SuccessorResult | null> {
  const diff = await git.run(
    ['diff', '--no-renames', '--name-status', '-z', parent, commit],
    { cwd: scope.repoRoot, allowFailure: true },
  );
  if (diff.code !== 0) {
    return {
      fresh: false,
      code: 'inspection-failed',
      reason: `diff inspection of ${commit} failed: ${diff.stderr || `git exited ${diff.code}`}`,
      commit,
    };
  }

  const tokens = diff.stdout.split('\0').filter((token) => token !== '');
  for (let index = 0; index + 1 < tokens.length; index += 2) {
    const status = tokens[index]!.charAt(0);
    const path = tokens[index + 1]!;
    const kind = classifyPath(scope, path);
    if (kind === null) {
      return {
        fresh: false,
        code: 'disallowed-path',
        reason: `${commit} changes ${path}, which is not permitted bookkeeping`,
        commit,
        path,
      };
    }

    const before =
      status === 'A' ? null : await readBlob(git, scope.repoRoot, parent, path);
    const after =
      status === 'D' ? null : await readBlob(git, scope.repoRoot, commit, path);
    if (
      (status !== 'A' && before === null) ||
      (status !== 'D' && after === null)
    ) {
      return {
        fresh: false,
        code: 'inspection-failed',
        reason: `could not read ${path} at ${status === 'A' ? commit : parent}`,
        commit,
        path,
      };
    }

    const verdict = judgeBookkeepingChange(kind, status, before, after, scope);
    if (!verdict.ok) {
      return {
        fresh: false,
        code: 'substantive-change',
        reason: `${commit} makes a substantive change to ${path}: ${verdict.reason}`,
        commit,
        path,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Path allowlist and content rules
// ---------------------------------------------------------------------------

export type BookkeepingPathKind =
  | 'state'
  | 'plan'
  | 'implementation'
  | 'project-log'
  | 'review-artifact';

function projectRelative(projectDir: string, artifact: string): string {
  const trimmed = artifact.replace(/^\.\//, '');
  const prefix = `${projectDir.replace(/\/$/, '')}/`;
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}

function artifactVariants(artifact: string): string[] {
  const name = posix.basename(artifact);
  if (artifact.startsWith('reviews/archived/')) {
    return [artifact, `reviews/${name}`];
  }
  if (artifact.startsWith('reviews/')) {
    return [artifact, `reviews/archived/${name}`];
  }
  return [artifact];
}

/**
 * The bookkeeping kind of a repository-relative path, or `null` when the
 * path is outside the allowlist: this project's `state.md`, `plan.md`,
 * `implementation.md`, `project-log.md`, and the exact review artifacts of
 * the evidence being recorded or archived.
 */
export function classifyPath(
  scope: EvidenceScope,
  repoPath: string,
): BookkeepingPathKind | null {
  const projectDir = scope.projectDir.replace(/\/$/, '');
  if (!repoPath.startsWith(`${projectDir}/`)) {
    return null;
  }
  const relative = repoPath.slice(projectDir.length + 1);
  switch (relative) {
    case 'state.md':
      return 'state';
    case 'plan.md':
      return 'plan';
    case 'implementation.md':
      return 'implementation';
    case 'project-log.md':
      return 'project-log';
  }
  const permitted = scope.evidenceArtifacts.flatMap((artifact) =>
    artifactVariants(projectRelative(projectDir, artifact)),
  );
  return permitted.includes(relative) ? 'review-artifact' : null;
}

function judgeBookkeepingChange(
  kind: BookkeepingPathKind,
  status: string,
  before: string | null,
  after: string | null,
  scope: EvidenceScope,
): Verdict {
  if (kind === 'review-artifact') {
    return status === 'A' || status === 'M' || status === 'D'
      ? OK
      : refuse(`unsupported change type ${status}`);
  }
  if (kind === 'project-log') {
    if (status === 'A') return OK;
    if (status !== 'M') return refuse('the project log may only grow');
    return isProjectLogAppend(before!, after!)
      ? OK
      : refuse('the project log was rewritten, not appended');
  }
  if (kind === 'implementation' && status === 'A') {
    return OK;
  }
  if (status !== 'M') {
    return refuse(
      status === 'D' ? 'the file was deleted' : `change type ${status}`,
    );
  }
  switch (kind) {
    case 'state':
      return judgeStateChange(before!, after!, scope);
    case 'plan':
      return judgePlanChange(before!, after!);
    case 'implementation':
      return judgeJournalChange(before!, after!);
  }
}

/**
 * Whether `after` only adds entries to the project log `before`. `oat project
 * log append` writes at the end of the log, or, once the log carries its
 * end-of-run synthesis section, immediately before that section; every byte
 * of the previous log is kept either way. Insertion anywhere else, a change to
 * an existing entry, or a change to the synthesis section is a rewrite.
 */
export function isProjectLogAppend(before: string, after: string): boolean {
  if (after.startsWith(before.trimEnd())) {
    return true;
  }
  const synthesisIndex = before.indexOf(SYNTHESIS_HEADING_PREFIX);
  if (synthesisIndex < 0) {
    return false;
  }
  const entries = before.slice(0, synthesisIndex);
  const synthesis = before.slice(synthesisIndex);
  if (
    after.length < before.length ||
    !after.startsWith(entries) ||
    !after.endsWith(synthesis)
  ) {
    return false;
  }
  const inserted = after.slice(entries.length, after.length - synthesis.length);
  return !inserted.includes(SYNTHESIS_HEADING_PREFIX);
}

// --- shared helpers --------------------------------------------------------

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---(?:\n|$)/;

function splitFrontmatter(
  content: string,
): { data: Record<string, unknown>; body: string } | null {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    return { data: {}, body: content };
  }
  try {
    const parsed: unknown = YAML.parse(match[1] ?? '');
    const data =
      parsed === null || parsed === undefined
        ? {}
        : isRecord(parsed)
          ? parsed
          : null;
    return data === null
      ? null
      : { data, body: content.slice(match[0].length) };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stable).join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

function isUnset(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** A set-once field may go from unset to a value; any later change is not bookkeeping. */
function setOnce(before: unknown, after: unknown): boolean {
  return isUnset(before) || stable(before) === stable(after);
}

// --- state.md --------------------------------------------------------------

/** State keys whose change requires reevaluation, never bookkeeping. */
const PROTECTED_STATE_KEYS = ['oat_workflow_mode', 'oat_skill_gate_overrides'];

const DELIVERY_SET_ONCE_FIELDS = [
  'milestone',
  'scope',
  'endpoint',
  'kind',
  'covers_scope_of',
  'corrects_delivery_id',
  'lookup',
  'endpoint_attainment',
];

function judgeStateChange(
  before: string,
  after: string,
  scope: EvidenceScope,
): Verdict {
  const previous = splitFrontmatter(before);
  const next = splitFrontmatter(after);
  if (previous === null || next === null) {
    return refuse('state.md frontmatter could not be parsed');
  }

  for (const key of PROTECTED_STATE_KEYS) {
    if (stable(previous.data[key]) !== stable(next.data[key])) {
      return refuse(`${key} changed`);
    }
  }

  const deliveries = judgeDeliveries(
    previous.data['oat_deliveries'],
    next.data['oat_deliveries'],
    scope,
  );
  if (!deliveries.ok) return deliveries;
  return judgeMilestoneGates(
    previous.data['oat_milestone_gates'],
    next.data['oat_milestone_gates'],
  );
}

function deliveryMap(value: unknown): Map<string, Record<string, unknown>> {
  const entries = new Map<string, Record<string, unknown>>();
  for (const entry of Array.isArray(value) ? value : []) {
    if (isRecord(entry) && typeof entry['delivery_id'] === 'string') {
      entries.set(entry['delivery_id'], entry);
    }
  }
  return entries;
}

function judgeDeliveries(
  beforeValue: unknown,
  afterValue: unknown,
  scope: EvidenceScope,
): Verdict {
  const after = deliveryMap(afterValue);
  const evidence = new Set(
    scope.evidenceArtifacts.flatMap((artifact) =>
      artifactVariants(projectRelative(scope.projectDir, artifact)),
    ),
  );

  for (const [id, previous] of deliveryMap(beforeValue)) {
    const next = after.get(id);
    if (next === undefined) {
      return refuse(`delivery ${id} was removed from the registry`);
    }
    for (const field of DELIVERY_SET_ONCE_FIELDS) {
      if (!setOnce(previous[field], next[field])) {
        return refuse(`delivery ${id} changed its recorded ${field}`);
      }
    }

    const previousMembers = Array.isArray(previous['members'])
      ? previous['members']
      : [];
    const nextMembers = Array.isArray(next['members']) ? next['members'] : [];
    for (const [index, member] of previousMembers.entries()) {
      const successor: unknown = nextMembers[index];
      if (!isRecord(member)) continue;
      if (!isRecord(successor)) {
        return refuse(`delivery ${id} lost member ${index}`);
      }
      for (const field of ['url', 'base', 'reviewed_head']) {
        if (!setOnce(member[field], successor[field])) {
          return refuse(`delivery ${id} member ${index} changed its ${field}`);
        }
      }
    }

    const review = previous['integrated_review'];
    const nextReview = next['integrated_review'];
    const recordsEvidence =
      isRecord(nextReview) &&
      typeof nextReview['artifact'] === 'string' &&
      evidence.has(projectRelative(scope.projectDir, nextReview['artifact']));
    if (isRecord(review)) {
      if (!isRecord(nextReview)) {
        return refuse(`delivery ${id} lost its integrated review evidence`);
      }
      for (const field of REVIEW_IDENTITY_FIELDS) {
        if (!recordsEvidence && !setOnce(review[field], nextReview[field])) {
          return refuse(
            `delivery ${id} changed its integrated review ${field} without recording this evidence`,
          );
        }
      }
    }
    // The review record this commit writes is new evidence only when it names
    // a new artifact: a re-review always records a new timestamped artifact,
    // and scope or bound_revisions changes ride on that artifact change.
    // Moving the same artifact to its archived counterpart is not new.
    const recordsNewReview =
      recordsEvidence &&
      !(
        isRecord(review) &&
        typeof review['artifact'] === 'string' &&
        artifactVariants(
          projectRelative(scope.projectDir, review['artifact']),
        ).includes(
          projectRelative(
            scope.projectDir,
            (nextReview as Record<string, unknown>)['artifact'] as string,
          ),
        )
      );

    // The delivery's exit-gate binding is persisted evidence (A2): set once,
    // replaced only together with the new integrated review it accompanies.
    // The `decided_at` rerun escape belongs to the milestone working carrier.
    if (
      isRecord(previous['exit_gate']) &&
      !recordsNewReview &&
      !setOnce(previous['exit_gate'], next['exit_gate'])
    ) {
      return refuse(
        `delivery ${id} exit gate binding changed without recording new integrated review evidence`,
      );
    }
  }
  return OK;
}

const REVIEW_IDENTITY_FIELDS = ['artifact', 'scope', 'bound_revisions'];

function judgeCarrierChange(
  before: unknown,
  after: unknown,
  label: string,
): Verdict {
  if (!isRecord(before)) return OK;
  if (!isRecord(after)) {
    return refuse(`${label} was removed`);
  }
  // A rerun replaces the record with a new decision; otherwise the reviewed
  // revision and the subject it binds are evidence identities.
  if (stable(before['decided_at']) !== stable(after['decided_at'])) {
    return OK;
  }
  for (const field of ['reviewed_head', 'subject']) {
    if (!setOnce(before[field], after[field])) {
      return refuse(`${label} changed its ${field} without a new decision`);
    }
  }
  return OK;
}

function judgeMilestoneGates(
  beforeValue: unknown,
  afterValue: unknown,
): Verdict {
  if (!isRecord(beforeValue)) return OK;
  const after = isRecord(afterValue) ? afterValue : {};
  for (const [milestone, carriers] of Object.entries(beforeValue)) {
    if (!isRecord(carriers)) continue;
    const next = isRecord(after[milestone]) ? after[milestone] : {};
    for (const kind of ['plan', 'exit']) {
      const verdict = judgeCarrierChange(
        carriers[kind],
        next[kind],
        `${milestone} ${kind} carrier`,
      );
      if (!verdict.ok) return verdict;
    }
  }
  return OK;
}

// --- plan.md ---------------------------------------------------------------

/** Plan frontmatter keys that carry routing and progress, never approved content. */
const PLAN_ROUTING_KEYS = new Set([
  'oat_status',
  'oat_ready_for',
  'oat_blockers',
  'oat_last_updated',
  'oat_phase',
  'oat_phase_status',
  'oat_generated',
]);

/** Plan sections that record evidence; every other section is approved content. */
const PLAN_EVIDENCE_SECTIONS = new Set(['Reviews', 'Implementation Complete']);

function judgePlanChange(before: string, after: string): Verdict {
  const previous = splitFrontmatter(before);
  const next = splitFrontmatter(after);
  if (previous === null || next === null) {
    return refuse('plan.md frontmatter could not be parsed');
  }
  const keys = new Set([
    ...Object.keys(previous.data),
    ...Object.keys(next.data),
  ]);
  for (const key of keys) {
    if (
      !PLAN_ROUTING_KEYS.has(key) &&
      stable(previous.data[key]) !== stable(next.data[key])
    ) {
      return refuse(`frontmatter ${key} changed`);
    }
  }

  const previousSections = planSections(previous.body);
  const nextSections = planSections(next.body);
  const approved = (sections: PlanSection[]) =>
    sections
      .filter((section) => !PLAN_EVIDENCE_SECTIONS.has(section.title))
      .map((section) => `${section.heading}\n${normalizeBody(section.lines)}`);
  const previousApproved = approved(previousSections);
  const nextApproved = approved(nextSections);
  if (previousApproved.length !== nextApproved.length) {
    return refuse('a section was added or removed');
  }
  for (const [index, section] of previousApproved.entries()) {
    if (section !== nextApproved[index]) {
      const heading = section.split('\n')[0] || '(preamble)';
      return refuse(`approved content changed under "${heading}"`);
    }
  }

  const reviews = (sections: PlanSection[]) =>
    sections.find((section) => section.title === 'Reviews')?.lines ?? [];
  return judgeReviewRows(reviews(previousSections), reviews(nextSections));
}

interface PlanSection {
  heading: string;
  title: string;
  lines: string[];
}

function planSections(body: string): PlanSection[] {
  const lines = body.split('\n');
  const mask = recordLineMask(lines);
  const sections: PlanSection[] = [{ heading: '', title: '', lines: [] }];
  for (const [index, line] of lines.entries()) {
    const heading = mask[index] ? line.match(/^##[ \t]+(.+?)[ \t]*$/) : null;
    if (heading) {
      sections.push({ heading: line.trimEnd(), title: heading[1]!, lines: [] });
      continue;
    }
    sections[sections.length - 1]!.lines.push(line);
  }
  return sections;
}

function normalizeBody(lines: string[]): string {
  return lines
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

interface ReviewRow {
  scope: string;
  type: string;
  artifact: string;
  reviewedHead: string;
}

function readReviewRows(lines: string[]): ReviewRow[] {
  const rows = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .map((line) =>
      line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim()),
    );
  const [header, , ...body] = rows;
  if (!header) return [];
  const column = (name: string) =>
    header.findIndex((cell) => cell.toLowerCase() === name);
  const scope = column('scope');
  const type = column('type');
  const artifact = column('artifact');
  const reviewedHead = column('reviewed head');
  return body.map((cells) => ({
    scope: cells[scope] ?? '',
    type: cells[type] ?? '',
    artifact: artifact < 0 ? '' : (cells[artifact] ?? ''),
    reviewedHead: reviewedHead < 0 ? '' : (cells[reviewedHead] ?? ''),
  }));
}

function placeholder(cell: string): boolean {
  return cell === '' || cell === '-' || cell === '—';
}

/**
 * Review rows record evidence: rows may be added and their status, date and
 * lineage cells updated, but no row disappears and an existing row's
 * identity (scope, type, artifact) and reviewed revision never change, except
 * that an artifact may be set once or moved to its archived counterpart.
 */
function judgeReviewRows(beforeLines: string[], afterLines: string[]): Verdict {
  const remaining = readReviewRows(afterLines);
  for (const row of readReviewRows(beforeLines)) {
    const index = remaining.findIndex(
      (candidate) =>
        candidate.scope === row.scope &&
        candidate.type === row.type &&
        (placeholder(row.reviewedHead) ||
          candidate.reviewedHead === row.reviewedHead) &&
        (placeholder(row.artifact) ||
          artifactVariants(row.artifact).includes(candidate.artifact)),
    );
    if (index < 0) {
      return refuse(
        `the ${row.scope} ${row.type} review row lost or changed its identity or reviewed head`,
      );
    }
    remaining.splice(index, 1);
  }
  return OK;
}

// --- implementation.md -----------------------------------------------------

const PROGRESS_FIELD =
  /^(?:-[ \t]+)?\*\*(Status|Head|Completed|Updated|Last Updated|Started|Total):\*\*\s*(.*)$/;
const PLACEHOLDER_FIELD =
  /^(?:-[ \t]+)?\*\*[^*\n]+:\*\*\s*(?:-|—|pending|tbd|null)?\s*$/i;
const EXTRACTION_MARKER = /^\*\*(?:Status:\*\*\s+extracted|Extracted to:\*\*)/;

/**
 * The journal is append-mostly: progress fields and placeholders may be
 * rewritten and tables re-rendered, but no recorded observation is removed
 * or rewritten, and marking a phase extracted changes scope.
 */
function judgeJournalChange(before: string, after: string): Verdict {
  const previous = splitFrontmatter(before);
  const next = splitFrontmatter(after);
  if (previous === null || next === null) {
    return refuse('implementation.md frontmatter could not be parsed');
  }
  const remaining = new Map<string, number>();
  for (const line of next.body.split('\n')) {
    const key = line.trimEnd();
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  const previousLines = new Set<string>();
  for (const line of previous.body.split('\n')) {
    const key = line.trimEnd();
    previousLines.add(key.trim());
    const count = remaining.get(key) ?? 0;
    if (count > 0) {
      remaining.set(key, count - 1);
      continue;
    }
    const trimmed = key.trim();
    const progress = trimmed.match(PROGRESS_FIELD);
    const mutable =
      trimmed === '' ||
      trimmed.startsWith('|') ||
      PLACEHOLDER_FIELD.test(trimmed) ||
      (progress !== null &&
        !(progress[1] === 'Status' && /^extracted\b/.test(progress[2] ?? '')));
    if (!mutable) {
      return refuse(
        `recorded journal line "${trimmed}" was removed or rewritten`,
      );
    }
  }
  for (const line of next.body.split('\n')) {
    const trimmed = line.trim();
    if (EXTRACTION_MARKER.test(trimmed) && !previousLines.has(trimmed)) {
      return refuse(`"${trimmed}" marks a phase extracted`);
    }
  }
  return OK;
}

// ---------------------------------------------------------------------------
// Gate carriers: outcome and freshness are separate
// ---------------------------------------------------------------------------

export interface CarrierExpectation {
  /** The subject kind the carrier must bind. */
  kind: 'plan' | 'code';
  /** The ordered phase set the carrier's resolution must apply to. */
  scope: readonly string[];
  /**
   * `exact` (default): the carrier binds exactly `scope`, as a milestone's
   * scoped closeout records it. `covers`: the carrier binds at least every
   * phase of `scope`, as a delivery's milestone carrier does after a later
   * correction phase joined its milestone.
   */
  match?: 'exact' | 'covers';
  /** Whether the project override currently disables the carrier's gate. */
  overrideDisabled?: boolean | null;
  /** The current resolution, when the caller resolved configuration. */
  resolution?: string | null;
  /** The current configuration fingerprint, when the caller computed one. */
  configFingerprint?: string | null;
}

export interface CarrierEvaluation {
  /** The recorded gate outcome, independent of freshness. */
  outcome: 'allowed' | 'blocked' | 'missing' | 'invalid';
  freshness: 'fresh' | 'stale';
  reason: string | null;
}

const UNREVIEWED_RESOLUTIONS = new Set(['no_gate', 'project_disabled']);

function isUnreviewedResolution(carrier: MilestoneGateCarrier): boolean {
  return (
    UNREVIEWED_RESOLUTIONS.has(carrier.resolution ?? '') ||
    UNREVIEWED_RESOLUTIONS.has(carrier.disposition ?? '')
  );
}

function sameScope(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    [...left].sort().join(',') === [...right].sort().join(',')
  );
}

/**
 * Evaluate one gate carrier (A2). The outcome is the recorded status; the
 * freshness asks whether that resolution still applies: a `no_gate` or
 * `project_disabled` carrier has no reviewed revision and is bound by its
 * subject, so a changed configuration, override or subject makes it stale and
 * a fabricated `reviewed_head` makes it invalid. A configured code carrier
 * keeps its actual reviewed revision and must cover every published head as
 * a bookkeeping successor. A plan carrier binds the approved brief and
 * membership at activation, so implementation commits never stale it.
 */
export async function evaluateGateCarrier(
  carrier: MilestoneGateCarrier | null,
  expected: CarrierExpectation,
  successor?: {
    git: GitRunner;
    scope: EvidenceScope;
    publishedHeads: readonly (string | null)[];
  },
): Promise<CarrierEvaluation> {
  if (carrier === null) {
    return {
      outcome: 'missing',
      freshness: 'stale',
      reason: 'no carrier is recorded',
    };
  }
  const outcome = carrier.status === 'allowed' ? 'allowed' : 'blocked';
  const stale = (reason: string): CarrierEvaluation => ({
    outcome,
    freshness: 'stale',
    reason,
  });
  const unreviewed = isUnreviewedResolution(carrier);

  if (unreviewed && carrier.reviewed_head !== null) {
    return {
      outcome: 'invalid',
      freshness: 'stale',
      reason: `a ${carrier.resolution ?? carrier.disposition} carrier records reviewed_head ${carrier.reviewed_head}, but no review occurred`,
    };
  }
  if (carrier.subject === null) {
    return stale('subject-missing: the carrier binds no subject');
  }
  const bound = carrier.subject.scope;
  const scopeMatches =
    expected.match === 'covers'
      ? expected.scope.every((phaseId) => bound.includes(phaseId))
      : sameScope(bound, expected.scope);
  if (carrier.subject.kind !== expected.kind || !scopeMatches) {
    return stale(
      `subject-changed: the carrier binds ${carrier.subject.kind} [${carrier.subject.scope.join(', ')}], not ${expected.kind} [${expected.scope.join(', ')}]`,
    );
  }
  const projectDisabled =
    carrier.resolution === 'project_disabled' ||
    carrier.disposition === 'project_disabled';
  if (
    expected.overrideDisabled !== undefined &&
    expected.overrideDisabled !== null &&
    expected.overrideDisabled !== projectDisabled
  ) {
    return stale(
      `override-changed: the project override ${expected.overrideDisabled ? 'now disables' : 'no longer disables'} this gate`,
    );
  }
  if (
    expected.resolution !== undefined &&
    expected.resolution !== null &&
    expected.resolution !== carrier.resolution
  ) {
    return stale(
      `configuration-changed: the gate now resolves as ${expected.resolution}, not ${carrier.resolution ?? 'unrecorded'}`,
    );
  }
  if (
    expected.configFingerprint !== undefined &&
    expected.configFingerprint !== carrier.config_fingerprint
  ) {
    return stale(
      'configuration-changed: the gate configuration fingerprint changed',
    );
  }

  if (unreviewed || expected.kind === 'plan') {
    return { outcome, freshness: 'fresh', reason: null };
  }
  if (carrier.reviewed_head === null) {
    return stale(
      'reviewed-head-missing: a configured gate records no reviewed revision',
    );
  }
  if (successor === undefined) {
    return stale('unobserved: no published head was supplied');
  }
  for (const head of successor.publishedHeads) {
    const result = await evaluateSuccessor(
      successor.git,
      successor.scope,
      carrier.reviewed_head,
      head,
    );
    if (!result.fresh) {
      return stale(`${result.code}: ${result.reason}`);
    }
  }
  return { outcome, freshness: 'fresh', reason: null };
}

// ---------------------------------------------------------------------------
// Integrated review evidence
// ---------------------------------------------------------------------------

export interface ReviewEvaluation {
  artifact: string | null;
  /** The recorded disposition or Reviews-row status, as stored. */
  disposition: string | null;
  fresh: boolean;
  reason: string | null;
  /** Every published head is covered by the reviewed revision. */
  members: { member: number; fresh: boolean; reason: string | null }[];
}

/**
 * Evaluate a registered delivery's integrated review against its observed
 * members (A2): each member's reviewed revision must cover its observed head
 * as a bookkeeping successor, and a member base change invalidates the
 * evidence independently. The review must bind every phase of
 * `requiredScope`. Historical deliveries are judged against their own
 * observed revisions, never the branch's latest head.
 */
export async function evaluateDeliveryReview(
  git: GitRunner,
  scope: EvidenceScope,
  delivery: GoalDelivery,
  requiredScope: readonly string[],
): Promise<ReviewEvaluation> {
  const review = delivery.integrated_review;
  if (review === null || review.artifact === null) {
    return {
      artifact: null,
      disposition: review?.disposition ?? null,
      fresh: false,
      reason: 'review-missing: no integrated review is recorded',
      members: [],
    };
  }
  const result = (
    fresh: boolean,
    reason: string | null,
    members: ReviewEvaluation['members'] = [],
  ): ReviewEvaluation => ({
    artifact: review.artifact,
    disposition: review.disposition,
    fresh,
    reason,
    members,
  });

  const unbound = requiredScope.filter(
    (phaseId) => !review.scope.includes(phaseId),
  );
  if (unbound.length > 0) {
    return result(
      false,
      `review-scope-narrow: the integrated review does not bind ${unbound.join(', ')}`,
    );
  }
  if (delivery.members.length === 0) {
    return result(false, 'member-missing: the delivery has no members');
  }

  const members: ReviewEvaluation['members'] = [];
  for (const [index, member] of delivery.members.entries()) {
    const bound = review.bound_revisions.find(
      (revision) => revision.member === index,
    );
    const reviewedHead = bound?.head ?? member.reviewed_head;
    const reviewedBase = bound?.base ?? member.base;
    let verdict: { fresh: boolean; reason: string | null };
    if (member.observed_base === null || member.observed_head === null) {
      verdict = {
        fresh: false,
        reason: 'member-unobserved: run delivery refresh',
      };
    } else if (
      member.base === null ||
      member.observed_base !== member.base ||
      (reviewedBase !== null && reviewedBase !== member.base)
    ) {
      verdict = {
        fresh: false,
        reason: `base-changed: member base ${member.base ?? 'unrecorded'} is now ${member.observed_base}`,
      };
    } else {
      const successor = await evaluateSuccessor(
        git,
        scope,
        reviewedHead,
        member.observed_head,
      );
      verdict = successor.fresh
        ? { fresh: true, reason: null }
        : { fresh: false, reason: `${successor.code}: ${successor.reason}` };
    }
    members.push({ member: index, ...verdict });
  }

  const failed = members.find((member) => !member.fresh);
  return failed
    ? result(false, `member ${failed.member}: ${failed.reason}`, members)
    : result(true, null, members);
}

/**
 * Review artifacts a delivery's evidence records, for the bookkeeping
 * allowlist. `sharing` lists the deliveries that share one of its member pull
 * requests (terminal deliveries registered from one head branch, brief
 * contract 12.7 "Shared members"): their review artifacts are recorded on the
 * same member head, so they are bookkeeping for this delivery as well. Each
 * delivery is still judged on its own frozen scope and bound revisions.
 */
export function deliveryEvidenceArtifacts(
  delivery: GoalDelivery,
  reviewRowArtifacts: readonly string[] = [],
  sharing: readonly GoalDelivery[] = [],
): string[] {
  const artifacts = new Set<string>(
    reviewRowArtifacts.filter((artifact) => !placeholder(artifact)),
  );
  for (const entry of [delivery, ...sharing]) {
    if (entry.integrated_review?.artifact) {
      artifacts.add(entry.integrated_review.artifact);
    }
  }
  return [...artifacts];
}

/**
 * The other registered deliveries that share at least one member pull request
 * URL with `delivery` (brief contract 12.7 "Shared members").
 */
export function deliveriesSharingMembers(
  deliveries: readonly GoalDelivery[],
  delivery: GoalDelivery,
): GoalDelivery[] {
  const urls = new Set(
    delivery.members
      .map((member) => member.url)
      .filter((url): url is string => typeof url === 'string' && url !== ''),
  );
  if (urls.size === 0) return [];
  return deliveries.filter(
    (entry) =>
      entry.delivery_id !== delivery.delivery_id &&
      entry.members.some(
        (member) => member.url !== null && urls.has(member.url),
      ),
  );
}
