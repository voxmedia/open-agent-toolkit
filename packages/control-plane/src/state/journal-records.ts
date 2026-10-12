import YAML from 'yaml';

import { recordLineMask } from './quick-plan-readiness';

/**
 * Shared journal record reader.
 *
 * One heading-only reader for `implementation.md` (and the plan's task
 * headings) consumed by task-mode progress and by the CLI's journal
 * evaluator, so the dashboard and the validator read one contract:
 *
 * - Records are found from headings only. Tables and checklists are never
 *   completion evidence.
 * - Heading ownership is explicit: a record opened by a heading ends at the
 *   next heading of equal or higher level. A `**Status:**` line under the next
 *   section can therefore never be attributed to the previous task.
 * - Fenced and indented code is excluded (the single exclusion in
 *   `recordLineMask`), and so is the YAML frontmatter, so an example heading
 *   inside a fence never opens a record.
 * - Phase and task identity is normalized once here (`p1`/`p01`,
 *   `prev1`/`p-rev1`), and raw records are retained in document order so a
 *   duplicate normalized id stays visible instead of collapsing into a set.
 * - `**Status:**` and `**Commit:**` values are extracted only when exactly one
 *   owned line exists; every owned line is also returned with its location.
 */

const ORDINARY_PHASE_HEADING_PATTERN = /^## Phase p?(\d+): (.+)$/;
const CANONICAL_REVISION_PHASE_HEADING_PATTERN = /^## Phase p-rev(\d+): (.+)$/;
const LEGACY_REVISION_PHASE_HEADING_PATTERN =
  /^## Revision Phase (?:p-rev)?(\d+): (.+)$/;
const ORDINARY_TASK_HEADING_PATTERN = /^### Task (p(\d+)-t(\d+)): (.+)$/;
const CANONICAL_REVISION_TASK_HEADING_PATTERN =
  /^### Task (prev(\d+)-t(\d+)): (.+)$/;
const LEGACY_REVISION_TASK_HEADING_PATTERN =
  /^### Task (p-rev(\d+)-t(\d+)): (.+)$/;
