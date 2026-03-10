import { Command } from 'commander';

import { createInstructionsSyncCommand } from './sync/sync';
import { createInstructionsValidateCommand } from './validate/validate';

export function createInstructionsCommand(): Command {
  return new Command('instructions')
    .description('Manage AGENTS.md and CLAUDE.md instruction file integrity')
    .addCommand(createInstructionsValidateCommand())
    .addCommand(createInstructionsSyncCommand());
}
