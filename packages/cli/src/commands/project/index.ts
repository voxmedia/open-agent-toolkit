import { Command } from 'commander';

import { createProjectArchiveCommand } from './archive';
import { createProjectCompleteDiscoveryCommand } from './complete-discovery';
import { createProjectCompleteStateCommand } from './complete-state';
import { createProjectDispatchCeilingCommand } from './dispatch-ceiling';
import { createProjectLinksCommand } from './links';
import { createProjectListCommand } from './list';
import { createProjectLogCommand } from './log/index';
import { createProjectMigrateCommand } from './migrate';
import { createProjectNewCommand } from './new';
import { createProjectOpenCommand } from './open';
import { createProjectPauseCommand } from './pause';
import { createProjectPruneCommand } from './prune';
import { createProjectPullCommand } from './pull';
import { createProjectPushCommand } from './push';
import { createProjectScopeCommand } from './scope';
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
    .addCommand(createProjectLinksCommand())
    .addCommand(createProjectLogCommand())
    .addCommand(createProjectMigrateCommand())
    .addCommand(createProjectNewCommand())
    .addCommand(createProjectOpenCommand())
    .addCommand(createProjectPauseCommand())
    .addCommand(createProjectPruneCommand())
    .addCommand(createProjectPushCommand())
    .addCommand(createProjectPullCommand())
    .addCommand(createProjectScopeCommand())
    .addCommand(createProjectSetModeCommand())
    .addCommand(createProjectSplitCommand())
    .addCommand(createProjectStatusCommand())
    .addCommand(createProjectValidatePlanCommand());
}
