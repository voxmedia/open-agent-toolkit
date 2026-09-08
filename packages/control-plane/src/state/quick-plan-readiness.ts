import type { QuickPlanReadiness, QuickPlanReadinessFailure } from '../types';

/**
 * Executable equivalent of the named **quick plan readiness** predicate that
 * `.agents/skills/oat-project-quick-start/SKILL.md` defines once beside its
 * Step 3.7, and that `oat-project-plan`, `oat-project-progress`, and
 * `oat-project-next` route by. The skill states the predicate as a shell guard;
 * this module mirrors that guard clause by clause so the public
 * `oat project status` recommendation cannot disagree with the four lifecycle
 * skills about the same `plan.md`.
 *
 * Deliberate mirrors of the guard, in its evaluation order:
 *
 * 1. `oat_status: complete`, quoted or bare, declared exactly once.
 * 2. `oat_ready_for: oat-project-implement`, quoted or bare, declared once.
 * 3. `oat_template` follows the absent-or-false convention: absent, `false`,
 *    `null`, or `~`. A duplicated key is contradictory and an unrecognized
 *    scalar is not read as ready.
 * 4. The `## Reviews` section records the Step 3.7 disposition — a `plan`
 *    artifact row whose Status is neither `pending` nor `-`, or the explicit
 *    line-anchored skip line — read fence-aware so a fenced example never
 *    disposes of a real pending row.
 * 5. At least one `### Task pNN-tNN:` heading under a `## Phase` heading,
 *    outside fenced examples, whose title still reads as text once every
 *    `{placeholder}` is removed.
 *
 * Indentation is measured the same way on both sides: in columns, with tab
 * stops of four, so a tab-indented example is indented code here exactly as a
 * four-space one is. The guard computes this with its own `indent_columns()`
 * function; `TAB_WIDTH` and `INDENTED_CODE_COLUMNS` below are its counterpart.
 *
 * One deliberate divergence from the shell text remains: a substantive title
 * is any Unicode letter or number here, unconditionally, while the guard asks
 * `grep -E '[[:alnum:]]'`, which stays locale-defined and is narrower even
 * under a UTF-8 locale. Letters of any script and decimal digits satisfy both;
 * numerals outside `Nd`, such as `²` or `Ⅷ`, satisfy only this side. Nothing
 * pins a locale for the guard, so this side simply never depends on one.
 */

/** Horizontal whitespace, mirroring `[[:space:]]` inside a single line. */
const SPACE = '[ \\t\\r\\f\\v]';
const SPACE_RE = /[ \t\r\f\v]/;

const FRONTMATTER_DELIMITER = /^---[ \t\r\f\v]*$/;
const REVIEWS_HEADING = /^## Reviews[ \t\r\f\v]*$/;
const SECOND_LEVEL_HEADING = /^##[ \t\r\f\v]/;
const PHASE_HEADING = /^##[ \t\r\f\v]+Phase/;
const TASK_HEADING = /^### Task p[0-9]+-t[0-9]+:[ \t\r\f\v]/;
const TASK_HEADING_PREFIX = /^### Task p[0-9]+-t[0-9]+:[ \t\r\f\v]*/;
const PLACEHOLDER = /\{[^}]*\}/g;
const SUBSTANTIVE_TITLE = /[\p{L}\p{N}]/u;
const REVIEW_SKIP_LINE =
  /^(- )?Plan artifact review: skipped \(workflow\.autoArtifactReview\.plan=false\)[ \t\r\f\v]*$/;
const PLAN_ARTIFACT_ROW = new RegExp(
  `^\\|${SPACE}*plan${SPACE}*\\|${SPACE}*artifact${SPACE}*\\|`,
);
/** Statuses the guard rejects as "no disposition recorded yet". */
const UNDISPOSED_REVIEW_STATUSES = new Set(['', '-', 'pending']);

const TAB_WIDTH = 4;
const INDENTED_CODE_COLUMNS = 4;

function ready(): QuickPlanReadiness {
  return { ready: true, failure: null };
}

function notReady(failure: QuickPlanReadinessFailure): QuickPlanReadiness {
  return { ready: false, failure };
}

/**
 * Evaluate quick plan readiness against `plan.md` content. A missing plan is
 * not ready rather than an error: the recommender asks about projects whose
 * plan may not exist yet.
 */
export function evaluateQuickPlanReadiness(
  planContent: string | null,
): QuickPlanReadiness {
  if (planContent == null) {
    return notReady('plan-missing');
  }

  const lines = planContent.split('\n');

  if (!hasReadyFrontmatter(lines)) {
    return notReady('frontmatter-not-ready');
  }

  const recordLines = readRecordLines(lines);

  if (!hasReviewDisposition(recordLines)) {
    return notReady('review-disposition-missing');
  }

  if (!hasSubstantiveTask(recordLines)) {
    return notReady('substantive-task-missing');
  }

  return ready();
}

function hasReadyFrontmatter(lines: string[]): boolean {
  const frontmatter = readFrontmatterLines(lines);
  if (frontmatter == null) {
    return false;
  }

  if (!hasExactField(frontmatter, 'oat_status', 'complete')) {
    return false;
  }

  if (!hasExactField(frontmatter, 'oat_ready_for', 'oat-project-implement')) {
    return false;
  }

  return hasAbsentOrFalseTemplate(frontmatter);
}

/**
 * The frontmatter block must open on line 1 and be closed. An unterminated
 * delimiter would otherwise let an ordinary body line satisfy a readiness
 * field.
 */
