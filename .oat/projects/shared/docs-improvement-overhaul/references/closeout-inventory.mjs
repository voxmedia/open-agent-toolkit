import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repo = resolve(evidenceRoot, '../../../../..');
const git = (...arguments_) =>
  execFileSync('git', arguments_, { cwd: repo, encoding: 'utf8' }).trimEnd();
const extractionHead = git('rev-parse', 'HEAD');
const sourceCache = new Map();
const source = (path, head = extractionHead) => {
  const key = `${head}:${path}`;
  if (!sourceCache.has(key))
    sourceCache.set(
      key,
      execFileSync('git', ['show', key], { cwd: repo, encoding: 'utf8' }),
    );
  return sourceCache.get(key);
};
const json = (name) =>
  JSON.parse(readFileSync(resolve(evidenceRoot, name), 'utf8'));
const baseline = json('capability-baseline.json');
const migration = json('route-migration.json');
const conservation = json('p02-t02-conservation.json');
const postMain = json('post-main-content-baseline.json');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const tracked = git('ls-tree', '-r', '--name-only', extractionHead).split('\n');
const sourceDirt = git(
  'status',
  '--porcelain',
  '--',
  'packages/cli/src',
  '.agents/skills',
);
if (sourceDirt)
  throw new Error(`Capability sources have uncommitted changes: ${sourceDirt}`);
const requireCli = createRequire(resolve(repo, 'apps/oat-docs/package.json'));
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
const headingText = (node) =>
  node.value ?? (node.children ?? []).map(headingText).join('');
const docsPrefix = 'apps/oat-docs/docs/';
const pages = tracked
  .filter((path) => path.startsWith(docsPrefix) && path.endsWith('.md'))
  .map((path) => {
    const markdown = source(path);
    const content = markdown.replace(
      /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,
      '',
    );
    const offset = markdown.length - content.length;
    const tree = parser.parse(content);
    const slugger = new Slugger();
    const occurrences = new Map();
    const headings = [
      {
        title: '$preamble',
        depth: 0,
        start: 0,
        line: markdown.slice(0, offset).split('\n').length,
        anchor: null,
      },
      ...tree.children
        .filter((node) => node.type === 'heading')
        .map((node) => ({
          title: headingText(node),
          depth: node.depth,
          start: node.position.start.offset,
          line:
            node.position.start.line +
            markdown.slice(0, offset).split('\n').length -
            1,
          anchor: slugger.slug(headingText(node)),
        })),
    ];
    const page = path.slice(docsPrefix.length);
    const units = headings
      .map((heading, index) => {
        const occurrence = (occurrences.get(heading.title) ?? 0) + 1;
        occurrences.set(heading.title, occurrence);
        const end = headings[index + 1]?.start ?? content.length;
        const subtreeEnd =
          headings.slice(index + 1).find((next) => next.depth <= heading.depth)
            ?.start ?? content.length;
        return {
          ...heading,
          page,
          occurrence,
          key: `${page}::${heading.title}::${occurrence}`,
          text: content.slice(heading.start, end),
          subtree: content.slice(heading.start, subtreeEnd),
          destination: `${page}${heading.anchor ? `#${heading.anchor}` : ''}`,
        };
      })
      .filter((unit) => unit.text.length);
    return { page, markdown, units };
  });
const units = pages.flatMap((page) => page.units);
const claimPayload = (node) =>
  node.type === 'code'
    ? node.value
    : headingText(node).replace(/\s+/g, ' ').trim();
