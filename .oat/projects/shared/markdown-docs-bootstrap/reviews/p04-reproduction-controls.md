# p04 Integration Reproduction Controls

Run from repository root after building the chosen commit. These are bounded acceptance probes, not new automatic tests. Save each named fenced block in a temporary directory and invoke the command shown. The probes operate only on newly created temporary repositories/homes; they do not publish, install into the real user home, or alter production source.

## Observed integrated controls

At p04-t02 base `92bd00dc80c623bde5220a39603d80b81a1b174d`, the built CLI ran 24 additional controls with asserted exact exit/status categories, filesystem/config hashes and real instruction sync/validate. Accepted fresh Fumadocs/MkDocs runs exit 0. Explicit framework replacement of configured Markdown preserves Markdown page bytes, changes documentation config, and reports partial/exit 1 with manual-required guidance because the managed Markdown block is retained. Negative unsafe-root/config/manifest controls fail before writes; narrowed and aliased authored output fail specifically for protected Markdown output, not missing config.

Six retained replay scripts each exit 0: p02 fresh/refusal, additive adoption/dry-run/excludes/config failure/retry, encoded navigation, p03 source-aware walkthrough, documented examples and pinned metadata/link checker. The checker verifies exactly twelve committed source pages and 105 relative destinations. The Python fence extractor below accepts three or more backticks and matching-length closing fences, including the formatter's four-backtick block.

Historical pre-fix accepted overwrite, missing capability, old-encoder broken navigation, and guard-neutralization controls remain in `implementation.md`, `reviews/p01-review-2026-10-01T120229Z.md`, `reviews/p02-reproduction-controls.md`, and p02 reviews. Independent prior reviews reproduced their intended failing states and accepted restored controls. No new production assurance guard was added in p04; those mutations were not repeated in the shared worktree. Current public boundary controls provide direct filesystem evidence in addition to the fixtures.

Logs/results: `/tmp/oat-markdown-p04-evidence/t02-integrated-controls.log`, `t02-p02-{0,1,3}.log`, `t02-p03-{0,1,2}.log`, `retained-replays.json`. Latest integrated tree/results: `/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-markdown-p04-acceptance-7h69zyrq/results.json`. Each replay prints its own newly created artifact destination. Commands remain durable below; temporary logs are supporting evidence, not required for reproduction.

Probe setup corrections before task commit: terminal output is checked for the actual index/contributing paths rather than an invented label; replacement expects the observed managed-guidance partial outcome. No production edit or post-commit recovery occurred.

## integrated-controls.py

Run `python3 <temporary-dir>/integrated-controls.py`.

