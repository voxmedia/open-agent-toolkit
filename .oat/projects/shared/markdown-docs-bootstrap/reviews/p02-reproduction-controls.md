# p02 Reproduction Controls

Run public probes from repository root after building the chosen commit. Extract each Python block into a temporary file and pass the absolute built CLI path for t01/t02. They create isolated repositories and capture exact argv, file hashes and categorical outcomes. Guard neutralization temporarily edits production source; run it only in an isolated checkout with installed dependencies, no concurrent writer. The original fixed temporary evidence destination is replaced with a fresh temp directory for portability.

## probe-t01.py

```python
import argparse
import hashlib
import json
import pathlib
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('cli', help='Absolute built CLI index.js from the commit to probe')
args = parser.parse_args()
cli = str(pathlib.Path(args.cli).resolve())
base = pathlib.Path(tempfile.mkdtemp(prefix='oat-p02-reproduction-'))
root = base / 'baseline'
(root / 'docs').mkdir(parents=True)
(root / 'docs' / 'index.md').write_text('# Existing operator handbook\n\nKeep this audience-specific introduction.\n')
(root / 'docs' / 'deploy.md').write_text('# Deployment\n\nUse the reviewed release checklist.\n')
(root / 'AGENTS.md').write_text('# Repository guidance\n\nDo not change local ownership.\n')

def snapshot(directory):
    return {str(p.relative_to(directory)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in directory.rglob('*') if p.is_file()}

def run(directory, extra):
    before = snapshot(directory)
    command = ['node', cli, '--cwd', str(directory), '--json', 'docs', 'init',
               '--framework', 'markdown', '--yes'] + extra
    result = subprocess.run(command, text=True, capture_output=True)
    return {'command': command, 'exit': result.returncode, 'stdout': result.stdout,
            'stderr': result.stderr, 'before': before, 'after': snapshot(directory)}

refusal = run(root, [])
fresh = base / 'fresh'
fresh.mkdir()
(fresh / 'package.json').write_text('{"name":"service","scripts":{"build":"turbo run build"}}\n')
accepted = run(fresh, ['--site-name', 'Operators\' Handbook: "Service"'])
report = {'refusal': refusal, 'freshAccepted': accepted}
(base / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
assert refusal['exit'] == 1
assert refusal['before'] == refusal['after']
if 'Allowed choices are fumadocs, mkdocs' in refusal['stderr']:
    assert accepted['exit'] == 1
    category = 'pre-change-missing-markdown-capability'
else:
    assert 'Use --adopt' in json.loads(refusal['stdout'])['message']
    assert accepted['exit'] == 0
    assert json.loads(accepted['stdout'])['status'] == 'ok'
    assert accepted['before']['package.json'] == accepted['after']['package.json']
    category = 'post-change-refusal-and-fresh-accepted'
print(json.dumps({'category': category, 'artifacts': str(base)}))

```

## probe-t02.py

