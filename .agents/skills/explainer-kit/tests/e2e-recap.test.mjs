import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { validateContract } from '../scripts/lib/contracts.mjs';
import { runExplainer } from '../scripts/run.mjs';

const NOW = '2026-03-09T18:00:00Z';
const SLUG = 'atlas-index-recap';
const REQUIRED_NARRATIVE = [
  'original-request',
  'key-agent-decisions',
  'as-built-architecture',
  'implementation-record',
  'validation-evidence',
  'outcome',
];
const HUB_PATH = `site/initiatives/${SLUG}/index.html`;
const skillRoot = new URL('../', import.meta.url);
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

function example(path) {
  return readFile(new URL(`examples/project-recap/${path}`, skillRoot), 'utf8');
}

async function fixture(mode = 'unattended') {
  const cwd = await mkdtemp(join(tmpdir(), 'explainer-e2e-recap-'));
  tempDirs.push(cwd);
  const factBasePath = join(cwd, 'fact-base.json');
  await writeFile(factBasePath, await example('fact-base.json'));
  return {
    cwd,
    factBasePath,
    request: {
      schemaVersion: 'explainer-kit.run-request/v1',
      recipe: { id: 'project-recap', version: '1' },
      slug: SLUG,
      outputRoot: join(cwd, 'output'),
      factBase: {
        mode: 'supplied',
        path: factBasePath,
        freshnessPolicy: 'live-wins',
      },
      theme: {
        style: 'clean-neutral',
        artDirection: 'Private transient direction',
      },
      durability: { strategy: 'none' },
      privacy: { retainRawArtDirection: false },
      mode,
    },
  };
}

// A stub for the headless runtime: a clean probe result keeps render QA silent
// so the rich fixture's warning set is meaningful rather than runtime-shaped.
function cleanProbeResult() {
  return {
    pageOverflowX: false,
    clippedX: [],
    viewportClipped: [],
    unreadableHeadings: [],
    animationsDisabled: true,
    reducedMotion: true,
    keyboard: { tab: true },
  };
}

function cleanProbe() {
  const requests = [];
  const probe = async (request) => {
    requests.push(request);
    return cleanProbeResult();
  };
  probe.requests = requests;
  return probe;
}

// Seeds one finding per mapped browser code so the manifest vocabulary can be
// asserted exactly rather than by substring.
function defectiveProbe() {
  return async () => ({
    pageOverflowX: true,
    clippedX: [{ selector: 'table', clientWidth: 320, scrollWidth: 900 }],
    viewportClipped: [
      { selector: '.narrative-diagram', left: -10, right: 310 },
    ],
    unreadableHeadings: [
      { selector: 'h2', text: 'Original request', fontSize: 9 },
    ],
    animationsDisabled: false,
    reducedMotion: false,
    keyboard: { tab: false },
  });
}

function authorResult(request, content) {
  return {
    schemaVersion: 'explainer-kit.author-result/v2',
    artifactId: request.artifactId,
    content: { [request.authoring]: content },
    provenance: {
      authorId: 'e2e-recap-fixture',
      generatedAt: NOW,
      method: 'test-callback',
    },
  };
}

function deepDiveMarkdown(artifactId) {
  const topic = artifactId.replace(/-deep-dive$/, '').replaceAll('-', ' ');
  return `# Atlas Index ${topic} deep dive

## Why this needed its own page

The hub states the ${topic} decision in a sentence. This page carries the
mechanics an on-call engineer needs when the sentence is not enough.

| Question | Answer |
| -------- | ------ |
| Who owns it | The indexing on-call rotation |
| Where it fails first | The partition with the widest key range |

## What to check first

- Confirm the committed offset advanced in the last interval.
- Compare the worker lag against the batch arrival rate.
`;
}

function artisticHtml(request, { title, description, nodes, legend }) {
  const mode = request.theme.modes[request.theme.defaultMode];
  return request.shell
    .replaceAll('{{THEME_CSS}}', `--accent: ${mode.accent.primary};`)
    .replaceAll('{{TITLE}}', title)
    .replaceAll('{{DESCRIPTION}}', description)
    .replaceAll('{{DIAGRAM}}', nodes)
    .replaceAll('{{LEGEND}}', legend);
}

