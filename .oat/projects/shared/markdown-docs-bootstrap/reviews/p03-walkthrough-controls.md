# p03 source-aware walkthrough controls

The p03-t01 source delta follows the verified CLI contracts. Run this JavaScript from repository root after `pnpm build`: save the block as `probe-p03.mjs` in a temporary directory, then `node <path>/probe-p03.mjs`. It creates isolated repositories and asserts fresh setup without app/package/docs-root AGENTS, populated refusal then additive adoption preserving incomplete context/local instructions, literal nested-root config, default-manifest refusal and accepted external manifest preserving the authored-index config, and declared framework conflict refusal. All controls passed on the branch build. Adoption advice points to analyze/apply; setup is not proof of full existing-content conformity.

```javascript
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const cli = join(process.cwd(), 'packages/cli/dist/index.js');
const base = mkdtempSync(join(tmpdir(), 'markdown-p03-'));
function repo(name) {
  const dir = join(base, name);
  mkdirSync(join(dir, '.oat'), { recursive: true });
  writeFileSync(join(dir, '.oat/config.json'), JSON.stringify({ version: 1 }));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}
function run(dir, args, want = 0) {
  const r = spawnSync(process.execPath, [cli, '--json', ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
  assert.equal(r.status, want, r.stdout + r.stderr);
  console.log(
    JSON.stringify({
      cwd: dir,
      command: [process.execPath, cli, '--json', ...args].join(' '),
      exit: r.status,
      result: r.stdout.trim(),
      stderr: r.stderr.trim(),
    }),
  );
  return JSON.parse(r.stdout);
}
const fresh = repo('fresh');
run(fresh, [
  'docs',
  'init',
  '--framework',
  'markdown',
  '--site-name',
  'Fresh Docs',
  '--yes',
]);
assert.equal(existsSync(join(fresh, 'docs/AGENTS.md')), false);
assert.equal(existsSync(join(fresh, 'package.json')), false);
const adopted = repo('adopted');
mkdirSync(join(adopted, 'docs/section'), { recursive: true });
writeFileSync(join(adopted, 'docs/index.md'), '# Existing audience context\n');
writeFileSync(join(adopted, 'docs/section/page.md'), '# Existing page\n');
writeFileSync(join(adopted, 'docs/AGENTS.md'), 'Local ownership guidance\n');
run(adopted, ['docs', 'init', '--framework', 'markdown', '--yes'], 1);
run(adopted, ['docs', 'init', '--framework', 'markdown', '--adopt', '--yes']);
assert.equal(
  readFileSync(join(adopted, 'docs/index.md'), 'utf8'),
  '# Existing audience context\n',
);
assert.equal(
  readFileSync(join(adopted, 'docs/AGENTS.md'), 'utf8'),
  'Local ownership guidance\n',
);
const nested = repo('nested');
mkdirSync(join(nested, 'handbook/docs'), { recursive: true });
writeFileSync(join(nested, 'handbook/page.md'), '# Parent page\n');
writeFileSync(join(nested, 'handbook/docs/index.md'), '# Nested section\n');
run(nested, [
  'docs',
  'init',
  '--framework',
  'markdown',
  '--target-dir',
  'handbook',
  '--adopt',
  '--yes',
]);
assert.equal(
  JSON.parse(readFileSync(join(nested, '.oat/config.json'))).documentation.root,
  'handbook',
);
run(nested, ['docs', 'generate-index'], 1);
run(nested, [
  'docs',
  'generate-index',
  '--docs-dir',
  'handbook',
  '--output',
  '.oat/docs-manifest.md',
]);
assert.equal(
  JSON.parse(readFileSync(join(nested, '.oat/config.json'))).documentation
    .index,
  'handbook/index.md',
);
const fw = repo('framework');
writeFileSync(
  join(fw, '.oat/config.json'),
  JSON.stringify({
    version: 1,
    documentation: {
      tooling: 'mkdocs',
      root: 'site',
      index: 'site/mkdocs.yml',
      config: 'site/mkdocs.yml',
    },
  }),
);
run(fw, ['docs', 'init', '--framework', 'markdown', '--yes'], 1);
console.log('walkthrough=pass base=' + base);
```

