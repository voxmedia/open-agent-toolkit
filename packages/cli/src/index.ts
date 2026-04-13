#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createProgram } from './app/create-program';
import { registerCommands } from './commands';
import { CliError } from './errors';
import { createLogger } from './ui';

export function normalizeArgv(argv: string[]): string[] {
  // `pnpm run <script> -- ...` passes a literal `--` into argv.
  // Strip that sentinel so Commander can parse subcommand options normally.
  if (argv.length >= 3 && argv[2] === '--') {
    const executable = argv[0];
    const script = argv[1];
    if (!executable || !script) {
      return argv;
    }
    return [executable, script, ...argv.slice(3)];
  }

  return argv;
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();
  registerCommands(program);
  await program.parseAsync(normalizeArgv(argv));
}

export function isEntrypoint(
  argv: string[] = process.argv,
  entrypointUrl: string = import.meta.url,
): boolean {
  if (!argv[1]) {
    return false;
  }

  const entrypointPath = fileURLToPath(entrypointUrl);
  const argvPath = resolve(argv[1]);

  try {
    return realpathSync(entrypointPath) === realpathSync(argvPath);
  } catch {
    return entrypointUrl === pathToFileURL(argvPath).href;
  }
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