const pageClaims = new Map(
  pages.map((page) => {
    const claims = [];
    const visit = (node, anchor = null) => {
      if (['paragraph', 'code'].includes(node.type))
        claims.push({ text: claimPayload(node), anchor, type: node.type });
      else for (const child of node.children ?? []) visit(child, anchor);
    };
    for (const unit of page.units) visit(parser.parse(unit.text), unit.anchor);
    return [page.page, claims];
  }),
);
const ledgerPaths = [
  'changed-page-facts.md',
  'config-editorial-facts.md',
  ...git(
    'ls-tree',
    '-r',
    '--name-only',
    extractionHead,
    '--',
    `${evidenceRoot.slice(repo.length + 1)}/fable-lanes/editorial`,
  )
    .split('\n')
    .filter(
      (path) => path.endsWith('.changes.md') || path.endsWith('.evidence.md'),
    )
    .map((path) => path.slice(evidenceRoot.length - repo.length)),
];
const ledgerLines = ledgerPaths.flatMap((path) =>
  readFileSync(resolve(evidenceRoot, path), 'utf8')
    .split('\n')
    .map((text, index) => ({ path, line: index + 1, text })),
);
const boundaryPattern = (value) =>
  new RegExp(
    `(?<![\\w.-])${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.-])`,
  );
const evidence = (unit) => ({ destination: unit.destination, line: unit.line });
const findMention = (value, preferred = []) => {
  const matcher = boundaryPattern(value);
  return units
    .filter((unit) => matcher.test(unit.text))
    .sort((first, second) => {
      const rank = (unit) =>
        preferred.includes(unit.page)
          ? preferred.indexOf(unit.page)
          : preferred.length + 1;
      return (
        rank(first) - rank(second) || first.text.length - second.text.length
      );
    })[0];
};
const ownerPages = (command) => {
  if (/^oat (?:init|tools|remove)/.test(command))
    return ['getting-started/tool-packs.md', 'getting-started/bootstrap.md'];
  if (/^oat docs/.test(command)) return ['docs-tooling/commands.md'];
  if (/^oat (?:sync|status|providers)/.test(command))
    return ['provider-sync/commands.md', 'provider-sync/manifest-and-drift.md'];
  if (/^oat gate/.test(command))
    return ['workflows/advanced/workflow-gates.md'];
  if (/^oat pjm remote/.test(command))
    return ['workflows/backlog-and-planning/remote-project-management.md'];
  if (/^oat repo/.test(command))
    return [
      'reference/repository-pr-comments.md',
      'reference/config-and-local-state.md',
    ];
  if (/^oat project/.test(command))
    return [
      'reference/cli-reference.md',
      'workflows/projects/lifecycle.md',
      'reference/project-artifacts.md',
    ];
  return ['reference/config-and-local-state.md', 'reference/cli-reference.md'];
};
const { createProgram } = await import(
  pathToFileURL(resolve(repo, 'packages/cli/src/app/create-program.ts')).href
);
const { registerCommands } = await import(
  pathToFileURL(resolve(repo, 'packages/cli/src/commands/index.ts')).href
);
const program = createProgram();
registerCommands(program);
const commands = [];
const options = [];
function capture(command, parents = []) {
  const names = [...parents, command.name()];
  const spelling = names.join(' ');
  const mention = findMention(spelling, ownerPages(spelling));
  const commandUnit = units
    .filter((unit) => boundaryPattern(spelling).test(unit.title))
    .sort((first, second) => first.subtree.length - second.subtree.length)[0];
  commands.push({
    command: spelling,
    actionable: Boolean(command._actionHandler),
    hasChildren: command.commands.length > 0,
    aliases: command.aliases(),
    hidden: Boolean(command._hidden),
    description: command.description(),
    arguments: command.registeredArguments.map((argument) => ({
      name: argument.name(),
      required: argument.required,
      variadic: argument.variadic,
      defaultValue: argument.defaultValue ?? null,
    })),
    documentation: mention
      ? {
          ...evidence(mention),
          status: 'destination-found-completeness-unreviewed',
        }
      : {
          status: 'documentation-gap',
          reason:
            'No exact command spelling at a committed current docs section.',
        },
  });
  for (const option of command.options) {
    const flag = option.long ?? option.short;
    const headingOwner =
      commandUnit && boundaryPattern(flag).test(commandUnit.subtree)
        ? commandUnit
        : null;
    const localOwner = units
      .filter(
        (unit) =>
          boundaryPattern(spelling).test(unit.text) &&
          boundaryPattern(flag).test(unit.text),
      )
      .sort(
        (first, second) =>
          Number(ownerPages(spelling).includes(second.page)) -
            Number(ownerPages(spelling).includes(first.page)) ||
          first.text.length - second.text.length,
      )[0];
    const owner = headingOwner ?? localOwner;
    options.push({
      command: spelling,
      flags: option.flags,
      attribute: option.attributeName(),
      description: option.description,
      required: option.required,
      optional: option.optional,
      mandatory: option.mandatory,
      negate: option.negate,
      defaultValue: option.defaultValue ?? null,
      choices: option.argChoices ?? null,
      documentation: owner
        ? {
            ...evidence(owner),
            status: 'command-scoped-candidate-semantics-unreviewed',
          }
        : {
            status: 'documentation-gap',
            reason:
              'No command-scoped flag occurrence found; unrelated/global flag-name matches do not count.',
          },
    });
  }
  command.commands.forEach((child) => capture(child, names));
}
capture(program);
for (const entry of options.filter(
  (option) => option.documentation.status === 'documentation-gap',
)) {
  const family = /^oat (?:init tools|tools install) /.test(entry.command)
    ? entry.command.split(' ').slice(0, 3).join(' ')
    : null;
  const common =
    family &&
    options.find(
      (option) =>
        option.command === family &&
        option.flags === entry.flags &&
        option.attribute === entry.attribute &&
        option.negate === entry.negate &&
        JSON.stringify(option.defaultValue) ===
          JSON.stringify(entry.defaultValue) &&
        option.documentation.destination,
    );
  if (common)
    entry.documentation = {
      ...common.documentation,
      status: 'shared-pack-family-flag-contract',
      declaredAt: entry.command,
      commonContract: family,
      note: 'Same explicit flags, attribute, negation and default; per-pack eligibility/scope exceptions remain documented separately.',
    };
}
const configResult = JSON.parse(
  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      'packages/cli/src/index.ts',
      '--json',
      'config',
      'describe',
    ],
    {
      cwd: repo,
      encoding: 'utf8',
      env: {
        ...process.env,
        NO_UPDATE_NOTIFIER: '1',
        TSX_TSCONFIG_PATH: 'packages/cli/tsconfig.json',
      },
    },
  ),
);
if (configResult.status !== 'ok')
  throw new Error('Read-only config describe failed');
