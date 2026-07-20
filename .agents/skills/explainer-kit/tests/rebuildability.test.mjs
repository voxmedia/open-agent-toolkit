import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { verifyRebuildability } from '../scripts/lib/durability.mjs';

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(skillRoot, '../../..');
const tempDirs = [];

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

test('traces retained 0.4.1 operational wisdom to owned evidence', async () => {
  const trace = JSON.parse(
    await readFile(
      new URL('fixtures/operational-wisdom.json', import.meta.url),
      'utf8',
    ),
  );

  assert.equal(trace.schemaVersion, 'explainer-kit.operational-wisdom/v1');
  assert.equal(trace.sourceVersion, '0.4.1');
  assert.equal(trace.deterministicBaselineRenderingRequired, false);
  assert.ok(trace.entries.length >= 15);
  assert.equal(
    new Set(trace.entries.map(({ id }) => id)).size,
    trace.entries.length,
  );

  const dispositions = new Set();
  for (const entry of trace.entries) {
    assert.match(entry.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(entry.source.draft, /^references\/skill-drafts\//);
    assert.ok(entry.source.section.length > 0);
    assert.ok(entry.requirements.length > 0);
    assert.ok(entry.retainedBy.length > 0);
    dispositions.add(entry.disposition);

    await access(
      resolve(
        repoRoot,
        '.oat/projects/shared/explainer-kit',
        entry.source.draft,
      ),
    );
    for (const path of entry.retainedBy) {
      await access(resolve(repoRoot, path));
    }
  }

  assert.deepEqual(
    dispositions,
    new Set(['public-core', 'oat-adapter', 'private-wrapper']),
  );
});

async function fileHash(path) {
  return `sha256:${createHash('sha256')
    .update(await readFile(path))
    .digest('hex')}`;
}
