import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const skillRoot = fileURLToPath(new URL('..', import.meta.url));
const scriptPath = join(skillRoot, 'scripts', 'finalize-synced-archive.mjs');
const scratchRoots = [];

// The suite must not inherit `--preserve-symlinks-main` from whatever runs it.
// That flag decides whether `import.meta.url` is the link or the real path,
// which is the exact variable the symlink cases below pin. Inheriting it turns
// the plain case into a preserve-symlinks case, and a restored one-sided guard
// then passes every case — the neutralization control would prove nothing.
const baseEnv = { ...process.env };
delete baseEnv.NODE_OPTIONS;

after(async () => {
  for (const root of scratchRoots.splice(0)) {
    await rm(root, { force: true, recursive: true });
  }
});

// `main` clears the pointer by shelling out to `oat`. Every case — including the
// ones whose assertion is that it was never called — runs against a stub first
// on `PATH`, so no case reaches a real binary or a real `.oat/config.local.json`.
async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'finalize-synced-archive-cli-'));
  scratchRoots.push(root);
  const bin = join(root, 'bin');
  await mkdir(bin, { recursive: true });
  const stubLog = join(root, 'oat-calls.log');
  await writeFile(
    join(bin, 'oat'),
    [
      '#!/bin/sh',
      '{',
      "  printf 'call'",
      '  for arg in "$@"; do printf \'\\037%s\' "$arg"; done',
      "  printf '\\n'",
      '} >> "$OAT_STUB_LOG"',
      'exit 0',
      '',
    ].join('\n'),
  );
  await chmod(join(bin, 'oat'), 0o755);
  await writeFile(stubLog, '');
  return { root, bin, stubLog };
}

async function stubCalls(fixture) {
  const raw = await readFile(fixture.stubLog, 'utf8');
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => line.split('\u001f').slice(1));
}

async function runScript(
  fixture,
  {
    args = ['--project-name', 'demo'],
    input = '',
    nodeArgs = [],
    env = {},
    script = scriptPath,
  } = {},
) {
  const promise = execFile(process.execPath, [...nodeArgs, script, ...args], {
    encoding: 'utf8',
    env: {
      ...baseEnv,
      PATH: `${fixture.bin}:${process.env.PATH ?? ''}`,
      OAT_STUB_LOG: fixture.stubLog,
      ...env,
    },
  });
  // The usage case exits before draining stdin; an unhandled EPIPE here would
  // fail the test for the wrong reason.
  promise.child.stdin.on('error', () => {});
  promise.child.stdin.end(input);
  try {
    const { stdout, stderr } = await promise;
    return { code: 0, stdout, stderr };
  } catch (error) {
    return {
      code: error.code,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
    };
  }
}

const lifecycleCommit = 'a'.repeat(40);
const verifiedSourceSha = 'b'.repeat(40);

function validReport(projectName = 'demo') {
  return {
    status: 'ok',
    mode: 'apply',
    archivePath: `/archive/${projectName}`,
    lifecycleCommit,
    verifiedSourceSha,
    completedRef: `refs/oat/completed/${projectName}`,
    activeAliasDisposition: 'removed',
    recordRetired: true,
  };
}

const successJson = {
  status: 'ok',
  pointerCleared: true,
  lifecycleCommit,
  completedRef: 'refs/oat/completed/demo',
  verifiedSourceSha,
  activeAliasDisposition: 'removed',
  recordRetired: true,
};

const clearedPointer = [['config', 'set', 'activeProject', '']];

test('a valid terminal report piped on stdin clears the pointer', async () => {
  const fixture = await createFixture();
  const result = await runScript(fixture, {
    input: `${JSON.stringify(validReport())}\n`,
  });

  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), successJson);
  assert.deepEqual(await stubCalls(fixture), clearedPointer);
});

test('a report naming the wrong completed ref fails closed and clears nothing', async () => {
  const fixture = await createFixture();
  const report = { ...validReport(), completedRef: 'refs/oat/completed/other' };
  const result = await runScript(fixture, {
    input: `${JSON.stringify(report)}\n`,
  });

  assert.equal(result.code, 1);
  assert.equal(result.stdout, '');
  const failure = JSON.parse(result.stderr);
  assert.equal(failure.ok, false);
  assert.equal(failure.code, 'E_SYNCED_ARCHIVE_FINALIZATION');
  assert.match(failure.message, /unexpected completed ref/);
  assert.deepEqual(await stubCalls(fixture), []);
});

test('empty stdin fails closed and clears nothing', async () => {
  const fixture = await createFixture();
  const result = await runScript(fixture, { input: '' });

  assert.equal(result.code, 1);
  assert.equal(result.stdout, '');
  const failure = JSON.parse(result.stderr);
  assert.equal(failure.code, 'E_SYNCED_ARCHIVE_FINALIZATION');
  assert.match(
    failure.message,
    /Unable to parse synced archive terminal report/,
  );
  assert.deepEqual(await stubCalls(fixture), []);
});

test('a missing --project-name fails closed and clears nothing', async () => {
  const fixture = await createFixture();
  const result = await runScript(fixture, {
    args: [],
    input: `${JSON.stringify(validReport())}\n`,
  });

  assert.equal(result.code, 1);
  assert.equal(result.stdout, '');
  const failure = JSON.parse(result.stderr);
  assert.equal(failure.code, 'E_SYNCED_ARCHIVE_FINALIZATION');
  assert.match(failure.message, /Usage: finalize-synced-archive\.mjs/);
  assert.deepEqual(await stubCalls(fixture), []);
});

// A user-scope install is reached through a link. Without `--preserve-symlinks-main`
// Node canonicalizes the main module, so `import.meta.url` is the real path and a
// raw `process.argv[1]` comparison fails open; with it, `import.meta.url` keeps the
// link, so canonicalizing only `process.argv[1]` fails open instead. The two
// neutralizations are therefore complementary, and each form below is registered
// as its own test so that one form failing never hides another.
async function linkedScriptFor(fixture) {
  const installRoot = join(fixture.root, 'user-scope', '.agents', 'skills');
  await mkdir(installRoot, { recursive: true });
  await symlink(skillRoot, join(installRoot, 'oat-project-complete'));
  return join(
    installRoot,
    'oat-project-complete',
    'scripts',
    'finalize-synced-archive.mjs',
  );
}

async function assertClearsThroughSymlink(options) {
  const fixture = await createFixture();
  const result = await runScript(fixture, {
    ...options,
    script: await linkedScriptFor(fixture),
    input: `${JSON.stringify(validReport())}\n`,
  });

  assert.equal(result.code, 0, result.stderr);
  // Exit 0 alone is not success: a guard that skips `main` also exits 0, having
  // done nothing, which a caller cannot tell apart from a verified clear.
  assert.notEqual(
    result.stdout,
    '',
    'exited 0 with no output, so the main-module guard skipped main',
  );
  assert.deepEqual(JSON.parse(result.stdout), successJson);
  assert.deepEqual(await stubCalls(fixture), clearedPointer);
}

test('runs through a symlinked install root', async () => {
  await assertClearsThroughSymlink({});
});

test('runs through a symlinked install root with --preserve-symlinks-main', async () => {
  await assertClearsThroughSymlink({
    nodeArgs: ['--preserve-symlinks-main'],
  });
});

test('runs through a symlinked install root with NODE_OPTIONS preserving symlinks', async () => {
  await assertClearsThroughSymlink({
    env: { NODE_OPTIONS: '--preserve-symlinks-main' },
  });
});
