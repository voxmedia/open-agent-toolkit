#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { publishS3Static } from './lib/s3-static.mjs';

export async function runPublishCli(argv, dependencies = {}) {
  const log = dependencies.log ?? console.log;
  try {
    const options = parseArguments(argv);
    if (!options.confirmPublish) {
      throw Object.assign(
        new Error(
          'Publishing requires --confirm-publish after human approval.',
        ),
        { code: 'E_PUBLISH_APPROVAL' },
      );
    }
    const request = JSON.parse(await readFile(options.request, 'utf8'));
    const receipt = await publishS3Static(request, {
      approved: true,
      receiptPath: options.receipt,
      ...dependencies.connector,
    });
    log(JSON.stringify({ ok: true, receiptPath: options.receipt, receipt }));
    return 0;
  } catch (caught) {
    log(
      JSON.stringify({
        ok: false,
        error: {
          code: caught?.code ?? 'E_PUBLISH',
          message: caught instanceof Error ? caught.message : String(caught),
        },
      }),
    );
    return 1;
  }
}

function parseArguments(argv) {
  const options = {
    request: null,
    receipt: null,
    confirmPublish: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--confirm-publish') {
      options.confirmPublish = true;
      continue;
    }
    if (argument === '--request' || argument === '--receipt') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${argument} requires a path.`);
      }
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.request || !options.receipt) {
    throw new Error('--request and --receipt are required.');
  }
  return options;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await runPublishCli(process.argv.slice(2));
}
