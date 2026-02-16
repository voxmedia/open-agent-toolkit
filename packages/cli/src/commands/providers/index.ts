import { Command } from 'commander';
import { createProvidersInspectCommand } from './inspect/inspect';
import { createProvidersListCommand } from './list/list';
import type {
  ProvidersInspectDependencies,
  ProvidersListDependencies,
} from './providers.types';

export function createProvidersCommand(
  listOverrides: Partial<ProvidersListDependencies> = {},
  inspectOverrides: Partial<ProvidersInspectDependencies> = {},
): Command {
  return new Command('providers')
    .description('Inspect provider capabilities and paths')
    .addCommand(createProvidersListCommand(listOverrides))
    .addCommand(createProvidersInspectCommand(inspectOverrides));
}
