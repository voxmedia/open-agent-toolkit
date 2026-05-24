import { Command } from 'commander';

import { createProjectArchiveCommand } from './archive';
import { createProjectCompleteDiscoveryCommand } from './complete-discovery';
import { createProjectCompleteStateCommand } from './complete-state';
import { createProjectDispatchCeilingCommand } from './dispatch-ceiling';
import { createProjectListCommand } from './list';
import { createProjectNewCommand } from './new';
import { createProjectOpenCommand } from './open';
import { createProjectPauseCommand } from './pause';
import { createProjectSetModeCommand } from './set-mode';
import { createProjectSplitCommand } from './split';
import { createProjectStatusCommand } from './status';
import { createProjectValidatePlanCommand } from './validate-plan';

export function createProjectCommand(): Command {
  return new Command('project')
    .description('Manage OAT project workflows')
    .addCommand(createProjectArchiveCommand())
    .addCommand(createProjectCompleteDiscoveryCommand())
    .addCommand(createProjectCompleteStateCommand())
    .addCommand(createProjectDispatchCeilingCommand())
    .addCommand(createProjectListCommand())
    .addCommand(createProjectNewCommand())
    .addCommand(createProjectOpenCommand())
    .addCommand(createProjectPauseCommand())
    .addCommand(createProjectSetModeCommand())
    .addCommand(createProjectSplitCommand())
    .addCommand(createProjectStatusCommand())
    .addCommand(createProjectValidatePlanCommand());
}
