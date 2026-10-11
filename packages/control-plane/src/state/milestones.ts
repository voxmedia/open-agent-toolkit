import type {
  MilestoneMembership,
  MilestoneMembershipError,
  MilestoneMembershipRow,
} from '../types';
import { normalizeMilestoneId } from './parser';
import { readRecordLines } from './quick-plan-readiness';
import { normalizePhaseId, parseTaskProgress } from './tasks';

/**
 * The canonical `## Milestones` table header a goal brief carries (B1). The
 * scaffold renders exactly these two lines; trailing columns after `Phases`
 * are permitted and ignored by the reader.
 */
export const MILESTONES_TABLE_HEADER = [
  '| Milestone | Phases |',
  '| --------- | ------ |',
].join('\n');

const MILESTONES_HEADING_PATTERN = /^## Milestones[ \t]*$/;
const HEADING_LINE_PATTERN = /^#/;
const SEPARATOR_CELL_PATTERN = /^:?-{3,}:?$/;

/**
 * Read milestone membership from a goal brief's `## Milestones` table. This is
 * the one shared reader: both project readers, the router and plan validation
 * consume it, so membership errors are reported once and never dropped.
 *
 * Grammar (fence-aware; fenced and indented code is ignored):
 *
 * - exactly one `## Milestones` heading; the section ends at the next line
 *   starting with `#`;
 * - prose, blank lines and HTML comments in the section are ignored, and the
 *   first `|` line opens the one table;
 * - the header's first two cells are exactly `Milestone` and `Phases`, followed
 *   by a separator row of `---` cells;
 * - each row names one milestone id (`m01`; `m1` normalizes to `m01`) and a
 *   comma-separated list of phase ids, each optionally in backticks
 *   (`p01`, `p-rev1`); the list order is the milestone's ordered phase set.
 *
 * Membership checks run against the brief's full phase inventory: an unknown
 * phase id, a phase listed twice (in one or two milestones), a duplicate or
 * empty milestone, and an executable phase in no milestone are each an error.
 * A phase the journal marks extracted need not belong to a milestone.
 */
export function readMilestoneMembership(
  planContent: string,
  implementationContent = '',
): MilestoneMembership {
  const errors: MilestoneMembershipError[] = [];
  const table = readMilestonesTable(planContent, errors);
  if (table === null) {
    return { present: false, milestones: [], errors };
  }

  const inventory = parseTaskProgress(planContent, implementationContent, {
    phaseUnits: true,
    extractedUnits: true,
  }).phases;
  const knownPhaseIds = new Set(inventory.map((phase) => phase.phaseId));
  const milestones: MilestoneMembershipRow[] = [];
  const seenMilestones = new Set<string>();
  const phaseOwners = new Map<string, string>();

  for (const row of table) {
    if (row.milestoneId === null) {
      errors.push({
        code: 'milestones-malformed',
        message: `Milestones row "${row.raw}" does not name a milestone id like "m01".`,
      });
      continue;
    }
    const milestoneId = row.milestoneId;
    if (seenMilestones.has(milestoneId)) {
      errors.push({
        code: 'milestone-duplicate',
        message: `Milestone ${milestoneId} is declared more than once.`,
        milestoneId,
      });
      continue;
    }
    seenMilestones.add(milestoneId);

    const phaseIds: string[] = [];
    for (const token of row.phaseTokens) {
      const phaseId = normalizePhaseId(token);
      if (phaseId === null) {
        errors.push({
          code: 'milestones-malformed',
          message: `Milestone ${milestoneId} lists "${token}", which is not a phase id like "p01" or "p-rev1".`,
          milestoneId,
        });
        continue;
      }
      if (!knownPhaseIds.has(phaseId)) {
        errors.push({
          code: 'milestone-unknown-phase',
          message: `Milestone ${milestoneId} lists ${phaseId}, which the brief does not declare.`,
          milestoneId,
          phaseId,
        });
        continue;
      }
      const owner = phaseOwners.get(phaseId);
      if (owner !== undefined) {
        errors.push({
          code: 'phase-in-multiple-milestones',
          message:
            owner === milestoneId
              ? `Milestone ${milestoneId} lists ${phaseId} more than once.`
              : `Phase ${phaseId} belongs to both ${owner} and ${milestoneId}.`,
          milestoneId,
          phaseId,
        });
        continue;
      }
      phaseOwners.set(phaseId, milestoneId);
      phaseIds.push(phaseId);
    }

    if (row.phaseTokens.length === 0) {
      errors.push({
        code: 'milestone-empty',
        message: `Milestone ${milestoneId} lists no phases.`,
        milestoneId,
      });
    }
    milestones.push({ milestoneId, phaseIds });
  }

  const reported = new Set<string>();
  for (const phase of inventory) {
    if (
      phase.extracted !== undefined ||
      phaseOwners.has(phase.phaseId) ||
      reported.has(phase.phaseId)
    ) {
      continue;
    }
    reported.add(phase.phaseId);
    errors.push({
      code: 'phase-without-milestone',
      message: `Phase ${phase.phaseId} belongs to no milestone.`,
      phaseId: phase.phaseId,
    });
  }

  return { present: true, milestones, errors };
}

