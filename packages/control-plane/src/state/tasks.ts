import { parseFrontmatterRecord } from '../shared/utils/frontmatter';
import type { TaskProgress } from '../types';

const PHASE_HEADING_PATTERN = /^## Phase (\d+): (.+)$/;
const CANONICAL_REVISION_PHASE_HEADING_PATTERN = /^## Phase (p-rev\d+): (.+)$/;
const LEGACY_REVISION_PHASE_HEADING_PATTERN = /^## Revision Phase (\d+): (.+)$/;
const ORDINARY_TASK_HEADING_PATTERN = /^### Task (p(\d+)-t\d+): (.+)$/;
const CANONICAL_REVISION_TASK_HEADING_PATTERN =
  /^### Task (prev(\d+)-t\d+): (.+)$/;
const LEGACY_REVISION_TASK_HEADING_PATTERN =
  /^### Task (p-rev(\d+)-t\d+): (.+)$/;

type HeadingDialect = 'ordinary' | 'canonical-revision' | 'legacy-revision';

interface MutablePhaseProgress {
  phaseId: string | null;
  declaredPhaseId: string | null;
  dialect: HeadingDialect;
  name: string;
  total: number;
  completed: number;
  isRevision: boolean;
}

interface ParsedTaskHeading {
  taskId: string;
  phaseId: string;
  dialect: HeadingDialect;
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
        dialect: phaseHeading.dialect,
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

    if (
      currentPhase.dialect !== taskHeading.dialect ||
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
  'declaredPhaseId' | 'dialect' | 'name' | 'isRevision'
> | null {
  const canonicalRevisionMatch = line.match(
    CANONICAL_REVISION_PHASE_HEADING_PATTERN,
  );
  if (canonicalRevisionMatch?.[1] && canonicalRevisionMatch[2]) {
    return {
      declaredPhaseId: canonicalRevisionMatch[1],
      dialect: 'canonical-revision',
      name: canonicalRevisionMatch[2],
      isRevision: true,
    };
  }

  const legacyRevisionMatch = line.match(LEGACY_REVISION_PHASE_HEADING_PATTERN);
  if (legacyRevisionMatch?.[1] && legacyRevisionMatch[2]) {
    return {
      declaredPhaseId: `p-rev${legacyRevisionMatch[1]}`,
      dialect: 'legacy-revision',
      name: legacyRevisionMatch[2],
      isRevision: true,
    };
  }

  const phaseMatch = line.match(PHASE_HEADING_PATTERN);
  return phaseMatch?.[1] && phaseMatch[2]
    ? {
        declaredPhaseId: `p${phaseMatch[1].padStart(2, '0')}`,
        dialect: 'ordinary',
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
      phaseId: `p-rev${canonicalRevisionMatch[2]}`,
      dialect: 'canonical-revision',
    };
  }

  const legacyRevisionMatch = line.match(LEGACY_REVISION_TASK_HEADING_PATTERN);
  if (legacyRevisionMatch?.[1] && legacyRevisionMatch[2]) {
    return {
      taskId: legacyRevisionMatch[1],
      phaseId: `p-rev${legacyRevisionMatch[2]}`,
      dialect: 'legacy-revision',
    };
  }

  const ordinaryMatch = line.match(ORDINARY_TASK_HEADING_PATTERN);
  return ordinaryMatch?.[1] && ordinaryMatch[2]
    ? {
        taskId: ordinaryMatch[1],
        phaseId: `p${ordinaryMatch[2]}`,
        dialect: 'ordinary',
      }
    : null;
}
