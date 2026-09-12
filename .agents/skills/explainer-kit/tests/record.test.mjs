import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateContract } from '../scripts/lib/contracts.mjs';
import { enforceRunPackageInventory } from '../scripts/lib/package-coverage.mjs';
import { runRecord } from '../scripts/record.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const checkedFixture = join(
  here,
  '..',
  '..',
  '..',
  '..',
  'packages',
  'cli',
  'src',
  'commands',
  'project',
  'archive',
  'fixtures',
  'v2-package',
);
const fixed = {
  runId: 'run-p01-t06-fixture',
  createdAt: '2026-09-11T03:45:00.000Z',
};
const REQUIRED_CHECKS = [
  'parse',
  'requiredNarrative',
  'structure',
  'sourceDumping',
  'shellScripts',
  'ledgerToPage',
  'pageToLedger',
];

async function copyFixture({ manifest = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'explainer-record-'));
  await cp(checkedFixture, root, { recursive: true });
  if (!manifest) await rm(join(root, 'manifest.json'), { force: true });
  return root;
}

async function writeQa(root, value) {
  await writeFile(
    join(root, 'qa', 'result.json'),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

async function currentArtifactHash(root) {
  return `sha256:${createHash('sha256')
    .update(await readFile(join(root, 'site', 'index.html')))
    .digest('hex')}`;
}

function checks(overrides = {}) {
  return Object.fromEntries(
    REQUIRED_CHECKS.map((id) => [id, overrides[id] ?? { status: 'pass' }]),
  );
}

function recordArgs(root, overrides = {}) {
  return [
    '--run-root',
    root,
    '--recipe',
    'project-recap',
    '--slug',
    'fixture-recap',
    '--mode',
    'unattended',
    '--theme',
    join(root, 'theme.resolved.json'),
    '--run-id',
    overrides.runId ?? fixed.runId,
    '--created-at',
    overrides.createdAt ?? fixed.createdAt,
  ];
}

async function packageFiles(root, relativeRoot = '') {
  const files = [];
  for (const entry of await readdir(join(root, relativeRoot), {
    withFileTypes: true,
  })) {
    const path = relativeRoot ? `${relativeRoot}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await packageFiles(root, path)));
    else files.push(path);
  }
  return files.sort();
}

test('record writes a schema-valid manifest with exact immutable coverage', async () => {
  const root = await copyFixture();
  const manifest = await runRecord(recordArgs(root), { log() {} });

  assert.equal(validateContract('manifest', manifest).valid, true);
  assert.deepEqual(
    Object.keys(manifest.immutableHashes).sort(),
    (await packageFiles(root)).filter((path) => path !== 'manifest.json'),
  );
  assert.equal(manifest.source.factBasePath, 'source/fact-base.json');
  assert.equal(manifest.theme.path, 'theme.resolved.json');
  await enforceRunPackageInventory(root, manifest);
});

test('record maps QA evidence to the four terminal outcomes', async (t) => {
  process.env.RECORD_TEST_PASSWORD = 'secret';
  process.env.RECORD_TEST_MODE = '1';
  t.after(() => {
    delete process.env.RECORD_TEST_PASSWORD;
    delete process.env.RECORD_TEST_MODE;
  });
  const scenarios = [
    {
      name: 'inspected host pass',
      qa: {
        rung: 'host',
        checks: checks(),
        screenshots: ['qa/320.png', 'qa/768.png', 'qa/1440.png'],
        visual: { verdict: 'pass', notes: 'inspected at all three widths' },
      },
      outcome: 'built',
    },
    {
      name: 'browser findings',
      qa: {
        rung: 'playwright',
        checks: checks(),
        screenshots: ['qa/320.png', 'qa/768.png', 'qa/1440.png'],
        visual: {
          verdict: 'findings',
          findings: ['viewport-overflow'],
        },
      },
      outcome: 'built-needs-review',
    },
    {
      name: 'no browser rung',
      qa: {
        rung: 'none',
        reason: 'runtime-unavailable',
        checks: checks(),
        visual: { verdict: 'none' },
      },
      outcome: 'built-needs-review',
    },
    {
      name: 'failed check',
      qa: {
        rung: 'none',
        reason: 'browser-free-check-failed',
        checks: checks({
          structure: {
            status: 'fail',
            cause: `E_STRUCTURE: failure token=${process.env.RECORD_TEST_PASSWORD}; exit=${process.env.RECORD_TEST_MODE}; paths [/Users/alice/private/key.pem], file:///Users/alice/private/key.pem, [C:\\Users\\alice\\private\\key.pem], file:///C:/Users/alice/private/key.pem, [\\\\server\\share\\private\\key.pem], file://server/share/private/key.pem; inspect structure`,
          },
        }),
        visual: { verdict: 'none' },
      },
      outcome: 'failed',
    },
  ];

  for (const scenario of scenarios) {
    const root = await copyFixture();
    if (scenario.qa.screenshots) {
      await mkdir(join(root, 'qa'), { recursive: true });
      for (const screenshot of scenario.qa.screenshots) {
        await writeFile(join(root, screenshot), 'png fixture');
      }
    }
    await writeQa(root, {
      artifactSha256: await currentArtifactHash(root),
      ...scenario.qa,
    });
    const manifest = await runRecord(recordArgs(root), { log() {} });
    assert.equal(manifest.outcome, scenario.outcome, scenario.name);
    assert.doesNotMatch(
      manifest.warnings.join(' '),
      /secret|Users|private|server|share|file:\/\//,
    );
    if (scenario.outcome === 'failed') {
      assert.match(manifest.warnings.join(' '), /E_STRUCTURE/);
      assert.match(manifest.warnings.join(' '), /exit=1/);
      assert.match(manifest.warnings.join(' '), /inspect structure/);
      assert.equal(manifest.warnings.join(' ').match(/<env>/g)?.length, 1);
      assert.equal(manifest.warnings.join(' ').match(/<path>/g)?.length, 6);
    }
  }

  const root = await copyFixture();
  await rm(join(root, 'qa', 'result.json'));
  assert.equal(
    (await runRecord(recordArgs(root), { log() {} })).outcome,
    'incomplete',
  );
});

