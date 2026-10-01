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
