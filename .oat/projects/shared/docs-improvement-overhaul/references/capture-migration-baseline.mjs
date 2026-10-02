import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { destinationSpan, destinationSpans } from './destination-spans.mjs';

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repo = resolve(evidenceRoot, '../../../../..');
const baseline = '8b78d9a935b31ef50e65713b03a022a5d022aa59';
const initial = '257517ab5aa1a5846cb4069ba036eafd7b5009f5';
const acceptedBase = 'fc3515327df51632286f0c9a373e76e7b36b8c30';
const docsPrefix = 'apps/oat-docs/docs/';
const git = (...args) =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
const source = (path, sha = baseline) => git('show', `${sha}:${path}`);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const tracked = git('ls-tree', '-r', '--name-only', baseline)
  .trim()
  .split('\n');
if (
  git(
    'diff',
    '--name-only',
    baseline,
    'HEAD',
    '--',
    'packages/cli/src',
    '.agents/skills',
  ).trim()
)
  throw new Error(
    'Live command/config/pack/skill sources differ from exact source baseline; recapture requires explicit scope.',
  );
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
const parse = (text) => parser.parse(text);
const body = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
const headingText = (node) =>
  node.children ? node.children.map(headingText).join('') : (node.value ?? '');
const visit = (node, fn) => {
  fn(node);
  node.children?.forEach((child) => visit(child, fn));
};
const moved = {
  'quickstart.md': 'getting-started/quickstart.md',
  'guide/concepts.md': 'getting-started/concepts.md',
  'guide/index.md': 'index.md',
  'cli-utilities/index.md': 'getting-started/index.md',
  'cli-utilities/bootstrap.md': 'getting-started/bootstrap.md',
  'cli-utilities/tool-packs.md': 'getting-started/tool-packs.md',
  'cli-utilities/configuration.md': 'reference/configuration.md',
  'cli-utilities/config-and-local-state.md':
    'reference/config-and-local-state.md',
  'cli-utilities/backlog-lifecycle.md':
    'workflows/backlog-and-planning/backlog-lifecycle.md',
  'cli-utilities/remote-project-management.md':
    'workflows/backlog-and-planning/remote-project-management.md',
  'cli-utilities/project-log.md': 'workflows/projects/execution/project-log.md',
  'cli-utilities/workflow-gates.md': 'workflows/advanced/workflow-gates.md',
  'workflows/index.md': 'workflows/choose-workflow.md',
  'workflows/wave-workflows.md': 'workflows/waves/wave-workflows.md',
  'workflows/skills/index.md': 'skills/index.md',
  'workflows/skills/explainer-kit.md': 'skills/explainer-kit.md',
  'workflows/skills/recon.md': 'skills/recon.md',
  'workflows/skills/repo-improve.md': 'skills/repo-improve.md',
  'workflows/projects/artifacts.md': 'reference/project-artifacts.md',
  'workflows/projects/state-machine.md': 'reference/project-state-machine.md',
  'workflows/projects/design-modes.md':
    'workflows/projects/planning/design-modes.md',
  'workflows/projects/hill-checkpoints.md':
    'workflows/projects/planning/hill-checkpoints.md',
  'workflows/projects/splitting.md': 'workflows/projects/planning/splitting.md',
  'workflows/projects/implementation-execution.md':
    'workflows/projects/execution/implementation-execution.md',
  'workflows/projects/picking-up-projects.md':
    'workflows/projects/execution/picking-up-projects.md',
  'workflows/projects/reviews.md': 'workflows/projects/reviews/index.md',
  'workflows/projects/review-flavors.md':
    'workflows/projects/reviews/review-flavors.md',
  'workflows/projects/reviewing-oat-prs.md':
    'workflows/projects/reviews/reviewing-oat-prs.md',
  'workflows/projects/pr-flow.md': 'workflows/projects/closeout/pr-flow.md',
  'workflows/projects/retro.md': 'workflows/projects/closeout/retro.md',
  'workflows/projects/repo-analysis.md': 'reference/repository-pr-comments.md',
};
for (const name of [
  'autonomy',
  'cursor-cloud',
  'dispatch-ceiling',
  'orchestration-model',
  'evidence-layers',
  'programmatic-execution',
]) {
  moved[`workflows/projects/${name}.md`] = `workflows/advanced/${name}.md`;
}
const route = (path) =>
  `/${path
    .replace(/(?:^|\/)index\.md$/, '')
    .replace(/\.md$/, '')
    .replace(/\/$/, '')}`;
const frontmatter = (text) =>
  /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '';