```python
import hashlib,json,os,pathlib,subprocess,tempfile
base=pathlib.Path(tempfile.mkdtemp(prefix='oat-markdown-p04-acceptance-'));home=base/'home';home.mkdir();cli=str(pathlib.Path('packages/cli/dist/index.js').resolve());records=[]
def seed(root,path,content):
 p=root/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
def repo(name):
 root=base/name;root.mkdir();subprocess.run(['git','init','-q',str(root)],check=True);seed(root,'.oat/config.json','{"version":1,"worktrees":{"root":"custom-worktrees"}}\n');return root
def snap(root):
 return {str(p.relative_to(root)):('symlink:'+os.readlink(p) if p.is_symlink() else hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(root.rglob('*')) if (p.is_symlink() or p.is_file()) and '.git' not in p.relative_to(root).parts}
def run(name,root,args,want=0,json_mode=True,unchanged=False):
 before=snap(root);cmd=['node',cli,'--cwd',str(root)]+(['--json'] if json_mode else [])+args;p=subprocess.run(cmd,text=True,capture_output=True,env={**os.environ,'HOME':str(home),'OAT_ASSETS_DIR':''});after=snap(root);r={'name':name,'command':cmd,'exit':p.returncode,'stdout':p.stdout,'stderr':p.stderr,'before':before,'after':after};records.append(r);(base/'results.json').write_text(json.dumps(records,indent=2)+'\n');assert p.returncode==want,(name,p.stdout,p.stderr);assert not unchanged or before==after,name;return json.loads(p.stdout) if json_mode else p.stdout+p.stderr
init=['docs','init','--framework','markdown','--yes']
# Actual terminal surface: literal nested content tree and instruction consumers.
nested=repo('nested');seed(nested,'handbook/docs/index.md','# Child context\n');seed(nested,'handbook/guide.md','# Parent operations\n');seed(nested,'handbook/AGENTS.md','# Local parent guidance\n');seed(nested,'handbook/docs/AGENTS.md','# Local child guidance\n')
terminal=run('terminal-nested-adoption',nested,init+['--target-dir','handbook','--adopt'],json_mode=False);assert 'handbook/index.md' in terminal and 'handbook/contributing.md' in terminal;assert 'pnpm install' not in terminal
cfg=json.loads((nested/'.oat/config.json').read_text());assert cfg['documentation']=={'tooling':'markdown','root':'handbook','index':'handbook/index.md'};assert cfg['worktrees']['root']=='custom-worktrees';original={p:(nested/p).read_bytes() for p in ['handbook/guide.md','handbook/docs/index.md','handbook/AGENTS.md','handbook/docs/AGENTS.md']};content=(nested/'handbook/index.md').read_text();assert '](guide.md)' in content and '](docs/index.md)' in content
run('nested-pointer-sync',nested,['instructions','sync','--strategy','pointer']);run('nested-pointer-validate',nested,['instructions','validate','--strategy','pointer'],unchanged=True)
for path,data in original.items():assert (nested/path).read_bytes()==data
assert not list((nested/'handbook').rglob('CLAUDE.md'))
# Real partial writes and terminal/JSON previews.
partial=repo('partial');seed(partial,'docs/index.md','# Existing private context\n');guidance='<!-- OAT docs -->\n## Documentation\n\nPrivate operator routing.\n<!-- END OAT docs -->\n';seed(partial,'AGENTS.md',guidance)
text=run('terminal-manual-preview',partial,init+['--adopt','--dry-run'],want=1,json_mode=False,unchanged=True);assert 'planned' in text.lower() and 'manual' in text.lower()
r=run('actual-manual-partial',partial,init+['--adopt'],want=1);assert r['status']=='partial' and r['guidance']['action']=='manual-required';assert r['createdFiles']==['contributing.md'];assert (partial/'AGENTS.md').read_text()==guidance;assert (partial/'docs/index.md').read_text()=='# Existing private context\n'
# Unsafe root controls must refuse prior to mutation (including symlink external target).
for name,target in [('repository-root','.'),('escaping-root','../outside')]:
 root=repo(name);r=run(name,root,init+['--target-dir',target],want=1,unchanged=True);assert r['status']=='error'
outside=base/'outside-symlink';outside.mkdir();seed(outside,'preserved.md','# External owner\n');root=repo('symlink-root');os.symlink(outside,root/'docs');before=snap(outside);run('escaping-symlink',root,init+['--adopt'],want=1,unchanged=True);assert snap(outside)==before
for name,documentation in [('framework-config',{'tooling':'mkdocs','root':'site','index':'site/mkdocs.yml'}),('unknown-tooling',{'tooling':'private-engine','root':'docs'}),('root-conflict',{'tooling':'markdown','root':'other','index':'other/index.md'}),('index-conflict',{'tooling':'markdown','root':'docs','index':'docs/custom.md'})]:
 root=repo(name);seed(root,'.oat/config.json',json.dumps({'version':1,'documentation':documentation}));run(name,root,init,want=1,unchanged=True)
# Manifest negative/accepted controls against meaningful configured content.
root=repo('manifest');authored='---\ntitle: Team handbook\ndescription: Authored team context\n---\n\n# Team handbook\n\nAudience: maintainers. Ownership: docs team.\n\n## Contents\n\n- [Guide](sub/guide.md)\n';seed(root,'docs/index.md',authored);seed(root,'docs/sub/guide.md','---\ntitle: Guide\ndescription: Operate the system\n---\n\n# Guide\n');seed(root,'.oat/config.json',json.dumps({'version':1,'documentation':{'tooling':'markdown','root':'docs','index':'docs/index.md'}}))
r=run('default-manifest-refusal',root,['docs','generate-index'],want=1,unchanged=True);assert '--output' in r['message']
r=run('narrowed-authored-refusal',root,['docs','generate-index','--docs-dir','docs/sub','--output','docs/index.md'],want=1,unchanged=True);assert 'protected Markdown' in r['message'];assert (root/'docs/index.md').read_text()==authored
os.symlink(root/'docs/index.md',root/'alias.md');r=run('symlink-manifest-refusal',root,['docs','generate-index','--docs-dir','docs/sub','--output','alias.md'],want=1,unchanged=True);assert 'protected Markdown' in r['message']
configbytes=(root/'.oat/config.json').read_bytes();run('external-manifest-accepted',root,['docs','generate-index','--output','.oat/manifest.md']);assert (root/'docs/index.md').read_text()==authored;assert (root/'.oat/config.json').read_bytes()==configbytes;assert (root/'.oat/manifest.md').is_file()
# Real framework scaffold accepted controls; explicitly requested replacement retains Markdown bytes.
for framework in ['fumadocs','mkdocs']:
 root=repo(framework+'-fresh');r=run(framework+'-fresh',root,['docs','init','--framework',framework,'--target-dir','site','--site-name','Framework control','--yes']);assert r['status']=='ok';assert json.loads((root/'.oat/config.json').read_text())['documentation']['tooling'].startswith(framework)
 replacement=repo(framework+'-replacement');run(framework+'-markdown-seed',replacement,init);before={p:(replacement/p).read_bytes() for p in ['docs/index.md','docs/contributing.md']};r=run(framework+'-replacement',replacement,['docs','init','--framework',framework,'--target-dir','site','--yes'],want=1);assert r['status']=='partial' and r['scaffold']['status']=='complete' and r['guidance']['action']=='manual-required';assert json.loads((replacement/'.oat/config.json').read_text())['documentation']['tooling'].startswith(framework)
 for p,data in before.items():assert (replacement/p).read_bytes()==data
# Fumadocs explicit configured output and existing seed-index transition.
root=repo('fumadocs-manifest');seed(root,'apps/docs/docs/guide.md','---\ntitle: Guide\ndescription: Runtime guide\n---\n\n# Guide\n')
for index in ['apps/docs/index.md','apps/docs/docs/index.md']:
 seed(root,'.oat/config.json',json.dumps({'version':1,'documentation':{'tooling':'fumadocs','root':'apps/docs','index':index}}));run('fumadocs-output-'+index,root,['docs','generate-index','--output','apps/docs/index.md']);assert json.loads((root/'.oat/config.json').read_text())['documentation']['index']=='apps/docs/index.md'
(base/'results.json').write_text(json.dumps(records,indent=2)+'\n');print(json.dumps({'base':str(base),'cases':len(records),'exits':{r['name']:r['exit'] for r in records},'status':'pass'},indent=2))
```

