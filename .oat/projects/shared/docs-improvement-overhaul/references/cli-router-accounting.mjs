import { createHash } from 'node:crypto';

const general = 'reference/index.md#general-cli-adoption-guidance';
const bootstrap = 'getting-started/index.md#bootstrap-and-tool-packs';
const configuration = 'reference/configuration.md#cli-adoption-guidance';
const state = 'reference/config-and-local-state.md#cli-adoption-guidance';
const remote = 'workflows/backlog-and-planning/index.md#cli-adoption-guidance';
const gates = 'workflows/advanced/index.md#cli-adoption-guidance';
const destinations = new Map([
  [8, general],
  [10, general],
  [14, 'getting-started/index.md#contents'],
  [15, 'getting-started/index.md#contents'],
  [16, 'reference/index.md#contents'],
  [17, 'workflows/backlog-and-planning/index.md#contents'],
  [18, 'reference/index.md#contents'],
  [19, 'workflows/projects/execution/index.md#contents'],
  [20, 'workflows/backlog-and-planning/index.md#contents'],
  [21, 'workflows/advanced/index.md#contents'],
  [25, general],
  [27, general],
  [29, bootstrap],
  [30, bootstrap],
  [31, configuration],
  [32, gates],
  [33, state],
  [34, state],
  [38, bootstrap],
  [39, general],
  [40, general],
  [44, general],
  [46, bootstrap],
  [47, bootstrap],
  [48, state],
  [49, general],
  [53, bootstrap],
  [54, bootstrap],
  [55, general],
  [56, remote],
  [57, gates],
  [61, bootstrap],
  [62, bootstrap],
  [63, configuration],
  [64, state],
  [65, gates],
  [69, bootstrap],
  [70, bootstrap],
  [71, configuration],
  [72, remote],
  [73, state],
  [74, gates],
]);
const headingDestinations = new Map([
  [6, general],
  [12, general],
  [23, general],
  [36, general],
  [42, general],
  [51, general],
  [59, general],
  [67, general],
]);
const hash = (text) => createHash('sha256').update(text).digest('hex');

export function cliRouterAccounting(
  content,
  parse,
  sourceLineOffset,
  sections,
  links,
) {
  const nodes = parse(content).children.flatMap((node) =>
    node.type === 'list' ? node.children : [node],
  );
  const rows = [];
  let cursor = 0;
  for (const node of nodes) {
    const start = node.position.start.offset;
    const end = node.position.end.offset;
    if (start > cursor)
      rows.push({
        kind: 'separator',
        sourceStartOffset: cursor,
        sourceEndOffset: start,
        sourceText: content.slice(cursor, start),
        disposition: 'structural-whitespace-consolidation',
        destination: general,
      });
    const sourceLine = sourceLineOffset + node.position.start.line;
    const sourceText = content.slice(start, end);
    const heading = node.type === 'heading';
    const destination = (heading ? headingDestinations : destinations).get(
      sourceLine,
    );
    if (!destination)
      throw new Error(
        `Unaccounted CLI router ${node.type} at source line ${sourceLine}`,
      );
    rows.push({
      kind: node.type,
      sourceLine,
      sourceStartOffset: start,
      sourceEndOffset: end,
      sourceText,
      sourceHash: hash(sourceText),
      disposition: heading
        ? 'router-heading-consolidated-at-named-owner'
        : 'retain-exact-guidance-with-inventoried-hrefs-only',
      destination,
      permittedLinkChanges: links.filter(
        (link) =>
          link.page === 'cli-utilities/index.md' &&
          link.bodyStartOffset >= start &&
          link.bodyEndOffset <= end,
      ),
    });
    cursor = end;
  }
  if (cursor < content.length)
    rows.push({
      kind: 'separator',
      sourceStartOffset: cursor,
      sourceEndOffset: content.length,
      sourceText: content.slice(cursor),
      disposition: 'structural-whitespace-consolidation',
      destination: general,
    });
  if (
    rows.filter((row) => !['heading', 'separator'].includes(row.kind))
      .length !== destinations.size
  )
    throw new Error(
      'CLI router source-node count differs from the exact source-line destination ledger',
    );
  for (const row of rows) {
    const section = sections.find(
      (unit) =>
        unit.sourcePage === 'cli-utilities/index.md' &&
        row.sourceStartOffset >= unit.bodyStartOffset &&
        row.sourceStartOffset < unit.bodyEndOffset,
    );
    if (!section)
      throw new Error('CLI router row has no original section owner');
    row.sourceSection = section.key;
    row.sourcePage = 'cli-utilities/index.md';
    row.sourceLine ??=
      sourceLineOffset +
      content.slice(0, row.sourceStartOffset).split('\n').length;
    row.sourceHash ??= hash(row.sourceText);
    row.authority =
      'references/fable-p02-map-review.md R1; plan.md Reviewed map amendment';
    row.approval =
      'Fable-approved-consolidation; pending-independent-conservation-recheck';
  }
  return rows;
}