const textPages = new Map(
  tracked
    .filter((path) => path.startsWith(docsPrefix) && path.endsWith('.md'))
    .map((path) => [path.slice(docsPrefix.length), source(path)]),
);
const links = [];
const sections = [];
const pages = [];
for (const [path, markdown] of textPages) {
  const destination = moved[path] ?? path;
  const content = body(markdown);
  const sourceLineOffset =
    markdown.slice(0, markdown.length - content.length).split('\n').length - 1;
  const tree = parse(content);
  const tokenSpans = destinationSpans(content);
  const pageLinks = [];
  visit(tree, (node) => {
    if (['link', 'image', 'definition'].includes(node.type)) {
      const href = node.url;
      const offset = node.position.start.offset;
      const snippet = content.slice(offset, node.position.end.offset);
      const span = destinationSpan(node, tokenSpans);
      let target = null;
      let targetKind = 'external';
      let newHref = href;
      const hosted =
        /^https:\/\/voxmedia\.github\.io\/open-agent-toolkit(?:\/|$)/.test(
          href,
        );
      const local = !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href);
      if (local || hosted) {
        const hrefPath = hosted
          ? href.replace(
              /^https:\/\/voxmedia\.github\.io\/open-agent-toolkit\/?/,
              '',
            )
          : href;
        const [withoutFragment, fragment] = hrefPath.split('#');
        const [pathname, query] = withoutFragment.split('?');
        target =
          hosted || pathname.startsWith('/')
            ? pathname.replace(/^\//, '')
            : pathname
              ? posix.normalize(posix.join(posix.dirname(path), pathname))
              : path;
        if (!posix.extname(target))
          target =
            target.replace(/\/$/, '') + (target ? '/index.md' : 'index.md');
        if (
          !textPages.has(target) &&
          !posix.extname(pathname) &&
          textPages.has(target.replace(/\/index\.md$/, '.md'))
        )
          target = target.replace(/\/index\.md$/, '.md');
        targetKind = textPages.has(target)
          ? 'page'
          : tracked.includes(docsPrefix + target)
            ? 'asset'
            : 'unresolved';
        const newTarget = moved[target] ?? target;
        if (targetKind === 'page') {
          if (hosted)
            newHref = `https://voxmedia.github.io/open-agent-toolkit${route(newTarget)}${query ? `?${query}` : ''}${fragment ? `#${fragment}` : ''}`;
          else if (!pathname) newHref = href;
          else
            newHref = `${posix.relative(posix.dirname(destination), newTarget) || posix.basename(newTarget)}${query ? `?${query}` : ''}${fragment ? `#${fragment}` : ''}`;
        }
      }
      const item = {
        page: path,
        line: node.position.start.line + sourceLineOffset,
        kind: node.type,
        label: headingText(node),
        href,
        target,
        targetKind,
        destinationHref: newHref,
        snippetHash: hash(snippet),
        bodyStartOffset: offset,
        bodyEndOffset: node.position.end.offset,
        destinationToken: span,
      };
      links.push(item);
      if (targetKind === 'page')
        pageLinks.push({
          start: span.start,
          end: span.end,
          stable: `oat-docs:${target}${href.split('#')[0].includes('?') ? `?${href.split('#')[0].split('?')[1]}` : ''}${href.includes('#') ? `#${href.split('#')[1]}` : ''}`,
          item,
        });
    }
  });
  const headingNodes = tree.children.filter((node) => node.type === 'heading');
  const slugger = new Slugger();
  const headings = headingNodes.map((node) => ({
    title: headingText(node),
    depth: node.depth,
    line: node.position.start.line + sourceLineOffset,
    bodyOffset: node.position.start.offset,
    offset: node.position.start.offset,
    anchor: slugger.slug(headingText(node)),
  }));
  const starts = [
    {
      title: '$preamble',
      depth: 0,
      line: 1 + sourceLineOffset,
      offset: 0,
      anchor: null,
    },
    ...headings,
  ];
  const occurrences = new Map();
  const sectionKeys = [];
  for (let index = 0; index < starts.length; index++) {
    const heading = starts[index];
    const end = starts[index + 1]?.offset ?? content.length;
    if (heading.offset === end) continue;
    const count = (occurrences.get(heading.title) ?? 0) + 1;
    occurrences.set(heading.title, count);
    const key = `${path}::${heading.title}::${count}`;
    const original = content.slice(heading.offset, end);
    let normalized = original;
    const changes = pageLinks
      .filter((link) => link.start >= heading.offset && link.end <= end)
      .sort((first, second) => second.start - first.start);
    for (const change of changes)
      normalized =
        normalized.slice(0, change.start - heading.offset) +
        change.stable +
        normalized.slice(change.end - heading.offset);
    const router =
      path.endsWith('index.md') &&
      (heading.title === 'Contents' || path === 'guide/index.md');
    sections.push({
      key,
      sourcePage: path,
      heading: heading.title,
      occurrence: count,
      depth: heading.depth,
      anchor: heading.anchor,
      startLine: heading.line,
      bodyStartOffset: heading.offset,
      bodyEndOffset: end,
      destinationPage: destination,
      destinationHeading: heading.title,
      disposition: router
        ? 'explicit-router-accounting-pending-review'
        : 'equal-normalized-hash-required',
      rawHash: hash(original),
      normalizedHash: hash(normalized),
      permittedLinkChanges: changes.map((change) => change.item),
      routerText: router ? original : undefined,
    });
    sectionKeys.push(key);
  }
  pages.push({
    source: path,
    destination,
    sourceRoute: route(path),
    destinationRoute: route(destination),
    kind: path.endsWith('index.md') ? 'router' : 'leaf',
    action:
      path === 'guide/index.md'
        ? 'router-consolidation'
        : path === destination
          ? 'retain'
          : 'move',
    sourceHash: hash(markdown),
    sourceFrontmatter: frontmatter(markdown),
    frontmatterChanges:
      path === 'index.md'
        ? { title: 'Home' }
        : path === 'cli-utilities/index.md'
          ? { title: 'Getting Started' }
          : path === 'workflows/projects/index.md'
            ? { title: 'Projects' }
            : path === 'workflows/index.md'
              ? { title: 'Choose a Workflow' }
              : {},
    headings,
    sections: sectionKeys,
  });
}
const assets = tracked
  .filter((path) => path.startsWith(docsPrefix) && !path.endsWith('.md'))
  .map((path) => ({
    source: path.slice(docsPrefix.length),
    destination: path.slice(docsPrefix.length),
    sourceHash: hash(
      execFileSync('git', ['show', `${baseline}:${path}`], { cwd: repo }),
    ),
  }));