function systemMapHtml(request) {
  return artisticHtml(request, {
    title: `Atlas Index ${request.artifactId.replaceAll('-', ' ')}`,
    description: 'How the reader, the workers, and the audit relate.',
    nodes: [
      '<g data-node="reader" class="node"><rect x="60" y="60" width="260" height="80" rx="8"></rect><text x="84" y="106">Change reader</text></g>',
      '<g data-node="worker" class="node"><rect x="60" y="220" width="260" height="80" rx="8"></rect><text x="84" y="266">Index worker</text></g>',
      '<path class="edge" d="M 190 140 L 190 220"></path>',
    ].join(''),
    legend: '<span>Change reader</span><span>Index worker</span>',
  });
}

const RICH_PROPOSALS = [
  {
    id: 'checkpoint-deep-dive',
    profileId: 'deep-dive',
    rationale: 'Checkpoint recovery needs more detail than the hub can carry.',
  },
  {
    id: 'audit-deep-dive',
    profileId: 'deep-dive',
    rationale: 'The drift audit has its own operational runbook.',
  },
  {
    id: 'system-map',
    profileId: 'supporting-diagram',
    rationale:
      'The component relationships read better as a standalone visual.',
  },
];

// The rich author returns the shipped worked example as the floor draft, so a
// renderer regression against the shipped fixture fails this suite directly.
function richAuthor(proposals = RICH_PROPOSALS) {
  const requests = [];
  const author = async (request) => {
    requests.push(request);
    if (request.artifactType === 'hub') {
      return {
        ...authorResult(request, await example('content.md')),
        ...(proposals.length > 0 && { proposedArtifacts: proposals }),
      };
    }
    return authorResult(
      request,
      request.authoring === 'markdown'
        ? deepDiveMarkdown(request.artifactId)
        : systemMapHtml(request),
    );
  };
  author.requests = requests;
  return author;
}

async function richRun(overrides = {}) {
  const { request } = await fixture(overrides.mode);
  const author = overrides.author ?? richAuthor();
  const probe = cleanProbe();
  const result = await runExplainer(request, {
    author,
    browserProbe: probe,
    now: () => NOW,
    ...(overrides.mode === 'interactive'
      ? {}
      : {
          reviewedSource: {
            kind: 'lifecycle-artifacts',
            locator: '.oat/projects/shared/atlas-index/implementation.md',
            revision: 'a1b2c3d',
            reviewedAt: NOW,
          },
        }),
  });
  return { author, probe, request, result };
}

function occurrences(html, pattern) {
  return (html.match(pattern) ?? []).length;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('the shipped recap fixture renders structured blocks, not flat paragraphs', async () => {
  const { author, result } = await richRun();
  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );
  assert.equal(result.marking, 'auto-drafted');

  const hub = await readFile(join(result.runRoot, HUB_PATH), 'utf8');
  assert.ok(occurrences(hub, /<table\b/g) >= 2, 'hub renders real tables');
  assert.match(hub, /<th>Decision<\/th>/);
  assert.match(hub, /<td>Checkpoint each partition<\/td>/);
  assert.match(hub, /<svg class="narrative-diagram" data-direction="TD"/);
  assert.match(
    hub,
    /<text class="diagram-node-label"[^>]*>Change reader<\/text>/,
  );
  assert.match(hub, /<ul><li>/);
  assert.match(hub, /<ol class="timeline">/);
  assert.match(hub, /<aside class="callout callout--important"/);
  assert.match(hub, /<aside class="callout callout--note"/);
  for (const id of REQUIRED_NARRATIVE) {
    assert.match(hub, new RegExp(`<section id="${id}"`), id);
    assert.match(hub, new RegExp(`href="#${id}"`), id);
  }

  // D2: the required narrative list reaches the author from the floor entry.
  const floorRequest = author.requests.find(
    ({ artifactType }) => artifactType === 'hub',
  );
  assert.deepEqual(floorRequest.floor.requiredNarrative, REQUIRED_NARRATIVE);
  assert.match(floorRequest.brief, /Audience/i);

  // The original complaint was a flat wall of paragraphs; structured blocks now
  // outnumber the bare ones by a wide margin.
  assert.ok(
    occurrences(hub, /<table\b|<ul\b|<ol\b|<aside\b|<svg\b/g) >= 8,
    'structured block density holds',
  );
});

