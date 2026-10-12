import { parseDispatchRunLine } from '@commands/project/dispatch/record';
import {
  normalizePhaseId,
  normalizeTaskId,
  type FrontmatterMetadata,
  type JournalRecords,
  type JournalSectionRecord,
  type JournalTaskRecord,
  type TaskProgress,
} from '@open-agent-toolkit/control-plane';
import { classifyDispatchOutcome } from '@providers/identity/generic-dispatch-record';

import {
  JOURNAL_OVERRIDE_CODES,
  type JournalArtifactPath,
  type JournalCheckBoundary,
  type JournalOverrideCode,
  type JournalReasonCode,
} from './types';

/** One finding before overrides are applied. */
export interface Finding {
  code: JournalReasonCode;
  path: JournalArtifactPath;
  line: number | null;
  owner: string;
  message: string;
  /** Refusing finding, or a warning that never refuses. */
  severity: 'refuse' | 'warn';
  /** Override subject for an eligible gap: the task id and its phase id. */
  subject?: { taskId: string | null; phaseId: string };
}

export interface RuleContext {
  boundary: JournalCheckBoundary;
  workflowMode: string;
  /** Normalized phase ids in scope, or `null` for the whole journal. */
  scope: ReadonlySet<string> | null;
  journal: JournalRecords;
  plan: JournalRecords;
  journalMeta: FrontmatterMetadata;
  stateMeta: FrontmatterMetadata;
  /** Real control-plane progress over the same plan/journal bytes. */
  progress: TaskProgress;
  /**
   * Goal mode only: phase ids whose validated outcome audit disposition is
   * `deferred` or `retired`. They stay incomplete and are never normalized.
   */
  approvedDeferredPhases: ReadonlySet<string>;
  findings: Finding[];
}

const IMPLEMENT = 'oat-project-implement';
const RECEIVE = 'oat-project-review-receive';
const COMPLETE = 'oat-project-complete';
const RECONCILE = 'oat-project-reconcile';

const SHA_PATTERN = /^[0-9a-f]{7,64}$/;
/** Skills a completed journal may still point at through `oat_ready_for`. */
const CLOSEOUT_SKILLS: ReadonlySet<string> = new Set([
  'oat-project-summary',
  'oat-project-document',
  'oat-project-pr-progress',
  'oat-project-pr-final',
  'oat-project-retro',
  'oat-project-complete',
  'oat-project-complete-auto',
]);
const TERMINAL_PHASE_STATUSES = new Set(['complete', 'completed']);
const EXECUTION_RECORD_STATUSES = new Set([
  'completed',
  'failed',
  'cancelled',
  'no-change',
  'in_progress',
]);
const TERMINAL_EXECUTION_STATUSES = new Set([
  'completed',
  'failed',
  'cancelled',
  'no-change',
]);

export function isBriefMode(workflowMode: string): boolean {
  return workflowMode === 'brief' || workflowMode === 'goal';
}

function inScope(context: RuleContext, phaseId: string): boolean {
  return context.scope === null || context.scope.has(phaseId);
}

function terminalBoundary(context: RuleContext): boolean {
  return context.boundary !== 'review';
}

function push(
  context: RuleContext,
  finding: Omit<Finding, 'severity'> & { severity?: Finding['severity'] },
): void {
  context.findings.push({ severity: 'refuse', ...finding });
}

function firstCommitToken(value: string): string {
  return (value.trim().split(/\s+/)[0] ?? '').replace(/^`|`$/g, '');
}

function sectionAt(
  records: JournalRecords,
  line: number,
): JournalSectionRecord | null {
  let owner: JournalSectionRecord | null = null;
  for (const section of records.sections) {
    if (section.line <= line) {
      owner = section;
    } else {
      break;
    }
  }
  if (owner !== null && line > owner.endLine) {
    return null;
  }
  return owner;
}

