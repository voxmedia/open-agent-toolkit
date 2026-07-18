import { Command } from 'commander';

import {
  createProjectLogAppendCommand,
  type ProjectLogAppendCommandDependencies,
} from './append';
import {
  createProjectLogCheckCommand,
  type ProjectLogCheckCommandDependencies,
} from './check';
import {
  createProjectLogSynthesizeCommand,
  type ProjectLogSynthesizeCommandDependencies,
} from './synthesize';

export interface ProjectLogCommandDependencies
  extends
    ProjectLogAppendCommandDependencies,
    ProjectLogCheckCommandDependencies,
    ProjectLogSynthesizeCommandDependencies {}

export function createProjectLogCommand(
  overrides: Partial<ProjectLogCommandDependencies> = {},
): Command {
  return new Command('log')
    .description('Manage the append-only project observation log')
    .addCommand(createProjectLogAppendCommand(overrides))
    .addCommand(createProjectLogCheckCommand(overrides))
    .addCommand(createProjectLogSynthesizeCommand(overrides));
}
