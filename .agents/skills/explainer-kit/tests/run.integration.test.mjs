import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, mock, test } from 'node:test';

import { validateContract } from '../scripts/lib/contracts.mjs';
import { runExplainer } from '../scripts/run.mjs';

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

test('interactive runs pause after Markdown and do no downstream work before approval', async () => {
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
  assert.equal(publish.mock.callCount(), 0);
  assert.equal(durability.mock.callCount(), 0);
  await access(join(result.runRoot, 'source/content/project-explainer.md'));
  await assert.rejects(access(join(result.runRoot, 'theme.resolved.json')));
  await assert.rejects(access(join(result.runRoot, 'site')));
  const record = JSON.parse(await readFile(result.buildRecordPath, 'utf8'));
  assert.equal(
    record.stages.find(({ id }) => id === 'content').status,
    'passed',
  );
  assert.equal(
    record.stages.find(({ id }) => id === 'theme').status,
    'pending',
  );
});

test('rejection persists corrections and explicit approval resumes the same run', async () => {
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
  assert.equal(rejected.outcome, 'incomplete');
  assert.equal(rejected.approval.status, 'rejected');
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
    reviewedSource: {
      decision: 'approve',
      reviewedAt: '2026-07-17T20:05:00Z',
      reviewer: 'operator',
      source: {
        kind: 'human-review',
        locator: 'source/content/project-explainer.md',
      },
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

  assert.equal(result.outcome, 'built-not-durable');
  assert.equal(prompt.mock.callCount(), 0);
  const approval = JSON.parse(
    await readFile(
      join(result.runRoot, 'source/content-approval.json'),
      'utf8',
    ),
  );
  assert.equal(approval.status, 'approved');
  assert.deepEqual(approval.reviewedSource, reviewedSource);
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

    assert.equal(result.outcome, 'built-not-durable');
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
    assert.doesNotMatch(
      await readFile(join(result.runRoot, 'run-request.json'), 'utf8'),
      /Private transient direction/,
    );
  }
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
        sources: [{ id: 'project', kind: 'file', locator: sourcePath }],
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

test('retains successful intermediates and a privacy-safe failed record after a stage failure', async () => {
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
  const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
  assert.equal(manifest.outcome, 'failed');
  assert.equal(manifest.artifacts[0].status, 'failed');
  assert.equal(
    validateContract('manifest', manifest, { buildRecord: record }).valid,
    true,
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
      recipe: { id: 'program-recap', version: '1' },
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
