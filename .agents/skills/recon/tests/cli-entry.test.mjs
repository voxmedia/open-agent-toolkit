import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, test } from 'node:test';
import { pathToFileURL } from 'node:url';

const scriptsRoot = resolve('.agents/skills/recon/scripts');
const executables = [
  'validate-artifact.mjs',
  'create-review-brief.mjs',
  'validate-packet.mjs',
  'render-packet.mjs',
  'prepare-routing.mjs',
  'reconcile-ledger.mjs',
];
const temporaryRoots = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

for (const executable of executables) {
  test(`${executable} executes through canonical and symlink paths but not on import`, async () => {
    const canonical = join(scriptsRoot, executable);
    const root = await mkdtemp(join(tmpdir(), 'recon-cli-entry-'));
    temporaryRoots.push(root);
    const linked = join(root, executable);
    await symlink(canonical, linked);

    for (const entry of [canonical, linked]) {
      const result = spawnSync(process.execPath, [entry], { encoding: 'utf8' });
      assert.notEqual(result.status, 0, `${entry} silently exited zero`);
      assert.notEqual(
        result.stderr.trim(),
        '',
        `${entry} emitted no diagnostic`,
      );
    }

    const imported = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `import(${JSON.stringify(pathToFileURL(canonical).href)})`,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(imported.status, 0, imported.stderr);
    assert.equal(imported.stdout, '');
    assert.equal(imported.stderr, '');
  });
}

test('an unresolved unrelated host entry imports every CLI without side effects', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recon-cli-import-host-'));
  temporaryRoots.push(root);
  const moduleUrls = executables.map(
    (executable) => pathToFileURL(join(scriptsRoot, executable)).href,
  );
  const imported = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `process.argv[1] = ${JSON.stringify(join(root, 'missing-host.mjs'))}; await Promise.all(${JSON.stringify(moduleUrls)}.map((moduleUrl) => import(moduleUrl)));`,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, '');
  assert.equal(imported.stderr, '');
});