const externalConsumers = [];
for (const path of tracked.filter(
  (trackedPath) =>
    !trackedPath.startsWith(docsPrefix) &&
    !/^(?:pnpm-lock\.yaml|.*\.(?:png|jpe?g|gif|ico|woff2?|pdf))$/.test(
      trackedPath,
    ),
)) {
  const ignoredHistorical =
    /^\.oat\/(?:projects|repo)\//.test(path) ||
    path.includes('/tests/fixtures/');
  let text;
  try {
    text = source(path);
  } catch {
    continue;
  }
  const hits = text
    .split('\n')
    .flatMap((line, index) =>
      /(?:apps\/oat-docs\/docs\/|voxmedia\.github\.io\/open-agent-toolkit|(?:guide|cli-utilities|workflows\/(?:projects|skills))\/[^`\s)]+\.md)/.test(
        line,
      )
        ? [{ line: index + 1, text: line }]
        : [],
    );
  if (hits.length)
    externalConsumers.push({
      path,
      disposition: ignoredHistorical
        ? 'historical-evidence-retain'
        : path === 'apps/oat-docs/index.md'
          ? 'regenerate-not-hand-edit'
          : 'live-consumer-review',
      hitCount: hits.length,
      sourceHash: hash(text),
      hits: ignoredHistorical ? undefined : hits,
    });
}
const newIndexes = [
  'workflows/index.md',
  'workflows/projects/planning/index.md',
  'workflows/projects/execution/index.md',
  'workflows/projects/closeout/index.md',
  'workflows/backlog-and-planning/index.md',
  'workflows/waves/index.md',
  'workflows/advanced/index.md',
];
const noAliasDecision =
  'design.md: Information migration and consumers — User decision: allow moved URLs to break; no aliases, redirects, compatibility pages or permanent transitional stubs.';
const routerItems = (section) => {
  if (section.sourcePage === 'guide/index.md') return [];
  const items = [];
  visit(parse(section.routerText), (node) => {
    if (node.type !== 'listItem') return;
    const itemLinks = links.filter(
      (link) =>
        link.page === section.sourcePage &&
        link.bodyStartOffset >=
          section.bodyStartOffset + node.position.start.offset &&
        link.bodyEndOffset <=
          section.bodyStartOffset + node.position.end.offset,
    );
    if (itemLinks.length !== 1)
      throw new Error(
        `Router list item needs exact single-link accounting: ${section.key}`,
      );
    const link = itemLinks[0];
    const sourceText = section.routerText.slice(
      node.position.start.offset,
      node.position.end.offset,
    );
    const sourceLine = section.startLine + node.position.start.line - 1;
    const sourceDescription = section.routerText.slice(
      link.bodyEndOffset - section.bodyStartOffset,
      node.position.end.offset,
    );
    if (section.sourcePage === 'index.md' && link.target === 'guide/index.md') {
      if (
        sourceLine !== 19 ||
        sourceText !==
          '- [User Guide](guide/index.md) - Legacy compatibility router for old guide links while content continues moving into the canonical sections below.'
      )
        throw new Error(
          'Home obsolete entry differs from independently identified source',
        );
      items.push({
        sourcePage: section.sourcePage,
        sourceLine,
        sourceText,
        sourceDescription,
        disposition: 'superseded-route-only-entry',
        destination: null,
        decisionProvenance: noAliasDecision,
        rationale:
          'This compatibility-router entry alone is obsolete under the explicit no-alias decision; the retained adoption/capability guidance has separate Guide destinations. No product capability is removed.',
        approval: 'pending-independent-recheck-and-Fable-review',
      });
      return;
    }
    let entryTarget = moved[link.target] ?? link.target;
    let destination;
    if (section.sourcePage === 'workflows/index.md')
      destination = 'workflows/choose-workflow.md#contents';
    else if (
      section.sourcePage === 'index.md' &&
      link.target !== 'quickstart.md'
    ) {
      destination = 'index.md#contents';
      if (link.target === 'workflows/index.md')
        entryTarget = 'workflows/index.md';
    } else if (
      section.sourcePage === 'workflows/skills/index.md' &&
      !entryTarget.startsWith('skills/')
    )
      destination = 'skills/index.md#related-guides';
    else {
      const parent = entryTarget.endsWith('/index.md')
        ? posix.dirname(posix.dirname(entryTarget))
        : posix.dirname(entryTarget);
      destination = `${parent === '.' ? '' : `${parent}/`}index.md#contents`;
    }
    const entryLabel =
      {
        'cli-utilities/index.md': 'Getting Started',
        'workflows/index.md': 'Workflows',
        'workflows/projects/index.md': 'Projects',
      }[link.target] ?? link.label;
    items.push({
      sourcePage: section.sourcePage,
      sourceLine,
      sourceText,
      sourceDescription,
      disposition: 'retain-description-at-named-entry',
      destination,
      destinationEntryTarget: entryTarget,
      destinationEntryLabel: entryLabel,
      permittedChanges:
        'Only the inventoried href and explicitly named router-entry label; sourceDescription remains exact.',
      approval: 'pending-independent-recheck-and-Fable-review',
    });
  });
  return items;
};
const routerAccounting = sections
  .filter((section) => section.disposition !== 'equal-normalized-hash-required')
  .map((section) => ({
    section: section.key,
    sourcePage: section.sourcePage,
    sourceLine: section.startLine,
    destinationPage: section.destinationPage,
    sourceTextHash: section.rawHash,
    sourceText: section.routerText,
    contentDestination:
      section.sourcePage === 'guide/index.md'
        ? 'See individually enumerated guideConsolidation rows; approval remains pending.'
        : 'See items: each exact source list item has a concrete destination anchor and entry target/label, or the single independently identified Home compatibility-entry disposition. No blanket exclusion.',
    items: routerItems(section),
    links: links.filter(
      (link) =>
        link.page === section.sourcePage &&
        section.permittedLinkChanges.some(
          (change) => change.line === link.line,
        ),
    ),
    approval: 'pending',
  }));