test('a rich recap ships with an empty warning set', async () => {
  const { probe, request, result } = await richRun();

  assert.deepEqual(result.warnings, []);
  const manifest = await readJson(result.manifestPath);
  const record = await readJson(result.buildRecordPath);
  const theme = await readJson(join(result.runRoot, 'theme.resolved.json'));
  assert.deepEqual(manifest.warnings, []);
  assert.deepEqual(
    validateContract('manifest', manifest, {
      buildRecord: record,
      theme,
      runRequest: request,
    }),
    { valid: true, errors: [] },
  );
  assert.equal(probe.requests.length, 12, 'four artifacts across three widths');
  assert.equal(
    manifest.artifacts.every(({ status }) => status === 'built'),
    true,
  );
});

test('expansion artifacts get distinct identities, paths, and hub links', async () => {
  const { result } = await richRun();
  const manifest = await readJson(result.manifestPath);

  // D1: floor keeps its historical path; expansions nest under their own ID.
  assert.deepEqual(
    manifest.artifacts.map(({ id, renderedPath }) => [id, renderedPath]),
    [
      ['project-recap', HUB_PATH],
      [
        'checkpoint-deep-dive',
        `site/explainers/${SLUG}/checkpoint-deep-dive/index.html`,
      ],
      ['audit-deep-dive', `site/explainers/${SLUG}/audit-deep-dive/index.html`],
      ['system-map', `site/diagrams/${SLUG}/system-map/index.html`],
    ],
  );
  for (const field of ['id', 'renderedPath', 'contentPath', 'hash']) {
    assert.equal(
      new Set(manifest.artifacts.map((artifact) => artifact[field])).size,
      4,
      `${field} is distinct per artifact`,
    );
  }
  for (const artifact of manifest.artifacts) {
    await access(join(result.runRoot, artifact.renderedPath));
    await access(join(result.runRoot, artifact.contentPath));
  }

  const hub = await readFile(join(result.runRoot, HUB_PATH), 'utf8');
  for (const [id, directory] of [
    ['checkpoint-deep-dive', 'explainers'],
    ['audit-deep-dive', 'explainers'],
    ['system-map', 'diagrams'],
  ]) {
    assert.match(
      hub,
      new RegExp(
        `href="\\.\\./\\.\\./${directory}/${SLUG}/${id}/index\\.html"`,
      ),
      id,
    );
  }

  // D8: the approval record is the durable source of truth for the whole set.
  const approval = await readJson(
    join(result.runRoot, 'source/content-approval.json'),
  );
  assert.deepEqual(approval.artifacts, [
    {
      artifactId: 'project-recap',
      origin: 'floor',
      authoring: 'markdown',
      contentPath: 'source/content/project-recap.md',
      authorResultPath: 'source/author/project-recap.json',
    },
    {
      artifactId: 'checkpoint-deep-dive',
      origin: 'expansion',
      profileId: 'deep-dive',
      authoring: 'markdown',
      contentPath: 'source/content/checkpoint-deep-dive.md',
      authorResultPath: 'source/author/checkpoint-deep-dive.json',
    },
    {
      artifactId: 'audit-deep-dive',
      origin: 'expansion',
      profileId: 'deep-dive',
      authoring: 'markdown',
      contentPath: 'source/content/audit-deep-dive.md',
      authorResultPath: 'source/author/audit-deep-dive.json',
    },
    {
      artifactId: 'system-map',
      origin: 'expansion',
      profileId: 'supporting-diagram',
      authoring: 'html',
      contentPath: 'source/content/system-map.html',
      authorResultPath: 'source/author/system-map.json',
    },
  ]);
});

test('the interactive gate pauses on the fully rendered expanded set', async () => {
  const { result } = await richRun({ mode: 'interactive' });

  // D4: render and QA complete before the reviewer is asked, and nothing is
  // published or persisted externally at the pause.
  assert.equal(result.outcome, 'incomplete', JSON.stringify(result.errors));
  assert.equal(result.approval.status, 'pending');
  await assert.rejects(access(result.manifestPath), { code: 'ENOENT' });
  const record = await readJson(result.buildRecordPath);
  for (const id of ['content', 'theme', 'render', 'qa']) {
    assert.ok(
      ['passed', 'warned'].includes(
        record.stages.find((stage) => stage.id === id).status,
      ),
      id,
    );
  }
  for (const path of [
    HUB_PATH,
    `site/explainers/${SLUG}/checkpoint-deep-dive/index.html`,
    `site/explainers/${SLUG}/audit-deep-dive/index.html`,
    `site/diagrams/${SLUG}/system-map/index.html`,
  ]) {
    await access(join(result.runRoot, path));
  }
  const approval = await readJson(
    join(result.runRoot, 'source/content-approval.json'),
  );
  assert.equal(approval.status, 'pending');
  assert.equal(approval.artifacts.length, 4);
});

