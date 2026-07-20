import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { validateContract } from '../../explainer-kit/scripts/lib/contracts.mjs';
import {
  EXPLAINER_CONFIG_KEYS,
  resolveExplainerConfig,
  toExplainerRunRequest,
} from '../scripts/resolve-config.mjs';
import { resolveExplainerOutputRoot } from '../scripts/resolve-paths.mjs';

const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function fixture() {
  const repoRoot = await mkdtemp(join(tmpdir(), 'oat-explainer-adapter-'));
  tempDirs.push(repoRoot);
  await mkdir(join(repoRoot, '.oat/projects/shared/demo'), { recursive: true });
  await mkdir(join(repoRoot, '.oat/projects/local/private'), {
    recursive: true,
  });
  await writeFile(join(repoRoot, 'shared-theme.json'), '{}\n');
  return repoRoot;
}

function configGetter(entries = {}) {
  const calls = [];
  return {
    calls,
    get: async (key) => {
      calls.push(key);
      const entry = entries[key] ?? {
        value:
          key === 'explainers.defaults.palette'
            ? 'neutral'
            : key === 'explainers.defaults.visualProfile'
              ? 'clean'
              : key.startsWith('workflow.')
                ? 'ask'
                : null,
        source: 'default',
      };
      return { status: 'ok', key, ...entry };
    },
  };
}

test('reads every supported value and source through oat config get --json', async () => {
  const repoRoot = await fixture();
  const getter = configGetter({
    'explainers.defaults.palette': { value: 'ocean', source: 'user' },
    'explainers.defaults.visualProfile': {
      value: 'editorial',
      source: 'shared',
    },
    'explainers.defaults.themeBundlePath': {
      value: 'shared-theme.json',
      source: 'shared',
    },
  });

  const resolved = await resolveExplainerConfig({
    repoRoot,
    getConfig: getter.get,
  });

  assert.deepEqual(getter.calls, [...EXPLAINER_CONFIG_KEYS]);
  assert.equal(resolved.sources['explainers.defaults.palette'], 'user');
  assert.equal(
    resolved.sources['explainers.defaults.themeBundlePath'],
    'shared',
  );
  assert.equal(
    resolved.theme.suppliedBundlePath,
    await realpath(join(repoRoot, 'shared-theme.json')),
  );
  assert.deepEqual(resolved.warnings, [
    'explainers.defaults.themeBundlePath overrides configured palette and visual profile.',
  ]);
});

test('applies only allowed runtime overrides without mutating CLI results', async () => {
  const repoRoot = await fixture();
  const stored = {
    'explainers.defaults.palette': { value: 'neutral', source: 'shared' },
  };
  const getter = configGetter(stored);

  const resolved = await resolveExplainerConfig({
    repoRoot,
    getConfig: getter.get,
    runtimeOverrides: {
      'explainers.defaults.palette': 'sunset',
      'explainers.publish.provider': 's3-static',
      'explainers.publish.s3Uri': 's3://runtime-bucket/explainers/',
      'explainers.publish.publicBaseUrl':
        'https://runtime.example.com/explainers/',
      'explainers.publish.awsRegion': 'us-west-2',
    },
  });

  assert.equal(stored['explainers.defaults.palette'].value, 'neutral');
  assert.equal(resolved.theme.palette, 'sunset');
  assert.equal(resolved.sources['explainers.defaults.palette'], 'runtime');
  assert.equal(resolved.publish.s3Uri, 's3://runtime-bucket/explainers');
  await assert.rejects(
    resolveExplainerConfig({
      repoRoot,
      getConfig: getter.get,
      runtimeOverrides: { outputRoot: '/tmp/not-configurable' },
    }),
    /unsupported runtime override.*outputRoot/i,
  );
});

test('validates publish fields as one cross-field block', async () => {
  const repoRoot = await fixture();
  const getter = configGetter({
    'explainers.publish.provider': {
      value: 's3-static',
      source: 'shared',
    },
    'explainers.publish.s3Uri': {
      value: 's3://example-bucket/explainers',
      source: 'shared',
    },
  });

  await assert.rejects(
    resolveExplainerConfig({ repoRoot, getConfig: getter.get }),
    /publicBaseUrl.*awsRegion/i,
  );

  const buildOnly = await resolveExplainerConfig({
    repoRoot,
    getConfig: configGetter({
      'explainers.publish.s3Uri': {
        value: 's3://ignored-without-provider',
        source: 'shared',
      },
    }).get,
  });
  assert.equal(buildOnly.publish, null);
});

test('derives active shared/local and fixed non-project output roots', async () => {
  const repoRoot = await fixture();
  const canonicalRepoRoot = await realpath(repoRoot);

  assert.equal(
    await resolveExplainerOutputRoot({
      repoRoot,
      invocation: 'project',
      activeProject: '.oat/projects/shared/demo',
    }),
    join(canonicalRepoRoot, '.oat/projects/shared/demo/explainers'),
  );
  assert.equal(
    await resolveExplainerOutputRoot({
      repoRoot,
      invocation: 'project',
      activeProject: '.oat/projects/local/private',
    }),
    join(canonicalRepoRoot, '.oat/projects/local/private/explainers'),
  );
  assert.equal(
    await resolveExplainerOutputRoot({ repoRoot, invocation: 'repo' }),
    join(canonicalRepoRoot, '.oat/repo/reference/explainers'),
  );
});

