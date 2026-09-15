import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const TEMPLATES_DIR = join(
  import.meta.dirname,
  '../../../../../../../.oat/templates',
);

// A template line that quotes one of its own headings is matched before the
// heading itself by any substring search, so a scripted edit that slices from
// that heading deletes the body (BL-260915-stop-the-implementation).
function headingLiteralsOutsideHeadings(text: string): string[] {
  const headings = [...text.matchAll(/^(#{2,6} .+?)\s*$/gm)].map(
    (match) => match[1] as string,
  );
  return text
    .split('\n')
    .filter((line) => !/^#{2,6} /.test(line))
    .flatMap((line) =>
      headings
        .filter((heading) => line.includes(heading))
        .map((heading) => `${heading} in: ${line.trim()}`),
    );
}

describe('bundled template heading literals', () => {
  const templates = readdirSync(TEMPLATES_DIR).filter((name) =>
    name.endsWith('.md'),
  );

  it('covers the implementation template', () => {
    expect(templates).toContain('implementation.md');
  });

  it.each(templates)(
    '%s never quotes its own heading outside a heading line',
    (name) => {
      const text = readFileSync(join(TEMPLATES_DIR, name), 'utf8');
      expect(headingLiteralsOutsideHeadings(text)).toEqual([]);
    },
  );

  it('flags a preamble that quotes a heading', () => {
    const text =
      '> - ensure `## Final Summary (for PR/docs)` is filled.\n\n## Final Summary (for PR/docs)\n';
    expect(headingLiteralsOutsideHeadings(text)).toHaveLength(1);
  });
});