const guideConsolidation = [
  {
    section: 'User Guide',
    source: '# User Guide',
    destination: 'index.md#oat-documentation',
    disposition:
      'obsolete-router-label-consolidated-into-existing-home-heading',
    rationale: 'Router headings may consolidate; no leaf heading changes.',
  },
  {
    section: 'User Guide',
    source: 'This page is now a compatibility router.',
    destination: 'index.md#canonical-sections',
    disposition: 'superseded-route-only-status',
    rationale:
      'User expressly rejects aliases/compatibility stubs and permits moved URLs to break; this is not guidance on a retained product capability.',
  },
  {
    section: 'User Guide',
    source:
      'The old catch-all User Guide is being split into clearer adoption lanes so new users can choose the part of OAT that matches what they actually need.',
    destination: 'index.md#canonical-sections',
    disposition: 'retain-verbatim',
  },
  {
    section: 'Contents',
    source:
      '- [Core Concepts](concepts.md) - High-level mental model while concept material is being redistributed.',
    destination: 'getting-started/index.md#contents',
    disposition: 'retain-description-at-single-canonical-entry',
    allowedChange:
      'href -> concepts.md (new physical directory), label unchanged; duplicated below as Legacy Pages.',
  },
  {
    section: 'Status',
    source:
      'This guide bucket remains visible so older links have a stable landing page.',
    destination: 'index.md#canonical-sections',
    disposition: 'superseded-route-only-status',
    rationale:
      'Same explicit user URL-break/no-stub decision; no stable old guide landing remains.',
  },
  {
    section: 'Status',
    source:
      'New docs should go into the canonical top-level sections below instead of adding more pages under `guide/`.',
    destination: 'index.md#canonical-sections',
    disposition: 'retain-verbatim',
  },
  {
    section: 'Canonical Sections',
    source:
      '- [Provider Sync](../provider-sync/index.md) - Provider interoperability, drift, sync, and config behavior.',
    destination: 'index.md#canonical-sections',
    disposition: 'retain-description-and-label',
    allowedChange: 'href -> provider-sync/index.md',
  },
  {
    section: 'Canonical Sections',
    source:
      '- [Agentic Workflows](../workflows/index.md) - Tracked projects, ideas, workflow skills, and lifecycle execution.',
    destination: 'index.md#canonical-sections',
    disposition: 'retain-description',
    allowedChange: 'href -> workflows/index.md; router label -> Workflows',
  },
  {
    section: 'Canonical Sections',
    source:
      '- [Docs Tooling](../docs-tooling/index.md) - Docs app setup, docs commands, and docs workflow entry points.',
    destination: 'index.md#canonical-sections',
    disposition: 'retain-description-and-label',
    allowedChange: 'href -> docs-tooling/index.md',
  },
  {
    section: 'Canonical Sections',
    source:
      '- [CLI Utilities](../cli-utilities/index.md) - Bootstrap, tool packs, configuration, and general CLI surfaces.',
    destination: 'index.md#canonical-sections',
    disposition: 'retain-description',
    allowedChange:
      'href -> getting-started/index.md; router label -> Getting Started; configuration still has explicit Reference discovery and its own protected owner page.',
  },
  {
    section: 'Canonical Sections',
    source:
      '- [Reference](../reference/index.md) - Durable contracts and reference material.',
    destination: 'index.md#canonical-sections',
    disposition: 'retain-description-and-label',
    allowedChange: 'href -> reference/index.md',
  },
  {
    section: 'Legacy Pages Still Under Guide',
    source:
      '- [Core Concepts](concepts.md) - High-level mental model while concept material is being redistributed.',
    destination: 'getting-started/index.md#contents',
    disposition: 'explicit-exact-duplicate-of-Contents-entry',
  },
  {
    section: 'Legacy Pages Still Under Guide',
    source:
      '- This guide bucket is being retired. Use the canonical top-level sections above for active documentation.',
    destination: 'index.md#canonical-sections',
    disposition: 'retain-verbatim',
  },
];
for (const row of guideConsolidation) {
  const section = sections.find(
    (unit) =>
      unit.sourcePage === 'guide/index.md' && unit.heading === row.section,
  );
  const relativeLine = section.routerText
    .split('\n')
    .findIndex((line) => line.includes(row.source));
  if (relativeLine < 0)
    throw new Error(
      `Guide accounting does not identify source text: ${row.source}`,
    );
  row.sourceLine = section.startLine + relativeLine;
  row.approval = 'pending-independent-and-Fable-review';
  if (row.disposition === 'superseded-route-only-status')
    row.decisionProvenance = noAliasDecision;
}
const migration = {
  schemaVersion: 1,
  status: 'draft-awaiting-independent-and-Fable-review',
  baseline,
  initialImplementationBase: initial,
  acceptedBookkeepingBase: acceptedBase,
  sourceRoot: docsPrefix,
  primaryLabels: [
    'Getting Started',
    'Skills',
    'Workflows',
    'Provider Sync',
    'Docs Tooling',
    'Reference',
    'Contributing',
  ],
  homeLabel: 'Home',
  pages,
  sections,
  assets,
  links,
  externalConsumers,
  newIndexes,
  routerAccounting,
  guideConsolidation,
  routeOnlySupersessions: [
    ...guideConsolidation
      .filter((row) => row.disposition === 'superseded-route-only-status')
      .map((row) => ({ ...row, sourcePage: 'guide/index.md' })),
    ...routerAccounting
      .flatMap((row) => row.items)
      .filter((item) => item.disposition === 'superseded-route-only-entry'),
  ],
  normalization: {
    rule: 'Replace only micromark destination-string tokens bound to the exact parsed link/image/definition owner offsets and decoded URL, listed per section, with their stable original page identifier; fail missing/ambiguous/mismatched tokens. Preserve every other body byte, including headings, paragraphs, code, link labels, punctuation and whitespace.',
    frontmatter:
      'Excluded from section text but exact original frontmatter inventoried per page; only listed title edits allowed. Any additional change needs explicit inventory and review.',
    routers:
      'Contents sections and guide/index.md require explicit section/line destination accounting; no general router paragraph removal exemption. guideConsolidation names every nonblank line/sentence and routerAccounting.items names each other Contents list item. routeOnlySupersessions enumerates exactly two Guide compatibility-status sentences and the separate Home index.md:19 compatibility-router entry under the existing explicit no-alias decision, pending independent recheck and Fable review.',
    queries:
      'Retain query text in rewrite inventory and normalized hash; unsupported navigation syntax is checked separately.',
    positions:
      'line/startLine are original-source one-based lines including frontmatter; bodyStartOffset/bodyEndOffset/headings.bodyOffset are explicitly frontmatter-stripped body offsets.',
  },
};
await mkdir(evidenceRoot, { recursive: true });
await writeFile(
  resolve(evidenceRoot, 'route-migration.json'),
  `${JSON.stringify(migration, null, 2)}\n`,
);
const { createProgram } = await import(
  pathToFileURL(resolve(repo, 'packages/cli/src/app/create-program.ts')).href
);
const { registerCommands } = await import(
  pathToFileURL(resolve(repo, 'packages/cli/src/commands/index.ts')).href
);
const program = createProgram();
registerCommands(program);
const commands = [];
const docsMentions = (needle) =>
  [...textPages].flatMap(([page, text]) => {
    const lines = text
      .split('\n')
      .flatMap((line, index) => (line.includes(needle) ? [index + 1] : []));
    return lines.length
      ? [{ page, lines, destination: moved[page] ?? page }]
      : [];
  });
