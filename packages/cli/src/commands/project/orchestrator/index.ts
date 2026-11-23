import { Command } from 'commander';

import { createProjectOrchestratorSetCommand } from './set';

export function createProjectOrchestratorCommand(): Command {
  return new Command('orchestrator')
    .description("Manage a freestyle project's orchestrator branch")
    .addCommand(createProjectOrchestratorSetCommand());
}
