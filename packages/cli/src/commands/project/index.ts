import { Command } from 'commander';

import { createProjectArchiveCommand } from './archive';
import { createProjectNewCommand } from './new';
import { createProjectOpenCommand } from './open';
import { createProjectPauseCommand } from './pause';
import { createProjectSetModeCommand } from './set-mode';

export function createProjectCommand(): Command {
  return new Command('project')
    .description('Manage OAT project workflows')
    .addCommand(createProjectArchiveCommand())
    .addCommand(createProjectNewCommand())
    .addCommand(createProjectOpenCommand())
    .addCommand(createProjectPauseCommand())
    .addCommand(createProjectSetModeCommand());
}
