import type { ProvidersCodexDependencies } from '@commands/providers/providers.types';
import { Command } from 'commander';

import { createCodexMaterializeCommand } from './materialize';

export function createProvidersCodexCommand(
  overrides: ProvidersCodexDependencies = {},
): Command {
  return new Command('codex')
    .description('Codex provider utilities')
    .addCommand(createCodexMaterializeCommand(overrides.materialize));
}