const ATX_HEADING_PATTERN = /^(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const STATUS_LINE_PATTERN = /^\*\*Status:\*\*[ \t]+(.*?)[ \t]*$/;
const COMMIT_LINE_PATTERN = /^\*\*Commit:\*\*[ \t]+(.*?)[ \t]*$/;
const ORDINARY_PHASE_ID_PATTERN = /^p(\d+)$/;
const REVISION_PHASE_ID_PATTERN = /^p-rev(\d+)$/;
const ORDINARY_TASK_ID_PATTERN = /^p(\d+)-t(\d+)$/;
const REVISION_TASK_ID_PATTERN = /^p-?rev(\d+)-t(\d+)$/;

/**
 * Collapse an authored ordinal to its canonical form: leading zeros are
 * stripped, then the value is padded to `width`. String-only on purpose:
 * routing the digits through `Number.parseInt` would collapse ordinals past
 * `Number.MAX_SAFE_INTEGER` onto one value.
 */
function normalizeOrdinal(digits: string, width: number): string {
  return digits.replace(/^0+(?=\d)/, '').padStart(width, '0');
}

export function ordinaryPhaseId(digits: string): string {
  return `p${normalizeOrdinal(digits, 2)}`;
}

export function revisionPhaseId(digits: string): string {
  return `p-rev${normalizeOrdinal(digits, 1)}`;
}

function ordinaryTaskId(phaseDigits: string, taskDigits: string): string {
  return `${ordinaryPhaseId(phaseDigits)}-t${normalizeOrdinal(taskDigits, 2)}`;
}

function revisionTaskId(phaseDigits: string, taskDigits: string): string {
  return `prev${normalizeOrdinal(phaseDigits, 1)}-t${normalizeOrdinal(taskDigits, 2)}`;
}

/**
 * Normalize one authored phase id (`p1`, `p01`, `p-rev1`, `p-rev01`) to the
 * canonical id the heading parser produces; anything else is `null`.
 */
export function normalizePhaseId(token: string): string | null {
  const revision = token.match(REVISION_PHASE_ID_PATTERN)?.[1];
  if (revision !== undefined) {
    return revisionPhaseId(revision);
  }
  const ordinary = token.match(ORDINARY_PHASE_ID_PATTERN)?.[1];
  return ordinary === undefined ? null : ordinaryPhaseId(ordinary);
}

export interface NormalizedTaskId {
  /** Canonical task id: `pNN-tNN` (ordinary) or `prevN-tNN` (revision). */
  taskId: string;
  /** Canonical phase id: `pNN` (ordinary) or `p-revN` (revision). */
  phaseId: string;
  isRevision: boolean;
}

/**
 * Normalize one authored task id (`p1-t1`, `p01-t01`, `prev1-t01`,
 * `p-rev1-t01`) to its canonical id; anything else is `null`. Two spellings of
 * one task normalize to the same id, which is how a duplicate stays visible.
 */
export function normalizeTaskId(token: string): NormalizedTaskId | null {
  const revision = token.match(REVISION_TASK_ID_PATTERN);
  if (revision?.[1] !== undefined && revision[2] !== undefined) {
    return {
      taskId: revisionTaskId(revision[1], revision[2]),
      phaseId: revisionPhaseId(revision[1]),
      isRevision: true,
    };
  }
  const ordinary = token.match(ORDINARY_TASK_ID_PATTERN);
  if (ordinary?.[1] !== undefined && ordinary[2] !== undefined) {
    return {
      taskId: ordinaryTaskId(ordinary[1], ordinary[2]),
      phaseId: ordinaryPhaseId(ordinary[1]),
      isRevision: false,
    };
  }
  return null;
}

export interface PhaseHeading {
  declaredPhaseId: string;
  name: string;
  isRevision: boolean;
}

/**
 * Parse one `## Phase …` / `## Revision Phase …` heading line. Every authored
 * spelling normalizes to one phase id plus one kind (ordinary or revision).
 */
export function parsePhaseHeadingLine(line: string): PhaseHeading | null {
  const canonicalRevisionMatch = line.match(
    CANONICAL_REVISION_PHASE_HEADING_PATTERN,
  );
  if (canonicalRevisionMatch?.[1] && canonicalRevisionMatch[2]) {
    return {
      declaredPhaseId: revisionPhaseId(canonicalRevisionMatch[1]),
      name: canonicalRevisionMatch[2],
      isRevision: true,
    };
  }

  const legacyRevisionMatch = line.match(LEGACY_REVISION_PHASE_HEADING_PATTERN);
  if (legacyRevisionMatch?.[1] && legacyRevisionMatch[2]) {
    return {
      declaredPhaseId: revisionPhaseId(legacyRevisionMatch[1]),
      name: legacyRevisionMatch[2],
      isRevision: true,
    };
  }

  const phaseMatch = line.match(ORDINARY_PHASE_HEADING_PATTERN);
  return phaseMatch?.[1] && phaseMatch[2]
    ? {
        declaredPhaseId: ordinaryPhaseId(phaseMatch[1]),
        name: phaseMatch[2],
        isRevision: false,
      }
    : null;
}

export interface TaskHeading extends NormalizedTaskId {
  /** The task id exactly as authored in the heading. */
  rawTaskId: string;
  title: string;
}

/** Parse one `### Task <id>: <title>` heading line. */
export function parseTaskHeadingLine(line: string): TaskHeading | null {
  const patterns: Array<[RegExp, boolean]> = [
    [CANONICAL_REVISION_TASK_HEADING_PATTERN, true],
    [LEGACY_REVISION_TASK_HEADING_PATTERN, true],
    [ORDINARY_TASK_HEADING_PATTERN, false],
  ];
  for (const [pattern, isRevision] of patterns) {
    const match = line.match(pattern);
    const [, rawTaskId, phaseDigits, taskDigits, title] = match ?? [];
    if (
      rawTaskId === undefined ||
      phaseDigits === undefined ||
      taskDigits === undefined ||
      title === undefined
    ) {
      continue;
    }
    return {
      rawTaskId,
      title,
      isRevision,
      taskId: isRevision
        ? revisionTaskId(phaseDigits, taskDigits)
        : ordinaryTaskId(phaseDigits, taskDigits),
      phaseId: isRevision
        ? revisionPhaseId(phaseDigits)
        : ordinaryPhaseId(phaseDigits),
    };
  }
  return null;
}

/** One owned marker line with its 1-based source line. */
export interface OwnedLine {
  value: string;
  line: number;
}

export interface JournalHeadingRecord {
  level: number;
  text: string;
  /** 1-based source line of the heading. */
  line: number;
  /** 1-based last line owned by the heading (before the next heading of equal or higher level). */
  endLine: number;
}

export interface JournalSectionRecord extends JournalHeadingRecord {
  /** Present when the `##` heading is a phase heading. */
  phase: PhaseHeading | null;
  /**
   * `**Status:**` lines directly under the heading, before its first
   * sub-heading (the phase's own marker, never a task's).
   */
  statuses: OwnedLine[];
  /** The single direct status value, or `null` when zero or several exist. */
  status: string | null;
}

export interface JournalTaskRecord extends JournalHeadingRecord, TaskHeading {
  /** The `##` section that encloses the block, or `null` before any section. */
  section: JournalSectionRecord | null;
  /**
   * Whether the enclosing section is the phase this task belongs to (same
   * normalized phase id and kind).
   */
  inOwningPhase: boolean;
  /** Every owned `**Status:**` line in the block. */
  statuses: OwnedLine[];
  /** Every owned `**Commit:**` line in the block. */
  commits: OwnedLine[];
  /** The single owned status value, or `null` when zero or several exist. */
  status: string | null;
  /** The single owned commit value, or `null` when zero or several exist. */
  commit: string | null;
}

export interface JournalRecords {
  /** Every record heading (outside frontmatter, fences and indented code). */
  headings: JournalHeadingRecord[];
  /** Every `##` section in document order; duplicates retained. */
  sections: JournalSectionRecord[];
  /** Every `### Task` block in document order; duplicates retained. */
  tasks: JournalTaskRecord[];
  /**
   * For each 0-based source line, whether it is a record line (not
   * frontmatter, not fenced, not indented code).
   */
  recordMask: boolean[];
  /** The source split into lines. */
  lines: string[];
}

/**
 * The 0-based index one past the frontmatter's closing `---`, or 0 when the
 * document has no frontmatter block.
 */
function frontmatterEnd(lines: readonly string[]): number {
  if (lines[0]?.trim() !== '---') {
    return 0;
  }
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === '---') {
      return index + 1;
    }
  }
  return 0;
}

