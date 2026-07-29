import assert from 'node:assert/strict';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';

import { validateContract } from '../scripts/lib/contracts.mjs';
import { runExplainer } from '../scripts/run.mjs';
import { png } from './fixtures/png.mjs';

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

async function markdownFixture(mode = 'unattended') {
  const result = await fixture(mode);
  result.request.recipe = { id: 'project-explainer', version: '1' };
  return result;
}

// A stub for the headless runtime: a clean probe result keeps render QA silent
// so the rich fixture's warning set is meaningful rather than runtime-shaped.
function cleanProbeResult(request = {}) {
  return {
    pageOverflowX: false,
    clippedX: [],
    viewportClipped: [],
    unreadableHeadings: [],
    animationsDisabled: true,
    reducedMotion: true,
    keyboard: {
      tab: true,
      arrows: {
        ArrowLeft: true,
        ArrowRight: true,
        ArrowUp: true,
        ArrowDown: true,
      },
    },
    ...(request.scenario !== 'default' && {
      deckLayout: {
        flow: 'vertical',
        overflowX: request.scenario === 'print' ? 'visible' : 'auto',
      },
    }),
  };
}

function cleanProbe() {
  const requests = [];
  const probe = async (request) => {
    requests.push(request);
    if (request.screenshotPath) {
      await mkdir(dirname(request.screenshotPath), { recursive: true });
      await writeFile(
        request.screenshotPath,
        png(request.viewport.width, request.viewport.height),
      );
    }
    return cleanProbeResult(request);
  };
  probe.requests = requests;
  return probe;
}

async function passingVisualCritic(request) {
  return {
    schemaVersion: 'explainer-kit.visual-review-result/v1',
    reviewId: 'e2e-recap-visual-review',
    requestId: request.requestId,
    requestHash: request.requestHash,
    reviewedAt: NOW,
    disposition: 'pass',
    artifactIds: request.renderedArtifacts.map(({ artifactId }) => artifactId),
    findings: [],
  };
}

