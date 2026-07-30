import { describe, expect, it } from 'vitest';

import {
  normalizeMarkdownSource,
  parseStrictMarkdownTable,
  scanStructuralLines,
} from './markdown-grammar';

describe('Markdown lexical grammar', () => {
  it('decodes strict UTF-8 and normalizes newlines', () => {
    expect(normalizeMarkdownSource(Buffer.from('a\r\nb\rc'))).toBe('a\nb\nc');
    expect(() => normalizeMarkdownSource(Buffer.from([0xff]))).toThrow();
    expect(() => normalizeMarkdownSource('a\0b')).toThrow(/NUL/);
  });

  it('masks fenced regions while retaining exact structural lines', () => {
    const lines = scanStructuralLines(
      '# Visible\n```md\n## Hidden\n```\n## Exact  \n',
    );
    expect(lines).toEqual([
      { line: '# Visible', lineNumber: 1 },
      { line: '## Exact  ', lineNumber: 5 },
      { line: '', lineNumber: 6 },
    ]);
  });

  it('rejects an unclosed fence', () => {
    expect(() => scanStructuralLines('```\ncontent')).toThrow(/unclosed/);
  });

  it('parses escaped pipes and strict widths', () => {
    expect(
      parseStrictMarkdownTable([
        '| ID | Summary |',
        '| --- | --- |',
        '| FR1 | escaped \\| pipe |',
        '',
      ]),
    ).toEqual({
      headers: ['ID', 'Summary'],
      rows: [['FR1', 'escaped | pipe']],
      endIndex: 3,
    });
  });

  it.each([
    ['ID | Summary |', '| --- | --- |'],
    ['| ID | Summary |', '| -- | --- |'],
    ['| ID | Summary |', '| --- | --- |', '| FR1 |'],
  ])('rejects malformed table rows', (...lines) => {
    expect(() => parseStrictMarkdownTable(lines)).toThrow();
  });
});
