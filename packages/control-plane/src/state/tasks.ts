import YAML from 'yaml';

import type { TaskProgress } from '../types';

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;
const PHASE_HEADING_PATTERN = /^## Phase \d+: (.+)$/m;
const REVISION_PHASE_HEADING_PATTERN = /^## Revision Phase \d+: (.+)$/m;
const TASK_SECTION_PATTERN =
  /^### Task ((?:p\d+|p-rev\d+)-t\d+): .+$\n([\s\S]*?)(?=^### Task |\n*$)/gm;

interface MutablePhaseProgress {
  phaseId: string | null;
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
    if (
      PHASE_HEADING_PATTERN.test(line) ||
      REVISION_PHASE_HEADING_PATTERN.test(line)
    ) {
      currentPhase = {
        phaseId: null,
        name: extractPhaseName(line),
        total: 0,
        completed: 0,
        isRevision: line.startsWith('## Revision Phase'),
      };
      phases.push(currentPhase);
      continue;
    }

    const taskMatch = line.match(/^### Task ((?:p\d+|p-rev\d+)-t\d+): (.+)$/);
    if (!taskMatch || currentPhase == null) {
      continue;
    }

    const taskId = taskMatch[1];
    if (!taskId) {
      continue;
    }

    const phaseId = taskId.replace(/-t\d+$/, '');
    currentPhase.phaseId ??= phaseId;
    currentPhase.total += 1;
    currentPhase.completed += completedTasks.has(taskId) ? 1 : 0;
  }

  return phases.filter((phase) => phase.phaseId !== null);
}

function parseCompletedTaskIds(implementationContent: string): Set<string> {
  const completedTasks = new Set<string>();

  for (const match of implementationContent.matchAll(TASK_SECTION_PATTERN)) {
    const taskId = match[1];
    const sectionBody = match[2] ?? '';
    if (taskId && /\*\*Status:\*\*\s+completed/.test(sectionBody)) {
      completedTasks.add(taskId);
    }
  }

  return completedTasks;
}

function parseCurrentTaskId(implementationContent: string): string | null {
  const frontmatter = extractFrontmatter(implementationContent);
  if (frontmatter == null) {
    return null;
  }

  try {
    const parsed = YAML.parse(frontmatter);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'oat_current_task_id' in parsed
    ) {
      const currentTaskId = parsed.oat_current_task_id;
      return typeof currentTaskId === 'string' && currentTaskId !== 'null'
        ? currentTaskId
        : null;
    }
  } catch {
    return null;
  }

  return null;
}

function extractFrontmatter(content: string): string | null {
  const match = content.match(FRONTMATTER_PATTERN);
  return match?.[1] ?? null;
}

function extractPhaseName(line: string): string {
  const revisionMatch = line.match(/^## Revision Phase \d+: (.+)$/);
  if (revisionMatch?.[1]) {
    return revisionMatch[1];
  }

  const phaseMatch = line.match(/^## Phase \d+: (.+)$/);
  if (phaseMatch?.[1]) {
    return phaseMatch[1];
  }

  return line.replace(/^## /, '');
}