## replay-retained.py

Run `python3 <temporary-dir>/replay-retained.py`. This writes extracted scripts/logs under `/tmp/oat-markdown-p04-evidence`; create that directory first on a fresh machine, or change its output path to an existing temporary directory.

```python
import pathlib,re,subprocess,sys,json
root=pathlib.Path.cwd();project=root/'.oat/projects/shared/markdown-docs-bootstrap';out=pathlib.Path('/tmp/oat-markdown-p04-evidence')
def blocks(path,language):
 lines=path.read_text().splitlines(keepends=True);result=[];fence=None;buf=[];lang=None
 for line in lines:
  if fence is None:
   m=re.match(r'^(`{3,}|~{3,})([^\s]*)\s*$',line.strip())
   if m:fence=m.group(1);lang=m.group(2);buf=[]
  elif re.match(r'^'+re.escape(fence[0])+r'{'+str(len(fence))+r',}\s*$',line.strip()):
   if lang==language:result.append(''.join(buf))
   fence=None
  else:buf.append(line)
 assert fence is None,(path,'unclosed fence')
 return result
records=[]
for number in [0,1,3]:
 p=out/f'replay-p02-{number}.py';p.write_text(blocks(project/'reviews/p02-reproduction-controls.md','python')[number]);cmd=[sys.executable,str(p),str(root/'packages/cli/dist/index.js')]+(['--expect','valid'] if number==3 else []);r=subprocess.run(cmd,text=True,capture_output=True);(out/f't02-p02-{number}.log').write_text(r.stdout+r.stderr);records.append({'control':p.name,'exit':r.returncode,'command':cmd});assert r.returncode==0,r.stdout+r.stderr
for number,code in enumerate(blocks(project/'reviews/p03-walkthrough-controls.md','javascript')):
 p=out/f'replay-p03-{number}.mjs';p.write_text(code);cmd=['node',str(p)];r=subprocess.run(cmd,text=True,capture_output=True);(out/f't02-p03-{number}.log').write_text(r.stdout+r.stderr);records.append({'control':p.name,'exit':r.returncode,'command':cmd});assert r.returncode==0,r.stdout+r.stderr
