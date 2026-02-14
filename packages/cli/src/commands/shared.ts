import type { Command } from 'commander';
import type { GlobalOptions } from '../app/command-context';
import type { Scope } from '../shared/types';

export type ConcreteScope = Exclude<Scope, 'all'>;

export function readGlobalOptions(command: Command): GlobalOptions {
  return command.optsWithGlobals() as GlobalOptions;
}

export function resolveConcreteScopes(scope: Scope): ConcreteScope[] {
  if (scope === 'all') {
    return ['project', 'user'];
  }
  return [scope];
}