// Seeds one finding per mapped browser code so the manifest vocabulary can be
// asserted exactly rather than by substring.
function defectiveProbe() {
  return async (request) => ({
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
    ...(request.scenario !== 'default' && {
      deckLayout: {
        flow: 'vertical',
        overflowX: request.scenario === 'print' ? 'visible' : 'auto',
      },
    }),
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

function richHubMarkdown(request) {
  return `# Atlas Index explainer

${request.floor.requiredNarrative
  .map(
    (id) => `## ${id.replaceAll('-', ' ')}

| Question | Answer |
| -------- | ------ |
| What changed | Continuous indexing now resumes from checkpoints |

- The indexing path is validated.

\`\`\`diagram
graph TD
  reader[Change reader] --> worker[Index worker]
\`\`\`
`,
  )
  .join('\n')}`;
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
      '<g id="as-built-architecture" data-node="reader" class="node"><rect x="60" y="60" width="260" height="80" rx="8"></rect><text x="84" y="106">Change reader</text></g>',
      '<g data-node="worker" class="node"><rect x="60" y="220" width="260" height="80" rx="8"></rect><text x="84" y="266">Index worker</text></g>',
      '<path class="edge" d="M 190 140 L 190 220"></path>',
    ].join(''),
    legend: '<span>Change reader</span><span>Index worker</span>',
  });
}

function hubHtml(request) {
  return request.shell
    .replaceAll('{{THEME_CSS}}', '')
    .replaceAll('{{TITLE}}', 'Atlas Index recap')
    .replaceAll(
      '{{DESCRIPTION}}',
      'Continuous indexing now resumes from retained checkpoints.',
    )
    .replaceAll('{{EYEBROW}}', 'Project recap')
    .replaceAll(
      '{{NAVIGATION}}',
      REQUIRED_NARRATIVE.map(
        (id) => `<a href="#${id}">${id.replaceAll('-', ' ')}</a>`,
      ).join(''),
    )
    .replaceAll(
      '{{CONTENT}}',
      REQUIRED_NARRATIVE.map(
        (id) => `<section id="${id}"><h2>${id.replaceAll('-', ' ')}</h2>
          ${
            id === 'key-agent-decisions'
              ? '<table><thead><tr><th>Decision</th><th>Outcome</th></tr></thead><tbody><tr><td>Checkpoint each partition</td><td>Resume safely</td></tr></tbody></table>'
              : id === 'as-built-architecture'
                ? '<svg class="narrative-diagram" data-direction="TD"><text class="diagram-node-label">Change reader</text></svg>'
                : id === 'implementation-record'
                  ? '<ol class="timeline"><li>Build the retained checkpoint flow.</li></ol>'
                  : id === 'validation-evidence'
                    ? '<aside class="callout callout--important">All retained hashes passed.</aside>'
                    : id === 'outcome'
                      ? '<aside class="callout callout--note">Indexing resumes mid-file.</aside>'
                      : '<ul><li>Make continuous indexing reliable.</li></ul>'
          }
        </section>`,
      ).join(''),
    )
    .replaceAll('{{FOOTER}}', 'Authored from validated evidence.');
}

function deckHtml(request) {
  return request.shell
    .replaceAll('{{THEME_CSS}}', '')
    .replaceAll('{{TITLE}}', 'Atlas Index walkthrough')
    .replaceAll('{{DESCRIPTION}}', 'Request, architecture, and outcome.')
    .replaceAll(
      '{{SLIDES}}',
      '<section class="slide"><div class="slide__content"><h1>Continuous indexing</h1><p>Resume from retained checkpoints.</p></div></section><section id="outcome" class="slide"><div class="slide__content"><h2>Outcome</h2><p>Every partition advances independently.</p></div></section>',
    );
}

// The rich author returns the shipped worked example as the floor draft, so a
// renderer regression against the shipped fixture fails this suite directly.
function richAuthor() {
  const requests = [];
  const author = async (request) => {
    requests.push(request);
    if (request.artifactType === 'hub') {
      return authorResult(
        request,
        request.authoring === 'html'
          ? hubHtml(request)
          : richHubMarkdown(request),
      );
    }
    return authorResult(
      request,
      request.authoring === 'markdown'
        ? deepDiveMarkdown(request.artifactId)
        : request.artifactType === 'deck'
          ? deckHtml(request)
          : request.artifactType === 'diagram'
            ? systemMapHtml(request)
            : hubHtml(request),
    );
  };
  author.requests = requests;
  return author;
}

function adaptivePlanSet(optional = []) {
  return async ({ recipe, factBase }) => {
    const sourceIds = factBase.sources
      .map(({ id }) => id)
      .filter((id) => !id.startsWith('critic:'));
    const profiles = new Map(
      recipe.expansion.profiles.map((profile) => [profile.profileId, profile]),
    );
    return {
      schemaVersion: 'explainer-kit.set-plan/v1',
      planId: 'atlas-index-recap-set',
      recipe: { id: recipe.id, version: recipe.version },
      sourceIds,
      ledger: {
        terminology: [
          { term: 'indexing', meaning: 'Continuous Atlas indexing.' },
        ],
        statuses: [{ subject: 'indexing', value: 'continuous' }],
        numbers: [
          { subject: 'required artifacts', value: 3, unit: 'artifacts' },
        ],
      },
      portfolio: [
        ...recipe.floor.map((artifact) => ({
          artifactId: artifact.id,
          artifactType: artifact.type,
          profileId: 'recipe-floor',
          required: true,
          sourceIds,
          draft: `Compose the planned ${artifact.id}.`,
          visualIntent: `Use ${artifact.type} as the selected medium.`,
        })),
        ...optional.map(({ artifactId, profileId, kind, rationale }) => ({
          artifactId,
          artifactType: profiles.get(profileId)?.type ?? 'explainer',
          profileId,
          required: false,
          sourceIds,
          draft: `Compose the optional ${artifactId}.`,
          visualIntent: 'Add a distinct source-backed perspective.',
          justification: { kind, sourceIds, rationale },
        })),
      ],
    };
  };
}

async function richRun(overrides = {}) {
  const { request } = await fixture(overrides.mode);
  const author = overrides.author ?? richAuthor();
  const probe = cleanProbe();
  const result = await runExplainer(request, {
    author,
    planSet: overrides.planSet ?? adaptivePlanSet(),
    browserProbe: probe,
    now: () => NOW,
    ...(overrides.mode === 'interactive'
      ? {}
      : {
          visualCritic: passingVisualCritic,
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
  assert.ok(occurrences(hub, /<table\b/g) >= 1, 'hub renders a real table');
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
    occurrences(hub, /<table\b|<ul\b|<ol\b|<aside\b|<svg\b/g) >= 6,
    'structured block density holds',
  );
});

test('unattended recap always composes the adaptive hub, architecture, and deck minimum', async () => {
  const { request } = await fixture();
  const author = richAuthor([]);
  const result = await runExplainer(request, {
    author,
    planSet: adaptivePlanSet(),
    browserProbe: cleanProbe(),
    visualCritic: passingVisualCritic,
    now: () => NOW,
  });

  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );
  const manifest = await readJson(result.manifestPath);
  assert.deepEqual(
    manifest.artifacts.map(({ id, type }) => ({ id, type })),
    [
      { id: 'project-recap', type: 'hub' },
      { id: 'architecture', type: 'diagram' },
      { id: 'deck', type: 'deck' },
    ],
  );
  assert.deepEqual(
    author.requests.map(({ plannedArtifact }) => plannedArtifact.artifactId),
    ['project-recap', 'architecture', 'deck'],
  );
  assert.equal(
    author.requests.every(({ authoring }) => authoring === 'html'),
    true,
  );
});

for (const [topology, diagram] of [
  [
    'branch',
    `graph TD
source --> accepted
source --> rejected`,
  ],
  [
    'fan-in',
    `graph TD
primary --> merged
secondary --> merged`,
  ],
  [
    'cycle',
    `graph LR
queued --> running
running --> queued`,
  ],
]) {
  for (const mutation of ['drop', 'add', 'duplicate', 'rewire']) {
    test(`rejects artistic ${topology} output that ${mutation}s planner-owned graph semantics before visual review`, async () => {
      const { request } = await fixture();
      const critic = async (visualRequest) => {
        critic.calls += 1;
        return passingVisualCritic(visualRequest);
      };
      critic.calls = 0;
      const baseAuthor = richAuthor();
      const author = async (authorRequest) => {
        if (authorRequest.artifactId !== 'architecture') {
          return baseAuthor(authorRequest);
        }
        const graph = authorRequest.graphSemantics[0];
        const nodes = graph.nodes.map(({ id }) => id);
        const edges = graph.edges.map(({ from, to }) => [from, to]);
        if (mutation === 'drop') edges.pop();
        if (mutation === 'add') nodes.push('shadow');
        if (mutation === 'duplicate') nodes.push(nodes[0]);
        if (mutation === 'rewire') edges[0] = [edges[0][1], edges[0][0]];
        const html = artisticHtml(authorRequest, {
          title: `${topology} architecture`,
          description: 'A planner-owned graph.',
          nodes: `<svg data-direction="${graph.direction}">${nodes
            .map((id) => `<g data-node="${id}"></g>`)
            .join('')}${edges
            .map(([from, to]) => `<g data-from="${from}" data-to="${to}"></g>`)
            .join('')}</svg>`,
          legend: '<span>Planner-owned graph</span>',
        });
        return authorResult(authorRequest, html);
      };
      const planSet = adaptivePlanSet();
      const result = await runExplainer(request, {
        author,
        planSet: async (plannerRequest) => {
          const plan = await planSet(plannerRequest);
          plan.portfolio.find(({ artifactId }) => artifactId === 'architecture').draft =
            `\`\`\`diagram\n${diagram}\n\`\`\``;
          return plan;
        },
        browserProbe: cleanProbe(),
        visualCritic: critic,
        now: () => NOW,
      });

      assert.equal(result.outcome, 'failed');
      assert.equal(result.errors[0].code, 'E_DIAGRAM_TOPOLOGY');
      assert.equal(critic.calls, 0);
    });
  }
}

