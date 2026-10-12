import { parseFrontmatterRecord } from '../shared/utils/frontmatter';
import type { PhaseProgress, TaskProgress } from '../types';
import {
  parsePhaseHeadingLine,
  parseTaskHeadingLine,
  readJournalRecords,
} from './journal-records';
import { readRecordLines } from './quick-plan-readiness';

export { normalizePhaseId } from './journal-records';

/**
 * Phase and task headings are authored in several spellings across real OAT
 * plans. Every spelling normalizes to exactly one declared phase id plus one
 * phase kind (ordinary or revision), so a phase and its tasks are matched on
 * normalized identity rather than on raw heading spelling:
 *
 * | Heading                                        | Phase id | Kind      |
 * | ---------------------------------------------- | -------- | --------- |
 * | `## Phase 1:`                                  | `p01`    | ordinary  |
 * | `## Phase p1:` / `## Phase p01:`               | `p01`    | ordinary  |
 * | `## Phase p-rev1:` / `## Phase p-rev01:`       | `p-rev1` | revision  |
 * | `## Revision Phase 1:`                         | `p-rev1` | revision  |
 * | `## Revision Phase p-rev1:`                    | `p-rev1` | revision  |
 *
 * | Task heading                                   | Phase id | Kind      |
 * | ---------------------------------------------- | -------- | --------- |
 * | `### Task p1-t01:` / `### Task p01-t01:`       | `p01`    | ordinary  |
 * | `### Task prev1-t01:`                          | `p-rev1` | revision  |
 * | `### Task p-rev1-t01:`                         | `p-rev1` | revision  |
 *
 * Ordinary and revision ids can never collide: ordinary ids are `p<digits>`
 * and revision ids are `p-rev<digits>`.
 *
 * One consequence of normalizing spellings: a plan that declares the same
 * phase twice under two spellings (`## Phase 1:` and `## Phase p01:` as
 * separate headings) now yields two phase records sharing one `phaseId`. No
 * task is misattributed — each task still lands in its own enclosing phase —
 * but a consumer keying `progress.phases` by `phaseId` would see a duplicate.
 * Rejecting that authoring shape belongs to plan validation, not here.
 */
interface MutablePhaseProgress {
  phaseId: string | null;
  declaredPhaseId: string | null;
  name: string;
  total: number;
  completed: number;
  isRevision: boolean;
}

export interface TaskProgressOptions {
  /**
   * Count progress in phase-units (brief modes) instead of plan tasks.
   * Defaults to `false`, which is the task-mode contract.
   */
  phaseUnits?: boolean;
  /**
   * Goal mode only: honor the extraction precedence, so a journal phase marked
   * `**Status:** extracted` with `**Extracted to:** <slug>` reads as an
   * extracted unit. Ignored unless `phaseUnits` is true; brief keeps reading
   * an extracted marker as pending. Defaults to `false`.
   */
  extractedUnits?: boolean;
}

export function parseTaskProgress(
  planContent: string,
  implementationContent: string,
  options: TaskProgressOptions = {},
): TaskProgress {
  if (options.phaseUnits === true) {
    return parsePhaseUnitProgress(
      planContent,
      implementationContent,
      options.extractedUnits === true,
    );
  }

  const completedTasks = parseCompletedTaskIds(implementationContent);
  const currentTaskId = parseCurrentTaskId(implementationContent);
  const phases = parsePhaseProgress(planContent, completedTasks);

  return {
    total: phases.reduce((sum, phase) => sum + phase.total, 0),
    completed: phases.reduce((sum, phase) => sum + phase.completed, 0),
    currentTaskId,
    phases: phases.map((phase) => ({
      phaseId: phase.phaseId ?? 'unknown',
      name: phase.name,
      total: phase.total,
      completed: phase.completed,
      isRevision: phase.isRevision,
    })),
  };
}

