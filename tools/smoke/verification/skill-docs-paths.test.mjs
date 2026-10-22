import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import { findStaleSkillDocsPaths } from './skill-docs-paths.mjs';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

test('skill tests reference existing repository docs pages', async () => {
  const stale = await findStaleSkillDocsPaths(repositoryRoot);
  assert.deepEqual(
    stale,
    [],
    stale
      .map(
        ({ testPath, line, docsPath }) =>
          `${testPath}:${line}: stale docs path ${docsPath}`,
      )
      .join('\n'),
  );
});

test('a moved docs page names the stale test reference and clears after repair', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'oat-skill-docs-paths-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const testPath = '.agents/skills/example/tests/nested/contract.test.mjs';
  const oldPath = 'apps/oat-docs/docs/reference/old.md';
  const newPath = 'apps/oat-docs/docs/reference/current.md';
  await mkdir(dirname(join(root, testPath)), { recursive: true });
  await mkdir(dirname(join(root, oldPath)), { recursive: true });
  await writeFile(join(root, oldPath), '# Reference\n');
  await writeFile(
    join(root, testPath),
    `// A literal file read\nreadFile('../../../../${oldPath}');\n`,
  );
  // Captured fixture prose is not an executable test dependency.
  await writeFile(
    join(root, '.agents/skills/example/tests/history.md'),
    '`apps/oat-docs/docs/deleted.md`',
  );
  assert.deepEqual(await findStaleSkillDocsPaths(root), []);
  await rename(join(root, oldPath), join(root, newPath));
  assert.deepEqual(await findStaleSkillDocsPaths(root), [
    { testPath, line: 2, docsPath: oldPath },
  ]);
  await writeFile(
    join(root, testPath),
    `readFile('../../../../${newPath}');\n`,
  );
  assert.deepEqual(await findStaleSkillDocsPaths(root), []);
});
