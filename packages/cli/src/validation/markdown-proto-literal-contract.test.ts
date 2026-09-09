import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Repository contract: the JavaScript prototype key literal must never appear
 * in repository Markdown outside a code span.
 *
 * Bounded surface: every tracked `*.md` file under `.oat/repo/**` and
 * `apps/oat-docs/docs/**`, read from `git ls-files -z` so untracked scratch
 * files and ignored paths are never scanned and a quoted or unusual path is
 * still delivered intact.
 *
 * ## Why this guard exists
 *
 * `oxfmt` (pinned at the repository root `package.json`) reads a bare
 * double-underscore-delimited token in Markdown prose as strong emphasis and
 * rewrites it, so the literal name of the prototype key becomes a bold `proto`
 * and its meaning is destroyed. A backticked occurrence is left alone. The
 * rewrite reproduces on a scratch file: `A bare` + the bare literal +
 * `in prose.` becomes `A bare **proto** in prose.`, and an unrelated inline
 * code span elsewhere on the same line does not protect it.
 *
 * The vector is the commit hook, not `pnpm format`. The root `format` script
 * scopes `oxfmt --check` to `.agents/skills/**`, `apps/oat-docs/docs/**`, and
 * `tools/smoke/**`, so `.oat/repo/**` is outside it — but `.lintstagedrc.mjs:14`
 * maps `'*.md'` to `oxfmt --write --no-error-on-unmatched-pattern` with no path
 * restriction, so every staged Markdown file in the repository is rewritten at
 * commit time. `.oxfmtrc.jsonc` `ignorePatterns` exempts
 * `.oat/**\/explainers/**` and `.oat/repo/reference/project-recaps/**` and
 * nothing else under `.oat/repo`.
 *
 * Two forms are therefore rejected: the bare literal (not yet mangled, but it
 * will be at the next commit that stages the file) and the bold `proto` it
 * becomes (already mangled, already meaning the wrong thing).
 *
 * ## Why a vitest contract test and not a markdownlint rule
 *
 * - `markdownlint` exists in this repository only as an `apps/oat-docs`
 *   devDependency (`markdownlint-cli2`), configured by
 *   `apps/oat-docs/.markdownlint.jsonc`, and invoked only over that app's
 *   `docs/**\/*.md`. Covering `.oat/repo/**` would mean a new root-level
 *   dependency, a new root config, a new root script, and a new CI step — four
 *   new surfaces for one rule.
 * - The rule is not expressible in markdownlint's built-in set. It would need a
 *   custom rule module, which markdownlint loads as JavaScript and which would
 *   then itself need a gate.
 * - `packages/cli/src/validation/` already holds repository-corpus contract
 *   tests that sweep Markdown outside this package
 *   (`named-skill-load-contract.test.ts`, `autonomy-gate-inventory.test.ts`),
 *   and they run under `turbo run test`, which CI already gates via
 *   `pnpm test`. The guard therefore gets CI coverage with zero new wiring.
 * - Escaping titles inside `packages/cli/src/commands/backlog/regenerate-index.ts`
 *   was the rejected alternative: it would fix only the generated backlog index,
 *   would leave `.oat/repo/pjm/backlog/completed.md` and hand-written prose
 *   unguarded, and would make the generator responsible for a formatter quirk it
 *   has no knowledge of.
 *
 * ## Candidate definition
 *
 * Fenced code blocks (backtick and tilde, tracking the opening marker so a
 * nested fence of the other kind does not close it) are blanked. What remains
 * is segmented into inline regions, and inline code spans are masked inside
 * each region. Everything that survives is prose.
 *
 * A code span may contain a line ending but may not cross a block boundary, and
 * repository Markdown really does wrap long backticked expressions across a
 * line break — `.oat/repo/reference/external-plans/2026-09-08-harden-normalized-config-maps.md`
 * carries two such spans containing the literal, and `oxfmt --write` leaves that
 * file byte-identical. A line-scoped stripper would report those as violations;
 * a stripper that pairs delimiters until the next blank line instead lets them
 * pair across a heading, a table row, an adjacent list item, an HTML block, or
 * a frontmatter fence, which silently swallows a real prose occurrence. Regions
 * are therefore bounded by blank lines *and* by block starts, which keeps the
 * genuine wrapped span masked while never pairing across a block boundary.
 * Masking preserves line endings and replaces every other masked code unit with
 * a space, so reported line numbers stay exact.
 *
 * Every expectation encoded in `DETECTOR_CASES` below was verified against real
 * `oxfmt --write` output on a scratch file. The invariant that matters is
 * one-directional: whenever `oxfmt` mangles a case, the guard must flag it. The
 * converse does not hold — the guard is deliberately stricter on constructs
 * `oxfmt` leaves alone:
 *
 * - Four-space indented code blocks are scanned as prose, matching
 *   `named-skill-load-contract.test.ts`, which also excludes only fenced blocks.
 *   Excluding them properly needs list-context tracking (a 4-space continuation
 *   paragraph inside a list item is *not* code, and `oxfmt` does mangle a bare
 *   literal there), and getting that wrong would make the guard weaker, so the
 *   strict direction is the safe one. Convert such an example to a fenced block.
 * - A fenced block indented four or more spaces is not recognized as a fence,
 *   and neither is an opener whose closer is missing; both are scanned as prose.
 * - Every line carrying an unescaped `|` is treated as a table row and masked
 *   cell by cell, because a GFM table may omit its outer pipes.
 *
 * No tracked file on the scanned surface hits any of those cases today.
 *
 * YAML frontmatter is scanned as prose *on purpose*. `oxfmt` does not mangle a
 * bare literal inside frontmatter, but `oat backlog regenerate-index` copies a
 * backlog item's `title` verbatim into a Markdown table in
 * `.oat/repo/pjm/backlog/index.md`, and `oat backlog archive` copies it into
 * `.oat/repo/pjm/backlog/completed.md`. Both destinations are prose, so a bare
 * frontmatter title is a mangling that has not happened yet.
 *
 * There is deliberately no escape hatch. Backticks are always available and
 * always correct; a suppression marker would reintroduce the silence this
 * guard exists to remove.
 */

