# Remote Markdown Adoption Controls

## p04-t04: Optional child indexes

Request `markdown-p04-pinned-20261001`, original accepted target `oat-phase-implementer-gpt-6-1-sol-high-3da8a37eed`, configured gpt-6.1-sol/high. Remote review continuation is ordinary planned work; recovery usage remains 0/10. Parent retains lifecycle, independent review, gate and PR ownership.

Baseline: `acb417bbde983a64ec049564ec503d525ed6572d`. The required root baseline and unsafe-target validation are unchanged. Optional child entrypoints use repository containment: readable aliases inside the repository can appear in Contents. Dangling, external, unreadable or nonfile child entrypoints are preserved, omitted, and reported for an audit. No external target is read: containment is checked before reading. Excluded child indexes remain skipped.

The public regression exercises dry-run nonmutation, actual readable links and exact Contents destinations, original file bytes/symlink identity, external bytes, and repeat adoption. It adds no private mocks, hooks or exports. On archived baseline production source it fails at `expect(preview.exit).toBe(0)` with actual exit 1; restored production source passes. Only the private archive is changed for causal proof.

Root's original four-case reproduction is retained at `/tmp/markdown-remote-controls.mjs`, `/tmp/markdown-remote-before.json`, and `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/markdown-remote-controls-F5ZiWf/receipts.json`. Its child alias outside docs but inside the repository and dangling alias both exit 1. Instruction-only and ordinary authored-doc advice controls are retained for p04-t05.

### Exact evidence and exits

All current receipts are under `/tmp/oat-markdown-remote-evidence/`.

| Check                            | Actual exit    | Evidence                                                          |
| -------------------------------- | -------------- | ----------------------------------------------------------------- |
| Initial scoped formatting        | 0              | `t04-format.log`                                                  |
| Workspace build                  | 0              | `t04-build.log`; CLI actual execution, other four packages cached |
| Direct public/consumer suite     | 0              | `t04-focused.log`; 10 files, 198 tests actually executed          |
| CLI lint                         | 0              | `t04-lint.log`                                                    |
| CLI types                        | 0              | `t04-types.log`                                                   |
| Old archive build / regression   | 0 / 1 expected | `t04-old-build.log`, `t04-old-regression.log`                     |
| Fixed archive build / regression | 0 / 0          | `t04-fixed-build.log`, `t04-fixed-regression.log`                 |
| Old CLI categorical controls     | 0              | `t04-old-cli.log`; each product exit recorded independently       |
| Fixed CLI categorical controls   | 0              | `t04-fixed-cli.log`, `t04-cli-corrected.log`                      |

`t04-contrast.json` records exact archive path, baseline, commands, exits and isolated subprocess HOME. `initial-t04-focused.json` records direct focused/lint/types exits; its final CLI wrapper exit 1 is a harness error, not a product failure: it incorrectly demanded root AGENTS.md equality despite authorized managed guidance append. Initial harness receipts are preserved as `initial-t04-contrast.json`, `initial-t04-contrast-run.log`, `initial-t04-old-cli.log`, `initial-t04-focused.json`, `initial-t04-focused-run.log`, and `initial-t04-cli.log`. The corrected oracle preserves the existing root instruction prefix and all original docs/symlink bytes. Corrected CLI-only checks exit 0; passing focused tests were not repeated for a wrapper correction.

The six CLI cases each execute dry-run and actual adoption. Old source accepts ordinary authored child indexes (exit 0) but rejects in-repository aliases, dangling aliases, external aliases and nonfile indexes (exit 1). Fixed source accepts all five optional child cases (exit 0); only the usable alias and ordinary child index appear in Contents. Both versions refuse the required external root baseline (exit 1), without mutation. Each CLI log includes an exact generated `receipt` path and complete per-command categorical results. HOME is an isolated fixture directory, with only PATH/TMPDIR/CI inherited; no normal user installations or provider credentials are involved.

### Runnable public CLI oracle

Save this as `/tmp/oat-markdown-remote-evidence/cli-controls.mjs`:

```javascript
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  writeFile,
  symlink,
  readFile,
  readdir,
  readlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const [mode, cliArg] = process.argv.slice(2),
  cli = resolve(cliArg ?? 'packages/cli/dist/index.js');
const base = await mkdtemp(join(tmpdir(), 'oat-remote-cli-')),
  home = join(base, 'home');
await mkdir(home);
async function snapshot(root) {
  const result = {};
  async function scan(dir, prefix = '') {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name,
        p = join(dir, e.name);
      if (e.isDirectory()) {
        result[rel + '/'] = 'directory';
        await scan(p, rel);
      } else
        result[rel] = e.isSymbolicLink()
          ? `symlink:${await readlink(p)}`
          : (await readFile(p)).toString('base64');
    }
  }
  await scan(root);
  return result;
}
const receipts = [];
for (const kind of [
  'in-repo-index-link',
  'ordinary-index',
  'dangling-index-link',
  'external-index-link',
  'nonfile-index',
  'required-external-index',
]) {
  const repo = join(base, kind),
    external = join(base, kind + '-outside');
  await mkdir(join(repo, 'docs', 'child'), { recursive: true });
  await mkdir(external);
  await writeFile(join(external, 'private.md'), '# External private content\n');
  await writeFile(join(repo, 'AGENTS.md'), '# Local root instructions\n');
  const child = join(repo, 'docs', 'child', 'index.md');
  if (kind === 'in-repo-index-link') {
    await writeFile(join(repo, 'shared.md'), '# Shared index\n');
    await symlink('../../shared.md', child);
  }
  if (kind === 'ordinary-index') await writeFile(child, '# Ordinary index\n');
  if (kind === 'dangling-index-link') await symlink('missing.md', child);
  if (kind === 'external-index-link')
    await symlink(join(external, 'private.md'), child);
  if (kind === 'nonfile-index') {
    await mkdir(child);
    await writeFile(join(child, 'keep.md'), '# Directory child\n');
  }
  if (kind === 'required-external-index')
    await symlink(join(external, 'private.md'), join(repo, 'docs', 'index.md'));
  const before = await snapshot(repo),
    outsideBefore = await snapshot(external);
  const usable = ['in-repo-index-link', 'ordinary-index'].includes(kind),
    strict = kind === 'required-external-index';
  const expected =
    mode === 'old' ? (kind === 'ordinary-index' ? 0 : 1) : strict ? 1 : 0;
  for (const dryRun of [true, false]) {
    const argv = [
      cli,
      '--json',
      '--cwd',
      repo,
      'docs',
      'init',
      '--framework',
      'markdown',
      '--adopt',
      '--yes',
      ...(dryRun ? ['--dry-run'] : []),
    ];
    const r = spawnSync(process.execPath, argv, {
      env: {
        PATH: process.env.PATH,
        HOME: home,
        TMPDIR: process.env.TMPDIR,
        CI: '1',
      },
      encoding: 'utf8',
    });
    const data = JSON.parse(r.stdout);
    assert.equal(r.status, expected, `${kind}/${dryRun}: ${r.stdout}`);
    receipts.push({
      kind,
      dryRun,
      command: [process.execPath, ...argv],
      exit: r.status,
      data,
      stderr: r.stderr,
    });
    if (dryRun || expected === 1)
      assert.deepEqual(await snapshot(repo), before);
    if (mode === 'fixed' && !strict && !usable)
      assert(
        data.auditAdvice.some(
          (x) =>
            x.includes('child/index.md is not a usable in-repository file') &&
            x.includes('omitted from Contents') &&
            x.includes('oat-docs-analyze'),
        ),
      );
  }
  if (expected === 0) {
    const index = await readFile(join(repo, 'docs', 'index.md'), 'utf8');
    const links = [...index.matchAll(/^- \[.*\]\(([^)]*)\)$/gm)].map(
      (x) => x[1],
    );
    assert.deepEqual(
      links.sort(),
      usable ? ['child/index.md', 'contributing.md'] : ['contributing.md'],
    );
    if (usable)
      assert.equal(
        await readFile(child, 'utf8'),
        kind === 'ordinary-index' ? '# Ordinary index\n' : '# Shared index\n',
      );
    const after = await snapshot(repo);
    for (const [p, v] of Object.entries(before)) {
      if (p === 'AGENTS.md')
        assert(
          Buffer.from(after[p], 'base64')
            .toString()
            .startsWith(Buffer.from(v, 'base64').toString()),
        );
      else assert.equal(after[p], v, p);
    }
  }
  assert.deepEqual(await snapshot(external), outsideBefore);
}
const result = { mode, cli, base, receipts };
const path = join(base, 'receipts.json');
await writeFile(path, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ receipt: path, ...result }, null, 2));
```

### Runnable old/fixed causal proof

Save this as `/tmp/oat-markdown-remote-evidence/t04-contrast.py` and run from the checkout root after building:

```python
import pathlib,subprocess,tempfile,json,os
repo=pathlib.Path.cwd();out=pathlib.Path('/tmp/oat-markdown-remote-evidence');base='acb417bbde983a64ec049564ec503d525ed6572d';archive=pathlib.Path(tempfile.mkdtemp(prefix='oat-remote-t04-contrast-'));tar=archive/'source.tar';tar.write_bytes(subprocess.check_output(['git','archive',base]));subprocess.run(['tar','-xf',str(tar),'-C',str(archive)],check=True);tar.unlink()
for rel in ['node_modules','packages/cli/node_modules','packages/control-plane/node_modules','packages/docs-config/node_modules','packages/docs-theme/node_modules','packages/docs-transforms/node_modules']:
 if (repo/rel).is_dir():(archive/rel).symlink_to(repo/rel,target_is_directory=True)
test='packages/cli/src/commands/docs/init/integration.test.ts';source='packages/cli/src/commands/docs/init/markdown.ts';(archive/test).write_bytes((repo/test).read_bytes());home=tempfile.mkdtemp(prefix='oat-remote-contrast-home-');env={k:os.environ[k]for k in ['PATH','TMPDIR','LANG','LC_ALL','SHELL','USER','LOGNAME']if k in os.environ};env.update(HOME=home,CI='1');records=[]
def run(name,argv,expected):
 p=subprocess.run(argv,cwd=archive,env=env,capture_output=True,text=True);log=out/(name+'.log');log.write_text(p.stdout+p.stderr);records.append({'name':name,'command':argv,'cwd':str(archive),'exit':p.returncode,'log':str(log),'actualExecution':True});(out/'t04-contrast.json').write_text(json.dumps({'base':base,'archive':str(archive),'isolatedHome':home,'sharedSourcesNeutralized':False,'receipts':records},indent=2)+'\n');assert p.returncode==expected,(name,p.stdout,p.stderr);return p.stdout+p.stderr
for mode in ['old','fixed']:
 if mode=='fixed':(archive/source).write_bytes((repo/source).read_bytes())
 run('t04-'+mode+'-build',['pnpm','--filter','@open-agent-toolkit/cli','build'],0)
 output=run('t04-'+mode+'-regression',['pnpm','--filter','@open-agent-toolkit/cli','exec','vitest','run','src/commands/docs/init/integration.test.ts','-t','adopts usable repository child aliases and preserves unusable optional indexes'],1 if mode=='old'else 0)
 if mode=='old':assert 'AssertionError' in output and 'expected 1 to be +0' in output,output
 run('t04-'+mode+'-cli',['node',str(out/'cli-controls.mjs'),mode,str(archive/'packages/cli/dist/index.js')],0)
print(json.dumps(records,indent=2))
```

```bash
python3 /tmp/oat-markdown-remote-evidence/t04-contrast.py > /tmp/oat-markdown-remote-evidence/t04-contrast-run.log 2>&1
result=$?
printf 'exit=%s\n' "$result"
exit "$result"
```

### Runnable focused checks

Save this as `/tmp/oat-markdown-remote-evidence/t04-focused.py`. Its current corrected CLI oracle is used; the retained initial run predates the oracle correction.

```python
import pathlib,subprocess,tempfile,os,json,sys
out=pathlib.Path('/tmp/oat-markdown-remote-evidence');home=tempfile.mkdtemp(prefix='oat-remote-focused-home-');env={k:os.environ[k]for k in ['PATH','TMPDIR','LANG','LC_ALL','SHELL','USER','LOGNAME']if k in os.environ};env.update(HOME=home,CI='1');records=[]
files=['src/commands/docs/init/resolve-options.test.ts','src/commands/docs/init/scaffold.test.ts','src/commands/docs/init/index.test.ts','src/commands/docs/init/integration.test.ts','src/commands/docs/init/docs-commands.test.ts','src/commands/docs/init/root-package.test.ts','src/commands/docs/init/mkdocs-compat.test.ts','src/commands/init/tools/shared/bundle-consistency.test.ts','src/commands/tools/shared/pack-lifecycle.test.ts','src/commands/shared/agents-md.test.ts']
for name,argv in [('focused',['pnpm','--filter','@open-agent-toolkit/cli','exec','vitest','run',*files]),('lint',['pnpm','--filter','@open-agent-toolkit/cli','lint']),('types',['pnpm','--filter','@open-agent-toolkit/cli','type-check']),('cli',['node',str(out/'cli-controls.mjs'),'fixed'])]:
 log=out/('t04-'+name+'.log')
 with log.open('w')as stream:p=subprocess.run(argv,env=env,stdout=stream,stderr=subprocess.STDOUT)
 records.append({'name':name,'command':argv,'exit':p.returncode,'log':str(log),'actualExecution':True});(out/'t04-focused.json').write_text(json.dumps({'isolatedHome':home,'environmentKeys':sorted(env),'commands':records},indent=2)+'\n');print(name,p.returncode,flush=True)
 if p.returncode:sys.exit(p.returncode)
```

The final ordered eight CI gates remain pending until p04-t05 source is committed and root acknowledges its task boundary. Root final review and retained implementation-exit gate also remain pending.

### Retained categorical receipt paths

