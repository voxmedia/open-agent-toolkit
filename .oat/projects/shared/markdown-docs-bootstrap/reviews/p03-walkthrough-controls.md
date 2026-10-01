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
