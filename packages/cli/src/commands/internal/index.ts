import { Command } from 'commander';

import { createValidateOatSkillsCommand } from './validate-oat-skills';

export function createInternalCommand(): Command {
  return new Command('internal')
    .description('Internal OAT maintenance commands')
    .addCommand(createValidateOatSkillsCommand());
}