function capture(command, parent = []) {
  const names = [...parent, command.name()];
  const spelling = names.join(' ');
  const docRefs = docsMentions(spelling);
  commands.push({
    command: spelling,
    aliases: command.aliases(),
    description: command.description(),
    hidden: Boolean(command._hidden),
    arguments: command.registeredArguments.map((argument) => ({
      name: argument.name(),
      required: argument.required,
      variadic: argument.variadic,
      defaultValue: argument.defaultValue ?? null,
    })),
    options: command.options.map((option) => ({
      flags: option.flags,
      attribute: option.attributeName(),
      description: option.description,
      required: option.required,
      optional: option.optional,
      mandatory: option.mandatory,
      negate: option.negate,
      defaultValue: option.defaultValue ?? null,
      choices: option.argChoices ?? null,
      docRefs: docsMentions(option.long ?? option.short).filter((reference) =>
        docRefs.some((commandRef) => commandRef.page === reference.page),
      ),
    })),
    inheritedOptions: parent.length
      ? 'Ancestor options are recorded once on their real registered parent.'
      : null,
    docRefs,
    coverage: docRefs.length
      ? 'direct-literal-mention-semantic-completeness-unreviewed'
      : 'no-direct-literal-mention-gap-for-p06',
  });
  command.commands.forEach((child) => capture(child, names));
}
capture(program);
const realHelp = program.createHelp();
const frameworkHelp = {
  version: program.version(),
  option: realHelp
    .visibleOptions(program)
    .filter((option) => option.long === '--help')
    .map((option) => ({
      flags: option.flags,
      description: option.description,
    })),
  implicitCommand: realHelp
    .visibleCommands(program)
    .filter((command) => command.name() === 'help')
    .map((command) => ({
      name: command.name(),
      description: command.description(),
      arguments: command.registeredArguments.map((argument) => ({
        name: argument.name(),
        required: argument.required,
        variadic: argument.variadic,
      })),
    })),
  rootHelpInformation: program.helpInformation(),
  registeredRootOptions: commands[0].options.map(
    ({ flags, description, defaultValue }) => ({
      flags,
      description,
      defaultValue,
    }),
  ),
  provenance:
    'Actual registered root createHelp().visibleOptions/visibleCommands and helpInformation(); Commander 12.1.0 command/help implementation. Automatic -h/--help and help [command] are framework capabilities, not duplicated among the explicit declarations. No command action or help exit was invoked.',
};
const config = JSON.parse(
  await readFile('/tmp/docs-p02-config-describe.json', 'utf8'),
);
if (config.status !== 'ok') throw new Error('Config describe failed');
const configEntries = config.entries.map((entry) => ({
  ...entry,
  docRefs: docsMentions(entry.key),
  coverage: docsMentions(entry.key).length
    ? 'direct-key-mention-semantic-completeness-unreviewed'
    : 'no-direct-key-mention-gap-for-p06',
  provenance:
    'packages/cli/src/commands/config/index.ts:373 (PJM generated catalog), :414 (CONFIG_CATALOG), :4002 (read-only runDescribe); schemas/loaders packages/cli/src/config/oat-config.ts and sync-config.ts',
}));
const { DEFAULT_SYNC_CONFIG } = await import(
  pathToFileURL(resolve(repo, 'packages/cli/src/config/sync-config.ts')).href
);
const configSource = source('packages/cli/src/config/oat-config.ts');
const declaredDefaults = [
  'DEFAULT_OAT_CONFIG',
  'DEFAULT_OAT_LOCAL_CONFIG',
  'DEFAULT_USER_CONFIG',
].map((name) => {
  const declaration = new RegExp(`const ${name}:[^=]+=[^;]+;`).exec(
    configSource,
  );
  if (!declaration)
    throw new Error(`Missing source default declaration ${name}`);
  return {
    name,
    sourceRef: `packages/cli/src/config/oat-config.ts:${configSource.slice(0, declaration.index).split('\n').length}`,
    expression: declaration[0],
    boundary:
      'Missing-file base object only; not an inference of every effective consumer fallback.',
  };
});
const requireRepo = createRequire(resolve(repo, 'package.json'));
const ts = requireRepo('typescript');
const parsedConfig = ts.getParsedCommandLineOfConfigFile(
  resolve(repo, 'packages/cli/tsconfig.json'),
  {},
  { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
);
const typeProgram = ts.createProgram({
  rootNames: [
    resolve(repo, 'packages/cli/src/config/oat-config.ts'),
    resolve(repo, 'packages/cli/src/config/sync-config.ts'),
  ],
  options: parsedConfig.options,
});
const checker = typeProgram.getTypeChecker();
const schemaFields = [];
function captureFields(type, prefix, ancestors = []) {
  if (ancestors.length > 12)
    throw new Error(`Unexpected recursive configuration type ${prefix}`);
  if (type.isUnion()) {
    const objects = type.types.filter(
      (variant) =>
        variant.flags & ts.TypeFlags.Object || variant.isIntersection(),
    );
    if (objects.length) {
      objects.forEach((variant) =>
        captureFields(variant, prefix, [...ancestors, type]),
      );
      return;
    }
  }
  if (checker.isArrayType(type) || checker.isTupleType(type)) return;
  const properties = checker
    .getPropertiesOfType(type)
    .filter((property) => !property.name.startsWith('__'));
  for (const property of properties) {
    const declaration =
      property.valueDeclaration ??
      property.declarations?.[0] ??
      type.aliasSymbol?.declarations?.[0] ??
      type.symbol?.declarations?.[0] ??
      typeProgram.getSourceFile(
        resolve(repo, 'packages/cli/src/config/oat-config.ts'),
      );
    if (!declaration) continue;
    const child = checker.getTypeOfSymbolAtLocation(property, declaration);
    const path = `${prefix}.${property.name}`;
    const file = declaration.getSourceFile();
    const sourceRef = `${posix.relative(repo, file.fileName)}:${file.getLineAndCharacterOfPosition(declaration.getStart()).line + 1}`;
    if (!sourceRef.startsWith('packages/cli/src/')) continue;
    schemaFields.push({
      path,
      type: checker.typeToString(
        child,
        declaration,
        ts.TypeFormatFlags.NoTruncation,
      ),
      optional: Boolean(property.flags & ts.SymbolFlags.Optional),
      sourceRef,
      catalogMatch: configEntries
        .filter(
          (entry) =>
            entry.key === path.replace(/^(shared|local|user|sync)\./, ''),
        )
        .map((entry) => ({
          key: entry.key,
          scope: entry.scope,
          defaultValue: entry.defaultValue,
        })),
      fallback:
        'Catalog defaults apply only to matching catalog keys/scopes; otherwise no runtime fallback inferred from the declaration. Check loader/consumer at p06.',
    });
    if (!ancestors.includes(child))
      captureFields(child, path, [...ancestors, type]);
  }
  for (const signature of checker.getIndexInfosOfType(type)) {
    schemaFields.push({
      path: `${prefix}.*`,
      type: checker.typeToString(signature.type),
      dynamic: true,
      sourceRef:
        'Index signature in the enclosing supported config type; wildcard is not an enumeration of persisted user keys.',
    });
    if (!ancestors.includes(signature.type))
      captureFields(signature.type, `${prefix}.*`, [...ancestors, type]);
  }
}
for (const [filename, typeName, scope] of [
  ['oat-config.ts', 'OatConfig', 'shared'],
  ['oat-config.ts', 'OatLocalConfig', 'local'],
  ['oat-config.ts', 'UserConfig', 'user'],
  ['sync-config.ts', 'SyncConfig', 'sync'],
]) {
  const file = typeProgram.getSourceFile(
    resolve(repo, 'packages/cli/src/config', filename),
  );
  const declaration = file.statements.find(
    (statement) => statement.name?.text === typeName,
  );
  captureFields(checker.getTypeAtLocation(declaration), scope);
}
const { PACK_MANIFEST } = await import(
  pathToFileURL(
    resolve(repo, 'packages/cli/src/commands/tools/shared/pack-manifest.ts'),
  ).href
);
const skills = [];
for (const path of tracked.filter((trackedPath) =>
  /^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(trackedPath),
)) {
  const name = path.split('/')[2];
  const metadata = frontmatter(source(path));
  const packs = PACK_MANIFEST.filter((pack) =>
    pack.assets.some(
      (asset) => asset.kind === 'skill' && asset.id === `skill:${name}`,
    ),
  ).map((pack) => ({
    name: pack.name,
    scopes: pack.assets.find(
      (asset) => asset.kind === 'skill' && asset.id === `skill:${name}`,
    ).scopes,
  }));
  const userInvocable = /^user-invocable:\s*false\s*$/m.test(metadata)
    ? false
    : /^user-invocable:\s*true\s*$/m.test(metadata)
      ? true
      : 'not-declared';
  const retired =
    /^(?:retired|deprecated):\s*true\s*$/m.test(metadata) ||
    /\bretired\b/i.test(metadata.match(/^description:\s*(.*)$/m)?.[1] ?? '');
  const eligible = packs.length > 0 && userInvocable !== false && !retired;
  skills.push({
    name,
    source: path,
    sourceHash: hash(source(path)),
    packs,
    userInvocable,
    retired,
    eligible,
    exclusion: eligible
      ? null
      : retired
        ? 'explicitly-retired'
        : /distribution:\s*repository-only/.test(metadata)
          ? 'explicitly-repository-only-unshipped'
          : !packs.length
            ? 'currently-unshipped-distribution-intent-unresolved'
            : 'explicitly-not-user-invocable',
    docRefs: docsMentions(name),
    prerequisiteReview: 'not-performed-here-p04-independent-audit',
  });
}
const changes = git(
  'diff',
  '--name-status',
  initial,
  baseline,
  '--',
  docsPrefix,
)
  .trim()
  .split('\n');
const capability = {
  schemaVersion: 1,
  baseline,
  initialImplementationBase: initial,
  acceptedBookkeepingBase: acceptedBase,
  provenance: {
    cli: 'Instantiated createProgram + registerCommands, recursively inspected Commander nodes; never parse/run actions or invoke operational commands.',
    config:
      'NO_UPDATE_NOTIFIER=1 TSX_TSCONFIG_PATH=packages/cli/tsconfig.json node --import tsx packages/cli/src/index.ts --json config describe; read-only runDescribe only emits CONFIG_CATALOG.',
    configBoundary:
      'Describe entries are the supported catalog, not all arbitrary persisted or dynamic keys. Dynamic wildcard families remain patterns. TypeScript checker separately walks OatConfig/OatLocalConfig/UserConfig/SyncConfig, preserving declaration/loader provenance and distinguishing structural fields from supported command keys; no unsupported key default is inferred.',
    skills:
      'Actual imported PACK_MANIFEST plus each tracked canonical SKILL.md at exact baseline; no static eligibility count.',
    documentationCoverage:
      'Literal matches are candidate evidence, not proof of useful/complete coverage. Gaps remain explicit for p06.',
  },
  counts: {
    pages: pages.length,
    sections: sections.length,
    assets: assets.length,
    commandNodes: commands.length,
    optionDeclarations: commands.reduce(
      (count, command) => count + command.options.length,
      0,
    ),
    aliases: commands.reduce(
      (count, command) => count + command.aliases.length,
      0,
    ),
    supportedConfigCatalogEntries: configEntries.length,
    schemaFieldPatterns: schemaFields.length,
    canonicalSkillDirectories: skills.length,
    eligibleSkills: skills.filter((skill) => skill.eligible).length,
  },
  phase01DocsChanges: changes,
  commands,
  frameworkHelp,
  configuration: configEntries,
  schemaFields,
  schemaDefaults: {
    declaredDefaults,
    sync: {
      value: DEFAULT_SYNC_CONFIG,
      sourceRef: 'packages/cli/src/config/sync-config.ts:30',
      boundary:
        'Missing-file/normalization defaults; provider-specific runtime resolution is separate.',
    },
  },
  skills,
  openCoverage: {
    commandsWithoutLiteralMention: commands
      .filter((command) => !command.docRefs.length)
      .map((command) => command.command),
    configWithoutLiteralMention: configEntries
      .filter((entry) => !entry.docRefs.length)
      .map((entry) => entry.key),
    eligibleSkillsWithoutLiteralMention: skills
      .filter((skill) => skill.eligible && !skill.docRefs.length)
      .map((skill) => skill.name),
  },
};
await writeFile(
  resolve(evidenceRoot, 'capability-baseline.json'),
  `${JSON.stringify(capability, null, 2)}\n`,
);
process.stdout.write(
  `${JSON.stringify({
    ...capability.counts,
    changedDocsSinceInitial: changes.length,
    links: links.length,
    liveConsumerFiles: externalConsumers.filter(
      (consumer) => consumer.disposition === 'live-consumer-review',
    ).length,
    unresolvedLinks: links.filter((link) => link.targetKind === 'unresolved'),
    newIndexes,
  })}\n`,
);
