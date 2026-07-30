export interface StructuralLine {
  line: string;
  lineNumber: number;
}

export function normalizeMarkdownSource(source: Buffer | string): string {
  const value =
    typeof source === 'string'
      ? source
      : new TextDecoder('utf-8', { fatal: true }).decode(source);
  if (value.includes('\0')) throw new Error('Markdown source contains NUL');
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

export function scanStructuralLines(source: Buffer | string): StructuralLine[] {
  const lines = normalizeMarkdownSource(source).split('\n');
  const result: StructuralLine[] = [];
  let fence: { character: '`' | '~'; length: number } | null = null;
  lines.forEach((line, index) => {
    if (fence === null) {
      const opening = /^ {0,3}(`{3,}|~{3,})(?:[^`~]*)$/.exec(line);
      if (opening) {
        const marker = opening[1]!;
        fence = {
          character: marker[0] as '`' | '~',
          length: marker.length,
        };
        return;
      }
      result.push({ line, lineNumber: index + 1 });
      return;
    }
    const closePattern = new RegExp(
      `^ {0,3}\\${fence.character}{${fence.length},}[ \\t]*$`,
    );
    if (closePattern.test(line)) fence = null;
  });
  if (fence !== null) throw new Error('Markdown source has an unclosed fence');
  return result;
}

function splitTableRow(row: string): string[] {
  if (!row.startsWith('|') || !row.endsWith('|')) {
    throw new Error('Markdown table rows must begin and end with a pipe');
  }
  const cells: string[] = [];
  let cell = '';
  for (let index = 1; index < row.length - 1; index++) {
    const character = row[index]!;
    if (character === '\\' && row[index + 1] === '|') {
      cell += '|';
      index++;
    } else if (character === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function parseStrictMarkdownTable(
  lines: readonly string[],
  startIndex = 0,
): { headers: string[]; rows: string[][]; endIndex: number } {
  const header = lines[startIndex];
  const separator = lines[startIndex + 1];
  if (header === undefined || separator === undefined) {
    throw new Error('Markdown table requires a header and separator');
  }
  const headers = splitTableRow(header);
  const separators = splitTableRow(separator);
  if (
    separators.length !== headers.length ||
    separators.some((cell) => !/^:?-{3,}:?$/.test(cell))
  ) {
    throw new Error('Markdown table has an invalid separator');
  }
  const rows: string[][] = [];
  let endIndex = startIndex + 2;
  while (endIndex < lines.length && lines[endIndex]!.startsWith('|')) {
    const cells = splitTableRow(lines[endIndex]!);
    if (cells.length !== headers.length) {
      throw new Error('Markdown table row width does not match its header');
    }
    rows.push(cells);
    endIndex++;
  }
  return { headers, rows, endIndex };
}