(out/'retained-replays.json').write_text(json.dumps(records,indent=2)+'\n');print(json.dumps(records,indent=2))
```

## Verification receipt

The CI-order and actual-execution receipt follows below. Phase/final independent reviews, implementation exit gate and final HiLL approval remain root-owned and pending.

### Initial CI failure and bounded acceptance repairs

The first full sequence stopped at `pnpm test` actual exit 1, after check/type-check exit 0. CLI ran 398 files (396 passed, 2 failed), 7,943 tests (7,938 passed, 5 failed), with five Turbo cache-hit lines for other build/test tasks. Root inspected the exact diagnostics and authorized p04-t02 pre-commit integration repairs under its planned acceptance-defect clause. Two docs help inline snapshots still represented pre-Markdown help; two project-document literals still pinned 1.8.5 instead of the approved 1.8.6, producing three failed assertions. No production behavior or protection was weakened. The original failed receipt is retained at `/tmp/oat-markdown-p04-evidence/initial-03-test-failed.log` and `initial-ci-gates-failed.json`.

Attribution: public Markdown help came from p02-t01 `3be63e9c5d2dd7370f04db4485c98f0b1ec3647b` and p02-t02 `b224018c8d8cafe23827286352ed33db008d47ad`; canonical project-document bump came from p03-t02 `6675f596333b6e9f83b4453027d2a0f1dd1c5466`. The effective p04-t02 boundary adds only `packages/cli/src/commands/help-snapshots.test.ts` and `packages/cli/src/validation/skills.test.ts`. `deliberate-testing` retains the existing public-help and version contracts; no coverage is added/deleted. Help oracle is the approved public command contract and actual help; version oracle is canonical metadata 1.8.6. These are planned pre-commit acceptance repairs with recovery usage unchanged 0/10, not a repair of a nonexistent committed p04-t02 task.

Exact correction checks:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts -t 'docs( init)? --help matches snapshot' --update
pnpm exec oxfmt --write packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/validation/skills.test.ts
pnpm exec oxfmt --check packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
```

Snapshot update selected exactly the two intended docs snapshots. Final focused exit/results are included in the receipt below. The full CI sequence restarts from check after correction.

### Final verification receipt

All eight CI gates passed in required order after the bounded repairs; the explicit fresh-main fetch was between skill/version gates. Each subprocess exit was captured directly and the runner stopped on nonzero. The original failed attempt remains separately retained. No success is inferred from a pager/filter. Current main is `98d1d524624e17f55ccfce33d18b3d5535dc91ca`, public packages there are all 0.3.10; branch public packages remain all 0.3.11. No dependency/lockfile change, extra skill bump, publication, push, PR or real-user installation occurred.

| Step                      | Exact command                      | Exit | Turbo cache replay / execution evidence                    | Log                                                            |
| ------------------------- | ---------------------------------- | ---- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| 01-check                  | `pnpm check`                       | 0    | 8 replay lines; 3 cache-miss execution lines               | `/tmp/oat-markdown-p04-evidence/01-check.log`                  |
| 02-type-check             | `pnpm type-check`                  | 0    | 9 replay lines; 1 cache-miss execution lines               | `/tmp/oat-markdown-p04-evidence/02-type-check.log`             |
| 03-test                   | `pnpm test`                        | 0    | 8 replay lines; 2 cache-miss execution lines               | `/tmp/oat-markdown-p04-evidence/03-test.log`                   |
| 04-build                  | `pnpm build`                       | 0    | 5/5 cached tasks (replay)                                  | `/tmp/oat-markdown-p04-evidence/04-build.log`                  |
| 05-skill-bumps            | `pnpm run check:skill-bumps`       | 0    | 5 changed skill/role bump checks actually validated        | `/tmp/oat-markdown-p04-evidence/05-skill-bumps.log`            |
| 06-fetch-main             | `git fetch origin main`            | 0    | fresh main fetched; SHA unchanged                          | `/tmp/oat-markdown-p04-evidence/06-fetch-main.log`             |
| 06-release-versions       | `pnpm release:check-versions`      | 0    | version bump check passed against fresh main               | `/tmp/oat-markdown-p04-evidence/06-release-versions.log`       |
| 07-release-validate       | `pnpm release:validate`            | 0    | all five public package tarballs actually packed/validated | `/tmp/oat-markdown-p04-evidence/07-release-validate.log`       |
| 08-build-docs             | `pnpm build:docs`                  | 0    | 6/6 cached tasks; FULL TURBO (replay)                      | `/tmp/oat-markdown-p04-evidence/08-build-docs.log`             |
| 09-lint                   | `pnpm lint`                        | 0    | 5 replay lines; 5 cache-miss execution lines               | `/tmp/oat-markdown-p04-evidence/09-lint.log`                   |
| 10-format                 | `pnpm format`                      | 0    | 5 replay lines; 5 cache-miss execution lines               | `/tmp/oat-markdown-p04-evidence/10-format.log`                 |
| 11-forced-workspace-tests | `pnpm exec turbo run test --force` | 0    | 10 forced execution lines; 0 cache hits                    | `/tmp/oat-markdown-p04-evidence/11-forced-workspace-tests.log` |