function parsePhaseProgress(
  planContent: string,
  completedTasks: Set<string>,
): MutablePhaseProgress[] {
  const phases: MutablePhaseProgress[] = [];
  const lines = planContent.split('\n');
  let currentPhase: MutablePhaseProgress | null = null;

  for (const line of lines) {
    const phaseHeading = parsePhaseHeading(line);
    if (phaseHeading) {
      currentPhase = {
        phaseId: null,
        declaredPhaseId: phaseHeading.declaredPhaseId,
        name: phaseHeading.name,
        total: 0,
        completed: 0,
        isRevision: phaseHeading.isRevision,
      };
      phases.push(currentPhase);
      continue;
    }

    const taskHeading = parseTaskHeading(line);
    if (!taskHeading || currentPhase == null) {
      continue;
    }

    // Cross-phase guard on normalized identity: a task counts only when its
    // normalized phase id and phase kind both match the enclosing phase. Two
    // spellings of the same phase now agree here; a task id belonging to a
    // different phase, or an ordinary task under a revision phase (and vice
    // versa), is still dropped.
    if (
      currentPhase.isRevision !== taskHeading.isRevision ||
      currentPhase.declaredPhaseId !== taskHeading.phaseId
    ) {
      continue;
    }

    currentPhase.phaseId ??= taskHeading.phaseId;
    currentPhase.total += 1;
    currentPhase.completed += completedTasks.has(taskHeading.taskId) ? 1 : 0;
  }

  return phases.filter((phase) => phase.phaseId !== null);
}

/**
 * Completed task ids (normalized) from the shared journal record reader: a
 * task counts only when its own `### Task` block owns exactly one
 * `**Status:**` line and that line reads `completed`. A fenced example heading
 * opens no block, and a status under the next heading of equal or higher
 * level is never owned by the previous task.
 */
function parseCompletedTaskIds(implementationContent: string): Set<string> {
  const completedTasks = new Set<string>();
  for (const task of readJournalRecords(implementationContent).tasks) {
    if (task.status === 'completed') {
      completedTasks.add(task.taskId);
    }
  }
  return completedTasks;
}

function parseCurrentTaskId(implementationContent: string): string | null {
  const parsed = parseFrontmatterRecord(implementationContent);
  const currentTaskId = parsed.oat_current_task_id;
  return typeof currentTaskId === 'string' && currentTaskId !== 'null'
    ? currentTaskId
    : null;
}

const parsePhaseHeading = parsePhaseHeadingLine;
const parseTaskHeading = parseTaskHeadingLine;

/**
 * The phases inside an active scope, in plan document order. A `null` scope
 * selects every phase; scope ids that name no phase are ignored, and the
 * order of `scope` never reorders the result.
 *
 * Because unknown scope ids are ignored here, a goal scope must come from
 * validated milestone membership (`readMilestoneMembership`): membership
 * errors are surfaced on the project state before any scope reaches this
 * function. An extracted unit counts zero, so it is never incomplete.
 */
export function selectPhaseUnits(
  progress: TaskProgress,
  scope: readonly string[] | null,
): PhaseProgress[] {
  if (scope == null) {
    return [...progress.phases];
  }

  const scoped = new Set(scope);
  return progress.phases.filter((phase) => scoped.has(phase.phaseId));
}

/**
 * Journal phase status values. Task execution records additionally use
 * `cancelled` and `no-change`, which are not phase statuses.
 */
export type JournalPhaseStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'extracted';

export interface PhaseMarkers {
  status: JournalPhaseStatus;
  base: string | null;
  head: string | null;
  extractedTo: string | null;
}

const JOURNAL_PHASE_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'extracted',
]);
const HEADING_LINE_PATTERN = /^#/;
const SECTION_HEADING_PATTERN = /^#{1,2}[ \t]/;
const STATUS_MARKER_PATTERN = /^\*\*Status:\*\*\s+(\S+)$/;
const BASE_MARKER_PATTERN = /^\*\*Base:\*\*\s+([0-9a-f]{40}|[0-9a-f]{64})$/;
const HEAD_MARKER_PATTERN = /^\*\*Head:\*\*\s+([0-9a-f]{40}|[0-9a-f]{64})$/;
const EXTRACTED_TO_MARKER_PATTERN =
  /^\*\*Extracted to:\*\*\s+([A-Za-z0-9_-]+)$/;
