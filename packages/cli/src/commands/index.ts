import type { Command } from 'commander';
import { createDoctorCommand } from './doctor';
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
  program.addCommand(createProvidersCommand());
  program.addCommand(createDoctorCommand());
  program.addCommand(createProjectCommand());
  program.addCommand(createStateCommand());
  program.addCommand(createInternalCommand());
}
