# Final dollar-value rendering controls

Normal address-now correction from the passing implementation-exit judgment sweep; no new lifecycle task or post-commit recovery. Original request `markdown-p04-pinned-20261001` and exact target `oat-phase-implementer-gpt-6-1-sol-high-3da8a37eed`, gpt-6.1-sol/high, remain unchanged. Clean fix base: `ec5414dffc1457b30b70c37a24b7e8fd60e0e984`. Recovery remains 0/10, pending null. Root owns lifecycle tracking, reviews and gate bookkeeping.

## Literal-value contract and prevention

The former string replacement interprets external `$&`, `$'`, ``$` `` and `$$`. Its sequential passes also reinterpret token-shaped values inserted by earlier passes. The fix replaces tokens in the original template once with a callback; replacement values are literal and are never scanned again. Recognized metadata tokens retain JSON/YAML escaping; unknown tokens remain unchanged. Only `markdown.ts`, its existing public `integration.test.ts` and this evidence file are owned. Frameworks, versions, dependencies and skills are unchanged; the existing PR-scoped public 0.3.11/skill bumps remain sufficient.

Current deliberate-testing was read before coverage changes. One public adoption/init regression protects literal authored output across the four dollar forms, token-shaped text and an ordinary accepted control. Existing URI tests protect link encoding but do not test replacement-string expansion or later token substitution. The oracle parses YAML independently, compares exact supplied metadata/repository bytes, checks literal expected Contents links and exactly one Contents section, then actually reads link destinations. Dry-run complete snapshots and preserved authored bytes protect additive behavior. No private/helper-layer tests, own-module mocks or test hooks were added.

The title/description round trip is independent of renderer implementation. Expected encoded destinations are explicit literals. Existing filename-label humanization remains authoritative: underscores become spaces and ordinary words are capitalized.

## Causal old/fixed regression

A private archive pinned to the clean fix base receives only the new public test. The old source test exits 1 for the intended metadata assertion: external `$&` produces `{{TITLE_METADATA}}` instead of the supplied dollar sequence. Substituting only the corrected renderer in that same archive yields exit 0 (one executed test, 33 skipped). Shared source guards were never neutralized. Both archive CLI builds actually executed before their CLI controls.

Archive: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-final-dollar-contrast-xirxd605`. Exact complete receipts: `/tmp/oat-markdown-final-dollar-evidence/contrast.json` and `/tmp/oat-markdown-final-dollar-evidence/contrast-run.log`.

| Control          | Direct exit | Exact receipt log                                              |
| ---------------- | ----------- | -------------------------------------------------------------- |
| old-build        | 0           | `/tmp/oat-markdown-final-dollar-evidence/old-build.log`        |
| old-regression   | 1           | `/tmp/oat-markdown-final-dollar-evidence/old-regression.log`   |
| old-cli          | 0           | `/tmp/oat-markdown-final-dollar-evidence/old-cli.log`          |
| fixed-build      | 0           | `/tmp/oat-markdown-final-dollar-evidence/fixed-build.log`      |
| fixed-regression | 0           | `/tmp/oat-markdown-final-dollar-evidence/fixed-regression.log` |
| fixed-cli        | 0           | `/tmp/oat-markdown-final-dollar-evidence/fixed-cli.log`        |

An initial probe expected `Guide ordinary` rather than the existing `Guide Ordinary`. An initial new regression expected token-shaped filename labels to retain the underscore in `REPO_NAME`, while existing humanization correctly emits `REPO NAME`. The initial probe/focused/contrast exits were 1, for those test/probe oracle mistakes. Only the expected label literals were corrected; the renderer was unchanged. Original logs are retained as `/tmp/oat-markdown-final-dollar-evidence/initial-{baseline-cli,contrast-run,old-build,old-regression,old-cli,fixed-build,fixed-regression,focused-suite}.log`, and the initial private archive `oat-final-dollar-contrast-qr__yz8o` remains retained. These are normal pre-commit test development corrections, not recovery events.

## Actual public CLI categorical controls

Each five-case bad state was accepted with exit 0 by old code. Fixed code accepts the same inputs with exact metadata, repository context and a single correct Contents map. Dollar/token inputs occur simultaneously in title, description, repository basename and adopted filename. An ordinary accepted control passes both. For all six cases, dry-run does not mutate files/directories/symlinks; authored/package bytes and unrelated config persist; repeated adoption is byte-identical. Fixed Contents destinations are actually read as files.