test('explicit deterministic fallback composes the same portfolio from Markdown', async () => {
  const { request } = await fixture();
  request.recapMode = 'deterministic-markdown';
  const author = richAuthor();
  const result = await runExplainer(request, {
    author,
    planSet: adaptivePlanSet(),
    browserProbe: cleanProbe(),
    visualCritic: passingVisualCritic,
    now: () => NOW,
  });

  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );
  assert.deepEqual(
    author.requests.map(({ artifactId, authoring }) => [artifactId, authoring]),
    [
      ['project-recap', 'markdown'],
      ['architecture', 'markdown'],
      ['deck', 'markdown'],
    ],
  );
  const manifest = await readJson(result.manifestPath);
  assert.deepEqual(
    manifest.artifacts.map(({ id, contentPath, renderedPath }) => ({
      id,
      contentPath,
      renderedPath,
    })),
    [
      {
        id: 'project-recap',
        contentPath: 'source/content/project-recap.md',
        renderedPath: HUB_PATH,
      },
      {
        id: 'architecture',
        contentPath: 'source/content/architecture.md',
        renderedPath: `site/diagrams/${SLUG}/architecture/index.html`,
      },
      {
        id: 'deck',
        contentPath: 'source/content/deck.md',
        renderedPath: `site/decks/${SLUG}/deck/index.html`,
      },
    ],
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
  assert.equal(
    probe.requests.length,
    15,
    'hub and architecture plus three deck scenarios across three widths',
  );
  assert.equal(
    manifest.artifacts.every(({ status }) => status === 'built'),
    true,
  );
});

