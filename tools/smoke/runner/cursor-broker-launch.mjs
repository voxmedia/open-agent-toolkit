#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';

const separator = process.argv.indexOf('--');
const command = process.argv[separator + 1];
const args = process.argv.slice(separator + 2);
const apiKey = process.env.CURSOR_API_KEY;

if (separator < 2 || !command) {
  throw new TypeError(
    'Usage: cursor-broker-launch.mjs -- <command> [...arguments]',
  );
}
if (!apiKey) {
  throw new TypeError('CURSOR_API_KEY is required for the Cursor broker.');
}

const allowedRoot = await realpath(process.cwd());
const brokerDirectory = join(
  allowedRoot,
  '.oat',
  `.cursor-broker-${process.pid}-${randomBytes(6).toString('hex')}`,
);
await mkdir(brokerDirectory, { mode: 0o700, recursive: true });

let providerChild;
const activeRequests = new Set();

function containedPath(root, candidate) {
  const path = relative(root, candidate);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

async function writeResponse(id, response) {
  const path = join(brokerDirectory, `${id}.response.json`);
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(response)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryPath, path);
}

async function handleRequest(entry) {
  const id = entry.slice(0, -'.request.json'.length);
  if (!/^[a-f0-9]{24}$/.test(id) || activeRequests.has(id)) {
    return;
  }
  activeRequests.add(id);
  const requestPath = join(brokerDirectory, entry);
  try {
    const request = JSON.parse(await readFile(requestPath, 'utf8'));
    const cwd = await realpath(request.cwd);
    if (
      !containedPath(allowedRoot, cwd) ||
      !Array.isArray(request.args) ||
      request.args.some((value) => typeof value !== 'string')
    ) {
      throw new TypeError('Rejected invalid Cursor broker request.');
    }
    const stdout = [];
    const stderr = [];
    providerChild = spawn('cursor-agent', request.args, {
      cwd,
      env: { ...process.env, CURSOR_API_KEY: apiKey },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    providerChild.stdout.on('data', (data) => stdout.push(Buffer.from(data)));
    providerChild.stderr.on('data', (data) => stderr.push(Buffer.from(data)));
    const result = await new Promise((resolvePromise) => {
      providerChild.once('error', (error) =>
        resolvePromise({ error: error.message }),
      );
      providerChild.once('close', (code, signal) =>
        resolvePromise({ code, signal }),
      );
    });
    providerChild = undefined;
    await writeResponse(id, {
      ...result,
      stderr: Buffer.concat(stderr).toString('base64'),
      stdout: Buffer.concat(stdout).toString('base64'),
    });
  } catch (error) {
    await writeResponse(id, {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await rm(requestPath, { force: true });
    activeRequests.delete(id);
  }
}

const poller = setInterval(async () => {
  const entries = await readdir(brokerDirectory).catch(() => []);
  for (const entry of entries.filter((value) =>
    value.endsWith('.request.json'),
  )) {
    void handleRequest(entry);
  }
}, 50);

const childEnvironment = { ...process.env };
delete childEnvironment.CURSOR_API_KEY;
const child = spawn(command, args, {
  cwd: allowedRoot,
  env: {
    ...childEnvironment,
    OAT_SMOKE_CURSOR_BROKER_DIRECTORY: brokerDirectory,
  },
  stdio: 'inherit',
});

function forwardSignal(signal) {
  child.kill(signal);
  providerChild?.kill(signal);
}

process.once('SIGINT', () => forwardSignal('SIGINT'));
process.once('SIGTERM', () => forwardSignal('SIGTERM'));

const result = await new Promise((resolvePromise, reject) => {
  child.once('error', reject);
  child.once('close', (code, signal) => resolvePromise({ code, signal }));
});

clearInterval(poller);
await rm(brokerDirectory, { force: true, recursive: true });

if (typeof result.code === 'number') {
  process.exitCode = result.code;
} else if (result.signal) {
  process.kill(process.pid, result.signal);
}
