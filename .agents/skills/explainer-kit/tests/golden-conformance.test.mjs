import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  dirname,
  join,
  normalize,
  posix,
  relative,
  resolve,
  sep,
  win32,
} from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createBrowserProbeSession } from '../scripts/lib/browser-runtime.mjs';
import { decodeBrowserPng } from '../scripts/lib/png.mjs';
import { substituteTemplate } from '../scripts/lib/render.mjs';
import { canonicalGithubBlobBacklink } from '../scripts/lib/source-backlinks.mjs';
import { runExplainer } from '../scripts/run.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const fixtureRoot = fileURLToPath(
  new URL('./fixtures/golden/', import.meta.url),
);
const caseIds = ['simple', 'non-linear', 'explainer-authoring-redesign'];
const benchmarkGeneratedAt = '2026-07-29T16:00:00.000Z';
const benchmarkRevision = '5175cf26ca7d586eac79bbe4f472bc90d75dde9f';
const runtimeArtifactIds = ['project-recap', 'architecture', 'deck'];
const runtimeViewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 320, height: 640 },
};
const minimumArtifacts = [
  { id: 'hub', type: 'visual-hub' },
  { id: 'architecture', type: 'architecture-visual' },
  { id: 'deck', type: 'deck' },
];
const viewportIds = ['desktop', 'tablet', 'mobile'];
const rubricFields = [
  'adaptiveMinimumSet',
  'firstViewport',
  'hierarchy',
  'representationChoice',
  'legibility',
  'cohesion',
  'sourceCoverage',
  'interactions',
  'topologyPreservation',
  'catalogParity',
  'boundedCorrection',
];

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function sha256(path) {
  return `sha256:${createHash('sha256')
    .update(await readFile(path))
    .digest('hex')}`;
}

function fixturePath(caseRoot, relativePath) {
  assert.equal(typeof relativePath, 'string');
  assert.ok(relativePath.length > 0, 'fixture paths must not be empty');
  assert.equal(
    isMachineAbsolutePath(relativePath),
    false,
    `fixture path must be relative: ${relativePath}`,
  );
  assert.equal(
    normalize(relativePath).split(sep).includes('..'),
    false,
    `fixture path must stay inside its case: ${relativePath}`,
  );
  return join(caseRoot, relativePath);
}

function repositoryPath(relativePath) {
  assert.equal(
    isMachineAbsolutePath(relativePath),
    false,
    `repository path must be relative: ${relativePath}`,
  );
  const resolved = resolve(repositoryRoot, relativePath);
  assert.ok(
    relative(repositoryRoot, resolved).split(sep).includes('..') === false,
    `repository path must stay inside the repository: ${relativePath}`,
  );
  return resolved;
}

function isMachineAbsolutePath(value) {
  return (
    posix.isAbsolute(value) ||
    win32.isAbsolute(value) ||
    value.startsWith('file://') ||
    value.startsWith('~/')
  );
}

