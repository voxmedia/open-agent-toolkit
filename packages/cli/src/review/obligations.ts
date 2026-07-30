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
  if (
    table.endIndex < lines.length &&
    lines[table.endIndex] !== '' &&
    !lines[table.endIndex]!.startsWith('## ')
  ) {
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