const configuration = configResult.entries.map((entry) => {
  const mention = findMention(entry.key, [
    'reference/configuration.md',
    'provider-sync/config.md',
    'workflows/backlog-and-planning/remote-project-management.md',
  ]);
  return {
    ...entry,
    documentation: mention
      ? {
          ...evidence(mention),
          status: 'exact-key-destination-found-completeness-unreviewed',
        }
      : {
          status: 'documentation-gap',
          reason:
            'No exact scoped catalog key/pattern in current docs; family-level prose is not full per-key coverage.',
        },
  };
});
const { PACK_MANIFEST } = await import(
  pathToFileURL(
    resolve(repo, 'packages/cli/src/commands/tools/shared/pack-manifest.ts'),
  ).href
);
const mapping = JSON.parse(source('apps/oat-docs/skill-docs.json'));
const skills = tracked
  .filter((path) => /^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(path))
  .map((path) => {
    const name = path.split('/')[2];
    const markdown = source(path);
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown)?.[1] ?? '';
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
    const userInvocable = /^user-invocable:\s*false\s*$/m.test(frontmatter)
      ? false
      : /^user-invocable:\s*true\s*$/m.test(frontmatter)
        ? true
        : 'not-declared';
    const retired =
      /^(?:retired|deprecated):\s*true\s*$/m.test(frontmatter) ||
      /\bretired\b/i.test(
        frontmatter.match(/^description:\s*(.*)$/m)?.[1] ?? '',
      );
    const eligible = packs.length > 0 && userInvocable !== false && !retired;
    const guide = mapping.skills.find((row) => row.name === name);
    const unit =
      guide &&
      units.find(
        (row) => row.page === guide.page && row.anchor === guide.anchor,
      );
    const requiredFields = [
      'Invocation',
      'Prerequisites',
      'Example scenario',
      'Expected output',
      'Next step',
    ];
    const missingFields = unit
      ? requiredFields.filter(
          (field) => !unit.subtree.toLowerCase().includes(field.toLowerCase()),
        )
      : requiredFields;
    return {
      name,
      packs,
      userInvocable,
      retired,
      eligible,
      sourceHash: hash(markdown),
      documentation: !eligible
        ? {
            status: 'excluded-from-eligible-catalog',
            reason:
              baseline.skills.find((row) => row.name === name)?.exclusion ??
              'current eligibility predicate excludes',
          }
        : unit && !missingFields.length
          ? {
              ...evidence(unit),
              status: 'canonical-anchor-and-guide-fields-verified',
              sourceVerification:
                'Existing fable-lanes/verification/skill-guides-family-A..E.verify.md; no repeated family audit.',
            }
          : {
              status: 'documentation-gap',
              reason: `Missing canonical guide or guide fields: ${missingFields.join(', ')}`,
              candidate: guide ? `${guide.page}#${guide.anchor}` : null,
            },
    };
  });