```python
import argparse
import hashlib
import json
import os
import pathlib
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('cli', help='Absolute built CLI index.js from the commit to probe')
args = parser.parse_args()
cli = str(pathlib.Path(args.cli).resolve())
base = pathlib.Path(tempfile.mkdtemp(prefix='oat-p02-adoption-proof-'))
records = {}

def seed(root, path, content):
    target = root / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)

def snapshot(root):
    result = {}
    for path in sorted(root.rglob('*')):
        key = str(path.relative_to(root))
        if path.is_symlink(): result[key] = {'symlink': os.readlink(path)}
        elif path.is_file(): result[key] = hashlib.sha256(path.read_bytes()).hexdigest()
        elif path.is_dir(): result[key + '/'] = 'directory'
    return result

def run(name, root, extra=None, dry=False):
    before = snapshot(root)
    command = ['node', cli, '--cwd', str(root), '--json']
    command += ['docs', 'init', '--framework', 'markdown', '--yes']
    if dry: command.append('--dry-run')
    command += (extra or [])
    process = subprocess.run(command, text=True, capture_output=True)
    payload = json.loads(process.stdout)
    record = {'command': command, 'exit': process.returncode, 'payload': payload,
              'stdout': process.stdout, 'stderr': process.stderr,
              'before': before, 'after': snapshot(root)}
    records[name] = record
    return record

root = base / 'populated'
index = '---\ntitle: Operator handbook\ndescription: Team runtime ownership.\n---\n\n# Operator handbook\n\nKeep the incident response audience and escalation context.\n\n## Contents\n\n- [Deployment](deploy.md)\n'
page = '# Deployment\n\nOnly ship reviewed releases after the on-call approval.\n'
local = '# Local docs ownership\n\nPreserve our audience and private escalation examples.\n'
root_guidance = '# Repository instructions\n\nKeep local ownership and review rules.\n'
seed(root, 'docs/index.md', index)
seed(root, 'docs/deploy.md', page)
seed(root, 'docs/AGENTS.md', local)
seed(root, 'AGENTS.md', root_guidance)
refusal = run('refusal-without-adopt', root)
assert refusal['exit'] == 1 and refusal['before'] == refusal['after']
assert 'Use --adopt' in refusal['payload']['message']
preview = run('adoption-preview', root, ['--adopt'], dry=True)
assert preview['exit'] == 0 and preview['before'] == preview['after']
assert preview['payload']['plannedFiles'] == ['contributing.md']
adopt = run('adoption-accepted', root, ['--adopt'])
assert adopt['exit'] == 0 and adopt['payload']['createdFiles'] == ['contributing.md']
assert (root/'docs/index.md').read_text() == index
assert (root/'docs/deploy.md').read_text() == page
assert (root/'docs/AGENTS.md').read_text() == local
assert (root/'AGENTS.md').read_text().startswith(root_guidance)
repeat = run('repeat-adoption', root, ['--adopt'])
assert repeat['exit'] == 0 and repeat['before'] == repeat['after']
assert repeat['payload']['changes'] == {'files': [], 'config': False, 'guidance': False}
converged = run('converged-preview', root, ['--adopt'], dry=True)
assert converged['exit'] == 0 and converged['before'] == converged['after']
assert converged['payload']['plannedFiles'] == []
assert converged['payload']['guidance']['action'] == 'no-change'

mapped = base / 'missing-index'
seed(mapped, 'handbook/deploy.md', page)
seed(mapped, 'handbook/operations/index.md', '# Operations\n\nOn-call responsibilities.\n')
seed(mapped, 'handbook/no-index/incident.md', '# Incident response\n')
seed(mapped, 'handbook/assets/diagram.svg', '<svg/>')
seed(mapped, 'handbook/drafts/index.md', '# Unreviewed drafts\n')
seed(mapped, 'handbook/secret.md', '# Private draft\n')
seed(mapped, '.oat/config.json', '{"version":1,"worktrees":{"root":"custom-worktrees"},"documentation":{"excludes":["secret.md","drafts/"],"requireForProjectCompletion":true}}\n')
mapping_preview = run('missing-index-preview', mapped, ['--adopt', '--target-dir', 'handbook'], dry=True)
assert mapping_preview['exit'] == 0 and mapping_preview['before'] == mapping_preview['after']
mapping = run('missing-index-accepted', mapped, ['--adopt', '--target-dir', 'handbook'])
assert mapping['exit'] == 0
contents = (mapped/'handbook/index.md').read_text()
for href in ['deploy.md', 'operations/index.md', 'contributing.md']: assert f']({href})' in contents
for href in ['secret.md', 'drafts/index.md', 'no-index/index.md', 'assets/index.md']: assert f']({href})' not in contents
assert not (mapped/'handbook/no-index/index.md').exists()

for kind in ['manual-required', 'blocked']:
    partial = base / kind
    seed(partial, 'docs/runbook.md', '# Operator runbook\n\nKeep escalation guidance.\n')
    if kind == 'manual-required':
        seed(partial, 'AGENTS.md', '<!-- OAT docs -->\n## Documentation\n\nPreserve custom private docs routing.\n<!-- END OAT docs -->\n')
    else:
        seed(partial, 'AGENTS.md/ownership.md', 'This path is a directory. Preserve it.\n')
    predicted = run(kind+'-preview', partial, ['--adopt'], dry=True)
    assert predicted['exit'] == 1 and predicted['before'] == predicted['after']
    assert predicted['payload']['status'] == 'partial'
    assert predicted['payload']['dryRun'] is True
    assert predicted['payload']['scaffold']['status'] == 'planned'
    assert predicted['payload']['guidance']['action'] == kind

fresh = base / 'fresh'
fresh.mkdir()
fresh_preview = run('fresh-preview', fresh, dry=True)
assert fresh_preview['exit'] == 0 and fresh_preview['before'] == fresh_preview['after']
assert fresh_preview['payload']['createdFiles'] == []
assert fresh_preview['payload']['plannedFiles'] == ['index.md', 'contributing.md']
fresh_accepted = run('fresh-accepted', fresh)
assert fresh_accepted['exit'] == 0 and fresh_accepted['payload']['status'] == 'ok'

if os.getuid() != 0:
    failure_root = base / 'config-failure'
    config_bytes = '{"version":1,"documentation":{"excludes":["drafts/"]}}\n'
    seed(failure_root, '.oat/config.json', config_bytes)
    os.chmod(failure_root/'.oat', 0o555)
    try:
        failed = run('config-failure-partial', failure_root)
        assert failed['exit'] == 1 and failed['payload']['status'] == 'partial'
        assert failed['payload']['configStatus'] == 'failed'
        assert failed['payload']['failure']['stage'] == 'config'
        assert failed['payload']['createdFiles'] == ['index.md', 'contributing.md']
        assert failed['payload']['guidance']['action'] == 'not-attempted'
        assert (failure_root/'.oat/config.json').read_text() == config_bytes
    finally: os.chmod(failure_root/'.oat', 0o755)
    retry = run('config-failure-safe-retry', failure_root, ['--adopt'])
    assert retry['exit'] == 0 and retry['payload']['createdFiles'] == []

(base/'results.json').write_text(json.dumps(records, indent=2)+'\n')
print(json.dumps({'artifacts': str(base), 'cases': {name: {'exit': r['exit'], 'status': r['payload']['status']} for name, r in records.items()}}))

```

