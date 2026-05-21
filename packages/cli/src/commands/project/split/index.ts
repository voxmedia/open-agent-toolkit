import { Command } from 'commander';

import { createEvaluateSignalsCommand } from './evaluate-signals';
import { createValidateSplitPlanCommand } from './validate-plan';

export function createProjectSplitCommand(): Command {
  return new Command('split')
    .description('Evaluate and validate oat-project-split pure-logic payloads')
    .addCommand(createEvaluateSignalsCommand())
    .addCommand(createValidateSplitPlanCommand());
}
