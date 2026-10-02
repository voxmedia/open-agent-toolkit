import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';

const root = 'apps/oat-docs/docs/';
const map = JSON.parse(
  readFileSync(
    '.oat/projects/shared/docs-improvement-overhaul/references/route-migration.json',
    'utf8',
  ),
);
assert.equal(
  map.status,
  'reviewed-approved-for-p02-t01; Fable-R1-R2-fulfilled; no-moves-yet',
);
const source = (page) =>
  execFileSync('git', ['show', `${map.baseline}:${root}${page}`], {
    encoding: 'utf8',
  });
const body = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
const relative = (page, target) => {
  const [file, fragment] = target.split('#');
  return `${posix.relative(posix.dirname(page), file)}${fragment ? `#${fragment}` : ''}`;
};
const documents = new Map();
const blocks = new Map();
const add = (destination, text) => {
  if (!blocks.has(destination)) blocks.set(destination, []);
  if (!blocks.get(destination).includes(text))
    blocks.get(destination).push(text);
};
const newRouters = {
  'getting-started/index.md': [
    'Getting Started',
    map.additions[0].description,
    map.additions[0].text,
  ],
  'workflows/index.md': [
    'Workflows',
    'Choose a workflow and find its planning, execution and closeout guides.',
    'Choose a workflow, then follow the guides for projects, ideas, backlog planning, waves or advanced execution.',
  ],
  'workflows/projects/planning/index.md': [
    'Planning',
    'Design modes, lifecycle checkpoints and project splitting.',
    'Use these guides to plan a tracked project and choose its collaboration boundaries.',
  ],
  'workflows/projects/execution/index.md': [
    'Execution',
    'Implementation execution, project observations and continuing shared work.',
    'Use these guides while implementing, recording observations or picking up a tracked project.',
  ],
  'workflows/projects/closeout/index.md': [
    'Closeout',
    'Project retrospectives and progress or final PR flow.',
    'Use these guides to close out tracked work and prepare its PR or retrospective.',
  ],
  'workflows/backlog-and-planning/index.md': [
    'Backlog and planning',
    'Backlog lifecycle and provider-neutral remote project planning.',
    'Use these guides for file-backed backlog lifecycle and remote project-management bindings.',
  ],
  'workflows/waves/index.md': [
    'Waves',
    'Wave-program planning and execution over a corpus of external plans.',
    'Use the wave guide to coordinate a corpus of external plans.',
  ],
  'workflows/advanced/index.md': [
    'Advanced',
    'Dispatch, autonomy, execution surfaces, evidence layers and workflow gates.',
    'Use these guides for advanced workflow execution and its safety boundaries.',
  ],
};
for (const page of map.pages.filter(
  (row) => row.action !== 'router-consolidation',
)) {
  let markdown = source(page.source);
  const content = body(markdown);
  let changed = content;
  for (const link of map.links
    .filter((row) => row.page === page.source && row.targetKind === 'page')
    .sort(
      (first, second) =>
        second.destinationToken.start - first.destinationToken.start,
    )) {
    const span = link.destinationToken;
    assert.equal(changed.slice(span.start, span.end), span.raw);
    changed =
      changed.slice(0, span.start) +
      link.destinationHref +
      changed.slice(span.end);
  }
  const heading = map.headingNormalization.find(
    (row) => row.sourcePage === page.source,
  );
  if (heading)
    changed = changed.replace(
      heading.sourceHeadingText,
      heading.destinationHeadingText,
    );
  markdown = markdown.slice(0, markdown.length - content.length) + changed;
  for (const [field, value] of Object.entries(page.frontmatterChanges))
    markdown = markdown.replace(
      new RegExp(`^${field}:.*$`, 'm'),
      `${field}: ${value}`,
    );
  documents.set(page.destination, markdown);
}
for (const [page, [title, description, introduction]] of Object.entries(
  newRouters,
))
  documents.set(
    page,
    `---\ntitle: ${title}\ndescription: '${description}'\n---\n\n# ${title}\n\n${introduction}\n\n## Contents\n\n`,
  );
