import {
  parseStrictMarkdownTable,
  scanStructuralLines,
} from './markdown-grammar';
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
