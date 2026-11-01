import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const script = resolve(import.meta.dirname, 'with-isolated-home.sh');

async function scratchTmpdir(t) {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), 'oat-isolated-home-test-')),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

// Spawned in its own process group so a test can signal the group, as a
// terminal Ctrl-C or a CI cancellation does.
function run(args, { tmp, onStdout } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('bash', [script, ...args], {
      detached: true,
      env: { ...process.env, TMPDIR: tmp },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      onStdout?.(stdout, child);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code, signal) =>
      resolvePromise({ code, signal, stdout, stderr }),
    );
  });
}

const printHome = 'test -d "$HOME" && printf "%s\\n" "$HOME"';

test('runs the command with a temporary HOME under TMPDIR and removes it after success', async (t) => {
  const tmp = await scratchTmpdir(t);
  const result = await run(['sh', '-c', printHome], { tmp });
  assert.equal(result.code, 0, result.stderr);
  const home = result.stdout.trim();
  assert.ok(home.startsWith(join(tmp, 'oat-isolated-home.')), home);
  assert.notEqual(home, process.env.HOME);
  assert.equal(existsSync(home), false);
  assert.deepEqual(await readdir(tmp), []);
});

test('removes the temporary HOME after a failing command and keeps its exit status', async (t) => {
  const tmp = await scratchTmpdir(t);
  const result = await run(['sh', '-c', `${printHome}; exit 7`], { tmp });
  assert.equal(result.code, 7);
  const home = result.stdout.trim();
  assert.ok(home.startsWith(join(tmp, 'oat-isolated-home.')), home);
  assert.equal(existsSync(home), false);
  assert.deepEqual(await readdir(tmp), []);
});

for (const [signal, status] of [
  ['SIGTERM', 143],
  ['SIGINT', 130],
]) {
  test(`removes the temporary HOME after ${signal}`, async (t) => {
    const tmp = await scratchTmpdir(t);
    let sent = false;
    const result = await run(['sh', '-c', `${printHome}; exec sleep 30`], {
      tmp,
      onStdout(stdout, child) {
        if (sent || !stdout.includes('\n')) return;
        sent = true;
        process.kill(-child.pid, signal);
      },
    });
    assert.equal(sent, true, result.stderr);
    assert.equal(result.code, status);
    const home = result.stdout.trim();
    assert.ok(home.startsWith(join(tmp, 'oat-isolated-home.')), home);
    assert.equal(existsSync(home), false);
    assert.deepEqual(await readdir(tmp), []);
  });
}

test('refuses to run without a command and creates nothing', async (t) => {
  const tmp = await scratchTmpdir(t);
  const result = await run([], { tmp });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /usage:/);
  assert.deepEqual(await readdir(tmp), []);
});