function exactlyOne(lines: readonly OwnedLine[]): string | null {
  return lines.length === 1 ? (lines[0]?.value ?? null) : null;
}

/**
 * Read every heading-owned record of a journal. Pure: no I/O, no
 * normalization of content beyond identity.
 */
export function readJournalRecords(content: string): JournalRecords {
  const lines = content.split('\n');
  const bodyStart = frontmatterEnd(lines);
  const bodyMask = recordLineMask(lines.slice(bodyStart));
  const recordMask = lines.map((_, index) =>
    index < bodyStart ? false : (bodyMask[index - bodyStart] ?? false),
  );

  const headings: JournalHeadingRecord[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!recordMask[index]) {
      continue;
    }
    const match = (lines[index] ?? '').match(ATX_HEADING_PATTERN);
    if (!match?.[1]) {
      continue;
    }
    headings.push({
      level: match[1].length,
      text: (match[2] ?? '').trim(),
      line: index + 1,
      endLine: lines.length,
    });
  }

  // Ownership: a heading owns every line up to the next heading of equal or
  // higher level.
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    if (heading == null) {
      continue;
    }
    for (let next = index + 1; next < headings.length; next += 1) {
      const candidate = headings[next];
      if (candidate != null && candidate.level <= heading.level) {
        heading.endLine = candidate.line - 1;
        break;
      }
    }
  }

  const ownedMarkers = (
    startLine: number,
    endLine: number,
    pattern: RegExp,
    stopAtHeading: boolean,
  ): OwnedLine[] => {
    const owned: OwnedLine[] = [];
    // `startLine` is the heading's 1-based line; its body starts at that
    // 0-based index.
    for (let index = startLine; index < endLine; index += 1) {
      if (!recordMask[index]) {
        continue;
      }
      const text = lines[index] ?? '';
      if (stopAtHeading && ATX_HEADING_PATTERN.test(text)) {
        break;
      }
      const value = text.trim().match(pattern)?.[1];
      if (value !== undefined) {
        owned.push({ value, line: index + 1 });
      }
    }
    return owned;
  };

  const sections: JournalSectionRecord[] = [];
  const tasks: JournalTaskRecord[] = [];
  let currentSection: JournalSectionRecord | null = null;

  for (const heading of headings) {
    const source = lines[heading.line - 1] ?? '';
    if (heading.level <= 2) {
      if (heading.level === 1) {
        currentSection = null;
        continue;
      }
      const statuses = ownedMarkers(
        heading.line,
        heading.endLine,
        STATUS_LINE_PATTERN,
        true,
      );
      currentSection = {
        ...heading,
        phase: parsePhaseHeadingLine(source),
        statuses,
        status: exactlyOne(statuses),
      };
      sections.push(currentSection);
      continue;
    }

    const taskHeading =
      heading.level === 3 ? parseTaskHeadingLine(source) : null;
    if (taskHeading == null) {
      continue;
    }

    const statuses = ownedMarkers(
      heading.line,
      heading.endLine,
      STATUS_LINE_PATTERN,
      false,
    );
    const commits = ownedMarkers(
      heading.line,
      heading.endLine,
      COMMIT_LINE_PATTERN,
      false,
    );
    tasks.push({
      ...heading,
      ...taskHeading,
      section: currentSection,
      inOwningPhase:
        currentSection?.phase != null &&
        currentSection.phase.declaredPhaseId === taskHeading.phaseId &&
        currentSection.phase.isRevision === taskHeading.isRevision,
      statuses,
      commits,
      status: exactlyOne(statuses),
      commit: exactlyOne(commits),
    });
  }

  return { headings, sections, tasks, recordMask, lines };
}

