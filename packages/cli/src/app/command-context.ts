import { homedir } from 'node:os';
import { resolve } from 'node:path';

import { isInteractive } from '@config/runtime';
import type { Scope } from '@shared/types';
import { type CliLogger, createLogger } from '@ui/logger';

export interface GlobalOptions {
  scope?: Scope;
  dryRun?: boolean;
  verbose?: boolean;
  json?: boolean;
  cwd?: string;
}

/**
 * How per-pack scope resolution behaves in the tools-install flow:
 * - `interactive`: always run the per-pack `Where should X install?` radio.
 * - `defaults`: apply additive per-pack defaults without prompting.
 * - `gate`: deferred guided-setup signal — after pack selection, prompt the
 *   `Customize per-pack scope? (y/N)` gate (yes -> interactive radio,
 *   no/non-interactive -> defaults), and skip the gate entirely when no
 *   user-eligible pack is selected.
 */
export type ScopeSelectionMode = 'interactive' | 'defaults' | 'gate';

export interface CommandContext {
  scope: Scope;
  scopeSelection?: ScopeSelectionMode;
  dryRun: boolean;
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
    dryRun: options.dryRun ?? false,
    verbose,
    json,
    cwd: resolve(options.cwd ?? process.cwd()),
    home: homedir(),
    interactive: isInteractive(json),
    logger: createLogger({ json, verbose }),
  };
}
