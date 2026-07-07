import { Command } from 'commander';

import { createCursorCurrentTargetCommand } from './cursor-current-target';
import { createValidateOatSkillsCommand } from './validate-oat-skills';
import { createValidateSkillVersionBumpsCommand } from './validate-skill-version-bumps';

export function createInternalCommand(): Command {
  return new Command('internal')
    .description('Internal OAT maintenance commands')
    .addCommand(createCursorCurrentTargetCommand())
    .addCommand(createValidateOatSkillsCommand())
    .addCommand(createValidateSkillVersionBumpsCommand());
}
