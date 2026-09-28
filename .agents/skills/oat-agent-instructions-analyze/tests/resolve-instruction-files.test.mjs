import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(
  new URL('../scripts/resolve-instruction-files.sh', import.meta.url),
);

const roots = [];

after(() => {
  for (const root of roots) {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'resolve-instruction-files-'));
  roots.push(root);
  const init = spawnSync('git', ['init', '--quiet'], { cwd: root });
  assert.equal(init.status, 0, `git init failed: ${init.stderr}`);
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), '# fixture\n');
  }
  return root;
}

test('the claude provider lists CLAUDE.md, .claude/CLAUDE.md, and CLAUDE.local.md', () => {
  // A personal CLAUDE.local.md makes Claude Code's default agents-md mode
  // ignore AGENTS.md just like a CLAUDE.md, so analysis must see it.
  const root = makeRepo([
    'AGENTS.md',
    'CLAUDE.local.md',
    '.claude/CLAUDE.md',
    'pkg/CLAUDE.md',
    'pkg/CLAUDE.local.md',
  ]);
  const result = spawnSync('bash', [script, '--providers', 'claude'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), [
    'claude\t.claude/CLAUDE.md',
    'claude\tCLAUDE.local.md',
    'claude\tpkg/CLAUDE.local.md',
    'claude\tpkg/CLAUDE.md',
  ]);
});
