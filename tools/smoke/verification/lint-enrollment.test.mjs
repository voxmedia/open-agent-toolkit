import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '../../..');

test('root lint commands cover tools/smoke and skill scripts and reject violations', async () => {
  const packageManifest = JSON.parse(
    await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
  );
  assert.equal(
    packageManifest.scripts.lint,
    'turbo run lint && pnpm exec oxlint tools/smoke .agents/skills',
  );
  assert.equal(
    packageManifest.scripts['lint:fix'],
    'turbo run lint:fix && pnpm exec oxlint --fix tools/smoke .agents/skills',
  );
  // `turbo run lint` reaches packages/control-plane only while it keeps a
  // `lint` script; deleting it would silently drop that package's oxlint.
  const controlPlaneManifest = JSON.parse(
    await readFile(
      resolve(repositoryRoot, 'packages/control-plane/package.json'),
      'utf8',
    ),
  );
  assert.equal(typeof controlPlaneManifest.scripts?.lint, 'string');
  assert.match(controlPlaneManifest.scripts.lint, /\boxlint\b/u);
  // `turbo run check` (pnpm check, the CI gate) skipped the package until it
  // defined `check`; `check:fix` keeps `pnpm check:fix` able to repair it.
  assert.equal(typeof controlPlaneManifest.scripts?.check, 'string');
  assert.match(controlPlaneManifest.scripts.check, /\boxlint\b/u);
  assert.match(controlPlaneManifest.scripts.check, /oxfmt --check \./u);
  assert.equal(typeof controlPlaneManifest.scripts?.['check:fix'], 'string');
  assert.match(controlPlaneManifest.scripts['check:fix'], /oxfmt \./u);

  const seedPath = resolve(
    repositoryRoot,
    `tools/smoke/lint-seed-${process.pid}.mjs`,
  );
  const skillSeedPath = resolve(
    repositoryRoot,
    `.agents/skills/lint-seed-${process.pid}.mjs`,
  );
  await writeFile(
    seedPath,
    'let seededSmokeViolation = 1;\nconsole.log(seededSmokeViolation);\n',
  );
  await writeFile(
    skillSeedPath,
    'let seededSkillViolation = 1;\nconsole.log(seededSkillViolation);\n',
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
        assert.match(output, new RegExp(basename(skillSeedPath), 'u'));
        assert.match(output, /prefer-const/u);
        return true;
      },
    );
  } finally {
    await unlink(seedPath);
    await unlink(skillSeedPath);
  }
});
