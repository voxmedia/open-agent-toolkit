#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  launchInstalledChromium,
  probeRenderedPage,
} from '../../.agents/skills/explainer-kit/scripts/lib/browser-runtime.mjs';
import {
  runReleaseVisualMatrix,
  selectReleaseVisualMatrix,
} from '../../.agents/skills/explainer-kit/scripts/render-qa.mjs';

// The release gate drives the same runtime the core resolves for its own render
// QA stage, so a green gate is evidence about the shipped probe path.
export {
  primeKeyboardFocus,
  pressTabFromDocument,
  probeArrowKey,
} from '../../.agents/skills/explainer-kit/scripts/lib/browser-runtime.mjs';

export async function runExplainerVisualValidation({
  matrix = selectReleaseVisualMatrix(),
  launchBrowser = launchInstalledChromium,
} = {}) {
  const browser = await launchBrowser();
  const pages = new Map();
  const server = createServer((request, response) => {
    const html = pages.get(request.url);
    if (html === undefined) {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(html);
  });
  const address = await listen(server);
  const measurements = [];

  try {
    const report = await runReleaseVisualMatrix({
      matrix,
      browserProbe: async (request) => {
        const route = `/${randomBytes(12).toString('hex')}.html`;
        pages.set(route, request.artifact.html);
        try {
          const result = await probeRenderedPage(
            browser,
            `http://127.0.0.1:${address.port}${route}`,
            request,
          );
          measurements.push({
            artifactId: request.artifact.id,
            artifactType: request.artifact.type,
            scenario: request.scenario,
            viewport: request.viewport,
            result,
          });
          return result;
        } finally {
          pages.delete(route);
        }
      },
    });
    return {
      schemaVersion: 'explainer-kit.visual-validation/v1',
      valid: report.valid,
      browser: {
        name: 'Chromium',
        version: browser.version(),
      },
      matrixCases: report.cases,
      measurements,
      issues: report.issues,
    };
  } finally {
    await Promise.allSettled([browser.close(), closeServer(server)]);
  }
}

export async function runExplainerVisualValidationCli(
  argv = process.argv.slice(2),
  options = {},
) {
  let output;
  try {
    output = parseArguments(argv).output;
    const result = await runExplainerVisualValidation(options);
    await writeJsonAtomic(resolve(output), result);
    process.stdout.write(
      `${JSON.stringify({
        valid: result.valid,
        output: resolve(output),
        measurements: result.measurements.length,
      })}\n`,
    );
    return result.valid ? 0 : 1;
  } catch (error) {
    if (output) {
      await rm(resolve(output), { force: true }).catch(() => {});
    }
    process.stderr.write(
      `${JSON.stringify({
        code: 'E_VISUAL_BROWSER',
        message:
          error instanceof Error
            ? `Real browser release validation failed: ${error.message}`
            : 'Real browser release validation failed.',
        ...(output && { output: resolve(output) }),
      })}\n`,
    );
    return 1;
  }
}

function listen(server) {
  return new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolveListen(server.address());
    });
  });
}

function closeServer(server) {
  return new Promise((resolveClose) => server.close(resolveClose));
}

function parseArguments(argv) {
  if (
    argv.length !== 2 ||
    argv[0] !== '--output' ||
    !argv[1] ||
    argv[1].startsWith('--')
  ) {
    throw new Error(
      'Usage: validate-explainer-visuals.mjs --output <results.json>',
    );
  }
  return { output: argv[1] };
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      flag: 'wx',
    });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await runExplainerVisualValidationCli();
}
