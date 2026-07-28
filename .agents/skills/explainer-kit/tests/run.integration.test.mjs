import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, mock, test } from 'node:test';

import { canonicalHash, validateContract } from '../scripts/lib/contracts.mjs';
import {
  runExplainer as runExplainerCore,
  runExplainerCli,
} from '../scripts/run.mjs';

const NOW = '2026-07-17T20:00:00Z';
const HASH = `sha256:${'a'.repeat(64)}`;
const tempDirs = [];

afterEach(async () => {
  mock.reset();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'explainer-run-'));
  tempDirs.push(directory);
  return directory;
}

function suppliedFactBase() {
  return {
    schemaVersion: 'explainer-kit.fact-base/v1',
    generatedAt: NOW,
    mode: 'supplied',
    freshnessPolicy: 'live-wins',
    sources: [
      {
        id: 'project',
        kind: 'file',
        locator: 'approved-project.md',
        hash: HASH,
        observedAt: NOW,
      },
    ],
    claims: [
      {
        id: 'architecture',
        text: 'The system uses a config-blind core.',
        status: 'confirmed',
        citations: [{ sourceId: 'project', locator: 'approved-project.md:1' }],
      },
    ],
    unresolvedClaims: [],
    overrides: [],
  };
}

function plannedSet({ recipe, factBase }, portfolio = null) {
  const sourceIds = factBase.sources
    .map(({ id }) => id)
    .filter((id) => !id.startsWith('critic:'));
  return {
    schemaVersion: 'explainer-kit.set-plan/v1',
    planId: `${recipe.id}-set`,
    recipe: { id: recipe.id, version: recipe.version },
    sourceIds,
    ledger: {
      terminology: [
        { term: 'config-blind core', meaning: 'The provider-neutral runtime.' },
      ],
      statuses: [{ subject: 'implementation', value: 'validated' }],
      numbers: [{ subject: 'source sets', value: 1, unit: 'set' }],
    },
    portfolio:
      portfolio ??
      recipe.floor.map((artifact) => ({
        artifactId: artifact.id,
        artifactType: artifact.type,
        profileId: 'recipe-floor',
        required: true,
        sourceIds,
        draft: `Compose the planned ${artifact.id} narrative.`,
        visualIntent: 'Lead with the validated outcome.',
      })),
  };
}

