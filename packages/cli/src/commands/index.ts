import type { Command } from 'commander';

import { createBacklogCommand } from './backlog';
import { createCleanupCommand } from './cleanup';
import { createConfigCommand } from './config';
import { createDecisionCommand } from './decision';
import { createDocsCommand } from './docs';
import { createDoctorCommand } from './doctor';
import { createGateCommand } from './gate';
import { createIndexCommand } from './index-cmd';
import { createInitCommand } from './init';
import { createInstructionsCommand } from './instructions';
import { createInternalCommand } from './internal';
import { createLocalCommand } from './local';
import { createPjmCommand } from './pjm';
import { createProjectCommand } from './project';
import { createProvidersCommand } from './providers';
import { createRemoveCommand } from './remove';
import { createRepoCommand } from './repo';
import { createReviewCommand } from './review';
import { createStateCommand } from './state';
import { createStatusCommand } from './status';
import { createSyncCommand } from './sync';
import { createToolsCommand } from './tools';

export function registerCommands(program: Command): void {
  program.addCommand(createBacklogCommand());
  program.addCommand(createDecisionCommand());
  program.addCommand(createInitCommand());
  program.addCommand(createStatusCommand());
  program.addCommand(createSyncCommand());
  program.addCommand(createConfigCommand());
  program.addCommand(createGateCommand());
  program.addCommand(createLocalCommand());
  program.addCommand(createProvidersCommand());
  program.addCommand(createRemoveCommand());
  program.addCommand(createRepoCommand());
  program.addCommand(createReviewCommand());
  program.addCommand(createDoctorCommand());
  program.addCommand(createCleanupCommand());
  program.addCommand(createDocsCommand());
  program.addCommand(createInstructionsCommand());
  program.addCommand(createIndexCommand());
  program.addCommand(createPjmCommand());
  program.addCommand(createProjectCommand());
  program.addCommand(createStateCommand());
  program.addCommand(createToolsCommand());
  program.addCommand(createInternalCommand());
}
