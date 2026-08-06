import { parseFrontmatterRecord } from '../shared/utils/frontmatter';
import type { TaskProgress } from '../types';

const PHASE_HEADING_PATTERN = /^## Phase \d+: (.+)$/;
const CANONICAL_REVISION_PHASE_HEADING_PATTERN = /^## Phase (p-rev\d+): (.+)$/;
const LEGACY_REVISION_PHASE_HEADING_PATTERN = /^## Revision Phase \d+: (.+)$/;
const TASK_HEADING_PATTERN =
  /^### Task ((?:p\d+|p-rev\d+|prev\d+)-t\d+): (.+)$/;
interface MutablePhaseProgress {
  phaseId: string | null;
  declaredPhaseId: string | null;
  name: string;
  total: number;
  completed: number;
  isRevision: boolean;
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
        declaredPhaseId: phaseHeading.phaseId,
        name: phaseHeading.name,
        total: 0,
        completed: 0,
        isRevision: phaseHeading.isRevision,
      };
      phases.push(currentPhase);
      continue;
    }

    const taskMatch = line.match(TASK_HEADING_PATTERN);
    if (!taskMatch || currentPhase == null) {
      continue;
    }

    const taskId = taskMatch[1];
    if (!taskId) {
      continue;
    }

    const phaseId = normalizeTaskPhaseId(taskId);
    if (
      currentPhase.declaredPhaseId !== null &&
      currentPhase.declaredPhaseId !== phaseId
    ) {
      continue;
    }

    currentPhase.phaseId ??= phaseId;
    currentPhase.total += 1;
    currentPhase.completed += completedTasks.has(taskId) ? 1 : 0;
  }

  return phases.filter((phase) => phase.phaseId !== null);
}

function parseCompletedTaskIds(implementationContent: string): Set<string> {
  const completedTasks = new Set<string>();
  let currentTaskId: string | null = null;

  for (const line of implementationContent.split('\n')) {
    const taskMatch = line.match(TASK_HEADING_PATTERN);
    if (taskMatch?.[1]) {
      currentTaskId = taskMatch[1];
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
): Pick<MutablePhaseProgress, 'phaseId' | 'name' | 'isRevision'> | null {
  const canonicalRevisionMatch = line.match(
    CANONICAL_REVISION_PHASE_HEADING_PATTERN,
  );
  if (canonicalRevisionMatch?.[1] && canonicalRevisionMatch[2]) {
    return {
      phaseId: canonicalRevisionMatch[1],
      name: canonicalRevisionMatch[2],
      isRevision: true,
    };
  }

  const legacyRevisionMatch = line.match(LEGACY_REVISION_PHASE_HEADING_PATTERN);
  if (legacyRevisionMatch?.[1]) {
    return {
      phaseId: null,
      name: legacyRevisionMatch[1],
      isRevision: true,
    };
  }

  const phaseMatch = line.match(PHASE_HEADING_PATTERN);
  return phaseMatch?.[1]
    ? { phaseId: null, name: phaseMatch[1], isRevision: false }
    : null;
}

function normalizeTaskPhaseId(taskId: string): string {
  const canonicalRevisionMatch = taskId.match(/^prev(\d+)-t\d+$/);
  return canonicalRevisionMatch?.[1]
    ? `p-rev${canonicalRevisionMatch[1]}`
    : taskId.replace(/-t\d+$/, '');
}
