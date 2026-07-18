import { Command } from 'commander';

import {
  createProjectLogAppendCommand,
  type ProjectLogAppendCommandDependencies,
} from './append';
import {
  createProjectLogCheckCommand,
  type ProjectLogCheckCommandDependencies,
} from './check';

export interface ProjectLogCommandDependencies
  extends
    ProjectLogAppendCommandDependencies,
    ProjectLogCheckCommandDependencies {}

export function createProjectLogCommand(
  overrides: Partial<ProjectLogCommandDependencies> = {},
): Command {
  return new Command('log')
    .description('Manage the append-only project observation log')
    .addCommand(createProjectLogAppendCommand(overrides))
    .addCommand(createProjectLogCheckCommand(overrides));
}
