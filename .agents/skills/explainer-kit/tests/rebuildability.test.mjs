import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { verifyRebuildability } from '../scripts/lib/durability.mjs';

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

async function fileHash(path) {
  return `sha256:${createHash('sha256')
    .update(await readFile(path))
    .digest('hex')}`;
}