## probe-guard-neutralization.py

```python
import tempfile
import hashlib
import json
import pathlib
import subprocess

root = pathlib.Path.cwd()
evidence = pathlib.Path(tempfile.mkdtemp(prefix='oat-p02-guards-'))
cases = [
    ('dry-run-write-guard', root/'packages/cli/src/commands/docs/init/index.ts',
     [('      if (context.dryRun) {', '      if (false && context.dryRun) {')],
     'dry-run plans empty target'),
    ('authored-index-preservation-guards', root/'packages/cli/src/commands/docs/init/markdown.ts',
     [('    if (content !== null) {', '    if (false && content !== null) {'),
      ("await open(join(plan.appRoot, name), 'wx')", "await open(join(plan.appRoot, name), 'w')")],
     'preserves empty/malformed indexes'),
]
records = []
for name, source, replacements, selected_test in cases:
    original = source.read_bytes()
    original_hash = hashlib.sha256(original).hexdigest()
    mutated = original.decode()
    for before, after in replacements:
        assert mutated.count(before) == 1, (name, before, mutated.count(before))
        mutated = mutated.replace(before, after, 1)
    command = ['pnpm', '--filter', '@open-agent-toolkit/cli', 'exec', 'vitest', 'run',
               'src/commands/docs/init/integration.test.ts', '-t', selected_test]
    try:
        source.write_text(mutated)
        run = subprocess.run(command, text=True, capture_output=True)
        (evidence/f'{name}-mutated.log').write_text(run.stdout+run.stderr)
    finally:
        source.write_bytes(original)
    assert hashlib.sha256(source.read_bytes()).hexdigest() == original_hash
    assert run.returncode != 0, name
    restored = subprocess.run(command, text=True, capture_output=True)
    (evidence/f'{name}-restored.log').write_text(restored.stdout+restored.stderr)
    assert restored.returncode == 0, name
    records.append({'case': name, 'source': str(source.relative_to(root)), 'replacements': replacements,
                    'command': command, 'mutatedExit': run.returncode, 'restoredExit': restored.returncode,
                    'originalSha256': original_hash, 'restoredSha256': hashlib.sha256(source.read_bytes()).hexdigest()})
(evidence/'guard-neutralization.json').write_text(json.dumps(records, indent=2)+'\n')
print(json.dumps(records, indent=2))

```

