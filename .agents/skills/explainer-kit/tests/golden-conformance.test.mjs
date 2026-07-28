import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
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

const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const fixtureRoot = fileURLToPath(
  new URL('./fixtures/golden/', import.meta.url),
);
const caseIds = ['simple', 'non-linear', 'explainer-authoring-redesign'];
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
