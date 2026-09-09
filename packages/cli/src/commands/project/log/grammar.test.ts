import { describe, expect, it } from 'vitest';

import {
  containsAmbiguousProjectLogMarker,
  findProjectLogSealHeadingLine,
  findProjectLogSections,
  normalizeProjectLogLineEndings,
  PROJECT_LOG_LONE_TERMINATOR_RE,
  isProjectLogSealHeading,
  splitProjectLogLines,
} from './grammar';

/**
 * The section scan this module replaced, and the ledger scan `rollup.ts:188`
 * still uses. Both anchor `^` after every ECMAScript LineTerminator, so they are
 * the "other reading" the ambiguity detector exists to detect disagreement with.
 */
const legacySectionScan = (content: string): string[] =>
  [...content.matchAll(/^## [^\r\n]+/gm)].map((match) => match[0]);
const legacyEntryScan = (content: string): string[] =>
  [
    ...content.matchAll(
      /^### (\d{4}-\d{2}-\d{2}) · (?:project|general) · (?:bug|friction|worked-well|feedback) · ([^·\r\n]+)$/gm,
    ),
  ].map((match) => match[0]);

describe('project log grammar', () => {
  describe('containsAmbiguousProjectLogMarker', () => {
    // Every shape is labelled by whether the two readings of the file agree.
    // The detector's contract is exactly that equivalence: refuse a file if and
    // only if a `^…$/m` reader and the LF-only parser would disagree about it.
    const shapes: readonly {
      name: string;
      content: string;
      readingsAgree: boolean;
    }[] = [
      {
        name: 'marker at index 0',
        content: '## Entries\nx',
        readingsAgree: true,
      },
      {
        name: 'marker after a line feed',
        content: 'a\n## Entries\nx',
        readingsAgree: true,
      },
      {
        name: 'marker after CRLF',
        content: 'a\r\n## Entries\nx',
        readingsAgree: true,
      },
      {
        name: 'marker after a lone carriage return',
        content: 'a\r## Entries\nx',
        readingsAgree: false,
      },
      {
        name: 'marker after U+2028',
        content: 'a\u2028## Entries\nx',
        readingsAgree: false,
      },
      {
        name: 'marker after U+2029',
        content: 'a\u2029## Entries\nx',
        readingsAgree: false,
      },
      {
        name: 'carriage return at index 0',
        content: '\r## Entries\nx',
        readingsAgree: false,
      },
      {
        name: 'line feed then carriage return then marker',
        content: 'a\n\r## Entries\nx',
        readingsAgree: false,
      },
      {
        name: 'dated judgment heading after a carriage return',
        content: 'a\r### 2026-07-17 · project · bug · z\nx',
        readingsAgree: false,
      },
      {
        name: 'dated judgment heading after U+2028',
        content: 'a\u2028### 2026-07-17 · project · bug · z\nx',
        readingsAgree: false,
      },
      {
        // No reader recognizes this as a heading: the ledger scan matches only
        // the complete dated judgment grammar, and the section scan only `## `.
        // Refusing it would strand logs a previous release could have written.
        name: 'undated level-three text after a carriage return',
        content: 'a\r### Notes\nx',
        readingsAgree: true,
      },
      {
        name: 'structural heading after a carriage return',
        content:
          'a\r### 2026-07-17 · structural · oat-project-complete · seal\nx',
        readingsAgree: true,
      },
      {
        name: 'level-four heading after a carriage return',
        content: 'a\r#### Entries\nx',
        readingsAgree: true,
      },
      {
        name: 'level-one heading after a carriage return',
        content: 'a\r# Entries\nx',
        readingsAgree: true,
      },
      {
        name: 'hashes with no space after a carriage return',
        content: 'a\r##Entries\nx',
        readingsAgree: true,
      },
    ];

    it.each(shapes)(
      'refuses $name exactly when the two readings disagree',
      ({ content, readingsAgree }) => {
        const legacy = [
          ...legacySectionScan(content),
          ...legacyEntryScan(content),
        ];
        const current = findProjectLogSections(content).map(
          ({ heading }) => heading,
        );
        // Independently establish whether this shape really is ambiguous,
        // rather than trusting the label: the legacy readers see something the
        // LF-only parser does not.
        const actuallyAgree =
          JSON.stringify(legacy) === JSON.stringify(current) ||
          (legacy.length === 0 && current.length === 0);
        expect(actuallyAgree).toBe(readingsAgree);
        expect(containsAmbiguousProjectLogMarker(content)).toBe(!readingsAgree);
      },
    );

    it('accepts every project log the command itself writes', () => {
      const written = [
        '# Project Log: demo',
        '',
        '## Entries',
        '',
        '### 2026-07-17 · project · bug · gate exit',
        '',
        'Observation: one.\nImpact: two.',
        '',
        '### 2026-07-17 · structural · oat-project-complete · seal',
        '',
        'Completion sealed. oat-seal:demo',
        '',
        '## End-of-run synthesis',
        '',
        'Verdict: keep.',
        '',
      ].join('\n');
      expect(containsAmbiguousProjectLogMarker(written)).toBe(false);
      expect(
        findProjectLogSections(written).map(({ heading }) => heading),
      ).toEqual(['## Entries', '## End-of-run synthesis']);
    });
  });

  describe('splitProjectLogLines', () => {
    it('splits on every line terminator and treats CRLF as one boundary', () => {
      expect(splitProjectLogLines('a\nb\rc\u2028d\u2029e\r\nf')).toEqual([
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
      ]);
    });

    it('does not split on characters ECMAScript excludes from LineTerminator', () => {
      // VT, FF, and U+0085 are not LineTerminators, so a multiline `^` does not
      // anchor after them and neither may the validator.
      const vertical = '\u000b';
      const formFeed = '\u000c';
      const nextLine = '\u0085';
      const body = `a${vertical}b${formFeed}c${nextLine}d`;
      expect(splitProjectLogLines(body)).toEqual([body]);
      expect(new RegExp('^## ', 'm').test(`x${vertical}## y`)).toBe(false);
    });
  });

  describe('PROJECT_LOG_LONE_TERMINATOR_RE', () => {
    it.each([
      ['a lone carriage return', 'a\rb', true],
      ['a carriage return before another carriage return', 'a\r\rb', true],
      ['a trailing carriage return', 'ab\r', true],
      ['U+2028', 'a\u2028b', true],
      ['U+2029', 'a\u2029b', true],
      ['CRLF', 'a\r\nb', false],
      ['a line feed', 'a\nb', false],
      ['CRLF twice', 'a\r\nb\r\nc', false],
      ['no terminator at all', 'ab', false],
    ])('reports %s as lone: %s', (_name, value, expected) => {
      // CRLF is the carve-out that matters: it is one boundary to every reader
      // in this module, so refusing it made the validators stricter than the
      // ambiguity guard two dozen lines below them claimed.
      expect(PROJECT_LOG_LONE_TERMINATOR_RE.test(value)).toBe(expected);
    });

    it('is satisfied by every value normalization produces', () => {
      const normalized = normalizeProjectLogLineEndings('a\r\nb\r\nc');
      expect(normalized).toBe('a\nb\nc');
      expect(PROJECT_LOG_LONE_TERMINATOR_RE.test(normalized)).toBe(false);
      // Normalization is not a repair: a lone carriage return survives it and
      // must still be refused, which is why validation runs on the input.
      expect(normalizeProjectLogLineEndings('a\rb')).toBe('a\rb');
    });
  });

  describe('findProjectLogSealHeadingLine', () => {
    const seal = '### 2026-07-17 · structural · oat-project-complete · seal';

    it.each([
      ['line feeds', `x\n${seal}\ny`],
      ['CRLF', `x\r\n${seal}\r\ny`],
      ['a lone carriage return', `x\r${seal}\ry`],
    ])('finds a seal heading written with %s', (_name, content) => {
      // This answers "is a seal physically here?", independently of whether the
      // entries parser can reach it. Every mutator asks it the same way, so one
      // file cannot be sealed to one writer and open to another.
      const found = findProjectLogSealHeadingLine(content);
      expect(found?.line.trim()).toBe(seal);
      // The offset must locate the heading, not merely report that one exists.
      expect(
        content.slice(found!.index, found!.index + found!.line.length),
      ).toBe(found!.line);
    });

    it('returns undefined when no seal heading is present', () => {
      expect(
        findProjectLogSealHeadingLine(
          '### 2026-07-17 · structural · oat-project-summary · seal\n',
        ),
      ).toBeUndefined();
    });
  });

  describe('isProjectLogSealHeading', () => {
    it('accepts only the seal producer and ref together', () => {
      expect(
        isProjectLogSealHeading(
          '### 2026-07-17 · structural · oat-project-complete · seal',
        ),
      ).toBe(true);
      expect(
        isProjectLogSealHeading(
          '### 2026-07-17 · structural · oat-project-summary · seal',
        ),
      ).toBe(false);
      expect(
        isProjectLogSealHeading(
          '### 2026-07-17 · structural · oat-project-complete · retirement-sweep',
        ),
      ).toBe(false);
      expect(
        isProjectLogSealHeading('### 2026-07-17 · general · feedback · notes'),
      ).toBe(false);
      expect(isProjectLogSealHeading('not a heading')).toBe(false);
    });
  });
});
