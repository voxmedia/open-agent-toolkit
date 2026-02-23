import type { Command } from 'commander';
import { createCleanupCommand } from './cleanup';
import { createConfigCommand } from './config';
import { createDoctorCommand } from './doctor';
import { createIndexCommand } from './index-cmd';
import { createInitCommand } from './init';
import { createInternalCommand } from './internal';
import { createProjectCommand } from './project';
import { createProvidersCommand } from './providers';
import { createStateCommand } from './state';
import { createStatusCommand } from './status';
import { createSyncCommand } from './sync';

export function registerCommands(program: Command): void {
  program.addCommand(createInitCommand());
  program.addCommand(createStatusCommand());
  program.addCommand(createSyncCommand());
  program.addCommand(createConfigCommand());
  program.addCommand(createProvidersCommand());
  program.addCommand(createDoctorCommand());
  program.addCommand(createCleanupCommand());
  program.addCommand(createIndexCommand());
  program.addCommand(createProjectCommand());
  program.addCommand(createStateCommand());
  program.addCommand(createInternalCommand());
}
