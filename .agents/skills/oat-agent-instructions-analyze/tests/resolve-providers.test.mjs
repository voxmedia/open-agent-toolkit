import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(
  new URL('../scripts/resolve-providers.sh', import.meta.url),
);

const roots = [];

after(() => {
  for (const root of roots) {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeRepo(entries) {
  const root = mkdtempSync(join(tmpdir(), 'resolve-providers-'));
  roots.push(root);
  const init = spawnSync('git', ['init', '--quiet'], { cwd: root });
  assert.equal(init.status, 0, `git init failed: ${init.stderr}`);
  for (const entry of entries) {
    if (entry.endsWith('/')) {
      mkdirSync(join(root, entry), { recursive: true });
    } else {
      writeFileSync(join(root, entry), '# fixture\n');
    }
  }
  return root;
}

function run(root, args) {
  // stdin is 'ignore' so the script never sees a TTY; the no-flag case
  // exercises the non-TTY fallback of interactive_confirm.
  return spawnSync('bash', [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const cases = [
  {
    name: 'AGENTS.md plus .claude/ only',
    entries: ['AGENTS.md', '.claude/'],
    expected: ['agents_md', 'claude'],
  },
  {
    name: '.cursor/ only',
    entries: ['.cursor/'],
    expected: ['agents_md', 'cursor'],
  },
  {
    name: '.cline/ present',
    entries: ['AGENTS.md', '.cline/'],
    expected: ['agents_md', 'cline'],
  },
];

describe('resolve-providers.sh auto-detection', () => {
  for (const { name, entries, expected } of cases) {
    for (const args of [['--non-interactive'], []]) {
      const mode = args.length ? '--non-interactive' : 'no flag (non-TTY)';
      test(`${name} with ${mode} prints providers and exits 0`, () => {
        const root = makeRepo(entries);
        const result = run(root, args);
        assert.equal(
          result.status,
          0,
          `expected exit 0, got ${result.status}; stderr: ${result.stderr}`,
        );
        assert.deepEqual(result.stdout.trim().split('\n'), expected);
      });
    }
  }
});
