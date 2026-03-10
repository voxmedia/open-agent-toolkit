import { Command } from 'commander';

import { createProjectNewCommand } from './new';
import { createProjectOpenCommand } from './open';
import { createProjectPauseCommand } from './pause';
import { createProjectSetModeCommand } from './set-mode';

export function createProjectCommand(): Command {
  return new Command('project')
    .description('Manage OAT project workflows')
    .addCommand(createProjectNewCommand())
    .addCommand(createProjectOpenCommand())
    .addCommand(createProjectPauseCommand())
    .addCommand(createProjectSetModeCommand());
}
