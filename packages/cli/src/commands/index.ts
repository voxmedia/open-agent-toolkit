import type { Command } from 'commander';
import { createDoctorCommand } from './doctor';
import { createInitCommand } from './init';
import { createProvidersCommand } from './providers';
import { createStatusCommand } from './status';
import { createSyncCommand } from './sync';

export function registerCommands(program: Command): void {
  program.addCommand(createInitCommand());
  program.addCommand(createStatusCommand());
  program.addCommand(createSyncCommand());
  program.addCommand(createProvidersCommand());
  program.addCommand(createDoctorCommand());
}
