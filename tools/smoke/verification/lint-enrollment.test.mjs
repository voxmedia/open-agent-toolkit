import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '../../..');

test('root lint commands cover tools/smoke and reject a smoke violation', async () => {
  const packageManifest = JSON.parse(
    await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
  );
  assert.equal(
    packageManifest.scripts.lint,
    'turbo run lint && pnpm exec oxlint tools/smoke',
  );
  assert.equal(
    packageManifest.scripts['lint:fix'],
    'turbo run lint:fix && pnpm exec oxlint --fix tools/smoke',
  );

  const seedPath = resolve(
    repositoryRoot,
    `tools/smoke/lint-seed-${process.pid}.mjs`,
  );
  await writeFile(
    seedPath,
    'let seededSmokeViolation = 1;\nconsole.log(seededSmokeViolation);\n',
  );
  try {
    await assert.rejects(
      execFileAsync('pnpm', ['lint'], {
        cwd: repositoryRoot,
        env: { ...process.env, FORCE_COLOR: '0' },
      }),
      (error) => {
        const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
        assert.match(output, new RegExp(basename(seedPath), 'u'));
        assert.match(output, /prefer-const/u);
        return true;
      },
    );
  } finally {
    await unlink(seedPath);
  }
});
