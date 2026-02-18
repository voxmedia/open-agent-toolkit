#!/usr/bin/env node

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createProgram } from './app/create-program';
import { registerCommands } from './commands';
import { CliError } from './errors';
import { createLogger } from './ui';

export function normalizeArgv(argv: string[]): string[] {
  // `pnpm run <script> -- ...` passes a literal `--` into argv.
  // Strip that sentinel so Commander can parse subcommand options normally.
  if (argv.length >= 3 && argv[2] === '--') {
    return [argv[0], argv[1], ...argv.slice(3)];
  }

  return argv;
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();
  registerCommands(program);
  await program.parseAsync(normalizeArgv(argv));
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