function frontmatterKeyLine(
  lines: readonly string[],
  key: string,
): number | null {
  if (lines[0]?.trim() !== '---') {
    return null;
  }
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.trim() === '---') {
      return null;
    }
    if (line.startsWith(`${key}:`)) {
      return index + 1;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Metadata and status agreement
// ---------------------------------------------------------------------------

export function checkMetadata(
  context: RuleContext,
  stateLines: readonly string[],
): void {
  const { journalMeta, stateMeta } = context;
  if (journalMeta.state === 'malformed') {
    push(context, {
      code: 'journal-frontmatter-malformed',
      path: 'implementation.md',
      line: 1,
      owner: RECONCILE,
      message: `The journal frontmatter is not valid YAML: ${journalMeta.reason}`,
    });
  }
  if (stateMeta.state === 'malformed') {
    push(context, {
      code: 'state-frontmatter-malformed',
      path: 'state.md',
      line: 1,
      owner: RECONCILE,
      message: `The state frontmatter is not valid YAML: ${stateMeta.reason}`,
    });
  }
  if (context.boundary !== 'completion') {
    return;
  }

  if (journalMeta.state === 'missing') {
    push(context, {
      code: 'journal-frontmatter-missing',
      path: 'implementation.md',
      line: null,
      owner: IMPLEMENT,
      message:
        'The journal has no frontmatter; completion needs oat_status: complete.',
    });
  }
  if (journalMeta.state === 'ok') {
    const lines = context.journal.lines;
    if (journalMeta.record.oat_status !== 'complete') {
      push(context, {
        code: 'journal-status-not-terminal',
        path: 'implementation.md',
        line: frontmatterKeyLine(lines, 'oat_status'),
        owner: IMPLEMENT,
        message: `Journal oat_status is ${String(journalMeta.record.oat_status ?? 'missing')}; completion requires complete.`,
      });
    }
    const readyFor = journalMeta.record.oat_ready_for;
    if (
      readyFor !== null &&
      readyFor !== undefined &&
      readyFor !== 'null' &&
      !CLOSEOUT_SKILLS.has(String(readyFor))
    ) {
      push(context, {
        code: 'state-status-disagrees',
        path: 'implementation.md',
        line: frontmatterKeyLine(lines, 'oat_ready_for'),
        owner: IMPLEMENT,
        message: `Journal oat_ready_for is ${String(readyFor)}; with oat_status: complete it must be null or a closeout skill.`,
      });
    }
    const pointer = journalMeta.record.oat_current_task_id;
    if (pointer !== null && pointer !== undefined && pointer !== 'null') {
      push(context, {
        code: 'journal-pointer-not-cleared',
        path: 'implementation.md',
        line: frontmatterKeyLine(lines, 'oat_current_task_id'),
        owner: IMPLEMENT,
        message: `Journal oat_current_task_id still points at ${String(pointer)}; completion requires null.`,
      });
    }
  }
  if (stateMeta.state === 'ok') {
    const phaseStatus = stateMeta.record.oat_phase_status;
    if (phaseStatus !== 'complete' && phaseStatus !== 'pr_open') {
      push(context, {
        code: 'state-status-disagrees',
        path: 'state.md',
        line: frontmatterKeyLine(stateLines, 'oat_phase_status'),
        owner: IMPLEMENT,
        message: `state.md oat_phase_status is ${String(phaseStatus ?? 'missing')}; completion requires complete or pr_open.`,
      });
    }
    const pointer = stateMeta.record.oat_current_task;
    if (pointer !== null && pointer !== undefined && pointer !== 'null') {
      push(context, {
        code: 'state-pointer-not-cleared',
        path: 'state.md',
        line: frontmatterKeyLine(stateLines, 'oat_current_task'),
        owner: IMPLEMENT,
        message: `state.md oat_current_task still points at ${String(pointer)}; completion requires null.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Task modes: plan task ids ↔ unique journal blocks
// ---------------------------------------------------------------------------

function checklistHint(context: RuleContext, rawTaskId: string): string {
  const pattern = new RegExp(`^\\s*[-*] \\[[ xX]\\] .*\\b${rawTaskId}\\b`);
  return context.journal.lines.some(
    (line, index) =>
      context.journal.recordMask[index] === true && pattern.test(line),
  )
    ? ' A checklist line names it, but a checklist is a display, never completion evidence.'
    : '';
}

function groupTasks(
  tasks: readonly JournalTaskRecord[],
): Map<string, JournalTaskRecord[]> {
  const grouped = new Map<string, JournalTaskRecord[]>();
  for (const task of tasks) {
    const group = grouped.get(task.taskId) ?? [];
    group.push(task);
    grouped.set(task.taskId, group);
  }
  return grouped;
}

function checkDuplicates(
  context: RuleContext,
  blocks: readonly JournalTaskRecord[],
): void {
  for (const duplicate of blocks.slice(1)) {
    push(context, {
      code: 'task-duplicate-block',
      path: 'implementation.md',
      line: duplicate.line,
      owner: IMPLEMENT,
      message: `Task ${duplicate.taskId} has more than one journal block (also line ${blocks[0]?.line ?? '?'}); spelled ${duplicate.rawTaskId} here.`,
    });
  }
}

function checkOwnedStatus(
  context: RuleContext,
  block: JournalTaskRecord,
): string | null {
  if (block.statuses.length === 0) {
    push(context, {
      code: 'task-status-missing',
      path: 'implementation.md',
      line: block.line,
      owner: IMPLEMENT,
      message: `Task ${block.taskId} owns no **Status:** line before the next heading of equal or higher level.`,
    });
    return null;
  }
  if (block.statuses.length > 1) {
    push(context, {
      code: 'task-status-ambiguous',
      path: 'implementation.md',
      line: block.statuses[1]?.line ?? block.line,
      owner: IMPLEMENT,
      message: `Task ${block.taskId} owns ${block.statuses.length} **Status:** lines; exactly one is required.`,
    });
    return null;
  }
  return block.status;
}

function checkCommitEvidence(
  context: RuleContext,
  block: JournalTaskRecord,
): void {
  const token = block.commit === null ? '' : firstCommitToken(block.commit);
  if (SHA_PATTERN.test(token)) {
    return;
  }
  push(context, {
    code: 'task-commit-missing',
    path: 'implementation.md',
    line: block.commits[0]?.line ?? block.statuses[0]?.line ?? block.line,
    owner: IMPLEMENT,
    message:
      block.commits.length > 1
        ? `Completed task ${block.taskId} owns ${block.commits.length} **Commit:** lines; exactly one commit SHA is required.`
        : `Completed task ${block.taskId} owns no **Commit:** SHA.`,
    subject: { taskId: block.taskId, phaseId: block.phaseId },
  });
}

function checkPlacement(context: RuleContext, block: JournalTaskRecord): void {
  if (block.inOwningPhase) {
    return;
  }
  push(context, {
    code: 'task-misplaced',
    path: 'implementation.md',
    line: block.line,
    owner: IMPLEMENT,
    message: `Task ${block.taskId} sits under "${block.section?.text ?? 'no section'}", not its phase ${block.phaseId}.`,
  });
}

export function checkTaskModeRecords(context: RuleContext): void {
  const planTasks = groupTasks(context.plan.tasks);
  const journalTasks = groupTasks(context.journal.tasks);

  for (const [taskId, planBlocks] of planTasks) {
    const planTask = planBlocks[0];
    if (planTask === undefined || !inScope(context, planTask.phaseId)) {
      continue;
    }
    const blocks = journalTasks.get(taskId) ?? [];
    if (blocks.length === 0) {
      push(context, {
        code: 'task-block-missing',
        path: 'implementation.md',
        line: null,
        owner: IMPLEMENT,
        message: `Plan task ${taskId} (plan.md line ${planTask.line}) has no journal block.${checklistHint(context, planTask.rawTaskId)}`,
        subject: { taskId, phaseId: planTask.phaseId },
      });
      continue;
    }
    checkDuplicates(context, blocks);
    const [block] = blocks;
    if (block === undefined) {
      continue;
    }
    checkPlacement(context, block);
    const status = checkOwnedStatus(context, block);
    if (status === null) {
      continue;
    }
    if (status !== 'completed') {
      push(context, {
        code: 'task-not-completed',
        path: 'implementation.md',
        line: block.statuses[0]?.line ?? block.line,
        owner: IMPLEMENT,
        message: `Task ${taskId} is ${status}; the boundary requires completed or an approved scope disposition.`,
        subject: { taskId, phaseId: block.phaseId },
      });
      continue;
    }
    checkCommitEvidence(context, block);
  }

  for (const [taskId, blocks] of journalTasks) {
    if (planTasks.has(taskId)) {
      continue;
    }
    for (const block of blocks) {
      if (!inScope(context, block.phaseId)) {
        continue;
      }
      push(context, {
        code: 'task-unplanned',
        path: 'implementation.md',
        line: block.line,
        owner: IMPLEMENT,
        message: `Journal block ${block.rawTaskId} names no plan task.`,
      });
    }
  }
}

/**
 * Phase status agreement in task modes: once every plan task of a phase is
 * completed, its own `**Status:**` line must say so. A `blocked` or
 * `in_progress` header under a completed phase is refused at its line.
 */
export function checkTaskModePhaseStatus(context: RuleContext): void {
  if (!terminalBoundary(context)) {
    return;
  }
  const completedByPhase = new Map(
    context.progress.phases.map((phase) => [
      phase.phaseId,
      phase.total > 0 && phase.completed === phase.total,
    ]),
  );
  for (const section of context.journal.sections) {
    const phaseId = section.phase?.declaredPhaseId;
    if (phaseId === undefined || !inScope(context, phaseId)) {
      continue;
    }
    if (section.statuses.length > 1) {
      push(context, {
        code: 'phase-status-ambiguous',
        path: 'implementation.md',
        line: section.statuses[1]?.line ?? section.line,
        owner: IMPLEMENT,
        message: `Phase ${phaseId} carries ${section.statuses.length} **Status:** lines.`,
      });
      continue;
    }
    const status = section.status;
    if (
      status !== null &&
      completedByPhase.get(phaseId) === true &&
      !TERMINAL_PHASE_STATUSES.has(status)
    ) {
      push(context, {
        code: 'phase-status-disagrees',
        path: 'implementation.md',
        line: section.statuses[0]?.line ?? section.line,
        owner: IMPLEMENT,
        message: `Phase ${phaseId} says ${status} but every one of its plan tasks is completed.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Brief and goal: phase units and execution records
// ---------------------------------------------------------------------------

export function checkPhaseUnitRecords(context: RuleContext): void {
  const seen = new Map<string, JournalSectionRecord>();
  for (const section of context.journal.sections) {
    const phaseId = section.phase?.declaredPhaseId;
    if (phaseId === undefined) {
      continue;
    }
    const first = seen.get(phaseId);
    if (first !== undefined) {
      push(context, {
        code: 'phase-duplicate-section',
        path: 'implementation.md',
        line: section.line,
        owner: IMPLEMENT,
        message: `Phase ${phaseId} has a second journal section (first at line ${first.line}).`,
      });
      continue;
    }
    seen.set(phaseId, section);
    if (section.statuses.length > 1 && inScope(context, phaseId)) {
      push(context, {
        code: 'phase-status-ambiguous',
        path: 'implementation.md',
        line: section.statuses[1]?.line ?? section.line,
        owner: IMPLEMENT,
        message: `Phase ${phaseId} carries ${section.statuses.length} **Status:** lines.`,
      });
    }
  }

  for (const phase of context.progress.phases) {
    if (!inScope(context, phase.phaseId)) {
      continue;
    }
    const section = seen.get(phase.phaseId);
    const accepted = phase.total === 1 && phase.completed === 1;
    if (accepted) {
      const hasHead = section !== undefined && headMarker(context, section);
      if (!hasHead) {
        push(context, {
          code: 'phase-head-missing',
          path: 'implementation.md',
          line: section?.line ?? null,
          owner: IMPLEMENT,
          message: `Accepted phase ${phase.phaseId} has no **Head:** line.`,
        });
      }
      continue;
    }
    if (phase.extracted !== undefined) {
      continue;
    }
    if (!terminalBoundary(context)) {
      continue;
    }
    if (context.approvedDeferredPhases.has(phase.phaseId)) {
      // An approved deferral or retirement stays incomplete in progress; it
      // is valid history at completion and is never counted as accepted.
      continue;
    }
    push(context, {
      code: 'phase-not-accepted',
      path: 'implementation.md',
      line: section?.statuses[0]?.line ?? section?.line ?? null,
      owner: IMPLEMENT,
      message: `Phase ${phase.phaseId} is not accepted (journal status ${section?.status ?? 'missing'}${phase.provisional === true ? ', provisional in plan.md' : ''}).`,
      subject: { taskId: null, phaseId: phase.phaseId },
    });
  }

  const records = groupTasks(context.journal.tasks);
  for (const blocks of records.values()) {
    const [block] = blocks;
    if (block === undefined || !inScope(context, block.phaseId)) {
      continue;
    }
    checkDuplicates(context, blocks);
    checkPlacement(context, block);
    const status = checkOwnedStatus(context, block);
    if (status === null) {
      continue;
    }
    if (!EXECUTION_RECORD_STATUSES.has(status)) {
      push(context, {
        code: 'task-status-invalid',
        path: 'implementation.md',
        line: block.statuses[0]?.line ?? block.line,
        owner: IMPLEMENT,
        message: `Execution record ${block.taskId} has status ${status}; expected completed, failed, cancelled, no-change or in_progress.`,
      });
      continue;
    }
    if (!TERMINAL_EXECUTION_STATUSES.has(status)) {
      push(context, {
        code: 'execution-record-open',
        path: 'implementation.md',
        line: block.statuses[0]?.line ?? block.line,
        owner: IMPLEMENT,
        message: `Execution record ${block.taskId} is still ${status}; close it with a commit or a terminal status.`,
      });
      continue;
    }
    // Failed, cancelled and no-change records are valid history without a
    // SHA; only a completed record owes commit evidence.
    if (status === 'completed') {
      checkCommitEvidence(context, block);
    }
  }
}

function headMarker(
  context: RuleContext,
  section: JournalSectionRecord,
): boolean {
  for (let index = section.line; index < section.endLine; index += 1) {
    if (context.journal.recordMask[index] !== true) {
      continue;
    }
    const line = context.journal.lines[index] ?? '';
    if (/^#/.test(line)) {
      return false;
    }
    if (/^\*\*Head:\*\*\s+([0-9a-f]{40}|[0-9a-f]{64})$/.test(line.trim())) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Overview totals
// ---------------------------------------------------------------------------

const OVERVIEW_ROW_PATTERN =
  /^\|\s*(Phase\s+)?(p-rev\d+|p?\d+)\s*\|[^|]*\|\s*(\d+)\s*\|\s*(\d+)\s*\/\s*(\d+)\s*\|\s*$/;
const TOTAL_LINE_PATTERN = /^\*\*Total:\*\*\s*(\d+)\s*\/\s*(\d+)\b/;

export function checkOverviewTotals(context: RuleContext): void {
  if (!terminalBoundary(context)) {
    return;
  }
  const overview = context.journal.sections.find(
    (section) => section.text === 'Progress Overview',
  );
  if (overview === undefined) {
    return;
  }
  const byPhase = new Map(
    context.progress.phases.map((phase) => [phase.phaseId, phase]),
  );
  for (let index = overview.line; index < overview.endLine; index += 1) {
    if (context.journal.recordMask[index] !== true) {
      continue;
    }
    const line = (context.journal.lines[index] ?? '').trim();
    const row = line.match(OVERVIEW_ROW_PATTERN);
    if (row?.[2] !== undefined) {
      const token = row[2].startsWith('p') ? row[2] : `p${row[2]}`;
      const phaseId = normalizePhaseId(token);
      const phase = phaseId === null ? undefined : byPhase.get(phaseId);
      if (phase === undefined) {
        continue;
      }
      const completed = Number(row[4]);
      const total = Number(row[5]);
      if (completed !== phase.completed || total !== phase.total) {
        push(context, {
          code: 'overview-total-mismatch',
          path: 'implementation.md',
          line: index + 1,
          owner: IMPLEMENT,
          message: `Progress Overview says ${phase.phaseId} is ${completed}/${total}; the journal records ${phase.completed}/${phase.total}.`,
        });
      }
      continue;
    }
    const totalLine = line.match(TOTAL_LINE_PATTERN);
    if (totalLine?.[1] !== undefined && totalLine[2] !== undefined) {
      const completed = Number(totalLine[1]);
      const total = Number(totalLine[2]);
      if (
        completed !== context.progress.completed ||
        total !== context.progress.total
      ) {
        push(context, {
          code: 'overview-total-mismatch',
          path: 'implementation.md',
          line: index + 1,
          owner: IMPLEMENT,
          message: `Overview total says ${completed}/${total}; the journal records ${context.progress.completed}/${context.progress.total}.`,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Placement and operational records (whole journal)
// ---------------------------------------------------------------------------

export function checkReferencesLast(context: RuleContext): void {
  const sections = context.journal.sections;
  const index = sections.findIndex((section) => section.text === 'References');
  const next = index === -1 ? undefined : sections[index + 1];
  if (next !== undefined) {
    push(context, {
      code: 'references-not-last',
      path: 'implementation.md',
      line: next.line,
      owner: IMPLEMENT,
      message: `"## ${next.text}" follows ## References; References must be the last section.`,
    });
  }
}

const RECEIPT_HEADING_PATTERN = /^(?:Remote )?Review Received\b(?::\s*(.*))?/i;
const GATE_LINE_PATTERN = /^\*\*Gate:\*\*/;
const DEFERRAL_HEADING_PATTERN = /^Deferred\b/i;

export function checkReceiptsAndDeferrals(context: RuleContext): void {
  for (const heading of context.journal.headings) {
    if (heading.level < 3) {
      continue;
    }
    const section = sectionAt(context.journal, heading.line);
    const receipt = heading.text.match(RECEIPT_HEADING_PATTERN);
    if (receipt !== null) {
      const scopeToken = (receipt[1] ?? '').trim().split(/\s+/)[0] ?? '';
      // A phase scope owns its receipt; a task scope (`pNN-tNN`,
      // `prevN-tNN`) belongs to the task's phase.
      const phaseId =
        normalizePhaseId(scopeToken) ??
        normalizeTaskId(scopeToken)?.phaseId ??
        null;
      const inSlot = section?.text === 'Reviews and Gates';
      const inOwningPhase =
        phaseId !== null && section?.phase?.declaredPhaseId === phaseId;
      if (!inSlot && !inOwningPhase) {
        push(context, {
          code: 'receipt-misplaced',
          path: 'implementation.md',
          line: heading.line,
          owner: RECEIVE,
          message: `"${heading.text}" belongs in ${phaseId === null ? '' : `its phase ${phaseId} or `}## Reviews and Gates, not under "${section?.text ?? 'no section'}".`,
        });
      }
      continue;
    }
    if (
      DEFERRAL_HEADING_PATTERN.test(heading.text) &&
      section?.text !== 'Deferred Findings'
    ) {
      push(context, {
        code: 'deferral-misplaced',
        path: 'implementation.md',
        line: heading.line,
        owner: RECEIVE,
        message: `"${heading.text}" belongs under ## Deferred Findings, not "${section?.text ?? 'no section'}".`,
      });
    }
  }

  context.journal.lines.forEach((line, index) => {
    if (context.journal.recordMask[index] !== true) {
      return;
    }
    if (!GATE_LINE_PATTERN.test(line.trim())) {
      return;
    }
    const section = sectionAt(context.journal, index + 1);
    if (section?.phase == null && section?.text !== 'Reviews and Gates') {
      push(context, {
        code: 'receipt-misplaced',
        path: 'implementation.md',
        line: index + 1,
        owner: IMPLEMENT,
        message: `A gate receipt belongs in its phase or ## Reviews and Gates, not under "${section?.text ?? 'no section'}".`,
      });
    }
  });
}

interface FencedBlock {
  /** 1-based line of the opening fence. */
  line: number;
  info: string;
  content: string[];
  /** The nearest non-blank line before the fence. */
  preceding: string;
}

const FENCE_OPEN_PATTERN = /^ {0,3}(`{3,}|~{3,})(.*)$/;

function frontmatterEndIndex(lines: readonly string[]): number {
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

/**
 * Fenced code blocks of the journal body, parsed fence by fence: each block
 * has its own opener (up to three spaces of indent, three or more backticks or
 * tildes), info string, and closer (the same character, at least as long, with
 * nothing else on the line); an unclosed fence runs to the end of the
 * document. `preceding` is the nearest non-blank line above the opener, so a
 * marker or a neighbouring fence never decides another block's status, and a
 * line that merely sits next to a fence (an indented code line, another block)
 * never hides it.
 */
function fencedBlocks(records: JournalRecords): FencedBlock[] {
  const blocks: FencedBlock[] = [];
  const { lines } = records;
  const bodyStart = frontmatterEndIndex(lines);
  let index = bodyStart;
  while (index < lines.length) {
    const open = (lines[index] ?? '').match(FENCE_OPEN_PATTERN);
    const fence = open?.[1] ?? '';
    const info = (open?.[2] ?? '').trim();
    if (open === null || (fence.startsWith('`') && info.includes('`'))) {
      index += 1;
      continue;
    }
    const closer = new RegExp(
      `^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`,
    );
    const content: string[] = [];
    let cursor = index + 1;
    while (cursor < lines.length && !closer.test(lines[cursor] ?? '')) {
      content.push(lines[cursor] ?? '');
      cursor += 1;
    }
    let preceding = '';
    for (let back = index - 1; back >= bodyStart; back -= 1) {
      const candidate = (lines[back] ?? '').trim();
      if (candidate !== '') {
        preceding = candidate;
        break;
      }
    }
    blocks.push({ line: index + 1, info, content, preceding });
    index = cursor + 1;
  }
  return blocks;
}

const PAYLOAD_KEYS = ['request_id', 'caller', 'role_name'] as const;
const QUOTED_EVIDENCE_MARKER = /^<!--\s*(?:oat:)?quoted-evidence\b.*-->$/;

function isDispatchPayload(content: readonly string[]): boolean {
  const text = content.join('\n');
  return PAYLOAD_KEYS.every((key) =>
    new RegExp(`["']?${key}["']?\\s*:`).test(text),
  );
}

export function checkDispatchPayloads(context: RuleContext): void {
  for (const block of fencedBlocks(context.journal)) {
    if (!isDispatchPayload(block.content)) {
      continue;
    }
    const marked =
      block.info.split(/\s+/).includes('quoted-evidence') ||
      QUOTED_EVIDENCE_MARKER.test(block.preceding);
    if (marked) {
      continue;
    }
    const section = sectionAt(context.journal, block.line);
    push(context, {
      code: 'dispatch-payload',
      path: 'implementation.md',
      line: block.line,
      owner: IMPLEMENT,
      message: `A dispatch payload (request_id, caller, role_name) is pasted under "${section?.text ?? 'no section'}"; record one run line under ## Orchestration Runs instead (mark a quoted example with quoted-evidence).`,
    });
  }
}

const RUN_LINE_PATTERN = /^(?:[-*][ \t]+)?run\/v\d+\b/;

export function checkRunLines(context: RuleContext): void {
  const requests = new Map<string, number>();
  context.journal.lines.forEach((line, index) => {
    if (context.journal.recordMask[index] !== true) {
      return;
    }
    const trimmed = line.trim();
    if (!RUN_LINE_PATTERN.test(trimmed)) {
      return;
    }
    const lineNumber = index + 1;
    const section = sectionAt(context.journal, lineNumber);
    if (section?.text !== 'Orchestration Runs') {
      push(context, {
        code: 'run-line-misplaced',
        path: 'implementation.md',
        line: lineNumber,
        owner: IMPLEMENT,
        message: `A run line sits under "${section?.text ?? 'no section'}"; run lines belong under ## Orchestration Runs.`,
      });
    }
    const parsed = parseDispatchRunLine(trimmed);
    if (!parsed.ok) {
      push(context, {
        code: 'run-line-malformed',
        path: 'implementation.md',
        line: lineNumber,
        owner: IMPLEMENT,
        message: `Run line is malformed: ${parsed.reason}.`,
      });
      return;
    }
    const { fields } = parsed;
    const request = fields.request ?? '';
    const first = requests.get(request);
    if (first !== undefined) {
      push(context, {
        code: 'run-line-duplicate',
        path: 'implementation.md',
        line: lineNumber,
        owner: IMPLEMENT,
        message: `Request ${request} already has a run line at line ${first}; update it in place.`,
      });
    } else {
      requests.set(request, lineNumber);
    }
    const classification = classifyDispatchOutcome(
      fields.launch ?? '',
      fields.outcome,
    );
    if (
      fields.class !== classification.classification ||
      fields.terminal !== (classification.terminal ? 'yes' : 'no')
    ) {
      push(context, {
        code: 'run-line-malformed',
        path: 'implementation.md',
        line: lineNumber,
        owner: IMPLEMENT,
        message: `Run line ${request} records terminal=${fields.terminal ?? '~'} class=${fields.class ?? '~'}, but launch ${fields.launch ?? '~'} with outcome ${fields.outcome ?? '~'} maps to ${classification.terminal ? 'yes' : 'no'}/${classification.classification}.`,
      });
      return;
    }
    if (!classification.terminal) {
      push(context, {
        code: 'run-line-unresolved',
        path: 'implementation.md',
        line: lineNumber,
        owner: IMPLEMENT,
        message: `Run ${request} is not terminal (launch ${fields.launch ?? '~'}, outcome ${fields.outcome ?? '~'}).`,
        severity: terminalBoundary(context) ? 'refuse' : 'warn',
      });
    }
  });
}

/**
 * Brace residue is the templates' own placeholder vocabulary anywhere, or any
 * brace token that starts a list item or follows a `**Label:**` marker (the
 * slots the templates fill). Ordinary prose such as `returns {status,
 * reasons}` is not residue.
 */
const BRACE_PLACEHOLDER =
  /\{(?:Project Name|Phase Name|Task Name|N|path|why|purpose|bullet|sha|time|capability \d+|command\(s\)[^{}\n]*|2-5 bullets[^{}\n]*|gotchas[^{}\n]*|trade-offs[^{}\n]*|tests\/lint[^{}\n]*|what (?:changed|materially)[^{}\n]*|pass\/fail[^{}\n]*|Notes will be added[^{}\n]*|Continue log[^{}\n]*)\}|^\s*(?:[-*]|\d+\.)\s+\{[^{}\n]+\}|\*\*[^*\n]+:\*\*\s*\{[^{}\n]+\}/;
const DATE_PLACEHOLDER = /\bYYYY-MM-DD\b/;
const BRACKET_PLACEHOLDER =
  /\[(?:Phase Name|Project Name|Execution record name|N|capability \d+|bullet|path|purpose|time|full (?:base |head |commit )?SHA[^\]]*|Summary prose[^\]]*|root \| phase-implementer[^\]]*|tests\/lint[^\]]*|observed evidence[^\]]*|what changed vs[^\]]*|short bullets[^\]]*|Decision made[^\]]*|anything discovered[^\]]*|Blocker description[^\]]*)\]/;

function stripInlineCode(line: string): string {
  return line.replace(/(`+)[^`]*?\1/g, '');
}

export function checkTemplateResidue(context: RuleContext): void {
  if (
    context.journalMeta.state === 'ok' &&
    context.journalMeta.record.oat_template === true &&
    context.boundary !== 'review'
  ) {
    push(context, {
      code: 'template-residue',
      path: 'implementation.md',
      line: frontmatterKeyLine(context.journal.lines, 'oat_template'),
      owner: IMPLEMENT,
      message: 'The journal still declares oat_template: true.',
    });
  }
  context.journal.lines.forEach((line, index) => {
    if (context.journal.recordMask[index] !== true) {
      return;
    }
    const lineNumber = index + 1;
    if (context.scope !== null) {
      const phaseId = sectionAt(context.journal, lineNumber)?.phase
        ?.declaredPhaseId;
      if (phaseId === undefined || !context.scope.has(phaseId)) {
        return;
      }
    }
    const text = stripInlineCode(line);
    const match =
      text.match(BRACE_PLACEHOLDER) ??
      text.match(BRACKET_PLACEHOLDER) ??
      text.match(DATE_PLACEHOLDER);
    if (match !== null) {
      push(context, {
        code: 'template-residue',
        path: 'implementation.md',
        line: lineNumber,
        owner: IMPLEMENT,
        message: `Template placeholder ${match[0]} survives.`,
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Overrides
// ---------------------------------------------------------------------------

const OVERRIDE_PREFIX = /^\*\*Override:\*\*/;
const OVERRIDE_LINE_PATTERN =
  /^\*\*Override:\*\*[ \t]+(\S+)[ \t]+·[ \t]+\*\*Authorized by:\*\*[ \t]+([A-Za-z0-9][A-Za-z0-9._:/-]*)[ \t]+·[ \t]+\*\*Scope:\*\*[ \t]+(\S+)[ \t]+·[ \t]+(\S.*)$/;

/** Which gaps each override code may cover. Nothing else is overridable. */
export const OVERRIDE_ELIGIBILITY: Readonly<
  Record<JournalOverrideCode, ReadonlySet<JournalReasonCode>>
> = {
  'scope-disposition-approved': new Set<JournalReasonCode>([
    'task-block-missing',
    'task-not-completed',
    'task-commit-missing',
    'phase-not-accepted',
  ]),
  'evidence-lost': new Set<JournalReasonCode>(['task-commit-missing']),
  'operator-accepted-gap': new Set<JournalReasonCode>([
    'task-block-missing',
    'task-not-completed',
    'task-commit-missing',
  ]),
};

export interface ParsedOverride {
  code: JournalOverrideCode;
  authorizedBy: string;
  scope: string;
  scopeKind: 'task' | 'phase';
  reason: string;
  line: number;
}

function normalizeOverrideScope(
  token: string,
): { scope: string; kind: 'task' | 'phase' } | null {
  const task = normalizeTaskId(token);
  if (task !== null) {
    return { scope: task.taskId, kind: 'task' };
  }
  const phase = normalizePhaseId(token);
  return phase === null ? null : { scope: phase, kind: 'phase' };
}

export function readOverrides(context: RuleContext): ParsedOverride[] {
  const overrides: ParsedOverride[] = [];
  context.journal.lines.forEach((line, index) => {
    if (context.journal.recordMask[index] !== true) {
      return;
    }
    const trimmed = line.trim();
    if (!OVERRIDE_PREFIX.test(trimmed)) {
      return;
    }
    const lineNumber = index + 1;
    const match = trimmed.match(OVERRIDE_LINE_PATTERN);
    const code = match?.[1];
    const scope =
      match?.[3] === undefined ? null : normalizeOverrideScope(match[3]);
    if (
      match === null ||
      code === undefined ||
      !(JOURNAL_OVERRIDE_CODES as readonly string[]).includes(code) ||
      scope === null ||
      match[2] === undefined ||
      match[4] === undefined
    ) {
      push(context, {
        code: 'override-malformed',
        path: 'implementation.md',
        line: lineNumber,
        owner: COMPLETE,
        message:
          'An override must read: **Override:** <scope-disposition-approved|evidence-lost|operator-accepted-gap> · **Authorized by:** <decision id> · **Scope:** <pNN-tNN|pNN> · <reason>.',
      });
      return;
    }
    const section = sectionAt(context.journal, lineNumber);
    if (section?.text !== 'Deviations from Plan / Design') {
      push(context, {
        code: 'override-misplaced',
        path: 'implementation.md',
        line: lineNumber,
        owner: COMPLETE,
        message: `An override belongs under ## Deviations from Plan / Design, not "${section?.text ?? 'no section'}".`,
      });
      return;
    }
    overrides.push({
      code: code as JournalOverrideCode,
      authorizedBy: match[2],
      scope: scope.scope,
      scopeKind: scope.kind,
      reason: match[4].trim(),
      line: lineNumber,
    });
  });
  return overrides;
}

/**
 * Whether an override's scope covers a finding's subject. A task scope covers
 * exactly that task; a phase scope covers the phase and every task in it.
 */
export function overrideCoversSubject(
  override: Pick<ParsedOverride, 'scope' | 'scopeKind'>,
  subject: NonNullable<Finding['subject']>,
): boolean {
  if (override.scopeKind === 'task') {
    return subject.taskId !== null && subject.taskId === override.scope;
  }
  return subject.phaseId === override.scope;
}