test('writes a manifest-derived initiative catalog with absolute artifact and source URLs', async () => {
  const { factBasePath, request } = await fixture();
  request.publicBaseUrl = 'https://cdn.example.com/published/';
  const suppliedFactBase = await readJson(factBasePath);
  Object.assign(suppliedFactBase.sources[0], {
    repository: 'acme/atlas-index',
    revision: '0123456789abcdef0123456789abcdef01234567',
    path: 'docs/atlas index/implementation.md',
    lineRange: { start: 1, end: 104 },
  });
  await writeFile(
    factBasePath,
    `${JSON.stringify(suppliedFactBase, null, 2)}\n`,
  );

  const result = await runExplainer(request, {
    author: richAuthor(),
    planSet: adaptivePlanSet(),
    browserProbe: cleanProbe(),
    visualCritic: passingVisualCritic,
    now: () => NOW,
  });
  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );

  const manifest = await readJson(result.manifestPath);
  const catalog = await readJson(
    join(
      result.runRoot,
      `site/initiatives/${SLUG}/catalog.json`,
    ),
  );
  assert.deepEqual(
    catalog.artifacts.map(({ id, type, hash }) => ({ id, type, hash })),
    manifest.artifacts.map(({ id, type, hash }) => ({ id, type, hash })),
  );
  assert.equal(
    catalog.artifacts.every(
      ({ url }) =>
        new URL(url).origin === 'https://cdn.example.com' &&
        url.startsWith('https://cdn.example.com/published/'),
    ),
    true,
  );
  assert.deepEqual(catalog.sourceBacklinks, manifest.source.backlinks);
  assert.deepEqual(catalog.sourceBacklinks, [
    {
      sourceId: 'atlas-index-project',
      url: 'https://github.com/acme/atlas-index/blob/0123456789abcdef0123456789abcdef01234567/docs/atlas%20index/implementation.md#L1-L104',
    },
  ]);
});

