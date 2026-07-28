import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateContract } from '../scripts/lib/contracts.mjs';
import { verifyRebuildability } from '../scripts/lib/durability.mjs';

const tempDirs = [];
const skillRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

test('rejects a seeded false rebuildable claim and restores the output', async () => {
  const runRoot = await mkdtemp(join(tmpdir(), 'explainer-rebuild-release-'));
  tempDirs.push(runRoot);
  await mkdir(join(runRoot, 'source'), { recursive: true });
  await mkdir(join(runRoot, 'site'), { recursive: true });
  await writeFile(join(runRoot, 'source/content.md'), '# Approved source\n');
  await writeFile(join(runRoot, 'site/index.html'), '<h1>Original</h1>\n');

  const sourceHash = await fileHash(join(runRoot, 'source/content.md'));
  const outputHash = await fileHash(join(runRoot, 'site/index.html'));
  const artifact = {
    id: 'seeded-false-claim',
    type: 'hub',
    contentPath: 'source/content.md',
    renderedPath: 'site/index.html',
    mediaType: 'text/html',
    status: 'built',
    hash: outputHash,
    rebuildable: true,
    rebuild: {
      argv: [
        process.execPath,
        '-e',
        "require('node:fs').writeFileSync('site/index.html', '<h1>Different</h1>\\n')",
      ],
      cwd: '.',
      inputHashes: { 'source/content.md': sourceHash },
    },
  };

  const result = await verifyRebuildability(artifact, runRoot);

  assert.equal(result.verified, false);
  assert.match(result.reason, /replay hash/i);
  assert.equal(await fileHash(join(runRoot, 'source/content.md')), sourceHash);
  assert.equal(await fileHash(join(runRoot, 'site/index.html')), outputHash);
});

test('rejects a rebuildable claim when a hashed source changes', async () => {
  const runRoot = await mkdtemp(join(tmpdir(), 'explainer-rebuild-input-'));
  tempDirs.push(runRoot);
  await mkdir(join(runRoot, 'source'), { recursive: true });
  await mkdir(join(runRoot, 'site'), { recursive: true });
  await writeFile(join(runRoot, 'source/content.md'), '# Before\n');
  await writeFile(join(runRoot, 'site/index.html'), '<h1>Original</h1>\n');
  const sourceHash = await fileHash(join(runRoot, 'source/content.md'));
  const outputHash = await fileHash(join(runRoot, 'site/index.html'));
  await writeFile(join(runRoot, 'source/content.md'), '# After\n');

  const result = await verifyRebuildability(
    {
      id: 'changed-source-hash',
      renderedPath: 'site/index.html',
      hash: outputHash,
      rebuildable: true,
      rebuild: {
        argv: [
          process.execPath,
          '-e',
          "require('node:fs').writeFileSync('site/index.html', '<h1>Original</h1>\\n')",
        ],
        cwd: '.',
        inputHashes: { 'source/content.md': sourceHash },
      },
    },
    runRoot,
  );

  assert.equal(result.verified, false);
  assert.match(result.reason, /input hash/i);
});

test('bundles self-contained visual authoring and review guidance', async () => {
  const [skill, authoring, review] = await Promise.all([
    readFile(join(skillRoot, 'SKILL.md'), 'utf8'),
    readFile(join(skillRoot, 'references/visual-authoring.md'), 'utf8'),
    readFile(join(skillRoot, 'references/visual-review.md'), 'utf8'),
  ]);

  assert.match(skill, /^version: 2\.0\.2$/m);
  assert.match(skill, /references\/visual-authoring\.md/);
  assert.match(skill, /references\/visual-review\.md/);
  for (const [name, guidance] of [
    ['authoring', authoring],
    ['review', review],
  ]) {
    assert.doesNotMatch(
      guidance,
      /\/Users\/|~\/|\.agents\/skills\/visual-explainer/,
    );
    assert.match(guidance, /optional/i, name);
  }
  for (const topic of [
    /representation/i,
    /hierarchy/i,
    /diagram/i,
    /deck/i,
    /table/i,
    /responsive navigation/i,
  ]) {
    assert.match(authoring, topic);
  }
  assert.match(review, /first viewport/i);
  assert.match(review, /medium fit/i);
  assert.match(review, /pass|correct|fail/i);
});

test('requires every retained set-plan record in recap immutable coverage', () => {
  const hash = `sha256:${'a'.repeat(64)}`;
  const setPlanPaths = [
    'source/set-plan/request.json',
    'source/set-plan/result.json',
    'source/set-plan/ledger.json',
    'source/set-plan/portfolio.json',
    'source/set-plan/drafts.json',
  ];
  const manifest = {
    schemaVersion: 'explainer-kit.manifest/v1',
    runId: 'run-1',
    slug: 'project-recap',
    recipe: { id: 'project-recap', version: '1' },
    createdAt: '2026-07-17T20:00:00Z',
    source: {
      factBasePath: 'source/fact-base.json',
      factBaseHash: hash,
      inputHashes: {},
    },
    theme: {
      path: 'theme.resolved.json',
      hash,
      derived: false,
    },
    artifacts: [],
    immutableHashes: Object.fromEntries(
      [
        'run-request.json',
        'source/content-approval.json',
        'source/fact-base.json',
        'source/fact-base.md',
        'theme.resolved.json',
        ...setPlanPaths,
      ].map((path) => [path, hash]),
    ),
    outcome: 'built-not-durable',
    buildRecord: { path: 'build-record.json', hash },
    warnings: [],
  };

  assert.equal(validateContract('manifest', manifest).valid, true);
  assert.equal(
    Object.keys(manifest.immutableHashes).some((path) =>
      path.includes('resume-token'),
    ),
    false,
    'the external resume token must not become a persisted trust anchor',
  );
  delete manifest.immutableHashes[setPlanPaths.at(-1)];
  assert.ok(
    validateContract('manifest', manifest).errors.some(
      ({ code }) => code === 'immutable-package-incomplete',
    ),
  );
});

async function fileHash(path) {
  return `sha256:${createHash('sha256')
    .update(await readFile(path))
    .digest('hex')}`;
}
