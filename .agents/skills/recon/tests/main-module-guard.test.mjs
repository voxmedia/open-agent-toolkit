import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

// Every entry-point script in this skill must run when the skill is reached
// through a symlinked install root (`~/.claude/skills/recon` links into
// `~/.agents/skills`). A raw `import.meta.url === pathToFileURL(argv[1])`
// guard skips `main` there and exits 0 with no output, which callers read as
// success. With no arguments every script below fails with a usage error, so a
// run that exits 0 or prints nothing means the guard skipped `main`.
//
// The plain form catches a raw comparison; the two preserve-symlinks forms catch
// a guard that canonicalizes only `process.argv[1]`.

const execFile = promisify(execFileCallback);
const skillName = 'recon';
const skillRoot = fileURLToPath(new URL('..', import.meta.url));
const scripts = [
  'create-review-brief.mjs',
  'prepare-routing.mjs',
  'reconcile-ledger.mjs',
  'render-packet.mjs',
  'validate-artifact.mjs',
  'validate-packet.mjs',
];
const scratchRoots = [];

// Inheriting `--preserve-symlinks-main` would turn the plain case into a
// preserve case and hide a raw guard.
const baseEnv = { ...process.env };
delete baseEnv.NODE_OPTIONS;

after(async () => {
  for (const root of scratchRoots.splice(0)) {
    await rm(root, { force: true, recursive: true });
  }
});

async function linkedSkillRoot() {
  const root = await mkdtemp(join(tmpdir(), `${skillName}-main-guard-`));
  scratchRoots.push(root);
  const installRoot = join(root, 'user-scope', '.agents', 'skills');
  await mkdir(installRoot, { recursive: true });
  await symlink(skillRoot, join(installRoot, skillName));
  return { root, linkedRoot: join(installRoot, skillName) };
}

async function run(script, { cwd, nodeArgs = [], env = {} }) {
  const promise = execFile(process.execPath, [...nodeArgs, script], {
    cwd,
    encoding: 'utf8',
    env: { ...baseEnv, ...env },
    timeout: 30_000,
  });
  promise.child.stdin.on('error', () => {});
  promise.child.stdin.end('');
  try {
    const { stdout, stderr } = await promise;
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    return {
      code: error.code,
      output: `${error.stdout ?? ''}${error.stderr ?? ''}`,
    };
  }
}

function assertMainRan(result, label) {
  assert.notEqual(
    result.output.trim(),
    '',
    `${label}: exited ${result.code} with no output, so the main-module guard skipped main`,
  );
  assert.notEqual(result.code, 0, `${label}: expected a usage failure`);
}

const forms = [
  ['through a symlinked install root', {}],
  [
    'through a symlinked install root with --preserve-symlinks-main',
    { nodeArgs: ['--preserve-symlinks-main'] },
  ],
  [
    'through a symlinked install root with NODE_OPTIONS preserving symlinks',
    { env: { NODE_OPTIONS: '--preserve-symlinks-main' } },
  ],
];

for (const script of scripts) {
  test(`${script} runs main when invoked directly`, async () => {
    const { root } = await linkedSkillRoot();
    const result = await run(join(skillRoot, 'scripts', script), { cwd: root });
    assertMainRan(result, script);
  });

  for (const [label, options] of forms) {
    test(`${script} runs main ${label}`, async () => {
      const { root, linkedRoot } = await linkedSkillRoot();
      const result = await run(join(linkedRoot, 'scripts', script), {
        cwd: root,
        ...options,
      });
      assertMainRan(result, `${script} ${label}`);
    });
  }
}

test('every script that reads process.argv is covered here', async () => {
  const entries = await readdir(join(skillRoot, 'scripts'));
  const entryPoints = [];
  for (const name of entries.filter((entry) => entry.endsWith('.mjs'))) {
    const text = await readFile(join(skillRoot, 'scripts', name), 'utf8');
    if (text.includes('process.argv')) entryPoints.push(name);
  }
  assert.deepEqual([...scripts].sort(), entryPoints.sort());
});

test('no script keeps a raw main-module comparison', async () => {
  const entries = await readdir(join(skillRoot, 'scripts'));
  for (const name of entries.filter((entry) => entry.endsWith('.mjs'))) {
    const text = await readFile(join(skillRoot, 'scripts', name), 'utf8');
    assert.doesNotMatch(
      text,
      /pathToFileURL\(process\.argv\[1\]/,
      `${name} compares process.argv[1] without canonicalizing it`,
    );
  }
});
