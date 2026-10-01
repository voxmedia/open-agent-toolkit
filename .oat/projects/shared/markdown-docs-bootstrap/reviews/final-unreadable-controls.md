# Optional Unreadable Directory Controls

## p04-t06 source acceptance

Original request `markdown-p04-pinned-20261001`, accepted target `oat-phase-implementer-gpt-6-1-sol-high-3da8a37eed`, configured gpt-6.1-sol/high. Baseline `6ad9b2223716db22dbc95a0d21d0681e363307e1` was clean. This is ordinary bounded address-now work from a passing retained judgment, not a blocking retry or recovery. Recovery remains 0/10. Parent owns tracking, final review, configured gate freshness and PR/approval work.

Only optional recursive discovery catches EACCES/EPERM from directory enumeration. It preserves the inaccessible directory and reports its exact uninspected path for repair, without asserting unknown content is Markdown. Other errors propagate. Required root/target validation, child entrypoint handling, exclusion rules and symlink non-traversal are unchanged. Readable sibling Contents links continue resolving to actual files.

One additional public init/adoption regression applies real chmod 0 to `docs/optional/blocked/`, independently confirms readdir returns EACCES, then tests dry-run, adoption and repeat. It verifies literal path-specific advice, absence of confirmed-Markdown advice, exact usable Contents destinations, readable links, original byte/directory snapshots and dry-run nonmutation. Permission restoration occurs in finally; permissions are temporarily restored only for independent preservation snapshots and reapplied before the next public command. The regression can explicitly skip only if this runtime cannot enforce EACCES. This execution enforced EACCES and did not skip. No private helper regression, own-module mock, test hook or new export was added.

The same new test fails against archived baseline production at the intended public preview exit assertion (actual1, expected0), and passes after restoring fixed production in that archive. Shared worktree source was never neutralized.

### Actual checks and categorical proof

All logs/receipts are under `/tmp/oat-markdown-unreadable-evidence/`.

| Check                                       | Exit           | Evidence                                              |
| ------------------------------------------- | -------------- | ----------------------------------------------------- |
| Build before bundle-backed checks           | 0              | task-build.log; CLI actual, four packages cached      |
| Direct public/guard consumer suite          | 0              | task-focused.log; 10 files, 200 tests actual, no skip |
| CLI lint / types                            | 0 / 0          | task-lint.log, task-types.log                         |
| Old private build / regression              | 0 / 1 expected | task-old-build.log, task-old-regression.log           |
| Fixed private build / regression            | 0 / 0          | task-fixed-build.log, task-fixed-regression.log       |
| Old / fixed actual CLI categorical wrappers | 0 / 0          | task-old-cli.log, task-fixed-cli.log                  |
| Current checkout CLI categorical wrapper    | 0              | task-cli.log                                          |

`task-contrast.json` records the exact baseline/private archive/isolated HOME/commands/exits. `task-focused.json` records direct execution and isolated environment keys. CLI controls confirm actual EACCES before any product invocation. Old unreadable-optional dry-run and adoption exit1 with EACCES at optional/blocked; fixed dry-run/adoption/repeat exit0 with preserved directory permissions/bytes and accurate advice. Both versions accept readable authored controls (including repeat) with real Contents links and refuse required external root aliases (exit1) without mutation. External bytes remain unchanged. Root instructions retain their exact existing prefix before authorized managed guidance append. Every chmod is restored in finally. No normal user HOME or provider credentials are used.

### Exact categorical receipt paths

- `task-old-cli.log`: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-unreadable-cli-IXQO9C/receipts.json`; 7 actual public CLI invocations; real EACCES enforced.
- `task-fixed-cli.log`: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-unreadable-cli-3b7kHZ/receipts.json`; 8 actual public CLI invocations; real EACCES enforced.
- `task-cli.log`: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-unreadable-cli-3FP1u4/receipts.json`; 8 actual public CLI invocations; real EACCES enforced.

### Runnable public CLI controls

Save as `/tmp/oat-markdown-unreadable-evidence/cli-controls.mjs`:

```javascript
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  readlink,
  symlink,
  chmod,
  stat,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const [mode, cliArg] = process.argv.slice(2),
  cli = resolve(cliArg ?? 'packages/cli/dist/index.js');
