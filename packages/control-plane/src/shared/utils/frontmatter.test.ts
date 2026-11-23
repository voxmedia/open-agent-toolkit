import { describe, expect, it } from 'vitest';

import { extractFrontmatter, parseFrontmatterRecord } from './frontmatter';

describe('frontmatter utils', () => {
  it('extracts frontmatter content from markdown', () => {
    expect(
      extractFrontmatter(`---
oat_status: complete
---
# Artifact
`),
    ).toBe('oat_status: complete');
  });

  it('parses YAML frontmatter into a record and falls back on malformed input', () => {
    expect(
      parseFrontmatterRecord(`---
oat_status: complete
oat_template: false
---
`),
    ).toEqual({
      oat_status: 'complete',
      oat_template: false,
    });

    expect(
      parseFrontmatterRecord(`---
oat_status: [unterminated
---
`),
    ).toEqual({});
  });

  it('parses a CRLF block whose last field is a quoted scalar (m01 R3-1)', () => {
    const crlf = (lines: string[]): string => lines.join('\r\n');
    expect(
      parseFrontmatterRecord(
        crlf([
          '---',
          'oat_workflow_mode: "freestyle"',
          '---',
          '',
          '# State',
          '',
        ]),
      ),
    ).toEqual({ oat_workflow_mode: 'freestyle' });
    expect(
      parseFrontmatterRecord(
        crlf([
          '---',
          'oat_workflow_mode: freestyle',
          'oat_project_state_updated: "2026-11-22T00:00:00Z"',
          '---',
          '',
        ]),
      ),
    ).toEqual({
      oat_workflow_mode: 'freestyle',
      oat_project_state_updated: '2026-11-22T00:00:00Z',
    });
    // The LF block keeps its exact extraction.
    expect(extractFrontmatter('---\na: "b"\n---\n')).toBe('a: "b"');
  });
});
