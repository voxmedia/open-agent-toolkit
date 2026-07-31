import { parseStrictJson } from './canonical-json';
import { normalizeMarkdownSource } from './markdown-grammar';
import { parseReviewerTerminalV1 } from './schemas';
import type { ReviewAccountingV1, ReviewerTerminalV1 } from './types';

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

export function extractReviewAccounting(
  source: Buffer | string,
): ReviewAccountingV1 {
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
  return parseStrictReviewAccountingJson(json);
}