| Input value                  | Old accepted outcome               | Fixed accepted outcome             |
| ---------------------------- | ---------------------------------- | ---------------------------------- |
| `$&`                         | Literal contract violated, exit 0  | Literal contract satisfied, exit 0 |
| `$'`                         | Literal contract violated, exit 0  | Literal contract satisfied, exit 0 |
| ``$` ``                      | Literal contract violated, exit 0  | Literal contract satisfied, exit 0 |
| `$$`                         | Literal contract violated, exit 0  | Literal contract satisfied, exit 0 |
| `{{CONTENTS}}-{{REPO_NAME}}` | Literal contract violated, exit 0  | Literal contract satisfied, exit 0 |
| `ordinary`                   | Literal contract satisfied, exit 0 | Literal contract satisfied, exit 0 |

Old full command/JSON/YAML/Contents/snapshot receipts: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-final-dollar-before-y5Zve9/controls.json`. Fixed full receipts: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-final-dollar-after-yNne4x/controls.json`. Their exact accepted commands include the pinned archive built CLI path; summary logs are `/tmp/oat-markdown-final-dollar-evidence/old-cli.log` and `/tmp/oat-markdown-final-dollar-evidence/fixed-cli.log`.

Save the following public probe as `/tmp/oat-markdown-final-dollar-evidence/cli-controls.mjs`. Arguments are `before|after` and the absolute built CLI path. Before mode requires bad accepted outcomes for the five problematic cases; after mode requires all literal contracts. The ordinary control always requires good accepted output.

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
import { pathToFileURL, fileURLToPath } from 'node:url';
const mode = process.argv[2];
assert(['before', 'after'].includes(mode));
const cli = resolve(process.argv[3] ?? 'packages/cli/dist/index.js');
const { parse } = createRequire(cli)('yaml');
const cases = [
  { value: '$&', href: 'guide-%24%26.md' },
  { value: "$'", href: "guide-%24'.md" },
  { value: '$`', href: 'guide-%24%60.md' },
  { value: '$$', href: 'guide-%24%24.md' },
  {
    value: '{{CONTENTS}}-{{REPO_NAME}}',
    href: 'guide-%7B%7BCONTENTS%7D%7D-%7B%7BREPO_NAME%7D%7D.md',
    label: 'Guide {{CONTENTS}} {{REPO NAME}}',
  },
  { value: 'ordinary', href: 'guide-ordinary.md', label: 'Guide Ordinary' },
];
const base = await mkdtemp(join(tmpdir(), 'oat-final-dollar-' + mode + '-'));
const records = [];
async function snapshot(root) {
  const result = {};
  async function scan(dir, prefix = '') {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const rel = prefix ? prefix + '/' + e.name : e.name;
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
    '--adopt',
    ...flags,
  ];
  const p = spawnSync(command[0], command.slice(1), { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stdout + p.stderr);
  const payload = JSON.parse(p.stdout);
  assert.equal(payload.status, 'ok');
  return { command, exit: p.status, payload, stderr: p.stderr };
}
for (const [i, c] of cases.entries()) {
  const repoName = 'repo-' + c.value,
    title = 'Operators ' + c.value,
    description = 'Ownership ' + c.value,
    filename = 'guide-' + c.value + '.md',
    page = '# Preserved guidance\n';
  const root = join(base, String(i), repoName);
  await mkdir(join(root, 'docs'), { recursive: true });
  await mkdir(join(root, '.oat'));
  await writeFile(
    join(root, 'package.json'),
    '{"name":"service","scripts":{"build":"existing"}}\n',
  );
  await writeFile(
    join(root, '.oat/config.json'),
    '{"version":1,"documentation":{"excludes":["drafts/**"]},"worktrees":{"root":"custom"}}\n',
  );
  await writeFile(join(root, 'docs', filename), page);
  const flags = ['--site-name', title, '--description', description];
  const before = await snapshot(root);
  const preview = run(root, [...flags, '--dry-run']);
  assert.deepEqual(await snapshot(root), before);
  const accepted = run(root, flags);
  const index = await readFile(join(root, 'docs/index.md'), 'utf8');
  let metadata, error;
  try {
    metadata = parse(index.match(/^---\n([\s\S]*?)\n---/)[1]);
  } catch (e) {
    error = e.message;
  }
  const expectedContents =
    '- [' +
    (c.label ?? 'Guide ' + c.value) +
    '](' +
    c.href +
    ')\n- [Contributing](contributing.md)';
  const observedContents = index.split('\n## Contents\n\n')[1]?.trim();
  const literal =
    metadata?.title === title &&
    metadata?.description === description &&
    index.includes('**' + repoName + '**') &&
    observedContents === expectedContents &&
    (index.match(/^## Contents$/gm) ?? []).length === 1;
  if (mode === 'before' && c.value !== 'ordinary') assert.equal(literal, false);
  else {
    assert.equal(literal, true, error ?? index);
    const destinations = [
      ...observedContents.matchAll(/^- \[.*\]\(([^)]*)\)$/gm),
    ].map((m) => m[1]);
    assert.deepEqual(destinations, [c.href, 'contributing.md']);
    for (const destination of destinations)
      await readFile(
        fileURLToPath(
          new URL(destination, pathToFileURL(join(root, 'docs/index.md'))),
        ),
        'utf8',
      );
  }
  assert.equal(await readFile(join(root, 'docs', filename), 'utf8'), page);
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
  assert.equal(config.worktrees.root, 'custom');
  const repeat = run(root, flags);
  assert.deepEqual(await snapshot(root), after);
  records.push({
    value: c.value,
    root,
    preview,
    accepted,
    index,
    metadata,
    yamlError: error,
    literal,
    expectedContents,
    observedContents,
    before,
    after,
    repeat,
  });
}
await writeFile(
  join(base, 'controls.json'),
  JSON.stringify(records, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      mode,
      base,
      cases: records.map((r) => ({
        value: r.value,
        exit: r.accepted.exit,
        literal: r.literal,
        yamlError: r.yamlError,
      })),
      status: 'pass',
    },
    null,
    2,
  ),
);
```

Save the pinned archive contrast below as `/tmp/oat-markdown-final-dollar-evidence/contrast.py`; run it from the repository root. It builds the actual old/fixed CLI, runs the same public regression, and executes both public CLI modes without changing shared source. It remains repeatable after the fix commit because the old source base is explicit.

```python
import pathlib,subprocess,tempfile,json,hashlib,sys
repo=pathlib.Path.cwd();out=pathlib.Path('/tmp/oat-markdown-final-dollar-evidence');base='ec5414dffc1457b30b70c37a24b7e8fd60e0e984';archive=pathlib.Path(tempfile.mkdtemp(prefix='oat-final-dollar-contrast-'));tar=archive/'source.tar';tar.write_bytes(subprocess.check_output(['git','archive',base]));subprocess.run(['tar','-xf',str(tar),'-C',str(archive)],check=True);tar.unlink()
for rel in ['node_modules','packages/cli/node_modules','packages/control-plane/node_modules','packages/docs-config/node_modules','packages/docs-theme/node_modules','packages/docs-transforms/node_modules']:
 source=repo/rel
 if source.is_dir():(archive/rel).symlink_to(source,target_is_directory=True)
test='packages/cli/src/commands/docs/init/integration.test.ts';source='packages/cli/src/commands/docs/init/markdown.ts';(archive/test).write_bytes((repo/test).read_bytes());records=[]
def run(name,command,expected):
 p=subprocess.run(command,cwd=archive,capture_output=True,text=True);log=out/(name+'.log');log.write_text(p.stdout+p.stderr);records.append({'name':name,'command':command,'cwd':str(archive),'exit':p.returncode,'log':str(log)})
 assert p.returncode==expected,(name,p.stdout,p.stderr)
 return p.stdout+p.stderr
for mode in ['old','fixed']:
 if mode=='fixed':(archive/source).write_bytes((repo/source).read_bytes())
 run(mode+'-build',['pnpm','--filter','@open-agent-toolkit/cli','build'],0)
 text=run(mode+'-regression',['pnpm','--filter','@open-agent-toolkit/cli','exec','vitest','run','src/commands/docs/init/integration.test.ts','-t','renders external Markdown template values literally during adoption'],1 if mode=='old' else 0)
 if mode=='old':assert 'AssertionError' in text and '{{TITLE_METADATA}}' in text,text
 run(mode+'-cli',['node',str(out/'cli-controls.mjs'),'before' if mode=='old' else 'after',str(archive/'packages/cli/dist/index.js')],0)
record={'base':base,'archive':str(archive),'receipts':records,'sharedSourcesNeutralized':False};(out/'contrast.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record,indent=2))
```

```bash
python3 /tmp/oat-markdown-final-dollar-evidence/contrast.py
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
```

## Focused execution and ordered gates

Baseline and fixed workspace builds exited 0 before bundle-backed checks. The corrected direct ten-file suite actually executed 197 tests and exited 0. Direct CLI lint/type-check exited 0. Logs: `/tmp/oat-markdown-final-dollar-evidence/{baseline-build,focused-suite,focused-lint,focused-types}.log`; initial workspace fixed build is also retained at `initial-fixed-build.log`. Archive old/fixed actual builds have their independent receipts above.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/init/resolve-options.test.ts src/commands/docs/init/scaffold.test.ts src/commands/docs/init/index.test.ts src/commands/docs/init/integration.test.ts src/commands/docs/init/docs-commands.test.ts src/commands/docs/init/root-package.test.ts src/commands/docs/init/mkdocs-compat.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/tools/shared/pack-lifecycle.test.ts src/commands/shared/agents-md.test.ts
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
pnpm --filter @open-agent-toolkit/cli lint
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
pnpm --filter @open-agent-toolkit/cli type-check
rc=$?; printf 'exit=%s\n' "$rc"; test "$rc" -eq 0 || exit "$rc"
```

Save the exact fail-closed sequential gate runner as `/tmp/oat-markdown-final-dollar-evidence/run-gates.py`, then execute it from the repository root. Direct exits and cache/miss lines are recorded individually in `gate-receipts.json`; the runner stops on failure and fetches fresh main before the version gate.

```python
import pathlib,subprocess,json,time,sys
out=pathlib.Path('/tmp/oat-markdown-final-dollar-evidence');records=[]
commands=[('01-check',['pnpm','check']),('02-types',['pnpm','type-check']),('03-test',['pnpm','test']),('04-build',['pnpm','build']),('05-skills',['pnpm','run','check:skill-bumps']),('fetch-main',['git','fetch','origin','main']),('06-versions',['pnpm','release:check-versions']),('07-release',['pnpm','release:validate']),('08-docs',['pnpm','build:docs'])]
for name,argv in commands:
 start=time.time();log=out/(name+'.log')
 with log.open('w') as stream:p=subprocess.run(argv,stdout=stream,stderr=subprocess.STDOUT)
 text=log.read_text();r={'name':name,'command':argv,'exit':p.returncode,'seconds':round(time.time()-start,2),'log':str(log),'cacheHitLines':text.count('cache hit, replaying logs'),'cacheMissLines':text.count('cache miss, executing')};records.append(r)
 if name=='fetch-main':r['mainSha']=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
 (out/'gate-receipts.json').write_text(json.dumps(records,indent=2)+'\n');print(json.dumps(r),flush=True)
 if p.returncode:sys.exit(p.returncode)
```

All eight gates and the intervening fresh fetch exited 0 in order. Main is `98d1d524624e17f55ccfce33d18b3d5535dc91ca` (public 0.3.10); branch public versions remain 0.3.11.

| Command                       | Direct exit | Turbo cache hit / miss lines | Complete log                                              |
| ----------------------------- | ----------- | ---------------------------- | --------------------------------------------------------- |
| `pnpm check`                  | 0           | 8 / 3                        | `/tmp/oat-markdown-final-dollar-evidence/01-check.log`    |
| `pnpm type-check`             | 0           | 9 / 1                        | `/tmp/oat-markdown-final-dollar-evidence/02-types.log`    |
| `pnpm test`                   | 0           | 8 / 2                        | `/tmp/oat-markdown-final-dollar-evidence/03-test.log`     |
| `pnpm build`                  | 0           | 5 / 0                        | `/tmp/oat-markdown-final-dollar-evidence/04-build.log`    |
| `pnpm run check:skill-bumps`  | 0           | 0 / 0                        | `/tmp/oat-markdown-final-dollar-evidence/05-skills.log`   |
| `git fetch origin main`       | 0           | 0 / 0                        | `/tmp/oat-markdown-final-dollar-evidence/fetch-main.log`  |
| `pnpm release:check-versions` | 0           | 0 / 0                        | `/tmp/oat-markdown-final-dollar-evidence/06-versions.log` |
| `pnpm release:validate`       | 0           | 0 / 0                        | `/tmp/oat-markdown-final-dollar-evidence/07-release.log`  |
| `pnpm build:docs`             | 0           | 6 / 0                        | `/tmp/oat-markdown-final-dollar-evidence/08-docs.log`     |

The changed CLI check, type-check and test tasks actually executed. CLI tests: 398 files, 7,945 tests; unchanged control-plane/docs-config/docs-transforms test output was replayed. Root Node suites actually executed smoke 163, skills 660 and scripts 1. The test dependency actually compiled docs and generated 73 pages. Subsequent build/build:docs gates replayed valid builds (five/six hits respectively), rather than compiling anew. Baseline workspace build replayed five packages; the pre-control fixed workspace build actually compiled CLI with four unchanged package replays. Private archive CLI old/fixed builds were direct actual commands. Skill/version gates actually ran their scripts and release validation actually checked five packed 0.3.11 public packages. Prior forced workspace consumer proof remains valid; no redundant broader repeat was needed.

Final exact three-file formatting, durable Bash/JavaScript/Python fence syntax and diff checks exited 0 after evidence assembly. Source remains unchanged after the passing focused and CI execution. Hook byte equality and clean-tree receipts are recorded separately after the bounded commit; root retains closeout/gate authority.
