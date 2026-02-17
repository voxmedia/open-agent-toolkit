import { Command } from 'commander';
import { createProvidersInspectCommand } from './inspect/inspect';
import { createProvidersListCommand } from './list/list';
import type {
  ProvidersInspectDependencies,
  ProvidersListDependencies,
  ProvidersSetDependencies,
} from './providers.types';
import { createProvidersSetCommand } from './set';

export function createProvidersCommand(
  listOverrides: Partial<ProvidersListDependencies> = {},
  inspectOverrides: Partial<ProvidersInspectDependencies> = {},
  setOverrides: Partial<ProvidersSetDependencies> = {},
): Command {
  return new Command('providers')
    .description('Inspect provider capabilities and paths')
    .addCommand(createProvidersListCommand(listOverrides))
    .addCommand(createProvidersInspectCommand(inspectOverrides))
    .addCommand(createProvidersSetCommand(setOverrides));
}
