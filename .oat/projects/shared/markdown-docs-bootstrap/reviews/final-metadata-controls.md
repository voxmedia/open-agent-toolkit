# Final M1 metadata controls

Bounded p04-t03 fix at base `fea03cbdf8cf6cfb689f2a95ee11b9ce8bc1d8d0`; exact target `oat-phase-implementer-gpt-6-1-sol-high-3da8a37eed`, gpt-6.1-sol/high. Original phase base remains `7e8abb5b377ffc2f16d9576a0023e7a6cf4a46fd`. Recovery remains 0/10, pending null. Independent final re-review, exit gate and approval remain pending and root-owned.

## Contract and coverage

Only the Markdown resolver branch normalizes blank values before plans or writes. Nonblank supplied strings retain their original bytes. A null prompt result returns before normalization. Empty humanized repository titles use `Documentation`; a blank repository basename uses `this repository` in the description. Framework branches are unchanged.

One public-command regression exercises seven cases and reads generated YAML using the independent `yaml` parser with literal expected metadata. It covers the three observed bad inputs, valid punctuation/spacing, defaults, the already-supported empty description and an empty humanized title. Complete dry-run snapshots protect files, directories and symlinks; package bytes and unrelated config are checked after writes. Existing framework, unsafe-root, refusal and adoption protections remain in the direct ten-file suite. No helper-layer tests, module mocks or test hooks were added. This is a named prevention test for final M1, following deliberate-testing.

## Actual public CLI outcomes

Each row was accepted with exit 0 before and after; the fix substitutes meaningful metadata for blank inputs. Every case also passed a nonmutating dry-run, package/config preservation and byte-identical repeated adoption.

| Input                          | Before                      | After                                  |
| ------------------------------ | --------------------------- | -------------------------------------- |
| Empty title                    | Empty YAML title            | `Operator Handbook`                    |
| Whitespace title               | Whitespace YAML title       | `Operator Handbook`                    |
| Whitespace description         | Whitespace YAML description | `Documentation for operator-handbook.` |
| Valid spaced title/description | Exact supplied bytes        | Exact supplied bytes                   |
| No metadata inputs             | Repository defaults         | Same defaults                          |
| Exactly empty description      | Repository description      | Same description                       |
| Repository `___`               | Empty YAML title            | `Documentation`                        |

Baseline/fixed builds both exited 0 before their bundle-backed controls. Baseline CLI log: `/tmp/oat-markdown-final-fix-evidence/baseline-cli.log`; artifacts: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-final-metadata-before-h4gfex/metadata.json`. Fixed CLI log: `/tmp/oat-markdown-final-fix-evidence/fixed-cli.log`; artifacts: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-final-metadata-after-DWcffk/metadata.json`. Both probes exited 0 and retain exact subprocess arguments, returned JSON, authored pages and snapshots.

Run the probe against the old built CLI before replacing its build, then build the fixed CLI and use after mode. Optional third argument selects an absolute built CLI path. The before assertions deliberately require blank metadata for the observed bad cases; after assertions require literal meaningful metadata.

```bash
pnpm build > /tmp/oat-markdown-final-fix-evidence/baseline-build.log 2>&1
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
node /tmp/oat-markdown-final-fix-evidence/metadata-cli-controls.mjs before
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
# Apply the bounded resolver fix, then build before running after mode.
pnpm build > /tmp/oat-markdown-final-fix-evidence/fixed-build.log 2>&1
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
node /tmp/oat-markdown-final-fix-evidence/metadata-cli-controls.mjs after
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
```

Save the following exact public probe as `metadata-cli-controls.mjs`:

