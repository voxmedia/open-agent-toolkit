import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { destinationSpan, destinationSpans } from './destination-spans.mjs';
import { normalizeApprovedH1 } from './heading-normalization.mjs';
import { restoreNamedTableFormatting } from './table-formatting-supplement.mjs';

const evidence = '.oat/projects/shared/docs-improvement-overhaul/references/';
const mapBytes = readFileSync(`${evidence}route-migration.json`);
const map = JSON.parse(mapBytes);
const root = resolve(process.argv[2] ?? 'apps/oat-docs/docs');
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
const { default: Slugger } = await import(
  pathToFileURL(requireCli.resolve('github-slugger')).href
);
const parser = unified().use(remarkParse).use(remarkGfm);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const body = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
const source = (page) =>
  execFileSync('git', ['show', `${map.baseline}:apps/oat-docs/docs/${page}`], {
    encoding: 'utf8',
  });
const actual = (page) => readFileSync(resolve(root, page), 'utf8');
const headingText = (node) =>
  node.value ?? (node.children ?? []).map(headingText).join('');
const visit = (node, callback) => {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
};
const pages = new Map();
function inspect(page) {
  if (pages.has(page)) return pages.get(page);
  const markdown = actual(page);
  const content = body(markdown);
  const tree = parser.parse(content);
  const headings = tree.children.filter((node) => node.type === 'heading');
  const starts = [{ title: '$preamble', depth: 0, offset: 0, anchor: null }];
  const slugger = new Slugger();
  for (const node of headings)
    starts.push({
      title: headingText(node),
      depth: node.depth,
      offset: node.position.start.offset,
      anchor: slugger.slug(headingText(node)),
    });
  const occurrences = new Map();
  const units = starts.map((heading, index) => {
    const occurrence = (occurrences.get(heading.title) ?? 0) + 1;
    occurrences.set(heading.title, occurrence);
    return {
      ...heading,
      occurrence,
      text: content.slice(
        heading.offset,
        starts[index + 1]?.offset ?? content.length,
      ),
    };
  });
  const result = { markdown, content, tree, units, headings };
  pages.set(page, result);
  return result;
}
function at(destination) {
  const [page, anchor] = destination.split('#');
  const document = inspect(page);
  const unit = document.units.find((row) => row.anchor === anchor);
  assert.ok(unit, `Missing accounting owner ${destination}`);
  return unit.text;
}
function normalizeUnit(row, text) {
  const spans = destinationSpans(text);
  const nodes = [];
  visit(parser.parse(text), (node) => {
    if (['link', 'image', 'definition'].includes(node.type)) nodes.push(node);
  });
  const replacements = [];
  const used = new Set();
  for (const link of [...row.permittedLinkChanges].sort(
    (first, second) =>
      first.destinationToken.start - second.destinationToken.start,
  )) {
    const node = nodes.find(
      (candidate) =>
        !used.has(candidate) &&
        candidate.type === link.kind &&
        candidate.url === link.destinationHref &&
        headingText(candidate) === link.label,
    );
    assert.ok(
      node,
      `Missing approved destination token ${row.key}: ${link.destinationHref}`,
    );
    used.add(node);
    const span = destinationSpan(node, spans);
    const suffix = `${link.href.split('#')[0].includes('?') ? `?${link.href.split('#')[0].split('?')[1]}` : ''}${link.href.includes('#') ? `#${link.href.split('#')[1]}` : ''}`;
    replacements.push({ ...span, stable: `oat-docs:${link.target}${suffix}` });
  }
  let normalized = text;
  for (const span of replacements.sort(
    (first, second) => second.start - first.start,
  ))
    normalized =
      normalized.slice(0, span.start) +
      span.stable +
      normalized.slice(span.end);
  if (row.permittedHeadingChange)
    normalized = normalizeApprovedH1(row.sourcePage, normalized);
  return normalized;
}
const protectedUnits = [];
const tableFormatting = [];
const additiveSeparators = [];
const appendedOwners = new Set([
  'index.md',
  'reference/index.md',
  'reference/configuration.md',
  'reference/config-and-local-state.md',
  'skills/index.md',
  'workflows/projects/reviews/index.md',
]);
for (const row of map.sections.filter(
  (candidate) => candidate.disposition === 'equal-normalized-hash-required',
)) {
  const unit = inspect(row.destinationPage).units.find(
    (candidate) =>
      candidate.title === row.destinationHeading &&
      candidate.occurrence === row.occurrence,
  );
  assert.ok(unit, `Missing protected unit ${row.key}`);
  assert.equal(unit.depth, row.depth, `Heading depth changed ${row.key}`);
  assert.equal(unit.anchor, row.destinationAnchor, `Anchor changed ${row.key}`);
  let preservedText = unit.text;
  if (row.key === 'reference/cli-reference.md::Command Groups::1') {
    const originalPage = source(row.sourcePage);
    const originalBody = body(originalPage);
    let expectedBody = originalBody;
    for (const link of map.links
      .filter(
        (candidate) =>
          candidate.page === row.sourcePage && candidate.targetKind === 'page',
      )
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
    const expectedPage =
      originalPage.slice(0, originalPage.length - originalBody.length) +
      expectedBody;
    const result = restoreNamedTableFormatting(
      row.sourcePage,
      expectedPage,
      actual(row.destinationPage),
    );
    const restoredBody = body(result.restored);
    const restoredHeadings = parser
      .parse(restoredBody)
      .children.filter((node) => node.type === 'heading');
    const headingIndex = restoredHeadings.findIndex(
      (node) => headingText(node) === row.destinationHeading,
    );
    const start = restoredHeadings[headingIndex].position.start.offset;
    const end =
      restoredHeadings[headingIndex + 1]?.position.start.offset ??
      restoredBody.length;
    preservedText = restoredBody.slice(start, end);
    tableFormatting.push({ key: row.key, ...result, restored: undefined });
  }
  let normalized = normalizeUnit(row, preservedText);
  if (hash(normalized) !== row.normalizedHash) {
    const oldBody = body(source(row.sourcePage));
    assert.equal(
      row.bodyEndOffset,
      oldBody.length,
      `Non-final protected unit changed ${row.key}`,
    );
    assert.ok(
      appendedOwners.has(row.destinationPage),
      `Uninventoried appended owner ${row.key}`,
    );
    assert.ok(
      normalized.endsWith('\n\n'),
      `Unexpected additive boundary ${row.key}`,
    );
    assert.equal(
      hash(normalized.slice(0, -1)),
      row.normalizedHash,
      `Protected content changed ${row.key}`,
    );
    normalized = normalized.slice(0, -1);
    additiveSeparators.push({
      key: row.key,
      destinationPage: row.destinationPage,
      text: '\n',
      disposition:
        'New separating blank line before separately additive owner heading; original section bytes remain an exact prefix.',
    });
  }
  protectedUnits.push({
    key: row.key,
    destinationPage: row.destinationPage,
    destinationHeading: row.destinationHeading,
    occurrence: row.occurrence,
    sha256: hash(normalized),
  });
}
const entries = [];
for (const row of map.routerAccounting.flatMap(
  (candidate) => candidate.items,
)) {
  if (!row.destination) {
    assert.equal(row.disposition, 'superseded-route-only-entry');
    entries.push({
      source: `${row.sourcePage}:${row.sourceLine}`,
      disposition: row.disposition,
      decisionProvenance: row.decisionProvenance,
    });
    continue;
  }
  const owner = at(row.destination);
  if (row.destinationBodyText)
    assert.ok(
      owner.includes(row.destinationBodyText),
      `Missing router body description ${row.sourcePage}:${row.sourceLine}`,
    );
  else {
    const [page, fragment] = row.destinationEntryTarget.split('#');
    const href = `${posix.relative(posix.dirname(row.destination.split('#')[0]), page)}${fragment ? `#${fragment}` : ''}`;
    const candidates = [];
    visit(parser.parse(owner), (node) => {
      if (node.type === 'listItem')
        candidates.push(
          owner.slice(node.position.start.offset, node.position.end.offset),
        );
    });
    const item = candidates.find(
      (text) =>
        text.endsWith(row.sourceDescription) && text.includes(`](${href})`),
    );
    assert.ok(
      item,
      `Missing router entry ${row.sourcePage}:${row.sourceLine} at ${row.destination}`,
    );
    const links = [];
    visit(parser.parse(item), (node) => {
      if (node.type === 'link') links.push(node);
    });
    assert.ok(
      links.some(
        (node) =>
          node.url === href && headingText(node) === row.destinationEntryLabel,
      ),
      `Wrong router label ${row.sourcePage}:${row.sourceLine}`,
    );
  }
  entries.push({
    source: `${row.sourcePage}:${row.sourceLine}`,
    destination: row.destination,
    descriptionSha256: hash(row.destinationBodyText ?? row.sourceDescription),
    disposition: 'actual-owner-verified',
  });
}
const cliGuidance = [];
const cliBody = body(source('cli-utilities/index.md'));
let partitionEnd = 0;
for (const row of map.cliConsolidation) {
  assert.equal(row.sourceStartOffset, partitionEnd);
  partitionEnd = row.sourceEndOffset;
  assert.equal(
    hash(cliBody.slice(row.sourceStartOffset, row.sourceEndOffset)),
    row.sourceHash,
  );
  at(row.destination);
  if (!['paragraph', 'listItem'].includes(row.kind)) continue;
  const owner = at(row.destination);
  const candidates = [];
  visit(parser.parse(owner), (node) => {
    if (node.type === row.kind)
      candidates.push(
        owner.slice(node.position.start.offset, node.position.end.offset),
      );
  });
  const matching = candidates.find((text) => {
    const links = [];
    visit(parser.parse(text), (node) => {
      if (['link', 'image', 'definition'].includes(node.type)) links.push(node);
    });
    if (
      !row.permittedLinkChanges.every((link) =>
        links.some(
          (node) =>
            node.type === link.kind &&
            node.url === link.destinationHref &&
            headingText(node) === link.label,
        ),
      )
    )
      return false;
    return (
      hash(
        normalizeUnit(
          { ...row, key: `${row.sourcePage}:${row.sourceLine}` },
          text,
        ),
      ) === row.normalizedHash
    );
  });
  assert.ok(
    matching,
    `Missing exact CLI guidance ${row.sourceLine} at ${row.destination}`,
  );
  cliGuidance.push({
    sourceLine: row.sourceLine,
    kind: row.kind,
    destination: row.destination,
    normalizedSha256: row.normalizedHash,
  });
}
assert.equal(partitionEnd, cliBody.length);
const guide = [];
for (const row of map.guideConsolidation) {
  const owner = at(row.destination);
  if (
    row.disposition.startsWith('superseded') ||
    row.disposition.startsWith('obsolete')
  ) {
    guide.push({
      sourceLine: row.sourceLine,
      destination: row.destination,
      disposition: row.disposition,
    });
    continue;
  }
  let expected = row.destinationBodyText ?? row.source;
  if (expected.startsWith('- [')) {
    const sourceLinks = [];
    visit(parser.parse(expected), (node) => {
      if (node.type === 'link') sourceLinks.push(node);
    });
    const old = sourceLinks[0];
    const target =
      old.url === 'concepts.md'
        ? 'getting-started/concepts.md'
        : old.url === '../workflows/index.md'
          ? 'workflows/index.md'
          : old.url.replace(/^\.\.\//, '');
    const href = posix.relative(
      posix.dirname(row.destination.split('#')[0]),
      target,
    );
    const span = destinationSpan(old, destinationSpans(expected));
    expected = expected.slice(0, span.start) + href + expected.slice(span.end);
    if (old.url === '../workflows/index.md')
      expected = expected.replace('[Agentic Workflows]', '[Workflows]');
  }
  assert.ok(
    owner.includes(expected),
    `Missing Guide source item ${row.sourceLine}`,
  );
  guide.push({
    sourceLine: row.sourceLine,
    destination: row.destination,
    actualTextSha256: hash(expected),
    disposition: row.disposition,
  });
}
for (const row of map.routerHeadingAccounting)
  for (const destination of row.destinations) at(destination);
for (const row of map.cliMetadataAccounting.filter(
  (candidate) => candidate.field === 'description',
))
  assert.ok(at(row.destination).includes(row.sourceText));
for (const addition of map.additions)
  assert.ok(
    (addition.destination.includes('#')
      ? at(addition.destination)
      : actual(addition.destination)
    ).includes(addition.text),
    `Missing additive text ${addition.destination}`,
  );
const pageProof = [];
for (const page of map.pages) {
  if (page.action === 'router-consolidation') {
    assert.ok(!existsSync(resolve(root, page.source)));
    pageProof.push({ source: page.source, action: page.action });
    continue;
  }
  const markdown = actual(page.destination);
  let expectedFrontmatter = source(page.source).slice(
    0,
    source(page.source).length - body(source(page.source)).length,
  );
  for (const [field, value] of Object.entries(page.frontmatterChanges))
    expectedFrontmatter = expectedFrontmatter.replace(
      new RegExp(`^${field}:.*$`, 'm'),
      `${field}: ${value}`,
    );
  assert.equal(
    markdown.slice(0, markdown.length - body(markdown).length),
    expectedFrontmatter,
    `Frontmatter changed ${page.source}`,
  );
  if (page.action === 'move' && !map.newIndexes.includes(page.source))
    assert.ok(
      !existsSync(resolve(root, page.source)),
      `Old route source remains ${page.source}`,
    );
  pageProof.push({
    source: page.source,
    destination: page.destination,
    action: page.action,
    sha256: hash(markdown),
  });
}
function authoredPages(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? authoredPages(resolve(directory, entry.name), `${prefix}${entry.name}/`)
      : entry.name.endsWith('.md')
        ? [`${prefix}${entry.name}`]
        : [],
  );
}
const expectedPages = [
  ...new Set([
    ...map.pages
      .filter((row) => row.action !== 'router-consolidation')
      .map((row) => row.destination),
    ...map.newIndexes,
  ]),
].sort();
assert.deepEqual(authoredPages(root).sort(), expectedPages);
console.log(
  JSON.stringify(
    {
      baseline: map.baseline,
      approvedMapSha256: hash(mapBytes),
      sourceRoot: root,
      pages: pageProof,
      authoredPages: expectedPages,
      protectedUnits,
      tableFormatting,
      additiveSeparators,
      routerSections: map.sections
        .filter((row) => row.disposition !== 'equal-normalized-hash-required')
        .map((row) => row.key),
      routerEntries: entries,
      cliGuidance,
      cliPartitionRows: map.cliConsolidation.length,
      guide,
      routerHeadingRows: map.routerHeadingAccounting.length,
      additions: map.additions.map((row) => ({
        destination: row.destination,
        textSha256: hash(row.text),
      })),
      outcome: 'pass',
    },
    null,
    2,
  ),
);