const REPOSITORY_ROOT = resolve(process.cwd(), '..', '..');

const SCANNED_SURFACES = ['.oat/repo', 'apps/oat-docs/docs'] as const;

/** The literal prototype key, unprotected by a code span. */
const BARE_FORM = /__proto__/;

/** What `oxfmt` rewrites the bare form into: strong emphasis around `proto`. */
const MANGLED_FORM = /\*\*proto\*\*/;

const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

const ATX_HEADING = /^ {0,3}#{1,6}(?:[ \t]|$)/;
const THEMATIC_BREAK =
  /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const SETEXT_UNDERLINE = /^ {0,3}(?:=+|-+)[ \t]*$/;
const HTML_BLOCK = /^ {0,3}</;
const INDENTED_LINE = /^(?: {4}|\t)/;
const BLOCK_QUOTE = /^ {0,3}>/;
const QUOTE_PREFIX = /^ {0,3}(?:>[ \t]?)+/;
// A list marker at any depth. `^ {0,3}` would miss a nested item, and a nested
// item really is a new block: `- a` / `    - \`open` / `    - <bare> \`close`
// is mangled by oxfmt (verified).
const LIST_ITEM = /^[ \t]*(?:[-+*]|\d{1,9}[.)])(?:[ \t]|$)/;

/**
 * CommonMark HTML blocks whose end condition is a closing tag rather than a
 * blank line. Their content is raw text, so a fence-shaped or delimiter-shaped
 * line inside one is not a fence and not a block start.
 */
const RAW_HTML_BLOCKS = [
  {
    open: /^ {0,3}<(?:script|pre|style|textarea)(?:[ \t>]|$)/i,
    close: /<\/(?:script|pre|style|textarea)>/i,
  },
  { open: /^ {0,3}<!--/, close: /-->/ },
  { open: /^ {0,3}<\?/, close: /\?>/ },
  { open: /^ {0,3}<![A-Za-z]/, close: />/ },
  { open: /^ {0,3}<!\[CDATA\[/, close: /\]\]>/ },
] as const;

interface Occurrence {
  file: string;
  line: number;
  count: number;
  text: string;
}

/** A line with one trailing carriage return removed. */
function withoutCarriageReturn(line: string): string {
  return line.endsWith('\r') ? line.slice(0, -1) : line;
}

/** The line content a block-start test should see, without container prefixes. */
function blockContent(line: string): string {
  return withoutCarriageReturn(line).replace(QUOTE_PREFIX, '');
}

