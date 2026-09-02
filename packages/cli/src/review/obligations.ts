import {
  parseStrictMarkdownTable,
  scanStructuralLines,
} from './markdown-grammar';
import { normalizeReviewPaths } from './review-paths';
import type { ReviewObligationV1 } from './types';

function structuralText(source: Buffer | string): string[] {
  return scanStructuralLines(source).map(({ line }) => line);
}

export function parseRequirementObligations(
  source: Buffer | string,
  sourcePath: string,
): ReviewObligationV1[] {
  const lines = structuralText(source);
  const headings = lines
    .map((line, index) => (line === '## Requirement Index' ? index : -1))
    .filter((index) => index >= 0);
  if (headings.length !== 1) {
    throw new Error('Requirement Index must appear exactly once');
  }
  let tableStart = headings[0]! + 1;
  while (lines[tableStart] === '') tableStart++;
  const table = parseStrictMarkdownTable(lines, tableStart);
  if (table.headers[0] !== 'ID') {
    throw new Error('Requirement Index first header must be ID');
  }
  let sectionEnd = table.endIndex;
  while (lines[sectionEnd] === '') sectionEnd++;
  if (sectionEnd < lines.length && !lines[sectionEnd]!.startsWith('## ')) {
    throw new Error('Requirement Index has trailing content');
  }
  const seen = new Set<string>();
  return table.rows.map((cells) => {
    const id = cells[0]!;
    if (!/^(?:FR|NFR)\d+$/.test(id)) {
      throw new Error(`invalid requirement ID: ${id}`);
    }
    if (seen.has(id)) throw new Error(`duplicate requirement ID: ${id}`);
    seen.add(id);
    const summary = cells[1] ?? '';
    if (summary.length === 0) throw new Error(`${id} has no description`);
    const verification = cells[3] ?? '';
    return {
      id,
      kind: 'requirement' as const,
      source: sourcePath,
      summary,
      expectedPaths: [],
      expectedChecks: verification === '' ? [] : [verification],
    };
  });
}