## p02-t03 filename navigation control

Run after building: `python3 probe-t03.py <absolute-built-cli-path> --expect valid`. Against the original encoder, use `--expect broken`: setup exits 0 but three actual destinations resolve incorrectly. The fixed encoder produces six existing-file destinations with no query/fragment and preserves every original byte. Ordinary filenames remain accepted. Direct public Vitest regression also fails with the old encoder and passes with the fix.

```python
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import tempfile
import urllib.parse

parser = argparse.ArgumentParser()
parser.add_argument('cli')
parser.add_argument('--expect', choices=['broken', 'valid'], required=True)
args = parser.parse_args()
cli = str(pathlib.Path(args.cli).resolve())
root = pathlib.Path(tempfile.mkdtemp(prefix='oat-p02-t03-'+args.expect+'-'))
original = {
    'release#owner.md': '# Release ownership\n\nThe runtime team approves each release.\n',
    'faq?audience.md': '# Audience FAQ\n\nOperators and reviewers share these answers.\n',
    'deploy(operator).md': '# Operator deployment\n\nUse the reviewed deployment checklist.\n',
    'operations#on-call?(primary)/index.md': '# Primary on-call operations\n\nEscalation ownership and handoff context.\n',
    'ordinary.md': '# Ordinary page\n\nThis normal relative link must remain usable.\n',
}
for relative, content in original.items():
    path = root/'docs'/relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
command = ['node', cli, '--cwd', str(root), '--json', 'docs', 'init', '--framework',
           'markdown', '--adopt', '--yes', '--site-name', 'URI Handbook']
run = subprocess.run(command, text=True, capture_output=True)
payload = json.loads(run.stdout)
assert run.returncode == 0 and payload['status'] == 'ok'
index = root/'docs/index.md'
destinations = re.findall(r'^- \[.*\]\(([^)]*)\)$', index.read_text(), re.MULTILINE)
resolved = []
for destination in destinations:
    uri = urllib.parse.urlsplit(urllib.parse.urljoin(index.as_uri(), destination))
    actual = pathlib.Path(urllib.parse.unquote(uri.path))
    valid = not uri.query and not uri.fragment and actual.is_file()
    resolved.append({'destination': destination, 'query': uri.query, 'fragment': uri.fragment,
                     'actualPath': str(actual), 'exists': actual.is_file(), 'valid': valid})
assert 'ordinary.md' in destinations
assert 'deploy%28operator%29.md' in destinations
for relative, content in original.items(): assert (root/'docs'/relative).read_text() == content
broken = [item for item in resolved if not item['valid']]
if args.expect == 'broken':
    assert len(broken) == 3, broken
else:
    assert broken == [], broken
    assert {item['actualPath'] for item in resolved} == {str(root/'docs'/relative) for relative in list(original)+['contributing.md']}
report = {'command': command, 'exit': run.returncode, 'stdout': run.stdout, 'stderr': run.stderr,
          'category': args.expect, 'destinations': resolved, 'originalFilesPreserved': True,
          'originalFiles': original,
          'originalHashes': {relative: hashlib.sha256(content.encode()).hexdigest() for relative, content in original.items()}}
(root/'results.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({'category': args.expect, 'cliExit': run.returncode, 'brokenLinks': len(broken), 'preserved': True, 'artifacts': str(root)}))
```
