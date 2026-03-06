import { Command } from 'commander';
import { createDocsNavSyncCommand } from './sync';

export function createDocsNavCommand(): Command {
  return new Command('nav')
    .description('Docs navigation commands')
    .addCommand(createDocsNavSyncCommand());
}