const TASK_HEADING = /^### Task (p\d{2}-t\d{2}): ([^\r\n]+)$/;
const FILE_LINE = /^- (?:Create|Modify|Delete): `([^`\r\n]+)`$/;
const STEP_TERMINATOR = /^\*\*Step \d+: [^*]+\*\*(?: [^\r\n]+)?$/;

export function parsePlanTaskObligations(
  source: Buffer | string,
  sourcePath: string,
): ReviewObligationV1[] {
  const lines = structuralText(source);
  const tasks: ReviewObligationV1[] = [];
  const seenIds = new Set<string>();
  for (let index = 0; index < lines.length; index++) {
    const heading = TASK_HEADING.exec(lines[index]!);
    if (!heading) continue;
    const [, id = '', summary = ''] = heading;
    if (seenIds.has(id)) throw new Error(`duplicate plan task ID: ${id}`);
    seenIds.add(id);

    let end = index + 1;
    while (
      end < lines.length &&
      !lines[end]!.startsWith('## ') &&
      !lines[end]!.startsWith('### ')
    ) {
      end++;
    }
    const section = lines.slice(index + 1, end);
    const labels = section
      .map((line, sectionIndex) => (line === '**Files:**' ? sectionIndex : -1))
      .filter((sectionIndex) => sectionIndex >= 0);
    if (labels.length !== 1) {
      throw new Error(`${id} must contain exactly one Files block`);
    }
    let cursor = labels[0]! + 1;
    while (section[cursor] === '') cursor++;
    const rawPaths: string[] = [];
    while (cursor < section.length) {
      const match = FILE_LINE.exec(section[cursor]!);
      if (!match) break;
      rawPaths.push(match[1]!);
      cursor++;
    }
    if (rawPaths.length === 0) {
      throw new Error(`${id} Files block must contain at least one path`);
    }

    if (cursor < section.length) {
      let blankCount = 0;
      while (section[cursor] === '') {
        cursor++;
        blankCount++;
      }
      if (
        cursor < section.length &&
        (blankCount === 0 || !STEP_TERMINATOR.test(section[cursor]!))
      ) {
        throw new Error(`${id} has a malformed Files block terminator`);
      }
    }
    tasks.push({
      id,
      kind: 'task',
      source: sourcePath,
      summary,
      expectedPaths: normalizeReviewPaths(rawPaths),
      expectedChecks: [],
    });
  }
  return tasks;
}

const CANONICAL_DEVIATION_HEADERS = [
  'Task / Review',
  'Source Artifact',
  'Planned / Documented',
  'Actual / Accepted',
  'Reason',
  'Source of Truth',
  'Follow-up',
] as const;
const LEGACY_DEVIATION_HEADERS = [
  'Task / Review',
  'Planned / Expected',
  'Actual / Accepted',
  'Why',
  'Impact',
  'Approval / Source',
  'Source of Truth',
] as const;

export function parseDeviationObligations(
  source: Buffer | string,
  sourcePath: string,
): ReviewObligationV1[] {
  const lines = structuralText(source);
  const headings = lines
    .map((line, index) =>
      line === '## Deviations from Plan / Design' ? index : -1,
    )
    .filter((index) => index >= 0);
  if (headings.length === 0) return [];
  if (headings.length > 1) throw new Error('duplicate deviations section');
  let sectionEnd = headings[0]! + 1;
  while (sectionEnd < lines.length && !lines[sectionEnd]!.startsWith('## ')) {
    sectionEnd++;
  }
  const tableStarts = lines
    .slice(headings[0]! + 1, sectionEnd)
    .map((line, index) => {
      if (!line.startsWith('|') || !line.endsWith('|')) return -1;
      const headers = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());
      const canonical =
        headers.length === CANONICAL_DEVIATION_HEADERS.length &&
        headers.every(
          (header, headerIndex) =>
            header === CANONICAL_DEVIATION_HEADERS[headerIndex],
        );
      const legacy =
        headers.length === LEGACY_DEVIATION_HEADERS.length &&
        headers.every(
          (header, headerIndex) =>
            header === LEGACY_DEVIATION_HEADERS[headerIndex],
        );
      return canonical || legacy ? headings[0]! + 1 + index : -1;
    })
    .filter((index) => index >= 0);
  if (tableStarts.length !== 1) {
    throw new Error(
      'deviations section must contain exactly one deviations table',
    );
  }
  const tableStart = tableStarts[0]!;
  const table = parseStrictMarkdownTable(lines, tableStart);
  const canonical = table.headers.every(
    (header, index) => header === CANONICAL_DEVIATION_HEADERS[index],
  );
  const legacy = table.headers.every(
    (header, index) => header === LEGACY_DEVIATION_HEADERS[index],
  );
  if (!canonical && !legacy) {
    throw new Error('deviations table has the wrong headers');
  }
  const obligations: ReviewObligationV1[] = [];
  table.rows.forEach((cells, index) => {
    if (cells.every((cell) => cell === '-')) return;
    const task = cells[0]!;
    const actual = cells[canonical ? 3 : 2]!;
    const sourceOfTruth = cells[canonical ? 5 : 6]!;
    const complete = canonical
      ? cells.every((cell) => cell.length > 0 && cell !== '-')
      : [task, actual, sourceOfTruth].every(
          (cell) => cell.length > 0 && cell !== '-',
        );
    if (!complete) throw new Error(`deviation row ${index + 1} is incomplete`);
    obligations.push({
      id: `deviation:${task}:${index + 1}`,
      kind: 'deviation',
      source: sourceOfTruth || sourcePath,
      summary: actual,
      expectedPaths: [],
      expectedChecks: [],
    });
  });
  return obligations;
}

const DEFERRED_ENTRY = /^- `([^`\r\n]+)` ([^\r\n]+)$/;
const DEFERRED_DISPOSITION =
  /^  - Disposition: (deferred|resolved|dismissed)(?: [^\r\n]+)?$/;

export function parseDeferredFindingObligations(
  source: Buffer | string,
  sourcePath: string,
): ReviewObligationV1[] {
  const lines = structuralText(source);
  const latest = new Map<
    string,
    { disposition: 'deferred' | 'resolved' | 'dismissed'; summary: string }
  >();
  for (let index = 0; index < lines.length; index++) {
    if (lines[index] !== '**Deferred Findings:**') continue;
    const seenInBlock = new Set<string>();
    index++;
    while (index < lines.length) {
      const line = lines[index]!;
      if (
        line.startsWith('#') ||
        line === '---' ||
        (/^\*\*[^*]+\*\*$/.test(line) && line !== '**Deferred Findings:**')
      ) {
        index--;
        break;
      }
      if (line === '') {
        index++;
        continue;
      }
      const entry = DEFERRED_ENTRY.exec(line);
      if (!entry) throw new Error('malformed deferred finding entry');
      const [, id = '', summary = ''] = entry;
      if (seenInBlock.has(id)) {
        throw new Error(`duplicate deferred finding in block: ${id}`);
      }
      seenInBlock.add(id);
      let cursor = index + 1;
      let disposition: 'deferred' | 'resolved' | 'dismissed' | undefined;
      while (cursor < lines.length && !lines[cursor]!.startsWith('- `')) {
        const match = DEFERRED_DISPOSITION.exec(lines[cursor]!);
        if (match) {
          if (disposition !== undefined) {
            throw new Error(`duplicate disposition for deferred finding ${id}`);
          }
          disposition = match[1] as typeof disposition;
        } else if (
          lines[cursor]!.startsWith('#') ||
          lines[cursor] === '---' ||
          /^\*\*[^*]+\*\*$/.test(lines[cursor]!)
        ) {
          break;
        } else if (lines[cursor] !== '' && !lines[cursor]!.startsWith('  - ')) {
          throw new Error(`malformed deferred finding ${id}`);
        }
        cursor++;
      }
      if (disposition === undefined) {
        throw new Error(`deferred finding ${id} has no disposition`);
      }
      latest.set(id, { disposition, summary });
      index = cursor;
    }
  }
  return [...latest.entries()]
    .filter(([, entry]) => entry.disposition === 'deferred')
    .map(([id, entry]) => ({
      id: `deferred-finding:${id}`,
      kind: 'deferred-finding' as const,
      source: sourcePath,
      summary: entry.summary,
      expectedPaths: [],
      expectedChecks: [],
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export interface CollectReviewObligationsInput {
  workflowMode: 'spec-driven' | 'quick' | 'import';
  scope: string;
  throughTaskId?: string | null;
  plan: { source: Buffer | string; path: string };
  spec?: { source: Buffer | string; path: string };
  implementation?: { source: Buffer | string; path: string } | null;
}

export async function collectReviewObligations(
  input: CollectReviewObligationsInput,
): Promise<ReviewObligationV1[]> {
  const planTasks = parsePlanTaskObligations(
    input.plan.source,
    input.plan.path,
  );
  let selected: ReviewObligationV1[];
  if (input.throughTaskId && !/^p\d{2}$/.test(input.scope)) {
    throw new Error('through-task boundary requires a phase review scope');
  }
  if (/^p\d{2}-t\d{2}$/.test(input.scope)) {
    selected = planTasks.filter((task) => task.id === input.scope);
    if (selected.length !== 1) {
      throw new Error(`unknown review task scope: ${input.scope}`);
    }
  } else if (/^p\d{2}$/.test(input.scope)) {
    const phaseTasks = planTasks.filter((task) =>
      task.id.startsWith(`${input.scope}-`),
    );
    if (phaseTasks.length === 0) {
      throw new Error(`unknown review phase scope: ${input.scope}`);
    }
    if (input.throughTaskId) {
      if (!input.throughTaskId.startsWith(`${input.scope}-t`)) {
        throw new Error(
          `through-task ${input.throughTaskId} does not belong to ${input.scope}`,
        );
      }
      const boundaryIndex = phaseTasks.findIndex(
        (task) => task.id === input.throughTaskId,
      );
      if (boundaryIndex < 0) {
        throw new Error(
          `unknown through-task boundary: ${input.throughTaskId}`,
        );
      }
      selected = phaseTasks.slice(0, boundaryIndex + 1);
      if (selected.length === 0) {
        throw new Error('through-task boundary produced an empty phase prefix');
      }
    } else {
      selected = phaseTasks;
    }
  } else if (input.scope === 'final') {
    if (input.workflowMode === 'spec-driven') {
      if (!input.spec) {
        throw new Error('spec-driven final scope requires spec source');
      }
      selected = parseRequirementObligations(
        input.spec.source,
        input.spec.path,
      );
    } else {
      selected = planTasks;
    }
  } else {
    throw new Error(`unsupported review scope: ${input.scope}`);
  }

  if (input.implementation) {
    selected = [
      ...selected,
      ...parseDeviationObligations(
        input.implementation.source,
        input.implementation.path,
      ),
      ...parseDeferredFindingObligations(
        input.implementation.source,
        input.implementation.path,
      ),
    ];
  }
  const ids = new Set<string>();
  for (const obligation of selected) {
    if (ids.has(obligation.id)) {
      throw new Error(`duplicate selected obligation: ${obligation.id}`);
    }
    ids.add(obligation.id);
  }
  return selected.sort((left, right) => left.id.localeCompare(right.id));
}