test('an unknown expansion profile fails the run loudly', async () => {
  const { result } = await richRun({
    author: richAuthor([
      {
        id: 'walkthrough-video',
        profileId: 'motion-graphic',
        rationale: 'An animated walkthrough would explain the flow.',
      },
    ]),
  });

  assert.equal(result.outcome, 'failed');
  assert.equal(result.errors[0].code, 'E_AUTHOR_RESULT');
  assert.match(result.errors[0].message, /Unknown expansion profile/);
  await assert.rejects(
    access(join(result.runRoot, `site/diagrams/${SLUG}/walkthrough-video`)),
  );
});

test('an over-cap proposal warns and trims instead of failing', async () => {
  // D5: supporting-diagram declares maxCount 4, so the fifth is rejected.
  const { result } = await richRun({
    author: richAuthor(
      Array.from({ length: 5 }, (_, index) => ({
        id: `system-map-${index + 1}`,
        profileId: 'supporting-diagram',
        rationale: `View ${index + 1} isolates one architectural concern.`,
      })),
    ),
  });

  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );
  assert.deepEqual(result.warnings, ['expansion-profile-limit-exceeded']);
  const manifest = await readJson(result.manifestPath);
  assert.deepEqual(manifest.warnings, ['expansion-profile-limit-exceeded']);
  assert.deepEqual(
    manifest.artifacts.map(({ id }) => id),
    [
      'project-recap',
      'system-map-1',
      'system-map-2',
      'system-map-3',
      'system-map-4',
    ],
  );
});

test('a thin recap ships with the floor warning vocabulary', async () => {
  const { request } = await fixture();
  const thin = async (authorRequest) =>
    authorResult(
      authorRequest,
      '# Thin recap\n\n## Original request\n\nThe team was asked to make indexing continuous, and it did so.\n',
    );

  const result = await runExplainer(request, {
    author: thin,
    browserProbe: cleanProbe(),
    now: () => NOW,
  });

  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );
  assert.deepEqual(result.warnings.sort(), [
    'guideline-architecture-diagram-missing',
    'guideline-narrative-coverage-missing',
    'guideline-structured-depth-missing',
  ]);
  const manifest = await readJson(result.manifestPath);
  assert.deepEqual(manifest.warnings.sort(), result.warnings.sort());
  assert.equal(manifest.artifacts.length, 1);

  const hub = await readFile(join(result.runRoot, HUB_PATH), 'utf8');
  assert.doesNotMatch(hub, /<table\b/);
  assert.doesNotMatch(hub, /<svg class="narrative-diagram"/);
});

test('prose before the first section heading survives to the rendered hub', async () => {
  const { request } = await fixture();
  const lead =
    'Continuous indexing shipped in three phases, and this page records each one.';
  const result = await runExplainer(request, {
    author: async (authorRequest) =>
      authorResult(
        authorRequest,
        `# Atlas index recap\n\n${lead}\n\n## Original request\n\nThe ask was continuous indexing.\n\n## Outcome\n\nIndexing now resumes mid-file.\n`,
      ),
    browserProbe: cleanProbe(),
    now: () => NOW,
  });

  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );
  const hub = await readFile(join(result.runRoot, HUB_PATH), 'utf8');
  assert.match(hub, new RegExp(lead.replaceAll('.', '\\.')));
  // The lead becomes its own addressable section ahead of the authored ones.
  assert.match(hub, /id="overview"/);
  assert.ok(
    hub.indexOf('id="overview"') < hub.indexOf('id="original-request"'),
    'the lead section precedes the first authored section',
  );

  assert.deepEqual(renderedSectionIds(hub), [
    'overview',
    'original-request',
    'outcome',
  ]);
});