function readFrontmatterLines(lines: string[]): string[] | null {
  if (!FRONTMATTER_DELIMITER.test(lines[0] ?? '')) {
    return null;
  }

  const block: string[] = [];
  for (const line of lines.slice(1)) {
    if (FRONTMATTER_DELIMITER.test(line)) {
      return block;
    }
    block.push(line);
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keyPattern(key: string): string {
  return `["']?${escapeRegExp(key)}["']?${SPACE}*:`;
}

function countKey(frontmatter: string[], key: string): number {
  const pattern = new RegExp(`^${keyPattern(key)}`);
  return frontmatter.filter((line) => pattern.test(line)).length;
}

/**
 * Each field is declared exactly once, with exactly the required value, so a
 * duplicated or contradictory key cannot be read as ready. Quotes must pair:
 * `'complete` and `complete"` are different scalars to YAML and are not the
 * required value here either.
 */
function hasExactField(
  frontmatter: string[],
  key: string,
  value: string,
): boolean {
  if (countKey(frontmatter, key) !== 1) {
    return false;
  }

  const escaped = escapeRegExp(value);
  const pattern = new RegExp(
    `^${keyPattern(key)}${SPACE}+(${escaped}|'${escaped}'|"${escaped}")${SPACE}*(#.*)?$`,
  );
  return frontmatter.some((line) => pattern.test(line));
}

function hasAbsentOrFalseTemplate(frontmatter: string[]): boolean {
  const declared = countKey(frontmatter, 'oat_template');
  if (declared === 0) {
    return true;
  }
  if (declared > 1) {
    return false;
  }

  const pattern = new RegExp(
    `^${keyPattern('oat_template')}${SPACE}*(false|'false'|"false"|null|~)?${SPACE}*(#.*)?$`,
  );
  return frontmatter.some((line) => pattern.test(line));
}

/**
 * Drop fence lines, fenced content, and indented code, leaving the lines that
 * are the plan's record. CommonMark fences close only on a bare run of their
 * own marker, at least as long as the one that opened them, so an example
 * nested inside another fence stays an example.
 */
function readRecordLines(lines: string[]): string[] {
  const record: string[] = [];
  let fenceMarker: string | null = null;
  let fenceLength = 0;

  for (const line of lines) {
    const { columns, rest } = measureIndent(line);
    const isFenceLine = rest.startsWith('```') || rest.startsWith('~~~');

    if (isFenceLine) {
      if (columns < INDENTED_CODE_COLUMNS) {
        const marker = rest[0] ?? '';
        let length = 0;
        while (rest[length] === marker) {
          length += 1;
        }
        const info = rest.slice(length);

        if (fenceMarker == null) {
          fenceMarker = marker;
          fenceLength = length;
        } else if (
          marker === fenceMarker &&
          length >= fenceLength &&
          isBlank(info)
        ) {
          fenceMarker = null;
          fenceLength = 0;
        }
      }
      continue;
    }

    if (fenceMarker != null) {
      continue;
    }

    if (columns >= INDENTED_CODE_COLUMNS) {
      continue;
    }

    record.push(line);
  }

  return record;
}

function isBlank(value: string): boolean {
  for (const character of value) {
    if (!SPACE_RE.test(character)) {
      return false;
    }
  }
  return true;
}

/**
 * Leading indentation measured in columns, with tabs advancing to the next
 * four-column stop. Character counting would read a tab-indented example as
 * one column and let it pass as a record line.
 */
function measureIndent(line: string): { columns: number; rest: string } {
  let columns = 0;
  let index = 0;

  for (; index < line.length; index += 1) {
    const character = line[index];
    if (character === ' ') {
      columns += 1;
    } else if (character === '\t') {
      columns += TAB_WIDTH - (columns % TAB_WIDTH);
    } else {
      break;
    }
  }

  return { columns, rest: line.slice(index) };
}

function hasReviewDisposition(recordLines: string[]): boolean {
  const reviews = readReviewsSection(recordLines);

  // The skip disposition counts only as its own recorded line, never as a
  // substring of prose that merely quotes it.
  if (reviews.some((line) => REVIEW_SKIP_LINE.test(line))) {
    return true;
  }

  const rows = reviews.filter((line) => PLAN_ARTIFACT_ROW.test(line));
  const lastRow = rows[rows.length - 1];
  if (lastRow == null) {
    return false;
  }

  const status = (lastRow.split('|')[3] ?? '').trim();
  return !UNDISPOSED_REVIEW_STATUSES.has(status);
}

function readReviewsSection(recordLines: string[]): string[] {
  const section: string[] = [];
  let inside = false;

  for (const line of recordLines) {
    if (REVIEWS_HEADING.test(line)) {
      inside = true;
      continue;
    }
    if (inside && SECOND_LEVEL_HEADING.test(line)) {
      break;
    }
    if (inside) {
      section.push(line);
    }
  }

  return section;
}

function hasSubstantiveTask(recordLines: string[]): boolean {
  let insidePhase = false;

  for (const line of recordLines) {
    if (SECOND_LEVEL_HEADING.test(line)) {
      insidePhase = PHASE_HEADING.test(line);
      continue;
    }
    if (!insidePhase || !TASK_HEADING.test(line)) {
      continue;
    }

    const title = line
      .replace(TASK_HEADING_PREFIX, '')
      .replace(PLACEHOLDER, '');
    if (SUBSTANTIVE_TITLE.test(title)) {
      return true;
    }
  }

  return false;
}
