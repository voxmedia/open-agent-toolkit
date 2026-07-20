#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { validateContract } from './lib/contracts.mjs';

export async function runValidationCli(
  argv = process.argv.slice(2),
  io = console,
) {
  const [kind, inputPath] = argv;
  if (!kind || !inputPath) {
    const result = {
      valid: false,
      errors: [
        {
          path: '$',
          code: 'usage',
          message: 'Usage: validate.mjs <contract-kind> <json-path>',
        },
      ],
    };
    io.log(JSON.stringify(result, null, 2));
    return 1;
  }

  try {
    const value = JSON.parse(await readFile(inputPath, 'utf8'));
    const result = validateContract(kind, value);
    io.log(JSON.stringify(result, null, 2));
    return result.valid ? 0 : 1;
  } catch (error) {
    io.log(
      JSON.stringify(
        {
          valid: false,
          errors: [
            {
              path: '$',
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
  process.exitCode = await runValidationCli();
}
