import { parseFrontmatterRecord } from '../shared/utils/frontmatter';
import type { TaskProgress } from '../types';

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
const ORDINARY_PHASE_HEADING_PATTERN = /^## Phase p?(\d+): (.+)$/;
const CANONICAL_REVISION_PHASE_HEADING_PATTERN = /^## Phase p-rev(\d+): (.+)$/;
const LEGACY_REVISION_PHASE_HEADING_PATTERN =
  /^## Revision Phase (?:p-rev)?(\d+): (.+)$/;
const ORDINARY_TASK_HEADING_PATTERN = /^### Task (p(\d+)-t\d+): (.+)$/;
const CANONICAL_REVISION_TASK_HEADING_PATTERN =
  /^### Task (prev(\d+)-t\d+): (.+)$/;
const LEGACY_REVISION_TASK_HEADING_PATTERN =
  /^### Task (p-rev(\d+)-t\d+): (.+)$/;

interface MutablePhaseProgress {
  phaseId: string | null;
  declaredPhaseId: string | null;
  name: string;
  total: number;
  completed: number;
  isRevision: boolean;
}

interface ParsedTaskHeading {
  taskId: string;
  phaseId: string;
  isRevision: boolean;
}

/**
 * Collapse an authored ordinal to its canonical form: leading zeros are
 * stripped, then the value is padded to `width`. Ordinary phase ids use
 * width 2 (`1` and `01` both become `01`); revision phase ids use width 1
 * (`1` and `01` both become `1`).
 *
 * The normalization is string-only on purpose. Routing the digits through
 * `Number.parseInt` would collapse ordinals past `Number.MAX_SAFE_INTEGER`
 * onto the same value, so two genuinely different phases could normalize to
 * one id and a task could be attributed to the wrong phase.
 */
function normalizeOrdinal(digits: string, width: number): string {
  return digits.replace(/^0+(?=\d)/, '').padStart(width, '0');
}

function ordinaryPhaseId(digits: string): string {
  return `p${normalizeOrdinal(digits, 2)}`;
}

function revisionPhaseId(digits: string): string {
  return `p-rev${normalizeOrdinal(digits, 1)}`;
}

export function parseTaskProgress(
  planContent: string,
  implementationContent: string,
): TaskProgress {
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

function parseCompletedTaskIds(implementationContent: string): Set<string> {
  const completedTasks = new Set<string>();
  let currentTaskId: string | null = null;

  for (const line of implementationContent.split('\n')) {
    const taskHeading = parseTaskHeading(line);
    if (taskHeading) {
      currentTaskId = taskHeading.taskId;
      continue;
    }

    if (currentTaskId && /^\*\*Status:\*\*\s+completed$/.test(line.trim())) {
      completedTasks.add(currentTaskId);
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

function parsePhaseHeading(
  line: string,
): Pick<
  MutablePhaseProgress,
  'declaredPhaseId' | 'name' | 'isRevision'
> | null {
  // Revision spellings are matched first; `## Phase p-rev1:` cannot satisfy
  // the ordinary pattern (`p?` must be followed by digits), so the order is
  // defensive rather than load-bearing.
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

function parseTaskHeading(line: string): ParsedTaskHeading | null {
  const canonicalRevisionMatch = line.match(
    CANONICAL_REVISION_TASK_HEADING_PATTERN,
  );
  if (canonicalRevisionMatch?.[1] && canonicalRevisionMatch[2]) {
    return {
      taskId: canonicalRevisionMatch[1],
      phaseId: revisionPhaseId(canonicalRevisionMatch[2]),
      isRevision: true,
    };
  }

  const legacyRevisionMatch = line.match(LEGACY_REVISION_TASK_HEADING_PATTERN);
  if (legacyRevisionMatch?.[1] && legacyRevisionMatch[2]) {
    return {
      taskId: legacyRevisionMatch[1],
      phaseId: revisionPhaseId(legacyRevisionMatch[2]),
      isRevision: true,
    };
  }

  const ordinaryMatch = line.match(ORDINARY_TASK_HEADING_PATTERN);
  return ordinaryMatch?.[1] && ordinaryMatch[2]
    ? {
        taskId: ordinaryMatch[1],
        phaseId: ordinaryPhaseId(ordinaryMatch[2]),
        isRevision: false,
      }
    : null;
}