test('record requires the exact verify check set and consistent QA metadata', async () => {
  for (const missing of REQUIRED_CHECKS) {
    const root = await copyFixture();
    const exactChecks = checks();
    delete exactChecks[missing];
    await writeQa(root, {
      artifactSha256: await currentArtifactHash(root),
      checks: exactChecks,
      rung: 'none',
      reason: 'browser-free',
      visual: { verdict: 'none' },
    });
    await assert.rejects(runRecord(recordArgs(root), { log() {} }), {
      code: 'record-qa-invalid',
    });
  }

  for (const qa of [
    {
      checks: { ...checks(), invented: { status: 'pass' } },
      rung: 'none',
      reason: 'browser-free',
      visual: { verdict: 'none' },
    },
    {
      checks: checks(),
      rung: 'none',
      visual: { verdict: 'pass' },
    },
    {
      checks: checks(),
      rung: 'host',
      visual: { verdict: 'pass', notes: 'inspected' },
    },
  ]) {
    const root = await copyFixture();
    await writeQa(root, {
      artifactSha256: await currentArtifactHash(root),
      ...qa,
    });
    await assert.rejects(runRecord(recordArgs(root), { log() {} }), {
      code: 'record-qa-invalid',
    });
  }
});

test('record rejects a pre-existing file outside the canonical package', async () => {
  const root = await copyFixture();
  await writeFile(join(root, 'self-authorized.txt'), 'must be rejected');
  await assert.rejects(runRecord(recordArgs(root), { log() {} }), {
    code: 'record-package-unexpected',
  });
});

test('record rejects stale QA and a pre-recording failure', async () => {
  const stale = await copyFixture();
  const qa = JSON.parse(
    await readFile(join(stale, 'qa', 'result.json'), 'utf8'),
  );
  qa.artifactSha256 =
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  await writeQa(stale, qa);
  await assert.rejects(runRecord(recordArgs(stale), { log() {} }), {
    code: 'record-qa-stale',
  });

  const failed = await copyFixture();
  await writeFile(
    join(failed, 'failure.json'),
    '{"stage":"authoring","cause":"interrupted"}\n',
  );
  await assert.rejects(runRecord(recordArgs(failed), { log() {} }), {
    code: 'record-failure-present',
  });
});

test('checked package is independently valid and reproducible byte-for-byte', async () => {
  const checkedManifest = JSON.parse(
    await readFile(join(checkedFixture, 'manifest.json'), 'utf8'),
  );
  assert.equal(validateContract('manifest', checkedManifest).valid, true);
  await enforceRunPackageInventory(checkedFixture, checkedManifest);

  const regenerated = await copyFixture();
  await runRecord(recordArgs(regenerated), { log() {} });
  for (const path of await packageFiles(checkedFixture)) {
    assert.deepEqual(
      await readFile(join(regenerated, path)),
      await readFile(join(checkedFixture, path)),
      path,
    );
  }
});