The successful normal `pnpm test` gate actually ran CLI 7,943 tests/398 files; other workspace summaries included cache replays. It then separately executed 163 smoke tests, 660 skill tests and one worktree-script test, all pass with zero failures. `pnpm check` actually validated 65 skills. These Node suites and validation were not redundantly repeated after success.

The additional `pnpm exec turbo run test --force` used HOME only in that subprocess (`/var/folders/fp/rnl_nlcj5ngfqfh8nb92vktr0000gn/T/oat-markdown-p04-forced-home-72wshsg4`); normal shell HOME and provider credentials were unchanged. It forced all ten tasks with zero cache hits: six builds (including the docs app) and four workspace test tasks. Actual suites: CLI 7,943/398 files, control-plane 151/10, docs-config 10/3, docs-transforms 31/2. Actual docs build compiled successfully and generated 73/73 static pages. Root lint/format each exit 0 and include their uncached root pass; focused two-file verification passed 303 tests, CLI lint/types and exact-path format/diff each exit 0.

The p01 narrowed-output baseline SHA-256 independently matches the retained original `42c5916dacf7e04212faadce73ddff1da9d84bdf78b87c0072da5776df48bc1b` before and after current refusal. Original implementation bytes before the appended Integration Acceptance Evidence and original backlog bytes/status are retained unchanged. Formatted durable Python probes compile. Final exact owned-file formatting, relative artifact/backlog links and diff check are checked before commit.

### Exact gate runner

Save as `run-ci-gates.py`, ensure `/tmp/oat-markdown-p04-evidence` exists, then run `python3 <temporary-dir>/run-ci-gates.py` from repository root.

```python
import json,pathlib,subprocess,sys,time
out=pathlib.Path('/tmp/oat-markdown-p04-evidence');records=[]
commands=[('01-check',['pnpm','check']),('02-type-check',['pnpm','type-check']),('03-test',['pnpm','test']),('04-build',['pnpm','build']),('05-skill-bumps',['pnpm','run','check:skill-bumps']),('06-fetch-main',['git','fetch','origin','main']),('06-release-versions',['pnpm','release:check-versions']),('07-release-validate',['pnpm','release:validate']),('08-build-docs',['pnpm','build:docs'])]
for name,argv in commands:
 start=time.time();log=out/(name+'.log')
 with log.open('w') as handle:result=subprocess.run(argv,stdout=handle,stderr=subprocess.STDOUT)
 text=log.read_text();record={'gate':name,'command':argv,'exit':result.returncode,'seconds':round(time.time()-start,2),'log':str(log),'turboCacheHitLines':text.count('cache hit, replaying logs'),'turboExecutionLines':text.count('cache miss, executing')};records.append(record);(out/'ci-gates.json').write_text(json.dumps(records,indent=2)+'\n');print(json.dumps(record),flush=True)
 if result.returncode:sys.exit(result.returncode)
print('CI_ORDER_GATES=PASS',flush=True)
```

### Exact execution-proof runner

After the successful ordered build, save as `run-execution-proof.py` and run `python3 <temporary-dir>/run-execution-proof.py`. The HOME assignment is confined to the one forced-test child environment.

```python
import json,pathlib,subprocess,tempfile,time,os,sys
out=pathlib.Path('/tmp/oat-markdown-p04-evidence');records=[]
# Build already completed in the ordered CI sequence before this script is run.
commands=[('09-lint',['pnpm','lint'],False),('10-format',['pnpm','format'],False),('11-forced-workspace-tests',['pnpm','exec','turbo','run','test','--force'],True)]
for name,argv,isolated in commands:
 env=dict(os.environ);home=tempfile.mkdtemp(prefix='oat-markdown-p04-forced-home-') if isolated else None
 if home:env['HOME']=home
 start=time.time();log=out/(name+'.log')
 with log.open('w') as handle:r=subprocess.run(argv,stdout=handle,stderr=subprocess.STDOUT,env=env)
 text=log.read_text();record={'gate':name,'command':argv,'exit':r.returncode,'seconds':round(time.time()-start,2),'log':str(log),'isolatedSubprocessHome':home,'turboCacheHitLines':text.count('cache hit, replaying logs'),'turboExecutionLines':text.count('cache miss, executing'),'turboForcedLines':text.count('cache bypass, force executing')};records.append(record);(out/'execution-proof.json').write_text(json.dumps(records,indent=2)+'\n');print(json.dumps(record),flush=True)
 if r.returncode:sys.exit(r.returncode)
print('ACTUAL_EXECUTION_PROOF=PASS',flush=True)
```
