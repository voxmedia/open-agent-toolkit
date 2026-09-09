import { describe, expect, it } from 'vitest';

import {
  containsAmbiguousProjectLogMarker,
  findProjectLogSections,
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