const strip = (entry, omitted) =>
  Object.fromEntries(
    Object.entries(entry).filter(([key]) => !omitted.includes(key)),
  );
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const compare = (before, after, key, omitted = []) => {
  const prior = new Map(before.map((entry) => [key(entry), entry]));
  const current = new Map(after.map((entry) => [key(entry), entry]));
  return {
    added: [...current.keys()].filter((identifier) => !prior.has(identifier)),
    removed: [...prior.keys()].filter((identifier) => !current.has(identifier)),
    changed: [...current.keys()].filter(
      (identifier) =>
        prior.has(identifier) &&
        JSON.stringify(canonical(strip(prior.get(identifier), omitted))) !==
          JSON.stringify(canonical(strip(current.get(identifier), omitted))),
    ),
  };
};
const optionBaseline = baseline.commands.flatMap((command) =>
  command.options.map((option) => ({ command: command.command, ...option })),
);
const capabilityChanges = {
  commands: compare(baseline.commands, commands, (entry) => entry.command, [
    'actionable',
    'hasChildren',
    'options',
    'inheritedOptions',
    'docRefs',
    'coverage',
    'documentation',
  ]),
  options: compare(
    optionBaseline,
    options,
    (entry) => `${entry.command} ${entry.flags}`,
    ['docRefs', 'documentation'],
  ),
  configuration: compare(
    baseline.configuration,
    configuration,
    (entry) => `${entry.scope}:${entry.key}`,
    ['docRefs', 'coverage', 'provenance', 'documentation'],
  ),
  eligibleSkills: compare(
    baseline.skills.filter((skill) => skill.eligible),
    skills.filter((skill) => skill.eligible),
    (entry) => entry.name,
    [
      'source',
      'sourceHash',
      'docRefs',
      'prerequisiteReview',
      'exclusion',
      'documentation',
    ],
  ),
};
const acceptedSourceSupersessions = [
  {
    option: 'oat docs nav sync --framework <name>',
    source: 'packages/cli/src/commands/docs/nav/sync.ts',
    commit: 'fa1af130a',
    replacement:
      'Framework is detected from marker/config files; current --target-dir and --check are documented at docs-tooling/commands.md.',
  },
  {
    option: 'oat docs nav sync --validate-only',
    source: 'packages/cli/src/commands/docs/nav/sync.ts',
    commit: 'fa1af130a',
    replacement:
      'Current --check compares generated navigation without writing; framework-specific behavior replaced the old validate-only command surface.',
  },
  {
    option: 'oat project dispatch record --project <project-path>',
    source: 'packages/cli/src/commands/project/dispatch/index.ts',
    commit: 'fa1af130a',
    replacement:
      'Record is validation-only and writes nothing; --event-file carries the evidence; reference/cli-reference.md documents the current contract.',
  },
];
const sourceIntegrationCommit = git('rev-parse', 'fa1af130a');
for (const entry of acceptedSourceSupersessions) {
  if (
    git(
      'diff',
      '--name-only',
      postMain.baseline,
      extractionHead,
      '--',
      entry.source,
    )
  )
    throw new Error(
      `Source supersession provenance changed after accepted main baseline: ${entry.source}`,
    );
}
if (
  Object.entries(capabilityChanges).some(([surface, delta]) =>
    delta.removed.some(
      (identifier) =>
        surface !== 'options' ||
        !acceptedSourceSupersessions.some(
          (entry) => entry.option === identifier,
        ),
    ),
  )
)
  throw new Error(
    `Unaccounted capability removal requires root direction: ${JSON.stringify(capabilityChanges)}`,
  );
