import { Command } from 'commander';

import {
  createProjectLogAppendCommand,
  type ProjectLogAppendCommandDependencies,
} from './append';

export type ProjectLogCommandDependencies = ProjectLogAppendCommandDependencies;

export function createProjectLogCommand(
  overrides: Partial<ProjectLogCommandDependencies> = {},
): Command {
  return new Command('log')
    .description('Manage the append-only project observation log')
    .addCommand(createProjectLogAppendCommand(overrides));
}