```javascript
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  readlink,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const mode = process.argv[2];
assert(['before', 'after'].includes(mode));
const cli = resolve(process.argv[3] ?? 'packages/cli/dist/index.js');
const { parse } = createRequire(cli)('yaml');
const base = await mkdtemp(join(tmpdir(), 'oat-final-metadata-' + mode + '-'));
const cases = [
  [
    'empty-title',
    ['--site-name', ''],
    'Operator Handbook',
    'Documentation for operator-handbook.',
  ],
  [
    'whitespace-title',
    ['--site-name', ' \t '],
    'Operator Handbook',
    'Documentation for operator-handbook.',
  ],
  [
    'whitespace-description',
    ['--site-name', 'Operations Guide', '--description', ' \t '],
    'Operations Guide',
    'Documentation for operator-handbook.',
  ],
  [
    'valid',
    [
      '--site-name',
      ' Operators: "Service" ',
      '--description',
      ' Runtime ownership and escalation ',
    ],
    ' Operators: "Service" ',
    ' Runtime ownership and escalation ',
  ],
  ['default', [], 'Operator Handbook', 'Documentation for operator-handbook.'],
  [
    'empty-description',
    ['--site-name', 'Operations Guide', '--description', ''],
    'Operations Guide',
    'Documentation for operator-handbook.',
  ],
  [
    'empty-humanized-title',
    [],
    'Documentation',
    'Documentation for ___.',
    '___',
  ],
];
const records = [];
async function snapshot(root) {
  const result = {};
  async function scan(dir, prefix = '') {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const rel = prefix ? prefix + '/' + e.name : e.name;
      if (e.name === '.git') continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        result[rel + '/'] = 'directory';
        await scan(full, rel);
      } else if (e.isSymbolicLink())
        result[rel] = 'symlink:' + (await readlink(full));
      else result[rel] = (await readFile(full)).toString('base64');
    }
  }
  await scan(root);
  return result;
}
function run(root, flags) {
  const command = [
    process.execPath,
    cli,
    '--cwd',
    root,
    '--json',
    'docs',
    'init',
    '--framework',
    'markdown',
    '--yes',
    ...flags,
  ];
  const p = spawnSync(command[0], command.slice(1), { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stdout + p.stderr);
  return {
    command,
    exit: p.status,
    payload: JSON.parse(p.stdout),
    stderr: p.stderr,
  };
}
for (const [
  label,
  flags,
  title,
  description,
  name = 'operator-handbook',
] of cases) {
  const root = join(base, label, name);
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, 'package.json'),
    '{"name":"service","scripts":{"build":"existing-build"}}\n',
  );
  await mkdir(join(root, '.oat'));
  await writeFile(
    join(root, '.oat/config.json'),
    '{"version":1,"documentation":{"excludes":["drafts/**"]},"worktrees":{"root":"custom-worktrees"}}\n',
  );
  const before = await snapshot(root);
  const preview = run(root, [...flags, '--dry-run']);
  assert.deepEqual(await snapshot(root), before);
  const accepted = run(root, flags);
  const source = await readFile(join(root, 'docs/index.md'), 'utf8');
  const yaml = source.match(/^---\n([\s\S]*?)\n---/);
  assert(yaml);
  const metadata = parse(yaml[1]);
  const bad = cases.slice(0, 3).some((c) => c[0] === label);
  if (mode === 'before' && (bad || label === 'empty-humanized-title')) {
    if (label === 'whitespace-description')
      assert.equal(metadata.description.trim(), '');
    else assert.equal(metadata.title.trim(), '');
  } else
    assert.deepEqual(
      { title: metadata.title, description: metadata.description },
      { title, description },
    );
  const after = await snapshot(root);
  assert.equal(after['package.json'], before['package.json']);
  const config = JSON.parse(
    await readFile(join(root, '.oat/config.json'), 'utf8'),
  );
  assert.deepEqual(config.documentation, {
    tooling: 'markdown',
    root: 'docs',
    index: 'docs/index.md',
    excludes: ['drafts/**'],
  });
  assert.equal(config.worktrees.root, 'custom-worktrees');
  const repeated = run(root, [...flags, '--adopt']);
  assert.deepEqual(await snapshot(root), after);
  records.push({
    label,
    root,
    preview,
    accepted,
    metadata,
    index: source,
    before,
    after,
    repeated,
  });
}
await writeFile(
  join(base, 'metadata.json'),
  JSON.stringify(records, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      mode,
      base,
      cases: records.map((r) => ({
        label: r.label,
        exit: r.accepted.exit,
        title: r.metadata.title,
        description: r.metadata.description,
      })),
      status: 'pass',
    },
    null,
    2,
  ),
);
```

## Causal regression contrast

