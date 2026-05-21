import { Command } from 'commander';

import { createEvaluateSignalsCommand } from './evaluate-signals';
import { createProjectSplitRunCommand } from './run';
import { createValidateSplitPlanCommand } from './validate-plan';

export function createProjectSplitCommand(): Command {
  return new Command('split')
    .description('Evaluate, validate, and run oat-project-split payloads')
    .addCommand(createEvaluateSignalsCommand())
    .addCommand(createValidateSplitPlanCommand())
    .addCommand(createProjectSplitRunCommand());
}