for (const row of map.routerAccounting.flatMap(
  (candidate) => candidate.items,
)) {
  if (!row.destination) continue;
  if (row.destinationBodyText) add(row.destination, row.destinationBodyText);
  else
    add(
      row.destination,
      `- [${row.sourceText.match(/^- \[([^\]]+)\]/)[1].replace(/`/g, '') === row.destinationEntryLabel ? row.sourceText.match(/^- \[([^\]]+)\]/)[1] : row.destinationEntryLabel}](${relative(row.destination.split('#')[0], row.destinationEntryTarget)})${row.sourceDescription}`,
    );
}
for (const row of map.guideConsolidation) {
  if (
    row.disposition.startsWith('superseded') ||
    row.disposition.startsWith('obsolete') ||
    row.disposition.startsWith('explicit-exact')
  )
    continue;
  if (row.destinationBodyText) add(row.destination, row.destinationBodyText);
  else {
    let text = row.source;
    if (text.startsWith('- [')) {
      const target = row.destination.startsWith('getting-started/')
        ? 'getting-started/concepts.md'
        : {
            'Provider Sync': 'provider-sync/index.md',
            'Agentic Workflows': 'workflows/index.md',
            'Docs Tooling': 'docs-tooling/index.md',
            Reference: 'reference/index.md',
          }[text.match(/^- \[([^\]]+)\]/)[1]];
      text = text
        .replace(
          /\]\([^)]+\)/,
          `](${relative(row.destination.split('#')[0], target)})`,
        )
        .replace('[Agentic Workflows]', '[Workflows]');
    }
    add(row.destination, text);
  }
}
for (const row of map.cliConsolidation.filter((candidate) =>
  ['paragraph', 'listItem'].includes(candidate.kind),
)) {
  let text = row.sourceText;
  for (const link of [...row.permittedLinkChanges].sort(
    (first, second) =>
      second.destinationToken.start - first.destinationToken.start,
  )) {
    const start = link.destinationToken.start - row.sourceStartOffset;
    const end = link.destinationToken.end - row.sourceStartOffset;
    assert.equal(text.slice(start, end), link.destinationToken.raw);
    text = text.slice(0, start) + link.destinationHref + text.slice(end);
  }
  add(row.destination, text);
}
add(
  'reference/index.md#general-cli-adoption-guidance',
  map.cliMetadataAccounting.find((row) => row.field === 'description')
    .sourceText,
);
for (const addition of map.additions.slice(1)) {
  if (addition.kind === 'prominent-body-discovery') continue;
  add(addition.destination, addition.text);
}
const extraEntries = {
  'index.md#contents': [
    '- [Skills](skills/index.md) - Reusable skill guides and task-oriented discovery.',
  ],
  'workflows/index.md#contents': [
    '- [Choose a Workflow](choose-workflow.md) - Choose a workflow mode and find its entry points.',
    '- [Projects](projects/index.md) - Tracked project lifecycle, planning, execution, reviews and closeout.',
    '- [Ideas Workflow](ideas/index.md) - Idea capture, refinement, and promotion flows.',
    '- [Backlog and planning](backlog-and-planning/index.md) - Backlog lifecycle and remote planning.',
    '- [Waves](waves/index.md) - Coordinate external plans with wave workflows.',
    '- [Advanced](advanced/index.md) - Dispatch, autonomy, worktree and execution boundaries.',
  ],
  'workflows/projects/index.md#contents': [
    '- [Planning](planning/index.md) - Design modes, HiLL checkpoints and project splitting.',
    '- [Execution](execution/index.md) - Implementation execution, project logs and picking up shared projects.',
    '- [Closeout](closeout/index.md) - Retrospectives and PR flow.',
  ],
  'workflows/waves/index.md#contents': [
    '- [Wave Workflows](wave-workflows.md) - Program planning and wave execution.',
  ],
  'skills/index.md#related-guides': [
    '- [Repository PR Comment Analysis](../reference/repository-pr-comments.md) - Repo-wide PR comment collection and triage.',
  ],
};
for (const [destination, rows] of Object.entries(extraEntries))
  for (const row of rows) add(destination, row);
const titles = {
  contents: 'Contents',
  'canonical-sections': 'Canonical Sections',
  'general-cli-adoption-guidance': 'General CLI Adoption Guidance',
  'bootstrap-and-tool-packs': 'Bootstrap and Tool Packs',
  'cli-adoption-guidance': 'CLI Adoption Guidance',
  'related-guides': 'Related Guides',
};
for (const [destination, rows] of blocks) {
  const [page, anchor] = destination.split('#');
  const title = titles[anchor];
  assert.ok(title, destination);
  const heading = `## ${title}`;
  const text = rows.join(
    anchor === 'contents' || anchor === 'related-guides' ? '\n' : '\n\n',
  );
  let document = documents.get(page);
  assert.ok(document, page);
  if (anchor === 'contents' && document.includes(heading)) {
    const start = document.indexOf(`\n${heading}\n`) + 1;
    assert.ok(start > 0, `Missing actual heading ${destination}`);
    const next = document.indexOf('\n## ', start + heading.length);
    const end = next < 0 ? document.length : next + 1;
    document = `${document.slice(0, start)}${heading}\n\n${text}\n${next < 0 ? '' : '\n'}${document.slice(end)}`;
  } else
    document = `${document.replace(/\n*$/, '\n\n')}${heading}\n\n${text}\n`;
  documents.set(page, document);
}
const home = documents.get('index.md');
const homeContents = home.match(/## Contents\n\n[\s\S]*?(?=\n## )/)[0];
const homeRows = homeContents.trimEnd().split('\n').slice(2);
const orderedHome = map.primaryLabels.map((title) =>
  homeRows.find((row) => row.startsWith(`- [${title}]`)),
);
assert.ok(orderedHome.every(Boolean));
documents.set(
  'index.md',
  home.replace(homeContents, `## Contents\n\n${orderedHome.join('\n')}\n`),
);
const projects = documents.get('workflows/projects/index.md');
const projectAddition = map.additions.find(
  (row) => row.kind === 'prominent-body-discovery',
);
documents.set(
  'workflows/projects/index.md',
  projects.replace(
    '## Contents',
    `${projectAddition.h2}\n\n${projectAddition.text}\n\n## Contents`,
  ),
);
let patch = '*** Begin Patch\n';
for (const page of map.pages.filter(
  (row) => row.action !== 'retain' && !documents.has(row.source),
))
  if (existsSync(root + page.source))
    patch += `*** Delete File: ${root}${page.source}\n`;
const scratch = mkdtempSync(join(tmpdir(), 'oat-docs-apply-diff-'));
for (const [page, text] of documents) {
  const existing = existsSync(root + page);
  const original = existing ? readFileSync(root + page, 'utf8') : null;
  if (original === text) continue;
  if (existing) {
    const target = join(scratch, 'desired.md');
    writeFileSync(target, text);
    let delta;
    try {
      execFileSync('diff', ['-u', root + page, target], { encoding: 'utf8' });
    } catch (error) {
      if (error.status !== 1) throw error;
      delta = error.stdout;
    }
    assert.ok(delta);
    patch += `*** Update File: ${root}${page}\n${delta
      .split('\n')
      .slice(2)
      .filter((line) => line !== '\\ No newline at end of file')
      .map((line) => (line.startsWith('@@') ? '@@' : line))
      .join('\n')}`;
    continue;
  }
  const patchText = text.endsWith('\n') ? text.slice(0, -1) : text;
  patch += `*** Add File: ${root}${page}\n${patchText
    .split('\n')
    .map((line) => `+${line}`)
    .join('\n')}\n`;
}
rmSync(scratch, { recursive: true, force: true });
patch += '*** End Patch';
process.stdout.write(patch);
