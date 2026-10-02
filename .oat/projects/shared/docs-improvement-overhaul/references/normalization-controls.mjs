import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { destinationSpan, destinationSpans } from './destination-spans.mjs';
import { normalizeApprovedH1 } from './heading-normalization.mjs';

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repo = resolve(evidenceRoot, '../../../../..');
if (
  process.argv.includes('--legacy-negative-control') ||
  process.argv.includes('--h1-negative-control')
) {
  const legacy = process.argv.includes('--legacy-negative-control');
  const temporary = await mkdtemp(
    resolve(tmpdir(), 'docs-p02-normalization-negative-'),
  );
  try {
    let helper = (
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
    if (!legacy)
      helper = (
        await readFile(resolve(evidenceRoot, 'destination-spans.mjs'), 'utf8')
      ).replace(
        "fileURLToPath(new URL('../../../../../', import.meta.url))",
        JSON.stringify(repo),
      );
    let headings = await readFile(
      resolve(evidenceRoot, 'heading-normalization.mjs'),
      'utf8',
    );
    if (!legacy)
      headings = headings.replace(
        'if (firstLine !== `# ${change.destinationHeading}`)',
        'if (false && firstLine !== `# ${change.destinationHeading}`)',
      );
    const probe = (
      await readFile(fileURLToPath(import.meta.url), 'utf8')
    ).replace(
      'const evidenceRoot = dirname(fileURLToPath(import.meta.url));',
      `const evidenceRoot = ${JSON.stringify(evidenceRoot)};`,
    );
    await writeFile(resolve(temporary, 'destination-spans.mjs'), helper);
    await writeFile(resolve(temporary, 'heading-normalization.mjs'), headings);
    await writeFile(resolve(temporary, 'normalization-controls.mjs'), probe);
    const result = spawnSync(
      process.execPath,
      [resolve(temporary, 'normalization-controls.mjs')],
      { cwd: repo, encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /AssertionError/);
    if (legacy) {
      assert.match(
        result.stderr,
        /\[`oat-docs:commands\.md`\]\(commands\.md\)/,
      );
      assert.match(
        result.stderr,
        /\[`commands\.md`\]\(oat-docs:commands\.md\)/,
      );
    } else assert.match(result.stderr, /Missing expected exception/);
    console.log(
      JSON.stringify(
        {
          control: legacy
            ? 'copied-helper-neutralized-to-pre-fix-first-substring-spans'
            : 'copied-exact-H1-guard-neutralized',
          childExit: result.status,
          categoricalOutcome: legacy
            ? 'literal-repeated-label-assertion-fails'
            : 'unapproved-H1-rejection-control-fails-with-Missing-expected-exception',
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
const { default: Slugger } = await import(
  pathToFileURL(requireCli.resolve('github-slugger')).href
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
const h1Controls = [
  [
    'index.md',
    '# OAT Documentation\n\nOriginal capability paragraph.\n',
    '# Home\n\nOriginal capability paragraph.\n',
  ],
  [
    'workflows/projects/index.md',
    '# Workflow & Projects\n\nOriginal capability paragraph.\n',
    '# Projects\n\nOriginal capability paragraph.\n',
  ],
  [
    'workflows/index.md',
    '# Agentic Workflows\n\nOriginal capability paragraph.\n',
    '# Choose a Workflow\n\nOriginal capability paragraph.\n',
  ],
];
for (const [page, originalSection, renamedSection] of h1Controls) {
  assert.equal(normalizeApprovedH1(page, originalSection), originalSection);
  assert.equal(normalizeApprovedH1(page, renamedSection), originalSection);
  assert.notEqual(
    normalizeApprovedH1(
      page,
      renamedSection.replace(
        'Original capability paragraph.',
        'Changed capability paragraph.',
      ),
    ),
    originalSection,
  );
}
assert.throws(
  () =>
    normalizeApprovedH1(
      'index.md',
      '# Unauthorized Heading\n\nOriginal capability paragraph.\n',
    ),
  /Unapproved H1/,
);
assert.throws(
  () => normalizeApprovedH1('getting-started/index.md', '# Getting Started\n'),
  /No approved H1 normalization/,
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
  const h1 = migration.headingNormalization.find(
    (row) => row.sourcePage === page.source,
  );
  if (h1) {
    const node = parser
      .parse(content)
      .children.find((child) => child.type === 'heading' && child.depth === 1);
    const renamed = replace(
      content,
      { start: node.position.start.offset, end: node.position.end.offset },
      h1.destinationHeadingText,
    );
    const slugger = new Slugger();
    const headingText = (child) =>
      child.children
        ? child.children.map(headingText).join('')
        : (child.value ?? '');
    const renamedHeadings = parser
      .parse(renamed)
      .children.filter((child) => child.type === 'heading')
      .map((child) => ({
        title: headingText(child),
        anchor: slugger.slug(headingText(child)),
      }));
    assert.equal(renamedHeadings[0].anchor, h1.destinationAnchor);
    assert.deepEqual(
      renamedHeadings.slice(1),
      page.headings
        .slice(1)
        .map((heading) => ({ title: heading.title, anchor: heading.anchor })),
    );
  }
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
    if (section.permittedHeadingChange)
      normalized = normalizeApprovedH1(page.source, normalized);
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
const cliSource = execFileSync(
  'git',
  ['show', `${migration.baseline}:apps/oat-docs/docs/cli-utilities/index.md`],
  { cwd: repo, encoding: 'utf8' },
);
const cliBody = cliSource.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
assert.equal(
  migration.cliConsolidation.map((row) => row.sourceText).join(''),
  cliBody,
);
let cursor = 0;
for (const row of migration.cliConsolidation) {
  assert.equal(row.sourceStartOffset, cursor);
  assert.equal(
    cliBody.slice(row.sourceStartOffset, row.sourceEndOffset),
    row.sourceText,
  );
  assert.equal(hash(row.sourceText), row.sourceHash);
  assert.ok(row.destination.includes('#'));
  cursor = row.sourceEndOffset;
}
assert.equal(cursor, cliBody.length);
const cliGuidance = migration.cliConsolidation.filter(
  (row) => !['heading', 'separator'].includes(row.kind),
);
assert.equal(cliGuidance.length, 42);
assert.deepEqual(
  cliGuidance
    .filter((row) => [8, 10].includes(row.sourceLine))
    .map((row) => row.destination),
  [
    'reference/index.md#general-cli-adoption-guidance',
    'reference/index.md#general-cli-adoption-guidance',
  ],
);
assert.equal(
  migration.pages.filter((page) => page.action === 'router-consolidation')
    .length,
  2,
);
assert.equal(
  migration.pages.filter((page) => page.action === 'move').length,
  35,
);
assert.equal(migration.newIndexes.length, 8);
assert.deepEqual(
  migration.headingNormalization.map((row) => [
    row.sourcePage,
    row.sourceHeading,
    row.destinationHeading,
    row.sourceAnchor,
    row.destinationAnchor,
  ]),
  [
    ['index.md', 'OAT Documentation', 'Home', 'oat-documentation', 'home'],
    [
      'workflows/projects/index.md',
      'Workflow & Projects',
      'Projects',
      'workflow--projects',
      'projects',
    ],
    [
      'workflows/index.md',
      'Agentic Workflows',
      'Choose a Workflow',
      'agentic-workflows',
      'choose-a-workflow',
    ],
  ],
);
assert.ok(
  migration.headingNormalization.every(
    (row) =>
      row.authoredIncomingConsumers.length === 0 &&
      row.trackedAnchorMentions.length === 0,
  ),
);
const missingGuidance = migration.cliConsolidation.filter(
  (row) => row.sourceLine !== 34,
);
const assertCliPartition = (rows) =>
  assert.equal(
    rows.map((row) => row.sourceText).join(''),
    cliBody,
    'CLI router must conserve the complete exact source body',
  );
assertCliPartition(migration.cliConsolidation);
assert.throws(
  () => assertCliPartition(missingGuidance),
  /CLI router must conserve the complete exact source body/,
);
assert.equal(migration.routerHeadingAccounting.length, 13);
assert.equal(
  migration.sections.filter(
    (section) => section.disposition === 'equal-normalized-hash-required',
  ).length,
  816,
);
assert.equal(
  migration.sections.filter(
    (section) => section.disposition !== 'equal-normalized-hash-required',
  ).length,
  24,
);
assert.equal(
  migration.pages.find((page) => page.source === 'cli-utilities/index.md')
    .frontmatterChanges.title,
  undefined,
);
assert.equal(
  migration.additions.find(
    (row) => row.destination === 'getting-started/index.md',
  ).h1,
  '# Getting Started',
);
assert.equal(
  migration.additions.find((row) => row.kind === 'prominent-body-discovery')
    .destination,
  'workflows/projects/index.md#reference-contracts',
);
assert.equal(
  cliGuidance.find((row) => row.sourceLine === 71).permittedLinkChanges[0]
    .destinationHref,
  'configuration.md',
);
assert.equal(
  cliGuidance.find((row) => row.sourceLine === 34).permittedLinkChanges[0]
    .destinationHref,
  'config-and-local-state.md',
);
const homeGeneralCli = routerItems.find(
  (row) => row.sourcePage === 'index.md' && row.sourceLine === 23,
);
assert.equal(
  homeGeneralCli.destination,
  'reference/index.md#general-cli-adoption-guidance',
);
assert.equal(
  homeGeneralCli.destinationBodyText,
  'Canonical section for general OAT CLI surfaces outside provider sync, docs tooling, and tracked workflows.',
);
assert.equal(
  homeGeneralCli.sourceDescription,
  ` - ${homeGeneralCli.destinationBodyText}`,
);
const guideGeneralCli = migration.guideConsolidation.find((row) =>
  row.source.includes('[CLI Utilities]'),
);
assert.equal(
  guideGeneralCli.destination,
  'reference/index.md#general-cli-adoption-guidance',
);
assert.equal(
  guideGeneralCli.destinationBodyText,
  'Bootstrap, tool packs, configuration, and general CLI surfaces.',
);
assert.ok(
  guideGeneralCli.source.endsWith(` - ${guideGeneralCli.destinationBodyText}`),
);
assert.equal(
  migration.additions.find((row) => row.kind === 'new-onboarding-entry').target,
  'getting-started/index.md',
);
for (const row of cliGuidance) {
  let normalized = row.sourceText;
  for (const link of [...row.permittedLinkChanges].sort(
    (first, second) =>
      second.destinationToken.start - first.destinationToken.start,
  ))
    normalized = replace(
      normalized,
      {
        start: link.destinationToken.start - row.sourceStartOffset,
        end: link.destinationToken.end - row.sourceStartOffset,
      },
      `oat-docs:${link.target}${link.href.slice(link.href.split(/[?#]/)[0].length)}`,
    );
  assert.equal(hash(normalized), row.normalizedHash);
}
assert.deepEqual(
  migration.editorialResidues.map((row) => [
    row.phase,
    row.page,
    row.sourceHeading,
  ]),
  [
    ['p06', 'getting-started/quickstart.md', 'CLI Utilities'],
    ['p06', 'workflows/choose-workflow.md', 'Contents'],
  ],
);
console.log(
  JSON.stringify(
    {
      baseline: migration.baseline,
      literalControls: controls.length,
      h1LiteralControls: h1Controls.length,
      unapprovedH1Rejected: true,
      h1OnlyMutationAccepted: true,
      surroundingParagraphMutationRejected: true,
      cliRouterGuidanceUnits: cliGuidance.length,
      cliRouterBytePartitionRows: migration.cliConsolidation.length,
      cliRouterGuidedDoctorRemovalRejected: true,
      generalCliDescriptionsRetainedAtActualReferenceOwner: true,
      otherNativeHeadingAnchorsUnchanged: true,
      exactH1AnchorTransitions: migration.headingNormalization.map((row) => ({
        sourcePage: row.sourcePage,
        sourceAnchor: row.sourceAnchor,
        destinationAnchor: row.destinationAnchor,
        authoredIncomingConsumers: row.authoredIncomingConsumers.length,
        trackedAnchorMentions: row.trackedAnchorMentions.length,
      })),
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