## Documented CLI example controls

Run after build from repository root. These prove documented adoption preview, real adoption/repeat convergence and managed-guidance partial outcomes against the built CLI, preserving observed config/content and existing root guidance. Full-tree dry-run assurance remains in p02 reproduction controls.

```javascript
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const cli = join(process.cwd(), 'packages/cli/dist/index.js'),
  repo = mkdtempSync(join(tmpdir(), 'markdown-p03-example-'));
spawnSync('git', ['init', '-q'], { cwd: repo });
mkdirSync(join(repo, '.oat'));
writeFileSync(join(repo, '.oat/config.json'), '{"version":1}');
mkdirSync(join(repo, 'handbook'));
writeFileSync(join(repo, 'handbook/page.md'), '# Useful existing page\n');
function snapshot() {
  return JSON.stringify(
    ['.oat', 'handbook'].flatMap((dir) =>
      readdirSync(join(repo, dir)).map((x) => [
        join(dir, x),
        readFileSync(join(repo, dir, x), 'utf8'),
      ]),
    ),
  );
}
function run(flags, want) {
  const args = [
    '--json',
    'docs',
    'init',
    '--framework',
    'markdown',
    '--target-dir',
    'handbook',
    ...flags,
    '--yes',
  ];
  const r = spawnSync(process.execPath, [cli, ...args], {
    cwd: repo,
    encoding: 'utf8',
  });
  assert.equal(r.status, want, r.stdout + r.stderr);
  const result = JSON.parse(r.stdout);
  console.log(
    JSON.stringify({
      cwd: repo,
      command: ['node', cli, ...args].join(' '),
      exit: r.status,
      status: result.status,
      dryRun: result.dryRun,
      changes: result.changes,
      guidance: result.guidance,
    }),
  );
  return result;
}
const before = snapshot();
run(['--adopt', '--dry-run'], 0);
assert.equal(snapshot(), before);
run(['--adopt'], 0);
const repeat = run(['--adopt'], 0);
assert.equal(repeat.changes.files.length, 0);
assert.equal(repeat.changes.config, false);
assert.equal(repeat.changes.guidance, false);
writeFileSync(
  join(repo, 'AGENTS.md'),
  '# Agents\n\n<!-- OAT docs -->\n## Documentation\n\nManual ownership guidance.\n<!-- END OAT docs -->\n',
);
const partialBefore = snapshot() + readFileSync(join(repo, 'AGENTS.md'));
const partial = run(['--adopt', '--dry-run'], 1);
assert.equal(partial.status, 'partial');
assert.equal(snapshot() + readFileSync(join(repo, 'AGENTS.md')), partialBefore);
console.log('examples=pass');
```

## Changed page metadata and relative link checks

This one-off checker validates authored metadata and actual relative destinations for the twelve changed source pages; it is not added to the automatic suite.

````javascript
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
const files = execFileSync('git', ['diff', '--name-only'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((x) => x.startsWith('apps/oat-docs/docs/') && x.endsWith('.md'));
let count = 0;
for (const file of files) {
  const source = readFileSync(file, 'utf8').replace(/^```[\s\S]*?^```/gm, '');
  assert.match(source, /^---\ntitle: .+\ndescription: .+\n---/);
  for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const link = match[1];
    if (/^(https?:|mailto:|#)/.test(link)) continue;
    const target = decodeURIComponent(link.split('#')[0]);
    assert(existsSync(resolve(dirname(file), target)), file + ': ' + link);
    count++;
  }
}
console.log(
  JSON.stringify({
    files: files.length,
    relativeTargetsVerified: count,
    metadata: 'pass',
  }),
);
````