- `t04-old-cli.log`: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-remote-cli-OPrzzb/receipts.json`; 12 actual public CLI commands, six dry-run and six adoption cases.
- `t04-fixed-cli.log`: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-remote-cli-FEfMMk/receipts.json`; 12 actual public CLI commands, six dry-run and six adoption cases.
- `t04-cli-corrected.log`: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-remote-cli-sdiPv8/receipts.json`; 12 actual public CLI commands, six dry-run and six adoption cases.

Scoped `oxfmt --check` and `git diff --check` each exit 0 (`t04-format-check.log`, `t04-diff-check.log`). The three runnable fenced probes pass syntax checks, recorded in `t04-artifact-checks.json`. The hook verification compares owned file hashes before/after commit and requires a clean tree; receipt is retained separately as `t04-postcommit.json`.

## p04-t05: Instruction-only audit advice

Task baseline is root tracking commit `3fa12c6c8881f3d88c0377967f7008d9a121c3ca`, following verified p04-t04 `b541b04b91d8b34cb82c6a6dad6a71f4905aec9f`. The only production delta excludes AGENTS.md and CLAUDE.md when recursively detecting authored Markdown, matching the preexisting direct Contents exclusions. Genuine authored pages retain their behavior. Instructions, assets, authored files, configuration excludes and repeated adoption remain preserved.

The single additional public command regression checks instruction-only directories at multiple depths, genuine direct and nested authored child pages, an excluded authored page and a direct mapped authored page. Its independent oracle checks actual audit advice, exact Contents destinations, readable generated links, original authored/instruction bytes, full dry-run snapshots, config excludes and repeat adoption. Old archived source fails at the advice assertion: it includes an unwanted instructions/ missing-index recommendation. Fixed source passes. No private helper test, production mock, export or test hook was introduced.

### Exact evidence and exits

| Check                                  | Actual exit    | Evidence                                                    |
| -------------------------------------- | -------------- | ----------------------------------------------------------- |
| Build before bundle-backed tests       | 0              | `t05-build.log`; CLI actual execution, four packages cached |
| Direct public/consumer suite           | 0              | `t05-focused.log`; 10 files, 199 tests actually executed    |
| CLI lint / types                       | 0 / 0          | `t05-lint.log`, `t05-types.log`                             |
| Old archive build / regression         | 0 / 1 expected | `t05-old-build.log`, `t05-old-regression.log`               |
| Fixed archive build / regression       | 0 / 0          | `t05-fixed-build.log`, `t05-fixed-regression.log`           |
| Old / fixed CLI categorical oracles    | 0 / 0          | `t05-old-cli.log`, `t05-fixed-cli.log`                      |
| Actual checkout CLI categorical oracle | 0              | `t05-cli.log`                                               |

`t05-contrast.json` records the precise baseline, private archive, subprocess isolated HOME, actual commands and exits. `t05-focused.json` records actual focused/lint/types/CLI execution and isolated environment keys. No shared worktree source was neutralized and no provider credentials were passed. Six categories each run dry-run and adoption: instruction-only, nested instructions, direct authored docs, nested authored docs, excluded authored docs and ordinary authored index. Every product command exits 0 both before and after; the independent advice oracle distinguishes the two false-positive instruction cases from valid authored recommendations and the excluded case. Exact original instruction/asset bytes are preserved and valid relative Contents links resolve to real files.

### Retained categorical receipt paths

- `t05-old-cli.log`: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-remote-instructions-rnX7JJ/receipts.json`; 12 actual public CLI commands.
- `t05-fixed-cli.log`: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-remote-instructions-48c0U8/receipts.json`; 12 actual public CLI commands.
- `t05-cli.log`: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-remote-instructions-JowfZz/receipts.json`; 12 actual public CLI commands.

### Runnable instruction oracle

Save as `/tmp/oat-markdown-remote-evidence/instruction-controls.mjs`:

```javascript
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  readlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const [mode, cliArg] = process.argv.slice(2),
  cli = resolve(cliArg ?? 'packages/cli/dist/index.js');
const base = await mkdtemp(join(tmpdir(), 'oat-remote-instructions-')),
  home = join(base, 'home');
await mkdir(home);
async function snapshot(root) {
  const result = {};
  async function scan(dir, prefix = '') {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name,
        p = join(dir, e.name);
      if (e.isDirectory()) {
        result[rel + '/'] = 'directory';
        await scan(p, rel);
      } else
        result[rel] = e.isSymbolicLink()
          ? `symlink:${await readlink(p)}`
          : (await readFile(p)).toString('base64');
    }
  }
  await scan(root);
  return result;
}
const receipts = [];
for (const kind of [
  'instruction-only',
  'nested-instructions',
  'direct-docs',
  'nested-docs',
  'excluded-docs',
  'ordinary-index',
]) {
  const repo = join(base, kind);
  await mkdir(join(repo, 'docs', 'child', 'deep'), { recursive: true });
  await writeFile(join(repo, 'AGENTS.md'), '# Local root instructions\n');
  await writeFile(
    join(repo, 'docs', 'AGENTS.md'),
    '# Local docs instructions\n',
  );
  await writeFile(
    join(repo, 'docs', 'CLAUDE.md'),
    '# Provider docs instructions\n',
  );
  await writeFile(join(repo, 'docs', 'guide.md'), '# Root authored guide\n');
  if (kind === 'instruction-only')
    await writeFile(
      join(repo, 'docs', 'child', 'AGENTS.md'),
      '# Child ownership\n',
    );
  if (kind === 'nested-instructions') {
    await writeFile(
      join(repo, 'docs', 'child', 'deep', 'AGENTS.md'),
      '# Nested ownership\n',
    );
    await writeFile(
      join(repo, 'docs', 'child', 'deep', 'CLAUDE.md'),
      '# Nested provider instructions\n',
    );
    await writeFile(
      join(repo, 'docs', 'child', 'deep', 'diagram.svg'),
      '<svg/>',
    );
  }
  if (kind === 'direct-docs')
    await writeFile(
      join(repo, 'docs', 'child', 'guide.md'),
      '# Child authored guide\n',
    );
  if (kind === 'nested-docs')
    await writeFile(
      join(repo, 'docs', 'child', 'deep', 'guide.md'),
      '# Nested authored guide\n',
    );
  if (kind === 'excluded-docs') {
    await writeFile(
      join(repo, 'docs', 'child', 'guide.md'),
      '# Excluded guide\n',
    );
    await mkdir(join(repo, '.oat'));
    await writeFile(
      join(repo, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        documentation: { excludes: ['child/guide.md'] },
      }),
    );
  }
  if (kind === 'ordinary-index')
    await writeFile(
      join(repo, 'docs', 'child', 'index.md'),
      '# Authored child index\n',
    );
  const before = await snapshot(repo),
    expectedAdvice =
      ['direct-docs', 'nested-docs'].includes(kind) ||
      (mode === 'old' &&
        ['instruction-only', 'nested-instructions'].includes(kind));
  for (const dryRun of [true, false]) {
    const argv = [
      cli,
      '--json',
      '--cwd',
      repo,
      'docs',
      'init',
      '--framework',
      'markdown',
      '--adopt',
      '--yes',
      ...(dryRun ? ['--dry-run'] : []),
    ];
    const r = spawnSync(process.execPath, argv, {
      env: {
        PATH: process.env.PATH,
        HOME: home,
        TMPDIR: process.env.TMPDIR,
        CI: '1',
      },
      encoding: 'utf8',
    });
    const data = JSON.parse(r.stdout);
    assert.equal(r.status, 0, r.stdout);
    const authoredAdvice = data.auditAdvice.filter((x) =>
      x.includes('has Markdown'),
    );
    assert.deepEqual(
      authoredAdvice,
      expectedAdvice
        ? [
            'child/ has Markdown but no authored index.md; run oat-docs-analyze for repair recommendations.',
          ]
        : [],
      kind,
    );
    receipts.push({
      kind,
      dryRun,
      command: [process.execPath, ...argv],
      exit: r.status,
      authoredAdvice,
      data,
      stderr: r.stderr,
    });
    if (dryRun) assert.deepEqual(await snapshot(repo), before);
  }
  const index = await readFile(join(repo, 'docs', 'index.md'), 'utf8');
  const links = [...index.matchAll(/^- \[.*\]\(([^)]*)\)$/gm)].map((x) => x[1]);
  assert.deepEqual(
    links.sort(),
    kind === 'ordinary-index'
      ? ['child/index.md', 'contributing.md', 'guide.md']
      : ['contributing.md', 'guide.md'],
  );
  for (const link of links) await readFile(join(repo, 'docs', link));
  const after = await snapshot(repo);
  for (const [p, v] of Object.entries(before)) {
    if (p === 'AGENTS.md')
      assert(
        Buffer.from(after[p], 'base64')
          .toString()
          .startsWith(Buffer.from(v, 'base64').toString()),
      );
    else if (p === '.oat/config.json')
      assert.deepEqual(
        JSON.parse(Buffer.from(after[p], 'base64').toString()).documentation
          .excludes,
        ['child/guide.md'],
      );
    else assert.equal(after[p], v, p);
  }
}
const result = { mode, cli, base, receipts };
const path = join(base, 'receipts.json');
await writeFile(path, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ receipt: path, ...result }, null, 2));
```

### Runnable old/fixed causal proof

Save as `/tmp/oat-markdown-remote-evidence/t05-contrast.py`:

```python
import pathlib,subprocess,tempfile,json,os
repo=pathlib.Path.cwd();out=pathlib.Path('/tmp/oat-markdown-remote-evidence');base='3fa12c6c8881f3d88c0377967f7008d9a121c3ca';archive=pathlib.Path(tempfile.mkdtemp(prefix='oat-remote-t05-contrast-'));tar=archive/'source.tar';tar.write_bytes(subprocess.check_output(['git','archive',base]));subprocess.run(['tar','-xf',str(tar),'-C',str(archive)],check=True);tar.unlink()
for rel in ['node_modules','packages/cli/node_modules','packages/control-plane/node_modules','packages/docs-config/node_modules','packages/docs-theme/node_modules','packages/docs-transforms/node_modules']:
 if (repo/rel).is_dir():(archive/rel).symlink_to(repo/rel,target_is_directory=True)
test='packages/cli/src/commands/docs/init/integration.test.ts';source='packages/cli/src/commands/docs/init/markdown.ts';(archive/test).write_bytes((repo/test).read_bytes());home=tempfile.mkdtemp(prefix='oat-remote-contrast-home-');env={k:os.environ[k]for k in ['PATH','TMPDIR','LANG','LC_ALL','SHELL','USER','LOGNAME']if k in os.environ};env.update(HOME=home,CI='1');records=[]
def run(name,argv,expected):
 p=subprocess.run(argv,cwd=archive,env=env,capture_output=True,text=True);log=out/(name+'.log');log.write_text(p.stdout+p.stderr);records.append({'name':name,'command':argv,'cwd':str(archive),'exit':p.returncode,'log':str(log),'actualExecution':True});(out/'t05-contrast.json').write_text(json.dumps({'base':base,'archive':str(archive),'isolatedHome':home,'sharedSourcesNeutralized':False,'receipts':records},indent=2)+'\n');assert p.returncode==expected,(name,p.stdout,p.stderr);return p.stdout+p.stderr
for mode in ['old','fixed']:
 if mode=='fixed':(archive/source).write_bytes((repo/source).read_bytes())
 run('t05-'+mode+'-build',['pnpm','--filter','@open-agent-toolkit/cli','build'],0)
 output=run('t05-'+mode+'-regression',['pnpm','--filter','@open-agent-toolkit/cli','exec','vitest','run','src/commands/docs/init/integration.test.ts','-t','audits authored Markdown while exempting recursive instruction-only content'],1 if mode=='old'else 0)
 if mode=='old':assert 'AssertionError' in output and 'instructions/ has Markdown' in output,output
 run('t05-'+mode+'-cli',['node',str(out/'instruction-controls.mjs'),mode,str(archive/'packages/cli/dist/index.js')],0)
print(json.dumps(records,indent=2))
```

```bash
python3 /tmp/oat-markdown-remote-evidence/t05-contrast.py > /tmp/oat-markdown-remote-evidence/t05-contrast-run.log 2>&1
result=$?
printf 'exit=%s\n' "$result"
exit "$result"
```

### Runnable focused checks

Save as `/tmp/oat-markdown-remote-evidence/t05-focused.py`:

```python
import pathlib,subprocess,tempfile,os,json,sys
out=pathlib.Path('/tmp/oat-markdown-remote-evidence');home=tempfile.mkdtemp(prefix='oat-remote-focused-home-');env={k:os.environ[k]for k in ['PATH','TMPDIR','LANG','LC_ALL','SHELL','USER','LOGNAME']if k in os.environ};env.update(HOME=home,CI='1');records=[]
files=['src/commands/docs/init/resolve-options.test.ts','src/commands/docs/init/scaffold.test.ts','src/commands/docs/init/index.test.ts','src/commands/docs/init/integration.test.ts','src/commands/docs/init/docs-commands.test.ts','src/commands/docs/init/root-package.test.ts','src/commands/docs/init/mkdocs-compat.test.ts','src/commands/init/tools/shared/bundle-consistency.test.ts','src/commands/tools/shared/pack-lifecycle.test.ts','src/commands/shared/agents-md.test.ts']
for name,argv in [('focused',['pnpm','--filter','@open-agent-toolkit/cli','exec','vitest','run',*files]),('lint',['pnpm','--filter','@open-agent-toolkit/cli','lint']),('types',['pnpm','--filter','@open-agent-toolkit/cli','type-check']),('cli',['node',str(out/'instruction-controls.mjs'),'fixed'])]:
 log=out/('t05-'+name+'.log')
 with log.open('w')as stream:p=subprocess.run(argv,env=env,stdout=stream,stderr=subprocess.STDOUT)
 records.append({'name':name,'command':argv,'exit':p.returncode,'log':str(log),'actualExecution':True});(out/'t05-focused.json').write_text(json.dumps({'isolatedHome':home,'environmentKeys':sorted(env),'commands':records},indent=2)+'\n');print(name,p.returncode,flush=True)
 if p.returncode:sys.exit(p.returncode)
```

Scoped formatting, diff and fenced-probe syntax checks are captured at `t05-format-check.log`, `t05-diff-check.log` and `t05-artifact-checks.json`. Owned pre/post-hook hashes and exact commit boundary are recorded at `t05-postcommit.json`. Final ordered eight CI gates await the explicit root tracking ACK after this source task commit; independent final review and retained implementation-exit gate remain root-owned and pending. Recovery remains 0/10.

## Final remote fix acceptance verification