The new public regression failed with the old resolver (exit 1): `AssertionError: expected '' to be 'Operator Handbook'`, at the YAML title assertion, before later cases. With only the corrected resolver substituted in the same private archive, it passed (exit 0, one test and 32 skipped). Shared sources were never neutralized. The archive pins the original fix base, so this negative control remains executable after the fix commit. The initial successful receipt/logs are also retained with the `initial-success-` prefix. Archive: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-final-metadata-contrast-ikitr6ul`; receipts: `/tmp/oat-markdown-final-fix-evidence/regression-contrast.json`, `old-regression.log`, `fixed-regression.log` and `pinned-regression-contrast-run.log`.

An initial wrapper attempt exited 1 because its diagnostic classifier searched stdout while Vitest emitted the intended assertion on stderr. The old product regression already failed correctly; combining both captured streams corrected the harness. The initial archive `oat-final-metadata-contrast-6t95f5fy` remains retained. This was a pre-commit harness correction, not a product failure or recovery event.

Save this exact contrast as `regression-contrast.py` and run from the repository root after applying the two-file fix:

```python
import pathlib,subprocess,tempfile,os,json,hashlib
repo=pathlib.Path.cwd();out=pathlib.Path('/tmp/oat-markdown-final-fix-evidence');archive=pathlib.Path(tempfile.mkdtemp(prefix='oat-final-metadata-contrast-'));head=subprocess.check_output(['git','rev-parse','fea03cbdf8cf6cfb689f2a95ee11b9ce8bc1d8d0'],text=True).strip();tar=archive/'source.tar';tar.write_bytes(subprocess.check_output(['git','archive',head]));subprocess.run(['tar','-xf',str(tar),'-C',str(archive)],check=True);tar.unlink()
for rel in ['node_modules','packages/cli/node_modules','packages/control-plane/node_modules','packages/docs-config/node_modules','packages/docs-theme/node_modules','packages/docs-transforms/node_modules']:
 source=repo/rel
 if source.is_dir():(archive/rel).symlink_to(source,target_is_directory=True)
integration='packages/cli/src/commands/docs/init/integration.test.ts';resolver='packages/cli/src/commands/docs/init/resolve-options.ts';(archive/integration).write_bytes((repo/integration).read_bytes());subprocess.run(['bash','packages/cli/scripts/bundle-assets.sh'],cwd=archive,check=True)
command=['pnpm','--filter','@open-agent-toolkit/cli','exec','vitest','run','src/commands/docs/init/integration.test.ts','-t','defaults blank Markdown metadata before writing authored pages'];records=[]
for mode in ['old','fixed']:
 if mode=='fixed':(archive/resolver).write_bytes((repo/resolver).read_bytes())
 p=subprocess.run(command,cwd=archive,capture_output=True,text=True);log=out/(mode+'-regression.log');log.write_text(p.stdout+p.stderr);assert p.returncode==(1 if mode=='old' else 0),(mode,p.stdout,p.stderr)
 if mode=='old':assert "AssertionError: expected '' to be 'Operator Handbook'" in p.stdout+p.stderr,p.stdout+p.stderr
 records.append({'mode':mode,'command':command,'cwd':str(archive),'exit':p.returncode,'log':str(log),'resolverSha256':hashlib.sha256((archive/resolver).read_bytes()).hexdigest()})
