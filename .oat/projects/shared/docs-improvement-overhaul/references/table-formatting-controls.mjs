import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { restoreNamedTableFormatting } from './table-formatting-supplement.mjs';

const evidenceRoot =
  '.oat/projects/shared/docs-improvement-overhaul/references/';
const map = JSON.parse(
  readFileSync(`${evidenceRoot}route-migration.json`, 'utf8'),
);
const proposal = JSON.parse(
  readFileSync(`${evidenceRoot}p02-table-formatting-proposal.json`, 'utf8'),
);
const sourcePage = proposal.sourcePage;
const baselinePage = execFileSync(
  'git',
  ['show', `${map.baseline}:apps/oat-docs/docs/${sourcePage}`],
  { encoding: 'utf8' },
);
const baselineBody = baselinePage.replace(
  /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,
  '',
);
let expectedBody = baselineBody;
for (const link of map.links
  .filter((row) => row.page === sourcePage && row.targetKind === 'page')
  .sort(
    (first, second) =>
      second.destinationToken.start - first.destinationToken.start,
  )) {
  const span = link.destinationToken;
  assert.equal(expectedBody.slice(span.start, span.end), span.raw);
  expectedBody =
    expectedBody.slice(0, span.start) +
    link.destinationHref +
    expectedBody.slice(span.end);
}
const expected =
  baselinePage.slice(0, baselinePage.length - baselineBody.length) +
  expectedBody;
const actual = readFileSync(`apps/oat-docs/docs/${sourcePage}`, 'utf8');
const hash = (text) => createHash('sha256').update(text).digest('hex');
assert.equal(hash(expected), proposal.hrefOnlyExpectedSha256);
assert.equal(hash(actual), proposal.formattedActualSha256);
const formatted = restoreNamedTableFormatting(sourcePage, expected, actual);
assert.equal(formatted.changes.length, 16);
assert.equal(
  restoreNamedTableFormatting(sourcePage, expected, expected).changes.length,
  0,
);
const replaceLiteral = (text, before, after) => {
  assert.equal(
    text.split(before).length,
    2,
    `Control literal must occur exactly once: ${before}`,
  );
  return text.replace(before, after);
};
const unlistedEdge = replaceLiteral(
  actual,
  '| Command group                                   |',
  '| Command group                                    |',
);
const delimiterLine = actual.split('\n')[proposal.delimiterRun.line - 1];
const delimiterStart =
  actual
    .split('\n')
    .slice(0, proposal.delimiterRun.line - 1)
    .join('\n').length + 1;
const delimiterAltered = (transform) =>
  actual.slice(0, delimiterStart) +
  transform(delimiterLine) +
  actual.slice(delimiterStart + delimiterLine.length);