/**
 * The ordered phase set of one milestone, or `null` when membership has
 * errors or the milestone has no row. Callers that need a scope for
 * `selectPhaseUnits` use this so an invalid table never yields a scope.
 */
export function milestonePhaseScope(
  membership: MilestoneMembership,
  milestoneId: string | null | undefined,
): string[] | null {
  if (membership.errors.length > 0 || milestoneId == null) {
    return null;
  }
  return (
    membership.milestones.find((row) => row.milestoneId === milestoneId)
      ?.phaseIds ?? null
  );
}

interface RawMilestoneRow {
  raw: string;
  milestoneId: string | null;
  phaseTokens: string[];
}

function readMilestonesTable(
  planContent: string,
  errors: MilestoneMembershipError[],
): RawMilestoneRow[] | null {
  const lines = readRecordLines(planContent.split('\n'));
  const sectionStarts = lines
    .map((line, index) => (MILESTONES_HEADING_PATTERN.test(line) ? index : -1))
    .filter((index) => index >= 0);

  if (sectionStarts.length === 0) {
    errors.push({
      code: 'milestones-missing',
      message: 'The brief has no "## Milestones" section.',
    });
    return null;
  }
  if (sectionStarts.length > 1) {
    errors.push({
      code: 'milestones-malformed',
      message: 'The brief declares "## Milestones" more than once.',
    });
    return null;
  }

  const tableLines: string[] = [];
  let tableClosed = false;
  let inComment = false;
  for (const line of lines.slice((sectionStarts[0] ?? 0) + 1)) {
    if (HEADING_LINE_PATTERN.test(line)) {
      break;
    }
    const trimmed = line.trim();
    if (inComment) {
      inComment = !trimmed.includes('-->');
      continue;
    }
    if (trimmed.startsWith('<!--')) {
      inComment = !trimmed.includes('-->');
      continue;
    }
    if (trimmed === '') {
      if (tableLines.length > 0) {
        tableClosed = true;
      }
      continue;
    }
    if (!trimmed.startsWith('|')) {
      if (tableLines.length > 0) {
        tableClosed = true;
      }
      continue;
    }
    if (tableClosed) {
      errors.push({
        code: 'milestones-malformed',
        message: 'The "## Milestones" section holds more than one table.',
      });
      return null;
    }
    tableLines.push(trimmed);
  }

  const [header, separator, ...rows] = tableLines;
  const headerCells = header === undefined ? [] : splitRow(header);
  if (headerCells[0] !== 'Milestone' || headerCells[1] !== 'Phases') {
    errors.push({
      code: 'milestones-malformed',
      message:
        'The "## Milestones" section has no canonical table: the header must start "| Milestone | Phases |".',
    });
    return null;
  }
  if (
    separator === undefined ||
    !splitRow(separator).every((cell) => SEPARATOR_CELL_PATTERN.test(cell))
  ) {
    errors.push({
      code: 'milestones-malformed',
      message:
        'The "## Milestones" table header is not followed by a separator row.',
    });
    return null;
  }

  return rows.map((raw) => {
    const cells = splitRow(raw);
    const phasesCell = cells[1] ?? '';
    return {
      raw,
      milestoneId:
        cells.length < 2 ? null : normalizeMilestoneId(stripTicks(cells[0])),
      phaseTokens: phasesCell
        .split(',')
        .map((token) => stripTicks(token.trim()))
        .filter((token) => token !== ''),
    };
  });
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function stripTicks(value: string | undefined): string {
  return (value ?? '').replace(/^`(.*)`$/, '$1').trim();
}
