#!/usr/bin/env node

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createProgram } from './app/create-program';
import { registerCommands } from './commands';
import { CliError } from './errors';
import { createLogger } from './ui';

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();
  registerCommands(program);
  await program.parseAsync(argv);
}

function isEntrypoint(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
}

if (isEntrypoint()) {
  void main().catch((error) => {
    const logger = createLogger({ json: false, verbose: false });
    if (error instanceof CliError) {
      logger.error(error.message);
      process.exitCode = error.exitCode;
    } else if (error instanceof Error) {
      logger.error(error.message);
      process.exitCode = 2;
    } else {
      logger.error('Unexpected error');
      process.exitCode = 2;
    }
  });
}