const controls = [
  [
    'internal-space',
    replaceLiteral(actual, '| Command group ', '| Command  group '),
    /Table AST|Raw cell payload/,
  ],
  [
    'code-payload',
    replaceLiteral(actual, '| `oat init` ', '| `oat broken` '),
    /Table AST|Raw cell payload/,
  ],
  [
    'equivalent-code-delimiters',
    replaceLiteral(actual, '| `oat init` ', '| ``oat init`` '),
    /Raw cell payload changed/,
  ],
  [
    'escaped-pipe',
    replaceLiteral(
      actual,
      'Bootstrap canonical OAT',
      'Bootstrap canonical \\| OAT',
    ),
    /Table AST|Raw cell payload/,
  ],
  [
    'emphasis',
    replaceLiteral(
      actual,
      'Bootstrap canonical OAT',
      '**Bootstrap** canonical OAT',
    ),
    /Table AST|Raw cell payload/,
  ],
  [
    'newline',
    replaceLiteral(actual, '| Command group ', '| Command\ngroup '),
    /Another\/missing table|Table AST/,
  ],
  [
    'topology',
    replaceLiteral(actual, `${actual.split('\n')[43]}\n`, ''),
    /Table AST/,
  ],
  [
    'alignment-colon',
    delimiterAltered((line) => line.replace('| -', '| :-')),
    /Table AST/,
  ],
  [
    'pipe',
    replaceLiteral(actual, '| Go deeper ', '\\| Go deeper '),
    /Another\/missing table|Table AST/,
  ],
  [
    'delimiter-syntax',
    delimiterAltered((line) => line.replace('| -', '| =')),
    /Another\/missing table|Table AST|Delimiter/,
  ],
  ['unlisted-edge', unlistedEdge, /Unlisted formatting span cell:0:0:suffix/],
  [
    'outside-table-byte',
    replaceLiteral(actual, '## Command Groups', '## Changed Command Groups'),
    /Bytes outside inventoried/,
  ],
  [
    'another-table',
    `${actual}\n| Extra |\n| --- |\n| value |\n`,
    /Another\/missing table/,
  ],
];
const results = [];
for (const [name, mutation, expectedError] of controls) {
  let error;
  try {
    restoreNamedTableFormatting(sourcePage, expected, mutation);
  } catch (failure) {
    error = failure;
  }
  assert.ok(error, `Negative control accepted: ${name}`);
  assert.match(
    error.message,
    expectedError,
    `Wrong categorical failure: ${name}`,
  );
  results.push({
    name,
    mutatedPageSha256: hash(mutation),
    expectedError: expectedError.source,
    actualError: error.message,
    outcome: 'rejected',
  });
}
const scratch = mkdtempSync(join(tmpdir(), 'oat-table-format-guard-'));
try {
  const modulePath = `${evidenceRoot}table-formatting-supplement.mjs`;
  const guarded = readFileSync(modulePath, 'utf8');
  const start = guarded.indexOf('function assertExactFormattingSpan(');
  const end = guarded.indexOf(
    'export function restoreNamedTableFormatting',
    start,
  );
  assert.ok(start >= 0 && end > start);
  const neutralized = `${guarded.slice(0, start)}function assertExactFormattingSpan() {}\n\n${guarded.slice(end)}`;
  const neutralizedPath = join(scratch, 'supplement.mjs');
  writeFileSync(neutralizedPath, neutralized);
  const alternative = await import(
    pathToFileURL(resolve(neutralizedPath)).href
  );
  assert.equal(
    alternative.restoreNamedTableFormatting(sourcePage, expected, unlistedEdge)
      .restored,
    expected,
  );
  assert.throws(
    () =>
      alternative.restoreNamedTableFormatting(
        sourcePage,
        expected,
        controls.find(([name]) => name === 'equivalent-code-delimiters')[1],
      ),
    /Raw cell payload changed/,
  );
  assert.throws(
    () =>
      alternative.restoreNamedTableFormatting(
        sourcePage,
        expected,
        controls.find(([name]) => name === 'topology')[1],
      ),
    /Table AST/,
  );
  assert.throws(
    () => restoreNamedTableFormatting(sourcePage, expected, unlistedEdge),
    /Unlisted formatting span/,
  );
  assert.equal(
    restoreNamedTableFormatting(sourcePage, expected, actual).restored,
    expected,
  );
  console.log(
    JSON.stringify(
      {
        baseline: map.baseline,
        sourcePage,
        proposalSha256: hash(
          readFileSync(`${evidenceRoot}p02-table-formatting-proposal.json`),
        ),
        guardedModuleSha256: hash(guarded),
        expectedPageSha256: hash(expected),
        actualPageSha256: hash(actual),
        realFormattedPositive: {
          outcome: 'accepted',
          spans: formatted.changes.length,
          rawPayloads: formatted.rawCellPayloadsChecked,
        },
        hrefOnlyPositive: 'accepted',
        negativeControls: results,
        guardNeutralization: {
          disabledOnly: 'assertExactFormattingSpan',
          mutation: 'unlisted-edge',
          neutralizedOutcome: 'accepted',
          guardedOutcome: 'rejected',
          independentRawPayloadGuard:
            'rejects equivalent-code-delimiter mutation while span restriction is neutralized',
          independentAstGuard:
            'rejects topology mutation while span restriction is neutralized',
          restoredValidOutcome: 'accepted',
          neutralizedModuleSha256: hash(neutralized),
        },
        proposalReviewLowDisposition:
          'Clarified focused bad-edge control targets the exact-span restriction, not payload; independent payload/AST guards remain active.',
        outcome: 'pass',
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