test('source-backed optional artifacts get distinct identities and retained paths', async () => {
  const { result } = await richRun({
    planSet: adaptivePlanSet([
      {
        artifactId: 'checkpoint-deep-dive',
        profileId: 'deep-dive',
        kind: 'source-backed-detail',
        rationale:
          'Checkpoint recovery needs more detail than the hub can carry.',
      },
    ]),
  });
  const manifest = await readJson(result.manifestPath);

  // D1: floor keeps its historical path; expansions nest under their own ID.
  assert.deepEqual(
    manifest.artifacts.map(({ id, renderedPath }) => [id, renderedPath]),
    [
      ['project-recap', HUB_PATH],
      ['architecture', `site/diagrams/${SLUG}/architecture/index.html`],
      ['deck', `site/decks/${SLUG}/deck/index.html`],
      [
        'checkpoint-deep-dive',
        `site/explainers/${SLUG}/checkpoint-deep-dive/index.html`,
      ],
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

  // D8: the approval record is the durable source of truth for the whole set.
  const approval = await readJson(
    join(result.runRoot, 'source/content-approval.json'),
  );
  assert.deepEqual(approval.artifacts, [
    {
      artifactId: 'project-recap',
      origin: 'floor',
      authoring: 'html',
      contentPath: 'source/content/project-recap.html',
      authorResultPath: 'source/author/project-recap.json',
    },
    {
      artifactId: 'architecture',
      origin: 'floor',
      authoring: 'html',
      contentPath: 'source/content/architecture.html',
      authorResultPath: 'source/author/architecture.json',
    },
    {
      artifactId: 'deck',
      origin: 'floor',
      authoring: 'html',
      contentPath: 'source/content/deck.html',
      authorResultPath: 'source/author/deck.json',
    },
    {
      artifactId: 'checkpoint-deep-dive',
      origin: 'expansion',
      profileId: 'deep-dive',
      authoring: 'markdown',
      contentPath: 'source/content/checkpoint-deep-dive.md',
      authorResultPath: 'source/author/checkpoint-deep-dive.json',
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
    `site/diagrams/${SLUG}/architecture/index.html`,
    `site/decks/${SLUG}/deck/index.html`,
  ]) {
    await access(join(result.runRoot, path));
  }
  const approval = await readJson(
    join(result.runRoot, 'source/content-approval.json'),
  );
  assert.equal(approval.status, 'pending');
  assert.equal(approval.artifacts.length, 3);
});

test('an unknown expansion profile fails the run loudly', async () => {
  const { result } = await richRun({
    planSet: adaptivePlanSet([
      {
        artifactId: 'walkthrough-video',
        profileId: 'motion-graphic',
        kind: 'source-backed-detail',
        rationale: 'An animated walkthrough would explain the flow.',
      },
    ]),
  });

  assert.equal(result.outcome, 'failed');
  assert.equal(result.errors[0].code, 'E_SET_PLAN');
  assert.match(result.errors[0].message, /allowed recipe profile/);
  await assert.rejects(
    access(join(result.runRoot, `site/diagrams/${SLUG}/walkthrough-video`)),
  );
});

test('an over-cap planned portfolio fails closed', async () => {
  const { result } = await richRun({
    planSet: adaptivePlanSet(
      Array.from({ length: 4 }, (_, index) => ({
        artifactId: `detail-${index + 1}`,
        profileId: 'deep-dive',
        kind: 'source-backed-detail',
        rationale: `Detail ${index + 1} isolates one source-backed concern.`,
      })),
    ),
  });

  assert.equal(result.outcome, 'failed');
  assert.equal(result.errors[0].code, 'E_SET_PLAN');
  assert.match(result.errors[0].message, /exceeds the deep-dive profile limit/);
});

test('a thin recap ships with the floor warning vocabulary', async () => {
  const { request } = await markdownFixture();
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
  const { request } = await markdownFixture();
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
  const { request } = await markdownFixture();
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
  const { request } = await markdownFixture();
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
  assert.match(
    hub,
    /The whole story fits in one pass with no section headings\./,
  );
});

function renderedSectionIds(html) {
  return [...html.matchAll(/<section id="([^"]+)"/g)].map((match) => match[1]);
}

test('each browser finding emits exactly one stable render-qa id', async () => {
  const { request } = await markdownFixture();
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
    const { request } = await markdownFixture();
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

test('rejects non-linear deterministic fallback diagrams before inline rendering', async () => {
  const { request } = await fixture();
  request.recapMode = 'deterministic-markdown';
  const authoredIds = [];
  const result = await runExplainer(request, {
    author: async (authorRequest) => {
      authoredIds.push(authorRequest.artifactId);
      return authorResult(
        authorRequest,
        authorRequest.artifactId === 'architecture'
          ? `# Architecture

## As built architecture

\`\`\`diagram
graph TD
router --> enrich
router --> audit
\`\`\`
`
          : deepDiveMarkdown(authorRequest.artifactId),
      );
    },
    planSet: adaptivePlanSet(),
    browserProbe: cleanProbe(),
    visualCritic: passingVisualCritic,
    now: () => NOW,
  });

  assert.equal(result.outcome, 'failed');
  assert.equal(result.errors[0].code, 'E_DIAGRAM_TOPOLOGY');
  assert.match(result.errors[0].message, /branch.*artistic/i);
  assert.deepEqual(authoredIds, ['project-recap', 'architecture']);
  await assert.rejects(
    access(
      join(
        result.runRoot,
        `site/diagrams/${SLUG}/architecture/index.html`,
      ),
    ),
    { code: 'ENOENT' },
  );
});

test('preserves branch semantics through the artistic architecture composer', async () => {
  const baseAuthor = richAuthor();
  const author = async (request) =>
    request.artifactId === 'architecture'
      ? authorResult(
          request,
          artisticHtml(request, {
            title: 'Atlas Index branching architecture',
            description: 'The router preserves both downstream branches.',
            nodes: [
              '<g data-node="router" class="node"><rect x="60" y="40" width="240" height="72" rx="8"></rect><text x="84" y="82">Router</text></g>',
              '<g data-node="enrich" class="node"><rect x="20" y="220" width="140" height="72" rx="8"></rect><text x="44" y="262">Enrich</text></g>',
              '<g data-node="audit" class="node"><rect x="200" y="220" width="140" height="72" rx="8"></rect><text x="224" y="262">Audit</text></g>',
              '<path class="edge" data-from="router" data-to="enrich" d="M 140 112 L 90 220"></path>',
              '<path class="edge" data-from="router" data-to="audit" d="M 220 112 L 270 220"></path>',
            ].join(''),
            legend: '<span>Router</span><span>Enrich</span><span>Audit</span>',
          }),
        )
      : baseAuthor(request);
  const { result } = await richRun({ author });

  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );
  const architecture = await readFile(
    join(result.runRoot, `site/diagrams/${SLUG}/architecture/index.html`),
    'utf8',
  );
  for (const node of ['router', 'enrich', 'audit']) {
    assert.match(architecture, new RegExp(`data-node="${node}"`));
  }
  assert.match(
    architecture,
    /data-from="router" data-to="enrich"|data-to="enrich" data-from="router"/,
  );
  assert.match(
    architecture,
    /data-from="router" data-to="audit"|data-to="audit" data-from="router"/,
  );
});

test('a run without an injected probe warns rather than skipping silently', async () => {
  const { request } = await markdownFixture();
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