function authorResult(authorRequest, overrides = {}) {
  const requiredNarrative = authorRequest.floor?.requiredNarrative ?? [
    'overview',
  ];
  const markdown = `# Authored ${authorRequest.artifactId}\n\n${requiredNarrative
    .map(
      (id, index) =>
        `## ${humanize(id)}\n\nSection ${index + 1} explains the verified ${humanize(id).toLowerCase()} in concise, audience-ready language.${index === 0 ? ` ${authorRequest.factBase.claims[0]?.text ?? ''}` : ''}`,
    )
    .join('\n\n')}\n`;
  const html = authorRequest.shell
    ?.replaceAll('{{TITLE}}', `Authored ${authorRequest.artifactId}`)
    .replaceAll('{{DESCRIPTION}}', 'A concise authored artifact.')
    .replaceAll('{{EYEBROW}}', 'Explainer Kit')
    .replaceAll('{{NAVIGATION}}', '')
    .replaceAll(
      '{{CONTENT}}',
      '<section id="overview"><h2>Overview</h2><p>Authored artifact.</p></section>',
    )
    .replaceAll(
      '{{DIAGRAM}}',
      '<rect data-node="overview" class="node active" width="80" height="40"></rect>',
    )
    .replaceAll('{{FOOTER}}', 'Authored from validated evidence.')
    .replaceAll(
      '{{SLIDES}}',
      '<section class="slide"><h1>Overview</h1></section>',
    )
    .replaceAll('{{LEGEND}}', '<span>Overview</span>')
    .replaceAll('{{THEME_CSS}}', '');
  return {
    schemaVersion: 'explainer-kit.author-result/v2',
    artifactId: authorRequest.artifactId,
    content: {
      [authorRequest.authoring]:
        authorRequest.authoring === 'markdown' ? markdown : html,
    },
    provenance: {
      authorId: 'fixture-author',
      generatedAt: NOW,
      method: 'test-callback',
    },
    ...overrides,
  };
}

async function runExplainer(request, options = {}) {
  return runExplainerCore(request, {
    ...(typeof options.author !== 'function'
      ? { author: async (authorRequest) => authorResult(authorRequest) }
      : {}),
    ...options,
  });
}

function layoutProbe({ pageOverflowX }) {
  return async () => ({
    pageOverflowX,
    clippedX: [],
    viewportClipped: [],
    unreadableHeadings: [],
    animationsDisabled: true,
    reducedMotion: true,
    keyboard: { tab: true },
  });
}

async function retainingBrowserProbe(probeRequest) {
  if (probeRequest.screenshotPath) {
    await mkdir(dirname(probeRequest.screenshotPath), { recursive: true });
    await writeFile(probeRequest.screenshotPath, Buffer.from([1, 2, 3]));
  }
  const result = {
    pageOverflowX: false,
    clippedX: [],
    viewportClipped: [],
    unreadableHeadings: [],
    animationsDisabled: true,
    reducedMotion: true,
    keyboard: {
      tab: true,
      ...(probeRequest.artifact.type === 'deck' &&
        probeRequest.scenario === 'default' && {
          ArrowLeft: true,
          ArrowRight: true,
          ArrowUp: true,
          ArrowDown: true,
        }),
    },
  };
  if (probeRequest.artifact.type === 'deck') {
    result.deckLayout =
      probeRequest.scenario === 'default'
        ? { flow: 'horizontal', overflowX: 'auto', scrollSnap: true }
        : {
            flow: 'vertical',
            overflowX: probeRequest.scenario === 'print' ? 'visible' : 'auto',
            scrollSnap: false,
          };
  }
  return result;
}

function humanize(value) {
  return value
    .split('-')
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function request({ outputRoot, factBasePath, recipe = 'project-explainer' }) {
  return {
    schemaVersion: 'explainer-kit.run-request/v1',
    recipe: { id: recipe, version: '1' },
    slug: `${recipe}-demo`,
    outputRoot,
    factBase: {
      mode: 'supplied',
      path: factBasePath,
      freshnessPolicy: 'live-wins',
    },
    theme: {
      palette: 'neutral',
      visualProfile: 'clean',
      artDirection: 'Private transient direction',
    },
    durability: { strategy: 'none' },
    privacy: { retainRawArtDirection: false },
    mode: 'unattended',
  };
}

async function suppliedFixture(recipe = 'project-explainer') {
  const cwd = await temporaryDirectory();
  const outputRoot = join(cwd, 'output');
  const factBasePath = join(cwd, 'approved-facts.json');
  await writeFile(
    factBasePath,
    `${JSON.stringify(suppliedFactBase(), null, 2)}\n`,
  );
  return {
    cwd,
    outputRoot,
    factBasePath,
    request: request({ outputRoot, factBasePath, recipe }),
  };
}

test('interactive runs pause after rendered QA and do no external work before approval', async () => {
  const fixture = await suppliedFixture();
  const publish = mock.fn(async () => {
    throw new Error('publish must not run before content approval');
  });
  const durability = mock.fn(async () => {
    throw new Error('durability must not run before content approval');
  });
  const interactiveRequest = {
    ...fixture.request,
    mode: 'interactive',
    durability: { strategy: 'commit' },
  };

  const result = await runExplainer(interactiveRequest, {
    now: () => NOW,
    publish,
    durability,
  });

  assert.equal(result.outcome, 'incomplete');
  assert.equal(result.approval.status, 'pending');
  assert.match(result.approval.resumeToken, /^ekrt1:[a-f0-9]{64}$/);
  assert.equal(publish.mock.callCount(), 0);
  assert.equal(durability.mock.callCount(), 0);
  await access(join(result.runRoot, 'source/content/project-explainer.md'));
  await access(join(result.runRoot, 'theme.resolved.json'));
  await access(join(result.runRoot, 'site'));
  const record = JSON.parse(await readFile(result.buildRecordPath, 'utf8'));
  for (const id of ['content', 'theme', 'render', 'qa']) {
    assert.ok(
      ['passed', 'warned'].includes(
        record.stages.find((stage) => stage.id === id).status,
      ),
      `${id} completed before approval`,
    );
  }
  for (const relativePath of [
    'run-request.json',
    'build-record.json',
    'source/content-approval.json',
    'source/set-plan/request.json',
    'source/set-plan/result.json',
    'source/set-plan/ledger.json',
    'source/set-plan/portfolio.json',
    'source/set-plan/drafts.json',
  ]) {
    assert.doesNotMatch(
      await readFile(join(result.runRoot, relativePath), 'utf8'),
      new RegExp(result.approval.resumeToken),
      `${relativePath} must not persist the external trust anchor`,
    );
  }

  const approvedDurability = mock.fn(async () => {});
  const resumed = await runExplainer(interactiveRequest, {
    now: () => '2026-07-17T20:05:00Z',
    durability: approvedDurability,
    reviewedSource: {
      decision: 'approve',
      reviewedAt: '2026-07-17T20:05:00Z',
      reviewer: 'operator',
      resumeToken: result.approval.resumeToken,
    },
  });
  assert.equal(resumed.runId, result.runId);
  assert.equal(
    resumed.outcome,
    'built-not-durable',
    JSON.stringify(resumed.errors),
  );
  assert.equal(resumed.marking, 'human-approved');
  assert.equal(resumed.approval.marking, 'human-approved');
  assert.equal(approvedDurability.mock.callCount(), 1);
  assert.doesNotMatch(
    await readFile(
      join(resumed.runRoot, 'source/content-approval.json'),
      'utf8',
    ),
    new RegExp(result.approval.resumeToken),
    'the echoed token must not be persisted with the approval decision',
  );
});

test('interactive resume requires an exact closed-format external token before callbacks', async () => {
  for (const [label, candidate] of [
    ['missing', () => undefined],
    ['malformed', () => 'ekrt1:not-a-digest'],
    [
      'mismatched',
      (token) => `${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`,
    ],
  ]) {
    const fixture = await suppliedFixture('project-recap');
    const interactiveRequest = {
      ...fixture.request,
      mode: 'interactive',
      durability: { strategy: 'commit' },
    };
    const planSet = mock.fn(async (plannerRequest) =>
      plannedSet(plannerRequest),
    );
    const author = mock.fn(async (authorRequest) =>
      authorResult(authorRequest),
    );
    const durability = mock.fn(async () => {});
    const publish = mock.fn(async () => {});
    const paused = await runExplainerCore(interactiveRequest, {
      planSet,
      author,
      now: () => NOW,
    });
    const resumeToken = candidate(paused.approval.resumeToken);

    const resumed = await runExplainerCore(interactiveRequest, {
      planSet,
      author,
      durability,
      publish,
      now: () => '2026-07-17T20:05:00Z',
      reviewedSource: {
        decision: 'approve',
        reviewedAt: '2026-07-17T20:05:00Z',
        reviewer: 'operator',
        ...(resumeToken && { resumeToken }),
      },
    });

    assert.equal(resumed.outcome, 'failed', label);
    assert.equal(resumed.errors[0].code, 'E_APPROVAL_RESUME', label);
    assert.equal(planSet.mock.callCount(), 1, label);
    assert.equal(author.mock.callCount(), 3, label);
    assert.equal(durability.mock.callCount(), 0, label);
    assert.equal(publish.mock.callCount(), 0, label);
  }
});

test('rejection persists corrections and explicit approval resumes the same run', async () => {
  const fixture = await suppliedFixture();
  const interactiveRequest = { ...fixture.request, mode: 'interactive' };

  const rejected = await runExplainer(interactiveRequest, {
    now: () => NOW,
    browserProbe: layoutProbe({ pageOverflowX: true }),
    reviewedSource: {
      decision: 'reject',
      reviewedAt: NOW,
      reviewer: 'operator',
      corrections: ['Correct the implementation status.'],
    },
  });
  assert.equal(rejected.outcome, 'incomplete', JSON.stringify(rejected.errors));
  assert.equal(rejected.approval.status, 'rejected');
  assert.match(rejected.approval.resumeToken, /^ekrt1:[a-f0-9]{64}$/);
  assert.ok(rejected.warnings.includes('render-qa-document-overflow'));
  const contentPath = join(
    rejected.runRoot,
    'source/content/project-explainer.md',
  );
  const draft = await readFile(contentPath, 'utf8');
  await writeFile(
    contentPath,
    draft.replace(
      'The system uses a config-blind core.',
      'Corrected implementation status.',
    ),
  );

  const resumed = await runExplainer(interactiveRequest, {
    now: () => '2026-07-17T20:05:00Z',
    browserProbe: layoutProbe({ pageOverflowX: false }),
    reviewedSource: {
      decision: 'approve',
      reviewedAt: '2026-07-17T20:05:00Z',
      reviewer: 'operator',
      source: {
        kind: 'human-review',
        locator: 'source/content/project-explainer.md',
      },
      resumeToken: rejected.approval.resumeToken,
    },
  });

  assert.equal(resumed.runRoot, rejected.runRoot);
  assert.equal(resumed.runId, rejected.runId);
  assert.equal(resumed.outcome, 'built-not-durable');
  assert.equal(resumed.approval.status, 'approved');
  const approval = JSON.parse(
    await readFile(
      join(resumed.runRoot, 'source/content-approval.json'),
      'utf8',
    ),
  );
  assert.deepEqual(approval.attempts[0].corrections, [
    'Correct the implementation status.',
  ]);
  const manifest = JSON.parse(await readFile(resumed.manifestPath, 'utf8'));
  const rendered = await readFile(
    join(resumed.runRoot, manifest.artifacts[0].renderedPath),
    'utf8',
  );
  assert.match(rendered, /Corrected implementation status\./);
  // The rerun cleared the defect, so its warning must not survive the resume.
  assert.equal(resumed.warnings.includes('render-qa-document-overflow'), false);
  assert.equal(
    manifest.warnings.includes('render-qa-document-overflow'),
    false,
  );
  const record = JSON.parse(await readFile(resumed.buildRecordPath, 'utf8'));
  for (const id of ['render', 'qa']) {
    assert.match(
      record.stages
        .find((stage) => stage.id === id)
        .warnings.find((warning) => warning.startsWith('stage-reopened:')),
      /^stage-reopened:content-rejected:/,
      id,
    );
  }
  // The audit trail never leaks into the published warning vocabulary.
  assert.equal(
    resumed.warnings.some((warning) => warning.startsWith('stage-reopened:')),
    false,
  );
});

test('a rejected correction that fails QA remains local and updates the build record', async () => {
  const fixture = await suppliedFixture();
  const interactiveRequest = {
    ...fixture.request,
    mode: 'interactive',
    durability: { strategy: 'commit' },
  };
  const rejected = await runExplainer(interactiveRequest, {
    now: () => NOW,
    reviewedSource: {
      decision: 'reject',
      reviewedAt: NOW,
      reviewer: 'operator',
      corrections: ['Remove the blocked phrase.'],
    },
  });
  const contentPath = join(
    rejected.runRoot,
    'source/content/project-explainer.md',
  );
  await writeFile(
    contentPath,
    (await readFile(contentPath, 'utf8')).replace(
      'The system uses a config-blind core.',
      'Blocked correction phrase.',
    ),
  );
  const durability = mock.fn(async () => {});
  const publish = mock.fn(async () => {});

  const result = await runExplainer(interactiveRequest, {
    now: () => '2026-07-17T20:05:00Z',
    durability,
    publish,
    denylist: ['Blocked correction phrase.'],
    reviewedSource: {
      decision: 'approve',
      reviewedAt: '2026-07-17T20:05:00Z',
      reviewer: 'operator',
      resumeToken: rejected.approval.resumeToken,
    },
  });

  assert.equal(result.outcome, 'failed');
  assert.equal(result.errors[0].code, 'E_QA');
  assert.equal(durability.mock.callCount(), 0);
  assert.equal(publish.mock.callCount(), 0);
  const record = JSON.parse(await readFile(result.buildRecordPath, 'utf8'));
  assert.equal(record.stages.find(({ id }) => id === 'qa').status, 'failed');
});

test('resume rejects a changed fact-base binding', async () => {
  const fixture = await suppliedFixture();
  const interactiveRequest = { ...fixture.request, mode: 'interactive' };
  const rejected = await runExplainer(interactiveRequest, {
    now: () => NOW,
    reviewedSource: {
      decision: 'reject',
      reviewedAt: NOW,
      reviewer: 'operator',
      corrections: ['Correct the implementation status.'],
    },
  });
  const replacementFactBasePath = join(fixture.cwd, 'replacement-facts.json');
  await writeFile(
    replacementFactBasePath,
    `${JSON.stringify(suppliedFactBase(), null, 2)}\n`,
  );

  await assert.rejects(
    runExplainer(
      {
        ...interactiveRequest,
        factBase: {
          ...interactiveRequest.factBase,
          path: replacementFactBasePath,
        },
      },
      {
        now: () => '2026-07-17T20:05:00Z',
        reviewedSource: {
          decision: 'approve',
          reviewedAt: '2026-07-17T20:05:00Z',
          reviewer: 'operator',
          resumeToken: rejected.approval.resumeToken,
        },
      },
    ),
    { code: 'E_APPROVAL_RESUME' },
  );
});

test('unattended lifecycle sources persist review provenance without prompting', async () => {
  const fixture = await suppliedFixture('project-recap');
  const prompt = mock.fn(() => {
    throw new Error('unattended runs must never prompt');
  });
  const reviewedSource = {
    kind: 'lifecycle-artifacts',
    locator: '.oat/projects/shared/demo/implementation.md',
    revision: 'abc123',
    reviewedAt: NOW,
  };

  const result = await runExplainer(fixture.request, {
    now: () => NOW,
    prompt,
    reviewedSource,
  });

  assert.equal(result.outcome, 'built-needs-review');
  assert.equal(result.marking, 'auto-drafted');
  assert.equal(result.approval.marking, 'auto-drafted');
  assert.equal(prompt.mock.callCount(), 0);
  const approval = JSON.parse(
    await readFile(
      join(result.runRoot, 'source/content-approval.json'),
      'utf8',
    ),
  );
  assert.equal(approval.status, 'approved');
  assert.equal(approval.marking, 'auto-drafted');
  assert.deepEqual(approval.reviewedSource, reviewedSource);
  assert.deepEqual(approval.authorResultPaths, [
    'source/author/project-recap.json',
    'source/author/architecture.json',
    'source/author/deck.json',
  ]);
});

test('project recap defaults to the persisted artistic authoring mode', async () => {
  const fixture = await suppliedFixture('project-recap');
  const requests = [];
  const result = await runExplainer(fixture.request, {
    author: async (authorRequest) => {
      requests.push(authorRequest);
      return authorResult(authorRequest);
    },
    now: () => NOW,
  });

  assert.equal(result.outcome, 'built-needs-review');
  assert.equal(requests.length, 3);
  assert.ok(requests.every(({ authoring }) => authoring === 'html'));
  const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
  assert.deepEqual(
    manifest.artifacts.map(({ contentPath }) => contentPath),
    [
      'source/content/project-recap.html',
      'source/content/architecture.html',
      'source/content/deck.html',
    ],
  );
  const retainedRequest = JSON.parse(
    await readFile(join(result.runRoot, 'run-request.json'), 'utf8'),
  );
  assert.equal(retainedRequest.recapMode, 'artistic');
});

test('explicit deterministic recap fallback retains the full portfolio as Markdown', async () => {
  const fixture = await suppliedFixture('project-recap');
  const requests = [];
  const result = await runExplainer(
    { ...fixture.request, recapMode: 'deterministic-markdown' },
    {
      author: async (authorRequest) => {
        requests.push(authorRequest);
        return authorResult(authorRequest);
      },
      now: () => NOW,
    },
  );

  assert.equal(result.outcome, 'built-needs-review');
  assert.deepEqual(
    requests.map(({ artifactId }) => artifactId),
    ['project-recap', 'architecture', 'deck'],
  );
  assert.ok(
    requests.every(
      ({ authoring, shell }) => authoring === 'markdown' && shell === undefined,
    ),
  );
  const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
  assert.deepEqual(
    manifest.artifacts.map(({ contentPath }) => contentPath),
    [
      'source/content/project-recap.md',
      'source/content/architecture.md',
      'source/content/deck.md',
    ],
  );
  assert.ok(
    manifest.artifacts.every(
      ({ contentPath }) => contentPath in manifest.immutableHashes,
    ),
  );
  const retainedRequest = JSON.parse(
    await readFile(join(result.runRoot, 'run-request.json'), 'utf8'),
  );
  assert.equal(retainedRequest.recapMode, 'deterministic-markdown');
});

test('artistic author failure never silently downgrades to Markdown', async () => {
  const fixture = await suppliedFixture('project-recap');
  const author = mock.fn(async () => {
    throw new Error('artistic author failed');
  });
  const result = await runExplainer(fixture.request, {
    author,
    now: () => NOW,
  });

  assert.equal(result.outcome, 'failed');
  assert.equal(author.mock.callCount(), 1);
  assert.match(result.errors[0].message, /artistic author failed/);
  await assert.rejects(
    access(join(result.runRoot, 'source/content/project-recap.md')),
  );
});

test('completed unattended runs are not mistaken for unresolved approval resumes', async () => {
  const fixture = await suppliedFixture('project-recap');
  const initial = await runExplainer(fixture.request, { now: () => NOW });
  const buildRecordPath = join(initial.runRoot, 'build-record.json');
  const buildRecord = JSON.parse(await readFile(buildRecordPath, 'utf8'));
  buildRecord.stages = buildRecord.stages.map((stage) =>
    ['theme', 'render', 'qa', 'durability', 'publish'].includes(stage.id)
      ? { id: stage.id, status: 'pending', outputPaths: [], warnings: [] }
      : stage,
  );
  buildRecord.outcome = 'incomplete';
  delete buildRecord.completedAt;
  await writeFile(buildRecordPath, `${JSON.stringify(buildRecord, null, 2)}\n`);

  const resumed = await runExplainer(fixture.request, {
    now: () => '2026-07-17T20:05:00Z',
  });

  assert.equal(
    resumed.outcome,
    'built-needs-review',
    JSON.stringify(resumed.errors),
  );
  assert.notEqual(resumed.runId, initial.runId);
  const manifest = JSON.parse(await readFile(resumed.manifestPath, 'utf8'));
  assert.deepEqual(manifest.source.authorResultPaths, [
    'source/author/project-recap.json',
    'source/author/architecture.json',
    'source/author/deck.json',
  ]);
});

test('both modes fail before narrative output when no author is supplied', async () => {
  for (const mode of ['interactive', 'unattended']) {
    const fixture = await suppliedFixture('project-recap');
    const result = await runExplainerCore(
      { ...fixture.request, mode },
      { now: () => NOW },
    );

    assert.equal(result.outcome, 'failed', mode);
    assert.equal(result.errors[0].code, 'E_AUTHOR_REQUIRED', mode);
    await assert.rejects(
      access(join(result.runRoot, 'source/content/project-recap.md')),
    );
    await assert.rejects(
      access(join(result.runRoot, 'source/author/project-recap.json')),
    );
  }
});

test('unattended author receives structured per-artifact context and retains validated provenance', async () => {
  const fixture = await suppliedFixture('project-recap');
  const requests = [];
  const author = mock.fn(async (authorRequest) => {
    requests.push(authorRequest);
    return authorResult(authorRequest);
  });

  const result = await runExplainerCore(fixture.request, {
    author,
    discover: async ({ round }) =>
      round === 1 ? ['Archive validation exposed incomplete hashes.'] : [],
    now: () => NOW,
  });

  assert.equal(
    result.outcome,
    'built-needs-review',
    JSON.stringify(result.errors),
  );
  assert.equal(author.mock.callCount(), 3);
  assert.deepEqual(
    requests.map(
      ({ artifactId, artifactType, authoring, plannedArtifact }) => ({
        artifactId,
        artifactType,
        authoring,
        plannedArtifactId: plannedArtifact.artifactId,
      }),
    ),
    [
      {
        artifactId: 'project-recap',
        artifactType: 'hub',
        authoring: 'html',
        plannedArtifactId: 'project-recap',
      },
      {
        artifactId: 'architecture',
        artifactType: 'diagram',
        authoring: 'html',
        plannedArtifactId: 'architecture',
      },
      {
        artifactId: 'deck',
        artifactType: 'deck',
        authoring: 'html',
        plannedArtifactId: 'deck',
      },
    ],
  );
  const setContexts = requests.map(({ setContext }) =>
    structuredClone(setContext),
  );
  assert.equal(
    setContexts.every(
      (setContext) =>
        JSON.stringify(setContext) === JSON.stringify(setContexts[0]),
    ),
    true,
  );
  const retainedPlan = JSON.parse(
    await readFile(join(result.runRoot, 'source/set-plan/result.json'), 'utf8'),
  );
  assert.deepEqual(setContexts[0], retainedPlan);
  for (const authorRequest of requests) {
    assert.equal(
      authorRequest.schemaVersion,
      'explainer-kit.author-request/v2',
    );
    assert.match(authorRequest.brief, /Audience/i);
    for (const topic of [
      /representation/i,
      /hierarchy/i,
      /responsive navigation/i,
      /table/i,
      /diagram/i,
      /deck/i,
    ]) {
      assert.match(authorRequest.visualAuthoringGuidance, topic);
    }
    assert.equal(
      authorRequest.factBase.schemaVersion,
      'explainer-kit.fact-base/v1',
    );
    assert.equal(authorRequest.theme.schemaVersion, 'explainer-kit.theme/v1');
    assert.equal(typeof authorRequest.shell, 'string');
  }
  assert.equal(
    requests.every(
      ({ visualAuthoringGuidance }) =>
        visualAuthoringGuidance === requests[0].visualAuthoringGuidance,
    ),
    true,
  );
  assert.deepEqual(requests[0].floor.requiredNarrative, [
    'original-request',
    'key-agent-decisions',
    'as-built-architecture',
    'implementation-record',
    'validation-evidence',
    'outcome',
  ]);

  for (const artifactId of ['project-recap', 'architecture', 'deck']) {
    const authorPath = join(result.runRoot, `source/author/${artifactId}.json`);
    const retained = JSON.parse(await readFile(authorPath, 'utf8'));
    assert.equal(retained.artifactId, artifactId);
    assert.equal(retained.provenance.authorId, 'fixture-author');
    await access(join(result.runRoot, `source/content/${artifactId}.html`));
  }
  const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
  assert.equal('marking' in manifest, false);
  assert.deepEqual(manifest.source.authorResultPaths, [
    'source/author/project-recap.json',
    'source/author/architecture.json',
    'source/author/deck.json',
  ]);
  for (const path of manifest.source.authorResultPaths) {
    assert.ok(manifest.immutableHashes[path], path);
  }
});

test('plans one immutable set after facts and before every artifact author', async () => {
  const fixture = await suppliedFixture('project-recap');
  const events = [];
  const plannerRequests = [];
  const authorRequests = [];
  const planSet = mock.fn(async (plannerRequest) => {
    events.push('plan');
    plannerRequests.push(plannerRequest);
    const sourceIds = plannerRequest.factBase.sources.map(({ id }) => id);
    return plannedSet(plannerRequest, [
      ...plannedSet(plannerRequest).portfolio,
      {
        artifactId: 'system-details',
        artifactType: 'explainer',
        profileId: 'deep-dive',
        required: false,
        sourceIds,
        draft: 'Show the core and adapter relationship.',
        visualIntent: 'Preserve system boundaries and direction.',
        justification: {
          kind: 'source-backed-detail',
          sourceIds,
          rationale: 'The architecture claim benefits from a dedicated map.',
        },
      },
    ]);
  });
  const author = mock.fn(async (authorRequest) => {
    events.push(`author:${authorRequest.artifactId}`);
    authorRequests.push(authorRequest);
    return authorResult(authorRequest);
  });

  const result = await runExplainerCore(fixture.request, {
    planSet,
    author,
    now: () => NOW,
  });

  assert.equal(
    result.outcome,
    'built-needs-review',
    JSON.stringify(result.errors),
  );
  assert.equal(planSet.mock.callCount(), 1);
  assert.deepEqual(events, [
    'plan',
    'author:project-recap',
    'author:architecture',
    'author:deck',
    'author:system-details',
  ]);
  assert.equal(
    plannerRequests[0].factBase.schemaVersion,
    'explainer-kit.fact-base/v1',
  );
  assert.deepEqual(
    authorRequests.map(({ setContext }) => setContext),
    Array.from({ length: 4 }, () => authorRequests[0].setContext),
  );
  assert.deepEqual(
    authorRequests.map(({ plannedArtifact }) => plannedArtifact.artifactId),
    ['project-recap', 'architecture', 'deck', 'system-details'],
  );
  for (const path of [
    'source/set-plan/request.json',
    'source/set-plan/result.json',
    'source/set-plan/ledger.json',
    'source/set-plan/portfolio.json',
    'source/set-plan/drafts.json',
  ]) {
    await access(join(result.runRoot, path));
  }
});

test('invokes an independent critic once with the complete rendered recap set', async () => {
  const fixture = await suppliedFixture('project-recap');
  const author = mock.fn(async (authorRequest) => authorResult(authorRequest));
  const browserProbe = mock.fn(async (probeRequest) => {
    if (probeRequest.screenshotPath) {
      await mkdir(dirname(probeRequest.screenshotPath), { recursive: true });
      await writeFile(probeRequest.screenshotPath, Buffer.from([1, 2, 3]));
    }
    const result = {
      pageOverflowX: false,
      clippedX: [],
      viewportClipped: [],
      unreadableHeadings: [],
      animationsDisabled: true,
      reducedMotion: true,
      keyboard: {
        tab: true,
        ...(probeRequest.artifact.type === 'deck' &&
          probeRequest.scenario === 'default' && {
            ArrowLeft: true,
            ArrowRight: true,
            ArrowUp: true,
            ArrowDown: true,
          }),
      },
    };
    if (probeRequest.artifact.type === 'deck') {
      result.deckLayout =
        probeRequest.scenario === 'default'
          ? { flow: 'horizontal', overflowX: 'auto', scrollSnap: true }
          : {
              flow: 'vertical',
              overflowX:
                probeRequest.scenario === 'print' ? 'visible' : 'auto',
              scrollSnap: false,
            };
    }
    return result;
  });
  const visualCritic = mock.fn(async (reviewRequest) => ({
    schemaVersion: 'explainer-kit.visual-review-result/v1',
    reviewId: 'recap-review-1',
    reviewedAt: NOW,
    disposition: 'pass',
    artifactIds: reviewRequest.renderedArtifacts.map(
      ({ artifactId }) => artifactId,
    ),
    findings: [],
  }));

  const result = await runExplainerCore(fixture.request, {
    author,
    planSet: async (plannerRequest) => plannedSet(plannerRequest),
    browserProbe,
    visualCritic,
    now: () => NOW,
  });

  assert.equal(result.outcome, 'built-not-durable', JSON.stringify(result.errors));
  assert.notEqual(visualCritic, author);
  assert.equal(visualCritic.mock.callCount(), 1);
  const reviewRequest = visualCritic.mock.calls[0].arguments[0];
  assert.deepEqual(
    reviewRequest.renderedArtifacts.map(({ artifactId }) => artifactId),
    ['project-recap', 'architecture', 'deck'],
  );
  assert.ok(
    reviewRequest.renderedArtifacts.every(
      ({ evidence }) =>
        evidence.length === 3 &&
        new Set(evidence.map(({ viewport }) => viewport)).size === 3,
    ),
  );
  assert.equal(result.visualReview.disposition, 'pass');

  const sharedCallback = mock.fn(async (request) => authorResult(request));
  const rejectedFixture = await suppliedFixture('project-recap');
  const rejected = await runExplainerCore(rejectedFixture.request, {
    author: sharedCallback,
    planSet: async (plannerRequest) => plannedSet(plannerRequest),
    browserProbe,
    visualCritic: sharedCallback,
    now: () => NOW,
  });
  assert.equal(rejected.outcome, 'failed');
  assert.equal(rejected.errors[0].code, 'E_VISUAL_REVIEW');
  assert.equal(sharedCallback.mock.callCount(), 3);
});

test('caps visual review at one correction and one final review', async (t) => {
  const cases = [
    {
      name: 'passes on the first review',
      dispositions: ['pass'],
      expectedAuthors: 3,
      expectedReviews: 1,
      expectedFinal: 'pass',
    },
    {
      name: 'passes after one correction',
      dispositions: ['correct', 'pass'],
      expectedAuthors: 4,
      expectedReviews: 2,
      expectedFinal: 'pass',
    },
    {
      name: 'fails after the final review',
      dispositions: ['correct', 'fail'],
      expectedAuthors: 4,
      expectedReviews: 2,
      expectedFinal: 'fail',
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const fixture = await suppliedFixture('project-recap');
      const correctionContexts = [];
      const author = mock.fn(async (authorRequest, correction) => {
        if (correction) correctionContexts.push(correction);
        const result = authorResult(authorRequest);
        if (correction && authorRequest.authoring === 'html') {
          result.content.html = result.content.html.replace(
            'Authored artifact.',
            'Corrected first viewport.',
          );
        }
        return result;
      });
      let reviewIndex = 0;
      const visualCritic = mock.fn(async (reviewRequest) => {
        const disposition = scenario.dispositions[reviewIndex++];
        return {
          schemaVersion: 'explainer-kit.visual-review-result/v1',
          reviewId: `recap-review-${reviewIndex}`,
          reviewedAt: NOW,
          disposition,
          artifactIds: reviewRequest.renderedArtifacts.map(
            ({ artifactId }) => artifactId,
          ),
          findings:
            disposition === 'pass'
              ? []
              : [
                  {
                    artifactId: 'project-recap',
                    rubric: 'first-viewport',
                    severity: 'important',
                    evidence: 'The project outcome is below the fold.',
                    correction: 'Move the outcome into the lead panel.',
                  },
                ],
        };
      });

      const result = await runExplainerCore(fixture.request, {
        author,
        planSet: async (plannerRequest) => plannedSet(plannerRequest),
        browserProbe: retainingBrowserProbe,
        visualCritic,
        now: () => NOW,
      });

      assert.equal(
        result.outcome,
        scenario.expectedFinal === 'pass'
          ? 'built-not-durable'
          : 'built-needs-review',
        JSON.stringify(result.errors),
      );
      assert.equal(author.mock.callCount(), scenario.expectedAuthors);
      assert.equal(visualCritic.mock.callCount(), scenario.expectedReviews);
      assert.equal(result.visualReview.disposition, scenario.expectedFinal);
      await access(
        join(result.runRoot, 'qa/visual-review/attempt-1/request.json'),
      );
      await access(
        join(result.runRoot, 'qa/visual-review/attempt-1/result.json'),
      );
      if (scenario.expectedReviews === 1) {
        await assert.rejects(
          access(join(result.runRoot, 'qa/visual-review/revision.json')),
          { code: 'ENOENT' },
        );
      } else {
        await access(
          join(result.runRoot, 'qa/visual-review/attempt-2/request.json'),
        );
        await access(
          join(result.runRoot, 'qa/visual-review/attempt-2/result.json'),
        );
        const revision = JSON.parse(
          await readFile(
            join(result.runRoot, 'qa/visual-review/revision.json'),
            'utf8',
          ),
        );
        assert.deepEqual(revision.artifactIds, ['project-recap']);
        assert.equal(correctionContexts.length, 1);
        assert.equal(correctionContexts[0].attempt, 1);
        assert.equal(correctionContexts[0].findings.length, 1);
        assert.match(
          await readFile(
            join(result.runRoot, 'source/content/project-recap.html'),
            'utf8',
          ),
          /Corrected first viewport/,
        );
      }
    });
  }
});

test('fails closed before durability and publication when recap review is missing or fails', async (t) => {
  for (const scenario of [
    {
      name: 'missing browser probe',
      browserProbe: undefined,
      visualDisposition: 'pass',
      strategy: 'commit',
    },
    {
      name: 'missing visual critic',
      browserProbe: retainingBrowserProbe,
      visualDisposition: null,
      strategy: 'publish',
    },
    {
      name: 'terminal critic failure',
      browserProbe: retainingBrowserProbe,
      visualDisposition: 'fail',
      strategy: 'publish',
    },
  ]) {
    await t.test(scenario.name, async () => {
      const fixture = await suppliedFixture('project-recap');
      const durability = mock.fn(async () => {});
      const publish = mock.fn(async () => {});
      const visualCritic =
        scenario.visualDisposition === null
          ? undefined
          : mock.fn(async (reviewRequest) => ({
              schemaVersion: 'explainer-kit.visual-review-result/v1',
              reviewId: 'blocking-review',
              reviewedAt: NOW,
              disposition: scenario.visualDisposition,
              artifactIds: reviewRequest.renderedArtifacts.map(
                ({ artifactId }) => artifactId,
              ),
              findings:
                scenario.visualDisposition === 'pass'
                  ? []
                  : [
                      {
                        artifactId: 'project-recap',
                        rubric: 'first-viewport',
                        severity: 'important',
                        evidence: 'The outcome remains below the fold.',
                        correction: 'Move the outcome into the lead panel.',
                      },
                    ],
            }));
      const reviewedRequest = {
        ...fixture.request,
        durability:
          scenario.strategy === 'commit'
            ? { strategy: 'commit' }
            : {
                strategy: 'publish',
                publish: {
                  schemaVersion: 'explainer-kit.publish-request/v1',
                  provider: 's3-static',
                  s3Uri: 's3://example-bucket/explainers',
                  publicBaseUrl: 'https://docs.example.com/explainers',
                  awsRegion: 'us-east-1',
                  siteRoot: join(
                    fixture.outputRoot,
                    'project-recap-demo/site',
                  ),
                  manifestPath: join(
                    fixture.outputRoot,
                    'project-recap-demo/manifest.json',
                  ),
                },
              },
      };

      const result = await runExplainerCore(reviewedRequest, {
        author: async (authorRequest) => authorResult(authorRequest),
        planSet: async (plannerRequest) => plannedSet(plannerRequest),
        ...(scenario.browserProbe && {
          browserProbe: scenario.browserProbe,
        }),
        ...(visualCritic && { visualCritic }),
        durability,
        publish,
        now: () => NOW,
      });

      assert.equal(
        result.outcome,
        'built-needs-review',
        JSON.stringify({
          errors: result.errors,
          warnings: result.warnings,
          request: reviewedRequest,
        }),
      );
      assert.equal(durability.mock.callCount(), 0);
      assert.equal(publish.mock.callCount(), 0);
      const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
      const record = JSON.parse(await readFile(result.buildRecordPath, 'utf8'));
      assert.equal(manifest.outcome, 'built-needs-review');
      assert.equal(record.outcome, 'built-needs-review');
      assert.ok(manifest.artifacts.every(({ status }) => status === 'built'));
      assert.ok(
        manifest.warnings.some((warning) =>
          warning.startsWith('visual-review-required:'),
        ),
      );
    });
  }

  await t.test('passing browser and critic evidence remains eligible', async () => {
    const fixture = await suppliedFixture('project-recap');
    const durability = mock.fn(async () => {});
    const result = await runExplainerCore(
      { ...fixture.request, durability: { strategy: 'commit' } },
      {
        author: async (authorRequest) => authorResult(authorRequest),
        planSet: async (plannerRequest) => plannedSet(plannerRequest),
        browserProbe: retainingBrowserProbe,
        visualCritic: async (reviewRequest) => ({
          schemaVersion: 'explainer-kit.visual-review-result/v1',
          reviewId: 'passing-review',
          reviewedAt: NOW,
          disposition: 'pass',
          artifactIds: reviewRequest.renderedArtifacts.map(
            ({ artifactId }) => artifactId,
          ),
          findings: [],
        }),
        durability,
        now: () => NOW,
      },
    );

    assert.equal(result.outcome, 'built-not-durable');
    assert.equal(durability.mock.callCount(), 1);
  });
});

test('fails before composition on invalid set sources, ledger conflicts, or missing drafts', async () => {
  const mutations = [
    [
      'unknown source',
      (plan) => {
        plan.portfolio[0].sourceIds = ['unknown'];
      },
    ],
    [
      'ledger conflict',
      (plan) => {
        plan.ledger.statuses.push({
          subject: 'implementation',
          value: 'blocked',
        });
      },
    ],
    [
      'missing draft',
      (plan) => {
        delete plan.portfolio[0].draft;
      },
    ],
  ];

  for (const [label, mutate] of mutations) {
    const fixture = await suppliedFixture('project-recap');
    const author = mock.fn(async (authorRequest) =>
      authorResult(authorRequest),
    );
    const result = await runExplainerCore(fixture.request, {
      planSet: async (plannerRequest) => {
        const plan = plannedSet(plannerRequest);
        mutate(plan);
        return plan;
      },
      author,
      now: () => NOW,
    });

    assert.equal(result.outcome, 'failed', label);
    assert.equal(result.errors[0].code, 'E_SET_PLAN', label);
    assert.equal(author.mock.callCount(), 0, label);
  }
});

test('fails before composition when approved sources are omitted or left uncovered', async () => {
  for (const coverageFailure of ['omitted', 'unassigned']) {
    const fixture = await suppliedFixture('project-recap');
    const factBase = suppliedFactBase();
    factBase.sources.push({
      id: 'implementation',
      kind: 'file',
      locator: 'implementation.md',
      hash: HASH,
      observedAt: NOW,
    });
    await writeFile(
      fixture.factBasePath,
      `${JSON.stringify(factBase, null, 2)}\n`,
    );
    const author = mock.fn(async (authorRequest) =>
      authorResult(authorRequest),
    );
    const result = await runExplainerCore(fixture.request, {
      planSet: async (plannerRequest) => {
        const plan = plannedSet(plannerRequest);
        if (coverageFailure === 'omitted') {
          plan.sourceIds = ['project'];
        }
        for (const artifact of plan.portfolio) {
          artifact.sourceIds = ['project'];
        }
        return plan;
      },
      author,
      now: () => NOW,
    });

    assert.equal(result.outcome, 'failed', coverageFailure);
    assert.equal(result.errors[0].code, 'E_SET_PLAN', coverageFailure);
    assert.equal(author.mock.callCount(), 0, coverageFailure);
  }
});

test('mixed expansion set keeps D1 paths and D8 identity across reject, edit, and resume', async () => {
  const fixture = await suppliedFixture('project-recap');
  const interactiveRequest = { ...fixture.request, mode: 'interactive' };
  const author = mock.fn(async (authorRequest) => authorResult(authorRequest));
  const planSet = mock.fn(async (plannerRequest) => {
    const sourceIds = plannerRequest.factBase.sources.map(({ id }) => id);
    const optional = (
      artifactId,
      artifactType,
      profileId,
      rationale,
      kind = 'source-backed-detail',
    ) => ({
      artifactId,
      artifactType,
      profileId,
      required: false,
      sourceIds,
      draft: `Compose the planned ${artifactId}.`,
      visualIntent: `Give ${artifactId} a distinct visual purpose.`,
      justification: {
        kind,
        sourceIds,
        rationale,
      },
    });
    return plannedSet(plannerRequest, [
      ...plannedSet(plannerRequest).portfolio,
      optional(
        'architecture-details',
        'explainer',
        'deep-dive',
        'Architecture details warrant a dedicated page.',
      ),
      optional(
        'audit-details',
        'explainer',
        'deep-dive',
        'The audit flow warrants a dedicated source-backed explanation.',
      ),
    ]);
  });

  const rejected = await runExplainerCore(interactiveRequest, {
    author,
    planSet,
    now: () => NOW,
    reviewedSource: {
      decision: 'reject',
      reviewedAt: NOW,
      reviewer: 'operator',
      corrections: ['Tighten the floor and diagram copy.'],
    },
  });
  assert.equal(rejected.outcome, 'incomplete', JSON.stringify(rejected.errors));
  assert.equal(author.mock.callCount(), 5);
  const approvalPath = join(rejected.runRoot, 'source/content-approval.json');
  const rejectedApproval = JSON.parse(await readFile(approvalPath, 'utf8'));
  assert.equal(rejectedApproval.artifacts.length, 5);
  assert.equal(
    rejectedApproval.artifacts.every(({ authorResultPath }) =>
      authorResultPath?.startsWith('source/author/'),
    ),
    true,
  );
  await access(
    join(
      rejected.runRoot,
      'site/explainers/project-recap-demo/architecture-details/index.html',
    ),
  );
  await access(
    join(
      rejected.runRoot,
      'site/explainers/project-recap-demo/audit-details/index.html',
    ),
  );
  const hubPath = join(
    rejected.runRoot,
    'site/initiatives/project-recap-demo/index.html',
  );

  const floorPath = join(rejected.runRoot, 'source/content/project-recap.html');
  const diagramPath = join(
    rejected.runRoot,
    'source/content/architecture.html',
  );
  await writeFile(
    floorPath,
    (await readFile(floorPath, 'utf8')).replace(
      'A concise authored artifact.',
      'A reviewed project recap.',
    ),
  );
  await writeFile(
    diagramPath,
    (await readFile(diagramPath, 'utf8')).replace(
      'A concise authored artifact.',
      'A reviewed architecture artifact.',
    ),
  );

  const resumed = await runExplainerCore(interactiveRequest, {
    author,
    planSet,
    now: () => '2026-07-17T20:05:00Z',
    reviewedSource: {
      decision: 'approve',
      reviewedAt: '2026-07-17T20:05:00Z',
      reviewer: 'operator',
      resumeToken: rejected.approval.resumeToken,
    },
  });
  assert.equal(
    resumed.outcome,
    'built-not-durable',
    JSON.stringify(resumed.errors),
  );
  assert.equal(author.mock.callCount(), 5, 'resume must not re-invoke author');
  assert.equal(
    planSet.mock.callCount(),
    1,
    'resume must not re-invoke planner',
  );
  const approved = JSON.parse(await readFile(approvalPath, 'utf8'));
  assert.deepEqual(approved.artifacts, rejectedApproval.artifacts);
  const manifest = JSON.parse(await readFile(resumed.manifestPath, 'utf8'));
  assert.deepEqual(
    manifest.source.authorResultPaths,
    rejectedApproval.artifacts.map(({ authorResultPath }) => authorResultPath),
  );
  assert.deepEqual(
    manifest.artifacts.map(({ id, renderedPath }) => ({ id, renderedPath })),
    [
      {
        id: 'project-recap',
        renderedPath: 'site/initiatives/project-recap-demo/index.html',
      },
      {
        id: 'architecture',
        renderedPath:
          'site/diagrams/project-recap-demo/architecture/index.html',
      },
      {
        id: 'deck',
        renderedPath: 'site/decks/project-recap-demo/deck/index.html',
      },
      {
        id: 'architecture-details',
        renderedPath:
          'site/explainers/project-recap-demo/architecture-details/index.html',
      },
      {
        id: 'audit-details',
        renderedPath:
          'site/explainers/project-recap-demo/audit-details/index.html',
      },
    ],
  );
  for (const artifact of rejectedApproval.artifacts) {
    const retained = JSON.parse(
      await readFile(join(resumed.runRoot, artifact.authorResultPath), 'utf8'),
    );
    assert.equal(retained.artifactId, artifact.artifactId);
  }
  for (const artifact of manifest.artifacts) {
    assert.equal(
      artifact.hash,
      `sha256:${createHash('sha256')
        .update(await readFile(join(resumed.runRoot, artifact.renderedPath)))
        .digest('hex')}`,
    );
  }
  assert.match(await readFile(hubPath, 'utf8'), /A reviewed project recap\./);
  assert.match(
    await readFile(
      join(
        resumed.runRoot,
        'site/diagrams/project-recap-demo/architecture/index.html',
      ),
      'utf8',
    ),
    /A reviewed architecture artifact\./,
  );
});

test('resume rejects retained set-plan, identity, and path tampering before callbacks', async () => {
  const mutations = [
    [
      'set-plan request',
      'source/set-plan/request.json',
      (record) => {
        record.factBaseHash = `sha256:${'b'.repeat(64)}`;
      },
    ],
    [
      'set-plan result',
      'source/set-plan/result.json',
      (record) => {
        record.portfolio[0].draft = 'Tampered result draft.';
      },
    ],
    [
      'set-plan ledger',
      'source/set-plan/ledger.json',
      (record) => {
        record.planId = 'tampered-plan';
      },
    ],
    [
      'set-plan portfolio',
      'source/set-plan/portfolio.json',
      (record) => {
        record.artifacts[0].visualIntent = 'Tampered visual intent.';
      },
    ],
    [
      'set-plan drafts',
      'source/set-plan/drafts.json',
      (record) => {
        record.drafts[0].draft = 'Tampered projection draft.';
      },
    ],
    [
      'approval artifact identity',
      'source/content-approval.json',
      (record) => {
        record.artifacts[0].artifactId = 'tampered-artifact';
      },
    ],
    [
      'approval author path',
      'source/content-approval.json',
      (record) => {
        record.artifacts[0].authorResultPath =
          'source/author/tampered-artifact.json';
        record.authorResultPaths[0] = 'source/author/tampered-artifact.json';
      },
    ],
    [
      'approval content path',
      'source/content-approval.json',
      (record) => {
        record.artifacts[0].contentPath =
          'source/content/tampered-artifact.html';
      },
    ],
    [
      'retained author identity',
      'source/author/project-recap.json',
      (record) => {
        record.artifactId = 'tampered-artifact';
      },
    ],
  ];

  for (const [label, relativePath, mutate] of mutations) {
    const fixture = await suppliedFixture('project-recap');
    const interactiveRequest = { ...fixture.request, mode: 'interactive' };
    const planSet = mock.fn(async (plannerRequest) =>
      plannedSet(plannerRequest),
    );
    const author = mock.fn(async (authorRequest) =>
      authorResult(authorRequest),
    );
    const rejected = await runExplainerCore(interactiveRequest, {
      planSet,
      author,
      now: () => NOW,
      reviewedSource: {
        decision: 'reject',
        reviewedAt: NOW,
        reviewer: 'operator',
        corrections: ['Review the retained draft.'],
      },
    });
    assert.equal(rejected.outcome, 'incomplete', label);
    assert.equal(planSet.mock.callCount(), 1, label);
    assert.equal(author.mock.callCount(), 3, label);

    const path = join(rejected.runRoot, relativePath);
    const record = JSON.parse(await readFile(path, 'utf8'));
    mutate(record);
    await writeFile(path, `${JSON.stringify(record, null, 2)}\n`);

    const resumed = await runExplainerCore(interactiveRequest, {
      planSet,
      author,
      now: () => '2026-07-17T20:05:00Z',
      reviewedSource: {
        decision: 'approve',
        reviewedAt: '2026-07-17T20:05:00Z',
        reviewer: 'operator',
        resumeToken: rejected.approval.resumeToken,
      },
    });

    assert.equal(resumed.outcome, 'failed', label);
    assert.equal(resumed.errors[0].code, 'E_APPROVAL_RESUME', label);
    assert.equal(planSet.mock.callCount(), 1, label);
    assert.equal(author.mock.callCount(), 3, label);
  }
});

test('external resume token rejects coordinated retained set-plan tampering before callbacks', async () => {
  const fixture = await suppliedFixture('project-recap');
  const interactiveRequest = {
    ...fixture.request,
    mode: 'interactive',
    durability: { strategy: 'commit' },
  };
  const planSet = mock.fn(async (plannerRequest) => plannedSet(plannerRequest));
  const author = mock.fn(async (authorRequest) => authorResult(authorRequest));
  const durability = mock.fn(async () => {});
  const publish = mock.fn(async () => {});
  const rejected = await runExplainerCore(interactiveRequest, {
    planSet,
    author,
    now: () => NOW,
    reviewedSource: {
      decision: 'reject',
      reviewedAt: NOW,
      reviewer: 'operator',
      corrections: ['Review the retained draft.'],
    },
  });
  assert.equal(rejected.outcome, 'incomplete');
  assert.equal(planSet.mock.callCount(), 1);
  assert.equal(author.mock.callCount(), 3);

  const paths = {
    request: 'source/set-plan/request.json',
    result: 'source/set-plan/result.json',
    portfolio: 'source/set-plan/portfolio.json',
    drafts: 'source/set-plan/drafts.json',
  };
  const records = Object.fromEntries(
    await Promise.all(
      Object.entries(paths).map(async ([key, path]) => [
        key,
        JSON.parse(await readFile(join(rejected.runRoot, path), 'utf8')),
      ]),
    ),
  );
  records.result.portfolio[0].draft = 'Coordinated tampered draft.';
  records.request.planHash = canonicalHash(records.result);
  records.portfolio.artifacts = records.result.portfolio;
  records.drafts.drafts = records.result.portfolio.map(
    ({ artifactId, draft, visualIntent, justification }) => ({
      artifactId,
      draft,
      visualIntent,
      ...(justification && { justification }),
    }),
  );
  await Promise.all(
    Object.entries(paths).map(([key, path]) =>
      writeFile(
        join(rejected.runRoot, path),
        `${JSON.stringify(records[key], null, 2)}\n`,
      ),
    ),
  );

  const resumed = await runExplainerCore(interactiveRequest, {
    planSet,
    author,
    durability,
    publish,
    now: () => '2026-07-17T20:05:00Z',
    reviewedSource: {
      decision: 'approve',
      reviewedAt: '2026-07-17T20:05:00Z',
      reviewer: 'operator',
      resumeToken: rejected.approval.resumeToken,
    },
  });

  assert.equal(resumed.outcome, 'failed');
  assert.equal(resumed.errors[0].code, 'E_APPROVAL_RESUME');
  assert.equal(planSet.mock.callCount(), 1);
  assert.equal(author.mock.callCount(), 3);
  assert.equal(durability.mock.callCount(), 0);
  assert.equal(publish.mock.callCount(), 0);
});

test('authors cannot mutate the validated portfolio with expansion proposals', async () => {
  const fixture = await suppliedFixture('project-recap');
  const proposals = Array.from({ length: 5 }, (_, index) => ({
    id: `diagram-${index + 1}`,
    profileId: 'supporting-diagram',
    rationale: `Diagram ${index + 1} isolates one architectural concern.`,
  }));
  const result = await runExplainerCore(fixture.request, {
    author: async (authorRequest) =>
      authorResult(authorRequest, {
        ...(authorRequest.artifactId === 'project-recap' && {
          proposedArtifacts: proposals,
        }),
      }),
    now: () => NOW,
  });

  assert.equal(result.outcome, 'failed');
  assert.equal(result.errors[0].code, 'E_AUTHOR_RESULT');
  assert.match(
    result.errors[0].message,
    /cannot change the validated set plan/,
  );
});

test('editorial and render QA findings warn in both modes while DOM safety throws E_QA', async () => {
  for (const mode of ['interactive', 'unattended']) {
    const fixture = await suppliedFixture('project-recap');
    const result = await runExplainerCore(
      { ...fixture.request, mode },
      {
        author: async (authorRequest) => authorResult(authorRequest),
        now: () => NOW,
        ...(mode === 'interactive' && {
          reviewedSource: {
            decision: 'approve',
            reviewedAt: NOW,
            reviewer: 'operator',
          },
        }),
      },
    );
    assert.notEqual(result.outcome, 'failed', mode);
    assert.ok(result.warnings.includes('render-qa-skipped-no-probe'), mode);
    assert.ok(
      result.warnings.includes('guideline-narrative-coverage-missing'),
      mode,
    );
    assert.ok(
      result.warnings.includes('guideline-structured-depth-missing'),
      mode,
    );
    assert.equal(
      result.warnings.includes('guideline-architecture-diagram-missing'),
      false,
      mode,
    );
    const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
    assert.ok(manifest.warnings.includes('render-qa-skipped-no-probe'), mode);
    assert.deepEqual(
      manifest.artifacts.map(({ id }) => id),
      ['project-recap', 'architecture', 'deck'],
    );
  }

  const unsafeFixture = await suppliedFixture('project-recap');
  const unsafe = await runExplainerCore(unsafeFixture.request, {
    author: async (authorRequest) => {
      const result = authorResult(authorRequest);
      if (authorRequest.artifactId === 'architecture') {
        result.content.html = result.content.html.replace(
          '<script>',
          '<script>window.intrusion = true;</script><script>',
        );
      }
      return result;
    },
    now: () => NOW,
  });
  assert.equal(unsafe.outcome, 'failed');
  assert.equal(unsafe.errors[0].code, 'E_QA');
});

test('authors must return the declared content path and source dumping fails QA', async () => {
  const invalidFixture = await suppliedFixture('project-recap');
  const invalid = await runExplainerCore(invalidFixture.request, {
    author: async (authorRequest) =>
      authorRequest.artifactId === 'project-recap'
        ? authorResult(authorRequest, {
            content: { markdown: '# Wrong content path' },
          })
        : authorResult(authorRequest),
    now: () => NOW,
  });
  assert.equal(invalid.outcome, 'failed');
  assert.equal(invalid.errors[0].code, 'E_AUTHOR_RESULT');
  await assert.rejects(
    access(join(invalid.runRoot, 'source/content/project-recap.html')),
  );

  const dumpFixture = await suppliedFixture('project-recap');
  const dumpFactBase = suppliedFactBase();
  const dumpedProse =
    'The archive verifier checks every immutable retained input and provenance hash before deleting the active project so operators can retry safely after any mismatch.';
  dumpFactBase.claims[0].text = dumpedProse;
  await writeFile(
    dumpFixture.factBasePath,
    `${JSON.stringify(dumpFactBase, null, 2)}\n`,
  );
  const dumped = await runExplainerCore(dumpFixture.request, {
    author: async (authorRequest) => {
      const result = authorResult(authorRequest);
      if (authorRequest.artifactId === 'project-recap') {
        result.content.html = result.content.html.replace(
          'Authored artifact.',
          Array.from({ length: 200 }, () => dumpedProse).join(' '),
        );
      }
      return result;
    },
    now: () => NOW,
  });
  assert.equal(dumped.outcome, 'failed');
  assert.equal(dumped.errors[0].code, 'E_QA');
  await access(join(dumped.runRoot, 'source/content/project-recap.html'));
});

test('author provenance is bound to trusted caller context, not self-asserted', async () => {
  const trusted = {
    authorId: 'lifecycle-recap-author',
    method: 'provider-neutral-module',
  };
  const provenanceOf = async (result) =>
    JSON.parse(
      await readFile(
        join(result.runRoot, 'source/author/project-recap.json'),
        'utf8',
      ),
    ).provenance;

  // Matching context: identity and method survive, time comes from the clock.
  const matching = await suppliedFixture('project-recap');
  const bound = await runExplainerCore(matching.request, {
    author: async (authorRequest) =>
      authorResult(authorRequest, {
        provenance: { ...trusted, generatedAt: NOW },
      }),
    authorProvenance: trusted,
    now: () => NOW,
  });
  assert.equal(
    bound.outcome,
    'built-needs-review',
    JSON.stringify(bound.errors),
  );
  assert.deepEqual(await provenanceOf(bound), {
    ...trusted,
    generatedAt: NOW,
    trust: 'caller-bound',
  });

  // A spoofed identity is a hard error rather than a retained claim.
  for (const spoofed of [
    { authorId: 'someone-else', method: trusted.method },
    { authorId: trusted.authorId, method: 'hand-written' },
  ]) {
    const fixture = await suppliedFixture('project-recap');
    const result = await runExplainerCore(fixture.request, {
      author: async (authorRequest) =>
        authorResult(authorRequest, {
          provenance: { ...spoofed, generatedAt: NOW },
        }),
      authorProvenance: trusted,
      now: () => NOW,
    });
    assert.equal(result.outcome, 'failed', JSON.stringify(spoofed));
    assert.equal(result.errors[0].code, 'E_AUTHOR_PROVENANCE');
    assert.match(
      result.errors[0].message,
      /does not match the trusted caller context/,
    );
  }

  // A backdated claim never reaches the hash-pinned record.
  const backdated = await suppliedFixture('project-recap');
  const stamped = await runExplainerCore(backdated.request, {
    author: async (authorRequest) =>
      authorResult(authorRequest, {
        provenance: { ...trusted, generatedAt: '2019-01-01T00:00:00.000Z' },
      }),
    authorProvenance: trusted,
    now: () => NOW,
  });
  assert.equal(
    stamped.outcome,
    'built-needs-review',
    JSON.stringify(stamped.errors),
  );
  assert.deepEqual(await provenanceOf(stamped), {
    ...trusted,
    generatedAt: NOW,
    trust: 'caller-bound',
  });

  // A callback may not claim to be caller-bound.
  const forged = await suppliedFixture('project-recap');
  const rejected = await runExplainerCore(forged.request, {
    author: async (authorRequest) =>
      authorResult(authorRequest, {
        provenance: { ...trusted, generatedAt: NOW, trust: 'caller-bound' },
      }),
    authorProvenance: trusted,
    now: () => NOW,
  });
  assert.equal(rejected.outcome, 'failed');
  assert.equal(rejected.errors[0].code, 'E_AUTHOR_PROVENANCE');
  assert.match(
    rejected.errors[0].message,
    /must not assert a provenance trust/,
  );

  // Without trusted context the retained record says so rather than implying
  // an authenticated identity.
  const untrusted = await suppliedFixture('project-recap');
  const selfAsserted = await runExplainerCore(untrusted.request, {
    author: async (authorRequest) =>
      authorResult(authorRequest, {
        provenance: {
          authorId: 'anyone',
          generatedAt: '2019-01-01T00:00:00.000Z',
        },
      }),
    now: () => NOW,
  });
  assert.equal(
    selfAsserted.outcome,
    'built-needs-review',
    JSON.stringify(selfAsserted.errors),
  );
  assert.deepEqual(await provenanceOf(selfAsserted), {
    authorId: 'anyone',
    generatedAt: NOW,
    trust: 'self-asserted',
  });
});

test('a malformed trusted provenance context fails the run loudly', async () => {
  const fixture = await suppliedFixture('project-recap');
  const result = await runExplainerCore(fixture.request, {
    author: async (authorRequest) => authorResult(authorRequest),
    authorProvenance: { method: 'module' },
    now: () => NOW,
  });

  assert.equal(result.outcome, 'failed');
  assert.equal(result.errors[0].code, 'E_AUTHOR_PROVENANCE');
});

test('CLI resolves an explicit author module without persisting executable callbacks', async () => {
  const fixture = await suppliedFixture('project-recap');
  const requestPath = join(fixture.cwd, 'request.json');
  const authorModulePath = join(fixture.cwd, 'author.mjs');
  await writeFile(requestPath, `${JSON.stringify(fixture.request, null, 2)}\n`);
  await writeFile(
    authorModulePath,
    `export default async function author(request) {
      const sections = (request.floor?.requiredNarrative ?? [])
        .map((id) => \`<section id="\${id}"><h2>\${id}</h2><p>Validated evidence.</p></section>\`)
        .join('');
      const replacements = {
        THEME_CSS: '',
        TITLE: \`CLI-authored \${request.artifactId}\`,
        DESCRIPTION: 'A concise retained narrative.',
        EYEBROW: 'Explainer Kit',
        NAVIGATION: '',
        CONTENT: sections,
        FOOTER: 'Authored from validated evidence.',
        DIAGRAM:
          '<g id="as-built-architecture" class="node"><rect x="20" y="20" width="200" height="80"></rect><text x="40" y="65">Architecture</text></g>',
        LEGEND: '<span>Architecture</span>',
        SLIDES:
          '<section id="outcome" class="slide"><div class="slide__content"><h1>Outcome</h1><p>Validated.</p></div></section>'
      };
      let html = request.shell;
      for (const [token, value] of Object.entries(replacements)) {
        html = html.replaceAll(\`{{\${token}}}\`, value);
      }
      return {
        schemaVersion: 'explainer-kit.author-result/v2',
        artifactId: request.artifactId,
        content: { html },
        provenance: {
          authorId: 'cli-fixture-author',
          generatedAt: '${NOW}',
          method: 'module'
        }
      };
    }\n`,
  );
  const logs = [];

  const exitCode = await runExplainerCli(
    ['--request', requestPath, '--author-module', authorModulePath],
    { log: (value) => logs.push(value) },
  );

  assert.equal(exitCode, 0, logs.join('\n'));
  const result = JSON.parse(logs.at(-1));
  assert.equal(result.outcome, 'built-needs-review');
  const persistedRequest = await readFile(
    join(result.runRoot, 'run-request.json'),
    'utf8',
  );
  assert.doesNotMatch(persistedRequest, /author-module|author\.mjs/);
  const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
  assert.deepEqual(
    manifest.source.authorResultPaths,
    ['project-recap', 'architecture', 'deck'].map(
      (artifactId) => `source/author/${artifactId}.json`,
    ),
  );
  for (const artifactId of ['project-recap', 'architecture', 'deck']) {
    const retained = JSON.parse(
      await readFile(
        join(result.runRoot, `source/author/${artifactId}.json`),
        'utf8',
      ),
    );
    assert.equal(retained.artifactId, artifactId);
    assert.equal(retained.provenance.authorId, 'cli-fixture-author');
    await access(join(result.runRoot, `source/content/${artifactId}.html`));
  }
});

