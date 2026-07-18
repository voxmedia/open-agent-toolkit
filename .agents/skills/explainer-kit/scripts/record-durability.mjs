#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { recordDurability } from './lib/durability.mjs';

export async function runRecordDurabilityCli(
  argv = process.argv.slice(2),
  io = console,
) {
  const [requestPath] = argv;
  if (!requestPath || argv.length !== 1) {
    io.log(
      JSON.stringify(
        {
          durable: false,
          outcome: 'built-not-durable',
          errors: [
            {
              code: 'usage',
              message: 'Usage: record-durability.mjs <request-json-path>',
            },
          ],
        },
        null,
        2,
      ),
    );
    return 1;
  }

  try {
    const request = JSON.parse(await readFile(requestPath, 'utf8'));
    const result = await recordDurability(request);
    io.log(JSON.stringify(result, null, 2));
    return result.durable ? 0 : 1;
  } catch (error) {
    io.log(
      JSON.stringify(
        {
          durable: false,
          outcome: 'built-not-durable',
          errors: [
            {
              code: 'input',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        },
        null,
        2,
      ),
    );
    return 1;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  process.exitCode = await runRecordDurabilityCli();
}
