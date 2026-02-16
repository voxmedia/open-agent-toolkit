import type { GlobalOptions } from '@app/command-context';
import type { ConcreteScope, Scope } from '@shared/types';
import type { Command } from 'commander';

export function readGlobalOptions(command: Command): GlobalOptions {
  return command.optsWithGlobals() as GlobalOptions;
}

export function resolveConcreteScopes(scope: Scope): ConcreteScope[] {
  if (scope === 'all') {
    return ['project', 'user'];
  }
  return [scope];
}
