# p04 bundled release controls

After `pnpm build`, save the JavaScript block to a temporary `.mjs` file and run it from repository root. Create `/tmp/oat-markdown-p04-evidence` for emitted isolated command result files first. This uses the production bundled resolver, compares canonical skill/resource/template bytes, and invokes real docs-pack install/update in isolated user/project roots. It verifies both baseline Markdown templates and supported restoration of a missing template directory, plus update from an older managed skill version. Normal user home/provider credentials remain unchanged; HOME is supplied only to each isolated tools-command subprocess. Observed 46 parity comparisons, all four real lifecycle commands exit 0, no publication.

```javascript
import assert from 'node:assert/strict';
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  readdir,
  rm,
} from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const repo = process.cwd();
const cli = join(repo, 'packages/cli/dist/index.js');
const { resolveAssetsRoot } = await import(
  pathToFileURL(join(repo, 'packages/cli/dist/fs/assets.js'))
);
const { resolveTemplateSource } = await import(
  pathToFileURL(
    join(repo, 'packages/cli/dist/commands/project/new/scaffold.js'),
  )
);
const assets = await resolveAssetsRoot({});
const root = await mkdtemp(join(tmpdir(), 'oat-markdown-p04-bundle-'));
const home = join(root, 'home'),
  project = join(root, 'project');
await mkdir(home);
await mkdir(project);
assert.equal(spawnSync('git', ['init', '--quiet', project]).status, 0);
const changed = [
  'oat-docs-bootstrap',
  'oat-docs-analyze',
  'oat-docs-apply',
  'oat-docs-authoring',
  'oat-project-document',
];
let parity = 0;
async function compareTree(source, dest) {
  for (const e of await readdir(source, { withFileTypes: true })) {
    if (e.name === 'tests') continue;
    const a = join(source, e.name),
      b = join(dest, e.name);
    if (e.isDirectory()) await compareTree(a, b);
    else {
      assert.deepEqual(await readFile(b), await readFile(a), relative(repo, a));
      parity++;
    }
  }
}
for (const name of changed)
  await compareTree(
    join(repo, '.agents/skills', name),
    join(assets, 'skills', name),
  );
for (const name of ['index.md', 'contributing.md']) {
  const p = await resolveTemplateSource(
    join(home, '.oat'),
    project,
    `docs-markdown/${name}`,
  );
  assert.equal(p, join(assets, 'templates/docs-markdown', name));
  assert.deepEqual(
    await readFile(p),
    await readFile(join(repo, '.oat/templates/docs-markdown', name)),
  );
  parity++;
}
function run(scope, action) {
  const args = [
    '--json',
    '--cwd',
    project,
    'tools',
    action,
    ...(action === 'install' ? ['docs'] : ['--pack', 'docs']),
    '--scope',
    scope,
    '--no-sync',
    ...(action === 'install' ? ['--no-project-guidance'] : []),
  ];
  const r = spawnSync(process.execPath, [cli, ...args], {
    env: { ...process.env, HOME: home, OAT_ASSETS_DIR: '' },
    encoding: 'utf8',
  });
  const label = `${scope}-${action}`;
  process.stdout.write(`${label} exit=${r.status}\n`);
  awaitableSave(label, r);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  JSON.parse(r.stdout);
}
function awaitableSave(label, r) {
  return writeFile(
    join('/tmp/oat-markdown-p04-evidence', `${label}.json`),
    r.stdout,
  );
}
for (const scope of ['user', 'project']) {
  run(scope, 'install');
  const dest = scope === 'user' ? home : project;
  for (const name of ['index.md', 'contributing.md'])
    assert.deepEqual(
      await readFile(join(dest, '.oat/templates/docs-markdown', name)),
      await readFile(join(repo, '.oat/templates/docs-markdown', name)),
    );
  for (const name of changed.filter((n) => n !== 'oat-project-document'))
    await compareTree(
      join(repo, '.agents/skills', name),
      join(dest, '.agents/skills', name),
    );
  // Managed skills update from an older declared version; missing template directories are seeded in both scopes.
  const skill = join(dest, '.agents/skills/oat-docs-bootstrap/SKILL.md');
  await writeFile(
    skill,
    (await readFile(skill, 'utf8')).replace('version: 1.3.0', 'version: 1.2.0'),
  );
  await rm(join(dest, '.oat/templates/docs-markdown'), { recursive: true });
  run(scope, 'update');
  assert.deepEqual(
    await readFile(skill),
    await readFile(join(repo, '.agents/skills/oat-docs-bootstrap/SKILL.md')),
  );
  for (const name of ['index.md', 'contributing.md'])
    assert.deepEqual(
      await readFile(join(dest, '.oat/templates/docs-markdown', name)),
      await readFile(join(repo, '.oat/templates/docs-markdown', name)),
    );
}
console.log(
  JSON.stringify(
    {
      assets,
      root,
      parityFiles: parity,
      controls:
        'bundle resolver plus real docs pack install/update user/project',
      status: 'pass',
    },
    null,
    2,
  ),
);
```
