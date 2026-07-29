#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  assertBrowserProbeSession,
  createBrowserProbeSession,
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
  createBrowserSession = createBrowserProbeSession,
  evidenceRoot,
} = {}) {
  const browserSession = await createBrowserSession();
  if (!browserSession?.available) {
    throw new Error(
      `No trusted browser session is available (${browserSession?.reason ?? 'unknown reason'}).`,
    );
  }
  assertBrowserProbeSession(browserSession);
  const measurements = [];

  try {
    const report = await runReleaseVisualMatrix({
      matrix,
      browserSession,
      onProbeResult: (measurement) => measurements.push(measurement),
      ...(evidenceRoot && { evidenceRoot }),
    });
    return {
      schemaVersion: 'explainer-kit.visual-validation/v1',
      valid: report.valid,
      browser: {
        ...structuredClone(browserSession.runtime),
        capture: structuredClone(browserSession.capture),
        captureIdentity: browserSession.captureIdentity,
      },
      matrixCases: report.cases,
      measurements,
      ...(report.evidence && { evidence: report.evidence }),
      issues: report.issues,
    };
  } finally {
    await browserSession.close?.();
  }
}

export async function runExplainerVisualValidationCli(
  argv = process.argv.slice(2),
  options = {},
) {
  let output;
  try {
    output = resolve(parseArguments(argv).output);
    const evidenceRoot = resolve(dirname(output), 'explainer-visual-evidence');
    await rm(evidenceRoot, { recursive: true, force: true });
    await mkdir(evidenceRoot, { recursive: true });
    const result = await runExplainerVisualValidation({
      ...options,
      evidenceRoot,
    });
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
