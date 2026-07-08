import { Command } from 'commander';

import { createProvidersCodexCommand } from './codex';
import { createProvidersInspectCommand } from './inspect/inspect';
import { createProvidersListCommand } from './list/list';
import type {
  ProvidersCodexDependencies,
  ProvidersInspectDependencies,
  ProvidersListDependencies,
  ProvidersSetDependencies,
} from './providers.types';
import { createProvidersSetCommand } from './set';

export function createProvidersCommand(
  listOverrides: Partial<ProvidersListDependencies> = {},
  inspectOverrides: Partial<ProvidersInspectDependencies> = {},
  setOverrides: Partial<ProvidersSetDependencies> = {},
  codexOverrides: ProvidersCodexDependencies = {},
): Command {
  return new Command('providers')
    .description('Inspect provider capabilities and paths')
    .addCommand(createProvidersListCommand(listOverrides))
    .addCommand(createProvidersInspectCommand(inspectOverrides))
    .addCommand(createProvidersSetCommand(setOverrides))
    .addCommand(createProvidersCodexCommand(codexOverrides));
}