/** Whether the line holds an unescaped table cell delimiter. */
function hasTableDelimiter(line: string): boolean {
  for (let index = 0; index < line.length; index += 1) {
    if (line.charAt(index) === '|' && !isBackslashEscaped(line, index))
      return true;
  }
  return false;
}

/**
 * Index every line that lies inside a raw-text HTML block, inclusive of the
 * opening and closing lines.
 */
function findRawHtmlLines(lines: readonly string[]): Set<number> {
  const inside = new Set<number>();
  let close: RegExp | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const content = blockContent(lines[index] ?? '');
    if (close !== null) {
      inside.add(index);
      if (close.test(content)) close = null;
      continue;
    }
    const block = RAW_HTML_BLOCKS.find((candidate) =>
      candidate.open.test(content),
    );
    if (block === undefined) continue;
    inside.add(index);
    if (!block.close.test(content)) close = block.close;
  }

  return inside;
}

/**
 * Replace the content of every *matched* fenced code block, and its fence
 * lines, with empty lines. Line count is preserved so reported line numbers
 * stay exact.
 *
 * An opener with no closer blanks nothing. Running an unclosed fence to end of
 * document is what CommonMark does, but here it is the dangerous direction: a
 * fence-shaped line inside an HTML block, or the closer of a list-prefixed
 * fence this pass never recognized as an opener, would otherwise blank every
 * later line and silently swallow real prose (both verified as mangled by
 * oxfmt). Leaving an unmatched opener as prose can only over-report.
 */
function blankFencedBlocks(lines: readonly string[]): string[] {
  const blanked = lines.slice();
  const rawHtml = findRawHtmlLines(lines);
  let openIndex = -1;
  let openChar = '';
  let openLength = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (rawHtml.has(index)) continue;
    const match = FENCE_LINE.exec(blockContent(lines[index] ?? ''));
    const marker = match?.[1];
    const info = match?.[2] ?? '';
    if (marker === undefined) continue;

    if (openIndex === -1) {
      // A backtick fence's info string may not contain a backtick, so a line
      // like `` `a` and `b` `` is prose, not a fence opener.
      if (marker.charAt(0) === '`' && info.includes('`')) continue;
      openIndex = index;
      openChar = marker.charAt(0);
      openLength = marker.length;
      continue;
    }

    if (
      marker.charAt(0) === openChar &&
      marker.length >= openLength &&
      info.trim() === ''
    ) {
      for (let position = openIndex; position <= index; position += 1) {
        blanked[position] = '';
      }
      openIndex = -1;
    }
  }

  return blanked;
}

type LineKind = 'blank' | 'atomic' | 'quote' | 'item' | 'plain';

/**
 * Classify each line by the block it starts, conservatively.
 *
 * `atomic` lines carry their own inline content and never share a region with a
 * neighbour. Block-start tests run against `blockContent`, so a heading or a
 * table row nested inside a blockquote still breaks the region, and a trailing
 * carriage return never hides a block start.
 *
 * An indented line only counts as code when a blank line precedes it, because
 * an indented code block cannot interrupt a paragraph and a wrapped code span
 * really does continue onto an indented line (verified: `oxfmt` leaves such a
 * span alone).
 */
function classifyLines(lines: readonly string[]): LineKind[] {
  const kinds: LineKind[] = [];
  const rawHtml = findRawHtmlLines(lines);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const content = blockContent(line);

    // `trim` also covers a CRLF line whose only content is the carriage return.
    if (line.trim() === '') {
      kinds.push('blank');
      continue;
    }
    if (
      rawHtml.has(index) ||
      ATX_HEADING.test(content) ||
      THEMATIC_BREAK.test(content) ||
      SETEXT_UNDERLINE.test(content) ||
      HTML_BLOCK.test(content) ||
      hasTableDelimiter(content)
    ) {
      kinds.push('atomic');
      continue;
    }
    if (
      INDENTED_LINE.test(withoutCarriageReturn(line)) &&
      (index === 0 || kinds[index - 1] === 'blank')
    ) {
      kinds.push('atomic');
      continue;
    }
    if (LIST_ITEM.test(content)) {
      kinds.push('item');
      continue;
    }
    if (BLOCK_QUOTE.test(withoutCarriageReturn(line))) {
      kinds.push('quote');
      continue;
    }
    kinds.push('plain');
  }

  return kinds;
}

