import type { Command } from 'commander';
import { createCleanupCommand } from './cleanup';
import { createConfigCommand } from './config';
import { createDocsCommand } from './docs';
import { createDoctorCommand } from './doctor';
import { createIndexCommand } from './index-cmd';
import { createInitCommand } from './init';
import { createInstructionsCommand } from './instructions';
import { createInternalCommand } from './internal';
import { createLocalCommand } from './local';
import { createProjectCommand } from './project';
import { createProvidersCommand } from './providers';
import { createRemoveCommand } from './remove';
import { createStateCommand } from './state';
import { createStatusCommand } from './status';
import { createSyncCommand } from './sync';
import { createToolsCommand } from './tools';

export function registerCommands(program: Command): void {
  program.addCommand(createInitCommand());
  program.addCommand(createStatusCommand());
  program.addCommand(createSyncCommand());
  program.addCommand(createConfigCommand());
  program.addCommand(createLocalCommand());
  program.addCommand(createProvidersCommand());
  program.addCommand(createRemoveCommand());
  program.addCommand(createDoctorCommand());
  program.addCommand(createCleanupCommand());
  program.addCommand(createDocsCommand());
  program.addCommand(createInstructionsCommand());
  program.addCommand(createIndexCommand());
  program.addCommand(createProjectCommand());
  program.addCommand(createStateCommand());
  program.addCommand(createToolsCommand());
  program.addCommand(createInternalCommand());
}
