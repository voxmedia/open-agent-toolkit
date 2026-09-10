#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  checkApprovedWaveTarget,
  createRoutingPreview,
  renderRoutingPreview,
  RoutingContractError,
} from './lib/routing.mjs';

function parseArgs(argv) {
  const options = { format: 'markdown' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (
      !['--manifest', '--format', '--wave', '--check-target'].includes(argument)
    ) {
      throw new RoutingContractError(
        'INVALID_ARGUMENT',
        `Unknown argument ${argument}`,
      );
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new RoutingContractError(
        'INVALID_ARGUMENT',
        `${argument} requires a value`,
      );
    }
    options[
      {
        '--manifest': 'manifestPath',
        '--format': 'format',
        '--wave': 'waveId',
        '--check-target': 'targetPath',
      }[argument]
    ] = value;
    index += 1;
  }
  if (!options.manifestPath) {
    throw new RoutingContractError(
      'INVALID_ARGUMENT',
      '--manifest is required',
    );
  }
  if ((options.waveId === undefined) !== (options.targetPath === undefined)) {
    throw new RoutingContractError(
      'INVALID_ARGUMENT',
      '--wave and --check-target must be provided together',
    );
  }
  return options;
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new RoutingContractError(
      'INVALID_JSON',
      `Unable to read ${label}: ${error.message}`,
    );
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const manifest = await readJson(options.manifestPath, 'manifest');
  if (options.waveId !== undefined) {
    const candidate = await readJson(options.targetPath, 'constructed target');
    const result = checkApprovedWaveTarget(manifest, options.waveId, candidate);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(
    renderRoutingPreview(createRoutingPreview(manifest), options.format),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    const code = error instanceof RoutingContractError ? error.code : 'ERROR';
    process.stderr.write(`${code}: ${error.message}\n`);
    process.exitCode = 1;
  });
}
