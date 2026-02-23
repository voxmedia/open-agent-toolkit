import { Command } from 'commander';
import { createRemoveSkillCommand } from './skill';
import { createRemoveSkillsCommand } from './skills';

export function createRemoveCommand(): Command {
  return new Command('remove')
    .description('Remove installed skills and managed provider views')
    .addCommand(createRemoveSkillCommand())
    .addCommand(createRemoveSkillsCommand());
}
