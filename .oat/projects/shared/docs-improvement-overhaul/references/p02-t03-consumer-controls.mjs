import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve('.');
const source = readFileSync('apps/oat-docs/scripts/validate.ts', 'utf8');
const tests = readFileSync('apps/oat-docs/tests/migration.test.ts', 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'oat-live-consumer-controls-'));
const hash = (text) => createHash('sha256').update(text).digest('hex');
const controls = [];
try {
  writeFileSync(join(scratch, 'package.json'), '{"type":"module"}');
  writeFileSync(join(scratch, 'migration.test.ts'), tests);
  writeFileSync(
    join(scratch, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        baseUrl: scratch,
        paths: {
          '@docs-tools/validate': [join(scratch, 'validate.ts')],
          '@oat-repo/nav-markdown': [
            join(root, 'packages/cli/src/commands/docs/nav/markdown.ts'),
          ],
        },
      },
    }),
  );
  const variants = [
    {
      name: 'guarded-valid-and-negative-controls',
      text: source,
      expectedExit: 0,
    },
    {
      name: 'neutralized-topic-target-guard',
      text: source.replace(
        '  await validateSourceTargets(docsRoot, targets);\n  return targets.length;',
        '  return targets.length;',
      ),
      expectedExit: 1,
      pattern: 'live skill topic paths',
    },
    {
      name: 'neutralized-hosted-route-guard',
      text: source.replace(
        /if \(present.length !== 1\)\s*throw new Error\([\s\S]*?\);/,
        "if (present.length !== 1) present.push(join(docsRoot, 'index.md'));",
      ),
      expectedExit: 1,
      pattern: 'hosted README stale routes',
    },
    {
      name: 'neutralized-fragment-guard',
      text: source.replace(
        '      fragment &&\n      target.endsWith',
        '      false && fragment &&\n      target.endsWith',
      ),
      expectedExit: 1,
      pattern: 'hosted README stale routes',
    },
    {
      name: 'restored-valid-and-negative-controls',
      text: source,
      expectedExit: 0,
    },
  ];
  for (const variant of variants) {
    if (variant.expectedExit) assert.notEqual(variant.text, source);
    writeFileSync(join(scratch, 'validate.ts'), variant.text);
    const args = ['--import', 'tsx', '--test'];
    if (variant.pattern) args.push('--test-name-pattern', variant.pattern);
    args.push(join(scratch, 'migration.test.ts'));
    const result = spawnSync(process.execPath, args, {
      cwd: root,
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: join(scratch, 'tsconfig.json'),
      },
      encoding: 'utf8',
    });
    const output = result.stdout + result.stderr;
    assert.equal(result.status, variant.expectedExit, output);
    if (variant.expectedExit)
      assert.match(output, /Missing expected rejection/, output);
    controls.push({
      name: variant.name,
      sourceSha256: hash(variant.text),
      command: [process.execPath, ...args],
      exit: result.status,
      output,
    });
  }
  process.stdout.write(
    `${JSON.stringify({ liveSourceSha256: hash(source), controls }, null, 2)}\n`,
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