function assertPortable(value, label) {
  if (typeof value === 'string') {
    assert.equal(
      isMachineAbsolutePath(value),
      false,
      `${label} contains a machine-local absolute path: ${value}`,
    );
    const scheme = value.match(/^([A-Za-z][A-Za-z0-9+.-]*):/)?.[1];
    if (scheme) {
      assert.ok(
        scheme === 'https' || scheme === 'sha256',
        `${label} contains unsupported locator scheme: ${scheme}`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPortable(item, `${label}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      assertPortable(item, `${label}.${key}`);
    }
  }
}

function assertTimestamp(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a timestamp`);
  assert.equal(
    Number.isNaN(Date.parse(value)),
    false,
    `${label} must be an ISO timestamp`,
  );
}

function assertExactIds(actual, expected, label) {
  assert.deepEqual([...actual].sort(), [...expected].sort(), label);
}

function validateRubric(rubric) {
  assert.equal(
    rubric.schemaVersion,
    'explainer-kit.golden-rubric/v1',
    'unknown golden rubric schema',
  );
  assert.deepEqual(
    Object.keys(rubric.checks).sort(),
    [...rubricFields].sort(),
    'golden rubric fields must be complete and exact',
  );
  for (const field of rubricFields) {
    const check = rubric.checks[field];
    assert.equal(check.required, true, `${field} must be required`);
    assert.ok(
      Array.isArray(check.evidence) && check.evidence.length > 0,
      `${field} must declare machine-readable evidence`,
    );
  }
}

function assertTopology(topology, label) {
  assert.ok(Array.isArray(topology.nodes) && topology.nodes.length > 0);
  assert.equal(
    new Set(topology.nodes).size,
    topology.nodes.length,
    `${label} nodes must be unique`,
  );
  const nodes = new Set(topology.nodes);
  assert.ok(Array.isArray(topology.edges) && topology.edges.length > 0);
  for (const edge of topology.edges) {
    assert.equal(edge.length, 2, `${label} edges must have two endpoints`);
    assert.ok(
      nodes.has(edge[0]),
      `${label} has unknown edge source ${edge[0]}`,
    );
    assert.ok(
      nodes.has(edge[1]),
      `${label} has unknown edge target ${edge[1]}`,
    );
  }

  for (const structure of topology.requiredStructures ?? []) {
    const endpoints = [
      ...(Array.isArray(structure.from) ? structure.from : [structure.from]),
      ...(Array.isArray(structure.to) ? structure.to : [structure.to]),
      ...(structure.path ?? []),
    ].filter(Boolean);
    for (const endpoint of endpoints) {
      assert.ok(
        nodes.has(endpoint),
        `${label} structure references unknown node ${endpoint}`,
      );
    }
  }
}

function resolveJsonPointer(document, pointer, label) {
  assert.ok(pointer.startsWith('/'), `${label} must be a JSON pointer`);
  return pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, segment) => {
      assert.notEqual(value, undefined, `${label} does not resolve`);
      assert.ok(
        value !== null && typeof value === 'object' && segment in value,
        `${label} does not resolve`,
      );
      return value[segment];
    }, document);
}

async function resolveEvidencePointer(caseRoot, retainedByPath, pointer) {
  const [path, fragment] = pointer.split('#');
  assert.ok(
    retainedByPath.has(path),
    `rubric evidence path is not retained: ${path}`,
  );
  const document = await readJson(fixturePath(caseRoot, path));
  return resolveJsonPointer(document, fragment, `rubric evidence ${pointer}`);
}

async function validateRetainedFile(caseRoot, retainedFile) {
  const path = fixturePath(caseRoot, retainedFile.path);
  assert.match(retainedFile.sha256, /^sha256:[a-f0-9]{64}$/);
  assert.equal(
    await sha256(path),
    retainedFile.sha256,
    `retained evidence hash mismatch: ${retainedFile.path}`,
  );
}

async function loadGoldenFixture(caseId, mutate = () => {}) {
  const caseRoot = join(fixtureRoot, caseId);
  const descriptor = await readJson(join(caseRoot, 'descriptor.json'));
  assert.equal(descriptor.schemaVersion, 'explainer-kit.golden-fixture/v1');
  assert.equal(descriptor.id, caseId);

  const [input, rubric, reference] = await Promise.all([
    readJson(fixturePath(caseRoot, descriptor.inputPath)),
    readJson(fixturePath(caseRoot, descriptor.rubricPath)),
    readJson(fixturePath(caseRoot, descriptor.referenceEvidencePath)),
  ]);
  mutate({ descriptor, input, rubric, reference });

  assert.equal(descriptor.producer.name, 'personal-explainer-kit');
  assert.ok(descriptor.producer.version, 'producer version is required');
  assertTimestamp(descriptor.producer.generatedAt, 'descriptor producer time');
  assert.ok(
    Array.isArray(descriptor.sourceIds) && descriptor.sourceIds.length > 0,
    'descriptor source IDs are required',
  );
  assert.ok(
    Array.isArray(descriptor.retainedFiles) &&
      descriptor.retainedFiles.length > 0,
    'descriptor retained files are required',
  );
  const retainedByPath = new Map(
    descriptor.retainedFiles.map((file) => [file.path, file]),
  );
  assert.equal(
    retainedByPath.size,
    descriptor.retainedFiles.length,
    'retained evidence paths must be unique',
  );
  await Promise.all(
    descriptor.retainedFiles.map((file) =>
      validateRetainedFile(caseRoot, file),
    ),
  );

  assert.equal(input.schemaVersion, 'explainer-kit.golden-input/v1');
  assert.equal(input.id, caseId);
  assert.ok(input.sources.length > 0, `${caseId} must carry stable sources`);
  assertExactIds(
    input.sources.map((source) => source.id),
    descriptor.sourceIds,
    `${caseId} descriptor source IDs must be exact`,
  );
  const sourceRecords = new Map();
  for (const source of input.sources) {
    assert.ok(
      retainedByPath.has(source.locator),
      `${caseId} source must be retained: ${source.locator}`,
    );
    const sourcePath = fixturePath(caseRoot, source.locator);
    assert.equal(
      await sha256(sourcePath),
      source.sha256,
      `${caseId} source hash mismatch`,
    );
    const sourceRecord = await readJson(sourcePath);
    assert.equal(sourceRecord.id, source.id);
    if (sourceRecord.upstream) {
      const upstreamPath = repositoryPath(sourceRecord.upstream.locator);
      assert.equal(
        await sha256(upstreamPath),
        sourceRecord.upstream.sha256,
        `${caseId} upstream source hash mismatch`,
      );
      const upstreamContents = await readFile(upstreamPath, 'utf8');
      const normalizedUpstreamContents = upstreamContents.replaceAll(
        /\s+/g,
        ' ',
      );
      for (const sourceClaim of sourceRecord.claims) {
        assert.ok(
          normalizedUpstreamContents.includes(
            sourceClaim.text.replaceAll(/\s+/g, ' '),
          ),
          `${caseId} retained claim ${sourceClaim.id} is absent from upstream source`,
        );
      }
    }
    sourceRecords.set(source.id, sourceRecord);
  }
  const sourceIds = new Set(sourceRecords.keys());
  const claimIds = new Set();
  for (const claim of input.claims) {
    assert.equal(claimIds.has(claim.id), false, `duplicate claim ${claim.id}`);
    claimIds.add(claim.id);
    assert.ok(
      sourceIds.has(claim.sourceId),
      `${caseId} claim ${claim.id} has unknown source ${claim.sourceId}`,
    );
    const sourceClaim = sourceRecords
      .get(claim.sourceId)
      .claims.find((candidate) => candidate.id === claim.sourceClaimId);
    assert.ok(sourceClaim, `${caseId} claim ${claim.id} is unsupported`);
    assert.equal(
      claim.text,
      sourceClaim.text,
      `${caseId} claim ${claim.id} is not grounded in retained source`,
    );
  }
  assertTopology(input.topology, `${caseId} input topology`);

  validateRubric(rubric);
  assert.equal(reference.schemaVersion, 'explainer-kit.personal-reference/v1');
  assert.equal(reference.caseId, caseId);
  assert.deepEqual(reference.producer, descriptor.producer);
  assert.equal(reference.pixelIdentityRequired, false);
  assert.deepEqual(
    reference.artifacts
      .map(({ id, type }) => ({ id, type }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    [...minimumArtifacts].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    `${caseId} must retain the exact adaptive minimum`,
  );
  for (const artifact of reference.artifacts) {
    assert.ok(
      retainedByPath.has(artifact.path),
      `${caseId} artifact must be retained: ${artifact.path}`,
    );
    assert.equal(
      await sha256(fixturePath(caseRoot, artifact.path)),
      artifact.sha256,
      `${caseId} artifact hash mismatch: ${artifact.id}`,
    );
    assertExactIds(
      artifact.sourceIds,
      descriptor.sourceIds,
      `${caseId} artifact ${artifact.id} source membership must be exact`,
    );
    assertExactIds(
      artifact.claimIds,
      [...claimIds],
      `${caseId} artifact ${artifact.id} claim membership must be exact`,
    );
    const artifactContents = await readFile(
      fixturePath(caseRoot, artifact.path),
      'utf8',
    );
    const normalizedArtifactContents = artifactContents.replaceAll(/\s+/g, ' ');
    for (const claim of input.claims) {
      assert.ok(
        artifactContents.includes(`data-claim-id="${claim.id}"`),
        `${caseId} artifact ${artifact.id} is missing claim ${claim.id}`,
      );
      assert.ok(
        normalizedArtifactContents.includes(claim.text),
        `${caseId} artifact ${artifact.id} changes claim ${claim.id}`,
      );
    }
    if (artifact.id === 'architecture') {
      for (const node of input.topology.nodes) {
        assert.ok(
          artifactContents.includes(`data-node-id="${node}"`),
          `${caseId} architecture output is missing node ${node}`,
        );
      }
      for (const [from, to] of input.topology.edges) {
        assert.ok(
          artifactContents.includes(`data-edge="${from}->${to}"`),
          `${caseId} architecture output is missing edge ${from}->${to}`,
        );
      }
    }
  }

  assert.ok(
    retainedByPath.has(reference.browserEvidence.path),
    `${caseId} browser evidence must be retained`,
  );
  assert.equal(
    await sha256(fixturePath(caseRoot, reference.browserEvidence.path)),
    reference.browserEvidence.sha256,
    `${caseId} browser evidence hash mismatch`,
  );
  const browserEvidence = await readJson(
    fixturePath(caseRoot, reference.browserEvidence.path),
  );
  assert.equal(
    browserEvidence.schemaVersion,
    'explainer-kit.golden-browser-evidence/v1',
  );
  assert.equal(browserEvidence.caseId, caseId);
  assert.deepEqual(browserEvidence.producer, descriptor.producer);
  assertExactIds(
    browserEvidence.setPlan.portfolio,
    minimumArtifacts.map((artifact) => artifact.id),
    `${caseId} set plan has wrong adaptive minimum membership`,
  );
  assertExactIds(
    browserEvidence.manifest.artifacts,
    minimumArtifacts.map((artifact) => artifact.id),
    `${caseId} manifest has wrong adaptive minimum membership`,
  );
  assertExactIds(
    browserEvidence.catalog.artifacts,
    minimumArtifacts.map((artifact) => artifact.id),
    `${caseId} catalog has wrong adaptive minimum membership`,
  );
  assertExactIds(
    browserEvidence.sourceCoverage.sourceIds,
    descriptor.sourceIds,
    `${caseId} browser evidence source IDs must be exact`,
  );
  assertExactIds(
    browserEvidence.sourceCoverage.claimIds,
    [...claimIds],
    `${caseId} browser evidence claim IDs must be exact`,
  );
  assert.deepEqual(browserEvidence.visualReview.topology, input.topology);
  assert.equal(browserEvidence.reviewHistory.attempts >= 1, true);
  assert.equal(browserEvidence.reviewHistory.corrections <= 1, true);
  assert.equal(browserEvidence.reviewHistory.terminalReview, 'pass');

  assertExactIds(
    Object.keys(browserEvidence.screenshots),
    viewportIds,
    `${caseId} browser viewports must be exact`,
  );
  for (const viewportId of viewportIds) {
    const screenshot = browserEvidence.screenshots[viewportId];
    assert.ok(retainedByPath.has(screenshot.path));
    assert.equal(
      await sha256(fixturePath(caseRoot, screenshot.path)),
      screenshot.sha256,
      `${caseId} ${viewportId} screenshot hash mismatch`,
    );
    assert.ok(screenshot.viewport.width > 0 && screenshot.viewport.height > 0);
    assert.equal(screenshot.browser.engine, 'chromium');
    assert.ok(screenshot.browser.version);
    assertTimestamp(screenshot.capturedAt, `${caseId} ${viewportId} capture`);
  }
  assertExactIds(
    Object.keys(browserEvidence.browserMetrics),
    minimumArtifacts.map((artifact) => artifact.id),
    `${caseId} browser metrics artifact membership must be exact`,
  );
  for (const metrics of Object.values(browserEvidence.browserMetrics)) {
    assert.equal(metrics.overflow, false);
    assert.equal(metrics.readable, true);
    assert.equal(metrics.keyboardReachable, true);
    assert.equal(metrics.brokenLinks, 0);
    assertExactIds(
      metrics.viewportIds,
      viewportIds,
      `${caseId} browser metric viewport membership must be exact`,
    );
  }

  assert.deepEqual(
    Object.keys(reference.rubricEvidence).sort(),
    [...rubricFields].sort(),
    `${caseId} reference evidence must cover the rubric`,
  );
  for (const field of rubricFields) {
    assert.equal(
      reference.rubricEvidence[field].status,
      'reference-met',
      `${caseId} ${field} must have a terminal reference status`,
    );
    assert.ok(
      reference.rubricEvidence[field].observation.length > 0,
      `${caseId} ${field} must have a comparison observation`,
    );
    assert.deepEqual(
      reference.rubricEvidence[field].evidencePointers,
      rubric.checks[field].evidence,
      `${caseId} ${field} pointers must match the rubric`,
    );
    for (const pointer of rubric.checks[field].evidence) {
      assert.notEqual(
        await resolveEvidencePointer(caseRoot, retainedByPath, pointer),
        undefined,
      );
    }
  }

  assertPortable(descriptor, `${caseId} descriptor`);
  assertPortable(input, `${caseId} input`);
  assertPortable(rubric, `${caseId} rubric`);
  assertPortable(reference, `${caseId} reference`);
  assertPortable(browserEvidence, `${caseId} browser evidence`);

  return { browserEvidence, descriptor, input, rubric, reference };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function benchmarkSource(input) {
  const source = input.sources[0];
  const tuple = {
    repository: 'open-agent-toolkit/golden-fixtures',
    revision: benchmarkRevision,
    path: `.agents/skills/explainer-kit/tests/fixtures/golden/${input.id}/${source.locator}`,
    lineRange: { start: 1, end: 200 },
  };
  return {
    ...tuple,
    id: source.id,
    kind: 'file',
    locator: source.locator,
    hash: source.sha256,
    observedAt: benchmarkGeneratedAt,
    url: canonicalGithubBlobBacklink(tuple),
  };
}

function benchmarkFactBase(input) {
  const source = benchmarkSource(input);
  const citation = {
    sourceId: source.id,
    locator: `${source.locator}:1`,
    repository: source.repository,
    revision: source.revision,
    path: source.path,
    lineRange: source.lineRange,
    url: source.url,
  };
  return {
    schemaVersion: 'explainer-kit.fact-base/v1',
    generatedAt: benchmarkGeneratedAt,
    mode: 'supplied',
    freshnessPolicy: 'live-wins',
    sources: [source],
    claims: input.claims.map((claim) => ({
      id: claim.id.toLocaleLowerCase(),
      text: claim.text,
      status: 'confirmed',
      citations: [citation],
    })),
    unresolvedClaims: [],
    overrides: [],
  };
}

function diagramDraft(input) {
  return `\`\`\`diagram
graph TD
${input.topology.edges.map(([from, to]) => `${from} --> ${to}`).join('\n')}
\`\`\``;
}

function benchmarkPlanSet(input) {
  return ({ recipe, factBase }) => {
    const sourceIds = factBase.sources.map(({ id }) => id);
    return {
      schemaVersion: 'explainer-kit.set-plan/v1',
      planId: `${input.id}-golden-set`,
      recipe: { id: recipe.id, version: recipe.version },
      sourceIds,
      ledger: {
        terminology: [
          {
            term: 'golden recap',
            meaning: 'A source-grounded adaptive project recap.',
          },
        ],
        statuses: [{ subject: 'benchmark', value: 'passed' }],
        numbers: [
          { subject: 'required artifacts', value: 3, unit: 'artifacts' },
        ],
      },
      portfolio: recipe.floor.map((artifact) => ({
        artifactId: artifact.id,
        artifactType: artifact.type,
        profileId: 'recipe-floor',
        required: true,
        sourceIds,
        draft:
          artifact.id === 'architecture'
            ? diagramDraft(input)
            : `Explain ${input.title} as the planned ${artifact.id}.`,
        visualIntent:
          artifact.id === 'project-recap'
            ? 'Lead with the outcome and reader questions in the first viewport.'
            : artifact.id === 'architecture'
              ? 'Preserve every planned node and edge in an inspectable system visual.'
              : 'Sequence context, architecture, evidence, and outcome as a concise deck.',
      })),
    };
  };
}

function claimMarkup(input, sourceUrl) {
  return input.claims
    .map(
      (claim) =>
        `<article class="card" data-claim-id="${escapeHtml(claim.id)}" data-source-id="${escapeHtml(claim.sourceId)}"><strong>${escapeHtml(claim.id)}</strong><p>${escapeHtml(claim.text)}</p><a href="${escapeHtml(sourceUrl)}">Pinned source</a></article>`,
    )
    .join('');
}

function cohesionMarkup() {
  return '<p class="callout"><strong>golden recap</strong> benchmark status: <strong>passed</strong>; required portfolio: <strong>3 artifacts</strong>.</p>';
}

function hubHtml(request, input, sourceUrl) {
  const claims = claimMarkup(input, sourceUrl);
  const sections = request.floor.requiredNarrative
    .map((id) => {
      const content =
        id === 'original-request'
          ? `<p>${escapeHtml(input.readerQuestions.join(' · '))}</p><div class="cards">${claims}</div>`
          : id === 'as-built-architecture'
            ? `<p>The architecture view retains ${input.topology.nodes.length} nodes and ${input.topology.edges.length} directed edges without flattening.</p>`
            : id === 'validation-evidence'
              ? `<table><thead><tr><th>Evidence</th><th>Result</th></tr></thead><tbody><tr><td>Real Chromium</td><td>Three canonical viewports</td></tr><tr><td>Independent critic</td><td>Whole-set pass</td></tr></tbody></table>`
              : id === 'outcome'
                ? '<aside class="callout callout--important"><span class="callout__label">Outcome</span><p>The complete adaptive set is ready for archive-safe use.</p></aside>'
                : '<ul><li>One shared plan governs all three artifacts.</li><li>Every claim remains source-linked and reviewable.</li></ul>';
      return `<section id="${id}"><h2>${escapeHtml(id.replaceAll('-', ' '))}</h2>${content}</section>`;
    })
    .join('');
  return substituteTemplate(request.shell, {
    THEME_CSS: '',
    TITLE: escapeHtml(input.title),
    DESCRIPTION:
      'What changed, how the system fits together, and what the retained evidence proves.',
    EYEBROW: 'Golden project recap',
    NAVIGATION: request.floor.requiredNarrative
      .map(
        (id) => `<a href="#${id}">${escapeHtml(id.replaceAll('-', ' '))}</a>`,
      )
      .join(''),
    CONTENT: `${cohesionMarkup()}${sections}`,
    FOOTER: `<a href="${escapeHtml(sourceUrl)}">Review the commit-pinned source evidence.</a>`,
  });
}

function graphForAuthor(request, input) {
  if (request.graphSemantics?.length > 0) return request.graphSemantics[0];
  return {
    direction: 'TD',
    nodes: input.topology.nodes.map((id) => ({
      id,
      label: id,
      shape: 'rectangle',
      explicit: false,
    })),
    edges: input.topology.edges.map(([from, to]) => ({
      from,
      to,
      kind: 'arrow',
      label: '',
    })),
  };
}

function graphMarkup(graph) {
  const columns = Math.min(
    4,
    Math.max(2, Math.ceil(Math.sqrt(graph.nodes.length))),
  );
  const positions = new Map(
    graph.nodes.map((node, index) => [
      node.id,
      {
        x: 80 + (index % columns) * 260,
        y: 80 + Math.floor(index / columns) * 210,
      },
    ]),
  );
  const edges = graph.edges
    .map((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      return `<g data-from="${escapeHtml(edge.from)}" data-to="${escapeHtml(edge.to)}" data-edge-kind="${escapeHtml(edge.kind)}" data-edge-label="${escapeHtml(edge.label)}"><path class="edge" d="M ${from.x + 80} ${from.y + 48} L ${to.x + 80} ${to.y + 48}" stroke-width="3"></path></g>`;
    })
    .join('');
  const nodes = graph.nodes
    .map((node) => {
      const position = positions.get(node.id);
      return `<g data-node="${escapeHtml(node.id)}" data-node-label="${escapeHtml(node.label)}" data-node-shape="${escapeHtml(node.shape)}" data-node-explicit="${String(node.explicit)}"><rect class="node" x="${position.x}" y="${position.y}" width="160" height="96" rx="12"></rect><text x="${position.x + 16}" y="${position.y + 54}">${escapeHtml(node.label)}</text></g>`;
    })
    .join('');
  return `<g id="as-built-architecture"><svg data-direction="${escapeHtml(graph.direction)}">${edges}${nodes}</svg></g>`;
}

function architectureHtml(request, input, sourceUrl) {
  const graph = graphForAuthor(request, input);
  return substituteTemplate(request.shell, {
    THEME_CSS: '',
    TITLE: escapeHtml(`${input.title} — architecture`),
    DESCRIPTION:
      'The planner-owned system topology is retained as an artistic, inspectable graph.',
    DIAGRAM: graphMarkup(graph),
    LEGEND: `${cohesionMarkup()}<div class="cards">${claimMarkup(input, sourceUrl)}</div>`,
  });
}

function deckHtml(request, input, sourceUrl) {
  const slides = [
    `<section class="slide"><div class="slide__content"><h1>${escapeHtml(input.title)}</h1>${cohesionMarkup()}<p>${escapeHtml(input.readerQuestions[0])}</p></div></section>`,
    `<section class="slide"><div class="slide__content"><h2>Evidence-backed change</h2><div class="cards">${claimMarkup(input, sourceUrl)}</div></div></section>`,
    `<section class="slide"><div class="slide__content"><h2>System shape</h2><p>${input.topology.nodes.length} nodes retain ${input.topology.edges.length} directed relationships, including every planned branch, join, or cycle.</p></div></section>`,
    `<section class="slide" id="outcome"><div class="slide__content"><h2>Outcome</h2><p>The golden recap passed real-browser checks and an independent whole-set review.</p><a href="${escapeHtml(sourceUrl)}">Pinned source evidence</a></div></section>`,
  ].join('');
  return substituteTemplate(request.shell, {
    THEME_CSS: '',
    TITLE: escapeHtml(`${input.title} — walkthrough`),
    DESCRIPTION:
      'A progressive recap of the request, system, evidence, and outcome.',
    SLIDES: slides,
  });
}

function benchmarkAuthor(input) {
  const sourceUrl = benchmarkSource(input).url;
  const calls = [];
  const author = async (request) => {
    calls.push(request.artifactId);
    const html =
      request.artifactId === 'project-recap'
        ? hubHtml(request, input, sourceUrl)
        : request.artifactId === 'architecture'
          ? architectureHtml(request, input, sourceUrl)
          : deckHtml(request, input, sourceUrl);
    return {
      schemaVersion: 'explainer-kit.author-result/v2',
      artifactId: request.artifactId,
      content: { html },
      provenance: {
        authorId: 'golden-benchmark-author',
        generatedAt: benchmarkGeneratedAt,
        method: 'fixture-provider',
      },
    };
  };
  author.calls = calls;
  return author;
}

function hashBytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function benchmarkVisualCritic(input) {
  const calls = [];
  const sourceUrl = benchmarkSource(input).url;
  const critic = async (request, evidenceInput) => {
    const observations = [];
    assert.deepEqual(
      request.renderedArtifacts.map(({ artifactId }) => artifactId),
      runtimeArtifactIds,
      `${input.id} critic must inspect the complete adaptive set`,
    );
    for (const artifact of request.renderedArtifacts) {
      const htmlBytes = await evidenceInput.read(artifact.renderedPath);
      assert.equal(hashBytes(htmlBytes), artifact.renderedHash);
      const html = htmlBytes.toString();
      assert.match(html, /golden recap/i);
      assert.match(html, /passed/i);
      assert.match(html, /3 artifacts/i);
      assert.ok(html.includes(sourceUrl));
      for (const claim of input.claims) {
        assert.ok(
          html.includes(`data-claim-id="${claim.id}"`),
          `${artifact.artifactId} is missing ${claim.id}`,
        );
        assert.ok(
          html.includes(escapeHtml(claim.text)),
          `${artifact.artifactId} changes ${claim.id}`,
        );
      }
      assert.deepEqual(
        artifact.evidence.map(({ viewport }) => viewport).sort(),
        Object.keys(runtimeViewports).sort(),
      );
      for (const evidence of artifact.evidence) {
        const screenshot = await evidenceInput.read(evidence.screenshotPath);
        assert.equal(hashBytes(screenshot), evidence.screenshotHash);
        const decoded = decodeBrowserPng(screenshot);
        assert.deepEqual(
          { width: decoded.width, height: decoded.height },
          runtimeViewports[evidence.viewport],
        );
        const metricsBytes = await evidenceInput.read(evidence.metricsPath);
        assert.equal(hashBytes(metricsBytes), evidence.metricsHash);
        const metrics = JSON.parse(metricsBytes);
        assert.equal(metrics.metrics.pageOverflowX, false);
        assert.deepEqual(metrics.metrics.clippedX, []);
        assert.deepEqual(metrics.metrics.viewportClipped, []);
        assert.deepEqual(metrics.metrics.unreadableHeadings, []);
        assert.equal(metrics.metrics.keyboard.tab, true);
      }
      observations.push({
        artifactId: artifact.artifactId,
        renderedHash: artifact.renderedHash,
        viewports: artifact.evidence.map(({ viewport }) => viewport),
      });
    }
    const architecture = request.renderedArtifacts.find(
      ({ artifactId }) => artifactId === 'architecture',
    );
    const architectureHtml = (
      await evidenceInput.read(architecture.renderedPath)
    ).toString();
    for (const node of input.topology.nodes) {
      assert.ok(architectureHtml.includes(`data-node="${node}"`));
    }
    for (const [from, to] of input.topology.edges) {
      assert.ok(
        architectureHtml.includes(`data-from="${from}" data-to="${to}"`),
      );
    }
    calls.push({
      requestId: request.requestId,
      requestHash: request.requestHash,
      observations,
    });
    return {
      schemaVersion: 'explainer-kit.visual-review-result/v1',
      reviewId: `${input.id}-golden-review`,
      requestId: request.requestId,
      requestHash: request.requestHash,
      reviewedAt: benchmarkGeneratedAt,
      disposition: 'pass',
      artifactIds: request.renderedArtifacts.map(
        ({ artifactId }) => artifactId,
      ),
      findings: [],
    };
  };
  critic.calls = calls;
  return critic;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function copyRuntimeFile(runRoot, relativePath, outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await copyFile(join(runRoot, relativePath), outputPath);
}

function rubricEvaluation(input, runtime) {
  return {
    schemaVersion: 'explainer-kit.golden-runtime-rubric/v1',
    caseId: input.id,
    generatedAt: benchmarkGeneratedAt,
    checks: Object.fromEntries(
      rubricFields.map((field) => [
        field,
        {
          status: 'pass',
          evidence:
            field === 'catalogParity'
              ? ['runtime/catalog.json', 'runtime/manifest.json']
              : field === 'boundedCorrection'
                ? ['runtime/review-result.json']
                : field === 'topologyPreservation'
                  ? ['runtime/artifacts/architecture.html']
                  : ['runtime/run-summary.json'],
        },
      ]),
    ),
    runtime,
  };
}

async function retainRuntimeOutput({
  caseRoot,
  input,
  manifest,
  result,
  session,
  critic,
}) {
  const outputRoot = join(caseRoot, 'runtime');
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  for (const artifact of manifest.artifacts) {
    await copyRuntimeFile(
      result.runRoot,
      artifact.renderedPath,
      join(outputRoot, 'artifacts', `${artifact.id}.html`),
    );
    for (const viewport of Object.keys(runtimeViewports)) {
      for (const extension of ['png', 'json']) {
        await copyRuntimeFile(
          result.runRoot,
          `qa/browser/${artifact.id}/${viewport}.${extension}`,
          join(outputRoot, 'evidence', artifact.id, `${viewport}.${extension}`),
        );
      }
    }
  }
  const catalogPath = `site/initiatives/${input.id}/catalog.json`;
  const [catalog, reviewResult] = await Promise.all([
    readJson(join(result.runRoot, catalogPath)),
    readJson(join(result.runRoot, 'qa/visual-review/attempt-1/result.json')),
  ]);
  const normalizedManifest = {
    schemaVersion: manifest.schemaVersion,
    outcome: manifest.outcome,
    source: manifest.source,
    artifacts: manifest.artifacts.map(
      ({ id, type, renderedPath, hash, status }) => ({
        id,
        type,
        renderedPath,
        hash,
        status,
      }),
    ),
  };
  const summary = {
    schemaVersion: 'explainer-kit.golden-runtime-output/v1',
    caseId: input.id,
    generatedAt: benchmarkGeneratedAt,
    browser: session.runtime,
    outcome: result.outcome,
    marking: result.marking,
    author: {
      id: 'golden-benchmark-author',
      calls: runtimeArtifactIds,
    },
    visualCritic: {
      id: 'golden-benchmark-visual-critic',
      independentFromAuthor: true,
      calls: critic.calls.length,
      disposition: reviewResult.disposition,
    },
    reviewHistory: {
      attempts: 1,
      corrections: 0,
      terminalReview: reviewResult.disposition,
    },
    archiveInput: {
      activeProjectRequired: false,
      sourcePath: 'source-input.json',
    },
  };
  await Promise.all([
    writeJson(join(outputRoot, 'manifest.json'), normalizedManifest),
    writeJson(join(outputRoot, 'catalog.json'), catalog),
    writeJson(join(outputRoot, 'review-result.json'), reviewResult),
    writeJson(join(outputRoot, 'run-summary.json'), summary),
    writeJson(
      join(outputRoot, 'rubric-evaluation.json'),
      rubricEvaluation(input, summary),
    ),
  ]);
}

async function validateRetainedRuntimeOutput(caseRoot, input) {
  const outputRoot = join(caseRoot, 'runtime');
  const [summary, manifest, catalog, review, evaluation] = await Promise.all([
    readJson(join(outputRoot, 'run-summary.json')),
    readJson(join(outputRoot, 'manifest.json')),
    readJson(join(outputRoot, 'catalog.json')),
    readJson(join(outputRoot, 'review-result.json')),
    readJson(join(outputRoot, 'rubric-evaluation.json')),
  ]);
  assert.equal(summary.caseId, input.id);
  assert.equal(summary.browser.kind, 'launched');
  assert.equal(summary.browser.name, 'chromium');
  assert.ok(summary.browser.version);
  assert.equal(summary.visualCritic.independentFromAuthor, true);
  assert.equal(summary.visualCritic.calls, 1);
  assert.deepEqual(summary.reviewHistory, {
    attempts: 1,
    corrections: 0,
    terminalReview: 'pass',
  });
  assert.equal(summary.archiveInput.activeProjectRequired, false);
  assert.equal(review.disposition, 'pass');
  assert.deepEqual(
    manifest.artifacts.map(({ id }) => id),
    runtimeArtifactIds,
  );
  assert.deepEqual(
    catalog.artifacts.map(({ id }) => id),
    runtimeArtifactIds,
  );
  assert.deepEqual(
    Object.keys(evaluation.checks).sort(),
    [...rubricFields].sort(),
  );
  assert.equal(
    Object.values(evaluation.checks).every(({ status }) => status === 'pass'),
    true,
  );
  for (const artifactId of runtimeArtifactIds) {
    const html = await readFile(
      join(outputRoot, 'artifacts', `${artifactId}.html`),
      'utf8',
    );
    for (const claim of input.claims) {
      assert.ok(html.includes(`data-claim-id="${claim.id}"`));
    }
    for (const [viewport, dimensions] of Object.entries(runtimeViewports)) {
      const screenshot = await readFile(
        join(outputRoot, 'evidence', artifactId, `${viewport}.png`),
      );
      const decoded = decodeBrowserPng(screenshot);
      assert.deepEqual(
        { width: decoded.width, height: decoded.height },
        dimensions,
      );
      const metrics = await readJson(
        join(outputRoot, 'evidence', artifactId, `${viewport}.json`),
      );
      assert.equal(metrics.schemaVersion, 'explainer-kit.browser-evidence/v2');
      assert.deepEqual(metrics.runtime, summary.browser);
      assert.match(metrics.captureIdentity, /^sha256:[a-f0-9]{64}$/);
      assert.equal(metrics.metrics.pageOverflowX, false);
    }
  }
}

async function runGoldenBenchmark(caseId) {
  const fixture = await loadGoldenFixture(caseId);
  const caseRoot = join(fixtureRoot, caseId);
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), `explainer-golden-${caseId}-`),
  );
  const factBasePath = join(temporaryRoot, 'fact-base.json');
  await writeJson(factBasePath, benchmarkFactBase(fixture.input));
  const session = await createBrowserProbeSession();
  assert.equal(
    session.available,
    true,
    `real Chromium is required for ${caseId}: ${session.reason ?? 'unavailable'}`,
  );
  const author = benchmarkAuthor(fixture.input);
  const visualCritic = benchmarkVisualCritic(fixture.input);
  assert.notEqual(author, visualCritic);
  try {
    const result = await runExplainer(
      {
        schemaVersion: 'explainer-kit.run-request/v1',
        recipe: { id: 'project-recap', version: '1' },
        slug: caseId,
        outputRoot: join(temporaryRoot, 'output'),
        factBase: {
          mode: 'supplied',
          path: factBasePath,
          freshnessPolicy: 'live-wins',
        },
        theme: { style: 'clean-neutral' },
        publicBaseUrl: 'https://example.com/golden/',
        durability: { strategy: 'none' },
        privacy: { retainRawArtDirection: false },
        mode: 'unattended',
      },
      {
        author,
        planSet: benchmarkPlanSet(fixture.input),
        browserSession: session,
        visualCritic,
        now: () => benchmarkGeneratedAt,
      },
    );
    assert.equal(
      result.outcome,
      'built-not-durable',
      JSON.stringify(result.errors ?? result.warnings),
    );
    assert.deepEqual(author.calls, runtimeArtifactIds);
    assert.equal(visualCritic.calls.length, 1);
    assert.equal(result.visualReview.disposition, 'pass');
    const manifest = await readJson(result.manifestPath);
    assert.deepEqual(
      manifest.artifacts.map(({ id }) => id),
      runtimeArtifactIds,
    );
    assert.deepEqual(
      manifest.source.backlinks.map(({ sourceId }) => sourceId),
      fixture.descriptor.sourceIds,
    );
    const catalog = await readJson(
      join(result.runRoot, `site/initiatives/${caseId}/catalog.json`),
    );
    assert.deepEqual(
      catalog.artifacts.map(({ id }) => id),
      runtimeArtifactIds,
    );
    if (process.env.UPDATE_GOLDEN_CASE === caseId) {
      await retainRuntimeOutput({
        caseRoot,
        input: fixture.input,
        manifest,
        result,
        session,
        critic: visualCritic,
      });
    }
    await validateRetainedRuntimeOutput(caseRoot, fixture.input);
  } finally {
    await Promise.allSettled([
      session.close(),
      rm(temporaryRoot, { recursive: true, force: true }),
    ]);
  }
}

test(
  'simple golden benchmark passes the rebuilt unattended runtime with real Chromium and an independent critic',
  { timeout: 120_000 },
  async () => {
    await runGoldenBenchmark('simple');
  },
);

test(
  'non-linear golden benchmark preserves branches, fan-in, and cycles through the rebuilt artistic runtime',
  { timeout: 120_000 },
  async () => {
    await runGoldenBenchmark('non-linear');
  },
);

test(
  'explainer-authoring-redesign golden benchmark rebuilds from archive-only evidence',
  { timeout: 120_000 },
  async () => {
    await runGoldenBenchmark('explainer-authoring-redesign');
  },
);

test('loads all three portable golden fixture descriptors', async () => {
  const fixtures = await Promise.all(
    caseIds.map((caseId) => loadGoldenFixture(caseId)),
  );

  assert.deepEqual(
    fixtures.map((fixture) => fixture.descriptor.id),
    caseIds,
  );
  for (const fixture of fixtures.slice(1)) {
    assert.deepEqual(
      fixture.rubric,
      fixtures[0].rubric,
      `${fixture.descriptor.id} must use the shared golden rubric`,
    );
  }
});

test('requires every explicit machine-readable rubric field', () => {
  const rubric = {
    schemaVersion: 'explainer-kit.golden-rubric/v1',
    checks: Object.fromEntries(
      rubricFields.map((field) => [
        field,
        { required: true, evidence: ['fixture-evidence'] },
      ]),
    ),
  };
  delete rubric.checks.catalogParity;

  assert.throws(() => validateRubric(rubric), /complete and exact/);
});

const invalidFixtureMutations = [
  [
    'label-only reference summaries',
    ({ reference }) => {
      reference.artifacts = reference.artifacts.map(({ id, type }) => ({
        id,
        type,
        status: 'reference-met',
      }));
    },
  ],
  [
    'missing retained evidence files',
    ({ descriptor }) => {
      descriptor.retainedFiles[0].path = 'evidence/missing.json';
    },
  ],
  [
    'retained evidence hash mismatches',
    ({ descriptor }) => {
      descriptor.retainedFiles[0].sha256 = `sha256:${'0'.repeat(64)}`;
    },
  ],
  [
    'unknown claim source IDs',
    ({ input }) => {
      input.claims[0].sourceId = 'unknown-source';
    },
  ],
  [
    'invalid topology endpoints',
    ({ input }) => {
      input.topology.edges[0][1] = 'unknown-node';
    },
  ],
  [
    'unsupported fixture claims',
    ({ input }) => {
      input.claims[0].text = 'An unsupported claim invented by the fixture.';
    },
  ],
  [
    'wrong adaptive minimum membership',
    ({ reference }) => {
      reference.artifacts.pop();
    },
  ],
  [
    'missing producer metadata',
    ({ descriptor }) => {
      delete descriptor.producer.version;
    },
  ],
  [
    'unresolved rubric evidence pointers',
    ({ rubric }) => {
      rubric.checks.firstViewport.evidence[0] =
        'evidence/browser-evidence.json#/screenshots/unknown';
    },
  ],
  [
    'missing browser evidence metadata',
    ({ reference }) => {
      delete reference.browserEvidence;
    },
  ],
];

for (const [name, mutate] of invalidFixtureMutations) {
  test(`rejects ${name}`, async () => {
    await assert.rejects(loadGoldenFixture('simple', mutate));
  });
}

for (const [name, path] of [
  ['temporary POSIX paths', '/tmp/operator/evidence'],
  ['arbitrary POSIX roots', '/opt/explainer/evidence'],
  ['Windows drive paths', 'D:\\explainer\\evidence'],
  ['UNC paths', '\\\\server\\share\\evidence'],
]) {
  test(`rejects ${name} from committed conformance data`, () => {
    assert.throws(
      () => assertPortable({ source: path }, 'seeded local path'),
      /machine-local absolute path/,
    );
  });
}

test('allows repository-relative paths and supported network URLs', () => {
  assert.doesNotThrow(() =>
    assertPortable(
      {
        repository: '.agents/skills/explainer-kit/reference.md',
        upstream: 'https://github.com/voxmedia/open-agent-toolkit',
      },
      'portable locators',
    ),
  );
  assert.throws(
    () =>
      assertPortable(
        { upstream: 'ftp://example.com/moving-evidence' },
        'unsupported network locator',
      ),
    /unsupported locator scheme/,
  );
});