const ast = (text) =>
  JSON.stringify(parser.parse(text), (key, value) =>
    key === 'position' ? undefined : value,
  );
const astNodes = (text) =>
  parser
    .parse(text)
    .children.map((node) =>
      JSON.stringify(node, (key, value) =>
        key === 'position' ? undefined : value,
      ),
    );
const subsequence = (expected, current) => {
  let position = 0;
  for (const node of current) if (expected[position] === node) position++;
  return position === expected.length;
};
const postMainUnits = postMain.sections.map((row) => {
  const renamedOwners = {
    'getting-started/concepts.md::Capability Stack::1':
      'getting-started/concepts.md#choose-what-to-adopt',
    'getting-started/quickstart.md::Prerequisites::1':
      'getting-started/quickstart.md#what-you-need',
    'getting-started/quickstart.md::Choose a Path::1':
      'getting-started/quickstart.md#then-choose-what-to-add',
    'getting-started/quickstart.md::Agentic Workflows::1':
      'getting-started/quickstart.md#workflows',
    'getting-started/quickstart.md::CLI Utilities::1':
      'getting-started/quickstart.md#docs-tooling',
    'index.md::Home::1': 'index.md#oat-documentation',
    'index.md::Source-of-truth hierarchy::1':
      'contributing/index.md#source-of-truth-hierarchy',
    'index.md::Where To Go Next::1': 'index.md#start-here',
    'index.md::Canonical Sections::1': 'index.md#contents',
    'workflows/choose-workflow.md::Contents::1':
      'workflows/choose-workflow.md#where-to-go-from-here',
    'workflows/projects/lifecycle.md::Quick lane diagram::1':
      'workflows/projects/lifecycle.md#quick-lane',
    'workflows/projects/lifecycle.md::Lite lane diagram::1':
      'workflows/projects/lifecycle.md#lite-lane',
    'workflows/projects/lifecycle.md::Import lane diagram::1':
      'workflows/projects/lifecycle.md#import-lane',
    'workflows/projects/reviews/review-flavors.md::Independence and fail-closed semantics::1':
      'workflows/projects/reviews/review-flavors.md#independence-what-blocks-and-what-falls-back',
  };
  const originalAnchor = new Slugger().slug(row.heading);
  const current =
    units.find((unit) => unit.key === row.key) ??
    units.find((unit) => unit.destination === renamedOwners[row.key]) ??
    units.find(
      (unit) => unit.page === row.page && unit.anchor === originalAnchor,
    );
  const baselinePage = source(`${docsPrefix}${row.page}`, postMain.baseline);
  const expected = baselinePage.slice(row.startOffset, row.endOffset);
  if (hash(expected) !== row.rawSha256)
    throw new Error(`Post-main ledger offset/hash mismatch ${row.key}`);
  const unchanged = current && hash(current.text) === row.rawSha256;
  const additive = current && !unchanged && current.text.startsWith(expected);
  const sameAst =
    current && !unchanged && !additive && ast(current.text) === ast(expected);
  const preservedNodes =
    current &&
    !unchanged &&
    !additive &&
    !sameAst &&
    subsequence(astNodes(expected), astNodes(current.text));
  const changed = !unchanged && !additive && !sameAst && !preservedNodes;
  const claims = [];
  const visitClaims = (node) => {
    if (['paragraph', 'code'].includes(node.type)) {
      const text = claimPayload(node);
      const keepers = [...pageClaims]
        .filter(
          ([page]) =>
            page === row.page ||
            (row.heading === 'Source-of-truth hierarchy' &&
              page === 'contributing/index.md'),
        )
        .flatMap(([page, entries]) =>
          entries
            .filter((entry) => entry.text === text)
            .map((entry) => `${page}${entry.anchor ? `#${entry.anchor}` : ''}`),
        );
      let status = keepers.length
        ? 'exact-text-or-code-payload-retained'
        : 'rewritten-payload-needs-ledger-or-root-check';
      const parenthetical = {
        'workflows/backlog-and-planning/backlog-lifecycle.md::Backlog Lifecycle::1':
          " (project management: OAT's file-backed backlog, roadmap, and decision records)",
        'workflows/backlog-and-planning/backlog-lifecycle.md::Closing out an item::1':
          ' (standard OAT format)',
      }[row.key];
      const glossaryOwner =
        parenthetical &&
        (pageClaims.get(row.page) ?? []).find(
          (entry) => entry.text.replace(parenthetical, '') === text,
        );
      const prefixOwner =
        row.key === 'docs-tooling/workflows.md::Skills::1' &&
        (pageClaims.get(row.page) ?? []).find((entry) =>
          entry.text.startsWith(`${text} (`),
        );
      const clarifiedOwner = glossaryOwner ?? prefixOwner;
      if (!keepers.length && clarifiedOwner) {
        keepers.push(`${row.page}#${clarifiedOwner.anchor}`);
        status = 'exact-existing-payload-plus-named-glossary-addition';
      }
      const words = (value) =>
        new Set(value.toLowerCase().match(/[\w.-]+/g) ?? []);
      const expectedWords = words(text);
      const currentClaims = [];
      const visitCurrent = (currentNode) => {
        if (['paragraph', 'code'].includes(currentNode.type))
          currentClaims.push({
            text: claimPayload(currentNode),
            type: currentNode.type,
            anchor: current.anchor,
          });
        else
          for (const child of currentNode.children ?? []) visitCurrent(child);
      };
      if (current) visitCurrent(parser.parse(current.subtree));
      const candidates = currentClaims
        .filter((entry) => entry.type === node.type)
        .map((entry) => ({
          ...entry,
          page: current.page,
          score:
            [...words(entry.text)].filter((word) => expectedWords.has(word))
              .length / Math.max(expectedWords.size, words(entry.text).size, 1),
        }))
        .sort((first, second) => second.score - first.score);
      const candidate = candidates[0];
      claims.push({
        type: node.type,
        text,
        keepers,
        status,
        ...(keepers.length || !candidate
          ? {}
          : {
              currentCandidate: `${candidate.page}${candidate.anchor ? `#${candidate.anchor}` : ''}`,
              candidateText: candidate.text,
              candidateSimilarity: candidate.score,
              candidateBoundary:
                'Lexical locator only, not conservation proof; compare the actual factual clause with its ledger and source.',
            }),
      });
    } else for (const child of node.children ?? []) visitClaims(child);
  };
  if (changed) visitClaims(parser.parse(expected));
  const ledgerRefs = changed
    ? ledgerLines
        .filter((entry) => {
          const pagePattern = (page) =>
            new RegExp(
              `(?<![\\w/.-])${page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.-])`,
            );
          return (
            (row.page === 'index.md'
              ? pagePattern(row.page).test(entry.text)
              : entry.text.includes(row.page)) ||
            (row.page.startsWith('workflows/') &&
              entry.text.includes(row.page.replace(/^workflows\//, '')))
          );
        })
        .map(({ path, line }) => `${path}:${line}`)
    : [];
  return {
    key: row.key,
    sourceLine: row.sourceLine,
    destination: current?.destination ?? row.page,
    line: current?.line ?? null,
    status: unchanged
      ? 'exact-post-main-unit-hash'
      : additive
        ? 'exact-post-main-prefix-plus-addition'
        : sameAst
          ? 'exact-post-main-Markdown-AST'
          : preservedNodes
            ? 'exact-post-main-nodes-plus-insertions'
            : claims.every((claim) => claim.keepers.length)
              ? 'text-and-code-payloads-retained-structure-check'
              : ledgerRefs.length
                ? 'existing-ledger-correspondence-semantic-check'
                : 'unresolved-unledgered-semantic-change',
    baselineHash: row.rawSha256,
    currentHash: current ? hash(current.text) : null,
    ...(changed ? { ledgerRefs: [...new Set(ledgerRefs)], claims } : {}),
  };
});
const historicSections = migration.sections.map((row) => ({
  key: row.key,
  destination: row.destinationPage
    ? `${row.destinationPage}${row.destinationAnchor ? `#${row.destinationAnchor}` : ''}`
    : null,
  historicalDisposition: row.disposition,
  p02Receipt:
    row.disposition === 'equal-normalized-hash-required'
      ? (conservation.protectedUnits.find(
          ([index]) => migration.sections[index].key === row.key,
        )?.[1] ?? null)
      : 'explicit-router-accounting',
  currentAnchor: row.destinationPage
    ? units.some(
        (unit) =>
          unit.page === row.destinationPage &&
          (row.destinationAnchor
            ? unit.anchor === row.destinationAnchor
            : unit.title === '$preamble'),
      )
    : null,
  currentSemanticStatus:
    'accepted-migration-receipt-only-follow-through-post-main-and-fact-ledgers',
}));
const tally = (entries) =>
  entries.reduce(
    (counts, entry) => ({
      ...counts,
      [entry.documentation?.status ?? entry.status]:
        (counts[entry.documentation?.status ?? entry.status] ?? 0) + 1,
    }),
    {},
  );
const changedPages = postMain.pages
  .filter((row) => hash(source(`${docsPrefix}${row.path}`)) !== row.sha256)
  .map((row) => ({
    page: row.path,
    beforeHash: row.sha256,
    currentHash: hash(source(`${docsPrefix}${row.path}`)),
    editHistory: git(
      'log',
      '--format=%H %P %s',
      `${postMain.baseline}..${extractionHead}`,
      '--',
      `${docsPrefix}${row.path}`,
    )
      .split('\n')
      .filter(Boolean),
    changedUnits: postMainUnits.filter(
      (unit) =>
        unit.key.startsWith(`${row.path}::`) &&
        /semantic|structure-check/.test(unit.status),
    ).length,
  }));
const frameworkHelp = program.createHelp();
const result = {
  schemaVersion: 1,
  extractionHead,
  historicalBaseline: baseline.baseline,
  postMainBaseline: postMain.baseline,
  provenance: {
    cli: 'Live createProgram()+registerCommands() and Commander API, no parse/actions/help exits.',
    configuration:
      'Read-only source CLI config describe invokes CONFIG_CATALOG emitter; NO_UPDATE_NOTIFIER=1, source tsx tsconfig.',
    skills:
      'Live PACK_MANIFEST plus canonical frontmatter at exact extractionHead; same eligibility predicate as immutable capture.',
    docs: 'Committed Markdown at extractionHead, remark-parse+remark-gfm and github-slugger; no uncommitted docs or rendered-site claim.',
    conservation:
      'Existing 840-unit migration/816 protected-unit receipt plus 859-unit post-main raw hash/prefix comparison. Changed/renamed units unresolved; anchor/name existence is not fact conservation.',
    limitations:
      'Command/flag/key destinations are occurrence-based coverage candidates, not proof of semantics/defaults/side effects/exit completeness. No new operational action, family audit, semantic fact extraction campaign or review disposition.',
  },
  counts: {
    baseline: baseline.counts,
    current: {
      pages: pages.length,
      sections: units.length,
      commandNodes: commands.length,
      optionDeclarations: options.length,
      supportedConfigCatalogEntries: configuration.length,
      canonicalSkillDirectories: skills.length,
      eligibleSkills: skills.filter((skill) => skill.eligible).length,
    },
    coverage: {
      commands: tally(commands),
      options: tally(options),
      configuration: tally(configuration),
      eligibleSkills: tally(skills.filter((skill) => skill.eligible)),
      postMainUnits: tally(postMainUnits),
    },
  },
  capabilityChanges,
  acceptedSourceSupersessions,
  sourceIntegrationCommit,
  commands,
  options,
  configuration,
  skills,
  frameworkHelp: {
    options: frameworkHelp
      .visibleOptions(program)
      .filter((option) => option.long === '--help')
      .map((option) => option.flags),
    implicitCommands: frameworkHelp
      .visibleCommands(program)
      .filter((command) => command.name() === 'help')
      .map((command) => command.name()),
    note: 'Automatic help and implicit help command are separate framework surfaces; ancestor explicit flags counted once at declaring node.',
  },
  conservation: {
    migrationOutcome: conservation.outcome,
    historicSections,
    postMainUnits,
    changedPages,
    addedPages: pages
      .filter((page) => !postMain.pages.some((row) => row.path === page.page))
      .map((page) => page.page),
    removedPages: postMain.pages
      .filter((row) => !pages.some((page) => page.page === row.path))
      .map((row) => row.path),
  },
};
if (
  git('rev-parse', 'HEAD') !== extractionHead &&
  git(
    'diff',
    '--name-only',
    extractionHead,
    'HEAD',
    '--',
    'packages/cli/src',
    '.agents/skills',
    docsPrefix,
    'apps/oat-docs/skill-docs.json',
  )
)
  throw new Error(
    'Relevant sources changed during extraction; discard and rerun at a stable source HEAD',
  );
mkdirSync(resolve(evidenceRoot, 'analysis'), { recursive: true });
writeFileSync(
  resolve(evidenceRoot, 'analysis/closeout-inventory.json'),
  `${JSON.stringify(result)}\n`,
);
const compactDocumentation = (entry) => ({
  destination: entry.documentation.destination ?? null,
  line: entry.documentation.line ?? null,
  disposition: entry.documentation.status,
});
const compact = {
  extractionHead,
  historicalBaseline: result.historicalBaseline,
  postMainBaseline: result.postMainBaseline,
  counts: result.counts,
  capabilityChanges,
  acceptedSourceSupersessions,
  sourceIntegrationCommit,
  commands: commands.map((entry) => ({
    command: entry.command,
    actionable: entry.actionable,
    ...compactDocumentation(entry),
  })),
  options: options.map((entry) => ({
    command: entry.command,
    flags: entry.flags,
    ...compactDocumentation(entry),
    ...(entry.documentation.commonContract
      ? { commonContract: entry.documentation.commonContract }
      : {}),
  })),
  configuration: configuration.map((entry) => ({
    key: entry.key,
    scope: entry.scope,
    ...compactDocumentation(entry),
  })),
  skills: skills.map((entry) => ({
    name: entry.name,
    eligible: entry.eligible,
    ...compactDocumentation(entry),
  })),
  historicalSections: historicSections.map((entry) => ({
    key: entry.key,
    destination: entry.destination,
    migrationDisposition: entry.historicalDisposition,
    currentAnchor: entry.currentAnchor,
  })),
  postMainSections: postMainUnits.map((entry) => ({
    key: entry.key,
    destination: entry.destination,
    line: entry.line,
    disposition: entry.status,
    ...(entry.claims
      ? {
          claims: entry.claims.length,
          exactPayloads: entry.claims.filter((claim) => claim.keepers.length)
            .length,
          ledgerRefs: entry.ledgerRefs,
        }
      : {}),
  })),
  rewrittenPayloads: postMainUnits.flatMap((entry) =>
    (entry.claims ?? [])
      .filter((claim) => !claim.keepers.length)
      .map((claim, index) => ({
        key: `${entry.key}::payload-${index + 1}`,
        baselineClause: claim.text.slice(0, 220),
        currentDestination: claim.currentCandidate ?? entry.destination,
        currentClause: claim.candidateText?.slice(0, 220) ?? null,
        disposition:
          'existing-ledger-correspondence-not-automated-semantic-proof',
        ledgerRefs: entry.ledgerRefs,
        sourceLine: entry.sourceLine,
        currentLine: entry.line,
      })),
  ),
  addedPages: result.conservation.addedPages,
  removedPages: result.conservation.removedPages,
};
writeFileSync(
  resolve(evidenceRoot, 'current-coverage-accounting.json'),
  `${JSON.stringify(compact)}\n`,
);
process.stdout.write(
  `${JSON.stringify({ extractionHead, counts: result.counts.current, coverage: result.counts.coverage, capabilityChanges, changedPages: changedPages.length })}\n`,
);