test('runs both canonical recipes config-free from directories without .oat files', async () => {
  for (const recipe of ['project-explainer', 'project-recap']) {
    const fixture = await suppliedFixture(recipe);
    await assert.rejects(access(join(fixture.cwd, '.oat')));

    const critic = mock.fn(() => {
      throw new Error('supplied runs must not invoke the critic');
    });
    const result = await runExplainer(fixture.request, {
      critic,
      now: () => NOW,
    });

    assert.equal(
      result.outcome,
      recipe === 'project-recap'
        ? 'built-needs-review'
        : 'built-not-durable',
    );
    assert.equal(critic.mock.callCount(), 0);
    const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
    const record = JSON.parse(await readFile(result.buildRecordPath, 'utf8'));
    const theme = JSON.parse(
      await readFile(join(result.runRoot, 'theme.resolved.json'), 'utf8'),
    );
    assert.equal(validateContract('build-record', record).valid, true);
    assert.equal(
      validateContract('manifest', manifest, {
        buildRecord: record,
        theme,
        runRequest: fixture.request,
      }).valid,
      true,
    );
    assert.equal(manifest.recipe.id, recipe);
    assert.equal(
      manifest.artifacts.every(({ status }) => status === 'built'),
      true,
    );
    for (const relativePath of [
      'run-request.json',
      'source/content-approval.json',
    ]) {
      assert.equal(
        manifest.immutableHashes[relativePath],
        `sha256:${createHash('sha256')
          .update(await readFile(join(result.runRoot, relativePath)))
          .digest('hex')}`,
        relativePath,
      );
    }
    assert.doesNotMatch(
      await readFile(join(result.runRoot, 'run-request.json'), 'utf8'),
      /Private transient direction/,
    );
  }
});

