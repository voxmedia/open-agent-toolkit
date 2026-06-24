import { describe, expect, it } from 'vitest';

import { computeManagedIndexUpdate } from './managed-index';

const START = '<!-- OAT TEST-INDEX -->';
const END = '<!-- END OAT TEST-INDEX -->';

function block(rows: string[]): string {
  return [START, '| ID | Title |', '| --- | --- |', ...rows, END].join('\n');
}

describe('computeManagedIndexUpdate', () => {
  it('skips the write when the existing block is content-equal', () => {
    const rendered = block(['| a | Alpha |']);
    const existing = `# Index\n\n${rendered}\n\n## Notes\n`;

    const result = computeManagedIndexUpdate(
      existing,
      existing.indexOf(START),
      existing.indexOf(END) + END.length,
      rendered,
    );

    expect(result.content).toBeNull();
  });

  it('treats column-padding differences as content-equal (formatter churn)', () => {
    const rendered = block(['| a | Alpha |']);
    const reformattedBlock = [
      START,
      '| ID  | Title |',
      '| --- | ----- |',
      '| a   | Alpha |',
      END,
    ].join('\n');
    const existing = `# Index\n\n${reformattedBlock}\n`;

    const result = computeManagedIndexUpdate(
      existing,
      existing.indexOf(START),
      existing.indexOf(END) + END.length,
      rendered,
    );

    expect(result.content).toBeNull();
  });

  it('ignores formatter-introduced blank lines inside the block', () => {
    const rendered = block(['| a | Alpha |']);
    const spacedBlock = [
      START,
      '',
      '| ID | Title |',
      '| --- | --- |',
      '| a | Alpha |',
      '',
      END,
    ].join('\n');
    const existing = `# Index\n\n${spacedBlock}\n`;

    const result = computeManagedIndexUpdate(
      existing,
      existing.indexOf(START),
      existing.indexOf(END) + END.length,
      rendered,
    );

    expect(result.content).toBeNull();
  });

  it('rewrites when a row is added', () => {
    const existingBlock = block(['| a | Alpha |']);
    const existing = `# Index\n\n${existingBlock}\n`;
    const rendered = block(['| a | Alpha |', '| b | Beta |']);

    const result = computeManagedIndexUpdate(
      existing,
      existing.indexOf(START),
      existing.indexOf(END) + END.length,
      rendered,
    );

    expect(result.content).toBe(`# Index\n\n${rendered}\n`);
  });

  it('rewrites when a cell value changes', () => {
    const existingBlock = block(['| a | Alpha |']);
    const existing = `# Index\n\n${existingBlock}\n`;
    const rendered = block(['| a | Alphabet |']);

    const result = computeManagedIndexUpdate(
      existing,
      existing.indexOf(START),
      existing.indexOf(END) + END.length,
      rendered,
    );

    expect(result.content).toBe(`# Index\n\n${rendered}\n`);
  });

  it('rewrites when rows are reordered', () => {
    const existingBlock = block(['| a | Alpha |', '| b | Beta |']);
    const existing = `# Index\n\n${existingBlock}\n`;
    const rendered = block(['| b | Beta |', '| a | Alpha |']);

    const result = computeManagedIndexUpdate(
      existing,
      existing.indexOf(START),
      existing.indexOf(END) + END.length,
      rendered,
    );

    expect(result.content).toBe(`# Index\n\n${rendered}\n`);
  });
});
