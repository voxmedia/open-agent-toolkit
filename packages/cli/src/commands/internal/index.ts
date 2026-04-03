import { Command } from 'commander';

import { createValidateOatSkillsCommand } from './validate-oat-skills';
import { createValidateSkillVersionBumpsCommand } from './validate-skill-version-bumps';

export function createInternalCommand(): Command {
  return new Command('internal')
    .description('Internal OAT maintenance commands')
    .addCommand(createValidateOatSkillsCommand())
    .addCommand(createValidateSkillVersionBumpsCommand());
}
