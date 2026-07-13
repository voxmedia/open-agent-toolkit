#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const brokerDirectory = process.env.OAT_SMOKE_CURSOR_BROKER_DIRECTORY;
if (!brokerDirectory) {
  process.stderr.write('Cursor credential broker is not active.\n');
  process.exitCode = 1;
} else {
  const id = randomBytes(12).toString('hex');
  const requestPath = join(brokerDirectory, `${id}.request.json`);
  const temporaryRequestPath = `${requestPath}.tmp`;
  const responsePath = join(brokerDirectory, `${id}.response.json`);
  await writeFile(
    temporaryRequestPath,
    `${JSON.stringify({
      args: process.argv.slice(2),
      cwd: process.cwd(),
    })}\n`,
    { mode: 0o600 },
  );
  await rename(temporaryRequestPath, requestPath);

  let response;
  const deadline = Date.now() + 20 * 60 * 1000;
  while (!response && Date.now() < deadline) {
    try {
      response = JSON.parse(await readFile(responsePath, 'utf8'));
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
      await delay(50);
    }
  }

  await rm(responsePath, { force: true });
  if (!response) {
    process.stderr.write('Cursor credential broker response timed out.\n');
    process.exitCode = 1;
  } else if (response.error) {
    process.stderr.write(
      `Cursor credential broker failed: ${response.error}\n`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(Buffer.from(response.stdout, 'base64'));
    process.stderr.write(Buffer.from(response.stderr, 'base64'));
    process.exitCode =
      typeof response.code === 'number'
        ? response.code
        : response.signal
          ? 1
          : 0;
  }
}