interface Region {
  start: number;
  end: number;
}

/** Group lines into inline regions a code span may not escape. */
function segmentRegions(kinds: readonly LineKind[]): Region[] {
  const regions: Region[] = [];
  let current: Region | null = null;
  let previous: LineKind = 'blank';

  for (let index = 0; index < kinds.length; index += 1) {
    const kind = kinds[index] ?? 'blank';

    if (kind === 'blank') {
      current = null;
    } else if (kind === 'atomic') {
      regions.push({ start: index, end: index });
      current = null;
    } else if (kind === 'item') {
      current = { start: index, end: index };
      regions.push(current);
    } else if (kind === 'quote' && (current === null || previous !== 'quote')) {
      current = { start: index, end: index };
      regions.push(current);
    } else if (current === null) {
      current = { start: index, end: index };
      regions.push(current);
    } else {
      current.end = index;
    }

    previous = kind;
  }

  return regions;
}

/** Whether the character at `position` is preceded by an odd backslash run. */
function isBackslashEscaped(text: string, position: number): boolean {
  let backslashes = 0;
  let cursor = position - 1;
  while (cursor >= 0 && text.charAt(cursor) === '\\') {
    backslashes += 1;
    cursor -= 1;
  }
  return backslashes % 2 === 1;
}

/**
 * Mask every inline code span in one region with spaces, preserving newlines.
 *
 * A backtick run of length n opens a span closed by the next backtick run of
 * exactly length n. An unclosed run is literal text, and scanning resumes
 * immediately after it so a later run still gets its own chance to open a span.
 *
 * A backslash-escaped backtick cannot open a span, and skipping that check
 * would be a real hole rather than a nicety: `oxfmt` mangles the bare literal
 * in `A \`literal backtick and then <bare literal> and another `code` span.`
 * (verified), because CommonMark reads the escaped backtick as text and only
 * the later pair as a span. An escape-blind scanner pairs the escaped backtick
 * with that later one and masks the literal away. Escapes are deliberately
 * *not* honoured while searching for the closing run, because backslash escapes
 * do not work inside a code span.
 */
function maskInlineCodeSpans(text: string): string {
  const masked = text.split('');
  const length = text.length;
  let index = 0;

  while (index < length) {
    if (text.charAt(index) !== '`' || isBackslashEscaped(text, index)) {
      index += 1;
      continue;
    }

    const runStart = index;
    while (index < length && text.charAt(index) === '`') index += 1;
    const runLength = index - runStart;

    let cursor = index;
    let closeEnd = -1;
    while (cursor < length) {
      if (text.charAt(cursor) !== '`') {
        cursor += 1;
        continue;
      }
      let runEnd = cursor;
      while (runEnd < length && text.charAt(runEnd) === '`') runEnd += 1;
      if (runEnd - cursor === runLength) {
        closeEnd = runEnd;
        break;
      }
      cursor = runEnd;
    }

    if (closeEnd === -1) continue;

    for (let position = runStart; position < closeEnd; position += 1) {
      if (masked[position] !== '\n') masked[position] = ' ';
    }
    index = closeEnd;
  }

  return masked.join('');
}

/**
 * Mask a GFM table row cell by cell.
 *
 * A cell is its own inline context, so a delimiter in one cell may not pair
 * with one in the next. Verified: `| `open | <bare literal> `close |` is
 * mangled by `oxfmt`, and a whole-row scan would have masked it away.
 */
function maskTableRow(line: string): string {
  let result = '';
  let cellStart = 0;

  for (let index = 0; index < line.length; index += 1) {
    if (line.charAt(index) !== '|' || isBackslashEscaped(line, index)) continue;
    result += maskInlineCodeSpans(line.slice(cellStart, index));
    result += '|';
    cellStart = index + 1;
  }

  return result + maskInlineCodeSpans(line.slice(cellStart));
}

