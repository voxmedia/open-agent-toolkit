import { Command } from 'commander';
import { createProjectNewCommand } from './new';
import { createProjectSetModeCommand } from './set-mode';

export function createProjectCommand(): Command {
  return new Command('project')
    .description('Manage OAT project workflows')
    .addCommand(createProjectNewCommand())
    .addCommand(createProjectSetModeCommand());
}
