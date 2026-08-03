import { createHash } from 'node:crypto';

import {
  canonicalizeJson,
  hashCanonicalJson,
  parseStrictJson,
} from './canonical-json';
import { normalizeMarkdownSource } from './markdown-grammar';
import { parseReviewerTerminalV1 } from './schemas';
import type {
  ArtifactFindingProjectionV1,
  ReviewAccountingV1,
  ReviewerAccountingOverlayV1,
  ReviewerTerminalV1,
} from './types';

export const MAX_REVIEW_ACCOUNTING_BYTES = 1_048_576;

function accountingHeadings(lines: readonly string[]): number[] {
  const headings: number[] = [];
  let fence: { character: '`' | '~'; length: number } | null = null;

  lines.forEach((line, index) => {
    if (fence !== null) {
      const close = new RegExp(
        `^ {0,3}\\${fence.character}{${fence.length},}[ \\t]*$`,
      );
      if (close.test(line)) fence = null;
      return;
    }
    if (line === '## Review Accounting') headings.push(index);
    const opening = /^ {0,3}(`{3,}|~{3,})(?:[^`~]*)$/.exec(line);
    if (opening) {
      const marker = opening[1]!;
      fence = {
        character: marker[0] as '`' | '~',
        length: marker.length,
      };
    }
  });

  if (fence !== null) throw new Error('Markdown source has an unclosed fence');
  return headings;
}

export function parseStrictReviewAccountingJson(
  source: string,
): ReviewAccountingV1 {
  const value = parseStrictJson(source) as {
    completion?: unknown;
  };
  let terminal: ReviewerTerminalV1;
  if (value.completion === 'complete') {
    terminal = parseReviewerTerminalV1({
      schemaVersion: 1,
      status: 'complete',
      candidate: {
        kind: 'structured',
        review: { summary: '', findings: [], verification_commands: [] },
      },
      reviewAccounting: value,
    });
  } else {
    terminal = parseReviewerTerminalV1({
      schemaVersion: 1,
      status: 'blocked',
      reason: 'accounting-validation',
      diagnostics: [],
      reviewAccounting: value,
    });
  }
  return terminal.reviewAccounting;
}

