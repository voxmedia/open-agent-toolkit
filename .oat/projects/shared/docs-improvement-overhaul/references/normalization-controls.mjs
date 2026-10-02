import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { destinationSpan, destinationSpans } from './destination-spans.mjs';

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repo = resolve(evidenceRoot, '../../../../..');
if (process.argv.includes('--legacy-negative-control')) {
  const temporary = await mkdtemp(
    resolve(tmpdir(), 'docs-p02-normalization-negative-'),
  );
  try {
    const helper = (
      await readFile(resolve(evidenceRoot, 'destination-spans.mjs'), 'utf8')
    )
      .replace(
        "fileURLToPath(new URL('../../../../../', import.meta.url))",
        JSON.stringify(repo),
      )
      .replace(
        'start: token.start.offset,',
        'start: owner.start.offset + content.slice(owner.start.offset, owner.end.offset).indexOf(decodeString(raw)),',
      )
      .replace(
        'end: token.end.offset,',
        'end: owner.start.offset + content.slice(owner.start.offset, owner.end.offset).indexOf(decodeString(raw)) + raw.length,',
      );
    const probe = (
      await readFile(fileURLToPath(import.meta.url), 'utf8')
    ).replace(
      'const evidenceRoot = dirname(fileURLToPath(import.meta.url));',
      `const evidenceRoot = ${JSON.stringify(evidenceRoot)};`,
    );
    await writeFile(resolve(temporary, 'destination-spans.mjs'), helper);
    await writeFile(resolve(temporary, 'normalization-controls.mjs'), probe);
    const result = spawnSync(
      process.execPath,
      [resolve(temporary, 'normalization-controls.mjs')],
      { cwd: repo, encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /AssertionError/);
    assert.match(result.stderr, /\[`oat-docs:commands\.md`\]\(commands\.md\)/);
    assert.match(result.stderr, /\[`commands\.md`\]\(oat-docs:commands\.md\)/);
    console.log(
      JSON.stringify(
        {
          control: 'copied-helper-neutralized-to-pre-fix-first-substring-spans',
          childExit: result.status,
          categoricalOutcome: 'literal-repeated-label-assertion-fails',
          stderr: result.stderr,
          checkoutMutation: false,
        },
        null,
        2,
      ),
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  process.exit(0);
}
const requireCli = createRequire(resolve(repo, 'packages/cli/package.json'));
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
const visit = (node, callback) => {
  callback(node);
  node.children?.forEach((child) => visit(child, callback));
};
const hash = (text) => createHash('sha256').update(text).digest('hex');
const replace = (text, span, value) =>
  text.slice(0, span.start) + value + text.slice(span.end);
const controls = [
  [
    'link',
    '[`commands.md`](commands.md)',
    'commands.md',
    '[`commands.md`](oat-docs:commands.md)',
  ],
  [
    'image',
    '![commands.md](commands.md)',
    'commands.md',
    '![commands.md](oat-docs:commands.md)',
  ],
  [
    'definition',
    '[commands.md]: commands.md "commands.md"',
    'commands.md',
    '[commands.md]: oat-docs:commands.md "commands.md"',
  ],
  [
    'link',
    '[commands.md](<commands.md> "commands.md")',
    'commands.md',
    '[commands.md](<oat-docs:commands.md> "commands.md")',
  ],
  ['link', '[a](foo(bar).md)', 'foo(bar).md', '[a](oat-docs:commands.md)'],
  ['link', '[a](foo\\(bar\\).md)', 'foo(bar).md', '[a](oat-docs:commands.md)'],
  ['link', '[a](foo&amp;bar.md)', 'foo&bar.md', '[a](oat-docs:commands.md)'],
  [
    'link',
    '[![x](inner.md)](commands.md)',
    'commands.md',
    '[![x](inner.md)](oat-docs:commands.md)',
  ],
];
for (const [kind, text, href, expected] of controls) {
  let owner;
  visit(parser.parse(text), (node) => {
    if (node.type === kind && node.url === href) owner = node;
  });
  assert.ok(owner);
  const span = destinationSpan(owner, destinationSpans(text));
  assert.equal(replace(text, span, 'oat-docs:commands.md'), expected);
  assert.throws(
    () =>
      destinationSpan(
        { ...owner, url: 'unmatched.md' },
        destinationSpans(text),
      ),
    /does not match destination token/,
  );
}
const original = '[`commands.md`](commands.md)';
const literalExpected = '[`commands.md`](oat-docs:commands.md)';
const legacyStart = original.indexOf('commands.md');
const legacyBad = replace(
  original,
  { start: legacyStart, end: legacyStart + 'commands.md'.length },
  'oat-docs:commands.md',
);
assert.notEqual(legacyBad, literalExpected);
assert.equal(legacyBad, '[`oat-docs:commands.md`](commands.md)');
for (const text of [original, '[`commands.md`](../reference/commands.md)']) {
  const owner = parser.parse(text).children[0].children[0];
  assert.equal(
    replace(
      text,
      destinationSpan(owner, destinationSpans(text)),
      'oat-docs:commands.md',
    ),
    literalExpected,
  );
}
const changedLabel = '[`changed.md`](../reference/commands.md)';
const changedOwner = parser.parse(changedLabel).children[0].children[0];
assert.notEqual(
  replace(
    changedLabel,
    destinationSpan(changedOwner, destinationSpans(changedLabel)),
    'oat-docs:commands.md',
  ),
  literalExpected,
);

const migration = JSON.parse(
  await readFile(resolve(evidenceRoot, 'route-migration.json'), 'utf8'),
);
assert.equal(migration.baseline, '8b78d9a935b31ef50e65713b03a022a5d022aa59');
const collisions = [];
let checked = 0;
for (const page of migration.pages) {
  const source = execFileSync(
    'git',
    ['show', `${migration.baseline}:apps/oat-docs/docs/${page.source}`],
    { cwd: repo, encoding: 'utf8' },
  );
  assert.equal(hash(source), page.sourceHash);
  const content = source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
  const spans = destinationSpans(content);
  visit(parser.parse(content), (node) => {
    if (!['link', 'image', 'definition'].includes(node.type)) return;
    const span = destinationSpan(node, spans);
    const recorded = migration.links.find(
      (link) =>
        link.page === page.source &&
        link.bodyStartOffset === node.position.start.offset &&
        link.bodyEndOffset === node.position.end.offset,
    );
    assert.ok(recorded);
    assert.deepEqual(recorded.destinationToken, span);
    checked++;
    const snippet = content.slice(
      node.position.start.offset,
      node.position.end.offset,
    );
    if (node.position.start.offset + snippet.indexOf(node.url) !== span.start) {
      collisions.push({
        page: page.source,
        line: recorded.line,
        href: node.url,
        snippet,
        destinationStart: span.start,
      });
      const normalized = replace(content, span, 'oat-docs:control');
      assert.equal(
        normalized.slice(0, span.start),
        content.slice(0, span.start),
      );
      assert.equal(
        normalized.slice(span.start + 'oat-docs:control'.length),
        content.slice(span.end),
      );
    }
  });
  for (const section of migration.sections.filter(
    (unit) => unit.sourcePage === page.source,
  )) {
    const raw = content.slice(section.bodyStartOffset, section.bodyEndOffset);
    assert.equal(hash(raw), section.rawHash);
    let normalized = raw;
    for (const link of section.permittedLinkChanges) {
      const stable = `oat-docs:${link.target}${link.href.split('#')[0].includes('?') ? `?${link.href.split('#')[0].split('?')[1]}` : ''}${link.href.includes('#') ? `#${link.href.split('#')[1]}` : ''}`;
      normalized = replace(
        normalized,
        {
          start: link.destinationToken.start - section.bodyStartOffset,
          end: link.destinationToken.end - section.bodyStartOffset,
        },
        stable,
      );
    }
    assert.equal(hash(normalized), section.normalizedHash);
  }
}
assert.equal(checked, 477);
assert.equal(collisions.length, 17);
assert.equal(migration.routeOnlySupersessions.length, 3);
assert.deepEqual(
  migration.routeOnlySupersessions.map((row) => [
    row.sourcePage,
    row.sourceLine,
  ]),
  [
    ['guide/index.md', 8],
    ['guide/index.md', 18],
    ['index.md', 19],
  ],
);
const routerItems = migration.routerAccounting.flatMap((row) => row.items);
assert.ok(
  routerItems
    .filter((item) => item.disposition !== 'superseded-route-only-entry')
    .every(
      (item) =>
        item.destination?.includes('#') &&
        item.destinationEntryTarget &&
        item.destinationEntryLabel,
    ),
);
console.log(
  JSON.stringify(
    {
      baseline: migration.baseline,
      literalControls: controls.length,
      legacyWrongSpanRejected: true,
      destinationOnlyMutationAccepted: true,
      labelMutationRejected: true,
      mismatchedUrlsRejected: true,
      parsedLinksChecked: checked,
      sourcePagesChecked: migration.pages.length,
      sectionHashesChecked: migration.sections.length,
      repeatedLabelCollisions: collisions,
      routerItems: routerItems.length,
      routeOnlySupersessions: migration.routeOnlySupersessions.map((row) => ({
        sourcePage: row.sourcePage,
        sourceLine: row.sourceLine,
        source: row.source ?? row.sourceText,
      })),
    },
    null,
    2,
  ),
);
