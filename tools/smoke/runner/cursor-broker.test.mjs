import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const runnerDirectory = dirname(fileURLToPath(import.meta.url));
const launcherPath = join(runnerDirectory, 'cursor-broker-launch.mjs');
const clientPath = join(runnerDirectory, 'cursor-broker-client.mjs');

test('brokers Cursor credentials without exposing them to the driven process', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-cursor-broker-'));
  const binaryDirectory = join(root, 'bin');
  const fakeCursor = join(binaryDirectory, 'cursor-agent');
  await mkdir(binaryDirectory, { recursive: true });
  await writeFile(
    fakeCursor,
    `#!/bin/sh
test "$CURSOR_API_KEY" = "broker-test-secret"
printf 'broker-ok\\n'
`,
  );
  await chmod(fakeCursor, 0o755);

  try {
    const childScript = `
      const { spawnSync } = require('node:child_process');
      if (process.env.CURSOR_API_KEY) process.exit(42);
      const result = spawnSync(process.execPath, [${JSON.stringify(clientPath)}, '--probe'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: process.env,
      });
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      process.exit(result.status ?? 1);
    `;
    const { stdout } = await execFileAsync(
      process.execPath,
      [launcherPath, '--', process.execPath, '-e', childScript],
      {
        cwd: root,
        env: {
          ...process.env,
          CURSOR_API_KEY: 'broker-test-secret',
          PATH: `${binaryDirectory}:${process.env.PATH ?? ''}`,
        },
      },
    );
    assert.equal(stdout, 'broker-ok\n');
    assert.doesNotMatch(stdout, /broker-test-secret/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('broker client fails closed without an active broker', async () => {
  await assert.rejects(
    () =>
      execFileAsync(process.execPath, [clientPath], {
        env: { ...process.env, OAT_SMOKE_CURSOR_BROKER_DIRECTORY: '' },
      }),
    (error) =>
      error.code === 1 &&
      error.stderr.includes('Cursor credential broker is not active'),
  );
});