const PROVISIONAL_YES_PATTERN = /^\*\*Provisional:\*\*\s+yes$/;
const COMPLETED_STATUS_PATTERN = /^\*\*Status:\*\*\s+completed$/;

interface MarkerAccumulator {
  status: JournalPhaseStatus | null;
  base: string | null;
  head: string | null;
  extractedTo: string | null;
}

/**
 * Read journal phase markers. A `## Phase …` heading opens phase ownership,
 * and ownership ends at the next line starting with `#` (any heading,
 * including `### Task`), so a task record's status can never be read as its
 * phase's status. Markers are exact lines; a line with trailing text, an
 * unknown status value or an abbreviated SHA is not a marker. Fenced and
 * indented code is excluded. When a phase repeats a marker, the first one
 * wins; a phase heading without a valid status reads as `pending`.
 */
export function parsePhaseMarkers(
  implementationContent: string,
): Map<string, PhaseMarkers> {
  const accumulators = new Map<string, MarkerAccumulator>();
  let owner: MarkerAccumulator | null = null;

  for (const line of readRecordLines(implementationContent.split('\n'))) {
    const phaseHeading = parsePhaseHeading(line);
    if (phaseHeading?.declaredPhaseId) {
      const phaseId = phaseHeading.declaredPhaseId;
      owner = accumulators.get(phaseId) ?? {
        status: null,
        base: null,
        head: null,
        extractedTo: null,
      };
      accumulators.set(phaseId, owner);
      continue;
    }

    if (HEADING_LINE_PATTERN.test(line)) {
      owner = null;
      continue;
    }

    if (owner == null) {
      continue;
    }

    const trimmed = line.trim();
    const status = trimmed.match(STATUS_MARKER_PATTERN)?.[1];
    if (status && JOURNAL_PHASE_STATUSES.has(status)) {
      owner.status ??= status as JournalPhaseStatus;
      continue;
    }
    const base = trimmed.match(BASE_MARKER_PATTERN)?.[1];
    if (base) {
      owner.base ??= base;
      continue;
    }
    const head = trimmed.match(HEAD_MARKER_PATTERN)?.[1];
    if (head) {
      owner.head ??= head;
      continue;
    }
    const extractedTo = trimmed.match(EXTRACTED_TO_MARKER_PATTERN)?.[1];
    if (extractedTo) {
      owner.extractedTo ??= extractedTo;
    }
  }

  const markers = new Map<string, PhaseMarkers>();
  for (const [phaseId, accumulator] of accumulators) {
    markers.set(phaseId, {
      status: accumulator.status ?? 'pending',
      base: accumulator.base,
      head: accumulator.head,
      extractedTo: accumulator.extractedTo,
    });
  }
  return markers;
}

/**
 * Phase ids whose plan section carries the exact line `**Provisional:** yes`.
 * Ownership follows the journal marker rule: it opens at a `## Phase …`
 * heading and ends at the next line starting with `#`. Fenced and indented
 * code is excluded. Any other value (including `no`) is not provisional.
 */
export function parseProvisionalPhaseIds(planContent: string): Set<string> {
  const provisional = new Set<string>();
  let ownerPhaseId: string | null = null;

  for (const line of readRecordLines(planContent.split('\n'))) {
    const phaseHeading = parsePhaseHeading(line);
    if (phaseHeading?.declaredPhaseId) {
      ownerPhaseId = phaseHeading.declaredPhaseId;
      continue;
    }

    if (HEADING_LINE_PATTERN.test(line)) {
      ownerPhaseId = null;
      continue;
    }

    if (ownerPhaseId != null && PROVISIONAL_YES_PATTERN.test(line.trim())) {
      provisional.add(ownerPhaseId);
    }
  }

  return provisional;
}

/**
 * Execution records per journal phase: `### Task` headings inside a
 * `## Phase …` section of `implementation.md` whose normalized phase id and
 * kind match that section. A record is completed by the exact line
 * `**Status:** completed` before the next heading.
 */
