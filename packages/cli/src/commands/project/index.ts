import { Command } from 'commander';
import { createProjectNewCommand } from './new';

export function createProjectCommand(): Command {
  return new Command('project')
    .description('Manage OAT project workflows')
    .addCommand(createProjectNewCommand());
}