test('a repeated heading keeps both sections with unique anchors', async () => {
  const { request } = await fixture();
  const result = await runExplainer(request, {
    author: async (authorRequest) =>
      authorResult(
        authorRequest,
        '# Atlas index recap\n\n## Outcome\n\nIndexing resumes mid-file.\n\n## Outcome\n\nThe operator runbook changed too.\n\n## Original request\n\nThe ask was continuous indexing.\n',
      ),
    browserProbe: cleanProbe(),
    now: () => NOW,
  });

  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );
  const hub = await readFile(join(result.runRoot, HUB_PATH), 'utf8');
  assert.deepEqual(renderedSectionIds(hub), [
    'outcome',
    'outcome-2',
    'original-request',
  ]);
  assert.equal(occurrences(hub, /id="outcome"/g), 1);
  assert.equal(occurrences(hub, /id="outcome-2"/g), 1);
  assert.match(hub, /The operator runbook changed too\./);
  // Coverage still resolves against the undecorated first occurrence.
  assert.equal(
    result.warnings.includes('guideline-narrative-coverage-missing'),
    true,
  );
});

test('a lead-only document still renders one overview section', async () => {
  const { request } = await fixture();
  const result = await runExplainer(request, {
    author: async (authorRequest) =>
      authorResult(
        authorRequest,
        '# Atlas index recap\n\nThe whole story fits in one pass with no section headings.\n',
      ),
    browserProbe: cleanProbe(),
    now: () => NOW,
  });

  const hub = await readFile(join(result.runRoot, HUB_PATH), 'utf8');
  assert.deepEqual(renderedSectionIds(hub), ['overview']);
  assert.match(hub, /The whole story fits in one pass with no section headings\./);
});

function renderedSectionIds(html) {
  return [...html.matchAll(/<section id="([^"]+)"/g)].map((match) => match[1]);
}

test('each browser finding emits exactly one stable render-qa id', async () => {
  const { request } = await fixture();
  const result = await runExplainer(request, {
    author: richAuthor(),
    browserProbe: defectiveProbe(),
    now: () => NOW,
  });

  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );
  const expected = [
    'render-qa-animations-enabled',
    'render-qa-document-overflow',
    'render-qa-heading-unreadable',
    'render-qa-inner-container-overflow',
    'render-qa-keyboard-navigation',
    'render-qa-reduced-motion',
    'render-qa-viewport-clipping',
  ];
  assert.deepEqual([...result.warnings].sort(), expected);
  const manifest = await readJson(result.manifestPath);
  assert.deepEqual([...manifest.warnings].sort(), expected);
  assert.deepEqual(
    manifest.warnings.filter((warning) => warning.startsWith('qa-')),
    [],
    'no ad hoc qa-* twin survives',
  );
});

test('render degradation warnings reach the result and the manifest', async () => {
  const cases = [
    [
      'render-unsupported-diagram',
      '# Degraded recap\n\n## Original request\n\n```diagram\nsequenceDiagram\n  reader->>worker: change\n```\n',
    ],
    [
      'render-heading-depth-jump',
      '# Degraded recap\n\n## Original request\n\n### Background\n\nThe ask was continuous indexing.\n\n##### Skipped two levels\n\nThis heading jumps from h3 to h5.\n',
    ],
    [
      'render-legacy-raw-html-escaped',
      '# Degraded recap\n\n## Original request\n\n<div class="legacy">Raw markup from a v1-era record.</div>\n',
    ],
  ];

  for (const [warningId, markdown] of cases) {
    const { request } = await fixture();
    const result = await runExplainer(request, {
      author: async (authorRequest) => authorResult(authorRequest, markdown),
      browserProbe: cleanProbe(),
      now: () => NOW,
    });

    assert.equal(
      result.outcome,
      'built-not-durable',
      `${warningId}: ${JSON.stringify(result.errors)}`,
    );
    assert.ok(result.warnings.includes(warningId), `result: ${warningId}`);
    const manifest = await readJson(result.manifestPath);
    assert.ok(manifest.warnings.includes(warningId), `manifest: ${warningId}`);
    const record = await readJson(result.buildRecordPath);
    assert.ok(
      record.stages
        .find((stage) => stage.id === 'render')
        .warnings.includes(warningId),
      `render stage: ${warningId}`,
    );
  }
});

test('a run without an injected probe warns rather than skipping silently', async () => {
  const { request } = await fixture();
  const result = await runExplainer(request, {
    author: richAuthor(),
    now: () => NOW,
  });

  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );
  assert.deepEqual(result.warnings, ['render-qa-skipped-no-probe']);
});