/**
 * Production frontmatter reader for journal and state metadata. Malformed
 * YAML (including duplicate keys) and a missing block are distinguished, so a
 * caller never reads a broken header as "no value".
 */
export type FrontmatterMetadata =
  | { state: 'missing' }
  | { state: 'malformed'; reason: string }
  | { state: 'ok'; record: Record<string, unknown> };

const FRONTMATTER_BLOCK_PATTERN =
  /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export function readFrontmatterMetadata(content: string): FrontmatterMetadata {
  const block = content.match(FRONTMATTER_BLOCK_PATTERN)?.[1];
  if (block === undefined) {
    return { state: 'missing' };
  }
  let parsed: unknown;
  try {
    parsed = YAML.parse(block);
  } catch (error) {
    return {
      state: 'malformed',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  if (parsed == null) {
    return { state: 'ok', record: {} };
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { state: 'malformed', reason: 'frontmatter is not a mapping' };
  }
  return { state: 'ok', record: parsed as Record<string, unknown> };
}

/**
 * One metadata field classified against the values a boundary accepts as
 * terminal: a malformed header, a missing field and a present but
 * non-terminal value are three different answers.
 */
export type MetadataField =
  | { state: 'malformed'; reason: string }
  | { state: 'missing' }
  | { state: 'non-terminal'; value: unknown }
  | { state: 'terminal'; value: unknown };

export function classifyMetadataField(
  metadata: FrontmatterMetadata,
  key: string,
  terminalValues: readonly unknown[],
): MetadataField {
  if (metadata.state === 'malformed') {
    return { state: 'malformed', reason: metadata.reason };
  }
  if (metadata.state === 'missing') {
    return { state: 'missing' };
  }
  if (!Object.hasOwn(metadata.record, key)) {
    return { state: 'missing' };
  }
  const value = metadata.record[key];
  return terminalValues.some((terminal) => terminal === value)
    ? { state: 'terminal', value }
    : { state: 'non-terminal', value };
}