Root acknowledged p04-t05 and committed tracking at `0620794717bb0039753213c24e37868b476afbdb`; the following gates ran sequentially on that committed source head. Both source hashes were pinned before the run and verified unchanged afterward. The source commits are p04-t04 `b541b04b91d8b34cb82c6a6dad6a71f4905aec9f` and p04-t05 `e74c06116acc294feb290c08e2677f8975de33da`. No source edits followed those commits. This section is an evidence-only acceptance append authorized by root, not a new source task or recovery.

All eight required gate commands and the intervening fresh fetch have actual exit 0. The exact durable receipt below includes every argv, log path, elapsed time, cache labels, source hashes and isolated subprocess HOME. The runner exited 0 and stopped on any possible nonzero command; no pipeline/filter status was used. The pnpm gates inherited an environment allowlist without provider credentials. Fresh fetch used the existing authorized Git transport and confirmed `origin/main` at `98d1d524624e17f55ccfce33d18b3d5535dc91ca` before the version gate.

| Order       | Gate                        | Exit | Actual execution / cache limitation                                                           | Log under /tmp/oat-markdown-remote-evidence |
| ----------- | --------------------------- | ---- | --------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1           | pnpm check                  | 0    | CLI and docs check actual; 9 other tasks cached; root skill/Markdown/format validation actual | 01-check.log                                |
| 2           | pnpm type-check             | 0    | CLI types actual; 9 other tasks cached                                                        | 02-types.log                                |
| 3           | pnpm test                   | 0    | CLI 398 files / 7,969 tests actual; docs dependency build actual; 8 tasks cached              | 03-test.log                                 |
| 4           | pnpm build                  | 0    | All 5 tasks cached; actual CLI builds retained above                                          | 04-build.log                                |
| 5           | pnpm run check:skill-bumps  | 0    | Actual script, all 5 changed skill/role bump checks pass                                      | 05-skills.log                               |
| Between 5/6 | git fetch origin main       | 0    | Actual fresh fetch, main SHA pinned above                                                     | fetch-main.log                              |
| 6           | pnpm release:check-versions | 0    | Actual release version script                                                                 | 06-versions.log                             |
| 7           | pnpm release:validate       | 0    | Actual five-package tarball validation, all public versions 0.3.11                            | 07-release.log                              |
| 8           | pnpm build:docs             | 0    | All 6 tasks cached; docs actually generated 73/73 pages in step 3                             | 08-docs.log                                 |

Step 3 also actually ran root Node suites: smoke 163/163, skills 660/660, scripts 1/1; each reports fail 0. The unchanged control-plane 151, docs-config 10 and docs-transforms 31 tests were cached replay, not claimed as fresh runs. Their prior actual integration controls remain retained in `reviews/final-integration-controls.md` and `/tmp/oat-markdown-integration-evidence/`. No redundant forced workspace run was required or performed. Positive results are supported by the separately retained old-failing/fixed-passing regression and real public CLI categorical controls above.

### Exact source and gate receipt

```json
{
  "sourceHead": "0620794717bb0039753213c24e37868b476afbdb",
  "sourceHashes": {
    "packages/cli/src/commands/docs/init/markdown.ts": "4f8b3b890280c76535c7bdf5c1b6d3eb199133801421de37ffe2369b99b148dd",
    "packages/cli/src/commands/docs/init/integration.test.ts": "742102bb675855d7f50c550c8c04ffcef068cd4573c02d942b0e64b4feaaa0f9"
  },
  "isolatedHome": "/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-remote-gates-home-nmnhidxv",
  "pnpmEnvironmentKeys": [
    "CI",
    "HOME",
    "LANG",
    "LC_ALL",
    "LOGNAME",
    "NO_UPDATE_NOTIFIER",
    "PATH",
    "SHELL",
    "TMPDIR",
    "USER"
  ],
  "providerCredentialsPassedToGates": false,
  "fetchUsesExistingGitTransport": true,
  "commands": [
    {
      "name": "01-check",
      "command": ["pnpm", "check"],
      "exit": 0,
      "seconds": 8.68,
      "log": "/tmp/oat-markdown-remote-evidence/01-check.log",
      "cacheHitLines": 9,
      "cacheMissLines": 2
    },
    {
      "name": "02-types",
      "command": ["pnpm", "type-check"],
      "exit": 0,
      "seconds": 1.57,
      "log": "/tmp/oat-markdown-remote-evidence/02-types.log",
      "cacheHitLines": 9,
      "cacheMissLines": 1
    },
    {
      "name": "03-test",
      "command": ["pnpm", "test"],
      "exit": 0,
      "seconds": 133.43,
      "log": "/tmp/oat-markdown-remote-evidence/03-test.log",
      "cacheHitLines": 8,
      "cacheMissLines": 2
    },
    {
      "name": "04-build",
      "command": ["pnpm", "build"],
      "exit": 0,
      "seconds": 1.51,
      "log": "/tmp/oat-markdown-remote-evidence/04-build.log",
      "cacheHitLines": 5,
      "cacheMissLines": 0
    },
    {
      "name": "05-skills",
      "command": ["pnpm", "run", "check:skill-bumps"],
      "exit": 0,
      "seconds": 2.25,
      "log": "/tmp/oat-markdown-remote-evidence/05-skills.log",
      "cacheHitLines": 0,
      "cacheMissLines": 0
    },
    {
      "name": "fetch-main",
      "command": ["git", "fetch", "origin", "main"],
      "exit": 0,
      "seconds": 0.31,
      "log": "/tmp/oat-markdown-remote-evidence/fetch-main.log",
      "cacheHitLines": 0,
      "cacheMissLines": 0,
      "mainSha": "98d1d524624e17f55ccfce33d18b3d5535dc91ca"
    },
    {
      "name": "06-versions",
      "command": ["pnpm", "release:check-versions"],
      "exit": 0,
      "seconds": 0.71,
      "log": "/tmp/oat-markdown-remote-evidence/06-versions.log",
      "cacheHitLines": 0,
      "cacheMissLines": 0
    },
    {
      "name": "07-release",
      "command": ["pnpm", "release:validate"],
      "exit": 0,
      "seconds": 3.28,
      "log": "/tmp/oat-markdown-remote-evidence/07-release.log",
      "cacheHitLines": 0,
      "cacheMissLines": 0
    },
    {
      "name": "08-docs",
      "command": ["pnpm", "build:docs"],
      "exit": 0,
      "seconds": 2.13,
      "log": "/tmp/oat-markdown-remote-evidence/08-docs.log",
      "cacheHitLines": 6,
      "cacheMissLines": 0
    }
  ]
}
```

