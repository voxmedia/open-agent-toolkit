import { Command } from 'commander';
import { createProvidersListCommand } from './list';
import type { ProvidersListDependencies } from './providers.types';

export function createProvidersCommand(
  listOverrides: Partial<ProvidersListDependencies> = {},
): Command {
  return new Command('providers')
    .description('Inspect provider capabilities and paths')
    .addCommand(createProvidersListCommand(listOverrides))
    .addCommand(
      new Command('inspect')
        .description('Inspect a provider in detail')
        .argument('<provider>', 'Provider name')
        .action(() => {
          throw new Error('providers inspect is implemented in p04-t05');
        }),
    );
}