record={'base':head,'archive':str(archive),'controls':records,'sharedSourceUnmodifiedByContrast':True};(out/'regression-contrast.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record,indent=2))
```

```bash
python3 /tmp/oat-markdown-final-fix-evidence/regression-contrast.py
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
```

## Focused verification

All direct checks exited 0: the ten-file suite executed 196 tests, CLI type-check, CLI lint, exact two-file oxfmt check and git diff check. Logs reside in `/tmp/oat-markdown-final-fix-evidence/{focused-suite,focused-types,focused-lint}.log`.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/init/resolve-options.test.ts src/commands/docs/init/scaffold.test.ts src/commands/docs/init/index.test.ts src/commands/docs/init/integration.test.ts src/commands/docs/init/docs-commands.test.ts src/commands/docs/init/root-package.test.ts src/commands/docs/init/mkdocs-compat.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/tools/shared/pack-lifecycle.test.ts src/commands/shared/agents-md.test.ts
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
pnpm --filter @open-agent-toolkit/cli type-check
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
pnpm --filter @open-agent-toolkit/cli lint
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
```

## Ordered CI gate receipts

The runner below executes each gate sequentially, records its direct exit, and stops immediately on failure. Fetch is recorded independently before the version gate. Its receipts are `/tmp/oat-markdown-final-fix-evidence/gate-receipts.json`; numbered logs retain complete output. Final outcomes appear below. Prior p04 forced consumer execution remains valid; changed CLI tests must execute during this run. No source or skill scope beyond the two files is introduced.

Save this as `run-gates.py` in the evidence directory and run `python3 /tmp/oat-markdown-final-fix-evidence/run-gates.py` from the repository root:

```python
import pathlib,subprocess,json,time,sys
out=pathlib.Path('/tmp/oat-markdown-final-fix-evidence');records=[]
commands=[('01-check',['pnpm','check']),('02-types',['pnpm','type-check']),('03-test',['pnpm','test']),('04-build',['pnpm','build']),('05-skills',['pnpm','run','check:skill-bumps']),('fetch-main',['git','fetch','origin','main']),('06-versions',['pnpm','release:check-versions']),('07-release',['pnpm','release:validate']),('08-docs',['pnpm','build:docs'])]
for name,argv in commands:
 start=time.time();log=out/(name+'.log')
 with log.open('w') as stream:p=subprocess.run(argv,stdout=stream,stderr=subprocess.STDOUT)
 text=log.read_text();r={'name':name,'command':argv,'exit':p.returncode,'seconds':round(time.time()-start,2),'log':str(log),'cacheHitLines':text.count('cache hit, replaying logs'),'cacheMissLines':text.count('cache miss, executing')};records.append(r)
 if name=='fetch-main':r['mainSha']=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
 (out/'gate-receipts.json').write_text(json.dumps(records,indent=2)+'\n');print(json.dumps(r),flush=True)
 if p.returncode:sys.exit(p.returncode)
```

All eight ordered gates and the intervening fetch exited 0. Fresh main is `98d1d524624e17f55ccfce33d18b3d5535dc91ca`, public 0.3.10; branch public versions remain 0.3.11.

| Command                       | Direct exit | Turbo replay / execution   | Log                                                    |
| ----------------------------- | ----------- | -------------------------- | ------------------------------------------------------ |
| `pnpm check`                  | 0           | 9 hit lines / 2 miss lines | `/tmp/oat-markdown-final-fix-evidence/01-check.log`    |
| `pnpm type-check`             | 0           | 9 hit lines / 1 miss lines | `/tmp/oat-markdown-final-fix-evidence/02-types.log`    |
| `pnpm test`                   | 0           | 8 hit lines / 2 miss lines | `/tmp/oat-markdown-final-fix-evidence/03-test.log`     |
| `pnpm build`                  | 0           | 5 hit lines / 0 miss lines | `/tmp/oat-markdown-final-fix-evidence/04-build.log`    |
| `pnpm run check:skill-bumps`  | 0           | 0 hit lines / 0 miss lines | `/tmp/oat-markdown-final-fix-evidence/05-skills.log`   |
| `git fetch origin main`       | 0           | 0 hit lines / 0 miss lines | `/tmp/oat-markdown-final-fix-evidence/fetch-main.log`  |
| `pnpm release:check-versions` | 0           | 0 hit lines / 0 miss lines | `/tmp/oat-markdown-final-fix-evidence/06-versions.log` |
| `pnpm release:validate`       | 0           | 0 hit lines / 0 miss lines | `/tmp/oat-markdown-final-fix-evidence/07-release.log`  |
| `pnpm build:docs`             | 0           | 6 hit lines / 0 miss lines | `/tmp/oat-markdown-final-fix-evidence/08-docs.log`     |

`pnpm test` executed the changed CLI suite: 398 files, 7,944 tests. The unchanged control-plane/docs-config/docs-transforms test results were cache replays, separately proven by the earlier p04 forced workspace run. Root Node suites actually executed smoke 163, skills 660 and scripts 1. The docs dependency also actually compiled and generated 73 pages in this test invocation. The subsequent `pnpm build` and `pnpm build:docs` gates replayed those valid builds; they are not claimed as new compilation. Initial baseline build replayed five packages; the pre-control fixed build actually compiled the CLI, with four unchanged package replays. Skill/version gates are direct script execution; release validation actually checked all five packed public packages. No forced workspace repeat or broader test expansion was needed.

Exact three-file formatting, durable Bash/JavaScript/Python fence syntax and `git diff --check` were verified after evidence assembly; all exited 0. Evidence-only formatting does not alter production semantics or test coverage. Task code/evidence acceptance is complete; root-owned independent final re-review and exit gate remain pending.