const base = await mkdtemp(join(tmpdir(), 'oat-unreadable-cli-')),
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
let enforced = false;
for (const kind of [
  'unreadable-optional',
  'readable-authored',
  'required-external-root',
]) {
  const repo = join(base, kind),
    blocked = join(repo, 'docs', 'optional', 'blocked'),
    external = join(base, kind + '-external');
  await mkdir(blocked, { recursive: true });
  await mkdir(join(repo, 'docs', 'ordinary'));
  await mkdir(external);
  await writeFile(
    join(repo, 'docs', 'ordinary', 'index.md'),
    '# Readable sibling index\n',
  );
  await writeFile(join(repo, 'docs', 'guide.md'), '# Readable root guide\n');
  await writeFile(
    join(repo, 'docs', 'optional', 'blocked', 'keep.md'),
    '# Retained optional bytes\n',
  );
  await writeFile(join(repo, 'AGENTS.md'), '# Local root instructions\n');
  await writeFile(join(external, 'private.md'), '# External private bytes\n');
  if (kind === 'required-external-root')
    await symlink(join(external, 'private.md'), join(repo, 'docs', 'index.md'));
  const before = await snapshot(repo),
    outsideBefore = await snapshot(external);
  const expected =
    kind === 'required-external-root' ||
    (kind === 'unreadable-optional' && mode === 'old')
      ? 1
      : 0;
  try {
    if (kind === 'unreadable-optional') {
      await chmod(blocked, 0);
      try {
        await readdir(blocked);
      } catch (e) {
        if (e.code === 'EACCES') enforced = true;
        else throw e;
      }
      assert(
        enforced,
        'Actual EACCES could not be enforced; this is not permission proof',
      );
    }
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
        }),
        data = JSON.parse(r.stdout);
      assert.equal(r.status, expected, r.stdout);
      receipts.push({
        kind,
        dryRun,
        exit: r.status,
        command: [process.execPath, ...argv],
        data,
        stderr: r.stderr,
      });
      if (kind === 'unreadable-optional') {
        assert.equal((await stat(blocked)).mode & 0o777, 0);
        if (mode === 'fixed') {
          assert(
            data.auditAdvice.includes(
              'optional/blocked/ could not be inspected due to permissions; it was preserved. Run oat-docs-analyze for repair recommendations.',
            ),
          );
          assert(!data.auditAdvice.some((x) => x.includes('has Markdown')));
        } else
          assert(
            data.message.includes('EACCES') &&
              data.message.includes('optional/blocked'),
          );
      }
      if (dryRun || expected === 1) {
        await chmod(blocked, 0o755);
        assert.deepEqual(await snapshot(repo), before);
        if (kind === 'unreadable-optional') await chmod(blocked, 0);
      }
    }
    if (expected === 0) {
      const index = await readFile(join(repo, 'docs', 'index.md'), 'utf8'),
        links = [...index.matchAll(/^- \[.*\]\(([^)]*)\)$/gm)].map((x) => x[1]);
      assert.deepEqual(links.sort(), [
        'contributing.md',
        'guide.md',
        'ordinary/index.md',
      ]);
      for (const link of links) await readFile(join(repo, 'docs', link));
      await chmod(blocked, 0o755);
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
      if (kind === 'unreadable-optional') await chmod(blocked, 0);
      const args = [
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
      ];
      const repeated = spawnSync(process.execPath, args, {
        env: {
          PATH: process.env.PATH,
          HOME: home,
          TMPDIR: process.env.TMPDIR,
          CI: '1',
        },
        encoding: 'utf8',
      });
      assert.equal(repeated.status, 0);
      receipts.push({
        kind,
        repeat: true,
        exit: repeated.status,
        command: [process.execPath, ...args],
        data: JSON.parse(repeated.stdout),
      });
      await chmod(blocked, 0o755);
      assert.deepEqual(await snapshot(repo), after);
    }
    assert.deepEqual(await snapshot(external), outsideBefore);
  } finally {
    await chmod(blocked, 0o755);
  }
}
const result = { mode, cli, base, realEACCESEnforced: enforced, receipts };
const path = join(base, 'receipts.json');
await writeFile(path, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ receipt: path, ...result }, null, 2));
```

### Runnable isolated old/fixed causal proof

Save as `/tmp/oat-markdown-unreadable-evidence/contrast.py`:

```python
import pathlib,subprocess,tempfile,json,os
repo=pathlib.Path.cwd();out=pathlib.Path('/tmp/oat-markdown-unreadable-evidence');base='6ad9b2223716db22dbc95a0d21d0681e363307e1';archive=pathlib.Path(tempfile.mkdtemp(prefix='oat-remote-task-contrast-'));tar=archive/'source.tar';tar.write_bytes(subprocess.check_output(['git','archive',base]));subprocess.run(['tar','-xf',str(tar),'-C',str(archive)],check=True);tar.unlink()
for rel in ['node_modules','packages/cli/node_modules','packages/control-plane/node_modules','packages/docs-config/node_modules','packages/docs-theme/node_modules','packages/docs-transforms/node_modules']:
 if (repo/rel).is_dir():(archive/rel).symlink_to(repo/rel,target_is_directory=True)