test('requires direct callers to supply their own output root', async () => {
  const repoRoot = await fixture();
  const canonicalRepoRoot = await realpath(repoRoot);
  await assert.rejects(
    resolveExplainerOutputRoot({ repoRoot, invocation: 'direct' }),
    /direct.*explicit outputRoot/i,
  );
  assert.equal(
    await resolveExplainerOutputRoot({
      repoRoot,
      invocation: 'direct',
      outputRoot: join(repoRoot, 'direct-output'),
    }),
    join(canonicalRepoRoot, 'direct-output'),
  );
});

test('rejects traversal and symlink ancestors that escape the repository', async () => {
  const repoRoot = await fixture();
  const outside = await mkdtemp(join(tmpdir(), 'oat-explainer-outside-'));
  tempDirs.push(outside);
  await writeFile(join(outside, 'theme.json'), '{}\n');
  await symlink(outside, join(repoRoot, '.oat/projects/shared/escaped'));

  await assert.rejects(
    resolveExplainerOutputRoot({
      repoRoot,
      invocation: 'project',
      activeProject: '../outside',
    }),
    /traversal|outside/i,
  );
  await assert.rejects(
    resolveExplainerOutputRoot({
      repoRoot,
      invocation: 'project',
      activeProject: '.oat/projects/shared/escaped',
    }),
    /symlink|outside/i,
  );

  const getter = configGetter({
    'explainers.defaults.themeBundlePath': {
      value: '.oat/projects/shared/escaped/theme.json',
      source: 'shared',
    },
  });
  await assert.rejects(
    resolveExplainerConfig({ repoRoot, getConfig: getter.get }),
    /themeBundlePath.*outside|symlink/i,
  );
  await assert.rejects(
    resolveExplainerConfig({
      repoRoot,
      getConfig: configGetter({
        'explainers.defaults.themeBundlePath': {
          value: join(repoRoot, 'shared-theme.json'),
          source: 'shared',
        },
      }).get,
    }),
    /shared config must be repository-relative/i,
  );
});

test('translates source-aware config into ExplainerRunRequestV1', async () => {
  const repoRoot = await fixture();
  const resolved = await resolveExplainerConfig({
    repoRoot,
    getConfig: configGetter({
      'explainers.defaults.palette': { value: 'ocean', source: 'local' },
      'explainers.defaults.visualProfile': {
        value: 'technical',
        source: 'user',
      },
      'explainers.publish.provider': {
        value: 's3-static',
        source: 'shared',
      },
      'explainers.publish.s3Uri': {
        value: 's3://example-bucket/explainers',
        source: 'shared',
      },
      'explainers.publish.publicBaseUrl': {
        value: 'https://docs.example.com/explainers',
        source: 'shared',
      },
      'explainers.publish.awsRegion': {
        value: 'us-east-1',
        source: 'shared',
      },
      'explainers.publish.awsProfile': {
        value: 'developer',
        source: 'local',
      },
    }).get,
  });
  const outputRoot = await resolveExplainerOutputRoot({
    repoRoot,
    invocation: 'project',
    activeProject: '.oat/projects/shared/demo',
  });

  const request = toExplainerRunRequest({
    resolvedConfig: resolved,
    recipe: 'project-explainer',
    slug: 'demo-project',
    outputRoot,
    factBase: {
      mode: 'federated',
      freshnessPolicy: 'live-wins',
      sources: [
        {
          id: 'plan',
          kind: 'file',
          locator: join(repoRoot, '.oat/projects/shared/demo/plan.md'),
          role: 'plan',
          sourceSetId: 'demo',
        },
      ],
    },
    mode: 'unattended',
    durabilityStrategy: 'publish',
    artDirection: 'Use compact technical diagrams',
  });

  assert.deepEqual(request, {
    schemaVersion: 'explainer-kit.run-request/v1',
    recipe: { id: 'project-explainer', version: '1' },
    slug: 'demo-project',
    outputRoot,
    factBase: {
      mode: 'federated',
      freshnessPolicy: 'live-wins',
      sources: [
        {
          id: 'plan',
          kind: 'file',
          locator: join(repoRoot, '.oat/projects/shared/demo/plan.md'),
          role: 'plan',
          sourceSetId: 'demo',
        },
      ],
    },
    theme: {
      palette: 'ocean',
      visualProfile: 'technical',
      artDirection: 'Use compact technical diagrams',
    },
    durability: {
      strategy: 'publish',
      publish: {
        schemaVersion: 'explainer-kit.publish-request/v1',
        provider: 's3-static',
        s3Uri: 's3://example-bucket/explainers',
        publicBaseUrl: 'https://docs.example.com/explainers',
        awsRegion: 'us-east-1',
        awsProfile: 'developer',
        siteRoot: join(outputRoot, 'demo-project/site'),
        manifestPath: join(outputRoot, 'demo-project/manifest.json'),
      },
    },
    privacy: { retainRawArtDirection: false },
    mode: 'unattended',
  });
  assert.deepEqual(validateContract('run-request', request), {
    valid: true,
    errors: [],
  });
});
