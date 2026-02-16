import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { isInteractive } from '@config/runtime';
import type { Scope } from '@shared/types';
import { type CliLogger, createLogger } from '@ui/logger';

export interface GlobalOptions {
  scope?: Scope;
  apply?: boolean;
  verbose?: boolean;
  json?: boolean;
  cwd?: string;
}

export interface CommandContext {
  scope: Scope;
  apply: boolean;
  verbose: boolean;
  json: boolean;
  cwd: string;
  home: string;
  interactive: boolean;
  logger: CliLogger;
}

export function buildCommandContext(options: GlobalOptions): CommandContext {
  const json = options.json ?? false;
  const verbose = options.verbose ?? false;

  return {
    scope: options.scope ?? 'all',
    apply: options.apply ?? false,
    verbose,
    json,
    cwd: resolve(options.cwd ?? process.cwd()),
    home: homedir(),
    interactive: isInteractive(json),
    logger: createLogger({ json, verbose }),
  };
}