### Runnable sequential gate runner

Save as `/tmp/oat-markdown-remote-evidence/run-gates.py` and run at the pinned committed source head. It deliberately refuses a different HEAD rather than treating another source as this acceptance receipt.

```python
import pathlib,subprocess,json,time,sys,tempfile,os,hashlib
out=pathlib.Path('/tmp/oat-markdown-remote-evidence');records=[];head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();assert head=='0620794717bb0039753213c24e37868b476afbdb';home=tempfile.mkdtemp(prefix='oat-remote-gates-home-');env={k:os.environ[k]for k in ['PATH','TMPDIR','LANG','LC_ALL','SHELL','USER','LOGNAME']if k in os.environ};env.update(HOME=home,CI='1',NO_UPDATE_NOTIFIER='1');sources=['packages/cli/src/commands/docs/init/markdown.ts','packages/cli/src/commands/docs/init/integration.test.ts'];hashes={p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()for p in sources}
commands=[('01-check',['pnpm','check']),('02-types',['pnpm','type-check']),('03-test',['pnpm','test']),('04-build',['pnpm','build']),('05-skills',['pnpm','run','check:skill-bumps']),('fetch-main',['git','fetch','origin','main']),('06-versions',['pnpm','release:check-versions']),('07-release',['pnpm','release:validate']),('08-docs',['pnpm','build:docs'])]
for name,argv in commands:
 start=time.time();log=out/(name+'.log')
 with log.open('w')as stream:p=subprocess.run(argv,env=None if name=='fetch-main'else env,stdout=stream,stderr=subprocess.STDOUT)
 text=log.read_text();r={'name':name,'command':argv,'exit':p.returncode,'seconds':round(time.time()-start,2),'log':str(log),'cacheHitLines':text.count('cache hit, replaying logs'),'cacheMissLines':text.count('cache miss, executing')};records.append(r)
 if name=='fetch-main':r['mainSha']=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
 (out/'gate-receipts.json').write_text(json.dumps({'sourceHead':head,'sourceHashes':hashes,'isolatedHome':home,'pnpmEnvironmentKeys':sorted(env),'providerCredentialsPassedToGates':False,'fetchUsesExistingGitTransport':True,'commands':records},indent=2)+'\n');print(json.dumps(r),flush=True)
 if p.returncode:sys.exit(p.returncode)
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==head
assert hashes=={p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()for p in sources}
```

```bash
python3 /tmp/oat-markdown-remote-evidence/run-gates.py > /tmp/oat-markdown-remote-evidence/gate-run.log 2>&1
result=$?
printf 'exit=%s\n' "$result"
exit "$result"
```

### Evidence commit boundary

Only this artifact is changed for the acceptance evidence commit. Scoped `oxfmt --check`, `git diff --check`, all seven retained runnable probe syntax checks and exact pre/post-hook hashes are captured under `/tmp/oat-markdown-remote-evidence/` as `acceptance-format-check.log`, `acceptance-diff-check.log`, `acceptance-artifact-checks.json` and `acceptance-postcommit.json`. Source fingerprints must remain identical to the receipt above and the worktree must be clean. Root final review, implementation-exit gate refresh, PR synchronization and final approval remain pending and root-owned. Original request/accepted target controls and recovery 0/10 remain unchanged; no live installation, provider workload, publication or push occurred.
