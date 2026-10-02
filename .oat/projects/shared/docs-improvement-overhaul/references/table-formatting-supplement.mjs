import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const requireCli = createRequire(resolve('packages/cli/package.json'));
const { unified } = await import(
  pathToFileURL(requireCli.resolve('unified')).href
);
const { default: remarkParse } = await import(
  pathToFileURL(requireCli.resolve('remark-parse')).href
);
const { default: remarkGfm } = await import(
  pathToFileURL(requireCli.resolve('remark-gfm')).href
);
const parser = unified().use(remarkParse).use(remarkGfm);
const evidenceRoot =
  '.oat/projects/shared/docs-improvement-overhaul/references/';
const proposal = JSON.parse(
  readFileSync(`${evidenceRoot}p02-table-formatting-proposal.json`, 'utf8'),
);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const stableAst = (node) =>
  Object.fromEntries(
    Object.entries(node)
      .filter(([key]) => key !== 'position')
      .map(([key, value]) => [
        key,
        Array.isArray(value)
          ? value.map((item) =>
              item && typeof item === 'object' ? stableAst(item) : item,
            )
          : value && typeof value === 'object'
            ? stableAst(value)
            : value,
      ]),
  );

function assertExactFormattingSpan(key, before, after) {
  if (key === 'delimiter:2') {
    assert.equal(
      before,
      proposal.delimiterRun.before,
      'Uninventoried delimiter before bytes',
    );
    assert.equal(
      after,
      proposal.delimiterRun.after,
      'Uninventoried delimiter after bytes',
    );
    return;
  }
  const inventory = proposal.cellPaddingSpans.find(
    (row) => key === `cell:${row.row}:${row.column}:suffix`,
  );
  assert.ok(inventory, `Unlisted formatting span ${key}`);
  assert.equal(
    before,
    inventory.suffix.before,
    `Uninventoried edge before bytes ${key}`,
  );
  assert.equal(
    after,
    inventory.suffix.after,
    `Uninventoried edge after bytes ${key}`,
  );
}

export function restoreNamedTableFormatting(
  sourcePage,
  expectedPage,
  actualPage,
) {
  assert.equal(
    sourcePage,
    proposal.sourcePage,
    'Table supplement cannot apply to another page',
  );
  assert.equal(
    hash(expectedPage),
    proposal.hrefOnlyExpectedSha256,
    'Href-only expected page differs from reviewed exact source',
  );
  const expectedTables = parser
    .parse(expectedPage)
    .children.filter((node) => node.type === 'table');
  const actualTables = parser
    .parse(actualPage)
    .children.filter((node) => node.type === 'table');
  assert.equal(expectedTables.length, 1);
  assert.equal(actualTables.length, 1, 'Another/missing table is not allowed');
  const expectedTable = expectedTables[0];
  const actualTable = actualTables[0];
  assert.deepEqual(
    stableAst(actualTable),
    stableAst(expectedTable),
    'Table AST/topology/alignment/payload changed',
  );
  const changes = [];
  const change = (key, before, after, start, end) => {
    if (before === after) return;
    assertExactFormattingSpan(key, before, after);
    changes.push({ key, before, after, start, end });
  };
  for (let row = 0; row < expectedTable.children.length; row++) {
    for (
      let column = 0;
      column < expectedTable.children[row].children.length;
      column++
    ) {
      const expectedCell = expectedTable.children[row].children[column];
      const actualCell = actualTable.children[row].children[column];
      assert.ok(
        expectedCell.children.length && actualCell.children.length,
        'Reviewed cells must not become empty',
      );
      const expectedStart = expectedCell.children[0].position.start.offset;
      const expectedEnd = expectedCell.children.at(-1).position.end.offset;
      const actualStart = actualCell.children[0].position.start.offset;
      const actualEnd = actualCell.children.at(-1).position.end.offset;
      assert.equal(
        actualPage.slice(actualStart, actualEnd),
        expectedPage.slice(expectedStart, expectedEnd),
        `Raw cell payload changed ${row}:${column}`,
      );
      const edges = [
        {
          edge: 'prefix',
          before: expectedPage.slice(
            expectedCell.position.start.offset,
            expectedStart,
          ),
          after: actualPage.slice(
            actualCell.position.start.offset,
            actualStart,
          ),
          start: actualCell.position.start.offset,
          end: actualStart,
        },
        {
          edge: 'suffix',
          before: expectedPage.slice(
            expectedEnd,
            expectedCell.position.end.offset,
          ),
          after: actualPage.slice(actualEnd, actualCell.position.end.offset),
          start: actualEnd,
          end: actualCell.position.end.offset,
        },
      ];
      for (const span of edges) {
        assert.match(
          span.before,
          /^[ |]*$/,
          'Cell edge contains non-padding syntax',
        );
        assert.match(
          span.after,
          /^[ |]*$/,
          'Cell edge contains non-padding syntax',
        );
        assert.equal(
          span.after.replaceAll(' ', ''),
          span.before.replaceAll(' ', ''),
          'Cell pipe syntax changed',
        );
        change(
          `cell:${row}:${column}:${span.edge}`,
          span.before,
          span.after,
          span.start,
          span.end,
        );
      }
    }
  }
  const delimiter = (text, table) => {
    const line = table.position.start.line;
    const start = text.split('\n').slice(0, line).join('\n').length + 1;
    const end = text.indexOf('\n', start);
    const value = text.slice(start, end);
    assert.match(
      value,
      /^\|[ :-]+\|[ :-]+\|[ :-]+\|$/,
      'Delimiter row syntax changed',
    );
    const pipes = [...value.matchAll(/\|/g)].map((match) => match.index);
    return pipes.slice(0, -1).map((offset, column) => {
      const segment = value.slice(offset + 1, pipes[column + 1]);
      const parts = segment.match(/^( *)(:?-+:?)( *)$/);
      assert.ok(parts, 'Invalid delimiter cell');
      return {
        start: start + offset + 1 + parts[1].length,
        end: start + pipes[column + 1] - parts[3].length,
        run: parts[2],
        prefix: parts[1],
        suffix: parts[3],
      };
    });
  };
  const expectedDelimiter = delimiter(expectedPage, expectedTable);
  const actualDelimiter = delimiter(actualPage, actualTable);
  for (let column = 0; column < expectedDelimiter.length; column++) {
    const before = expectedDelimiter[column];
    const after = actualDelimiter[column];
    assert.equal(
      after.prefix,
      before.prefix,
      'Delimiter alignment padding changed outside inventory',
    );
    assert.equal(
      after.suffix,
      before.suffix,
      'Delimiter alignment padding changed outside inventory',
    );
    assert.equal(
      after.run.replaceAll('-', ''),
      before.run.replaceAll('-', ''),
      'Delimiter alignment colon changed',
    );
    change(
      `delimiter:${column}`,
      before.run,
      after.run,
      after.start,
      after.end,
    );
  }
  let restored = actualPage;
  for (const span of [...changes].sort(
    (first, second) => second.start - first.start,
  ))
    restored =
      restored.slice(0, span.start) + span.before + restored.slice(span.end);
  assert.equal(
    restored,
    expectedPage,
    'Bytes outside inventoried table formatting spans changed',
  );
  return {
    restored,
    changes,
    rawCellPayloadsChecked: expectedTable.children.reduce(
      (count, row) => count + row.children.length,
      0,
    ),
    astEqual: true,
  };
}