function parseJournalTaskRecords(
  implementationContent: string,
): Map<string, { total: number; completed: number }> {
  const records = new Map<string, { total: number; completed: number }>();
  let section: { phaseId: string; isRevision: boolean } | null = null;
  let ownerRecord: { total: number; completed: number } | null = null;
  let ownerCompleted = false;

  for (const line of readRecordLines(implementationContent.split('\n'))) {
    const phaseHeading = parsePhaseHeading(line);
    if (phaseHeading?.declaredPhaseId) {
      section = {
        phaseId: phaseHeading.declaredPhaseId,
        isRevision: phaseHeading.isRevision,
      };
      ownerRecord = null;
      continue;
    }

    if (SECTION_HEADING_PATTERN.test(line)) {
      section = null;
      ownerRecord = null;
      continue;
    }

    const taskHeading = parseTaskHeading(line);
    if (taskHeading) {
      ownerRecord = null;
      if (
        section != null &&
        section.phaseId === taskHeading.phaseId &&
        section.isRevision === taskHeading.isRevision
      ) {
        const record = records.get(section.phaseId) ?? {
          total: 0,
          completed: 0,
        };
        record.total += 1;
        records.set(section.phaseId, record);
        ownerRecord = record;
        ownerCompleted = false;
      }
      continue;
    }

    if (HEADING_LINE_PATTERN.test(line)) {
      ownerRecord = null;
      continue;
    }

    if (
      ownerRecord != null &&
      !ownerCompleted &&
      COMPLETED_STATUS_PATTERN.test(line.trim())
    ) {
      ownerRecord.completed += 1;
      ownerCompleted = true;
    }
  }

  return records;
}

/**
 * Phase-unit progress (brief modes). Every `## Phase …` heading in the plan is
 * one unit, evaluated in precedence order:
 *
 * 1. Extracted (goal only, `extractedUnits`): journal `**Status:** extracted`
 *    with `**Extracted to:** <slug>` → `{ total: 0, completed: 0, extracted }`,
 *    excluded from aggregate totals. An extracted marker without its target
 *    reads as pending, and brief reads every extracted marker as pending.
 * 2. Provisional in the plan → incomplete, regardless of any journal marker.
 * 3. Journal `**Status:** completed` → accepted.
 * 4. Otherwise incomplete.
 *
 * Plan task headings never affect totals; `taskRecords` comes from the
 * journal only.
 */
function parsePhaseUnitProgress(
  planContent: string,
  implementationContent: string,
  extractedUnits: boolean,
): TaskProgress {
  const markers = parsePhaseMarkers(implementationContent);
  const provisionalPhaseIds = parseProvisionalPhaseIds(planContent);
  const taskRecords = parseJournalTaskRecords(implementationContent);
  const phases: PhaseProgress[] = [];

  for (const line of readRecordLines(planContent.split('\n'))) {
    const phaseHeading = parsePhaseHeading(line);
    if (!phaseHeading?.declaredPhaseId) {
      continue;
    }

    const phaseId = phaseHeading.declaredPhaseId;
    const marker = markers.get(phaseId);
    const records = taskRecords.get(phaseId);
    const taskRecordCounts = {
      total: records?.total ?? 0,
      completed: records?.completed ?? 0,
    };

    if (
      extractedUnits &&
      marker?.status === 'extracted' &&
      marker.extractedTo !== null
    ) {
      phases.push({
        phaseId,
        name: phaseHeading.name,
        total: 0,
        completed: 0,
        isRevision: phaseHeading.isRevision,
        unit: 'phase',
        provisional: false,
        extracted: { to: marker.extractedTo },
        taskRecords: taskRecordCounts,
      });
      continue;
    }

    const provisional = provisionalPhaseIds.has(phaseId);
    const accepted = !provisional && marker?.status === 'completed';

    phases.push({
      phaseId,
      name: phaseHeading.name,
      total: 1,
      completed: accepted ? 1 : 0,
      isRevision: phaseHeading.isRevision,
      unit: 'phase',
      provisional,
      taskRecords: taskRecordCounts,
    });
  }

  return {
    total: phases.reduce((sum, phase) => sum + phase.total, 0),
    completed: phases.reduce((sum, phase) => sum + phase.completed, 0),
    currentTaskId: parseCurrentTaskId(implementationContent),
    phases,
  };
}