/** The prose of a Markdown document, one entry per source line. */
function toProseLines(source: string): string[] {
  const blanked = blankFencedBlocks(source.split('\n'));
  const prose = blanked.slice();

  for (const region of segmentRegions(classifyLines(blanked))) {
    const first = blanked[region.start] ?? '';
    if (region.start === region.end && hasTableDelimiter(first)) {
      prose[region.start] = maskTableRow(first);
      continue;
    }
    const masked = maskInlineCodeSpans(
      blanked.slice(region.start, region.end + 1).join('\n'),
    ).split('\n');
    for (let offset = 0; offset < masked.length; offset += 1) {
      prose[region.start + offset] = masked[offset] ?? '';
    }
  }

  return prose;
}

function countMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(new RegExp(pattern.source, 'g'))].length;
}

function scanSource(
  file: string,
  source: string,
  pattern: RegExp,
): Occurrence[] {
  const rawLines = source.split('\n');
  const occurrences: Occurrence[] = [];

  toProseLines(source).forEach((prose, index) => {
    const count = countMatches(prose, pattern);
    if (count === 0) return;
    occurrences.push({
      file,
      line: index + 1,
      count,
      text: rawLines[index] ?? '',
    });
  });

  return occurrences;
}

function listTrackedMarkdown(repositoryRoot: string): string[] {
  // `-z` because git quotes a non-ASCII pathname by default, and a quoted or
  // newline-bearing record would silently drop out of a newline-split list.
  const listed = execFileSync(
    'git',
    ['ls-files', '-z', '--', ...SCANNED_SURFACES],
    { cwd: repositoryRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );

  return listed.split('\0').filter((entry) => entry.endsWith('.md'));
}

function findOccurrences(
  repositoryRoot: string,
  files: readonly string[],
  pattern: RegExp,
): Occurrence[] {
  const occurrences: Occurrence[] = [];
  for (const file of files) {
    occurrences.push(
      ...scanSource(
        file,
        readFileSync(join(repositoryRoot, file), 'utf8'),
        pattern,
      ),
    );
  }
  return occurrences;
}

function describeOccurrences(
  occurrences: readonly Occurrence[],
  form: string,
): string {
  const rows = occurrences
    .map(
      (occurrence) =>
        `  ${occurrence.file}:${occurrence.line} (x${occurrence.count})\n    ${occurrence.text.trim()}`,
    )
    .join('\n');
  return [
    `${occurrences.length} line(s) carry ${form} outside a code span:`,
    rows,
    'Fix: wrap the literal in backticks. `oxfmt` leaves a backticked occurrence',
    'alone, and the commit hook rewrites every staged *.md file, so a bare',
    'occurrence becomes a bold `proto` and loses its meaning at the next commit.',
    'A bare literal in YAML frontmatter is copied verbatim into generated',
    'Markdown by `oat backlog regenerate-index` and `oat backlog archive`, where',
    'it is mangled the same way.',
  ].join('\n');
}

describe('repository Markdown keeps the prototype key literal inside a code span', () => {
  const files = listTrackedMarkdown(REPOSITORY_ROOT);

  it('scans a non-empty Markdown corpus', () => {
    // A broken surface glob or a wrong `cwd` would otherwise make both
    // assertions below pass vacuously.
    expect(
      files.length,
      `no tracked Markdown found under ${SCANNED_SURFACES.join(', ')} from ${REPOSITORY_ROOT}`,
    ).toBeGreaterThan(0);
  });

  it('carries no bold-mangled prototype key in prose', () => {
    const occurrences = findOccurrences(REPOSITORY_ROOT, files, MANGLED_FORM);
    expect(
      occurrences,
      occurrences.length === 0
        ? ''
        : describeOccurrences(occurrences, 'the formatter-mangled bold form'),
    ).toEqual([]);
  });

  it('carries no bare prototype key literal in prose', () => {
    const occurrences = findOccurrences(REPOSITORY_ROOT, files, BARE_FORM);
    expect(
      occurrences,
      occurrences.length === 0
        ? ''
        : describeOccurrences(occurrences, 'the bare literal'),
    ).toEqual([]);
  });
});

/**
 * `formatter` records what `pnpm exec oxfmt --write` really did to the same
 * input on a scratch file. `bare` and `mangled` are the 1-based line numbers
 * the detector must report.
 */
interface DetectorCase {
  name: string;
  markdown: string;
  formatter: 'mangles' | 'preserves';
  bare: number[];
  mangled: number[];
  note?: string;
}

const BARE = '__proto__';
const BOLD = '**proto**';

const DETECTOR_CASES: DetectorCase[] = [
  {
    name: 'an escaped backtick does not open a span',
    markdown: `A \\\`literal backtick and then ${BARE} and another \`code\` span.\n`,
    formatter: 'mangles',
    bare: [1],
    mangled: [],
  },
  {
    name: 'a delimiter does not pair into a following heading',
    markdown: `\`open\n# ${BARE} \`close\n`,
    formatter: 'mangles',
    bare: [2],
    mangled: [],
  },
  {
    name: 'a delimiter does not pair out of a heading into a paragraph',
    markdown: `# \`open\n${BARE} \`close\n`,
    formatter: 'mangles',
    bare: [2],
    mangled: [],
  },
  {
    name: 'a delimiter does not pair across adjacent list items',
    markdown: `- \`open\n- ${BARE} \`close\n`,
    formatter: 'mangles',
    bare: [2],
    mangled: [],
  },
  {
    name: 'a delimiter does not pair across table rows',
    markdown: `| a | b |\n| --- | --- |\n| \`open | x |\n| ${BARE} \`close | y |\n`,
    formatter: 'mangles',
    bare: [4],
    mangled: [],
  },
  {
    name: 'a delimiter does not pair across cells of one table row',
    markdown: `| a | b |\n| --- | --- |\n| \`open | ${BARE} \`close |\n`,
    formatter: 'mangles',
    bare: [3],
    mangled: [],
  },
  {
    name: 'a delimiter does not pair out of frontmatter into the body',
    markdown: `---\ntitle: \`open\n---\n# ${BARE} \`close\n`,
    formatter: 'mangles',
    bare: [4],
    mangled: [],
  },
  {
    name: 'a delimiter does not pair out of an HTML block',
    markdown: `<script>\n\`open\n</script>\n# ${BARE} \`close\n`,
    formatter: 'mangles',
    bare: [4],
    mangled: [],
  },
  {
    name: 'a CRLF blank line still ends the region',
    markdown: `\`open\r\n\r\n${BARE} \`close\r\n`,
    formatter: 'mangles',
    bare: [3],
    mangled: [],
  },
  {
    name: 'a thematic break ends the region',
    markdown: `Para line one \`open\n\n---\n\n${BARE} \`close\n`,
    formatter: 'mangles',
    bare: [5],
    mangled: [],
  },
  {
    name: 'an unclosed run does not reach into the next paragraph',
    markdown: `Unclosed \`run then\n\na new paragraph with ${BARE} bare.\n`,
    formatter: 'mangles',
    bare: [3],
    mangled: [],
  },
  {
    name: 'an unrelated code span on the same line does not protect a bare literal',
    markdown: `A bare ${BARE} next to \`code\` span.\n`,
    formatter: 'mangles',
    bare: [1],
    mangled: [],
  },
  {
    name: 'a bare literal in a four-space list continuation is still prose',
    markdown: `- item text\n\n    continuation paragraph with ${BARE} bare.\n`,
    formatter: 'mangles',
    bare: [3],
    mangled: [],
  },
  {
    name: 'a CRLF setext underline still ends the region',
    markdown: `\`open\r\n===\r\n${BARE} \`close\r\n`,
    formatter: 'mangles',
    bare: [3],
    mangled: [],
  },
  {
    name: 'a delimiter does not pair into a heading inside a blockquote',
    markdown: `> \`open\n> # ${BARE} \`close\n`,
    formatter: 'mangles',
    bare: [2],
    mangled: [],
  },
  {
    name: 'a table without outer pipes is still masked cell by cell',
    markdown: `a | b\n--- | ---\n\`open | ${BARE} \`close\n`,
    formatter: 'mangles',
    bare: [3],
    mangled: [],
  },
  {
    name: 'a delimiter does not pair across nested list items',
    markdown: `- a\n    - \`open\n    - ${BARE} \`close\n`,
    formatter: 'mangles',
    bare: [3],
    mangled: [],
  },
  {
    name: 'a delimiter does not pair out of a raw HTML block',
    markdown: `<script>\n\`open</script>\n${BARE} \`close\n`,
    formatter: 'mangles',
    bare: [3],
    mangled: [],
  },
  {
    name: 'a fence-shaped line inside a raw HTML block opens no fence',
    markdown: `<script>\n\`\`\`\n</script>\n\n${BARE}\n`,
    formatter: 'mangles',
    bare: [5],
    mangled: [],
  },
  {
    name: 'an unmatched fence opener blanks nothing',
    markdown: `- \`\`\`\n  \`\`\`\n${BARE}\n`,
    formatter: 'mangles',
    bare: [3],
    mangled: [],
  },
  {
    name: 'an already-mangled prose occurrence is reported',
    markdown: `An already ${BOLD} mangled line.\n`,
    formatter: 'preserves',
    bare: [],
    mangled: [1],
    note: 'oxfmt leaves it alone precisely because the damage is already done.',
  },
  {
    name: 'a span wrapped across a paragraph line break is protected',
    markdown: `A span that wraps\nacross \`a line\nbreak with ${BARE} inside\` it.\n`,
    formatter: 'preserves',
    bare: [],
    mangled: [],
  },
  {
    name: 'a span wrapped inside one list item is protected',
    markdown: `- item \`open\n  wraps with ${BARE} inside\` it.\n`,
    formatter: 'preserves',
    bare: [],
    mangled: [],
  },
  {
    name: 'a span wrapped across blockquote lines is protected',
    markdown: `> A quoted \`span that\n> wraps with ${BARE} inside\` it.\n`,
    formatter: 'preserves',
    bare: [],
    mangled: [],
  },
  {
    name: 'a span wrapped onto an indented continuation line is protected',
    markdown: `Continuation with a wrapped \`span that\n    is indented on the next line with ${BARE} inside\` it.\n`,
    formatter: 'preserves',
    bare: [],
    mangled: [],
  },
  {
    name: 'a backticked occurrence is protected',
    markdown: `Backticked \`${BARE}\` stays.\n`,
    formatter: 'preserves',
    bare: [],
    mangled: [],
  },
  {
    name: 'a mangled token inside a code span is protected',
    markdown: `A code span holding \`${BOLD}\` is fine.\n`,
    formatter: 'preserves',
    bare: [],
    mangled: [],
  },
  {
    name: 'a backtick fence protects its content',
    markdown: `\`\`\`ts\nconst k = '${BARE}';\n\`\`\`\n`,
    formatter: 'preserves',
    bare: [],
    mangled: [],
  },
  {
    name: 'a tilde fence protects its content',
    markdown: `~~~\n${BARE} inside a tilde fence\n~~~\n`,
    formatter: 'preserves',
    bare: [],
    mangled: [],
    note: 'oxfmt rewrites the marker to backticks but never the content.',
  },
  {
    name: 'a fence of the opposite character does not close the outer fence',
    markdown: `\`\`\`\n~~~\n${BARE}\n~~~\n\`\`\`\n`,
    formatter: 'preserves',
    bare: [],
    mangled: [],
  },
  {
    name: 'a four-space indented code block is scanned as prose on purpose',
    markdown: `Text\n\n    \`open\n    ${BARE} \`close\n`,
    formatter: 'preserves',
    bare: [4],
    mangled: [],
    note: 'Deliberately stricter than oxfmt: excluding indented code needs list-context tracking, and getting it wrong would make the guard weaker. Use a fenced block.',
  },
];

describe('the prototype-key detector', () => {
  it.each(DETECTOR_CASES)('$name', (testCase) => {
    expect(
      scanSource('case.md', testCase.markdown, BARE_FORM).map(
        (occurrence) => occurrence.line,
      ),
      `bare-form lines for "${testCase.name}"`,
    ).toEqual(testCase.bare);

    expect(
      scanSource('case.md', testCase.markdown, MANGLED_FORM).map(
        (occurrence) => occurrence.line,
      ),
      `bold-form lines for "${testCase.name}"`,
    ).toEqual(testCase.mangled);
  });

  it('never accepts an input the formatter would mangle', () => {
    const missed = DETECTOR_CASES.filter(
      (testCase) =>
        testCase.formatter === 'mangles' &&
        testCase.bare.length === 0 &&
        testCase.mangled.length === 0,
    ).map((testCase) => testCase.name);

    // The converse is not asserted: the guard is allowed to be stricter than
    // the formatter, and one case above deliberately is.
    expect(
      missed,
      `cases oxfmt mangles but the guard accepts: ${missed.join(', ')}`,
    ).toEqual([]);
  });
});