test='packages/cli/src/commands/docs/init/integration.test.ts';source='packages/cli/src/commands/docs/init/markdown.ts';(archive/test).write_bytes((repo/test).read_bytes());home=tempfile.mkdtemp(prefix='oat-remote-contrast-home-');env={k:os.environ[k]for k in ['PATH','TMPDIR','LANG','LC_ALL','SHELL','USER','LOGNAME']if k in os.environ};env.update(HOME=home,CI='1');records=[]
def run(name,argv,expected):
 p=subprocess.run(argv,cwd=archive,env=env,capture_output=True,text=True);log=out/(name+'.log');log.write_text(p.stdout+p.stderr);records.append({'name':name,'command':argv,'cwd':str(archive),'exit':p.returncode,'log':str(log),'actualExecution':True});(out/'task-contrast.json').write_text(json.dumps({'base':base,'archive':str(archive),'isolatedHome':home,'sharedSourcesNeutralized':False,'receipts':records},indent=2)+'\n');assert p.returncode==expected,(name,p.stdout,p.stderr);return p.stdout+p.stderr
for mode in ['old','fixed']:
 if mode=='fixed':(archive/source).write_bytes((repo/source).read_bytes())
 run('task-'+mode+'-build',['pnpm','--filter','@open-agent-toolkit/cli','build'],0)
 output=run('task-'+mode+'-regression',['pnpm','--filter','@open-agent-toolkit/cli','exec','vitest','run','src/commands/docs/init/integration.test.ts','-t','preserves inaccessible optional directories while adopting readable siblings'],1 if mode=='old'else 0)
 if mode=='old':assert 'AssertionError' in output and 'expected 1 to be +0' in output,output
 run('task-'+mode+'-cli',['node',str(out/'cli-controls.mjs'),mode,str(archive/'packages/cli/dist/index.js')],0)
print(json.dumps(records,indent=2))
```

```bash
python3 /tmp/oat-markdown-unreadable-evidence/contrast.py > /tmp/oat-markdown-unreadable-evidence/contrast-run.log 2>&1
result=$?
printf 'exit=%s\n' "$result"
exit "$result"
```

### Runnable focused consumer checks

Save as `/tmp/oat-markdown-unreadable-evidence/focused.py` and run after building:

```python
import pathlib,subprocess,tempfile,os,json,sys
out=pathlib.Path('/tmp/oat-markdown-unreadable-evidence');home=tempfile.mkdtemp(prefix='oat-remote-focused-home-');env={k:os.environ[k]for k in ['PATH','TMPDIR','LANG','LC_ALL','SHELL','USER','LOGNAME']if k in os.environ};env.update(HOME=home,CI='1');records=[]
files=['src/commands/docs/init/resolve-options.test.ts','src/commands/docs/init/scaffold.test.ts','src/commands/docs/init/index.test.ts','src/commands/docs/init/integration.test.ts','src/commands/docs/init/docs-commands.test.ts','src/commands/docs/init/root-package.test.ts','src/commands/docs/init/mkdocs-compat.test.ts','src/commands/init/tools/shared/bundle-consistency.test.ts','src/commands/tools/shared/pack-lifecycle.test.ts','src/commands/shared/agents-md.test.ts']
for name,argv in [('focused',['pnpm','--filter','@open-agent-toolkit/cli','exec','vitest','run',*files]),('lint',['pnpm','--filter','@open-agent-toolkit/cli','lint']),('types',['pnpm','--filter','@open-agent-toolkit/cli','type-check']),('cli',['node',str(out/'cli-controls.mjs'),'fixed'])]:
 log=out/('task-'+name+'.log')
 with log.open('w')as stream:p=subprocess.run(argv,env=env,stdout=stream,stderr=subprocess.STDOUT)
 records.append({'name':name,'command':argv,'exit':p.returncode,'log':str(log),'actualExecution':True});(out/'task-focused.json').write_text(json.dumps({'isolatedHome':home,'environmentKeys':sorted(env),'commands':records},indent=2)+'\n');print(name,p.returncode,flush=True)
 if p.returncode:sys.exit(p.returncode)
```

Scoped format/diff checks and durable probe syntax are retained as `task-format-check.log`, `task-diff-check.log` and `task-artifact-checks.json`; owned pre/post-hook hashes and clean exact three-file boundary as `task-postcommit.json`. The eight final ordered CI gates await root tracking ACK after this task commit. Final review/configured gate and approval remain pending and root-owned. Existing five public versions0.3.11/PR-scoped skill bumps are unchanged.