function extractAccountingBlock(source: Buffer | string): {
  lines: string[];
  openingIndex: number;
  closingIndex: number;
  json: string;
} {
  const normalized = normalizeMarkdownSource(source);
  const lines = normalized.split('\n');
  const headings = accountingHeadings(lines);
  if (headings.length !== 1) {
    throw new Error(
      `review artifact must contain exactly one Review Accounting heading; found ${headings.length}`,
    );
  }

  const headingIndex = headings[0]!;
  let openingIndex = headingIndex + 1;
  if (lines[openingIndex] === '') openingIndex++;
  if (lines[openingIndex] !== '```json') {
    throw new Error(
      'Review Accounting heading must be followed by an exact json fence',
    );
  }

  const closingIndex = lines.indexOf('```', openingIndex + 1);
  if (closingIndex === -1) {
    throw new Error('Review Accounting block has no exact closing fence');
  }
  const json = lines.slice(openingIndex + 1, closingIndex).join('\n');
  const encodedBytes = Buffer.byteLength(json, 'utf8');
  if (encodedBytes > MAX_REVIEW_ACCOUNTING_BYTES) {
    throw new Error(
      `Review Accounting block exceeds ${MAX_REVIEW_ACCOUNTING_BYTES} encoded bytes`,
    );
  }

  for (let index = closingIndex + 1; index < lines.length; index++) {
    const line = lines[index]!;
    if (/^## /.test(line)) break;
    if (line !== '') {
      throw new Error(
        'Review Accounting block tail must contain only blank lines',
      );
    }
  }
  return { lines, openingIndex, closingIndex, json };
}

export function extractReviewAccounting(
  source: Buffer | string,
): ReviewAccountingV1 {
  return parseStrictReviewAccountingJson(extractAccountingBlock(source).json);
}

export function materializeReviewAccounting(
  source: Buffer | string,
  authoredOverlay: ReviewerAccountingOverlayV1,
  canonicalAccounting: ReviewAccountingV1,
): Buffer {
  const { lines, openingIndex, closingIndex, json } =
    extractAccountingBlock(source);
  if (
    canonicalizeJson(parseStrictJson(json)) !==
    canonicalizeJson(authoredOverlay)
  ) {
    throw new Error(
      'embedded artifact overlay accounting does not match the terminal envelope',
    );
  }
  const materialized = Buffer.from(
    [
      ...lines.slice(0, openingIndex + 1),
      canonicalizeJson(canonicalAccounting),
      ...lines.slice(closingIndex),
    ].join('\n'),
    'utf8',
  );
  if (
    canonicalizeJson(extractReviewAccounting(materialized)) !==
    canonicalizeJson(canonicalAccounting)
  ) {
    throw new Error('materialized artifact accounting is not canonical');
  }
  return materialized;
}

const FINDING_SEVERITIES = [
  'critical',
  'important',
  'medium',
  'minor',
] as const;

export function extractArtifactFindingProjection(
  source: Buffer | string,
): ArtifactFindingProjectionV1 {
  const bytes = Buffer.isBuffer(source) ? source : Buffer.from(source, 'utf8');
  const normalized = normalizeMarkdownSource(bytes);
  const accounting = extractReviewAccounting(bytes);
  const lines = normalized.split('\n');
  const countPattern =
    /^Findings: (\d+) critical, (\d+) important, (\d+) medium, (\d+) minor$/;
  const countMatches = lines
    .map((line, index) => ({ index, match: countPattern.exec(line) }))
    .filter(
      (
        entry,
      ): entry is {
        index: number;
        match: RegExpExecArray;
      } => entry.match !== null,
    );
  if (countMatches.length !== 1) {
    throw new Error(
      `review artifact must contain exactly one findings count; found ${countMatches.length}`,
    );
  }

  const expected = new Map(
    FINDING_SEVERITIES.map((severity, index) => [
      severity,
      Number(countMatches[0]!.match[index + 1]),
    ]),
  );
  const actual = new Map(FINDING_SEVERITIES.map((severity) => [severity, 0]));
  const findingsHeading = lines.indexOf('## Findings');
  const expectedTotal = [...expected.values()].reduce(
    (total, count) => total + count,
    0,
  );
  if (findingsHeading === -1 && expectedTotal !== 0) {
    throw new Error('nonzero finding counts require a Findings section');
  }
  if (findingsHeading !== -1) {
    const sectionEnd = lines.findIndex(
      (line, index) => index > findingsHeading && /^## /.test(line),
    );
    const end = sectionEnd === -1 ? lines.length : sectionEnd;
    let severity: (typeof FINDING_SEVERITIES)[number] | null = null;
    for (let index = findingsHeading + 1; index < end; index++) {
      const heading = /^### (Critical|Important|Medium|Minor)$/.exec(
        lines[index]!,
      );
      if (heading !== null) {
        severity =
          heading[1]!.toLowerCase() as (typeof FINDING_SEVERITIES)[number];
        continue;
      }
      if (severity !== null && /^- \*\*\S/.test(lines[index]!)) {
        actual.set(severity, actual.get(severity)! + 1);
      }
    }
  }
  if (
    FINDING_SEVERITIES.some(
      (severity) => actual.get(severity) !== expected.get(severity),
    )
  ) {
    throw new Error('findings count does not match structured finding counts');
  }

  return {
    schemaVersion: 1,
    snapshotDigest: createHash('sha256').update(bytes).digest('hex'),
    accountingDigest: hashCanonicalJson(accounting),
    findingIds: FINDING_SEVERITIES.flatMap((severity) =>
      Array.from(
        { length: actual.get(severity)! },
        (_, index) => `artifact:${severity}:${index + 1}`,
      ),
    ),
  };
}