test('reusing a completed slug starts a clean independent run', async () => {
  const fixture = await suppliedFixture();
  const first = await runExplainer(fixture.request, { now: () => NOW });

  const second = await runExplainer(fixture.request, {
    now: () => '2026-07-17T21:00:00Z',
  });

  assert.equal(first.outcome, 'built-not-durable');
  assert.equal(
    second.outcome,
    'built-not-durable',
    JSON.stringify(second.errors),
  );
  assert.notEqual(second.runId, first.runId);
  const manifest = JSON.parse(await readFile(second.manifestPath, 'utf8'));
  assert.equal(manifest.runId, second.runId);
});

test('brief-aware author can route tagged program claims to matching narrative sections', async () => {
  const fixture = await suppliedFixture('program-recap');
  const taggedFactBase = suppliedFactBase();
  taggedFactBase.claims = [
    {
      ...taggedFactBase.claims[0],
      id: 'shared',
      text: 'Shared program context.',
    },
    {
      ...taggedFactBase.claims[0],
      id: 'overview',
      text: 'Program overview only.',
      sections: ['program-overview'],
    },
    {
      ...taggedFactBase.claims[0],
      id: 'outcomes',
      text: 'Per-wave outcomes only.',
      sections: ['per-wave-outcomes'],
    },
  ];
  taggedFactBase.unresolvedClaims = [
    {
      id: 'follow-up',
      text: 'Owner confirmation is pending.',
      reason: 'needs-confirmation',
      citations: [{ sourceId: 'project', locator: 'approved-project.md:2' }],
      sections: ['follow-up-ledger'],
    },
  ];
  assert.equal(validateContract('fact-base', taggedFactBase).valid, true);
  await writeFile(
    fixture.factBasePath,
    `${JSON.stringify(taggedFactBase, null, 2)}\n`,
  );

  const result = await runExplainer(
    { ...fixture.request, mode: 'interactive' },
    {
      author: async (authorRequest) => {
        const global = authorRequest.factBase.claims
          .filter(({ sections }) => !sections)
          .map(({ text }) => text);
        const markdown = authorRequest.floor.requiredNarrative
          .map((id) => {
            const matched = authorRequest.factBase.claims
              .filter(({ sections }) => sections?.includes(id))
              .map(({ text }) => text);
            const unresolved = authorRequest.factBase.unresolvedClaims
              .filter(({ sections }) => sections?.includes(id))
              .map(({ text }) => `Needs confirmation: ${text}`);
            return `## ${humanize(id)}\n\n${[...global, ...matched, ...unresolved].join(' ')}`;
          })
          .join('\n\n');
        return {
          ...authorResult(authorRequest),
          content: { markdown: `# Program recap\n\n${markdown}\n` },
        };
      },
      now: () => NOW,
      reviewedSource: {
        decision: 'approve',
        reviewedAt: NOW,
        reviewer: 'fixture-reviewer',
      },
    },
  );

  assert.equal(
    result.outcome,
    'built-not-durable',
    JSON.stringify(result.errors),
  );
  const markdown = await readFile(
    join(result.runRoot, 'source/content/program-recap.md'),
    'utf8',
  );
  const headings = [...markdown.matchAll(/^## (.+)$/gm)];
  const sections = new Map(
    headings.map((heading, index) => [
      heading[1],
      markdown
        .slice(
          heading.index + heading[0].length,
          headings[index + 1]?.index ?? markdown.length,
        )
        .trim(),
    ]),
  );
  assert.match(sections.get('Program Overview'), /Shared program context/);
  assert.match(sections.get('Program Overview'), /Program overview only/);
  assert.doesNotMatch(
    sections.get('Program Overview'),
    /Per-wave outcomes only/,
  );
  assert.equal(sections.get('Wave Map'), 'Shared program context.');
  assert.match(sections.get('Per Wave Outcomes'), /Shared program context/);
  assert.match(sections.get('Per Wave Outcomes'), /Per-wave outcomes only/);
  assert.doesNotMatch(
    sections.get('Per Wave Outcomes'),
    /Program overview only/,
  );
  assert.match(sections.get('Follow Up Ledger'), /Shared program context/);
  assert.match(
    sections.get('Follow Up Ledger'),
    /Needs confirmation: Owner confirmation is pending/,
  );
});

test('federates explicit sources and invokes only the provider-neutral critic seam', async () => {
  const cwd = await temporaryDirectory();
  const outputRoot = join(cwd, 'output');
  const sourcePath = join(cwd, 'source.json');
  await writeFile(
    sourcePath,
    JSON.stringify({
      claims: [{ id: 'status', text: 'The implementation is ready.' }],
    }),
  );
  const critic = mock.fn(async (criticRequest) => {
    assert.equal('provider' in criticRequest, false);
    assert.equal('command' in criticRequest, false);
    return { criticId: 'integration-critic', executedAt: NOW, findings: [] };
  });

  const result = await runExplainer(
    {
      ...request({
        outputRoot,
        factBasePath: sourcePath,
      }),
      factBase: {
        mode: 'federated',
        freshnessPolicy: 'live-wins',
        sources: [
          {
            id: 'project',
            kind: 'file',
            locator: sourcePath,
            role: 'project',
            sourceSetId: 'project-demo',
          },
        ],
      },
    },
    { critic, now: () => NOW },
  );

  assert.equal(critic.mock.callCount(), 1);
  const factBase = JSON.parse(
    await readFile(join(result.runRoot, 'source/fact-base.json'), 'utf8'),
  );
  assert.equal(factBase.mode, 'federated');
  assert.equal(factBase.sources.at(-1).id, 'critic:integration-critic');
});

test('enforces project-recap source-set cardinality while allowing multiple documents in one set', async () => {
  const cwd = await temporaryDirectory();
  const sourceLoader = async (source) => ({
    claims: [{ id: source.id, text: `Claim from ${source.id}.` }],
  });
  const base = request({
    outputRoot: join(cwd, 'output'),
    factBasePath: join(cwd, 'unused.json'),
    recipe: 'project-recap',
  });
  const source = (id, sourceSetId) => ({
    id,
    kind: 'file',
    locator: join(cwd, `${id}.json`),
    role: 'project',
    sourceSetId,
  });

  const rejected = await runExplainer(
    {
      ...base,
      factBase: {
        mode: 'federated',
        freshnessPolicy: 'live-wins',
        sources: [source('plan-a', 'project-a'), source('plan-b', 'project-b')],
      },
    },
    {
      now: () => NOW,
      sourceLoader,
      critic: async () => ({
        criticId: 'source-set-critic',
        executedAt: NOW,
        findings: [],
      }),
    },
  );
  assert.equal(rejected.outcome, 'failed');
  assert.match(rejected.errors[0].message, /at most 1 binding/i);

  const allowed = await runExplainer(
    {
      ...base,
      slug: 'same-project-set',
      factBase: {
        mode: 'federated',
        freshnessPolicy: 'live-wins',
        sources: [
          source('plan', 'project-a'),
          source('implementation', 'project-a'),
        ],
      },
    },
    {
      now: () => NOW,
      sourceLoader,
      critic: async () => ({
        criticId: 'source-set-critic',
        executedAt: NOW,
        findings: [],
      }),
    },
  );
  assert.equal(allowed.outcome, 'built-needs-review');
});

test('confines atomic package writes from symlinked site, content, nested ancestors, and targets', async () => {
  for (const scenario of ['site', 'source-content', 'nested-slug', 'target']) {
    const fixture = await suppliedFixture();
    const outside = await temporaryDirectory('explainer-run-outside-');
    const runRoot = join(fixture.outputRoot, fixture.request.slug);

    if (scenario === 'site') {
      const seeded = await runExplainer(fixture.request, { now: () => NOW });
      assert.equal(seeded.outcome, 'built-not-durable');
      await rm(join(runRoot, 'site'), { recursive: true });
      await symlink(outside, join(runRoot, 'site'));
    }

    const result = await runExplainer(fixture.request, {
      now: () => NOW,
      hooks: {
        async beforeStage(stage) {
          if (scenario === 'source-content' && stage === 'content') {
            await symlink(outside, join(runRoot, 'source/content'));
          }
          if (scenario === 'nested-slug' && stage === 'render') {
            await mkdir(join(runRoot, 'site/initiatives'), { recursive: true });
            await symlink(
              outside,
              join(runRoot, 'site/initiatives/project-explainer-demo'),
            );
          }
          if (scenario === 'target' && stage === 'render') {
            const targetParent = join(
              runRoot,
              'site/initiatives/project-explainer-demo',
            );
            await mkdir(targetParent, { recursive: true });
            await symlink(
              join(outside, 'escaped.html'),
              join(targetParent, 'index.html'),
            );
          }
        },
      },
    });

    assert.equal(result.outcome, 'failed', scenario);
    assert.match(
      result.errors[0].message,
      /symlink|confined|ancestor/i,
      scenario,
    );
    assert.deepEqual(await readdir(outside), [], scenario);
  }
});

test('retains successful intermediates and a privacy-safe build record after a pre-approval failure', async () => {
  const fixture = await suppliedFixture();
  const result = await runExplainer(fixture.request, {
    now: () => NOW,
    hooks: {
      beforeStage(stage) {
        if (stage === 'render') throw new Error('seeded renderer failure');
      },
    },
  });

  assert.equal(result.outcome, 'failed');
  await access(join(result.runRoot, 'source/fact-base.json'));
  await access(join(result.runRoot, 'source/content/project-explainer.md'));
  await access(join(result.runRoot, 'theme.resolved.json'));
  const recordText = await readFile(result.buildRecordPath, 'utf8');
  const record = JSON.parse(recordText);
  assert.equal(
    record.stages.find(({ id }) => id === 'render').status,
    'failed',
  );
  assert.match(recordText, /seeded renderer failure/);
  assert.doesNotMatch(recordText, /Private transient direction/);
  await assert.rejects(
    access(result.manifestPath),
    { code: 'ENOENT' },
    'a manifest cannot satisfy immutable approval coverage before the relocated gate',
  );
});

test('records failures at each processing stage and leaves later stages pending', async () => {
  for (const stage of ['fact-base', 'content', 'theme', 'render', 'qa']) {
    const fixture = await suppliedFixture();
    const result = await runExplainer(fixture.request, {
      now: () => NOW,
      hooks: {
        beforeStage(current) {
          if (current === stage) throw new Error(`seeded ${stage} failure`);
        },
      },
    });
    const record = JSON.parse(await readFile(result.buildRecordPath, 'utf8'));
    const failedIndex = record.stages.findIndex(({ id }) => id === stage);

    assert.equal(result.outcome, 'failed', stage);
    assert.equal(record.stages[failedIndex].status, 'failed', stage);
    assert.equal(
      record.stages
        .slice(failedIndex + 1)
        .every(({ status }) => status === 'pending'),
      true,
      stage,
    );
    if (failedIndex > 1) {
      await access(join(result.runRoot, 'source/fact-base.json'));
    }
    if (failedIndex > 2) {
      await access(join(result.runRoot, 'source/content/project-explainer.md'));
    }
    if (failedIndex > 3) {
      await access(join(result.runRoot, 'theme.resolved.json'));
    }
  }
});

test('rejects invalid requests and recipes before creating the output root', async () => {
  const cwd = await temporaryDirectory();
  const outputRoot = join(cwd, 'must-not-exist');
  const invalid = request({
    outputRoot,
    factBasePath: join(cwd, 'facts.json'),
  });

  await assert.rejects(
    runExplainer({ ...invalid, schemaVersion: 'explainer-kit.run-request/v2' }),
    /E_INPUT_SCHEMA|schema/i,
  );
  await assert.rejects(
    runExplainer({
      ...invalid,
      recipe: { id: 'future-recap', version: '1' },
    }),
    /unsupported recipe/i,
  );
  await assert.rejects(access(outputRoot));
});

test('stops discovery after two empty rounds and never exceeds the recipe maximum', async () => {
  const emptyFixture = await suppliedFixture();
  const emptyRounds = mock.fn(async () => []);
  const emptyResult = await runExplainer(emptyFixture.request, {
    now: () => NOW,
    discover: emptyRounds,
  });
  assert.equal(emptyRounds.mock.callCount(), 2);
  assert.equal(emptyResult.discovery.rounds, 2);
  assert.equal(emptyResult.discovery.reason, 'two-empty-rounds');

  const maxFixture = await suppliedFixture('project-recap');
  const findingsForever = mock.fn(async ({ round }) => [`finding-${round}`]);
  const maxResult = await runExplainer(maxFixture.request, {
    now: () => NOW,
    discover: findingsForever,
  });
  assert.equal(findingsForever.mock.callCount(), 8);
  assert.equal(maxResult.discovery.rounds, 8);
  assert.equal(maxResult.discovery.reason, 'hard-maximum');
});

test('invokes durability and publishing seams only when explicitly requested', async () => {
  const noneFixture = await suppliedFixture();
  const durability = mock.fn(async () => ({ outcome: 'built-durable' }));
  const publish = mock.fn(async () => ({ outcome: 'built-durable' }));
  await runExplainer(noneFixture.request, {
    now: () => NOW,
    durability,
    publish,
  });
  assert.equal(durability.mock.callCount(), 0);
  assert.equal(publish.mock.callCount(), 0);

  const commitFixture = await suppliedFixture();
  await runExplainer(
    {
      ...commitFixture.request,
      durability: { strategy: 'commit' },
    },
    { now: () => NOW, durability },
  );
  assert.equal(durability.mock.callCount(), 1);

  const publishFixture = await suppliedFixture();
  await runExplainer(
    {
      ...publishFixture.request,
      durability: {
        strategy: 'publish',
        publish: {
          schemaVersion: 'explainer-kit.publish-request/v1',
          provider: 's3-static',
          s3Uri: 's3://example-bucket/explainers',
          publicBaseUrl: 'https://docs.example.com/explainers',
          awsRegion: 'us-east-1',
          siteRoot: join(
            publishFixture.outputRoot,
            'project-explainer-demo/site',
          ),
          manifestPath: join(
            publishFixture.outputRoot,
            'project-explainer-demo/manifest.json',
          ),
        },
      },
    },
    { now: () => NOW, publish },
  );
  assert.equal(publish.mock.callCount(), 1);
});
